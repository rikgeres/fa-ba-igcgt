/* ══════════════════════════════════════════════════════════════
   HT — HOLISTISCHE THEORIE
   pgHT()              — pagina-opbouw (laden/aanmaken analyse)
   buildHT()           — canvas met alle kaarten op vaste posities
   makeCardBody()      — preview-inhoud per kaart (bulletpunten)
   makeInlineCardBody()— preview voor kritische gebeurtenissen (2×2 grid)
   openCardPopup()     — bewerkpopup per kaart
   openHtInfo()        — info-modal per kaarttype
   openHtFullscreen()  — volledig scherm preview van het schema
   HT_INFO             — informatieteksten per kaarttype
══════════════════════════════════════════════════════════════ */
function pgHT(c, id) {
  const isNew = id === 'new';
  const emptyData = () => ({
    persoonsfactoren:[], omgevingsfactoren:[], kernovertuigingen:[],
    leefregels:[], coping:[], klachten:[], stressoren:[],
    beschermendeFactoren:[], gevolgen:[], kritischeGebeurtenissen:[]
  });
  let d = isNew ? {
    id: uid(), type:'HT', title:'', client:'', date: today(),
    theme: 'blauw',
    data: emptyData()
  } : byId(id);
  if (!d) { c.innerHTML = '<p style="padding:20px">Niet gevonden.</p>'; return; }
  if (!d.data) d.data = emptyData();
  if (!d.theme) d.theme = 'blauw';

  let saveTimer = null;
  function save(extra) {
    if (extra) Object.assign(d, extra);
    upsert(d);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => toast('Automatisch opgeslagen ✓'), 1200);
  }

  function redrawHT() {
    c.innerHTML = '';
    buildHT(c, d, save, redrawHT);
  }
  redrawHT();
}

const HT_INFO = {
  aanlegGroup: { title:'Aanleg / vroege ervaringen', hBg:'#2A76A2', hTxt:'#fff',
    text:'Aangeboren kwetsbaarheden, temperament en vroege ervaringen die de basis vormen voor latere ontwikkeling. Denk aan genetische aanleg, gezinssituatie en belangrijke gebeurtenissen in de kindertijd.' },
  persoonsfactoren: { title:'Persoonsfactoren', hBg:'#CDDEEA', hTxt:'#2A76A2',
    text:'Aangeboren of vroeg verworven eigenschappen van de persoon: temperament, intelligentie, lichamelijke gezondheid en genetische kwetsbaarheid.' },
  omgevingsfactoren: { title:'Omgevingsfactoren', hBg:'#83B1C0', hTxt:'#fff',
    text:'Invloeden vanuit de omgeving tijdens de ontwikkeling: opvoeding, gezinsdynamiek, school, cultuur, sociaaleconomische situatie en ingrijpende gebeurtenissen.' },
  persoonlijkheidGroup: { title:'Persoonlijkheid', hBg:'#2A76A2', hTxt:'#fff',
    text:'De manier waarop iemand op basis van aanleg en ervaringen naar zichzelf, anderen en de wereld is gaan kijken. Bestaat uit kernovertuigingen, leefregels en copingstrategieën.' },
  kernovertuigingen: { title:'Kernovertuigingen', hBg:'#CDDEEA', hTxt:'#2A76A2',
    text:'Diepgewortelde, vaak onbewuste overtuigingen over zichzelf, anderen en de wereld. Bijvoorbeeld: \'Ik schiet tekort\', \'Anderen zijn niet te vertrouwen\'.' },
  leefregels: { title:'Leefregels', hBg:'#CDDEEA', hTxt:'#2A76A2',
    text:'Voorwaardelijke aannames en regels die voortkomen uit de kernovertuigingen: \'Als ik … dan …\'. Bijvoorbeeld: \'Als ik altijd presteer, dan word ik geaccepteerd\'.' },
  coping: { title:'Copingstrategieën', hBg:'#CDDEEA', hTxt:'#2A76A2',
    text:'Strategieën waarmee iemand omgaat met spanning en bedreigende situaties. Kan helpend zijn of klachten in stand houden (vermijden, perfectionisme, controle, piekeren).' },
  klachten: { title:'Klachten', hBg:'#2A76A2', hTxt:'#fff',
    text:'De huidige psychische klachten waarvoor hulp wordt gezocht. Beschrijf zo concreet mogelijk wat de cliënt ervaart.' },
  stressoren: { title:'Stressoren', hBg:'#83B1C0', hTxt:'#fff',
    text:'Actuele belastende factoren die de klachten uitlokken of versterken: werkdruk, relatieproblemen, verlies, gezondheidsproblemen.' },
  beschermendeFactoren: { title:'Beschermende factoren', hBg:'#83B1C0', hTxt:'#fff',
    text:'Sterke kanten, hulpbronnen en steunende factoren die de cliënt helpen om met klachten om te gaan: sociale steun, talenten, motivatie, eerdere succeservaringen.' },
  gevolgen: { title:'Gevolgschade', hBg:'#83B1C0', hTxt:'#fff',
    text:'De gevolgschade van de klachten op verschillende leefgebieden: werk, relaties, vrije tijd, lichamelijk functioneren. Vaak houden gevolgen de klachten mede in stand.' },
  kritischeGebeurtenissen: { title:'Kritische gebeurtenissen', hBg:'#83B1C0', hTxt:'#fff',
    text:'Specifieke gebeurtenissen die het ontstaan of de verergering van de klachten markeren. Vormen vaak een \'kantelpunt\' in het verhaal van de cliënt.' },
};

function openHtInfo(key) {
  const info = HT_INFO[key];
  if (!info) return;
  const modal = document.createElement('div');
  modal.className = 'ht-info-modal';
  const sheet = document.createElement('div');
  sheet.className = 'ht-info-sheet';
  const hdr = document.createElement('div');
  hdr.className = 'ht-info-sheet-hdr';
  hdr.style.cssText = `background:${info.hBg}; color:${info.hTxt};`;
  const ttl = document.createElement('span');
  ttl.textContent = info.title;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'ht-info-close';
  closeBtn.textContent = '×';
  closeBtn.onclick = () => modal.remove();
  hdr.append(ttl, closeBtn);
  const body = document.createElement('div');
  body.className = 'ht-info-sheet-body';
  body.textContent = info.text;
  sheet.append(hdr, body);
  modal.appendChild(sheet);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

function buildHT(c, d, save, redrawHT) {
  const W = 1400, H = 960, SH = 70; // SH = shift voor kritischeGebeurtenissen ruimte
  const ht = THEMES[d.theme || 'blauw'].ht; // { p, pl, s }

  // Zet HT-mode op app shell (verwijder max-width beperking)
  const appEl = document.getElementById('app');
  appEl.classList.add('ht-mode');
  const headerEl = document.querySelector('.app-header');
  // Verwijder ht-mode als we navigeren weg (en herstel de kopbalk)
  const offHtMode = () => {
    appEl.classList.remove('ht-mode');
    if (headerEl) { headerEl.style.width = ''; headerEl.style.margin = ''; }
    window.removeEventListener('hashchange', offHtMode);
  };
  window.addEventListener('hashchange', offHtMode);

  /* ── Actiebalk ── */
  const bar = document.createElement('div');
  bar.className = 'action-bar no-print';

  const btnPrint = mkBtn('btn-ghost btn-sm', '🖨 Print', () => {
    // Schaal adaptief: pas het schema in het afdrukbare A4-liggend gebied
    // (~1123×794px bij 96dpi; veiligheidsmarge voor printer-randen)
    const cnv = c.querySelector('.ht-canvas');
    const scale = cnv
      ? Math.min(1080 / cnv.offsetWidth, 760 / cnv.offsetHeight, 1)
      : 0.76;
    printAs('landscape', Math.floor(scale * 100) / 100);
  });

  const btnClip = mkBtn('btn-ghost btn-sm', '📋 Kopieer', () => {
    const htCanvas = c.querySelector('.ht-canvas');
    if (!htCanvas) return;
    toast('Bezig met kopiëren…', 1500);
    const sw = c.querySelector('.ht-scale-wrap');
    const prevTransform = sw ? sw.style.transform : '';
    if (sw) sw.style.transform = 'scale(1)';
    // Blob-promise opbouwen, maar clipboard.write SYNCHROON in de klik
    // aanroepen — anders verloopt de user-gesture als html2canvas lang
    // duurt en weigert de browser met NotAllowedError.
    const blobPromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        html2canvas(htCanvas, { backgroundColor:'#ffffff', scale:2, useCORS:true,
          width: htCanvas.offsetWidth, height: htCanvas.offsetHeight }).then(cvs => {
          if (sw) sw.style.transform = prevTransform;
          cvs.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob gaf null')));
        }).catch(err => { if (sw) sw.style.transform = prevTransform; reject(err); });
      }, 80);
    });
    if (navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })])
        .then(() => toast('Gekopieerd naar klembord ✓'))
        .catch(() => toast('Kopiëren mislukt — probeer opnieuw', 3000));
    } else {
      toast('Kopiëren wordt niet ondersteund in deze browser', 3000);
    }
  });

  // Preview knop — fullscreen overlay
  const btnPreview = mkBtn('btn-ghost btn-sm', '🔍 Preview', () => {
    openHtFullscreen(c.querySelector('.ht-canvas'));
  });

  const btnDel = mkTrashBtn('btn btn-sm btn-ghost', 'Verwijder HT', () => {
    if (confirm('Verwijder deze HT?')) { remove(d.id); go('/'); }
  });
  btnDel.style.color = 'var(--danger)';
  bar.append(btnPrint, btnPreview, btnClip, btnDel);

  /* ── Chrome (knoppenbalk + titel + themakiezer) ──
     Gecentreerde container die even breed is als de schemakaart, zodat
     de knoppen uitlijnen met de linkerrand van het schema (net als FA/BA)
     i.p.v. tegen de linkerrand van het scherm te plakken. Breedte wordt
     in fitCanvas gelijkgezet aan die van het witte kader. */
  const chrome = document.createElement('div');
  chrome.className = 'ht-chrome no-print';
  chrome.style.cssText = 'margin:0 auto;padding-top:16px;box-sizing:border-box;width:100%;';
  chrome.appendChild(bar);
  chrome.appendChild(mkTitleRow(d, save, 'HT'));
  if (redrawHT) chrome.appendChild(mkThemePicker(d, id => { d.theme = id; save(); redrawHT(); }));
  c.appendChild(chrome);

  /* ── Scroll wrapper + canvas ── */
  // wrap = het witte kader rondom het schema
  const wrap = document.createElement('div');
  wrap.className = 'ht-scroll-wrap';
  wrap.style.cssText = 'overflow:visible; background:#fff; box-shadow:0 2px 12px rgba(0,0,0,.1); display:block; box-sizing:border-box;';

  // Schaalwrapper: transform-origin top left
  const scaleWrap = document.createElement('div');
  scaleWrap.className = 'ht-scale-wrap';
  scaleWrap.style.cssText = `transform-origin:top left; overflow:visible; display:block;`;

  const canvas = document.createElement('div');
  canvas.className = 'ht-canvas';
  canvas.style.cssText = `position:relative; width:${W}px; height:${H}px; background:#fff; font-family:"Segoe UI","Open Sans",sans-serif;`;

  // Bereken schaal zodat het schema met gelijke marges rondom past
  function fitCanvas() {
    const headerH  = document.querySelector('.app-header')?.offsetHeight || 47;
    const barH     = bar.offsetHeight || 50;
    const outerPad = 28;  // grijze ruimte buiten het witte kader
    const innerPad = 20;  // witte ruimte binnen het kader rondom het schema
    const availW   = window.innerWidth  - outerPad * 2 - innerPad * 2;
    const availH   = window.innerHeight - headerH - barH - outerPad * 2 - innerPad * 2;
    const scale    = Math.min(availW / W, availH / H, 1);
    const scaledW  = Math.round(W * scale);
    const scaledH  = Math.round(H * scale);
    // Canvas begint intern op x=40 (linkermarge) maar eindigt op x=W (geen rechtermarge).
    // Compenseer rechts met dezelfde visuele ruimte zodat marges gelijk zijn.
    // Met box-sizing:border-box is width inclusief padding.
    const canvasLeftOffset = Math.round(40 * scale);
    scaleWrap.style.transform = `scale(${scale})`;
    const padL = innerPad;
    const padR = innerPad + canvasLeftOffset; // gelijke visuele marge als links
    const padT = innerPad;
    const padB = innerPad;
    // box-sizing:border-box → width is het TOTAAL inclusief padding
    wrap.style.width         = (scaledW + padL + padR) + 'px';
    wrap.style.height        = (scaledH + padT + padB) + 'px';
    wrap.style.paddingTop    = padT + 'px';
    wrap.style.paddingBottom = padB + 'px';
    wrap.style.paddingLeft   = padL + 'px';
    wrap.style.paddingRight  = padR + 'px';
    wrap.style.marginTop    = outerPad + 'px';
    wrap.style.marginBottom = outerPad + 'px';
    wrap.style.marginLeft   = 'auto';
    wrap.style.marginRight  = 'auto';
    // Knoppenbalk/titel én de blauwe kopbalk even breed als de schemakaart.
    // Kopbalk is een flex-item van #app (flex-kolom): expliciete width nodig,
    // want margin:0 auto laat een flex-item anders krimpen naar de inhoud.
    const cardW = (scaledW + padL + padR) + 'px';
    chrome.style.maxWidth = cardW;
    if (headerEl) { headerEl.style.width = cardW; headerEl.style.margin = '0 auto'; }
  }

  // Pas schaal aan bij laden en bij resize
  requestAnimationFrame(fitCanvas);
  window.addEventListener('resize', fitCanvas);
  window.addEventListener('hashchange', () => window.removeEventListener('resize', fitCanvas), { once: true });

  /* ── Kleuren per variant (thema-afhankelijk) ── */
  const VAR = {
    pinkLight: { hBg: ht.pl,  hTxt: ht.p,    border: ht.p  },
    pinkDark:  { hBg: ht.p,   hTxt: '#ffffff', border: ht.p  },
    teal:      { hBg: ht.s,   hTxt: '#ffffff', border: ht.s  },
  };

  /* ── Groepskaarten (achtergrond, z=0) ── */
  function makeGroupCard(x, y, w, h, title, infoKey) {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border:2px solid ${ht.p};display:flex;flex-direction:column;overflow:hidden;z-index:0;`;
    const hdr = document.createElement('div');
    hdr.className = 'ht-card-hdr';
    hdr.style.cssText = `position:relative;height:44px;min-height:44px;background:${ht.p};color:#fff;display:flex;align-items:center;padding:0 14px;font-size:16px;font-weight:600;letter-spacing:.01em;flex:0 0 auto;`;
    const span = document.createElement('span');
    span.style.cssText = 'flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;';
    span.textContent = title;
    const iBtn = document.createElement('button');
    iBtn.className = 'ht-info-btn no-print';
    iBtn.textContent = 'ℹ';
    iBtn.title = `Info over ${title}`;
    iBtn.addEventListener('click', e => { e.stopPropagation(); openHtInfo(infoKey); });
    hdr.append(span, iBtn);
    const body = document.createElement('div');
    body.style.cssText = `flex:1;background:${ht.p}12;`;
    el.append(hdr, body);
    return el;
  }

  canvas.appendChild(makeGroupCard(40,  50+SH, 240, 780, 'Aanleg / vroege ervaringen', 'aanlegGroup'));
  canvas.appendChild(makeGroupCard(320, 50+SH, 400, 780, 'Persoonlijkheid', 'persoonlijkheidGroup'));

  /* ── SVG pijlen ── */
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', W); svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;';
  svg.innerHTML = `
    <defs>
      <marker id="ht-arr-p" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${ht.p}"/></marker>
      <marker id="ht-arr-k" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${ht.s}"/></marker>
      <marker id="ht-arr-s" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${ht.s}"/></marker>
    </defs>
    <!-- Aanleg → Persoonlijkheid -->
    <path d="M280 ${177+SH}L288 ${177+SH}L288 ${752+SH}L280 ${752+SH}M288 ${460+SH}L320 ${460+SH}" stroke="${ht.p}" stroke-width="3" fill="none" marker-end="url(#ht-arr-p)"/>
    <!-- Persoonlijkheid → Klachten -->
    <path d="M720 ${177+SH}L728 ${177+SH}L728 ${752+SH}L720 ${752+SH}M728 ${460+SH}L800 ${460+SH}" stroke="${ht.p}" stroke-width="3" fill="none" marker-end="url(#ht-arr-p)"/>
    <!-- Stressoren + Beschermende factoren → Klachten -->
    <path d="M1160 ${190+SH}L1152 ${190+SH}L1152 ${505+SH}L1160 ${505+SH}M1152 ${347+SH}L1120 ${347+SH}" stroke="${ht.s}" stroke-width="3" fill="none" marker-end="url(#ht-arr-s)"/>
    <!-- Klachten ↕ Gevolgen -->
    <line x1="940" y1="${655+SH}" x2="940" y2="${685+SH}" stroke="${ht.p}" stroke-width="3" marker-end="url(#ht-arr-p)"/>
    <line x1="980" y1="${685+SH}" x2="980" y2="${655+SH}" stroke="${ht.p}" stroke-width="3" marker-end="url(#ht-arr-p)"/>
    <!-- Gevolgen → Coping feedbackloop -->
    <path d="M1100 ${830+SH}L1100 ${852+SH}L520 ${852+SH}L520 ${830+SH}" stroke="${ht.s}" stroke-width="3" fill="none" marker-end="url(#ht-arr-s)"/>
    <!-- Kritische gebeurtenissen → schema -->
    <line x1="760" y1="102" x2="760" y2="${380+SH}" stroke="${ht.s}" stroke-width="3" marker-end="url(#ht-arr-s)"/>
  `;
  canvas.appendChild(svg);

  /* ── Popup voor bewerken van een sectie ── */
  const MAX_ITEMS = { gevolgen: 6, kritischeGebeurtenissen: 4 };

  function openCardPopup(key, title, hBg, hTxt, cardH) {
    const maxItems = MAX_ITEMS[key] || Infinity;
    const itemGap = cardH >= 500 ? 16 : cardH >= 350 ? 10 : cardH >= 230 ? 7 : 4;
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;display:flex;align-items:center;justify-content:center;';

    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:14px;width:420px;max-width:95vw;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 8px 40px rgba(0,0,0,.22);overflow:hidden;';

    /* Header */
    const hdr = document.createElement('div');
    hdr.style.cssText = `background:${hBg};color:${hTxt};padding:14px 18px;font-size:15px;font-weight:700;display:flex;align-items:center;`;
    const hdrTxt = document.createElement('span'); hdrTxt.style.flex='1'; hdrTxt.textContent = title;
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `background:none;border:none;color:${hTxt};font-size:17px;cursor:pointer;opacity:.7;line-height:1;padding:0 2px;`;
    closeBtn.addEventListener('click', () => ov.remove());
    hdr.append(hdrTxt, closeBtn);
    box.appendChild(hdr);

    /* Lijst */
    const body = document.createElement('div');
    body.style.cssText = `flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:${itemGap}px;`;

    function renderItems() {
      body.innerHTML = '';
      const vals = d.data[key] || [];
      vals.forEach((val, i) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:flex-start;gap:8px;';
        const dot = document.createElement('span');
        dot.textContent = '●'; dot.style.cssText = 'margin-top:10px;color:#555;font-size:11px;flex-shrink:0;';
        const ta = document.createElement('textarea');
        ta.value = val; ta.rows = 1;
        ta.style.cssText = 'flex:1;border:1px solid #ddd;border-radius:6px;padding:6px 8px;font-size:16px;font-family:"Segoe UI","Open Sans",sans-serif;font-weight:400;resize:none;outline:none;overflow:hidden;transition:border-color .15s;';
        ta.addEventListener('focus', () => ta.style.borderColor = hBg);
        ta.addEventListener('blur',  () => ta.style.borderColor = '#ddd');
        const resize = () => { ta.style.height='auto'; ta.style.height=ta.scrollHeight+'px'; };
        ta.addEventListener('input', () => { resize(); d.data[key][i]=ta.value; save(); renderPreview(); });
        ta.addEventListener('keydown', e => {
          if (e.key==='Enter') {
            e.preventDefault();
            if (d.data[key].length >= maxItems) return;
            d.data[key].splice(i+1,0,''); save(); renderItems();
            const tas=body.querySelectorAll('textarea'); if(tas[i+1]) tas[i+1].focus();
          } else if(e.key==='Backspace' && ta.value==='' && d.data[key].length>1) {
            e.preventDefault();
            d.data[key].splice(i,1); save(); renderItems(); renderPreview();
            const tas=body.querySelectorAll('textarea'); if(tas[Math.max(0,i-1)]) tas[Math.max(0,i-1)].focus();
          }
        });
        const del = document.createElement('button');
        del.innerHTML = TRASH_SVG; del.title = 'Verwijder';
        del.style.cssText = 'background:none;border:none;cursor:pointer;color:#ccc;padding:6px 2px;flex-shrink:0;display:flex;align-items:center;';
        del.addEventListener('mouseenter', () => del.style.color='var(--danger)');
        del.addEventListener('mouseleave', () => del.style.color='#ccc');
        del.addEventListener('click', () => { d.data[key].splice(i,1); save(); renderItems(); renderPreview(); });
        requestAnimationFrame(resize);
        row.append(dot, ta, del);
        body.appendChild(row);
      });
      /* + Nieuw item knop (verborgen bij max) */
      if ((d.data[key]||[]).length < maxItems) {
        const addBtn = document.createElement('button');
        addBtn.textContent = '+ item toevoegen';
        addBtn.style.cssText = 'border:none;background:none;cursor:pointer;font-size:13px;color:#aaa;text-align:left;padding:4px 0 4px 18px;';
        addBtn.addEventListener('mouseenter', () => addBtn.style.color=hBg);
        addBtn.addEventListener('mouseleave', () => addBtn.style.color='#aaa');
        addBtn.addEventListener('click', () => {
          if (!d.data[key]) d.data[key]=[];
          if (d.data[key].length >= maxItems) return;
          d.data[key].push(''); save(); renderItems();
          const tas=body.querySelectorAll('textarea'); if(tas.length) tas[tas.length-1].focus();
        });
        body.appendChild(addBtn);
      } else {
        const lim = document.createElement('div');
        lim.textContent = `Maximum van ${maxItems} invoervelden bereikt`;
        lim.style.cssText = 'font-size:12px;color:#aaa;padding:4px 0 4px 18px;font-style:italic;';
        body.appendChild(lim);
      }
    }

    if (!d.data[key] || d.data[key].length===0) d.data[key]=[''];
    renderItems();
    box.appendChild(body);

    /* Klik buiten box sluit popup */
    ov.addEventListener('click', e => { if(e.target===ov) ov.remove(); });
    ov.appendChild(box);
    document.body.appendChild(ov);

    /* Focus eerste textarea */
    requestAnimationFrame(() => { const t=body.querySelector('textarea'); if(t) t.focus(); });
  }

  /* ── Preview-body: readonly samenvatting in de kaart ── */
  function makeCardBody(key, centered, hBg, cardH) {
    const wrap2 = document.createElement('div');

    function mkDotRow(val, lh) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:flex-start;gap:4px;';
      const dot = document.createElement('span');
      dot.textContent = '●';
      dot.style.cssText = 'font-size:10px;margin-top:4px;color:#374151;flex-shrink:0;line-height:1.4;';
      const txt = document.createElement('span');
      txt.textContent = val;
      txt.style.cssText = `font-size:17px;font-weight:400;line-height:${lh};color:#1f2937;word-break:break-word;flex:1;`;
      row.append(dot, txt);
      return row;
    }

    function mkCol(items, lh) {
      const col = document.createElement('div');
      col.style.cssText = 'flex:1;display:flex;flex-direction:column;justify-content:space-evenly;overflow:hidden;';
      items.forEach(v => col.appendChild(mkDotRow(v, lh)));
      return col;
    }

    function renderPreviewInner() {
      wrap2.innerHTML = '';
      const vals = (d.data[key]||[]).filter(v => v.trim());

      if (vals.length === 0) {
        wrap2.style.cssText = 'flex:1;overflow:hidden;padding:8px 14px;display:flex;align-items:center;cursor:pointer;';
        const ph = document.createElement('span');
        ph.textContent = 'Klik om toe te voegen…';
        ph.style.cssText = 'font-size:14px;color:#9ca3af;font-style:italic;';
        wrap2.appendChild(ph);
        return;
      }

      /* Gevolgschade: 2-kolom grid bij meer dan 3 items — items lopen van linksboven naar rechtsboven */
      if (key === 'gevolgen' && vals.length > 3) {
        wrap2.style.cssText = 'flex:1;overflow:hidden;padding:6px 14px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);grid-auto-flow:column;gap:2px 8px;cursor:pointer;';
        vals.slice(0,6).forEach(v => wrap2.appendChild(mkDotRow(v, 1.3)));
        return;
      }

      /* Standaard: één kolom, space-evenly voor automatische verdeling */
      const lh = cardH >= 500 ? 1.5 : cardH >= 350 ? 1.4 : 1.3;
      wrap2.style.cssText = `flex:1;overflow:hidden;padding:8px 14px;display:flex;flex-direction:column;justify-content:space-evenly;cursor:pointer;${centered ? 'align-items:center;' : ''}`;
      vals.forEach(v => wrap2.appendChild(mkDotRow(v, lh)));
    }

    wrap2._refresh = renderPreviewInner;
    renderPreviewInner();
    return wrap2;
  }

  // Globale renderPreview helper die alle kaart-bodies herlaadt
  const cardBodyMap = {};
  function renderPreview() { Object.values(cardBodyMap).forEach(fn => fn()); }

  /* ── Inline body (kritischeGebeurtenissen) — popup variant ── */
  function makeInlineCardBody(key, hBg, hTxt, cardH) {
    const wrap2 = document.createElement('div');
    wrap2.style.cssText = 'flex:1;overflow:hidden;padding:3px 10px;display:flex;flex-direction:row;gap:8px;cursor:pointer;';

    function mkCol(items) {
      const col = document.createElement('div');
      col.style.cssText = 'flex:1;display:flex;flex-direction:column;justify-content:space-evenly;overflow:hidden;';
      items.forEach(v => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:flex-start;gap:3px;';
        const dot = document.createElement('span');
        dot.textContent = '●'; dot.style.cssText = 'font-size:9px;margin-top:2px;color:#555;flex-shrink:0;';
        const txt = document.createElement('span');
        txt.textContent = v; txt.style.cssText = 'font-size:14px;font-weight:500;line-height:1.3;color:#111;word-break:break-word;flex:1;overflow:hidden;';
        row.append(dot, txt); col.appendChild(row);
      });
      return col;
    }

    function upd() {
      wrap2.innerHTML = '';
      const vals = (d.data[key]||[]).filter(s => s.trim());
      if (vals.length === 0) {
        wrap2.style.cssText = 'flex:1;overflow:hidden;padding:4px 14px;display:flex;align-items:center;cursor:pointer;';
        const ph = document.createElement('span');
        ph.textContent = 'Klik om toe te voegen…';
        ph.style.cssText = 'font-size:14px;color:#9ca3af;font-style:italic;';
        wrap2.appendChild(ph);
        return;
      }
      /* 2×2 grid — items lopen van linksboven naar rechtsboven */
      wrap2.style.cssText = 'flex:1;overflow:hidden;padding:4px 14px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(2,1fr);grid-auto-flow:column;gap:2px 8px;cursor:pointer;';
      vals.slice(0,4).forEach(v => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:3px;overflow:hidden;';
        const dot = document.createElement('span');
        dot.textContent = '●'; dot.style.cssText = 'font-size:9px;color:#374151;flex-shrink:0;';
        const txt = document.createElement('span');
        txt.textContent = v; txt.style.cssText = 'font-size:16px;font-weight:400;line-height:1.3;color:#1f2937;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;';
        row.append(dot, txt); wrap2.appendChild(row);
      });
    }

    upd();
    wrap2._refresh = upd;
    wrap2.addEventListener('click', () => openCardPopup(key, 'Kritische gebeurtenissen', hBg, hTxt, cardH));
    return wrap2;
  }

  /* ── Content cards ── */
  const CARDS = [
    { key:'persoonsfactoren',       title:'Persoonsfactoren',       x:40,   y:90+SH,  w:240, h:320, v:'pinkLight' },
    { key:'omgevingsfactoren',      title:'Omgevingsfactoren',      x:40,   y:450+SH, w:240, h:380, v:'teal', border:'#2A76A2' },
    { key:'kernovertuigingen',      title:'Kernovertuigingen',      x:320,  y:90+SH,  w:400, h:233, v:'pinkLight' },
    { key:'leefregels',             title:'Leefregels',             x:320,  y:343+SH, w:400, h:233, v:'pinkLight' },
    { key:'coping',                 title:'Copingstrategieën',      x:320,  y:596+SH, w:400, h:234, v:'pinkLight' },
    { key:'klachten',               title:'Klachten',               x:800,  y:50+SH,  w:320, h:605, v:'pinkDark', centered:true },
    { key:'stressoren',             title:'Stressoren',             x:1160, y:50+SH,  w:240, h:280, v:'teal' },
    { key:'beschermendeFactoren',   title:'Beschermende factoren',  x:1160, y:355+SH, w:240, h:300, v:'teal' },
    { key:'gevolgen',               title:'Gevolgschade',           x:800,  y:685+SH, w:600, h:145, v:'teal' },
    { key:'kritischeGebeurtenissen',title:'Kritische gebeurtenissen',x:360, y:6,      w:680, h:96,  v:'teal', inline:true, z:5 },
  ];

  CARDS.forEach(({ key, title, x, y, w, h, v, border, centered, inline, z }) => {
    const col = VAR[v];
    const card = document.createElement('div');
    card.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border:2px solid ${border||col.border};display:flex;flex-direction:column;overflow:hidden;background:#fff;z-index:${z||1};cursor:pointer;`;
    card.addEventListener('mouseenter', () => card.style.filter='brightness(.97)');
    card.addEventListener('mouseleave', () => card.style.filter='');

    const hdr = document.createElement('div');
    hdr.className = 'ht-card-hdr';
    hdr.style.cssText = `position:relative;height:44px;min-height:44px;background:${col.hBg};color:${col.hTxt};display:flex;align-items:center;padding:0 14px;font-size:16px;font-weight:600;letter-spacing:.01em;flex:0 0 auto;overflow:hidden;`;
    const hdrSpan = document.createElement('span');
    hdrSpan.style.cssText = 'flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    hdrSpan.textContent = title;
    hdr.appendChild(hdrSpan);
    if (HT_INFO[key]) {
      const iBtn = document.createElement('button');
      iBtn.className = 'ht-info-btn no-print';
      iBtn.textContent = 'ℹ';
      iBtn.title = `Info over ${title}`;
      iBtn.addEventListener('click', e => { e.stopPropagation(); openHtInfo(key); });
      hdr.appendChild(iBtn);
    }
    card.appendChild(hdr);

    if (inline) {
      const body2 = makeInlineCardBody(key, col.hBg, col.hTxt, h);
      cardBodyMap[key] = body2._refresh;
      card.appendChild(body2);
    } else {
      const body2 = makeCardBody(key, centered, col.hBg, h);
      cardBodyMap[key] = body2._refresh;
      card.addEventListener('click', () => openCardPopup(key, title, col.hBg, col.hTxt, h));
      card.appendChild(body2);
    }

    canvas.appendChild(card);
  });

  scaleWrap.appendChild(canvas);
  wrap.appendChild(scaleWrap);
  c.appendChild(wrap);
}

/* ── HT Fullscreen Preview ── */
function openHtFullscreen(schemaEl) {
  if (!schemaEl) return;

  const W = 1400, H = 960;

  const overlay = document.createElement('div');
  overlay.className = 'ht-preview-overlay active';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'ht-preview-close no-print';
  closeBtn.textContent = '✕ Sluit preview';

  // Schaalbare wrapper binnen de overlay
  const fsScaleWrap = document.createElement('div');
  fsScaleWrap.style.cssText = `transform-origin:top left; position:absolute; top:0; left:0; width:${W}px; height:${H}px;`;

  // Verplaats het echte canvas naar de overlay (blijft live editeerbaar)
  const placeholder = document.createElement('div');
  placeholder.style.cssText = 'display:none;';
  schemaEl.parentNode.insertBefore(placeholder, schemaEl);
  fsScaleWrap.appendChild(schemaEl);

  overlay.append(closeBtn, fsScaleWrap);
  document.body.appendChild(overlay);

  function applyScale() {
    const vw = overlay.clientWidth  || window.screen.width;
    const vh = overlay.clientHeight || window.screen.height;
    const pad = 24;
    const scale = Math.min((vw - pad) / W, (vh - pad) / H);
    const left = Math.max(0, (vw - W * scale) / 2);
    const top  = Math.max(0, (vh - H * scale) / 2);
    fsScaleWrap.style.transform = `scale(${scale})`;
    fsScaleWrap.style.left = left + 'px';
    fsScaleWrap.style.top  = top  + 'px';
  }

  // Vraag browser fullscreen
  const doFullscreen = () => {
    if (overlay.requestFullscreen) overlay.requestFullscreen();
    else if (overlay.webkitRequestFullscreen) overlay.webkitRequestFullscreen();
  };
  doFullscreen();

  // Schaal zodra fullscreen actief is (clientWidth pas beschikbaar na event)
  const onFsChange = () => { requestAnimationFrame(applyScale); };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  window.addEventListener('resize', applyScale);
  requestAnimationFrame(applyScale);

  function close() {
    placeholder.parentNode.insertBefore(schemaEl, placeholder);
    placeholder.remove();
    overlay.remove();
    document.removeEventListener('fullscreenchange', onFsChange);
    document.removeEventListener('webkitfullscreenchange', onFsChange);
    window.removeEventListener('resize', applyScale);
    if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen();
    else if (document.webkitExitFullscreen && document.webkitFullscreenElement) document.webkitExitFullscreen();
  }

  closeBtn.addEventListener('click', close);
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && overlay.isConnected) close();
  });
  document.addEventListener('webkitfullscreenchange', () => {
    if (!document.webkitFullscreenElement && overlay.isConnected) close();
  });
}


/* ── Registratie in het analyse-type register ── */
registerAnalysisType({
  type: 'HT',
  route: 'ht',
  label: 'Holistische Theorie',
  sub: 'probleemsamenhang',
  icon: '🗺',
  badgeClass: 'badge-ht',
  groupable: false, // HT maakt geen deel uit van FABA-groepen
  buildPage: pgHT,
  defaultData: () => ({
    data: {
      persoonsfactoren: [], omgevingsfactoren: [], kernovertuigingen: [],
      leefregels: [], coping: [], klachten: [], stressoren: [],
      beschermendeFactoren: [], gevolgen: [], kritischeGebeurtenissen: []
    }
  })
});
