// server.js — Point d'entrée du backend SecuraSanté
require('dotenv').config();
require('express-async-errors');
const express = require('express');
const http    = require('http');
const cors    = require('cors');
const path    = require('path');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

const { initSocket } = require('./socket');

// ── Middleware ──────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Démarrage asynchrone ───────────────────────────────────────
async function start() {
  const { initDb, getDb } = require('./db/database');
  await initDb();
  const db = getDb();

  // Seed si base vide (sql.js local uniquement)
  if (!process.env.DATABASE_URL) {
    const row = db.prepare('SELECT COUNT(*) AS n FROM utilisateurs').get();
    if (!row || row.n === 0) {
      console.log('📦 Base vide — exécution du seed...');
      require('./db/seed');
    } else {
      console.log(`✅ Base prête — ${row.n} utilisateur(s) trouvé(s)`);
    }
  }

  // ── Socket.IO (temps réel) ────────────────────────────────────
  initSocket(server);

  // Sauvegarde périodique (sql.js uniquement)
  if (!process.env.DATABASE_URL) {
    setInterval(() => { try { db.save(); } catch(e) { /* ignore */ } }, 30000);
    process.on('exit', () => db.save());
    process.on('SIGINT', () => { db.save(); process.exit(); });
    process.on('SIGTERM', () => { db.save(); process.exit(); });
  } else {
    process.on('SIGINT', () => { db.close?.(); process.exit(); });
    process.on('SIGTERM', () => { db.close?.(); process.exit(); });
  }

  // ── Routes API ───────────────────────────────────────────────
  app.use('/api/auth',           require('./routes/auth'));
  app.use('/api/assures',        require('./routes/assures'));
  app.use('/api/medecins',       require('./routes/medecins'));
  app.use('/api/feuilles',       require('./routes/feuilles'));
  app.use('/api/remboursements', require('./routes/remboursements'));
  app.use('/api/prescriptions',  require('./routes/prescriptions'));
  app.use('/api/stats',          require('./routes/stats'));

  // ── Frontend statique ────────────────────────────────────────
  const FRONTEND = path.join(__dirname, '../frontend');
  app.use(express.static(FRONTEND));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(FRONTEND, 'index.html'));
    }
  });

  // ── Gestion globale des erreurs ──────────────────────────────
  app.use((err, req, res, _next) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  });

  server.listen(PORT, () => {
    console.log(`\n🏥  SecuraSanté API démarrée sur http://localhost:${PORT}`);
    console.log(`📋  Endpoints disponibles :`);
    console.log(`    POST /api/auth/login`);
    console.log(`    GET  /api/assures`);
    console.log(`    GET  /api/medecins`);
    console.log(`    GET  /api/feuilles`);
    console.log(`    GET  /api/remboursements`);
    console.log(`    GET  /api/prescriptions`);
    console.log(`    GET  /api/stats\n`);
  });
}

start().catch(err => {
  console.error('❌ Erreur au démarrage:', err);
  process.exit(1);
});
