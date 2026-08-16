/* ── Domande frequenti ────────────────────────────
   PERCHE' NON CARICA script.js. Quel file e' la macchina della home:
   si aspetta il loader, il video dell'apertura, i capitoli del tunnel,
   Lenis e ScrollTrigger, e da' per scontato che quegli elementi ci
   siano. Su questa pagina non esistono. Tirarselo dietro per riusarne
   trenta righe vorrebbe dire caricare 63 KB e sperare che ogni pezzo
   mancante venga gestito con garbo — cosa che nessuno ha mai
   verificato, perche' finora non serviva.

   Qui invece serve solo questo: accorgersi dello scorrimento, aprire
   il menu sul telefono e accendere le due tele dell'apertura.

   Le tele NON sono ridisegnate qui: caustiche.js e pesci.js sono gli
   stessi file della sezione contatti della home. Sono nati come
   funzioni proprio per essere chiamati da piu' pagine con opzioni
   diverse, ed e' l'unico motivo per cui questa pagina puo' avere lo
   stesso mare senza una riga di grafica duplicata. */
(function () {
  'use strict';

  /* ─ Header: ombra quando la pagina si e' mossa ─ */
  const hdr = document.getElementById('hdr');

  if (hdr) {
    const guarda = () => hdr.classList.toggle('scrolled', window.scrollY > 40);
    guarda();
    window.addEventListener('scroll', guarda, { passive: true });
  }

  /* ─ Menu del telefono ─
     Stesse classi della home ('open' su nav e sul pulsante), cosi' lo
     stile arriva da style.css e non c'e' un secondo aspetto da tenere
     allineato al primo */
  const burger = document.getElementById('hamburger');
  const nav = document.getElementById('main-nav');

  if (burger && nav) {
    const chiudi = () => {
      nav.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Apri menu');
    };

    burger.addEventListener('click', () => {
      const aperto = nav.classList.toggle('open');
      burger.classList.toggle('open', aperto);
      burger.setAttribute('aria-expanded', aperto ? 'true' : 'false');
      burger.setAttribute('aria-label', aperto ? 'Chiudi menu' : 'Apri menu');
    });

    /* Toccato un collegamento il menu deve sparire: i primi cinque
       portano a un'ancora della home, ma l'ultimo apre WhatsApp in
       un'altra scheda e al ritorno si troverebbe il menu ancora
       spalancato sopra la pagina */
    nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', chiudi));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        chiudi();
      }
    });
  }

  /* ─ Ricerca fra le domande ─ */
  const campo = document.getElementById('fq-campo');
  const pulisci = document.getElementById('fq-pulisci');
  const vuoto = document.getElementById('fq-vuoto');
  const gruppi = Array.from(document.querySelectorAll('.fq-gruppo'));
  const domande = Array.from(document.querySelectorAll('.fq-d'));

  /* Senza accenti e in minuscolo da tutte e due le parti: chi cerca di
     fretta scrive "qualita" e "perche", e una ricerca che non trova
     "qualità" per colpa di un accento sembra semplicemente rotta */
  const piatto = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (campo && vuoto) {
    /* Il testo di ogni domanda si legge UNA volta sola: rileggere il
       DOM a ogni tasto premuto vuol dire ventitre' letture per
       carattere digitato, per un contenuto che non cambia mai */
    const indicizzate = domande.map((d) => ({
      el: d,
      testo: piatto(d.textContent || ''),
      /* I <details> hanno name= per aprirsi uno alla volta dentro il
         gruppo. Durante la ricerca il nome va tolto, se no aprire i
         risultati ne apre uno e chiude gli altri: il browser applica
         l'esclusivita' anche quando siamo noi ad aprirli */
      nome: d.getAttribute('name') || ''
    }));

    const filtra = () => {
      const q = piatto(campo.value.trim());
      pulisci.hidden = q === '';

      if (q === '') {
        indicizzate.forEach((v) => {
          v.el.removeAttribute('data-fuori');
          v.el.open = false;
          if (v.nome) v.el.setAttribute('name', v.nome);
        });
        gruppi.forEach((g) => g.removeAttribute('data-fuori'));
        vuoto.hidden = true;
        return;
      }

      let trovate = 0;

      indicizzate.forEach((v) => {
        const dentro = v.testo.includes(q);
        v.el.toggleAttribute('data-fuori', !dentro);
        v.el.removeAttribute('name');
        /* Chi cerca vuole leggere, non cliccare ancora: i risultati si
           aprono gia' aperti */
        v.el.open = dentro;
        if (dentro) trovate++;
      });

      /* Un gruppo senza piu' domande sparisce con la sua intestazione:
         un titolo con sotto il vuoto sembra un pezzo di pagina rotto */
      gruppi.forEach((g) => {
        const restano = g.querySelectorAll('.fq-d:not([data-fuori])').length;
        g.toggleAttribute('data-fuori', restano === 0);
      });

      vuoto.hidden = trovate > 0;
    };

    campo.addEventListener('input', filtra);

    pulisci.addEventListener('click', () => {
      campo.value = '';
      filtra();
      campo.focus();
    });

    campo.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && campo.value !== '') {
        campo.value = '';
        filtra();
      }
    });
  }

  /* ─ Arrivare da un collegamento diretto a una domanda ─
     Ogni domanda ha il suo indirizzo (…/domande-frequenti.html#ordine-minimo)
     e ci si arriva da fuori: da un risultato di ricerca, da un messaggio
     di Marina, da una email. Senza questo si atterra sulla domanda
     giusta ma CHIUSA, e chi arriva vede il titolo di quello che
     cercava e nessuna risposta */
  const apriDaIndirizzo = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    const d = document.getElementById(id);
    if (d && d.tagName === 'DETAILS') {
      d.open = true;
      /* Il salto del browser e' gia' avvenuto sulla domanda chiusa:
         una volta aperta la pagina si e' allungata sotto, quindi va
         ricentrata */
      requestAnimationFrame(() => d.scrollIntoView({ block: 'start', behavior: 'auto' }));
    }
  };

  apriDaIndirizzo();
  window.addEventListener('hashchange', apriDaIndirizzo);

  /* ─ Indice che segue, e filo dell'avanzamento ─ */
  const avanza = document.getElementById('fq-avanza');
  const voci = Array.from(document.querySelectorAll('.fq-indice a'));

  if (avanza || voci.length) {
    /* Un solo ascoltatore per due cose, e il lavoro rimandato al
       fotogramma: lo scorrimento arriva molto piu' fitto di quanto lo
       schermo possa disegnare, e ricalcolare a ogni evento e' fatica
       che nessuno vede */
    let atteso = false;

    const aggiorna = () => {
      atteso = false;

      if (avanza) {
        const corsa = document.documentElement.scrollHeight - window.innerHeight;
        const q = corsa > 0 ? Math.min(1, Math.max(0, window.scrollY / corsa)) : 0;
        avanza.style.width = (q * 100).toFixed(1) + '%';
      }

      if (!voci.length) return;

      /* Il gruppo buono e' l'ULTIMO che ha superato la soglia, non il
         primo visibile: sotto la barra appesa c'e' sempre la coda del
         gruppo precedente, e prendendo il primo visibile l'indice
         indicherebbe una sezione gia' letta */
      const soglia = 160;
      let attivo = null;

      gruppi.forEach((g) => {
        if (g.hasAttribute('data-fuori')) return;
        if (g.getBoundingClientRect().top <= soglia) attivo = g.id;
      });

      voci.forEach((a) => {
        a.classList.toggle('attivo', attivo !== null && a.getAttribute('href') === '#' + attivo);
      });
    };

    const chiedi = () => {
      if (atteso) return;
      atteso = true;
      requestAnimationFrame(aggiorna);
    };

    window.addEventListener('scroll', chiedi, { passive: true });
    window.addEventListener('resize', chiedi, { passive: true });
    /* Anche all'apertura di una domanda: la pagina si allunga sotto i
       piedi e sia il filo sia il gruppo attivo cambiano senza che
       nessuno abbia scrollato */
    domande.forEach((d) => d.addEventListener('toggle', chiedi));
    aggiorna();
  }

  /* ─ Il mare dell'apertura ─ */
  const sfondo = document.getElementById('fq-sfondo');
  const tela = document.getElementById('fq-pesci');

  /* offsetParent nullo = il foglio di stile l'ha spento (sotto i 900px
     la campitura sparisce). Chiederlo al CSS invece di ripetere qui la
     larghezza dello schermo evita che fra un anno la soglia viva in due
     posti e cominci a valere in uno solo */
  const diviso = !!(sfondo && sfondo.offsetParent !== null);

  const mare = diviso && window.DelMarCaustiche
    ? window.DelMarCaustiche(sfondo, { tipo: 'larghe' })
    : null;

  if (tela && window.DelMarPesci) {
    window.DelMarPesci(tela, {
      /* Senza campitura il confine e' negativo e il banco resta tutto
         della livrea chiara: e' cosi' che si comporta anche la home
         sul telefono */
      /* Taglia, velatura, numero e bravura NON stanno qui: sono i
         default di pesci.js, perche' sono gli stessi pesci della home.
         Ripeterli qui vorrebbe dire tenerli allineati a mano */
      confine: (y) => (mare ? mare.confine(y) : -1),
      stile: 4
    });
  }
})();
