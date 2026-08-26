/* PRENDE LE FOTO SCELTE, LE OTTIMIZZA E LE ATTACCA AL CATALOGO.
   Uso:  1. apri scelta-foto.html, scegli una foto per prodotto
         2. copia il JSON e salvalo in catalogo/scelte.json
         3. node assegna-foto.js

   Fa tre cose che vanno insieme e che sarebbe un errore separare:

   · RIDIMENSIONA. Le candidate scaricate sono miniature da 1400 px e pesano
     mezzo mega l'una: 47 foto cosi' sono 25 MB di pagina. Il ritaglio 4:3 a
     900 px in WebP scende sotto i 90 KB, ed e' la stessa cura che abbiamo
     gia' dovuto fare a mano su logo e facciata.
   · SCRIVE I CREDITI. Ogni foto in licenza libera ha un autore da citare.
     crediti-usati.json tiene autore, licenza e indirizzo di ogni foto
     PUBBLICATA: senza, l'attribuzione va ricostruita a mano quando serve, che
     e' esattamente il momento in cui non si ha tempo.
   · AGGIORNA catalogo.json, cosi' il generatore le trova al giro dopo.
*/
const fs = require('fs');
const path = require('path');

const qui = __dirname;
const DENTRO = path.join(qui, 'foto-trovate');
const MIE = path.join(qui, 'foto-mie');
const FUORI = path.join(qui, 'foto-prodotti');
const LARGO = 900;
const QUALITA = 80;

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Manca sharp. Dalla radice del sito:  npm install sharp');
  process.exit(1);
}

let scelte = {};
try {
  scelte = JSON.parse(fs.readFileSync(path.join(qui, 'scelte.json'), 'utf8'));
} catch (e) { /* niente scelte a mano: con --prima si parte lo stesso */ }

/* --prima RIEMPIE I BUCHI con la prima candidata.
   Aspettare quarantasette scelte a mano prima di vedere una sola foto in
   pagina significa non vederle mai: il catalogo resta un elenco di testo
   finche' qualcuno non trova un'ora libera. Cosi' invece parte gia' completo,
   e il foglio di scelta serve a MIGLIORARE una foto alla volta invece che a
   cominciare da zero. Le scelte fatte a mano vincono sempre sulla prima. */
if (process.argv.includes('--prima')) {
  let riempiti = 0;

  /* MAI LO STESSO SCATTO SU DUE PRODOTTI.
     Una foto di banco generica — "Fishmarket, Bergen" — cita nel titolo mezza
     pescheria, quindi vince il punteggio su orata, spigola E cozze insieme.
     Tre voci con la stessa identica immagine sono la cosa che fa capire a
     colpo d'occhio che il catalogo e' finto. Chi arriva dopo prende la sua
     seconda scelta, che e' sempre meglio di un doppione. */
  const usate = new Set(Object.values(scelte).filter(Boolean).map((p) => path.basename(p)));

  for (const cartella of fs.readdirSync(DENTRO)) {
    if (scelte[cartella]) continue;
    try {
      const c = JSON.parse(fs.readFileSync(path.join(DENTRO, cartella, 'crediti.json'), 'utf8'));
      const libera = (c.candidati || []).find((x) => !usate.has(x.titolo)) || (c.candidati || [])[0];
      if (libera) {
        scelte[cartella] = `foto-trovate/${cartella}/${libera.file}`;
        usate.add(libera.titolo);
        riempiti++;
      }
    } catch (e) { /* cartella senza crediti: la voce resta senza foto */ }
  }
  console.log(`--prima: riempiti ${riempiti} prodotti che non avevano una scelta a mano\n`);
}

/* LE FOTO DI CASA VINCONO SU TUTTO.
   foto-mie/ tiene gli originali che manda Mattias: sono foto DelMar, e una
   foto DelMar batte sempre la migliore candidata trovata su Commons. Il nome
   del file E' lo slug del prodotto — foto-mie/copertina-fresco.jpg diventa
   foto-prodotti/copertina-fresco.webp — cosi' aggiungerne una e' copiare un
   file, senza toccare ne' questo script ne' il catalogo.

   Sta qui in fondo, dopo scelte.json e dopo --prima, perche' e' l'ultima
   parola. E sta in una cartella versionata apposta: scelte.json e
   foto-trovate/ sono gitignorati, quindi una foto messa li' sparirebbe al
   primo giro su un'altra macchina, o al primo assegna-foto.js senza scelte. */
const mie = new Set();
if (fs.existsSync(MIE)) {
  for (const file of fs.readdirSync(MIE)) {
    const slug = file.replace(/\.[^.]+$/, '');
    if (slug === file) continue;
    scelte[slug] = `foto-mie/${file}`;
    mie.add(slug);
  }
  if (mie.size) console.log(`foto-mie: ${mie.size} foto di casa, hanno la precedenza\n`);
}

if (!Object.keys(scelte).length) {
  console.error('Nessuna scelta. Apri scelta-foto.html e scegli, oppure lancia con --prima.');
  process.exit(1);
}

const catalogoFile = path.join(qui, 'catalogo.json');
const dati = JSON.parse(fs.readFileSync(catalogoFile, 'utf8'));

/* Stessa forma di trova-foto.js, e per la stessa ragione: la classe di
   caratteri scritta coi diacritici veri mangiava la lettera accentata */
function senzaAccenti(s) {
  return s.normalize('NFD').split('').filter((ch) => {
    const c = ch.charCodeAt(0);
    return c < 0x0300 || c > 0x036f;
  }).join('');
}

const slugDi = (n) => senzaAccenti(n.toLowerCase())
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/* I crediti stanno nel crediti.json che trova-foto.js ha lasciato accanto
   alle candidate: si ripesca quello della foto scelta e basta */
function creditoDi(slug, file) {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(DENTRO, slug, 'crediti.json'), 'utf8'));
    return (c.candidati || []).find((x) => x.file === file) || null;
  } catch (e) {
    return null;
  }
}

(async () => {
  fs.mkdirSync(FUORI, { recursive: true });

  const crediti = [];
  let fatte = 0;
  let saltate = 0;

  for (const [slug, percorso] of Object.entries(scelte)) {
    if (!percorso) { saltate++; continue; }

    const sorgente = path.join(qui, percorso);
    if (!fs.existsSync(sorgente)) {
      console.log(`  ! ${slug}: la foto scelta non c'e' piu' (${percorso})`);
      saltate++;
      continue;
    }

    const destinazione = path.join(FUORI, `${slug}.webp`);
    await sharp(sorgente)
      .resize(LARGO, Math.round(LARGO * 3 / 4), { fit: 'cover', position: 'attention' })
      .webp({ quality: QUALITA })
      .toFile(destinazione);

    const peso = fs.statSync(destinazione).size;
    /* Le foto di casa non hanno attribuzione da citare: sono nostre. Senza
       questo ramo finirebbero fra i "crediti non trovati", che e' la stessa
       riga di una foto libera di cui abbiamo perso l'autore — e sono due
       problemi opposti da tenere distinti quando si scrive la pagina crediti. */
    const c = mie.has(slug) ? null : creditoDi(slug, path.basename(percorso));
    if (c) crediti.push({ prodotto: slug, foto: `foto-prodotti/${slug}.webp`, autore: c.autore, licenza: c.licenza, fonte: c.fonte, originale: c.pagina });

    const nota = mie.has(slug) ? 'foto DelMar' : (c ? c.licenza : 'crediti non trovati');
    console.log(`  · ${slug.padEnd(34)} ${Math.round(peso / 1024)} KB   ${nota}`);
    fatte++;
  }

/* L'ALBERATURA E' CAMBIATA (26/08/2026): catalogo.json non ha piu' `cataloghi`
   con dentro `famiglie`, ma `mondi` con dentro `cluster` con dentro
   `sottocluster`. Questi due script leggevano la forma vecchia e morivano con
   "Cannot read properties of undefined": il rifornimento delle fotografie era
   fermo e non lo diceva nessuno.
   Qui si appiattisce una volta sola, cosi' il resto dello script resta com'era. */
function cataloghiPiatti(dati) {
  if (dati.cataloghi) return dati.cataloghi;            // vecchio formato, per sicurezza
  /* Si restituisce il cluster VERO, non una copia: assegna-foto.js scrive
     `c.foto`, e con uno spread finirebbe su un oggetto usa-e-getta — la
     copertina non arriverebbe mai dentro catalogo.json. L'alias `famiglie`
     e' non enumerabile, cosi' non si duplica nel file quando si riserializza. */
  return dati.mondi.flatMap((m) => m.cluster.map((c) => {
    if (!c.famiglie) {
      Object.defineProperty(c, 'famiglie', { value: c.sottocluster, enumerable: false });
    }
    return c;
  }));
}

  // Attacca le foto alle voci E alle copertine di categoria
  let attaccate = 0;
  cataloghiPiatti(dati).forEach((c) => {
    const sc = 'copertina-' + c.slug.replace(/^catalogo-/, '');
    if (scelte[sc]) {
      c.foto = `foto-prodotti/${sc}.webp`;
      attaccate++;
    }

    c.famiglie.forEach((f) => f.voci.forEach((v) => {
      const s = slugDi(v.nome);
      if (scelte[s]) {
        v.foto = `foto-prodotti/${s}.webp`;
        attaccate++;
      }
    }));
  });

  fs.writeFileSync(catalogoFile, JSON.stringify(dati, null, 2) + '\n');
  fs.writeFileSync(path.join(qui, 'crediti-usati.json'), JSON.stringify(crediti, null, 2) + '\n');

  const pesoTotale = fs.readdirSync(FUORI)
    .reduce((s, f) => s + fs.statSync(path.join(FUORI, f)).size, 0);

  console.log(`\n${fatte} foto ottimizzate, ${attaccate} attaccate al catalogo${saltate ? `, ${saltate} saltate` : ''}`);
  console.log(`Peso totale: ${(pesoTotale / 1024 / 1024).toFixed(1)} MB`);
  console.log('Crediti in crediti-usati.json — vanno in una pagina del sito prima di pubblicare.');
  console.log('Ora: node genera-catalogo.js');
})();
