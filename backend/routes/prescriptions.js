// routes/prescriptions.js
const router = require('express').Router();
const { getDb } = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { broadcast } = require('../socket');

// GET /api/prescriptions
router.get('/', authenticate, async (req, res) => {
  const db = getDb();
  let sql = `
    SELECT pr.*, pa.nom || ' ' || pa.prenom AS assure_nom, a.numero_ss,
      pm.nom || ' ' || pm.prenom AS medecin_nom
    FROM prescriptions pr
    JOIN assures a ON a.id = pr.assure_id
    JOIN personnes pa ON pa.id = a.personne_id
    JOIN medecins m ON m.id = pr.medecin_id
    JOIN personnes pm ON pm.id = m.personne_id
    WHERE 1=1
  `;
  const params = [];

  // Un médecin ne voit que ses prescriptions
  if (req.user.role === 'medecin') {
    const med = await db.prepare('SELECT id FROM medecins WHERE utilisateur_id=?').get(req.user.id);
    if (med) { sql += ' AND pr.medecin_id = ?'; params.push(med.id); }
  }

  const { type, q } = req.query;
  if (type) { sql += ' AND pr.type = ?'; params.push(type); }
  if (q) {
    sql += ' AND (pa.nom LIKE ? OR a.numero_ss LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like);
  }
  sql += ' ORDER BY pr.created_at DESC';
  const prescriptions = await db.prepare(sql).all(...params);

  // Enrichit chaque prescription avec ses lignes
  const prescriptionsEnrichies = await Promise.all(prescriptions.map(async p => {
    if (p.type === 'medicaments') {
      p.medicaments = await db.prepare('SELECT * FROM prescription_medicaments WHERE prescription_id=?').all(p.id);
    } else {
      p.consultation = await db.prepare(`
        SELECT pc.*, ms.nom || ' ' || ms.prenom AS specialiste_nom, m.specialite
        FROM prescription_consultation pc
        LEFT JOIN medecins m ON m.id = pc.specialiste_id
        LEFT JOIN personnes ms ON ms.id = m.personne_id
        WHERE pc.prescription_id = ?
      `).get(p.id);
    }
    return p;
  }));

  res.json(prescriptionsEnrichies);
});

// GET /api/prescriptions/:id
router.get('/:id', authenticate, async (req, res) => {
  const db = getDb();
  const p = await db.prepare(`
    SELECT pr.*, pa.nom || ' ' || pa.prenom AS assure_nom, a.numero_ss,
      pm.nom || ' ' || pm.prenom AS medecin_nom
    FROM prescriptions pr
    JOIN assures a ON a.id = pr.assure_id JOIN personnes pa ON pa.id = a.personne_id
    JOIN medecins m ON m.id = pr.medecin_id JOIN personnes pm ON pm.id = m.personne_id
    WHERE pr.id = ?
  `).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Prescription introuvable.' });
  p.medicaments = await db.prepare('SELECT * FROM prescription_medicaments WHERE prescription_id=?').all(p.id);
  p.consultation = await db.prepare('SELECT * FROM prescription_consultation WHERE prescription_id=?').get(p.id);
  res.json(p);
});

// POST /api/prescriptions/medicaments
router.post('/medicaments', authenticate, requireRole('medecin'), async (req, res) => {
  const db = getDb();
  const { assure_id, feuille_id, date_prescription, notes, medicaments } = req.body;
  if (!assure_id || !medicaments?.length)
    return res.status(400).json({ error: 'Assuré et au moins un médicament requis.' });

  const assure = await db.prepare('SELECT id FROM assures WHERE id=? AND actif=1').get(assure_id);
  if (!assure) return res.status(404).json({ error: 'Assuré introuvable.' });

  const med = await db.prepare('SELECT id FROM medecins WHERE utilisateur_id=?').get(req.user.id);
  if (!med) return res.status(403).json({ error: 'Compte non lié à un médecin.' });

  const creer = db.transaction(async () => {
    const pInfo = await db.prepare(`
      INSERT INTO prescriptions (type,medecin_id,assure_id,feuille_id,date_prescription,notes)
      VALUES ('medicaments',?,?,?,?,?)
    `).run(med.id, assure_id, feuille_id || null, date_prescription || null, notes || null);

    const pid = pInfo.lastInsertRowid;
    const insLigne = db.prepare(`
      INSERT INTO prescription_medicaments (prescription_id,nom_medicament,dosage,duree,instructions)
      VALUES (?,?,?,?,?)
    `);
    for (const m of medicaments) {
      await insLigne.run(pid, m.nom_medicament, m.dosage || null, m.duree || null, m.instructions || null);
    }
    return pid;
  });

  const id = await creer();
  broadcast('data-change', { resource: 'prescriptions' });
  res.status(201).json({ id, message: 'Prescription médicaments enregistrée.' });
});

// POST /api/prescriptions/consultation-specialiste
router.post('/consultation-specialiste', authenticate, requireRole('medecin'), async (req, res) => {
  const db = getDb();
  const { assure_id, feuille_id, date_prescription, notes, specialiste_id, specialite_requise, urgence, motif } = req.body;
  if (!assure_id || !specialite_requise)
    return res.status(400).json({ error: 'Assuré et spécialité requise requis.' });

  const assure = await db.prepare('SELECT id FROM assures WHERE id=? AND actif=1').get(assure_id);
  if (!assure) return res.status(404).json({ error: 'Assuré introuvable.' });

  if (specialiste_id) {
    const spec = await db.prepare("SELECT type FROM medecins WHERE id=?").get(specialiste_id);
    if (!spec || spec.type !== 'specialiste')
      return res.status(400).json({ error: 'Le médecin désigné doit être un spécialiste.' });
  }

  const med = await db.prepare('SELECT id FROM medecins WHERE utilisateur_id=?').get(req.user.id);
  if (!med) return res.status(403).json({ error: 'Compte non lié à un médecin.' });

  const creer = db.transaction(async () => {
    const pInfo = await db.prepare(`
      INSERT INTO prescriptions (type,medecin_id,assure_id,feuille_id,date_prescription,notes)
      VALUES ('consultation_specialiste',?,?,?,?,?)
    `).run(med.id, assure_id, feuille_id || null, date_prescription || null, notes || null);

    await db.prepare(`
      INSERT INTO prescription_consultation (prescription_id,specialiste_id,specialite_requise,urgence,motif)
      VALUES (?,?,?,?,?)
    `).run(pInfo.lastInsertRowid, specialiste_id || null, specialite_requise,
           urgence || 'normale', motif || null);

    return pInfo.lastInsertRowid;
  });

  const id = await creer();
  broadcast('data-change', { resource: 'prescriptions' });
  res.status(201).json({ id, message: 'Prescription consultation spécialiste enregistrée.' });
});

module.exports = router;
