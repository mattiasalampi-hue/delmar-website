/* ── Consenso ────────────────────────────────────
   Gestore del consenso per tutto quello che non e' strettamente
   necessario a far funzionare il sito.

   LA REGOLA CHE DECIDE TUTTO: il banner compare SOLO SE c'e' davvero
   qualcosa da autorizzare. Oggi il sito non usa un cookie, non ha
   analytics e non chiama nessun terzo — font e librerie sono serviti dal
   nostro dominio — quindi il banner NON si vede. Chiedere il consenso
   per niente non protegge nessuno: infastidisce e basta, e insegna alla
   gente a cliccare "accetto" senza leggere.

   Il giorno che si aggiunge Analytics o un pixel, si registra qui e il
   banner si accende da solo:

     DelMarConsenso.quando('statistiche', () => {
       // qui dentro il codice che parte SOLO col consenso
     });

   E per gli incorporati (mappe, video di terzi) basta il markup:

     <div data-consenso="marketing"
          data-incorpora="https://..."
          data-etichetta="Mappa di Google"></div>

   Finche' non c'e' consenso non parte NESSUNA richiesta: e' il blocco
   preventivo, ed e' il punto in cui quasi tutti sbagliano — caricare lo
   script e "attivarlo dopo" non vale, la chiamata e' gia' partita.

   Il consenso si ricorda in localStorage e non in un cookie: un cookie
   per ricordare il rifiuto dei cookie e' un cortocircuito che si puo'
   evitare. localStorage per una preferenza tecnica come questa rientra
   fra le cose necessarie. */
(function () {
  const CHIAVE = 'delmar-consenso';
  const VERSIONE = 1;

  /* Le categorie. 'necessari' non compare: non si puo' rifiutare quello
     senza cui il sito non funziona, e fingere di chiederlo e' scorretto */
  const CATEGORIE = {
    statistiche: {
      nome: 'Statistiche',
      spiega: 'Ci dicono quante persone visitano il sito e quali pagine leggono, in forma aggregata. Servono a capire cosa funziona.'
    },
    marketing: {
      nome: 'Marketing e contenuti di terzi',
      spiega: 'Mappe, video e strumenti pubblicitari ospitati da altri. Ricevono il tuo indirizzo IP e possono riconoscerti su altri siti.'
    }
  };

  const attese = { statistiche: [], marketing: [] };
  let scelte = leggi();

  function leggi() {
    try {
      const v = JSON.parse(localStorage.getItem(CHIAVE) || 'null');
      if (v && v.v === VERSIONE && v.scelte) return v.scelte;
    } catch (e) {}
    return null;   /* null = non ha ancora scelto */
  }

  function salva(s) {
    scelte = s;
    try {
      localStorage.setItem(CHIAVE, JSON.stringify({
        v: VERSIONE,
        /* La data serve a dimostrare QUANDO e' stato dato: senza, un
           consenso non e' documentabile */
        data: new Date().toISOString(),
        scelte: s
      }));
    } catch (e) {}
    applica();
  }

  function concesso(cat) { return !!(scelte && scelte[cat]); }

  /* Cosa c'e' davvero da autorizzare su QUESTA pagina */
  function servono() {
    const s = new Set();
    for (const c of Object.keys(CATEGORIE)) {
      if (attese[c].length) s.add(c);
    }
    document.querySelectorAll('[data-consenso]').forEach(el => {
      const c = el.getAttribute('data-consenso');
      if (CATEGORIE[c]) s.add(c);
    });
    return [...s];
  }

  function applica() {
    for (const c of Object.keys(attese)) {
      if (!concesso(c)) continue;
      /* Si toglie dalla coda PRIMA di eseguire: cosi' parte una volta
         sola anche se applica() viene richiamata, e un pezzo che va in
         errore non blocca gli altri */
      while (attese[c].length) {
        const fn = attese[c].shift();
        try { fn(); } catch (e) { console.warn('Consenso: un blocco ha fallito', e); }
      }
    }
    incorpora();
    aggiornaBanner();
  }

  /* ── Incorporati (mappe, video) ──────────────── */
  function incorpora() {
    document.querySelectorAll('[data-consenso][data-incorpora]').forEach(el => {
      const cat = el.getAttribute('data-consenso');
      if (concesso(cat)) {
        if (el.querySelector('iframe')) return;
        const f = document.createElement('iframe');
        f.src = el.getAttribute('data-incorpora');
        f.loading = 'lazy';
        f.title = el.getAttribute('data-etichetta') || 'Contenuto esterno';
        f.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
        el.innerHTML = '';
        el.appendChild(f);
        el.classList.add('cns-acceso');
      } else {
        if (el.querySelector('.cns-segnaposto')) return;
        el.classList.remove('cns-acceso');
        el.innerHTML = '';
        const d = document.createElement('div');
        d.className = 'cns-segnaposto';
        const nome = el.getAttribute('data-etichetta') || 'Contenuto di terzi';
        const p = document.createElement('p');
        p.textContent = nome + ' è ospitato da un altro sito, che riceverebbe il tuo indirizzo IP. Non lo carichiamo senza il tuo consenso.';
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cns-btn cns-btn-si';
        b.textContent = 'Carica ' + nome.toLowerCase();
        /* Consenso puntuale: si accende quella categoria senza costringere
           ad aprire il pannello per una mappa */
        b.addEventListener('click', () => {
          salva(Object.assign({ statistiche: false, marketing: false }, scelte, { [cat]: true }));
        });
        d.append(p, b);
        el.appendChild(d);
      }
    });
  }

  /* ── Banner e pannello ───────────────────────── */
  let banner = null;
  let bannerPer = '';

  function aggiornaBanner() {
    const serve = servono();
    /* Sparisce solo quando la scelta e' gia' stata fatta.
       LA STRISCIA SI VEDE ANCHE SENZA COOKIE (Mattias, 16/08/2026): la
       prima versione compariva solo se c'era qualcosa da autorizzare,
       che tecnicamente e' la cosa giusta — sotto non c'e' niente da
       chiedere. Ma Mattias vuole l'avviso in fondo comunque, ed e' una
       scelta legittima: senza tracciatori quella riga non chiede un
       consenso, INFORMA che i cookie non ci sono, e ha un tasto solo.
       Il "Rifiuta" compare da se' se un domani ci sara' qualcosa da
       rifiutare — vedi striscia(). */
    if (scelte) {
      if (banner) { banner.remove(); banner = null; bannerPer = ''; }
      return;
    }
    /* Se nel frattempo si e' registrata un'ALTRA categoria, il banner va
       rifatto. Senza questo controllo vale il primo che arriva: con
       Analytics e un pixel registrati a un istante di distanza, il
       pannello mostrerebbe solo le statistiche e il pixel partirebbe
       senza essere mai stato nominato. E' il tipo di difetto che non da'
       nessun sintomo — semplicemente manca una riga nel pannello */
    const firma = serve.join(',');
    if (banner && firma === bannerPer) return;
    if (banner) banner.remove();
    bannerPer = firma;
    banner = striscia(serve);
    document.body.appendChild(banner);
  }

  /* ── La striscia ─────────────────────────────
     Una riga sottile in fondo, non un riquadro che copre la pagina:
     e' quello che ha chiesto Mattias, ed e' anche giusto quando non c'e'
     quasi niente da dire.

     CAMBIA DA SOLA quando arrivano i tracciatori. Senza niente da
     autorizzare e' un avviso e basta: un solo tasto "Ok", perche' non
     c'e' nulla da rifiutare. Appena si registra qualcosa compare
     "Rifiuta" accanto a "Ok", della stessa misura e con lo stesso
     contorno — un avviso col solo Ok davanti a cookie veri e' il modello
     che viene contestato, perche' la scelta non e' libera se una delle
     due strade non c'e'.
     Chi vuole scegliere per categoria apre il pannello da "Preferenze". */
  function apriPannello(cats, ripensamento) {
    const p = costruisci(cats, ripensamento);
    document.body.appendChild(p);
    return p;
  }

  function striscia(cats) {
    const w = document.createElement('div');
    w.className = 'cns-striscia';
    w.setAttribute('role', 'region');
    w.setAttribute('aria-label', 'Avviso sui cookie');

    const t = document.createElement('p');
    t.className = 'cns-riga';
    t.innerHTML = cats.length
      ? 'Usiamo strumenti di statistica e contenuti di terzi. '
        + '<a href="privacy.html">Informativa</a>'
      : 'Questo sito non usa cookie di profilazione. '
        + '<a href="privacy.html">Informativa</a>';

    const tasti = document.createElement('div');
    tasti.className = 'cns-tasti';

    if (cats.length) {
      const pref = document.createElement('button');
      pref.type = 'button';
      pref.className = 'cns-mini cns-mini-link';
      pref.textContent = 'Preferenze';
      pref.addEventListener('click', () => { chiudi(w); apriPannello(cats, false); });

      const no = document.createElement('button');
      no.type = 'button';
      no.className = 'cns-mini';
      no.textContent = 'Rifiuta';
      no.addEventListener('click', () => {
        chiudi(w);
        salva({ statistiche: false, marketing: false });
      });
      tasti.append(pref, no);
    }

    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'cns-mini cns-mini-ok';
    ok.textContent = 'Ok';
    ok.addEventListener('click', () => {
      chiudi(w);
      const s = { statistiche: false, marketing: false };
      cats.forEach(k => { s[k] = true; });
      salva(s);
    });
    tasti.appendChild(ok);

    w.append(t, tasti);
    return w;
  }

  function costruisci(cats, ripensamento) {
    const w = document.createElement('div');
    w.className = 'cns-fondo';
    w.setAttribute('role', 'dialog');
    w.setAttribute('aria-label', 'Consenso');

    const box = document.createElement('div');
    box.className = 'cns-box';

    const t = document.createElement('p');
    t.className = 'cns-titolo';
    t.textContent = 'Prima di continuare';
    const p = document.createElement('p');
    p.className = 'cns-testo';
    p.innerHTML = 'Il sito funziona senza cookie di profilazione. Alcune parti però si appoggiano a servizi esterni: puoi decidere tu se attivarle. '
      + '<a href="privacy.html">Leggi l\'informativa</a>.';
    box.append(t, p);

    const scelteEl = {};
    cats.forEach(c => {
      const r = document.createElement('label');
      r.className = 'cns-voce';
      const i = document.createElement('input');
      i.type = 'checkbox';
      /* MAI preselezionato: una casella gia' spuntata non e' un consenso,
         e' un consenso presunto — che non vale */
      i.checked = ripensamento ? concesso(c) : false;
      const d = document.createElement('span');
      d.innerHTML = '<b>' + CATEGORIE[c].nome + '</b><br>' + CATEGORIE[c].spiega;
      r.append(i, d);
      box.appendChild(r);
      scelteEl[c] = i;
    });

    const barra = document.createElement('div');
    barra.className = 'cns-barra';

    /* "Rifiuta" ha lo stesso peso visivo di "Accetta" — pieno, stessa
       misura, stesso contrasto — perche' un rifiuto reso piu' difficile
       da premere non e' una scelta libera */
    const no = document.createElement('button');
    no.type = 'button';
    no.className = 'cns-btn cns-btn-no';
    no.textContent = 'Rifiuta tutto';
    no.addEventListener('click', () => {
      chiudi(w);
      salva({ statistiche: false, marketing: false });
    });

    const sel = document.createElement('button');
    sel.type = 'button';
    sel.className = 'cns-btn';
    sel.textContent = 'Salva le scelte';
    sel.addEventListener('click', () => {
      const s = { statistiche: false, marketing: false };
      cats.forEach(c => { s[c] = scelteEl[c].checked; });
      chiudi(w);
      salva(s);
    });

    const si = document.createElement('button');
    si.type = 'button';
    si.className = 'cns-btn cns-btn-si';
    si.textContent = 'Accetta tutto';
    si.addEventListener('click', () => {
      const s = { statistiche: false, marketing: false };
      cats.forEach(c => { s[c] = true; });
      chiudi(w);
      salva(s);
    });

    barra.append(no, sel, si);
    box.appendChild(barra);
    w.appendChild(box);
    return w;
  }

  function chiudi(el) {
    el.classList.add('cns-via');
    setTimeout(() => el.remove(), 260);
    if (el === banner) { banner = null; bannerPer = ''; }
  }

  /* ── Interfaccia pubblica ────────────────────── */
  window.DelMarConsenso = {
    /* Registra del codice che deve partire SOLO col consenso. Se il
       consenso c'e' gia' parte subito, se no resta in attesa */
    quando(cat, fn) {
      if (!CATEGORIE[cat]) { console.warn('Consenso: categoria sconosciuta', cat); return; }
      if (concesso(cat)) { try { fn(); } catch (e) {} return; }
      attese[cat].push(fn);
      aggiornaBanner();
    },
    /* Riapre il pannello per cambiare idea: va messo un link nel piede,
       perche' il consenso deve essere revocabile con la stessa facilita'
       con cui e' stato dato */
    apri() {
      const cats = servono();
      if (!cats.length) {
        const w = document.createElement('div');
        w.className = 'cns-fondo';
        const box = document.createElement('div');
        box.className = 'cns-box';
        box.innerHTML = '<p class="cns-titolo">Nessun consenso da gestire</p>'
          + '<p class="cns-testo">Questo sito non usa cookie di profilazione e non carica servizi di terzi: '
          + 'non c\'è niente da autorizzare o revocare. I dettagli sono nell\'<a href="privacy.html">informativa</a>.</p>';
        const b = document.createElement('div');
        b.className = 'cns-barra';
        const c = document.createElement('button');
        c.type = 'button';
        c.className = 'cns-btn cns-btn-si';
        c.textContent = 'Ho capito';
        c.addEventListener('click', () => chiudi(w));
        b.appendChild(c);
        box.appendChild(b);
        w.appendChild(box);
        document.body.appendChild(w);
        return;
      }
      if (banner) chiudi(banner);
      apriPannello(cats, true);
    },
    stato() { return scelte ? Object.assign({}, scelte) : null; },
    /* Per le prove: dimentica la scelta e ricomincia */
    dimentica() {
      try { localStorage.removeItem(CHIAVE); } catch (e) {}
      scelte = null;
      applica();
    }
  };

  function via() {
    incorpora();
    aggiornaBanner();
    document.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('[data-apri-consenso]');
      if (a) { e.preventDefault(); window.DelMarConsenso.apri(); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', via);
  else via();
})();
