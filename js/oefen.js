/* ══════════════════════════════════════════════════════════════
   OEFENEN — GESPREK MET EEN AI-OEFENPATIËNT
   pgOefen()        — pagina-opbouw (laden/aanmaken oefensessie)
   buildOefenChat() — chatvenster met invoer en verzenden
   De persona's (casusopzet) staan server-side in api/chat.js;
   de browser stuurt alleen het gesprek en krijgt de reactie
   van de oefenpatiënt terug. Het gesprek zelf wordt lokaal
   opgeslagen in localStorage, net als de analyses.
══════════════════════════════════════════════════════════════ */

const OEFEN_CASES = {
  paniek: { label: 'Paniekklachten', intro:
    'Je gaat zo in gesprek met Sandra, een oefenpatiënt die is doorverwezen ' +
    'door de huisarts. Voer het gesprek zoals je dat in de behandelkamer zou ' +
    'doen: stel je voor, vraag door, en verzamel wat je nodig hebt om straks ' +
    'een FA, BA of holistische theorie op te stellen. Jij opent het gesprek.' }
};

function pgOefen(c, id) {
  const isNew = id === 'new';
  const newId = uid();
  let d = isNew ? {
    id: newId, type: 'OEFEN', title: '', client: '', date: today(),
    groupId: newId, theme: 'blauw',
    persona: 'paniek',
    messages: []
  } : byId(id);

  if (!d) { c.innerHTML = '<p style="padding:20px">Niet gevonden.</p>'; return; }
  if (isNew) upsert(d);

  const save = extra => { if (extra) Object.assign(d, extra); upsert(d); };
  const cas = OEFEN_CASES[d.persona] || OEFEN_CASES.paniek;

  /* ── Actiebalk ── */
  const bar = document.createElement('div');
  bar.className = 'action-bar no-print';
  const btnReset = mkBtn('btn-ghost btn-sm', '↺ Opnieuw beginnen', () => {
    if (!d.messages.length) return;
    if (confirm('Gesprek wissen en opnieuw beginnen?')) {
      save({ messages: [] });
      const m = document.getElementById('main'); m.innerHTML = ''; pgOefen(m, d.id);
    }
  });
  const btnDel = mkTrashBtn('btn btn-sm btn-ghost', 'Verwijder oefensessie', () => {
    if (confirm('Verwijder deze oefensessie?')) { remove(d.id); go('/'); }
  });
  btnDel.style.color = 'var(--danger)';
  bar.append(btnReset, btnDel);
  c.appendChild(bar);

  /* ── Titelregel ── */
  if (!d.title) d.title = `Oefengesprek: ${cas.label.toLowerCase()}`;
  c.appendChild(mkTitleRow(d, save, 'OEFENEN'));

  /* ── Introductie + privacymelding ── */
  const intro = document.createElement('div');
  intro.className = 'card no-print';
  intro.style.cssText = 'padding:14px 16px;margin:8px 0 12px;';
  intro.innerHTML = `
    <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--cgt-blue);margin-bottom:6px">Oefencasus: ${esc(cas.label)}</div>
    <p style="font-size:13px;line-height:1.6;color:#333;margin:0 0 10px">${esc(cas.intro)}</p>
    <p style="font-size:12px;line-height:1.5;color:#7A3D00;background:#FFF8F0;border-left:3px solid #E07A1A;border-radius:0 6px 6px 0;padding:8px 10px;margin:0">
      Dit gesprek wordt naar een AI-dienst gestuurd om de oefenpatiënt te laten reageren.
      De oefenpatiënt is fictief — vul geen echte cliëntgegevens in.</p>`;
  c.appendChild(intro);

  /* ── Chat ── */
  buildOefenChat(c, d, save);

  /* ── Analyses bij deze casus ── */
  buildOefenAnalyses(c, d);
}

/* Toont de analyses die aan deze oefensessie zijn gekoppeld (via oefenId)
   en knoppen om er een aan te maken. De koppeling is straks ook de basis
   voor de feedbackfunctie: gesprek + analyses horen aantoonbaar bij elkaar. */
function buildOefenAnalyses(c, d) {
  const wrap = document.createElement('div');
  wrap.className = 'no-print';
  wrap.style.cssText = 'margin-top:16px;';

  const lbl = document.createElement('div');
  lbl.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;padding:0 2px;';
  lbl.textContent = 'Jouw analyses bij deze casus';
  wrap.appendChild(lbl);

  const card = document.createElement('div');
  card.className = 'card';

  const linked = load().filter(a => a.oefenId === d.id);
  linked.forEach(item => {
    const t = getAnalysisType(item.type) || {};
    const el = document.createElement('div');
    el.className = 'list-item';
    el.innerHTML = `
      <div class="badge ${t.badgeClass || 'badge-ht'}">${esc(item.type)}</div>
      <div class="item-info">
        <div class="item-title">${esc(item.title || '(Geen titel)')}</div>
        <div class="item-meta">${esc(item.date || '')}</div>
      </div>`;
    el.onclick = () => go(`/${t.route}/${item.id}`);
    card.appendChild(el);
  });
  if (!linked.length) {
    const p = document.createElement('div');
    p.style.cssText = 'padding:12px 14px;font-size:13px;color:var(--muted);font-style:italic;';
    p.textContent = 'Nog geen analyses. Maak er een zodra je genoeg uit het gesprek hebt gehaald.';
    card.appendChild(p);
  }

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;padding:10px 14px;border-top:1px solid var(--border);';
  analysisTypeList().filter(t => t.type !== 'OEFEN').forEach(t => {
    const b = mkBtn('btn-ghost btn-sm', `+ ${t.label}`, () => {
      const nid = uid();
      upsert({
        id: nid, type: t.type, title: '', client: '', date: today(),
        groupId: nid, theme: 'blauw',
        oefenId: d.id,
        ...(t.defaultData ? t.defaultData() : {})
      });
      go(`/${t.route}/${nid}`);
    });
    btnRow.appendChild(b);
  });
  card.appendChild(btnRow);

  wrap.appendChild(card);
  c.appendChild(wrap);
}

function buildOefenChat(c, d, save) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;';

  /* Berichtenlijst */
  const list = document.createElement('div');
  list.className = 'oefen-chat';
  card.appendChild(list);

  /* Invoerbalk */
  const inputRow = document.createElement('div');
  inputRow.style.cssText = 'display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--border);background:var(--surface);align-items:flex-end;';
  const ta = document.createElement('textarea');
  ta.placeholder = 'Typ of spreek wat je tegen de patiënt zegt…';
  ta.rows = 1;
  ta.style.cssText = 'flex:1;resize:none;min-height:40px;max-height:120px;font-size:14px;';
  const sendBtn = mkBtn('btn-fa btn-sm', 'Verstuur', () => send());
  sendBtn.style.flexShrink = '0';
  inputRow.appendChild(ta);

  /* Microfoon: spraak naar tekst via de browser (Web Speech API).
     Knop verschijnt alleen in browsers die het ondersteunen (Chrome,
     Edge, Safari — niet Firefox). De tekst komt in het invoerveld
     zodat je hem kunt nalezen en corrigeren vóór het versturen. */
  let stopRec = () => {};
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    const micBtn = mkBtn('btn-ghost btn-sm', '🎤', () => toggleRec());
    micBtn.title = 'Spreek je bericht in (klik nogmaals om te stoppen)';
    micBtn.style.flexShrink = '0';
    let rec = null;
    stopRec = () => { if (rec) { try { rec.stop(); } catch {} } };
    function toggleRec() {
      if (rec) { stopRec(); return; }
      rec = new SR();
      rec.lang = 'nl-NL';
      rec.continuous = true;
      rec.interimResults = true;
      const baseTxt = ta.value ? ta.value.replace(/\s+$/, '') + ' ' : '';
      rec.onresult = e => {
        let txt = '';
        for (const r of e.results) txt += r[0].transcript;
        ta.value = baseTxt + txt;
      };
      rec.onerror = e => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          toast('Geef de browser toegang tot je microfoon om te kunnen inspreken', 4000);
        } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
          toast('Inspreken lukte niet — typ je bericht', 3000);
        }
      };
      rec.onend = () => { rec = null; micBtn.classList.remove('oefen-mic-aan'); ta.focus(); };
      micBtn.classList.add('oefen-mic-aan');
      try { rec.start(); }
      catch { rec = null; micBtn.classList.remove('oefen-mic-aan'); }
    }
    inputRow.appendChild(micBtn);
  }

  inputRow.appendChild(sendBtn);
  card.appendChild(inputRow);
  c.appendChild(card);

  let busy = false;

  function bubble(role, text) {
    const b = document.createElement('div');
    b.className = 'oefen-bub ' + (role === 'user' ? 'oefen-bub-u' : 'oefen-bub-p');
    b.textContent = text;
    return b;
  }

  function render() {
    list.innerHTML = '';
    if (!d.messages.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;color:var(--muted);font-size:13px;font-style:italic;padding:24px 12px;';
      empty.textContent = 'De patiënt zit in de wachtkamer. Open het gesprek.';
      list.appendChild(empty);
    }
    d.messages.forEach(m => list.appendChild(bubble(m.role, m.content)));
    if (busy) {
      const t = document.createElement('div');
      t.className = 'oefen-bub oefen-bub-p oefen-typing';
      t.textContent = '…';
      list.appendChild(t);
    }
    list.scrollTop = list.scrollHeight;
  }

  async function send() {
    stopRec();
    const txt = ta.value.trim();
    if (!txt || busy) return;
    ta.value = '';
    d.messages.push({ role: 'user', content: txt });
    save();
    busy = true; sendBtn.disabled = true;
    render();
    try {
      const reply = await askPatient(d);
      d.messages.push({ role: 'assistant', content: reply });
      save();
    } catch (e) {
      // Bericht van gebruiker blijft staan; die kan opnieuw versturen via een nieuwe poging
      toast(e.message || 'Er ging iets mis — probeer opnieuw', 4000);
    } finally {
      busy = false; sendBtn.disabled = false;
      render();
      ta.focus();
    }
  }

  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

  render();
}

/* Roept de serverfunctie aan; vraagt zo nodig eenmalig om de toegangscode */
async function askPatient(d, _retried) {
  const body = {
    persona: d.persona,
    messages: d.messages,
    code: localStorage.getItem('igcgt_oefen_code') || ''
  };
  let res;
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error('Geen verbinding — controleer je internet en probeer opnieuw');
  }
  if (res.status === 401 && !_retried) {
    const code = prompt('Voer de toegangscode in die je van je opleider hebt gekregen:');
    if (!code) throw new Error('Toegangscode nodig om te kunnen oefenen');
    localStorage.setItem('igcgt_oefen_code', code.trim());
    return askPatient(d, true);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) localStorage.removeItem('igcgt_oefen_code');
    throw new Error(data.error === 'code' ? 'Toegangscode onjuist' : (data.error || 'Er ging iets mis — probeer opnieuw'));
  }
  if (!data.reply) throw new Error('Leeg antwoord — probeer opnieuw');
  return data.reply;
}

/* ── Registratie in het analyse-type register ── */
registerAnalysisType({
  type: 'OEFEN',
  route: 'oefen',
  label: 'Oefenen met een casus',
  sub: 'gesprek met een AI-oefenpatiënt',
  icon: '🎭',
  badgeClass: 'badge-oefen',
  pageTitle: 'Oefensessie',
  groupable: false, // oefensessies maken geen deel uit van FABA-groepen
  buildPage: pgOefen
});
