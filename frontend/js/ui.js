/* js/ui.js : Composants UI réutilisables */

// ── Toast ──────────────────────────────────────────────────────
function toast(msg, type = 'info', dur = 3500) {
  const icons = { 
    success: '<i class="fas fa-check-circle"></i>', 
    error: '<i class="fas fa-times-circle"></i>', 
    info: '<i class="fas fa-info-circle"></i>', 
    warning: '<i class="fas fa-exclamation-triangle"></i>' 
  };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type]||icons.info}</span><span>${msg}</span>`;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), dur);
}

// ── Modal ──────────────────────────────────────────────────────
const Modal = {
  open(title, bodyHTML, footer = '') {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-bd').innerHTML = bodyHTML;
    document.getElementById('modal-ft').innerHTML = footer;
    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('modal-box').classList.remove('wide');
  },
  wide(title, bodyHTML, footer = '') {
    this.open(title, bodyHTML, footer);
    document.getElementById('modal-box').classList.add('wide');
  },
  close() { document.getElementById('modal').classList.add('hidden'); },
};
document.getElementById('modal-close').onclick = () => Modal.close();
document.getElementById('modal').addEventListener('click', e => {
  if (e.target.id === 'modal') Modal.close();
});

// ── Badges statut feuille ─────────────────────────────────────
function badgeStatut(s) {
  const map = {
    'Brouillon':             { c: 'b-secondary', i: 'fas fa-pen' },
    'Transmise':             { c: 'b-light', i: 'fas fa-paper-plane' },
    'En cours de traitement':{ c: 'b-primary-light', i: 'fas fa-hourglass-half' },
    'Incomplète':            { c: 'b-light', i: 'fas fa-exclamation-circle' },
    'Validée':               { c: 'b-success-light', i: 'fas fa-check-square' },
    'Remboursée':            { c: 'b-success', i: 'fas fa-money-bill-wave' },
    'Refusée':               { c: 'b-danger', i: 'fas fa-times-circle' },
    'Supprimée':             { c: 'b-secondary', i: 'fas fa-trash-alt' },
  };
  const m = map[s] || { c: 'b-light', i: 'fas fa-circle' };
  return `<span class="badge ${m.c}"><i class="${m.i}"></i> ${s}</span>`;
}
function badgeType(t) {
  return t === 'generaliste'
    ? '<span class="badge b-success-light"><i class="fas fa-stethoscope"></i> Généraliste</span>'
    : '<span class="badge b-primary-light"><i class="fas fa-microscope"></i> Spécialiste</span>';
}
function badgeMode(m) {
  return m === 'virement'
    ? '<span class="badge b-primary-light"><i class="fas fa-university"></i> Virement</span>'
    : '<span class="badge b-success-light"><i class="fas fa-coins"></i> Espèces</span>';
}

// ── Formatage ─────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function fmtMoney(n) {
  if (!n && n !== 0) return '';
  return new Intl.NumberFormat('fr-CM', { style:'currency', currency:'XAF', minimumFractionDigits:0 }).format(n);
}
function fmtDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

// ── Tableau vide ──────────────────────────────────────────────
function emptyRow(cols, msg = 'Aucun résultat') {
  return `<tr><td colspan="${cols}" class="empty"><i class="fas fa-search"></i><h4>${msg}</h4></td></tr>`;
}

// ── Loader ────────────────────────────────────────────────────
function setLoader(tbodyId, cols) {
  const tb = document.getElementById(tbodyId);
  if (tb) tb.innerHTML = `<tr><td colspan="${cols}" class="loader"><i class="fas fa-spinner" style="animation: spin 1s linear infinite"></i> Chargement…</td></tr>`;
}

// ── Mini chart (canvas donut) ─────────────────────────────────
function drawDonut(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !data?.length) return;
  const ctx = canvas.getContext('2d');
  const colors = {
    'Brouillon':'#e2e8f0','Transmise':'#f1f5f9','En cours de traitement':'#86efac',
    'Incomplète':'#cbd5e1','Validée':'#4ade80','Remboursée':'#16a34a',
    'Refusée':'#ef4444','Supprimée':'#e2e8f0'
  };
  const total = data.reduce((s, d) => s + d.n, 0);
  const cx = canvas.width / 2, cy = canvas.height / 2, r = Math.min(cx, cy) - 20;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let start = -Math.PI / 2;
  data.forEach(d => {
    const angle = (d.n / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.fillStyle = colors[d.statut] || '#94a3b8';
    ctx.fill();
    start += angle;
  });
  // Trou centre
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  // Texte centre
  ctx.fillStyle = '#212529';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(total, cx, cy - 6);
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = '#6c757d';
  ctx.fillText('dossiers', cx, cy + 12);

  // Légende
  const legendY = cy + r + 14;
  let lx = 10;
  data.forEach(d => {
    if (lx > canvas.width - 60) return;
    ctx.fillStyle = colors[d.statut] || '#adb5bd';
    ctx.fillRect(lx, legendY, 10, 10);
    ctx.fillStyle = '#495057';
    ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${d.statut.split(' ')[0]} (${d.n})`, lx + 14, legendY + 8);
    lx += ctx.measureText(`${d.statut.split(' ')[0]} (${d.n})`).width + 30;
  });
}
