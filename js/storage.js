/* ══════════════════════════════════════════════════════════════
   OPSLAG & DATA
   localStorage-sleutel, CRUD-helpers (load/dump/upsert/remove),
   uid-generator en datumhulp.
══════════════════════════════════════════════════════════════ */
const KEY   = 'igcgt_v3';
const load  = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const dump  = d  => localStorage.setItem(KEY, JSON.stringify(d));
const byId  = id => load().find(a => a.id === id);
const upsert = item => {
  const all = load();
  const i = all.findIndex(a => a.id === item.id);
  if (i >= 0) all[i] = item; else all.unshift(item);
  dump(all);
};
const remove = id => dump(load().filter(a => a.id !== id));
const uid    = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const today  = () => new Date().toISOString().slice(0,10);
const esc    = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const escBr  = s => esc(s).replace(/\n/g,'<br>');
const toast  = (msg, ms=2000) => { const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), ms); };

/* Groepering: pending groupId bij aanmaken via + knop */
let _pendingGroup = null;

