/* ════════════════════════════════════════
   DelMar — Main Script
   ════════════════════════════════════════ */
gsap.registerPlugin(ScrollTrigger);

function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ── Header scroll state ──────────────────────── */
const hdr = document.getElementById('hdr');
ScrollTrigger.create({
  trigger: '#v-scroller', start: 'bottom 70%',
  onEnter: ()     => hdr.classList.add('scrolled'),
  onLeaveBack: () => hdr.classList.remove('scrolled')
});

/* ── Lottie hero ──────────────────────────────── */
const bar    = document.getElementById('bar');
const loader = document.getElementById('loading');

const anim = lottie.loadAnimation({
  container: document.getElementById('lottie-bg'),
  renderer: 'svg', loop: false, autoplay: false,
  path: 'assets/lottie-hero.json',
  rendererSettings: { preserveAspectRatio: 'xMidYMid slice', progressiveLoad: true }
});

anim.addEventListener('data_ready',    () => bar.style.width = '60%');
anim.addEventListener('loaded_images', () => bar.style.width = '90%');
anim.addEventListener('data_failed',   () => loader.querySelector('p').textContent = 'Errore');

anim.addEventListener('DOMLoaded', () => {
  bar.style.width = '100%';
  anim.goToAndStop(0, true);
  setTimeout(() => { loader.classList.add('out'); setTimeout(() => loader.remove(), 800); }, 300);
  gsap.to('#hdr', { opacity: 1, duration: 1.2, ease: 'power2.out', delay: 0.3 });

  gsap.set('#c1', { xPercent:-50, yPercent:-50, opacity:1 });
  gsap.set('#c2', { xPercent:-50, yPercent:-50 });
  gsap.set('#c3', { xPercent:-50, yPercent:-50 });
  gsap.set('#c4', { xPercent:-50, yPercent:-50 });
  gsap.set('#c5', { xPercent:-50, yPercent:-50 });

  const CHS = [
    {el:'#c1',s:0.00,fi:0.00,fo:0.14,e:0.20},
    {el:'#c2',s:0.22,fi:0.28,fo:0.38,e:0.44},
    {el:'#c3',s:0.46,fi:0.52,fo:0.60,e:0.65},
    {el:'#c4',s:0.67,fi:0.73,fo:0.80,e:0.86},
    {el:'#c5',s:0.88,fi:0.93,fo:0.98,e:1.01},
  ];
  const els   = CHS.map(c => document.querySelector(c.el));
  const total = anim.totalFrames;
  const proxy = { frame: 0 };

  function op(p,s,fi,fo,e){ if(p>=e)return 0; if(p<=s)return s===0?1:0; if(p<fi)return(p-s)/(fi-s||.001); if(p>fo)return 1-(p-fo)/(e-fo||.001); return 1; }
  function sc(p,s,fi,fo,e){ if(p<=s)return .82; if(p<fi)return .82+.18*((p-s)/(fi-s||.001)); if(p>fo)return 1+.15*((p-fo)/(e-fo||.001)); return 1; }
  function bl(p,s,fi,fo,e){ if(p<=s)return 7; if(p<fi)return 7*(1-(p-s)/(fi-s||.001)); if(p>fo)return 6*((p-fo)/(e-fo||.001)); return 0; }

  ScrollTrigger.create({
    trigger:'#v-scroller', start:'top top', end:'bottom bottom', scrub:1,
    onUpdate(self){
      const p = self.progress;
      gsap.to(proxy,{ frame:p*(total-1), duration:.4, ease:'none', overwrite:'auto',
        onUpdate(){ anim.goToAndStop(Math.round(proxy.frame),true); }
      });
      CHS.forEach((c,i) => gsap.set(els[i],{
        opacity: op(p,c.s,c.fi,c.fo,c.e),
        scale:   sc(p,c.s,c.fi,c.fo,c.e),
        filter: `blur(${bl(p,c.s,c.fi,c.fo,c.e).toFixed(1)}px)`
      }));
    }
  });
});

/* ── Counters ─────────────────────────────────── */
document.querySelectorAll('[data-count]').forEach(el => {
  const target = +el.dataset.count;
  const suffix = el.dataset.suffix || (target >= 100 ? '+' : target === 24 ? 'h' : '+');
  ScrollTrigger.create({
    trigger: el, start: 'top 85%', once: true, invalidateOnRefresh: true,
    onEnter() {
      gsap.to({ n: 0 }, { n: target, duration: 1.8, ease: 'power2.out',
        onUpdate() { el.textContent = Math.round(this.targets()[0].n) + suffix; }
      });
    }
  });
});

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

/* ── Prod strip fade-in ──────────────────────── */
document.querySelectorAll('.prod-strip').forEach(strip => {
  gsap.from(strip, { opacity:0, y:40, duration:1, ease:'power3.out',
    scrollTrigger: { trigger:strip, start:'top 85%', toggleActions:'play none none reverse' }
  });
});

/* ── Processo — scroll driven (pin + scrub) ── */
(function(){
  const fill    = document.getElementById('proc-tl-fill');
  const spark   = document.getElementById('proc-spark');
  const counter = document.getElementById('proc-photo-counter');
  if (!fill || !spark) return;

  const dots   = [0,1,2,3].map(i => document.getElementById('ptl-dot-' + i));
  const steps  = [0,1,2,3].map(i => document.getElementById('ptl-' + i));
  const photos = [0,1,2,3].map(i => document.getElementById('pp-' + i));
  let activeIdx = -1;

  function setStep(i) {
    if (activeIdx === i) return;

    // Testo: mostra solo lo step i
    steps.forEach((s, idx) => {
      if (!s) return;
      if (idx === i) {
        if (!s.classList.contains('lit')) {
          s.classList.add('lit');
          gsap.killTweensOf(s);
          gsap.fromTo(s, { opacity:0, y:10 }, { opacity:1, y:0, duration:0.45, ease:'power2.out' });
        }
      } else {
        s.classList.remove('lit');
        gsap.set(s, { opacity:0, y:0 });
      }
    });

    // Pallini: accesi fino a i incluso
    dots.forEach((d, idx) => {
      if (!d) return;
      if (idx <= i) d.classList.add('lit');
      else          d.classList.remove('lit');
    });

    // Foto
    photos.forEach((p, idx) => {
      if (!p) return;
      if (idx === i) p.classList.add('lit');
      else           p.classList.remove('lit');
    });

    if (counter) counter.textContent = '0' + (i+1) + ' / 04';
    activeIdx = i;
  }

  function init() {
    const dotTops  = dots.map(d => d ? d.offsetTop : 0);
    const DIST     = dotTops[3] - dotTops[0];
    // Soglie di progresso (0→1) a cui si attiva ogni step
    const thresh   = dotTops.map(t => (t - dotTops[0]) / DIST);

    gsap.set(spark, { opacity:1, y:0 });
    gsap.set(fill,  { height:0 });

    // Timeline linea + spark guidata dallo scroll
    const tl = gsap.timeline();
    tl.to(fill,  { height: DIST, ease:'none' }, 0)
      .to(spark, { y: DIST,      ease:'none' }, 0);

    ScrollTrigger.create({
      trigger:          '#processo',
      start:            'top top',
      end:              '+=280%',
      pin:              true,
      anticipatePin:    1,
      scrub:            1.1,
      invalidateOnRefresh: true,
      animation:        tl,
      onUpdate(self) {
        const p = self.progress;
        // Trova lo step attivo in base al progresso corrente
        let idx = 0;
        for (let k = thresh.length - 1; k >= 0; k--) {
          if (p >= thresh[k] - 0.015) { idx = k; break; }
        }
        setStep(idx);
      }
    });
  }

  // Init sincrono — il pin spacer deve essere creato insieme agli altri ScrollTrigger
  init();
})();

/* ── Gallery: marquee infinito + lightbox ── */
(function(){
  const track   = document.getElementById('gallery-track');
  const lb      = document.getElementById('lightbox');
  const lbImg   = document.getElementById('lb-img');
  const lbClose = document.getElementById('lightbox-close');
  if (!track || !lb) return;

  // Clona per loop seamless (translateX -50% copre esattamente il set originale)
  Array.from(track.children).forEach(item => {
    const clone = item.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  });

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
  /* initial states */
  gsap.set('#marina-info > *', { opacity:0, y:22 });
  gsap.set('.marina-chip', { opacity:0, x:-18 });
  gsap.set('#marina-cta', { opacity:0, y:12 });
  gsap.set('.marina-poweredby', { opacity:0 });
  gsap.set('#marina-phone', { opacity:0, y:60, rotateX:8 });
  gsap.set('#pb1,#pb2,#pb3,#pb4', { opacity:0, y:14, scale:.97 });
  gsap.set('#pt1,#pt2', { opacity:0 });

  const mt = gsap.timeline({ paused:true });

  /* left panel stagger */
  mt.to('#marina-info > *', { opacity:1, y:0, duration:.3, stagger:.07, ease:'power3.out' }, 0)
    .to('.marina-chip', { opacity:1, x:0, duration:.25, stagger:.07, ease:'power2.out' }, 0.18)
    .to('#marina-cta', { opacity:1, y:0, duration:.2, ease:'power3.out' }, 0.40)
    .to('.marina-poweredby', { opacity:1, duration:.15 }, 0.50)

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

  const MT_OFFSET = 0.03;
  ScrollTrigger.create({
    trigger:'#marina-pin', start:'top top', end:'bottom bottom', scrub:.8,
    onUpdate(self){
      mt.progress(Math.max(0, (self.progress - MT_OFFSET) / (1 - MT_OFFSET)));
    }
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
      vg.addColorStop(0,  `rgba(255,255,255,${a * .55})`);
      vg.addColorStop(.6, `rgba(255,255,255,${a * .78})`);
      vg.addColorStop(1,  `rgba(255,255,255,${a * .95})`);
      ctx.save();
      ctx.shadowColor = 'rgba(200,225,255,.55)'; ctx.shadowBlur = 10;
      ctx.strokeStyle = vg; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, y2); ctx.stroke();
      ctx.restore();
      if (curveP < 0.99) {
        ctx.save();
        ctx.shadowColor = 'white'; ctx.shadowBlur = 18;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath(); ctx.arc(cx, y2, 4, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
    }

    if (impactP > 0) {
      const gi = cl(impactP * 1.9, 0, 1) * a;
      const r  = 110 * cl(impactP, 0, 1);
      const gg = ctx.createRadialGradient(cx, tY, 0, cx, tY, r);
      gg.addColorStop(0,   `rgba(255,255,255,${gi})`);
      gg.addColorStop(.12, `rgba(220,235,255,${gi * .72})`);
      gg.addColorStop(.42, `rgba(155,195,255,${gi * .22})`);
      gg.addColorStop(1,   'rgba(80,140,255,0)');
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(cx, tY, r, 0, Math.PI*2); ctx.fill();
      ctx.save();
      ctx.shadowColor = 'white'; ctx.shadowBlur = 24;
      ctx.fillStyle = `rgba(255,255,255,${cl(gi, 0, 1)})`;
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
      ctx2.strokeStyle = `rgba(255,255,255,${Math.max(0, alpha)})`;
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
  window.addEventListener('resize', debounce(() => { resize(); draw(lastP); }, 100));

  function cl(v,lo,hi) { return Math.max(lo, Math.min(hi, v)); }

  function drawBall(x, y, a) {
    const gg = ctx.createRadialGradient(x, y, 0, x, y, 44);
    gg.addColorStop(0,    `rgba(255,255,255,${a})`);
    gg.addColorStop(0.18, `rgba(220,235,255,${a*.55})`);
    gg.addColorStop(0.5,  `rgba(170,200,255,${a*.18})`);
    gg.addColorStop(1,    'rgba(100,150,255,0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(x, y, 44, 0, Math.PI*2); ctx.fill();
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,.95)'; ctx.shadowBlur = 14;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawHLine(x1, y, x2, dir, a) {
    const g = ctx.createLinearGradient(x1, y, x2, y);
    if (dir==='L') {
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(.65, `rgba(255,255,255,${a*.28})`);
      g.addColorStop(1,  `rgba(255,255,255,${a*.82})`);
    } else {
      g.addColorStop(0,  `rgba(255,255,255,${a*.82})`);
      g.addColorStop(.35,`rgba(255,255,255,${a*.28})`);
      g.addColorStop(1,  'rgba(255,255,255,0)');
    }
    ctx.save();
    ctx.shadowColor='rgba(180,210,255,.6)'; ctx.shadowBlur=20;
    ctx.strokeStyle=g; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(x1,y); ctx.lineTo(x2,y); ctx.stroke();
    ctx.restore();
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
      gg.addColorStop(0,    `rgba(255,255,255,${gi})`);
      gg.addColorStop(.12,  `rgba(220,235,255,${gi*.72})`);
      gg.addColorStop(.42,  `rgba(155,195,255,${gi*.22})`);
      gg.addColorStop(1,    'rgba(80,140,255,0)');
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(cx, beamY, r, 0, Math.PI*2); ctx.fill();
      ctx.save();
      ctx.shadowColor='white'; ctx.shadowBlur=22;
      ctx.fillStyle = `rgba(255,255,255,${cl(gi,0,1)})`;
      ctx.beginPath(); ctx.arc(cx, beamY, 5*gi, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    /* Linea verticale verso il basso */
    if (curveP > 0) {
      const y2 = beamY + curveP * (H - beamY + 5);
      const vg = ctx.createLinearGradient(cx, beamY, cx, y2);
      vg.addColorStop(0,  'rgba(255,255,255,.92)');
      vg.addColorStop(.6, 'rgba(255,255,255,.65)');
      vg.addColorStop(1,  'rgba(255,255,255,.42)');
      ctx.save();
      ctx.shadowColor = 'rgba(200,225,255,.55)'; ctx.shadowBlur = 10;
      ctx.strokeStyle = vg; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, beamY); ctx.lineTo(cx, y2); ctx.stroke();
      ctx.restore();
      if (curveP < 0.98) {
        ctx.save();
        ctx.shadowColor = 'white'; ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(255,255,255,.95)';
        ctx.beginPath(); ctx.arc(cx, y2, 4, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
    }

    /* Testo: si dissolve all'impatto */
    if (intro) intro.style.opacity = cl(1 - (impactP - .25) / .35, 0, 1);
  }

  ScrollTrigger.create({
    trigger: '#mb-pin', start:'top top', end:'bottom bottom',
    scrub: 1.2,
    onUpdate(self) { draw(self.progress); }
  });
})();

/* ── La Filiera — cinema overlay con GSAP ─────── */
(function(){
  const vid = document.getElementById('fil3-video');
  if (!vid) return;

  const CHAPTERS = [
    { num:'01 — Selezione',       title:'Dal pescato<br>alla scelta',   desc:'I nostri buyer scelgono ogni mattina dai pescatori di fiducia. Nessun intermediario, filiera tracciata dalla barca.' },
    { num:'02 — Lavorazione',     title:'Laboratorio<br>di precisione', desc:'Impianti certificati HACCP: pulizia, porzionatura e lavorazione con tecnologia di ultima generazione.' },
    { num:'03 — Confezionamento', title:'Qualità<br>sigillata',         desc:'Packaging sottovuoto. La catena del freddo non si interrompe mai: dal laboratorio alla tua cucina.' },
    { num:'04 — Consegna',        title:'In 24&nbsp;ore,<br>ovunque',   desc:'Flotta refrigerata, consegna in tutta Italia entro 24 ore. Puntuali sulla qualità, flessibili sugli orari.' },
  ];

  /* Posizione orizzontale del pannello testo per ogni capitolo —
     segue il punto dove la barra raggiunge il marker */
  const CH_LEFT = ['3%', '26%', '46%', '60%'];
  const CH_W    = ['40%', '38%', '36%', '38%'];

  const textEl   = document.getElementById('fil3-text');
  const numEl    = document.getElementById('fil3-num');
  const titleEl  = document.getElementById('fil3-title');
  const descEl   = document.getElementById('fil3-desc');
  const pfill    = document.getElementById('fil3-progfill');
  const segFills = document.querySelectorAll('.fil3-seg-fill');

  let curIdx = -1;
  let isAnim = false;
  let rafId  = null;

  function applyContent(idx) {
    const ch = CHAPTERS[idx];
    numEl.innerHTML   = ch.num;
    titleEl.innerHTML = ch.title;
    descEl.innerHTML  = ch.desc;
  }

  /* RAF: aggiorna barra progress a 60fps, movimento continuo */
  function tick() {
    if (vid.duration && !vid.paused) {
      const p = vid.currentTime / vid.duration;
      pfill.style.width = (p * 100) + '%';
      segFills.forEach((sf, i) => {
        const s = i * .25, e = s + .25;
        sf.style.width = p >= e ? '100%' : p > s ? ((p - s) / .25 * 100) + '%' : '0%';
      });
    }
    rafId = requestAnimationFrame(tick);
  }

  function enterFirst() {
    if (curIdx !== -1) return;
    curIdx = 0;
    applyContent(0);
    gsap.set(textEl,  { left:CH_LEFT[0], width:CH_W[0] });
    gsap.set([numEl, titleEl, descEl], { opacity:0, y:68 });
    gsap.to(numEl,   { opacity:1, y:0, duration:.65, ease:'power3.out' });
    gsap.to(titleEl, { opacity:1, y:0, duration:.88, ease:'power3.out', delay:.1 });
    gsap.to(descEl,  { opacity:1, y:0, duration:.65, ease:'power3.out', delay:.22 });
  }

  function changeChapter(nextIdx) {
    if (isAnim) return;
    isAnim = true;
    curIdx = nextIdx;

    const tl = gsap.timeline({ onComplete:() => { isAnim = false; } });

    /* Il pannello scivola orizzontalmente verso il nuovo punto
       mentre il testo vecchio cade giù e svanisce */
    tl.to(textEl,  { left:CH_LEFT[nextIdx], width:CH_W[nextIdx], duration:.55, ease:'power2.inOut' }, 0)
      .to(numEl,   { opacity:0, y:28,  scale:.94, duration:.32, ease:'power3.in' }, 0)
      .to(titleEl, { opacity:0, y:42,  scale:.92, duration:.38, ease:'power3.in' }, 0)
      .to(descEl,  { opacity:0, y:22,  scale:.95, duration:.28, ease:'power3.in' }, 0)
      /* Nuovo contenuto parte dal basso */
      .call(() => {
        applyContent(nextIdx);
        gsap.set(numEl,   { y:62 });
        gsap.set(titleEl, { y:82 });
        gsap.set(descEl,  { y:56 });
      })
      .to(numEl,   { opacity:1, y:0, duration:.52, ease:'power3.out' }, '+=.02')
      .to(titleEl, { opacity:1, y:0, duration:.72, ease:'power3.out' }, '<.08')
      .to(descEl,  { opacity:1, y:0, duration:.52, ease:'power3.out' }, '<.12');
  }

  /* IntersectionObserver: play/pause + avvia/ferma RAF */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        vid.play();
        if (!rafId) rafId = requestAnimationFrame(tick);
      } else {
        vid.pause();
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      }
    });
  }, { threshold:.25 });
  io.observe(document.getElementById('filiera'));

  ScrollTrigger.create({
    trigger:'#filiera', start:'top 68%', once:true,
    onEnter: enterFirst
  });

  /* timeupdate usato solo per rilevare cambio capitolo (leggero) */
  vid.addEventListener('timeupdate', () => {
    if (!vid.duration) return;
    const nextIdx = Math.min(Math.floor(vid.currentTime / vid.duration * 4), 3);
    if (nextIdx !== curIdx && !isAnim) changeChapter(nextIdx);
  });

  vid.addEventListener('ended', () => { vid.currentTime = 0; vid.play(); });
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
  btn.addEventListener('click', () => {
    const isOpen = btn.classList.toggle('open');
    nav.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });
  nav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      btn.classList.remove('open');
      nav.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
})();

/* ── Form submit → Web3Forms ─────────────────── */
document.getElementById('contact-form').addEventListener('submit', async e => {
  e.preventDefault();
  const form   = e.target;
  const btn    = form.querySelector('.btn-submit');
  const ok     = document.getElementById('form-ok');
  const origTxt = btn.textContent;

  btn.textContent = 'Invio in corso…';
  btn.disabled = true;

  try {
    const res  = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: new FormData(form)
    });
    const json = await res.json();
    if (json.success) {
      ok.textContent = '✓ Messaggio inviato. Ti contatteremo presto.';
      ok.style.display = 'block';
      form.reset();
      setTimeout(() => { ok.style.display = 'none'; }, 6000);
    } else {
      ok.textContent = 'Errore nell\'invio. Riprova o scrivici su WhatsApp.';
      ok.style.display = 'block';
    }
  } catch (_) {
    ok.textContent = 'Errore di rete. Riprova o scrivici su WhatsApp.';
    ok.style.display = 'block';
  } finally {
    btn.textContent = origTxt;
    btn.disabled = false;
  }
});

/* ── Contatti particles — nuvola di bolle marine ── */
(function(){
  const cvs = document.getElementById('contatti-particles');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  let W, H;
  const mouse = { x:-9999, y:-9999 };
  const N     = 700;
  const REPEL = 120;
  const FORCE = 0.85;

  function resize() {
    W = cvs.width  = cvs.offsetWidth;
    H = cvs.height = cvs.offsetHeight;
  }

  function mkBubble(fromBottom) {
    const r = 0.4 + Math.random() * 1.8;
    return {
      x:      Math.random() * W,
      y:      fromBottom ? H + r + Math.random() * H * .4 : Math.random() * H,
      vx:     (Math.random() - .5) * .25,
      vy:     -(0.12 + Math.random() * 0.32),   // sale verso l'alto
      r,
      a:      0.12 + Math.random() * 0.42,       // opacità bordo
      wobble: Math.random() * Math.PI * 2,
      wFreq:  0.3 + Math.random() * 0.5
    };
  }

  let pts = [];
  function init() { resize(); pts = Array.from({ length:N }, () => mkBubble(false)); }

  function update() {
    const t = performance.now() * 0.001;
    for (let i = 0; i < N; i++) {
      const p = pts[i];
      // Dondolio orizzontale — bolle che oscillano mentre salgono
      p.vx += Math.sin(t * p.wFreq + p.wobble) * 0.009;
      // Spinta verso l'alto costante (buoyancy)
      p.vy -= 0.004;
      p.vy  = Math.max(p.vy, -0.9);
      // Repulsione mouse
      const dx = p.x - mouse.x, dy = p.y - mouse.y;
      const d2 = dx*dx + dy*dy;
      if (d2 < REPEL*REPEL && d2 > .01) {
        const d = Math.sqrt(d2);
        const f = (1 - d/REPEL) * FORCE;
        p.vx += dx/d * f; p.vy += dy/d * f;
      }
      p.vx *= 0.93; p.vy *= 0.975;
      p.x  += p.vx; p.y  += p.vy;
      // Wrap orizzontale
      if (p.x < -p.r) p.x = W + p.r;
      if (p.x > W + p.r) p.x = -p.r;
      // Rispawn in basso quando escono dall'alto
      if (p.y < -p.r * 2) {
        Object.assign(p, mkBubble(true));
      }
    }
  }

  function drawBubbles() {
    for (let i = 0; i < N; i++) {
      const p    = pts[i];
      const dx   = p.x - mouse.x, dy = p.y - mouse.y;
      const prox = Math.max(0, 1 - Math.sqrt(dx*dx+dy*dy) / 130);
      const r    = p.r + prox * 4;
      const a    = Math.min(.9, p.a + prox * .35);

      // Corpo bolla — fill quasi trasparente
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(100,195,255,${a * .07})`;
      ctx.fill();

      // Bordo bolla
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(120,210,255,${a})`;
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Riflesso (solo per bolle abbastanza grandi)
      if (r > 1.6) {
        ctx.beginPath();
        ctx.arc(p.x - r * .3, p.y - r * .28, r * .25, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${a * .6})`;
        ctx.fill();
      }
    }
  }

  let raf = null;
  function loop() {
    ctx.clearRect(0, 0, W, H);
    update(); drawBubbles();
    raf = requestAnimationFrame(loop);
  }

  new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { if (!raf) loop(); }
    else { cancelAnimationFrame(raf); raf = null; }
  }, { threshold: 0.01 }).observe(cvs);

  const section = document.getElementById('contatti');
  (section || cvs).addEventListener('mousemove', e => {
    const r = cvs.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  (section || cvs).addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });
  window.addEventListener('resize', debounce(resize, 100));

  init();
})();
