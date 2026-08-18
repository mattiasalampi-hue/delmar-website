/* GLI ARCHI SULLA MAPPA DELLE CONSEGNE.

   L'immagine di fondo (scelta da Mattias) ha gia' dentro pin, etichette e
   geografia: questa tela ci disegna sopra solo il movimento — gli archi
   tratteggiati che scorrono dal pin di Massa alle altre zone, col boccone
   corallo che viaggia. Le posizioni dei pin arrivano dagli attributi
   data-fx/data-fy delle aree cliccabili (frazioni dell'immagine), cosi'
   la geometria vive in un posto solo: genera-zone.js. */
(function () {
  var tela = document.getElementById('mappa-linee');
  var guscio = document.getElementById('mappa-guscio');
  if (!tela || !guscio) return;

  var HUB = { fx: 0.448, fy: 0.654 }; /* la punta del pin di Massa */

  var aree = Array.prototype.slice.call(guscio.querySelectorAll('.mp-area'));
  var mete = [];
  var attivo = null; /* l'indice dell'arco da accendere al passaggio */
  aree.forEach(function (a) {
    var m = { fx: parseFloat(a.dataset.fx), fy: parseFloat(a.dataset.fy) };
    /* Massa e' il perno: da se' a se' non parte nessun arco */
    var eHub = Math.abs(m.fx - HUB.fx) <= 0.01 && Math.abs(m.fy - HUB.fy) <= 0.01;
    var idx = eHub ? null : mete.push(m) - 1;
    /* Il passaggio sul pin accende il SUO arco e attenua gli altri: e' il
       gesto che lega etichetta e rotta */
    function accendi() { attivo = idx; if (fermo) disegna(performance.now()); }
    function spegni() { attivo = null; if (fermo) disegna(performance.now()); }
    a.addEventListener('mouseenter', accendi);
    a.addEventListener('mouseleave', spegni);
    a.addEventListener('focus', accendi);
    a.addEventListener('blur', spegni);
  });

  var W = 0, H = 0;

  function misura() {
    var r = guscio.getBoundingClientRect();
    W = r.width; H = r.height;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    tela.width = W * dpr;
    tela.height = H * dpr;
    tela.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  var fermo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var partenza = performance.now();
  var raf = null;

  function disegna(adesso) {
    var ctx = tela.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    var t = adesso - partenza;
    var a = { x: HUB.fx * W, y: HUB.fy * H };

    mete.forEach(function (m, i) {
      var b = { x: m.fx * W, y: m.fy * H };
      /* La curva si inarca in perpendicolare alla corda, verso l'alto:
         ogni arco con la sua pancia, cosi' non si sovrappongono */
      var pancia = 30 + (i % 4) * 14;
      var mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.25;
      var my = (a.y + b.y) / 2 - Math.abs(b.x - a.x) * 0.18 - pancia;

      var acceso = attivo === i;
      var spento = attivo !== null && !acceso;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
      ctx.strokeStyle = acceso ? '#ff6b57' : 'rgba(255, 255, 255, ' + (spento ? '.22' : '.75') + ')';
      ctx.lineWidth = acceso ? 2.6 : 1.6;
      if (!fermo && !acceso) {
        ctx.setLineDash([5, 7]);
        ctx.lineDashOffset = -(t / 40 + i * 12) % 12;
      }
      ctx.stroke();
      ctx.setLineDash([]);

      /* Il boccone che viaggia: e' lui a dire "consegna in corso".
         Sull'arco acceso corre piu' veloce e si ingrossa */
      if (!fermo && !spento) {
        var k = ((t / (acceso ? 1400 : 2600) + i * 0.14) % 1);
        var ix = (1 - k) * (1 - k) * a.x + 2 * (1 - k) * k * mx + k * k * b.x;
        var iy = (1 - k) * (1 - k) * a.y + 2 * (1 - k) * k * my + k * k * b.y;
        ctx.beginPath();
        ctx.arc(ix, iy, acceso ? 4.5 : 3.2, 0, Math.PI * 2);
        ctx.fillStyle = '#ff6b57';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.9)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    /* Il perno respira sul pin di Massa */
    if (!fermo) {
      var alone = 8 + 5 * (0.5 + 0.5 * Math.sin(t / 500));
      ctx.beginPath();
      ctx.arc(a.x, a.y, alone, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 107, 87, .55)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  }

  function giro(adesso) {
    disegna(adesso);
    if (!fermo) raf = requestAnimationFrame(giro);
  }

  /* Fermo quando non si vede: fotogrammi fuori schermo sono batteria
     buttata (stessa regola di pesci.js) */
  var occhio = new IntersectionObserver(function (e) {
    if (e[0].isIntersecting) { if (raf === null) raf = requestAnimationFrame(giro); }
    else if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
  }, { threshold: 0.05 });

  var attesa;
  window.addEventListener('resize', function () {
    clearTimeout(attesa);
    attesa = setTimeout(function () { misura(); disegna(performance.now()); }, 120);
  });

  misura();
  disegna(performance.now());
  occhio.observe(guscio);
})();
