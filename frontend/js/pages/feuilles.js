/* js/pages/feuilles.js */
let feuillesFilter = 'all';

/* ── Assureur : toutes les feuilles ───────────────────────── */
async function loadFeuilles(q = '') {
  setLoader('tbody-feuilles', 7);
  try {
    const params = {};
    if (q) params.q = q;
    if (feuillesFilter !== 'all') params.statut = feuillesFilter;
    const rows = await Api.getFeuilles(params);
    renderFeuilles(rows);
  } catch(e) { toast(e.message, 'error'); }
}

function renderFeuilles(rows) {
  const tb = document.getElementById('tbody-feuilles');
  if (!rows.length) { tb.innerHTML = emptyRow(7, 'Aucune feuille de maladie'); return; }
  tb.innerHTML = rows.map(f => `
    <tr>
      <td><code style="font-size:.8rem;color:var(--text-muted)">${f.reference}</code></td>
      <td>${f.assure_nom}<br><small style="color:var(--text-muted)">${f.numero_ss}</small></td>
      <td>Dr. ${f.medecin_nom}<br><small style="color:var(--text-muted)">${f.medecin_type}</small></td>
      <td>${fmtDate(f.date_consultation)}</td>
      <td>${badgeStatut(f.statut)}</td>
      <td>${fmtMoney(f.montant_remboursement)}</td>
      <td><div class="t-actions">
        <button class="btn btn-sm btn-secondary" onclick="viewFeuille(${f.id})"><i class="fas fa-eye"></i> Voir</button>
        ${f.statut === 'En cours de traitement' ? `<button class="btn btn-sm btn-success" onclick="showCompleter(${f.id})"><i class="fas fa-pen"></i> Compléter</button>` : ''}
        ${f.statut === 'Validée' ? `<button class="btn btn-sm btn-success" onclick="showRembourser(${f.id},'${f.reference}',${f.montant_remboursement},${f.assure_id})"><i class="fas fa-credit-card"></i> Rembourser</button>` : ''}
        ${['Transmise'].includes(f.statut) ? `<button class="btn btn-sm btn-primary" onclick="ouvrirDossier(${f.id})"><i class="fas fa-folder-open"></i> Ouvrir</button>` : ''}
        ${f.statut === 'Incomplète' ? `<button class="btn btn-sm btn-warning" onclick="changerStatutFeuille(${f.id},'En cours de traitement')"><i class="fas fa-undo"></i> Reprendre</button>` : ''}
      </div></td>
    </tr>
  `).join('');
}

async function ouvrirDossier(id) {
  if (!confirm('Ouvrir ce dossier ? Il passera en "En cours de traitement".')) return;
  try {
    await Api.changerStatut(id, 'En cours de traitement');
    toast('Dossier ouvert : En cours de traitement', 'success');
    loadFeuilles();
  } catch(e) { toast(e.message, 'error'); }
}

async function changerStatutFeuille(id, statut, notes) {
  try {
    await Api.changerStatut(id, statut, notes);
    toast(`Statut mis à jour : ${statut}`, 'success');
    if (document.getElementById('tbody-feuilles'))   loadFeuilles();
    if (document.getElementById('tbody-mfeuilles'))  loadMesFeuilles();
  } catch(e) { toast(e.message, 'error'); }
}

async function viewFeuille(id) {
  try {
    const f = await Api.getFeuille(id);
    const transitions = {
      'En cours de traitement': ['Incomplète','Refusée'],
      'Transmise': ['Refusée'],
    };
    const btns = (transitions[f.statut] || []).map(s =>
      `<button class="btn btn-sm btn-danger" onclick="changerStatutDepuisModal(${f.id},'${s}')"><i class="fas fa-arrow-right"></i> ${s}</button>`
    ).join('');

    Modal.wide(`Feuille de maladie : ${f.reference}`, `
      <div style="margin-bottom:10px">${badgeStatut(f.statut)}</div>
      <div class="prt-section">
        <h4>Assuré</h4>
        <div class="prt-row"><span class="prt-key">N° SS</span><span class="prt-val" style="color:var(--text-muted)">${f.numero_ss}</span></div>
        <div class="prt-row"><span class="prt-key">Nom</span><span class="prt-val">${f.assure_nom}</span></div>
      </div>
      <div class="prt-section">
        <h4>Consultation</h4>
        <div class="prt-row"><span class="prt-key">Médecin</span><span class="prt-val">Dr. ${f.medecin_nom}</span></div>
        <div class="prt-row"><span class="prt-key">Date</span><span class="prt-val">${fmtDate(f.date_consultation)}</span></div>
        <div class="prt-row"><span class="prt-key">Diagnostic</span><span class="prt-val">${f.diagnostic}</span></div>
        <div class="prt-row"><span class="prt-key">Actes médicaux</span><span class="prt-val">${f.actes_medicaux || ''}</span></div>
      </div>
      <div class="prt-section">
        <h4>Remboursement</h4>
        <div class="prt-row"><span class="prt-key">Honoraires</span><span class="prt-val">${fmtMoney(f.montant_honoraires)}</span></div>
        <div class="prt-row"><span class="prt-key">Taux</span><span class="prt-val">${((f.taux_remboursement||0.7)*100).toFixed(0)}%</span></div>
        <div class="prt-row"><span class="prt-key">Montant remboursé</span><span class="prt-val" style="color:var(--success);font-weight:700">${fmtMoney(f.montant_remboursement)}</span></div>
        <div class="prt-row"><span class="prt-key">Mode paiement</span><span class="prt-val">${f.mode_paiement ? badgeMode(f.mode_paiement) : ''}</span></div>
      </div>
      ${f.notes ? `<div class="alert alert-info" style="margin-top:8px"><i class="fas fa-info-circle"></i> ${f.notes}</div>` : ''}
    `, `${btns}<button class="btn btn-secondary" onclick="Modal.close()">Fermer</button>`);
  } catch(e) { toast(e.message, 'error'); }
}

async function changerStatutDepuisModal(id, statut) {
  await changerStatutFeuille(id, statut);
  Modal.close();
}

function showCompleter(id) {
  Modal.open('Compléter la feuille de maladie', `
    <p style="color:var(--text-muted);font-size:.82rem;margin-bottom:14px">Renseignez le montant et le mode de remboursement pour valider ce dossier.</p>
    <div class="form-row">
      <div class="form-group"><label>Montant à rembourser (FCFA) *</label><input id="c-mont" type="number" min="0" placeholder="15000"/></div>
      <div class="form-group">
        <label>Mode de paiement *</label>
        <select id="c-mode">
          <option value="">-- Choisir --</option>
          <option value="especes">Espèces</option>
          <option value="virement">Virement bancaire</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label>Notes (optionnel)</label><textarea id="c-notes" rows="2" placeholder="Observations…"></textarea></div>
    <div id="c-err" class="alert alert-error hidden"></div>
  `, `
    <button class="btn btn-secondary" onclick="Modal.close()">Annuler</button>
    <button class="btn btn-primary" onclick="submitCompleter(${id})"><i class="fas fa-check"></i> Valider et compléter</button>
  `);
}

async function submitCompleter(id) {
  const err = document.getElementById('c-err');
  err.classList.add('hidden');
  const data = {
    montant_remboursement: document.getElementById('c-mont').value,
    mode_paiement:         document.getElementById('c-mode').value,
    notes:                 document.getElementById('c-notes').value.trim() || null,
  };
  if (!data.montant_remboursement || !data.mode_paiement) {
    err.textContent = 'Montant et mode de paiement sont requis.';
    err.classList.remove('hidden'); return;
  }
  try {
    await Api.completerFeuille(id, data);
    Modal.close(); toast('Feuille complétée et validée !', 'success');
    loadFeuilles();
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
}

// Filtre par statut
document.getElementById('ft-feuilles').addEventListener('click', e => {
  const tab = e.target.closest('.ftab');
  if (!tab) return;
  document.querySelectorAll('#ft-feuilles .ftab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  feuillesFilter = tab.dataset.v;
  loadFeuilles(document.getElementById('q-feuilles').value);
});

document.getElementById('q-feuilles').addEventListener('input', e => {
  clearTimeout(window._qf);
  window._qf = setTimeout(() => loadFeuilles(e.target.value), 400);
});

/* ── Médecin : ses propres feuilles ──────────────────────── */
async function loadMesFeuilles(q = '') {
  setLoader('tbody-mfeuilles', 6);
  try {
    const rows = await Api.getFeuilles(q ? { q } : {});
    renderMesFeuilles(rows);
  } catch(e) { toast(e.message, 'error'); }
}

function renderMesFeuilles(rows) {
  const tb = document.getElementById('tbody-mfeuilles');
  if (!rows.length) { tb.innerHTML = emptyRow(6, 'Aucune feuille créée'); return; }
  tb.innerHTML = rows.map(f => `
    <tr>
      <td><code style="font-size:.8rem;color:var(--text-muted)">${f.reference}</code></td>
      <td style="color:var(--text-muted)">${f.numero_ss}</td>
      <td>${fmtDate(f.date_consultation)}</td>
      <td>${f.diagnostic}</td>
      <td>${badgeStatut(f.statut)}</td>
      <td><div class="t-actions">
        <button class="btn btn-sm btn-secondary" onclick="viewFeuille(${f.id})"><i class="fas fa-eye"></i> Voir</button>
        ${f.statut === 'Brouillon' ? `<button class="btn btn-sm btn-primary" onclick="changerStatutFeuille(${f.id},'Transmise')"><i class="fas fa-paper-plane"></i> Transmettre</button>` : ''}
        ${f.statut === 'Brouillon' ? `<button class="btn btn-sm btn-danger" onclick="supprimerFeuille(${f.id})"><i class="fas fa-trash-alt"></i> Supprimer</button>` : ''}
      </div></td>
    </tr>
  `).join('');
}

async function supprimerFeuille(id) {
  if (!confirm('Supprimer cette feuille ?')) return;
  await changerStatutFeuille(id, 'Supprimée');
}

function showAddFeuille() {
  Modal.open('Nouvelle feuille de maladie', `
    <p style="color:var(--text-muted);font-size:.82rem;margin-bottom:14px">Enregistrez les informations de la consultation pour permettre le remboursement de l'assuré.</p>
    <div class="form-group"><label>N° de Sécurité Sociale de l'assuré *</label>
      <input id="nf-nss" placeholder="1-900101-001-23" oninput="rechercherAssureParNSS(this.value)"/>
      <div id="nf-assure-info" style="margin-top:5px;font-size:.8rem;color:var(--primary)"></div>
    </div>
    <input type="hidden" id="nf-assure-id"/>
    <div class="form-row">
      <div class="form-group"><label>Date de consultation *</label><input id="nf-date" type="date" value="${new Date().toISOString().split('T')[0]}"/></div>
      <div class="form-group"><label>Honoraires (FCFA)</label><input id="nf-mont" type="number" min="0" placeholder="15000" oninput="calcRemb()"/></div>
    </div>
    <div id="nf-remb-info" style="font-size:.8rem;color:var(--success);margin-bottom:8px"></div>
    <div class="form-group"><label>Diagnostic *</label><input id="nf-diag" placeholder="Grippe saisonnière, Hypertension…"/></div>
    <div class="form-group"><label>Actes médicaux réalisés</label><textarea id="nf-actes" rows="2" placeholder="Consultation, prise de sang, ECG…"></textarea></div>
    <div class="form-group"><label>Notes</label><textarea id="nf-notes" rows="2" placeholder="Observations complémentaires…"></textarea></div>
    <div id="nf-err" class="alert alert-error hidden"></div>
  `, `
    <button class="btn btn-secondary" onclick="Modal.close()">Annuler</button>
    <button class="btn btn-primary" onclick="submitAddFeuille()"><i class="fas fa-save"></i> Enregistrer en brouillon</button>
  `);
}

async function rechercherAssureParNSS(nss) {
  const info = document.getElementById('nf-assure-info');
  const idField = document.getElementById('nf-assure-id');
  if (nss.length < 5) { info.textContent = ''; idField.value = ''; return; }
  try {
    const rows = await Api.getAssures(nss);
    const match = rows.find(a => a.numero_ss === nss);
    if (match) {
      info.innerHTML = `<i class="fas fa-check-circle"></i> ${match.nom} ${match.prenom}`;
      info.style.color = 'var(--primary)';
      idField.value = match.id;
    } else {
      info.style.color = 'var(--danger)';
      info.innerHTML = '<i class="fas fa-times-circle"></i> Assuré non trouvé';
      idField.value = '';
    }
  } catch {}
}

function calcRemb() {
  const mont = parseFloat(document.getElementById('nf-mont').value);
  const info = document.getElementById('nf-remb-info');
  if (!isNaN(mont) && mont > 0) {
    info.textContent = `\u2192 Remboursement estimé (70%) : ${fmtMoney(Math.round(mont * 0.7))}`;
  } else {
    info.textContent = '';
  }
}

async function submitAddFeuille() {
  const err = document.getElementById('nf-err');
  err.classList.add('hidden');
  const assure_id = document.getElementById('nf-assure-id').value;
  const data = {
    assure_id: assure_id ? parseInt(assure_id) : null,
    date_consultation: document.getElementById('nf-date').value,
    diagnostic: document.getElementById('nf-diag').value.trim(),
    actes_medicaux: document.getElementById('nf-actes').value.trim() || null,
    montant_honoraires: document.getElementById('nf-mont').value || null,
    notes: document.getElementById('nf-notes').value.trim() || null,
  };
  if (!data.assure_id) { err.textContent = 'Assuré introuvable : vérifiez le N° SS.'; err.classList.remove('hidden'); return; }
  if (!data.date_consultation || !data.diagnostic) { err.textContent = 'Date et diagnostic sont obligatoires.'; err.classList.remove('hidden'); return; }
  try {
    const r = await Api.addFeuille(data);
    Modal.close(); toast(`Feuille ${r.reference} créée (brouillon).`, 'success');
    loadMesFeuilles();
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
}

document.getElementById('btn-add-feuille').onclick = showAddFeuille;
document.getElementById('q-mfeuilles').addEventListener('input', e => {
  clearTimeout(window._qmf);
  window._qmf = setTimeout(() => loadMesFeuilles(e.target.value), 400);
});
