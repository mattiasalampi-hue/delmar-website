/* Le specie PAT che il magazzino muove davvero, e che il sito non raccontava.

   DA DOVE VENGONO QUESTI NOMI.
   Non da una lista scritta a mano: da `daily_product_sales` dell'Operations
   Hub, incrociata con `products` sulla sezione ergon "PESCATO ARCIPELAGO
   TOSCANO (PAT)". Sei mesi, dal 26 febbraio al 26 agosto 2026: 108 articoli
   movimentati per 11.833 kg. Raggruppati per specie — perche' in anagrafica
   la stessa triglia sta su tre righe diverse a seconda della pezzatura —
   fanno 51 famiglie.

   IL TAGLIO. Si pubblicano quelle con almeno 10 kg in sei mesi e almeno tre
   giornate di vendita distinte. Sotto quella soglia ci sono undici voci che
   sono passate una volta sola — il pagaro e' 1 kg in un giorno, la murena 3
   in un giorno: metterle in vetrina significa promettere un pesce che non
   arriva, ed e' il danno che il documento chiama "il primo non disponibile".
   Restano fuori dalla vetrina ma NON si cancellano le pagine di quelle che ce
   l'hanno gia': spigola, astice blu e sovaci sono sotto soglia ma sono URL
   indicizzati con testi scritti a mano, e toglierli costa piu' di quanto
   renda.

   LE FOTO NON CI SONO, e va bene cosi': le manda Mattias (26/08/2026). Fino
   ad allora ogni scheda tiene l'etichetta col pesce disegnato.

   Uso: node specie-nuove.js
*/
const fs = require('fs');
const path = require('path');

const qui = __dirname;
const FILE = path.join(qui, 'specie.json');
const esistenti = JSON.parse(fs.readFileSync(FILE, 'utf8'));

const ZONA = 'FAO 37.1.3 — Mar Tirreno settentrionale';

/* I chili di sei mesi, dal database. Servono a ORDINARE la vetrina: la
   frittura e il gambero rosa sono meta' del banco e devono stare in cima,
   il barracuda in fondo. Non finiscono in pagina — un ristoratore non
   compra perche' ne vendiamo tanto — ma decidono cosa vede per primo. */
const KG = {
  'frittura-del-giorno': 2172, 'gambero-rosa': 1884, 'triglia-di-fango': 925,
  'cicale-di-mare': 570, 'zuppa-di-pesce': 509, 'razza-clavata': 504,
  'tonno-alalunga': 497, 'gambero-bianco': 457, 'totano': 438, 'seppia': 413,
  'scampi': 360, 'pesce-spada': 339, 'pescatrice': 321, 'gambero-rosso': 249,
  'moscardino': 233, 'mazzancolle': 224, 'suro-e-sugarelli': 176,
  'gambero-viola': 145, 'ricciola': 144, 'tonno-rosso': 139, 'cefalo': 133,
  'scorfano': 127, 'triglia-di-scoglio': 115, 'tonno-alletterato': 91,
  'polpo': 66, 'san-pietro': 65, 'lanzardo': 64, 'calamaro': 56,
  'mostella': 46, 'cernia': 42, 'gobetto': 31, 'occhione-e-pezzogna': 23,
  'sogliola': 22, 'dentice': 20, 'orata': 19, 'pesce-prete': 18,
  'aragosta': 18, 'barracuda': 14, 'nasello': 12, 'ombrina': 11,
  'spigola-di-mare': 10, 'astice-blu': 4, 'sovaci': 1,
};

/* Le ventiquattro che mancavano. Il testo segue la forma delle diciannove
   gia' scritte: prima il fatto che identifica il pesce, poi cosa ci fa un
   cuoco, poi la nota operativa. Niente aggettivi da menu — un ristoratore
   sa gia' che il pesce fresco e' buono, vuole sapere cosa gli arriva. */
const NUOVE = [
  {
    slug: 'tonno-alalunga', nome: 'Tonno alalunga', scientifico: 'Thunnus alalunga',
    taglia: 'Fresco, intero', metodo: 'Palangaro e circuizione',
    pezzature: 'Da 5 a 15 kg, intero o a tranci',
    stagione: 'Estate, da giugno a settembre', cucina: 'Tranci in padella · tartare',
    conservazione: 'In ghiaccio, 48 ore',
    descrizione: [
      'È il tonno del Tirreno, quello che arriva d\'estate e non tutto l\'anno: mezza tonnellata in sei mesi, concentrata in tredici giornate. Quando c\'è ne arriva molto insieme, e quando finisce la stagione sparisce.',
      'La carne è più chiara del pinne gialle e più delicata del rosso: sta bene scottata al centro, in tartare, e regge la conservazione sott\'olio meglio di qualunque altro tonno. È il pesce con cui si scrive un piatto di tonno senza pagare il rosso.',
      'Lo forniamo intero o già a tranci: si dice all\'ordine, e la pulizia la facciamo noi.',
    ],
  },
  {
    slug: 'totano', nome: 'Totano', scientifico: 'Todarodes sagittatus',
    taglia: 'Fresco', metodo: 'Strascico e lampara',
    pezzature: 'Da 200 a 800 g, misto',
    stagione: 'Tutto l\'anno, punte in autunno', cucina: 'Ripieno · in umido · alla griglia',
    conservazione: 'In ghiaccio, 48 ore',
    descrizione: [
      'Si confonde col calamaro e non è la stessa cosa: la carne è più soda e più saporita, e chiede una cottura o molto breve o molto lunga — in mezzo diventa gomma. Quattro quintali in sei mesi, su settantasette giornate: è merce che c\'è quasi sempre.',
      'È il cefalopode che regge il ripieno e l\'umido: dove il calamaro si sfalda, il totano tiene. In griglia va aperto e passato forte, due minuti per parte.',
      'Lo puliamo noi se serve: intero, aperto, ad anelli o a strisce.',
    ],
  },
  {
    slug: 'seppia', nome: 'Seppia', scientifico: 'Sepia officinalis',
    taglia: 'Fresca, con il suo nero', metodo: 'Reti da posta e strascico',
    pezzature: 'Dalla seppiolina alla seppia grande',
    stagione: 'Primavera e autunno', cucina: 'In umido · alla griglia · col nero',
    conservazione: 'In ghiaccio, 48 ore',
    descrizione: [
      'La seppia nera fresca arriva col suo sacco intatto, ed è la ragione per cui si compra fresca invece che pulita: il nero è un ingrediente, e quello delle bustine non è la stessa cosa. Quattro quintali in sei mesi.',
      'La grande vuole tempo — un\'ora in umido e diventa tenera — la seppiolina si fa in cinque minuti in padella o fritta intera. Sono due prodotti diversi che portano lo stesso nome, e conviene ordinare la pezzatura, non la specie.',
      'La puliamo noi tenendo il nero da parte, se lo chiedete all\'ordine.',
    ],
  },
  {
    slug: 'pescatrice', nome: 'Pescatrice', scientifico: 'Lophius piscatorius',
    taglia: 'Fresca, intera o in coda', metodo: 'Strascico',
    pezzature: 'Code da 500 g a 3 kg',
    stagione: 'Tutto l\'anno', cucina: 'Al forno · in padella · guazzetto',
    conservazione: 'In ghiaccio, 48 ore',
    descrizione: [
      'Tre quintali in sei mesi, quasi tutti di pezzatura grande. È il pesce che si compra a resa: la testa è metà del peso e non si serve, quindi il prezzo al chilo dell\'intero e quello della coda pulita sono due numeri che non si confrontano.',
      'La carne non ha spine, non si sfalda e tiene qualunque cottura: è l\'unico pesce del banco che si può tagliare a medaglioni e trattare come una carne. Per questo sta in carta tutto l\'anno anche dove il pesce si vende poco.',
      'Su richiesta arriva già in coda pulita e spellata: quello che pesate è quello che impiattate.',
    ],
  },
  {
    slug: 'moscardino', nome: 'Moscardino', scientifico: 'Eledone cirrhosa',
    taglia: 'Fresco, intero', metodo: 'Strascico e nasse',
    pezzature: 'Da 40/60 a 60/80 pezzi al chilo',
    stagione: 'Autunno e inverno', cucina: 'In umido · in padella · insalata di mare',
    conservazione: 'In ghiaccio, 48 ore',
    descrizione: [
      'È il polpo che non chiede due ore di bollitura: due quintali in sei mesi su ottantuno giornate, cioè una delle voci più costanti del banco. Una fila di ventose invece di due — da qui il nome dialettale — e una carne che resta tenera senza trattamenti.',
      'Va in padella dal fresco e in dieci minuti è un antipasto. È la riga che tiene il costo porzione dove il polpo grande non ci arriva, e quella che riempie l\'insalata di mare senza far salire il food cost.',
      'Arriva intero e già pulito se lo chiedete.',
    ],
  },
  {
    slug: 'mazzancolle', nome: 'Mazzancolle', scientifico: 'Penaeus kerathurus',
    taglia: 'Fresche, intere', metodo: 'Strascico e reti da posta',
    pezzature: 'Dalla 10/20 alla 30/40 al chilo',
    stagione: 'Primavera ed estate', cucina: 'Alla griglia · al forno · in padella',
    conservazione: 'In ghiaccio, 24 ore',
    descrizione: [
      'La mazzancolla mediterranea è un gambero diverso da quello tropicale che porta lo stesso nome sul menù: guscio più sottile, carne più dolce, e un colore che in cottura vira al rosa acceso invece che al rosso. Due quintali in sei mesi.',
      'Va alla griglia intera o al forno col pangrattato: è il crostaceo che si serve senza salsa perché il sapore ce l\'ha già. Non regge la cottura lunga — un minuto in più e diventa farinosa.',
      'Su richiesta arriva sgusciata e devenata, ma su una mazzancolla il guscio è metà del piatto.',
    ],
  },
  {
    slug: 'suro-e-sugarelli', nome: 'Suro e sugarelli', scientifico: 'Trachurus trachurus',
    taglia: 'Freschi, interi', metodo: 'Circuizione e strascico',
    pezzature: 'Piccoli da frittura, medi da forno',
    stagione: 'Tutto l\'anno, punte d\'estate', cucina: 'Fritti · marinati · al forno',
    conservazione: 'In ghiaccio, 48 ore',
    descrizione: [
      'Un quintale e tre quarti in sei mesi, su trentasei giornate: è pesce azzurro di costa, quello che le barche prendono quando prendono. Costa poco e vale molto — margine alto e un sapore che regge da solo.',
      'I piccoli vanno in frittura misti agli altri azzurri, i medi al forno con le patate o marinati in aceto e olio. La spina laterale — gli scudetti che danno il nome al sugarello — va tolta prima di marinare, ed è l\'unico lavoro che chiede.',
      'Sono un pesce da servizio, non da carta: si mettono nel piatto del giorno e si vendono in giornata.',
    ],
  },
  {
    slug: 'gambero-viola', nome: 'Gambero viola', scientifico: 'Aristeus antennatus',
    taglia: 'Fresco, intero', metodo: 'Strascico di profondità',
    pezzature: 'Prima e seconda pezzatura',
    stagione: 'Estate e autunno', cucina: 'Crudo · scottato · in tartare',
    conservazione: 'In ghiaccio, 24 ore',
    descrizione: [
      'Il viola si pesca fondo, sotto i quattrocento metri, e arriva in quantità piccole: un quintale e mezzo in sei mesi su ventuno giornate. È il gambero che sta accanto al rosso in una carta di crudi, con un sapore più dolce e meno iodato.',
      'Si serve crudo o appena scottato, e basta. Qualunque cottura vera lo rovina: la carne è delicata e in padella diventa nulla.',
      'Arriva in ghiaccio e va servito entro ventiquattr\'ore. Se serve abbattuto a norma per il crudo, va detto all\'ordine.',
    ],
  },
  {
    slug: 'ricciola', nome: 'Ricciola di fondale', scientifico: 'Seriola dumerili',
    taglia: 'Fresca, intera', metodo: 'Palangaro e traina',
    pezzature: 'Da 1/3 a 20/25 kg',
    stagione: 'Estate e autunno', cucina: 'Crudo e sashimi · trance in padella',
    conservazione: 'In ghiaccio, 48 ore',
    descrizione: [
      'La ricciola di fondale è il pesce da crudo del nostro mare: un quintale e mezzo in sei mesi, in sette pezzature diverse dalla 1/3 alla 20/25. La pezzatura non è un dettaglio — sotto i tre chili è un secondo, sopra i dieci è una carta di sashimi.',
      'La carne è compatta, rosata, senza il grasso del salmone: regge il taglio sottile e non si sfalda in vetrina. Le trance delle pezzature grandi tengono anche la piastra.',
      'Per il crudo la forniamo abbattuta a norma con la relativa attestazione, ma va indicato all\'ordine: non è automatico.',
    ],
  },
  {
    slug: 'tonno-rosso', nome: 'Tonno rosso', scientifico: 'Thunnus thynnus',
    taglia: 'Fresco, intero 20/30 kg', metodo: 'Palangaro, quota gestita',
    pezzature: 'Intero 20/30 kg, o a parti',
    stagione: 'Estate, a quota disponibile', cucina: 'Crudo e sashimi · tataki',
    conservazione: 'In ghiaccio, 48 ore',
    descrizione: [
      'Il rosso del Mediterraneo si pesca a quota: arriva quando la quota lo consente e non quando serve. Un quintale e quattro in sei mesi, su cinque giornate soltanto — è merce che si prenota, non che si ordina.',
      'Le parti non valgono uguale e non si vendono uguale: la ventresca, la schiena e il filetto sono tre prodotti diversi con tre prezzi. Chi lo compra intero da 20/30 chili lo sa e lo sfrutta tutto.',
      'Arriva con la documentazione ICCAT che accompagna ogni esemplare. Per il crudo, abbattimento a norma su richiesta.',
    ],
  },
  {
    slug: 'triglia-di-scoglio', nome: 'Triglia di scoglio', scientifico: 'Mullus surmuletus',
    taglia: 'Fresca, intera', metodo: 'Reti da posta',
    pezzature: 'Piccole, medie e grandi',
    stagione: 'Tutto l\'anno, punte in estate', cucina: 'In padella · al forno · fritte',
    conservazione: 'In ghiaccio, 48 ore',
    descrizione: [
      'Non è la triglia di fango con un altro nome: vive sulla roccia, ha il muso più corto, le righe gialle sui fianchi e una carne più soda. Costa di più e vale di più — un quintale e un decimo in sei mesi, contro i nove della triglia di fango.',
      'Le grandi si sfilettano e vanno in padella con la pelle; le piccole restano intere, fritte o al forno. Il fegato non si butta: è la parte che i cuochi che la conoscono chiedono a parte.',
      'La sfilettiamo noi se serve, ma la triglia si vende intera più che sfilettata: è un pesce che si guarda.',
    ],
  },
  {
    slug: 'tonno-alletterato', nome: 'Tonno alletterato', scientifico: 'Euthynnus alletteratus',
    taglia: 'Fresco, intero', metodo: 'Circuizione e traina',
    pezzature: 'Da 2 a 8 kg',
    stagione: 'Estate e inizio autunno', cucina: 'Tranci in padella · conserve · tartare',
    conservazione: 'In ghiaccio, 48 ore',
    descrizione: [
      'È il tonno che i pescatori tengono per sé: carne scura, sapore forte, prezzo di un terzo rispetto al rosso. Novantuno chili in sei mesi su otto giornate — è un pesce di stagione corta, non una referenza di listino.',
      'Va scottato o cotto a lungo, mai in mezzo. Sott\'olio, fatto in casa, regge il confronto con qualunque conserva comprata, e in tartare vuole una mano di acidità che lo tenga.',
      'Arriva intero: la pulizia e i tranci li facciamo noi su richiesta.',
    ],
  },
  {
    slug: 'polpo', nome: 'Polpo di scoglio', scientifico: 'Octopus vulgaris',
    taglia: 'Fresco, intero', metodo: 'Nasse e reti da posta',
    pezzature: 'Da 800 g a 2,5 kg',
    stagione: 'Tutto l\'anno, punte in autunno', cucina: 'Bollito · alla griglia · in insalata',
    conservazione: 'In ghiaccio, 48 ore',
    descrizione: [
      'Il polpo di scoglio ha due file di ventose e una carne che il moscardino non ha: è il polpo da insalata e da griglia, quello che si compra quando il piatto ha il polpo nel nome. Sessantasei chili in sei mesi — poco, perché è pesca di nassa e la nassa dà quello che dà.',
      'Vuole tempo: quaranta minuti di bollitura per un chilo e mezzo, poi riposo nella sua acqua. Fatto di corsa resta duro, e non c\'è modo di rimediare dopo.',
      'Se il tempo in cucina non c\'è, i tentacoli già cotti stanno nel catalogo dei cefalopodi e si passano solo in padella.',
    ],
  },
  {
    slug: 'lanzardo', nome: 'Lanzardo', scientifico: 'Scomber colias',
    taglia: 'Fresco, intero', metodo: 'Circuizione',
    pezzature: 'Da 150 a 400 g',
    stagione: 'Estate e autunno', cucina: 'Al forno · marinato · alla griglia',
    conservazione: 'In ghiaccio, 24 ore',
    descrizione: [
      'È il cugino dello sgombro, con l\'occhio più grande e le carni un po\' più chiare. Sessantaquattro chili in sei mesi, su sette giornate: arriva a banchi, e quando arriva se ne prende quanto se ne vende in giornata.',
      'È pesce azzurro grasso, quindi si conserva poco e si cucina subito: al forno con le patate, marinato, o sulla griglia con la pelle croccante. Il grasso è il motivo per cui è buono ed è anche il motivo per cui non aspetta.',
      'Va ordinato per il giorno stesso: a ventiquattr\'ore è un altro pesce.',
    ],
  },
  {
    slug: 'mostella', nome: 'Mostella', scientifico: 'Phycis blennoides',
    taglia: 'Fresca, intera', metodo: 'Strascico e palangaro di fondo',
    pezzature: 'Da 300 g a 1,5 kg',
    stagione: 'Autunno e inverno', cucina: 'Al forno · in guazzetto · zuppe',
    conservazione: 'In ghiaccio, 48 ore',
    descrizione: [
      'La musdea è un pesce che quasi nessuno mette in carta col suo nome, e che chi lo conosce compra tutte le volte che c\'è: carne bianca, dolce, che si sfalda a scaglie larghe come il merluzzo ma con più sapore. Quarantasei chili in sei mesi, su cinque giornate.',
      'Sta bene al forno intera e in guazzetto, e regge la zuppa senza disfarsi. È un pesce di profondità, quindi la pelle è delicata e va maneggiato poco.',
      'È merce da poche casse: quando c\'è va presa, perché la settimana dopo può non esserci.',
    ],
  },
  {
    slug: 'cernia', nome: 'Cernia', scientifico: 'Epinephelus marginatus',
    taglia: 'Fresca, intera', metodo: 'Palangaro e nasse',
    pezzature: 'Da 1 a 5 kg',
    stagione: 'Estate e autunno', cucina: 'Al forno · in trance · guazzetto',
    conservazione: 'In ghiaccio, 48 ore',
    descrizione: [
      'Quarantadue chili in sei mesi su nove giornate: è il pesce da carta importante del nostro mare, e arriva a pezzi singoli, non a casse. Chi la vuole la prenota.',
      'La carne è bianca, compatta e grassa al punto giusto: regge il forno intera, le trance in padella e il guazzetto senza sfaldarsi. Su una cernia di tre chili si costruisce un servizio intero.',
      'Arriva intera con la sua etichetta di tracciabilità. La sfilettiamo noi se il piatto lo chiede.',
    ],
  },
  {
    slug: 'occhione-e-pezzogna', nome: 'Occhione e pezzogna', scientifico: 'Pagellus bogaraveo',
    taglia: 'Fresco, intero 200/300', metodo: 'Palangaro di fondo',
    pezzature: '200/300 g, pezzature miste',
    stagione: 'Autunno e inverno', cucina: 'Al forno · all\'acqua pazza · alla griglia',
    conservazione: 'In ghiaccio, 48 ore',
    descrizione: [
      'L\'occhio grande da cui prende il nome dice da dove viene: è un pesce di profondità, e la carne se ne accorge — bianca, fine, con un grasso che al forno diventa il fondo del piatto. Ventitré chili in sei mesi.',
      'La pezzatura 200/300 è la porzione singola: un pesce a testa, al forno o all\'acqua pazza, e il piatto è fatto. È il pesce che permette di scrivere un secondo intero senza porzionare niente.',
      'Arriva a casse piccole e non tutte le settimane: è pesca di palangaro, e dipende dalla giornata.',
    ],
  },
  {
    slug: 'sogliola', nome: 'Sogliola', scientifico: 'Solea solea',
    taglia: 'Fresca, intera', metodo: 'Reti da posta e strascico',
    pezzature: 'Da 150 a 400 g',
    stagione: 'Inverno e primavera', cucina: 'In padella · al burro · fritta',
    conservazione: 'In ghiaccio, 48 ore',
    descrizione: [
      'Ventidue chili in sei mesi: è la voce piccola che però non manca mai dalle carte di chi lavora sul classico. La sogliola di rete è un altro prodotto rispetto a quella di allevamento — più sottile, più saporita, e con una pelle che si stacca in un colpo solo.',
      'Va in padella intera, spellata dalla parte scura, con burro e limone: è un piatto che non si è mai aggiornato perché non ne ha bisogno. Le piccole si friggono intere.',
      'La spelliamo e sfilettiamo noi se serve, ma su una sogliola la lisca dà metà del sapore.',
    ],
  },
  {
    slug: 'dentice', nome: 'Dentice', scientifico: 'Dentex dentex',
    taglia: 'Fresco, intero', metodo: 'Palangaro e traina',
    pezzature: 'Da 800 g a 3 kg',
    stagione: 'Estate e autunno', cucina: 'Crudo · al forno · alla griglia',
    conservazione: 'In ghiaccio, 48 ore',
    descrizione: [
      'Il dentice di palangaro è uno dei pochi pesci che sta bene sia crudo sia al forno, e questo lo rende la voce più flessibile di una carta di pesce. Venti chili in sei mesi su otto giornate: arriva a esemplari, non a casse.',
      'La carne è bianca, soda e con poca acqua: al crudo si taglia netto e non rilascia, al forno resta intera. La pezzatura sopra i due chili è quella che vale la pena portare in sala tutta.',
      'Per il crudo lo forniamo abbattuto a norma con attestazione, se indicato all\'ordine.',
    ],
  },
  {
    slug: 'orata', nome: 'Orata di mare', scientifico: 'Sparus aurata',
    taglia: 'Fresca, di pesca', metodo: 'Reti da posta',
    pezzature: 'Da 600 g a 3 kg e oltre',
    stagione: 'Autunno e inverno', cucina: 'Al forno · in crosta di sale · alla griglia',
    conservazione: 'In ghiaccio, 48 ore',
    descrizione: [
      'Questa è orata di pesca, non di allevamento: le due cose portano lo stesso nome e sono due prodotti diversi, per carne, prezzo e disponibilità. Diciannove chili in sei mesi — l\'orata selvatica arriva quando arriva.',
      'La carne è più soda e meno grassa di quella di gabbia, e la pezzatura non è mai costante: si compra quello che c\'è. Sopra i due chili è un pesce da tavolo, da portare intero.',
      'L\'orata di allevamento in tutti i calibri sta nel catalogo del pesce, dove non manca una settimana.',
    ],
  },
  {
    slug: 'aragosta', nome: 'Aragosta', scientifico: 'Palinurus elephas',
    taglia: 'Fresca, viva', metodo: 'Nasse e reti da posta',
    pezzature: 'Da 400 g a 1,5 kg',
    stagione: 'Estate, fuori dal fermo', cucina: 'Alla griglia · catalana · in pasta',
    conservazione: 'Viva, in cella umida',
    descrizione: [
      'Diciotto chili in sei mesi su otto giornate: l\'aragosta dell\'Arcipelago è pesca di nassa e ha un fermo che va rispettato, quindi non è un prodotto di listino — è un prodotto di stagione, e si prenota.',
      'Rispetto all\'astice non ha le chele, quindi tutta la carne è nella coda: è il crostaceo della catalana e della pasta, e in griglia va tagliato a metà per il lungo.',
      'Arriva viva. L\'aragosta che c\'è tutto l\'anno, dal Mediterraneo e dall\'Atlantico, sta nel catalogo dei crostacei.',
    ],
  },
  {
    slug: 'barracuda', nome: 'Barracuda', scientifico: 'Sphyraena viridensis',
    taglia: 'Fresco, intero', metodo: 'Reti da posta e traina',
    pezzature: 'Da 1 a 4 kg',
    stagione: 'Estate e autunno', cucina: 'A tranci in padella · al forno · affumicato',
    conservazione: 'In ghiaccio, 48 ore',
    descrizione: [
      'Fino a vent\'anni fa nel Tirreno non c\'era, e adesso arriva tutte le estati: è uno dei pesci che il mare che si scalda ha portato qui. Quattordici chili in sei mesi, su tre giornate.',
      'La carne è bianca, soda e senza spine piccole: a tranci in padella si comporta come un pesce spada piccolo, e affumicato è sorprendente. Va cotto bene, mai al sangue.',
      'È un pesce che va spiegato in sala: chi lo assaggia lo riordina, chi legge il nome in carta senza sapere cos\'è lo salta.',
    ],
  },
  {
    slug: 'nasello', nome: 'Nasello', scientifico: 'Merluccius merluccius',
    taglia: 'Fresco, intero', metodo: 'Strascico e palangaro',
    pezzature: 'Da 200 g a 1,5 kg',
    stagione: 'Tutto l\'anno', cucina: 'Al vapore · in padella · per bambini',
    conservazione: 'In ghiaccio, 24 ore',
    descrizione: [
      'Il nasello di pesca è un pesce delicatissimo: dodici chili in sei mesi ma su undici giornate diverse, cioè poche casse per volta e spesso. Va trattato con cura perché la carne cede in fretta — è il pesce che si giudica dalla freschezza più di ogni altro.',
      'È il bianco per eccellenza: al vapore, in padella, nei piatti per i bambini e nelle diete. Senza spine se sfilettato bene, senza sapore forte, senza niente che dia fastidio.',
      'Va ordinato per il giorno: a ventiquattr\'ore non è più lo stesso prodotto.',
    ],
  },
  {
    slug: 'ombrina', nome: 'Ombrina', scientifico: 'Umbrina cirrosa',
    taglia: 'Fresca, di pesca', metodo: 'Reti da posta',
    pezzature: 'Piccole e medie',
    stagione: 'Primavera ed estate', cucina: 'Crudo · al forno · in padella',
    conservazione: 'In ghiaccio, 48 ore',
    descrizione: [
      'L\'ombrina di pesca è rara: undici chili in sei mesi, su tre giornate. È un pesce di fondale sabbioso vicino a riva, e da queste parti arriva a esemplari singoli.',
      'La carne è bianca e compatta, con un sapore più deciso della spigola: sta bene cruda, al forno e in padella con la pelle. Il barbiglio sotto il mento è il segno che la distingue dalla corvina.',
      'L\'ombrina boccadoro di allevamento, in tutti i calibri e senza stagione, sta nel catalogo del pesce.',
    ],
  },
];

/* ─ Il montaggio ─────────────────────────────────────────────────────────
   Le nuove entrano con i campi comuni gia' messi; le vecchie restano come
   sono. Poi si ordina tutto per chili: chi apre la vetrina vede per primo
   quello che davvero passa dal banco. */
const nuove = NUOVE.map((s) => ({
  slug: s.slug,
  foto: null,
  nome: s.nome,
  taglia: s.taglia,
  scientifico: s.scientifico,
  descrizione: s.descrizione,
  zona: ZONA,
  metodo: s.metodo,
  pezzature: s.pezzature,
  stagione: s.stagione,
  cucina: s.cucina,
  conservazione: s.conservazione,
}));

const gia = new Set(esistenti.map((s) => s.slug));
const doppie = nuove.filter((s) => gia.has(s.slug));
if (doppie.length) {
  throw new Error(`Queste specie esistono gia' in specie.json: ${doppie.map((s) => s.slug).join(', ')}`);
}

const tutte = [...esistenti, ...nuove]
  .sort((a, b) => (KG[b.slug] || 0) - (KG[a.slug] || 0));

const senzaChili = tutte.filter((s) => !KG[s.slug]).map((s) => s.slug);

fs.writeFileSync(FILE, JSON.stringify(tutte, null, 1) + '\n');

console.log(`  specie.json — ${esistenti.length} esistenti + ${nuove.length} nuove = ${tutte.length}`);
console.log(`  ordinate per chili venduti negli ultimi sei mesi (dal database dell'hub)`);
if (senzaChili.length) console.log(`  ATTENZIONE, senza dato di vendita: ${senzaChili.join(', ')}`);
