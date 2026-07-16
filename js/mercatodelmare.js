/* ════════════════════════════════════════
   Il Mercato del Mare — Script (B2C)
   File indipendente dal B2B (script.js)
   ════════════════════════════════════════ */

/* ── Header: sfondo pieno dopo lo scroll ─────── */
const mdmHdr = document.getElementById('mdm-hdr');
window.addEventListener('scroll', () => {
  mdmHdr.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

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
