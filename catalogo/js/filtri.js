/* I FILTRI DEL CATALOGO.

   Le otto dimensioni che prima stavano nel menu — stato, lavorazione, uso in
   cucina, gamma, provenienza, pezzatura, glassatura, formato — girano qui,
   nel browser, sui `data-` che genera-catalogo.js appiccica a ogni
   `.ct-voce`. Nessuna copia dei dati: quello che si filtra e' esattamente
   quello che si legge in pagina, e le due cose non possono andare fuori
   sincrono.

   DENTRO UN CAMPO E' "O", FRA CAMPI E' "E".
   Chi accende Fresco e Congelato vuole tutti e due, non l'intersezione vuota;
   chi accende Fresco e "Adatto al crudo" vuole il pesce fresco che si serve
   crudo. E' l'unica combinazione che si comporta come uno se l'aspetta, ed e'
   la ragione per cui questi otto criteri funzionano da filtro e funzionavano
   male da rami del menu: un ramo non si combina con un altro ramo.

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
  var pillole = [].slice.call(document.querySelectorAll('.fq-indice a'));

  /* Gli attributi si leggono una volta sola, all'avvio: sono un centinaio di
     voci per otto campi, e rifare getAttribute a ogni clic significa toccare
     il DOM ottocento volte per una cosa che non cambia mai. */
  var CAMPI = ['stato', 'lavorazione', 'uso', 'gamma', 'provenienze', 'pezzature', 'glassatura', 'formati'];

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
      var suoi = scheda.valori[campo];
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
      if (schede[i].valori[campo].indexOf(valore) > -1 && passa(schede[i], campo)) n++;
    }
    return n;
  }

  function parola(n) {
    return n + ' ' + (n === 1 ? 'voce' : 'voci');
  }

  function applica() {
    var visibili = 0;
    var perFamiglia = {};

    for (var i = 0; i < schede.length; i++) {
      var ok = passa(schede[i], null);
      schede[i].el.hidden = !ok;
      if (!ok) continue;
      visibili++;
      var id = schede[i].famiglia ? schede[i].famiglia.id : '';
      perFamiglia[id] = (perFamiglia[id] || 0) + 1;
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
