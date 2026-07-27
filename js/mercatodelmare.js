/* ════════════════════════════════════════
   Il Mercato del Mare — Script (B2C)
   File indipendente dal B2B (script.js)
   ════════════════════════════════════════ */

/* ── Header: sfondo pieno dopo lo scroll ─────── */
const mdmHdr = document.getElementById('mdm-hdr');
window.addEventListener('scroll', () => {
  mdmHdr.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* ── Hero video ───────────────────────────────── */
/* Sorgente in base al viewport (mobile: variante leggera 640x240,
   entrambe con faststart: partono in streaming). Con
   prefers-reduced-motion il video non si avvia mai: resta il poster.
   Fuori dallo schermo il video si mette in pausa (batteria) */
(function () {
  const vid = document.getElementById('mdm-hero-video');
  if (!vid) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    vid.removeAttribute('autoplay');
    return;
  }
  const mq = window.matchMedia('(max-width: 768px)');
  function pick() {
    const want = mq.matches
      ? 'assets/video/hero-final-m.mp4?v=1'
      : 'assets/video/hero-final.mp4?v=3';
    if (vid.getAttribute('src') !== want) {
      vid.src = want;
      vid.play().catch(() => {});
    }
  }
  pick();
  mq.addEventListener('change', pick);
  new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) vid.play().catch(() => {});
      else vid.pause();
    });
  }, { threshold: 0 }).observe(vid);
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
/* Unica fonte dei prezzi: i data-attribute delle card in HTML
   (data-p2/data-p4, data-unica per la taglia singola). Il form
   li legge dal DOM — niente numeri duplicati nel JS */
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
    /* Convivio: taglia unica → pill nascoste; "altro": prezzo in chat */
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
      document.getElementById('contatti').scrollIntoView({ behavior: 'smooth' });
    });
  });
})();

/* ── CTA sticky mobile ────────────────────────── */
/* Visibile solo (via CSS <768px) dopo l'hero e fuori dalla sezione
   form, dove coprirebbe il bottone di invio */
(function () {
  const cta  = document.getElementById('mdm-sticky-cta');
  const hero = document.getElementById('mdm-hero');
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
        ok.textContent = '✓ Richiesta inviata. Ti contatteremo presto.';
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
