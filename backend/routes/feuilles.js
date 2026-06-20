// routes/feuilles.js
const router = require('express').Router();
const { getDb } = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { broadcast } = require('../socket');

// Transitions d'état autorisées (machine à états du PDF)
const TRANSITIONS = {
  'Brouillon':             ['Transmise', 'Supprimée'],
  'Transmise':             ['En cours de traitement', 'Refusée'],
  'En cours de traitement':['Incomplète', 'Refusée', 'Validée'],
  'Incomplète':            ['En cours de traitement'],
  'Validée':               ['Remboursée'],
  'Refusée':               [],
  'Remboursée':            [],
  'Supprimée':             [],
};

function genRef() {
  return 'FM-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6);
}

const FM_SELECT = `
  SELECT f.*,
    pa.nom || ' ' || pa.prenom AS assure_nom,
    a.numero_ss,
    pm.nom || ' ' || pm.prenom AS medecin_nom,
    m.type AS medecin_type
  FROM feuilles_maladie f
  JOIN assures a ON a.id = f.assure_id
  JOIN personnes pa ON pa.id = a.personne_id
  JOIN medecins m ON m.id = f.medecin_id
  JOIN personnes pm ON pm.id = m.personne_id
`;

// GET /api/feuilles
router.get('/', authenticate, async (req, res) => {
  const db = getDb();
  const { q, statut, assure_id, medecin_id } = req.query;
  let sql = FM_SELECT + ' WHERE 1=1';
  const params = [];

  // Un médecin ne voit que ses propres feuilles
  if (req.user.role === 'medecin') {
    const med = await db.prepare('SELECT id FROM medecins WHERE utilisateur_id=?').get(req.user.id);
    if (med) { sql += ' AND f.medecin_id = ?'; params.push(med.id); }
  }
  if (statut && statut !== 'all') { sql += ' AND f.statut = ?'; params.push(statut); }
  if (assure_id) { sql += ' AND f.assure_id = ?'; params.push(assure_id); }
  if (medecin_id) { sql += ' AND f.medecin_id = ?'; params.push(medecin_id); }
  if (q) {
    sql += ' AND (f.reference LIKE ? OR pa.nom LIKE ? OR pm.nom LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  sql += ' ORDER BY f.created_at DESC';
  res.json(await db.prepare(sql).all(...params));
});

// GET /api/feuilles/:id
router.get('/:id', authenticate, async (req, res) => {
  const db  = getDb();
  const row = await db.prepare(`${FM_SELECT} WHERE f.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Feuille introuvable.' });
  res.json(row);
});

// POST /api/feuilles — Enregistrer une feuille (médecin)
router.post('/', authenticate, requireRole('medecin'), async (req, res) => {
  const db = getDb();
  const { assure_id, date_consultation, diagnostic, actes_medicaux, montant_honoraires, notes } = req.body;
  if (!assure_id || !date_consultation || !diagnostic)
    return res.status(400).json({ error: 'Assuré, date de consultation et diagnostic requis.' });

  const assure = await db.prepare('SELECT id FROM assures WHERE id=? AND actif=1').get(assure_id);
  if (!assure) return res.status(404).json({ error: 'Assuré introuvable ou inactif.' });

  const med = await db.prepare('SELECT id FROM medecins WHERE utilisateur_id=?').get(req.user.id);
  if (!med) return res.status(403).json({ error: 'Compte non lié à un médecin.' });

  const doublon = await db.prepare(
    "SELECT id,reference FROM feuilles_maladie WHERE assure_id=? AND medecin_id=? AND date_consultation=? AND statut NOT IN ('Supprimée','Refusée')"
  ).get(assure_id, med.id, date_consultation);
  if (doublon) return res.status(409).json({ error: `Doublon détecté : feuille ${doublon.reference} existe déjà.` });

  const ref  = genRef();
  const mont = montant_honoraires ? parseFloat(montant_honoraires) : null;
  const remb = mont ? Math.round(mont * 0.7 * 100) / 100 : null;

  const info = await db.prepare(`
    INSERT INTO feuilles_maladie (reference,assure_id,medecin_id,date_consultation,diagnostic,actes_medicaux,statut,montant_honoraires,montant_remboursement,notes)
    VALUES (?,?,?,?,?,?,'Brouillon',?,?,?)
  `).run(ref, assure_id, med.id, date_consultation, diagnostic, actes_medicaux || null, mont, remb, notes || null);

  broadcast('data-change', { resource: 'feuilles' });
  res.status(201).json({ id: info.lastInsertRowid, reference: ref, message: 'Feuille créée en brouillon.' });
});

// PATCH /api/feuilles/:id/statut — Transition d'état
router.patch('/:id/statut', authenticate, async (req, res) => {
  const db = getDb();
  const { statut, notes } = req.body;
  const feuille = await db.prepare('SELECT * FROM feuilles_maladie WHERE id=?').get(req.params.id);
  if (!feuille) return res.status(404).json({ error: 'Feuille introuvable.' });

  const autorisees = TRANSITIONS[feuille.statut] || [];
  if (!autorisees.includes(statut))
    return res.status(400).json({ error: `Transition invalide : ${feuille.statut} → ${statut}.` });

  await db.prepare('UPDATE feuilles_maladie SET statut=?, notes=COALESCE(?,notes), updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(statut, notes || null, req.params.id);

  broadcast('data-change', { resource: 'feuilles' });
  res.json({ message: `Statut mis à jour : ${statut}.` });
});

// PATCH /api/feuilles/:id/completer — Compléter (assureur)
router.patch('/:id/completer', authenticate, requireRole('assureur'), async (req, res) => {
  const db = getDb();
  const { montant_remboursement, mode_paiement, notes } = req.body;
  if (!montant_remboursement || !mode_paiement)
    return res.status(400).json({ error: 'Montant et mode de paiement requis.' });
  if (!['especes','virement'].includes(mode_paiement))
    return res.status(400).json({ error: 'Mode de paiement : especes ou virement.' });

  const feuille = await db.prepare('SELECT * FROM feuilles_maladie WHERE id=?').get(req.params.id);
  if (!feuille) return res.status(404).json({ error: 'Feuille introuvable.' });
  if (['Remboursée','Supprimée','Refusée'].includes(feuille.statut))
    return res.status(400).json({ error: `Impossible de compléter une feuille ${feuille.statut}.` });

  await db.prepare(`UPDATE feuilles_maladie SET montant_remboursement=?, mode_paiement=?, notes=COALESCE(?,notes),
    statut=CASE WHEN statut='En cours de traitement' THEN 'Validée' ELSE statut END,
    updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(parseFloat(montant_remboursement), mode_paiement, notes || null, req.params.id);

  broadcast('data-change', { resource: 'feuilles' });
  res.json({ message: 'Feuille complétée avec succès.' });
});

module.exports = router;
