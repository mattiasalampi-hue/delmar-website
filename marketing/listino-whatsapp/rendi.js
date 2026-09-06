/* Fotografa le pagine delle carte con Chrome senza finestra e le riduce
   alla misura finale.
   Si fotografa al doppio e si rimpicciolisce dopo: alla misura giusta i
   bordi delle lettere sottili di Poppins vengono sgranati, ridotti da 2x
   restano puliti. */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const sharp = require('sharp');

const qui = __dirname;
const uscita = path.join(qui, 'png');
const dati = JSON.parse(fs.readFileSync(path.join(qui, 'dati.json'), 'utf8'));

const quadro = process.argv[2] === 'quadro';
const coda = quadro ? '-quadro' : '';
const larga = quadro ? 1080 : 1200;
const alta = quadro ? 1080 : 628;

const chrome = [
  path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
].find((p) => fs.existsSync(p));

if (!chrome) {
  console.error('Chrome non trovato: serve per fotografare le pagine.');
  process.exit(1);
}

fs.mkdirSync(uscita, { recursive: true });

(async () => {
  for (const carta of dati.carte) {
    const nome = `listino-${carta.nome}${coda}`;
    const grezza = path.join(uscita, `_grezza-${nome}.png`);
    const pagina = path.join(qui, `carta-${carta.nome}${coda}.html`);

    if (!fs.existsSync(pagina)) {
      console.error(`manca ${path.basename(pagina)} — lancia prima: node genera.js${quadro ? ' quadro' : ''}`);
      process.exit(1);
    }

    execFileSync(chrome, [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      /* Senza questo Chrome tratta ogni file come un sito diverso e si
         rifiuta di caricare i .woff2: il titolo uscirebbe in Arial */
      '--allow-file-access-from-files',
      '--force-device-scale-factor=2',
      `--user-data-dir=${path.join(qui, '.chrome')}`,
      /* Le foto sono grandi: senza un tempo di grazia Chrome scatta
         mentre l'immagine e' ancora vuota e resta solo il fondo blu */
      '--virtual-time-budget=6000',
      `--window-size=${larga},${alta}`,
      `--screenshot=${grezza}`,
      pathToFileURL(pagina).href,
    ], { stdio: 'ignore' });

    const finale = path.join(uscita, `${nome}.jpg`);
    await sharp(grezza)
      .resize(larga, alta, { fit: 'cover' })
      .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
      .toFile(finale);
    fs.unlinkSync(grezza);
    console.log('reso', path.basename(finale), `${larga}x${alta}`);
  }
})();
