/* Le frecce del nastro delle altre specie.
   Il nastro scorre gia' da solo — dito, trackpad, rotellina — le frecce sono
   per chi usa il mouse e non ha modo di trascinare. Percio' non sostituiscono
   lo scorrimento: lo accompagnano. */
(function () {
  'use strict';

  var nastro = document.getElementById('sc-nastro');
  if (!nastro) return;

  var frecce = document.querySelectorAll('[data-scorri]');

  /* Si scorre di quasi UNA SCHERMATA, non di una foto: chi preme la freccia
     vuole vedere roba nuova, e avanzare di una sola immagine costringe a dieci
     clic. Il pezzo che resta visibile (l'85%) e' l'aggancio dell'occhio: senza,
     a ogni clic si perde il filo di dove si era */
  function passo() {
    return nastro.clientWidth * 0.85;
  }

  frecce.forEach(function (freccia) {
    freccia.addEventListener('click', function () {
      var verso = parseInt(freccia.getAttribute('data-scorri'), 10);
      nastro.scrollBy({ left: passo() * verso, behavior: 'smooth' });
    });
  });

  /* Le frecce si spengono quando non c'e' piu' niente da quella parte: una
     freccia che non fa niente e' peggio di una freccia che non c'e', perche'
     la si preme e si crede che la pagina sia rotta.
     La tolleranza di 4 pixel serve agli arrotondamenti del browser, che sui
     bordi non arriva mai al numero esatto */
  function aggiorna() {
    var inizio = nastro.scrollLeft <= 4;
    var fine = nastro.scrollLeft + nastro.clientWidth >= nastro.scrollWidth - 4;

    frecce.forEach(function (freccia) {
      var verso = parseInt(freccia.getAttribute('data-scorri'), 10);
      freccia.classList.toggle('is-spenta', verso < 0 ? inizio : fine);
    });
  }

  var atteso = false;
  nastro.addEventListener('scroll', function () {
    if (atteso) return;
    atteso = true;
    requestAnimationFrame(function () { atteso = false; aggiorna(); });
  }, { passive: true });

  window.addEventListener('resize', aggiorna, { passive: true });
  /* Anche al caricamento delle immagini: finche' arrivano, la larghezza totale
     cambia e la freccia destra potrebbe risultare spenta a torto */
  window.addEventListener('load', aggiorna);
  aggiorna();
})();
