/* ── Analitica di casa ───────────────────────────
   Manda la visita al nostro server e basta: nessun cookie, nessuna
   chiamata a terzi. Per questo NON passa dal gestore del consenso —
   non c'e' niente da autorizzare e l'indirizzo IP non viene conservato
   (vedi analitica/comune.php).

   L'UNICA cosa che finisce sul dispositivo e' il segno di esclusione
   qui sotto, e ci finisce solo se sei tu ad averlo chiesto aprendo
   ?nonseguire=1. E' il contrario di un identificativo: serve a NON
   essere contati, quindi non ha bisogno di consenso.

   Se un domani si aggiungesse un cookie o un identificativo
   persistente di chi naviga, questa esenzione cadrebbe e andrebbe
   messa dietro il consenso come tutto il resto. E' il confine da non
   superare distrattamente.

   Pesa poco piu' di un chilobyte e non blocca niente: usa sendBeacon,
   che consegna il dato anche mentre la pagina si sta chiudendo. */
(function () {
  var VIA = '/raccogli.php';
  var SEGNO = 'delmar-nonseguire';

  /* Esclusione. Su un sito con poche decine di visite al giorno, chi
     ci lavora che se lo riguarda dieci volte e' rumore che copre il
     segnale: aprendo ?nonseguire=1 quel browser smette di contare,
     ?nonseguire=0 lo rimette dentro */
  try {
    var voluto = new URLSearchParams(location.search).get('nonseguire');
    if (voluto === '1') localStorage.setItem(SEGNO, '1');
    else if (voluto === '0') localStorage.removeItem(SEGNO);
    if (localStorage.getItem(SEGNO) === '1') {
      /* Il resto del sito puo' chiamare DelMarEvento: se qui uscissimo
         e basta, la funzione non esisterebbe e il primo clic
         solleverebbe un errore proprio sul browser di chi lavora */
      window.DelMarEvento = function () {};
      return;
    }
  } catch (e) { /* localStorage negato (navigazione privata): si conta */ }

  /* Codice a caso di QUESTA pagina vista. Non identifica nessuno:
     nasce e muore con la scheda, non viene salvato da nessuna parte
     nel browser. Serve solo al server per ritrovare la riga giusta
     quando, uscendo, arriva il conteggio dei secondi */
  var RIF = Math.random().toString(36).slice(2, 12) + Date.now().toString(36).slice(-4);

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
    u: utm(),
    rif: RIF
  });

  /* PERMANENZA. Senza questo si sa solo che qualcuno e' entrato, non
     se ha letto o e' rimbalzato — che su una pagina sola lunga come la
     nostra e' l'unica differenza che conta.

     Si conta solo il tempo a schermo: se la scheda finisce in secondo
     piano il cronometro si ferma, altrimenti mezza giornata di schede
     aperte diventerebbe "lettura appassionata".

     Il colpo parte su 'visibilitychange -> hidden' e NON su 'unload':
     su iOS e Android 'unload' e 'beforeunload' spesso non scattano
     affatto (la scheda viene congelata, non chiusa), e si perderebbero
     proprio le visite da telefono, che qui sono la maggioranza. */
  var acceso = Date.now(), sommati = 0, ultimo = 0;

  function secondi() {
    var tot = sommati + (document.visibilityState === 'visible' ? Date.now() - acceso : 0);
    return Math.round(tot / 1000);
  }

  function riporta() {
    var s = secondi();
    /* Non si rimanda un numero gia' mandato: uno che spegne e riaccende
       lo schermo dieci volte non deve generare dieci colpi uguali */
    if (s < 1 || s === ultimo) return;
    ultimo = s;
    manda({ t: 'd', rif: RIF, s: s });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      sommati += Date.now() - acceso;
      riporta();
    } else {
      acceso = Date.now();
    }
  });
  /* Cintura di sicurezza per i desktop, dove la scheda si chiude sul
     serio senza passare da 'hidden' */
  window.addEventListener('pagehide', riporta);

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
