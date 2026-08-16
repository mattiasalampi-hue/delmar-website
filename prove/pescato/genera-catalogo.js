/* Genera l'indice dei prodotti e i cataloghi di linea da catalogo.json.
   Stessa scelta di genera.js: il contenuto sta in un posto solo, l'impaginazione
   in un altro. Quando i dati arriveranno da /api/vetrina.json cambia la
   sorgente, non il modello di pagina.

   Uso: node genera-catalogo.js
*/
const fs = require('fs');
const path = require('path');

const qui = __dirname;
const dati = JSON.parse(fs.readFileSync(path.join(qui, 'catalogo.json'), 'utf8'));
const cataloghi = dati.cataloghi;

const { WA, testa, piede, altriCataloghi, primaFrase } = require('./comune');

/* Il pescato non sta in catalogo.json perche' non e' un catalogo di linea: e'
   la pagina che cambia ogni notte. Ma nell'indice deve stare per primo, ed e'
   la ragione per cui qualcuno arriva qui. */
const PESCATO = {
  slug: 'd-sito',
  nome: 'Pescato dell\'Arcipelago Toscano',
  riga: 'Cambia ogni notte · aggiornato dopo le 20',
  foto: 'foto/foto-4.jpg',
  sotto: 'Quello che le barche hanno preso stanotte, fotografato al banco. Quando è finito, è finito.',
};

function chiusura(occhiello, titolo, testo) {
  return `      <section class="pr-chiusura">
        <p class="pr-chiusura-occhiello">${occhiello}</p>
        <h2>${titolo}</h2>
        <p class="pr-chiusura-testo">${testo}</p>
        <div class="pr-chiusura-azioni">
          <a href="https://wa.me/${WA}?text=Ciao%2C%20vorrei%20informazioni%20sui%20vostri%20prodotti" target="_blank" rel="noopener noreferrer" class="pr-btn pr-btn-wa">
            <svg aria-hidden="true"><use href="#ico-wa"/></svg>
            Scrivici su WhatsApp
          </a>
        </div>
        <p class="pr-chiusura-tel">Rispondiamo tutti i giorni, festivi compresi</p>
      </section>`;
}

/* L'ancora si ricava dal nome: "Baccalà e merluzzo" -> "baccala-e-merluzzo".
   Il filtro per codice invece della classe di caratteri: scritta coi
   diacritici veri, la classe mangiava la lettera accentata */
function senzaAccenti(s) {
  return s.normalize('NFD').split('').filter((ch) => {
    const c = ch.charCodeAt(0);
    return c < 0x0300 || c > 0x036f;
  }).join('');
}

const idFam = (n) => senzaAccenti(n.toLowerCase())
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function voce(v) {
  const righe = [];

  if (v.pezzature && v.pezzature.length) {
    righe.push(`            <div class="ct-riga">
              <span class="ct-et">Pezzature</span>
              <div class="ct-valori">${v.pezzature.map((p) => `<span class="ct-chip">${p}</span>`).join('')}</div>
            </div>`);
  }
  if (v.provenienze && v.provenienze.length) {
    righe.push(`            <div class="ct-riga">
              <span class="ct-et">Provenienza</span>
              <div class="ct-valori">${v.provenienze.map((p) => `<span class="ct-chip ct-chip-prov">${p}</span>`).join('')}</div>
            </div>`);
  }
  if (v.formato) {
    righe.push(`            <div class="ct-riga">
              <span class="ct-et">Formato</span>
              <p class="ct-formato">${v.formato}</p>
            </div>`);
  }

  const msg = encodeURIComponent(`Ciao, vorrei sapere disponibilità e prezzo di: ${v.nome}`);

  /* La foto puo' mancare: la voce resta valida e il testo si prende tutta la
     larghezza. Un riquadro grigio col nome dentro sarebbe peggio del niente —
     dichiara un buco invece di non farsi notare */
  const foto = v.foto
    ? `            <div class="ct-voce-foto">
              <img src="${v.foto}" alt="${v.nome}" loading="lazy" />
            </div>\n`
    : '';

  return `          <article class="ct-voce${v.foto ? '' : ' ct-voce-nuda'}">
${foto}            <div class="ct-voce-testo">
              <h3>${v.nome}</h3>
              <p class="ct-voce-sotto">${primaFrase(v.sotto)}</p>
${righe.join('\n')}
              <a class="ct-chiedi" href="https://wa.me/${WA}?text=${msg}" target="_blank" rel="noopener noreferrer">
                <svg aria-hidden="true"><use href="#ico-wa"/></svg>
                <span>Chiedi disponibilità e prezzo</span>
              </a>
            </div>
          </article>`;
}

function famiglia(f, i) {
  const n = f.voci.length;
  /* Lo stesso numero della riga in cima, con la stessa classe: e' il filo che
     lega il selettore alla sezione, e dice a chi sta leggendo a che punto e'
     dei sei blocchi senza doverli contare */
  return `      <section class="ct-famiglia" id="${idFam(f.nome)}">
        <div class="ct-fam-testa">
          <span class="fq-arg-n">${String(i + 1).padStart(2, '0')}</span>
          <h2>${f.nome}</h2>
          <p class="ct-fam-sotto">${primaFrase(f.sotto)}</p>
          <p class="ct-fam-conta">${n} ${n === 1 ? 'voce' : 'voci'}</p>
        </div>

        <div class="ct-voci">
${f.voci.map(voce).join('\n\n')}
        </div>
      </section>`;
}

function catalogo(c) {
  /* LA STESSA APERTURA DEL PESCATO, non una diversa.
     Avevo dato ai cataloghi di linea un'apertura fotografica — il magazzino,
     le vasche — ragionando che fossero pagine di natura diversa. Sbagliato:
     chi passa dal pescato a un catalogo si accorge del cambio di grammatica e
     legge "altro sito", non "altra sezione". Le campiture e i pesci sono la
     firma dell'intestazione di del-mar.it, e valgono per tutte le pagine
     prodotto. (Mattias, 2026-08-16) */
  const hero = `    <section class="pr-hero">
      <canvas id="pr-sfondo"></canvas>
      <canvas id="pr-pesci"></canvas>
      <div class="pr-hero-in">
        <p class="pr-occhiello">${c.occhiello}</p>
        <h1 class="pr-titolo">${c.titolo}<br /><em>${c.sottotitolo}</em></h1>
        <p class="pr-sotto">${c.sotto}</p>
      </div>
    </section>`;

  /* La barra e' quella delle domande frequenti, classe per classe: pillole
     con il bordo, quella corrente riempita di blu, e il filo
     dell'avanzamento sul bordo inferiore. Prima erano parole grigie in fila,
     che non si leggevano e non sembravano nemmeno cliccabili. */
  const barra = `    <div class="fq-barra">
      <div class="fq-avanzamento"><span id="fq-avanza"></span></div>
      <div class="fq-barra-in">
        <a class="ct-torna" href="prodotti.html">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Cataloghi
        </a>
        <div class="fq-indice" role="navigation" aria-label="Famiglie del catalogo">
${c.famiglie.map((f) => `          <a href="#${idFam(f.nome)}">${f.nome}</a>`).join('\n')}
        </div>
      </div>
    </div>`;

  /* IL SELETTORE IN CIMA, le righe numerate della pagina domande.
     Una barra sola non basta a dire "questo catalogo ha sei famiglie e dentro
     c'e' questo": chi atterra deve poterlo capire senza scorrere trenta voci.
     La descrizione NON e' scritta a mano — sono i primi nomi di prodotto
     della famiglia, che e' l'unica cosa che un ristoratore voglia leggere li'
     dentro, e che non puo' andare fuori sincrono col catalogo. */
  const vetrina = c.famiglie.reduce((s, f) => s + f.voci.length, 0);

  const scelta = `      <div class="fq-argomenti">
${c.famiglie.map((f, i) => {
    /* Due nomi sul telefono, quattro sul largo: in una colonna da 390 px
       quattro nomi di prodotto sono tre righe per ognuna delle sei famiglie,
       e il selettore smette di essere un colpo d'occhio */
    const nomi = f.voci.map((v) => v.nome);
    const dentro = nomi.slice(0, 2).join(', ')
      + (nomi.length > 2 ? `<span class="solo-largo">, ${nomi.slice(2, 4).join(', ')}${nomi.length > 4 ? '…' : ''}</span>` : '');
    const n = f.voci.length;
    return `        <a class="fq-arg" href="#${idFam(f.nome)}">
          <span class="fq-arg-n">${String(i + 1).padStart(2, '0')}</span>
          <span class="fq-arg-t">${f.nome}</span>
          <span class="fq-arg-d">${dentro}</span>
          <span class="fq-arg-c">${n} ${n === 1 ? 'voce' : 'voci'}<svg aria-hidden="true"><use href="#ico-arr"/></svg></span>
        </a>`;
  }).join('\n')}
      </div>

      <!-- QUELLO CHE SI VEDE E' UN ESTRATTO, e va detto con un numero.
           Diciotto prodotti in pagina su cinquecentottantanove in cella si
           leggono come "questo e' tutto quello che hanno" se nessuno dice il
           secondo numero. Ed e' il contrario di quello che serve: chi non
           trova la sua referenza se ne va, invece di chiederla. -->
      <p class="ct-estratto">
        In pagina i <strong>${vetrina} prodotti più richiesti</strong>. In cella oggi
        ce ne sono <strong>${c.magazzino}</strong>, e su ordinazione prendiamo
        qualsiasi cosa: se non vedi quello che ti serve,
        <a href="https://wa.me/${WA}?text=${encodeURIComponent('Ciao, cerco un prodotto che non vedo sul sito: ')}" target="_blank" rel="noopener noreferrer">chiedilo</a>.
      </p>`;

  /* Il titolo della finestra e' la frase SEO, non il nome del catalogo:
     "Congelato e decongelato" non e' quello che qualcuno digita su Google */
  return `${testa(c.intro_titolo, { css: ['catalogo.css'], simboli: ['wa', 'arr'] })}
${hero}

${barra}

    <main class="pr-corpo">
      <!-- Sul telefono resta il primo paragrafo. Il secondo elabora — come
           lavoriamo, cosa e' incluso — ed e' roba che si legge da fermi, non
           scorrendo col pollice per arrivare ai prodotti. Resta nel
           documento, quindi Google lo legge lo stesso. -->
      <div class="pr-intro">
        <h2>${c.intro_titolo}</h2>
${c.intro.map((p, i) => `        <p${i > 0 ? ' class="solo-largo"' : ''}>${p}</p>`).join('\n')}
      </div>

${scelta}

${c.famiglie.map(famiglia).join('\n\n')}

${altriCataloghi(c.slug)}

${chiusura(
    'Il prezzo si chiede, non si cerca',
    'Scrivici su WhatsApp<br />per il listino e le disponibilità',
    'Ti mandiamo il listino del tuo settore e ti diciamo cosa c\'è in cella adesso. Si ordina fino alle 2 di notte, si consegna entro le 11.'
  )}
    </main>
${piede(['../../js/caustiche.js?v=1', '../../js/pesci.js?v=4', 'js/d.js?v=1', 'js/catalogo.js?v=1', '../../js/cursore.js?v=2'])}`;
}

/* ─ L'indice ────────────────────────────────
   La porta d'ingresso: quattro cataloghi, e il pescato per primo perche' e'
   l'unico che cambia e l'unico che nessun altro grossista puo' copiare */
function indice() {
  /* LA CARD E' QUELLA DEL PESCATO, non una terza.
     L'indice aveva un disegno suo — foto larga, occhiello corallo, paragrafo —
     e con tre schede in una griglia a due colonne lasciava pure un buco a
     destra. Tre linguaggi diversi lungo lo stesso percorso (schede qui, righe
     numerate nei cataloghi, schede diverse nel pescato) si leggono come tre
     siti. Qui si usa `.pr-card` dentro `.pr-griglia`, cioe' esattamente la
     vetrina del pescato: stessa cornice, stesso ingrandimento al passaggio,
     stessa freccia. Quattro in fila, nessun buco. (Mattias, 2026-08-17) */
  const carte = [
    { ...PESCATO, href: 'd-sito.html' },
    ...cataloghi.map((c) => ({
      href: `${c.slug}.html`,
      /* Sulla card va il nome CORTO, non il titolo della pagina: in quindici
         rem "Pesce fresco all'ingrosso" va su due righe e "all'ingrosso" non
         aggiunge niente a chi sta scegliendo fra otto riquadri */
      nome: c.nome,
      foto: c.foto,
      /* La riga sotto il titolo dice COSA C'E' DENTRO con i nomi veri dei
         prodotti, non un aggettivo: e' la stessa scelta delle righe numerate
         dentro i cataloghi, e non puo' andare fuori sincrono */
      riga: c.famiglie.flatMap((f) => f.voci.map((v) => v.nome)).slice(0, 4).join(', '),
    })),
  ];

  const griglia = carte.map((c) => `        <a class="pr-card" href="${c.href}">
          <div class="pr-foto"><img src="${c.foto}" alt="${c.nome}" loading="lazy" /></div>
          <div class="pr-testo">
            <h2>${c.nome}</h2>
            <p class="pr-taglia">${c.riga}</p>
          </div>
        </a>`).join('\n\n');

  return `${testa('Prodotti e cataloghi', { css: ['catalogo.css'], simboli: ['wa', 'arr'] })}
    <section class="pr-hero">
      <canvas id="pr-sfondo"></canvas>
      <canvas id="pr-pesci"></canvas>
      <div class="pr-hero-in">
        <p class="pr-occhiello">Ingrosso ittico per la ristorazione</p>
        <!-- IL TITOLO DICE DOVE SI E', la riga sotto dice di cosa si parla.
             E' lo stesso impianto della pagina delle domande frequenti
             ("Domande frequenti / sulla fornitura di pesce"): il nome della
             sezione in grande perche' chi arriva deve riconoscerla, e la
             qualifica nell'<em> perche' li' Google guarda di cosa parla la
             pagina. Prima c'era uno slogan — "Il pesce, e tutto il resto" —
             che non diceva nessuna delle due cose. (Mattias, 2026-08-17) -->
        <h1 class="pr-titolo">Catalogo prodotti<br /><em>pesce fresco, congelato e crudo per la ristorazione</em></h1>
        <p class="pr-sotto">
          Otto cataloghi e più di mille referenze in cella stamattina. Qui le più
          richieste: il resto si ordina e arriva con lo stesso furgone.
        </p>
      </div>
    </section>

    <main class="pr-corpo">
      <div class="pr-intro">
        <!-- Il titolo dice PESCE. I dolci sono un catalogo vero e restano in
             pagina, ma non stanno in vetrina accanto al pesce: chi cerca un
             fornitore ittico e legge "dessert" nel titolo pensa di aver
             sbagliato azienda. (Mattias, 2026-08-17) -->
        <h2>Ingrosso di pesce fresco e congelato per ristoranti in Toscana, Liguria ed Emilia-Romagna</h2>
        <p>
          Riforniamo <strong>ristoranti, pescherie, hotel, gastronomie e sushi bar</strong>
          — oltre mille locali nell'ultimo anno — con una consegna sola. Chi ordina da
          noi non tiene in piedi tre fornitori per riempire un menù: il pesce del
          giorno e la cella del congelato arrivano sullo stesso furgone e sulla stessa
          fattura, e con loro il dessert, che è la voce per cui quasi nessuno ha voglia
          di aprire un conto a parte.
        </p>
        <p>
          Quello che vedete in queste pagine è <strong>una selezione dei prodotti più
          richiesti</strong>, non il magazzino: le referenze in giacenza sono più di
          mille e cambiano ogni giorno, e <strong>su ordinazione prendiamo
          qualunque cosa</strong> — specie, pezzature e provenienze che non stanno in
          nessuna vetrina. Se cercate qualcosa che qui non c'è, è quasi sempre una
          domanda su WhatsApp, non un problema.
        </p>
        <!-- Sul telefono resta fuori: chi arriva qui vuole vedere i prodotti,
             e orari e modalita' d'ordine li ritrova identici nella chiusura in
             fondo a questa stessa pagina. Il paragrafo sopra invece resta,
             perche' dice che questa e' una selezione — che e' l'unica cosa che
             se non si legge fa perdere un cliente. -->
        <p class="solo-largo">
          Si ordina <strong>su WhatsApp fino alle 2 di notte</strong> e si riceve entro
          le 11 del mattino, in ghiaccio e con l'etichetta di tracciabilità. I
          <strong>prezzi non stanno online</strong> perché cambiano ogni giorno e
          cambiano per settore: si chiedono in chat e arrivano in pochi minuti, con
          la disponibilità reale di quel momento.
        </p>
      </div>

      <div class="pr-griglia pr-griglia-cat">
${griglia}
      </div>

${chiusura(
    'Dicci che locale hai',
    'Scrivici su WhatsApp<br />e ti mandiamo il listino giusto',
    'Ristorante, pescheria, sushi bar o gastronomia: il listino è diverso per ognuno. Dicci qual è il tuo e ti mandiamo quello, non un catalogo generico.'
  )}
    </main>
${piede(['../../js/caustiche.js?v=1', '../../js/pesci.js?v=4', 'js/d.js?v=1', '../../js/cursore.js?v=2'])}`;
}

let n = 0;
cataloghi.forEach((c) => {
  fs.writeFileSync(path.join(qui, `${c.slug}.html`), catalogo(c));
  n++;
  const voci = c.famiglie.reduce((s, f) => s + f.voci.length, 0);
  console.log(`  ${c.slug}.html — ${c.famiglie.length} famiglie, ${voci} voci`);
});

fs.writeFileSync(path.join(qui, 'prodotti.html'), indice());
console.log(`  prodotti.html — indice con ${n + 1} cataloghi`);
