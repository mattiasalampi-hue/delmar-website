/* ════════════════════════════════════════
   DelMar — Main Script
   ════════════════════════════════════════ */

gsap.registerPlugin(ScrollTrigger);

/* ── Lenis smooth scroll ──────────────────────── */
/* Tutta la pagina scorre con inerzia: la rotella non sposta la
   posizione di scatto, la fa planare verso il target con una lunga
   decelerazione — lo scrub dell'hero (e di ogni sezione) eredita
   questa curva, quindi il movimento prosegue morbido anche dopo
   che si smette di scrollare */
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

const mm = gsap.matchMedia();
const MOBILE_MQ  = '(max-width: 768px)';
const DESKTOP_MQ = '(min-width: 769px)';
const isMobile   = () => window.matchMedia(MOBILE_MQ).matches;

function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* Palette del beam e della linea che prosegue dentro Marina: corallo,
   il secondario del marchio. Tre gradazioni perché la luce si legga —
   nucleo scuro, alone pieno, coda che sfuma via */
const CV_INK  = '201,67,44';
const CV_HALO = '255,107,87';
const CV_FAR  = '255,150,120';

/* La rete neurale di sfondo resta a inchiostro: è una texture che
   corre dietro ai testi di Marina e in corallo tingerebbe di rosa
   tutta la sezione */
const CV_NET  = '21,28,100';

/* ── Header scroll state ──────────────────────── */
const hdr = document.getElementById('hdr');
ScrollTrigger.create({
  trigger: '#v-scroller', start: 'bottom 70%',
  onEnter: ()     => hdr.classList.add('scrolled'),
  onLeaveBack: () => hdr.classList.remove('scrolled')
});

/* ── Chiusura dell'hero ───────────────────────── */
/* Nell'ultimo tratto di scroll il video si ritira in un riquadro:
   invece di sparire si stacca dai bordi e diventa un oggetto appoggiato
   sulla pagina. Finisce di rimpicciolirsi esattamente quando la corsa
   dell'hero termina, e da lì i numeri salgono a coprirlo */
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

/* I capitoli vivono in un contenitore separato dal video e non si
   rimpicciolirebbero con lui: l'alone scuro dietro le scritte è più
   largo del testo e resterebbe a sbordare ai lati del riquadro. Scala
   con lo stesso fattore, così testo e alone restano dentro */
gsap.fromTo('#v-sticky',
  { scale: 1 },
  { scale: 0.74, ease: 'none', scrollTrigger: CHIUSURA }
);

/* La vignettatura è ancorata al bordo alto dello schermo, non al
   riquadro: mentre questo si stacca resterebbe a mezz'aria sul bianco */
gsap.to('#vig', {
  autoAlpha: 0,
  ease: 'none',
  scrollTrigger: {
    trigger: '#v-scroller',
    start: 'bottom 190%',
    end: 'bottom 150%',
    scrub: true
  }
});

/* Una volta coperto del tutto sparisce davvero: un video fixed che
   continua a decodificare dietro l'intera pagina costa paint e
   batteria per qualcosa che nessuno vede */
ScrollTrigger.create({
  trigger: '#v-scroller',
  start: 'bottom top',
  onEnter:     () => gsap.set('#hero-bg, #vig', { visibility: 'hidden' }),
  onLeaveBack: () => gsap.set('#hero-bg, #vig', { visibility: 'visible' })
});

/* ── Hero bg ──────────────────────────────────── */
const bar    = document.getElementById('bar');
const loader = document.getElementById('loading');

/* Uscita loader unica (ready o timeout di sicurezza): su rete lenta
   il sito deve partire comunque, l'animazione arriva quando arriva */
let loaderDone = false;
function hideLoader() {
  if (loaderDone) return;
  loaderDone = true;
  loader.classList.add('out');
  setTimeout(() => loader.remove(), 800);
  gsap.to('#hdr', { opacity: 1, duration: 1.2, ease: 'power2.out', delay: 0.3 });
}
setTimeout(hideLoader, 7000);

/* Centraggio capitoli subito, NON dopo il load: se l'animazione
   tarda (rete lenta / timeout loader) i capitoli devono comunque
   essere centrati, altrimenti sfondano il viewport a destra */
gsap.set('#c1', { xPercent:-50, yPercent:-50, opacity:1 });
gsap.set('#c2', { xPercent:-50, yPercent:-50 });
gsap.set('#c3', { xPercent:-50, yPercent:-50 });
gsap.set('#c4', { xPercent:-50, yPercent:-50 });
gsap.set('#c5', { xPercent:-50, yPercent:-50 });

/* I capitoli dell'hero seguono lo scroll, già ammorbidito da Lenis.
   Il video no: scorre per conto suo, in loop, e questa funzione non lo
   tocca più — prima riceveva anche un numero di fotogramma da mostrare,
   ora il montaggio del filmato è indipendente da dove sei nella pagina */
function initHeroScroll() {
  const CHS = [
    {el:'#c1',s:0.00,fi:0.00,fo:0.14,e:0.20},
    {el:'#c2',s:0.22,fi:0.28,fo:0.38,e:0.44},
    {el:'#c3',s:0.46,fi:0.52,fo:0.60,e:0.65},
    {el:'#c4',s:0.67,fi:0.73,fo:0.80,e:0.86},
    /* Il marchio chiude e non esce più: fo ed e oltre 1 perché op()
       azzera l'opacità appena p raggiunge e, e qui p arriva a 1 */
    {el:'#c5',s:0.87,fi:0.93,fo:1.01,e:1.02},
  ];
  const els = CHS.map(c => document.querySelector(c.el));

  /* Il primo capitolo (s=0) parte già in scena: a p=0 deve essere
     nitido e a scala piena, non nello stato "pre-ingresso" — senza
     il ramo s===0, tornando in cima restava sfocato e rimpicciolito.
     E per lo stesso capitolo NIENTE blur nemmeno in uscita/rientro:
     risalendo deve ricomparire subito nitido, solo in dissolvenza */
  function op(p,s,fi,fo,e){ if(p>=e)return 0; if(p<=s)return s===0?1:0; if(p<fi)return(p-s)/(fi-s||.001); if(p>fo)return 1-(p-fo)/(e-fo||.001); return 1; }
  function sc(p,s,fi,fo,e){ if(p<=s)return s===0?1:.82; if(p<fi)return .82+.18*((p-s)/(fi-s||.001)); if(p>fo)return 1+.15*((p-fo)/(e-fo||.001)); return 1; }
  function bl(p,s,fi,fo,e){ if(s===0)return 0; if(p<=s)return 7; if(p<fi)return 7*(1-(p-s)/(fi-s||.001)); if(p>fo)return 6*((p-fo)/(e-fo||.001)); return 0; }

  /* Su mobile ogni ms di paint conta: niente blur sui capitoli, la
     ri-rasterizzazione del testo con Gaussian blur a raggio variabile
     è la voce di paint più cara sui telefoni */
  const isMob    = isMobile();
  const lastChO  = els.map(() => -1);

  function apply(p) {
    CHS.forEach((c,i) => {
      const o = op(p,c.s,c.fi,c.fo,c.e);
      /* capitolo spento e già spento: nessuna scrittura */
      if (o === 0 && lastChO[i] === 0) return;
      lastChO[i] = o;
      const props = {
        opacity: o,
        scale:   sc(p,c.s,c.fi,c.fo,c.e),
        /* Cliccabile solo il capitolo in scena: gli altri sono
           trasparenti ma occupano lo stesso spazio al centro, e senza
           questo il clic finiva sulla CTA di un capitolo invisibile */
        pointerEvents: o > 0.6 ? 'auto' : 'none'
      };
      if (!isMob) props.filter = `blur(${bl(p,c.s,c.fi,c.fo,c.e).toFixed(1)}px)`;
      gsap.set(els[i], props);
    });
  }

  /* I capitoli NON leggono lo scroll 1:1: lo INSEGUONO con un lerp
     esponenziale. Mentre scrolli il divario col target cresce e la
     velocità sale (accelerazione); quando ti fermi il divario si chiude
     planando — il movimento continua da solo oltre l'inerzia di Lenis */
  let target = 0;
  let shown  = 0;
  /* 1/s: più basso = inseguimento più lungo e morbido. Alzato da 2,6
     insieme all'accorciamento della corsa: su una corsa breve lo stesso
     ritardo pesa il doppio, perché è una frazione più grande del
     percorso totale, e il capitolo sembrerebbe arrivare in ritardo */
  const CHASE = 3.6;

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

  /* Snap ai punti CTA: se lo scroll si ferma TRA due call to action,
     la pagina prosegue da sola (via lenis.scrollTo, quindi con la
     stessa inerzia del resto) fino alla CTA piena nella direzione di
     marcia — accelerazione al centro, frenata all'arrivo. Il video
     segue con l'inseguitore qui sopra */
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
    /* rete di sicurezza se onComplete non arrivasse */
    const failsafe = setTimeout(() => { snapping = false; }, 2500);
    lenis.scrollTo(Math.round(targetP * max), {
      duration: 1.2,
      /* easeOutCubic: parte già in velocità — raccoglie la planata di
         Lenis senza pausa né riaccelerazione, frena solo sulla CTA */
      easing: t => 1 - (1 - t) ** 3,
      lock: true,
      onComplete: () => { clearTimeout(failsafe); snapping = false; }
    });
  }

  /* La partenza scatta alla fine dell'INPUT (ultima tacca di rotella),
     non alla fine dell'inerzia di Lenis: 90ms dopo l'ultimo evento la
     corsa verso la CTA aggancia il movimento ancora in planata */
  window.addEventListener('wheel', (e) => {
    if (snapping) return;
    if (e.deltaY) lastDir = e.deltaY > 0 ? 1 : -1;
    clearTimeout(idleT);
    idleT = setTimeout(snapNow, 90);
  }, { passive: true });
}

/* Sfondo hero: un mp4 a tutto schermo che scorre da solo, in loop,
   mentre lo scroll fa passare i capitoli davanti. Stesso comportamento
   su desktop e su telefono.

   Prima il video era legato allo scroll fotogramma per fotogramma. Ha
   funzionato bene solo su Chrome: Safari e Firefox sono piu' lenti e
   meno puntuali a confermare un salto, e bastava UN salto perso perche'
   l'immagine restasse congelata per il resto della visita. Tutta la
   macchina che serviva a tenerlo in piedi — il file scaricato per
   intero in memoria prima di partire, un salto per volta incatenato
   all'evento 'seeked', una guardia sui salti persi, la resa automatica
   a riproduzione continua quando il browser non ce la faceva — e'
   sparita insieme al problema che risolveva.

   Ci ha guadagnato anche l'immagine, ed e' la parte controintuitiva.
   Per rendere i salti istantanei il file era codificato con un
   keyframe su OGNI fotogramma: nessuna compressione fra un fotogramma e
   il successivo, quindi la banda spesa a ripetere lo stesso mare invece
   che a descriverlo meglio. Tolto quel vincolo, misurando contro la
   sorgente, la somiglianza sale da 0,982 a 0,994 di SSIM E il file
   scende da 4,7 a 3,0 MB. Il file piu' grosso era il piu' brutto. */
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

/* ── Il racconto: video a tutta pagina ────────── */
/* Il cortometraggio dura 2 minuti e mezzo: 20 MB su desktop, 8 su
   telefono. La sorgente si assegna solo quando la sezione si avvicina,
   altrimenti quel peso lo pagherebbe anche chi non ci arriva mai. Fuori
   campo si mette in pausa, così non decodifica per nessuno. */
(function(){
  const v = document.getElementById('racconto');
  if (!v) return;

  let caricato = false;

  /* Si osserva la SEZIONE e non il video. Il video ha dimensioni sue,
     che dipendono da quando arriva il file e da come il browser risolve
     le altezze: se il suo riquadro collassa, l'osservatore non scatta
     mai e il file non viene nemmeno chiesto — cioè il video non si
     carica per un motivo che col video non c'entra niente. La sezione
     invece sta nel flusso e un'altezza ce l'ha sempre */
  const sezione = document.getElementById('cta-full') || v;

  /* RETE DI SICUREZZA. Il filmato dura 2 minuti e mezzo e pesa 8 MB su
     telefono: se non parte — riproduzione automatica negata, decodifica
     lenta, rete che singhiozza — al suo posto resta una striscia scura
     che sembra un guasto. Con il fotogramma di riserva il peggio che può
     capitare è un'immagine ferma del film, che è una cosa che ha senso.
     Assegnato da JS e non scritto nel markup di proposito: l'attributo
     poster si scarica al caricamento della pagina anche con
     preload="none", e questa sezione sta molto sotto la piega */
  const POSTER = 'assets/racconto-poster.jpg?v=1';
  let tentativi = 0;

  function carica() {
    v.muted = true;
    v.poster = POSTER;
    v.src = isMobile() ? v.dataset.srcM : v.dataset.src;
    v.load();
  }

  /* Un errore di rete non deve essere definitivo: si riprova una volta.
     Se va male anche la seconda resta il fotogramma, e non si insiste —
     ricaricare in eterno su rete mobile è peggio del difetto */
  v.addEventListener('error', () => {
    if (++tentativi > 1) return;
    setTimeout(carica, 1500);
  });

  new IntersectionObserver((entries) => {
    const dentro = entries[0].isIntersecting;
    if (dentro && !caricato) {
      caricato = true;
      carica();
    }
    if (dentro) v.play().catch(() => {});
    /* Si mette in pausa solo quando ha già qualcosa da mostrare: farlo
       prima fermerebbe lo scaricamento a metà, e tornando indietro il
       video sarebbe ancora fermo al punto in cui l'avevamo lasciato */
    else if (!v.paused && v.readyState >= 2) v.pause();
  }, { rootMargin: '900px 0px' }).observe(sezione);

  /* Il play automatico può essere rifiutato in silenzio: risparmio
     energetico iOS, impostazione del browser, scheda in secondo piano.
     Si riprova a ogni occasione utile, come per il video dell'hero */
  const riprova = () => {
    if (caricato && v.paused && sezione.getBoundingClientRect().bottom > 0) {
      v.play().catch(() => {});
    }
  };
  v.addEventListener('canplay', riprova);
  v.addEventListener('loadeddata', riprova);
  ['touchstart', 'touchend', 'pointerdown', 'click'].forEach(ev => {
    window.addEventListener(ev, riprova, { passive: true });
  });
})();

/* ── Counters ─────────────────────────────────── */
document.querySelectorAll('[data-count]').forEach(el => {
  const target = +el.dataset.count;
  /* Presenza, non verità: data-suffix="" vuol dire "nessun suffisso"
     (35 porti, non 35+) e con || sarebbe ricaduto sul default */
  const suffix = 'suffix' in el.dataset ? el.dataset.suffix : '+';
  ScrollTrigger.create({
    trigger: el, start: 'top 85%', once: true, invalidateOnRefresh: true,
    onEnter() {
      gsap.to({ n: 0 }, { n: target, duration: 1.8, ease: 'power2.out',
        onUpdate() { el.textContent = Math.round(this.targets()[0].n) + suffix; }
      });
    }
  });
});

/* ── Il KPI in diretta: kg venduti oggi ───────── */
/* La media è 8.000 kg al giorno, ma l'80% passa entro le 15: spalmarli
   sulle 24 ore darebbe numeri lontani dal vero per tutto il
   pomeriggio, quindi la curva è spezzata in due tratti che si
   incontrano alle 15.
   Il numero mostrato NON insegue la curva secondo per secondo: si
   ferma e poi scatta, perché il magazzino non vende un etto alla
   volta, chiude ordini. La curva resta il vincolo — a fine giornata
   il totale torna comunque — ma il momento dello scatto è casuale */
(function(){
  const kgEl    = document.getElementById('live-kg');
  const tEl     = document.getElementById('live-time');
  const badgeEl = document.getElementById('live-badge');
  const stateEl = document.getElementById('live-state');
  if (!kgEl || !tEl || !badgeEl || !stateEl) return;

  const OPEN_SEC  = 8 * 3600;    /* si vende dalle 8 alle 17: prima il
                                    contatore è a zero, dopo è fermo
                                    sul totale della giornata */
  const CLOSE_SEC = 17 * 3600;

  /* Volume atteso per giorno della settimana, da domenica a sabato.
     Il venerdì non era indicato: sta fra il giovedì e il sabato */
  const WEEK_KG = [5000, 5000, 6000, 6500, 7000, 8000, 9000];
  const SPREAD  = 0.12;          /* oscillazione attorno al valore del
                                    giorno: senza, il totale di chiusura
                                    sarebbe identico ogni lunedì */

  /* Tutto il caso è SEMINATO CON LA DATA: due giorni hanno andamenti e
     totali diversi, ma entro lo stesso giorno nulla cambia. Con un
     seme davvero casuale il contatore salterebbe a ogni ricarica e due
     schede aperte mostrerebbero numeri diversi */
  function mulberry32(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* Deforma il tempo dentro la fascia: tre onde di ampiezza calante e
     fase casuale sommate alla retta, così ci sono ore di corsa e ore
     di calma. Le ampiezze sommano meno di 1, quindi la velocità
     rallenta ma non si azzera e il totale non torna mai indietro.
     Ogni onda compie un numero intero di periodi sulla fascia: agli
     estremi la deformazione si annulla e la chiusura cade esatta sul
     totale del giorno, comunque siano andate le ore in mezzo */
  function makeWarp(rand) {
    const waves = [0.34, 0.22, 0.12].map((amp, i) => ({
      k: i + 1,
      a: amp * (rand() < 0.5 ? -1 : 1),
      p: rand() * Math.PI * 2
    }));
    return u => u + waves.reduce((sum, w) =>
      sum + w.a * (Math.cos(w.p) - Math.cos(2 * Math.PI * w.k * u + w.p)) / (2 * Math.PI * w.k), 0);
  }

  const today = new Date();
  const rand  = mulberry32(today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate());
  const DAY_KG  = Math.round(WEEK_KG[today.getDay()] * (1 - SPREAD + rand() * SPREAD * 2));
  const warpDay = makeWarp(rand);

  function kgAt(sec) {
    if (sec <= OPEN_SEC)  return 0;
    if (sec >= CLOSE_SEC) return DAY_KG;
    const u = (sec - OPEN_SEC) / (CLOSE_SEC - OPEN_SEC);
    /* esponente sotto 1: al mattino si vende di più, come in un
       magazzino ittico vero */
    return DAY_KG * Math.pow(warpDay(u), 0.85);
  }

  const pad    = n => String(n).padStart(2, '0');
  const secNow = () => { const d = new Date(); return d.getHours()*3600 + d.getMinutes()*60 + d.getSeconds(); };
  const fmt    = v => Math.round(v).toLocaleString('it-IT');

  /* ── Rulli ── */
  const REEL  = 3;              /* cicli 0-9 impilati: il rullo può
                                   girare più di un giro prima di
                                   fermarsi sulla cifra nuova */
  const SLOTS = REEL * 10;      /* celle totali nel rullo */
  /* yPercent è una percentuale dell'altezza del RULLO INTERO, non
     della singola cifra: con 30 celle una cifra vale 100/30, e usare
     100 spedisce il rullo fuori dalla finestra */
  const STEP  = 100 / SLOTS;
  let cells = [];               /* una voce per carattere: {reel, digit} o null */

  function buildOdometer(text) {
    kgEl.textContent = '';
    cells = text.split('').map(ch => {
      if (!/\d/.test(ch)) {
        const sep = document.createElement('span');
        sep.className = 'odo-sep';
        sep.textContent = ch;
        kgEl.appendChild(sep);
        return null;
      }
      const win  = document.createElement('span');
      win.className = 'odo-d';
      const reel = document.createElement('span');
      reel.className = 'odo-reel';
      for (let c = 0; c < REEL; c++) {
        for (let d = 0; d < 10; d++) {
          const s = document.createElement('span');
          s.textContent = d;
          reel.appendChild(s);
        }
      }
      win.appendChild(reel);
      kgEl.appendChild(win);
      const digit = +ch;
      gsap.set(reel, { yPercent: -STEP * digit });
      return { reel, digit };
    });
  }

  /* Girano TUTTI i rulli, anche quelli che atterrano sulla stessa
     cifra, e si fermano uno dopo l'altro da sinistra a destra. Con
     8.000 kg al giorno uno scatto vale un chilo o poco più: facendo
     girare solo la cifra che cambia si muoverebbe l'ultima e basta,
     e della slot non resterebbe niente */
  function rollTo(text) {
    if (text.length !== cells.length) { buildOdometer(text); return; }
    let order = 0;
    text.split('').forEach((ch, i) => {
      const cell = cells[i];
      if (!cell) return;
      const target = +ch;
      const laps   = 1 + Math.floor(Math.random() * (REEL - 1));
      gsap.fromTo(cell.reel,
        { yPercent: -STEP * cell.digit },
        {
          yPercent: -STEP * (10 * laps + target),
          duration: 0.5 + laps * 0.18,
          delay: order * 0.08,
          ease: 'power3.out',
          onComplete() { gsap.set(cell.reel, { yPercent: -STEP * target }); }
        }
      );
      cell.digit = target;
      order++;
    });
  }

  let shown = Math.round(kgAt(secNow()));
  buildOdometer(fmt(shown));

  /* Nessuna vendita si chiude a un chilo per volta: il contatore
     aspetta di aver maturato un blocco intero prima di scattare, e la
     taglia del blocco cambia ogni volta. Sbilanciata verso il basso
     perché gli ordini piccoli sono la maggioranza */
  const pickBlock = () => 3 + Math.round(Math.random() * Math.random() * 32);
  let nextBlock = pickBlock();

  function setBadge(state, time, isClosed) {
    badgeEl.classList.toggle('is-closed', isClosed);
    stateEl.textContent = state;
    tEl.textContent = time;
  }

  /* Fuori orario un cronometro che corre accanto a un numero fermo
     sembra un contatore rotto: la pillola dice invece a che ora si
     apre o si è chiuso, e smette di pulsare */
  function phase() {
    const s = secNow();
    if (s < OPEN_SEC)  return 'prima';
    if (s >= CLOSE_SEC) return 'dopo';
    return 'durante';
  }

  function clock() {
    const p = phase();
    if (p === 'prima') { setBadge('le vendite aprono alle', '08:00', true); stop(); return; }
    if (p === 'dopo')  { setBadge('vendite chiuse alle', '17:00', true);   stop(); return; }
    const d = new Date();
    setBadge('in tempo reale', `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`, false);
  }

  function bump() {
    const target = Math.round(kgAt(secNow()));
    if (target - shown < nextBlock) return;
    shown = target;
    nextBlock = pickBlock();
    kgEl.classList.add('is-bump');
    rollTo(fmt(shown));
    setTimeout(() => kgEl.classList.remove('is-bump'), 900);
  }

  let clockT = null;
  let bumpT  = null;

  function start() {
    if (clockT) return;
    clock();
    if (phase() !== 'durante') return;
    clockT = setInterval(clock, 1000);
    bumpT  = setInterval(bump, 2000);
  }

  function stop() {
    clearInterval(clockT); clockT = null;
    clearInterval(bumpT);  bumpT  = null;
  }

  new IntersectionObserver(e => e[0].isIntersecting ? start() : stop(), { threshold: 0 }).observe(kgEl);
})();

/* ── Clip reveals (testi grandi) ──────────────── */
document.querySelectorAll('.clip-inner').forEach(el => {
  gsap.to(el, { y: '0%', duration: 1.1, ease: 'power3.out',
    scrollTrigger: { trigger: el.closest('.clip-wrap'), start: 'top 88%', toggleActions:'play none none reverse', invalidateOnRefresh:true }
  });
});

/* ── Label fade ───────────────────────────────── */
document.querySelectorAll('.reveal-label').forEach(el => {
  gsap.from(el, { opacity:0, y:15, duration:.8, ease:'power2.out',
    scrollTrigger: { trigger:el, start:'top 88%', toggleActions:'play none none reverse', invalidateOnRefresh:true }
  });
});

/* ── Body text reveal ────────────────────────── */
document.querySelectorAll('.reveal-text').forEach((el,i) => {
  gsap.from(el, { opacity:0, y:25, duration:1, ease:'power3.out', delay:i*0.1,
    scrollTrigger: { trigger:el, start:'top 88%', toggleActions:'play none none reverse', invalidateOnRefresh:true }
  });
});

/* ── Image reveal + parallax ─────────────────── */
document.querySelectorAll('.reveal-img').forEach(el => {
  gsap.from(el, { opacity:0, scale:.96, duration:1.2, ease:'power3.out',
    scrollTrigger: { trigger:el, start:'top 85%', toggleActions:'play none none reverse', invalidateOnRefresh:true }
  });
});

document.querySelectorAll('.par-img img').forEach(img => {
  gsap.to(img, { scale: 1, ease:'none',
    scrollTrigger: { trigger: img.closest('.par-img'), start:'top bottom', end:'bottom top', scrub:1.5 }
  });
});

/* ── Prod strip fade-in (solo desktop: su mobile le strip
      diventano stacking cards sticky, il transform confligge) ── */
mm.add(DESKTOP_MQ, () => {
  document.querySelectorAll('.prod-strip').forEach(strip => {
    gsap.from(strip, { opacity:0, y:40, duration:1, ease:'power3.out',
      scrollTrigger: { trigger:strip, start:'top 85%', toggleActions:'play none none reverse' }
    });
  });
});

/* ── Prodotti stacking cards (mobile): la card coperta arretra
      e sfuma — effetto "deck" ── */
/* Sfuma, non si spegne. Prima scendeva a brightness(.55): un filtro
   scurisce TUTTO insieme, foto e testo, e su una pagina bianca una card
   che diventa grigio scuro non sembra allontanarsi, sembra un guasto —
   il titolo e la descrizione finivano quasi neri su fondo quasi nero.
   Con l'opacità la card si dissolve verso il bianco della pagina, che è
   la direzione giusta su un sito chiaro, e il testo se ne va insieme al
   resto invece di restare leggibile dentro una macchia buia.
   L'ease non è più lineare ma power2.in: la card resta piena per quasi
   tutto il passaggio e sfuma solo alla fine, quando ormai è coperta. È
   questo a togliere l'aggressività, più ancora del valore finale.
   In più sparisce l'animazione di un filter, che a ogni fotogramma
   costringe il telefono a ridipingere l'intera card. */
mm.add('(max-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
  const strips = gsap.utils.toArray('.prod-strip');
  strips.forEach((strip, i) => {
    const next = strips[i + 1];
    if (!next) return;
    gsap.to(strip, {
      scale: .96,
      opacity: .4,
      transformOrigin: 'center top',
      ease: 'power2.in',
      scrollTrigger: {
        trigger: next,
        start: 'top bottom',
        end: 'top 8%',
        scrub: true,
        invalidateOnRefresh: true
      }
    });
  });
});

/* ── Come Lavoriamo: nastro che scorre di lato ──── */
/* La sezione resta ferma a schermo e lo scroll verticale trascina le
   quattro fasi da destra a sinistra. La corsa dura tre schermate: una
   per ogni passaggio da una fase all'altra, così ogni fase ha il suo
   tempo di lettura al centro prima che parta la successiva */
(function(){
  const nastro = document.getElementById('fasi-nastro');
  const barra  = document.getElementById('fasi-barra-fill');
  const linea  = document.getElementById('fasi-linea');
  if (!nastro) return;

  const fasi = nastro.children.length;

  /* Il vuoto fra il contenuto di una fase e il bordo. Va MISURATO e non
     deciso a occhio: foto e testo sono centrati nella fase, quindi lo
     spazio che avanza dipende da quanto è larga la finestra e da dove
     va a capo il testo. Un valore fisso funzionerebbe su uno schermo e
     sborderebbe su un altro */
  let vuoto = 0;

  function misura() {
    const fase  = nastro.children[0];
    const testo = fase.querySelector('.fase-testo');
    if (!testo) return;
    vuoto = fase.getBoundingClientRect().right - testo.getBoundingClientRect().right;
  }

  const morbida = x => x * x * (3 - 2 * x);
  const entro01 = x => Math.max(0, Math.min(1, x));

  ScrollTrigger.create({
    trigger: '#processo',
    start: 'top top',
    end: () => '+=' + (window.innerHeight * (fasi - 1) * 1.15),
    pin: true,
    anticipatePin: 1,
    scrub: 1,
    invalidateOnRefresh: true,
    onRefresh: misura,
    onUpdate(self) {
      const p = self.progress;
      /* xPercent e non pixel: si ricalcola da solo al ridimensionare
         della finestra, mentre una traslazione in pixel resterebbe
         tarata sulla larghezza di quando è stata scritta */
      gsap.set(nastro, { xPercent: -100 * p * (fasi - 1) / fasi });
      if (barra) gsap.set(barra, { width: (100 / fasi + p * (100 - 100 / fasi)) + '%' });

      /* Il filo nasce accanto alla fase che esce e si allunga verso
         quella che entra, poi la coda raggiunge la testa e sparisce
         dentro la fase nuova. Due movimenti sfalsati sullo stesso
         binario: nella prima metà del passaggio corre la testa, nella
         seconda recupera la coda.
         Tutto è ancorato alla cucitura fra le due fasi, che il nastro
         porta da destra a sinistra in modo lineare: le estremità si
         muovono quindi in modo prevedibile, mentre calcolando la
         posizione dal centro le due velocità si sommavano e il
         movimento risultava sghembo */
      if (linea && vuoto > 0) {
        const t     = p * (fasi - 1);
        const frac  = t - Math.floor(t);
        const cuci  = window.innerWidth * (1 - frac);
        /* STACCO generoso davanti: la testa non è solo il cerchio, si
           porta dietro un alone di una quarantina di pixel. Fermandosi
           a filo del bordo il cerchio resterebbe fuori ma la sua luce
           finirebbe comunque sulla foto */
        const STACCO = 56;
        const parte = cuci - vuoto + 12;               /* accanto al contenuto che esce */
        const corsa = vuoto * 2 - 12 - STACCO;         /* si ferma prima di quello che entra */
        const testa = parte + corsa * morbida(entro01(frac / 0.5));
        const coda  = parte + corsa * morbida(entro01((frac - 0.5) / 0.5));
        linea.style.width = Math.max(0, testa - coda) + 'px';
        gsap.set(linea, { x: coda });
      }
    }
  });
})();

/* ── Gallery: marquee (desktop) / snap carousel (mobile) + lightbox ── */
(function(){
  const track   = document.getElementById('gallery-track');
  const lb      = document.getElementById('lightbox');
  const lbImg   = document.getElementById('lb-img');
  const lbClose = document.getElementById('lightbox-close');
  if (!track || !lb) return;

  if (!isMobile()) {
    // Clona per loop seamless (translateX -50% copre esattamente il set originale)
    Array.from(track.children).forEach(item => {
      const clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  } else {
    // Carousel: evidenzia l'item il cui centro è più vicino al centro viewport
    const items = Array.from(track.children);
    let raf = null;

    function highlight() {
      raf = null;
      const mid = window.innerWidth / 2;
      let best = null, bestD = Infinity;
      items.forEach(it => {
        const r = it.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - mid);
        if (d < bestD) { bestD = d; best = it; }
      });
      items.forEach(it => it.classList.toggle('is-center', it === best));
    }

    track.addEventListener('scroll', () => {
      if (!raf) raf = requestAnimationFrame(highlight);
    }, { passive: true });
    window.addEventListener('load', highlight);
    highlight();
  }

  // Click → lightbox (delegato al track, funziona su originali e cloni)
  track.addEventListener('click', e => {
    const item = e.target.closest('.gallery-item');
    if (!item) return;
    const img = item.querySelector('img');
    if (!img) return;
    lbImg.src = img.src;
    lb.classList.add('open');
  });

  lbClose.addEventListener('click', () => lb.classList.remove('open'));
  lb.addEventListener('click', e => { if (e.target === lb) lb.classList.remove('open'); });
})();

/* ── Team photo parallax ─────────────────────── */
document.querySelectorAll('.team-photo-wrap img').forEach(img => {
  gsap.to(img, { scale:1, ease:'none',
    scrollTrigger: { trigger: img.closest('.team-photo-wrap'), start:'top bottom', end:'bottom top', scrub:1.5 }
  });
});

/* ── Marina AI — pinned scrub timeline ───────── */
if (document.getElementById('marina-pin')) {
  const MT_OFFSET = 0.03;

  function driveMarina(mt) {
    ScrollTrigger.create({
      trigger:'#marina-pin', start:'top top', end:'bottom bottom', scrub:.8,
      onUpdate(self){
        mt.progress(Math.max(0, (self.progress - MT_OFFSET) / (1 - MT_OFFSET)));
      }
    });
  }

  /* Desktop: info e telefono affiancati, rivelati in parallelo */
  mm.add(DESKTOP_MQ, () => {
    gsap.set('#marina-info > *', { opacity:0, y:22 });
    gsap.set('.marina-chip', { opacity:0, x:-18 });
    gsap.set('#marina-cta', { opacity:0, y:12 });
    gsap.set('#marina-phone', { opacity:0, y:60, rotateX:8 });
    gsap.set('#pb1,#pb2,#pb3,#pb4', { opacity:0, y:14, scale:.97 });
    gsap.set('#pt1,#pt2', { opacity:0 });

    const mt = gsap.timeline({ paused:true });

    /* left panel stagger */
    mt.to('#marina-info > *', { opacity:1, y:0, duration:.3, stagger:.07, ease:'power3.out' }, 0)
      .to('.marina-chip', { opacity:1, x:0, duration:.25, stagger:.07, ease:'power2.out' }, 0.18)
      .to('#marina-cta', { opacity:1, y:0, duration:.2, ease:'power3.out' }, 0.40)

    /* phone appears */
      .to('#marina-phone', { opacity:1, y:0, rotateX:0, duration:.3, ease:'power3.out' }, 0.12)

    /* message 1 (user) */
      .to('#pb1', { opacity:1, y:0, scale:1, duration:.18, ease:'back.out(1.2)' }, 0.30)

    /* typing 1 */
      .to('#pt1', { opacity:1, duration:.1 }, 0.44)
      .to('#pt1', { opacity:0, duration:.08 }, 0.56)

    /* message 2 (marina) */
      .to('#pb2', { opacity:1, y:0, scale:1, duration:.18, ease:'back.out(1.2)' }, 0.58)

    /* message 3 (user) */
      .to('#pb3', { opacity:1, y:0, scale:1, duration:.18, ease:'back.out(1.2)' }, 0.72)

    /* typing 2 */
      .to('#pt2', { opacity:1, duration:.08 }, 0.82)
      .to('#pt2', { opacity:0, duration:.07 }, 0.90)

    /* message 4 (marina) */
      .to('#pb4', { opacity:1, y:0, scale:1, duration:.18, ease:'back.out(1.2)' }, 0.92);

    driveMarina(mt);
  });

  /* Mobile: racconto in due atti — prima il servizio (info a tutto
     schermo), poi la chat completa sul telefono grande */
  mm.add(MOBILE_MQ, () => {
    gsap.set('#marina-info > *', { opacity:0, y:22 });
    gsap.set('.marina-chip', { opacity:0, y:14 });
    gsap.set('#marina-phone', { opacity:0, y:90 });
    gsap.set('#pb1,#pb2,#pb3,#pb4', { opacity:0, y:14, scale:.97 });
    gsap.set('#pt1,#pt2', { opacity:0 });

    const mt = gsap.timeline({ paused:true });

    /* atto 1 — il servizio */
    mt.to('#marina-info > *', { opacity:1, y:0, duration:.26, stagger:.05, ease:'power3.out' }, 0)
      .to('.marina-chip', { opacity:1, y:0, duration:.2, stagger:.06, ease:'power2.out' }, 0.14)

    /* atto 2 — l'info esce, entra la chat */
      .to('#marina-info', { opacity:0, y:-46, duration:.14, ease:'power2.in' }, 0.46)
      .to('#marina-phone', { opacity:1, y:0, duration:.18, ease:'power3.out' }, 0.54)

    /* messaggi uno dopo l'altro, chat integrale */
      .to('#pb1', { opacity:1, y:0, scale:1, duration:.1, ease:'back.out(1.2)' }, 0.64)
      .to('#pt1', { opacity:1, duration:.05 }, 0.71)
      .to('#pt1', { opacity:0, duration:.04 }, 0.76)
      .to('#pb2', { opacity:1, y:0, scale:1, duration:.1, ease:'back.out(1.2)' }, 0.78)
      .to('#pb3', { opacity:1, y:0, scale:1, duration:.1, ease:'back.out(1.2)' }, 0.86)
      .to('#pt2', { opacity:1, duration:.04 }, 0.91)
      .to('#pt2', { opacity:0, duration:.03 }, 0.95)
      .to('#pb4', { opacity:1, y:0, scale:1, duration:.1, ease:'back.out(1.2)' }, 0.96);

    driveMarina(mt);
  });
}

/* ── Marina — line continuation canvas (scroll-controlled) ── */
(function(){
  const cvs = document.getElementById('marina-line-cvs');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');

  function resize() { cvs.width = cvs.offsetWidth; cvs.height = cvs.offsetHeight; }
  resize();
  window.addEventListener('resize', debounce(resize, 100));

  function cl(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  let deadP = 0; // 0→1 dal deadzone trigger (100vh beam frozen)
  let fadeP = 0; // 0→1 dal fade trigger interno a Marina

  function draw() {
    const W = cvs.width, H = cvs.height;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2;
    const tY = H * 0.46; // punto di attivazione Marina
    const a  = 1 - fadeP;
    if (a <= 0) return;

    // Linea verticale: entra da (cx, 0) e scende verso il centro
    const curveP  = cl(deadP / 0.62, 0, 1);
    const impactP = cl((deadP - 0.58) / 0.28, 0, 1);

    if (curveP > 0) {
      const y2 = curveP * tY;
      const vg = ctx.createLinearGradient(cx, 0, cx, y2);
      vg.addColorStop(0,  `rgba(${CV_INK},${a * .45})`);
      vg.addColorStop(.6, `rgba(${CV_INK},${a * .68})`);
      vg.addColorStop(1,  `rgba(${CV_INK},${a * .9})`);
      ctx.save();
      ctx.shadowColor = `rgba(${CV_HALO},.35)`; ctx.shadowBlur = 10;
      ctx.strokeStyle = vg; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, y2); ctx.stroke();
      ctx.restore();
      if (curveP < 0.99) {
        ctx.save();
        ctx.shadowColor = `rgba(${CV_HALO},.5)`; ctx.shadowBlur = 18;
        ctx.fillStyle = `rgba(${CV_INK},${a})`;
        ctx.beginPath(); ctx.arc(cx, y2, 4, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
    }

    if (impactP > 0) {
      const gi = cl(impactP * 1.9, 0, 1) * a;
      const r  = 110 * cl(impactP, 0, 1);
      const gg = ctx.createRadialGradient(cx, tY, 0, cx, tY, r);
      gg.addColorStop(0,   `rgba(${CV_INK},${gi * .5})`);
      gg.addColorStop(.12, `rgba(${CV_HALO},${gi * .3})`);
      gg.addColorStop(.42, `rgba(${CV_FAR},${gi * .12})`);
      gg.addColorStop(1,   `rgba(${CV_FAR},0)`);
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(cx, tY, r, 0, Math.PI*2); ctx.fill();
      ctx.save();
      ctx.shadowColor = `rgba(${CV_HALO},.5)`; ctx.shadowBlur = 24;
      ctx.fillStyle = `rgba(${CV_INK},${cl(gi, 0, 1)})`;
      ctx.beginPath(); ctx.arc(cx, tY, 5 * cl(impactP, 0, 1), 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  // Deadzone: i 100vh "morti" del beam (p=1 congelato) guidano la curva in Marina
  ScrollTrigger.create({
    trigger: '#mb-pin', start: 'bottom bottom', end: 'bottom top', scrub: 1.2,
    onUpdate(self) { deadP = self.progress; draw(); }
  });

  // Fade: quando Marina pinna, la curva si dissolve mentre compare il contenuto
  ScrollTrigger.create({
    trigger: '#marina-pin', start: 'top top',
    end: () => '+=' + Math.round(window.innerHeight * 0.22),
    scrub: 0.8,
    onUpdate(self) { fadeP = self.progress; draw(); }
  });
})();

/* ── Marina canvas neural network ─────────────── */
(function(){
  const mc = document.getElementById('marina-canvas');
  if (!mc) return;
  const ctx2 = mc.getContext('2d');
  let cW, cH, parts = [], mcRaf = null;

  function resizeMC() { cW = mc.width = mc.offsetWidth; cH = mc.height = mc.offsetHeight; }

  class NP {
    constructor(x, y, a, d) {
      this.x = x; this.y = y; this.a = a; this.d = d;
      this.spd = 0.7 - d * 0.12; this.life = 0; this.max = 160 + Math.random() * 140;
      this.w = 1.1 - d * 0.18; this.px = x; this.py = y;
      this.branchAt = 35 + Math.random() * 55; this.branched = false;
    }
    update() {
      this.px = this.x; this.py = this.y;
      this.a += (Math.random() - 0.5) * 0.07;
      this.x += Math.cos(this.a) * this.spd;
      this.y += Math.sin(this.a) * this.spd;
      this.life++;
      if (!this.branched && this.life >= this.branchAt && this.d < 4) {
        this.branched = true;
        if (Math.random() > 0.35) parts.push(new NP(this.x, this.y, this.a + 0.45, this.d + 1));
        if (Math.random() > 0.55) parts.push(new NP(this.x, this.y, this.a - 0.45, this.d + 1));
      }
    }
    draw() {
      const alpha = (1 - this.life / this.max) * (0.15 - this.d * 0.025);
      ctx2.strokeStyle = `rgba(${CV_NET},${Math.max(0, alpha)})`;
      ctx2.lineWidth = Math.max(0.2, this.w * (1 - this.life / this.max));
      ctx2.beginPath(); ctx2.moveTo(this.px, this.py); ctx2.lineTo(this.x, this.y); ctx2.stroke();
    }
    dead() {
      return this.life >= this.max || this.x < -60 || this.x > cW + 60 || this.y < -60 || this.y > cH + 60;
    }
  }

  function burst() {
    for (let i = 0; i < 8; i++) parts.push(new NP(cW / 2, cH / 2, (i / 8) * Math.PI * 2, 0));
  }
  function loopMC() {
    ctx2.clearRect(0, 0, cW, cH);
    if (Math.random() < 0.012) burst();
    parts = parts.filter(p => !p.dead());
    parts.forEach(p => { p.update(); p.draw(); });
    mcRaf = requestAnimationFrame(loopMC);
  }

  resizeMC();
  window.addEventListener('resize', debounce(resizeMC, 100));

  new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { if (!mcRaf) { burst(); mcRaf = requestAnimationFrame(loopMC); } }
    else { cancelAnimationFrame(mcRaf); mcRaf = null; parts = []; }
  }, { threshold: 0.1 }).observe(mc);
})();


/* ── Beam Transition (Marina) ─────────────────── */
(function(){
  const cvs = document.getElementById('mb-canvas');
  if (!cvs) return;
  const ctx   = cvs.getContext('2d');
  const intro = document.getElementById('mb-intro');
  let lastP   = 0;

  function resize() { cvs.width = cvs.offsetWidth; cvs.height = cvs.offsetHeight; }
  resize();
  window.addEventListener('resize', debounce(() => { resize(); render(lastP); }, 100));

  function cl(v,lo,hi) { return Math.max(lo, Math.min(hi, v)); }

  function drawBall(x, y, a) {
    const gg = ctx.createRadialGradient(x, y, 0, x, y, 44);
    gg.addColorStop(0,    `rgba(${CV_INK},${a*.5})`);
    gg.addColorStop(0.18, `rgba(${CV_HALO},${a*.3})`);
    gg.addColorStop(0.5,  `rgba(${CV_FAR},${a*.12})`);
    gg.addColorStop(1,    `rgba(${CV_FAR},0)`);
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(x, y, 44, 0, Math.PI*2); ctx.fill();
    ctx.save();
    ctx.shadowColor = `rgba(${CV_HALO},.5)`; ctx.shadowBlur = 14;
    ctx.fillStyle = `rgba(${CV_INK},${a})`;
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawHLine(x1, y, x2, dir, a) {
    const g = ctx.createLinearGradient(x1, y, x2, y);
    if (dir==='L') {
      g.addColorStop(0, `rgba(${CV_INK},0)`);
      g.addColorStop(.65, `rgba(${CV_INK},${a*.26})`);
      g.addColorStop(1,  `rgba(${CV_INK},${a*.78})`);
    } else {
      g.addColorStop(0,  `rgba(${CV_INK},${a*.78})`);
      g.addColorStop(.35,`rgba(${CV_INK},${a*.26})`);
      g.addColorStop(1,  `rgba(${CV_INK},0)`);
    }
    ctx.save();
    ctx.shadowColor=`rgba(${CV_HALO},.35)`; ctx.shadowBlur=20;
    ctx.strokeStyle=g; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(x1,y); ctx.lineTo(x2,y); ctx.stroke();
    ctx.restore();
  }

  function drawVLine(x, y1, y2, dir, a) {
    const g = ctx.createLinearGradient(x, y1, x, y2);
    if (dir==='T') {
      g.addColorStop(0, `rgba(${CV_INK},0)`);
      g.addColorStop(.65, `rgba(${CV_INK},${a*.26})`);
      g.addColorStop(1,  `rgba(${CV_INK},${a*.78})`);
    } else {
      g.addColorStop(0,  `rgba(${CV_INK},${a*.78})`);
      g.addColorStop(.35,`rgba(${CV_INK},${a*.26})`);
      g.addColorStop(1,  `rgba(${CV_INK},0)`);
    }
    ctx.save();
    ctx.shadowColor=`rgba(${CV_HALO},.35)`; ctx.shadowBlur=20;
    ctx.strokeStyle=g; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(x,y1); ctx.lineTo(x,y2); ctx.stroke();
    ctx.restore();
  }

  /* Variante portrait: le due sfere convergono verticalmente
     lungo l'asse centrale, sotto il testo intro */
  function drawV(p) {
    lastP = p;
    const W = cvs.width, H = cvs.height;
    ctx.clearRect(0, 0, W, H);
    const cx    = W / 2;
    const topY  = H * 0.40;
    const beamY = H * 0.72;

    const ballP   = cl((p - .04) / .50, 0, 1);
    const impactP = cl((p - .50) / .14, 0, 1);
    const curveP  = cl((p - .56) / .44, 0, 1);

    /* Sfere che si avvicinano lungo la verticale */
    if (ballP > 0 && impactP < 1) {
      const ty = topY + ballP * (beamY - topY);
      const by = H - ballP * (H - beamY);
      const ba = 1 - impactP;
      drawVLine(cx, topY, ty, 'T', ba);
      drawVLine(cx, by, H, 'B', ba);
      drawBall(cx, ty, ba);
      drawBall(cx, by, ba);
    }

    /* Impatto: glow + linee complete */
    if (impactP > 0) {
      const gi = cl(impactP * 1.85, 0, 1);
      drawVLine(cx, topY, beamY, 'T', gi * .88);
      drawVLine(cx, beamY, H, 'B', gi * .88);
      const r  = 90 * gi;
      const gg = ctx.createRadialGradient(cx, beamY, 0, cx, beamY, r);
      gg.addColorStop(0,    `rgba(${CV_INK},${gi*.5})`);
      gg.addColorStop(.12,  `rgba(${CV_HALO},${gi*.3})`);
      gg.addColorStop(.42,  `rgba(${CV_FAR},${gi*.12})`);
      gg.addColorStop(1,    `rgba(${CV_FAR},0)`);
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(cx, beamY, r, 0, Math.PI*2); ctx.fill();
      ctx.save();
      ctx.shadowColor=`rgba(${CV_HALO},.5)`; ctx.shadowBlur=22;
      ctx.fillStyle = `rgba(${CV_INK},${cl(gi,0,1)})`;
      ctx.beginPath(); ctx.arc(cx, beamY, 5*gi, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    /* Onda d'urto: dopo la collisione la luce si allarga e si spegne.
       È un anello, non un disco pieno — un cerchio che cresce coprendo
       il centro sembrerebbe una macchia, mentre il vuoto interno lo fa
       leggere come energia che si propaga dal punto d'impatto */
    if (curveP > 0 && curveP < 0.85) {
      const w  = curveP / 0.85;
      const rw = 70 + Math.pow(w, 0.7) * Math.max(W, H) * 0.9;
      const aw = Math.pow(1 - w, 1.8);
      const wg = ctx.createRadialGradient(cx, beamY, rw * 0.55, cx, beamY, rw);
      wg.addColorStop(0,   `rgba(${CV_FAR},0)`);
      wg.addColorStop(.72, `rgba(${CV_HALO},${aw * 0.22})`);
      wg.addColorStop(.9,  `rgba(${CV_INK},${aw * 0.3})`);
      wg.addColorStop(1,   `rgba(${CV_FAR},0)`);
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.arc(cx, beamY, rw, 0, Math.PI*2); ctx.fill();
    }

    /* Linea che prosegue decisa verso Marina */
    if (curveP > 0) {
      const y2 = beamY + curveP * (H - beamY + 5);
      const vg = ctx.createLinearGradient(cx, beamY, cx, y2);
      vg.addColorStop(0,  `rgba(${CV_INK},.9)`);
      vg.addColorStop(.6, `rgba(${CV_INK},.6)`);
      vg.addColorStop(1,  `rgba(${CV_INK},.38)`);
      ctx.save();
      ctx.shadowColor = `rgba(${CV_HALO},.35)`; ctx.shadowBlur = 10;
      ctx.strokeStyle = vg; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, beamY); ctx.lineTo(cx, y2); ctx.stroke();
      ctx.restore();
      if (curveP < 0.98) {
        ctx.save();
        ctx.shadowColor = `rgba(${CV_HALO},.5)`; ctx.shadowBlur = 20;
        ctx.fillStyle = `rgba(${CV_INK},.95)`;
        ctx.beginPath(); ctx.arc(cx, y2, 4, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
    }

    /* Testo: si dissolve all'impatto */
    if (intro) intro.style.opacity = cl(1 - (impactP - .25) / .35, 0, 1);
  }

  function draw(p) {
    lastP = p;
    const W = cvs.width, H = cvs.height;
    ctx.clearRect(0, 0, W, H);
    const cx    = W / 2;
    const beamY = H * 0.80;

    const ballP   = cl((p - .04) / .50, 0, 1);
    const impactP = cl((p - .50) / .14, 0, 1);
    const curveP  = cl((p - .56) / .44, 0, 1); // curva verso sinistra-basso

    /* Palline che si avvicinano */
    if (ballP > 0 && impactP < 1) {
      const lx = ballP * cx;
      const rx = W - ballP * (W - cx);
      const ba = 1 - impactP;
      drawHLine(0,  beamY, lx, 'L', ba);
      drawHLine(rx, beamY, W,  'R', ba);
      drawBall(lx, beamY, ba);
      drawBall(rx, beamY, ba);
    }

    /* Impatto: glow + beams completi */
    if (impactP > 0) {
      const gi = cl(impactP * 1.85, 0, 1);
      drawHLine(0,  beamY, cx, 'L', gi * .88);
      drawHLine(cx, beamY, W,  'R', gi * .88);
      const r  = 100 * gi;
      const gg = ctx.createRadialGradient(cx, beamY, 0, cx, beamY, r);
      gg.addColorStop(0,    `rgba(${CV_INK},${gi*.5})`);
      gg.addColorStop(.12,  `rgba(${CV_HALO},${gi*.3})`);
      gg.addColorStop(.42,  `rgba(${CV_FAR},${gi*.12})`);
      gg.addColorStop(1,    `rgba(${CV_FAR},0)`);
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(cx, beamY, r, 0, Math.PI*2); ctx.fill();
      ctx.save();
      ctx.shadowColor=`rgba(${CV_HALO},.5)`; ctx.shadowBlur=22;
      ctx.fillStyle = `rgba(${CV_INK},${cl(gi,0,1)})`;
      ctx.beginPath(); ctx.arc(cx, beamY, 5*gi, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    /* Onda d'urto: dopo la collisione la luce si allarga e si spegne.
       È un anello, non un disco pieno — un cerchio che cresce coprendo
       il centro sembrerebbe una macchia, mentre il vuoto interno lo fa
       leggere come energia che si propaga dal punto d'impatto */
    if (curveP > 0 && curveP < 0.85) {
      const w  = curveP / 0.85;
      const rw = 70 + Math.pow(w, 0.7) * Math.max(W, H) * 0.9;
      const aw = Math.pow(1 - w, 1.8);
      const wg = ctx.createRadialGradient(cx, beamY, rw * 0.55, cx, beamY, rw);
      wg.addColorStop(0,   `rgba(${CV_FAR},0)`);
      wg.addColorStop(.72, `rgba(${CV_HALO},${aw * 0.22})`);
      wg.addColorStop(.9,  `rgba(${CV_INK},${aw * 0.3})`);
      wg.addColorStop(1,   `rgba(${CV_FAR},0)`);
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.arc(cx, beamY, rw, 0, Math.PI*2); ctx.fill();
    }

    /* Linea verticale verso il basso */
    if (curveP > 0) {
      const y2 = beamY + curveP * (H - beamY + 5);
      const vg = ctx.createLinearGradient(cx, beamY, cx, y2);
      vg.addColorStop(0,  `rgba(${CV_INK},.9)`);
      vg.addColorStop(.6, `rgba(${CV_INK},.6)`);
      vg.addColorStop(1,  `rgba(${CV_INK},.38)`);
      ctx.save();
      ctx.shadowColor = `rgba(${CV_HALO},.35)`; ctx.shadowBlur = 10;
      ctx.strokeStyle = vg; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, beamY); ctx.lineTo(cx, y2); ctx.stroke();
      ctx.restore();
      if (curveP < 0.98) {
        ctx.save();
        ctx.shadowColor = `rgba(${CV_HALO},.5)`; ctx.shadowBlur = 20;
        ctx.fillStyle = `rgba(${CV_INK},.95)`;
        ctx.beginPath(); ctx.arc(cx, y2, 4, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
    }

    /* Testo: si dissolve all'impatto */
    if (intro) intro.style.opacity = cl(1 - (impactP - .25) / .35, 0, 1);
  }

  function render(p) { isMobile() ? drawV(p) : draw(p); }

  ScrollTrigger.create({
    trigger: '#mb-pin', start:'top top', end:'bottom bottom',
    scrub: 1.2,
    onUpdate(self) { render(self.progress); }
  });
})();

/* ── Refresh ScrollTrigger dopo il caricamento delle immagini ── */
window.addEventListener('load', () => {
  ScrollTrigger.refresh();
  setTimeout(() => ScrollTrigger.refresh(), 500);
});

/* ── Mobile hamburger ────────────────────────── */
(function(){
  const btn = document.getElementById('hamburger');
  const nav = document.querySelector('nav');
  if (!btn || !nav) return;
  const links = Array.from(nav.querySelectorAll('a'));

  /* Nessun lock via body.overflow: su mobile cambia il layout e fa
     "saltare" la pagina — l'overlay è opaco e a schermo intero, i
     gesti sopra di lui sono neutralizzati da touch-action in CSS */
  function open() {
    btn.classList.add('open');
    nav.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    gsap.killTweensOf(links);
    gsap.fromTo(links,
      { y: 28, opacity: 0 },
      { y: 0, opacity: 1, duration: .5, stagger: .06, ease: 'power3.out', delay: .08, overwrite: 'auto' }
    );
    if ('vibrate' in navigator) navigator.vibrate(8);
    links[0].focus({ preventScroll: true });
  }

  function close(returnFocus) {
    btn.classList.remove('open');
    nav.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    gsap.killTweensOf(links);
    gsap.set(links, { clearProps: 'opacity,transform' });
    if (returnFocus) btn.focus({ preventScroll: true });
  }

  btn.addEventListener('click', () => {
    btn.classList.contains('open') ? close(true) : open();
  });

  links.forEach(a => a.addEventListener('click', () => close(false)));

  document.addEventListener('keydown', e => {
    if (!nav.classList.contains('open')) return;
    if (e.key === 'Escape') { close(true); return; }
    if (e.key === 'Tab') {
      /* Focus trap: nel DOM i link precedono il bottone, il ciclo è links[0] … btn */
      const first = links[0];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        btn.focus();
      } else if (!e.shiftKey && document.activeElement === btn) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  window.matchMedia(DESKTOP_MQ).addEventListener('change', e => {
    if (e.matches && nav.classList.contains('open')) close(false);
  });
})();

/* ── Form contatti → invia.php → SMTP2GO ─────── */
/* Il modulo parla con uno script sullo stesso dominio invece che con un
   servizio esterno: le credenziali della posta stanno sul server, dove
   nessuno le legge. L'indirizzo è quello dell'attributo action, così se
   il JavaScript non parte il modulo si invia lo stesso alla vecchia
   maniera e la richiesta arriva comunque */
(function(){
  const form = document.getElementById('contact-form');
  if (!form) return;

  const ok    = document.getElementById('form-ok');
  const esito = document.getElementById('form-esito');

  /* I collegamenti di ripiego li mette SOLO il browser, e il server
     manda messaggi asciutti. Prima li scrivevano tutti e due e il
     risultato era "Scrivici su WhatsApp o a info@del-mar.it. Scrivici su
     WhatsApp o a info@del-mar.it." */
  const RIPIEGO = ' Scrivici su <a href="https://wa.me/393356654017" target="_blank" ' +
    'rel="noopener noreferrer">WhatsApp</a> o a <a href="mailto:info@del-mar.it">info@del-mar.it</a>.';

  const errore = (testo) => {
    ok.innerHTML = testo + RIPIEGO;
    ok.style.display = 'block';
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('.btn-submit');
    const testoBtn = btn.textContent;

    ok.style.display = 'none';
    btn.textContent = 'Invio in corso…';
    btn.disabled = true;

    try {
      const res  = await fetch(form.action, { method: 'POST', body: new FormData(form) });
      const json = await res.json().catch(() => ({}));

      if (json.success) {
        /* Il modulo sparisce e al suo posto arriva la conferma: lasciarlo
           lì, pieno di quello che si è appena scritto, invita a premere
           di nuovo */
        form.hidden = true;
        esito.hidden = false;
        /* Portato in vista da solo: su schermo piccolo la conferma
           nascerebbe sotto la piega e sembrerebbe che non sia successo
           niente */
        esito.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        /* Il messaggio del server dice cosa manca — un campo, troppe
           richieste, un guasto — ed è più utile di un "errore" generico */
        errore(json.message || 'Non siamo riusciti a inviare.');
      }
    } catch (_) {
      errore('Errore di rete.');
    } finally {
      btn.textContent = testoBtn;
      btn.disabled = false;
    }
  });
})();

/* ── Il mare della sezione contatti ──────────────
   Due campiture con le caustiche che battono sul confine, e un banco di
   pesciolini che lo attraversa cambiando colore. Prima erano bolle su
   una campitura fatta di sfumature CSS: su una sezione alta settecento
   pixel la luce restava una macchia schiacciata a meta' altezza, con
   sopra e sotto spenti.

   IL CONFINE E' UNA FUNZIONE SOLA. Chi dipinge lo sfondo dice ai pesci
   dove cambiare livrea. Se fossero due conti separati, i pesci
   virerebbero in un punto e il fondo cambierebbe in un altro — e a
   occhio si vede subito.

   Su telefono la sezione non e' divisa: una colonna sola, il modulo ha
   il suo fondo scuro e il taglio non esiste. Percio' la tela dello
   sfondo non parte nemmeno (il foglio di stile la nasconde) e ai pesci
   si passa un confine negativo, che vuol dire "tutti della livrea
   chiara". */
(function(){
  const tela = document.getElementById('contatti-particles');
  if (!tela) return;

  /* SUL TELEFONO IL BANCO NON PARTE PROPRIO. I pesci nuotavano sopra
     telefono, email e indirizzo rendendoli un pasticcio, e il blocco
     dello scorrimento — che sul catalogo rende il gioco giocabile — qui
     non si puo' usare: la tela copre il modulo da compilare. Un gioco a
     cui non si puo' giocare e' solo rumore sopra i contatti.
     offsetParent nullo = il foglio di stile ha spento la tela (sotto i
     769px): la soglia vive nel CSS e basta. (Mattias, 2026-08-18) */
  if (tela.offsetParent === null) return;

  const sfondo = document.getElementById('contatti-sfondo');
  /* offsetParent nullo = display:none, cioe' siamo sotto i 769px.
     Si chiede al foglio di stile invece di ricontrollare la soglia qui:
     una soglia scritta in due posti prima o poi diventa due soglie */
  const diviso = !!(sfondo && sfondo.offsetParent !== null);

  const mare = diviso && window.DelMarCaustiche
    ? window.DelMarCaustiche(sfondo, { tipo: 'larghe' })
    : null;

  if (window.DelMarPesci) {
    window.DelMarPesci(tela, {
      confine: (y) => (mare ? mare.confine(y) : -1),
      stile: 4
    });
  }
})();

/* Il cursore calamaro sta in js/cursore.js: lo carica anche il banco
   di prova in prove/, e un pezzo usato da due pagine non si copia. */
