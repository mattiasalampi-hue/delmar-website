/* Genera le schede delle specie da specie.json.
   Dodici pagine scritte a mano sarebbero dodici file da tenere allineati: qui
   il contenuto sta in un posto solo e l'impaginazione in un altro. E' anche la
   forma che avranno quando i dati arriveranno dal gestionale invece che da un
   file: cambia la sorgente, non il modello di pagina.

   Uso: node genera.js
*/
const fs = require('fs');
const path = require('path');

const qui = __dirname;
const specie = JSON.parse(fs.readFileSync(path.join(qui, 'specie.json'), 'utf8'));

const intestazione = (titolo) => `<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${titolo} all'ingrosso — DelMar</title>
    <meta name="robots" content="noindex" />
    <link rel="stylesheet" href="../../css/poppins.css?v=1" />
    <link rel="stylesheet" href="../../css/style.css?v=101" />
    <link rel="stylesheet" href="css/d.css?v=1" />
    <link rel="stylesheet" href="css/scheda.css?v=1" />
  </head>
  <body class="pr-pagina">
    <svg xmlns="http://www.w3.org/2000/svg" class="svg-sprite" aria-hidden="true">
      <symbol id="ico-wa" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </symbol>
    </svg>

    <header id="hdr">
      <a href="../../index.html"><img src="../../assets/logo.png?v=2" alt="DelMar" class="logo" /></a>
      <nav id="main-nav">
        <span class="nav-qui" aria-current="page">Prodotti</span>
        <a href="../../index.html#processo">Come Lavoriamo</a>
        <a href="../../index.html#azienda">Azienda</a>
        <a href="../../index.html#marina">Marina AI</a>
        <a href="../../domande-frequenti.html">Domande</a>
        <a href="../../index.html#contatti">Contatti</a>
        <a href="https://wa.me/393356654017?text=Ciao%20Marina!" target="_blank" rel="noopener noreferrer" class="nav-wa">Ordina ora</a>
      </nav>
      <button class="hamburger" id="hamburger" aria-label="Apri menu" aria-expanded="false" aria-controls="main-nav"><span></span><span></span><span></span></button>
    </header>
`;

const piede = `
    <footer class="pr-piede">
      <div class="pr-piede-in">
        <img src="../../assets/logo.png?v=2" alt="DelMar" class="pr-piede-logo" />
        <p class="pr-piede-dati">
          LE DELIZIE DEL MARE S.R.L. — Via Dorsale 13, 54100 Massa (MS)<br />
          P.IVA 01081190454 — <a href="mailto:info@del-mar.it">info@del-mar.it</a>
        </p>
      </div>
    </footer>

    <script src="js/d.js?v=1"></script>
    <script src="js/nastro.js?v=1"></script>
    <script src="../../js/cursore.js?v=2"></script>
  </body>
</html>
`;

/* Il nastro porta TUTTE le altre specie del giorno, non una selezione: chi e'
   arrivato in fondo sta guardando il banco e vuole vedere cos'altro c'e'. */
function nastro(corrente) {
  const altre = specie.filter((s) => s.slug !== corrente.slug);
  const voci = altre.map((s) => `        <a class="sc-altro" href="${s.slug}.html">
          ${s.foto
            ? `<img src="foto/${s.foto}" alt="${s.nome}" loading="lazy" />`
            : `<div class="sc-altro-vuoto"><span>${s.nome}</span></div>`}
          <span>${s.nome}</span>
        </a>`).join('\n');

  return `    <section class="sc-altri">
      <div class="sc-altri-testa">
        <h2>Anche oggi al banco</h2>
        <a href="d-sito.html" class="sc-tutti">Vedi tutto il pescato di oggi →</a>
      </div>

      <div class="sc-nastro-guscio">
        <button class="sc-freccia sc-freccia-sx" type="button" data-scorri="-1" aria-label="Indietro">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="sc-freccia sc-freccia-dx" type="button" data-scorri="1" aria-label="Avanti">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>

        <div class="sc-nastro" id="sc-nastro">
${voci}
        </div>
      </div>
    </section>`;
}

function scheda(s) {
  const paragrafi = s.descrizione.map((p) => `          <p>${p}</p>`).join('\n');
  const messaggio = encodeURIComponent(`Ciao, vorrei informazioni su ${s.nome.toLowerCase()} di oggi`);

  return `${intestazione(s.nome)}
    <!-- L'uscita resta appesa mentre si scorre: una scheda e' lunga, e la via
         di ritorno non deve stare solo in cima dove nessuno torna a cercarla -->
    <div class="sc-briciole">
      <div class="sc-briciole-in">
        <a class="sc-indietro" href="d-sito.html">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Tutto il pescato di oggi
        </a>
        <span class="sc-qui">${s.nome}</span>
      </div>
    </div>

    <main class="sc-pagina">
      <div class="sc-foto">
        ${s.foto
          ? `<img src="foto/${s.foto}" alt="Cassa di ${s.nome.toLowerCase()} fresco sul ghiaccio, pescato dell'Arcipelago Toscano" />
        <p class="sc-didascalia">La cassa di stanotte, fotografata al banco</p>`
          : `<div class="sc-foto-vuota"><span>${s.nome}</span></div>
        <p class="sc-didascalia">Sbarcato stanotte. La fotografia arriva col giro delle casse</p>`}
      </div>

      <div class="sc-testo">
        <p class="sc-stato sc-stato-si">Oggi al banco · ${s.taglia.toLowerCase()}</p>

        <h1>${s.nome}</h1>
        <p class="sc-scientifico"><em>${s.scientifico}</em> · Pescato dell'Arcipelago Toscano</p>

        <div class="sc-descrizione">
${paragrafi}
        </div>

        <dl class="sc-dettagli">
          <div><dt>Zona di pesca</dt><dd>${s.zona}</dd></div>
          <div><dt>Metodo</dt><dd>${s.metodo}</dd></div>
          <div><dt>Pezzature</dt><dd>${s.pezzature}</dd></div>
          <div><dt>Stagione migliore</dt><dd>${s.stagione}</dd></div>
          <div><dt>In cucina</dt><dd>${s.cucina}</dd></div>
          <div><dt>Conservazione</dt><dd>${s.conservazione}</dd></div>
        </dl>

        <div class="sc-azione">
          <a href="https://wa.me/393356654017?text=${messaggio}" target="_blank" rel="noopener noreferrer" class="pr-btn pr-btn-wa">
            <svg aria-hidden="true"><use href="#ico-wa"/></svg>
            Chiedi prezzo e disponibilità
          </a>
          <p class="sc-azione-nota">
            Il prezzo del pescato cambia ogni notte con l'asta: te lo diciamo su
            WhatsApp insieme a quanto ne è entrato.
          </p>
        </div>
      </div>
    </main>

${nastro(s)}
${piede}`;
}

/* La vetrina: le card diventano tutte collegamenti alle rispettive schede */
/* LA FOTO PUO' MANCARE, E NON E' UN ERRORE.
   Il buyer fotografa le casse mentre le smista a fine giornata, e ne
   fotografa quelle che fa in tempo a fotografare. Una specie sbarcata ma
   senza scatto e' la normalita', non un caso limite: se la card sparisse per
   questo, il sito direbbe che quel pesce non c'e' — e domattina al banco
   invece c'e'. Al posto della fotografia resta il riquadro col nome, che si
   legge come una scelta e non come un buco. (Mattias, 2026-08-17) */
function cornice(s) {
  return s.foto
    ? `<div class="pr-foto"><img src="foto/${s.foto}" alt="${s.nome}" loading="lazy" /></div>`
    : `<div class="pr-foto pr-foto-vuota"><span>${s.nome}</span></div>`;
}

function vetrinaCards() {
  return specie.map((s) => `        <a class="pr-card" href="${s.slug}.html">
          ${cornice(s)}
          <div class="pr-testo">
            <h2>${s.nome}</h2>
            <p class="pr-taglia">${s.taglia}</p>
          </div>
        </a>`).join('\n\n');
}

let scritte = 0;
specie.forEach((s) => {
  fs.writeFileSync(path.join(qui, `${s.slug}.html`), scheda(s));
  scritte++;
});

/* La griglia della vetrina si riscrive fra i due segnaposto, cosi' il resto
   della pagina (apertura, testo, chiusura) resta come l'abbiamo disegnata */
const vetrinaFile = path.join(qui, 'd-sito.html');
let vetrina = fs.readFileSync(vetrinaFile, 'utf8');
const apre = '<div class="pr-griglia">';
const chiude = '      </div>\n\n      <!-- Chiusura';
const i = vetrina.indexOf(apre);
const j = vetrina.indexOf(chiude);
if (i > -1 && j > -1) {
  vetrina = vetrina.slice(0, i + apre.length) + '\n' + vetrinaCards() + '\n' + vetrina.slice(j);
  fs.writeFileSync(vetrinaFile, vetrina);
  console.log('vetrina aggiornata con ' + specie.length + ' schede collegate');
} else {
  console.log('ATTENZIONE: segnaposto della griglia non trovati, vetrina non toccata');
}

console.log(scritte + ' schede generate');
