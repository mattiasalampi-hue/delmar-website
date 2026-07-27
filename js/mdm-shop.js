/* ════════════════════════════════════════
   Il Mercato del Mare — Carrello & Checkout
   Stato in localStorage (mdm_cart): ogni
   articolo porta con sé l'intero listino
   della card (p4/p6/p8), così le pagine
   shop non duplicano i prezzi
   ════════════════════════════════════════ */

const CART_KEY = 'mdm_cart';

function cartRead() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function cartWrite(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function itemPrice(item) {
  return item.prezzi['p' + item.size] * item.qty;
}

function cartTotal(cart) {
  return cart.reduce((sum, i) => sum + itemPrice(i), 0);
}

function euro(n) {
  return '€' + n;
}

/* ── Riepilogo (condiviso carrello/checkout) ──── */
function renderSummary() {
  const rows  = document.getElementById('summary-rows');
  const total = document.getElementById('summary-total');
  if (!rows) return;
  const cart = cartRead();
  rows.innerHTML = cart.map(i => `
    <div class="summary-row">
      <span>${i.nome} · ${i.size} pers.${i.qty > 1 ? ' × ' + i.qty : ''}</span>
      <span>${euro(itemPrice(i))}</span>
    </div>
  `).join('');
  total.textContent = euro(cartTotal(cart));
}

/* ── Pagina carrello ──────────────────────────── */
(function () {
  const list = document.getElementById('cart-items');
  if (!list) return;

  const full  = document.getElementById('cart-full');
  const empty = document.getElementById('cart-empty');

  function render() {
    const cart = cartRead();
    full.hidden  = cart.length === 0;
    empty.hidden = cart.length > 0;
    if (!cart.length) return;

    list.innerHTML = cart.map((i, idx) => `
      <div class="cart-item" data-idx="${idx}">
        <img src="${i.img}" alt="${i.nome}" class="cart-item-img" />
        <div class="cart-item-info">
          <h3>${i.nome}</h3>
          <label class="cart-item-size">
            <span>Persone</span>
            <select data-role="size">
              <option value="4" ${i.size === 4 ? 'selected' : ''}>4 — ${euro(i.prezzi.p4)}</option>
              <option value="6" ${i.size === 6 ? 'selected' : ''}>6 — ${euro(i.prezzi.p6)}</option>
              <option value="8" ${i.size === 8 ? 'selected' : ''}>8 — ${euro(i.prezzi.p8)}</option>
            </select>
          </label>
        </div>
        <div class="cart-item-qty">
          <button type="button" data-role="minus" aria-label="Diminuisci">−</button>
          <span>${i.qty}</span>
          <button type="button" data-role="plus" aria-label="Aumenta">+</button>
        </div>
        <div class="cart-item-price">${euro(itemPrice(i))}</div>
        <button type="button" class="cart-item-remove" data-role="remove" aria-label="Rimuovi">×</button>
      </div>
    `).join('');
    renderSummary();
  }

  list.addEventListener('click', e => {
    const role = e.target.dataset.role;
    if (!role || role === 'size') return;
    const idx  = +e.target.closest('.cart-item').dataset.idx;
    const cart = cartRead();
    if (role === 'plus')  cart[idx].qty += 1;
    if (role === 'minus') cart[idx].qty = Math.max(1, cart[idx].qty - 1);
    if (role === 'remove') cart.splice(idx, 1);
    cartWrite(cart);
    render();
  });

  list.addEventListener('change', e => {
    if (e.target.dataset.role !== 'size') return;
    const idx  = +e.target.closest('.cart-item').dataset.idx;
    const cart = cartRead();
    cart[idx].size = +e.target.value;
    /* stesso box già in carrello con questa taglia: si fondono */
    const dup = cart.findIndex((i, k) => k !== idx && i.box === cart[idx].box && i.size === cart[idx].size);
    if (dup !== -1) {
      cart[idx].qty += cart[dup].qty;
      cart.splice(dup, 1);
    }
    cartWrite(cart);
    render();
  });

  render();
})();

/* ── Pagina checkout ──────────────────────────── */
(function () {
  const form = document.getElementById('co-form');
  if (!form) return;

  /* carrello vuoto: non c'è niente da pagare */
  if (!cartRead().length) {
    location.href = 'carrello.html';
    return;
  }

  renderSummary();

  /* ritiro: da domani in poi */
  const dateInput = document.getElementById('co-date');
  const d = new Date();
  d.setDate(d.getDate() + 1);
  dateInput.min = d.toISOString().split('T')[0];

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const payBtn = document.getElementById('co-pay');
    const errEl  = document.getElementById('co-error');
    errEl.hidden = true;

    const cart  = cartRead();
    const data  = new FormData(form);
    const total = cartTotal(cart);
    const code  = 'MDM-' + Date.now().toString(36).toUpperCase().slice(-6);

    payBtn.disabled = true;
    payBtn.textContent = 'Reindirizzamento al pagamento…';

    /* QUI andrà l'integrazione PayPal (Smart Buttons / Checkout):
       al posto della simulazione si apre il flusso PayPal e la
       conferma scatta nel suo onApprove. Il resto è già pronto */
    await new Promise(r => setTimeout(r, 1400));

    /* Notifica ordine via Web3Forms: parte davvero solo quando la
       access key sarà configurata (stessa chiave dei form del sito) */
    try {
      const ordine = cart.map(i => `${i.nome} — ${i.size} persone × ${i.qty} = ${euro(itemPrice(i))}`).join('\n');
      const fd = new FormData();
      fd.append('access_key', 'INCOLLA_QUI_IL_TUO_ACCESS_KEY');
      fd.append('subject', `Ordine ${code} — Il Mercato del Mare`);
      fd.append('from_name', 'Il Mercato del Mare');
      fd.append('nome', data.get('nome'));
      fd.append('telefono', data.get('telefono'));
      fd.append('email', data.get('email'));
      fd.append('giorno_ritiro', data.get('giorno_ritiro'));
      fd.append('fascia', data.get('fascia'));
      fd.append('pagamento', data.get('pagamento'));
      fd.append('note', data.get('note') || '—');
      fd.append('ordine', ordine + `\nTotale: ${euro(total)}`);
      fetch('https://api.web3forms.com/submit', { method: 'POST', body: fd }).catch(() => {});
    } catch (e) { /* la conferma a schermo non dipende dalla mail */ }

    document.getElementById('order-code').textContent = code;
    document.getElementById('co-flow').hidden = true;
    document.getElementById('order-ok').hidden = false;
    cartWrite([]);
    window.scrollTo(0, 0);
  });
})();
