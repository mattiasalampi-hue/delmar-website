/* Genera crediti.html da crediti-usati.json.

   34 delle fotografie del catalogo vengono da Wikimedia Commons e Openverse
   con licenze Creative Commons BY e BY-SA: l'attribuzione non e' cortesia,
   e' la condizione della licenza, e senza questa pagina il catalogo non puo'
   stare online. Il JSON lo scrive assegna-foto.js quando attacca una foto al
   catalogo: qui si impagina e basta, cosi' la lista non puo' andare fuori
   sincrono con le foto davvero in uso.

   Uso: node genera-crediti.js
*/
const fs = require('fs');
const path = require('path');
const { testa, piede } = require('./comune');

const qui = __dirname;
const crediti = JSON.parse(fs.readFileSync(path.join(qui, 'crediti-usati.json'), 'utf8'));

/* Le licenze arrivano scritte in quattro modi diversi ("BY-SA 4.0",
   "CC BY-SA 4.0"): si normalizzano qui invece di correggere il JSON, che
   viene riscritto dallo script delle foto */
function licenza(l) {
  const pulita = l.replace(/^CC\s+/i, '').trim();
  if (/^public domain$/i.test(pulita)) {
    return { nome: 'Pubblico dominio', url: null };
  }
  if (/^CC0$/i.test(pulita)) {
    return { nome: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/deed.it' };
  }
  const m = pulita.match(/^(BY(?:-SA)?)\s+([\d.]+)$/i);
  if (!m) return { nome: l, url: null };
  return {
    nome: `CC ${m[1].toUpperCase()} ${m[2]}`,
    url: `https://creativecommons.org/licenses/${m[1].toLowerCase()}/${m[2]}/deed.it`,
  };
}

const nomeProdotto = (slug) => {
  const n = slug.replace(/-/g, ' ');
  return n.charAt(0).toUpperCase() + n.slice(1);
};

function riga(c) {
  const lic = licenza(c.licenza);
  /* Lo scraping delle candidate a volte mette nel campo autore l'intero
     blocco di licenza della pagina Wikimedia invece del nome: e' gia'
     successo due volte. Un nome vero non supera i 60 caratteri e non va a
     capo — se succede, il JSON va corretto a mano prima di pubblicare. */
  if (c.autore.length > 60 || c.autore.includes('\n')) {
    console.warn(`ATTENZIONE: autore sospetto per "${c.prodotto}", correggere crediti-usati.json`);
  }
  const autore = c.autore === 'ignoto' ? 'autore non indicato' : c.autore;
  const licHtml = lic.url
    ? `<a href="${lic.url}" target="_blank" rel="noopener noreferrer">${lic.nome}</a>`
    : lic.nome;

  return `        <li class="cr-riga">
          <span class="cr-prodotto">${nomeProdotto(c.prodotto)}</span>
          <span class="cr-fonte">${autore} · <a href="${c.originale}" target="_blank" rel="noopener noreferrer">${c.fonte}</a> · ${licHtml}</span>
        </li>`;
}

const pagina = `${testa('Crediti fotografici', {
  css: ['crediti.css'],
  simboli: ['wa'],
  pagina: 'crediti.html',
  descrizione: 'Le fonti e le licenze delle fotografie usate nel catalogo prodotti DelMar.',
})}
    <main class="pr-corpo cr-pagina">
      <div class="pr-intro">
        <h1>Crediti fotografici</h1>
        <p>
          Le fotografie che vedete nelle pagine del catalogo sono nostre,
          scattate al banco e in magazzino. Nell'archivio del catalogo restano
          però immagini che vengono da archivi liberi — Wikimedia Commons e
          Openverse — con licenze Creative Commons che chiedono di indicare
          autore e fonte: lo facciamo qui, foto per foto. Rispetto agli
          originali le immagini sono state ritagliate e convertite in formato
          WebP.
        </p>
      </div>

      <ul class="cr-lista">
${crediti.map(riga).join('\n')}
      </ul>
    </main>
${piede(['../js/cursore.js?v=2'])}`;

fs.writeFileSync(path.join(qui, 'crediti.html'), pagina);
console.log(`crediti.html — ${crediti.length} fotografie attribuite`);
