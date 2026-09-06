/* ════════════════════════════════════════
   Il Mercato del Mare — Script (B2C)
   File indipendente dal B2B (script.js), ma
   l'HERO usa la stessa macchina: Lenis +
   GSAP/ScrollTrigger + tunnel su canvas con
   crossfade e transizione finale nel video
   ════════════════════════════════════════ */
gsap.registerPlugin(ScrollTrigger);

/* ── Lenis smooth scroll (come il B2B) ────────── */
const lenis = new Lenis({ duration: 1.2 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* Ancore interne via Lenis (scroll-behavior:smooth è disattivato) */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const href   = a.getAttribute('href');
  const target = href === '#' ? 0 : document.querySelector(href);
  if (target === null) return;
  e.preventDefault();
  lenis.scrollTo(target);
});

const MOBILE_MQ = '(max-width: 768px)';
const isMobile  = () => window.matchMedia(MOBILE_MQ).matches;

function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ── Header: ombra dopo lo scroll ─────────────── */
const mdmHdr = document.getElementById('mdm-hdr');
window.addEventListener('scroll', () => {
  mdmHdr.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* ── Chiusura dell'hero ───────────────────────── */
/* Il riquadro si stacca dai bordi e diventa un oggetto appoggiato
   sulla pagina, invece di sparire. Identico al B2B */
const CHIUSURA = {
  trigger: '#v-scroller',
  start: 'bottom 190%',
  end: 'bottom bottom',
  scrub: true
};

gsap.fromTo('#hero-bg',
  { scale: 1, borderRadius: '0px' },
  { scale: 0.74, borderRadius: '26px', ease: 'none', scrollTrigger: CHIUSURA }
);

/* I capitoli stanno in un contenitore separato dal video: senza questo
   l'alone dietro le scritte sborderebbe ai lati del riquadro */
gsap.fromTo('#v-sticky',
  { scale: 1 },
  { scale: 0.74, ease: 'none', scrollTrigger: CHIUSURA }
);

gsap.to('#vig', {
  autoAlpha: 0,
  ease: 'none',
  scrollTrigger: { trigger: '#v-scroller', start: 'bottom 190%', end: 'bottom 150%', scrub: true }
});

/* Coperto del tutto, sparisce davvero: un video fixed che continua a
   decodificare dietro la pagina costa paint e batteria per niente */
ScrollTrigger.create({
  trigger: '#v-scroller',
  start: 'bottom top',
  onEnter:     () => gsap.set('#hero-bg, #vig', { visibility: 'hidden' }),
  onLeaveBack: () => gsap.set('#hero-bg, #vig', { visibility: 'visible' })
});

/* ── Hero bg ──────────────────────────────────── */
const bar    = document.getElementById('bar');
const loader = document.getElementById('loading');

/* Uscita loader unica (ready o timeout di sicurezza) */
let loaderDone = false;
function hideLoader() {
  if (loaderDone) return;
  loaderDone = true;
  loader.classList.add('out');
  setTimeout(() => loader.remove(), 800);
  gsap.to('#mdm-hdr', { opacity: 1, duration: 1.2, ease: 'power2.out', delay: 0.3 });
}
setTimeout(hideLoader, 7000);

/* Centraggio capitoli subito, NON dopo il load */
gsap.set('#c1', { xPercent: -50, yPercent: -50, opacity: 1 });
gsap.set('#c2', { xPercent: -50, yPercent: -50 });
gsap.set('#c3', { xPercent: -50, yPercent: -50 });
gsap.set('#c4', { xPercent: -50, yPercent: -50 });

/* Scrub dell'hero: identico al B2B — lo scroll (ammorbidito da Lenis)
   pilota i frame del tunnel, i capitoli e la transizione finale */
function initHeroScroll() {
  const CHS = [
    {el:'#c1',s:0.00,fi:0.00,fo:0.14,e:0.20},
    {el:'#c2',s:0.22,fi:0.28,fo:0.38,e:0.44},
    {el:'#c3',s:0.46,fi:0.52,fo:0.60,e:0.65},
    {el:'#c4',s:0.67,fi:0.73,fo:0.80,e:0.86},
  ];
  const els = CHS.map(c => document.querySelector(c.el));



  function op(p,s,fi,fo,e){ if(p>=e)return 0; if(p<=s)return s===0?1:0; if(p<fi)return(p-s)/(fi-s||.001); if(p>fo)return 1-(p-fo)/(e-fo||.001); return 1; }
  function sc(p,s,fi,fo,e){ if(p<=s)return s===0?1:.82; if(p<fi)return .82+.18*((p-s)/(fi-s||.001)); if(p>fo)return 1+.15*((p-fo)/(e-fo||.001)); return 1; }
  function bl(p,s,fi,fo,e){ if(s===0)return 0; if(p<=s)return 7; if(p<fi)return 7*(1-(p-s)/(fi-s||.001)); if(p>fo)return 6*((p-fo)/(e-fo||.001)); return 0; }

  /* Su mobile niente blur sui capitoli (paint caro) e scritture di
     stile solo quando il valore cambia davvero — come il B2B */
  const isMob    = isMobile();
  const lastChO  = els.map(() => -1);


  function apply(p) {
    CHS.forEach((c,i) => {
      const o = op(p,c.s,c.fi,c.fo,c.e);
      if (o === 0 && lastChO[i] === 0) return;
      lastChO[i] = o;
      const props = {
        opacity: o,
        scale:   sc(p,c.s,c.fi,c.fo,c.e)
      };
      if (!isMob) props.filter = `blur(${bl(p,c.s,c.fi,c.fo,c.e).toFixed(1)}px)`;
      gsap.set(els[i], props);
    });
  }

  /* Il video INSEGUE lo scroll con un lerp esponenziale */
  let target = 0;
  let shown  = 0;
  const CHASE = 4.5;

  ScrollTrigger.create({
    trigger:'#v-scroller', start:'top top', end:'bottom bottom', scrub:true,
    onUpdate(self){ target = self.progress; }
  });

  gsap.ticker.add((time, deltaTime) => {
    const gap = target - shown;
    if (Math.abs(gap) < 0.00004) return;
    shown += gap * (1 - Math.exp(-CHASE * deltaTime / 1000));
    apply(shown);
  });

  /* Snap ai punti CTA (desktop, via rotella): la rotella si ferma sul
     capitolo piu' vicino invece che a meta' fra due */
  const POINTS = CHS.map(c => c.s === 0 ? 0 : (c.fi + c.fo) / 2).concat(1);
  const scrollerEl = document.getElementById('v-scroller');
  const heroMax    = () => scrollerEl.offsetHeight - window.innerHeight;
  const SNAP_EPS   = 0.012;
  let snapping = false;
  let idleT    = null;
  let lastDir  = 1;

  function snapNow() {
    const max = heroMax();
    const y   = window.scrollY;
    if (y <= 1 || y >= max - 1) return;
    const p = y / max;
    if (POINTS.some(pt => Math.abs(pt - p) < SNAP_EPS)) return;
    const ahead   = POINTS.filter(pt => lastDir > 0 ? pt > p : pt < p);
    const targetP = ahead.length
      ? (lastDir > 0 ? Math.min(...ahead) : Math.max(...ahead))
      : POINTS.reduce((a, b) => Math.abs(b - p) < Math.abs(a - p) ? b : a);
    snapping = true;
    const failsafe = setTimeout(() => { snapping = false; }, 2500);
    lenis.scrollTo(Math.round(targetP * max), {
      duration: 1.2,
      easing: t => 1 - (1 - t) ** 3,
      lock: true,
      onComplete: () => { clearTimeout(failsafe); snapping = false; }
    });
  }

  window.addEventListener('wheel', (e) => {
    if (snapping) return;
    if (e.deltaY) lastDir = e.deltaY > 0 ? 1 : -1;
    clearTimeout(idleT);
    idleT = setTimeout(snapNow, 90);
  }, { passive: true });
}

/* ── Avvio del video di sfondo ────────────────── */
/* Preso pari pari dal B2B (js/script.js): sorgente scelta fra
   orizzontale e verticale, barra che segue il caricamento vero, e
   tanti tentativi di play perche' su iOS il permesso lo sblocca il
   primo gesto e non si sa in anticipo quale sara'. */
(function(){
  const videoEl = document.getElementById('hero-video');
  if (!videoEl) return;

  /* Muto e in loop da subito, prima ancora che il file arrivi: senza
     muted il browser rifiuta la riproduzione automatica, e il rifiuto
     e' silenzioso — resta un fotogramma fermo e nessun errore */
  videoEl.muted = true;
  videoEl.loop  = true;

  let avviato = false;

  /* initHeroScroll registra uno ScrollTrigger che pilota opacita', scala
     e blur dei capitoli: chiamarlo due volte ne lascia due che scrivono
     le stesse proprieta' sugli stessi elementi a ogni frame */
  let scrollPronto = false;
  function avviaScroll() {
    if (scrollPronto) return;
    scrollPronto = true;
    initHeroScroll();
  }

  function parti() {
    if (avviato) return;
    avviato = true;
    bar.style.width = '100%';
    setTimeout(hideLoader, 300);
    videoEl.play().catch(() => {});
    avviaScroll();
  }

  /* Il play automatico puo' essere negato per motivi che non dipendono
     dalla pagina: risparmio energetico su iOS, impostazione del browser,
     scheda aperta in secondo piano. Un solo tentativo non basta, quindi
     si riprova a ogni occasione utile — quando arrivano altri dati e al
     primo gesto qualunque esso sia, perche' su iOS e' il gesto a
     sbloccare il permesso e non si sa in anticipo quale sara' */
  const riprova = () => { if (videoEl.paused) videoEl.play().catch(() => {}); };
  videoEl.addEventListener('canplay', riprova);
  videoEl.addEventListener('loadeddata', riprova);
  ['touchstart', 'touchend', 'pointerdown', 'click', 'scroll'].forEach(ev => {
    window.addEventListener(ev, riprova, { passive: true });
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) riprova(); });

  /* Avanzamento vero del caricamento, non una percentuale inventata */
  bar.style.width = '10%';
  videoEl.addEventListener('progress', () => {
    if (!videoEl.buffered.length || !videoEl.duration) return;
    const p = videoEl.buffered.end(videoEl.buffered.length - 1) / videoEl.duration;
    bar.style.width = (10 + 85 * Math.min(1, p)) + '%';
  });

  /* Un caricamento fallito non deve restare tale per sempre: la sorgente
     viene ricaricata una volta. Cinque secondi e non meno, perche' sotto
     rete mobile un'attesa breve interromperebbe uno scaricamento che sta
     andando bene */
  const ATTESA_METADATI = 5000;

  function avviaCon(url, ripiego) {
    videoEl.src = url;
    videoEl.load();
    if (videoEl.readyState >= 1) { parti(); return; }
    videoEl.addEventListener('loadedmetadata', parti, { once: true });
    if (ripiego) {
      setTimeout(() => {
        if (!avviato && !videoEl.duration) avviaCon(ripiego, null);
      }, ATTESA_METADATI);
    }
  }

  /* Rete lenta, codec rifiutato: i capitoli partono comunque, al peggio
     senza sfondo. Non si deve mai restare bloccati sul loader. Non tocca
     'avviato', cosi' se il file arriva in ritardo il video parte lo
     stesso — semplicemente i capitoli erano gia' in moto */
  setTimeout(() => {
    if (!avviato) { hideLoader(); avviaScroll(); }
  }, 9000);

  /* Su telefono un file dedicato, verticale: quello orizzontale, a
     riempimento per copertura, perdeva quasi tutta la larghezza */
  const sorgente = isMobile() ? videoEl.dataset.srcM : videoEl.dataset.src;
  avviaCon(sorgente, sorgente);
})();

/* ── Hamburger mobile ─────────────────────────── */
(function () {
  const btn = document.getElementById('mdm-hamburger');
  const nav = document.getElementById('mdm-nav');
  if (!btn || !nav) return;
  const links = Array.from(nav.querySelectorAll('a'));

  function open() {
    btn.classList.add('open');
    nav.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }

  function close() {
    btn.classList.remove('open');
    nav.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', () => {
    btn.classList.contains('open') ? close() : open();
  });

  links.forEach(a => a.addEventListener('click', close));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) close();
  });

  window.matchMedia('(min-width: 769px)').addEventListener('change', e => {
    if (e.matches) close();
  });
})();

/* ── Reveal on scroll ──────────────────────────── */
const revealEls = document.querySelectorAll('.reveal-el');

/* RETE DI SICUREZZA. Gli elementi partono a opacity:0 e la classe gliela
   mette l'osservatore: se per qualunque motivo l'osservatore non scatta,
   quel contenuto resta invisibile PER SEMPRE e la sezione sembra vuota.
   Non e' teorico: un IntersectionObserver non consegna niente finche' la
   scheda e' in secondo piano, quindi basta aprire il link in una scheda
   di sfondo e leggerla dopo. Due reti: chi e' gia' a schermo al caricamento
   si mostra subito, e dopo tre secondi si mostra tutto comunque.
   Meglio l'animazione persa che mezza pagina bianca. (06/09/2026) */
function mostra(el) { el.classList.add('is-visible'); }

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      mostra(entry.target);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: .15 });

revealEls.forEach(el => {
  /* Gia' nel riquadro al caricamento: non si aspetta l'osservatore */
  const r = el.getBoundingClientRect();
  if (r.top < window.innerHeight && r.bottom > 0) mostra(el);
  else revealObserver.observe(el);
});

setTimeout(() => revealEls.forEach(mostra), 3000);

/* I box non esistono piu' in pagina (06/09/2026): i prezzi erano
   segnaposto, il bottone portava a carrello.html che sul server e' 404 e
   il checkout non ha mai avuto un pagamento collegato. La pagina adesso
   racconta il negozio fisico. Il codice del carrello resta in
   js/mdm-shop.js per quando si vendera' davvero online. */

/* ── CTA sticky mobile ────────────────────────── */
/* Visibile (via CSS <768px) dopo l'hero e fuori dalla sezione form */
(function () {
  const cta  = document.getElementById('mdm-sticky-cta');
  const hero = document.getElementById('v-scroller');
  const form = document.getElementById('contatti');
  if (!cta || !hero || !form) return;
  let pastHero = false;
  let onForm   = false;

  const update = () => cta.classList.toggle('show', pastHero && !onForm);

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.target === hero) pastHero = !entry.isIntersecting;
      if (entry.target === form) onForm = entry.isIntersecting;
    });
    update();
  }, { threshold: 0 });
  io.observe(hero);
  io.observe(form);
})();

/* Il form di prenotazione non vive più qui: il flusso è
   carrello.html → checkout.html (vedi js/mdm-shop.js) */

/* ── Il banco di pesciolini sui contatti ───────── */
/* Stesso pezzo del B2B (js/pesci.js), montato senza caustiche: qui la
   sezione non e' divisa in due campiture, quindi non c'e' un confine
   dove far virare la livrea e si passa -1 = tutti chiari.
   offsetParent nullo vuol dire che il foglio di stile ha spento la tela
   (sotto i 769px): la soglia sta nel CSS e basta chiedergliela. */
(function(){
  const tela = document.getElementById('contatti-particles');
  if (!tela) return;
  if (tela.offsetParent === null) return;
  if (!window.DelMarPesci) return;

  window.DelMarPesci(tela, {
    confine: () => -1,
    stile: 4
  });
})();
