/* I FILTRI DEL CATALOGO.

   Le tre domande che prima stavano nel menu — stato, lavorazione, uso in
   cucina — girano qui, nel browser, sui `data-` che genera-catalogo.js
   appiccica a ogni `.ct-voce`. Quali siano lo decide `filtri` dentro
   catalogo.json: questo file non ne conosce i nomi, li legge dalle pillole. Nessuna copia dei dati: quello che si filtra e' esattamente
   quello che si legge in pagina, e le due cose non possono andare fuori
   sincrono.

   DENTRO UN CAMPO E' "O", FRA CAMPI E' "E".
   Chi accende Fresco e Congelato vuole tutti e due, non l'intersezione vuota;
   chi accende Fresco e "Adatto al crudo" vuole il pesce fresco che si serve
   crudo. E' l'unica combinazione che si comporta come uno se l'aspetta, ed e'
   la ragione per cui questi criteri funzionano da filtro e funzionavano male
   da rami del menu: un ramo non si combina con un altro ramo.

   Senza JavaScript la pagina resta il catalogo completo: la barra dei filtri
   non fa niente e non toglie niente. */
(function () {
  'use strict';

  var pannello = document.getElementById('ct-filtri');
  if (!pannello) return;

  var chip = [].slice.call(pannello.querySelectorAll('.ct-fchip'));
  var azzera = document.getElementById('ct-azzera');
  var esito = document.getElementById('ct-esito');
  if (!chip.length) return;

  var voci = [].slice.call(document.querySelectorAll('.ct-voce'));
  var famiglie = [].slice.call(document.querySelectorAll('.ct-famiglia'));
  var scelte = [].slice.call(document.querySelectorAll('.fq-arg'));
  var gruppiVoci = [].slice.call(document.querySelectorAll('.ct-voci'));
  var pillole = [].slice.call(document.querySelectorAll('.fq-indice a'));

  /* I CAMPI SI RICAVANO DALLE PILLOLE, non da un elenco scritto qui.
     Erano otto nomi a mano mentre il server li deriva da `filtri` dentro
     catalogo.json, che oggi ne ha tre. Due liste senza una sorgente comune
     divergono al primo cambio: se qualcuno aggiunge un filtro al JSON, il
     generatore stampa le pillole del campo nuovo, qui `scheda.valori[campo]`
     resta undefined e il primo conteggio muore con "Cannot read properties
     of undefined" — cioe' i filtri smettono di funzionare del tutto, al
     caricamento, senza che nessuno abbia toccato questo file. */
  var CAMPI = [];
  for (var k0 = 0; k0 < chip.length; k0++) {
    var c0 = chip[k0].getAttribute('data-campo');
    if (c0 && CAMPI.indexOf(c0) === -1) CAMPI.push(c0);
  }

  var schede = voci.map(function (el) {
    var valori = {};
    for (var i = 0; i < CAMPI.length; i++) {
      var grezzo = el.getAttribute('data-' + CAMPI[i]);
      valori[CAMPI[i]] = grezzo ? grezzo.split('|') : [];
    }
    return { el: el, valori: valori, famiglia: el.closest('.ct-famiglia') };
  });

  /* Lo stato e' un oggetto campo -> lista di valori accesi. Vuoto vuol dire
     "tutto", non "niente": e' la differenza fra un catalogo che si apre e uno
     che chiede il permesso prima di far vedere qualcosa. */
  var acceso = {};

  function attivi() {
    var n = 0;
    for (var campo in acceso) {
      if (acceso[campo] && acceso[campo].length) n++;
    }
    return n;
  }

  /* passa() con `salta` serve al conteggio delle pillole: per sapere quante
     voci darebbe "Fresco" bisogna misurare ignorando gli altri valori dello
     stesso campo, altrimenti ogni pillola spenta mostrerebbe zero appena se
     ne accende una sorella. */
  function passa(scheda, salta) {
    for (var campo in acceso) {
      if (campo === salta) continue;
      var voluti = acceso[campo];
      if (!voluti || !voluti.length) continue;
      /* `|| []` e non `scheda.valori[campo]` secco: una voce puo' non avere
         quel campo compilato, e un undefined qui fermerebbe tutta la pagina */
      var suoi = scheda.valori[campo] || [];
      var trovato = false;
      for (var i = 0; i < voluti.length && !trovato; i++) {
        if (suoi.indexOf(voluti[i]) > -1) trovato = true;
      }
      if (!trovato) return false;
    }
    return true;
  }

  function conta(campo, valore) {
    var n = 0;
    for (var i = 0; i < schede.length; i++) {
      var suoi = schede[i].valori[campo] || [];
      if (suoi.indexOf(valore) > -1 && passa(schede[i], campo)) n++;
    }
    return n;
  }

  function parola(n) {
    return n + ' ' + (n === 1 ? 'voce' : 'voci');
  }

  function applica() {
    var visibili = 0;
    var perFamiglia = {};

    /* PRIMA E ULTIMA SI SEGNANO A MANO, e non e' un capriccio.
       Il foglio di stile toglie il filo sotto l'ultima voce e l'aria sopra
       la prima con `:last-child` e `:first-child`, che pero' contano i figli
       nel documento e se ne infischiano di `hidden`. Filtrando via l'ultimo
       prodotto di una famiglia restava un filo appeso sotto la riga che
       adesso e' l'ultima. */
    var primaDi = {};
    var ultimaDi = {};

    for (var i = 0; i < schede.length; i++) {
      var ok = passa(schede[i], null);
      schede[i].el.hidden = !ok;
      schede[i].el.classList.remove('ct-voce-prima', 'ct-voce-ultima');
      if (!ok) continue;
      visibili++;
      var id = schede[i].famiglia ? schede[i].famiglia.id : '';
      perFamiglia[id] = (perFamiglia[id] || 0) + 1;
      if (!primaDi[id]) primaDi[id] = schede[i].el;
      ultimaDi[id] = schede[i].el;
    }

    for (var idf in primaDi) {
      primaDi[idf].classList.add('ct-voce-prima');
      ultimaDi[idf].classList.add('ct-voce-ultima');
    }

    /* Una famiglia senza piu' niente dentro sparisce con la sua intestazione:
       lasciare il titolo e il numero "0 voci" e' peggio di toglierla, perche'
       sembra che il catalogo sia rotto invece che filtrato. */
    for (var f = 0; f < famiglie.length; f++) {
      var quante = perFamiglia[famiglie[f].id] || 0;
      famiglie[f].hidden = quante === 0;
      var conteggio = famiglie[f].querySelector('.ct-fam-conta');
      if (conteggio) conteggio.textContent = parola(quante);
    }

    /* Il selettore in cima e la barra appesa devono dire la stessa cosa del
       corpo della pagina: se una famiglia non c'e' piu', non deve nemmeno
       restare un'ancora che ci porta. */
    for (var s = 0; s < scelte.length; s++) {
      var rif = scelte[s].getAttribute('href').slice(1);
      var q = perFamiglia[rif] || 0;
      scelte[s].hidden = q === 0;
      var c = scelte[s].querySelector('.fq-arg-c');
      if (c) c.firstChild.nodeValue = parola(q);
    }
    for (var p = 0; p < pillole.length; p++) {
      var r = pillole[p].getAttribute('href');
      if (!r || r.charAt(0) !== '#') continue;
      pillole[p].hidden = (perFamiglia[r.slice(1)] || 0) === 0;
    }

    /* Le pillole si aggiornano col numero che darebbero DAVVERO adesso, e
       quelle che non darebbero niente si spengono. E' l'unico modo per non
       mandare qualcuno a sbattere contro una lista vuota: il vicolo cieco si
       vede prima di imboccarlo. */
    for (var k = 0; k < chip.length; k++) {
      var campo = chip[k].getAttribute('data-campo');
      var valore = chip[k].getAttribute('data-valore');
      var n = conta(campo, valore);
      var num = chip[k].querySelector('.ct-fchip-n');
      if (num) num.textContent = n;
      var scelto = (acceso[campo] || []).indexOf(valore) > -1;
      chip[k].disabled = n === 0 && !scelto;
    }

    var quanti = attivi();

    /* Il segno che dice al foglio di stile "stiamo filtrando": da li' in poi
       comandano ct-voce-prima e ct-voce-ultima invece di :first-child e
       :last-child. Senza filtri attivi si torna alle regole del documento,
       cosi' con JavaScript spento la pagina resta giusta com'e' sempre stata. */
    for (var g = 0; g < gruppiVoci.length; g++) {
      gruppiVoci[g].classList.toggle('ct-filtrato', quanti > 0);
    }

    /* IL PANNELLO CAMBIA L'ALTEZZA DELLA PAGINA, e chi disegna la barra
       appesa non lo sa: catalogo.js ricalcola solo su scroll e resize.
       Senza questo avviso il filo dell'avanzamento resta alla percentuale di
       prima — e la pagina puo' essersi accorciata di due terzi — e la
       pillola accesa resta accesa anche quando questa funzione l'ha appena
       nascosta, cioe' si illumina una sezione che non c'e' piu'. */
    window.dispatchEvent(new CustomEvent('catalogo:filtrato'));

    if (azzera) azzera.hidden = quanti === 0;
    if (esito) {
      esito.hidden = quanti === 0;
      esito.textContent = visibili === 0
        ? 'Nessun prodotto con questa combinazione. Toglietene uno, oppure chiedetecelo su WhatsApp: in cella c\'è più di quello che sta in pagina.'
        : visibili + (visibili === 1 ? ' prodotto' : ' prodotti') + ' su ' + schede.length;
    }
  }

  pannello.addEventListener('click', function (e) {
    /* "+91 altre" apre la coda e sparisce. Non si richiude: chi l'ha aperta
       sta cercando un valore preciso, e vedersi sparire sotto il dito le
       pillole appena comparse e' peggio della riga in piu'. */
    var piu = e.target.closest ? e.target.closest('.ct-fchip-piu') : null;
    if (piu) {
      var campoPiu = piu.getAttribute('data-piu');
      var coda = pannello.querySelectorAll('.ct-fchip-coda[data-campo="' + campoPiu + '"]');
      for (var c = 0; c < coda.length; c++) coda[c].hidden = false;
      piu.setAttribute('aria-expanded', 'true');
      piu.hidden = true;
      return;
    }

    var b = e.target.closest ? e.target.closest('.ct-fchip') : null;
    if (b && !b.disabled) {
      var campo = b.getAttribute('data-campo');
      var valore = b.getAttribute('data-valore');
      if (!acceso[campo]) acceso[campo] = [];
      var i = acceso[campo].indexOf(valore);
      if (i > -1) acceso[campo].splice(i, 1);
      else acceso[campo].push(valore);
      b.classList.toggle('attivo', i === -1);
      b.setAttribute('aria-pressed', i === -1 ? 'true' : 'false');
      applica();
      return;
    }

    if (azzera && e.target.closest('#ct-azzera')) {
      acceso = {};
      for (var k = 0; k < chip.length; k++) {
        chip[k].classList.remove('attivo');
        chip[k].setAttribute('aria-pressed', 'false');
      }
      applica();
    }
  });

  applica();
})();
