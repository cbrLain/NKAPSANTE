// db/seed.js — Données de démonstration
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { getDb } = require('./database');

const db = getDb();

console.log('🌱 Seeding database...');

// ── Utilisateurs ──────────────────────────────────────────────
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO utilisateurs (identifiant, mot_de_passe, role, nom, prenom)
  VALUES (?, ?, ?, ?, ?)
`);
const hash = (p) => bcrypt.hashSync(p, 10);

insertUser.run('assureur01', hash('assureur123'), 'assureur', 'NOUMSSI', 'Elvira');
insertUser.run('assureur02', hash('assureur123'), 'assureur', 'ABONDO', 'Mark');
insertUser.run('medecin01',  hash('medecin123'),  'medecin',  'MAWAMBA', 'Princesse');
insertUser.run('medecin02',  hash('medecin123'),  'medecin',  'BILONGO', 'Laurent');
insertUser.run('medecin03',  hash('medecin123'),  'medecin',  'KIKI', 'Daniel');

// ── Personnes + Médecins ──────────────────────────────────────
const insertPersonne = db.prepare(`
  INSERT OR IGNORE INTO personnes (nom, prenom, date_naissance, adresse, telephone, email)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const insertMedecin = db.prepare(`
  INSERT OR IGNORE INTO medecins (personne_id, identifiant, type, specialite, utilisateur_id)
  VALUES (?, ?, ?, ?, ?)
`);

function seedMedecin(nom, prenom, dob, tel, email, identifiant, type, specialite, userId) {
  const info = insertPersonne.run(nom, prenom, dob, 'Yaoundé, Cameroun', tel, email);
  const pid = info.lastInsertRowid || db.prepare('SELECT id FROM personnes WHERE email=?').get(email)?.id;
  insertMedecin.run(pid, identifiant, type, specialite || null, userId || null);
}

seedMedecin('MAWAMBA DJOMO', 'Princesse',   '1980-03-15', '699000001', 'p.mawamba@enspy.cm', 'MED-001', 'generaliste',  null,           3);
seedMedecin('BILONGO MINLO', 'Laurent',     '1978-07-22', '699000002', 'l.bilongo@enspy.cm', 'MED-002', 'generaliste',  null,           4);
seedMedecin('KIKI DANIEL',   'Bryan',       '1975-11-08', '699000003', 'd.kiki@enspy.cm',    'MED-003', 'specialiste',  'Cardiologie',  5);
seedMedecin('TALLA TEYO',    'Sylvain',     '1970-05-30', '699000004', 's.talla@enspy.cm',   'MED-004', 'specialiste',  'Neurologie',   null);
seedMedecin('WAFO TEGUO',    'Vitric',      '1982-09-14', '699000005', 'v.wafo@enspy.cm',    'MED-005', 'specialiste',  'Dermatologie', null);
seedMedecin('ONDOA MANGA',   'Harry Johan', '1985-01-20', '699000006', 'h.ondoa@enspy.cm',   'MED-006', 'generaliste',  null,           null);

// ── Assurés ────────────────────────────────────────────────────
const insertAssure = db.prepare(`
  INSERT OR IGNORE INTO assures (personne_id, numero_ss, medecin_traitant_id, date_inscription)
  VALUES (?, ?, ?, ?)
`);

function seedAssure(nom, prenom, dob, tel, email, nss, medecinTraitantId, dateInscription) {
  const info = insertPersonne.run(nom, prenom, dob, 'Yaoundé, Cameroun', tel, email);
  const pid  = info.lastInsertRowid || db.prepare('SELECT id FROM personnes WHERE email=?').get(email)?.id;
  insertAssure.run(pid, nss, medecinTraitantId, dateInscription);
}

const med1Id = db.prepare("SELECT id FROM medecins WHERE identifiant='MED-001'").get()?.id;
const med2Id = db.prepare("SELECT id FROM medecins WHERE identifiant='MED-002'").get()?.id;
const med6Id = db.prepare("SELECT id FROM medecins WHERE identifiant='MED-006'").get()?.id;

seedAssure('ASSAM ESSI', 'Camille',   '1990-04-12', '677000001', 'c.assam@gmail.com',   '1-900412-001-23', med1Id, '2024-01-10');
seedAssure('BAKOTCHA',   'Loïc',      '1985-08-25', '677000002', 'l.bakotcha@gmail.com','1-850825-002-21', med1Id, '2024-02-15');
seedAssure('DJOKAM',     'Franck',    '1995-12-03', '677000003', 'f.djokam@gmail.com',  '1-951203-003-23', med2Id, '2024-03-20');
seedAssure('MEGOUEO',    'Davy',      '1988-06-17', '677000004', 'd.megoueo@gmail.com', '1-880617-004-23', med2Id, '2024-04-05');
seedAssure('NSOBÉ',      'Chamberlain','1992-02-28','677000005', 'c.nsobe@gmail.com',   '1-920228-005-23', med6Id, '2024-05-12');
seedAssure('TACHAGO',    'Eugénie',   '1993-09-09', '677000006', 'e.tachago@gmail.com', '2-930909-006-23', med6Id, '2024-06-18');

// ── Feuilles de maladie ────────────────────────────────────────
const insertFeuille = db.prepare(`
  INSERT OR IGNORE INTO feuilles_maladie
  (reference, assure_id, medecin_id, date_consultation, diagnostic, actes_medicaux,
   statut, montant_honoraires, montant_remboursement, taux_remboursement, mode_paiement, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const a1 = db.prepare("SELECT id FROM assures WHERE numero_ss='1-900412-001-23'").get()?.id;
const a2 = db.prepare("SELECT id FROM assures WHERE numero_ss='1-850825-002-21'").get()?.id;
const a3 = db.prepare("SELECT id FROM assures WHERE numero_ss='1-951203-003-23'").get()?.id;
const a4 = db.prepare("SELECT id FROM assures WHERE numero_ss='1-880617-004-23'").get()?.id;

insertFeuille.run('FM-2024-001', a1, med1Id, '2024-01-15', 'Grippe saisonnière',
  'Consultation générale, prise de sang', 'Remboursée', 15000, 10500, 0.7, 'virement',
  'Remboursement effectué par virement CMR Bank');

insertFeuille.run('FM-2024-002', a2, med1Id, '2024-02-20', 'Hypertension artérielle',
  'ECG, bilan biologique', 'Validée', 25000, 17500, 0.7, 'especes', null);

insertFeuille.run('FM-2024-003', a3, med2Id, '2024-03-10', 'Lombalgie chronique',
  'Radio lombaire, kinésithérapie x5', 'En cours de traitement', 40000, null, 0.7, null, null);

insertFeuille.run('FM-2024-004', a4, med2Id, '2024-04-05', 'Diabète type 2',
  'Glycémie, HbA1c', 'Incomplète', 20000, null, 0.8, null, 'Ordonnance manquante');

insertFeuille.run('FM-2024-005', a1, med1Id, '2024-05-12', 'Rhinite allergique',
  'Tests cutanés allergènes', 'Refusée', 18000, null, 0.7, null, 'Dossier incomplet - délai dépassé');

insertFeuille.run('FM-2024-006', a2, med2Id, '2024-06-01', 'Bronchite aiguë',
  'Radiographie pulmonaire', 'Transmise', 12000, null, 0.7, null, null);

// ── Remboursement ──────────────────────────────────────────────
const f1 = db.prepare("SELECT id FROM feuilles_maladie WHERE reference='FM-2024-001'").get()?.id;
const assureur1 = db.prepare("SELECT id FROM utilisateurs WHERE identifiant='assureur01'").get()?.id;

db.prepare(`
  INSERT OR IGNORE INTO remboursements (feuille_id, assure_id, assureur_id, montant, mode_paiement, reference_bancaire, statut)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(f1, a1, assureur1, 10500, 'virement', 'VIR-2024-001-CMR', 'effectue');

// ── Prescriptions ──────────────────────────────────────────────
const insertPrescription = db.prepare(`
  INSERT OR IGNORE INTO prescriptions (type, medecin_id, assure_id, feuille_id, date_prescription, notes)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const f3 = db.prepare("SELECT id FROM feuilles_maladie WHERE reference='FM-2024-003'").get()?.id;

const p1 = insertPrescription.run('medicaments', med2Id, a3, f3, '2024-03-10', 'Traitement antalgique');
db.prepare(`INSERT OR IGNORE INTO prescription_medicaments (prescription_id, nom_medicament, dosage, duree, instructions)
  VALUES (?, ?, ?, ?, ?)`).run(p1.lastInsertRowid, 'Paracétamol 1g', '3x/jour', '7 jours', 'Prendre après les repas');
db.prepare(`INSERT OR IGNORE INTO prescription_medicaments (prescription_id, nom_medicament, dosage, duree, instructions)
  VALUES (?, ?, ?, ?, ?)`).run(p1.lastInsertRowid, 'Ibuprofène 400mg', '2x/jour', '5 jours', 'Si douleur persiste');

const med3Id = db.prepare("SELECT id FROM medecins WHERE identifiant='MED-003'").get()?.id;
const p2 = insertPrescription.run('consultation_specialiste', med1Id, a1, null, '2024-01-20', 'Bilan cardiaque nécessaire');
db.prepare(`INSERT OR IGNORE INTO prescription_consultation (prescription_id, specialiste_id, specialite_requise, urgence, motif)
  VALUES (?, ?, ?, ?, ?)`).run(p2.lastInsertRowid, med3Id, 'Cardiologie', 'normale', 'Palpitations récurrentes depuis 3 mois');

console.log('✅ Base de données initialisée avec succès !');
console.log('');
console.log('Comptes de démonstration :');
console.log('  Assureur  → identifiant: assureur01  | mot de passe: assureur123');
console.log('  Médecin   → identifiant: medecin01   | mot de passe: medecin123');
