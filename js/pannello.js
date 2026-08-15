/* Il pannello e' quasi tutto HTML generato dal server: qui c'e' una
   cosa sola, l'interruttore per non farsi contare.

   Deve stare nel browser e non nel server perche' il segno che esclude
   vive in localStorage (vedi js/analitica.js), e localStorage il server
   non lo vede. Stesso dominio, stesso segno: quello che si spegne da
   qui vale su tutto il sito. */
(function () {
  var SEGNO = 'delmar-nonseguire';
  var dove = document.getElementById('pn-esclusione');
  if (!dove) return;

  function disegna() {
    var fuori = false;
    try { fuori = localStorage.getItem(SEGNO) === '1'; } catch (e) {
      dove.textContent = 'Questo browser non può ricordare l\'esclusione '
        + '(navigazione privata o archiviazione bloccata).';
      return;
    }

    dove.textContent = fuori
      ? 'Le visite da questo browser NON vengono contate. '
      : 'Le visite da questo browser vengono contate come tutte le altre. ';

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pn-interruttore';
    b.textContent = fuori ? 'Rimettimi nel conteggio' : 'Non contare le mie visite';
    b.addEventListener('click', function () {
      try {
        if (fuori) localStorage.removeItem(SEGNO);
        else localStorage.setItem(SEGNO, '1');
      } catch (e) { /* niente da fare, il messaggio sopra lo spiega */ }
      dove.textContent = '';
      disegna();
    });
    dove.appendChild(b);
  }

  disegna();
})();
