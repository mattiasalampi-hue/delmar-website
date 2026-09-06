/* Genera le pagine delle anteprime a partire da un modello unico.
   Le due carte hanno lo stesso impianto e cambiano solo foto e parole:
   scriverle a mano come due file gemelli significava che la prima
   correzione grafica ne toccava una sola e le mandava fuori squadra. */
const fs = require('fs');
const path = require('path');

const qui = __dirname;
const modello = fs.readFileSync(path.join(qui, 'modello.html'), 'utf8');
const dati = JSON.parse(fs.readFileSync(path.join(qui, 'dati.json'), 'utf8'));

/* Il formato arriva da riga di comando perche' la stessa grafica serve
   sia come testata delle carte (1.91:1) sia come post quadrato */
const formato = process.argv[2] === 'quadro' ? 'formato-quadro' : 'formato-largo';
const coda = formato === 'formato-quadro' ? '-quadro' : '';

for (const carta of dati.carte) {
  const valori = { ...carta, data: dati.data, formato };
  const pagina = modello.replace(/\{\{(\w+)\}\}/g, (_, chiave) => valori[chiave] ?? '');
  const file = path.join(qui, `carta-${carta.nome}${coda}.html`);
  fs.writeFileSync(file, pagina, 'utf8');
  console.log('scritto', path.basename(file));
}
