/* Genera le schede delle specie da specie.json.
   Dodici pagine scritte a mano sarebbero dodici file da tenere allineati: qui
   il contenuto sta in un posto solo e l'impaginazione in un altro. E' anche la
   forma che avranno quando i dati arriveranno dal gestionale invece che da un
   file: cambia la sorgente, non il modello di pagina.

   Uso: node genera.js
*/
const fs = require('fs');
const path = require('path');
const { WA, testa, piede } = require('./comune');

const qui = __dirname;
const specie = JSON.parse(fs.readFileSync(path.join(qui, 'specie.json'), 'utf8'));

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

  return `${testa(s.nome + ' del giorno', { css: ['scheda.css'], simboli: ['wa'] })}
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
          <a href="https://wa.me/${WA}?text=${messaggio}" target="_blank" rel="noopener noreferrer" class="pr-btn pr-btn-wa">
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
${piede(['js/d.js?v=1', 'js/nastro.js?v=1', '../../js/cursore.js?v=2'])}`;
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
