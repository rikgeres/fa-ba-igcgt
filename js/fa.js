/* ══════════════════════════════════════════════════════════════
   FA — FUNCTIEANALYSE
   pgFA()       — pagina-opbouw (laden/aanmaken analyse)
   buildFA()    — canvas met Sd, R, Sr-pos-repr en FNC
   makeSrNode() — ovaalvorm voor Sr-pos-repr (met consequent-kiezer)
   makeFncNode()— rechthoek voor feitelijke negatieve consequentie
   mailFA()     — klembord-export als platte tekst
   SR_POS/NEG_TYPES — versterkings- en straftypen met labels
══════════════════════════════════════════════════════════════ */

const SR_POS_TYPES = [
  { val:'+s+', label:'+S+', color:'#16A34A', title:'Positieve versterker: positief stimulus toegevoegd' },
  { val:'-s-', label:'−S−', color:'#1D4ED8', title:'Negatieve versterker: negatief stimulus weggenomen' },
  { val:'~s-', label:'~S−', color:'#7C3AED', title:'Ambivalente versterker: ambivalent stimulus weggenomen' },
];
const SR_NEG_TYPES = [
  { val:'-s+', label:'−S+', color:'#DC2626', title:'Positieve straf: negatief stimulus toegevoegd' },
  { val:'+s-', label:'+S−', color:'#EA580C', title:'Negatieve straf: positief stimulus weggenomen' },
  { val:'~s+', label:'~S+', color:'#0891B2', title:'Ambivalente straf: ambivalent stimulus toegevoegd' },
];
const ALL_SR = [...SR_POS_TYPES, ...SR_NEG_TYPES];

function srColor(val) {
  const f = ALL_SR.find(x => x.val === val);
  return f ? f.color : '#64748B';
}
function srLabel(val) {
  const f = ALL_SR.find(x => x.val === val);
  return f ? f.label : val;
}
function srClass(val) {
  if (!val) return '';
  if (val.startsWith('+')) return 'pos';
  if (val.startsWith('-')) return 'neg';
  return 'amb';
}

function pgFA(c, id) {
  const isNew = id === 'new';
  const newId = uid();
  let d = isNew ? {
    id: newId, type: 'FA', title:'', client:'', date: today(),
    groupId: _pendingGroup || newId,
    theme: 'blauw',
    ...getAnalysisType('FA').defaultData()
  } : byId(id);
  _pendingGroup = null;

  if (!d) { c.innerHTML = '<p style="padding:20px">Niet gevonden.</p>'; return; }
  if (!d.groupId) { d.groupId = d.id; }
  if (isNew) upsert(d); // sla nieuwe analyse direct op zodat preview hem vindt
  else if (!d.groupId) upsert(d); // migratie

  let saveTimer = null;
  const faHistory = [];
  function save(extra) {
    faHistory.push(JSON.stringify(d));
    if (faHistory.length > 50) faHistory.shift();
    d = { ...d, ...extra };
    upsert(d);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => toast('Automatisch opgeslagen ✓'), 1200);
  }
  function faUndo() {
    if (!faHistory.length) return;
    d = JSON.parse(faHistory.pop());
    upsert(d);
    redraw();
    toast('Ongedaan gemaakt ↩');
  }

  function redraw() {
    c.innerHTML = '';
    buildFA(c, d, save, false, faUndo, () => faHistory.length > 0, redraw);
  }

  redraw();
}

function buildFA(c, d, save, _noGroup, onUndo, hasUndo, onRedraw) {
  /* ── Actiebalk ── */
  const bar = document.createElement('div');
  bar.className = 'action-bar no-print';

  const btnPrint = mkBtn('btn-ghost btn-sm', '🖨 Print', () => printAs('portrait', 0.9));

  const btnClip = mkBtn('btn-ghost btn-sm', '📋 Kopieer', () => {
    const canvas = c.querySelector('.fa-canvas') || document.querySelector('.fa-canvas');
    if (!canvas) return;
    toast('Bezig met kopiëren…', 1500);
    const bg = THEMES[d.theme||'blauw'].fa.bg;
    // clipboard.write SYNCHROON in de klik aanroepen met een blob-promise —
    // anders verloopt de user-gesture als html2canvas lang duurt (NotAllowedError)
    const blobPromise = html2canvas(canvas, { backgroundColor: bg, scale: 2, useCORS: true,
      // Verberg in de kopie dezelfde UI-elementen als bij printen,
      // plus plaatshouder-teksten van lege invulvelden
      onclone: doc => {
        doc.querySelectorAll('.no-print, .fa-canvas select, .fa-edit-hint, .fnc-del')
          .forEach(el => el.style.display = 'none');
        doc.querySelectorAll('[data-ph]').forEach(el => el.removeAttribute('data-ph'));
      } })
      .then(cvs => new Promise((resolve, reject) =>
        cvs.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob gaf null')))));
    if (navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })])
        .then(() => toast('Gekopieerd naar klembord ✓'))
        .catch(() => toast('Kopiëren mislukt — probeer opnieuw', 3000));
    } else {
      toast('Kopiëren wordt niet ondersteund in deze browser', 3000);
    }
  });

  const btnPreview = mkBtn('btn-ghost btn-sm', '👁 Preview', () => buildPreviewOverlay(d));
  const btnUndo = mkBtn('btn-ghost btn-sm', '↩ Ongedaan', () => { if (onUndo) onUndo(); });
  btnUndo.title = 'Laatste wijziging ongedaan maken';
  const btnDel = mkTrashBtn('btn btn-sm btn-ghost', 'Verwijder FA', () => {
    if (confirm('Verwijder deze FA?')) { remove(d.id); go('/'); }
  });
  btnDel.style.color = 'var(--danger)';
  bar.append(btnPrint, btnClip, btnPreview, btnUndo, btnDel);
  c.appendChild(bar);

  /* ── Titelregel ── */
  {
    const isGroup = !_noGroup && load().filter(a => a.groupId === d.groupId).length > 1;
    c.appendChild(mkTitleRow(d, save, isGroup ? 'FABA' : 'FA'));
  }

  /* ── Themakiezer (alleen bij bovenste analyse, niet bij siblings) ── */
  if (!_noGroup) c.appendChild(mkThemePicker(d, id => { save({ theme: id }); if(onRedraw) onRedraw(); }));

  /* ══════════════════════════
     CANVAS — BA-stijl (wit, absolute posities, SVG pijlen)
  ══════════════════════════ */
  const th  = THEMES[d.theme || 'blauw'].ba;
  const N_BG_FA = '#F5F8FA', N_BD_FA = '#8AAABB', TXT_FA = '#1D3557';
  const BLU_FA = th.blu, LBLU_FA = th.lblu, GRN_FA = th.grn, LGRN_FA = th.lgrn;

  const SD_W=145, SD_H=90, R_W=145, R_H=90, SR_W=195, SR_H=120, FNC_W=195;
  const FNC_H_INIT = 56;              // vaste beginhootte FNC (voor pijlpositie)
  const sdX=16, mainY=24;
  const rX  = sdX + SD_W + 56;        // ruimte voor dots
  const srX = rX  + R_W  + 52;        // ruimte voor pijl
  const midY = mainY + Math.round(R_H/2);       // midden van R-vak
  const srTop = midY - Math.round(SR_H/2);      // Sr-pos-repr gecentreerd op midY
  const fncY = srTop + SR_H + 28;
  const CW  = srX + SR_W + 20;

  const canvas = document.createElement('div');
  canvas.className = 'fa-canvas';
  canvas.style.cssText = `position:relative;background:#fff;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.1);width:${CW}px;`;

  const inner = document.createElement('div');
  inner.style.cssText = `position:relative;width:${CW}px;min-height:${fncY+FNC_H_INIT+24}px;`;
  canvas.appendChild(inner);

  /* SVG overlay voor pijlen en dots */
  const faSvg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  faSvg.setAttribute('width', CW); faSvg.setAttribute('height','100%');
  faSvg.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:10;overflow:visible;';
  faSvg.innerHTML=`<defs><marker id="fa-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${BLU_FA}"/></marker></defs>`;
  const faSetA=(e,o)=>{Object.entries(o).forEach(([a,v])=>e.setAttribute(a,v));return e;};
  function faSvgLine(x1,y1,x2,y2){
    faSvg.appendChild(faSetA(document.createElementNS('http://www.w3.org/2000/svg','line'),
      {x1,y1,x2,y2,stroke:BLU_FA,'stroke-width':'1.5','marker-end':'url(#fa-arr)'}));
  }
  inner.appendChild(faSvg);

  /* Twee dots tussen Sd en R */
  const dotsCX = Math.round((sdX+SD_W+rX)/2);
  [midY-9, midY+9].forEach(cy=>{
    const c2=document.createElementNS('http://www.w3.org/2000/svg','circle');
    faSetA(c2,{cx:dotsCX,cy,r:'4',fill:BLU_FA}); faSvg.appendChild(c2);
  });

  /* Pijl → Sr-pos-repr (horizontaal, naar midden van ovaal) */
  const arrStartX = rX + R_W + 4;
  faSvgLine(arrStartX, midY, srX - 4, midY);

  /* Pijl → FNC (horizontaal, dynamisch naar midden van FNC) */
  const fncLine = faSetA(document.createElementNS('http://www.w3.org/2000/svg','line'),
    {x1:arrStartX, y1:fncY+28, x2:srX-4, y2:fncY+28,
     stroke:BLU_FA,'stroke-width':'1.5','marker-end':'url(#fa-arr)'});
  faSvg.appendChild(fncLine);

  /* ── Sd box ── */
  const sdEl = document.createElement('div');
  sdEl.style.cssText=`position:absolute;left:${sdX}px;top:${mainY}px;width:${SD_W}px;height:${SD_H}px;background:${N_BG_FA};border:1.5px solid ${N_BD_FA};border-radius:6px;padding:5px 8px;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;`;
  const sdLbl=document.createElement('div'); sdLbl.textContent='Sd'; sdLbl.style.cssText=`font-size:11px;font-weight:800;color:${N_BD_FA};margin-bottom:2px;letter-spacing:.04em;flex-shrink:0;`;
  const sdTa=makeTa(d.sd||'','context waarbinnen het probleemgedrag plaatsvindt',v=>{save({sd:v});});
  sdTa.style.color=TXT_FA; if(d.sd_fs) sdTa.style.fontSize=d.sd_fs;
  _ceFsSave.set(sdTa, fs => { save({sd_fs:fs}); });
  liveFillG(sdEl,sdTa,LBLU_FA,BLU_FA,N_BG_FA,N_BD_FA,sdLbl);
  sdEl.append(sdLbl,sdTa); inner.appendChild(sdEl);

  /* ── R box ── */
  const rEl = document.createElement('div');
  rEl.style.cssText=`position:absolute;left:${rX}px;top:${mainY}px;width:${R_W}px;height:${R_H}px;background:${N_BG_FA};border:1.5px solid ${N_BD_FA};border-radius:6px;padding:5px 8px;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;`;
  const rLbl=document.createElement('div'); rLbl.textContent='R'; rLbl.style.cssText=`font-size:11px;font-weight:800;color:${N_BD_FA};margin-bottom:2px;letter-spacing:.04em;flex-shrink:0;`;
  const rTa=makeTa(d.r||'','problematisch gedrag',v=>{save({r:v});});
  rTa.style.color=TXT_FA; if(d.r_fs) rTa.style.fontSize=d.r_fs;
  _ceFsSave.set(rTa, fs => { save({r_fs:fs}); });
  liveFillG(rEl,rTa,LBLU_FA,BLU_FA,N_BG_FA,N_BD_FA,rLbl);
  rEl.append(rLbl,rTa); inner.appendChild(rEl);

  /* ── Sr-pos-repr ovaal ── */
  if (!d.srNegItems) {
    d.srNegItems = (d.srNegTxt||d.srNegType) ? [{type:d.srNegType||'',txt:d.srNegTxt||''}] : [{type:'',txt:''}];
  }
  const srEl = makeSrNode(srX, srTop, SR_W, SR_H, d.srPosTxt, d.srPosType, SR_POS_TYPES, save, 'srPos', N_BG_FA, N_BD_FA, BLU_FA, LBLU_FA, TXT_FA, d.srPosFontSize, fs => save({srPosFontSize:fs}));
  inner.appendChild(srEl);

  /* ── FNC box ── */
  const fncEl = makeFncNode(srX, fncY, FNC_W, d.srNegItems, save, N_BG_FA, N_BD_FA, BLU_FA, LBLU_FA, TXT_FA, d.fncFontSize, fs => save({fncFontSize:fs}));
  inner.appendChild(fncEl);

  /* Canvas hoogte aanpassen na render */
  function faResize() {
    const h = fncEl.offsetTop + fncEl.offsetHeight + 24;
    inner.style.minHeight = h+'px';
    inner.style.height = h+'px';
    canvas.style.height = h+'px';
    faSvg.setAttribute('height', h);
    /* FNC-pijl dynamisch naar midden van FNC */
    const fncMidY = fncEl.offsetTop + Math.round(fncEl.offsetHeight / 2);
    fncLine.setAttribute('y1', fncMidY);
    fncLine.setAttribute('y2', fncMidY);
  }
  requestAnimationFrame(faResize);
  if (window.ResizeObserver) {
    new ResizeObserver(faResize).observe(fncEl);
  }

  const psw = document.createElement('div');
  psw.className = 'print-scale-wrap';
  psw.appendChild(canvas);

  const wrap2 = document.createElement('div');
  wrap2.style.cssText='padding:20px 24px;overflow:auto;';
  wrap2.appendChild(psw);
  c.appendChild(wrap2);

  if (!_noGroup) buildGroupBar(c, d);
}

/* ── Globale liveFill helper (ook gebruikt door FA) ── */
function liveFillG(el, ta, filledBg, filledBd, emptyBg, emptyBd, lbl) {
  function upd() {
    const filled = ta.value.trim().length > 0;
    el.style.background  = filled ? filledBg : emptyBg;
    el.style.borderColor = filled ? filledBd : emptyBd;
    if (lbl) lbl.style.color = filled ? filledBd : emptyBd;
  }
  upd();
  ta.addEventListener('input', upd);
}

/* ── Inline bewerkbare knoop (Sd, R) ── */
function makeInlineNode(labelTxt, placeholderTxt, initialVal, onSave) {
  const el = document.createElement('div');
  el.className = 'fa-node';
  if (initialVal) el.classList.add('filled');

  const lbl = document.createElement('div');
  lbl.className = 'fa-node-label';
  lbl.textContent = labelTxt;

  const ta = document.createElement('textarea');
  ta.value = initialVal;
  ta.placeholder = placeholderTxt;
  ta.style.cssText = `
    width:100%; box-sizing:border-box; resize:none; border:none; outline:none;
    background:transparent; font:inherit; font-size:11px; color:inherit;
    padding:0; margin:0; min-height:36px; cursor:text; line-height:1.35;
  `;
  ta.addEventListener('input', () => {
    el.classList.toggle('filled', ta.value.length > 0);
    onSave(ta.value);
  });
  ta.addEventListener('click', e => e.stopPropagation());

  el.append(lbl, ta);
  return el;
}

/* ── Knoop-builder (niet-interactief, voor andere plekken) ── */
function makeNode(shape, labelTxt, placeholderTxt, bodyTxt, wide) {
  const el = document.createElement('div');
  el.className = shape === 'oval' ? 'fa-node-oval' : 'fa-node';
  if (bodyTxt) el.classList.add('filled');
  el.innerHTML = `
    <div class="fa-node-label">${esc(labelTxt)}</div>
    <div class="fa-node-body">${bodyTxt
      ? `<span class="fa-node-text">${esc(bodyTxt)}</span>`
      : `<span class="fa-node-placeholder">${esc(placeholderTxt)}</span>`}
    </div>
    <span class="fa-edit-hint">✏️ tikken</span>`;
  return el;
}

/* ── Sr-pos-repr ovaal (BA-stijl, inline kleuren) ── */
function makeSrNode(x, y, w, h, bodyTxt, selectedType, types, save, prefix, N_BG, N_BD, BLU, LBLU, TXT, initFontSize, onFontSize) {
  const el = document.createElement('div');
  el.style.cssText=`position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${N_BG};border:2px solid ${N_BD};border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;text-align:left;padding:20px 20px 20px 12px;box-sizing:border-box;overflow:hidden;`;

  const lbl = document.createElement('div');
  lbl.textContent = 'Sr-pos-repr';
  lbl.style.cssText=`font-size:11px;font-weight:800;color:${N_BD};margin-bottom:3px;flex-shrink:0;`;
  el.appendChild(lbl);

  const body = document.createElement('div');
  body.style.cssText='width:100%;display:flex;flex-direction:column;align-items:flex-start;gap:3px;margin-top:14px;padding-left:10px;';
  el.appendChild(body);

  function upd() {
    const filled = !!(bodyTxt||selectedType);
    el.style.background    = filled ? LBLU : N_BG;
    el.style.borderColor   = filled ? BLU  : N_BD;
    lbl.style.color        = filled ? BLU  : N_BD;
  }

  function makePosSel() {
    const sel = document.createElement('select');
    sel.style.cssText=`font-family:'Courier New',monospace;font-size:11px;font-weight:700;padding:1px;border-radius:4px;border:1.5px solid ${BLU};background:#fff;color:${BLU};cursor:pointer;width:40px;-webkit-appearance:auto;appearance:auto;`;
    const emptyOpt=document.createElement('option'); emptyOpt.value=''; emptyOpt.textContent='—'; sel.appendChild(emptyOpt);
    types.forEach(tp=>{const opt=document.createElement('option');opt.value=tp.val;opt.textContent=tp.label;sel.appendChild(opt);});
    sel.addEventListener('click',e=>e.stopPropagation());
    return sel;
  }

  function render() {
    body.innerHTML='';
    const t = types.find(x=>x.val===selectedType);
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:baseline;gap:10px;width:100%;';
    if (!selectedType) {
      const sel=makePosSel();
      sel.addEventListener('change',e=>{e.stopPropagation();selectedType=e.target.value;bodyTxt=ta.value;const upd2={};upd2[prefix+'Type']=selectedType;save(upd2);upd();render();});
      const ta=makeTa(bodyTxt,'belangrijkste bekrachtiger',v=>{bodyTxt=v;const upd2={};upd2[prefix+'Txt']=v;save(upd2);upd();});
      ta.style.color=TXT; ta.style.textAlign='left'; if(initFontSize) ta.style.fontSize=initFontSize;
      if(onFontSize) _ceFsSave.set(ta, fs=>{initFontSize=fs; onFontSize(fs);});
      row.append(sel,ta);
    } else {
      const badge=document.createElement('span');
      badge.title='Klik om type te wijzigen';
      badge.style.cssText=`font-family:'Courier New',monospace;font-weight:700;font-size:12px;color:${BLU};flex-shrink:0;cursor:pointer;`;
      badge.textContent=t.label;
      badge.addEventListener('click',e=>{e.stopPropagation();const sel=makePosSel();sel.addEventListener('change',e2=>{e2.stopPropagation();selectedType=e2.target.value;const upd2={};upd2[prefix+'Type']=selectedType;save(upd2);upd();render();});badge.replaceWith(sel);sel.focus();});
      const ta=makeTa(bodyTxt,'belangrijkste bekrachtiger',v=>{bodyTxt=v;const upd2={};upd2[prefix+'Txt']=v;save(upd2);upd();});
      ta.style.color=TXT; ta.style.textAlign='left'; if(initFontSize) ta.style.fontSize=initFontSize;
      if(onFontSize) _ceFsSave.set(ta, fs=>{initFontSize=fs; onFontSize(fs);});
      row.append(badge,ta);
    }
    body.appendChild(row);
  }

  upd(); render();
  return el;
}


/* ── FNC box (BA-stijl, inline kleuren) ── */
function makeFncNode(x, y, w, items, save, N_BG, N_BD, GRN, LGRN, TXT, initFontSize, onFontSize) {
  const el = document.createElement('div');
  el.style.cssText=`position:absolute;left:${x}px;top:${y}px;width:${w}px;background:${N_BG};border:1.5px solid ${N_BD};border-radius:6px;padding:5px 8px 5px 18px;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;`;

  const lbl = document.createElement('div');
  lbl.textContent='FNC';
  lbl.style.cssText=`font-size:11px;font-weight:800;color:${N_BD};margin-bottom:3px;letter-spacing:.04em;flex-shrink:0;`;
  el.appendChild(lbl);

  const list = document.createElement('div');
  list.style.cssText='display:flex;flex-direction:column;gap:3px;width:100%';
  el.appendChild(list);

  function updFnc() {
    const filled = items.some(i=>i.txt||i.type);
    el.style.background  = filled ? LGRN : N_BG;
    el.style.borderColor = filled ? GRN  : N_BD;
    lbl.style.color      = filled ? GRN  : N_BD;
  }

  function saveItems() { updFnc(); save({srNegItems:items.map(i=>({type:i.type,txt:i.txt}))}); }

  function makeCompactSel(onChange) {
    const sel=document.createElement('select');
    sel.style.cssText=`font-family:'Courier New',monospace;font-size:11px;font-weight:700;padding:1px;border-radius:4px;border:1.5px solid ${GRN};background:#fff;color:${GRN};cursor:pointer;width:40px;-webkit-appearance:auto;appearance:auto;`;
    const emptyOpt=document.createElement('option');emptyOpt.value='';emptyOpt.textContent='—';sel.appendChild(emptyOpt);
    SR_NEG_TYPES.forEach(tp=>{const opt=document.createElement('option');opt.value=tp.val;opt.textContent=tp.label;sel.appendChild(opt);});
    sel.addEventListener('change',e=>{e.stopPropagation();onChange(e.target.value);});
    sel.addEventListener('click',e=>e.stopPropagation());
    return sel;
  }

  function renderItems() {
    list.innerHTML='';
    items.forEach((item,idx)=>{
      const itemWrap=document.createElement('div');
      itemWrap.style.cssText='display:flex;align-items:flex-start;gap:4px;width:100%;';
      const t=SR_NEG_TYPES.find(x=>x.val===item.type);
      const del=document.createElement('button');
      del.textContent='×';
      del.className='fnc-del no-print';
      del.style.cssText=`background:none;border:none;color:${GRN};font-size:13px;cursor:pointer;padding:0 1px;line-height:1;flex-shrink:0;opacity:.5;`;
      del.addEventListener('mouseenter',()=>del.style.opacity='1');
      del.addEventListener('mouseleave',()=>del.style.opacity='.5');
      del.addEventListener('click',e=>{e.stopPropagation();if(items.length>1){items.splice(idx,1);}else{items[0]={type:'',txt:''};} saveItems();renderItems();});
      if (!item.type) {
        const sel=makeCompactSel(val=>{item.type=val;item.txt=ta.value;saveItems();renderItems();});
        const ta=makeTa(item.txt,'feitelijke negatieve consequentie',v=>{item.txt=v;saveItems();});
        ta.style.color=TXT; if(initFontSize) ta.style.fontSize=initFontSize;
        if(onFontSize) _ceFsSave.set(ta, fs=>{initFontSize=fs; onFontSize(fs);});
        itemWrap.append(sel,ta,del);
      } else {
        const row=document.createElement('div');
        row.style.cssText='display:flex;align-items:baseline;gap:10px;flex:1;min-width:0';
        const badge=document.createElement('span');
        badge.title='Klik om type te wijzigen';
        badge.style.cssText=`font-family:'Courier New',monospace;font-weight:700;font-size:12px;color:${GRN};flex-shrink:0;cursor:pointer;`;
        badge.textContent=t.label;
        badge.addEventListener('click',e=>{e.stopPropagation();const sel=makeCompactSel(val=>{item.type=val;saveItems();renderItems();});badge.replaceWith(sel);sel.focus();});
        const ta=makeTa(item.txt,'feitelijke negatieve consequentie',v=>{item.txt=v;saveItems();});
        ta.style.color=TXT; if(initFontSize) ta.style.fontSize=initFontSize;
        if(onFontSize) _ceFsSave.set(ta, fs=>{initFontSize=fs; onFontSize(fs);});
        row.append(badge,ta);
        itemWrap.append(row,del);
      }
      list.appendChild(itemWrap);
    });
    const addBtn=document.createElement('button');
    addBtn.textContent='+ voeg toe';
    addBtn.className='no-print';
    addBtn.style.cssText=`background:none;border:1px dashed ${GRN};border-radius:4px;color:${GRN};font-size:11px;cursor:pointer;padding:2px 6px;margin-top:2px;opacity:.7;`;
    addBtn.addEventListener('click',e=>{e.stopPropagation();items.push({type:'',txt:''});saveItems();renderItems();});
    list.appendChild(addBtn);
  }

  updFnc(); renderItems();
  return el;
}


/* ── Mailen via mailto ── */
function mailFA(d) {
  const srPosLbl = d.srPosType ? ` [${srLabel(d.srPosType)}]` : '';
  const fncLines = (d.srNegItems || []).filter(i => i.txt || i.type)
    .map(i => `  ${i.type ? '[' + srLabel(i.type) + '] ' : ''}${i.txt || ''}`)
    .join('\n') || '  (niet ingevuld)';

  const body = [
    'FUNCTIEANALYSE — IGCGT',
    '',
    'Sd (Discriminatieve stimulus):',
    d.sd || '(niet ingevuld)',
    '',
    'R (Respons / probleemgedrag):',
    d.r || '(niet ingevuld)',
    '',
    `Sr-pos-repr-repr (Positieve consequentie)${srPosLbl}:`,
    d.srPosTxt || '(niet ingevuld)',
    '',
    'FNC (Feitelijke negatieve consequenties):',
    fncLines,
    d.notities ? `\nNotities:\n${d.notities}` : '',
    '',
    '---',
    'Geïntegreerde Cognitieve Gedragstherapie — Te Broeke, Korrelboom & Van Dijk (2024)',
  ].join('\n');

  const subject = encodeURIComponent('Functieanalyse IGCGT');
  window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
}


/* ── Registratie in het analyse-type register ── */
registerAnalysisType({
  type: 'FA',
  route: 'fa',
  label: 'Functieanalyse',
  sub: 'problematisch gedrag',
  icon: '🔍',
  badgeClass: 'badge-fa',
  groupable: true,
  buildPage: pgFA,
  defaultData: () => ({
    sd:'', r:'', fnc:'',
    srPosTxt:'', srPosType:'',
    srNegItems:[{type:'',txt:''}],
    notities:''
  }),
  buildInline: (container, d, onSave) => {
    buildFA(container, d, onSave, true); // _noGroup=true voorkomt recursie
  },
  buildPreviewBlock: d => {
    const tmp = document.createElement('div');
    buildFA(tmp, d, ()=>{}, true);
    return tmp.querySelector('.fa-canvas');
  }
});
