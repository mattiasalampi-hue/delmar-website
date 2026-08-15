/* ── Hero a fotografia unica ─────────────────────
   Variante dell'hero: al posto del video una sola panoramica, dentro la
   quale si muove la CAMERA. L'hero resta fermo, lo scroll sposta
   l'inquadratura fra quattro punti — barca, selezione, catena del
   freddo, consegna — e su ognuno si ferma con la sua CTA.

   NON RIFA' L'HERO DA ZERO, E QUESTA E' LA SCELTA CHE CONTA. Il sito ne
   ha gia' uno che funziona: capitoli che entrano ed escono, inseguimento
   morbido dello scroll, e soprattutto lo SCATTO ALLA CTA — se ti fermi
   fra due call to action la pagina prosegue da sola fino a quella
   intera. Tutto questo e' in script.js e resta li'. Qui si aggiunge una
   cosa sola: dove guarda la camera, in funzione dello stesso avanzamento
   che gia' pilota i capitoli. Cosi' immagine e testo non possono
   sfasarsi, perche' leggono lo stesso numero.

   Percio' anche le soste della camera cadono ESATTAMENTE dove i capitoli
   sono a piena opacita': le soglie qui sotto sono copiate da quelle di
   initHeroScroll. Se cambiano la', vanno cambiate qui.

   Si accende da solo quando trova la fotografia al posto del video: la
   pagina col video non lo carica nemmeno. */
(function () {
  const foto = document.getElementById('hero-pano');
  if (!foto) return;

  const scroller = document.getElementById('v-scroller');
  if (!scroller || typeof gsap === 'undefined') return;

  /* Le quattro inquadrature, tarate a vista sulla fotografia vera.
     Tre numeri ciascuna: centro x, centro y, quanta parte dell'immagine
     sta in larghezza. L'altezza non e' libera — la impone la forma della
     finestra — e chiederla vorrebbe dire poterla chiedere sbagliata. */
  const F = [
    { cx: .200, cy: .460, fw: .40 },   /* Dal mare */
    { cx: .520, cy: .190, fw: .34 },   /* Selezione */
    { cx: .565, cy: .670, fw: .37 },   /* Catena del freddo */
    { cx: .870, cy: .340, fw: .26 }    /* Consegna */
  ];

  /* Dove la camera e' ferma e dove si muove, lungo l'avanzamento
     dell'hero. Le coppie con lo stesso indice sono le SOSTE, e coincidono
     con le finestre in cui la CTA e' a piena opacita' in script.js
     (c1 0→.14, c2 .28→.38, c3 .52→.60, c4 .73→.80). Dopo .80 comincia il
     capitolo del marchio: la camera resta sull'ultima inquadratura */
  const TAPPE = [
    { p: .00, f: 0 }, { p: .14, f: 0 },
    { p: .28, f: 1 }, { p: .38, f: 1 },
    { p: .52, f: 2 }, { p: .60, f: 2 },
    { p: .73, f: 3 }, { p: 1.0, f: 3 }
  ];

  /* Quanto il centro si incurva nelle carrellate. Dritto sembra una
     slittata meccanica; un filo di curva sembra una macchina da presa
     tenuta in mano. Segno alternato: due gobbe uguali di fila
     annoierebbero */
  const ARCHI = [.10, -.10, .10];

  /* Accelera e frena in modo simmetrico. Niente curve piu' teatrali:
     qui sopra ci passa gia' l'inseguimento morbido di script.js, e due
     ammorbidimenti uno sull'altro diventano una pozza */
  const dolce = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;

  let Vw = 0, Vh = 0, baseW = 1, baseH = 1;
  let ultima = '';

  function misura() {
    Vw = window.innerWidth;
    Vh = window.innerHeight;
    /* Misura NATURALE, e riletta dall'elemento invece che data per
       fatta: il foglio del sito impone max-width:100% a ogni immagine, e
       senza il rimedio nel CSS la fotografia verrebbe disegnata piu'
       stretta di quanto crediamo. Da li' in poi ogni conto sarebbe
       sbagliato, e il sintomo — una banda nera sul bordo — non dice
       niente su quale sia la causa. */
    foto.style.width = foto.naturalWidth + 'px';
    baseW = foto.offsetWidth || foto.naturalWidth || 1;
    baseH = foto.offsetHeight || foto.naturalHeight || 1;
    ultima = '';
  }

  /* Un'inquadratura non puo' uscire dalla fotografia: se il centro e'
     troppo vicino a un bordo si riporta dentro. Meglio spostata di poco
     che con una striscia nera sul lato */
  function stringi(q) {
    const fh = q.fw * (baseW / baseH) * (Vh / Vw);
    const mx = q.fw / 2, my = fh / 2;
    return {
      cx: mx * 2 >= 1 ? .5 : Math.min(1 - mx, Math.max(mx, q.cx)),
      cy: my * 2 >= 1 ? .5 : Math.min(1 - my, Math.max(my, q.cy)),
      fw: q.fw
    };
  }

  function applica(q) {
    const s = stringi(q);
    const k = (Vw / s.fw) / baseW;
    const tx = Vw / 2 - s.cx * baseW * k;
    const ty = Vh / 2 - s.cy * baseH * k;
    const t = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${k.toFixed(5)})`;
    if (t !== ultima) { ultima = t; foto.style.transform = t; }
  }

  /* Fra due inquadrature: centro interpolato con l'arco, e zoom in scala
     LOGARITMICA. Passando linearmente dai valori di mezzo si vede: la
     prima meta' sembra lentissima e la seconda una frustata. In
     logaritmo ogni istante ingrandisce della stessa frazione, ed e'
     quello che l'occhio legge come zoom costante */
  function fra(a, b, e, arco) {
    const k = Math.exp(lerp(Math.log(1 / a.fw), Math.log(1 / b.fw), e));
    let cx = lerp(a.cx, b.cx, e);
    let cy = lerp(a.cy, b.cy, e);
    if (arco) {
      const dx = b.cx - a.cx, dy = b.cy - a.cy;
      const d = Math.hypot(dx, dy) || 1;
      const g = Math.sin(Math.PI * e) * arco;
      cx += (-dy / d) * g;
      cy += (dx / d) * g;
    }
    return { cx, cy, fw: 1 / k };
  }

  function inquadratura(p) {
    for (let i = 0; i < TAPPE.length - 1; i++) {
      const a = TAPPE[i], b = TAPPE[i + 1];
      if (p > b.p && i < TAPPE.length - 2) continue;
      if (a.f === b.f) return F[a.f];
      const e = dolce(Math.min(1, Math.max(0, (p - a.p) / (b.p - a.p))));
      return fra(F[a.f], F[b.f], e, ARCHI[a.f] || 0);
    }
    return F[0];
  }

  /* L'avanzamento arriva dallo stesso ScrollTrigger che pilota i
     capitoli, non da un conto per conto nostro: due misure dello stesso
     scroll possono divergere di un fotogramma, e il testo comparirebbe
     su un'inquadratura ancora in movimento */
  let bersaglio = 0, mostrato = 0;
  ScrollTrigger.create({
    trigger: '#v-scroller', start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate(self) { bersaglio = self.progress; }
  });

  /* Stesso inseguimento dei capitoli, stessa costante: se la camera
     rincorresse con un ritardo diverso, immagine e scritte
     arriverebbero in due momenti diversi */
  const CHASE = 3.6;
  gsap.ticker.add((tempo, dt) => {
    const gap = bersaglio - mostrato;
    if (Math.abs(gap) > 0.00004) {
      mostrato += gap * (1 - Math.exp(-CHASE * dt / 1000));
    }
    applica(inquadratura(mostrato));
  });

  window.addEventListener('resize', () => { misura(); }, { passive: true });

  /* Il video, quando c'era, faceva partire due cose oltre a se stesso:
     nascondeva il caricamento e accendeva i capitoli. Senza video quel
     blocco esce subito, e senza queste due righe la pagina resterebbe
     sotto il velo di caricamento con i capitoli fermi — l'errore piu'
     facile da fare sostituendo un hero, e non da' nessun messaggio */
  function via() {
    misura();
    applica(F[0]);
    const barra = document.getElementById('bar');
    if (barra) barra.style.width = '100%';
    if (typeof hideLoader === 'function') setTimeout(hideLoader, 300);
    if (typeof initHeroScroll === 'function') initHeroScroll();
  }

  if (foto.complete && foto.naturalWidth) via();
  else foto.addEventListener('load', via, { once: true });
})();
