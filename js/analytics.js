/* ── Google Analytics 4 ──────────────────────────
   Proprietà "del-mar.it", stream "Sito DelMar" (agosto 2026).

   NON PARTE FINCHÉ NON C'È IL CONSENSO, e non è un modo di dire: qui
   dentro non c'è nessun tag, nessuno script di Google e nessuna
   chiamata. Il codice di gtag viene SCARICATO solo dopo il sì, dentro
   la funzione registrata sul gestore del consenso.

   È la differenza che quasi tutti sbagliano. Caricare gtag.js e poi
   "disattivarlo" con la modalità consenso non vale: il file è già stato
   chiesto a googletagmanager.com, quindi l'indirizzo IP del visitatore è
   già arrivato a Google prima che qualcuno dicesse sì. Bloccare PRIMA è
   l'unica cosa che regge.

   Se un domani si volesse passare alla modalità consenso di Google —
   perché serve alle campagne pubblicitarie — allora sì che gtag va
   caricato subito con tutto negato per impostazione predefinita. Ma
   allora va anche scritto nell'informativa, perché a quel punto una
   chiamata a Google parte comunque. */
(function () {
  const ID = 'G-1VCGM6PY73';

  if (!window.DelMarConsenso) {
    /* Senza il gestore non si parte: meglio nessuna statistica che una
       raccolta senza consenso */
    console.warn('Analytics: gestore del consenso assente, non parto');
    return;
  }

  window.DelMarConsenso.quando('statistiche', function () {
    /* Da qui in poi siamo DOPO il sì */
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;

    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    document.head.appendChild(s);

    gtag('js', new Date());
    gtag('config', ID, {
      /* La pagina si è già caricata quando arriva il consenso: senza
         questo, la prima visualizzazione non verrebbe mai contata e i
         numeri sarebbero sistematicamente più bassi del vero */
      send_page_view: true,
      /* Niente pubblicità: non facciamo campagne e non vogliamo che i
         dati finiscano nei segmenti di remarketing. Si riaccende il
         giorno che parte una campagna, non prima */
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
  });
})();
