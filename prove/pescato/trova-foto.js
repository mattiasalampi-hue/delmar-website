/* CERCA LE FOTOGRAFIE DEI PRODOTTI E LE SCARICA DA VALUTARE.
   Uso:  node trova-foto.js            tutte le voci senza foto
         node trova-foto.js orata      solo le voci che contengono "orata"
         node trova-foto.js --tutte    anche quelle che una foto ce l'hanno gia'

   ─────────────────────────────────────────────────────────────────────────
   PERCHE' NON PESCA "DA GOOGLE"

   Prendere la prima immagine che esce da una ricerca significa pubblicare la
   fotografia di qualcun altro su un sito commerciale. Non e' una sottigliezza
   da avvocati: le foto di pesce che stanno in cima ai risultati sono quasi
   tutte di banche immagini che quel mestiere lo fanno apposta, e mandano
   richieste di danni automatiche a chi le usa senza licenza.

   Quindi lo script pesca solo dove la licenza e' esplicita e verificabile:

     · Wikimedia Commons — quasi ogni specie ittica ha una scheda con foto in
       pubblico dominio o Creative Commons. E' la fonte migliore per il PESCE:
       le foto sono spesso scientifiche e l'esemplare e' quello giusto.
     · Openverse — l'indice di Wikimedia che raccoglie il Creative Commons di
       Flickr e altri. Copre meglio il PIATTO e il prodotto lavorato.

   Nessuna delle due chiede una chiave. Per ogni file scaricato lo script
   scrive autore, licenza e indirizzo originale in crediti.json: se una foto
   finisce online, l'attribuzione e' gia' pronta.

   ─────────────────────────────────────────────────────────────────────────
   COSA NON PUO' FARE

   Una foto in licenza libera di un'orata e' un'orata viva in acqua o un
   esemplare su un tavolo di laboratorio. NON e' una cassa di orate in
   ghiaccio col logo DelMar sopra, e su un sito costruito su fotografie
   proprie la differenza si vede. Questo script serve a partire con
   qualcosa di dignitoso su tutte le voci, non a chiudere la questione:
   le foto buone restano quelle che fate voi.
*/
const fs = require('fs');
const path = require('path');

const qui = __dirname;
const CARTELLA = path.join(qui, 'foto-trovate');
const QUANTE = 4;           // candidate per prodotto: poche, ma da scegliere
const LATO_MINIMO = 640;    // sotto, non regge nemmeno una miniatura
const UA = 'DelMar-catalogo/1.0 (https://del-mar.it; info@del-mar.it)';

const dati = JSON.parse(fs.readFileSync(path.join(qui, 'catalogo.json'), 'utf8'));

/* ─────────────────────────────────────────────────────────────────────────
   COSA RENDE BUONA UNA FOTO, DETTO AL COMPUTER

   Il primo giro cercava per nome scientifico — "Sparus aurata" — e ha
   riportato quarantasette orate VIVE: sott'acqua, sul fondale, sul tavolo di
   un museo di scienze naturali. Tecnicamente esatte, commercialmente inutili:
   un ristoratore non compra il pesce che nuota, compra la cassa.

   La ricerca da sola non basta a distinguerli, perche' le due cose escono
   dalle stesse parole. Serve leggere il TITOLO di ogni candidata e pesarlo:
   "Fish market Palermo" vale, "Diving in the Red Sea" no. E' grossolano, ma
   su archivi dove il titolo lo scrive chi ha scattato funziona bene.
   (Mattias, 2026-08-16 — dopo aver visto una spigola nera sul fondale
   finire in catalogo) */
const BUONE = [
  'market', 'mercato', 'marche', 'mercado', 'markt', 'bazaar',
  'fishmonger', 'pescheria', 'poissonnerie', 'peixateria', 'pescaderia',
  'stall', 'counter', 'display', 'shop', 'store', 'banco', 'vendor',
  'ice', 'ghiaccio', 'crate', 'cassa', 'box', 'tray', 'basket', 'catch',
  'fresh', 'fresco', 'seafood', 'fish market', 'harbour', 'harbor', 'quay',
  'plate', 'plated', 'dish', 'served', 'restaurant', 'cuisine', 'recipe',
];

const CATTIVE = [
  'underwater', 'diving', 'diver', 'scuba', 'reef', 'aquarium', 'aquaria',
  'tank', 'seabed', 'sea floor', 'wild', 'habitat', 'swimming', 'snorkel',
  'illustration', 'drawing', 'engraving', 'lithograph', 'painting', 'plate ',
  'sketch', 'diagram', 'anatomy', 'skeleton', 'bones', 'fossil', 'stamp',
  'museum', 'mhnt', 'specimen', 'collection', 'naturalis', 'zoological',
  'larva', 'juvenile', 'egg', 'fry', 'map', 'distribution', 'chart',
  'book', 'plates', 'histoire', 'iconographia', 'index of british',
];

/* IL SOGGETTO E' OBBLIGATORIO, IL CONTESTO ORDINA.
   Premiare solo il contesto ha prodotto il difetto opposto a quello di prima:
   salmone, gambero argentino e filetti di triglia si erano presi TUTTI E TRE
   la stessa foto, «Fish stall, Borough Market» — un banco vero, con dentro il
   pesce sbagliato. Una foto di mercato generica e' inservibile quanto un
   esemplare da museo: la prima non dice quale pesce, il secondo non dice
   quale prodotto.
   Quindi il soggetto vale il triplo del contesto, e le candidate che non lo
   nominano affatto vengono scartate finche' ne esiste almeno una che lo
   nomina. (Mattias, 2026-08-16) */

/* Parole che compaiono nelle chiavi di ricerca ma NON identificano il
   prodotto: sono il contesto che si e' chiesto, non la cosa cercata */
const GENERICHE = new Set([
  'fish', 'seafood', 'fishmonger', 'market', 'markets', 'marche', 'mercato',
  'mercado', 'markt', 'stall', 'stalls', 'etal', 'counter', 'display', 'shop',
  'store', 'banco', 'vendor', 'ice', 'fresh', 'fresca', 'fresco', 'sea',
  'on', 'at', 'in', 'the', 'of', 'and', 'a', 'tray', 'bowl', 'basket',
  'crate', 'box', 'bag', 'plate', 'plated', 'dish', 'served', 'restaurant',
  'cuisine', 'recipe', 'bakery', 'pastry', 'dessert', 'food', 'pescheria',
  'poissonnerie', 'whole', 'cooked', 'frozen', 'sliced', 'slice', 'filled',
  'pasticceria', 'vetrina', 'dolce', 'dolci', 'italian', 'romana', 'close',
  'up', 'variety', 'kinds', 'many', 'warehouse', 'storage', 'cold', 'case',
]);

/* Le parole che identificano DAVVERO il prodotto, ricavate dalle chiavi:
   "gilthead bream fish market" + "orata pescheria" -> gilthead, bream, orata */
function paroleSoggetto(chiavi) {
  const p = new Set();
  chiavi.join(' ').toLowerCase().split(/[^a-zàèéìòù]+/)
    .filter((w) => w.length > 2 && !GENERICHE.has(w))
    .forEach((w) => p.add(w));
  return [...p];
}

/* Restituisce {punti, soggetto} invece di scrivere dentro la candidata: la
   versione che mutava l'oggetto perdeva il flag, perche' `{...c, punti: f(c)}`
   copia c PRIMA di chiamare f, e f scriveva sull'originale gia' copiato.
   Risultato: nessuna candidata risultava mai centrata, e il filtro che doveva
   salvarci si spegneva da solo restando invisibile. */
function valuta(c, soggetto) {
  const t = (c.titolo + ' ' + (c.autore || '')).toLowerCase();

  const centri = soggetto.filter((w) => t.includes(w)).length;
  let p = Math.min(centri, 2) * 6;

  BUONE.forEach((w) => { if (t.includes(w)) p += 2; });
  CATTIVE.forEach((w) => { if (t.includes(w)) p -= 4; });

  return { punti: p, soggetto: centri > 0 };
}

/* Il range dei segni diacritici va scritto ESCAPED, non coi caratteri veri.
   Scritto letterale, "Monoporzione tiramisù" usciva "monoporzione-tiramisa" e
   "Soufflé" usciva "souffla": la classe mangiava la lettera invece
   dell'accento. Sono nomi di file, e un nome di file sbagliato non da'
   errore — da' una foto che non si trova. (Mattias, 2026-08-16) */
/* NIENTE CLASSE DI CARATTERI per togliere gli accenti: scritta coi segni
   diacritici veri dentro le parentesi quadre mangiava la lettera invece
   dell'accento, e "Monoporzione tiramisù" diventava "monoporzione-tiramisa",
   "Soufflé" diventava "souffla". Sono nomi di file: sbagliarli non da' un
   errore, da' una foto che non si trova mai. Qui si filtra per codice, che
   non si puo' sbagliare a copiare. (Mattias, 2026-08-16) */
function senzaAccenti(s) {
  return s.normalize('NFD').split('').filter((ch) => {
    const c = ch.charCodeAt(0);
    return c < 0x0300 || c > 0x036f;
  }).join('');
}

const slugDi = (n) => senzaAccenti(n.toLowerCase())
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/* Tutti i soggetti da fotografare: le voci dei tre cataloghi PIU' le
   copertine di categoria. Le copertine passano dalla stessa macchina invece
   di essere scelte a mano da assets/ — sono quattro immagini che devono
   reggere il confronto con le altre quarantasette, e non c'e' ragione di
   trattarle come un caso a parte. Il prefisso "copertina-" le tiene separate
   nelle cartelle senza bisogno di un secondo indice. */
const voci = [];

dati.cataloghi.forEach((c) => {
  voci.push({
    copertina: true,
    catalogo: c.nome,
    famiglia: 'Copertina della categoria',
    nome: `Copertina · ${c.titolo}`,
    cerca: c.cerca || c.titolo,
    foto: (c.foto && c.foto.startsWith('foto-prodotti/')) ? c.foto : null,
    slug: 'copertina-' + c.slug.replace(/^catalogo-/, ''),
  });

  c.famiglie.forEach((f) => {
    f.voci.forEach((v) => {
      voci.push({
        catalogo: c.nome,
        famiglia: f.nome,
        nome: v.nome,
        cerca: v.cerca || v.nome,
        foto: v.foto || null,
        slug: slugDi(v.nome),
      });
    });
  });
});

const args = process.argv.slice(2);
const tutte = args.includes('--tutte');
const filtro = args.filter((a) => !a.startsWith('--')).join(' ').toLowerCase();

/* Quante candidate ci sono gia' scaricate per questa voce. Serve per non
   ripetere il giro buono: dopo un 429 si rilancia e si ripescano SOLO i
   prodotti rimasti a mani vuote, senza rifare da capo i quaranta riusciti */
function giaPrese(slug) {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(CARTELLA, slug, 'crediti.json'), 'utf8'));
    return (c.candidati || []).length;
  } catch (e) {
    return 0;
  }
}

let lavoro = voci;
if (filtro) lavoro = lavoro.filter((v) => (v.nome + ' ' + v.famiglia).toLowerCase().includes(filtro));
if (!tutte) lavoro = lavoro.filter((v) => !v.foto && !giaPrese(v.slug));

/* ─ Wikimedia Commons ───────────────────────
   Due passaggi: la ricerca da' i titoli dei file, imageinfo da' l'indirizzo
   della miniatura grande e i metadati della licenza. Si chiede una miniatura
   da 1400 px invece dell'originale: gli originali su Commons arrivano
   tranquillamente a 40 MB e a noi ne servono meno di 200 KB. */
async function commons(query, quante) {
  const cerca = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', origin: '*',
    generator: 'search',
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: '6',
    gsrlimit: String(quante * 4),
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata|mime',
    iiurlwidth: '1400',
  });

  const r = await fetch(cerca, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('Commons ha risposto ' + r.status);
  const j = await r.json();
  const pagine = (j.query && j.query.pages) ? Object.values(j.query.pages) : [];

  return pagine.map((p) => {
    const i = p.imageinfo && p.imageinfo[0];
    if (!i || !/^image\/(jpeg|png)$/.test(i.mime || '')) return null;
    if (Math.min(i.width, i.height) < LATO_MINIMO) return null;

    const m = i.extmetadata || {};
    const pulisci = (s) => String(s || '').replace(/<[^>]*>/g, '').trim();
    return {
      fonte: 'Wikimedia Commons',
      titolo: p.title.replace(/^File:/, ''),
      url: i.thumburl || i.url,
      pagina: i.descriptionurl,
      autore: pulisci(m.Artist && m.Artist.value) || 'ignoto',
      licenza: pulisci(m.LicenseShortName && m.LicenseShortName.value) || 'da verificare',
      misura: i.width + '×' + i.height,
    };
  }).filter(Boolean);
}

/* ─ Openverse ───────────────────────────────
   Copre quello che a Commons manca: il prodotto cucinato, il piatto, il
   confezionato. Filtra gia' per licenza commerciale, che e' l'unica che ci
   interessa — le CC "non commerciale" su un sito d'azienda non si possono
   usare, ed e' proprio il caso di un grossista. */
async function openverse(query, quante) {
  const cerca = 'https://api.openverse.org/v1/images/?' + new URLSearchParams({
    q: query,
    license_type: 'commercial,modification',
    size: 'medium,large',
    mature: 'false',
    page_size: String(quante * 3),
  });

  const r = await fetch(cerca, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('Openverse ha risposto ' + r.status);
  const j = await r.json();

  return (j.results || []).map((o) => ({
    fonte: 'Openverse',
    titolo: o.title || o.id,
    url: o.url,
    pagina: o.foreign_landing_url,
    autore: o.creator || 'ignoto',
    licenza: (o.license || '').toUpperCase() + ' ' + (o.license_version || ''),
    misura: (o.width && o.height) ? o.width + '×' + o.height : '?',
  }));
}

const dormi = (ms) => new Promise((r) => setTimeout(r, ms));

/* IL SERVER DELLE MINIATURE DI WIKIMEDIA CHIUDE LA PORTA se lo si tempesta.
   Il primo giro ha scaricato 47 prodotti per 4 foto in fila senza respiro e
   ha preso 429 su trenta prodotti su quarantasette — non "nessuna foto
   trovata", ma "trovate e rifiutate al ritiro", che dal registro sembrano la
   stessa cosa e non lo sono affatto.
   Mezzo secondo fra una richiesta e l'altra, e tre tentativi con l'attesa che
   raddoppia. Un giro completo diventa un paio di minuti: e' un lavoro che si
   fa una volta, il tempo non e' il vincolo. (Mattias, 2026-08-16) */
async function scarica(url, dove) {
  let attesa = 1200;

  for (let tentativo = 1; tentativo <= 3; tentativo++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });

    if (r.status === 429 || r.status === 503) {
      // Se il server dice quanto aspettare, si ascolta lui invece di indovinare
      const detto = parseInt(r.headers.get('retry-after') || '', 10);
      await dormi(detto > 0 ? Math.min(detto * 1000, 15000) : attesa);
      attesa *= 2;
      continue;
    }
    if (!r.ok) throw new Error('scaricamento ' + r.status);

    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 8000) throw new Error('file troppo piccolo, probabilmente un errore travestito');
    fs.writeFileSync(dove, buf);
    return buf.length;
  }

  throw new Error('scaricamento 429 anche dopo tre tentativi');
}

async function perVoce(v) {
  const cartella = path.join(CARTELLA, v.slug);
  fs.mkdirSync(cartella, { recursive: true });

  let candidati = [];
  const problemi = [];

  /* PIU' CHIAVI, NON UNA. "sea bream" da' il pesce vivo, "sea bream fish
     market" da' il banco, "orata pescheria" da' il banco italiano — e sono
     tre bacini di foto diversi. Si pescano tutte e tre e poi si sceglie col
     punteggio, invece di sperare che la prima chiave sia quella giusta.
     Openverse per primo: raccoglie Flickr, dove le foto di mercato le
     scattano i turisti a migliaia. Commons e' bravo sulle specie, non sui
     banchi. */
  const chiavi = Array.isArray(v.cerca) ? v.cerca : [v.cerca];

  for (const chiave of chiavi) {
    for (const [nome, fn] of [['Openverse', openverse], ['Commons', commons]]) {
      try {
        candidati = candidati.concat(await fn(chiave, QUANTE));
      } catch (e) {
        problemi.push(`${nome} «${chiave}»: ${e.message}`);
      }
      await dormi(250);
    }
  }

  /* Lo stesso scatto ricircola fra Commons e Openverse, e fra una chiave e
     l'altra: senza questo si scaricano quattro copie della stessa foto e la
     scelta non e' una scelta */
  const visti = new Set();
  candidati = candidati.filter((c) => {
    const chiave = c.titolo.toLowerCase().replace(/\.\w+$/, '');
    if (visti.has(chiave)) return false;
    visti.add(chiave);
    return true;
  });

  const soggetto = paroleSoggetto(chiavi);
  candidati = candidati.map((c) => ({ ...c, ...valuta(c, soggetto) }));

  /* Chi non nomina il soggetto esce, ma solo se resta qualcuno: per il brosme
     o il pasticciotto leccese una foto generica e' meglio del riquadro vuoto,
     e nel foglio di scelta si vede dal punteggio che e' un ripiego */
  const centrate = candidati.filter((c) => c.soggetto);
  if (centrate.length) {
    candidati = centrate;
  } else {
    problemi.push('nessuna candidata nomina il soggetto: sono foto di contesto, da sostituire');
  }

  candidati = candidati.sort((a, b) => b.punti - a.punti).slice(0, QUANTE);

  const presi = [];
  for (let i = 0; i < candidati.length; i++) {
    const c = candidati[i];
    const est = (c.url.match(/\.(jpe?g|png)(\?|$)/i) || [, 'jpg'])[1].toLowerCase();
    const file = `${i + 1}.${est === 'jpeg' ? 'jpg' : est}`;
    try {
      const peso = await scarica(c.url, path.join(cartella, file));
      presi.push({ ...c, file, peso });
    } catch (e) {
      problemi.push(`${c.titolo}: ${e.message}`);
    }
    await dormi(500);
  }

  fs.writeFileSync(
    path.join(cartella, 'crediti.json'),
    JSON.stringify({ voce: v.nome, cercato: v.cerca, candidati: presi, problemi }, null, 2)
  );

  return { ...v, candidati: presi, problemi };
}

/* ─ Il foglio di scelta ─────────────────────
   Le candidate vanno GUARDATE, non lette in un elenco di file. Una pagina
   sola con tutto affiancato: si scorre, si clicca quella giusta, e il
   riquadro scrive la riga da incollare in catalogo.json. Nessun database,
   nessun pannello: e' un lavoro che si fa una volta. */
function foglio(risultati) {
  const blocchi = risultati.map((r) => {
    const foto = r.candidati.length
      ? r.candidati.map((c) => `        <label class="sc">
          <input type="radio" name="${r.slug}" value="foto-trovate/${r.slug}/${c.file}" />
          <img src="foto-trovate/${r.slug}/${c.file}" alt="" loading="lazy" />
          <span class="meta">${c.titolo.slice(0, 52)}<br />${c.licenza} · ${c.misura} · ${Math.round(c.peso / 1024)} KB · punti ${c.punti}</span>
        </label>`).join('\n')
      : `        <p class="niente">Nessuna candidata${r.problemi.length ? ' — ' + r.problemi[0] : ''}. Cambia il campo "cerca" in catalogo.json e rilancia.</p>`;

    return `      <section class="voce" data-slug="${r.slug}">
        <h2>${r.nome} <small>${r.catalogo} · ${r.famiglia} · cercato «${r.cerca}»</small></h2>
        <div class="scelte">
${foto}
        </div>
      </section>`;
  }).join('\n\n');

  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Scelta foto prodotti</title>
    <meta name="robots" content="noindex" />
    <link rel="stylesheet" href="css/scelta.css?v=1" />
  </head>
  <body>
    <header class="testa">
      <h1>Scelta delle foto</h1>
      <p>Clicca la foto giusta per ogni prodotto. In fondo trovi il pezzo di
      catalogo.json da incollare — oppure lancia <code>node assegna-foto.js</code>
      dopo aver salvato le scelte.</p>
      <p class="conteggio"><strong>${risultati.length}</strong> prodotti · <strong id="fatti">0</strong> scelti</p>
    </header>

${blocchi}

    <section class="esito">
      <h2>Le scelte</h2>
      <button type="button" id="copia">Copia negli appunti</button>
      <pre id="uscita">Nessuna scelta ancora.</pre>
    </section>

    <script src="js/scelta.js?v=1"></script>
  </body>
</html>
`;
}

(async () => {
  if (!lavoro.length) {
    console.log('Niente da cercare. Con --tutte rifa\' anche le voci che una foto ce l\'hanno.');
    return;
  }

  console.log(`${lavoro.length} prodotti da cercare, ${QUANTE} candidate ciascuno.\n`);
  fs.mkdirSync(CARTELLA, { recursive: true });

  for (const v of lavoro) {
    const r = await perVoce(v);
    const stato = r.candidati.length ? `${r.candidati.length} candidate` : 'NESSUNA';
    console.log(`  ${r.candidati.length ? '·' : '!'} ${v.nome.padEnd(34)} ${stato}${r.problemi.length ? '  (' + r.problemi[0].slice(0, 50) + ')' : ''}`);
  }

  /* Il foglio di scelta copre SEMPRE tutte le voci, non solo quelle di questo
     giro: rilanciando per i quattro prodotti mancanti non si deve perdere la
     pagina con gli altri quarantatre */
  const risultati = voci.map((v) => {
    let salvato = { candidati: [], problemi: [] };
    try {
      salvato = JSON.parse(fs.readFileSync(path.join(CARTELLA, v.slug, 'crediti.json'), 'utf8'));
    } catch (e) { /* mai cercata: resta vuota, e nel foglio si vede */ }
    return { ...v, candidati: salvato.candidati || [], problemi: salvato.problemi || [] };
  });

  fs.writeFileSync(path.join(qui, 'scelta-foto.html'), foglio(risultati));

  const vuote = risultati.filter((r) => !r.candidati.length);
  console.log(`\nFoglio di scelta: prove/pescato/scelta-foto.html`);
  if (vuote.length) {
    console.log(`Senza candidate (${vuote.length}): ${vuote.map((v) => v.nome).join(', ')}`);
  }
})();
