/* js/api.js : Client HTTP vers le backend */
const API_BASE = window.location.origin + '/api';

const Api = {
  _token: () => localStorage.getItem('ss_token'),

  _headers() {
    const h = { 'Content-Type': 'application/json' };
    const t = this._token();
    if (t) h['Authorization'] = 'Bearer ' + t;
    return h;
  },

  async _req(method, path, body) {
    const opts = { method, headers: this._headers() };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(API_BASE + path, opts);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Erreur ${r.status}`);
    return data;
  },

  get:    (p)    => Api._req('GET',    p),
  post:   (p, b) => Api._req('POST',   p, b),
  put:    (p, b) => Api._req('PUT',    p, b),
  patch:  (p, b) => Api._req('PATCH',  p, b),
  delete: (p)    => Api._req('DELETE', p),

  // Auth
  login:  (id, pw) => Api.post('/auth/login', { identifiant: id, mot_de_passe: pw }),
  me:     ()       => Api.get('/auth/me'),

  // Assurés
  getAssures:  (q)   => Api.get('/assures' + (q ? `?q=${encodeURIComponent(q)}` : '')),
  getAssure:   (id)  => Api.get('/assures/' + id),
  addAssure:   (d)   => Api.post('/assures', d),
  updateAssure:(id,d)=> Api.put('/assures/' + id, d),
  setMedecinTraitant:(aid,mid)=> Api.patch('/assures/'+aid+'/medecin-traitant',{medecin_traitant_id:mid}),
  deleteAssure:  (id)  => Api.delete('/assures/' + id),

  // Médecins
  getMedecins: (q,type) => Api.get('/medecins?' + new URLSearchParams({...(q&&{q}), ...(type&&{type})})),
  getMedecin:  (id) => Api.get('/medecins/' + id),
  addMedecin:  (d)  => Api.post('/medecins', d),
  updateMedecin:(id,d)=> Api.put('/medecins/'+id, d),

  // Feuilles
  getFeuilles: (params={}) => Api.get('/feuilles?' + new URLSearchParams(params)),
  getFeuille:  (id)  => Api.get('/feuilles/' + id),
  addFeuille:  (d)   => Api.post('/feuilles', d),
  changerStatut:(id,s,n)=> Api.patch('/feuilles/'+id+'/statut',{statut:s,notes:n}),
  completerFeuille:(id,d)=> Api.patch('/feuilles/'+id+'/completer', d),

  // Remboursements
  getRemboursements:(q)=> Api.get('/remboursements'+(q?`?q=${encodeURIComponent(q)}`:'')),
  getRemboursement: (id)=> Api.get('/remboursements/'+id),
  effectuerRemboursement:(d)=> Api.post('/remboursements', d),
  getFacture: (id) => Api.get('/remboursements/'+id+'/facture'),

  // Prescriptions
  getPrescriptions:(params={})=> Api.get('/prescriptions?'+new URLSearchParams(params)),
  addPrescriptionMed:(d)=> Api.post('/prescriptions/medicaments', d),
  addConsultationSpec:(d)=> Api.post('/prescriptions/consultation-specialiste', d),

  // Stats
  getStats: () => Api.get('/stats'),
};
