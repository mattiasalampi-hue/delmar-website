/* Banco di prova del consenso — solo locale.
   Registra due tracciatori FINTI e mostra in diretta cosa e' partito e
   cosa no. Non manda niente da nessuna parte: al posto della chiamata
   vera accende una spia in pagina. */
(function () {
  const quadro = document.getElementById('ck-quadro');

  /* Lo stato che si vuole vedere: cosa e' partito, cosa e' stato scelto,
     e quando. Sono le tre cose che servono a capire se il consenso
     funziona */
  const spie = {
    statistiche: { nome: 'Analytics (finto)', partito: false },
    marketing:   { nome: 'Pixel pubblicitario (finto)', partito: false }
  };

  function disegna() {
    const scelta = window.DelMarConsenso.stato();
    let salvato = null;
    try { salvato = JSON.parse(localStorage.getItem('delmar-consenso') || 'null'); } catch (e) {}

    quadro.innerHTML = '';

    for (const k of Object.keys(spie)) {
      const r = document.createElement('div');
      r.className = 'ck-riga';
      const s = document.createElement('span');
      s.className = 'ck-spia ' + (spie[k].partito ? 'ck-on' : 'ck-off');
      s.textContent = spie[k].partito ? 'PARTITO' : 'FERMO';
      const n = document.createElement('span');
      n.className = 'ck-nome';
      n.textContent = spie[k].nome;
      const c = document.createElement('span');
      c.className = 'ck-scelta';
      c.textContent = scelta ? (scelta[k] ? 'consenso: sì' : 'consenso: no') : 'non ancora scelto';
      r.append(s, n, c);
      quadro.appendChild(r);
    }

    const m = document.createElement('div');
    m.className = 'ck-riga';
    const caricata = !!document.querySelector('.ck-mappa iframe');
    const s = document.createElement('span');
    s.className = 'ck-spia ' + (caricata ? 'ck-on' : 'ck-off');
    s.textContent = caricata ? 'CARICATA' : 'BLOCCATA';
    const n = document.createElement('span');
    n.className = 'ck-nome';
    n.textContent = 'Mappa di Google (vera)';
    const c = document.createElement('span');
    c.className = 'ck-scelta';
    /* Si conta quante richieste sono partite VERSO GOOGLE, non se
       l'iframe c'e': e' l'unica prova che il blocco funziona davvero */
    const verso = performance.getEntriesByType('resource')
      .filter(x => /google|gstatic/.test(x.name)).length;
    c.textContent = 'richieste a Google finora: ' + verso;
    m.append(s, n, c);
    quadro.appendChild(m);

    const d = document.createElement('p');
    d.className = 'ck-data';
    d.textContent = salvato && salvato.data
      ? 'Scelta registrata il ' + new Date(salvato.data).toLocaleString('it-IT')
      : 'Nessuna scelta ancora registrata.';
    quadro.appendChild(d);
  }

  window.DelMarConsenso.quando('statistiche', () => {
    spie.statistiche.partito = true;
    console.log('[prova] Analytics sarebbe partito ORA');
    disegna();
  });

  window.DelMarConsenso.quando('marketing', () => {
    spie.marketing.partito = true;
    console.log('[prova] Pixel sarebbe partito ORA');
    disegna();
  });

  document.getElementById('ck-azzera').addEventListener('click', () => {
    window.DelMarConsenso.dimentica();
    /* Si ricarica: i tracciatori finti sono gia' partiti in questa
       pagina e non si possono "spegnere" — come nella realta', ed e'
       proprio il motivo per cui vanno bloccati PRIMA */
    location.reload();
  });

  /* La mappa si carica quando si accetta: si ridisegna il quadro poco
     dopo, per far vedere il conteggio delle richieste a Google salire
     da zero */
  const occhio = new MutationObserver(() => setTimeout(disegna, 400));
  occhio.observe(document.querySelector('.ck-mappa'), { childList: true, subtree: true });

  disegna();
})();
