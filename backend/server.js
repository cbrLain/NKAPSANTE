// server.js — Point d'entrée du backend SecuraSanté
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────
app.use(cors({ origin: '*' })); // En prod, restreindre l'origine
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Init DB (crée tables si absentes) ─────────────────────────
const db = require('./db/database').getDb();

// Auto-seed si la base est vide
const nbUsers = db.prepare('SELECT COUNT(*) AS n FROM utilisateurs').get().n;
if (nbUsers === 0) {
  console.log('📦 Base vide — exécution du seed...');
  require('./db/seed');
} else {
  console.log(`✅ Base prête — ${nbUsers} utilisateur(s) trouvé(s)`);
}

// ── Routes API ─────────────────────────────────────────────────
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/assures',        require('./routes/assures'));
app.use('/api/medecins',       require('./routes/medecins'));
app.use('/api/feuilles',       require('./routes/feuilles'));
app.use('/api/remboursements', require('./routes/remboursements'));
app.use('/api/prescriptions',  require('./routes/prescriptions'));
app.use('/api/stats',          require('./routes/stats'));

// ── Servir le frontend (optionnel, pour déploiement unifié) ───
const FRONTEND = path.join(__dirname, '../frontend');
app.use(express.static(FRONTEND));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(FRONTEND, 'index.html'));
  }
});

// ── Gestion globale des erreurs ────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

app.listen(PORT, () => {
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
