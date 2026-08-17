/* ── Banco di pesciolini ─────────────────────────
   Prendono il posto delle bolle nella sezione contatti: scappano dal
   calamaro (il puntatore) e ogni tanto si riesce a prenderne uno.

   PERCHE' UNA FABBRICA E NON UN BLOCCO CHE PARTE DA SOLO. Il banco di
   prova in prove/ ne accende uno per ogni variante di sfondo, con
   confini diversi, e il sito uno solo: una funzione che si chiama con
   le sue opzioni serve entrambi senza copiare niente.

   IL CONFINE ARRIVA DA FUORI. La sezione e' divisa in due campiture e i
   pesci cambiano colore attraversandola, ma DOVE passi la divisione lo
   sa solo chi disegna lo sfondo: dritta a meta', ondulata, in diagonale.
   Chi ci chiama passa una funzione confine(y, t) e i pesci la seguono,
   qualunque forma abbia.

   window.DelMarPesci(tela, opzioni) -> { ferma(), presi() }
*/
/* ── IL DITO ─────────────────────────────────────
   Sul telefono il gioco non esisteva, e la ragione era che i pesci non
   guardano il puntatore: guardano il CALAMARO. E il calamaro, giustamente,
   sul telefono non si accende mai — sostituisce il cursore di sistema, e su
   uno schermo tattile un cursore non c'e'. Quindi i pesci non avevano da
   cosa scappare e nuotavano beati.

   Qui il dito prende il posto del calamaro. Vive solo mentre tocca: appena
   si stacca, sparisce. Un puntatore fermo dove il dito ha lasciato l'ultima
   volta terrebbe i pesci in fuga da un fantasma.

   Sta fuori dalla fabbrica perche' di dita ce n'e' uno solo anche quando in
   pagina ci sono due banchi di pesci: tre ascoltatori in tutto, non tre per
   ogni tela. */
window.DelMarDito = (function () {
  let ora = null;     /* dov'e' adesso, in coordinate di finestra */
  let prima = null;   /* dov'era al tocco precedente */

  /* ── SCORRERE O GIOCARE ────────────────────────
     Il dito serve a due cose che si escludono: far scendere la pagina e
     tagliare i pesci.

     Sopra l'acqua vince il gioco, sempre: la pagina resta ferma finche' il
     dito e' li'. Avevo provato a decidere dalla direzione — orizzontale
     gioco, verticale scorrimento — ed era troppo sottile: si sciabola in
     tutte le direzioni e mezze passate finivano a far scorrere la pagina.
     Si scorre da FUORI, e basta.

     Si puo' fare perche' l'area di gioco non riempie mai lo schermo: sul
     telefono l'apertura e' alta 56vh, quindi sotto resta quasi meta'
     schermata da cui far scendere la pagina. Se un domani una di queste
     tele diventasse alta quanto il viewport, questo blocco incastrerebbe
     chi legge — e' la cosa da ricordare prima di allungarne una.

     DUE ECCEZIONI, e sono necessarie:
     · si blocca solo su schermo tattile (pointer: coarse), cioe' telefono e
       tavoletta. Sul portatile con schermo tattile comanda il mouse e il
       gioco e' quello del calamaro.
     · non si blocca quando il dito si appoggia su CONTENUTO — un
       collegamento, un campo del modulo, il testo dell'apertura. Nella
       sezione contatti della home la tela copre anche il modulo: senza
       questa riga non si potrebbe piu' scorrere con il dito sopra i campi,
       e la pagina sembrerebbe rotta.
     (Mattias, 2026-08-17) */
  const zone = [];        /* le tele su cui si gioca */
  let inZona = false;     /* il tocco e' partito sopra l'acqua? */

  function tattile() {
    return matchMedia('(pointer: coarse)').matches;
  }

  /* Quello che sta SOPRA la tela e va lasciato al suo mestiere. La tela e'
     trasparente ai tocchi, quindi il bersaglio dell'evento e' gia' l'elemento
     di contenuto quando ce n'e' uno.

     QUI CI STA SOLO ROBA CHE SI TOCCA PER USARLA. Nella prima versione
     c'era anche .pr-hero-in, il blocco del titolo, per non rubare gesti sul
     testo: su schermo stretto quel blocco occupa quasi tutta l'apertura,
     quindi quasi ovunque il dito si appoggiasse risultava "sul contenuto" e
     la pagina scorreva lo stesso. Il gioco sembrava non funzionare mai.
     Un titolo non e' un comando: sopra il titolo si gioca.
     La griglia dei contatti invece resta, perche' li' c'e' un modulo da
     compilare e togliere lo scorrimento sopra i campi romperebbe la pagina.
     (Mattias, 2026-08-17) */
  function suContenuto(t) {
    return !!(t && t.closest && t.closest('a, button, input, textarea, select, label, .contatti-grid'));
  }

  function sopraUnaTela(x, y) {
    for (const c of zone) {
      const r = c.getBoundingClientRect();
      if (r.width && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
    }
    return false;
  }

  /* IL TRATTO SI MISURA FRA DUE TOCCHI, NON FRA DUE FOTOGRAMMI.
     La prima versione faceva avanzare "prima" a fine fotogramma, ed era
     sbagliata appena in pagina c'e' piu' di una tela: la prima a disegnare
     consumava il tratto, e tutte le altre vedevano un dito fermo. Nel banco
     di prova ce ne sono quattro. Qui non c'e' niente da consumare — chiunque
     legga trova lo stesso segmento — e non conta chi disegna per primo.
     (Mattias, 2026-08-17) */
  /* LA SCIA. Il taglio si deve vedere, se no non si capisce di aver fatto
     qualcosa: il dito copre il punto in cui passa, ed e' proprio quello che
     nasconde l'unica risposta visiva. Si tengono i punti degli ultimi 220
     millisecondi — piu' corta sembra un puntino, piu' lunga uno strascico
     che resta appeso quando il dito e' gia' fermo. */
  const VITA = 220;
  let scia = [];

  function segna(e) {
    const t = e.touches && e.touches[0];
    if (!t) return;
    prima = ora || { x: t.clientX, y: t.clientY };
    ora = { x: t.clientX, y: t.clientY };
    scia.push({ x: t.clientX, y: t.clientY, t: performance.now() });
  }

  function inizio(e) {
    const t = e.touches && e.touches[0];
    if (!t) return;
    inZona = tattile() && !suContenuto(e.target) && sopraUnaTela(t.clientX, t.clientY);
    segna(e);
  }

  function muove(e) {
    segna(e);
    /* Sopra l'acqua la pagina non si muove. Fuori, non tocchiamo niente */
    if (inZona && e.cancelable) e.preventDefault();
  }

  function stacca() {
    ora = null;
    prima = null;
    inZona = false;
  }

  addEventListener('touchstart', inizio, { passive: true });
  /* NON passivo, se no preventDefault viene ignorato ed e' tutto inutile.
     Costa un pelo di prestazioni su ogni scorrimento della pagina, e per
     questo la funzione esce subito quando il tocco non e' partito su una
     tela — che e' il caso di quasi tutti gli scorrimenti */
  addEventListener('touchmove', muove, { passive: false });
  addEventListener('touchend', stacca, { passive: true });
  addEventListener('touchcancel', stacca, { passive: true });

  return {
    posizione: function () {
      if (!ora) return null;
      return { x: ora.x, y: ora.y, px: prima.x, py: prima.y, attivo: true };
    },
    /* Ogni banco dichiara la sua tela: e' cosi' che si sa se un tocco e'
       partito su un'area di gioco o sul resto della pagina */
    zona: function (cvs) {
      if (zone.indexOf(cvs) < 0) zone.push(cvs);
    },

    /* I punti ancora vivi, con quanto gli resta da 1 a 0. La potatura sta
       qui e non nel disegno perche' le tele possono essere piu' d'una e la
       scia e' una sola */
    scia: function () {
      const adesso = performance.now();
      if (scia.length && adesso - scia[scia.length - 1].t > VITA) scia = [];
      else scia = scia.filter((p) => adesso - p.t < VITA);

      return scia.map((p) => ({ x: p.x, y: p.y, vita: 1 - (adesso - p.t) / VITA }));
    }
  };
})();

window.DelMarPesci = function (cvs, opzioni) {
  const o = Object.assign({
    /* Pochi e grossi, non tanti e minuti: a questa taglia cinquanta
       pesci coprono il fondo e sembrano un acquario sovraffollato */
    /* SUL TELEFONO PIU' FITTI, non meno.
       Nove era il numero giusto quando i pesci erano decorazione: pochi,
       per non appesantire uno schermo piccolo. Da quando col dito ci si
       gioca il conto cambia — una sciabolata li fa scattare via tutti
       insieme e su 390 pixel di larghezza restano due secondi di acqua
       vuota, che e' il momento in cui si smette di giocare. Con venti il
       banco si ricompone subito e c'e' sempre un bersaglio a tiro.
       (Mattias, 2026-08-17) */
    quanti:   () => (window.matchMedia('(max-width: 768px)').matches ? 24 : 20),
    /* Negativo = nessuna divisione, tutti del colore chiaro */
    confine:  () => -1,
    /* DUE SPECIE, non una. Con un colore solo il banco sembrava una
       colonia di girini tutti uguali; bastano due livree perche' l'occhio
       ci legga dei pesci.
       Ognuna ha due palette: 'scuro' e' come si vede sulla campitura blu,
       dove servono luminosi, 'chiaro' sul fondo bianco, dove un colore
       slavato si confonderebbe con la carta. Quattro combinazioni in
       tutto, e servono tutte e quattro.
       La quota decide quanti ne nascono di quella specie: meta' e meta'
       sembra una scacchiera, due terzi e un terzo sembra un banco con
       qualche pesce diverso in mezzo. */
    specie: [
      { quota: .68,
        scuro:  { corpo: [168, 214, 255], bordo: [214, 236, 255] },
        chiaro: { corpo: [ 42, 150, 210], bordo: [ 10, 108, 168] } },
      /* Il corallo del marchio: e' gia' il secondo colore del sito,
         quindi non entra niente di nuovo nella tavolozza */
      { quota: .32,
        scuro:  { corpo: [255, 158, 120], bordo: [255, 208, 184] },
        chiaro: { corpo: [206,  84,  56], bordo: [156,  50,  30] } }
    ],
    sfuma:    90,     /* larghezza della fascia in cui il colore vira */
    fuga:     190,    /* da quanto lontano si accorgono del calamaro */
    /* Quanto largo e' il bersaglio, in multipli del CORPO del pesce.
       1 = bisogna toccarlo davvero. Non e' piu' una distanza in pixel:
       lo era, ed era sbagliato in due modi. Fissa, non teneva conto di
       quanto e' grande il pesce che stai prendendo; e misurata dal
       centro, con pesci lunghi trenta pixel e un raggio di
       cinquantaquattro si prendevano restando a un corpo di distanza —
       il calamaro passava ACCANTO e il punto veniva assegnato lo
       stesso. Sopra 1.4 torna quel difetto, sotto .8 diventa un gioco
       di precisione al pixel */
    presa:    1,
    /* Quanto sono grandi, e quanto si vedono.

       'velo' moltiplica l'opacita' di TUTTO il disegno — corpo, pinne,
       ombra, occhio — invece di scolorire le tinte. La differenza si
       vede: schiarendo i colori il pesce resta un adesivo pallido
       appoggiato sopra, mentre abbassando l'opacita' l'acqua gli passa
       attraverso e sta DENTRO la scena. Sotto .45 pero' spariscono
       contro la campitura chiara, e sopra 1 non succede niente.

       QUESTI DEFAULT SONO I PESCI DEL SITO, non valori neutri: sono
       stati scelti guardandoli. Stanno qui e non nelle due chiamate che
       li accendono perche' i pesci sono UNO SOLO in tutto il sito —
       scritti in due posti, il giorno che si ritoccano se ne aggiorna
       uno e l'altro resta indietro, e che la home abbia pesci diversi
       dalle altre pagine non lo nota nessuno finche' non e' online da
       un mese. Il banco di prova in prove/ li sovrascrive quando vuole
       confrontare le rese. */
    taglia:   3.2,
    velo:     .62,
    /* Quanto sono bravi a scappare. UNA manopola invece dei sei numeri
       che la difficolta' era prima: raggio di percezione, prontezza
       della virata, punta di velocita', consumo e recupero del fiato,
       calo da stanchi. Erano sparsi dentro il ciclo e alzarne uno solo
       non serviva a niente — un pesce che scatta forte ma si accorge
       tardi si prende lo stesso, uno che vede da lontano ma accelera
       piano pure.
       1 = il banco di sempre. Sopra 2,2 diventano imprendibili, e un
       gioco che non si vince smette di essere un gioco. */
    bravura:  1.85,
    /* Come sono disegnati: 1 piatti, 2 con volume, 3 su piu' profondita',
       4 con pinne e ombra. Cambia SOLO il disegno, il comportamento e' lo
       stesso — cosi' si confrontano le rese senza cambiare il gioco */
    stile:    1,
    /* Il "+1" che sale, come nei videogiochi. Si puo' spegnere: sul sito
       vero potrebbe non volersi, in un banco di prova serve sempre */
    punteggio: true,
    /* Entro quanti millisecondi due bocconi fanno combo */
    combo:    1400,
    onPreso:  null
  }, opzioni || {});

  const ctx = cvs.getContext('2d');
  let W = 0, H = 0, t = 0, raf = null, presi = 0;
  const pesci = [];

  /* I sei numeri che 'bravura' governa, calcolati una volta sola: sono
     uguali per tutti i pesci a ogni fotogramma, e rifarli cinquanta
     volte per sessanta fotogrammi al secondo e' lavoro buttato */
  const BRA = Math.max(.2, o.bravura);
  /* Se ne accorgono da piu' lontano */
  const RAGGIO = o.fuga * (1 + (BRA - 1) * .35);
  /* E girano prima verso il largo invece di continuare dritti un
     istante di troppo — che e' l'istante in cui li si prende */
  const VIRATA = Math.min(.62, .35 * (1 + (BRA - 1) * .5));
  /* Quando il puntatore e' ancora lontano non scattano: accelerano
     appena, come un pesce che ha notato qualcosa e si allontana senza
     agitarsi */
  const ALLERTA = 1.5 * BRA;
  /* Oltre .45 l'inseguimento della velocita' obiettivo la scavalca e il
     pesce vibra sul posto invece di accelerare */
  const PRONTI = Math.min(.45, .12 * BRA);
  /* Piu' sono bravi, piu' tardi si stancano e prima si riprendono */
  const STANCA = .012 / BRA;
  const RIFIATA = .006 * BRA;
  const CALO = .34 / BRA;

  /* ── Lo scatto ──────────────────────────────
     Un pesce vero non accelera: fa una C con il corpo e SPARISCE, in
     un ventesimo di secondo, poi plana. E' la ragione per cui prenderne
     uno a mano e' quasi impossibile — non e' che nuoti veloce, e' che
     la sua reazione dura meno del tuo movimento.
     Prima qui c'era una sola velocita' che saliva col vicinarsi del
     puntatore: dava un pesce che scivolava via sempre uguale, e a
     inseguirlo lo si prendeva perche' la sua fuga era prevedibile. */
  /* Da qui in dentro scatta. Piu' stretto del raggio in cui si
     insospettisce: fuori resta l'allerta, che e' quello che rende
     leggibile lo scatto quando poi arriva */
  const VICINO = RAGGIO * .46;
  /* Velocita' di punta, in multipli dell'andatura di crociera */
  const PUNTA = 9 * BRA;
  /* Quanto dura, in fotogrammi: un soffio. Piu' lungo diventa una
     corsa, e una corsa si insegue */
  const DURATA = 11;
  /* Quanto si riposa prima di poterne fare un altro. I bravi ne
     incatenano di piu' */
  const RICARICA = Math.round(52 / BRA);
  /* La planata dopo lo scatto. Con .93 la velocita' si dimezza in circa
     dieci fotogrammi: si vede partire come una fucilata e spegnersi,
     che e' esattamente il profilo di una fuga vera */
  const PLANA = .93;
  /* Di quanto la direzione di fuga si scosta da "esattamente opposto al
     predatore". Serve a NON farli prevedibili: un pesce che scappa
     sempre in linea retta lontano dal dito si prende anticipandolo, e
     in natura infatti scattano di lato con un angolo che non si sa */
  const OBLIQUO = .95;

  /* Tutto quello che succede DOPO il boccone e non e' un pesce: anelli,
     schizzo, numero che sale. Una lista sola con dentro cose diverse,
     perche' nascono e muoiono tutte allo stesso modo */
  const botti = [];
  let ultimoBoccone = -9999;
  let filaCombo = 0;

  const caso = (a, b) => a + Math.random() * (b - a);

  function misura() {
    W = cvs.width  = cvs.offsetWidth;
    H = cvs.height = cvs.offsetHeight;
  }

  function nuovo(daBordo) {
    /* Chi rientra dopo essere stato preso nasce FUORI dal bordo, non in
       mezzo alla scena: un pesce che si materializza davanti agli occhi
       rovina il gioco */
    const versoDestra = Math.random() < .5;
    /* Profondita': 0 = lontano sul fondo, 1 = vicino. Da lontano piu'
       piccoli, piu' smorti e piu' lenti — sono le tre cose insieme a
       fare la profondita', una sola non basta e sembra solo un pesce
       piccolo */
    const z = caso(.35, 1);
    /* Andatura di crociera BASSA. Un pesce indisturbato non corre: sta
       quasi fermo a mangiare e si sposta piano. Tutta la velocita' che
       ha in corpo se la tiene per lo scatto, ed e' il contrasto fra le
       due andature a farlo sembrare vivo — se nuota gia' svelto, lo
       scatto non si legge come una reazione ma come un aumento di
       giri */
    const v = caso(.34, .72) * (.55 + z * .45);
    /* La specie si tira a sorte una volta sola: un pesce che cambia
       livrea mentre nuota non e' un pesce */
    let q = Math.random(), sp = 0;
    for (let i = 0; i < o.specie.length; i++) {
      if ((q -= o.specie[i].quota) < 0) { sp = i; break; }
      sp = i;
    }
    return {
      sp,
      /* Chi rientra nasce appena fuori dal bordo. Anche qui la distanza e'
         proporzionale: trenta pixel fissi su un telefono sono un'attesa
         lunga proprio dopo aver preso un pesce, cioe' nel momento in cui si
         sta guardando lo schermo per vedere cos'e' successo */
      x: daBordo ? (versoDestra ? -Math.min(30, W * .04) : W + Math.min(30, W * .04)) : caso(0, W),
      y: caso(H * .06, H * .94),
      ang: versoDestra ? caso(-.4, .4) : Math.PI + caso(-.4, .4),
      v,
      vBase: v,
      z,
      lung: caso(7, 13) * (.5 + z * .6) * o.taglia,
      fase: caso(0, Math.PI * 2),
      /* Ognuno vira per conto suo, se no il banco sembra una griglia */
      giro: caso(-.006, .006),
      giroA: caso(0, Math.PI * 2),
      /* Quanto e' stanco di scappare: da 0 a 1. Serve a renderli
         PRENDIBILI — a fondo scala scattano sempre e non ne prendi mai
         uno, e un gioco che non si vince smette di essere un gioco */
      fiato: 0,
      lampo: 0,
      /* Fotogrammi che restano allo scatto in corso, e in che direzione
         va. Zero = sta nuotando normalmente */
      scatto: 0,
      scattoAng: 0,
      /* Quanto deve aspettare prima di poterne fare un altro. Senza
         questa pausa il pesce scatterebbe a ogni fotogramma finche' il
         puntatore gli sta vicino, e uno scatto continuo non e' uno
         scatto: e' una fuga a velocita' costante */
      ricarica: 0
    };
  }

  /* ── Il boccone ──────────────────────────────
     Tre cose insieme, e servono tutte e tre: l'ANELLO dice dove, lo
     SCHIZZO dice che si e' rotto qualcosa, il NUMERO dice quanto vale.
     Una sola non basta — un anello da solo sembra un'increspatura, un
     numero da solo sembra un errore di stampa. */
  function boccone(x, y, ang) {
    presi++;

    /* Combo: prenderne due di fila entro un attimo vale di piu'. E'
       quello che trasforma "clicca sui pesci" in un gioco — senza, la
       decima cattura vale come la prima e non c'e' motivo di insistere */
    const ora = t;
    filaCombo = (ora - ultimoBoccone) < (o.combo / 1000) ? filaCombo + 1 : 1;
    ultimoBoccone = ora;

    /* Due anelli con velocita' diverse: uno stretto e svelto, uno largo
       e lento. Un anello solo si legge come un cerchio che cresce, due
       come un colpo */
    botti.push({ tipo: 'anello', x, y, vita: 1, v: .052, r: 34, sp: 2.6 });
    botti.push({ tipo: 'anello', x, y, vita: 1, v: .028, r: 66, sp: 1.1 });

    /* Lo schizzo parte in tutte le direzioni ma un po' di piu' in avanti,
       nel verso in cui il pesce stava andando */
    const quanti = 9 + Math.min(6, filaCombo * 2);
    for (let i = 0; i < quanti; i++) {
      const a = (i / quanti) * Math.PI * 2 + Math.random() * .5;
      const sp = 1.4 + Math.random() * 2.6;
      botti.push({
        tipo: 'goccia',
        x, y,
        vx: Math.cos(a) * sp + Math.cos(ang) * .9,
        vy: Math.sin(a) * sp + Math.sin(ang) * .9,
        r: .9 + Math.random() * 1.9,
        vita: 1,
        v: .022 + Math.random() * .02
      });
    }

    if (o.punteggio) {
      botti.push({ tipo: 'punti', x, y: y - 6, vita: 1, v: .0155, n: filaCombo });
    }

    /* Lo dice al calamaro, che si gonfia e si accende. Glielo dice il
       pesce e non chi sta attorno: e' qui che si sa QUANDO */
    if (window.DelMarCursore && window.DelMarCursore.mangia) {
      window.DelMarCursore.mangia(filaCombo);
    }
    if (o.onPreso) o.onPreso(presi, filaCombo);
  }

  function passo(cur) {
    t += .016;
    const attivo = cur && cur.attivo;

    for (const p of pesci) {
      /* Bighellonare: la direzione oscilla piano attorno a se stessa */
      p.giroA += p.giro;
      p.ang += Math.sin(p.giroA) * .012;

      let scappa = 0;
      if (attivo) {
        const dx = p.x - cur.x, dy = p.y - cur.y;
        const d = Math.hypot(dx, dy);

        /* Si prende SOLO toccandolo. Il bersaglio e' un'ellisse grande
           quanto il corpo, e sta nel verso in cui il pesce nuota: e'
           lungo il triplo di quanto e' alto, quindi un cerchio o lo
           taglia sui fianchi o straborda davanti e dietro. Il cursore
           si porta nel sistema di riferimento del pesce — ruotato del
           suo angolo — e li' il test e' quello di un'ellisse dritta.
           Il ribaltamento verticale del disegno (quando nuota a
           sinistra) qui non conta: l'ellisse e' simmetrica */
        const co = Math.cos(p.ang), si = Math.sin(p.ang);
        const ax = p.lung * .5 * o.presa;
        const ay = p.lung * .3 * o.presa;

        const dentro = (qx, qy) => {
          const ex = p.x - qx, ey = p.y - qy;
          const rx = -ex * co - ey * si;
          const ry =  ex * si - ey * co;
          return (rx * rx) / (ax * ax) + (ry * ry) / (ay * ay) <= 1;
        };

        /* SI TAGLIA LUNGO IL TRATTO, non solo dove il dito e' arrivato.
           Col mouse non serviva: si insegue un pesce e ci si arriva sopra
           piano. Un dito che sciabola percorre anche ottanta pixel fra due
           fotogrammi, e un pesce lungo trenta ci sta dentro per intero: col
           solo punto finale la passata veloce — cioe' l'unico modo di
           prenderli, visto che da fermi scappano — non prendeva NIENTE, e
           il gioco sembrava rotto invece che difficile.
           Si campiona il segmento a passi di mezzo pesce: piu' fitto non
           cambia l'esito, piu' rado ricomincia a saltarli.
           (Mattias, 2026-08-17) */
        let colpito = dentro(cur.x, cur.y);

        if (!colpito && cur.px !== undefined) {
          const tx = cur.x - cur.px, ty = cur.y - cur.py;
          const tratto = Math.hypot(tx, ty);

          /* IL PASSO DEVE STARE SOTTO LA MEZZA ALTEZZA DEL PESCE, se no il
             campionamento non serve a niente: la prima versione aveva un
             tetto di 24 campioni, che su un salto da settecento pixel fa
             ventinove pixel di passo — e un pesce alto diciotto ci passa in
             mezzo indenne. Provato: zero prese su quaranta pesci.
             Il tetto ora e' largo abbastanza da non entrare mai in gioco su
             una sciabolata vera, e costa comunque poco: sono quattro
             moltiplicazioni per campione, e il ciclo si ferma al primo
             pesce colpito. */
          const passo = Math.max(3, ay * .8);
          const passi = Math.min(200, Math.ceil(tratto / passo));

          for (let k = 1; k < passi && !colpito; k++) {
            const q = k / passi;
            colpito = dentro(cur.px + tx * q, cur.py + ty * q);
          }
        }

        if (colpito && p.lampo === 0) {
          boccone(p.x, p.y, p.ang);
          Object.assign(p, nuovo(true));
          continue;
        }

        if (d < RAGGIO && d > .01) {
          /* La paura cresce col quadrato della vicinanza: da lontano
             un'occhiata, da vicino uno scatto */
          scappa = Math.pow(1 - d / RAGGIO, 2);
          const via = Math.atan2(dy, dx);

          if (d < VICINO && p.scatto === 0 && p.ricarica === 0) {
            /* Parte lo scatto. La direzione NON e' esattamente l'opposto
               del puntatore: e' obliqua, e da che parte non si sa
               nemmeno un fotogramma prima. E' quello che rende
               impossibile anticiparli */
            p.scatto = DURATA;
            p.scattoAng = via + caso(-OBLIQUO, OBLIQUO);
            /* La velocita' si IMPONE, non si insegue: un'accelerazione
               graduale, per quanto ripida, resta un'accelerazione. Qui
               il fotogramma dopo e' gia' partito */
            p.v = p.vBase * PUNTA * (1 - p.fiato * CALO);
            p.ricarica = RICARICA + Math.round(caso(0, 16));
            /* Uno scatto costa fiato molto piu' di una nuotata nervosa:
               e' cosi' che restano prendibili, stancandoli */
            p.fiato = Math.min(1, p.fiato + .2);
          } else if (p.scatto === 0) {
            /* Fuori dallo scatto si orienta e basta, come un pesce vero
               che deve prima curvare */
            let diff = via - p.ang;
            while (diff >  Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            p.ang += diff * Math.min(VIRATA, .12 + scappa * .3 * BRA);
          }
        }
      }

      /* Il fiato si consuma scappando e si riprende in pace. Da stanchi
         la punta di velocita' cala di un terzo: e' li' che si acchiappano */
      p.fiato = Math.max(0, Math.min(1, p.fiato + (scappa > .2 ? STANCA : -RIFIATA)));
      if (p.ricarica > 0) p.ricarica--;

      if (p.scatto > 0) {
        p.scatto--;
        /* Durante lo scatto il corpo e' gia' girato: la virata e' quasi
           istantanea perche' in natura lo e' — la piega a C dura
           trenta millisecondi. Non del tutto istantanea pero', se no il
           pesce non ruota: si teletrasporta di traverso */
        let diff = p.scattoAng - p.ang;
        while (diff >  Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        p.ang += diff * .55;
        /* E gia' mentre scatta comincia a spegnersi */
        p.v *= PLANA;
      } else {
        /* Nuoto normale: crociera lenta, appena piu' svelta se ha visto
           qualcosa ma non abbastanza vicino da scattare. Il 'max' fa in
           modo che la velocita' residua dello scatto scenda planando
           invece di essere riportata di colpo a quella di crociera —
           altrimenti alla fine dello scatto il pesce inchioderebbe */
        const tetto = p.vBase * (1 + scappa * ALLERTA) * (1 - p.fiato * CALO);
        p.v = p.v > tetto ? Math.max(tetto, p.v * PLANA) : p.v + (tetto - p.v) * PRONTI;
      }

      p.x += Math.cos(p.ang) * p.v;
      p.y += Math.sin(p.ang) * p.v;

      /* Sopra e sotto CURVANO verso il centro invece di rimbalzare: un
         rimbalzo si vede ed e' innaturale, una virata no. La sezione e'
         alta e un pesce che esce dal bordo alto non tornerebbe piu' */
      const fuoriSu  = H * .08 - p.y;
      const fuoriGiu = p.y - H * .92;
      if (fuoriSu > 0 || fuoriGiu > 0) {
        const quanto = Math.min(1, Math.max(fuoriSu, fuoriGiu) / (H * .08));
        /* Se e' troppo in alto punta in giu', e viceversa; l'orizzontale
           resta quello in cui stava andando */
        const obiettivo = Math.atan2(
          (fuoriSu > 0 ? 1 : -1) * quanto * .9,
          Math.cos(p.ang) >= 0 ? 1 : -1
        );
        let d = obiettivo - p.ang;
        while (d >  Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        p.ang += d * .07;
      }

      /* Ai lati passano dall'altra parte: il banco non finisce mai.
         Il margine oltre il bordo era 40 pixel fissi, e su uno schermo largo
         non si nota. Su un telefono da 390 sono un decimo della larghezza
         PER PARTE: un pesce scattato via restava invisibile un pezzo, e con
         una sciabolata che li fa partire tutti insieme lo schermo si
         svuotava. Proporzionale alla tela: stesso comportamento sul largo,
         rientro quasi immediato sullo stretto. */
      const oltre = Math.min(40, W * .05);
      if (p.x < -oltre) p.x = W + oltre;
      if (p.x > W + oltre) p.x = -oltre;

      if (p.lampo > 0) p.lampo -= .06;
    }

    for (let i = botti.length - 1; i >= 0; i--) {
      const b = botti[i];
      b.vita -= b.v;
      if (b.tipo === 'goccia') {
        b.x += b.vx;
        b.y += b.vy;
        /* Rallentano come in acqua e scendono appena: senza, sembrano
           scintille nel vuoto invece di schizzi dentro il mare */
        b.vx *= .93;
        b.vy = b.vy * .93 + .05;
      } else if (b.tipo === 'punti') {
        b.y -= 1.15;
      }
      if (b.vita <= 0) botti.splice(i, 1);
    }
  }

  function tinta(p) {
    const c = o.confine(p.y, t);
    /* k: 0 sulla campitura scura, 1 su quella chiara. Cambia dentro una
       fascia larga e non di colpo, se no il pesce scatta di colore
       mentre passa e si vede */
    const k = c < 0 ? 1 : Math.min(1, Math.max(0, (p.x - c + o.sfuma / 2) / o.sfuma));
    const fra = (a, b, i) => Math.round(a[i] + (b[i] - a[i]) * k);
    const sp = o.specie[p.sp] || o.specie[0];
    const s = sp.scuro, h = sp.chiaro;
    return {
      corpo: `${fra(s.corpo, h.corpo, 0)},${fra(s.corpo, h.corpo, 1)},${fra(s.corpo, h.corpo, 2)}`,
      bordo: `${fra(s.bordo, h.bordo, 0)},${fra(s.bordo, h.bordo, 1)},${fra(s.bordo, h.bordo, 2)}`
    };
  }

  /* Il corpo. Piu' ALTO di quanto verrebbe naturale: al primo giro era
     lungo tre volte la sua altezza, con una coda quasi lunga quanto il
     corpo, e il risultato non sembrava un pesce — sembrava un girino.
     Un pesciolino vero sta dentro un rettangolo di due e mezzo per uno,
     ha il muso tozzo e la coda corta. Sono quelle tre proporzioni a
     farlo leggere, non il dettaglio. */
  function sagoma(l) {
    ctx.beginPath();
    ctx.moveTo(l * .5, 0);
    ctx.bezierCurveTo(l * .34, -l * .4, -l * .16, -l * .38, -l * .4, 0);
    ctx.bezierCurveTo(-l * .16, l * .38, l * .34, l * .4, l * .5, 0);
    ctx.closePath();
  }

  /* Coda corta e BIFORCUTA: l'incavo fra le due punte e' profondo, e la
     coda finisce presto. Una coda lunga e piena e' esattamente quella
     che faceva l'effetto girino */
  function coda(l, batti, apertura) {
    const o1 = batti * l * .26;
    ctx.beginPath();
    ctx.moveTo(-l * .36, 0);
    ctx.quadraticCurveTo(-l * .56, o1 * .6, -l * .78, o1 - l * apertura);
    ctx.quadraticCurveTo(-l * .56, o1 * .55, -l * .5, o1 * .2);
    ctx.quadraticCurveTo(-l * .56, o1 * .55, -l * .78, o1 + l * apertura);
    ctx.quadraticCurveTo(-l * .56, o1 * .6, -l * .36, 0);
    ctx.closePath();
  }

  function disegnaPesce(p) {
    const c = tinta(p);
    const l = p.lung;
    const veloce = Math.min(1, (p.v - p.vBase) / (p.vBase * 2.4));
    /* La coda batte piu' in fretta quando accelera */
    const batti = Math.sin(t * (7 + veloce * 9) + p.fase);
    const st = o.stile;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.ang);
    /* Ribaltato quando nuota verso sinistra, se no va a pancia in su:
       la rotazione da sola lo rovescia oltre i 90 gradi */
    if (Math.cos(p.ang) < 0) ctx.scale(1, -1);

    /* 3 e 4 sfumano quello che sta lontano: e' il modo piu' onesto di
       dare profondita' su una tela piatta.
       'velo' entra QUI e non sui singoli riempimenti: cosi' i rapporti
       fra le parti restano quelli studiati — l'occhio piu' fitto della
       pancia, l'ombra piu' tenue di tutto — e si abbassa il volume
       dell'insieme invece di appiattirlo */
    const op = (st >= 3 ? (.34 + p.z * .66) : 1) * o.velo;

    if (st === 4) {
      /* Ombra portata: un pesce senza ombra galleggia sopra il disegno,
         con l'ombra sta DENTRO l'acqua */
      ctx.save();
      ctx.translate(l * .12, l * .34);
      sagoma(l);
      ctx.fillStyle = `rgba(4,10,40,${.20 * op})`;
      ctx.fill();
      ctx.restore();

      /* Pinne: dorsale, ventrale e una pettorale che batte. Ondeggiano
         in RITARDO sulla coda — muoversi tutte insieme e' l'errore che
         fa sembrare il pesce un ritaglio di cartone che si piega */
      const on = Math.sin(t * 6 + p.fase + .8) * l * .07;
      ctx.beginPath();
      ctx.moveTo(l * .16, -l * .3);
      ctx.quadraticCurveTo(-l * .02, -l * .62 + on, -l * .24, -l * .26);
      ctx.closePath();
      ctx.fillStyle = `rgba(${c.corpo},${.5 * op})`;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(l * .12, l * .28);
      ctx.quadraticCurveTo(l * .0, l * .54 + on, -l * .16, l * .26);
      ctx.closePath();
      ctx.fillStyle = `rgba(${c.corpo},${.4 * op})`;
      ctx.fill();

      const pett = Math.sin(t * 8 + p.fase) * l * .1;
      ctx.beginPath();
      ctx.moveTo(l * .16, l * .06);
      ctx.quadraticCurveTo(l * .02, l * .3 + pett, -l * .1, l * .1);
      ctx.closePath();
      ctx.fillStyle = `rgba(${c.bordo},${.34 * op})`;
      ctx.fill();
    }

    // ── Coda
    coda(l, batti, st === 1 ? .26 : .34);
    ctx.fillStyle = `rgba(${c.corpo},${(st === 1 ? .55 : .48) * op})`;
    ctx.fill();

    // ── Corpo
    sagoma(l);
    if (st === 1) {
      /* Piatto: una tinta sola. E' il termine di paragone */
      ctx.fillStyle = `rgba(${c.corpo},${.82 * op})`;
    } else {
      /* Con volume: la luce viene dall'alto, quindi il dorso e' in ombra
         e la pancia chiara. E' il rovescio di come sono i pesci veri —
         scuri sopra per non farsi vedere da sopra — ma qui serve a far
         girare il corpo, e la lettura viene prima della zoologia */
      const g = ctx.createLinearGradient(0, -l * .38, 0, l * .38);
      g.addColorStop(0,   `rgba(${c.bordo},${.95 * op})`);
      g.addColorStop(.45, `rgba(${c.corpo},${.88 * op})`);
      g.addColorStop(1,   `rgba(${c.corpo},${.42 * op})`);
      ctx.fillStyle = g;
    }
    ctx.fill();

    if (st !== 1) {
      /* Riflesso sul dorso: e' quello che fa "bagnato". Senza, il corpo
         sfumato sembra solo un disegno con due colori */
      ctx.beginPath();
      ctx.ellipse(l * .06, -l * .18, l * .24, l * .07, -.13, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${.42 * op})`;
      ctx.fill();
    }

    ctx.strokeStyle = `rgba(${c.bordo},${(st === 1 ? .5 : .3) * op})`;
    ctx.lineWidth = .7;
    sagoma(l);
    ctx.stroke();

    // ── Occhio: e' quello che lo fa leggere come un pesce, non un seme
    const ro = Math.max(.95, l * .085);
    ctx.beginPath();
    ctx.arc(l * .26, -l * .08, ro, 0, Math.PI * 2);
    ctx.fillStyle = st === 1 ? `rgba(${c.bordo},${.95 * op})` : `rgba(10,20,50,${.85 * op})`;
    ctx.fill();
    if (st !== 1) {
      ctx.beginPath();
      ctx.arc(l * .28, -l * .11, ro * .38, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${.9 * op})`;
      ctx.fill();
    }

    ctx.restore();
  }

  /* Piu' e' lunga la fila, piu' il colore si scalda verso il bianco: la
     combo si vede prima ancora di leggere il numero */
  function coloreCombo(n, a) {
    const k = Math.min(1, (n - 1) / 5);
    const r = 255;
    const g = Math.round(107 + (225 - 107) * k);
    const b = Math.round(87 + (205 - 87) * k);
    return `rgba(${r},${g},${b},${a})`;
  }

  /* LA SCIA DEL TAGLIO, sopra i pesci.
     Va disegnata DOPO i pesci: e' il gesto di chi gioca, e passargli
     dietro la farebbe sembrare parte dello sfondo. Si assottiglia verso la
     coda invece di essere una riga di spessore fisso — e' quello che la fa
     leggere come un colpo dato in una direzione e non come uno scarabocchio.
     Due passate: una larga e velata sotto, che fa da alone nell'acqua, e una
     sottile e piena sopra. */
  function disegnaScia() {
    if (!window.DelMarDito) return;
    const punti = window.DelMarDito.scia();
    if (punti.length < 2) return;

    const r = cvs.getBoundingClientRect();
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let mano = 0; mano < 2; mano++) {
      const alone = mano === 0;
      for (let i = 1; i < punti.length; i++) {
        const a = punti[i - 1], b = punti[i];
        /* Lo spessore segue quanto e' fresco il tratto, non la sua
           posizione nell'elenco: cosi' un dito fermo lascia la scia
           spegnersi da sola invece di tenerla accesa */
        const q = b.vita;
        ctx.beginPath();
        ctx.moveTo(a.x - r.left, a.y - r.top);
        ctx.lineTo(b.x - r.left, b.y - r.top);
        ctx.lineWidth = (alone ? 13 : 5) * q + 1;
        ctx.strokeStyle = alone
          ? 'rgba(255, 158, 120, ' + (q * .22).toFixed(3) + ')'
          : 'rgba(255, 255, 255, ' + (q * .92).toFixed(3) + ')';
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function disegna() {
    ctx.clearRect(0, 0, W, H);
    for (const p of pesci) disegnaPesce(p);

    for (const b of botti) {
      if (b.tipo === 'anello') {
        /* Parte svelto e frena: un cerchio che cresce a velocita'
           costante sembra un'animazione, uno che frena sembra un'onda */
        const av = 1 - Math.pow(b.vita, 2.2);
        ctx.beginPath();
        ctx.arc(b.x, b.y, av * b.r, 0, Math.PI * 2);
        ctx.strokeStyle = coloreCombo(1, b.vita * .75);
        ctx.lineWidth = b.sp * b.vita;
        ctx.stroke();

      } else if (b.tipo === 'goccia') {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * b.vita, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,200,180,${b.vita * .85})`;
        ctx.fill();

      } else if (b.tipo === 'punti') {
        /* Scatta fuori grande e si assesta: e' quel decimo di secondo a
           farlo sembrare un premio invece che un'etichetta */
        const nascita = Math.min(1, (1 - b.vita) * 7);
        const scala = (1.55 - .55 * nascita) * (1 + Math.min(.5, (b.n - 1) * .12));
        const a = Math.min(1, b.vita * 2.2);

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.scale(scala, scala);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '700 15px Poppins, sans-serif';

        /* Contorno scuro: il numero passa sopra la campitura chiara e
           quella scura, e un corallo pieno sul bianco non si legge */
        ctx.lineWidth = 3.4;
        ctx.strokeStyle = `rgba(6,12,42,${a * .55})`;
        ctx.lineJoin = 'round';
        ctx.strokeText('+' + b.n, 0, 0);

        ctx.fillStyle = coloreCombo(b.n, a);
        ctx.fillText('+' + b.n, 0, 0);

        if (b.n > 1) {
          ctx.font = '600 8px Poppins, sans-serif';
          ctx.lineWidth = 2.6;
          ctx.strokeText('COMBO', 0, 13);
          ctx.fillText('COMBO', 0, 13);
        }
        ctx.restore();
      }
    }

    /* Per ultima: il taglio passa sopra tutto, anche sopra i +1 */
    disegnaScia();
  }

  function giro() {
    /* Il calamaro se c'e' un mouse, il dito se si sta toccando. Mai
       tutti e due: sui portatili con schermo tattile il calamaro si
       ritira da solo al primo tocco */
    const cal = window.DelMarCursore ? window.DelMarCursore.posizione() : null;
    const c = (cal && cal.attivo) ? cal
            : (window.DelMarDito ? window.DelMarDito.posizione() : null);

    let cur = null;
    if (c && c.attivo) {
      /* Il puntatore arriva in coordinate di finestra, i pesci vivono in
         coordinate di tela: senza questa conversione scappano da un
         punto che non e' quello dove sta il calamaro */
      const r = cvs.getBoundingClientRect();
      cur = { x: c.x - r.left, y: c.y - r.top, attivo: true };
      /* Il tratto percorso dall'ultimo fotogramma. Col mouse non serve —
         si insegue un pesce, non si taglia — quindi resta il solo punto */
      if (c.px !== undefined) {
        cur.px = c.px - r.left;
        cur.py = c.py - r.top;
      }
    }
    passo(cur);
    disegna();
    raf = requestAnimationFrame(giro);
  }

  function popola() {
    misura();
    pesci.length = 0;
    const n = typeof o.quanti === 'function' ? o.quanti() : o.quanti;
    for (let i = 0; i < n; i++) pesci.push(nuovo(false));
    /* Dal fondo verso la superficie: chi sta vicino deve passare DAVANTI
       a chi sta lontano. Si ordina una volta sola perche' la profondita'
       di un pesce non cambia mai */
    pesci.sort((a, b) => a.z - b.z);
  }

  let attesaMisura;
  function suRidimensiona() {
    clearTimeout(attesaMisura);
    attesaMisura = setTimeout(popola, 120);
  }
  window.addEventListener('resize', suRidimensiona);

  /* Ferma quando la sezione non si vede: sessanta fotogrammi al secondo
     per disegnare qualcosa fuori schermo sono batteria buttata */
  const occhio = new IntersectionObserver(e => {
    if (e[0].isIntersecting) { if (!raf) giro(); }
    else { cancelAnimationFrame(raf); raf = null; }
  }, { threshold: 0.01 });
  occhio.observe(cvs);

  /* Dichiara l'area di gioco: serve a DelMarDito per distinguere una
     sciabolata sui pesci da uno scorrimento della pagina. La tela resta
     trasparente ai tocchi (pointer-events: none nel CSS) — gli eventi si
     ascoltano sulla finestra e il confine si calcola qui, cosi' niente
     copre i collegamenti che stanno sotto */
  if (window.DelMarDito) window.DelMarDito.zona(cvs);

  popola();

  return {
    /* Il banco di prova cambia resa al volo senza rifare il banco: i
       pesci restano dove sono e si vede solo il disegno cambiare, che e'
       il modo giusto di confrontare due rese */
    stile(n) { o.stile = n; },
    ferma() {
      cancelAnimationFrame(raf);
      raf = null;
      occhio.disconnect();
      window.removeEventListener('resize', suRidimensiona);
    },
    presi: () => presi
  };
};
