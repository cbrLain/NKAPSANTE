/* js/pages/medecins.js */
async function loadMedecins(q = '') {
  setLoader('tbody-medecins', 6);
  try {
    const rows = await Api.getMedecins(q);
    renderMedecins(rows);
  } catch(e) { toast(e.message, 'error'); }
}

function renderMedecins(rows) {
  const tb = document.getElementById('tbody-medecins');
  if (!rows.length) { tb.innerHTML = emptyRow(6, 'Aucun médecin trouvé'); return; }
  tb.innerHTML = rows.map(m => `
    <tr>
      <td><code style="font-size:.8rem;color:var(--text-muted)">${m.identifiant}</code></td>
      <td><strong>${m.nom} ${m.prenom}</strong></td>
      <td>${badgeType(m.type)}</td>
      <td>${m.specialite || '<span class="text-muted">—</span>'}</td>
      <td>${m.telephone || ''}</td>
      <td><div class="t-actions">
        <button class="btn btn-sm btn-secondary" onclick="viewMedecin(${m.id})"><i class="fas fa-eye"></i> Voir</button>
      </div></td>
    </tr>
  `).join('');
}

function showAddMedecin() {
  Modal.open('Enregistrer un médecin', `
    <div class="form-row">
      <div class="form-group"><label>Nom *</label><input id="m-nom" placeholder="TALLA" style="text-transform:uppercase"/></div>
      <div class="form-group"><label>Prénom *</label><input id="m-prenom" placeholder="Sylvain"/></div>
    </div>
    <div class="form-group">
      <label>Type *</label>
      <select id="m-type" onchange="toggleSpecialite()">
        <option value="">-- Sélectionner --</option>
        <option value="generaliste">Généraliste</option>
        <option value="specialiste">Spécialiste</option>
      </select>
    </div>
    <div class="form-group" id="grp-spec" style="display:none">
      <label>Spécialité *</label>
      <input id="m-spec" placeholder="Cardiologie, Neurologie…"/>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Téléphone</label><input id="m-tel" placeholder="699000000"/></div>
      <div class="form-group"><label>Email</label><input id="m-email" type="email" placeholder="dr@email.cm"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Date de naissance</label><input id="m-dob" type="date"/></div>
      <div class="form-group"><label>Adresse</label><input id="m-adr" placeholder="Yaoundé"/></div>
    </div>
    <div id="m-err" class="alert alert-error hidden"></div>
  `, `
    <button class="btn btn-secondary" onclick="Modal.close()">Annuler</button>
    <button class="btn btn-primary" onclick="submitAddMedecin()"><i class="fas fa-save"></i> Enregistrer</button>
  `);
}

function toggleSpecialite() {
  const t = document.getElementById('m-type').value;
  document.getElementById('grp-spec').style.display = t === 'specialiste' ? 'flex' : 'none';
}

async function submitAddMedecin() {
  const err = document.getElementById('m-err');
  err.classList.add('hidden');
  const type = document.getElementById('m-type').value;
  const data = {
    nom:          document.getElementById('m-nom').value.trim(),
    prenom:       document.getElementById('m-prenom').value.trim(),
    type,
    specialite:   document.getElementById('m-spec')?.value.trim() || null,
    telephone:    document.getElementById('m-tel').value.trim() || null,
    email:        document.getElementById('m-email').value.trim() || null,
    date_naissance: document.getElementById('m-dob').value || null,
    adresse:      document.getElementById('m-adr').value.trim() || null,
  };
  if (!data.nom || !data.prenom || !data.type) {
    err.textContent = 'Nom, prénom et type sont obligatoires.';
    err.classList.remove('hidden'); return;
  }
  try {
    await Api.addMedecin(data);
    Modal.close(); toast('Médecin enregistré avec succès !', 'success');
    loadMedecins();
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
}

async function viewMedecin(id) {
  try {
    const m = await Api.getMedecin(id);
    Modal.open(`Fiche médecin : Dr. ${m.nom} ${m.prenom}`, `
      <div class="det-grid">
        <div class="det-item"><div class="det-lbl">Identifiant</div><div class="det-val" style="color:var(--text-muted)">${m.identifiant}</div></div>
        <div class="det-item"><div class="det-lbl">Type</div><div class="det-val">${badgeType(m.type)}</div></div>
        <div class="det-item"><div class="det-lbl">Nom complet</div><div class="det-val">Dr. ${m.nom} ${m.prenom}</div></div>
        <div class="det-item"><div class="det-lbl">Spécialité</div><div class="det-val">${m.specialite || '—'}</div></div>
        <div class="det-item"><div class="det-lbl">Téléphone</div><div class="det-val">${m.telephone || ''}</div></div>
        <div class="det-item"><div class="det-lbl">Email</div><div class="det-val">${m.email || ''}</div></div>
        <div class="det-item"><div class="det-lbl">Adresse</div><div class="det-val">${m.adresse || ''}</div></div>
        <div class="det-item"><div class="det-lbl">Date de naissance</div><div class="det-val">${fmtDate(m.date_naissance)}</div></div>
      </div>
    `);
  } catch(e) { toast(e.message, 'error'); }
}

document.getElementById('btn-add-medecin').onclick = showAddMedecin;
document.getElementById('q-medecins').addEventListener('input', e => {
  clearTimeout(window._qm);
  window._qm = setTimeout(() => loadMedecins(e.target.value), 400);
});
