-- ============================================================
--  SCHEMA SQLite — Organisme de Sécurité Sociale (ENSPY 2025)
-- ============================================================
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ── Utilisateurs du SI (assureurs + médecins avec compte) ──
CREATE TABLE IF NOT EXISTS utilisateurs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  identifiant TEXT UNIQUE NOT NULL,
  mot_de_passe TEXT NOT NULL,
  role        TEXT CHECK(role IN ('assureur','medecin')) NOT NULL,
  nom         TEXT NOT NULL,
  prenom      TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Personnes (super-classe) ──
CREATE TABLE IF NOT EXISTS personnes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nom            TEXT NOT NULL,
  prenom         TEXT NOT NULL,
  date_naissance DATE,
  adresse        TEXT,
  telephone      TEXT,
  email          TEXT
);

-- ── Médecins ──
CREATE TABLE IF NOT EXISTS medecins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  personne_id   INTEGER REFERENCES personnes(id) ON DELETE CASCADE,
  identifiant   TEXT UNIQUE NOT NULL,
  type          TEXT CHECK(type IN ('generaliste','specialiste')) NOT NULL,
  specialite    TEXT,
  utilisateur_id INTEGER REFERENCES utilisateurs(id)
);

-- ── Assurés ──
CREATE TABLE IF NOT EXISTS assures (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  personne_id         INTEGER REFERENCES personnes(id) ON DELETE CASCADE,
  numero_ss           TEXT UNIQUE NOT NULL,
  medecin_traitant_id INTEGER REFERENCES medecins(id),
  date_inscription    DATE DEFAULT CURRENT_DATE,
  actif               INTEGER DEFAULT 1
);

-- ── Feuilles de maladie ──
-- États: Brouillon→Transmise→En cours de traitement→Incomplète|Validée|Refusée→Remboursée
CREATE TABLE IF NOT EXISTS feuilles_maladie (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  reference            TEXT UNIQUE NOT NULL,
  assure_id            INTEGER REFERENCES assures(id) NOT NULL,
  medecin_id           INTEGER REFERENCES medecins(id) NOT NULL,
  date_consultation    DATE NOT NULL,
  diagnostic           TEXT NOT NULL,
  actes_medicaux       TEXT,
  statut               TEXT CHECK(statut IN (
    'Brouillon','Transmise','En cours de traitement',
    'Incomplète','Refusée','Validée','Remboursée','Supprimée'
  )) DEFAULT 'Brouillon',
  montant_honoraires   REAL,
  montant_remboursement REAL,
  taux_remboursement   REAL DEFAULT 0.7,
  mode_paiement        TEXT CHECK(mode_paiement IN ('especes','virement')),
  notes                TEXT,
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Remboursements ──
CREATE TABLE IF NOT EXISTS remboursements (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  feuille_id          INTEGER REFERENCES feuilles_maladie(id) NOT NULL,
  assure_id           INTEGER REFERENCES assures(id) NOT NULL,
  assureur_id         INTEGER REFERENCES utilisateurs(id),
  montant             REAL NOT NULL,
  mode_paiement       TEXT CHECK(mode_paiement IN ('especes','virement')) NOT NULL,
  reference_bancaire  TEXT,
  date_remboursement  DATETIME DEFAULT CURRENT_TIMESTAMP,
  statut              TEXT CHECK(statut IN ('en_attente','effectue','echec')) DEFAULT 'effectue'
);

-- ── Prescriptions (base) ──
CREATE TABLE IF NOT EXISTS prescriptions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  type         TEXT CHECK(type IN ('medicaments','consultation_specialiste')) NOT NULL,
  medecin_id   INTEGER REFERENCES medecins(id) NOT NULL,
  assure_id    INTEGER REFERENCES assures(id) NOT NULL,
  feuille_id   INTEGER REFERENCES feuilles_maladie(id),
  date_prescription DATE DEFAULT CURRENT_DATE,
  notes        TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Lignes de prescription médicaments ──
CREATE TABLE IF NOT EXISTS prescription_medicaments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  prescription_id INTEGER REFERENCES prescriptions(id) ON DELETE CASCADE,
  nom_medicament  TEXT NOT NULL,
  dosage          TEXT,
  duree           TEXT,
  instructions    TEXT
);

-- ── Prescription consultation spécialiste ──
CREATE TABLE IF NOT EXISTS prescription_consultation (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  prescription_id   INTEGER REFERENCES prescriptions(id) ON DELETE CASCADE,
  specialiste_id    INTEGER REFERENCES medecins(id),
  specialite_requise TEXT NOT NULL,
  urgence           TEXT CHECK(urgence IN ('normale','urgente')) DEFAULT 'normale',
  motif             TEXT
);
