// routes/remboursements.js
const router = require('express').Router();
const { getDb } = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { broadcast } = require('../socket');

const REMB_SELECT = `
  SELECT r.*, f.reference AS feuille_ref,
    pa.nom || ' ' || pa.prenom AS assure_nom, a.numero_ss,
    u.nom || ' ' || u.prenom AS assureur_nom
  FROM remboursements r
  JOIN feuilles_maladie f ON f.id = r.feuille_id
  JOIN assures a ON a.id = r.assure_id
  JOIN personnes pa ON pa.id = a.personne_id
  LEFT JOIN utilisateurs u ON u.id = r.assureur_id
`;

// GET /api/remboursements
router.get('/', authenticate, requireRole('assureur'), async (req, res) => {
  const db = getDb();
  const { q } = req.query;
  let sql = REMB_SELECT + ' WHERE 1=1';
  const params = [];
  if (q) {
    sql += ' AND (f.reference LIKE ? OR pa.nom LIKE ? OR a.numero_ss LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  sql += ' ORDER BY r.date_remboursement DESC';
  res.json(await db.prepare(sql).all(...params));
});

// GET /api/remboursements/:id
router.get('/:id', authenticate, async (req, res) => {
  const db  = getDb();
  const row = await db.prepare(`${REMB_SELECT} WHERE r.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Remboursement introuvable.' });
  res.json(row);
});

// POST /api/remboursements — Effectuer un remboursement
router.post('/', authenticate, requireRole('assureur'), async (req, res) => {
  const db = getDb();
  const { feuille_id, mode_paiement, reference_bancaire } = req.body;
  if (!feuille_id || !mode_paiement)
    return res.status(400).json({ error: 'ID feuille et mode de paiement requis.' });
  if (!['especes','virement'].includes(mode_paiement))
    return res.status(400).json({ error: 'Mode de paiement invalide.' });

  const feuille = await db.prepare('SELECT * FROM feuilles_maladie WHERE id=?').get(feuille_id);
  if (!feuille) return res.status(404).json({ error: 'Feuille de maladie introuvable.' });
  if (feuille.statut === 'Remboursée')
    return res.status(400).json({ error: 'Remboursement déjà effectué pour cette feuille.' });
  if (feuille.statut !== 'Validée')
    return res.status(400).json({ error: 'La feuille doit être à l\'état Validée avant remboursement.' });
  if (!feuille.montant_remboursement)
    return res.status(400).json({ error: 'Montant de remboursement non défini. Complétez d\'abord la feuille.' });
  if (mode_paiement === 'virement' && !reference_bancaire)
    return res.status(400).json({ error: 'Référence bancaire requise pour un virement.' });

  const effectuer = db.transaction(async () => {
    const rInfo = await db.prepare(`
      INSERT INTO remboursements (feuille_id,assure_id,assureur_id,montant,mode_paiement,reference_bancaire,statut)
      VALUES (?,?,?,?,?,?,'effectue')
    `).run(feuille_id, feuille.assure_id, req.user.id, feuille.montant_remboursement, mode_paiement, reference_bancaire || null);

    await db.prepare("UPDATE feuilles_maladie SET statut='Remboursée', updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .run(feuille_id);

    return rInfo.lastInsertRowid;
  });

  const rId = await effectuer();
  broadcast('data-change', { resource: 'remboursements' });
  res.status(201).json({ id: rId, message: 'Remboursement effectué avec succès.' });
});

// GET /api/remboursements/:id/facture — Données pour impression
router.get('/:id/facture', authenticate, async (req, res) => {
  const db  = getDb();
  const remb = await db.prepare(`${REMB_SELECT} WHERE r.id = ?`).get(req.params.id);
  if (!remb) return res.status(404).json({ error: 'Remboursement introuvable.' });

  const assure = await db.prepare(`
    SELECT a.numero_ss, a.date_inscription,
      p.nom, p.prenom, p.adresse, p.telephone, p.email, p.date_naissance
    FROM assures a JOIN personnes p ON p.id = a.personne_id WHERE a.id = ?
  `).get(remb.assure_id);

  const feuille = await db.prepare('SELECT * FROM feuilles_maladie WHERE id=?').get(remb.feuille_id);
  const medecin = await db.prepare(`
    SELECT m.identifiant, m.type, m.specialite, p.nom, p.prenom
    FROM medecins m JOIN personnes p ON p.id = m.personne_id WHERE m.id = ?
  `).get(feuille.medecin_id);

  res.json({ remboursement: remb, assure, feuille, medecin });
});

module.exports = router;
