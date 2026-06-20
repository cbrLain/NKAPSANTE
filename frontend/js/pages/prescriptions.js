/* js/pages/prescriptions.js */

/* ══ PRESCRIPTIONS MÉDICAMENTS ══════════════════════════════ */
async function loadPrescriptionsMed(q = '') {
  setLoader('tbody-presc', 5);
  try {
    const rows = await Api.getPrescriptions(q ? { type: 'medicaments', q } : { type: 'medicaments' });
    renderPrescriptionsMed(rows);
  } catch(e) { toast(e.message, 'error'); }
}

function renderPrescriptionsMed(rows) {
  const tb = document.getElementById('tbody-presc');
  if (!rows.length) { tb.innerHTML = emptyRow(5, 'Aucune prescription médicamenteuse'); return; }
  tb.innerHTML = rows.map(p => `
    <tr>
      <td><code style="font-size:.8rem;color:var(--text-muted)">#${p.id}</code></td>
      <td>${p.assure_nom}<br><small style="color:var(--text-muted)">${p.numero_ss}</small></td>
      <td>${(p.medicaments||[]).map(m =>
        `<span class="badge b-light" style="margin:2px">${m.nom_medicament}</span>`
      ).join('')}</td>
      <td>${fmtDate(p.date_prescription)}</td>
      <td><div class="t-actions">
        <button class="btn btn-sm btn-secondary" onclick="viewPrescription(${p.id})"><i class="fas fa-eye"></i> Voir</button>
      </div></td>
    </tr>
  `).join('');
}

/* ── Modale ajouter prescription médicaments ─────────────── */
function showAddPrescription() {
  Modal.wide('Prescrire des médicaments', `
    <div class="form-group">
      <label>N° SS de l'assuré *</label>
      <input id="pm-nss" placeholder="1-900101-001-23" oninput="rechercherAssurePresc(this.value,'pm')"/>
      <div id="pm-info" style="margin-top:5px;font-size:.8rem;color:var(--primary)"></div>
    </div>
    <input type="hidden" id="pm-assure-id"/>
    <div class="form-row">
      <div class="form-group"><label>Feuille de maladie liée (optionnel)</label><input id="pm-feuille" placeholder="ID feuille (ex: 3)"/></div>
      <div class="form-group"><label>Date de prescription</label><input id="pm-date" type="date" value="${new Date().toISOString().split('T')[0]}"/></div>
    </div>
    <div class="form-group"><label>Notes</label><textarea id="pm-notes" rows="2" placeholder="Observations…"></textarea></div>

    <div style="margin-top:14px">
      <label style="font-size:.8rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px">MÉDICAMENTS PRESCRITS *</label>
      <div id="med-rows" class="med-rows"></div>
      <button class="btn-add-row" onclick="addMedRow()"><i class="fas fa-plus"></i> Ajouter un médicament</button>
    </div>
    <div id="pm-err" class="alert alert-error hidden" style="margin-top:10px"></div>
  `, `
    <button class="btn btn-secondary" onclick="Modal.close()">Annuler</button>
    <button class="btn btn-primary" onclick="submitPrescriptionMed()"><i class="fas fa-prescription-bottle-alt"></i> Enregistrer la prescription</button>
  `);
  addMedRow(); // une ligne par défaut
}

let medRowCount = 0;
function addMedRow() {
  medRowCount++;
  const id = medRowCount;
  const container = document.getElementById('med-rows');
  const div = document.createElement('div');
  div.className = 'med-row';
  div.id = `med-row-${id}`;
  div.innerHTML = `
    <button class="btn-rm" onclick="document.getElementById('med-row-${id}').remove()"><i class="fas fa-times"></i></button>
    <div class="form-row">
      <div class="form-group"><label>Nom du médicament *</label><input class="mr-nom" placeholder="Paracétamol 1g"/></div>
      <div class="form-group"><label>Dosage</label><input class="mr-dos" placeholder="3x/jour"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Durée</label><input class="mr-dur" placeholder="7 jours"/></div>
      <div class="form-group"><label>Instructions</label><input class="mr-ins" placeholder="Après les repas"/></div>
    </div>
  `;
  container.appendChild(div);
}

async function rechercherAssurePresc(nss, prefix) {
  const info = document.getElementById(`${prefix}-info`);
  const idF  = document.getElementById(`${prefix}-assure-id`);
  if (nss.length < 5) { info.textContent = ''; idF.value = ''; return; }
  try {
    const rows = await Api.getAssures(nss);
    const match = rows.find(a => a.numero_ss === nss);
    if (match) {
      info.style.color = 'var(--primary)';
      info.innerHTML = `<i class="fas fa-check-circle"></i> ${match.nom} ${match.prenom}`;
      idF.value = match.id;
    } else {
      info.style.color = 'var(--danger)';
      info.innerHTML = '<i class="fas fa-times-circle"></i> Assuré non trouvé';
      idF.value = '';
    }
  } catch {}
}

async function submitPrescriptionMed() {
  const err = document.getElementById('pm-err');
  err.classList.add('hidden');
  const assure_id = document.getElementById('pm-assure-id').value;
  if (!assure_id) { err.textContent = 'Assuré introuvable : vérifiez le N° SS.'; err.classList.remove('hidden'); return; }

  // Collecter les lignes médicaments
  const rows = document.querySelectorAll('.med-row');
  const medicaments = [];
  for (const row of rows) {
    const nom = row.querySelector('.mr-nom')?.value.trim();
    if (!nom) continue;
    medicaments.push({
      nom_medicament: nom,
      dosage:         row.querySelector('.mr-dos')?.value.trim() || null,
      duree:          row.querySelector('.mr-dur')?.value.trim() || null,
      instructions:   row.querySelector('.mr-ins')?.value.trim() || null,
    });
  }
  if (!medicaments.length) { err.textContent = 'Ajoutez au moins un médicament.'; err.classList.remove('hidden'); return; }

  const feuilleVal = document.getElementById('pm-feuille').value.trim();
  const data = {
    assure_id:        parseInt(assure_id),
    feuille_id:       feuilleVal ? parseInt(feuilleVal) : null,
    date_prescription: document.getElementById('pm-date').value,
    notes:            document.getElementById('pm-notes').value.trim() || null,
    medicaments,
  };
  try {
    await Api.addPrescriptionMed(data);
    Modal.close(); toast('Prescription médicaments enregistrée !', 'success');
    loadPrescriptionsMed();
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
}

async function viewPrescription(id) {
  try {
    const p = await Api.getPrescriptions({ type: 'medicaments' });
    // find by id in the list or fetch individually
    const presc = p.find(x => x.id === id);
    if (!presc) { toast('Prescription introuvable.', 'error'); return; }
    Modal.wide(`Prescription #${id} : ${presc.assure_nom}`, `
      <div class="det-grid">
        <div class="det-item"><div class="det-lbl">Patient</div><div class="det-val">${presc.assure_nom}</div></div>
        <div class="det-item"><div class="det-lbl">N° SS</div><div class="det-val" style="color:var(--text-muted)">${presc.numero_ss}</div></div>
        <div class="det-item"><div class="det-lbl">Médecin</div><div class="det-val">Dr. ${presc.medecin_nom}</div></div>
        <div class="det-item"><div class="det-lbl">Date</div><div class="det-val">${fmtDate(presc.date_prescription)}</div></div>
      </div>
      ${presc.notes ? `<div class="alert alert-info" style="margin:10px 0"><i class="fas fa-info-circle"></i> ${presc.notes}</div>` : ''}
      <div style="margin-top:10px">
        <div style="font-size:.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Médicaments prescrits</div>
        ${(presc.medicaments||[]).map(m => `
          <div class="med-row" style="margin-bottom:6px">
            <div style="font-weight:700;color:var(--text);margin-bottom:3px">${m.nom_medicament}</div>
            <div style="font-size:.8rem;color:var(--text-muted)">
              ${m.dosage ? `Dosage : ${m.dosage}` : ''} ${m.duree ? `· Durée : ${m.duree}` : ''} ${m.instructions ? `· ${m.instructions}` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `);
  } catch(e) { toast(e.message, 'error'); }
}

document.getElementById('btn-add-presc').onclick = showAddPrescription;
document.getElementById('q-presc').addEventListener('input', e => {
  clearTimeout(window._qpr);
  window._qpr = setTimeout(() => loadPrescriptionsMed(e.target.value), 400);
});

/* ══ CONSULTATIONS SPÉCIALISTE ══════════════════════════════ */
async function loadConsultationsSpec(q = '') {
  setLoader('tbody-consult', 6);
  try {
    const rows = await Api.getPrescriptions(q ? { type: 'consultation_specialiste', q } : { type: 'consultation_specialiste' });
    renderConsultationsSpec(rows);
  } catch(e) { toast(e.message, 'error'); }
}

function renderConsultationsSpec(rows) {
  const tb = document.getElementById('tbody-consult');
  if (!rows.length) { tb.innerHTML = emptyRow(6, 'Aucune prescription de consultation'); return; }
  tb.innerHTML = rows.map(p => {
    const c = p.consultation || {};
    return `
      <tr>
        <td><code style="font-size:.8rem;color:var(--text-muted)">#${p.id}</code></td>
        <td>${p.assure_nom}<br><small style="color:var(--text-muted)">${p.numero_ss}</small></td>
        <td><span class="badge b-light">${c.specialite_requise || ''}</span></td>
        <td>${c.urgence === 'urgente'
          ? '<span class="badge b-danger"><i class="fas fa-exclamation-triangle"></i> Urgente</span>'
          : '<span class="badge b-light">Normale</span>'}</td>
        <td>${fmtDate(p.date_prescription)}</td>
        <td><div class="t-actions">
          <button class="btn btn-sm btn-secondary" onclick="viewConsultation(${p.id})"><i class="fas fa-eye"></i> Voir</button>
        </div></td>
      </tr>
    `;
  }).join('');
}

function showAddConsultation() {
  Api.getMedecins('', 'specialiste').then(specialistes => {
    const opts = specialistes.map(m =>
      `<option value="${m.id}">${m.nom} ${m.prenom} : ${m.specialite}</option>`
    ).join('');

    Modal.wide('Prescrire une consultation chez un spécialiste', `
      <div class="form-group">
        <label>N° SS de l'assuré *</label>
        <input id="cs-nss" placeholder="1-900101-001-23" oninput="rechercherAssurePresc(this.value,'cs')"/>
        <div id="cs-info" style="margin-top:5px;font-size:.8rem;color:var(--primary)"></div>
      </div>
      <input type="hidden" id="cs-assure-id"/>
      <div class="form-row">
        <div class="form-group">
          <label>Spécialité requise *</label>
          <input id="cs-spec" placeholder="Cardiologie, Neurologie…"/>
        </div>
        <div class="form-group">
          <label>Urgence</label>
          <select id="cs-urgence">
            <option value="normale">Normale</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Spécialiste désigné (optionnel)</label>
        <select id="cs-specialiste">
          <option value="">-- Laisser le choix à l'assureur --</option>
          ${opts}
        </select>
      </div>
      <div class="form-group"><label>Motif de la consultation *</label>
        <textarea id="cs-motif" rows="3" placeholder="Décrivez le motif de la consultation chez le spécialiste…"></textarea>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Date de prescription</label><input id="cs-date" type="date" value="${new Date().toISOString().split('T')[0]}"/></div>
        <div class="form-group"><label>Feuille liée (optionnel)</label><input id="cs-feuille" placeholder="ID feuille"/></div>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="cs-notes" rows="2"></textarea></div>
      <div id="cs-err" class="alert alert-error hidden"></div>
    `, `
      <button class="btn btn-secondary" onclick="Modal.close()">Annuler</button>
      <button class="btn btn-primary" onclick="submitConsultationSpec()"><i class="fas fa-microscope"></i> Enregistrer la prescription</button>
    `);
  }).catch(() => toast('Impossible de charger les spécialistes.', 'error'));
}

async function submitConsultationSpec() {
  const err = document.getElementById('cs-err');
  err.classList.add('hidden');
  const assure_id = document.getElementById('cs-assure-id').value;
  if (!assure_id) { err.textContent = 'Assuré introuvable.'; err.classList.remove('hidden'); return; }
  const motif = document.getElementById('cs-motif').value.trim();
  const spec   = document.getElementById('cs-spec').value.trim();
  if (!motif || !spec) { err.textContent = 'Spécialité et motif sont obligatoires.'; err.classList.remove('hidden'); return; }

  const specId = document.getElementById('cs-specialiste').value;
  const feuilleVal = document.getElementById('cs-feuille').value.trim();
  const data = {
    assure_id:         parseInt(assure_id),
    specialiste_id:    specId ? parseInt(specId) : null,
    specialite_requise: spec,
    urgence:           document.getElementById('cs-urgence').value,
    motif,
    date_prescription: document.getElementById('cs-date').value,
    feuille_id:        feuilleVal ? parseInt(feuilleVal) : null,
    notes:             document.getElementById('cs-notes').value.trim() || null,
  };
  try {
    await Api.addConsultationSpec(data);
    Modal.close(); toast('Prescription de consultation enregistrée !', 'success');
    loadConsultationsSpec();
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
}

async function viewConsultation(id) {
  try {
    const rows = await Api.getPrescriptions({ type: 'consultation_specialiste' });
    const p    = rows.find(x => x.id === id);
    if (!p) { toast('Prescription introuvable.', 'error'); return; }
    const c = p.consultation || {};
    Modal.open(`Prescription #${id} : Consultation Spécialiste`, `
      <div class="det-grid">
        <div class="det-item"><div class="det-lbl">Patient</div><div class="det-val">${p.assure_nom}</div></div>
        <div class="det-item"><div class="det-lbl">N° SS</div><div class="det-val" style="color:var(--text-muted)">${p.numero_ss}</div></div>
        <div class="det-item"><div class="det-lbl">Prescripteur</div><div class="det-val">Dr. ${p.medecin_nom}</div></div>
        <div class="det-item"><div class="det-lbl">Date</div><div class="det-val">${fmtDate(p.date_prescription)}</div></div>
        <div class="det-item"><div class="det-lbl">Spécialité requise</div><div class="det-val"><span class="badge b-light">${c.specialite_requise}</span></div></div>
        <div class="det-item"><div class="det-lbl">Urgence</div><div class="det-val">${c.urgence === 'urgente' ? '<span class="badge b-danger"><i class="fas fa-exclamation-triangle"></i> Urgente</span>' : '<span class="badge b-light">Normale</span>'}</div></div>
        ${c.specialiste_nom ? `<div class="det-item"><div class="det-lbl">Spécialiste désigné</div><div class="det-val">Dr. ${c.specialiste_nom}</div></div>` : ''}
      </div>
      ${c.motif ? `<div class="alert alert-info" style="margin-top:10px"><strong>Motif :</strong> ${c.motif}</div>` : ''}
      ${p.notes ? `<div class="alert alert-warning" style="margin-top:6px"><i class="fas fa-exclamation-triangle"></i> ${p.notes}</div>` : ''}
    `);
  } catch(e) { toast(e.message, 'error'); }
}

document.getElementById('btn-add-consult').onclick = showAddConsultation;
document.getElementById('q-consult').addEventListener('input', e => {
  clearTimeout(window._qcs);
  window._qcs = setTimeout(() => loadConsultationsSpec(e.target.value), 400);
});
