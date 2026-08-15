/* ── Cursore calamaro + pulsanti calamita ────────
   Vive in un file suo e non dentro script.js perche' lo usano due
   pagine: il sito e il banco di prova in prove/. Copiarlo la' dentro
   avrebbe voluto dire correggerlo due volte ogni volta — ed e' gia'
   successo di doverlo correggere.

   Non dipende da script.js: si porta la sua attesa e usa GSAP solo se
   c'e'. Senza GSAP disegna lo stesso con requestAnimationFrame e
   rinuncia ai pulsanti calamita, che sono un di piu'.

   Si accende quando un mouse SI MUOVE DAVVERO, non quando il browser
   dichiara di averne uno: (pointer: fine) descrive il dispositivo
   PRINCIPALE, e su un portatile con schermo tattile e' il dito anche
   mentre stai usando il mouse. Un pointermove di tipo 'mouse' invece e'
   un fatto. Su un telefono quell'evento non arriva mai e non si crea
   niente.

   REGOLA da non violare: con il cursore di sistema nascosto, la punta
   disegnata deve stare ESATTAMENTE sul pixel del puntatore. Se insegue
   con un ritardo si mira in un punto e si clicca in un altro, e premere
   un pulsante diventa un terno al lotto. Qui la punta del mantello e'
   sul puntatore e a restare indietro sono SOLO i tentacoli, che non
   servono a mirare. */
(function(){
  const mqMoto = matchMedia('(prefers-reduced-motion: no-preference)');
  const conGsap = typeof window.gsap !== 'undefined';

  function attesa(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  const SEL_TESTO = 'input, textarea, select';
  const SEL_LINK  = 'a, button, [role="button"], summary, label';
  const SEL_FOTO  = '.prod-img, .gallery-item, .azienda-facade, .azienda-side-imgs img, ' +
                    '.fase-tondo, .team-photo-wrap, #cta-full';

  /* Dove il fondo e' scuro il tratto parte dal bianco, dove e' chiaro
     dal corallo.
     IL FOOTER NON STA PIU' IN QUESTO ELENCO (Mattias, 15/08/2026): ha
     classe sec-soft, cioe' fondo #f7f8fa, e un calamaro bianco su
     quel grigio chiarissimo semplicemente non si vedeva. Era l'unica
     sezione sbagliata del sito. Prima di rimettercelo, guardare che
     colore ha davvero. */
  const SEL_SCURO = '#v-scroller, #hero-bg, #cta-full, #marina';

  const CALAMITA = '.ch-cta, .prod-link, .nav-wa, .wa-big, .btn-submit, .marina-cta-btn';
  const TIRO  = .3;
  const TETTO = 8;   /* tetto in PIXEL: senza, un pulsante largo si sposterebbe
                        molto più di uno stretto a parità di gesto */

  const MAX = 26;    /* posizioni ricordate: è la lunghezza delle code */
  const N = 5;       /* tentacoli: meno sono, più il gesto resta leggibile */
  const L = 8;       /* punti per tentacolo */
  const DIETRO = 4;  /* i tentacoli nascono dietro il corpo, non sulla punta */

  const lerp = (a, b, t) => a + (b - a) * t;
  const limita = (v, m) => Math.max(-m, Math.min(m, v));

  let cvs = null, ctx = null;
  let acceso = false;
  let sospeso = false;
  const storia = [];
  let mx = 0, my = 0, vx = 0, vy = 0, ux = 0, uy = 0;
  let ang = 0, t = 0;
  let gran = 1, tgran = 1;
  let mix = 0, tmix = 0;
  let modo = 'base';
  let scuro = false;
  let sporco = null;

  /* Quando mangia: si gonfia e si accende.
     La pancia CRESCE a ogni boccone e si sgonfia piano — cosi' chi ne
     prende cinque di fila vede un calamaro grosso, e chi smette lo vede
     tornare come prima invece di restare un pallone per sempre.
     Il bagliore invece e' un lampo: dice "preso" nell'istante giusto e
     sparisce, se no diventa un alone acceso perennemente. */
  let pancia = 0;
  let bagliore = 0;
  let boccata = 0;    /* l'inghiottita: il corpo si accorcia e si gonfia */
  let fila = 1;       /* quanti di fila: piu' e' lunga, piu' e' vistosa */

  /* Dove sta il puntatore, per chi ne ha bisogno da fuori: i pesci lo
     leggono da qui invece di ascoltare a loro volta il mouse, cosi' la
     posizione e' UNA e non due che possono divergere di un fotogramma */
  window.DelMarCursore = {
    posizione: () => ({ x: mx, y: my, attivo: acceso && !sospeso }),
    mangia(combo) {
      fila = combo || 1;
      pancia = Math.min(1.35, pancia + .26);
      bagliore = 1;
      boccata = 1;
    },
    pancia: () => pancia
  };

  function dimensiona() {
    /* Densità fermata a 1 anche sugli schermi che ne dichiarano 2: una
       tela a schermo intero al doppio della densità sono quattro volte i
       pixel da ridipingere a ogni fotogramma. Su linee sottili la
       differenza non si vede */
    const r = Math.min(window.devicePixelRatio || 1, 1);
    cvs.width = innerWidth * r;
    cvs.height = innerHeight * r;
    ctx.setTransform(r, 0, 0, r, 0, 0);
    sporco = null;
  }

  function costruisci() {
    cvs = document.createElement('canvas');
    cvs.id = 'cur-cvs';
    document.body.appendChild(cvs);
    ctx = cvs.getContext('2d');
    dimensiona();
    window.addEventListener('resize', attesa(dimensiona, 120));

    if (conGsap && mqMoto.matches) {
      document.querySelectorAll(CALAMITA).forEach(el => {
        const qx = gsap.quickTo(el, 'x', { duration: .5, ease: 'power3.out' });
        const qy = gsap.quickTo(el, 'y', { duration: .5, ease: 'power3.out' });
        el.addEventListener('mousemove', (e) => {
          const r = el.getBoundingClientRect();
          qx(limita((e.clientX - (r.left + r.width  / 2)) * TIRO, TETTO));
          qy(limita((e.clientY - (r.top  + r.height / 2)) * TIRO, TETTO));
        });
        /* Il ritorno è più lento dell'andata: rilasciato di scatto
           sembrerebbe che il pulsante scappi */
        el.addEventListener('mouseleave', () => {
          gsap.to(el, { x: 0, y: 0, duration: .7, ease: 'elastic.out(1, .45)' });
        });
      });
    }

    if (conGsap) gsap.ticker.add(disegna);
    else (function giro(){ disegna(); requestAnimationFrame(giro); })();
  }

  function mostra() {
    if (sospeso || !cvs) return;
    document.documentElement.classList.add('cur-on');
    cvs.style.opacity = 1;
  }

  /* SICUREZZA. Nascondere il puntatore di sistema è una promessa: che al
     suo posto ce n'è un altro, sempre, e che si torna indietro appena
     serve. Se quella promessa si rompe — la pagina perde il fuoco, il
     mouse esce dalla finestra — chi sta davanti resta senza puntatore e
     senza modo di uscirne */
  function nascondi() {
    document.documentElement.classList.remove('cur-on');
    if (cvs) cvs.style.opacity = 0;
  }

  function disegna() {
    if (!acceso || sospeso) return;
    t += .06;

    /* La velocità decade da sola: se non arrivano eventi tende a zero e
       l'animale si calma, senza bisogno di un timer */
    vx *= .82;
    vy *= .82;
    const vel = Math.hypot(vx, vy);
    if (vel > .6) ang = Math.atan2(vy, vx);
    const v = Math.min(vel / 20, 1);

    /* La pancia si sgonfia piano (in una decina di secondi), il lampo
       si spegne in mezzo secondo: due tempi diversi di proposito */
    pancia *= .996;
    bagliore *= .93;
    /* L'inghiottita e' piu' svelta del bagliore: il corpo torna in forma
       mentre l'alone e' ancora acceso, che e' l'ordine giusto — prima si
       chiude la bocca, poi si spegne la luce */
    boccata *= .88;

    gran = lerp(gran, tgran * (1 + pancia * .55), .18);
    mix  = lerp(mix,  tmix,  .16);

    storia.unshift({ x: mx, y: my });
    if (storia.length > MAX) storia.pop();

    /* Si ripulisce SOLO il riquadro toccato al giro precedente: azzerare
       tutta la tela a ogni fotogramma, per un animale che ne occupa
       duecento pixel, era la causa degli scatti */
    if (sporco) {
      ctx.clearRect(sporco.x, sporco.y, sporco.w, sporco.h);
      sporco = null;
    }
    if (modo === 'testo') return;

    const p0 = storia[0];
    const pN = storia[Math.min(MAX - 1, storia.length - 1)] || p0;
    /* Il riquadro da ripulire deve contenere ANCHE l'alone: se resta
       della misura del corpo, il bagliore lascia in giro dei mezzelune
       che nessuno cancella piu' */
    const M = 34 + 34 * gran + bagliore * 42 + boccata * 78;
    sporco = {
      x: Math.min(p0.x, pN.x) - M,
      y: Math.min(p0.y, pN.y) - M,
      w: Math.abs(p0.x - pN.x) + M * 2,
      h: Math.abs(p0.y - pN.y) + M * 2
    };

    /* Sul video scuro dell'hero parte dal bianco, sulle sezioni chiare
       dal corallo; sopra un pulsante vira verso il corallo scuro del
       marchio. Scarto piccolo di proposito: deve dire "ci siamo" */
    const da = scuro ? [255, 255, 255] : [255, 107, 87];
    const a  = scuro ? [255, 107, 87]  : [201, 67, 44];
    /* Appena mangiato vira verso il bianco caldo: e' il modo piu' netto
       di dire "preso" senza scrivere niente da nessuna parte */
    const col = da
      .map((n, i) => n + (a[i] - n) * mix)
      .map(n => Math.round(n + (255 - n) * bagliore * .8))
      .join(',');

    /* Sopra una foto si distende, sopra un link si raccoglie e allarga i
       tentacoli: è il gesto di chi sta per afferrare, e serve anche a non
       coprire il pulsante proprio mentre lo stai per premere */
    const lungo = modo === 'foto' ? 1.25 : modo === 'link' ? .6 : 1;
    /* Mangiando i tentacoli si spalancano: e' il gesto dell'afferrare,
       ed e' quello che si vede prima di ogni altra cosa perche' occupa
       piu' spazio del corpo */
    const apertura = ((modo === 'link' ? 15 : 6.5) + boccata * 26) * gran;
    const perp = ang + Math.PI / 2;
    const cp = Math.cos(perp);
    const sp = Math.sin(perp);

    for (let j = 0; j < N; j++) {
      const lato = (j - (N - 1) / 2) / ((N - 1) / 2);
      const fase = j * .9;
      ctx.beginPath();
      for (let i = 0; i <= L; i++) {
        const idx = DIETRO + Math.round(i * ((MAX - DIETRO) / L) * lungo);
        const p = storia[Math.min(idx, storia.length - 1)];
        if (!p) break;
        const f = i / L;
        /* L'ondulazione cresce verso la punta e si CALMA con la velocità:
           a tutta corsa i tentacoli si stirano dritti */
        const onda = Math.sin(t * 2.4 - i * .6 + fase) * (1.6 + 5.5 * (1 - v)) * f * gran;
        const off = lato * apertura * f + onda;
        i ? ctx.lineTo(p.x + cp * off, p.y + sp * off)
          : ctx.moveTo(p.x + cp * off, p.y + sp * off);
      }
      ctx.strokeStyle = `rgba(${col},${.5 - Math.abs(lato) * .16})`;
      ctx.lineWidth = (1.3 - Math.abs(lato) * .5) * gran;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    /* Il corpo, con l'origine SULLA PUNTA: tutto il disegno sta dietro al
       puntatore, come la punta di una freccia */
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(ang);

    if (bagliore > .02) {
      ctx.shadowColor = `rgba(255,214,180,${bagliore})`;
      ctx.shadowBlur = 26 * bagliore;
    }

    /* L'onda del boccone, attorno al calamaro e non attorno al pesce:
       quella sul pesce dice DOVE, questa dice CHI. Piu' lunga la fila,
       piu' larga */
    if (boccata > .04) {
      const cresce = 1 - boccata;
      ctx.beginPath();
      ctx.arc(0, 0, (10 + cresce * (36 + Math.min(4, fila) * 7)) * gran, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,${Math.round(150 + boccata * 80)},130,${boccata * .6})`;
      ctx.lineWidth = 2.4 * boccata * gran;
      ctx.stroke();
    }

    /* Un respiro leggero: i calamari si muovono a spinte, e un corpo di
       misura fissa sembrerebbe un disegno trascinato.
       Mentre inghiotte si ACCORCIA e si GONFIA — schiaccia e allunga, la
       regola piu' vecchia dell'animazione: un corpo che cambia solo di
       scala sembra una figura ingrandita, uno che cambia proporzione
       sembra vivo */
    const lun = (8 + v * 3.5 + Math.sin(t * 3) * (.5 + v * .8)) * gran * (1 - boccata * .3);
    ctx.beginPath();
    ctx.ellipse(-lun, 0, lun, (4.2 - v * .7) * gran * (1 + boccata * .75), 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${col},.9)`;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-lun * 1.5, 0);
    ctx.lineTo(-lun * 2.3, -5 * gran);
    ctx.lineTo(-lun * 2.3, 5 * gran);
    ctx.closePath();
    ctx.fillStyle = `rgba(${col},.4)`;
    ctx.fill();

    /* Gli occhi stanno fra mantello e tentacoli, non sulla punta: è
       quello che lo rende un animale e non una freccia */
    ctx.fillStyle = scuro ? 'rgba(13,27,42,.9)' : 'rgba(255,255,255,.95)';
    for (const lato of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(-lun * 1.75, lato * 2.1 * gran, 1.05 * gran, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function muovi(e) {
    mx = e.clientX;
    my = e.clientY;
    vx += (e.clientX - ux) * .5;
    vy += (e.clientY - uy) * .5;
    ux = e.clientX;
    uy = e.clientY;
    if (!acceso) {
      acceso = true;
      costruisci();
    }
    mostra();
  }

  if (window.PointerEvent) {
    window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') muovi(e); }, { passive: true });
    /* Schermo tattile E mouse insieme, il caso dei portatili di oggi: al
       tocco il disegno si ritira e torna il cursore di sistema, perché un
       animale fermo dove il dito ha toccato l'ultima volta è un disturbo */
    window.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') nascondi(); }, { passive: true });
  } else {
    window.addEventListener('mousemove', muovi, { passive: true });
    window.addEventListener('touchstart', nascondi, { passive: true });
  }

  document.addEventListener('mouseleave', nascondi);
  document.addEventListener('mouseenter', () => { if (acceso) mostra(); });
  window.addEventListener('blur', nascondi);

  /* Uscita di sicurezza: Esc restituisce il puntatore di sistema */
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    sospeso = !sospeso;
    if (sospeso) nascondi(); else mostra();
  });

  /* Cosa c'è sotto: delegato, così vale anche per quello che nasce dopo */
  document.addEventListener('mouseover', (e) => {
    const el = e.target;
    if (!el || !el.closest) return;

    scuro = !!el.closest(SEL_SCURO);

    let nuovo = 'base';
    if (el.closest(SEL_TESTO)) nuovo = 'testo';
    else if (el.closest(SEL_LINK)) nuovo = 'link';
    else if (el.closest(SEL_FOTO)) nuovo = 'foto';

    if (nuovo === modo) return;
    modo = nuovo;
    tgran = nuovo === 'link' ? 1.7 : nuovo === 'foto' ? 1.25 : 1;
    tmix  = nuovo === 'link' ? 1 : 0;
  });
})();
