/* ══════════════════════════════════════════════════════════════
   ROUTER & NAVIGATIE
   go()     — navigeren via location.hash
   route()  — hash uitlezen (#/fa/:id → { seg:'fa', p1:id })
   render() — centrale render-dispatcher: 'home' → pgHome,
              overige segmenten via het analyse-type register
   pgHome() — startpagina met tegels en recente analyses
══════════════════════════════════════════════════════════════ */
/* ── Router ── */
const go = path => { location.hash = path; };
window.addEventListener('hashchange', render);

function route() {
  const h = location.hash.slice(1) || '/';
  const p = h.split('/').filter(Boolean);
  return { seg: p[0] || 'home', p1: p[1] };
}

function render() {
  const { seg, p1 } = route();
  const main = document.getElementById('main');
  document.getElementById('hdr-back').innerHTML = '';
  document.getElementById('hdr-act').innerHTML  = '';
  main.innerHTML = ''; main.className = 'app-main page';
  document.querySelectorAll('.fab').forEach(f => f.remove());

  const setTitle = t => document.getElementById('hdr-title').textContent = t;
  const backBtn  = path => {
    const b = document.createElement('button');
    b.className = 'back-btn no-print'; b.textContent = '‹';
    b.onclick = () => go(path);
    document.getElementById('hdr-back').appendChild(b);
  };

  if (seg === 'home') { setTitle('CGT Analyse Tool'); pgHome(main); return; }
  const t = analysisTypeByRoute(seg);
  if (t) {
    setTitle(p1 === 'new' ? `Nieuwe ${t.type}` : t.type);
    backBtn('/');
    t.buildPage(main, p1);
  } else {
    main.innerHTML = '<p style="padding:20px">Pagina niet gevonden.</p>';
  }
}

/* ══════════════════════════════════════════
   HOME
══════════════════════════════════════════ */
function pgHome(c) {
  // Titel/subtitel
  const hero = document.createElement('div');
  hero.style.cssText = 'text-align:center;padding:28px 16px 20px;position:relative;';
  hero.innerHTML = `
    <h2 style="font-size:22px;font-weight:800;color:var(--txt);margin-bottom:6px">CGT Analyse Tool</h2>
    <p style="font-size:13px;color:var(--muted)">Kies een analyse om te starten of door te gaan</p>`;

  // Info-knop
  const infoBtn = document.createElement('button');
  infoBtn.title = 'Over opslag & veiligheid';
  infoBtn.style.cssText = 'position:absolute;top:28px;right:4px;width:28px;height:28px;border-radius:50%;border:1.5px solid var(--border);background:var(--surface);color:var(--muted);font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;transition:border-color .15s,color .15s;';
  infoBtn.textContent = 'i';
  infoBtn.addEventListener('mouseenter', () => { infoBtn.style.borderColor='var(--cgt-blue)'; infoBtn.style.color='var(--cgt-blue)'; });
  infoBtn.addEventListener('mouseleave', () => { infoBtn.style.borderColor='var(--border)'; infoBtn.style.color='var(--muted)'; });
  infoBtn.addEventListener('click', () => openInfoModal());
  hero.appendChild(infoBtn);

  c.appendChild(hero);

  function openInfoModal() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:20px;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;border-radius:16px;max-width:460px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,.18);overflow:hidden;font-family:inherit;display:flex;flex-direction:column;max-height:90vh;';

    // Header
    const hdr = document.createElement('div');
    hdr.style.cssText = 'background:var(--cgt-blue);color:#fff;padding:20px 24px 0;position:relative;flex-shrink:0;';
    hdr.innerHTML = `<div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.75;margin-bottom:6px">CGT Analyse Tool</div>`;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = 'position:absolute;top:16px;right:18px;background:rgba(255,255,255,.2);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:background .15s;';
    closeBtn.addEventListener('mouseenter', () => closeBtn.style.background='rgba(255,255,255,.35)');
    closeBtn.addEventListener('mouseleave', () => closeBtn.style.background='rgba(255,255,255,.2)');
    closeBtn.addEventListener('click', () => overlay.remove());
    hdr.appendChild(closeBtn);

    // Tabs in header
    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex;gap:0;margin-top:4px;';
    const TABS = ['Opslag & veiligheid', 'Over deze tool'];
    let activeTab = 0;
    const tabBtns = TABS.map((label, i) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = `background:none;border:none;color:#fff;font-size:13px;font-weight:600;padding:10px 18px 10px;cursor:pointer;border-bottom:3px solid transparent;opacity:.65;transition:opacity .15s,border-color .15s;font-family:inherit;`;
      btn.addEventListener('click', () => { activeTab = i; renderTab(); });
      tabBar.appendChild(btn);
      return btn;
    });
    hdr.appendChild(tabBar);
    modal.appendChild(hdr);

    // Scrollable body
    const body = document.createElement('div');
    body.style.cssText = 'padding:24px 24px 28px;overflow-y:auto;flex:1;';

    function mkP(txt, extra='') {
      const p = document.createElement('p');
      p.style.cssText = `font-size:14px;line-height:1.65;color:#2a2a2a;margin:0 0 16px;${extra}`;
      p.textContent = txt;
      return p;
    }
    function mkSub(txt) {
      const d = document.createElement('div');
      d.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--cgt-blue);margin:0 0 10px;';
      d.textContent = txt;
      return d;
    }
    function mkList(items) {
      const ul = document.createElement('ul');
      ul.style.cssText = 'margin:0 0 20px;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;';
      items.forEach(txt => {
        const li = document.createElement('li');
        li.style.cssText = 'display:flex;align-items:flex-start;gap:10px;font-size:13px;line-height:1.55;color:#333;';
        li.innerHTML = `<span style="color:var(--cgt-blue);flex-shrink:0;margin-top:1px;font-weight:700;">—</span><span>${txt}</span>`;
        ul.appendChild(li);
      });
      return ul;
    }
    function mkTip(html) {
      const d = document.createElement('div');
      d.style.cssText = 'background:#F0F6FF;border-left:3px solid var(--cgt-blue);border-radius:0 8px 8px 0;padding:12px 14px;margin-bottom:18px;font-size:13px;line-height:1.6;color:#1D3557;';
      d.innerHTML = html;
      return d;
    }
    function mkWarning(html) {
      const d = document.createElement('div');
      d.style.cssText = 'display:flex;align-items:flex-start;gap:10px;background:#FFF8F0;border-left:3px solid #E07A1A;border-radius:0 8px 8px 0;padding:12px 14px;font-size:13px;line-height:1.55;color:#7A3D00;';
      d.innerHTML = html;
      return d;
    }

    function renderTab() {
      // Update tab button styles
      tabBtns.forEach((btn, i) => {
        btn.style.opacity = i === activeTab ? '1' : '.65';
        btn.style.borderBottomColor = i === activeTab ? '#fff' : 'transparent';
      });
      body.innerHTML = '';

      if (activeTab === 1) {
        // Over deze tool
        body.appendChild(mkP('CGT Analyse Tool is een hulpmiddel voor CGT-opleidelingen en supervisoren bij het oefenen met het opstellen van een holistische theorie, functieanalyses en betekenisanalyses.'));
        body.appendChild(mkP('De tool is gratis te gebruiken voor iedereen. Commercieel doorverkopen of integreren in betaalde producten zonder toestemming is niet toegestaan.'));

        const contact = document.createElement('div');
        contact.style.cssText = 'margin:0 0 20px;';
        contact.innerHTML = `<span style="font-size:14px;line-height:1.65;color:#2a2a2a;">Feedback of vragen? Mail naar </span><a href="mailto:cgtanalyse@gmail.com" style="color:var(--cgt-blue);font-size:14px;text-decoration:none;border-bottom:1px solid var(--cgt-blue);">cgtanalyse@gmail.com</a>`;
        body.appendChild(contact);

        const copy = document.createElement('div');
        copy.style.cssText = 'font-size:13px;color:var(--muted);margin-top:8px;';
        copy.textContent = '© 2026 Rik Geres';
        body.appendChild(copy);

      } else {
        // Opslag & veiligheid (tab 0)
        body.appendChild(mkP('Alle analyses worden opgeslagen in de lokale opslag (localStorage) van je browser. Er is geen account, geen cloud en geen externe server — je gegevens verlaten je apparaat niet.'));
        body.appendChild(mkSub('Wat dit betekent in de praktijk'));
        body.appendChild(mkList([
          'Je analyses blijven beschikbaar zolang je dezelfde browser op hetzelfde apparaat gebruikt.',
          'Chrome en Safari delen je gegevens niet met elkaar.',
          'Als je je browsergeschiedenis of cookies wist, verdwijnen ook je opgeslagen analyses.',
          'Je analyses zijn niet beschikbaar op een ander apparaat.',
        ]));
        body.appendChild(mkTip(
          '<strong>Wil je je werk bewaren?</strong> Via de Kopieer-knop kun je de inhoud als afbeelding kopiëren en plakken in bijvoorbeeld Word of Pages. Of gebruik de Print-knop om een PDF op te slaan op je apparaat.' +
          '<br><br><strong>Tip voor iPad en mobiel:</strong> voeg de app toe aan je beginscherm voor de beste ervaring. Op iPad en iPhone: Safari → deelknop → "Zet op beginscherm". Op Android: Chrome → menu → "Toevoegen aan startscherm".' +
          '<br><br><strong>Let op:</strong> analyses opgeslagen via de app op je beginscherm zijn niet zichtbaar in je browser, en andersom. Sluit daarom de browser af als je de app op je apparaat hebt gezet, om verwarring te voorkomen.'
        ));

        body.appendChild(mkWarning('<span style="font-size:16px;flex-shrink:0;margin-right:10px;margin-top:1px;">⚠️</span><span>Vul geen direct herleidbare patiëntgegevens in.</span>'));
      }
    }

    renderTab();
    modal.appendChild(body);
    overlay.appendChild(modal);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  // Analyse-kaarten — één tegel per geregistreerd analyse-type
  const tools = analysisTypeList().map(t => ({
    key: t.type, label: t.label, sub: t.sub,
    color: 'var(--cgt-blue)', icon: t.icon, path: `/${t.route}/new`
  }));
  const grid = document.createElement('div');
  grid.style.cssText = 'display:flex;flex-direction:column;gap:10px;margin-bottom:24px';
  tools.forEach(t => {
    const btn = document.createElement('button');
    btn.style.cssText = `
      display:flex;align-items:center;gap:14px;width:100%;
      background:var(--surface);border:1.5px solid var(--border);border-radius:12px;
      padding:16px 18px;cursor:pointer;text-align:left;
      box-shadow:0 2px 6px rgba(0,0,0,.06);transition:box-shadow .15s,border-color .15s;
    `;
    btn.onmouseover = () => { btn.style.boxShadow='0 4px 14px rgba(74,110,138,.18)'; btn.style.borderColor='var(--cgt-blue)'; };
    btn.onmouseout  = () => { btn.style.boxShadow='0 2px 6px rgba(0,0,0,.06)'; btn.style.borderColor='var(--border)'; };
    btn.innerHTML = `
      <div style="width:44px;height:44px;border-radius:10px;background:var(--cgt-blue);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${t.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:16px;font-weight:700;color:var(--txt);margin-bottom:2px">${t.label}</div>
        <div style="font-size:12px;color:var(--muted)">${t.sub}</div>
      </div>
      <span style="font-size:20px;color:var(--muted)">›</span>`;
    btn.onclick = () => go(t.path);
    grid.appendChild(btn);
  });
  c.appendChild(grid);

  // Recente analyses
  const all = load();
  if (all.length) {
    const secHdr = document.createElement('div');
    secHdr.style.cssText = 'display:flex;align-items:center;margin-bottom:8px;';
    const secLbl = document.createElement('div');
    secLbl.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);flex:1;padding:0 2px';
    secLbl.textContent = 'Recente analyses';
    const delAllBtn = document.createElement('button');
    delAllBtn.textContent = 'Verwijder alle';
    delAllBtn.style.cssText = 'font-size:11px;color:var(--danger);background:none;border:none;cursor:pointer;padding:2px 4px;opacity:.7;';
    delAllBtn.addEventListener('mouseenter', () => delAllBtn.style.opacity = '1');
    delAllBtn.addEventListener('mouseleave', () => delAllBtn.style.opacity = '.7');
    delAllBtn.addEventListener('click', () => {
      if (confirm('Weet je zeker dat je alle analyses wilt verwijderen?')) {
        load().forEach(a => remove(a.id));
        const m = document.getElementById('main'); m.innerHTML=''; pgHome(m);
      }
    });
    secHdr.append(secLbl, delAllBtn);
    c.appendChild(secHdr);
    const card = document.createElement('div');
    card.className = 'card';

    // Groepeer analyses per groupId, bewaar volgorde (meest recent eerst)
    const seenGids = new Set();
    const gidsOrdered = [];
    all.slice().reverse().forEach(item => {
      const gid = item.groupId || item.id;
      if (!seenGids.has(gid)) { seenGids.add(gid); gidsOrdered.push(gid); }
    });
    const groupMap = {};
    all.forEach(item => {
      const gid = item.groupId || item.id;
      if (!groupMap[gid]) groupMap[gid] = [];
      groupMap[gid].push(item);
    });

    gidsOrdered.forEach(gid => {
      const members = groupMap[gid];
      const isMulti = members.length > 1;
      const el = document.createElement('div'); el.className = 'list-item';

      if (isMulti) {
        // Primaire analyse: diegene waarvan id === groupId
        const primary = members.find(m => m.id === gid) || members[0];
        const groupTitle = members.map(m=>m.title).filter(Boolean).join(', ');
        const types = [...new Set(members.map(m => m.type))].join(' + ');
        el.innerHTML = `
          <div class="badge badge-faba">FABA</div>
          <div class="item-info">
            <div class="item-title">${esc(groupTitle || '(Geen titel)')}</div>
            <div class="item-meta">${members.length} analyses · ${esc(types)}</div>
          </div>`;
        const delBtn = mkTrashBtn('item-del no-print', 'Verwijder FABA', e => {
          e.stopPropagation();
          if (confirm(`Verwijder deze FABA (${members.length} analyses)?`)) {
            members.forEach(m => remove(m.id));
            const mm=document.getElementById('main'); mm.innerHTML=''; pgHome(mm);
          }
        });
        el.appendChild(delBtn);
        el.onclick = () => {
          const route = (getAnalysisType(primary.type) || {}).route || 'ht';
          go(`/${route}/${primary.id}`);
        };
      } else {
        const item = members[0];
        const route = (getAnalysisType(item.type) || {}).route || 'ht';
        const meta = [item.client, item.date].filter(Boolean).join(' · ');
        const badgeCls = (getAnalysisType(item.type) || {}).badgeClass || 'badge-ht';
        el.innerHTML = `
          <div class="badge ${badgeCls}">${item.type}</div>
          <div class="item-info">
            <div class="item-title">${esc(item.title||'(Geen titel)')}</div>
            <div class="item-meta">${esc(meta)}</div>
          </div>`;
        const delBtn = mkTrashBtn('item-del no-print', 'Verwijder', e => {
          e.stopPropagation();
          if (confirm(`Verwijder deze ${item.type}?`)) { remove(item.id); const m=document.getElementById('main'); m.innerHTML=''; pgHome(m); }
        });
        el.appendChild(delBtn);
        el.onclick = () => go(`/${route}/${item.id}`);
      }

      card.appendChild(el);
    });
    c.appendChild(card);
  }
}


/* ══════════════════════════════════════════
   START
══════════════════════════════════════════ */
render();
