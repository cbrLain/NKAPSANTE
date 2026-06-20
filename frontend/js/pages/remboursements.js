/* js/pages/remboursements.js */
async function loadRemboursements(q = '') {
  setLoader('tbody-remb', 7);
  try {
    const rows = await Api.getRemboursements(q);
    renderRemboursements(rows);
  } catch(e) { toast(e.message, 'error'); }
}

function renderRemboursements(rows) {
  const tb = document.getElementById('tbody-remb');
  if (!rows.length) { tb.innerHTML = emptyRow(7, 'Aucun remboursement enregistré'); return; }
  tb.innerHTML = rows.map(r => `
    <tr>
      <td><code style="font-size:.8rem;color:var(--text-muted)">${r.feuille_ref}</code></td>
      <td>${r.assure_nom}<br><small style="color:var(--text-muted)">${r.numero_ss}</small></td>
      <td style="font-weight:700;color:var(--success)">${fmtMoney(r.montant)}</td>
      <td>${badgeMode(r.mode_paiement)}</td>
      <td>${fmtDateTime(r.date_remboursement)}</td>
      <td>${r.assureur_nom || '<span class="text-muted">—</span>'}</td>
      <td><div class="t-actions">
        <button class="btn btn-sm btn-secondary" onclick="viewFacture(${r.id})"><i class="fas fa-receipt"></i> Facture</button>
      </div></td>
    </tr>
  `).join('');
}

/* ── Modale remboursement (appelée depuis feuilles.js) ──── */
function showRembourser(feuilleId, ref, montant, assureId) {
  Modal.open(`Effectuer le remboursement : ${ref}`, `
    <div class="alert alert-info" style="margin-bottom:14px">
      <i class="fas fa-info-circle"></i> Montant à rembourser : <strong>${fmtMoney(montant)}</strong>
    </div>
    <div class="form-group">
      <label>Mode de paiement *</label>
      <select id="r-mode" onchange="toggleRefBancaire()">
        <option value="">-- Choisir --</option>
        <option value="especes">Espèces</option>
        <option value="virement">Virement bancaire</option>
      </select>
    </div>
    <div class="form-group" id="grp-ref" style="display:none">
      <label>Référence bancaire *</label>
      <input id="r-ref" placeholder="VIR-2024-CMR-BANK"/>
    </div>
    <div id="r-err" class="alert alert-error hidden"></div>
  `, `
    <button class="btn btn-secondary" onclick="Modal.close()">Annuler</button>
    <button class="btn btn-success" onclick="submitRembourser(${feuilleId})"><i class="fas fa-check"></i> Confirmer le remboursement</button>
  `);
}

function toggleRefBancaire() {
  const mode = document.getElementById('r-mode').value;
  document.getElementById('grp-ref').style.display = mode === 'virement' ? 'flex' : 'none';
}

async function submitRembourser(feuilleId) {
  const err = document.getElementById('r-err');
  err.classList.add('hidden');
  const data = {
    feuille_id: feuilleId,
    mode_paiement: document.getElementById('r-mode').value,
    reference_bancaire: document.getElementById('r-ref')?.value.trim() || null,
  };
  if (!data.mode_paiement) { err.textContent = 'Mode de paiement requis.'; err.classList.remove('hidden'); return; }
  if (data.mode_paiement === 'virement' && !data.reference_bancaire) {
    err.textContent = 'Référence bancaire requise pour un virement.'; err.classList.remove('hidden'); return;
  }
  try {
    await Api.effectuerRemboursement(data);
    Modal.close(); toast('Remboursement effectué avec succès !', 'success');
    loadFeuilles(); loadRemboursements();
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
}

/* ── Impression de la facture ───────────────────────────── */
async function viewFacture(rembId) {
  try {
    const { remboursement: r, assure: a, feuille: f, medecin: m } = await Api.getFacture(rembId);
    Modal.wide(`Facture de remboursement : ${r.feuille_ref}`, `
      <div class="prt-title">FACTURE DE REMBOURSEMENT<br>
        <small style="font-size:.72rem;color:var(--text-muted)">Organisme de Sécurité Sociale : ENSPY</small>
      </div>
      <div class="prt-section">
        <h4>Assuré</h4>
        <div class="prt-row"><span class="prt-key">N° de Sécurité Sociale</span><span class="prt-val" style="color:var(--text-muted)">${a.numero_ss}</span></div>
        <div class="prt-row"><span class="prt-key">Bénéficiaire</span><span class="prt-val">${a.nom} ${a.prenom}</span></div>
        <div class="prt-row"><span class="prt-key">Date de naissance</span><span class="prt-val">${fmtDate(a.date_naissance)}</span></div>
        <div class="prt-row"><span class="prt-key">Adresse</span><span class="prt-val">${a.adresse || ''}</span></div>
      </div>
      <div class="prt-section">
        <h4>Consultation</h4>
        <div class="prt-row"><span class="prt-key">Référence feuille</span><span class="prt-val">${r.feuille_ref}</span></div>
        <div class="prt-row"><span class="prt-key">Date de consultation</span><span class="prt-val">${fmtDate(f.date_consultation)}</span></div>
        <div class="prt-row"><span class="prt-key">Médecin</span><span class="prt-val">Dr. ${m.nom} ${m.prenom} (${m.type})</span></div>
        <div class="prt-row"><span class="prt-key">Diagnostic</span><span class="prt-val">${f.diagnostic}</span></div>
        <div class="prt-row"><span class="prt-key">Actes réalisés</span><span class="prt-val">${f.actes_medicaux || ''}</span></div>
      </div>
      <div class="prt-section">
        <h4>Paiement</h4>
        <div class="prt-row"><span class="prt-key">Mode de paiement</span><span class="prt-val">${badgeMode(r.mode_paiement)}</span></div>
        ${r.reference_bancaire ? `<div class="prt-row"><span class="prt-key">Référence bancaire</span><span class="prt-val">${r.reference_bancaire}</span></div>` : ''}
        <div class="prt-row"><span class="prt-key">Date du remboursement</span><span class="prt-val">${fmtDateTime(r.date_remboursement)}</span></div>
      </div>
      <div class="prt-total">
        <span style="font-size:.95rem;font-weight:700">Montant total remboursé</span>
        <span class="prt-amount">${fmtMoney(r.montant)}</span>
      </div>
      <div style="text-align:center;font-size:.7rem;color:var(--text-dim);margin-top:16px">
        Document généré le ${fmtDateTime(new Date())} · SecuraSanté : ENSPY 2025/2026
      </div>
    `, `
      <button class="btn btn-secondary" onclick="Modal.close()">Fermer</button>
      <button class="btn btn-primary" onclick="imprimerFacture()"><i class="fas fa-print"></i> Imprimer</button>
    `);
  } catch(e) { toast(e.message, 'error'); }
}

function imprimerFacture() {
  const content = document.getElementById('modal-bd').innerHTML;
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>Facture de Remboursement : SecuraSanté</title>
    <style>
      body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#fff;color:#111;padding:32px;max-width:680px;margin:auto}
      .prt-title{font-size:1.05rem;font-weight:700;text-align:center;border-bottom:2px solid #28a745;padding-bottom:10px;margin-bottom:18px}
      .prt-section h4{font-size:.78rem;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:.05em;margin:14px 0 6px}
      .prt-row{display:flex;gap:8px;padding:4px 0;border-bottom:1px solid #dee2e6}
      .prt-key{min-width:150px;font-size:.82rem;color:#6c757d}
      .prt-val{font-size:.82rem;font-weight:500}
      .prt-total{display:flex;justify-content:space-between;align-items:center;padding:12px;background:#d4edda;border-radius:4px;margin-top:14px}
      .prt-amount{font-size:1.4rem;font-weight:800;color:#28a745}
      .badge{display:inline-block;padding:2px 7px;border-radius:3px;font-size:.7rem;font-weight:600}
    </style>
  </head><body>${content}</body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 300);
}

document.getElementById('q-remb').addEventListener('input', e => {
  clearTimeout(window._qr);
  window._qr = setTimeout(() => loadRemboursements(e.target.value), 400);
});
