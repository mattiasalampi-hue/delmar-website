/* ═══════════════════════════════════════════════════════
   DelMar — script.js
   GSAP 3 + ScrollTrigger + lottie-web scrollytelling
═══════════════════════════════════════════════════════ */

gsap.registerPlugin(ScrollTrigger);

/* ── Cursor glow ──────────────────────────────────────── */
const cursor = document.createElement('div');
cursor.classList.add('cursor-glow');
document.body.appendChild(cursor);

window.addEventListener('mousemove', e => {
  gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.6, ease: 'power2.out' });
});

/* ── Hero entrance ────────────────────────────────────── */
const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

heroTl
  .to('.hero-eyebrow', { opacity: 1, y: 0, duration: 1, delay: 0.3 })
  .from('.hero-title span:first-child', { y: 80, opacity: 0, duration: 1.2 }, '-=0.6')
  .from('.hero-title span:last-child',  { y: 80, opacity: 0, duration: 1.2 }, '-=0.9')
  .to('.hero-sub',    { opacity: 1, y: 0, duration: 1 }, '-=0.6')
  .to('.scroll-cue',  { opacity: 1, duration: 0.8 }, '-=0.2');

/* ── Lottie scrollytelling ────────────────────────────── */
let lottieAnim = null;
let lottieReady = false;

lottieAnim = lottie.loadAnimation({
  container: document.getElementById('lottie-container'),
  renderer: 'svg',
  loop: false,
  autoplay: false,
  path: 'Starting_from_the_attached_ima.json',
});

lottieAnim.addEventListener('DOMLoaded', () => {
  lottieReady = true;
  lottieAnim.goToAndStop(0, true);
  setupLottieScroll();
});

lottieAnim.addEventListener('data_failed', () => {
  console.warn('Lottie: file non caricato. Assicurarsi che il JSON sia nella stessa cartella.');
});

function setupLottieScroll() {
  const totalFrames = lottieAnim.totalFrames;
  const progress = { frame: 0 };
  const progressBar = document.getElementById('reel-progress');
  const reelCaption = document.querySelector('.reel-caption');

  ScrollTrigger.create({
    trigger: '#lottie-pin',
    start: 'top top',
    end: 'bottom bottom',
    pin: '#lottie-sticky',
    pinSpacing: false,
    scrub: 1.5,
    onUpdate: self => {
      if (!lottieReady) return;

      // Smooth frame scrubbing
      const targetFrame = self.progress * (totalFrames - 1);
      gsap.to(progress, {
        frame: targetFrame,
        duration: 0.15,
        ease: 'none',
        onUpdate: () => lottieAnim.goToAndStop(Math.round(progress.frame), true),
      });

      // Progress bar
      gsap.set(progressBar, { scaleX: self.progress });

      // Caption fade in midway
      if (self.progress > 0.35 && self.progress < 0.9) {
        const captionProgress = (self.progress - 0.35) / 0.3;
        gsap.set(reelCaption, { opacity: Math.min(captionProgress, 1), y: (1 - Math.min(captionProgress, 1)) * 30 });
      } else {
        gsap.set(reelCaption, { opacity: 0, y: 30 });
      }
    },
  });
}

/* ── Section reveals ──────────────────────────────────── */
function revealFromBottom(selector, stagger = 0) {
  const els = gsap.utils.toArray(selector);
  if (!els.length) return;

  gsap.from(els, {
    scrollTrigger: {
      trigger: els[0].closest('section') || els[0],
      start: 'top 80%',
      toggleActions: 'play none none none',
    },
    y: 50,
    opacity: 0,
    duration: 1,
    stagger,
    ease: 'power3.out',
  });
}

revealFromBottom('.section-label');
revealFromBottom('.section-title', 0.08);
revealFromBottom('.service-card', 0.1);
revealFromBottom('.about-title');
revealFromBottom('.about-text', 0.15);
revealFromBottom('.about-cta');
revealFromBottom('.stat-item', 0.12);

/* ── Contact form ─────────────────────────────────────── */
const form = document.getElementById('contact-form');
const successMsg = document.getElementById('form-success');

form.addEventListener('submit', e => {
  e.preventDefault();

  const btn = form.querySelector('.submit-btn');
  const originalText = btn.querySelector('span').textContent;

  btn.querySelector('span').textContent = 'Invio in corso…';
  btn.disabled = true;

  setTimeout(() => {
    btn.querySelector('span').textContent = originalText;
    btn.disabled = false;
    form.reset();
    successMsg.classList.remove('hidden');
    gsap.from(successMsg, { opacity: 0, y: 10, duration: 0.5, ease: 'power2.out' });

    setTimeout(() => {
      gsap.to(successMsg, {
        opacity: 0, duration: 0.5, onComplete: () => successMsg.classList.add('hidden'),
      });
    }, 4000);
  }, 1200);
});

/* ── Number counter (stats) ───────────────────────────── */
document.querySelectorAll('.stat-item').forEach(el => {
  const numEl = el.querySelector('.font-display');
  if (!numEl) return;
  const endVal = parseFloat(numEl.textContent);
  if (isNaN(endVal)) return;
  const suffix = numEl.textContent.replace(/[\d.]/g, '');

  gsap.from({ val: 0 }, {
    scrollTrigger: {
      trigger: el,
      start: 'top 85%',
      toggleActions: 'play none none none',
    },
    val: endVal,
    duration: 1.8,
    ease: 'power2.out',
    onUpdate() {
      numEl.textContent = Math.round(this.targets()[0].val) + suffix;
    },
  });
});
