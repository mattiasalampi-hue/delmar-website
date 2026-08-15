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
window.DelMarPesci = function (cvs, opzioni) {
  const o = Object.assign({
    quanti:   () => (window.matchMedia('(max-width: 768px)').matches ? 24 : 52),
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
    presa:    17,     /* da quanto vicino si riesce a prenderli */
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
    const v = caso(.55, 1.25) * (.55 + z * .45);
    /* La specie si tira a sorte una volta sola: un pesce che cambia
       livrea mentre nuota non e' un pesce */
    let q = Math.random(), sp = 0;
    for (let i = 0; i < o.specie.length; i++) {
      if ((q -= o.specie[i].quota) < 0) { sp = i; break; }
      sp = i;
    }
    return {
      sp,
      x: daBordo ? (versoDestra ? -30 : W + 30) : caso(0, W),
      y: caso(H * .06, H * .94),
      ang: versoDestra ? caso(-.4, .4) : Math.PI + caso(-.4, .4),
      v,
      vBase: v,
      z,
      lung: caso(7, 13) * (.5 + z * .6),
      fase: caso(0, Math.PI * 2),
      /* Ognuno vira per conto suo, se no il banco sembra una griglia */
      giro: caso(-.006, .006),
      giroA: caso(0, Math.PI * 2),
      /* Quanto e' stanco di scappare: da 0 a 1. Serve a renderli
         PRENDIBILI — a fondo scala scattano sempre e non ne prendi mai
         uno, e un gioco che non si vince smette di essere un gioco */
      fiato: 0,
      lampo: 0
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

        if (d < o.presa && p.lampo === 0) {
          boccone(p.x, p.y, p.ang);
          Object.assign(p, nuovo(true));
          continue;
        }

        if (d < o.fuga && d > .01) {
          /* La paura cresce col quadrato della vicinanza: da lontano
             un'occhiata, da vicino uno scatto */
          scappa = Math.pow(1 - d / o.fuga, 2);
          const via = Math.atan2(dy, dx);
          /* Non gira di scatto verso la fuga: si orienta, come un pesce
             vero che deve prima curvare */
          let diff = via - p.ang;
          while (diff >  Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          p.ang += diff * Math.min(.35, .12 + scappa * .3);
        }
      }

      /* Il fiato si consuma scappando e si riprende in pace. Da stanchi
         la punta di velocita' cala di un terzo: e' li' che si acchiappano */
      p.fiato = Math.max(0, Math.min(1, p.fiato + (scappa > .2 ? .012 : -.006)));
      const tetto = p.vBase * (1 + scappa * 3.4) * (1 - p.fiato * .34);
      p.v += (tetto - p.v) * .12;

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

      /* Ai lati passano dall'altra parte: il banco non finisce mai */
      if (p.x < -40) p.x = W + 40;
      if (p.x > W + 40) p.x = -40;

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
       dare profondita' su una tela piatta */
    const op = st >= 3 ? (.34 + p.z * .66) : 1;

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
  }

  function giro() {
    const c = window.DelMarCursore ? window.DelMarCursore.posizione() : null;
    let cur = null;
    if (c && c.attivo) {
      /* Il puntatore arriva in coordinate di finestra, i pesci vivono in
         coordinate di tela: senza questa conversione scappano da un
         punto che non e' quello dove sta il calamaro */
      const r = cvs.getBoundingClientRect();
      cur = { x: c.x - r.left, y: c.y - r.top, attivo: true };
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
