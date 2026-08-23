/* Genera le pagine di zona da zone.json — una per area di consegna.

   Servono a due cose insieme: uscire su Google per "fornitore pesce
   <zona>" e fare da pagina di atterraggio alle campagne Google Ads
   della stessa zona (una pagina coerente con la parola chiave alza il
   punteggio di qualità e abbassa il costo per clic).

   Sono pagine del sito a tutti gli effetti: stessa intestazione, stesse
   campiture, stessi componenti del catalogo (comune.js, d.css). I numeri
   vengono dal gestionale — vedi la _nota in zone.json — e NON si
   ritoccano a mano nell'HTML: si corregge il JSON e si rigenera.

   Uso: node genera-zone.js
*/
const fs = require('fs');
const path = require('path');
const { WA, testa, piede } = require('../catalogo/comune');

const qui = __dirname;
const { zone } = JSON.parse(fs.readFileSync(path.join(qui, 'zone.json'), 'utf8'));

const RADICE = 'https://del-mar.it';

function pagina(z) {
  const msg = encodeURIComponent(z.wa_testo);

  /* Il markup Service dice a Google DOVE si vende, comune per comune:
     e' il pezzo che una pagina geografica ha in piu' da dichiarare */
  const servizio = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `Consegna di pesce all'ingrosso — ${z.nome}`,
    serviceType: 'Fornitura ittica per la ristorazione',
    url: `${RADICE}/consegna/${z.slug}.html`,
    provider: {
      '@type': 'WholesaleStore',
      name: 'DelMar — LE DELIZIE DEL MARE S.R.L.',
      url: RADICE,
      telephone: '+390585834572',
    },
    areaServed: z.comuni.map((c) => ({ '@type': 'City', name: c })),
  };

  return `${testa(z.titolo_seo, {
    cartella: 'consegna',
    css: ['zona.css'],
    simboli: ['wa', 'arr'],
    pagina: `${z.slug}.html`,
    descrizione: z.descrizione,
    immagine: 'foto-prodotti/copertina-pescato.webp',
    /* Niente BreadcrumbList qui: la pagina non ha briciole visibili, e la
       regola imparata con le FAQ e' che markup e pagina dicono la stessa
       identica cosa. Il Service con areaServed invece descrive esattamente
       quello che la pagina racconta */
    jsonld: [servizio],
  })}
    <!-- La stessa apertura delle pagine catalogo: campiture e pesci sono la
         firma di del-mar.it, e questa e' una pagina del sito, non una landing
         appiccicata -->
    <section class="pr-hero">
      <canvas id="pr-sfondo"></canvas>
      <canvas id="pr-pesci"></canvas>
      <div class="pr-hero-in">
        <p class="pr-occhiello">${z.occhiello}</p>
        <h1 class="pr-titolo">${z.titolo}<br /><em>${z.sottotitolo}</em></h1>
        <p class="pr-sotto">${z.sotto}</p>
      </div>
    </section>

    <main class="pr-corpo">
      <!-- I QUATTRO NUMERI PRIMA DI TUTTO: chi atterra da un annuncio decide
           in cinque secondi, e queste sono le quattro risposte che cerca -->
      <div class="zn-fatti">
${z.fatti.map((f) => `        <div class="zn-fatto">
          <span class="zn-fatto-e">${f.etichetta}</span>
          <span class="zn-fatto-n">${f.numero}</span>
          <span class="zn-fatto-v">${f.voce}</span>
        </div>`).join('\n')}
      </div>

      <!-- LE DUE AZIONI SUBITO SOTTO I NUMERI: chi arriva da un annuncio
           non deve scorrere fino in fondo per trovare il bottone. Prima il
           listino (la conversione), accanto il catalogo (chi vuole vedere
           la merce prima di scrivere) -->
      <div class="pr-cta">
        <a href="https://wa.me/${WA}?text=${msg}" target="_blank" rel="noopener noreferrer" class="pr-btn pr-btn-wa">
          <svg aria-hidden="true"><use href="#ico-wa"/></svg>
          Consulenza gratuita su WhatsApp
        </a>
        <a href="../catalogo/prodotti.html" class="pr-btn pr-btn-scuro">
          Guarda il catalogo
          <svg class="arr" aria-hidden="true"><use href="#ico-arr"/></svg>
        </a>
      </div>

      <!-- DUE RIGHE SU CHI SIAMO, prima di parlare di consegne: chi arriva
           da un annuncio non ci conosce, e la qualita' va cantata — pesce
           dell'Arcipelago, lavorazioni fatte in casa, crudi abbattuti.
           Breve e orgogliosa. (Mattias, 2026-08-18) -->
      <div class="pr-intro">
        <h2>Il pesce della Toscana, scelto da noi</h2>
        <p>
          Siamo <strong>DelMar</strong>, grossisti ittici in Toscana da trent'anni. Ogni notte al banco entra il
          <strong>Pescato dell'Arcipelago Toscano</strong> — triglie, scampi, gamberi rossi sbarcati fra Livorno e
          l'Elba — e nei nostri laboratori facciamo in casa quello che altri comprano già fatto: il calamaro pulito
          e aperto pronto per la griglia, i filetti, le tartare e i <strong>crudi abbattuti a norma</strong> per il
          servizio. Il pesce che ti serviamo lo scegliamo noi, non un fornitore del fornitore.${z.chisiamo_zona ? ` ${z.chisiamo_zona}` : ''}
        </p>
      </div>

      <div class="pr-intro">
        <h2>Dove arriva il furgone</h2>
        <p>${z.giorni_testo}</p>
        <!-- I comuni scritti UNO PER UNO, non "e dintorni": e' quello che un
             ristoratore cerca ("consegna pesce ${z.comuni[0]}") ed e' la
             differenza fra una pagina vera e una di facciata -->
        <div class="zn-comuni" role="list">
${z.comuni.map((c) => `          <span class="zn-comune" role="listitem">${c}</span>`).join('\n')}
        </div>
      </div>

      <!-- LE STRISCE DELLA HOME, componente per componente: tagline
           grande, foto, riga d'azione con la freccia. Sono la voce del
           sito ("dai pescherecci alle cucine", "il magazzino per te lo
           facciamo noi") declinata sulla zona — al posto di un elenco di
           prodotti che qui non diceva niente. (Mattias, 2026-08-18) -->
      <section class="zn-strisce">
${z.strisce.map((s, i) => `        <div class="prod-strip${i % 2 ? ' rev' : ''}">
          <div class="prod-img"><img src="../assets/${s.foto}" alt="${s.alt}" loading="lazy" /></div>
          <div class="prod-text">
            <h3 class="big-title">${s.titolo}</h3>
            <p class="body-text">${s.testo}</p>
            <a href="${s.href}" class="prod-link">${s.cta}<svg class="arr" aria-hidden="true"><use href="#ico-arr"/></svg></a>
          </div>
        </div>`).join('\n')}
      </section>

      <div class="pr-intro zn-lavoriamo-testa">
        <h2>Come lavoriamo</h2>
      </div>
      <!-- LE STESSE QUATTRO FASI DELLA HOME, card per card: tondo
           fotografico sfumato, orario arancio, titolo, clou. Cambia solo la
           disposizione — in colonna invece che a nastro — perche' il nastro
           della home scorre con GSAP, che queste pagine non caricano. La
           fase dei furgoni porta la riga della zona: e' l'unico testo che
           cambia da pagina a pagina. (Mattias, 2026-08-18) -->
      <div class="zn-fasi">
        <div class="fase">
          <div class="fase-tondo"><img src="../assets/chef-ordina.jpg" alt="Uno chef ordina dal telefono a fine servizio" loading="lazy" /></div>
          <div class="fase-testo">
            <p class="fase-ora">01 · La sera</p>
            <h3 class="fase-titolo">Ci scrivi su WhatsApp</h3>
            <p class="fase-clou">Ordini aperti fino alle <strong>2 di notte</strong></p>
            <p class="fase-desc">
              Un messaggio quando hai chiuso il servizio: scrivi la lista, mandala a voce o fotografa quello che ti
              manca.
            </p>
          </div>
        </div>
        <div class="fase">
          <div class="fase-tondo"><img src="../assets/processing-2.jpg" alt="Lavorazione del pesce in laboratorio" loading="lazy" /></div>
          <div class="fase-testo">
            <p class="fase-ora">02 · La notte</p>
            <h3 class="fase-titolo">Selezioniamo e lavoriamo</h3>
            <p class="fase-clou">Tutte le lavorazioni sono <strong>gratuite</strong></p>
            <p class="fase-desc">
              Scegliamo il pescato per il tuo ordine e lo prepariamo nei nostri laboratori certificati HACCP secondo
              le richieste della tua cucina: pulito, eviscerato, sfilettato, porzionato. Senza sovrapprezzo, sempre.
            </p>
          </div>
        </div>
        <div class="fase">
          <div class="fase-tondo"><img src="../assets/furgoni-giorno.jpg" alt="La flotta refrigerata DelMar schierata alla banchina di carico" loading="lazy" /></div>
          <div class="fase-testo">
            <p class="fase-ora">03 · Prima dell'alba</p>
            <h3 class="fase-titolo">Partono i nostri furgoni</h3>
            <p class="fase-desc">
              ${z.furgone_testo} La merce viaggia sulla nostra flotta refrigerata, non su corrieri terzi: la catena
              del freddo non si interrompe mai.
            </p>
          </div>
        </div>
        <div class="fase">
          <div class="fase-tondo"><img src="../assets/consegna-cella.jpg" alt="Cassa di branzini consegnata nella cella del ristorante" loading="lazy" /></div>
          <div class="fase-testo">
            <p class="fase-ora">04 · Entro le 11</p>
            <h3 class="fase-titolo">Scarichiamo nel tuo frigorifero</h3>
            <p class="fase-clou">Ogni consegna entro le <strong>11 di mattina</strong></p>
            <p class="fase-desc">
              I nostri autisti sistemano il pesce direttamente nel tuo frigorifero. Peso reale in fattura, e se
              qualcosa non va: reclami entro 24 ore e si sistema.
            </p>
          </div>
        </div>
      </div>

      <section class="pr-chiusura">
        <canvas class="pr-chiusura-fondo" aria-hidden="true"></canvas>
        <p class="pr-chiusura-occhiello">Consulenza gratuita per il tuo locale</p>
        <h2>${z.chiusura_titolo}</h2>
        <p class="pr-chiusura-testo">${z.chiusura_testo}</p>
        <div class="pr-chiusura-azioni">
          <a href="https://wa.me/${WA}?text=${msg}" target="_blank" rel="noopener noreferrer" class="pr-btn pr-btn-wa">
            <svg aria-hidden="true"><use href="#ico-wa"/></svg>
            Contattaci su WhatsApp
          </a>
        </div>
        <p class="pr-chiusura-tel">Rispondiamo tutti i giorni, festivi compresi</p>
      </section>
    </main>
${piede(['../js/caustiche.js?v=1', '../js/pesci.js?v=11', '../js/consenso.js?v=1', '../js/tag.js?v=2', '../js/analitica.js?v=2', '../catalogo/js/d.js?v=1', '../js/cursore.js?v=2'], { cat: '../catalogo/' })}`;
}

/* `lc` e' da che parte esce il NOME sulla carta del telefono (default a
   destra del pin). Serve solo alle tre zone che stanno strette: La Spezia e
   Versilia perche' il vicino e' a un dito di distanza, Firenze perche' a
   destra ha finito la carta. Il nome deve comunque restare appoggiato alla
   sua etichetta stampata, che copre: se lo si sposta via, quella riappare.

   Dove stanno i pin DENTRO l'immagine della mappa (frazioni 0-1 di
   larghezza e altezza): fx,fy e' la punta del pin (dove attraccano gli
   archi), bx,by,bw,bh e' il rettangolo cliccabile su pin + etichetta.
   Se l'immagine cambia, si rimisurano qui. */
const PIN = {
  'fornitore-pesce-parma':         { fx: 0.545, fy: 0.094, bx: 0.520, by: 0.055, bw: 0.075, bh: 0.100 , nx: 0.576, ny: 0.057 },
  'fornitore-pesce-genova':        { fx: 0.052, fy: 0.361, bx: 0.035, by: 0.330, bw: 0.085, bh: 0.070 , nx: 0.021, ny: 0.246 },
  'fornitore-pesce-la-spezia':     { fx: 0.299, fy: 0.606, bx: 0.283, by: 0.575, bw: 0.150, bh: 0.070, lc: 'sx' , nx: 0.075, ny: 0.711 },
  'fornitore-pesce-massa-carrara': { fx: 0.448, fy: 0.654, bx: 0.432, by: 0.623, bw: 0.120, bh: 0.070 , nx: 0.549, ny: 0.616 },
  'fornitore-pesce-versilia':      { fx: 0.520, fy: 0.808, bx: 0.504, by: 0.777, bw: 0.080, bh: 0.070, lc: 'sx' , nx: 0.256, ny: 0.863 },
  'fornitore-pesce-lucca':         { fx: 0.643, fy: 0.834, bx: 0.627, by: 0.803, bw: 0.140, bh: 0.070, nx: 0.600, ny: 0.739 },
  'fornitore-pesce-prato':         { fx: 0.800, fy: 0.824, bx: 0.784, by: 0.793, bw: 0.070, bh: 0.070 , nx: 0.763, ny: 0.588 },
  'fornitore-pesce-firenze':       { fx: 0.869, fy: 0.925, bx: 0.853, by: 0.894, bw: 0.078, bh: 0.070, lc: 'sx', nx: 0.60, ny: 0.880 },
};

/* ─ La finestrella sulla mappa ────────────
   Ogni card dell'indice e' un ritaglio della STESSA mappa della cornice
   grande, zoomato sulla zona: il pattern delle card-regione di Komoot e
   delle map card di Airbnb, ma con la carta di Mattias. Il ritaglio si
   calcola dai pin gia' misurati (PIN): il centro della finestra insegue il
   pin ma si ferma ai bordi dell'immagine, cosi' Genova (pin quasi sul
   margine sinistro) non mostra il vuoto oltre la carta — in quei casi e'
   il pin a spostarsi dal centro della card, non la carta a finire. */
const CARTA_AR = 941 / 1672;   /* proporzioni di assets/mappa-consegne.webp */
const FINESTRA_AR = 0.75;      /* la finestra e' 4:3 (aspect-ratio in zona.css) */
/* Zoom stretto apposta: nell'inquadratura deve starci UNA citta' — con
   l'inquadratura larga la finestra della Versilia mostrava anche Massa e
   Lucca e il punto si perdeva (Mattias, 2026-08-19). Quel che resta dei
   vicini ai bordi lo spegne il faro (--px/--py, usati da zona.css). */
const ZOOM = 4.6;

function finestrella(slug) {
  const p = PIN[slug];
  const zh = ZOOM * CARTA_AR;           /* altezza immagine, in larghezze-finestra */
  const va = zh / FINESTRA_AR;          /* fattore verticale in frazioni di finestra */
  const cx = Math.min(1 - 0.5 / ZOOM, Math.max(0.5 / ZOOM, p.fx));
  const cy = Math.min(1 - FINESTRA_AR / (2 * zh), Math.max(FINESTRA_AR / (2 * zh), p.fy));
  const pc = (n) => (n * 100).toFixed(1);
  return {
    img: `width:${ZOOM * 100}%;left:${pc(0.5 - cx * ZOOM)}%;top:${pc(0.5 - cy * va)}%`,
    mira: `--px:${pc(0.5 + (p.fx - cx) * ZOOM)}%;--py:${pc(0.5 + (p.fy - cy) * va)}%`,
  };
}

/* ─ L'indice delle zone: la mappa ────────────
   La pagina-madre di /consegna/: l'Italia disegnata in canvas, Massa come
   perno, gli archi animati verso le zone e le card che portano alle pagine.
   Si genera dalle stesse zone attive, cosi' mappa e card non possono
   scordarsi una zona a testa. */
function indice() {
  const attive = zone.filter((z) => z.attiva);

  const lista = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Zone di consegna DelMar',
    itemListElement: attive.map((z, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: z.nome,
      url: `${RADICE}/consegna/${z.slug}.html`,
    })),
  };

  return `${testa('Dove consegniamo', {
    cartella: 'consegna',
    css: ['zona.css'],
    simboli: ['wa', 'arr'],
    pagina: '',
    descrizione: 'Le zone di consegna DelMar: Versilia, Massa e Carrara, La Spezia, Lucca, Genova e Parma. Ogni giorno dalla costa toscana, entro le 11.',
    immagine: 'foto-prodotti/copertina-pescato.webp',
    jsonld: [lista],
  })}
    <section class="pr-hero">
      <canvas id="pr-sfondo"></canvas>
      <canvas id="pr-pesci"></canvas>
      <div class="pr-hero-in">
        <p class="pr-occhiello">Toscana · Liguria · Emilia</p>
        <h1 class="pr-titolo">Dove consegniamo<br /><em>ogni giorno, dalla costa toscana</em></h1>
        <p class="pr-sotto">
          Sei zone servite coi nostri furgoni refrigerati: dal magazzino di Massa alla Versilia,
          alla Spezia, a Lucca, a Genova e su per la Cisa fino a Parma.
        </p>
      </div>
    </section>

    <main class="pr-corpo">
      <!-- LA MAPPA. L'immagine (scelta da Mattias, con pin ed etichette
           gia' dentro) fa da fondo; la tela sopra disegna gli archi animati
           dal pin di Massa alle altre zone; le aree cliccabili invisibili
           stanno sopra le etichette e portano alle pagine. Le posizioni
           sono FRAZIONI dell'immagine (x,y su 1), cosi' reggono ogni
           misura di schermo. -->
      <div class="mp-scena">
        <div class="mp-guscio" id="mappa-guscio">
          <img src="../assets/mappa-consegne.webp" alt="La mappa delle zone di consegna DelMar fra Liguria, Toscana ed Emilia" width="1672" height="941" />
          <!-- Il velo color inchiostro: riporta i blu della mappa dentro la
               tavolozza del sito senza toccare l'immagine -->
          <div class="mp-tinta" aria-hidden="true"></div>
          <canvas id="mappa-linee"></canvas>
${attive.map((z) => {
    const p = PIN[z.slug];
    /* La cornice taglia con overflow, quindi una scheda che si apre verso
       un bordo esce a meta'. In alto esce verso il basso; ai lati si
       appoggia al pin invece di stargli centrata sopra — a schermo stretto
       la scheda e' larga quasi come mezza carta, e Genova a ponente e
       Firenze a levante la perdevano per strada */
    /* La soglia sta a meta' carta e non a un quarto: sul telefono la carta
       e' alta 210px e l'intestazione appiccicata ne copre i primi 64, e una
       scheda che si apre in su da un pin della meta' alta finisce dietro
       l'intestazione invece che fuori dalla cornice — invisibile lo stesso,
       ma senza che nessuna misura sulla carta lo dica */
    const giu = p.fy < 0.45 ? ' mp-area--giu' : '';
    const lato = p.bx < 0.15 ? ' mp-area--sx' : (p.bx + p.bw > 0.85 ? ' mp-area--dx' : '');
    return `          <a class="mp-area${giu}${lato}" href="${z.slug}.html" aria-label="Zona di consegna ${z.nome}" data-fx="${p.fx}" data-fy="${p.fy}" data-zona="${z.slug}" data-carta="${z.nome_carta || z.nome}" data-nx="${p.nx}" data-ny="${p.ny}" data-nome-lato="${p.lc || 'dx'}" style="left:${(p.bx * 100).toFixed(1)}%;top:${(p.by * 100).toFixed(1)}%;width:${(p.bw * 100).toFixed(1)}%;height:${(p.bh * 100).toFixed(1)}%">
            <span class="mp-tip"><strong>${z.nome}</strong><em>${z.giorni_brevi}</em></span>
          </a>`;
  }).join('\n')}
        </div>
        <!-- Solo sul telefono. Sul desktop il passaggio del dito sopra un
             pin apre gia' la sua scheda e si capisce da se' che la carta e'
             viva; sul telefono il passaggio non esiste, e senza una riga
             che lo dica i pin sembrano disegnati -->
        <p class="mp-guida">Tocca una zona sulla carta, o scegli qui sotto</p>
      </div>

      <!-- La CTA subito dopo la mappa, non solo in fondo: chi ha appena
           visto che il furgone arriva da lui non deve scorrere tutta la
           pagina per scrivere. Stesso blocco delle pagine di zona. -->
      <div class="pr-cta">
        <a href="https://wa.me/${WA}?text=${encodeURIComponent('Ciao Marina! Vorrei sapere se consegnate nella mia zona.')}" target="_blank" rel="noopener noreferrer" class="pr-btn pr-btn-wa">
          <svg aria-hidden="true"><use href="#ico-wa"/></svg>
          Contattaci su WhatsApp
        </a>
        <a href="../catalogo/prodotti.html" class="pr-btn pr-btn-scuro">
          Guarda il catalogo
          <svg class="arr" aria-hidden="true"><use href="#ico-arr"/></svg>
        </a>
      </div>

      <div class="pr-intro zn-carte-testa">
        <h2>Scegli la tua zona</h2>
        <p>Ogni zona ha la sua pagina, coi giorni del giro e i comuni serviti.</p>
      </div>

      <!-- OGNI CARD E' UNA FINESTRA SULLA MAPPA, zoomata sulla sua zona:
           stessa immagine, stessa tinta, stesso pin corallo della cornice
           grande — il pattern delle map card di Airbnb/Komoot. Le versioni
           precedenti sono state bocciate una per una: schede grigie
           ("da gestionale"), foto di prodotto ("nn è un catalogo, qui serve
           grafica"), lastre blu piene ("un cazzotto in un occhio"), card
           bianche con la rotta SVG ("invisibili"). (Mattias, 2026-08-19) -->
      <div class="zn-zone">
${attive.map((z) => {
    const f = finestrella(z.slug);
    return `        <a class="zn-zona" href="${z.slug}.html" data-zona="${z.slug}">
          <div class="zn-zona-finestra" style="${f.mira}">
            <div class="zn-zona-lente">
              <img src="../assets/mappa-consegne.webp" alt="" style="${f.img}" loading="lazy" />
              <div class="zn-zona-velo" aria-hidden="true">
                <img src="../assets/mappa-consegne.webp" alt="" style="${f.img}" loading="lazy" />
              </div>
              <span class="zn-zona-pin" aria-hidden="true"></span>
            </div>
            <div class="zn-zona-tinta" aria-hidden="true"></div>
            <div class="zn-zona-faro" aria-hidden="true"></div>
          </div>
          <div class="zn-zona-testo">
            <span class="zn-zona-giorni">${z.giorni_brevi}</span>
            <h3>${z.nome}</h3>
            <p>${z.breve}</p>
          </div>
        </a>`;
  }).join('\n\n')}
      </div>

      <section class="pr-chiusura">
        <canvas class="pr-chiusura-fondo" aria-hidden="true"></canvas>
        <p class="pr-chiusura-occhiello">Consulenza gratuita per il tuo locale</p>
        <h2>Non trovi la tua zona?<br />Chiedici se ci arriviamo</h2>
        <p class="pr-chiusura-testo">I giri crescono ogni stagione: scrivici dov'è il tuo locale e ti diciamo subito se e quando possiamo servirti.</p>
        <div class="pr-chiusura-azioni">
          <a href="https://wa.me/${WA}?text=${encodeURIComponent('Ciao, vorrei sapere se consegnate nella mia zona')}" target="_blank" rel="noopener noreferrer" class="pr-btn pr-btn-wa">
            <svg aria-hidden="true"><use href="#ico-wa"/></svg>
            Contattaci su WhatsApp
          </a>
        </div>
        <p class="pr-chiusura-tel">Rispondiamo tutti i giorni, festivi compresi</p>
      </section>
    </main>
${piede(['../js/caustiche.js?v=1', '../js/pesci.js?v=11', '../js/consenso.js?v=1', '../js/tag.js?v=2', '../js/analitica.js?v=2', '../catalogo/js/d.js?v=1', 'js/mappa.js?v=13', '../js/cursore.js?v=2'], { cat: '../catalogo/' })}`;
}

let n = 0;
for (const z of zone) {
  /* Le zone spente restano nel JSON coi dati pronti, ma la pagina non
     si genera (e se esiste da un giro precedente, si toglie): pubblicare
     una zona e' una decisione, non un effetto collaterale */
  const file = path.join(qui, `${z.slug}.html`);
  if (!z.attiva) {
    if (fs.existsSync(file)) { fs.unlinkSync(file); console.log(`  ${z.slug}.html — zona spenta, pagina rimossa`); }
    continue;
  }
  fs.writeFileSync(file, pagina(z));
  n++;
  console.log(`  ${z.slug}.html — ${z.comuni.length} comuni, ${z.strisce.length} strisce`);
}
fs.writeFileSync(path.join(qui, 'index.html'), indice());
console.log(`${n} pagine di zona generate + indice con mappa`);
