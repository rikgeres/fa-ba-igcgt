/* ─────────────────────────────────────────
   Preview-overlay
───────────────────────────────────────── */
function buildPreviewOverlay(d) {
  window._previewMode = true;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:9000;overflow:auto;padding:48px 40px 60px;box-sizing:border-box;';

  // Sluitknop
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ Sluiten';
  closeBtn.style.cssText = 'position:fixed;top:14px;right:24px;z-index:9001;background:#f0f0f0;border:1px solid #ccc;border-radius:6px;padding:6px 16px;font-size:13px;cursor:pointer;';
  closeBtn.addEventListener('click', () => { window._previewMode = false; document.body.removeChild(overlay); });
  overlay.appendChild(closeBtn);

  // Verzamel en sorteer analyses in de groep
  const allData = load();
  let siblings = allData.filter(a => a.groupId === d.groupId);
  if (d.groupOrder && d.groupOrder.length) {
    siblings.sort((a,b) => {
      const ai = d.groupOrder.indexOf(a.id), bi = d.groupOrder.indexOf(b.id);
      return (ai<0?999:ai) - (bi<0?999:bi);
    });
  }

  siblings.forEach(sib => {
    const block = document.createElement('div');
    block.style.cssText = 'margin-bottom:48px;';

    // Titel boven het schema (als die er is)
    if (sib.title || sib.client) {
      const titleDiv = document.createElement('div');
      titleDiv.style.cssText = 'font-size:15px;font-weight:700;color:#1D3557;margin-bottom:8px;';
      titleDiv.textContent = [sib.title, sib.client].filter(Boolean).join(' — ');
      block.appendChild(titleDiv);
    }

    // Render de canvas in een tijdelijke container
    const tmp = document.createElement('div');
    if (sib.type === 'FA') {
      buildFA(tmp, sib, ()=>{}, true); // _noGroup=true voorkomt recursie
      const canvas = tmp.querySelector('.fa-canvas');
      if (canvas) block.appendChild(canvas);
    } else if (sib.type === 'BA') {
      buildBACanvas(tmp, sib, ()=>{}, ()=>{});
      const canvas = tmp.querySelector('.ba-canvas');
      if (canvas) { canvas.style.position='relative'; block.appendChild(canvas); }
    }

    overlay.appendChild(block);
  });

  // Maak alle textareas read-only en visueel clean
  overlay.querySelectorAll('textarea').forEach(ta => {
    ta.readOnly = true; ta.style.cursor = 'default'; ta.style.userSelect = 'text';
  });
  overlay.querySelectorAll('[contenteditable="true"]').forEach(ce => {
    ce.contentEditable = 'false'; ce.style.cursor = 'default'; ce.style.userSelect = 'text';
  });
  // Verberg no-print elementen (knoppen, cfg-balk, etc.) — sluitknop uitgezonderd
  overlay.querySelectorAll('.no-print, .action-bar').forEach(el => el.style.display = 'none');
  overlay.querySelectorAll('button').forEach(el => {
    if (el !== closeBtn) el.style.display = 'none';
  });

  window._previewMode = false;
  document.body.appendChild(overlay);
}

/* ══════════════════════════════════════════════════════════════
   GROEPSBALK — GEKOPPELDE ANALYSES
   buildGroupBar() toont gekoppelde FA's en BA's onder de huidige
   analyse. Via de + knop kun je een nieuwe FA of BA koppelen.
   Analyses delen een groupId en kunnen worden herordend.
══════════════════════════════════════════════════════════════ */
function buildGroupBar(container, d) {
  if (!d.groupId) return;

  /* ── Inline schema-renderer voor één analyse ── */
  function renderInlineSchema(sibling) {
    // Siblings erven het thema van de bovenste (huidige) analyse
    sibling.theme = d.theme;

    const sec = document.createElement('div');
    sec.className = 'group-section';
    sec.style.cssText = 'border-top:2px solid var(--border);margin-top:4px;position:relative;';

    // Schema inline renderen (geen minibar, geen themakiezer — die staat bovenaan)
    const schemaWrap = document.createElement('div');
    sec.appendChild(schemaWrap);

    if (sibling.type==='FA') {
      const sd = sibling;
      const saveSibling = extra => { if (extra) Object.assign(sd, extra); upsert(sd); };
      buildFA(schemaWrap, sd, saveSibling, true);
    } else if (sibling.type==='BA') {
      const sd = sibling;
      const cfgBar2    = document.createElement('div'); schemaWrap.appendChild(cfgBar2);
      const canvasWrap2 = document.createElement('div'); canvasWrap2.style.cssText='padding:20px 24px;overflow:auto;'; schemaWrap.appendChild(canvasWrap2);
      const saveSibling = extra => { if (extra) Object.assign(sd, extra); upsert(sd); };
      const redrawSibling = () => {
        buildBACfgBar(cfgBar2, sd, saveSibling, redrawSibling);
        canvasWrap2.innerHTML=''; buildBACanvas(canvasWrap2, sd, saveSibling, redrawSibling);
      };
      redrawSibling();
    }

    return sec;
  }

  /* ── Gesorteerde siblings ophalen (huidige analyse NIET tonen, die staat al boven) ── */
  function getSorted() {
    const all = load().filter(a => a.groupId === d.groupId);
    const order = d.groupOrder || [];
    const ordered = order.map(id=>all.find(a=>a.id===id)).filter(Boolean);
    const rest = all.filter(a=>!order.includes(a.id));
    return [...ordered, ...rest];
  }

  const inner = document.createElement('div');
  container.appendChild(inner);

  function render() {
    inner.innerHTML = '';
    const siblings = getSorted();
    // Toon alle analyses BEHALVE de huidige (die staat al boven)
    const others = siblings.filter(s => s.id !== d.id);

    others.forEach(s => {
      try { inner.appendChild(renderInlineSchema(s)); }
      catch(e) { console.error('Fout bij renderen sibling', s.id, e); }
    });

    /* ── + knop onderaan links ── */
    const footer = document.createElement('div');
    footer.className = 'no-print';
    footer.style.cssText = 'display:flex;align-items:center;padding:10px 16px;gap:6px;position:relative;';

    const plusBtn = document.createElement('button');
    plusBtn.title = 'Voeg analyse toe';
    plusBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    plusBtn.style.cssText = 'width:24px;height:24px;border-radius:50%;border:1.5px solid #aaa;background:#fff;color:#888;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
    plusBtn.addEventListener('mouseenter',()=>{plusBtn.style.borderColor='var(--cgt-blue)';plusBtn.style.color='var(--cgt-blue)';});
    plusBtn.addEventListener('mouseleave',()=>{plusBtn.style.borderColor='#aaa';plusBtn.style.color='#888';});

    const menu = document.createElement('div');
    menu.style.cssText = 'display:none;position:absolute;bottom:36px;left:14px;background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.13);overflow:hidden;z-index:200;min-width:160px;';
    [['FA','Functieanalyse'],['BA','Betekenisanalyse']].forEach(([type,lbl]) => {
      const opt = document.createElement('button');
      opt.textContent = lbl;
      opt.style.cssText = 'display:block;width:100%;padding:9px 18px;border:none;background:#fff;text-align:left;cursor:pointer;font-size:13px;color:#333;white-space:nowrap;';
      opt.addEventListener('mouseenter',()=>opt.style.background='#f0f6ff');
      opt.addEventListener('mouseleave',()=>opt.style.background='#fff');
      opt.addEventListener('click', () => {
        menu.style.display='none';
        // Maak nieuwe analyse aan in dezelfde groep, render inline
        const newId2 = uid();
        const newAnalysis = type==='FA'
          ? { id:newId2, type:'FA', title:'', client:'', date:today(), groupId:d.groupId, theme:'blauw', sd:'', r:'', fnc:'', srPosTxt:'', srPosType:'', srNegItems:[{type:'',txt:''}], notities:'' }
          : { id:newId2, type:'BA', title:'', client:'', date:today(), groupId:d.groupId, theme:'blauw', showOs:false, os:'', cs:'', assocType:'', centralType:'usur', centralSubtype:'', centralText:'', centralArchiefLabel:'', extraOvals:[], zweefArchieven:[], bewijsOvals:[], showRepr:false, reprStimulus:'', reprResponse:'', reprBetekenis:'', cr:'' };
        upsert(newAnalysis);
        // Sla volgorde op: bestaande volgorde bewaren, nieuwe analyse achteraan
        const allData2 = load();
        const groupMembers = allData2.filter(a=>a.groupId===d.groupId);
        const existingOrder = (d.groupOrder||[]).filter(id=>groupMembers.find(a=>a.id===id));
        const rest2 = groupMembers.map(a=>a.id).filter(id=>!existingOrder.includes(id)&&id!==newId2);
        const newOrder2 = [...existingOrder, ...rest2, newId2];
        allData2.forEach(a=>{ if(a.groupId===d.groupId) a.groupOrder=newOrder2; });
        dump(allData2);
        d.groupOrder = newOrder2;
        render();
      });
      menu.appendChild(opt);
    });

    plusBtn.addEventListener('click', e => {
      e.stopPropagation();
      menu.style.display = menu.style.display==='none' ? 'block' : 'none';
    });
    document.addEventListener('click', ()=>{ menu.style.display='none'; }, {once:true});

    footer.append(plusBtn, menu);
    inner.appendChild(footer);
  }

  render();
}

