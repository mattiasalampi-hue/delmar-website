/* GENERA LE FOTOGRAFIE DEL CATALOGO: LE COPERTINE DEI CLUSTER E LE VOCI.
   Uso:  node genera-foto.js                       i cluster senza copertina
         node genera-foto.js patate                la copertina di "patate e fritti"
         node genera-foto.js --voci cefalopodi     una foto per ogni voce del cluster
         node genera-foto.js --voci cefalopodi anelli   solo le voci che contengono "anelli"
         node genera-foto.js --mancanti            tutte le voci del catalogo ancora senza foto
         node genera-foto.js --mancanti dolci      solo quelle dei cluster che contengono "dolci"
         ... --prompt                              stampa i prompt, non genera e non spende
         ... --varianti 4                          quante proposte per foto (2 di norma)

   La chiave OpenAI si legge da OPENAI_API_KEY o dal file ~/.openai-key,
   mai da una cartella del repository: il repository e' pubblico.

   ─────────────────────────────────────────────────────────────────────────
   PERCHE' CON LE COPERTINE ACCANTO E NON SOLO COL TESTO

   Le foto trovate in rete venivano ognuna da un set diverso: luce, formato,
   sfondo e confezione cambiavano da una voce all'altra e il catalogo sembrava
   un mercatino. Qui il modello riceve come riferimento le copertine che ci
   sono gia' e deve rifare quel set, cambiando solo il prodotto.

   I due mondi hanno due set diversi e non vanno mescolati:
     · Dal mare       — banco del pesce su ghiaccio tritato, primo piano che
                        riempie tutto il quadro, niente sfondo visibile.
     · Per la cucina  — tre o quattro prodotti su marmo chiaro, muro a
                        intonaco dietro, luce morbida da sinistra.

   Niente confezioni e niente scritte: il modello inventa marchi ed etichette,
   e un sacchetto con un marchio che non vendiamo e' peggio di nessuna foto.
   L'eccezione sono le voci di marca (McCain, Martinucci...): li' la confezione
   ufficiale la trova cerca-confezione.js e il modello la mette in scena
   com'e', senza ridisegnarla. Alla fine lo script stampa quanto e' costata
   ogni foto, ricerca compresa.

   Le proposte finiscono in foto-prova/ (fuori dal repository). Quella scelta
   si copia in foto-prodotti/ e si collega in catalogo.json.
   ───────────────────────────────────────────────────────────────────────── */

const fs = require('fs');
const path = require('path');
const os = require('os');
const sharp = require('sharp');
const { cercaConfezione } = require('./cerca-confezione');

const MODELLO = 'gpt-image-2.5-flare';

// Dollari per token del modello immagini. Fonte: developers.openai.com/api/docs/pricing
const PREZZO_IMMAGINE = { testo: 5 / 1e6, immagine: 8 / 1e6, uscita: 30 / 1e6 };

/* I marchi che vendiamo. Stanno nel campo provenienze insieme ai luoghi
   (Patagonia, Marocco...), e da li' non si distinguono da soli: l'elenco e'
   scritto qui. Una voce con piu' marchi usa il primo che compare nella
   scheda. Gillardeau manca apposta: le ostriche sono gia' fatte senza. */
const MARCHI = ['McCain', 'Aviko', 'Maestro', 'Martinucci', 'Annunziata', 'Sfogliagel'];
const QUALITA = 'high';
const FORMATO = '1536x1024';
const USCITA = path.join(__dirname, 'foto-prova');

// Le richieste insieme: oltre le quattro l'API comincia a rispondere 429
const IN_PARALLELO = 4;

const RIF = (f) => path.join(__dirname, 'foto-mie', f);

const SET_MARE = `
Stile: la stessa fotografia delle immagini di riferimento. Banco di una pescheria all'ingrosso,
prodotti adagiati su ghiaccio tritato, inquadratura ravvicinata dall'alto a circa 45 gradi che
riempie tutto il quadro fino ai bordi, nessuno sfondo visibile. Luce naturale morbida e diffusa,
riflessi bagnati sulle superfici, colori veri e non saturati, profondita' di campo ampia con
leggero sfocato solo sul bordo alto. Fotografia commerciale realistica, non illustrazione.`;

const SET_CUCINA = `
Stile: la stessa fotografia delle immagini di riferimento. Piano di marmo bianco con venature
grigie leggere, dietro un muro a intonaco chiaro caldo e sfocato. Da tre a cinque gruppi di
prodotto disposti con aria fra loro, ripresi di tre quarti leggermente dall'alto. Luce da studio
morbida da sinistra, ombre corte e delicate, colori caldi e naturali. Fotografia commerciale
per un catalogo alimentare professionale, realistica, non illustrazione.`;

const VIETATO = `
Da evitare assolutamente: confezioni, sacchetti, scatole, etichette, marchi, loghi, testo o
numeri di qualsiasi tipo; mani o persone; piatti impiattati con posate; tovaglie; sfondi bianchi
da studio; effetti artificiali o lucidi da rendering 3D.
Composizione: tutti i prodotti principali stanno nella fascia centrale, con margine ai lati,
perche' l'immagine verra' ritagliata in 4:3.`;

/* Il riferimento e' il set del mondo, non il prodotto: a un cluster serve
   la stessa luce degli altri, non le stesse cose nel quadro. Per la cucina
   non si passa piu' copertina-cucina.jpg: ha un sacchetto col marchio e basi
   pizza, e il modello tendeva a rimetterli in quadro. */
const RIFERIMENTI = {
  'Dal mare': ['copertina-crostacei.jpg', 'copertina-cefalopodi.jpg'],
  'Per la cucina': ['copertina-dessert.jpg', 'copertina-verdure-e-contorni.jpg'],
};
const SET = { 'Dal mare': SET_MARE, 'Per la cucina': SET_CUCINA };

const PESO = /\s*\d+\s*x?\s*[\d,.]*\s*(kg|g)(\/pz)?\b/gi;

function pulisci(testo, via = []) {
  // I pesi nelle frasi restano: tolti, lasciavano "da 50 e da" senza senso
  let t = (testo || '').replace(/<[^>]+>/g, '');
  for (const p of via) t = t.split(p).join('');
  return t.replace(/\s+e\s*([.,:])/g, '$1').replace(/,\s*([.,:])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

// Fino al punto e non ai due punti: dopo i due punti c'e' spesso l'elenco che serve
const primaFrase = (t) => (t.match(/^.*?\.(\s|$)/) || [t])[0].trim();

const slug = (t) => t.normalize('NFD').split('')
  .filter((ch) => { const c = ch.charCodeAt(0); return c < 0x0300 || c > 0x036f; })
  .join('').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* COPERTINE — COSA C'E' NEL QUADRO LO DICE IL CATALOGO, NON QUESTO FILE.
   I primi prompt elencavano i prodotti a memoria, e a "Patate e fritti" era
   finita la foto della cucina con basi pizza e ravioli. Adesso il soggetto si
   legge da catalogo.json: un gruppo per sotto-cluster, con le voci, i tagli
   e come si usano.

   I nomi soli non bastano. A "Gastronomia di mare" il modello ha messo in
   quadro gratinati, burger e surimi — i rami piccoli — e lasciato fuori il
   misto per risotto, che e' nove decimi dei chili. Per questo passano anche
   la descrizione del sotto-cluster e la prima frase di ogni voce.

   Il protagonista e' la prima voce del primo sotto-cluster: catalogo.json e'
   ordinato per chili venduti in ogni cluster. Dirgli solo "nove decimi dei
   chili" non bastava — il modello lo leggeva e metteva comunque al centro
   i burger, o dei gamberi interi che nella famiglia non ci sono.

   Delle pezzature restano solo i tagli, e dai testi si tolgono i nomi del
   campo provenienze, dove stanno McCain, Gillardeau e simili. */
function promptCopertina(c) {
  const protagonista = c.sottocluster[0].voci[0].nome;
  const gruppi = c.sottocluster.map((s) => {
    const via = s.voci.flatMap((v) => v.provenienze || []);
    const voci = s.voci.map((v) => {
      const tagli = (v.pezzature || []).map((p) => p.replace(PESO, '').trim()).filter(Boolean);
      const cosa = primaFrase(pulisci(v.sotto, via));
      return `    · ${v.nome}${tagli.length ? ' (' + tagli.join(', ') + ')' : ''} — ${come(v)}${cosa ? '. ' + cosa : ''}`;
    });
    const peso = primaFrase(pulisci(s.sotto, via));
    return `- ${s.nome}${peso ? ' [' + peso + ']' : ''}\n${voci.join('\n')}`;
  });
  return `Soggetto: la famiglia "${c.nome}" del catalogo di un grossista alimentare per ristoranti.
Contiene questi gruppi di prodotto, con fra parentesi quadre quanto pesano nelle vendite:
${gruppi.join('\n')}

PROTAGONISTA: "${protagonista}". Occupa circa meta' del quadro, in primo piano, ed e' la prima cosa
che si vede. Accanto, piu' piccoli, al massimo altri tre prodotti presi dagli altri gruppi
dell'elenco, per far capire che la famiglia contiene anche quelli.
Ogni prodotto va mostrato nello stato in cui un cuoco lo riconosce meglio: cio' che e' da friggere
appena fritto e dorato, senza piatto; il resto crudo o come arriva in cucina, sfuso e fuori dalla
sua confezione.
Nel quadro c'e' SOLO quello che e' nell'elenco: non aggiungere altri pesci, crostacei interi,
frutta, verdura o decorazioni per riempire lo spazio.`;
}

// In anagrafica "Cotto" vuol dire precotto: detto cosi' il modello rosolava gli gnocchi
function come(v) {
  return [...(v.lavorazione || []), ...(v.uso || [])].join(', ').toLowerCase()
    .replace(/\bcotto\b/g, 'gia\' cotto dal produttore (precotto: non ripassato, non rosolato, non impiattato)');
}

/* VOCI — LA SCHEDA INTERA, NON IL NOME.
   "Calamaro intero pulito", "Calamaro C4 large" e "Calamaro Patagonia" col
   solo nome sarebbero tre foto uguali. A distinguerle sono il taglio, la
   pezzatura e cosa dice la descrizione: per questo il prompt porta tutto
   quello che la scheda mostra al cliente, tranne i prezzi che non ci sono.

   Le provenienze passano: sono luoghi (Patagonia, Marocco, Adriatico) e
   dicono al modello quale specie e quale taglia aspettarsi. I marchi non
   rischiano di finire in quadro perche' le confezioni sono vietate. */
const STATO = {
  Congelato: 'si vende congelato: mostralo scongelato, crudo e lucido, come appare sul tagliere pronto da lavorare, con al massimo un velo di brina su qualche pezzo',
  Fresco: 'si vende fresco: lucido, bagnato, con i colori vivi del prodotto appena arrivato',
};

/* Per la cucina lo stato di vendita non e' lo stato da fotografare: le
   patatine si vendono congelate e crude, ma si riconoscono fritte; la pasta
   si riconosce cruda. */
const STATO_CUCINA = `si vende surgelato, ma va mostrato come lo riconosce un cuoco: cio' che e' da frittura appena fritto e dorato; pane, pizza, focacce e lievitati appena sfornati; i dolci pronti da servire; pasta, riso, verdure e ingredienti crudi e sfusi come arrivano in cucina. Mai in un piatto da portata`;

function promptVoce(v, s, c, m, confezione) {
  const mare = m.nome === 'Dal mare';
  const statoVendita = (v.stato || []).includes('Fresco') ? 'Fresco' : (v.stato || [])[0];
  const righe = [
    ...(confezione ? promptConfezione(v, confezione) : []),
    `Soggetto: la fotografia della scheda di UN SOLO prodotto nel catalogo di un grossista`,
    `${mare ? 'ittico' : 'alimentare'} per ristoranti. Prodotto: "${v.nome}" (famiglia ${c.nome}, gruppo ${s.nome}).`,
    ``,
    `Cosa dice la scheda del prodotto: ${pulisci(v.sotto)}`,
    v.pezzature?.length && `Pezzature e tagli in vendita: ${v.pezzature.join(', ')}.`,
    v.formato && !confezione && `Formato di vendita (solo per capire il prodotto, la confezione NON va mostrata): ${v.formato}.`,
    v.provenienze?.length && `Provenienza: ${v.provenienze.join(', ')}.`,
    `Lavorazione e uso: ${come(v)}.`,
    // Fresco e congelato insieme davano due istruzioni opposte: vince il fresco.
    // Sugli affumicati e marinati "scongelato e crudo" li faceva crudi, e sui sughi
    // vinceva sulla regola della bacinella: il sugo usciva misto crudo sul ghiaccio
    !mare && `Stato: ${STATO_CUCINA}.`,
    ...(!mare || /affumicat|marinat|bottarga|salat|sugh|zupp/i.test(v.nome) ? [] :
      [statoVendita].map((st) => STATO[st] && `Stato: ${STATO[st]}.`)),
    ``,
    `Come va fotografato:`,
    `- Nel quadro c'e' solo questo prodotto${confezione ? ' e la sua confezione' : ''}, in quantita' da banco: un mucchio o`,
    `  alcuni pezzi, mai un piatto. Nessun altro prodotto accanto.`,
    `- Le immagini di riferimento di stile servono SOLO per luce, set, inquadratura e colori: il`,
    `  prodotto in quadro e' quello descritto qui, non quello del riferimento.`,
    ...(mare ? REGOLE_MARE : REGOLE_CUCINA),
    `- Le pezzature indicano la taglia reale dei pezzi: rispettala.`,
    `- Se il prodotto si vende in piu' forme (per esempio intero e butterfly, o bistecche e`,
    `  rondelle), mostrane da due a tre affiancate, cominciando da quella nominata per prima.`,
    `  Quello che la scheda dice che il cuoco fara' dopo (pulirlo, tagliarlo, farcirlo) NON va`,
    `  mostrato: in quadro c'e' il prodotto com'e' quando lo consegniamo.`,
    `- Il prodotto e' al centro e riempie il quadro: la foto verra' ritagliata in 4:3 sul computer`,
    `  e in 16:9 sul telefono, quindi niente di importante sui bordi alto e basso.`,
  ];
  return righe.filter((r) => r !== undefined && r !== false && r !== 0).join('\n');
}

/* LA CONFEZIONE DI MARCA VA IN SCENA COM'E'.
   Il test sui Crispers McCain: passata come prima immagine e con l'ordine di
   non toccarla, la busta e' uscita identica in quattro prove su quattro,
   lettera per lettera, e il modello ha solo cambiato luce e appoggio. */
function promptConfezione(v, confezione) {
  return [
    `La PRIMA immagine e' la confezione ufficiale del prodotto: ${confezione.marca}, "${confezione.prodotto}".`,
    `Va messa nella foto IDENTICA all'originale: stesso logo, stesse scritte, stessi colori, stesse`,
    `icone e stessi numeri. Non ridisegnarla, non tradurla, non cambiare nessuna lettera, non`,
    `aggiungere scritte. E' appoggiata in piedi sul piano, a destra nel quadro, leggermente di tre`,
    `quarti, intera e non tagliata dal bordo alto. Davanti e a sinistra, sul piano, il prodotto`,
    `che contiene, pronto come lo riconosce un cuoco: e' il prodotto a occupare la maggior parte`,
    `del quadro, la confezione e' accanto. Nessun'altra confezione in quadro.`,
    ``,
  ];
}

const REGOLE_CUCINA = [
  `- Il prodotto sta direttamente sul marmo. Cio' che e' piccolo, sciolto o liquido (legumi,`,
  `  soffritto, minestrone, pelati, olio, riso) sta in una ciotola bassa di ceramica bianca o`,
  `  in un'ampolla di vetro, mai nella sua confezione.`,
  `- Un dolce con un cuore, una crema o un ripieno si mostra intero, con accanto un pezzo`,
  `  tagliato o aperto che fa vedere l'interno. Una torta da taglio ha gia' le fette segnate.`,
  `- Pane e focacce precotti hanno la crosta appena dorata e la mollica chiara; una base pizza`,
  `  e' senza condimento.`,
];

const REGOLE_MARE = [
    `- La lavorazione deve essere evidente a colpo d'occhio, perche' e' quello che distingue`,
    `  questa voce dalle altre dello stesso gruppo: un taglio si vede tagliato, un intero si vede`,
    `  intero, un cotto si vede cotto. "Pulito" per calamari e seppie vuol dire senza occhi, senza`,
    `  becco, senza interiora e senza pelle: il corpo e' bianco. Per polpi e moscardini "pulito"`,
    `  vuol dire solo senza interiora: la pelle e il colore naturale grigio-rosato restano.`,
    `  "Aperto a libro" o "butterfly" e' il solo corpo aperto e steso piatto, senza testa. Se la`,
    `  scheda dice "solo il mantello", in quadro non ci sono tentacoli. "Intero" senza "pulito" e'`,
    `  com'e' stato pescato, con pelle, occhi e i colori naturali della specie, anche scuri.`,
    `  "Sgusciato" e' la sola polpa senza guscio; "devenato" ha il taglio sul dorso senza il filo`,
    `  scuro; "code" di crostaceo sono la sola coda col guscio, senza testa.`,
    `  Per i bivalvi: "intero" e' col guscio chiuso; "sbissate" sono cozze col guscio pulito e`,
    `  lucido, senza il ciuffo di filamenti; "sgusciato" o "polpa" e' il solo mollusco nudo, senza`,
    `  guscio; le capesante "mezzo guscio" sono la noce col corallo adagiata nella valva concava.`,
    `  Un riccio "intero" e' chiuso e con gli aculei; la "polpa" di riccio sono le lingue arancio.`,
    `  Per i pesci: "filetto" e' il fianco senza lisca, steso col lato carne in vista, con la pelle`,
    `  solo se la scheda la nomina; "trancio" e' una fetta spessa tagliata di traverso, che mostra`,
    `  la sezione; "filone" e' il pezzo lungo e intero della carne, senza pelle; "spellato" e'`,
    `  senza pelle; "eviscerato" e' intero ma aperto sotto la pancia. La "coda" di pescatrice`,
    `  (coda di rospo) e' la parte posteriore della rana pescatrice senza la testa enorme e senza`,
    `  pelle: un cono di carne bianca e soda con la spina centrale in vista sul taglio.`,
    `  "Intero" per un pesce e' com'e' stato pescato, con testa, pinne e squame, occhio vivo e`,
    `  branchie rosse.`,
    `  Affumicati, marinati e salati NON sono crudi: si vedono col colore e la superficie`,
    `  dell'affumicatura o della marinatura, in fette sottili stese o nella loro baffa intera,`,
    `  anche se si vendono congelati. Il salmone affumicato ha fette sottili e traslucide,`,
    `  arancio intenso, coi bordi piu' scuri dove il fumo ha lavorato; mai accanto a salmone`,
    `  fresco o crudo. La bottarga e' la sacca di uova essiccata, color ambra, intera e con`,
    `  qualche fetta sottile tagliata accanto.`,
    `- Sughi, zuppe e tutto cio' che e' liquido non si mettono sul ghiaccio: stanno in una`,
    `  bacinella d'acciaio da cucina professionale, senza etichetta, ripresa dall'alto perche' si`,
    `  vedano i pezzi di pesce dentro. Le tartare monoporzione sono dischetti gia' formati, alti`,
    `  e compatti; i carpacci sono fette sottili stese.`,
    `- Un prodotto ripieno deve mostrare il ripieno: l'apertura chiusa con lo stecchino e il`,
    `  ripieno che affiora, e almeno un pezzo tagliato a meta' che mostra la farcia dentro.`,
    `- Se il nome della voce nomina piu' specie (per esempio "dentice e pagaro"), in quadro ci`,
    `  sono SOLO quelle, ognuna riconoscibile dai suoi tratti. Nessuna specie che le somiglia.`,
    `- I colori del prodotto li decide questa scheda, non le immagini di riferimento. Un crostaceo`,
    `  crudo ha i colori del crudo: grigio, azzurro, rosato o bruno secondo la specie. Il rosso`,
    `  acceso della cottura solo se la scheda dice cotto, o per le specie rosse gia' da crude come`,
    `  il gambero rosso e il gambero argentino. Un vivo e' crudo e integro; l'astice vivo ha`,
    `  le chele legate con l'elastico.`,
];

const catalogo = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalogo.json'), 'utf8'));

function lavoriCopertine(filtro) {
  return catalogo.mondi.flatMap((m) => m.cluster.map((c) => ({
    nome: 'copertina-' + c.slug.replace('catalogo-', ''),
    haFoto: Boolean(c.foto),
    riferimenti: RIFERIMENTI[m.nome].map(RIF),
    prompt: [promptCopertina(c), SET[m.nome], VIETATO].join('\n').trim(),
  })))
    // Senza argomento solo i cluster senza copertina; con un nome, anche se ce l'hanno
    .filter((l) => (filtro ? l.nome.includes(filtro) : !l.haFoto));
}

/* Per le voci il riferimento NON e' la copertina del cluster. Al primo giro
   lo era, e il modello ricopiava quello che ci vedeva: calamari e seppie
   accanto al polpo, tentacoli attaccati a seppie che dovevano essere solo
   mantello. Il riferimento e' una foto di voce gia' approvata, con un
   prodotto solo nel set giusto, e il prompt dice che vale per luce e set.
   Da solo pero' e' bianco, e sbiancava anche polpi e seppie fresche: accanto
   va una foto coi colori veri del banco, di una famiglia diversa cosi' che
   non ci sia niente da ricopiare. */
const RIF_VOCE = {
  'Dal mare': ['rif-voce-mare.jpg', 'copertina-crostacei.jpg'],
  // Il dessert e' il set della cucina senza confezioni e senza marchi da ricopiare
  'Per la cucina': ['copertina-dessert.jpg'],
};
/* La copertina della famiglia stessa non va mai: e' proprio quella che si
   ricopia. Ne' una che contiene i prodotti della famiglia: la copertina dei
   crostacei ha vongole e una rete di vongole, e sui molluschi tornerebbero. */
const RIF_VOCE_ALTRA = {
  'copertina-crostacei.jpg': 'copertina-cefalopodi.jpg',
  'copertina-dessert.jpg': 'copertina-panificati.jpg',
};
const RIF_VOCE_VIETATI = {
  'catalogo-crostacei': ['copertina-crostacei.jpg'],
  'catalogo-molluschi': ['copertina-crostacei.jpg'],
  'catalogo-dolci-e-pasticceria': ['copertina-dessert.jpg'],
};

// Per le voci di marca la confezione e' l'unica scritta ammessa, e non si tocca
const VIETATO_MARCHIO = VIETATO.replace(
  "confezioni, sacchetti, scatole, etichette, marchi, loghi, testo o\nnumeri di qualsiasi tipo",
  "altre confezioni oltre a quella della prima immagine; scritte, loghi o\nnumeri inventati; qualunque modifica alla grafica della confezione",
);
if (VIETATO_MARCHIO === VIETATO) throw new Error('VIETATO_MARCHIO non ha sostituito niente: VIETATO e\' cambiato');

/* Il set del mare dice "prodotti adagiati su ghiaccio tritato", e sui sughi
   vinceva su qualunque regola: due giri di zuppa usciti come misto crudo sul
   ghiaccio. Per i liquidi il ghiaccio resta, ma sotto le bacinelle. */
const SET_MARE_LIQUIDI = SET_MARE.replace(
  "prodotti adagiati su ghiaccio tritato",
  "bacinelle gastronorm d'acciaio piene di sugo o di zuppa di pesce, appoggiate e affondate nel ghiaccio tritato",
);

// Lo stile delle copertine della cucina chiede da tre a cinque gruppi: una voce ne ha uno
const SET_CUCINA_VOCE = SET_CUCINA.replace(
  "Da tre a cinque gruppi di\nprodotto disposti con aria fra loro",
  "Un solo prodotto, disposto\ncon aria intorno",
);
if (SET_CUCINA_VOCE === SET_CUCINA) throw new Error('SET_CUCINA_VOCE non ha sostituito niente: SET_CUCINA e\' cambiato');

function setVoce(v, m) {
  if (m.nome === 'Dal mare' && /sugh|zupp/i.test(v.nome)) return SET_MARE_LIQUIDI;
  if (m.nome === 'Per la cucina') return SET_CUCINA_VOCE;
  return SET[m.nome];
}

/* Con --mancanti "cluster" filtra i cluster e prende solo le voci senza foto;
   con --voci prende tutte le voci del cluster, anche quelle gia' fatte. */
function lavoriVoci(cluster, filtro, soloMancanti) {
  const out = [];
  for (const m of catalogo.mondi) {
    for (const c of m.cluster) {
      if (cluster && !c.slug.includes(cluster)) continue;
      const vietati = RIF_VOCE_VIETATI[c.slug] || [];
      const rif = (RIF_VOCE[m.nome] || RIFERIMENTI[m.nome])
        .map((r) => (vietati.includes(r) ? RIF_VOCE_ALTRA[r] : r)).filter(Boolean).map(RIF);
      for (const s of c.sottocluster) {
        for (const v of s.voci) {
          if (filtro && !slug(v.nome).includes(filtro)) continue;
          if (soloMancanti && v.foto) continue;
          const marca = (v.provenienze || []).find((p) => MARCHI.includes(p));
          out.push({
            nome: path.join('voci', slug(v.nome)),
            riferimenti: rif,
            marca,
            // Cosa cercare: il nome della voce e il primo taglio, che e' il piu' venduto
            richiesta: marca && {
              slug: slug(marca + '-' + v.nome),
              marca,
              prodotto: v.nome,
              dettaglio: [v.pezzature?.[0], primaFrase(pulisci(v.sotto))].filter(Boolean).join('. '),
            },
            prompt: (confezione) => [
              promptVoce(v, s, c, m, confezione),
              setVoce(v, m),
              confezione ? VIETATO_MARCHIO : VIETATO,
            ].join('\n').trim(),
          });
        }
      }
    }
  }
  return out;
}

function chiave() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY.trim();
  const f = path.join(os.homedir(), '.openai-key');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  console.error('Manca la chiave: mettila in OPENAI_API_KEY o nel file ' + f);
  process.exit(1);
}

async function genera(l, n, key) {
  const form = new FormData();
  form.append('model', MODELLO);
  form.append('prompt', l.prompt);
  form.append('size', FORMATO);
  form.append('quality', QUALITA);
  form.append('n', String(n));
  for (const r of l.riferimenti) {
    const tipo = r.endsWith('.png') ? 'image/png' : 'image/jpeg';
    form.append('image[]', new Blob([fs.readFileSync(r)], { type: tipo }), path.basename(r));
  }

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || res.status);
  return json;
}

const RESOCONTO = [];

function costoImmagini(u = {}) {
  const d = u.input_tokens_details || {};
  const testo = d.text_tokens ?? u.input_tokens ?? 0;
  return testo * PREZZO_IMMAGINE.testo + (d.image_tokens || 0) * PREZZO_IMMAGINE.immagine
    + (u.output_tokens || 0) * PREZZO_IMMAGINE.uscita;
}

async function esegui(l, n, key) {
  const riga = { nome: path.basename(l.nome), marca: l.marca || '', confezione: '', ricerca: 0, immagini: 0, foto: 0 };
  RESOCONTO.push(riga);
  try {
    let confezione = null;
    if (l.marca) {
      const r = await cercaConfezione(l.richiesta, key);
      riga.ricerca = r.costo;
      if (r.file) {
        confezione = { ...r, marca: l.marca };
        riga.confezione = (r.dallaCache ? '(gia\' trovata) ' : '') + r.fonte;
      } else {
        riga.confezione = 'NON TROVATA — generata senza: ' + r.note.join(' / ');
      }
    }
    const json = await genera({
      prompt: typeof l.prompt === 'function' ? l.prompt(confezione) : l.prompt,
      riferimenti: confezione ? [confezione.file, ...l.riferimenti] : l.riferimenti,
    }, n, key);
    fs.mkdirSync(path.dirname(path.join(USCITA, l.nome)), { recursive: true });
    for (const [i, img] of json.data.entries()) {
      const base = path.join(USCITA, `${l.nome}-${i + 1}`);
      const buf = Buffer.from(img.b64_json, 'base64');
      fs.writeFileSync(base + '.png', buf);
      // Lo stesso taglio 4:3 e la stessa misura delle foto online
      await sharp(buf).resize(900, 675, { fit: 'cover' }).webp({ quality: 82 }).toFile(base + '.webp');
    }
    riga.immagini = costoImmagini(json.usage);
    riga.foto = json.data.length;
    console.log(`${l.nome}: ${json.data.length} immagini${l.marca ? ' · ' + riga.confezione : ''}`);
  } catch (e) {
    riga.errore = e.message;
    console.error(`${l.nome}: ${e.message}`);
  }
}

function stampaResoconto() {
  const $ = (x) => x.toFixed(3).padStart(7);
  console.log('\nRESOCONTO — dollari');
  console.log('voce'.padEnd(44), 'ricerca', ' foto AI', ' totale', ' a foto');
  let tr = 0, ti = 0, tf = 0;
  for (const r of RESOCONTO) {
    const tot = r.ricerca + r.immagini;
    tr += r.ricerca; ti += r.immagini; tf += r.foto;
    console.log(r.nome.slice(0, 43).padEnd(44), $(r.ricerca), $(r.immagini), $(tot), r.foto ? $(tot / r.foto) : '      -',
      r.errore ? ' ERRORE: ' + r.errore : '');
  }
  const conMarca = RESOCONTO.filter((r) => r.marca);
  console.log('-'.repeat(76));
  console.log('totale'.padEnd(44), $(tr), $(ti), $(tr + ti), tf ? $((tr + ti) / tf) : '');
  console.log(`\n${RESOCONTO.length} voci, ${tf} immagini generate, ${conMarca.length} voci di marca.`);
  if (conMarca.length) {
    console.log('\nCONFEZIONI:');
    for (const r of conMarca) console.log(` ${r.nome} [${r.marca}]: ${r.confezione}`);
  }
}

(async () => {
  const args = process.argv.slice(2);
  const togli = (flag, conValore) => {
    const i = args.indexOf(flag);
    if (i < 0) return undefined;
    return args.splice(i, conValore ? 2 : 1)[conValore ? 1 : 0];
  };
  const n = Number(togli('--varianti', true) || 2);
  const soloPrompt = Boolean(togli('--prompt'));
  const voci = togli('--voci', true);
  const mancanti = Boolean(togli('--mancanti'));

  const lavori = mancanti ? lavoriVoci(args[0], args[1], true)
    : voci ? lavoriVoci(voci, args[0], false)
      : lavoriCopertine(args[0]);
  if (!lavori.length) return console.error('Nessuna foto corrisponde.');
  if (soloPrompt) {
    return lavori.forEach((l) => {
      // Con la marca il prompt vero si scrive dopo la ricerca: qui un segnaposto
      const finta = l.marca && { marca: l.marca, prodotto: '(il prodotto trovato dalla ricerca)' };
      const p = typeof l.prompt === 'function' ? l.prompt(finta) : l.prompt;
      console.log(`=== ${l.nome}${l.marca ? ' [marca: ' + l.marca + ']' : ''}\n${p}\n`);
    });
  }

  const key = chiave();
  const coda = [...lavori];
  await Promise.all(Array.from({ length: IN_PARALLELO }, async () => {
    while (coda.length) await esegui(coda.shift(), n, key);
  }));
  stampaResoconto();
})();
