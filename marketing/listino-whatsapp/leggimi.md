# Carosello WhatsApp del listino

Le anteprime delle carte del carosello, disegnate con il linguaggio del sito
(fotografia sotto un velo blu `#151c64`, Poppins leggero, filo corallo).

Prima al posto dell'anteprima finiva la prima pagina del PDF del listino:
WhatsApp la ritaglia a 1.91:1 e di quel foglio restava una striscia con il
logo tagliato a metà e il titolo illeggibile. Le carte qui sono disegnate
direttamente in quella proporzione, quindi non c'è niente da ritagliare.

## Le immagini pronte

- `png/listino-pat.jpg` — prima carta, pescato PAT dell'Arcipelago Toscano
- `png/listino-fresco.jpg` — seconda carta, fresco del giorno

1200×628 px (1.91:1), il taglio che WhatsApp usa per la testata delle carte.

## I testi

**Messaggio sopra il carosello**

> Buonasera, ecco i listini di domani, venerdì 21 agosto.
> Prezzi aggiornati sul pescato dell'Arcipelago Toscano e sul fresco del giorno.
> Ordina entro le 2 di notte, consegniamo entro le 11 del mattino.
> Se non vuoi più riceverli scrivi STOP PROMO e ti tolgo dalla lista.

**Prima carta** (sotto l'immagine, max 160 caratteri)

> Il pescato PAT sbarcato stanotte nell'Arcipelago Toscano: specie, pezzature e prezzi di venerdì 21.

**Seconda carta**

> Il fresco del giorno, con prezzi e disponibilità aggiornati: tutto quello che parte domani mattina.

**Tasto di entrambe le carte** (max 25 caratteri)

> Apri il listino

## Rifarle per un altro giorno

Cambia la data e le parole in `dati.json`, poi:

```
node genera.js
node rendi.js
```

`genera.js` scrive le pagine `carta-*.html` partendo da `modello.html`,
`rendi.js` le fotografa con Chrome senza finestra e le riduce a misura.
Le due carte escono dallo stesso modello: una correzione alla grafica le
tocca tutte e due insieme, e non possono andare fuori squadra.

Aggiungendo `quadro` a tutti e due i comandi escono le stesse grafiche a
1080×1080, se la stessa cosa serve come post invece che come carta.

## Da sapere

- Le foto vengono da `assets/` del sito: sono le stesse che vede chi poi
  apre del-mar.it, ed è quello che fa sembrare le due cose una cosa sola.
- Il logo è `assets/logo.png` spento e riacceso bianco dal CSS: non esiste
  una seconda versione del marchio da tenere aggiornata.
- Il punto di taglio di ogni foto sta in `carta.css` (`.fuoco-*`). Se cambi
  fotografia, quasi sicuramente va corretto anche quello, altrimenti il
  soggetto finisce fuori dall'inquadratura.
