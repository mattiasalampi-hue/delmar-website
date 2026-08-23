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

  /* DOVE STA LA TARGHETTA DI OGNI ZONA.
     Il conto sta in un posto solo perche' serve a due cose che DEVONO
     coincidere: disegnare il nome, e mettere sotto al nome l'area che
     riceve il tocco. Finche' le targhette erano disegnate sulla tela e
     l'area sensibile restava al pin, si toccava il nome e non succedeva
     niente — quello che si vede non era quello che si tocca. */
  function targhetta(z, ctx) {
    var testo = ctx.measureText(z.dataset.carta || '').width;
    var x = parseFloat(z.dataset.fx) * W;
    /* Il rettangolo dell'etichetta stampata, che la targhetta deve coprire */
    var bl = parseFloat(z.dataset.bx) * W;
    var br = bl + parseFloat(z.dataset.bw) * W;
    var bt = parseFloat(z.dataset.by) * H;
    var bh = parseFloat(z.dataset.bh) * H;

    /* In verticale la targhetta si CENTRA sull'etichetta invece di
       appendersi al pin: cosi' la copre anche dove il pin non e' al centro
       del suo rettangolo (Parma), e resta alta uguale per tutte */
    var alta = Math.max(18, bh + 2);
    var py = bt + bh / 2 - alta / 2;

    /* Il nome esce dal lato deciso in genera-zone.js (lc). Dal lato opposto
       si toglie un pixel invece di aggiungerne: e' il bordo che tocca il
       vicino — La Spezia e Massa hanno i rettangoli attaccati — e un margine
       di cortesia li' diventa una sovrapposizione */
    var sinistra = z.dataset.nomeLato === 'sx';
    var px = sinistra ? Math.min(bl, x - 11 - testo - 9) : bl + 1;
    var pr = sinistra ? br - 1 : Math.max(br, x + 11 + testo + 9);

    if (pr > W - 1) { px -= pr - (W - 1); pr = W - 1; }
    if (px < 1) px = 1;
    if (py + alta > H - 1) py = H - 1 - alta;
    if (py < 1) py = 1;
    return { px: px, py: py, larga: pr - px, alta: alta, tx: sinistra ? px + 9 : x + 11 };
  }



  /* Lo stile con cui l'area nasce, cioe' il rettangolo sopra l'etichetta
     stampata: e' quello che serve al desktop, dove la carta e' grande e la
     scheda esce al passaggio del dito. Si conserva per rimetterlo. */
  var stiliOriginali = aree.map(function (a) { return a.getAttribute('style'); });

  function posizionaAree() {
    var ctx = tela.getContext('2d');
    ctx.font = '600 11px Poppins, system-ui, sans-serif';
    aree.forEach(function (z, i) {
      if (!piccolo.matches || !W) { z.setAttribute('style', stiliOriginali[i]); return; }
      var t = targhetta(z, ctx);
      z.setAttribute('style',
        'left:' + (t.px / W * 100).toFixed(2) + '%;' +
        'top:' + (t.py / H * 100).toFixed(2) + '%;' +
        'width:' + (t.larga / W * 100).toFixed(2) + '%;' +
        'height:' + (t.alta / H * 100).toFixed(2) + '%');
    });
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


    /* I NOMI DELLE CITTA' SUL TELEFONO — riscritti sopra quelli stampati.

       Nella carta pin ed etichette sono STAMPATI dentro l'immagine, a una
       misura pensata per mille pixel di larghezza. A trecentosettantacinque
       diventano macchioline da dieci pixel con sotto un nome da quattro: non
       si legge e non si prende col dito. E una carta con otto nomi
       illeggibili e' peggio di una senza nomi, perche' sembra rotta.

       Si e' provato a CANCELLARLI per poter poi distribuire i nomi dove c'e'
       spazio. Non si puo', e le due strade lasciano tutte e due un segno:
       una toppa di tinta piatta si vede come un rettangolo che col terreno
       non c'entra niente; copiare un pezzo di carta li' accanto e incollarlo
       sopra duplica le altre scritte della carta — usciva "Pontremoli" due
       volte e un "Carrara" comparso dal nulla. Da un'immagine una scritta
       non si toglie: si copre.

       Quindi ogni targhetta sta ATTACCATA alla sua etichetta stampata e la
       copre, e il nome esce a destra o a sinistra del punto a seconda di
       chi ha per vicino (lc in genera-zone.js). Ci stanno tutte e otto senza
       toccarsi perche' i nomi sono CORTI — "La Spezia", non "La Spezia e Val
       di Magra": coi nomi lunghi Lucca da sola occupava centoventi pixel su
       trecentosettantacinque. Restano vicine come sono vicine le citta'.

       L'area che riceve il tocco viene spostata SOPRA la targhetta da
       posizionaAree(): quello che si vede dev'essere quello che si tocca. */
    if (piccolo.matches) {
      ctx.textBaseline = 'middle';
      ctx.font = '600 11px Poppins, system-ui, sans-serif';

      aree.forEach(function (z, i) {
        var x = parseFloat(z.dataset.fx) * W;
        var y = parseFloat(z.dataset.fy) * H;
        var sceltoLui = i === scelta;
        var nome = z.dataset.carta || '';

        var t2 = targhetta(z, ctx);
        var px = t2.px, py = t2.py, larga = t2.larga, alta = t2.alta;

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(px, py, larga, alta, alta / 2);
        else ctx.rect(px, py, larga, alta);   /* iOS vecchi: spigoli vivi, ma si legge */
        ctx.fillStyle = sceltoLui ? '#ff6b57' : 'rgba(255,255,255,.97)';
        ctx.fill();
        ctx.strokeStyle = sceltoLui ? '#ff6b57' : 'rgba(21,28,100,.20)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = sceltoLui ? '#fff' : '#1a2270';
        ctx.fillText(nome, t2.tx, py + alta / 2 + 0.5);

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

  function cambiaDisposizione() { assetto(); posizionaAree(); disegna(performance.now()); }
  if (piccolo.addEventListener) piccolo.addEventListener('change', cambiaDisposizione);
  else if (piccolo.addListener) piccolo.addListener(cambiaDisposizione);

  var attesa;
  window.addEventListener('resize', function () {
    clearTimeout(attesa);
    attesa = setTimeout(function () { misura(); posizionaAree(); disegna(performance.now()); }, 120);
  });

  var laCarta = guscio.querySelector('img');
  if (laCarta && !laCarta.complete) laCarta.addEventListener('load', function () { disegna(performance.now()); });

  misura();
  posizionaAree();
  disegna(performance.now());

  /* Il carattere del sito arriva dopo. Finche' non c'e', measureText misura
     col ripiego di sistema e la targhetta risulta piu' stretta di come poi
     viene disegnata: l'area che riceve il tocco resterebbe piu' corta del
     nome, e le ultime lettere non si potrebbero toccare */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { posizionaAree(); disegna(performance.now()); });
  }
  occhio.observe(guscio);
})();
