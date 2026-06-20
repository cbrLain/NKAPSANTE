-- ============================================================
--  SCHEMA PostgreSQL — Organisme de Sécurité Sociale (ENSPY 2025)
-- ============================================================

CREATE TABLE IF NOT EXISTS utilisateurs (
  id          SERIAL PRIMARY KEY,
  identifiant TEXT UNIQUE NOT NULL,
  mot_de_passe TEXT NOT NULL,
  role        TEXT CHECK(role IN ('assureur','medecin')) NOT NULL,
  nom         TEXT NOT NULL,
  prenom      TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS personnes (
  id             SERIAL PRIMARY KEY,
  nom            TEXT NOT NULL,
  prenom         TEXT NOT NULL,
  date_naissance DATE,
  adresse        TEXT,
  telephone      TEXT,
  email          TEXT
);

CREATE TABLE IF NOT EXISTS medecins (
  id            SERIAL PRIMARY KEY,
  personne_id   INTEGER REFERENCES personnes(id) ON DELETE CASCADE,
  identifiant   TEXT UNIQUE NOT NULL,
  type          TEXT CHECK(type IN ('generaliste','specialiste')) NOT NULL,
  specialite    TEXT,
  utilisateur_id INTEGER REFERENCES utilisateurs(id)
);

CREATE TABLE IF NOT EXISTS assures (
  id                  SERIAL PRIMARY KEY,
  personne_id         INTEGER REFERENCES personnes(id) ON DELETE CASCADE,
  numero_ss           TEXT UNIQUE NOT NULL,
  medecin_traitant_id INTEGER REFERENCES medecins(id) ON DELETE SET NULL,
  date_inscription    DATE DEFAULT CURRENT_DATE,
  actif               INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS feuilles_maladie (
  id                   SERIAL PRIMARY KEY,
  reference            TEXT UNIQUE NOT NULL,
  assure_id            INTEGER REFERENCES assures(id) ON DELETE CASCADE NOT NULL,
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
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS remboursements (
  id                  SERIAL PRIMARY KEY,
  feuille_id          INTEGER REFERENCES feuilles_maladie(id) ON DELETE CASCADE NOT NULL,
  assure_id           INTEGER REFERENCES assures(id) ON DELETE CASCADE NOT NULL,
  assureur_id         INTEGER REFERENCES utilisateurs(id),
  montant             REAL NOT NULL,
  mode_paiement       TEXT CHECK(mode_paiement IN ('especes','virement')) NOT NULL,
  reference_bancaire  TEXT,
  date_remboursement  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  statut              TEXT CHECK(statut IN ('en_attente','effectue','echec')) DEFAULT 'effectue'
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id           SERIAL PRIMARY KEY,
  type         TEXT CHECK(type IN ('medicaments','consultation_specialiste')) NOT NULL,
  medecin_id   INTEGER REFERENCES medecins(id) NOT NULL,
  assure_id    INTEGER REFERENCES assures(id) ON DELETE CASCADE NOT NULL,
  feuille_id   INTEGER REFERENCES feuilles_maladie(id),
  date_prescription DATE DEFAULT CURRENT_DATE,
  notes        TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prescription_medicaments (
  id              SERIAL PRIMARY KEY,
  prescription_id INTEGER REFERENCES prescriptions(id) ON DELETE CASCADE,
  nom_medicament  TEXT NOT NULL,
  dosage          TEXT,
  duree           TEXT,
  instructions    TEXT
);

CREATE TABLE IF NOT EXISTS prescription_consultation (
  id                SERIAL PRIMARY KEY,
  prescription_id   INTEGER REFERENCES prescriptions(id) ON DELETE CASCADE,
  specialiste_id    INTEGER REFERENCES medecins(id),
  specialite_requise TEXT NOT NULL,
  urgence           TEXT CHECK(urgence IN ('normale','urgente')) DEFAULT 'normale',
  motif             TEXT
);
