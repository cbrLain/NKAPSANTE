/* js/pages/dashboard.js */
async function loadDashboard(role) {
  try {
    const d = await Api.getStats();
    const grid = document.getElementById('stats-grid');

    if (role === 'assureur') {
      grid.innerHTML = `
        <div class="stat-card"><div class="stat-ico"><i class="fas fa-users"></i></div><div><div class="stat-val">${d.totalAssures}</div><div class="stat-lbl">Assurés actifs</div></div></div>
        <div class="stat-card"><div class="stat-ico"><i class="fas fa-user-md"></i></div><div><div class="stat-val">${d.totalMedecins}</div><div class="stat-lbl">Médecins enregistrés</div></div></div>
        <div class="stat-card"><div class="stat-ico"><i class="fas fa-file-invoice"></i></div><div><div class="stat-val">${d.totalFeuilles}</div><div class="stat-lbl">Feuilles de maladie</div></div></div>
        <div class="stat-card"><div class="stat-ico"><i class="fas fa-credit-card"></i></div><div><div class="stat-val">${fmtMoney(d.totalRemb)}</div><div class="stat-lbl">Total remboursé</div></div></div>
      `;
    } else {
      grid.innerHTML = `
        <div class="stat-card"><div class="stat-ico"><i class="fas fa-file-invoice"></i></div><div><div class="stat-val">${d.totalFeuilles}</div><div class="stat-lbl">Mes feuilles</div></div></div>
        <div class="stat-card"><div class="stat-ico"><i class="fas fa-prescription-bottle-alt"></i></div><div><div class="stat-val">${d.totalPrescriptions}</div><div class="stat-lbl">Prescriptions émises</div></div></div>
      `;
    }

    // Activité récente
    const actList = document.getElementById('activity-list');
    actList.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'activity-list';
    const dotColors = { 'Remboursée':'#28a745','Validée':'#6610f2','Refusée':'#dc3545','En cours de traitement':'#17a2b8','Incomplète':'#ffc107','Transmise':'#007bff','Brouillon':'#6c757d','Supprimée':'#adb5bd' };
    if (d.activiteRecente?.length) {
      el.innerHTML = d.activiteRecente.map(a => `
        <div class="act-item">
          <div class="act-dot" style="background:${dotColors[a.statut]||'#6c757d'}"></div>
          <div><div class="act-text">${a.texte} : ${badgeStatut(a.statut)}</div>
          <div class="act-time">${fmtDateTime(a.date)}</div></div>
        </div>
      `).join('');
    } else {
      el.innerHTML = '<div class="empty"><i class="fas fa-inbox"></i><h4>Aucune activité</h4></div>';
    }
    actList.appendChild(el);

    // Chart
    if (d.parStatut?.length) {
      setTimeout(() => drawDonut('chart-statut', d.parStatut), 100);
    }
  } catch(e) {
    console.error(e);
  }
}
