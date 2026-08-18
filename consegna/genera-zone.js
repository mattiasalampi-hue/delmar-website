/* Genera le pagine di zona da zone.json — una per area di consegna.

   Servono a due cose insieme: uscire su Google per "fornitore pesce
   <zona>" e fare da pagina di atterraggio alle campagne Google Ads
   della stessa zona (una pagina coerente con la parola chiave alza il
   punteggio di qualità e abbassa il costo per clic).

   Sono pagine del sito a tutti gli effetti: stessa intestazione, stesse
   campiture, stessi componenti del catalogo (comune.js, d.css). I numeri
   vengono dal gestionale — vedi la _nota in zone.json — e NON si
   ritoccano a mano nell'HTML: si corregge il JSON e si rigenera.

   Uso: node genera-zone.js
*/
const fs = require('fs');
const path = require('path');
const { WA, testa, piede } = require('../catalogo/comune');

const qui = __dirname;
const { zone } = JSON.parse(fs.readFileSync(path.join(qui, 'zone.json'), 'utf8'));

const RADICE = 'https://del-mar.it';

function pagina(z) {
  const msg = encodeURIComponent(z.wa_testo);

  /* Il markup Service dice a Google DOVE si vende, comune per comune:
     e' il pezzo che una pagina geografica ha in piu' da dichiarare */
  const servizio = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `Consegna di pesce all'ingrosso — ${z.nome}`,
    serviceType: 'Fornitura ittica per la ristorazione',
    url: `${RADICE}/consegna/${z.slug}.html`,
    provider: {
      '@type': 'WholesaleStore',
      name: 'DelMar — LE DELIZIE DEL MARE S.R.L.',
      url: RADICE,
      telephone: '+390585834572',
    },
    areaServed: z.comuni.map((c) => ({ '@type': 'City', name: c })),
  };

  return `${testa(z.titolo_seo, {
    cartella: 'consegna',
    css: ['zona.css'],
    simboli: ['wa', 'arr'],
    pagina: `${z.slug}.html`,
    descrizione: z.descrizione,
    immagine: 'foto-prodotti/copertina-pescato.webp',
    /* Niente BreadcrumbList qui: la pagina non ha briciole visibili, e la
       regola imparata con le FAQ e' che markup e pagina dicono la stessa
       identica cosa. Il Service con areaServed invece descrive esattamente
       quello che la pagina racconta */
    jsonld: [servizio],
  })}
    <!-- La stessa apertura delle pagine catalogo: campiture e pesci sono la
         firma di del-mar.it, e questa e' una pagina del sito, non una landing
         appiccicata -->
    <section class="pr-hero">
      <canvas id="pr-sfondo"></canvas>
      <canvas id="pr-pesci"></canvas>
      <div class="pr-hero-in">
        <p class="pr-occhiello">${z.occhiello}</p>
        <h1 class="pr-titolo">${z.titolo}<br /><em>${z.sottotitolo}</em></h1>
        <p class="pr-sotto">${z.sotto}</p>
      </div>
    </section>

    <main class="pr-corpo">
      <!-- I QUATTRO NUMERI PRIMA DI TUTTO: chi atterra da un annuncio decide
           in cinque secondi, e queste sono le quattro risposte che cerca -->
      <div class="zn-fatti">
${z.fatti.map((f) => `        <div class="zn-fatto">
          <span class="zn-fatto-n">${f.numero}</span>
          <span class="zn-fatto-v">${f.voce}</span>
        </div>`).join('\n')}
      </div>

      <div class="pr-intro">
        <h2>Dove arriva il furgone</h2>
        <p>${z.giorni_testo}</p>
        <!-- I comuni scritti UNO PER UNO, non "e dintorni": e' quello che un
             ristoratore cerca ("consegna pesce ${z.comuni[0]}") ed e' la
             differenza fra una pagina vera e una di facciata -->
        <div class="zn-comuni" role="list">
${z.comuni.map((c) => `          <span class="zn-comune" role="listitem">${c}</span>`).join('\n')}
        </div>
      </div>

      <div class="pr-intro">
        <h2>Cosa ordinano i locali della zona</h2>
        <p>${z.prodotti_testo}</p>
        <div class="fq-indice zn-cataloghi" role="navigation" aria-label="I cataloghi più richiesti in zona">
${z.prodotti_link.map((p) => `          <a href="${p.href}">${p.nome}</a>`).join('\n')}
        </div>
      </div>

      <div class="pr-intro">
        <h2>Come funziona, dall'ordine al banco</h2>
        <!-- Le stesse righe numerate delle domande frequenti: qui i numeri
             sono una sequenza vera, ordine -> giro -> consegna -->
        <div class="fq-argomenti">
          <div class="fq-arg">
            <span class="fq-arg-n">01</span>
            <span class="fq-arg-t">Ordini quando hai finito il servizio</span>
            <span class="fq-arg-d">Su WhatsApp fino alle 2 di notte, al telefono fino alle 18. Ordine minimo 100 €, consegna gratis sopra i 150 €.</span>
            <span class="fq-arg-c">&nbsp;</span>
          </div>
          <div class="fq-arg">
            <span class="fq-arg-n">02</span>
            <span class="fq-arg-t">Il pesce viene preparato la notte stessa</span>
            <span class="fq-arg-d">Selezione, lavorazioni incluse su richiesta (squamato, filettato, porzionato) e abbattimento per il crudo. Ogni collo con etichetta di tracciabilità e zona FAO.</span>
            <span class="fq-arg-c">&nbsp;</span>
          </div>
          <div class="fq-arg">
            <span class="fq-arg-n">03</span>
            <span class="fq-arg-t">Entro le 11 è nella tua cucina</span>
            <span class="fq-arg-d">Furgoni refrigerati nostri, peso reale in fattura. Se qualcosa non va, reclami entro 24 ore e si sistema.</span>
            <span class="fq-arg-c">&nbsp;</span>
          </div>
        </div>
      </div>

      <section class="pr-chiusura">
        <canvas class="pr-chiusura-fondo" aria-hidden="true"></canvas>
        <p class="pr-chiusura-occhiello">Il listino è diverso per ogni tipo di locale</p>
        <h2>${z.chiusura_titolo}</h2>
        <p class="pr-chiusura-testo">${z.chiusura_testo}</p>
        <div class="pr-chiusura-azioni">
          <a href="https://wa.me/${WA}?text=${msg}" target="_blank" rel="noopener noreferrer" class="pr-btn pr-btn-wa">
            <svg aria-hidden="true"><use href="#ico-wa"/></svg>
            Scrivici su WhatsApp
          </a>
        </div>
        <p class="pr-chiusura-tel">Rispondiamo tutti i giorni, festivi compresi</p>
      </section>
    </main>
${piede(['../js/caustiche.js?v=1', '../js/pesci.js?v=11', '../catalogo/js/d.js?v=1', '../js/cursore.js?v=2'], { cat: '../catalogo/' })}`;
}

let n = 0;
for (const z of zone) {
  fs.writeFileSync(path.join(qui, `${z.slug}.html`), pagina(z));
  n++;
  console.log(`  ${z.slug}.html — ${z.comuni.length} comuni, ${z.prodotti_link.length} cataloghi collegati`);
}
console.log(`${n} pagine di zona generate`);
