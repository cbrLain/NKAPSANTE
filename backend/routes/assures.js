// routes/assures.js
const router = require('express').Router();
const { getDb } = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');

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
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const { q } = req.query;
  let rows;
  if (q) {
    const like = `%${q}%`;
    rows = db.prepare(`${ASSURE_SELECT}
      WHERE a.numero_ss LIKE ? OR p.nom LIKE ? OR p.prenom LIKE ?
      ORDER BY p.nom`).all(like, like, like);
  } else {
    rows = db.prepare(`${ASSURE_SELECT} ORDER BY p.nom`).all();
  }
  res.json(rows);
});

// GET /api/assures/:id
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const row = db.prepare(`${ASSURE_SELECT} WHERE a.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Assuré introuvable.' });
  res.json(row);
});

// POST /api/assures — Inscrire un assuré
router.post('/', authenticate, requireRole('assureur'), (req, res) => {
  const db = getDb();
  const { nom, prenom, date_naissance, adresse, telephone, email, numero_ss, medecin_traitant_id } = req.body;
  if (!nom || !prenom || !numero_ss)
    return res.status(400).json({ error: 'Nom, prénom et N° de sécurité sociale requis.' });

  // Vérif doublon
  const exists = db.prepare('SELECT id FROM assures WHERE numero_ss = ?').get(numero_ss);
  if (exists) return res.status(409).json({ error: 'Un assuré avec ce numéro SS existe déjà.' });

  // Si medecin_traitant_id fourni, vérif qu'il est généraliste
  if (medecin_traitant_id) {
    const med = db.prepare("SELECT type FROM medecins WHERE id = ?").get(medecin_traitant_id);
    if (!med) return res.status(400).json({ error: 'Médecin introuvable.' });
    if (med.type !== 'generaliste') return res.status(400).json({ error: 'Le médecin traitant doit être généraliste.' });
  }

  const pInfo = db.prepare(
    'INSERT INTO personnes (nom,prenom,date_naissance,adresse,telephone,email) VALUES (?,?,?,?,?,?)'
  ).run(nom.toUpperCase(), prenom, date_naissance || null, adresse || null, telephone || null, email || null);

  const aInfo = db.prepare(
    'INSERT INTO assures (personne_id,numero_ss,medecin_traitant_id) VALUES (?,?,?)'
  ).run(pInfo.lastInsertRowid, numero_ss, medecin_traitant_id || null);

  res.status(201).json({ id: aInfo.lastInsertRowid, message: 'Assuré inscrit avec succès.' });
});

// PUT /api/assures/:id — Mettre à jour
router.put('/:id', authenticate, requireRole('assureur'), (req, res) => {
  const db = getDb();
  const assure = db.prepare('SELECT * FROM assures WHERE id = ?').get(req.params.id);
  if (!assure) return res.status(404).json({ error: 'Assuré introuvable.' });

  const { nom, prenom, date_naissance, adresse, telephone, email, medecin_traitant_id } = req.body;

  if (medecin_traitant_id) {
    const med = db.prepare("SELECT type FROM medecins WHERE id = ?").get(medecin_traitant_id);
    if (!med || med.type !== 'generaliste')
      return res.status(400).json({ error: 'Le médecin traitant doit être généraliste.' });
  }

  db.prepare(`UPDATE personnes SET nom=?, prenom=?, date_naissance=?, adresse=?, telephone=?, email=?
    WHERE id = ?`).run(
    nom?.toUpperCase() || undefined, prenom, date_naissance, adresse, telephone, email, assure.personne_id
  );

  if (medecin_traitant_id !== undefined) {
    db.prepare('UPDATE assures SET medecin_traitant_id=? WHERE id=?').run(medecin_traitant_id, req.params.id);
  }

  res.json({ message: 'Assuré mis à jour.' });
});

// PATCH /api/assures/:id/medecin-traitant — Enregistrer médecin traitant
router.patch('/:id/medecin-traitant', authenticate, requireRole('assureur'), (req, res) => {
  const db = getDb();
  const { medecin_traitant_id } = req.body;
  if (!medecin_traitant_id) return res.status(400).json({ error: 'ID médecin requis.' });

  const assure = db.prepare('SELECT * FROM assures WHERE id = ?').get(req.params.id);
  if (!assure) return res.status(404).json({ error: 'Assuré introuvable.' });

  const med = db.prepare('SELECT * FROM medecins WHERE id = ?').get(medecin_traitant_id);
  if (!med) return res.status(404).json({ error: 'Médecin introuvable.' });
  if (med.type !== 'generaliste') return res.status(400).json({ error: 'Le médecin traitant doit être un généraliste.' });

  db.prepare('UPDATE assures SET medecin_traitant_id=? WHERE id=?').run(medecin_traitant_id, req.params.id);
  res.json({ message: 'Médecin traitant enregistré avec succès.' });
});

// DELETE /api/assures/:id
router.delete('/:id', authenticate, requireRole('assureur'), (req, res) => {
  const db = getDb();
  const info = db.prepare('UPDATE assures SET actif=0 WHERE id=?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Assuré introuvable.' });
  res.json({ message: 'Assuré désactivé.' });
});

module.exports = router;
