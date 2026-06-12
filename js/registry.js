/* ══════════════════════════════════════════════════════════════
   ANALYSE-TYPE REGISTER
   Centrale plek waar elk analyse-type zich registreert.
   Een nieuw type toevoegen = één registerAnalysisType()-aanroep
   onderaan een eigen module; router, homepagina, groepsbalk en
   preview-overlay pikken het automatisch op.

   Velden per registratie:
   type         — waarde van item.type in opslag ('FA', 'BA', 'HT', …)
   route        — hash-segment ('fa' → #/fa/:id)
   label        — volledige naam ('Functieanalyse')
   sub          — ondertitel op de homepagina-tegel
   icon         — emoji voor de homepagina-tegel
   badgeClass   — CSS-klasse voor het badge-blokje in recente analyses
   buildPage    — functie (container, id) die de pagina opbouwt
   groupable    — true als het type via de +knop aan een FABA-groep
                  kan worden toegevoegd
   defaultData  — functie () → lege type-specifieke velden
                  (zonder id/groupId/title/client/date/theme — die
                  vult de aanroeper aan); alleen nodig bij groupable
   buildInline  — functie (container, d, onSave) die het schema
                  inline rendert in de groepsbalk; alleen bij groupable
   buildPreviewBlock — functie (d) → canvas-element voor de
                  preview-overlay; alleen bij groupable
══════════════════════════════════════════════════════════════ */
const ANALYSIS_TYPES = {};

function registerAnalysisType(def) { ANALYSIS_TYPES[def.type] = def; }

function getAnalysisType(type) { return ANALYSIS_TYPES[type]; }

function analysisTypeByRoute(route) {
  return Object.values(ANALYSIS_TYPES).find(t => t.route === route);
}

function analysisTypeList() { return Object.values(ANALYSIS_TYPES); }
