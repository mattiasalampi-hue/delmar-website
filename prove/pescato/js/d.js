/* Le due tele dell'apertura e il menu del telefono.
   Stesse funzioni della home e della pagina domande frequenti: caustiche.js
   e pesci.js sono nati per essere chiamati da piu' pagine, ed e' l'unico
   motivo per cui questa pagina puo' avere lo stesso mare senza una riga di
   grafica duplicata. */
(function () {
  'use strict';

  var hdr = document.getElementById('hdr');
  if (hdr) {
    var guarda = function () { hdr.classList.toggle('scrolled', window.scrollY > 40); };
    guarda();
    window.addEventListener('scroll', guarda, { passive: true });

    /* QUANTO E' ALTA L'INTESTAZIONE, misurata invece che indovinata.
       Tutte le barre appese del sito si fermano sotto l'header, e finora
       ognuna se lo ricordava a memoria con un `top: 4.1rem` copiato di pagina
       in pagina. Ma l'header non e' alto 4.1rem: sopra i 1024 px il logo
       rimpicciolisce e ne misura 3,36 — dodici pixel di fessura in cui il
       testo della pagina passa a vista, sotto la barra e sopra il bordo.
       Il numero giusto non esiste perche' cambia a tre scaglioni diversi:
       si misura una volta e lo leggono tutti.
       (Mattias, 2026-08-16 — lo stesso 4.1rem e' anche in
       domande-frequenti.css, e ha lo stesso difetto) */
    var alza = function () {
      document.documentElement.style.setProperty('--h-hdr', hdr.offsetHeight + 'px');
    };
    alza();
    window.addEventListener('resize', alza, { passive: true });
  }

  var burger = document.getElementById('hamburger');
  var nav = document.getElementById('main-nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var aperto = nav.classList.toggle('open');
      burger.classList.toggle('open', aperto);
      burger.setAttribute('aria-expanded', aperto ? 'true' : 'false');
    });
  }

  var sfondo = document.getElementById('pr-sfondo');
  var tela = document.getElementById('pr-pesci');

  /* offsetParent nullo = il foglio di stile l'ha spento (sotto i 900px la
     campitura sparisce). Si chiede al CSS invece di ripetere qui la soglia */
  var diviso = !!(sfondo && sfondo.offsetParent !== null);
  var mare = diviso && window.DelMarCaustiche
    ? window.DelMarCaustiche(sfondo, { tipo: 'larghe' })
    : null;

  if (tela && window.DelMarPesci) {
    window.DelMarPesci(tela, {
      confine: function (y) { return mare ? mare.confine(y) : -1; },
      stile: 4
    });
  }

  /* IL FONDO DELLA CHIUSURA.
     Costa zero in scarico — caustiche.js e' gia' caricato per l'apertura —
     e nemmeno in lavoro: la funzione ha il suo IntersectionObserver, quindi
     finche' non si scorre fino in fondo alla pagina non disegna un
     fotogramma. Se il canvas non c'e' o lo script non parte, resta il blu
     pieno del foglio di stile e non si rompe niente. */
  var fondo = document.querySelector('.pr-chiusura-fondo');
  if (fondo && window.DelMarCaustiche) {
    window.DelMarCaustiche(fondo, { tipo: 'profondita' });
  }
})();
