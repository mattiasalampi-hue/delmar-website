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

/* I due mondi raggruppano, non nascondono: i dieci cluster restano tutti
   visibili. Per generare le pagine serve la lista piatta, con il mondo
   attaccato addosso a ognuna — sull'indice torna a servire per dividere le
   due sezioni, e nelle briciole per dire dove si e'. */
const cataloghi = dati.mondi.flatMap((m) => m.cluster.map((c) => ({ ...c, mondo: m })));

const { WA, testa, piede, altriCataloghi, primaFrase, briciole } = require('./comune');

const RADICE = 'https://del-mar.it';

/* Il pescato non sta in catalogo.json perche' non e' un catalogo di linea: e'
   la pagina che cambia ogni notte. Ma nell'indice deve stare per primo, ed e'
   la ragione per cui qualcuno arriva qui. */
const PESCATO = {
  slug: 'pescato-arcipelago-toscano',
  nome: 'Pescato dell\'Arcipelago Toscano',
  riga: 'Le specie locali · listino del giorno a parte',
  foto: 'foto-prodotti/copertina-pescato.webp',
  sotto: 'Quello che le barche hanno preso stanotte, fotografato al banco. Quando è finito, è finito.',
};

function chiusura(occhiello, titolo, testo) {
  /* La tela sta PRIMA del testo e non dietro con uno z-index negativo: un
     figlio sotto zero esce dal contesto di impilamento del blocco e finisce
     dietro allo sfondo della pagina, cioe' sparisce. Ordine nel documento
     piu' position:relative sul testo, e basta. */
  return `      <section class="pr-chiusura">
        <canvas class="pr-chiusura-fondo" aria-hidden="true"></canvas>
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

/* La coppia di bottoni in mezzo alla pagina (.pr-cta, condivisa con le
   pagine di zona via d.css): il contatto non vive solo nella chiusura in
   fondo — "devi poter sempre contattarci al volo" (Mattias, 19/08/2026).
   WhatsApp pieno, accanto le zone di consegna: chi guarda un listino si
   chiede subito se arriviamo da lui. */
function ctaVeloce(msg) {
  return `      <div class="pr-cta">
        <a href="https://wa.me/${WA}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener noreferrer" class="pr-btn pr-btn-wa">
          <svg aria-hidden="true"><use href="#ico-wa"/></svg>
          Contattaci su WhatsApp
        </a>
        <a href="../consegna/" class="pr-btn pr-btn-scuro">
          Dove consegniamo
          <svg class="arr" aria-hidden="true"><use href="#ico-arr"/></svg>
        </a>
      </div>`;
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

/* GLI ATTRIBUTI FINISCONO SULL'ARTICOLO, non in un indice a parte.
   Il filtro gira nel browser su questi `data-`: la voce porta addosso i suoi
   attributi, e js/filtri.js non deve tenere in piedi una copia dei dati
   che puo' andare fuori sincrono con quello che si legge in pagina.
   Il separatore e' la barra verticale perche' e' l'unico carattere che non
   compare dentro un valore — le pezzature hanno virgole, gli slash e i
   trattini ("600/800", "L2 (20/30 pz/kg)"). */
/* Le virgolette si scappano QUI come nelle pillole del filtro, e non e'
   pignoleria: lo stesso valore lo scrivono due punti diversi del file, e
   finche' uno dei due non lo fa il primo prodotto con un apice nel nome
   della lavorazione tronca l'attributo e sfonda il tag <article>. Il guasto
   non si legge come "escaping sbagliato": si legge come "un prodotto e'
   sparito dalla pagina", che e' molto piu' difficile da ricondurre a qui. */
function attributi(v) {
  return dati.filtri.map((f) => {
    const g = v[f.campo];
    const valori = g == null ? [] : (Array.isArray(g) ? g : [g]);
    if (!valori.length) return '';
    return ` data-${f.campo}="${valori.join('|').replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`;
  }).join('');
}

/* I due badge che il documento toglie dal menu.
   "Prodotti per crudi di pesce" era un cluster che rubava ventidue referenze
   agli altri; i gamberi rossi stavano per diventare un ramo per il 15,7% dei
   chili che il 99,4% dei clienti non apre. Qui sono due etichette sulla
   scheda: tengono insieme le referenze senza sottrarle a casa loro. */
function badge(v) {
  const b = [];
  if ((v.uso || []).includes('Adatto al crudo')) b.push('<span class="ct-badge ct-badge-crudo">Adatto al crudo</span>');
  if (v.gamma === 'Premium') b.push('<span class="ct-badge ct-badge-premium">Gamma premium</span>');
  if (v.gamma === 'Linea DelMar') b.push('<span class="ct-badge ct-badge-delmar">Linea DelMar</span>');
  return b.length ? `              <p class="ct-badge-riga">${b.join('')}</p>\n` : '';
}

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
  /* LA GLASSATURA STA IN CHIARO, e sta prima del formato.
     E' il filtro piu' differenziante del settore e quasi nessun concorrente
     lo dichiara: su un calamaro al 30% il prezzo reale cambia di un terzo.
     Dichiararlo qui e' una promessa, non un dettaglio tecnico — per questo
     accanto alla percentuale c'e' scritto cosa vuol dire. */
  if (v.glassatura && v.glassatura.length) {
    /* Un valore solo o una forcella: certe referenze si comprano in due
       glassature diverse, e dire "dal 10 al 30%" e' l'informazione vera —
       mediarle sarebbe inventare un terzo numero che non esiste. */
    const kg = (p) => ((100 - parseInt(p, 10)) / 10).toFixed(1).replace('.', ',');
    const g = v.glassatura;
    const resa = g.length > 1
      ? `da ${kg(g[0])} a ${kg(g[g.length - 1])} kg di prodotto`
      : `${kg(g[0])} kg di prodotto`;
    righe.push(`            <div class="ct-riga">
              <span class="ct-et">Glassatura</span>
              <p class="ct-glassa"><strong>${g.join(' · ')}</strong> — su 10 kg lordi, ${resa}</p>
            </div>`);
  }
  if (v.formato) {
    righe.push(`            <div class="ct-riga">
              <span class="ct-et">Formato</span>
              <p class="ct-formato">${v.formato}</p>
            </div>`);
  }

  const msg = encodeURIComponent(`Ciao, vorrei sapere disponibilità e prezzo di: ${v.nome}`);

  /* IL RIQUADRO CHE STA AL POSTO DELLA FOTOGRAFIA.

     Va online cosi', con le foto ancora da fare, quindi non puo' dire "foto
     mancante": al visitatore quella scritta racconta che il sito e' a meta',
     e un fornitore a meta' non riceve ordini. Deve leggersi come una scelta.

     Ed e' una scelta che questa pagina aveva gia' fatto: il foglio di stile
     dice che i cataloghi di linea NON sono un muro di fotografie ma un
     elenco ragionato, perche' un'orata di Grecia e' identica a gennaio e ad
     agosto e fotografarne ventuno versioni non aggiunge niente. Il riquadro
     e' un'etichetta da banco — pesce disegnato e nome della specie — e sta
     bene accanto a una foto vera quando arrivera'.

     `aria-hidden` sul simbolo: il nome della specie e' gia' nel titolo della
     scheda, ripeterlo a chi ascolta sarebbe solo rumore. */
  const foto = v.foto
    ? `            <div class="ct-voce-foto">
              <img src="${v.foto}" alt="${v.nome}" loading="lazy" />
            </div>\n`
    : `            <div class="ct-voce-foto ct-foto-segno" aria-hidden="true">
              <svg class="ct-foto-segno-i"><use href="#ico-pesce"/></svg>
              <span class="ct-foto-segno-n">${v.nome}</span>
            </div>\n`;

  return `          <article class="ct-voce"${attributi(v)}>
${foto}            <div class="ct-voce-testo">
              <h3>${v.nome}</h3>
${badge(v)}              <p class="ct-voce-sotto">${primaFrase(v.sotto)}</p>
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

/* ─ La barra dei filtri ──────────────────────────────────────────────────
   Le otto dimensioni che prima inquinavano il menu. "Adatto al crudo" come
   ramo rubava ventidue referenze agli altri cluster; come filtro le tiene
   insieme senza toglierle da casa loro — ed e' l'unica forma in cui si puo'
   combinare con "fresco" e con "gambero", che e' quello che uno cerca
   davvero.

   I VALORI SI RICAVANO DALLE VOCI, non da un elenco fisso. Un filtro che
   offre "Panato" dentro il catalogo dei cefalopodi e poi non torna niente
   insegna al cliente che i filtri non funzionano, e non li tocca piu'. Qui
   ogni cluster mostra solo quello che ha davvero in pagina, col numero
   accanto.

   Lo stato sta per primo e non e' un caso: e' il primo taglio che fa un
   ristoratore, e deve stare prima dello scroll. */
function filtri(c) {
  const voci = c.sottocluster.flatMap((s) => s.voci);

  const gruppi = dati.filtri.map((f) => {
    const conta = new Map();
    for (const v of voci) {
      const g = v[f.campo];
      if (g == null) continue;
      for (const valore of Array.isArray(g) ? g : [g]) {
        conta.set(valore, (conta.get(valore) || 0) + 1);
      }
    }
    /* Un valore che ce l'hanno tutte non e' un filtro, e' un'informazione:
       "Congelato" dentro un catalogo tutto congelato non toglie niente e
       occupa una riga. Sotto le due voci distinte il gruppo non si stampa. */
    if (conta.size < 2) return '';

    /* LA CODA LUNGA STA DIETRO UN BOTTONE, e non e' un dettaglio di stile.
       Le pezzature sono testo scritto a mano, non fasce normalizzate: sul
       catalogo del pesce sono 106 valori diversi, 91 dei quali appartengono
       a un prodotto solo — "obeso", "baffa", "grado AA". Stampati tutti
       facevano sei schermate di pillole prima del primo pesce, e un filtro
       piu' lungo del catalogo che filtra non e' un filtro.

       Ordinati per quanti prodotti tengono insieme, i primi otto sono
       quelli che servono davvero; gli altri restano raggiungibili, ma
       chiusi. Il numero sul bottone dice quanti sono, cosi' non si spaccia
       per completo un elenco che e' tagliato. (Finche' l'anagrafica non
       normalizza pezzatura e formato in fasce — punto 04 del documento —
       questa e' la forma onesta.) */
    const CAPPIO = 8;
    const ordinati = [...conta.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'it'));

    const valori = ordinati
      .map(([valore, n], i) => `            <button type="button" class="ct-fchip${i >= CAPPIO ? ' ct-fchip-coda' : ''}" data-campo="${f.campo}" data-valore="${valore.replace(/"/g, '&quot;')}" aria-pressed="false"${i >= CAPPIO ? ' hidden' : ''}>${valore}<span class="ct-fchip-n">${n}</span></button>`)
      .join('\n');

    const coda = ordinati.length > CAPPIO
      ? `\n            <button type="button" class="ct-fchip-piu" data-piu="${f.campo}" aria-expanded="false">+${ordinati.length - CAPPIO} altre</button>`
      : '';

    return `        <div class="ct-filtro">
          <span class="ct-filtro-et">${f.nome}</span>
          <div class="ct-filtro-valori">
${valori}${coda}
          </div>
        </div>`;
  }).filter(Boolean);

  /* SE NON RESTA NESSUN GRUPPO, NON SI STAMPA LA SCATOLA.
     Un gruppo sparisce quando ha meno di due valori distinti — dentro un
     catalogo tutto congelato "Congelato" non taglia niente. Sui Panificati
     capitava a tutti e tre: usciva un riquadro con scritto "Filtra 4
     prodotti" e sotto il vuoto, e js/filtri.js non lo nasconde perche' esce
     subito quando non trova pillole. Un pannello di filtri senza filtri e'
     peggio di nessun pannello. */
  if (!gruppi.length) return '';

  /* I TRE GRUPPI STANNO IN FILA, non incolonnati.
     In tre righe da una pillola e mezza il pannello lasciava due terzi di
     larghezza vuota a destra e si mangiava tre righe d'altezza: fianco a
     fianco riempie lo spazio che c'e' e si legge come una barra di comando
     invece che come un modulo da compilare. */
  return `      <section class="ct-filtri" id="ct-filtri" aria-label="Filtra i prodotti">
        <div class="ct-filtri-in">
          <div class="ct-filtri-testa">
            <h2>Filtra <strong>${voci.length}</strong> prodotti</h2>
            <button type="button" class="ct-filtri-azzera" id="ct-azzera" hidden>Azzera i filtri</button>
          </div>
          <div class="ct-filtri-gruppi">
${gruppi.join('\n')}
          </div>
          <p class="ct-filtri-esito" id="ct-esito" role="status" hidden></p>
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
        <p class="ct-famiglie-et">${c.sottocluster.length} famiglie</p>
        <div class="fq-indice" role="navigation" aria-label="Famiglie del catalogo">
${c.sottocluster.map((f) => `          <a href="#${idFam(f.nome)}">${f.nome}</a>`).join('\n')}
        </div>
      </div>
    </div>`;

  /* IL SELETTORE IN CIMA, le righe numerate della pagina domande.
     Una barra sola non basta a dire "questo catalogo ha sei famiglie e dentro
     c'e' questo": chi atterra deve poterlo capire senza scorrere trenta voci.
     La descrizione NON e' scritta a mano — sono i primi nomi di prodotto
     della famiglia, che e' l'unica cosa che un ristoratore voglia leggere li'
     dentro, e che non puo' andare fuori sincrono col catalogo. */
  const vetrina = c.sottocluster.reduce((s, f) => s + f.voci.length, 0);

  const scelta = `      <div class="fq-argomenti">
${c.sottocluster.map((f, i) => {
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
        In pagina i <strong>${vetrina} più richiesti</strong> su
        <strong>${c.magazzino}</strong> in cella. Se non vedi quello che ti serve,
        <a href="https://wa.me/${WA}?text=${encodeURIComponent('Ciao, cerco un prodotto che non vedo sul sito: ')}" target="_blank" rel="noopener noreferrer">chiedilo</a><span class="solo-largo">: su ordinazione prendiamo qualsiasi cosa</span>.
      </p>`;

  /* Il titolo della finestra e' c.titolo ("Pesce fresco all'ingrosso"), NON
     intro_titolo: quello arriva a 89 caratteri e Google lo troncava a meta'
     frase — un title mozzato perde il clic. Sotto i 60 caratteri col
     marchio, e la frase lunga resta in pagina come H2, dove il suo mestiere
     lo fa ancora. La descrizione e' il sottotitolo dell'apertura, e la
     misura gliela da' testa() (tetto 155). */
  return `${testa(c.titolo, {
    css: ['catalogo.css'],
    simboli: ['wa', 'arr', 'pesce'],
    pagina: `${c.slug}.html`,
    descrizione: c.sotto,
    /* I filetti non hanno ancora una copertina propria: piuttosto che un
       link WhatsApp senza foto, l'anteprima di riserva del marchio */
    immagine: c.foto || 'foto-prodotti/copertina-pescato.webp',
    /* Il mondo sta nelle briciole ma non e' una pagina: e' la sezione
       dell'indice. Puntarlo con l'ancora dice a Google che i dieci cluster
       stanno in due famiglie, senza inventare due pagine intermedie che
       nessuno vorrebbe visitare. */
    jsonld: [briciole([
      ['Home', `${RADICE}/`],
      ['Catalogo prodotti', `${RADICE}/catalogo/prodotti.html`],
      [c.mondo.nome, `${RADICE}/catalogo/prodotti.html#${c.mondo.slug}`],
      [c.nome, `${RADICE}/catalogo/${c.slug}.html`],
    ])],
  })}
${hero}

${barra}

    <main class="pr-corpo">
      <!-- L'INTRODUZIONE E' UN PARAGRAFO SOLO, e sul telefono ne resta la
           prima frase. Erano due paragrafi pieni — tredici, sedici righe su
           uno schermo stretto — prima di far vedere un pesce. Il secondo
           diceva quasi sempre cose operative (come arriva, con che etichetta,
           entro che ora) che stanno gia' identiche nella chiusura in fondo a
           questa stessa pagina: ripeterle in cima costava quindici righe e
           non aggiungeva niente. (Mattias, 2026-08-17) -->
      <div class="pr-intro">
        <h2>${c.intro_titolo}</h2>
${c.intro.map((p) => `        <p>${primaFrase(p)}</p>`).join('\n')}
      </div>

${ctaVeloce(`Ciao, vorrei il listino: ${c.nome}`)}

${scelta}

${filtri(c)}

${c.sottocluster.map(famiglia).join('\n\n')}

${ctaVeloce(`Ciao, vorrei il listino: ${c.nome}`)}

${altriCataloghi(c.slug)}

${chiusura(
    'Il prezzo si chiede, non si cerca',
    'Scrivici su WhatsApp<br />per il listino e le disponibilità',
    'Ti mandiamo il listino del tuo settore e ti diciamo cosa c\'è in cella adesso. Si ordina fino alle 2 di notte, si consegna entro le 11.'
  )}
    </main>
${piede(['../js/caustiche.js?v=1', '../js/pesci.js?v=11', '../js/consenso.js?v=1', '../js/tag.js?v=2', '../js/analitica.js?v=2', 'js/d.js?v=1', 'js/catalogo.js?v=3', 'js/filtri.js?v=2', '../js/cursore.js?v=2'])}`;
}

/* ─ L'indice ────────────────────────────────
   La porta d'ingresso: due mondi, dieci cataloghi, e il pescato per primo
   perche' e' l'unico che cambia e l'unico che nessun altro grossista puo'
   copiare */
function indice() {
  /* LA CARD E' QUELLA DEL PESCATO, non una terza.
     L'indice aveva un disegno suo — foto larga, occhiello corallo, paragrafo —
     e con tre schede in una griglia a due colonne lasciava pure un buco a
     destra. Tre linguaggi diversi lungo lo stesso percorso (schede qui, righe
     numerate nei cataloghi, schede diverse nel pescato) si leggono come tre
     siti. Qui si usa `.pr-card` dentro `.pr-griglia`, cioe' esattamente la
     vetrina del pescato: stessa cornice, stesso ingrandimento al passaggio,
     stessa freccia. Quattro in fila, nessun buco. (Mattias, 2026-08-17) */
  const carta = (c) => ({
    href: `${c.slug}.html`,
    /* Sulla card va il nome CORTO, non il titolo della pagina: in quindici
       rem "Pesce fresco all'ingrosso" va su due righe e "all'ingrosso" non
       aggiunge niente a chi sta scegliendo fra dieci riquadri */
    nome: c.nome,
    foto: c.foto,
    /* La riga sotto il titolo dice COSA C'E' DENTRO con i nomi veri dei
       prodotti, non un aggettivo: e' la stessa scelta delle righe numerate
       dentro i cataloghi, e non puo' andare fuori sincrono */
    riga: c.sottocluster.flatMap((f) => f.voci.map((v) => v.nome)).slice(0, 4).join(', '),
  });

  const carte = [
    { ...PESCATO, href: 'pescato-arcipelago-toscano.html' },
    ...cataloghi.map(carta),
  ];

  /* Stesso segnaposto delle schede: una categoria appena aggiunta non ha
     ancora la sua copertina, e senza questo il riquadro chiamerebbe una foto
     che non esiste — cioe' l'icona di immagine rotta, in cima all'indice. */
  const riquadro = (c) => `        <a class="pr-card" href="${c.href}">
          <div class="pr-foto">${c.foto
    ? `<img src="${c.foto}" alt="${c.nome}" loading="lazy" />`
    : `<span class="ct-foto-segno pr-foto-segno" aria-hidden="true"><svg class="ct-foto-segno-i"><use href="#ico-pesce"/></svg><span class="ct-foto-segno-n">${c.nome}</span></span>`}</div>
          <div class="pr-testo">
            <h2>${c.nome}</h2>
            <p class="pr-taglia">${c.riga}</p>
          </div>
        </a>`;

  /* ─ I DUE MONDI RAGGRUPPANO, NON NASCONDONO.
     Dieci riquadri tutti uguali in fila non dicono che cinque sono il
     mestiere e cinque sono il servizio: chi cerca un fornitore ittico e
     vede le basi pizza accanto al calamaro legge "cash and carry", non
     "grossista di pesce". Due intestazioni bastano a separarli — i cluster
     restano tutti visibili, nessuno finisce dentro un menu da aprire.

     "Dal mare" apre per primo e si prende il pescato: e' il 74% dei chili e
     tutto il mestiere. */
  const mondi = dati.mondi.map((m, i) => {
    const dentro = i === 0
      ? [{ ...PESCATO, href: 'pescato-arcipelago-toscano.html' }, ...m.cluster.map(carta)]
      : m.cluster.map(carta);
    const quota = m.cluster.reduce((s, c) => s + c.sottocluster.reduce((t, f) => t + f.voci.length, 0), 0);

    return `      <section class="pr-mondo" id="${m.slug}">
        <div class="pr-mondo-testa">
          <h2>${m.nome}</h2>
          <p class="pr-mondo-sotto">${m.sotto}</p>
          <p class="pr-mondo-conta">${m.cluster.length} cataloghi · ${quota} prodotti in pagina</p>
        </div>
        <div class="pr-griglia pr-griglia-cat">
${dentro.map(riquadro).join('\n\n')}
        </div>
      </section>`;
  }).join('\n\n');

  /* L'ItemList dice a Google che questa pagina E' un elenco, e di cosa:
     gli stessi undici riquadri delle card, nello stesso ordine — markup e
     pagina devono dire la stessa cosa */
  const listaCataloghi = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Cataloghi DelMar',
    itemListElement: carte.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.nome,
      url: `${RADICE}/catalogo/${c.href}`,
    })),
  };

  return `${testa('Catalogo ittico all\'ingrosso per la ristorazione', {
    css: ['catalogo.css'],
    simboli: ['wa', 'arr', 'pesce'],
    pagina: 'prodotti.html',
    descrizione: 'Ingrosso di pesce per ristoranti, pescherie e sushi bar in Toscana, Liguria ed Emilia-Romagna: dieci cataloghi in due mondi, oltre mille referenze, consegna entro le 11.',
    immagine: 'foto-prodotti/copertina-pescato.webp',
    jsonld: [
      briciole([
        ['Home', `${RADICE}/`],
        ['Catalogo prodotti', `${RADICE}/catalogo/prodotti.html`],
      ]),
      listaCataloghi,
    ],
  })}
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
          Dieci cataloghi e più di mille referenze in cella stamattina. Qui le più
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
        <!-- Erano tre paragrafi. Il terzo (orari, prezzi non online) e' tutto
             ripetuto nella chiusura in fondo a questa pagina; il primo si e'
             stretto tenendo il numero, che e' la cosa che convince. Resta
             quello che dice che questa e' una selezione: e' l'unica frase che,
             se non la si legge, fa perdere un cliente che non trova la sua
             referenza. -->
        <p>
          Riforniamo <strong>oltre mille locali</strong> fra ristoranti, pescherie,
          hotel e sushi bar. <span class="solo-largo">Pesce del giorno, cella del
          congelato e dessert sullo stesso furgone e sulla stessa fattura: chi ordina
          da noi non tiene in piedi tre fornitori per riempire un menù.</span>
        </p>
        <p>
          Quello che vedete qui è <strong>una selezione dei prodotti più
          richiesti</strong>, non il magazzino. <span class="solo-largo">Le referenze in
          giacenza sono più di mille e cambiano ogni giorno, e su ordinazione prendiamo
          qualunque cosa: se cercate qualcosa che non c'è, è una domanda su WhatsApp,
          non un problema.</span>
        </p>
      </div>

${ctaVeloce('Ciao, vorrei informazioni sui vostri prodotti')}

${mondi}

${chiusura(
    'Dicci che locale hai',
    'Scrivici su WhatsApp<br />e ti mandiamo il listino giusto',
    'Ristorante, pescheria, sushi bar o gastronomia: il listino è diverso per ognuno. Dicci qual è il tuo e ti mandiamo quello, non un catalogo generico.'
  )}
    </main>
${piede(['../js/caustiche.js?v=1', '../js/pesci.js?v=11', '../js/consenso.js?v=1', '../js/tag.js?v=2', '../js/analitica.js?v=2', 'js/d.js?v=1', '../js/cursore.js?v=2'])}`;
}

let n = 0;
cataloghi.forEach((c) => {
  fs.writeFileSync(path.join(qui, `${c.slug}.html`), catalogo(c));
  n++;
  const voci = c.sottocluster.reduce((s, f) => s + f.voci.length, 0);
  console.log(`  ${c.slug}.html — ${c.sottocluster.length} famiglie, ${voci} voci`);
});

fs.writeFileSync(path.join(qui, 'prodotti.html'), indice());
console.log(`  prodotti.html — indice con ${n + 1} cataloghi`);
