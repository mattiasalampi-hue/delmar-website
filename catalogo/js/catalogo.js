/* L'indice del catalogo segue lo scorrimento, e il filo misura quanto manca.

   Stesso contratto della pagina delle domande frequenti — `.fq-indice a` che
   prendono la classe `attivo`, `#fq-avanza` che si allunga — perche' e' lo
   stesso componente e deve comportarsi allo stesso modo. Quel file di
   JavaScript non e' riusabile com'e' (e' legato ai gruppi di domande e agli
   accordion), ma la convenzione si', ed e' quella che conta per chi guarda.

   L'intestazione e il menu del telefono li fa gia' d.js. */
(function () {
  'use strict';

  var barra = document.querySelector('.fq-barra');
  if (!barra) return;

  var indice = barra.querySelector('.fq-indice');
  var filo = document.getElementById('fq-avanza');
  var voci = indice ? [].slice.call(indice.querySelectorAll('a')) : [];

  var sezioni = voci
    .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
    .filter(Boolean);

  if (sezioni.length !== voci.length) return;

  var attivo = -1;

  function segna(i) {
    if (i === attivo) return;
    if (attivo > -1) voci[attivo].classList.remove('attivo');
    attivo = i;
    if (i < 0) return;

    var voce = voci[i];
    voce.classList.add('attivo');

    /* Sul telefono l'indice scorre di lato: se la famiglia corrente e' fuori
       vista, la pillola accesa non la vede nessuno. La si porta dentro solo
       quando serve, altrimenti l'indice sfarfalla a ogni scroll */
    var b = indice.getBoundingClientRect();
    var v = voce.getBoundingClientRect();
    if (v.left < b.left + 8) {
      indice.scrollLeft += v.left - b.left - 16;
    } else if (v.right > b.right - 8) {
      indice.scrollLeft += v.right - b.right + 16;
    }
  }

  function aggiorna() {
    if (filo) {
      var corsa = document.documentElement.scrollHeight - window.innerHeight;
      var q = corsa > 0 ? Math.min(1, Math.max(0, window.scrollY / corsa)) : 0;
      filo.style.width = (q * 100).toFixed(1) + '%';
    }

    /* La famiglia buona e' l'ULTIMA che ha superato la riga, non la prima
       visibile: sotto la barra appesa c'e' sempre la coda della famiglia
       precedente, e prendendo la prima visibile l'indice indicherebbe una
       sezione gia' letta */
    var linea = barra.getBoundingClientRect().bottom + 40;
    var trovato = -1;

    for (var i = 0; i < sezioni.length; i++) {
      if (sezioni[i].getBoundingClientRect().top <= linea) trovato = i;
    }
    segna(trovato);
  }

  var inCoda = false;
  function chiedi() {
    if (inCoda) return;
    inCoda = true;
    requestAnimationFrame(function () {
      inCoda = false;
      aggiorna();
    });
  }

  window.addEventListener('scroll', chiedi, { passive: true });
  window.addEventListener('resize', chiedi, { passive: true });
  aggiorna();
})();
