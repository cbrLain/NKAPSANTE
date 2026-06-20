# 🏥 SecuraSanté — Système d'Information pour Organisme de Sécurité Sociale

> **ENSPY — Génie Informatique 3ème année · Groupe 4 · 2025/2026**  
> Projet tuteuré CSI — Conception de Systèmes d'Information

---

## 📋 À propos du projet

Ce projet implémente le **Système d'Information** pour un **Organisme de Sécurité Sociale** modélisé dans le rapport UML (Rapport_csi.pdf). Il couvre l'intégralité des cas d'utilisation identifiés lors de la phase d'analyse.

### Acteurs du système
| Acteur | Rôle |
|---|---|
| 🧑‍💼 **Assureur** | Agent de l'OSS — gère les assurés, médecins, remboursements |
| 👨‍⚕️ **Médecin** | Généraliste ou spécialiste — crée les feuilles de maladie, prescriptions |
| 🏦 **Système bancaire** | Acteur externe — reçoit les ordres de virement |

### Cas d'utilisation implémentés (tirés du PDF)
| # | Cas d'utilisation | Acteur | Statut |
|---|---|---|---|
| 1 | Authentification | Médecin / Assureur | ✅ |
| 2 | Inscrire un assuré | Assureur | ✅ |
| 3 | Enregistrer un médecin traitant | Assureur | ✅ |
| 4 | Enregistrer une feuille de maladie | Médecin | ✅ |
| 5 | Compléter une feuille de maladie | Assureur | ✅ |
| 6 | Effectuer le remboursement (espèces / virement) | Assureur | ✅ |
| 7 | Imprimer une facture de remboursement | Assureur | ✅ |
| 8 | Prescrire des médicaments | Médecin | ✅ |
| 9 | Prescrire une consultation chez un spécialiste | Médecin | ✅ |

### Machine à états — Feuille de maladie (diagramme d'état-transition du PDF)
```
Brouillon ──[Envoyer]──► Transmise ──[Ouverture OSS]──► En cours de traitement
    │                        │                                │         │
    └──[Annuler]──► Supprimée└──[Erreur critique]──► Refusée  │         │
                                                               │         │
                                          [Pièce manquante]◄──┘         │
                                               │                         │
                                          Incomplète                     │
                                               │                         │
                                    [Réception pièce]                    │
                                               └──────────────────────►  │
                                                                    [Validation]
                                                                         │
                                                                      Validée
                                                                         │
                                                              [Exécution remboursement]
                                                                         │
                                                                     Remboursée ✅
```

---

## 🏗️ Architecture technique

```
PROJET CSI/
├── 📄 Rapport_csi (2).pdf       ← Rapport UML source
│
├── backend/                     ← API REST Node.js
│   ├── server.js                ← Point d'entrée Express
│   ├── .env                     ← Variables d'environnement
│   ├── db/
│   │   ├── schema.sql           ← Schéma SQLite (tables, contraintes)
│   │   ├── database.js          ← Connexion singleton SQLite
│   │   └── seed.js              ← Données de démonstration
│   ├── middleware/
│   │   └── auth.js              ← Vérification JWT + contrôle de rôle
│   └── routes/
│       ├── auth.js              ← POST /api/auth/login
│       ├── assures.js           ← CRUD assurés + médecin traitant
│       ├── medecins.js          ← CRUD médecins
│       ├── feuilles.js          ← Feuilles de maladie + machine à états
│       ├── remboursements.js    ← Remboursements + facture
│       ├── prescriptions.js     ← Médicaments + consultations spécialistes
│       └── stats.js             ← Statistiques tableau de bord
│
└── frontend/                    ← Interface HTML/CSS/JS pure
    ├── index.html               ← SPA — tous les écrans
    ├── css/
    │   └── main.css             ← Design system dark glassmorphism
    └── js/
        ├── api.js               ← Client HTTP (fetch + JWT)
        ├── ui.js                ← Composants : toast, modal, badges, chart
        ├── app.js               ← Routeur principal + gestion session
        └── pages/
            ├── dashboard.js     ← Stats + graphique donut
            ├── assures.js       ← Liste, inscription, médecin traitant
            ├── medecins.js      ← Liste, enregistrement
            ├── feuilles.js      ← Feuilles + transitions d'état
            ├── remboursements.js← Remboursement + impression facture
            └── prescriptions.js ← Médicaments + consultation spécialiste
```

### Stack technologique
| Couche | Technologie |
|---|---|
| Runtime | Node.js |
| Framework API | Express.js |
| Base de données | SQLite (via `better-sqlite3`) |
| Authentification | JWT (`jsonwebtoken`) + bcrypt |
| Frontend | HTML5 / CSS3 / JavaScript ES6+ (pur, sans framework) |
| Police | Google Fonts — Inter + Outfit |

---

## 🚀 Installation et démarrage

### Prérequis
- **Node.js** ≥ 18 (`node --version`)
- **npm** ≥ 9 (`npm --version`)

### 1️⃣ Installer les dépendances backend
```bash
cd backend
npm install
```

### 2️⃣ Initialiser la base de données (seed)
```bash
node db/seed.js
```
> Crée `backend/db/securasante.db` avec des données de démonstration.

### 3️⃣ Démarrer le serveur
```bash
# Mode production
npm start

# Mode développement (rechargement automatique)
npm run dev
```

### 4️⃣ Ouvrir l'application
```
http://localhost:3001
```

> Le backend sert automatiquement le frontend depuis `../frontend/`.

---

## 🔑 Comptes de démonstration

| Rôle | Identifiant | Mot de passe | Accès |
|---|---|---|---|
| 🧑‍💼 Assureur | `assureur01` | `assureur123` | Assurés, Médecins, Feuilles, Remboursements |
| 🧑‍💼 Assureur | `assureur02` | `assureur123` | Idem |
| 👨‍⚕️ Médecin | `medecin01` | `medecin123` | Feuilles de maladie, Prescriptions |
| 👨‍⚕️ Médecin | `medecin02` | `medecin123` | Idem |

---

## 📡 API REST — Endpoints

### Authentification
```
POST   /api/auth/login          Corps: { identifiant, mot_de_passe }
GET    /api/auth/me             (token requis)
```

### Assurés
```
GET    /api/assures             ?q=<recherche>
GET    /api/assures/:id
POST   /api/assures             (rôle: assureur)
PUT    /api/assures/:id         (rôle: assureur)
PATCH  /api/assures/:id/medecin-traitant  (rôle: assureur)
DELETE /api/assures/:id         Désactivation logique
```

### Médecins
```
GET    /api/medecins            ?q=<recherche>&type=generaliste|specialiste
GET    /api/medecins/:id
POST   /api/medecins            (rôle: assureur)
PUT    /api/medecins/:id        (rôle: assureur)
```

### Feuilles de maladie
```
GET    /api/feuilles            ?q=&statut=&assure_id=&medecin_id=
GET    /api/feuilles/:id
POST   /api/feuilles            (rôle: medecin) → crée en Brouillon
PATCH  /api/feuilles/:id/statut             → transitions d'état
PATCH  /api/feuilles/:id/completer          → (rôle: assureur)
```

### Remboursements
```
GET    /api/remboursements      (rôle: assureur)
GET    /api/remboursements/:id
POST   /api/remboursements      (rôle: assureur) — depuis feuille Validée
GET    /api/remboursements/:id/facture
```

### Prescriptions
```
GET    /api/prescriptions       ?type=medicaments|consultation_specialiste
POST   /api/prescriptions/medicaments              (rôle: medecin)
POST   /api/prescriptions/consultation-specialiste (rôle: medecin)
```

### Statistiques
```
GET    /api/stats               Adapté selon le rôle de l'utilisateur
```

---

## 🗄️ Modèle de données (schéma SQL)

```
utilisateurs          ← comptes d'accès au SI
personnes             ← super-classe (Nom, Prénom, contact)
medecins              ← lié à personnes (type: generaliste|specialiste)
assures               ← lié à personnes + medecin_traitant
feuilles_maladie      ← document central avec machine à états
remboursements        ← lié à feuille + assuré
prescriptions         ← base (type: medicaments|consultation_specialiste)
prescription_medicaments       ← lignes de médicaments
prescription_consultation      ← détail consultation spécialiste
```

> 💡 La base de données SQLite est créée automatiquement au démarrage dans `backend/db/securasante.db`. **Aucun serveur de base de données n'est requis.**

---

## 🔄 Intégration d'une vraie base de données (PostgreSQL/MySQL)

Pour passer de SQLite à PostgreSQL en production :

### 1. Installer le driver
```bash
npm install pg
# ou pour MySQL:
npm install mysql2
```

### 2. Remplacer `db/database.js`
```js
// PostgreSQL avec pg
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ex: postgres://user:pass@localhost:5432/securasante
});
module.exports = { query: (text, params) => pool.query(text, params) };
```

### 3. Adapter les requêtes
- SQLite utilise `?` comme placeholder → PostgreSQL utilise `$1, $2, ...`
- `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`
- `DATETIME DEFAULT CURRENT_TIMESTAMP` → `TIMESTAMPTZ DEFAULT NOW()`

### 4. Variables d'environnement `.env`
```env
DATABASE_URL=postgres://user:password@localhost:5432/securasante
JWT_SECRET=votre_secret_jwt_fort
PORT=3001
NODE_ENV=production
```

---

## 🔐 Sécurité

| Mesure | Détail |
|---|---|
| Mots de passe | Hachés avec **bcrypt** (coût 10) |
| Sessions | **JWT** avec expiration 8h |
| Contrôle d'accès | Middleware `requireRole()` sur chaque route sensible |
| Données | Requêtes préparées SQLite (protection injection SQL) |
| CORS | Configurable dans `server.js` (restreindre en production) |

---

## 🧪 Test rapide de l'API avec curl

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifiant":"assureur01","mot_de_passe":"assureur123"}'

# Récupérer les assurés (remplacer TOKEN)
curl http://localhost:3001/api/assures \
  -H "Authorization: Bearer TOKEN"

# Récupérer les feuilles de maladie
curl http://localhost:3001/api/feuilles \
  -H "Authorization: Bearer TOKEN"
```

---

## 👥 Équipe — Groupe 4 ENSPY

| Nom | Matricule |
|---|---|
| NOUMSSI CHEGUIEU Elvira *(Chef)* | 23P620 |
| NSOBE KENGNE Chamberlain | 23P619 |
| ABONDO MARK Cedrick | 23P303 |
| ACHINGUI PHILIPPE Sharon | 20P301 |
| ASSAM ESSI Camille Georg. | 23P488 |
| BAKOTCHA Loïc | 21P320 |
| BILONGO MINLO Laurent Ra. | 23P284 |
| DJOKAM MFOMO Franck Cha. | 23P224 |
| KIKI DANIEL Bryan | 23P682 |
| MAWAMBA DJOMO Princesse | 23P629 |
| MCHOUROUPUO LA' Ahmed A. | 22P473 |
| MEGOUEO Davy | 23P427 |
| MOAMOASSE Lorryl Pierre | 18P113 |
| ONDOA MANGA Harry Johan | 23P262 |
| TACHAGO EUGÉNIE Rebecca | 23P463 |
| TALLA TEYO Sylvain | 23P646 |
| TSAFACK DJOUKENG Miderli | 23P572 |
| WAFO TEGUO Vitric Valère | 22P446 |

---

*SecuraSanté — ENSPY · Génie Informatique 3ème année · 2025/2026*
