/* ══════════════════════════════════════════════════════════════
   THEMA'S & KLEUREN
   Beschikbare kleurthema's (blauw, groen, paars, oranje, rood).
   mkThemePicker bouwt de kiezer-UI.
══════════════════════════════════════════════════════════════ */
const THEMES = {
  blauw: { label:'Blauw',  swatch:'#2A76A2',
    ba:{ blu:'#2A76A2', lblu:'#DDEAF7', grn:'#2A76A2', lgrn:'#EBF5FB', osl:'#E8F4FA', osb:'#7AAEC4' },
    fa:{ dot:'#7A99B0', bg:'#E8EEF5' },
    ht:{ p:'#2A76A2', pl:'#CDDEEA', s:'#83B1C0' } },
  groen: { label:'Groen',  swatch:'#2A7A4A',
    ba:{ blu:'#2A7A4A', lblu:'#D4EEE0', grn:'#2A7A4A', lgrn:'#E8F7F0', osl:'#F2F6F0', osb:'#8AAA8A' },
    fa:{ dot:'#5A8A6A', bg:'#E8F5EE' },
    ht:{ p:'#2A7A4A', pl:'#C8E8D8', s:'#6AAB80' } },
  paars: { label:'Paars',  swatch:'#6B3FA0',
    ba:{ blu:'#6B3FA0', lblu:'#EDE0F8', grn:'#6B3FA0', lgrn:'#F5EEFF', osl:'#F5EEF8', osb:'#A880C8' },
    fa:{ dot:'#8A70B8', bg:'#F0EAF8' },
    ht:{ p:'#6B3FA0', pl:'#DDD0F0', s:'#9A70C8' } },
  warm:  { label:'Warm',   swatch:'#B85C38',
    ba:{ blu:'#B85C38', lblu:'#FAE5DC', grn:'#B85C38', lgrn:'#FDF2EE', osl:'#FAF0EC', osb:'#C89080' },
    fa:{ dot:'#C07050', bg:'#F8EDE8' },
    ht:{ p:'#B85C38', pl:'#F0D8CC', s:'#D4906A' } },
  amber: { label:'Amber',  swatch:'#A07830',
    ba:{ blu:'#A07830', lblu:'#FAF0D0', grn:'#A07830', lgrn:'#FDF8EC', osl:'#FAF5E0', osb:'#C0A858' },
    fa:{ dot:'#B89048', bg:'#F8F4E0' },
    ht:{ p:'#A07830', pl:'#EEE0B8', s:'#C8A850' } },
  grijs: { label:'Grijs',  swatch:'#5A6070',
    ba:{ blu:'#5A6070', lblu:'#E4E8EC', grn:'#5A6070', lgrn:'#F0F2F4', osl:'#EDEEF0', osb:'#8A9098' },
    fa:{ dot:'#7A808A', bg:'#EEEEEE' },
    ht:{ p:'#5A6070', pl:'#D0D4D8', s:'#8A9098' } },
  roze:  { label:'Roze',   swatch:'#C2457A',
    ba:{ blu:'#C2457A', lblu:'#FAE0ED', grn:'#C2457A', lgrn:'#FDF0F6', osl:'#FAF0F5', osb:'#D880A8' },
    fa:{ dot:'#C870A0', bg:'#F8E8F2' },
    ht:{ p:'#C2457A', pl:'#F0C8DC', s:'#D870A8' } },
};
const THEME_IDS = Object.keys(THEMES);

function mkThemePicker(d, onPick) {
  const row = document.createElement('div');
  row.className = 'no-print';
  row.style.cssText = 'display:flex;align-items:center;gap:5px;padding:6px 14px;border-bottom:1px solid #eee;background:#fafafa;flex-wrap:wrap;';
  const lbl = document.createElement('span');
  lbl.textContent = 'Kleur:';
  lbl.style.cssText = 'font-size:11px;color:#999;flex-shrink:0;';
  row.appendChild(lbl);
  THEME_IDS.forEach(id => {
    const t = THEMES[id];
    const btn = document.createElement('button');
    const active = (d.theme || 'blauw') === id;
    btn.title = t.label;
    btn.style.cssText = `width:18px;height:18px;border-radius:50%;background:${t.swatch};border:${active ? '2.5px solid #333' : '2px solid transparent'};cursor:pointer;flex-shrink:0;outline:2px solid ${active ? t.swatch : 'transparent'};outline-offset:1px;`;
    btn.addEventListener('click', () => { onPick(id); });
    row.appendChild(btn);
  });
  return row;
}

