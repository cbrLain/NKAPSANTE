// routes/stats.js — Tableau de bord
const router = require('express').Router();
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  const db = getDb();

  if (req.user.role === 'assureur') {
    const totalAssures    = db.prepare('SELECT COUNT(*) AS n FROM assures WHERE actif=1').get().n;
    const totalMedecins   = db.prepare('SELECT COUNT(*) AS n FROM medecins').get().n;
    const totalFeuilles   = db.prepare('SELECT COUNT(*) AS n FROM feuilles_maladie').get().n;
    const totalRemb       = db.prepare("SELECT COALESCE(SUM(montant),0) AS s FROM remboursements WHERE statut='effectue'").get().s;
    const parStatut       = db.prepare("SELECT statut, COUNT(*) AS n FROM feuilles_maladie GROUP BY statut").all();
    const activiteRecente = db.prepare(`
      SELECT 'Feuille ' || reference AS texte, statut, created_at AS date
      FROM feuilles_maladie ORDER BY created_at DESC LIMIT 8
    `).all();
    res.json({ totalAssures, totalMedecins, totalFeuilles, totalRemb, parStatut, activiteRecente });
  } else {
    const med = db.prepare('SELECT id FROM medecins WHERE utilisateur_id=?').get(req.user.id);
    const medecinId = med?.id;
    const totalFeuilles    = db.prepare('SELECT COUNT(*) AS n FROM feuilles_maladie WHERE medecin_id=?').get(medecinId)?.n ?? 0;
    const totalPrescriptions = db.prepare('SELECT COUNT(*) AS n FROM prescriptions WHERE medecin_id=?').get(medecinId)?.n ?? 0;
    const parStatut          = db.prepare("SELECT statut, COUNT(*) AS n FROM feuilles_maladie WHERE medecin_id=? GROUP BY statut").all(medecinId);
    const activiteRecente    = db.prepare(`
      SELECT 'Feuille ' || f.reference AS texte, f.statut, f.created_at AS date
      FROM feuilles_maladie f WHERE f.medecin_id=? ORDER BY f.created_at DESC LIMIT 8
    `).all(medecinId);
    res.json({ totalFeuilles, totalPrescriptions, parStatut, activiteRecente });
  }
});

module.exports = router;
