/* Hero a immagine unica — banco di prova, solo locale.

   L'hero sta fermo e a muoversi e' la CAMERA dentro una sola fotografia:
   quattro inquadrature, una sosta su ognuna con la sua CTA, e fra una e
   l'altra un movimento diverso — diagonale, verticale, zoom.

   COME E' FATTA LA CAMERA. L'immagine e' larga esattamente quanto la
   finestra (quella e' la scala 1) e poi viene ingrandita e spostata con
   una trasformazione sola, con l'origine in alto a sinistra. Con
   translate(t) scale(k) e origine 0 0 un punto p dell'immagine finisce
   in t + k·p, e da li' i conti sono due righe:

     k  = 1 / larghezza_inquadratura        (frazione dell'immagine)
     tx = meta' finestra − cx · baseW · k   (cx = centro, 0..1)

   Un'inquadratura si descrive con TRE numeri — centro x, centro y,
   quanta parte di immagine sta in larghezza — e non con quattro angoli:
   l'altezza non e' libera, la impone la forma della finestra. Chiedere
   anche l'altezza vorrebbe dire poterla chiedere sbagliata.

   LO ZOOM SI INTERPOLA IN SCALA LOGARITMICA. Andare da 1,2× a 3,4×
   passando linearmente per i valori di mezzo si vede: la prima meta' del
   movimento sembra lentissima e la seconda una frustata. In logaritmo
   ogni istante raddoppia della stessa frazione, ed e' quello che l'occhio
   legge come "zoom costante".

   IL PANNELLO serve a trovare i numeri, non e' parte del disegno: si
   apre con P, si tara, e alla fine "Copia configurazione" restituisce il
   blocco da incollare nel sito. La taratura resta in memoria del browser
   fra un giro e l'altro. */
(function () {
  const scroller = document.getElementById('ht-scroller');
  const camera   = document.getElementById('ht-camera');
  const foto     = document.getElementById('ht-foto');
  const capitoli = [...document.querySelectorAll('.ht-ch')];
  const tacche   = document.getElementById('ht-tacche');

  const CHIAVE = 'delmar-hero-test';

  /* Inquadrature TARATE A VISTA sull'immagine vera, una per una, non
     lette a occhio dallo schema (Mattias + Claude, 15/08/2026).
     Le prime erano sbagliate per due motivi: nella quarta il taglio
     saliva sopra le teste, e in tutte i conti giravano su una larghezza
     di 1425 pixel invece dei 1672 veri — bastava una regola
     max-width: 100% del foglio del sito a strozzare la foto.
     Se si cambia l'immagine, questi quattro numeri per quattro vanno
     rifatti guardando: non si indovinano. */
  const DEFAULT = {
    stop: [
      /* La barca intera piu' il tramonto, fermandosi appena prima della
         banchina che comincia sul lato destro dell'immagine */
      /* LE DURATE SONO DIMEZZATE rispetto al primo giro (Mattias,
         15/08/2026): fra una CTA e l'altra c'erano 190vh, cioe' una
         decina di mandate di rotellina, e per arrivare in fondo
         all'hero ci voleva troppo. Ora fra una CTA e la successiva
         ci sono circa 77vh, cioe' cinque mandate di rotellina invece di
         tredici: tutto l'hero si percorre in meno di due schermate di
         scroll contro le cinque di prima.
         Accorciare NON rende il movimento piu' scattoso: la camera fa la
         stessa strada in meno scroll, quindi va piu' svelta, ma quello
         che l'occhio legge come scatto e' il fotogramma perso, non la
         velocita' — e di quello si occupa l'inerzia. */
      { nome: 'Dal mare',          cx: .200, cy: .460, fw: .40, sosta: 30 },
      /* I banchi di selezione. Il centro sta in alto perche' sotto
         comincia il capannone, e il bordo basso dell'inquadratura ci
         finiva dentro */
      { nome: 'Selezione',         cx: .520, cy: .190, fw: .34, sosta: 30 },
      { nome: 'Catena del freddo', cx: .565, cy: .670, fw: .37, sosta: 30 },
      /* Stretta: la scena della consegna e' ALTA e STRETTA, e allargando
         per farci stare i piedi si finisce per riprendere mezzo
         capannone. Meglio tagliare alle ginocchia che sopra le teste */
      { nome: 'Consegna',          cx: .870, cy: .340, fw: .26, sosta: 40 }
    ],
    /* Una corsa per ogni salto. 'arco' incurva il percorso del centro:
       a zero il centro va dritto da un'inquadratura all'altra, e in una
       carrellata lunga si legge come una slittata meccanica. Un filo di
       curva basta a farla sembrare una macchina da presa in mano.
       Curva 'dolce' e non 'sospiro': la seconda parte quasi ferma e poi
       fa una frustata in mezzo, ed e' proprio quella frustata che si
       legge come uno scatto. Sospiro resta a disposizione per una corsa
       sola, dove la si vuole teatrale */
    corsa: [
      { vh: 26, curva: 'dolce', arco:  .10 },
      { vh: 24, curva: 'dolce', arco: -.10 },
      { vh: 28, curva: 'dolce', arco:  .10 }
    ],
    /* QUESTO NUMERO E' LA CHIAVE DI TUTTO L'HERO, e va capito prima di
       toccarlo (Mattias, 15/08/2026).
       La richiesta era doppia e sembrava contraddittoria: "con uno solo
       scrolling devo arrivare alla CTA successiva" ma "il movimento deve
       essere piu' rallentato per far vedere l'effetto". Sono due cose
       diverse solo se si smette di legarle:
         - quanto SCROLL serve  -> lo decidono le durate in vh, corte
         - quanto TEMPO dura    -> lo decide questa inerzia, lunga
       Una scrollata porta il bersaglio sulla sosta successiva in un
       colpo; la camera pero' ci arriva con calma, in circa un secondo, e
       nel frattempo si guarda la carrellata. Con l'inerzia bassa le due
       cose tornerebbero a coincidere e per rallentare il movimento
       bisognerebbe allungare lo scroll, che e' proprio il difetto da cui
       siamo partiti.

       In MILLISECONDI e non in "quanto recupera a fotogramma".
       La differenza non e' formale: col fattore a fotogramma, se il
       computer ne perde qualcuno la camera rallenta anche lei, e quello
       e' esattamente lo scatto che si vede. Con una costante di tempo il
       recupero dipende da quanto tempo E' PASSATO, quindi a 60, 30 o 144
       fotogrammi il movimento e' identico.
       Sotto i 120 ms si sente la rotellina, sopra i 400 sembra melassa */
    inerzia: 560,

    /* Moltiplica TUTTE le durate in un colpo solo. Serve perche' la
       domanda vera non e' mai "quanto dura la sosta 2" ma "quanto scroll
       ci vuole per arrivare in fondo all'hero": con sette cursori
       separati si finisce per spostarli tutti nella stessa direzione, e
       nel farlo si perdono le proporzioni fra un capitolo e l'altro.
       Con questo si cerca il ritmo giusto, poi semmai si ritocca il
       singolo tratto. */
    ritmo: 1,

    /* COME LO SCROLL COMANDA LA CAMERA. Due modi diversi, non due
       sfumature dello stesso.

       'scatti'  — una scrollata, un capitolo. Il gesto non muove la
                   pagina: sceglie la prossima inquadratura, e la camera
                   ci va in un tempo suo. Si arriva SEMPRE su una CTA
                   intera, mai a meta' strada.
       'continuo'— la camera e' agganciata alla posizione dello scroll,
                   come era prima.

       Perche' 'scatti' e' diventato il predefinito: in continuo la
       sosta durava 30vh, cioe' 200 pixel, mentre una mandata di
       rotellina ne fa 100 e una passata di trackpad anche 400. Una
       scrollata normale SCAVALCAVA la sosta, la CTA lampeggiava e
       spariva, e alzando l'inerzia per rallentare il movimento la
       camera finiva per non fermarsi mai davvero su niente. Non era
       una questione di numeri da ritoccare: le soste erano piu' corte
       del gesto che le doveva percorrere. */
    modo: 'scatti',

    /* Quanto dura la carrellata fra due inquadrature, in millisecondi.
       In 'scatti' e' un tempo vero e non dipende piu' da quanto o quanto
       in fretta si scrolla: e' finalmente possibile rallentare il
       movimento senza allungare lo scroll */
    durata: 1150
  };

  let C = carica();

  /* ── Stato ─────────────────────────────────── */
  let Vw = 0, Vh = 0, A = 1.777;
  let obiettivo = 0;   /* posizione lungo il percorso, 0..1 */
  let vista = 0;       /* la stessa, ma inseguita con inerzia */
  let tratti = [];     /* il percorso spezzato in soste e corse */
  let totale = 0;

  /* ── Curve ─────────────────────────────────── */
  const CURVE = {
    lineare: t => t,
    /* Accelera e frena in modo simmetrico: il movimento piu' neutro */
    dolce:   t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    /* Parte quasi ferma e arriva quasi ferma, con una corsa decisa in
       mezzo: e' quella che sembra una macchina da presa vera */
    sospiro: t => t === 0 ? 0 : t === 1 ? 1
             : t < .5 ? Math.pow(2, 20 * t - 10) / 2
             : (2 - Math.pow(2, -20 * t + 10)) / 2,
    /* Parte piano e arriva di slancio: buona quando si entra in un
       dettaglio */
    affondo: t => t * t * (3 - 2 * t) * t + (1 - t) * t * t
  };

  const lerp = (a, b, t) => a + (b - a) * t;

  /* ── Il percorso ───────────────────────────── */
  function costruisci() {
    const r = C.ritmo || 1;
    tratti = [];
    for (let i = 0; i < C.stop.length; i++) {
      tratti.push({ tipo: 'sosta', i, vh: C.stop[i].sosta * r });
      if (i < C.corsa.length) tratti.push({ tipo: 'corsa', i, vh: C.corsa[i].vh * r });
    }
    totale = tratti.reduce((s, t) => s + t.vh, 0);
    /* A scatti la pagina non scorre affatto: e' alta una schermata e
       basta. In continuo il binario e' lungo quanto la somma dei tratti
       PIU' una schermata, perche' l'ultimo pixel utile deve cadere alla
       fine dell'ultima sosta e non quando il blocco fisso esce di scena */
    scroller.style.height = C.modo === 'scatti' ? '100vh' : (totale + 100) + 'vh';

    tacche.innerHTML = '';
    C.stop.forEach(() => {
      const d = document.createElement('div');
      d.className = 'ht-tacca';
      tacche.appendChild(d);
    });
  }

  /* Dove siamo: quale tratto, e quanto dentro */
  function dove(p) {
    let q = p * totale;
    for (const t of tratti) {
      if (q <= t.vh || t === tratti[tratti.length - 1]) {
        return { tratto: t, f: t.vh > 0 ? Math.min(1, Math.max(0, q / t.vh)) : 1 };
      }
      q -= t.vh;
    }
    return { tratto: tratti[0], f: 0 };
  }

  /* ── La camera ─────────────────────────────── */
  /* Un'inquadratura non puo' uscire dall'immagine: se il centro e' troppo
     vicino a un bordo si riporta dentro. Meglio un'inquadratura spostata
     di poco che una striscia di nero sul bordo — e' l'errore piu' facile
     da fare tarando a mano, e non si nota finche' non si prova su uno
     schermo di forma diversa */
  function stringi(q) {
    const fh = q.fw * A * (Vh / Vw);
    const mx = q.fw / 2, my = fh / 2;
    return {
      cx: mx * 2 >= 1 ? .5 : Math.min(1 - mx, Math.max(mx, q.cx)),
      cy: my * 2 >= 1 ? .5 : Math.min(1 - my, Math.max(my, q.cy)),
      fw: q.fw,
      fh
    };
  }

  /* L'immagine sta alla sua misura NATURALE e da li' viene ingrandita.
     Sembra un dettaglio ed e' la ragione principale degli scatti: se
     l'elemento e' largo quanto la finestra e poi lo si ingrandisce 3
     volte, il browser deve RIDISEGNARE la fotografia a 4300 pixel — e la
     ridisegna a ogni fotogramma, perche' la scala cambia di continuo.
     Tenendola alla sua misura vera, la texture e' una sola, piccola, e
     tutto il movimento diventa lavoro della scheda grafica: la stessa
     immagine spostata e ingrandita, senza mai ridisegnarla.
     Nitida non diventa comunque — quella la puo' dare solo un originale
     piu' grande — ma smette di andare a scatti. */
  let ultimaT = '';
  let baseW = 1, baseH = 1;

  function applica(q) {
    const s = stringi(q);
    /* Le misure REALI dell'elemento, non quelle che gli abbiamo chiesto:
       basta una regola di stile di passaggio — e ce n'era una — perche'
       la foto venga disegnata piu' stretta di quanto le abbiamo detto, e
       da li' in poi ogni conto e' sbagliato senza che niente lo segnali */
    const k = (Vw / s.fw) / baseW;
    const tx = Vw / 2 - s.cx * baseW * k;
    const ty = Vh / 2 - s.cy * baseH * k;
    const t = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${k.toFixed(5)})`;
    /* Ferma non si riscrive: assegnare la stessa trasformazione fa
       comunque ricalcolare lo stile a ogni fotogramma per niente */
    if (t !== ultimaT) { ultimaT = t; camera.style.transform = t; }
    return s;
  }

  /* Fra due inquadrature: centro interpolato (con l'arco) e zoom in
     scala logaritmica */
  function fra(a, b, e, arco) {
    const k1 = 1 / a.fw, k2 = 1 / b.fw;
    const k = Math.exp(lerp(Math.log(k1), Math.log(k2), e));

    let cx = lerp(a.cx, b.cx, e);
    let cy = lerp(a.cy, b.cy, e);

    if (arco) {
      /* Scostamento perpendicolare alla congiungente, massimo a meta'
         strada e nullo ai due capi: il centro descrive un arco invece di
         un segmento */
      const dx = b.cx - a.cx, dy = b.cy - a.cy;
      const d = Math.hypot(dx, dy) || 1;
      const gonfia = Math.sin(Math.PI * e) * arco;
      cx += (-dy / d) * gonfia;
      cy += ( dx / d) * gonfia;
    }
    return { cx, cy, fw: 1 / k };
  }

  /* ── Il giro ───────────────────────────────── */
  function misura() {
    Vw = window.innerWidth;
    Vh = window.innerHeight;
    if (foto.naturalWidth) {
      /* Misura naturale: la scala fa il resto, e la texture resta una */
      foto.style.width = foto.naturalWidth + 'px';
      /* Si RILEGGE quanto e' venuta davvero, invece di darlo per fatto */
      baseW = foto.offsetWidth || foto.naturalWidth;
      baseH = foto.offsetHeight || foto.naturalHeight;
      A = baseW / baseH;
    }
    ultimaT = '';
  }

  function leggiScroll() {
    const utile = scroller.offsetHeight - Vh;
    obiettivo = utile > 0 ? Math.min(1, Math.max(0, window.scrollY / utile)) : 0;
  }

  let acceso = -1;
  let scorso = 0;
  const opache = [0, 0, 0, 0];

  /* ── Modo a scatti ────────────────────────────
     Lo stato e' minimo di proposito: dove siamo, dove stiamo andando,
     da quando. Tutto il resto si ricava. */
  let qui = 0;          /* inquadratura su cui siamo fermi */
  let verso = 0;        /* inquadratura verso cui stiamo andando */
  let partito = 0;      /* quando e' cominciata la carrellata */
  let inCorsa = false;

  function vai(d) {
    if (inCorsa) return false;
    const n = qui + d;
    if (n < 0 || n >= C.stop.length) return false;
    verso = n;
    partito = performance.now();
    inCorsa = true;
    return true;
  }

  /* Il gesto va ripulito prima di dargli retta. Una passata di trackpad
     non e' un evento: sono decine di eventi che arrivano per un secondo,
     con l'inerzia che continua anche dopo che il dito si e' alzato. Senza
     filtro un solo gesto salterebbe tre capitoli.
     La regola: si accetta un gesto solo se e' abbastanza deciso, e non se
     ne accetta un altro finche' la carrellata non e' finita E il flusso
     di eventi non si e' calmato. */
  const SOGLIA = 22;
  let calmo = true;
  let ultimoEvento = 0;

  function gesto(dy) {
    const ora = performance.now();
    /* Piu' di 140 ms di silenzio: quella di prima e' finita davvero,
       compresa la coda d'inerzia del trackpad */
    if (ora - ultimoEvento > 140) calmo = true;
    ultimoEvento = ora;
    if (!calmo || inCorsa) return false;
    if (Math.abs(dy) < SOGLIA) return false;
    calmo = false;
    return vai(dy > 0 ? 1 : -1);
  }

  function scatti(ora) {
    if (inCorsa) {
      const c = C.corsa[Math.min(verso, qui)];
      const f = Math.min(1, (ora - partito) / C.durata);
      const e = (CURVE[c.curva] || CURVE.dolce)(f);
      /* L'arco si specchia tornando indietro: la corsa e' descritta
         nel verso 1→2, e percorsa al contrario la stessa gobba
         cadrebbe dalla parte sbagliata */
      applica(fra(C.stop[qui], C.stop[verso], e, verso > qui ? c.arco : -c.arco));
      if (f >= 1) { qui = verso; inCorsa = false; }
      /* La CTA si spegne subito e si riaccende solo sul finale: a meta'
         carrellata una scritta ferma sopra un'immagine che corre e'
         illeggibile, ed e' anche il momento in cui non serve */
      return { stop: f > .72 ? verso : -1, op: f > .72 ? (f - .72) / .28 : 0 };
    }
    applica(C.stop[qui]);
    return { stop: qui, op: 1 };
  }

  function giro(ora) {
    /* Quanto tempo e' passato davvero. Il tetto a 50 ms serve al rientro
       da una scheda in secondo piano: senza, il primo fotogramma dopo
       ore di pausa recupererebbe tutto in una volta, con uno strappo */
    const dt = Math.min(50, scorso ? ora - scorso : 16);
    scorso = ora;

    let stopVivo = -1, opacita = 0, tratto = { i: 0 };

    if (C.modo === 'scatti') {
      const s = scatti(ora);
      stopVivo = s.stop;
      opacita = s.op;
      tratto = { i: stopVivo >= 0 ? stopVivo : qui };
      scriviCta(stopVivo, opacita, tratto);
      requestAnimationFrame(giro);
      return;
    }

    /* L'inerzia e' quello che rende il movimento cinematografico e non
       una diretta della rotellina: la camera INSEGUE lo scroll.
       La quantita' recuperata si ricava dal TEMPO passato, non dal
       numero di fotogrammi: e' la formula dello smorzamento esponenziale
       e ha la proprieta' che serve qui — a 30, 60 o 144 fotogrammi il
       movimento e' lo stesso, quindi un fotogramma perso non si vede */
    vista += (obiettivo - vista) * (1 - Math.exp(-dt / C.inerzia));

    const d = dove(vista);
    tratto = d.tratto;
    const f = d.f;

    if (tratto.tipo === 'sosta') {
      applica(C.stop[tratto.i]);
      stopVivo = tratto.i;
      /* La CTA entra ed esce dentro la sosta, non di colpo ai bordi:
         comparire nell'istante in cui la camera si ferma sembra uno
         scatto, un quinto di sosta per entrare e uno per uscire no.
         La PRIMA non ha la salita: a pagina appena aperta lo scroll e' a
         zero, e con la salita l'hero si presenterebbe muto, con il
         titolo che compare solo dopo che hai gia' cominciato a
         scorrere */
      const salita = tratto.i === 0 ? 1 : f / .2;
      opacita = Math.min(1, salita, (1 - f) / .2);
    } else {
      const c = C.corsa[tratto.i];
      const e = (CURVE[c.curva] || CURVE.dolce)(f);
      applica(fra(C.stop[tratto.i], C.stop[tratto.i + 1], e, c.arco));
      opacita = 0;
    }

    scriviCta(stopVivo, opacita, tratto);
    requestAnimationFrame(giro);
  }

  /* Si scrive solo quello che cambia davvero. Riassegnare quattro
     opacita' a ogni fotogramma costringe il browser a ricalcolare lo
     stile sessanta volte al secondo per niente, ed e' proprio nei
     fotogrammi lunghi che nasce lo scatto */
  function scriviCta(stopVivo, opacita, tratto) {
    for (let i = 0; i < capitoli.length; i++) {
      const o = i === stopVivo ? opacita : 0;
      if (Math.abs(o - opache[i]) > .004 || (o === 0) !== (opache[i] === 0)) {
        opache[i] = o;
        capitoli[i].style.opacity = o;
        capitoli[i].classList.toggle('ht-on', o > .5);
      }
    }

    if (stopVivo !== acceso) {
      acceso = stopVivo;
      [...tacche.children].forEach((d, i) => d.classList.toggle('ht-viva', i === stopVivo));
      aggiornaNota(tratto, stopVivo);
    }
  }

  /* ── Quanto viene tirata l'immagine ─────────
     E' il numero che decide se questo hero si puo' fare: sopra 1
     l'originale e' piu' piccolo di come lo stiamo mostrando, e nessun
     browser inventa il dettaglio che non c'e' */
  const nota = document.getElementById('ht-nota');
  let notaUltima = '';

  function aggiornaNota(tratto, stopVivo) {
    if (!foto.naturalWidth) return;
    const i = stopVivo >= 0 ? stopVivo : tratto.i;
    const fw = C.stop[i].fw;
    const px = fw * foto.naturalWidth;
    const tira = Vw / px;
    const tiraRet = tira * (window.devicePixelRatio || 1);
    const t = `Inquadratura ${i + 1}: usa <b>${Math.round(px)} px</b> dell'originale su ${Vw} di finestra — ingrandita <b>${tira.toFixed(1)}×</b> (${tiraRet.toFixed(1)}× a densità piena). Per vederla nitida servirebbe un originale largo <b>${Math.round(Vw / fw * (window.devicePixelRatio || 1))} px</b>.`;
    if (t !== notaUltima) { notaUltima = t; nota.innerHTML = t; }
  }

  /* ── Pannello ──────────────────────────────── */
  const comandi = document.getElementById('ht-comandi');
  const pannello = document.getElementById('ht-pannello');
  const apri = document.getElementById('ht-apri');

  function riga(etichetta, min, max, passo, val, suCambio, formato) {
    const d = document.createElement('div');
    d.className = 'ht-riga';
    const l = document.createElement('label');
    l.textContent = etichetta;
    const i = document.createElement('input');
    i.type = 'range'; i.min = min; i.max = max; i.step = passo; i.value = val;
    const o = document.createElement('output');
    const scrivi = v => o.textContent = formato ? formato(v) : (+v).toFixed(3);
    scrivi(val);
    i.addEventListener('input', () => { scrivi(i.value); suCambio(+i.value); });
    d.append(l, i, o);
    return d;
  }

  function costruisciPannello() {
    comandi.innerHTML = '';

    C.stop.forEach((s, i) => {
      const g = document.createElement('div');
      g.className = 'ht-gruppo';
      const t = document.createElement('p');
      t.className = 'ht-gruppo-titolo';
      t.innerHTML = `<span>${i + 1} · ${s.nome}</span>`;
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'vai';
      b.addEventListener('click', () => vaiA(i));
      t.appendChild(b);
      g.appendChild(t);

      g.appendChild(riga('centro X', 0, 1, .002, s.cx, v => { s.cx = v; salva(); }));
      g.appendChild(riga('centro Y', 0, 1, .002, s.cy, v => { s.cy = v; salva(); }));
      g.appendChild(riga('larghezza', .12, 1, .005, s.fw, v => { s.fw = v; salva(); }));
      g.appendChild(riga('sosta', 15, 160, 5, s.sosta, v => {
        s.sosta = v; salva(); costruisci();
      }, v => Math.round(v) + 'vh'));
      comandi.appendChild(g);

      if (i < C.corsa.length) {
        const c = C.corsa[i];
        const gc = document.createElement('div');
        gc.className = 'ht-gruppo';
        const tc = document.createElement('p');
        tc.className = 'ht-gruppo-titolo';
        tc.innerHTML = `<span>↓ corsa ${i + 1} → ${i + 2}</span>`;
        gc.appendChild(tc);
        gc.appendChild(riga('durata', 20, 200, 5, c.vh, v => {
          c.vh = v; salva(); costruisci();
        }, v => Math.round(v) + 'vh'));
        gc.appendChild(riga('arco', -.4, .4, .01, c.arco, v => { c.arco = v; salva(); },
          v => (+v).toFixed(2)));

        const dr = document.createElement('div');
        dr.className = 'ht-riga';
        const dl = document.createElement('label');
        dl.textContent = 'curva';
        const sel = document.createElement('select');
        Object.keys(CURVE).forEach(k => {
          const op = document.createElement('option');
          op.value = k; op.textContent = k;
          if (k === c.curva) op.selected = true;
          sel.appendChild(op);
        });
        sel.addEventListener('change', () => { c.curva = sel.value; salva(); });
        dr.append(dl, sel);
        gc.appendChild(dr);
        comandi.appendChild(gc);
      }
    });

    const g = document.createElement('div');
    g.className = 'ht-gruppo';
    const t = document.createElement('p');
    t.className = 'ht-gruppo-titolo';
    t.innerHTML = '<span>Ritmo e fluidità</span>';
    g.appendChild(t);

    const mr = document.createElement('div');
    mr.className = 'ht-riga';
    const ml = document.createElement('label');
    ml.textContent = 'modo';
    const ms = document.createElement('select');
    [['scatti', 'a scatti — 1 scrollata = 1 capitolo'],
     ['continuo', 'continuo — camera agganciata allo scroll']].forEach(([v, n]) => {
      const op = document.createElement('option');
      op.value = v; op.textContent = n;
      if (v === C.modo) op.selected = true;
      ms.appendChild(op);
    });
    ms.addEventListener('change', () => {
      C.modo = ms.value;
      salva();
      costruisci();
      /* Passando da un modo all'altro si riparte dal capitolo su cui si
         era: cambiare comando non deve far saltare l'inquadratura */
      if (C.modo === 'scatti') { inCorsa = false; verso = qui; window.scrollTo(0, 0); }
      else { obiettivo = vista = posizioneDi(qui); window.scrollTo(0, vista * (scroller.offsetHeight - Vh)); }
      costruisciPannello();
    });
    mr.append(ml, ms);
    g.appendChild(mr);

    g.appendChild(riga('durata corsa', 400, 2600, 50, C.durata, v => { C.durata = v; salva(); },
      v => Math.round(v) + 'ms'));
    /* Il cursore che si tocca per primo: accorcia o allunga tutto
       l'hero mantenendo le proporzioni fra i capitoli */
    g.appendChild(riga('tutto', .4, 1.8, .05, C.ritmo, v => {
      C.ritmo = v; salva(); costruisci(); leggiScroll();
    }, v => Math.round(totale) + 'vh'));
    g.appendChild(riga('inerzia', 80, 1200, 20, C.inerzia, v => { C.inerzia = v; salva(); },
      v => Math.round(v) + 'ms'));
    comandi.appendChild(g);
  }

  /* Dove cade il centro della sosta i, lungo il percorso (0..1) */
  function posizioneDi(i) {
    let q = 0;
    for (const t of tratti) {
      if (t.tipo === 'sosta' && t.i === i) { q += t.vh / 2; break; }
      q += t.vh;
    }
    return totale > 0 ? q / totale : 0;
  }

  /* Porta la camera sull'inquadratura chiesta: e' il modo piu' veloce di
     guardarla mentre la si sposta */
  function vaiA(i) {
    if (C.modo === 'scatti') {
      if (inCorsa || i === qui) { qui = i; verso = i; inCorsa = false; return; }
      verso = i;
      partito = performance.now();
      inCorsa = true;
      return;
    }
    const utile = scroller.offsetHeight - Vh;
    window.scrollTo({ top: posizioneDi(i) * utile, behavior: 'smooth' });
  }

  /* ── Memoria ───────────────────────────────── */
  function salva() {
    try { localStorage.setItem(CHIAVE, JSON.stringify(C)); } catch (e) {}
  }

  function carica() {
    try {
      const s = localStorage.getItem(CHIAVE);
      if (s) {
        const v = JSON.parse(s);
        /* Se la forma non torna si riparte dai valori di fabbrica invece
           di lavorare con meta' configurazione */
        if (v && v.stop && v.stop.length === 4 && v.corsa && v.corsa.length === 3) {
          /* Una taratura salvata prima che il ritmo esistesse non ce
             l'ha: senza questa riga il percorso verrebbe moltiplicato
             per undefined e la pagina resterebbe alta zero */
          if (typeof v.ritmo !== 'number') v.ritmo = 1;
          if (typeof v.durata !== 'number') v.durata = DEFAULT.durata;
          if (v.modo !== 'scatti' && v.modo !== 'continuo') v.modo = DEFAULT.modo;
          return v;
        }
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT));
  }

  document.getElementById('ht-copia').addEventListener('click', async () => {
    const testo = 'const CAMERA = ' + JSON.stringify(C, null, 2) + ';';
    try {
      await navigator.clipboard.writeText(testo);
      nota.innerHTML = '<b>Configurazione copiata.</b> Incollala qui in chat e la porto nel sito.';
      notaUltima = 'copiato';
    } catch (e) {
      /* Il browser puo' rifiutare gli appunti: allora si stampa e si
         copia a mano, invece di dire "fatto" senza aver fatto niente */
      console.log(testo);
      nota.innerHTML = 'Appunti non disponibili: la configurazione è nella <b>console</b>.';
      notaUltima = 'console';
    }
  });

  document.getElementById('ht-reset').addEventListener('click', () => {
    C = JSON.parse(JSON.stringify(DEFAULT));
    salva();
    costruisci();
    costruisciPannello();
  });

  document.getElementById('ht-chiudi').addEventListener('click', () => {
    pannello.hidden = true;
    apri.hidden = false;
  });
  apri.addEventListener('click', () => {
    pannello.hidden = false;
    apri.hidden = true;
  });

  window.addEventListener('keydown', e => {
    if (e.target.matches('input, select, textarea')) return;
    if (e.key === 'p' || e.key === 'P') {
      pannello.hidden = !pannello.hidden;
      apri.hidden = !pannello.hidden;
    }
    const n = +e.key;
    if (n >= 1 && n <= 4) vaiA(n - 1);
  });

  /* Aggancio per guardare un'inquadratura SENZA passare dallo scroll:
     porta la camera dove serve nell'istante stesso, quindi una
     fotografia scattata subito dopo mostra esattamente quel fotogramma e
     non un punto a meta' della frenata. Serve a tarare a quattr'occhi */
  window.HeroTest = {
    C,
    /* Porta la camera in mezzo alla sosta chiesta e ce la lascia. Sposta
       lo scroll E azzera l'inerzia: forzare solo la trasformazione non
       serve a niente, il giro di disegno la riscrive un fotogramma dopo
       con la posizione che dice lo scroll — ed e' esattamente l'errore
       che mi ha fatto fotografare l'inquadratura sbagliata */
    subito(i) {
      if (C.modo === 'scatti') { qui = verso = i; inCorsa = false; return; }
      const utile = scroller.offsetHeight - Vh;
      const p = posizioneDi(i);
      window.scrollTo(0, p * utile);
      obiettivo = vista = p;
    },
    stato: () => ({ qui, verso, inCorsa, modo: C.modo }),
    riquadro(i) {
      const s = stringi(C.stop[i]);
      return {
        px: {
          x: Math.round((s.cx - s.fw / 2) * baseW), y: Math.round((s.cy - s.fh / 2) * baseH),
          w: Math.round(s.fw * baseW), h: Math.round(s.fh * baseH)
        },
        larghezzaReale: baseW,
        limato: Math.abs(s.cx - C.stop[i].cx) > 1e-6 || Math.abs(s.cy - C.stop[i].cy) > 1e-6
      };
    },
    imposta(i, v) { Object.assign(C.stop[i], v); salva(); costruisciPannello(); this.subito(i); }
  };

  /* ── Avvio ─────────────────────────────────── */
  function via() {
    misura();
    costruisci();
    costruisciPannello();
    leggiScroll();
    vista = obiettivo;
    giro();
  }

  /* A scatti il gesto NON deve muovere la pagina, quindi passive: false
     e preventDefault. E' un'appropriazione dello scroll, e va fatta solo
     dove serve davvero: dentro l'hero e finche' l'hero ha ancora
     capitoli da mostrare. Sull'ultimo, continuando a scorrere in giu',
     la pagina riprende il suo comportamento normale — se no si resta
     intrappolati, che e' il difetto classico di queste soluzioni. */
  window.addEventListener('wheel', (e) => {
    if (C.modo !== 'scatti') return;
    const avanti = e.deltaY > 0;
    if ((avanti && qui >= C.stop.length - 1 && !inCorsa) ||
        (!avanti && qui <= 0 && !inCorsa && window.scrollY <= 0)) {
      return;   /* fuori dai capitoli: la pagina fa da se' */
    }
    e.preventDefault();
    gesto(e.deltaY);
  }, { passive: false });

  /* Tocco: si conta lo spostamento del dito, non la sua velocita' */
  let toccoY = null;
  window.addEventListener('touchstart', (e) => {
    toccoY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (C.modo !== 'scatti' || toccoY === null) return;
    const dy = toccoY - e.touches[0].clientY;
    if (Math.abs(dy) < 34) return;
    const avanti = dy > 0;
    if ((avanti && qui >= C.stop.length - 1) || (!avanti && qui <= 0)) return;
    e.preventDefault();
    toccoY = e.touches[0].clientY;
    gesto(dy);
  }, { passive: false });

  window.addEventListener('touchend', () => { toccoY = null; }, { passive: true });

  window.addEventListener('scroll', leggiScroll, { passive: true });
  window.addEventListener('resize', () => { misura(); leggiScroll(); }, { passive: true });

  if (foto.complete && foto.naturalWidth) via();
  else foto.addEventListener('load', via, { once: true });
})();
