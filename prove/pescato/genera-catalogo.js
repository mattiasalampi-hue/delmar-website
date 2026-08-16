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

const WA = '393356654017';

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

const svgArr = `<symbol id="ico-arr" viewBox="0 0 24 24">
        <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </symbol>`;

const svgWa = `<symbol id="ico-wa" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </symbol>`;

function testa(titolo, css) {
  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${titolo} — DelMar</title>
    <meta name="robots" content="noindex" />
    <link rel="stylesheet" href="../../css/poppins.css?v=1" />
    <link rel="stylesheet" href="../../css/style.css?v=101" />
    <!-- L'indice appeso e le righe degli argomenti sono GIA' nel sito, sulla
         pagina delle domande frequenti. Si carica quel foglio invece di
         ridisegnarli: due copie della stessa cosa divergono al primo
         ritocco, e il pescato deve sembrare la stessa mano -->
    <link rel="stylesheet" href="../../css/domande-frequenti.css?v=3" />
    <link rel="stylesheet" href="css/d.css?v=1" />
${css.map((f) => `    <link rel="stylesheet" href="css/${f}?v=1" />`).join('\n')}
  </head>
  <body class="pr-pagina">
    <svg xmlns="http://www.w3.org/2000/svg" class="svg-sprite" aria-hidden="true">
      ${svgWa}
      ${svgArr}
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
        <a href="https://wa.me/${WA}?text=Ciao%20Marina!" target="_blank" rel="noopener noreferrer" class="nav-wa">Ordina ora</a>
      </nav>
      <button class="hamburger" id="hamburger" aria-label="Apri menu" aria-expanded="false" aria-controls="main-nav"><span></span><span></span><span></span></button>
    </header>
`;
}

function piede(script) {
  return `
    <footer class="pr-piede">
      <div class="pr-piede-in">
        <img src="../../assets/logo.png?v=2" alt="DelMar" class="pr-piede-logo" />
        <p class="pr-piede-dati">
          LE DELIZIE DEL MARE S.R.L. — Via Dorsale 13, 54100 Massa (MS)<br />
          P.IVA 01081190454 — <a href="mailto:info@del-mar.it">info@del-mar.it</a>
        </p>
      </div>
    </footer>

${script.map((f) => `    <script src="${f}"></script>`).join('\n')}
  </body>
</html>
`;
}

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
              <p class="ct-voce-sotto">${v.sotto}</p>
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
          <p class="ct-fam-sotto">${f.sotto}</p>
          <p class="ct-fam-conta">${n} ${n === 1 ? 'voce' : 'voci'}</p>
        </div>

        <div class="ct-voci">
${f.voci.map(voce).join('\n\n')}
        </div>
      </section>`;
}

/* In fondo a un catalogo si e' visto tutto: il passo dopo non e' uscire dal
   sito, e' l'altro catalogo */
/* CHI ARRIVA QUI SA GIA' COS'E' UN CATALOGO: e' passato dall'indice, dove
   ogni catalogo ha la sua fotografia e la sua riga. Rileggerne sette
   descrizioni in fondo alla pagina non aggiunge niente — serve solo un
   bersaglio da cliccare.
   Prima erano sette riquadri bordati in una griglia da quattro: il buco a
   destra, altezze diverse, e un tipo di scheda che nel sito non esiste da
   nessun'altra parte. Ora sono le stesse pillole della barra appesa qui
   sopra, che il lettore ha davanti agli occhi da tutta la pagina.
   (Mattias, 2026-08-17) */
function altriCataloghi(corrente) {
  const tutti = [
    { slug: 'd-sito', nome: 'Pescato dell\'Arcipelago Toscano' },
    ...cataloghi.map((c) => ({ slug: c.slug, nome: c.nome })),
  ].filter((c) => c.slug !== corrente);

  return `    <section class="ct-altri">
      <h2>Gli altri cataloghi</h2>
      <div class="fq-indice ct-altri-pillole" role="navigation" aria-label="Gli altri cataloghi">
${tutti.map((c) => `        <a href="${c.slug}.html">${c.nome}</a>`).join('\n')}
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
    const nomi = f.voci.map((v) => v.nome);
    const dentro = nomi.slice(0, 4).join(', ') + (nomi.length > 4 ? '…' : '');
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
  return `${testa(c.intro_titolo, ['catalogo.css'])}
${hero}

${barra}

    <main class="pr-corpo">
      <div class="pr-intro">
        <h2>${c.intro_titolo}</h2>
${c.intro.map((p) => `        <p>${p}</p>`).join('\n')}
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

  return `${testa('Prodotti e cataloghi', ['catalogo.css'])}
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
        <p>
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
