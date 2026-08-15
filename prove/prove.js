/* Banco di prova — solo locale.
   Due assi indipendenti, combinabili:
     C1..C5  come sono fatte le caustiche sul confine
     P1..P4  come sono disegnati i pesciolini
   L'indirizzo li porta tutti e due: #c3p2.

   Le caustiche e i pesci NON stanno qui: stanno in js/caustiche.js e
   js/pesci.js, gli stessi file che carica il sito. Il banco cambia solo
   quale variante mostrare — cosi' quello che si vede qui e' esattamente
   quello che andrebbe in produzione, e non una sua imitazione che col
   tempo diverge.

   Si cambia con l'indirizzo DOPO IL CANCELLETTO e non con un parametro:
   il servitore locale, davanti a un .html con una domanda attaccata,
   rispondeva 301 e la domanda la buttava via. */
(function () {
  const sfondo = document.getElementById('pv-sfondo');
  const tela   = document.getElementById('contatti-particles');
  const conta  = document.getElementById('pv-presi');

  const TIPI  = ['fitte', 'larghe', 'rete', 'raggi', 'superficie'];
  const NOMI  = ['Fitte', 'Larghe e lente', 'Rete', 'Raggi', 'Superficie'];
  const STILI = ['Piatti', 'Volume', 'Profondità', 'Pinne e ombra'];

  let record = 0;

  const mare = window.DelMarCaustiche(sfondo, { tipo: 'larghe' });

  const banco = window.DelMarPesci(tela, {
    /* Il confine lo detta chi disegna lo sfondo: e' tutto il punto */
    confine: (y) => mare.confine(y),
    stile: 4,
    onPreso: (n, combo) => {
      conta.textContent = n;
      if (combo > record) {
        record = combo;
        document.getElementById('pv-record').textContent = record;
      }
    }
  });

  function applica(h) {
    const m = /c([1-5])/.exec(h);
    const n = /p([1-4])/.exec(h);
    /* Senza indirizzo si apre sulla scelta fatta — larghe e lente piu'
       pinne e ombra — non sulla prima della lista */
    const ci = m ? +m[1] : 2;
    const pi = n ? +n[1] : 4;

    mare.cambia(TIPI[ci - 1]);
    banco.stile(pi);

    document.querySelectorAll('.pv-tasto').forEach(a => {
      a.classList.toggle('pv-attivo', a.dataset.v === 'c' + ci || a.dataset.v === 'p' + pi);
      /* Ogni tasto tiene fermo l'altro asse: si cambia una cosa per volta,
         che e' l'unico modo di capire quale delle due ha fatto la
         differenza */
      a.href = a.dataset.v[0] === 'c' ? '#' + a.dataset.v + 'p' + pi
                                      : '#c' + ci + a.dataset.v;
    });
    document.getElementById('pv-eco').textContent = NOMI[ci - 1] + ' · ' + STILI[pi - 1];
  }

  window.addEventListener('hashchange', () => applica(location.hash));
  applica(location.hash || '#c2p4');
})();
