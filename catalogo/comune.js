/* L'INTESTAZIONE E IL PIEDE, IN UN POSTO SOLO.

   Erano scritti due volte: una in genera.js (vetrina e schede del pescato) e
   una in genera-catalogo.js (indice e cataloghi di linea). Finche' non si
   toccano due copie sembrano una cosa sola; al primo ritocco — una voce di
   menu in piu', un collegamento nel piede — divergono, e il sito si ritrova
   due intestazioni diverse a seconda di dove sei entrato.

   Qui ce n'e' una sola e la usano tutti e due.
*/

const WA = '393356654017';

/* Le icone del sito. Chi ne vuole una la chiede per nome invece di
   incollarsi il tracciato: le frecce erano gia' finite in tre file diversi */
const SIMBOLI = {
  wa: `<symbol id="ico-wa" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </symbol>`,
  arr: `<symbol id="ico-arr" viewBox="0 0 24 24">
        <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </symbol>`,
  /* Il pesce che sta al posto della fotografia quando la fotografia non c'e'
     ancora. Disegnato e non fotografato di proposito: un segno grafico non
     promette niente sul prodotto, mentre una foto d'archivio dichiara "ecco
     cosa vi arriva" e poi la cassa non le somiglia. */
  pesce: `<symbol id="ico-pesce" viewBox="0 0 64 40">
        <path d="M2 20c9-11 20-16 30-16s18 5 22 16c-4 11-12 16-22 16S11 31 2 20Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M54 20c3-4 6-6 8-7-1 4-1 10 0 14-2-1-5-3-8-7Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
        <circle cx="18" cy="17" r="1.8" fill="currentColor"/>
        <path d="M30 8c2 4 3 8 3 12s-1 8-3 12" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity=".55"/>
      </symbol>`,
};

/* LE VOCI DEL MENU SONO QUELLE DELLA HOME, nello stesso ordine.
   Nelle pagine del catalogo "Prodotti" e' la voce accesa; nelle pagine di
   zona (cartella consegna/) e' un collegamento come gli altri, perche' non e'
   la pagina in cui ci si trova. `su` e' la strada per tornare alla radice. */
function menu(su, cartella = 'catalogo') {
  const prodotti = cartella === 'catalogo'
    ? `<span class="nav-qui" aria-current="page">Prodotti</span>`
    : `<a href="${su}catalogo/prodotti.html">Prodotti</a>`;
  return `      <nav id="main-nav">
        ${prodotti}
        <a href="${su}index.html#processo">Come Lavoriamo</a>
        <a href="${su}index.html#azienda">Azienda</a>
        <a href="${su}index.html#gallery">Gallery</a>
        <a href="${su}index.html#marina">Marina AI</a>
        <a href="${su}domande-frequenti.html">Domande</a>
        <a href="${su}index.html#contatti">Contatti</a>
        <a href="https://wa.me/${WA}?text=Ciao%20Marina!" target="_blank" rel="noopener noreferrer" class="nav-wa">Ordina ora</a>
      </nav>`;
}

/* LA DESCRIPTION HA UNA MISURA, ed e' ~155 caratteri: oltre, Google la
   tronca a meta' frase e lo snippet si legge come trascuratezza. Si prendono
   frasi intere finche' ci stanno; se gia' la prima sfora (la scheda scampi
   era arrivata a 267), si taglia all'ultimo spazio utile con i puntini —
   meglio una frase sospesa per mano nostra che mozzata da Google. */
function descrizioneBreve(testo) {
  const MAX = 155;
  if (testo.length <= MAX) return testo;
  const frasi = testo.split(/(?<=[.!?])\s+/);
  let d = '';
  for (const f of frasi) {
    if (d && (d + ' ' + f).length > MAX) break;
    d = d ? d + ' ' + f : f;
  }
  if (d.length <= MAX) return d;
  return d.slice(0, d.lastIndexOf(' ', MAX - 2)) + '…';
}

/* opts.css        fogli aggiuntivi, relativi alla cartella della pagina
   opts.simboli    quali icone servono ('wa', 'arr')
   opts.su         strada per la radice del sito (default: un livello)
   opts.pagina     nome del file, per il canonical assoluto
   opts.descrizione la riga che Google mostra sotto il titolo nei risultati
   opts.immagine   percorso (relativo alla cartella catalogo) dell'anteprima
                   Open Graph: e' quella che WhatsApp mostra quando si
                   condivide il link, e qui la richiesta su WhatsApp E' la
                   conversione — un link senza foto vende meno
   opts.jsonld     array di oggetti schema.org, serializzati in un blocco

   Il canonical punta SEMPRE a del-mar.it anche se la pagina gira sul mirror
   GitHub Pages: il mirror e' pubblico e senza questo Google puo' indicizzare
   la copia sbagliata come contenuto duplicato. */
function testa(titolo, opts = {}) {
  const su = opts.su || '../';
  const css = opts.css || [];
  /* La cartella entra nel canonical e nell'og:url: il default e' catalogo,
     le pagine di zona passano 'consegna' */
  const cartella = opts.cartella || 'catalogo';
  const simboli = (opts.simboli || ['wa']).map((k) => SIMBOLI[k]).join('\n      ');
  const urlAssoluto = opts.pagina ? `https://del-mar.it/${cartella}/${opts.pagina}` : '';
  const canonical = urlAssoluto
    ? `\n    <link rel="canonical" href="${urlAssoluto}" />`
    : '';
  const descPulita = opts.descrizione ? descrizioneBreve(opts.descrizione).replace(/"/g, '&quot;') : '';
  const descrizione = descPulita
    ? `\n    <meta name="description" content="${descPulita}" />`
    : '';

  /* Open Graph solo se la pagina ha indirizzo e immagine: un blocco a meta'
     e' peggio di nessun blocco */
  const titoloPulito = titolo.replace(/"/g, '&quot;');
  const og = (urlAssoluto && opts.immagine)
    ? `
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${urlAssoluto}" />
    <meta property="og:title" content="${titoloPulito} — DelMar" />
    <meta property="og:description" content="${descPulita}" />
    <meta property="og:image" content="https://del-mar.it/catalogo/${opts.immagine}" />
    <meta property="og:locale" content="it_IT" />
    <meta property="og:site_name" content="DelMar" />
    <meta name="twitter:card" content="summary_large_image" />`
    : '';

  const jsonld = (opts.jsonld && opts.jsonld.length)
    ? `\n    <script type="application/ld+json">\n    ${JSON.stringify(opts.jsonld.length === 1 ? opts.jsonld[0] : opts.jsonld)}\n    </script>`
    : '';

  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${titolo} — DelMar</title>${descrizione}${canonical}${og}${jsonld}
    <link rel="stylesheet" href="${su}css/poppins.css?v=1" />
    <link rel="stylesheet" href="${su}css/style.css?v=102" />
    <!-- L'indice appeso e le righe degli argomenti sono GIA' nel sito, sulla
         pagina delle domande frequenti. Si carica quel foglio invece di
         ridisegnarli: due copie della stessa cosa divergono al primo ritocco -->
    <link rel="stylesheet" href="${su}css/domande-frequenti.css?v=7" />
    <link rel="stylesheet" href="${cartella === 'catalogo' ? '' : '../catalogo/'}css/d.css?v=2" />
${css.map((f) => `    <link rel="stylesheet" href="css/${f}?v=2" />`).join('\n')}
  </head>
  <body class="pr-pagina">
    <svg xmlns="http://www.w3.org/2000/svg" class="svg-sprite" aria-hidden="true">
      ${simboli}
    </svg>

    <header id="hdr">
      <a href="${su}index.html"><img src="${su}assets/logo.png?v=2" alt="DelMar" class="logo" /></a>
${menu(su, cartella)}
      <button class="hamburger" id="hamburger" aria-label="Apri menu" aria-expanded="false" aria-controls="main-nav"><span></span><span></span><span></span></button>
    </header>
`;
}

/* Il piede delle pagine prodotto e' piu' corto di quello della home — li' ci
   sono quattro colonne, qui basta la carta d'identita' dell'azienda. Ma i
   due collegamenti di servizio ci vogliono: la privacy perche' deve stare su
   OGNI pagina, e le domande frequenti perche' sono la risposta a chi sta per
   scrivere e ha ancora un dubbio. */
function piede(script, opts = {}) {
  const su = opts.su || '../';
  /* Dalle pagine di zona il catalogo sta in un'altra cartella: il prefisso
     lo dice chi chiama ('../catalogo/'), per quelle del catalogo e' vuoto */
  const cat = opts.cat || '';

  return `
    <footer class="pr-piede">
      <div class="pr-piede-in">
        <img src="${su}assets/logo.png?v=2" alt="DelMar" class="pr-piede-logo" />
        <p class="pr-piede-dati">
          LE DELIZIE DEL MARE S.R.L. — Via Dorsale 13, 54100 Massa (MS)<br />
          P.IVA 01081190454 — <a href="mailto:info@del-mar.it">info@del-mar.it</a>
        </p>
        <p class="pr-piede-link">
          <a href="${cat}prodotti.html">Catalogo prodotti</a>
          <a href="${su}domande-frequenti.html">Domande frequenti</a>
          <a href="${su}privacy.html">Privacy e cookie</a>
          <a href="${cat}crediti.html">Crediti fotografici</a>
        </p>
      </div>
    </footer>

${script.map((f) => `    <script src="${f}"></script>`).join('\n')}
  </body>
</html>
`;
}

/* GLI ALTRI CATALOGHI, in fondo a ogni pagina prodotto.
   Sta qui e non in genera-catalogo.js perche' serve anche alla vetrina del
   pescato, che e' generata dall'altro script: e' il pezzo che tiene insieme
   il percorso, e non deve esistere in due versioni che si scordano una
   categoria a testa.

   Sono le stesse pillole della barra appesa. Chi arriva in fondo sa gia'
   cos'e' un catalogo — e' passato dall'indice — quindi non gli servono le
   descrizioni, gli serve un bersaglio da cliccare. */
function altriCataloghi(corrente) {
  const fs = require('fs');
  const path = require('path');
  const dati = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalogo.json'), 'utf8'));

  const tutti = [
    { slug: 'pescato-arcipelago-toscano', nome: 'Pescato dell\'Arcipelago Toscano' },
    ...dati.cataloghi.map((c) => ({ slug: c.slug, nome: c.nome })),
  ].filter((c) => c.slug !== corrente);

  return `    <section class="ct-altri">
      <h2>Gli altri cataloghi</h2>
      <div class="fq-indice ct-altri-pillole" role="navigation" aria-label="Gli altri cataloghi">
${tutti.map((c) => `        <a href="${c.slug}.html">${c.nome}</a>`).join('\n')}
      </div>
    </section>`;
}

/* SUL TELEFONO RESTA LA PRIMA FRASE.

   Una pagina di catalogo su schermo stretto sono una settantina di righe di
   testo prima ancora dei titoli, e quaranta se ne vanno nelle descrizioni dei
   prodotti. Ma quei testi sono scritti tutti allo stesso modo — il fatto che
   identifica il prodotto, poi l'elaborazione — perche' e' cosi' che si
   scrivono le schede:

     "Arborea e Scardovari le italiane di riferimento, La Spezia la locale.
      Le sbissate arrivano gia' pulite: sono venti minuti di cucina in meno."

   La prima frase regge da sola. Quindi non si riscrive niente e non si
   duplica niente: si spezza dove finisce la prima frase e il resto va in uno
   <span> che sotto i 768 px sparisce. Il testo resta nel documento — Google
   lo legge, chi ingrandisce lo trova — semplicemente non occupa lo schermo di
   chi sta scorrendo un elenco col pollice. (Mattias, 2026-08-17)

   Il taglio e' su ". " seguito da una maiuscola: cosi' "0,9/1,3 kg" e
   "n. 3" non vengono scambiati per fine frase. Se la coda e' cortissima non
   si taglia — nascondere quattro parole non vale un tag in piu'. */
function primaFrase(testo) {
  const m = testo.match(/^(.+?[.:!?])\s+(?=[A-ZÈÉÀÌÒÙ])(.+)$/s);
  if (!m || m[2].length < 25) return testo;
  return `${m[1]} <span class="solo-largo">${m[2]}</span>`;
}

/* IL FILO DI BRICIOLE PER GOOGLE, dalla stessa lista che disegna quelle
   visibili: la regola imparata con le FAQ e' che markup e pagina devono dire
   la stessa identica cosa, altrimenti Google ignora tutto il blocco.
   `voci` e' un array di [nome, urlAssoluto]. */
function briciole(voci) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: voci.map(([nome, url], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: nome,
      item: url,
    })),
  };
}

module.exports = { WA, SIMBOLI, testa, piede, altriCataloghi, primaFrase, descrizioneBreve, briciole };
