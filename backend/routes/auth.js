// routes/auth.js
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { getDb } = require('../db/database');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { identifiant, mot_de_passe } = req.body;
  if (!identifiant || !mot_de_passe)
    return res.status(400).json({ error: 'Identifiant et mot de passe requis.' });

  const db   = getDb();
  const user = await db.prepare('SELECT * FROM utilisateurs WHERE identifiant = ?').get(identifiant);
  if (!user || !bcrypt.compareSync(mot_de_passe, user.mot_de_passe))
    return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });

  const token = jwt.sign(
    { id: user.id, identifiant: user.identifiant, role: user.role, nom: user.nom, prenom: user.prenom },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token, user: { id: user.id, identifiant: user.identifiant, role: user.role, nom: user.nom, prenom: user.prenom } });
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
