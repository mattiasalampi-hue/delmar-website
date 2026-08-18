/* Converte le foto del pescato da JPEG a WebP e scrive le dimensioni in
   specie.json — una volta sola, come assegna-foto.js per il catalogo.

   Il perche': le 12 foto delle schede pesavano 220-380 KB in JPEG, contro i
   70-130 KB degli stessi soggetti in WebP nel resto del sito. E senza
   width/height nell'HTML la pagina "salta" mentre caricano (il CLS che
   Google misura). Le dimensioni finiscono in specie.json cosi' genera.js
   non ha bisogno di sharp per girare tutti i giorni.

   Uso: node converti-foto-pescato.js   (poi: node genera.js)
*/
const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error('Manca sharp. Dalla radice del sito:  npm install sharp');
  process.exit(1);
}

const qui = __dirname;
const fileSpecie = path.join(qui, 'specie.json');
const specie = JSON.parse(fs.readFileSync(fileSpecie, 'utf8'));

(async () => {
  for (const s of specie) {
    if (!s.foto) continue;
    const sorgente = path.join(qui, 'foto', s.foto);
    if (!fs.existsSync(sorgente)) {
      console.log(`ATTENZIONE: manca ${s.foto}, salto`);
      continue;
    }

    if (s.foto.endsWith('.jpg')) {
      const nuovoNome = s.foto.replace(/\.jpg$/, '.webp');
      const dest = path.join(qui, 'foto', nuovoNome);
      /* 1600px di lato lungo bastano per il riquadro piu' grande in cui la
         foto compare (la colonna della scheda); di piu' e' peso regalato */
      const info = await sharp(sorgente)
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(dest);
      const prima = Math.round(fs.statSync(sorgente).size / 1024);
      console.log(`${s.foto} -> ${nuovoNome}  ${prima} KB -> ${Math.round(info.size / 1024)} KB  (${info.width}x${info.height})`);
      s.foto = nuovoNome;
      s.larghezza = info.width;
      s.altezza = info.height;
    } else {
      /* Gia' convertita: si (ri)leggono solo le dimensioni, cosi' lo script
         si puo' rilanciare senza paura */
      const meta = await sharp(path.join(qui, 'foto', s.foto)).metadata();
      s.larghezza = meta.width;
      s.altezza = meta.height;
    }
  }

  fs.writeFileSync(fileSpecie, JSON.stringify(specie, null, 2) + '\n');
  console.log('specie.json aggiornato (foto, larghezza, altezza)');
})();
