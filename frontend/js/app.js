/* js/app.js : Contrôleur principal */

// ── État global ────────────────────────────────────────────────
let currentUser  = null;
let currentPage  = 'dashboard';

// ── Initialisation ────────────────────────────────────────────
(function init() {
  // Date dans la topbar
  const now = new Date();
  document.getElementById('top-date').textContent =
    now.toLocaleDateString('fr-FR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });

  // Session existante ?
  const token = localStorage.getItem('ss_token');
  const user  = localStorage.getItem('ss_user');
  if (token && user) {
    currentUser = JSON.parse(user);
    showApp(currentUser);
  } else {
    showLanding();
  }
})();

// ── Login ─────────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('f-id').value.trim();
  const pw = document.getElementById('f-pw').value;
  const errEl = document.getElementById('login-err');
  const btnTx = document.querySelector('#btn-login .btn-text');
  const btnSp = document.querySelector('#btn-login .btn-spinner');
  errEl.classList.add('hidden');
  btnTx.classList.add('hidden'); btnSp.classList.remove('hidden');
  try {
    const { token, user } = await Api.login(id, pw);
    localStorage.setItem('ss_token', token);
    localStorage.setItem('ss_user', JSON.stringify(user));
    currentUser = user;
    showApp(user);
  } catch(err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btnTx.classList.remove('hidden'); btnSp.classList.add('hidden');
  }
});

function demo(id, pw) {
  document.getElementById('f-id').value = id;
  document.getElementById('f-pw').value = pw;
}

function switchLandingTab(tab) {
  document.querySelectorAll('.ltab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.ltab[data-ltab="${tab}"]`).classList.add('active');
  document.querySelectorAll('.ltab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('ltab-' + tab).classList.add('active');
}

function setRole(role) {
  document.querySelectorAll('.rtab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.rtab[data-role="${role}"]`).classList.add('active');
  const creds = { assureur: ['assureur01','assureur123'], medecin: ['medecin01','medecin123'] };
  demo(creds[role][0], creds[role][1]);
}

// ── Déconnexion ───────────────────────────────────────────────
document.getElementById('btn-logout').onclick = () => {
  localStorage.removeItem('ss_token');
  localStorage.removeItem('ss_user');
  currentUser = null;
  document.getElementById('f-id').value = '';
  document.getElementById('f-pw').value = '';
  showLanding();
};

// ── Afficher l'app ────────────────────────────────────────────
function showApp(user) {
  document.getElementById('screen-landing').classList.add('hidden');
  document.getElementById('screen-login').classList.add('hidden');
  document.getElementById('screen-app').classList.remove('hidden');

  // UI utilisateur
  const initials = (user.prenom[0] + user.nom[0]).toUpperCase();
  document.getElementById('s-avatar').textContent  = initials;
  document.getElementById('s-uname').textContent   = `${user.prenom} ${user.nom}`;
  document.getElementById('s-role').innerHTML      = user.role === 'assureur' ? '<i class="fas fa-user-cog"></i> Assureur' : '<i class="fas fa-stethoscope"></i> Médecin';
  document.getElementById('s-urole').textContent   = user.role === 'assureur' ? 'Agent NKAPSANTÉ' : 'Professionnel de santé';

  // Navigation selon rôle
  if (user.role === 'assureur') {
    document.getElementById('nav-assureur').classList.remove('hidden');
    document.getElementById('nav-medecin').classList.add('hidden');
  } else {
    document.getElementById('nav-medecin').classList.remove('hidden');
    document.getElementById('nav-assureur').classList.add('hidden');
  }

  navigateTo('dashboard');
}

function showLanding() {
  document.getElementById('screen-landing').classList.remove('hidden');
  document.getElementById('screen-login').classList.add('hidden');
  document.getElementById('screen-app').classList.add('hidden');
}

function showLogin() {
  document.getElementById('screen-landing').classList.add('hidden');
  document.getElementById('screen-login').classList.remove('hidden');
  document.getElementById('screen-app').classList.add('hidden');
}

// ── Navigation ────────────────────────────────────────────────
function navigateTo(page) {
  // Cache toutes les pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Met à jour nav
  document.querySelectorAll('.s-item').forEach(i => i.classList.remove('active'));
  const navItem = document.querySelector(`.s-item[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');

  // Affiche la page
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');

  // Titre
  const titles = {
    'dashboard':          'Tableau de bord',
    'assures':            'Gestion des Assurés',
    'medecins':           'Gestion des Médecins',
    'feuilles':           'Feuilles de Maladie',
    'remboursements':     'Remboursements',
    'mes-feuilles':       'Mes Feuilles de Maladie',
    'prescriptions-med':  'Prescriptions Médicaments',
    'consultations-spec': 'Consultations Spécialistes',
  };
  document.getElementById('page-title').textContent = titles[page] || page;
  currentPage = page;

  // Ferme sidebar mobile
  document.getElementById('sidebar').classList.remove('mob-open');

  // Charge les données
  loadPage(page);
}

function loadPage(page) {
  const role = currentUser?.role;
  switch(page) {
    case 'dashboard':          loadDashboard(role); break;
    case 'assures':            loadAssures(); break;
    case 'medecins':           loadMedecins(); break;
    case 'feuilles':           loadFeuilles(); break;
    case 'remboursements':     loadRemboursements(); break;
    case 'mes-feuilles':       loadMesFeuilles(); break;
    case 'prescriptions-med':  loadPrescriptionsMed(); break;
    case 'consultations-spec': loadConsultationsSpec(); break;
  }
}

// ── Liens de navigation ───────────────────────────────────────
document.getElementById('sidebar-nav').addEventListener('click', e => {
  const item = e.target.closest('.s-item[data-page]');
  if (item) { e.preventDefault(); navigateTo(item.dataset.page); }
});

// ── Sidebar collapse ──────────────────────────────────────────
document.getElementById('btn-collapse').onclick = () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
};

// ── Menu mobile ───────────────────────────────────────────────
document.getElementById('btn-menu').onclick = () => {
  document.getElementById('sidebar').classList.toggle('mob-open');
};

// ── Overlay mobile ────────────────────────────────────────────
document.getElementById('screen-app').addEventListener('click', e => {
  const sidebar = document.getElementById('sidebar');
  if (sidebar.classList.contains('mob-open') && !sidebar.contains(e.target)) {
    sidebar.classList.remove('mob-open');
  }
});
