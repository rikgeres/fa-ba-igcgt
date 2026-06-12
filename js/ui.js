/* ── Zwevende opmaak-toolbar (vet + lettergrootte) ── */
const _ceFsSave = new WeakMap(); // div → font-size-slaanfunctie
let _activeCE = null;

(function() {
  const bar = document.createElement('div');
  bar.id = 'bold-bar';
  bar.style.cssText = 'position:fixed;z-index:99999;background:#fff;border:1px solid #ccc;border-radius:8px;padding:3px 6px;box-shadow:0 2px 10px rgba(0,0,0,.18);display:none;pointer-events:auto;display:none;gap:2px;align-items:center;';

  function mkBarBtn(label, title, onClick) {
    const b = document.createElement('button');
    b.innerHTML = label; b.title = title;
    b.style.cssText = 'background:none;border:none;cursor:pointer;font-size:13px;padding:2px 7px;border-radius:6px;font-family:inherit;color:#1D3557;line-height:1.4;';
    b.addEventListener('mouseenter', () => b.style.background='#f0f4f8');
    b.addEventListener('mouseleave', () => b.style.background='none');
    b.addEventListener('mousedown', e => { e.preventDefault(); onClick(); });
    return b;
  }

  const boldBtn = mkBarBtn('<b>V</b>', 'Vetgedrukt', () => {
    if (!_activeCE) return;
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(_activeCE);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('bold');
  });

  const sep = document.createElement('span');
  sep.style.cssText = 'width:1px;height:16px;background:#ddd;flex-shrink:0;';

  const aMin = mkBarBtn('A−', 'Kleiner lettertype', () => changeFontSize(-1));
  const aPlus = mkBarBtn('A+', 'Groter lettertype', () => changeFontSize(+1));

  bar.append(boldBtn, sep, aMin, aPlus);
  document.body.appendChild(bar);

  function changeFontSize(delta) {
    if (!_activeCE) return;
    const cur = parseFloat(_activeCE.style.fontSize) || parseFloat(getComputedStyle(_activeCE).fontSize) || 13;
    const next = Math.max(8, Math.min(22, Math.round(cur) + delta));
    _activeCE.style.fontSize = next + 'px';
    if (_ceFsSave.has(_activeCE)) _ceFsSave.get(_activeCE)(next + 'px');
  }

  function positionNearCE(ce) {
    const rect = ce.getBoundingClientRect();
    bar.style.left = Math.max(4, rect.left) + 'px';
    bar.style.top  = Math.max(4, rect.top + window.scrollY - 38) + 'px';
  }

  function showBar() {
    bar.style.display = 'flex';
  }

  // Toon bij focus op een contenteditable
  document.addEventListener('focusin', e => {
    let el = e.target;
    if (el && el.contentEditable === 'true') {
      _activeCE = el;
      positionNearCE(el);
      showBar();
    }
  });

  // Verberg bij klik buiten toolbar én buiten CE
  document.addEventListener('mousedown', e => {
    if (!bar.contains(e.target) && e.target.contentEditable !== 'true') {
      bar.style.display = 'none';
    }
  });

  // Herpositioneer bij selectie (bold-knop)
  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) return;
    let el = sel.anchorNode;
    if (el && el.nodeType === 3) el = el.parentElement;
    let inCE = false;
    while (el) { if (el.contentEditable === 'true') { inCE = true; break; } el = el.parentElement; }
    if (!inCE) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    bar.style.left = Math.max(4, rect.left + rect.width/2 - 50) + 'px';
    bar.style.top  = Math.max(4, rect.top + window.scrollY - 38) + 'px';
    showBar();
  });
})();

/* ── Print helper: injecteert tijdelijk de juiste @page + schaal ── */
function printAs(orientation, scale) {
  const isLandscape = orientation === 'landscape';
  const margin = isLandscape ? '0' : '1cm';
  const css = `
    @page { size: A4 ${orientation}; margin: ${margin}; }
    @media print {
      .print-scale-wrap {
        transform: scale(${scale}) !important;
        transform-origin: top left !important;
        width: ${Math.round(100/scale)}% !important;
      }
      ${isLandscape ? `
      .ht-scale-wrap {
        /* zoom i.p.v. transform: verkleint óók de layout-maat, zodat het
           1400px-schema echt binnen de A4-pagina past en flex-centrering
           van .ht-scroll-wrap het netjes in het midden zet */
        transform: none !important;
        zoom: ${scale};
        width: auto !important;
      }` : ''}
    }
  `;
  const s = document.createElement('style');
  s.id = 'print-tmp'; s.textContent = css;
  document.head.appendChild(s);
  window.print();
  setTimeout(() => { const el = document.getElementById('print-tmp'); if (el) el.remove(); }, 500);
}

/* ══════════════════════════════════════════
   UITKLAPMODAL
══════════════════════════════════════════ */
function openExpand(labelTxt, helpTxt, currentVal, onSave) {
  const ov = document.createElement('div');
  ov.className = 'expand-overlay';
  ov.innerHTML = `<div class="expand-sheet">
    <div class="expand-handle"></div>
    <div class="expand-lbl">${esc(labelTxt)}</div>
    ${helpTxt ? `<div class="expand-meta">${esc(helpTxt)}</div>` : ''}
    <textarea class="expand-ta" placeholder="Typ hier…">${esc(currentVal)}</textarea>
    <div class="expand-btns">
      <button type="button" class="btn btn-ghost btn-sm" id="exp-cancel" style="flex:1">Annuleer</button>
      <button type="button" class="btn btn-fa btn-sm" id="exp-save" style="flex:2">✓ Opslaan</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  const ta = ov.querySelector('.expand-ta');
  setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 80);
  const close = () => ov.remove();
  ov.querySelector('#exp-cancel').onclick = close;
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  ov.querySelector('#exp-save').onclick = () => { onSave(ta.value.trim()); close(); };
}

/* ══════════════════════════════════════════════════════════════
   GEDEELDE INVOER- & VULHULPFUNCTIES
   Gebruikt door zowel FA als BA.
   makeTa / makeCE  — contenteditable div met value-shim en bold-ondersteuning
   liveFill         — kleurt een vak in zodra het ingevuld is
   makeInlineNode / makeNode — generieke knoop-bouwers (preview/schema)
   mkTitleRow       — titelregel bovenaan elke analyse
══════════════════════════════════════════════════════════════ */
function makeTa(val, placeholder, onChange) {
  const div = document.createElement('div');
  div.contentEditable = 'true';
  div.innerHTML = val || '';
  div.dataset.ph = placeholder || '';
  div.style.cssText = [
    'flex:1;min-width:0;width:100%;box-sizing:border-box;',
    'outline:none;background:transparent;',
    'font:inherit;font-size:11px;color:inherit;padding:0;margin:0;',
    'min-height:24px;cursor:text;line-height:1.35;',
    'word-break:break-word;white-space:pre-wrap;overflow:hidden;'
  ].join('');
  /* value-shim voor achterwaartse compatibiliteit */
  Object.defineProperty(div, 'value', {
    get() { return this.textContent; },
    set(v)  { this.innerHTML = v || ''; },
    configurable: true
  });
  Object.defineProperty(div, 'placeholder', {
    get() { return this.dataset.ph || ''; },
    set(v)  { this.dataset.ph = v || ''; },
    configurable: true
  });
  div.addEventListener('input', () => onChange(div.innerHTML));
  div.addEventListener('click', e => e.stopPropagation());
  div.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak'); }
  });
  return div;
}
/* makeCE is nu een alias van makeTa */
const makeCE = makeTa;


/* ─────────────────────────────────────────
   Titelregel — bovenaan FA en BA
───────────────────────────────────────── */
function mkTitleRow(d, save, typeLabel) {
  const row = document.createElement('div');
  row.className = 'no-print';
  row.style.cssText = 'padding:10px 24px 4px;display:flex;align-items:baseline;gap:8px;';

  /* Type-label ("FA", "BA", "FABA", "HT") */
  const badge = document.createElement('span');
  badge.textContent = typeLabel;
  badge.style.cssText = 'font-size:15px;font-weight:800;color:#4A6E8A;letter-spacing:.06em;flex-shrink:0;';
  row.appendChild(badge);

  /* Titel-input */
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.value = d.title || '';
  inp.placeholder = 'titel';
  inp.style.cssText = 'flex:1;font-size:13px;font-weight:400;border:none;border-bottom:1px dashed #ccc;background:transparent;color:#1D3557;outline:none;padding:1px 0;transition:border-color .15s, border-style .15s;';
  inp.addEventListener('focus', () => { inp.style.borderBottomColor = '#4A6E8A'; inp.style.borderBottomStyle = 'solid'; inp.style.fontWeight = '600'; });
  inp.addEventListener('blur',  () => { inp.style.borderBottomColor = '#ccc';    inp.style.borderBottomStyle = 'dashed'; inp.style.fontWeight = d.title ? '600' : '400'; });
  inp.addEventListener('input', () => save({ title: inp.value }));

  row.appendChild(inp);

  /* Koppeling met een oefencasus: chip om terug te springen naar het gesprek */
  if (d.oefenId && byId(d.oefenId)) {
    const chip = document.createElement('button');
    chip.textContent = '🎭 oefencasus';
    chip.title = 'Terug naar het oefengesprek';
    chip.style.cssText = 'flex-shrink:0;border:1px solid var(--border);background:var(--surface);color:var(--muted);font-size:11px;padding:3px 10px;border-radius:12px;cursor:pointer;transition:border-color .15s,color .15s;';
    chip.addEventListener('mouseenter', () => { chip.style.borderColor = 'var(--cgt-blue)'; chip.style.color = 'var(--cgt-blue)'; });
    chip.addEventListener('mouseleave', () => { chip.style.borderColor = 'var(--border)'; chip.style.color = 'var(--muted)'; });
    chip.addEventListener('click', () => go(`/oefen/${d.oefenId}`));
    row.appendChild(chip);
  }

  return row;
}

/* ══════════════════════════════════════════════════════════════
   UI-BOUWSTENEN
   addFab()      — zwevende + knop rechtsonder
   mkBtn()       — standaard knop met klasse en klikhandler
   mkTrashBtn()  — prullenbak-knop met bevestigingsdialoog
══════════════════════════════════════════════════════════════ */
function addFab(fn) {
  const b = document.createElement('button');
  b.className = 'fab no-print'; b.textContent = '+'; b.title = 'Nieuwe analyse';
  b.onclick = fn; document.body.appendChild(b);
  const off = () => { b.remove(); window.removeEventListener('hashchange', off); };
  window.addEventListener('hashchange', off);
}

function downloadImg(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = (filename||'analyse') + '.png';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  toast('Afbeelding gedownload ✓ — open het bestand en plak in Pages', 5000);
}

function mkBtn(cls, html, fn) {
  const b = document.createElement('button');
  b.className = `btn btn-sm ${cls}`; b.innerHTML = html; b.onclick = fn; return b;
}

const TRASH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;

function mkTrashBtn(cls, title, fn) {
  const b = document.createElement('button');
  b.className = cls; b.innerHTML = TRASH_SVG; b.title = title; b.type = 'button';
  b.onclick = fn; return b;
}

