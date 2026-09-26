/* TROVA LA CONFEZIONE UFFICIALE DI UN PRODOTTO DI MARCA.
   Lo usa genera-foto.js per le voci che citano un marchio: la busta McCain o
   il cartone Martinucci non si fanno inventare al modello — sbaglia le
   lettere, e un marchio famoso scritto storto si nota prima del prodotto.
   Si cerca la foto ufficiale della confezione e il modello la mette in scena
   com'e', senza ridisegnarla.

   Tre passi, ognuno col suo costo registrato:
     1. ricerca  — gpt-5-mini con la ricerca web di OpenAI trova l'immagine
                   della confezione, preferendo il sito del produttore.
     2. scarico  — si prende la versione piu' grande: sui siti dei produttori
                   l'URL trovato porta spesso ?width=500, senza c'e' l'originale.
     3. verifica — un secondo sguardo del modello sull'immagine scaricata:
                   marca giusta e leggibile, una confezione sola, il prodotto
                   che corrisponde. Se non passa, si riprova una volta dicendo
                   cosa non andava; se non passa ancora, la voce si genera
                   senza confezione e finisce nel resoconto.

   Il risultato resta in foto-prova/confezioni/: rilanciare non ripaga la
   ricerca. Le immagini sono dei produttori, e li' restano — fuori dal
   repository e fuori dal sito finche' non c'e' l'ok del fornitore.
   ───────────────────────────────────────────────────────────────────────── */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const MODELLO_RICERCA = 'gpt-5-mini';
const CARTELLA = path.join(__dirname, 'foto-prova', 'confezioni');

// Dollari. Fonte: developers.openai.com/api/docs/pricing (settembre 2026)
const PREZZI = {
  'gpt-5-mini': { in: 0.25 / 1e6, out: 2 / 1e6 },
  ricerca: 10 / 1000,
};

const SCHEMA_RICERCA = {
  type: 'json_schema',
  name: 'confezione',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['trovata', 'image_url', 'pagina', 'prodotto', 'motivo'],
    properties: {
      trovata: { type: 'boolean' },
      image_url: { type: 'string', description: 'URL diretto del file immagine della confezione' },
      pagina: { type: 'string', description: 'pagina dove si trova l\'immagine' },
      prodotto: { type: 'string', description: 'nome del prodotto come scritto sulla confezione' },
      motivo: { type: 'string' },
    },
  },
};

const SCHEMA_VERIFICA = {
  type: 'json_schema',
  name: 'verifica',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['ok', 'marca_leggibile', 'cosa_mostra', 'motivo'],
    properties: {
      ok: { type: 'boolean' },
      marca_leggibile: { type: 'boolean' },
      cosa_mostra: { type: 'string' },
      motivo: { type: 'string' },
    },
  },
};

async function responses(body, key) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || res.status);
  const testo = json.output.filter((o) => o.type === 'message')
    .flatMap((o) => o.content.map((c) => c.text || '')).join('');
  // Si paga ogni chiamata dello strumento, anche le aperture di pagina
  const ricerche = json.output.filter((o) => o.type === 'web_search_call').length;
  const u = json.usage || {};
  const p = PREZZI[body.model];
  const costo = (u.input_tokens || 0) * p.in + (u.output_tokens || 0) * p.out + ricerche * PREZZI.ricerca;
  return { dati: JSON.parse(testo), costo, ricerche };
}

async function cerca(richiesta, scartata, key) {
  const input = [
    `Trova la foto ufficiale della confezione di questo prodotto per la ristorazione:`,
    `marca "${richiesta.marca}", prodotto "${richiesta.prodotto}".`,
    richiesta.dettaglio && `Dettagli dal nostro catalogo: ${richiesta.dettaglio}`,
    ``,
    `Serve l'immagine del FRONTE della confezione (busta, cartone o scatola), fotografata da sola`,
    `su fondo neutro, con il marchio leggibile: il cosiddetto packshot. Preferisci il sito ufficiale`,
    `del produttore, meglio se nella versione italiana; poi i siti dei distributori. Scarta foto`,
    `ambientate, foto del solo prodotto senza confezione, loghi da soli, volantini e cataloghi PDF.`,
    `Se la marca ha piu' prodotti simili, scegli quello che corrisponde meglio ai dettagli.`,
    `Fai al massimo tre ricerche. L'URL deve puntare direttamente al file immagine.`,
    scartata && `Un tentativo precedente ha trovato ${scartata.image_url}, scartato perche': ${scartata.motivo}. Trovane un'altra.`,
  ].filter(Boolean).join('\n');

  return responses({
    model: MODELLO_RICERCA,
    tools: [{ type: 'web_search', search_content_types: ['image', 'text'], image_settings: { max_results: 6 } }],
    input,
    text: { format: SCHEMA_RICERCA },
  }, key);
}

// Sui siti dei produttori l'URL porta spesso ?width=500: senza, c'e' l'originale
async function scarica(url) {
  const candidati = [url.split('?')[0], url].filter((u, i, a) => a.indexOf(u) === i);
  let meglio = null;
  for (const u of candidati) {
    try {
      const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const m = await sharp(buf).metadata();
      if (!meglio || m.width * m.height > meglio.px) meglio = { buf, px: m.width * m.height, w: m.width, h: m.height };
    } catch { /* un URL che non e' un'immagine si scarta e basta */ }
  }
  if (!meglio) throw new Error('nessuna immagine scaricabile da ' + url);
  if (meglio.w < 400 || meglio.h < 400) throw new Error(`immagine troppo piccola (${meglio.w}x${meglio.h})`);
  return meglio;
}

async function verifica(buf, richiesta, key) {
  const jpg = await sharp(buf).flatten({ background: '#ffffff' }).resize(1024, 1024, { fit: 'inside' }).jpeg({ quality: 85 }).toBuffer();
  return responses({
    model: MODELLO_RICERCA,
    input: [{
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: [
            `Questa immagine deve essere la confezione ufficiale di "${richiesta.prodotto}" della marca "${richiesta.marca}".`,
            richiesta.dettaglio && `Dettagli del prodotto: ${richiesta.dettaglio}`,
            `Rispondi ok=true solo se: si vede UNA confezione (busta, cartone o scatola) ripresa di fronte;`,
            `il marchio "${richiesta.marca}" e' leggibile sulla confezione; il prodotto sulla confezione`,
            `e' compatibile con i dettagli; non e' una foto ambientata, un volantino o un logo da solo.`,
          ].filter(Boolean).join('\n'),
        },
        { type: 'input_image', image_url: 'data:image/jpeg;base64,' + jpg.toString('base64') },
      ],
    }],
    text: { format: SCHEMA_VERIFICA },
  }, key);
}

/* Ritorna { file, fonte, prodotto, costo, note } oppure { file: null, costo, note }.
   Il costo e' in dollari e somma ricerche, token e verifiche di tutti i tentativi. */
async function cercaConfezione(richiesta, key) {
  fs.mkdirSync(CARTELLA, { recursive: true });
  const base = path.join(CARTELLA, richiesta.slug);
  if (fs.existsSync(base + '.json')) {
    const salvato = JSON.parse(fs.readFileSync(base + '.json', 'utf8'));
    return { ...salvato, costo: 0, dallaCache: true };
  }

  let costo = 0;
  let scartata = null;
  const note = [];
  for (let tentativo = 1; tentativo <= 2; tentativo++) {
    try {
      const r = await cerca(richiesta, scartata, key);
      costo += r.costo;
      if (!r.dati.trovata || !r.dati.image_url) {
        note.push(`ricerca ${tentativo}: niente (${r.dati.motivo})`);
        continue;
      }
      const img = await scarica(r.dati.image_url);
      const v = await verifica(img.buf, richiesta, key);
      costo += v.costo;
      if (!v.dati.ok) {
        scartata = { image_url: r.dati.image_url, motivo: v.dati.motivo };
        note.push(`ricerca ${tentativo}: scartata — ${v.dati.motivo}`);
        continue;
      }
      await sharp(img.buf).flatten({ background: '#ffffff' }).png().toFile(base + '.png');
      const esito = {
        file: base + '.png',
        fonte: r.dati.pagina || r.dati.image_url,
        image_url: r.dati.image_url,
        prodotto: r.dati.prodotto,
        cosa_mostra: v.dati.cosa_mostra,
        note: note.concat(`trovata al tentativo ${tentativo} (${img.w}x${img.h})`),
        costo_ricerca: costo,
      };
      fs.writeFileSync(base + '.json', JSON.stringify(esito, null, 2));
      return { ...esito, costo };
    } catch (e) {
      note.push(`ricerca ${tentativo}: errore — ${e.message}`);
    }
  }
  return { file: null, costo, note };
}

module.exports = { cercaConfezione, PREZZI };
