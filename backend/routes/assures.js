// routes/assures.js
const router = require('express').Router();
const { getDb } = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { broadcast } = require('../socket');

const ASSURE_SELECT = `
  SELECT a.id, a.numero_ss, a.date_inscription, a.actif,
         p.nom, p.prenom, p.date_naissance, p.adresse, p.telephone, p.email,
         m.identifiant AS medecin_id_code,
         pm.nom || ' ' || pm.prenom AS medecin_traitant
  FROM assures a
  JOIN personnes p ON p.id = a.personne_id
  LEFT JOIN medecins m ON m.id = a.medecin_traitant_id
  LEFT JOIN personnes pm ON pm.id = m.personne_id
`;

// GET /api/assures
router.get('/', authenticate, async (req, res) => {
  const db = getDb();
  const { q } = req.query;
  let rows;
  if (q) {
    const like = `%${q}%`;
    rows = await db.prepare(`${ASSURE_SELECT}
      WHERE a.actif=1 AND (a.numero_ss LIKE ? OR p.nom LIKE ? OR p.prenom LIKE ?)
      ORDER BY p.nom`).all(like, like, like);
  } else {
    rows = await db.prepare(`${ASSURE_SELECT} WHERE a.actif=1 ORDER BY p.nom`).all();
  }
  res.json(rows);
});

// GET /api/assures/:id
router.get('/:id', authenticate, async (req, res) => {
  const db = getDb();
  const row = await db.prepare(`${ASSURE_SELECT} WHERE a.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Assuré introuvable.' });
  res.json(row);
});

// POST /api/assures — Inscrire un assuré
router.post('/', authenticate, requireRole('assureur'), async (req, res) => {
  const db = getDb();
  const { nom, prenom, date_naissance, adresse, telephone, email, medecin_traitant_id } = req.body;
  if (!nom || !prenom)
    return res.status(400).json({ error: 'Nom et prénom requis.' });

  // Auto-génération du N° SS
  const last = await db.prepare("SELECT numero_ss FROM assures WHERE numero_ss LIKE 'SS-%' ORDER BY id DESC LIMIT 1").get();
  const nextNum = last ? parseInt(last.numero_ss.split('-')[1]) + 1 : 1;
  const numero_ss = 'SS-' + String(nextNum).padStart(6, '0');

  // Si medecin_traitant_id fourni, vérif qu'il est généraliste
  if (medecin_traitant_id) {
    const med = await db.prepare("SELECT type FROM medecins WHERE id = ?").get(medecin_traitant_id);
    if (!med) return res.status(400).json({ error: 'Médecin introuvable.' });
    if (med.type !== 'generaliste') return res.status(400).json({ error: 'Le médecin traitant doit être généraliste.' });
  }

  const pInfo = await db.prepare(
    'INSERT INTO personnes (nom,prenom,date_naissance,adresse,telephone,email) VALUES (?,?,?,?,?,?)'
  ).run(nom.toUpperCase(), prenom, date_naissance || null, adresse || null, telephone || null, email || null);

  const aInfo = await db.prepare(
    'INSERT INTO assures (personne_id,numero_ss,medecin_traitant_id) VALUES (?,?,?)'
  ).run(pInfo.lastInsertRowid, numero_ss, medecin_traitant_id || null);

  broadcast('data-change', { resource: 'assures' });
  res.status(201).json({ id: aInfo.lastInsertRowid, numero_ss, message: 'Assuré inscrit avec succès.' });
});

// PUT /api/assures/:id — Mettre à jour
router.put('/:id', authenticate, requireRole('assureur'), async (req, res) => {
  const db = getDb();
  const assure = await db.prepare('SELECT * FROM assures WHERE id = ?').get(req.params.id);
  if (!assure) return res.status(404).json({ error: 'Assuré introuvable.' });

  const { nom, prenom, date_naissance, adresse, telephone, email, medecin_traitant_id } = req.body;

  if (medecin_traitant_id) {
    const med = await db.prepare("SELECT type FROM medecins WHERE id = ?").get(medecin_traitant_id);
    if (!med || med.type !== 'generaliste')
      return res.status(400).json({ error: 'Le médecin traitant doit être généraliste.' });
  }

  await db.prepare(`UPDATE personnes SET nom=?, prenom=?, date_naissance=?, adresse=?, telephone=?, email=?
    WHERE id = ?`).run(
    nom?.toUpperCase() || undefined, prenom, date_naissance, adresse, telephone, email, assure.personne_id
  );

  if (medecin_traitant_id !== undefined) {
    await db.prepare('UPDATE assures SET medecin_traitant_id=? WHERE id=?').run(medecin_traitant_id, req.params.id);
  }

  broadcast('data-change', { resource: 'assures' });
  res.json({ message: 'Assuré mis à jour.' });
});

// PATCH /api/assures/:id/medecin-traitant — Enregistrer médecin traitant
router.patch('/:id/medecin-traitant', authenticate, requireRole('assureur'), async (req, res) => {
  const db = getDb();
  const { medecin_traitant_id } = req.body;
  if (!medecin_traitant_id) return res.status(400).json({ error: 'ID médecin requis.' });

  const assure = await db.prepare('SELECT * FROM assures WHERE id = ?').get(req.params.id);
  if (!assure) return res.status(404).json({ error: 'Assuré introuvable.' });

  const med = await db.prepare('SELECT * FROM medecins WHERE id = ?').get(medecin_traitant_id);
  if (!med) return res.status(404).json({ error: 'Médecin introuvable.' });
  if (med.type !== 'generaliste') return res.status(400).json({ error: 'Le médecin traitant doit être un généraliste.' });

  await db.prepare('UPDATE assures SET medecin_traitant_id=? WHERE id=?').run(medecin_traitant_id, req.params.id);
  broadcast('data-change', { resource: 'assures' });
  res.json({ message: 'Médecin traitant enregistré avec succès.' });
});

// DELETE /api/assures/:id — Suppression complète avec toutes les données liées
router.delete('/:id', authenticate, requireRole('assureur'), async (req, res) => {
  const db = getDb();
  const assure = await db.prepare('SELECT personne_id FROM assures WHERE id=?').get(req.params.id);
  if (!assure) return res.status(404).json({ error: 'Assuré introuvable.' });

  const del = db.transaction(async () => {
    await db.prepare(`DELETE FROM remboursements WHERE feuille_id IN (SELECT id FROM feuilles_maladie WHERE assure_id=?)`).run(req.params.id);
    await db.prepare(`DELETE FROM prescription_medicaments WHERE prescription_id IN (SELECT id FROM prescriptions WHERE assure_id=?)`).run(req.params.id);
    await db.prepare(`DELETE FROM prescription_consultation WHERE prescription_id IN (SELECT id FROM prescriptions WHERE assure_id=?)`).run(req.params.id);
    await db.prepare(`DELETE FROM prescriptions WHERE assure_id=?`).run(req.params.id);
    await db.prepare(`DELETE FROM feuilles_maladie WHERE assure_id=?`).run(req.params.id);
    await db.prepare(`DELETE FROM assures WHERE id=?`).run(req.params.id);
    await db.prepare(`DELETE FROM personnes WHERE id=?`).run(assure.personne_id);
  });
  await del();

  broadcast('data-change', { resource: 'assures' });
  res.json({ message: 'Assuré et toutes ses données supprimés.' });
});

module.exports = router;
