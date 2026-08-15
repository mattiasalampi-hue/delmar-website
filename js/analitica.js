/* ── Analitica di casa ───────────────────────────
   Manda la visita al nostro server e basta: nessun cookie, niente
   localStorage, nessuna chiamata a terzi. Per questo NON passa dal
   gestore del consenso — non c'e' niente da autorizzare, non si scrive
   nulla sul dispositivo di chi naviga e l'indirizzo IP non viene
   conservato (vedi analitica/comune.php).

   Se un domani si aggiungesse un cookie o un identificativo persistente
   qui dentro, questa esenzione cadrebbe e andrebbe messa dietro il
   consenso come tutto il resto. E' il confine da non superare
   distrattamente.

   Pesa meno di un chilobyte e non blocca niente: usa sendBeacon, che
   consegna il dato anche mentre la pagina si sta chiudendo. */
(function () {
  var VIA = '/raccogli.php';

  function manda(dati) {
    try {
      var testo = JSON.stringify(dati);
      /* sendBeacon: il browser lo consegna per conto suo, anche se la
         pagina viene chiusa nel frattempo. Con una fetch normale
         l'ultima azione prima di uscire si perde — ed e' proprio quella
         che interessa di piu' */
      if (navigator.sendBeacon) {
        navigator.sendBeacon(VIA, new Blob([testo], { type: 'application/json' }));
      } else {
        fetch(VIA, { method: 'POST', body: testo, keepalive: true,
                     headers: { 'Content-Type': 'application/json' } }).catch(function () {});
      }
    } catch (e) { /* mai far cadere la pagina per una statistica */ }
  }

  function utm() {
    var p = new URLSearchParams(location.search), o = {};
    ['source', 'medium', 'campaign'].forEach(function (k) {
      var v = p.get('utm_' + k);
      if (v) o[k] = v.slice(0, 40);
    });
    return o;
  }

  /* La visita. Il percorso senza la parte dopo il punto interrogativo:
     li' dentro finiscono a volte dati di chi naviga, e a noi serve
     sapere quale pagina, non con che coda */
  manda({
    t: 'v',
    p: location.pathname,
    ti: document.title.slice(0, 120),
    r: document.referrer,
    w: window.innerWidth,
    u: utm()
  });

  /* Gli EVENTI: su un sito B2B sono il dato che conta. Le visite dicono
     quanti passano, questi dicono quanti fanno qualcosa.
     Si agganciano da soli a quello che c'e' gia' nella pagina, senza
     dover marcare a mano ogni pulsante */
  function evento(nome, dettaglio) {
    manda({ t: 'e', n: nome, d: dettaglio || '', p: location.pathname });
  }
  window.DelMarEvento = evento;

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a, button');
    if (!a) return;

    var href = a.getAttribute('href') || '';
    if (href.indexOf('wa.me') > -1)        return evento('whatsapp', a.textContent.trim().slice(0, 60));
    if (href.indexOf('tel:') === 0)        return evento('telefono', href.replace('tel:', ''));
    if (href.indexOf('mailto:') === 0)     return evento('email', href.replace('mailto:', ''));
    if (a.classList.contains('ch-cta'))    return evento('cta-hero', a.textContent.trim().slice(0, 60));
  }, true);

  /* Il modulo contatti: si conta quando parte davvero, non al clic sul
     pulsante — un invio fallito non e' un contatto */
  var modulo = document.getElementById('contact-form');
  if (modulo) {
    modulo.addEventListener('submit', function () {
      /* La conferma compare quando il server ha risposto bene: si
         guarda quella, invece di fidarsi del clic */
      var atteso = 0;
      var occhio = setInterval(function () {
        var esito = document.getElementById('form-esito');
        if (esito && !esito.hidden) {
          clearInterval(occhio);
          var scelta = modulo.querySelector('input[name="interesse"]:checked');
          evento('modulo-inviato', scelta ? scelta.value : '');
        }
        if (++atteso > 60) clearInterval(occhio);   /* 30 secondi e basta */
      }, 500);
    });
  }

  /* Quanto in fondo arrivano: su una pagina sola lunga come questa e'
     l'unico modo di sapere se le sezioni in basso le vede qualcuno.
     Si manda UNA volta per soglia e solo alla fine, non a ogni pixel */
  var soglie = [25, 50, 75, 90], viste = {};
  var attesa = null;
  window.addEventListener('scroll', function () {
    clearTimeout(attesa);
    attesa = setTimeout(function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if (h <= 0) return;
      var p = Math.round((window.scrollY / h) * 100);
      soglie.forEach(function (s) {
        if (p >= s && !viste[s]) { viste[s] = 1; evento('profondita', s + '%'); }
      });
    }, 400);
  }, { passive: true });
})();
