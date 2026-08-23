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
  var archi = []; /* per ogni area, l'indice del suo arco (null per il perno) */
  var attivo = null; /* l'indice dell'arco da accendere al passaggio */
  aree.forEach(function (a) {
    var m = { fx: parseFloat(a.dataset.fx), fy: parseFloat(a.dataset.fy) };
    /* Massa e' il perno: da se' a se' non parte nessun arco */
    var eHub = Math.abs(m.fx - HUB.fx) <= 0.01 && Math.abs(m.fy - HUB.fy) <= 0.01;
    var idx = eHub ? null : mete.push(m) - 1;
    archi.push(idx);
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
    /* offsetWidth/offsetHeight: sono le misure del guscio nel suo sistema
       di coordinate, quelle in cui stanno le frazioni dei pin */
    W = guscio.offsetWidth; H = guscio.offsetHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    tela.width = W * dpr;
    tela.height = H * dpr;
    tela.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* CANCELLARE LE ETICHETTE STAMPATE NELLA CARTA.
     Non si dipinge una toppa di tinta piatta — su una carta geografica si
     vede subito, e' un rettangolo che non c'entra niente col terreno
     intorno. Si COPIA un pezzo di carta qui accanto e lo si incolla sopra:
     il terreno cambia piano, quindi la giunta non si nota.
     Il pezzo si prende sopra o sotto a seconda di dove c'e' carta libera —
     verso il basso per le etichette in alto, verso l'alto per quelle in
     fondo — perche' prenderlo sempre dalla stessa parte, per le zone di
     bordo, vorrebbe dire copiare il vuoto fuori dalla carta. */
  function toppa(ctx, img, bl, bt, bw, bh) {
    if (!img || !img.naturalWidth || !W) return;
    var k = img.naturalWidth / W;
    var salto = bh * 1.7;
    var da = (bt > H * 0.55) ? bt - salto : bt + salto;
    if (da < 0) da = bt + salto;
    if (da + bh > H) da = bt - salto;
    ctx.drawImage(img,
      bl * k, da * k, bw * k, bh * k,
      bl, bt, bw, bh);
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


    /* I NOMI DELLE CITTA' SUL TELEFONO — cancellati e riscritti.

       Nella carta pin ed etichette sono STAMPATI dentro l'immagine, a una
       misura pensata per mille pixel di larghezza. A trecentosettantacinque
       diventano macchioline da dieci pixel con sotto un nome da quattro: non
       si legge e non si prende col dito. E una carta con otto nomi
       illeggibili e' peggio di una senza nomi, perche' sembra rotta.

       Non basta scriverci sopra: finche' la targhetta nuova deve COPRIRE
       quella stampata resta incollata al suo pin, e i pin stanno tutti su
       una diagonale di due dita — i nomi si ammassano l'uno sull'altro.

       Quindi prima si CANCELLA. Ogni etichetta stampata viene coperta con
       una toppa del colore della carta li' intorno, presa campionando
       l'immagine vera: la carta e' servita dallo stesso dominio, quindi la
       tela si puo' leggere. Cancellate quelle, i nomi si possono mettere
       dove c'e' spazio — il mare a sud-ovest, la pianura a nord-est — e un
       filo sottile li lega al loro punto. Le posizioni sono scelte a mano in
       genera-zone.js (nx, ny): distribuirle a occhio e' esattamente il
       lavoro che un algoritmo qui farebbe peggio. */
    if (piccolo.matches) {
      /* Le toppe per prime, sotto a tutto il resto */
      var carta = guscio.querySelector('img');
      aree.forEach(function (z) {
        toppa(ctx, carta, z.offsetLeft - 1, z.offsetTop - 1, z.offsetWidth + 2, z.offsetHeight + 2);
      });

      ctx.textBaseline = 'middle';
      ctx.font = '600 11px Poppins, system-ui, sans-serif';

      aree.forEach(function (z, i) {
        var x = parseFloat(z.dataset.fx) * W;
        var y = parseFloat(z.dataset.fy) * H;
        var sceltoLui = i === scelta;
        var nome = z.dataset.carta || '';

        var testo = ctx.measureText(nome).width;
        var larga = testo + 18;
        var alta = 19;
        var px = Math.max(1, Math.min(W - 1 - larga, parseFloat(z.dataset.nx) * W));
        var py = Math.max(1, Math.min(H - 1 - alta, parseFloat(z.dataset.ny) * H));

        /* Il filo parte dal bordo della targhetta piu' vicino al punto, non
           dal suo centro: se no attraversa la targhetta stessa */
        var ax = Math.max(px, Math.min(px + larga, x));
        var ay = Math.max(py, Math.min(py + alta, y));
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(x, y);
        ctx.strokeStyle = sceltoLui ? '#ff6b57' : 'rgba(255,255,255,.85)';
        ctx.lineWidth = sceltoLui ? 1.8 : 1.2;
        ctx.stroke();

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(px, py, larga, alta, alta / 2);
        else ctx.rect(px, py, larga, alta);   /* iOS vecchi: spigoli vivi, ma si legge */
        ctx.fillStyle = sceltoLui ? '#ff6b57' : 'rgba(255,255,255,.97)';
        ctx.fill();
        ctx.strokeStyle = sceltoLui ? '#ff6b57' : 'rgba(21,28,100,.20)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = sceltoLui ? '#fff' : '#1a2270';
        ctx.fillText(nome, px + 9, py + alta / 2 + 0.5);

        /* Il punto vero della zona, dove sta la citta' */
        ctx.beginPath();
        ctx.arc(x, y, sceltoLui ? 5.5 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = sceltoLui ? '#ff6b57' : '#fff';
        ctx.fill();
        ctx.strokeStyle = sceltoLui ? '#fff' : '#ff6b57';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      /* Sul pin scelto un anello che si allarga. Sul desktop a dire quale
         zona si sta guardando basta il dito fermo sopra; qui il dito se ne
         va subito dopo il tocco, e senza un segno che resta la carta torna
         muta appena si alza il dito */
      if (scelta >= 0 && aree[scelta]) {
        var sx = parseFloat(aree[scelta].dataset.fx) * W;
        var sy = parseFloat(aree[scelta].dataset.fy) * H;
        var eco = fermo ? 0.5 : (t % 1800) / 1800;
        ctx.beginPath();
        ctx.arc(sx, sy, 10 + eco * 26, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 107, 87, ' + (0.85 * (1 - eco)).toFixed(3) + ')';
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }
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


  /* ─ IL TELEFONO: toccare al posto di passarci sopra ────────────
     La carta e' la stessa e si vede tutta, come sul desktop: quello che
     manca sul telefono e' il passaggio del dito, cioe' il gesto con cui si
     accende un arco e si apre la scheda di una zona. Qui lo fa il tocco.
     Il primo tocco su un pin sceglie la zona — scheda aperta, arco acceso,
     anello intorno al pin, e la riga di quella zona nell'elenco qui sotto
     che si accende e si porta sotto gli occhi. Il secondo tocco sullo
     stesso pin apre la pagina: un pin che porta via al primo tocco toglie
     l'unico modo che c'e' di guardarsi la carta. */
  var elenco = document.querySelector('.zn-zone');
  var righe = elenco ? Array.prototype.slice.call(elenco.querySelectorAll('.zn-zona')) : [];
  var piccolo = window.matchMedia('(max-width: 720px)');
  var scelta = -1;

  /* Pin e righe vengono dalla stessa lista di zone, ma il legame si fa per
     nome: legarli per posizione vuol dire che il giorno che uno dei due
     elenchi cambia ordine la carta indica la zona sbagliata senza dirlo */
  function rigaDi(i) {
    var slug = aree[i] && aree[i].dataset.zona;
    for (var k = 0; k < righe.length; k++) if (righe[k].dataset.zona === slug) return righe[k];
    return null;
  }

  function scegli(i) {
    if (i < 0 || i >= aree.length) return;
    scelta = i;
    aree.forEach(function (a, k) { a.classList.toggle('mp-attiva', k === i); });
    righe.forEach(function (r) { r.classList.remove('zn-attiva'); });
    /* La riga si accende ma la pagina NON si muove. Fra la carta e
       l'elenco ci sono la coppia di bottoni e un titolo: portare la riga
       sotto gli occhi vorrebbe dire buttare fuori schermo la carta appena
       toccata, cioe' rispondere a un tocco portando via quello che si sta
       guardando. La risposta immediata la danno la scheda che si apre,
       l'arco che si accende e l'anello sul pin; il segno sulla riga sta
       li' per quando si scende. */
    var r = rigaDi(i);
    if (r) r.classList.add('zn-attiva');
    attivo = archi[i];
    if (fermo) disegna(performance.now());
  }

  aree.forEach(function (a, k) {
    a.addEventListener('click', function (e) {
      if (!piccolo.matches || scelta === k) return;
      e.preventDefault();
      scegli(k);
    });
  });

  /* Tornando al desktop il segno resta appeso a una zona che nessuno ha
     piu' scelto: si spegne tutto e comanda di nuovo il passaggio del dito */
  function assetto() {
    if (piccolo.matches) return;
    scelta = -1;
    attivo = null;
    aree.forEach(function (a) { a.classList.remove('mp-attiva'); });
    righe.forEach(function (r) { r.classList.remove('zn-attiva'); });
  }

  if (piccolo.addEventListener) piccolo.addEventListener('change', assetto);
  else if (piccolo.addListener) piccolo.addListener(assetto);

  var attesa;
  window.addEventListener('resize', function () {
    clearTimeout(attesa);
    attesa = setTimeout(function () { misura(); disegna(performance.now()); }, 120);
  });

  var laCarta = guscio.querySelector('img');
  if (laCarta && !laCarta.complete) laCarta.addEventListener('load', function () { disegna(performance.now()); });

  misura();
  disegna(performance.now());
  occhio.observe(guscio);
})();
