/* js/pages/assures.js */
let assuresData = [];

async function loadAssures(q = '') {
  setLoader('tbody-assures', 6);
  try {
    assuresData = await Api.getAssures(q);
    renderAssures(assuresData);
  } catch(e) { toast(e.message, 'error'); }
}

function renderAssures(rows) {
  const tb = document.getElementById('tbody-assures');
  if (!rows.length) { tb.innerHTML = emptyRow(6, 'Aucun assuré trouvé'); return; }
  tb.innerHTML = rows.map(a => `
    <tr>
      <td><code style="font-size:.8rem;color:var(--text-muted)">${a.numero_ss}</code></td>
      <td><strong>${a.nom} ${a.prenom}</strong></td>
      <td>${fmtDate(a.date_naissance)}</td>
      <td>${a.medecin_traitant || '<span class="text-muted">—</span>'}</td>
      <td>${a.actif ? '<span class="badge b-success">Actif</span>' : '<span class="badge b-danger">Inactif</span>'}</td>
      <td><div class="t-actions">
        <button class="btn btn-sm btn-secondary" onclick="viewAssure(${a.id})"><i class="fas fa-eye"></i> Voir</button>
        <button class="btn btn-sm btn-outline" onclick="editMedecinTraitant(${a.id})"><i class="fas fa-link"></i> Médecin</button>
        <button class="btn btn-sm btn-danger" onclick="deleteAssure(${a.id})"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>
  `).join('');
}

function showAddAssure() {
  Modal.open('Inscrire un nouvel assuré', `
    <div class="form-row">
      <div class="form-group"><label>Nom *</label><input id="a-nom" placeholder="DUPONT" style="text-transform:uppercase"/></div>
      <div class="form-group"><label>Prénom *</label><input id="a-prenom" placeholder="Jean"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Date de naissance</label><input id="a-dob" type="date"/></div>
      <div class="form-group"><label>Téléphone</label><input id="a-tel" placeholder="699000000"/></div>
    </div>
    <div class="form-group"><label>Adresse</label><input id="a-adr" placeholder="Yaoundé, Cameroun"/></div>
    <div class="form-group"><label>Email</label><input id="a-email" type="email" placeholder="contact@email.cm"/></div>
    <div id="a-err" class="alert alert-error hidden"></div>
  `, `
    <button class="btn btn-secondary" onclick="Modal.close()">Annuler</button>
    <button class="btn btn-primary" onclick="submitAddAssure()"><i class="fas fa-save"></i> Inscrire</button>
  `);
}

async function submitAddAssure() {
  const err = document.getElementById('a-err');
  err.classList.add('hidden');
  const data = {
    nom: document.getElementById('a-nom').value.trim(),
    prenom: document.getElementById('a-prenom').value.trim(),
    date_naissance: document.getElementById('a-dob').value || null,
    telephone: document.getElementById('a-tel').value.trim() || null,
    adresse: document.getElementById('a-adr').value.trim() || null,
    email: document.getElementById('a-email').value.trim() || null,
  };
  if (!data.nom || !data.prenom) {
    err.textContent = 'Nom et prénom sont obligatoires.';
    err.classList.remove('hidden'); return;
  }
  try {
    await Api.addAssure(data);
    Modal.close(); toast('Assuré inscrit avec succès !', 'success');
    loadAssures();
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
}

async function viewAssure(id) {
  try {
    const a = await Api.getAssure(id);
    Modal.open(`Dossier assuré : ${a.nom} ${a.prenom}`, `
      <div class="det-grid">
        <div class="det-item"><div class="det-lbl">N° SS</div><div class="det-val" style="color:var(--text-muted)">${a.numero_ss}</div></div>
        <div class="det-item"><div class="det-lbl">Statut</div><div class="det-val">${a.actif ? '<span class="badge b-success">Actif</span>' : '<span class="badge b-danger">Inactif</span>'}</div></div>
        <div class="det-item"><div class="det-lbl">Nom</div><div class="det-val">${a.nom} ${a.prenom}</div></div>
        <div class="det-item"><div class="det-lbl">Date de naissance</div><div class="det-val">${fmtDate(a.date_naissance)}</div></div>
        <div class="det-item"><div class="det-lbl">Téléphone</div><div class="det-val">${a.telephone||''}</div></div>
        <div class="det-item"><div class="det-lbl">Email</div><div class="det-val">${a.email||''}</div></div>
        <div class="det-item"><div class="det-lbl">Adresse</div><div class="det-val">${a.adresse||''}</div></div>
        <div class="det-item"><div class="det-lbl">Médecin traitant</div><div class="det-val">${a.medecin_traitant||'—'}</div></div>
        <div class="det-item"><div class="det-lbl">Inscrit le</div><div class="det-val">${fmtDate(a.date_inscription)}</div></div>
      </div>
    `);
  } catch(e) { toast(e.message, 'error'); }
}

async function editMedecinTraitant(assureId) {
  let medecins = [];
  try { medecins = await Api.getMedecins('', 'generaliste'); } catch {}
  const opts = medecins.map(m => `<option value="${m.id}">${m.nom} ${m.prenom}</option>`).join('');
  Modal.open('Enregistrer un médecin traitant', `
    <p style="color:var(--text-muted);font-size:.82rem;margin-bottom:14px">Seuls les médecins généralistes sont éligibles comme médecin traitant.</p>
    <div class="form-group">
      <label>Médecin généraliste *</label>
      <select id="mt-select"><option value="">-- Sélectionner --</option>${opts}</select>
    </div>
    <div id="mt-err" class="alert alert-error hidden"></div>
  `, `
    <button class="btn btn-secondary" onclick="Modal.close()">Annuler</button>
    <button class="btn btn-primary" onclick="submitMedecinTraitant(${assureId})"><i class="fas fa-check"></i> Enregistrer</button>
  `);
}

async function submitMedecinTraitant(assureId) {
  const medId = document.getElementById('mt-select').value;
  const err   = document.getElementById('mt-err');
  if (!medId) { err.textContent = 'Veuillez sélectionner un médecin.'; err.classList.remove('hidden'); return; }
  try {
    await Api.setMedecinTraitant(assureId, parseInt(medId));
    Modal.close(); toast('Médecin traitant enregistré !', 'success');
    loadAssures();
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
}

async function deleteAssure(id) {
  if (!confirm('Supprimer cet assuré ?')) return;
  try {
    await Api.deleteAssure(id);
    toast('Assuré supprimé.', 'success');
    loadAssures();
  } catch(e) { toast(e.message, 'error'); }
}

document.getElementById('btn-add-assure').onclick = showAddAssure;
document.getElementById('q-assures').addEventListener('input', (e) => {
  clearTimeout(window._qt);
  window._qt = setTimeout(() => loadAssures(e.target.value), 400);
});
