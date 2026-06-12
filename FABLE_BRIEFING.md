# Briefing: CGT Analyse Tool — context voor AI-sessies

> **Status:** de refactoring die dit document oorspronkelijk beschreef is
> uitgevoerd (commits `4d0003a` en `9cc801d` op `dev`, juni 2026). De app is
> opgesplitst in modules onder `js/` met een analyse-type register. De
> architectuursectie hieronder beschrijft de actuele structuur.

## Wat is dit project?

Een **statische HTML-app** (`index.html` + modules onder `js/`, geen build-stap) voor cognitief gedragstherapeuten. De app laat gebruikers drie soorten analyses maken:

- **FA** — Functieanalyse (gedragsanalyse met SD, R, Sr-pos, Sr-neg, FNC)
- **BA** — Betekenisanalyse (schema-analyse met kernthema, archieven, bewijs, representaties)
- **HT** — Hoofd-Tijdlijn (visueel tijdlijnschema met kaarten)

Analyses kunnen worden **gegroepeerd** (FABA): meerdere FA's en BA's voor één casus, gekoppeld via een gedeelde `groupId`.

**Live op:** `cgtanalyse.nl` (Vercel, auto-deploy vanuit `main`-branch)  
**GitHub:** `https://github.com/rikgeres/fa-ba-igcgt`  
**Actieve branch:** `dev` (ontwikkeling), `main` (productie)

---

## Kritische constraints — NIET wijzigen

### 1. localStorage only — geen server
Alle data wordt opgeslagen in `localStorage` onder de sleutel `igcgt_v3`. Dit is een **privacyvereiste**: geen enkele analyse mag een server bereiken.

```js
const KEY    = 'igcgt_v3';
const load   = () => JSON.parse(localStorage.getItem(KEY) || '[]');
const dump   = d  => localStorage.setItem(KEY, JSON.stringify(d));
const upsert = item => { const all=load(); const i=all.findIndex(a=>a.id===item.id); if(i>=0) all[i]=item; else all.unshift(item); dump(all); };
const remove = id  => dump(load().filter(a => a.id !== id));
```

`upsert` voegt **nieuwe items toe aan het begin** van de array (`unshift`), bestaande worden in-place bijgewerkt.

### 2. Datastructuur (`igcgt_v3`)
Flat array van analyses. Elk item heeft minimaal:
```js
{ id, type, title, client, date, groupId, theme, groupOrder?, ... }
```
- `id` — unieke string (`uid()`)
- `groupId` — gelijk aan `id` van de primaire analyse in de groep
- `groupOrder` — array van id's die de volgorde van siblings bepaalt
- `theme` — naam van het kleurthema (bijv. `'blauw'`)

**WAARSCHUWING:** Veldnamen of structuur wijzigen breekt bestaande gebruikersdata. Migratie is vereist als je dit doet.

### 3. Geen bundler, geen framework
De app draait als statisch HTML-bestand. Geen npm, geen build-stap, geen React/Vue. Externe scripts worden geladen via CDN:
- `html2canvas` (canvas-naar-afbeelding)
- Google Fonts (Open Sans)

---

## Architectuur

`index.html` bevat alleen HTML + CSS + script-tags. De logica staat in modules onder `js/`, geladen als klassieke scripts in deze volgorde (gedeelde globale scope, geen ES-modules):

| Bestand | Inhoud |
|---|---|
| `js/storage.js` | localStorage CRUD (load/dump/byId/upsert/remove), uid, today, esc, escBr, toast, `_pendingGroup` |
| `js/registry.js` | analyse-type register: `registerAnalysisType`, `getAnalysisType`, `analysisTypeByRoute`, `analysisTypeList` |
| `js/themes.js` | THEMES, THEME_IDS, mkThemePicker |
| `js/ui.js` | opmaak-toolbar, printAs, openExpand, makeTa/makeCE, mkTitleRow, addFab, downloadImg, mkBtn, TRASH_SVG, mkTrashBtn |
| `js/fa.js` | pgFA, buildFA, FA-helpers + registratie van type 'FA' |
| `js/ba.js` | pgBA, buildBACfgBar, buildBACanvas, archiefkast-assets + registratie van type 'BA' |
| `js/ht.js` | pgHT, HT_INFO, buildHT, openHtFullscreen + registratie van type 'HT' |
| `js/groups.js` | buildPreviewOverlay, buildGroupBar (FABA-groepsbalk) |
| `js/router.js` | go, route, render, pgHome, startaanroep `render()` — laadt als laatste |

**Nieuw analyse-type toevoegen** (bv. een AI-module): schrijf één module met een `pgXX(container, id)`-paginafunctie en sluit af met een `registerAnalysisType({...})`-aanroep; voeg de script-tag toe in `index.html` vóór `js/router.js`. Router, homepagina-tegels, recente-analyses-badges, en (bij `groupable: true` met `defaultData`/`buildInline`/`buildPreviewBlock`) ook de FABA-groepsbalk en preview-overlay pikken het type automatisch op. Zie de veldbeschrijving bovenin `js/registry.js`.

Routing is hash-based (`#/fa/:id`, `#/ba/:id`, `#/ht/:id`), afgeleid van het `route`-veld in het register.

### Centrale functies

| Functie | Doel |
|---|---|
| `render()` | Router: leest `location.hash`, roept de juiste pagina-functie aan |
| `pgHome(c)` | Startpagina met recente analyses (gegroepeerd per `groupId`) |
| `pgFA(c, id)` | FA-pagina laden/aanmaken |
| `pgBA(c, id)` | BA-pagina laden/aanmaken |
| `pgHT(c, id)` | HT-pagina laden/aanmaken |
| `buildFA(c, d, save, _noGroup, ...)` | Rendert FA-schema. `_noGroup=true` = sibling-render (geen themakiezer, geen groepsbalk, geen FABA-badge) |
| `buildBACanvas(container, d, save, redraw)` | Rendert BA-canvas |
| `buildBACfgBar(bar, d, save, redraw)` | Rendert BA-configuratiebalk |
| `buildHT(c, d, save, redrawHT)` | Rendert HT-schema |
| `buildGroupBar(container, d)` | Rendert gekoppelde analyses (siblings) inline onder de huidige analyse |
| `mkTitleRow(d, save, typeLabel)` | Gedeelde titelregel (FA/BA/FABA/HT) |
| `buildPreviewOverlay(d)` | Print-preview overlay voor de hele groep |
| `mkThemePicker(d, onPick)` | Kleurthema-kiezer |
| `toast(msg, ms)` | Korte statusmelding onderaan het scherm |
| `downloadImg(blob, filename)` | PNG downloaden |
| `mkBtn / mkTrashBtn` | UI-helpers voor knoppen |

### FABA-groepering
- Elke analyse heeft een `groupId` (= `id` van de primaire analyse)
- Primaire analyse: `d.id === d.groupId`
- `buildGroupBar` toont alle siblings inline onder de primaire
- `pgHome` groepeert per `groupId`; groepen van >1 krijgen badge "FABA"
- Als `buildFA` detecteert dat er siblings zijn, verandert de badge van "FA" naar "FABA"

---

## Functies die eerder per ongeluk zijn verwijderd (BEWAAR DEZE)

Bij eerdere code-opruimingen zijn meerdere functies per ongeluk verwijderd. Dit zijn de kritische helpers die overal worden aangeroepen:

```js
// BEWAAR ALTIJD — staan in js/storage.js
const esc   = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const escBr = s => esc(s).replace(/\n/g,'<br>');
const toast = (msg, ms=2000) => { const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), ms); };
```

**Zonder `toast`:** elke knop die feedback geeft (kopieer, opslaan, ongedaan) crasht stil.  
**Zonder `esc`/`escBr`:** de startpagina crasht bij het renderen van recente analyses.

---

## Thema's
```js
const THEMES = { blauw: { fa: {...}, ba: {...}, ht: {...} }, ... }
```
FA en BA erven het thema van de bovenste (primaire) analyse. Siblings roepen `buildFA(..., true)` aan met `sibling.theme = d.theme` gezet.

---

## Kopieer-knop (clipboard)
```js
html2canvas(canvas, { backgroundColor, scale: 2, useCORS: true }).then(cvs => {
  cvs.toBlob(blob => {
    navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      .then(() => toast('Gekopieerd naar klembord ✓'))
      .catch(() => toast('Kopiëren mislukt — probeer opnieuw', 3000));
  });
});
```

---

## Werkwijze — BELANGRIJK

Werk uitsluitend op de **`dev`-branch**. De `main`-branch is productie; gebruikers werken daar nu op. Commit en push alle wijzigingen naar `dev`. Merge pas naar `main` als ik dat expliciet vraag.

```bash
git checkout dev   # altijd controleren voor je begint
```

---

## Uitgevoerde refactoring (juni 2026)

1. ✅ Code gesplitst in modules onder `js/` (zie Architectuur hierboven)
2. ✅ Registratie-mechanisme: `js/registry.js` met `registerAnalysisType()`; FA/BA/HT registreren zichzelf; alle hardcoded type-dispatches (router-switch, homepagina-tegels en -badges, plusmenu, inline sibling-render, preview-blokken, lege schema's) lopen via het register
3. ✅ Data-laag: alle `localStorage`-toegang loopt via `js/storage.js`

---

## Wat je NIET doet

- Werk alleen op de `dev`-branch, nooit direct op `main`
- Geen wijzigingen aan de `igcgt_v3` datastructuur of veldnamen (breekt bestaande gebruikersdata)
- Geen framework, geen bundler, geen npm — het blijft een statisch HTML-bestand
- Geen functionele wijzigingen — na de refactoring doet de app exact hetzelfde als ervoor
- Verwijder `esc`, `escBr` en `toast` niet — die zijn eerder per ongeluk verdwenen en hebben alles kapot gemaakt

---

## Niet aanraken / aandachtspunten

- `igcgt_v3` sleutel en de datastructuur (breekt bestaande gebruikersdata)
- `esc`, `escBr`, `toast` — overal nodig, niet verwijderen
- `upsert` gebruikt `unshift` voor nieuwe items — dit is bewust (meest recent bovenaan in localStorage)
- `buildFA` met `_noGroup=true` mag GEEN actie-bar of themakiezer toevoegen aan siblings — check dit na refactoring
- Kopieer-knop vereist user-gesture op het moment van `clipboard.write` — niet in een extra async laag inpakken
