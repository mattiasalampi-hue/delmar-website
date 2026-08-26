/* Riscrive catalogo.json sull'alberatura nuova: due mondi, dieci cluster,
   quarantatre sotto-cluster, e otto attributi su ogni voce.

   PERCHE' UNO SCRIPT E NON UN FILE RISCRITTO A MANO.
   Le 93 voci di oggi hanno testi scritti uno per uno — pezzature, provenienze,
   formati, la frase che identifica il prodotto. Ricopiarli a mano nel formato
   nuovo significa perderne qualcuno per strada e non accorgersene. Qui la
   copia la fa la macchina: da() pesca la voce vecchia per nome e ci aggiunge
   sopra gli attributi. Se un nome non esiste piu', lo script si ferma invece
   di scrivere un catalogo con un buco.

   Uso: node migra-alberatura.js
   Gira una volta sola. Dopo, la sorgente e' catalogo.json e questo file resta
   come registro di dove e' finita ogni voce.
*/
const fs = require('fs');
const path = require('path');

const qui = __dirname;
const SORGENTE = path.join(qui, 'catalogo.json');
const vecchio = JSON.parse(fs.readFileSync(SORGENTE, 'utf8'));

/* ─ La libreria delle voci di oggi ───────────────────────────────────────
   Una decina di prodotti oggi stanno in due cataloghi (il salmone in "Pesce
   fresco" e in "Prodotti per crudi", il gambero argentino in "Crostacei" e in
   "Prodotti per crudi"): e' la sovrapposizione che l'alberatura nuova
   toglie di mezzo. Qui vince la prima occorrenza e la seconda si scarta —
   il fatto che fosse "da crudo" non si perde, diventa l'attributo uso. */
const libreria = new Map();
const doppie = [];
for (const c of vecchio.cataloghi) {
  for (const f of c.famiglie) {
    for (const v of f.voci || []) {
      if (libreria.has(v.nome)) {
        doppie.push(`${v.nome} (${c.slug})`);
        continue;
      }
      libreria.set(v.nome, v);
    }
  }
}

const usate = new Set();

/* da() prende la voce vecchia e ci monta sopra gli attributi nuovi.
   Il testo non si tocca: e' stato scritto una volta e va bene com'e'. */
function da(nome, attributi) {
  const v = libreria.get(nome);
  if (!v) throw new Error(`Voce assente da catalogo.json: "${nome}"`);
  usate.add(nome);
  return { ...v, ...attributi };
}

/* nuova() e' per i sotto-cluster che oggi il sito non racconta: sono i
   "quattro mondi merceologici senza casa" del documento. Il magazzino ce li
   ha, i clienti li comprano, e finora non c'era un ramo dove metterli. */
function nuova(v) {
  return v;
}

/* ─ TRE FILTRI, NON OTTO ─────────────────────────────────────────────────
   Il documento elenca otto dimensioni da togliere dal menu, e per un giro le
   ho messe tutte e otto nella barra. Era sbagliato: otto righe di pillole
   sono mezzo schermo prima del primo prodotto, e un pannello piu' alto del
   catalogo non aiuta a scegliere — allontana. (Mattias, 26/08/2026)

   Restano le tre domande che un ristoratore si fa DAVVERO prima di guardare
   un prezzo:
     stato        fresco o congelato — il documento stesso lo chiama "il primo
                  taglio che il cliente fa"
     lavorazione  intero, filetto, trancio: cambia il lavoro in cucina e il
                  costo porzione
     uso          adatto al crudo, padella, forno, frittura: e' il modo in cui
                  si ragiona quando si scrive un piatto

   Le altre cinque NON spariscono: gamma e "adatto al crudo" sono badge sulla
   scheda, provenienza, glassatura, pezzatura e formato sono righe della
   scheda. Restano dove si guardano — su un prodotto che hai gia' trovato —
   invece di occupare la strada per trovarlo.

   `campo` e' la chiave sulla voce, `multi` dice se una voce puo' averne piu'
   di uno. I valori NON sono elencati qui: la barra li costruisce da quello
   che c'e' davvero nel cluster, cosi' non si offrono filtri che non
   tornerebbero niente. */
const FILTRI = [
  { campo: 'stato', nome: 'Stato', multi: true },
  { campo: 'lavorazione', nome: 'Lavorazione', multi: true },
  { campo: 'uso', nome: 'Uso in cucina', multi: true },
];

/* Scorciatoie: sono i valori che si ripetono su decine di voci, e scriverli
   per esteso ogni volta significa sbagliarne uno e ritrovarsi due filtri
   "Congelato" che non si parlano. */
const CONG = ['Congelato'];
const FRESCO = ['Fresco'];
const ENTRAMBI = ['Fresco', 'Congelato'];
const CRUDO = 'Adatto al crudo';
const PADELLA = 'Pronto in padella';
const FORNO = 'Da forno';
const FRITTURA = 'Da frittura';
const PREMIUM = 'Premium';
const DELMAR = 'Linea DelMar';
const STD = 'Standard';

/* ─ L'albero ─────────────────────────────────────────────────────────────
   Un asse solo: che cosa e' questo prodotto. Specie e famiglia, niente
   altro. Tutto il resto sta nei filtri qui sopra. */
const MONDI = [
  {
    slug: 'dal-mare',
    nome: 'Dal mare',
    sotto: 'Da dove viene la merce. Il settantaquattro per cento dei chili e tutto il mestiere stanno qui.',
    cluster: [

      /* ── 1. CEFALOPODI ─────────────────────────────────────────── */
      {
        slug: 'catalogo-cefalopodi',
        nome: 'Cefalopodi',
        occhiello: 'Il calamaro lo lavoriamo noi, nel taglio che volete',
        titolo: 'Calamaro, polpo e seppia all\'ingrosso',
        sottotitolo: 'per ristoranti, pescherie e gastronomie',
        sotto: 'Intero, aperto, a strisce, ad anelli: centoventisei tonnellate di calamaro lavorate nel nostro laboratorio, in cinquecentocinquantasei cucine. Più polpo, moscardino, seppia e totano.',
        magazzino: '189',
        intro_titolo: 'Calamaro lavorato, polpo del Marocco e seppie pulite all\'ingrosso per ristoranti',
        intro: [
          '<strong>Il calamaro non lo rivendiamo: lo lavoriamo.</strong> Entra il blocco ed esce nel taglio che avete chiesto — intero pulito, aperto a libro, a strisce o ad anelli — dal nostro laboratorio. Sono <strong>centoventisei tonnellate l\'anno</strong>, il sessantatré per cento di tutto il calamaro che vendiamo, ed è la ragione per cui cinquecentocinquantasei cucine lo comprano da noi invece che da chi lo passa e basta.',
          '<strong>Nessuno dei quattro tagli è mancato una settimana in un anno.</strong> Cinquantatré su cinquantatré, tutti e quattro, nei formati da 3 e da 5 chili oppure sfuso. Decongelato e pronto al taglio, o congelato se la cella deve reggere il fine settimana: si sceglie all\'ordine.',
          '<strong>La provenienza è un filtro, non dieci voci di menù.</strong> Il calamaro arriva da Patagonia, Marocco, Indopacifico, Sud Africa e altri cinque paesi, e in cella sono dieci articoli diversi. Qui è una scheda sola con il filtro provenienza: si sceglie la specie e poi da dove, non il contrario.',
          '<strong>Come arriva.</strong> Su ogni collo l\'etichetta a norma — specie, nome scientifico, zona FAO, metodo di produzione e lotto — e la percentuale di glassatura dichiarata, che sul cefalopode è la differenza fra quello che pesate e quello che portate in tavola.',
        ],
        foto: 'foto-prodotti/copertina-cefalopodi.webp',
        sottocluster: [
          {
            nome: 'Calamari e totani',
            sotto: 'Il ramo più grosso del catalogo: da solo fa il diciannove per cento dei chili. Quattro tagli che escono dal nostro laboratorio, più gli interi nelle pezzature da banco.',
            voci: [
              da('Calamaro intero pulito', { stato: CONG, lavorazione: ['Pulito', 'Intero'], uso: [FRITTURA, PADELLA], gamma: DELMAR, formati: ['Blocco', 'IQF'] }),
              da('Calamaro aperto a libro', { stato: CONG, lavorazione: ['Pulito'], uso: [PADELLA, FORNO], gamma: DELMAR, formati: ['Blocco'] }),
              da('Calamaro a strisce', { stato: CONG, lavorazione: ['Pulito'], uso: [PADELLA, FRITTURA], gamma: DELMAR, formati: ['IQF'] }),
              da('Calamaro ad anelli', { stato: CONG, lavorazione: ['Pulito'], uso: [FRITTURA], gamma: DELMAR, formati: ['IQF'] }),
              da('Calamaro C4 large', { stato: CONG, lavorazione: ['Intero'], uso: [FRITTURA, PADELLA], gamma: STD, formati: ['Blocco'] }),
              da('Calamaro Patagonia', { stato: CONG, lavorazione: ['Intero'], uso: [FRITTURA], gamma: STD, formati: ['Blocco'] }),
              da('Totano', { stato: CONG, lavorazione: ['Intero', 'Pulito'], uso: [PADELLA, FRITTURA], gamma: STD, formati: ['Blocco'] }),
            ],
          },
          {
            nome: 'Polpi e moscardini',
            sotto: 'Nove per cento dei chili. Il polpo del Marocco è la referenza storica; i tentacoli già cotti sono la scorciatoia per chi non ha due ore di bollitura da spendere.',
            voci: [
              da('Polpo del Marocco', { stato: CONG, lavorazione: ['Intero'], uso: [FORNO, PADELLA], gamma: STD, formati: ['Blocco', 'IWP'] }),
              da('Tentacoli di polpo cotti', { stato: CONG, lavorazione: ['Cotto'], uso: [PADELLA, FORNO], gamma: STD, formati: ['IWP', 'Vaschetta'] }),
              nuova({
                nome: 'Moscardini',
                sotto: 'Interi e già puliti, nelle pezzature da 40/60 e 60/80 pezzi al chilo. <strong>È il polpo che non chiede bollitura</strong>: va in padella dal congelato e in dieci minuti è un antipasto, ed è la voce che tiene il costo porzione dove il polpo grande non ci arriva.',
                pezzature: ['40/60 pz/kg', '60/80 pz/kg', 'puliti'],
                provenienze: ['Atlantico', 'Mediterraneo'],
                formato: 'blocchi da 2 kg · sfuso',
                stato: CONG,
                lavorazione: ['Intero', 'Pulito'],
                uso: [PADELLA],
                gamma: STD,
               
                formati: ['Blocco'],
              }),
            ],
          },
          {
            nome: 'Seppie',
            sotto: 'Fresche intere quando le barche le portano, pulite e congelate tutto l\'anno. Tre per cento dei chili, e il nero si tiene a parte.',
            voci: [
              da('Seppie fresche', { stato: FRESCO, lavorazione: ['Intero'], uso: [PADELLA], gamma: STD, formati: ['Vaschetta'] }),
              da('Seppie pulite', { stato: CONG, lavorazione: ['Pulito'], uso: [PADELLA, FRITTURA], gamma: STD, formati: ['IQF', 'Blocco'] }),
            ],
          },
        ],
      },

      /* ── 2. CROSTACEI ──────────────────────────────────────────── */
      {
        slug: 'catalogo-crostacei',
        nome: 'Crostacei',
        occhiello: 'Astice vivo tutti i giorni, gamberi rossi in stagione',
        titolo: 'Crostacei all\'ingrosso',
        sottotitolo: 'per ristoranti, pescherie e gastronomie',
        sotto: 'Gamberi, scampi, astici e granchi dal vivo al congelato. Sgusciati e devenati come vi servono, senza sovrapprezzo: su un crostaceo lo scarto è metà del peso.',
        magazzino: '271',
        intro_titolo: 'Gamberi, scampi, astice vivo e granchi all\'ingrosso per ristoranti e pescherie',
        intro: [
          '<strong>Si ordina quando avete finito di lavorare.</strong> Su WhatsApp fino alle <strong>2 di notte</strong>, e la consegna arriva entro le 11 — tutti i giorni, domenica compresa. L\'astice ordinato stanotte è in cucina domattina, ancora vivo.',
          '<strong>Lo lavoriamo come vi serve, senza sovrapprezzo.</strong> Gamberi sgusciati e devenati, code pulite, scampi sbissati: si dice all\'ordine e arriva così, e non costa un euro in più. Su un crostaceo lo scarto è metà del peso, quindi qui non è un servizio in più — è il costo porzione.',
          '<strong>La gamma premium è un badge, non un ramo a parte.</strong> I gamberi rossi, rosa e viola di Sicilia e Tirreno e i carabineros stanno dentro «Gamberi e mazzancolle» insieme agli altri: si tirano fuori con il filtro gamma quando servono, senza doverli cercare in un menù diverso.',
          '<strong>Come arriva.</strong> Il vivo nei nostri furgoni refrigerati, il congelato senza rotture di catena, e su ogni collo l\'etichetta a norma: specie, nome scientifico, zona FAO, metodo di produzione e lotto.',
        ],
        foto: 'foto-prodotti/copertina-crostacei.webp',
        sottocluster: [
          {
            nome: 'Gamberi e mazzancolle',
            sotto: 'Il quindici per cento dei chili di tutto il catalogo, gamma premium compresa. Dal gambero argentino da cella al rosso di Mazara che si serve crudo.',
            voci: [
              da('Gambero argentino', { stato: CONG, lavorazione: ['Intero', 'Code'], uso: [CRUDO, PADELLA], gamma: STD, formati: ['IQF', 'Blocco'] }),
              da('Gambero sgusciato e devenato', { stato: CONG, lavorazione: ['Sgusciato'], uso: [PADELLA], gamma: STD, formati: ['IQF', 'Busta'] }),
              da('Mazzancolle tropicali', { stato: CONG, lavorazione: ['Intero'], uso: [PADELLA, FORNO], gamma: STD, formati: ['Blocco', 'IQF'] }),
              da('Gambero di Tunisi', { stato: ENTRAMBI, lavorazione: ['Intero'], uso: [CRUDO, PADELLA], gamma: PREMIUM, formati: ['Vaschetta', 'IQF'] }),
              da('Gambero rosso e viola', { stato: ENTRAMBI, lavorazione: ['Intero'], uso: [CRUDO], gamma: PREMIUM, formati: ['Vaschetta'] }),
            ],
          },
          {
            nome: 'Scampi',
            sotto: 'Vivi, freschi dell\'Arcipelago e congelati, in tutte e quattro le pezzature. Sei per cento dei chili, ed è il crostaceo che si vende sia crudo sia cotto.',
            voci: [
              da('Scampi', { stato: CONG, lavorazione: ['Intero'], uso: [PADELLA, FORNO], gamma: STD, formati: ['IQF', 'Blocco'] }),
              da('Scampi vivi', { stato: FRESCO, lavorazione: ['Intero'], uso: [CRUDO], gamma: PREMIUM, formati: ['Vaschetta'] }),
              da('Scampi di pezzatura grande', { stato: ENTRAMBI, lavorazione: ['Intero'], uso: [CRUDO, FORNO], gamma: PREMIUM, formati: ['Vaschetta'] }),
              da('Scampi freschi dell\'Arcipelago', { stato: FRESCO, lavorazione: ['Intero'], uso: [CRUDO], gamma: PREMIUM, formati: ['Vaschetta'] }),
            ],
          },
          {
            nome: 'Astici, aragoste e magnose',
            sotto: 'Il pezzo che si porta in sala intero. Vivo nei nostri furgoni, oppure congelato quando la carta lo vuole tutto l\'anno allo stesso prezzo.',
            voci: [
              da('Astice', { stato: ENTRAMBI, lavorazione: ['Intero'], uso: [FORNO, PADELLA], gamma: PREMIUM, formati: ['Vaschetta', 'IWP'] }),
              da('Aragosta', { stato: ENTRAMBI, lavorazione: ['Intero'], uso: [FORNO], gamma: PREMIUM, formati: ['IWP'] }),
            ],
          },
          {
            nome: 'Granchi e cicale',
            sotto: 'Mezzo per cento dei chili e la ragione per cui certe carte funzionano. Le cicale fresche arrivano dalle barche dell\'Arcipelago, e quando ci sono durano poco.',
            voci: [
              da('Granciporro e granchio blu', { stato: ENTRAMBI, lavorazione: ['Intero'], uso: [PADELLA, FORNO], gamma: STD, formati: ['Vaschetta'] }),
              nuova({
                nome: 'Cicale di mare',
                sotto: 'Pannocchie fresche dell\'Arcipelago Toscano, vive quando la barca rientra in tempo. <strong>Si vendono in giornata e non tutti i giorni</strong>: è pesca locale, non una referenza di cella, e la pezzatura la decide la rete.',
                pezzature: ['grandi', 'medie', 'da zuppa'],
                provenienze: ['Arcipelago Toscano', 'Tirreno'],
                formato: 'cassette da 2 kg · in ghiaccio',
                stato: FRESCO,
                lavorazione: ['Intero'],
                uso: [PADELLA, CRUDO],
                gamma: PREMIUM,
                formati: ['Vaschetta'],
              }),
            ],
          },
        ],
      },

      /* ── 3. PESCE ──────────────────────────────────────────────── */
      {
        slug: 'catalogo-pesce',
        nome: 'Pesce',
        occhiello: 'Fresco e congelato nella stessa scheda',
        titolo: 'Pesce fresco e congelato all\'ingrosso',
        sottotitolo: 'per ristoranti, pescherie e gastronomie',
        sotto: 'Interi, filetti, tranci e affumicati: la stessa specie in una scheda sola, col filtro che sceglie fra fresco e congelato. Lavorato come volete voi, senza sovrapprezzo.',
        magazzino: '217',
        intro_titolo: 'Spigola, orata, merluzzo, tonno e salmone freschi e congelati all\'ingrosso per ristoranti',
        intro: [
          '<strong>Fresco e congelato stanno nella stessa scheda.</strong> Chi cerca l\'orata la trova una volta sola e sceglie lì fra le due, invece di girare due cataloghi diversi per la stessa specie. Il filtro stato è la prima riga della barra qui sotto: è il primo taglio che si fa, e non sta nascosto in un pannello laterale.',
          '<strong>Lo lavoriamo come vi serve, senza sovrapprezzo.</strong> Sfilettato, eviscerato, sbuzzato, aperto a libro, in tranci: si dice all\'ordine e arriva così, e non costa un euro in più. È tempo di brigata che non pagate e scarto che non vi resta in cucina — sul costo porzione pesa più della differenza di prezzo fra due provenienze.',
          '<strong>La glassatura è il prezzo vero.</strong> Un filetto glassato al 30% è per quasi un terzo acqua: pagate dieci chili e ne servite sette. Dove il dato c\'è lo trovate in scheda e nel filtro, perché è l\'unico modo di confrontare due offerte e sapere quale costa davvero meno.',
          '<strong>Come arriva.</strong> Il fresco intero e in ghiaccio, il congelato senza rotture di catena, e su ogni collo l\'etichetta a norma: specie, nome scientifico, zona FAO, metodo di produzione e lotto. È quello che serve per scrivere il menù e per rispondere a un controllo, senza doverlo chiedere.',
        ],
        foto: 'foto-prodotti/copertina-fresco.webp',
        sottocluster: [
          {
            nome: 'Filetti e tranci di pesce bianco',
            sotto: 'Dieci per cento dei chili da solo. Il pesce bianco su cui si regge un menù di lavoro: costo porzione noto prima di comprare, zero scarto in cucina.',
            voci: [
              da('Filetti di merluzzo', { stato: CONG, lavorazione: ['Filetto'], uso: [FORNO, PADELLA], gamma: STD, formati: ['IQF', 'Blocco'] }),
              da('Cuore di merluzzo e baccalà', { stato: CONG, lavorazione: ['Filetto', 'Trancio'], uso: [FORNO, PADELLA], gamma: STD, formati: ['IQF'] }),
              da('Brosme', { stato: CONG, lavorazione: ['Filetto'], uso: [FORNO], gamma: STD, formati: ['IQF'] }),
              da('Filetti di orata e branzino', { stato: CONG, lavorazione: ['Filetto'], uso: [PADELLA, FORNO], gamma: STD, formati: ['IQF', 'IWP'] }),
              da('Filetti di pangasio', { stato: CONG, lavorazione: ['Filetto'], uso: [FORNO, PADELLA], gamma: STD, formati: ['IQF'] }),
              da('Persico africano e tilapia', { stato: CONG, lavorazione: ['Filetto'], uso: [FORNO, PADELLA], gamma: STD, formati: ['IQF'] }),
              da('Filetti di scorfano', { stato: CONG, lavorazione: ['Filetto'], uso: [PADELLA, FORNO], gamma: STD, formati: ['IQF'] }),
              da('Filetti di triglia', { stato: CONG, lavorazione: ['Filetto'], uso: [PADELLA, FRITTURA], gamma: STD, formati: ['IQF'] }),
            ],
          },
          {
            nome: 'Tonno, spada e grandi pelagici',
            sotto: 'Due per cento dei chili, ma è il ramo che qualifica una carta di crudo. Il filone sashimi è a marchio nostro: lo selezioniamo e lo confezioniamo in laboratorio.',
            voci: [
              da('Tonno sashimi DelMar', { stato: CONG, lavorazione: ['Trancio', 'Filetto'], uso: [CRUDO], gamma: DELMAR, formati: ['IWP', 'Vaschetta'] }),
              da('Tonno filone pinne gialle', { stato: ENTRAMBI, lavorazione: ['Filetto', 'Trancio'], uso: [CRUDO, PADELLA], gamma: STD, formati: ['IWP'] }),
              da('Pesce spada filone', { stato: ENTRAMBI, lavorazione: ['Filetto', 'Trancio'], uso: [CRUDO, PADELLA], gamma: STD, formati: ['IWP'] }),
            ],
          },
          {
            nome: 'Pesce azzurro e frittura',
            sotto: 'Un per cento dei chili e il margine più alto del banco. Alici, sarde e sgombro freschi, più la frittura già pronta per chi non ha una seconda persona in cucina.',
            voci: [
              da('Alici fresche', { stato: FRESCO, lavorazione: ['Intero'], uso: [FRITTURA, PADELLA], gamma: STD, formati: ['Vaschetta'] }),
              da('Sgombro', { stato: ENTRAMBI, lavorazione: ['Intero', 'Filetto'], uso: [FORNO, PADELLA], gamma: STD, formati: ['Vaschetta', 'IQF'] }),
              da('Sarde', { stato: FRESCO, lavorazione: ['Intero'], uso: [FRITTURA, FORNO], gamma: STD, formati: ['Vaschetta'] }),
              da('Alici a filetti butterfly', { stato: CONG, lavorazione: ['Filetto'], uso: [FRITTURA, PADELLA], gamma: STD, formati: ['IQF'] }),
              nuova({
                nome: 'Frittura del giorno',
                sotto: 'Il misto che le barche portano quando non c\'è una specie sola da vendere: calamaretti, gobetti, triglie piccole, gianchetti quando è stagione. <strong>Cambia ogni notte e non si prenota</strong> — è la voce che riempie il fritto senza pagarlo come una referenza di cella.',
                pezzature: ['misto da frittura', 'gobetti', 'calamaretti'],
                provenienze: ['Arcipelago Toscano', 'Tirreno'],
                formato: 'cassette da 2 e 3 kg · in ghiaccio',
                stato: FRESCO,
                lavorazione: ['Intero'],
                uso: [FRITTURA],
                gamma: STD,
                formati: ['Vaschetta'],
              }),
            ],
          },
          {
            nome: 'Pesce di mare intero',
            sotto: 'Quattordici specie in tutti i calibri che servono. La 600/800 di orata e di spigola non è mancata una sola settimana in un anno: la carta si scrive senza ripensarci.',
            voci: [
              da('Spigola', { stato: ENTRAMBI, lavorazione: ['Intero', 'Filetto'], uso: [CRUDO, FORNO, PADELLA], gamma: STD, formati: ['Vaschetta'] }),
              da('Orata', { stato: ENTRAMBI, lavorazione: ['Intero', 'Filetto'], uso: [FORNO, PADELLA], gamma: STD, formati: ['Vaschetta'] }),
              da('Ombrina boccadoro', { stato: FRESCO, lavorazione: ['Intero', 'Filetto'], uso: [CRUDO, FORNO], gamma: STD, formati: ['Vaschetta'] }),
              da('Ricciola', { stato: ENTRAMBI, lavorazione: ['Intero', 'Filetto'], uso: [CRUDO, FORNO], gamma: PREMIUM, formati: ['Vaschetta'] }),
              da('Rombo chiodato', { stato: FRESCO, lavorazione: ['Intero'], uso: [FORNO], gamma: PREMIUM, formati: ['Vaschetta'] }),
              da('Gallinella e cappone', { stato: FRESCO, lavorazione: ['Intero', 'Filetto'], uso: [PADELLA, FORNO], gamma: STD, formati: ['Vaschetta'] }),
              da('Palombo', { stato: FRESCO, lavorazione: ['Trancio', 'Intero'], uso: [PADELLA, FORNO], gamma: STD, formati: ['Vaschetta'] }),
              da('Dentice e pagaro', { stato: FRESCO, lavorazione: ['Intero', 'Filetto'], uso: [CRUDO, FORNO], gamma: PREMIUM, formati: ['Vaschetta'] }),
              da('Pescatrice', { stato: FRESCO, lavorazione: ['Intero', 'Filetto', 'Trancio'], uso: [PADELLA, FORNO], gamma: STD, formati: ['Vaschetta'] }),
              da('Sogliola', { stato: ENTRAMBI, lavorazione: ['Intero', 'Filetto'], uso: [PADELLA, FRITTURA], gamma: STD, formati: ['Vaschetta', 'IQF'] }),
            ],
          },
          {
            nome: 'Salmone',
            sotto: 'Fresco intero o in baffa, e in filetti porzionati dal congelato. È la specie che sta contemporaneamente in una carta di crudo, in un secondo e in una colazione da hotel.',
            voci: [
              da('Salmone fresco', { stato: FRESCO, lavorazione: ['Intero', 'Filetto'], uso: [CRUDO, FORNO, PADELLA], gamma: STD, formati: ['Vaschetta'] }),
              da('Filetti di salmone', { stato: CONG, lavorazione: ['Filetto'], uso: [FORNO, PADELLA], gamma: STD, formati: ['IQF', 'IWP'] }),
            ],
          },
          {
            nome: 'Affumicati, marinati e salati',
            sotto: 'Zero scarto, nessuna cottura, nessuna stagione: il costo porzione si sa al grammo prima di comprare. Erano un catalogo di primo livello, ma nel congelato sono cinque referenze — qui stanno alla loro misura, accanto al pesce da cui vengono.',
            voci: [
              da('Salmone affumicato', { stato: CONG, lavorazione: ['Filetto'], uso: [CRUDO], gamma: STD, formati: ['IWP', 'Vaschetta'] }),
              da('Ritagli di salmone affumicato', { stato: CONG, lavorazione: ['Filetto'], uso: [CRUDO, PADELLA], gamma: STD, formati: ['Busta'] }),
              da('Pesce spada affumicato', { stato: CONG, lavorazione: ['Filetto'], uso: [CRUDO], gamma: STD, formati: ['IWP'] }),
              da('Tonno affumicato', { stato: CONG, lavorazione: ['Filetto'], uso: [CRUDO], gamma: STD, formati: ['IWP'] }),
              da('Marlin affumicato', { stato: CONG, lavorazione: ['Filetto'], uso: [CRUDO], gamma: STD, formati: ['IWP'] }),
              da('Alici marinate e acciughe', { stato: FRESCO, lavorazione: ['Filetto'], uso: [CRUDO], gamma: STD, formati: ['Vaschetta'] }),
              da('Bottarga di muggine', { stato: FRESCO, lavorazione: ['Intero'], uso: [CRUDO], gamma: PREMIUM, formati: ['Vaschetta'] }),
            ],
          },
        ],
      },

      /* ── 4. MOLLUSCHI E FRUTTI DI MARE ─────────────────────────── */
      {
        slug: 'catalogo-molluschi',
        nome: 'Molluschi e frutti di mare',
        occhiello: 'Cozze e vongole tutti i giorni, ostriche su ordinazione',
        titolo: 'Cozze, vongole e frutti di mare all\'ingrosso',
        sottotitolo: 'per ristoranti, pescherie e gastronomie',
        sotto: 'Sei per cento dei chili e la spesa che si ripete ogni settimana. Sbissate, sgusciate o col guscio: si dice all\'ordine e arriva così.',
        magazzino: '29',
        intro_titolo: 'Cozze di Arborea, vongole veraci, ostriche e capesante all\'ingrosso per ristoranti',
        intro: [
          '<strong>Erano insieme ai crostacei, e non c\'entravano niente.</strong> Un bivalve si compra a peso e a cassa, tutte le settimane, con la stessa lista; un crostaceo si compra a pezzo e a stagione. Insieme facevano il ventotto per cento dei chili con due logiche d\'acquisto opposte: separati, ognuno dei due ha i suoi rami e la sua pagina.',
          '<strong>Se un allevamento non carica, prendiamo dall\'altro.</strong> Le cozze di Arborea arrivano da Italia e da Spagna e si alternano: nessuna delle due copre l\'anno da sola, insieme non lasciano scoperta <strong>una sola settimana su cinquantatré</strong>. Vale uguale per vongole e ostriche.',
          '<strong>Sbissate e sgusciate senza sovrapprezzo.</strong> Le cozze arrivano già pulite se lo chiedete: sono venti minuti di cucina in meno per cassa, e su un prodotto che si compra tutte le settimane è la voce che pesa di più sul lavoro della brigata.',
          '<strong>Come arriva.</strong> Il vivo nei nostri furgoni refrigerati, con documento di registrazione del centro di depurazione, e su ogni collo l\'etichetta a norma: specie, nome scientifico, zona FAO, metodo di produzione e lotto.',
        ],
        sottocluster: [
          {
            nome: 'Vongole',
            sotto: 'Quattro per cento dei chili: il ramo singolo più pesante del cluster. In tutte e quattro le forme in cui si comprano, dalla verace col guscio alla sgusciata da sugo.',
            voci: [
              da('Vongole veraci e lupini', { stato: FRESCO, lavorazione: ['Intero'], uso: [PADELLA], gamma: STD, formati: ['Busta', 'Vaschetta'] }),
              da('Vongole con guscio marroni congelate', { stato: CONG, lavorazione: ['Intero'], uso: [PADELLA], gamma: STD, formati: ['IQF', 'Busta'] }),
            ],
          },
          {
            nome: 'Cozze',
            sotto: 'Centottantatré tonnellate l\'anno in settecentosessantasei cucine. Arborea e Scardovari le italiane di riferimento, La Spezia la locale.',
            voci: [
              da('Cozze', { stato: ENTRAMBI, lavorazione: ['Intero', 'Pulito'], uso: [PADELLA, FORNO], gamma: STD, formati: ['Busta', 'Vaschetta'] }),
            ],
          },
          {
            nome: 'Ricci e specialità',
            sotto: 'Quello che si serve crudo e si paga a pezzo. Le Gillardeau e le Fine de Claire su ordinazione, i ricci solo quando la stagione li dà.',
            voci: [
              da('Ostriche', { stato: FRESCO, lavorazione: ['Intero'], uso: [CRUDO], gamma: PREMIUM, formati: ['Vaschetta'] }),
              nuova({
                nome: 'Ricci di mare',
                sotto: 'Interi da aprire al momento oppure la sola polpa in vasetto, quando la stagione e il fermo pesca lo consentono. <strong>Non è una referenza di cella</strong>: si prenota, arriva col fresco e dura il servizio — la polpa in vasetto è l\'alternativa che regge una carta tutto l\'anno.',
                pezzature: ['interi a pezzo', 'polpa 50 g', 'polpa 100 g'],
                provenienze: ['Mediterraneo', 'Atlantico'],
                formato: 'cassette da 50 e 100 pezzi · vasetti',
                stato: FRESCO,
                lavorazione: ['Intero', 'Sgusciato'],
                uso: [CRUDO],
                gamma: PREMIUM,
                formati: ['Vaschetta'],
              }),
            ],
          },
          {
            nome: 'Telline e cannolicchi',
            sotto: 'I frutti di mare che fanno il piatto senza essere il piatto. Le telline già sgusciate sono la voce che toglie la sabbia dal problema.',
            voci: [
              da('Telline sgusciate', { stato: CONG, lavorazione: ['Sgusciato'], uso: [PADELLA], gamma: STD, formati: ['IQF', 'Busta'] }),
              da('Cannolicchi, fasolari, tartufi di mare', { stato: FRESCO, lavorazione: ['Intero'], uso: [CRUDO, PADELLA], gamma: PREMIUM, formati: ['Vaschetta'] }),
            ],
          },
          {
            nome: 'Capesante',
            sotto: 'Col guscio per il banco e la presentazione, sgusciate per chi le mette in padella e basta. Sono la noce che regge sia il crudo sia la scottatura.',
            voci: [
              da('Capesante', { stato: ENTRAMBI, lavorazione: ['Intero'], uso: [FORNO, PADELLA], gamma: PREMIUM, formati: ['IQF', 'Vaschetta'] }),
              da('Capesante sgusciate', { stato: CONG, lavorazione: ['Sgusciato'], uso: [CRUDO, PADELLA], gamma: PREMIUM, formati: ['IQF'] }),
            ],
          },
        ],
      },

      /* ── 5. PREPARATI E GASTRONOMIA DI MARE ────────────────────── */
      {
        slug: 'catalogo-gastronomia-di-mare',
        nome: 'Preparati e gastronomia di mare',
        occhiello: 'Il piatto di mare senza tre lavorazioni a monte',
        titolo: 'Preparati e gastronomia di mare all\'ingrosso',
        sottotitolo: 'per ristoranti, gastronomie e mense',
        sotto: 'Misti, zuppe, gratinati e panati già pronti. Il magazzino li ha e i clienti li comprano: fino a oggi il sito non li raccontava.',
        magazzino: '33',
        intro_titolo: 'Misti di mare, zuppe, gratinati e burger di pesce surgelati all\'ingrosso',
        intro: [
          '<strong>È il cluster che prima non esisteva.</strong> Gastronomia di mare, misti, gratinati e surimi erano referenze senza una casa: il magazzino le teneva, i clienti le compravano, e il catalogo online non le nominava. Sono trentatré referenze e dodici tonnellate l\'anno che finora hanno venduto solo al telefono.',
          '<strong>Servono a chi non ha una seconda persona in cucina.</strong> Un preparato per risotto è un piatto di mare senza tre lavorazioni diverse a monte; un gratinato esce dal forno in dodici minuti. Sono le righe che tengono in piedi un servizio quando manca il secondo cuoco, non un ripiego.',
          '<strong>Si ordina fino alle 2 di notte</strong> su WhatsApp, insieme al pesce, e si consegna entro le 11 in Toscana, Liguria ed Emilia-Romagna. Stessa fattura, stesso furgone, nessuna lista a parte.',
          '<strong>Come arriva.</strong> Congelato e in gran parte IQF, quindi si preleva la quantità del servizio e il resto resta in cella. Su ogni collo l\'etichetta a norma con specie, zona FAO, metodo di produzione e lotto, e la lista degli allergeni sui prodotti composti.',
        ],
        sottocluster: [
          {
            nome: 'Misti, zuppe e sughi',
            sotto: 'Nove decimi dei chili del cluster. Il misto già pulito e porzionato: si apre, si butta in padella e il piatto è fatto.',
            voci: [
              da('Preparati per risotto, paella e caciucco', { stato: CONG, lavorazione: ['Pulito'], uso: [PADELLA], gamma: STD, formati: ['IQF', 'Busta'] }),
              da('Tartare e carpacci monoporzione', { stato: CONG, lavorazione: ['Tartare'], uso: [CRUDO], gamma: PREMIUM, formati: ['Vaschetta'] }),
              nuova({
                nome: 'Sughi e zuppe di pesce pronti',
                sotto: 'Sugo allo scoglio, zuppa di pesce e cacciucco già pronti in busta o vaschetta, da scaldare e basta. <strong>Reggono il servizio di mezzogiorno</strong> dove la zuppa vera si fa solo la sera, e il costo porzione si sa prima perché la resa non dipende da com\'è andato il fondo.',
                pezzature: ['sugo allo scoglio 1 kg', 'zuppa 2x1,5 kg', 'cacciucco'],
                provenienze: ['Mediterraneo', 'Atlantico'],
                formato: 'buste da 1 kg · vaschette 2x1,5 kg',
                stato: CONG,
                lavorazione: ['Cotto'],
                uso: [PADELLA],
                gamma: STD,
               
                formati: ['Busta', 'Vaschetta'],
              }),
            ],
          },
          {
            nome: 'Gratinati e ripieni',
            sotto: 'Dal congelato al forno senza passaggi intermedi. È l\'antipasto caldo che non chiede né laboratorio né tempi.',
            voci: [
              nuova({
                nome: 'Cozze e capesante gratinate',
                sotto: 'Mezzo guscio già farcito e porzionato, in vassoi da 12, 24 e 48 pezzi. <strong>Vanno in forno dal congelato e escono in dodici minuti</strong>: si conta a pezzo, quindi il costo dell\'antipasto è deciso prima del servizio e non dipende da quanto pane ci è finito dentro.',
                pezzature: ['12 pz', '24 pz', '48 pz'],
                provenienze: ['Mediterraneo', 'Atlantico'],
                formato: 'vassoi IQF · cartoni da 4x1 kg',
                stato: CONG,
                lavorazione: ['Cotto'],
                uso: [FORNO],
                gamma: STD,
               
                formati: ['IQF', 'Vaschetta'],
              }),
              nuova({
                nome: 'Calamari e seppie ripieni',
                sotto: 'Ripieni a mano e già porzionati, da 80 e 120 grammi al pezzo. <strong>È il secondo di pesce che esce senza un cuoco dedicato</strong> e senza lo scarto della pulizia: si passa in padella o in forno e si impiatta.',
                pezzature: ['80 g/pz', '120 g/pz'],
                provenienze: ['Atlantico', 'Indopacifico'],
                formato: 'IQF 5x1 kg',
                stato: CONG,
                lavorazione: ['Pulito'],
                uso: [FORNO, PADELLA],
                gamma: STD,
               
                formati: ['IQF'],
              }),
            ],
          },
          {
            nome: 'Burger e spiedini',
            sotto: 'Il pesce a porzione fissa, per le mense e per le carte dove il costo di ogni riga deve essere lo stesso tutti i giorni.',
            voci: [
              nuova({
                nome: 'Burger di pesce',
                sotto: 'Hamburger di salmone, di tonno e di pesce bianco, a peso fisso da 90 e 120 grammi. <strong>La porzione non varia mai</strong>: è la riga che permette a una mensa o a un menù fisso di scrivere un prezzo e non ricalcolarlo, e va in piastra dal congelato.',
                pezzature: ['90 g/pz', '120 g/pz', 'salmone', 'tonno', 'pesce bianco'],
                provenienze: ['Atlantico', 'Indopacifico'],
                formato: 'IQF interfogliato · cartoni da 3 kg',
                stato: CONG,
                lavorazione: ['Tartare'],
                uso: [PADELLA, FORNO],
                gamma: STD,
               
                formati: ['IQF'],
              }),
              nuova({
                nome: 'Spiedini di mare',
                sotto: 'Gambero, calamaro e pesce bianco già infilzati, da 60 e 100 grammi. <strong>Si contano a pezzo e si cuociono in cinque minuti</strong>: è la voce del banco caldo e del servizio in spiaggia, dove il piatto deve uscire mentre il cliente aspetta in piedi.',
                pezzature: ['60 g/pz', '100 g/pz', 'misti', 'di gambero'],
                provenienze: ['Indopacifico', 'Atlantico'],
                formato: 'IQF 4x1 kg',
                stato: CONG,
                lavorazione: ['Pulito'],
                uso: [PADELLA, FORNO],
                gamma: STD,
               
                formati: ['IQF'],
              }),
            ],
          },
          {
            nome: 'Surimi e sostituti',
            sotto: 'Centosessantaquattro chili in due anni: è il ramo più piccolo del catalogo, e sta qui perché chi lo cerca lo cerca davvero.',
            voci: [
              nuova({
                nome: 'Surimi e polpa di granchio ricomposta',
                sotto: 'Bastoncini, chunk e polpa sfilacciata, in buste da 500 grammi e 1 chilo. <strong>Non è granchio e non lo diciamo diversamente</strong>: è il prodotto che tiene in piedi un\'insalata di mare o un uramaki a un costo porzione che il granchio vero non permette, e si scongela in frigo senza cottura.',
                pezzature: ['bastoncini 500 g', 'chunk 1 kg', 'sfilacciato 1 kg'],
                provenienze: ['Indopacifico'],
                formato: 'buste da 500 g e 1 kg',
                stato: CONG,
                lavorazione: ['Cotto'],
                uso: [CRUDO],
                gamma: STD,
               
                formati: ['Busta'],
              }),
            ],
          },
        ],
      },
    ],
  },

  {
    slug: 'per-la-cucina',
    nome: 'Per la cucina',
    sotto: 'A cosa serve la merce. Un fornitore in meno da chiamare, non un catalogo in più da sfogliare.',
    cluster: [

      /* ── 6. PATATE E FRITTI ────────────────────────────────────── */
      {
        slug: 'catalogo-patate-e-fritti',
        nome: 'Patate e fritti',
        occhiello: 'Un furgone solo, una fattura sola',
        titolo: 'Patate fritte e finger food surgelati all\'ingrosso',
        sottotitolo: 'consegnati insieme al pesce',
        sotto: 'Il tredici per cento dei chili che vendiamo, in trecentonove cucine. Non è un assortimento di scorta: è la voce non ittica che vendiamo di più.',
        magazzino: '38',
        intro_titolo: 'Patate fritte, crocchette e finger food surgelati all\'ingrosso per ristoranti',
        intro: [
          '<strong>Le patate valgono il dodici e sette per cento dei chili.</strong> Da sole. Stavano dentro una voce di menù condivisa con le basi pizza e i contorni — tre mondi che non c\'entrano nulla fra loro — e insieme facevano un quarto del venduto sotto un\'etichetta che non nominava nessuno dei tre. Adesso hanno la pagina che i chili dicono che meritano.',
          '<strong>Un fornitore in meno, non un catalogo in più.</strong> Queste voci arrivano sul furgone del pesce, entro le 11, sulla stessa fattura. Sopra i 150 € di merce la consegna è gratuita: mettere le patate nello stesso ordine spesso paga il trasporto di tutto il resto.',
          '<strong>Si ordina fino alle 2 di notte</strong> su WhatsApp, insieme al pesce, e si consegna il mattino dopo in Toscana, Liguria ed Emilia-Romagna. Nessuna lista a parte, nessun ordine minimo diverso da quello che fate già.',
          '<strong>Come arriva.</strong> Congelato e in gran parte IQF, quindi si preleva la quantità del servizio e il resto resta in cella. Cartoni da 5x2,5 kg per le patate, vassoi interfogliati per i panati.',
        ],
        foto: 'foto-prodotti/copertina-cucina.webp',
        sottocluster: [
          {
            nome: 'Patate a bastoncino',
            sotto: 'Sette e sei per cento dei chili totali del catalogo: è la referenza singola più pesante che abbiamo, pesce compreso.',
            voci: [
              da('Patate fritte', { stato: CONG, lavorazione: ['Intero'], uso: [FRITTURA, FORNO], gamma: STD, formati: ['IQF', 'Busta'] }),
            ],
          },
          {
            nome: 'Patate speciali e crocchette',
            sotto: 'Cinque per cento dei chili. Sono le patate che si mettono in carta con un nome proprio e si vendono a un prezzo diverso da un contorno di fritte.',
            voci: [
              da('Patate speciali e crocchette', { stato: CONG, lavorazione: ['Intero', 'Panato'], uso: [FRITTURA, FORNO], gamma: STD, formati: ['IQF', 'Busta'] }),
            ],
          },
          {
            nome: 'Snack e finger food',
            sotto: 'Il fritto che non è patata: quello che riempie un tagliere, un aperitivo o un menù bambini senza aggiungere lavoro in cucina.',
            voci: [
              nuova({
                nome: 'Anelli di cipolla e finger vegetali',
                sotto: 'Onion rings pastellati, jalapeño ripieni e bocconcini di verdura in pastella, in cartoni da 6x1 kg. <strong>Escono dalla friggitrice in tre minuti</strong> e stanno nello stesso cestello delle patate: è il tagliere dell\'aperitivo senza una linea di cucina dedicata.',
                pezzature: ['onion rings 6x1 kg', 'jalapeño ripieni', 'misto pastellato'],
                provenienze: ['Olanda', 'Belgio'],
                formato: 'IQF · cartoni da 6x1 kg',
                stato: CONG,
                lavorazione: ['Panato'],
                uso: [FRITTURA, FORNO],
                gamma: STD,
               
                formati: ['IQF', 'Busta'],
              }),
              nuova({
                nome: 'Mozzarelline e olive ascolane',
                sotto: 'Ascolane all\'ascolana, mozzarelline panate e crocchè, a peso fisso. <strong>Si contano a pezzo</strong>, quindi l\'antipasto misto si compone e si prezza in anticipo: è la riga che tiene il food cost del tagliere dove le porzioni a occhio lo fanno saltare.',
                pezzature: ['ascolane 20 g/pz', 'mozzarelline 25 g/pz', 'crocchè'],
                provenienze: ['Italia'],
                formato: 'IQF · cartoni da 4x2 kg',
                stato: CONG,
                lavorazione: ['Panato'],
                uso: [FRITTURA, FORNO],
                gamma: STD,
               
                formati: ['IQF'],
              }),
              nuova({
                nome: 'Panati di pesce',
                sotto: 'Bastoncini, cotolette di merluzzo e bocconcini di calamaro già impanati, a porzione fissa. <strong>È il pesce del menù bambini e della mensa</strong>: costo per pezzo deciso in anticipo, nessuno scarto e nessuna pulizia a monte.',
                pezzature: ['bastoncini 30 g/pz', 'cotolette 100 g/pz', 'bocconcini di calamaro'],
                provenienze: ['Atlantico', 'Indopacifico'],
                formato: 'IQF interfogliato · cartoni da 5 kg',
                stato: CONG,
                lavorazione: ['Panato', 'Filetto'],
                uso: [FRITTURA, FORNO],
                gamma: STD,
               
                formati: ['IQF'],
              }),
            ],
          },
        ],
      },

      /* ── 7. PANIFICATI ─────────────────────────────────────────── */
      {
        slug: 'catalogo-panificati',
        nome: 'Panificati',
        occhiello: 'Precotti: dal congelato al forno, senza lievitazione',
        titolo: 'Basi pizza, pinsa e focacce precotte all\'ingrosso',
        sottotitolo: 'consegnate insieme al pesce',
        sotto: 'L\'otto per cento dei chili. Pizza, pinsa e pane del coperto con una resa costante, senza forno a legna e senza la brigata che ci va intorno.',
        magazzino: '18',
        intro_titolo: 'Basi pizza, pinsa romana e focacce precotte surgelate all\'ingrosso per ristoranti',
        intro: [
          '<strong>Le basi pizza da sole fanno il sei e quattro per cento dei chili.</strong> Erano dentro la stessa voce delle patate e dei contorni: tre mondi in un\'etichetta sola, per il ventitré e mezzo per cento del venduto. Separati, ognuno diventa un cluster pieno — e questo è quello che serve a chi fa pizza senza avere il forno a legna.',
          '<strong>Sono precotte, non da lievitare.</strong> Vanno in forno dal congelato: l\'alveolatura è già fatta e non dipende da com\'è andata la lievitazione quel giorno. È la ragione per cui una pinsa in carta rende uguale il martedì e il sabato sera.',
          '<strong>Si ordina fino alle 2 di notte</strong> su WhatsApp, insieme al pesce, e la consegna arriva entro le 11 in Toscana, Liguria ed Emilia-Romagna. Sopra i 150 € di merce il trasporto è gratuito.',
          '<strong>Come arriva.</strong> Congelato, interfogliato dove serve, con la lista allergeni e il lotto su ogni collo. Le basi senza glutine hanno confezionamento e linea separati.',
        ],
        sottocluster: [
          {
            nome: 'Basi pizza',
            sotto: 'Ventisei tonnellate l\'anno solo la tonda da 30. È la base di chi fa pizza senza avere il forno a legna.',
            voci: [
              da('Basi pizza', { stato: CONG, lavorazione: ['Cotto'], uso: [FORNO], gamma: STD, formati: ['IQF', 'Vaschetta'] }),
            ],
          },
          {
            nome: 'Focacce, pucce e panini',
            sotto: 'Il pane del coperto che costa meno di comprarlo già pronto tutti i giorni, e non avanza mai perché si cuoce a vista.',
            voci: [
              da('Focaccia precotta', { stato: CONG, lavorazione: ['Cotto'], uso: [FORNO], gamma: STD, formati: ['Busta'] }),
              nuova({
                nome: 'Pucce e panini precotti',
                sotto: 'Pucce salentine, panini al latte e ciabattine, da 60 a 120 grammi al pezzo. <strong>Si cuoce quello che serve, quando serve</strong>: il pane fresco avanza tutte le sere, questo resta in cella e il coperto costa quello che avete deciso.',
                pezzature: ['puccia 100 g', 'panino al latte 60 g', 'ciabattina 120 g'],
                provenienze: ['Italia'],
                formato: 'cartoni da 40 e 60 pezzi',
                stato: CONG,
                lavorazione: ['Cotto'],
                uso: [FORNO],
                gamma: STD,
               
                formati: ['Busta'],
              }),
            ],
          },
          {
            nome: 'Pinsa e pala',
            sotto: 'Quindici tonnellate l\'anno. È la voce che permette di scrivere «pinsa romana» in carta con una resa costante.',
            voci: [
              da('Pinsa', { stato: CONG, lavorazione: ['Cotto'], uso: [FORNO], gamma: STD, formati: ['IQF'] }),
            ],
          },
        ],
      },

      /* ── 8. VERDURE E CONTORNI ─────────────────────────────────── */
      {
        slug: 'catalogo-verdure-e-contorni',
        nome: 'Verdure e contorni',
        occhiello: 'Nessuna stagione, nessuno scarto',
        titolo: 'Verdure surgelate e contorni all\'ingrosso',
        sottotitolo: 'consegnati insieme al pesce',
        sotto: 'Il contorno che non ha stagione e non ha scarto, e il costo porzione si sa al grammo. Quarantaquattro referenze sullo stesso ordine del pesce.',
        magazzino: '44',
        intro_titolo: 'Spinaci, fagiolini, funghi porcini e verdure grigliate surgelate all\'ingrosso',
        intro: [
          '<strong>Il contorno è la riga che nessuno controlla e che perde più soldi.</strong> Verdura fresca comprata a cassa: scarto, stagione, prezzo che cambia ogni settimana e quello che non esce si butta. Qui si preleva la quantità del servizio e il resto resta in cella — il costo porzione si sa al grammo prima di comprare.',
          '<strong>Erano dentro la voce delle patate.</strong> Patate, basi pizza e contorni in un\'etichetta sola: nessuno dei tre si trovava, perché il nome della voce ne nominava uno e mezzo. Separati, questo è un cluster da quarantaquattro referenze con cinque rami pieni.',
          '<strong>Si ordina fino alle 2 di notte</strong> su WhatsApp, insieme al pesce, e la consegna arriva entro le 11 in Toscana, Liguria ed Emilia-Romagna. Sopra i 150 € di merce il trasporto è gratuito.',
          '<strong>Come arriva.</strong> Congelato IQF, in cartoni da 4x2,5 e 5x1 kg, con lotto e allergeni su ogni collo. Le grigliate e le pastellate sono già cotte: vanno in padella o in forno e basta.',
        ],
        sottocluster: [
          {
            nome: 'Verdure a foglia e ortaggi',
            sotto: 'Metà dei chili del cluster. Spinaci, fagiolini, carciofi e cavolfiore: il contorno di tutti i giorni, quello che si mette accanto a qualsiasi secondo.',
            voci: [
              nuova({
                nome: 'Spinaci, fagiolini e ortaggi',
                sotto: 'Spinaci in cubi e a foglia, fagiolini fini, carciofi a spicchi e cavolfiore, in cartoni da 4x2,5 e 2x2,5 kg. <strong>Sono il contorno che non ha stagione e non ha scarto</strong>: si preleva la porzione del servizio, il resto resta in cella e il costo si sa al grammo.',
                pezzature: ['spinaci cubi 4x2,5 kg', 'spinaci foglia 2x2,5 kg', 'fagiolini fini', 'carciofi a spicchi', 'cavolfiore'],
                provenienze: ['Italia', 'Belgio', 'Egitto'],
                formato: 'IQF · cartoni da 4x2,5 kg',
                stato: CONG,
                lavorazione: ['Pulito'],
                uso: [PADELLA, FORNO],
                gamma: STD,
               
                formati: ['IQF', 'Busta'],
              }),
            ],
          },
          {
            nome: 'Legumi e minestroni',
            sotto: 'Il primo caldo che sta in carta d\'inverno e regge il pranzo di lavoro senza occupare un fuoco per due ore.',
            voci: [
              nuova({
                nome: 'Minestrone e legumi lessati',
                sotto: 'Minestrone classico e alla genovese, più ceci, fagioli e piselli già lessati, in buste da 1 e 2,5 chili. <strong>Vanno in pentola dal congelato</strong>: niente ammollo, niente notte prima, e la resa è la stessa a ogni servizio.',
                pezzature: ['minestrone 2,5 kg', 'ceci 1 kg', 'fagioli 1 kg', 'piselli finissimi'],
                provenienze: ['Italia', 'Belgio'],
                formato: 'IQF · buste da 1 e 2,5 kg',
                stato: CONG,
                lavorazione: ['Cotto'],
                uso: [PADELLA],
                gamma: STD,
               
                formati: ['Busta', 'IQF'],
              }),
            ],
          },
          {
            nome: 'Funghi',
            sotto: 'Porcini a cubetto e misto bosco: il fondo di una pasta o di un risotto senza dipendere da quello che il bosco ha dato quell\'anno.',
            voci: [
              nuova({
                nome: 'Funghi porcini e misto bosco',
                sotto: 'Porcini a cubetto e a fette, misto bosco e champignon trifolati, in buste da 1 chilo. <strong>Il prezzo non segue la stagione</strong>: si compra a gennaio quello che a ottobre costa il doppio, e la pasta ai porcini resta in carta tutto l\'anno con lo stesso food cost.',
                pezzature: ['porcini a cubetto 1 kg', 'porcini a fette', 'misto bosco 1 kg', 'champignon'],
                provenienze: ['Cina', 'Europa dell\'Est'],
                formato: 'IQF · buste da 1 kg',
                stato: CONG,
                lavorazione: ['Pulito'],
                uso: [PADELLA],
                gamma: STD,
               
                formati: ['IQF', 'Busta'],
              }),
            ],
          },
          {
            nome: 'Grigliate, pastellate e pronti',
            sotto: 'Verdure già cotte: si scaldano e si impiattano. È il contorno del servizio veloce e del banco caldo.',
            voci: [
              nuova({
                nome: 'Verdure grigliate e pastellate',
                sotto: 'Zucchine e melanzane grigliate, peperoni a falde e il misto di verdure in pastella, in cartoni da 5x1 kg. <strong>Sono già cotte</strong>: il grigliato si scalda e si impiatta, il pastellato va in friggitrice tre minuti — nessun fuoco occupato e nessuna resa da indovinare.',
                pezzature: ['zucchine grigliate 1 kg', 'melanzane grigliate', 'peperoni a falde', 'verdure pastellate 5x1 kg'],
                provenienze: ['Italia', 'Spagna'],
                formato: 'IQF interfogliato · cartoni da 5x1 kg',
                stato: CONG,
                lavorazione: ['Cotto', 'Panato'],
                uso: [FRITTURA, PADELLA, FORNO],
                gamma: STD,
               
                formati: ['IQF'],
              }),
            ],
          },
          {
            nome: 'Aromi e basi per soffritto',
            sotto: 'Quello che sta sotto a tutto il resto. Non è merce che si mette in carta, è merce che manca solo quando è finita.',
            voci: [
              nuova({
                nome: 'Soffritto e aromi surgelati',
                sotto: 'Trito di sedano, carota e cipolla, aglio e prezzemolo tritati, basilico e misto per pesce, in buste da 1 chilo. <strong>Si dosa a cucchiaio e non marcisce in frigo</strong>: è mezz\'ora di brigata al giorno che non si paga, e il fondo esce uguale anche quando in cucina c\'è il ragazzo nuovo.',
                pezzature: ['soffritto 1 kg', 'aglio e prezzemolo', 'basilico', 'misto per pesce'],
                provenienze: ['Italia'],
                formato: 'IQF · buste da 1 kg',
                stato: CONG,
                lavorazione: ['Pulito'],
                uso: [PADELLA],
                gamma: STD,
               
                formati: ['IQF', 'Busta'],
              }),
              da('Dispensa', { stato: ['Fresco'], lavorazione: ['Intero'], uso: [PADELLA], gamma: STD, formati: ['Vaschetta'] }),
            ],
          },
        ],
      },

      /* ── 9. PASTA E PRIMI ──────────────────────────────────────── */
      {
        slug: 'catalogo-pasta-e-primi',
        nome: 'Pasta e primi',
        occhiello: 'Il primo di pesce che esce in tre minuti',
        titolo: 'Pasta fresca, ripiena e secca all\'ingrosso',
        sottotitolo: 'consegnata insieme al pesce',
        sotto: 'Sessantaquattro referenze fra gnocchi, ripiene, trafilate al bronzo e basi per risotto. Dove manca un secondo cuoco, è la riga che salva il servizio.',
        magazzino: '64',
        intro_titolo: 'Gnocchi, ravioli al branzino e pasta trafilata al bronzo all\'ingrosso per ristoranti',
        intro: [
          '<strong>Il raviolo al branzino sta in sessantasette cucine.</strong> È il primo di pesce che esce in tre minuti: dove manca un secondo cuoco è la riga che salva il servizio, e il costo porzione è deciso prima perché si conta a pezzo.',
          '<strong>La trafilatura ruvida tiene il sugo di mare</strong>, che su una pasta liscia scivola sul fondo del piatto. Paccheri, linguine, spaghetti e busiate trafilati al bronzo, più la fregula tostata: è la parte del menù dove la materia prima si vede senza doverla spiegare.',
          '<strong>Si ordina fino alle 2 di notte</strong> su WhatsApp, insieme al pesce, e la consegna arriva entro le 11 in Toscana, Liguria ed Emilia-Romagna. Sopra i 150 € di merce il trasporto è gratuito.',
          '<strong>Come arriva.</strong> Il fresco e il ripieno congelati IQF, la secca in cartoni da 500 g e 3 kg, con lotto e allergeni su ogni collo. Le ripiene vanno dall\'acqua al piatto senza scongelare.',
        ],
        sottocluster: [
          {
            nome: 'Gnocchi',
            sotto: 'Quasi metà dei chili del cluster. Le chicche sono la voce singola più venduta della pasta: quattro tonnellate l\'anno in sessantanove cucine.',
            voci: [
              da('Gnocchetti e pasta fresca', { stato: CONG, lavorazione: ['Cotto'], uso: [PADELLA], gamma: STD, formati: ['IQF', 'Busta'] }),
            ],
          },
          {
            nome: 'Paste ripiene',
            sotto: 'Ravioli al branzino, tortelli ai crostacei e scrigni. Si contano a pezzo, quindi il primo si prezza prima del servizio.',
            voci: [
              da('Pasta ripiena', { stato: CONG, lavorazione: ['Cotto'], uso: [PADELLA], gamma: STD, formati: ['IQF', 'Vaschetta'] }),
            ],
          },
          {
            nome: 'Paste secche e trafilate',
            sotto: 'Trafilate al bronzo, più la fregula di semola tostata e le busiate. La superficie ruvida è quello che tiene il sugo sul piatto.',
            voci: [
              da('Pasta secca trafilata al bronzo', { stato: ['Fresco'], lavorazione: ['Intero'], uso: [PADELLA], gamma: STD, formati: ['Busta'] }),
            ],
          },
          {
            nome: 'Sfoglie e basi',
            sotto: 'Quello che sta sotto o intorno: sfoglia, brisée e lasagne pronte da farcire. Non si vende da solo, ma senza non esce il piatto.',
            voci: [
              nuova({
                nome: 'Sfoglie e basi da forno',
                sotto: 'Pasta sfoglia e brisée in rotoli e in quadri, più le sfoglie di lasagna già precotte. <strong>Si farciscono dal congelato</strong>: la teglia si compone il pomeriggio e va in forno al servizio, senza tirare la sfoglia e senza sbollentare niente.',
                pezzature: ['sfoglia in rotolo 1 kg', 'brisée in quadri', 'lasagne precotte 2,5 kg'],
                provenienze: ['Italia', 'Francia'],
                formato: 'cartoni da 6x1 kg · interfogliato',
                stato: CONG,
                lavorazione: ['Cotto'],
                uso: [FORNO],
                gamma: STD,
               
                formati: ['Busta', 'IQF'],
              }),
            ],
          },
          {
            nome: 'Riso e risotti',
            sotto: 'Il riso giusto per il risotto di mare, e le basi che lo fanno uscire in otto minuti invece che in venti.',
            voci: [
              nuova({
                nome: 'Riso e basi per risotto',
                sotto: 'Carnaroli e arborio in sacchi da 5 chili, più le basi di risotto precotte da mantecare. <strong>La base precotta esce in otto minuti</strong>: è quello che permette di tenere il risotto in carta a pranzo, dove venti minuti di attesa non li aspetta nessuno.',
                pezzature: ['carnaroli 5 kg', 'arborio 5 kg', 'base precotta 1 kg'],
                provenienze: ['Italia'],
                formato: 'sacchi da 5 kg · buste da 1 kg',
                stato: ['Fresco', 'Congelato'],
                lavorazione: ['Intero', 'Cotto'],
                uso: [PADELLA],
                gamma: STD,
                formati: ['Busta'],
              }),
            ],
          },
        ],
      },

      /* ── 10. DOLCI E PASTICCERIA ───────────────────────────────── */
      {
        slug: 'catalogo-dolci-e-pasticceria',
        nome: 'Dolci e pasticceria',
        occhiello: 'Martinucci · Annunziata · Sfogliagel',
        titolo: 'Dolci e pasticceria surgelata all\'ingrosso',
        sottotitolo: 'si scongela solo quello che si vende',
        sotto: 'Settantanove referenze fra monoporzioni, torte, gelati e lievitati. Le monoporzioni erano l\'unica voce online: le altre cinquantacinque fino a oggi non esistevano.',
        magazzino: '79',
        intro_titolo: 'Dessert monoporzione, torte, semifreddi e lievitati surgelati all\'ingrosso',
        intro: [
          'La voce di menù col <strong>margine più alto e la gestione peggiore</strong>: o si tiene un pasticcere, o si butta quello che non è uscito. Qui si scongela solo quello che si vende.',
          '<strong>Le monoporzioni erano ventiquattro referenze su settantanove.</strong> Il catalogo online si chiamava «Dessert monoporzione» e diceva la verità solo per un terzo della pasticceria che abbiamo: torte da taglio, semifreddi e lievitati da colazione non comparivano da nessuna parte. Sono cinquantacinque referenze che il magazzino teneva e il sito non nominava.',
          '<strong>Si ordina fino alle 2 di notte</strong> su WhatsApp, insieme al pesce, e la consegna arriva entro le 11 in Toscana, Liguria ed Emilia-Romagna. Stessa fattura, stesso furgone.',
          '<strong>Come arriva.</strong> Surgelato, interfogliato e già porzionato dove serve, con lista allergeni e lotto su ogni collo. I lievitati sono da cuocere, non da scongelare.',
        ],
        foto: 'foto-prodotti/copertina-dessert.webp',
        sottocluster: [
          {
            nome: 'Dolci al cucchiaio e specialità',
            sotto: 'Metà dei chili del cluster. I dolci che hanno un nome proprio in carta e si vendono per quello.',
            voci: [
              da('Soufflé al cioccolato', { stato: CONG, lavorazione: ['Cotto'], uso: [FORNO], gamma: PREMIUM, formati: ['IQF', 'Vaschetta'] }),
              da('Tartufo', { stato: CONG, lavorazione: ['Cotto'], uso: [CRUDO], gamma: STD, formati: ['Vaschetta'] }),
              da('Babà al rum', { stato: CONG, lavorazione: ['Cotto'], uso: [CRUDO], gamma: STD, formati: ['Vaschetta'] }),
              da('Pasticciotto crema e amarena', { stato: CONG, lavorazione: ['Cotto'], uso: [FORNO, CRUDO], gamma: STD, formati: ['IQF'] }),
            ],
          },
          {
            nome: 'Monoporzioni',
            sotto: 'Già porzionate: niente taglio durante il servizio, niente vassoio che avanza a fine sera.',
            voci: [
              da('Monoporzioni classiche', { stato: CONG, lavorazione: ['Cotto'], uso: [CRUDO], gamma: STD, formati: ['IQF', 'Vaschetta'] }),
            ],
          },
          {
            nome: 'Torte e crostate',
            sotto: 'Il dolce da taglio, per il banco della gastronomia e per i menù dove il dessert è compreso.',
            voci: [
              nuova({
                nome: 'Torte e crostate da taglio',
                sotto: 'Crostate di frutta, sacher e millefoglie in teglie da 10 e 14 porzioni, pretagliate. <strong>Il taglio è già fatto</strong>: la porzione è sempre la stessa e il vassoio non si sbriciola al secondo servizio — si tira fuori la fetta che serve e il resto resta in cella.',
                pezzature: ['10 porzioni', '14 porzioni', 'pretagliate'],
                provenienze: ['Italia'],
                formato: 'teglie interfogliate · cartoni da 4 pz',
                stato: CONG,
                lavorazione: ['Cotto'],
                uso: [CRUDO],
                gamma: STD,
               
                formati: ['Vaschetta'],
              }),
            ],
          },
          {
            nome: 'Gelati e semifreddi',
            sotto: 'Il dessert che non chiede né forno né scongelamento: si porziona e si serve, anche quando la cucina ha già chiuso.',
            voci: [
              nuova({
                nome: 'Gelati e semifreddi',
                sotto: 'Semifreddi al torroncino e al pistacchio, tartufi gelato e vaschette da 5 litri. <strong>Non si scongela niente</strong>: si porziona a palline o a fette e si serve, ed è l\'unica voce del dessert che regge anche a cucina chiusa.',
                pezzature: ['semifreddo 1,2 kg', 'vaschetta 5 lt', 'monoporzione'],
                provenienze: ['Italia'],
                formato: 'vaschette da 5 lt · cartoni da 6 pz',
                stato: CONG,
                lavorazione: ['Cotto'],
                uso: [CRUDO],
                gamma: STD,
               
                formati: ['Vaschetta'],
              }),
            ],
          },
          {
            nome: 'Lievitati e colazione',
            sotto: 'Da cuocere, non da scongelare: escono dal forno come appena fatti, e la mattina si vendono da soli.',
            voci: [
              da('Lievitati da forno', { stato: CONG, lavorazione: ['Cotto'], uso: [FORNO], gamma: STD, formati: ['IQF'] }),
            ],
          },
        ],
      },
    ],
  },
];

/* LE FOTOGRAFIE LE MANDA MATTIAS.
   In foto-prodotti/ ci sono 68 immagini d'archivio in licenza libera, e per
   un momento le avevo collegate tutte al catalogo. Sbagliato: sono state
   trovate cercando il nome del prodotto, e diverse hanno il titolo giusto e
   il contenuto sbagliato — un reperto da museo con la scala colori accanto,
   lo scaffale surgelati di un supermercato altrui, una strada di Hong Kong.
   Le foto le manda lui (26/08/2026), e finche' non arrivano ogni voce tiene
   l'etichetta col pesce disegnato: e' un segno nostro e non promette niente
   che la cassa poi non mantiene.

   Quando arrivano: mettere il file in foto-prodotti/ e il percorso nel campo
    della voce. Il generatore fa il resto da solo. */

/* ─ La glassatura si LEGGE, non si decide ────────────────────────────────
   E' l'unico attributo di questo catalogo che vale dei soldi: su un calamaro
   al 30% il prezzo reale cambia di un terzo. Il documento dice che in
   anagrafica e' compilata su 69 referenze su 982 — il sette per cento — e
   che va completata prima di andare online.

   Quindi qui non si inventa. L'unico posto in cui il dato esiste gia' sono
   le pezzature scritte a mano di quattro voci ("glassatura 30%"): da li' si
   legge, e da li' si toglie, perche' una glassatura in mezzo ai calibri e'
   un calibro che non esiste. Tutte le altre voci restano senza: meglio un
   campo vuoto che un numero che nessuno ha misurato. */
function estraiGlassatura(albero) {
  let lette = 0;
  for (const m of albero) {
    for (const c of m.cluster) {
      for (const s of c.sottocluster) {
        for (const v of s.voci) {
          if (!v.pezzature) continue;
          const trovate = v.pezzature.filter((p) => /glassatura/i.test(p));
          if (!trovate.length) continue;
          v.pezzature = v.pezzature.filter((p) => !/glassatura/i.test(p));
          v.glassatura = trovate
            .map((p) => (p.match(/(\d+\s*%)/) || [])[1])
            .filter(Boolean)
            .map((x) => x.replace(/\s+/g, ''));
          lette++;
        }
      }
    }
  }
  return lette;
}

/* ─ Una provenienza e' un posto ──────────────────────────────────────────
   Tre valori sono finiti nella colonna sbagliata quando le schede sono state
   scritte a mano: "C4" e' una pezzatura di calamaro, "selezione DelMar" e'
   una gamma. Nel testo della scheda passavano inosservati; nel filtro
   Provenienza diventano due voci di menu che promettono un paese e non lo
   sono, ed e' il tipo di dettaglio che fa smettere di fidarsi dei filtri.
   C4 torna fra le pezzature, dov'era di casa; la selezione DelMar sparisce,
   perche' quella informazione la dice gia' il badge della gamma. */
function ripulisciProvenienze(albero) {
  const SPOSTA = { C4: 'pezzature' };
  const TOGLI = new Set(['selezione DelMar']);
  let n = 0;
  for (const m of albero) {
    for (const c of m.cluster) {
      for (const s of c.sottocluster) {
        for (const v of s.voci) {
          if (!v.provenienze) continue;
          const tenute = [];
          for (const p of v.provenienze) {
            if (TOGLI.has(p)) { n++; continue; }
            if (SPOSTA[p]) {
              const dove = SPOSTA[p];
              v[dove] = v[dove] || [];
              if (!v[dove].includes(p)) v[dove].push(p);
              n++;
              continue;
            }
            tenute.push(p);
          }
          v.provenienze = tenute;
        }
      }
    }
  }
  return n;
}

/* ─ Le due voci che spariscono di proposito ──────────────────────────────
   Vanno dichiarate qui, con la ragione: una voce che non si ritrova nel
   catalogo nuovo o e' una decisione o e' una dimenticanza, e da fuori le due
   cose si assomigliano troppo. */
const SCARTATE = {
  'Alici marinate': 'unita ad "Alici marinate e acciughe", che dice le stesse cose piu\' le acciughe cantabriche',
  'Contorni vegetali': 'spezzata in tre: spinaci e ortaggi, funghi, verdure grigliate e pastellate — erano tre rami dentro una voce sola',
};

/* ─ Controlli prima di scrivere ──────────────────────────────────────────
   Meglio fermarsi qui che accorgersi fra due settimane che una voce e'
   sparita dal sito senza che nessuno l'abbia decisa. */
const conGlassatura = estraiGlassatura(MONDI);
const provRipulite = ripulisciProvenienze(MONDI);

const persi = [...libreria.keys()].filter((n) => !usate.has(n) && !SCARTATE[n]);
if (persi.length) {
  throw new Error(`Voci vecchie senza una casa e senza una ragione: ${persi.join(', ')}`);
}

let nCluster = 0;
let nSotto = 0;
let nVoci = 0;
for (const m of MONDI) {
  for (const c of m.cluster) {
    nCluster++;
    for (const s of c.sottocluster) {
      nSotto++;
      nVoci += s.voci.length;
      if (!s.voci.length) throw new Error(`Sotto-cluster vuoto: ${c.slug} / ${s.nome}`);
    }
  }
}

const uscita = {
  _nota: 'Alberatura a un asse solo: che cosa e\' il prodotto. Stato, lavorazione, uso in cucina, gamma, provenienza, pezzatura, glassatura e formato NON sono rami — sono i filtri elencati in `filtri`, e stanno come attributi su ogni voce. Chi aggiunge una referenza sceglie un sotto-cluster e compila gli attributi: non deve indovinare in quale dei cinque criteri ricade. Generato da migra-alberatura.js.',
  filtri: FILTRI,
  mondi: MONDI,
};

fs.writeFileSync(SORGENTE, JSON.stringify(uscita, null, 2) + '\n');

console.log(`  ${nCluster} cluster, ${nSotto} sotto-cluster, ${nVoci} voci`);
console.log(`  doppioni uniti: ${doppie.length}${doppie.length ? ' — ' + doppie.join(', ') : ''}`);
for (const [nome, perche] of Object.entries(SCARTATE)) {
  console.log(`  scartata di proposito: ${nome} — ${perche}`);
}
console.log(`  glassatura letta dalle pezzature di ${conGlassatura} voci; sulle altre resta vuota finche' l'anagrafica non la compila`);
console.log(`  provenienze ripulite: ${provRipulite} valori che non erano posti`);
console.log('  nessuna voce vecchia rimasta per strada');
