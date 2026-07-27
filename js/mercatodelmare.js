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

/* ── Tunnel bg: solo nell'hero ────────────────── */
/* Layer fixed dietro tutto: uscendo dall'hero si dissolve nel nero
   (scrub), così non spunta mai tra le sezioni */
gsap.to('#lottie-bg, #vig', {
  autoAlpha: 0,
  ease: 'none',
  scrollTrigger: {
    trigger: '#v-scroller',
    start: 'bottom 98%',
    end: 'bottom 45%',
    scrub: true
  }
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
function initHeroScroll(renderFrame, total) {
  const CHS = [
    {el:'#c1',s:0.00,fi:0.00,fo:0.14,e:0.20},
    {el:'#c2',s:0.22,fi:0.28,fo:0.38,e:0.44},
    {el:'#c3',s:0.46,fi:0.52,fo:0.60,e:0.65},
    {el:'#c4',s:0.67,fi:0.73,fo:0.80,e:0.86},
  ];
  const els = CHS.map(c => document.querySelector(c.el));

  /* Velo nero iniziale: pieno a p=0, dissolto entro il 10% di scroll */
  const fadeEl   = document.getElementById('hero-fade');
  const FADE_END = 0.10;

  /* Transizione finale video-su-video (porta mascherata) */
  const whiteEl  = document.getElementById('hero-white');
  const blackEl  = document.getElementById('hero-black');
  const videoEl  = document.getElementById('hero-video');
  const V_START  = 0.80;
  let vLoaded = false;

  function op(p,s,fi,fo,e){ if(p>=e)return 0; if(p<=s)return s===0?1:0; if(p<fi)return(p-s)/(fi-s||.001); if(p>fo)return 1-(p-fo)/(e-fo||.001); return 1; }
  function sc(p,s,fi,fo,e){ if(p<=s)return s===0?1:.82; if(p<fi)return .82+.18*((p-s)/(fi-s||.001)); if(p>fo)return 1+.15*((p-fo)/(e-fo||.001)); return 1; }
  function bl(p,s,fi,fo,e){ if(s===0)return 0; if(p<=s)return 7; if(p<fi)return 7*(1-(p-s)/(fi-s||.001)); if(p>fo)return 6*((p-fo)/(e-fo||.001)); return 0; }

  /* Su mobile niente blur sui capitoli (paint caro) e scritture di
     stile solo quando il valore cambia davvero — come il B2B */
  const isMob    = isMobile();
  let   lastFade = -1;
  let   lastVp   = -1;
  const lastChO  = els.map(() => -1);

  /* Mobile: variante leggera del mp4 e download avviato SUBITO */
  if (isMob) {
    videoEl.src = 'assets/video/hero-final-m.mp4?v=1';
    videoEl.preload = 'auto';
    videoEl.load();
    vLoaded = true;
  }

  function apply(p) {
    renderFrame(p * (total - 1));
    const fade = Math.max(0, 1 - p / FADE_END);
    if (fade !== lastFade) {
      gsap.set(fadeEl, { opacity: fade });
      lastFade = fade;
    }
    if (!vLoaded && p > 0.5) { vLoaded = true; videoEl.preload = 'auto'; videoEl.load(); }
    const vp = Math.min(1, Math.max(0, (p - V_START) / (1 - V_START)));
    if (vp > 0 || lastVp !== 0) {
      const sz = (Math.pow(vp, 1.2) * 260).toFixed(1) + 'vmax';
      const cz = Math.max(1, window.innerHeight / (window.innerWidth * 3 / 8));
      const sh = Math.min(1, Math.max(0, (vp - 0.5) / 0.5));
      const ease = sh * sh * (3 - 2 * sh);
      gsap.set(videoEl, {
        opacity: Math.min(1, vp * 3),
        scale: cz + (1 - cz) * ease,
        webkitMaskSize: `${sz} ${sz}`,
        maskSize: `${sz} ${sz}`
      });
      if (vp > 0.02 && videoEl.paused) videoEl.play().catch(() => {});
      else if (vp <= 0.01 && !videoEl.paused) { videoEl.pause(); videoEl.currentTime = 0; }

      gsap.set(whiteEl, {
        opacity: Math.min(1, vp * 3) * 0.55,
        webkitMaskSize: `${sz} ${sz}`,
        maskSize: `${sz} ${sz}`
      });

      gsap.set(blackEl, {
        opacity: Math.min(1, Math.max(0, (vp - 0.4) / 0.15)),
        webkitMaskSize: `${sz} ${sz}`,
        maskSize: `${sz} ${sz}`
      });
    }
    lastVp = vp;
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

  /* Snap ai punti CTA (desktop, via rotella) — 0.885 = sosta
     "televisione" con la porta aperta a mezzo schermo */
  const POINTS = CHS.map(c => c.s === 0 ? 0 : (c.fi + c.fo) / 2).concat(0.885, 1);
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

/* Tunnel su canvas con crossfade tra frame — identico al B2B:
   su mobile file dedicato già sfoltito + ImageBitmap pre-scalate */
(async () => {
  try {
    let res = isMobile()
      ? await fetch('assets/lottie-hero-m.json?v=1').catch(() => null)
      : null;
    let thinned = !!(res && res.ok);
    if (!thinned) res = await fetch('assets/lottie-hero.json?v=3');
    const data = await res.json();
    bar.style.width = '40%';

    const byId = {};
    (data.assets || []).forEach(a => { byId[a.id] = a; });
    const srcs = (data.layers || [])
      .filter(l => l.ty === 2)
      .sort((a, b) => a.ip - b.ip)
      .map(l => byId[l.refId] && byId[l.refId].p)
      .filter(Boolean);
    if (!srcs.length) throw new Error('nessun frame nella sequenza');

    const a0 = (data.assets || []).find(a => a.w && a.h) || {};
    const iw = a0.w || 1280;
    const ih = a0.h || 720;

    const box = document.getElementById('lottie-bg');
    const cv  = document.createElement('canvas');
    const ctx = cv.getContext('2d');
    box.appendChild(cv);

    let seq   = null;
    let seqW  = iw;
    let seqH  = ih;
    let lastF = 0;

    function draw(f) {
      lastF = f;
      if (!seq) return;
      const i = Math.max(0, Math.min(Math.floor(f), seq.length - 1));
      const j = Math.min(i + 1, seq.length - 1);
      const t = f - i;
      /* cover: con le bitmap mobile pre-scalate s=1, dx=dy=0 = blit */
      const s  = Math.max(cv.width / seqW, cv.height / seqH);
      const dw = seqW * s, dh = seqH * s;
      const dx = (cv.width - dw) / 2, dy = (cv.height - dh) / 2;
      ctx.globalAlpha = 1;
      ctx.drawImage(seq[i], dx, dy, dw, dh);
      if (j !== i && t > 0.01) {
        ctx.globalAlpha = t;
        ctx.drawImage(seq[j], dx, dy, dw, dh);
      }
    }

    function sizeCanvas() {
      /* DPR limitato: oltre non c'è dettaglio da guadagnare; su
         mobile DPR 1 (bitmap in memoria) */
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile() ? 1 : 1.5);
      cv.width  = Math.round(box.clientWidth  * dpr);
      cv.height = Math.round(box.clientHeight * dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }

    const MOBILE_STEP = thinned ? 1 : 2;
    let bitmapsMode = false;

    async function buildBitmaps() {
      const picks = [];
      for (let k = 0; k < srcs.length; k += MOBILE_STEP) picks.push(srcs[k]);
      const s  = Math.max(cv.width / iw, cv.height / ih);
      const sw = Math.min(iw, Math.round(cv.width  / s));
      const sh = Math.min(ih, Math.round(cv.height / s));
      const sx = Math.round((iw - sw) / 2);
      const sy = Math.round((ih - sh) / 2);
      const opts = { resizeWidth: cv.width, resizeHeight: cv.height, resizeQuality: 'high' };
      let scaled = true;
      let done   = 0;
      const mk = async (src) => {
        const blob = await (await fetch(src)).blob();
        let bm;
        if (scaled) {
          try { bm = await createImageBitmap(blob, sx, sy, sw, sh, opts); }
          catch (e) { scaled = false; }
        }
        if (!bm) bm = await createImageBitmap(blob);
        done++;
        bar.style.width = (40 + 55 * done / picks.length) + '%';
        return bm;
      };
      /* il primo da solo stabilisce il supporto alle opzioni */
      const first = await mk(picks[0]);
      const rest  = await Promise.all(picks.slice(1).map(mk));
      const old   = seq;
      seq  = [first, ...rest];
      seqW = scaled ? cv.width  : iw;
      seqH = scaled ? cv.height : ih;
      bitmapsMode = true;
      if (old) old.forEach(b => b.close && b.close());
    }

    function resize() {
      sizeCanvas();
      if (bitmapsMode &&
          (Math.abs(cv.width  - seqW) / seqW > 0.15 ||
           Math.abs(cv.height - seqH) / seqH > 0.15)) {
        buildBitmaps().then(() => draw(lastF));
      }
      draw(lastF);
    }
    window.addEventListener('resize', debounce(resize, 150));
    sizeCanvas();

    if (isMobile()) {
      try { await buildBitmaps(); }
      catch (e) { /* si ripiega sulle Image */ }
    }
    if (!seq) {
      /* Desktop (o fallback): warm-up decode con tetto 5s, poi si
         parte comunque (i frame si decodificano al primo draw) */
      const frames = srcs.map(src => { const img = new Image(); img.src = src; return img; });
      let decoded = 0;
      await Promise.race([
        Promise.all(frames.map(img =>
          img.decode().catch(() => {}).then(() => {
            decoded++;
            bar.style.width = (40 + 55 * decoded / frames.length) + '%';
          })
        )),
        new Promise(r => setTimeout(r, 5000))
      ]);
      seq = frames;
    }

    bar.style.width = '100%';
    setTimeout(hideLoader, 300);
    draw(lastF);
    initHeroScroll(draw, seq.length);
  } catch (err) {
    loader.querySelector('p').textContent = 'Errore';
  }
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
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: .15 });
revealEls.forEach(el => revealObserver.observe(el));

/* ── Box: prefill dalla card + riepilogo prezzo ── */
/* Unica fonte dei prezzi: i data-attribute delle card in HTML */
(function () {
  const select    = document.getElementById('mdm-box-select');
  const sizeField = document.getElementById('mdm-size-field');
  const recap     = document.getElementById('mdm-price-recap');
  const recapVal  = document.getElementById('mdm-price-val');
  const dateInput = document.getElementById('mdm-date');
  if (!select) return;

  /* ritiro: da domani in poi */
  if (dateInput) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    dateInput.min = d.toISOString().split('T')[0];
  }

  const cardOf = key => document.querySelector(`.mdm-box-card[data-box="${key}"]`);

  function refresh() {
    const card  = cardOf(select.value);
    const unica = !!(card && card.dataset.unica);
    sizeField.hidden = !card || unica;
    if (!card) {
      recap.hidden = true;
      return;
    }
    const per4  = unica || document.querySelector('input[name="taglia"][value="per 4"]').checked;
    const price = per4 ? card.dataset.p4 : card.dataset.p2;
    recapVal.textContent = '€' + price;
    recap.hidden = false;
  }

  select.addEventListener('change', refresh);
  document.querySelectorAll('input[name="taglia"]').forEach(r => r.addEventListener('change', refresh));

  /* "Prenota" sulla card: preseleziona il box e scrolla al form */
  document.querySelectorAll('.box-book').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.mdm-box-card');
      select.value = card.dataset.box;
      refresh();
      lenis.scrollTo(document.getElementById('contatti'));
    });
  });
})();

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

/* ── Form ordine → Web3Forms ──────────────────── */
const orderForm = document.getElementById('mdm-order-form');
if (orderForm) {
  orderForm.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('.btn-submit');
    const ok = document.getElementById('mdm-form-ok');
    const origTxt = btn.textContent;

    btn.textContent = 'Invio in corso…';
    btn.disabled = true;

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: new FormData(form)
      });
      const json = await res.json();
      if (json.success) {
        ok.textContent = '✓ Prenotazione ricevuta. Ti confermiamo box e ritiro al telefono.';
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
}
