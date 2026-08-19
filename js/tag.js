/* ── Tag pubblicitari ─────────────────────────────
   Google Ads, Meta e Analytics 4, tutti dietro al consenso.

   PERCHE' QUESTO FILE ESISTE ANCHE SE OGGI NON FA NIENTE. Gli
   identificativi qui sotto sono vuoti, e finche' restano vuoti il file
   NON registra niente, NON carica niente e il banner del consenso resta
   invisibile — cioe' il sito si comporta esattamente come si comporta
   oggi. Il giorno che arriva un identificativo lo si incolla qui e si
   accende tutto da solo, senza toccare altro. Un solo posto da
   cambiare, invece di quattro pagine con lo script incollato dentro.

   NON caricare mai questi tag fuori da DelMarConsenso.quando(): il
   blocco preventivo e' il punto in cui quasi tutti sbagliano. Caricare
   lo script e "attivarlo dopo" non vale niente — la chiamata al server
   di Google e' gia' partita, con dentro l'indirizzo IP di chi legge.

   Gli eventi non si inventano qui: il sito conta gia' da solo i clic su
   WhatsApp, sul telefono e l'invio del modulo per il pannello di casa.
   Qui quegli stessi eventi vengono ripetuti alle piattaforme, cosi' i
   numeri si confrontano invece di essere due misure scollegate. */
(function () {
  'use strict';

  /* ══ DA COMPILARE ══════════════════════════════
     Basta incollare l'identificativo fra gli apici. Quelli lasciati
     vuoti restano spenti: si puo' accendere solo Google e lasciare Meta
     per dopo, o viceversa. */
  const ID = {
    /* Google Ads — account DelMar 217-296-9580 (l'UNICO: profilo
       pagamenti LE DELIZIE DEL MARE S.R.L.). Azione di conversione
       "Contatto dal sito (WhatsApp, telefono, modulo)", creata il
       19/08/2026 */
    ads: 'AW-18393310440',
    /* L'etichetta della singola conversione, che Google da' insieme
       all'identificativo. Va incollata INTERA, compreso il pezzo
       prima della barra */
    adsConversione: 'AW-18393310440/7vnsCJHcs-QcEOjJzsJE',
    /* Google Analytics 4 — la proprieta' di DelMar esiste gia' ed e'
       G-1VCGM6PY73. Lasciata vuota di proposito: prima di accenderla,
       leggere la nota in fondo a questo file */
    ga4: '',
    /* Meta (Instagram e Facebook) — Gestione eventi > Origini dati.
       E' un numero lungo, senza lettere */
    meta: ''
  };

  /* ══ MODALITA' DEL CONSENSO GOOGLE ═════════════
     'base'     — nessuna chiamata a Google prima del si'. E' quello che
                  il sito promette oggi in privacy.
     'avanzata' — il tag si carica subito e manda a Google un segnale
                  senza cookie anche da chi rifiuta. Serve a UNA cosa
                  sola: far stimare a Google le conversioni di chi non
                  accetta. Quella stima pero' si accende solo sopra
                  soglie di traffico alte (centinaia di clic a
                  settimana): sotto, si paga il costo — una chiamata a
                  Google per ogni visitatore — senza ricevere il
                  beneficio.
     Si cambia questa riga, e va cambiata anche la pagina privacy: in
     'avanzata' la frase "il tuo indirizzo IP non viene comunicato a
     nessun altro" diventa falsa. */
  const MODALITA = 'base';

  /* ── Da qui in giu' non serve toccare niente ── */

  const attivi = {
    google: !!(ID.ads || ID.ga4),
    meta: !!ID.meta
  };

  if (!attivi.google && !attivi.meta) return;   /* niente da caricare */

  if (!window.DelMarConsenso) {
    /* Senza il gestore del consenso NON si carica niente lo stesso:
       meglio nessun dato che un dato raccolto senza permesso */
    return;
  }

  /* ── Consent Mode v2 ──────────────────────────
     Obbligatorio per la personalizzazione degli annunci nello Spazio
     economico europeo: senza, le liste di remarketing restano vuote
     anche con il pixel installato.
     I quattro segnali partono NEGATI. 'wait_for_update' dice a Google
     di aspettare mezzo secondo prima di decidere: e' il tempo che serve
     al gestore del consenso per dire la sua se la scelta era gia' stata
     fatta in una visita precedente. */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  if (attivi.google) {
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500
    });
  }

  function caricaScript(src) {
    const s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
    return s;
  }

  let googlePronto = false;

  function avviaGoogle() {
    if (googlePronto) return;
    googlePronto = true;
    caricaScript('https://www.googletagmanager.com/gtag/js?id=' + (ID.ads || ID.ga4));
    gtag('js', new Date());
    if (ID.ads) gtag('config', ID.ads);
    if (ID.ga4) gtag('config', ID.ga4, { anonymize_ip: true });
  }

  /* In modalita' avanzata il tag si carica subito, ma con tutti i
     permessi negati: e' proprio questo che permette il segnale senza
     cookie. In base non parte finche' non c'e' il si' */
  if (attivi.google && MODALITA === 'avanzata') avviaGoogle();

  /* ── Meta ─────────────────────────────────────
     Nessuna modalita' "senza cookie": o c'e' il consenso o non si
     carica. Per questo sta solo dentro quando('marketing') */
  function avviaMeta() {
    if (window.fbq) return;
    /* Lo stub ufficiale, riscritto leggibile: raccoglie le chiamate
       fatte prima che la libreria arrivi e le rigioca dopo */
    const n = window.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    caricaScript('https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', ID.meta);
    window.fbq('track', 'PageView');
  }

  /* ── Chi si accende con quale consenso ────────
     'statistiche' = misurare quanta gente arriva.
     'marketing'   = pubblicita' e liste di remarketing.
     Google Ads sta in 'marketing' anche quando serve solo a contare le
     conversioni: il dato finisce comunque in un sistema pubblicitario,
     e chiamarlo statistica sarebbe una furbizia. */
  if (ID.ga4) {
    window.DelMarConsenso.quando('statistiche', function () {
      avviaGoogle();
      gtag('consent', 'update', { analytics_storage: 'granted' });
    });
  }

  if (ID.ads) {
    window.DelMarConsenso.quando('marketing', function () {
      avviaGoogle();
      gtag('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted'
      });
    });
  }

  if (ID.meta) {
    window.DelMarConsenso.quando('marketing', avviaMeta);
  }

  /* ── Gli eventi ───────────────────────────────
     Il sito conta gia' tutto per conto suo con DelMarEvento. Invece di
     riscrivere gli stessi ascoltatori — che vorrebbe dire due elenchi
     di selettori da tenere allineati, e prima o poi ne cambia uno solo
     — qui si avvolge la funzione esistente: quello che il pannello
     registra e' esattamente quello che arriva alle piattaforme.

     Un ristoratore che ha bisogno di pesce per domani NON compila un
     modulo: chiama, o scrive su WhatsApp. Se si contassero solo gli
     invii del modulo, la campagna sembrerebbe fallita mentre sta
     funzionando. */
  const CONVERSIONI = {
    'modulo-inviato': { meta: 'Lead', valore: 'richiesta dal modulo' },
    'whatsapp':       { meta: 'Contact', valore: 'clic su WhatsApp' },
    'telefono':       { meta: 'Contact', valore: 'clic sul telefono' },
    'email':          { meta: 'Contact', valore: 'clic su email' }
  };

  function inoltra(nome) {
    const c = CONVERSIONI[nome];
    if (!c) return;

    if (ID.adsConversione && googlePronto) {
      gtag('event', 'conversion', { send_to: ID.adsConversione });
    }
    if (window.fbq) {
      window.fbq('track', c.meta, { content_name: c.valore });
    }
  }

  /* analitica.js e' caricato con defer e definisce DelMarEvento quando
     tocca a lui. Si avvolge dopo, a documento pronto, se no si
     avvolgerebbe la funzione vuota che sta li' come segnaposto */
  function agganciaEventi() {
    const originale = window.DelMarEvento;
    if (typeof originale !== 'function') return;
    window.DelMarEvento = function (nome) {
      try { originale.apply(this, arguments); } finally { inoltra(nome); }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', agganciaEventi);
  } else {
    agganciaEventi();
  }
})();

/* ── NOTA SU GOOGLE ANALYTICS 4 ────────────────────
   La proprieta' G-1VCGM6PY73 esiste, ma il sito ne ha una sua che
   misura il 100% dei visitatori senza cookie e senza consenso. GA4
   misurera' solo chi accetta — fra il 40 e il 60% — e non un campione
   casuale: chi rifiuta i cookie e' sistematicamente diverso da chi
   accetta.
   Quando i due numeri non coincideranno, e non coincideranno, quello
   giusto e' il nostro. GA4 ha senso per le funzioni che il pannello di
   casa non ha (pubblici, percorsi fra pagine, confronto con Ads), non
   come misura di quanta gente arriva. */
