/* Il foglio di scelta delle foto: raccoglie i clic e sputa il JSON.

   Le scelte restano nel browser (localStorage): scegliere quarantasette foto
   e' un lavoro che si interrompe, e ricominciare da capo perche' si e' chiusa
   la scheda sarebbe il modo piu' rapido di far abbandonare lo strumento. */
(function () {
  'use strict';

  var CHIAVE = 'delmar-scelta-foto';
  var uscita = document.getElementById('uscita');
  var fatti = document.getElementById('fatti');
  var copia = document.getElementById('copia');

  var scelte = {};
  try {
    scelte = JSON.parse(localStorage.getItem(CHIAVE) || '{}');
  } catch (e) { /* archivio illeggibile: si riparte da zero, non si esplode */ }

  function segnaFatta(slug) {
    var sez = document.querySelector('.voce[data-slug="' + slug + '"]');
    if (sez) sez.classList.toggle('is-fatta', !!scelte[slug]);
  }

  function mostra() {
    var chiavi = Object.keys(scelte).filter(function (k) { return scelte[k]; });
    fatti.textContent = chiavi.length;

    uscita.textContent = chiavi.length
      ? JSON.stringify(scelte, null, 2)
      : 'Nessuna scelta ancora.';

    try {
      localStorage.setItem(CHIAVE, JSON.stringify(scelte));
    } catch (e) { /* archivio pieno o negato: pazienza, il JSON e' a schermo */ }
  }

  /* Un ascoltatore solo sul documento invece di uno per ogni foto: le foto
     sono centocinquantasei, e sono tutte dentro lo stesso contenitore */
  document.addEventListener('change', function (e) {
    var input = e.target;
    if (!input.name || input.type !== 'radio') return;

    scelte[input.name] = input.value;
    segnaFatta(input.name);
    mostra();
  });

  // Rimette i segni dove erano rimasti al giro precedente
  Object.keys(scelte).forEach(function (slug) {
    var input = document.querySelector('input[name="' + slug + '"][value="' + scelte[slug] + '"]');
    if (input) input.checked = true;
    segnaFatta(slug);
  });

  copia.addEventListener('click', function () {
    navigator.clipboard.writeText(uscita.textContent).then(function () {
      var prima = copia.textContent;
      copia.textContent = 'Copiato';
      setTimeout(function () { copia.textContent = prima; }, 1400);
    });
  });

  mostra();
})();
