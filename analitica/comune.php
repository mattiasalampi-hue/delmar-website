<?php
/*
  Analitica di casa — parte comune (database e utilità).

  PERCHE' NON GOOGLE ANALYTICS. Con GA4 si misura solo chi accetta i
  cookie: fra il 40 e il 60 per cento delle visite, e non un campione a
  caso — chi rifiuta e chi usa un blocca-pubblicità sono sistematicamente
  diversi dagli altri. Su un sito che vive di traffico organico si
  ragionerebbe su meta' dei dati credendo che siano tutti.

  Questa non usa cookie e non manda niente a nessuno, quindi non ha
  bisogno di consenso e misura TUTTI. In cambio non sa dire chi torna
  dopo una settimana: e' il prezzo, ed e' un prezzo onesto.

  COME FA A NON USARE COOKIE E RICONOSCERE LO STESSO VISITATORE DENTRO
  LA GIORNATA. Non salva l'indirizzo IP: ne salva un'impronta, cioe'
  sha256(sale_del_giorno + ip + browser). Il "sale" e' una stringa a
  caso che cambia ogni notte e che viene BUTTATA dopo due giorni: da
  quel momento l'impronta non e' piu' riconducibile a niente e nemmeno
  collegabile a quella del giorno prima. Non e' un'attenuazione, e'
  proprio impossibile tornare indietro.

  DOVE STANNO I DATI. Dentro www/, perche' questo hosting non lascia
  scrivere un livello sopra (verificato, non supposto). Siccome li' il
  web ci arriverebbe, la cartella e' chiusa da un .htaccess scritto dal
  codice stesso alla creazione: se qualcuno la ricrea a mano senza,
  il file del database sarebbe scaricabile — e dentro c'e' lo storico
  delle visite.

  PHP 7.4: niente match(), niente argomenti con nome, niente ?->
*/

define('AN_DIR', dirname(__DIR__) . '/_dati');
define('AN_DB', AN_DIR . '/analitica.sqlite');

function an_db() {
    static $db = null;
    if ($db !== null) return $db;

    if (!is_dir(AN_DIR)) {
        mkdir(AN_DIR, 0755, true);
    }
    /* Il lucchetto. Riscritto a ogni avvio se manca: e' l'unica cosa
       che separa lo storico delle visite da chiunque indovini il nome
       del file */
    $ht = AN_DIR . '/.htaccess';
    if (!is_file($ht)) {
        file_put_contents($ht,
            "# I dati dell'analitica. Nessuno deve poterli scaricare.\n" .
            "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n" .
            "<IfModule !mod_authz_core.c>\n  Order deny,allow\n  Deny from all\n</IfModule>\n");
    }

    $db = new PDO('sqlite:' . AN_DB);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    /* WAL: le scritture non bloccano le letture. Su un sito con
       pochi accessi al secondo non serve, ma costa una riga e toglie
       di mezzo la classe di errori "database is locked" */
    $db->exec('PRAGMA journal_mode = WAL');
    $db->exec('PRAGMA busy_timeout = 3000');

    $db->exec('CREATE TABLE IF NOT EXISTS visite (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        giorno TEXT NOT NULL,
        istante INTEGER NOT NULL,
        impronta TEXT NOT NULL,
        percorso TEXT NOT NULL,
        titolo TEXT,
        provenienza TEXT,
        campagna TEXT,
        dispositivo TEXT,
        browser TEXT,
        sistema TEXT,
        larghezza INTEGER,
        lingua TEXT
    )');
    $db->exec('CREATE INDEX IF NOT EXISTS i_visite_giorno ON visite(giorno)');
    $db->exec('CREATE INDEX IF NOT EXISTS i_visite_impronta ON visite(giorno, impronta)');

    $db->exec('CREATE TABLE IF NOT EXISTS eventi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        giorno TEXT NOT NULL,
        istante INTEGER NOT NULL,
        impronta TEXT NOT NULL,
        nome TEXT NOT NULL,
        dettaglio TEXT,
        percorso TEXT
    )');
    $db->exec('CREATE INDEX IF NOT EXISTS i_eventi_giorno ON eventi(giorno)');

    $db->exec('CREATE TABLE IF NOT EXISTS sale (
        giorno TEXT PRIMARY KEY,
        sale TEXT NOT NULL
    )');

    return $db;
}

/* Il sale del giorno. Si crea la prima volta che serve e si buttano
   quelli vecchi: e' quella cancellazione a rendere le impronte
   irreversibili col passare del tempo, non l'algoritmo */
function an_sale($giorno) {
    $db = an_db();
    $q = $db->prepare('SELECT sale FROM sale WHERE giorno = ?');
    $q->execute(array($giorno));
    $s = $q->fetchColumn();
    if ($s) return $s;

    $s = bin2hex(random_bytes(16));
    $i = $db->prepare('INSERT OR IGNORE INTO sale (giorno, sale) VALUES (?, ?)');
    $i->execute(array($giorno, $s));

    $db->exec("DELETE FROM sale WHERE giorno < date('now', '-2 day')");

    $q->execute(array($giorno));
    return $q->fetchColumn();
}

function an_impronta($giorno) {
    $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
    $ua = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';
    /* L'IP entra nel calcolo e non viene MAI scritto da nessuna parte */
    return hash('sha256', an_sale($giorno) . '|' . $ip . '|' . $ua);
}

/* Riconoscimento grossolano e volutamente tale: non serve sapere se e'
   Chrome 118 o 119, serve sapere se il sito va provato su telefono */
function an_dispositivo($ua) {
    if (preg_match('/iPad|Tablet|PlayBook|Silk/i', $ua)) return 'tavoletta';
    if (preg_match('/Mobile|Android|iPhone|iPod|Windows Phone/i', $ua)) return 'telefono';
    return 'scrivania';
}

function an_browser($ua) {
    if (preg_match('/Edg\//i', $ua))                 return 'Edge';
    if (preg_match('/OPR\/|Opera/i', $ua))           return 'Opera';
    if (preg_match('/Chrome|CriOS/i', $ua))          return 'Chrome';
    if (preg_match('/Firefox|FxiOS/i', $ua))         return 'Firefox';
    if (preg_match('/Safari/i', $ua))                return 'Safari';
    return 'altro';
}

function an_sistema($ua) {
    if (preg_match('/Windows/i', $ua))               return 'Windows';
    if (preg_match('/iPhone|iPad|iPod|OS X|Mac/i', $ua)) return 'Apple';
    if (preg_match('/Android/i', $ua))               return 'Android';
    if (preg_match('/Linux/i', $ua))                 return 'Linux';
    return 'altro';
}

/* I robot non sono visite. Senza questo filtro il grafico di un sito
   nuovo e' quasi tutto scansioni dei motori, e si festeggia per niente */
function an_robot($ua) {
    if ($ua === '') return true;
    return (bool) preg_match(
        '/bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|'
        . 'preview|monitor|uptime|pingdom|lighthouse|headless|python|curl|wget|axios|'
        . 'go-http|java\/|scrapy|semrush|ahrefs|mj12|dotbot|petal|yandex|baidu/i', $ua);
}

/* Da dove arrivano. Il dominio nudo basta e avanza: l'indirizzo intero
   della pagina di provenienza a volte contiene ricerche o dati di chi
   naviga, e non ci serve */
function an_provenienza($ref) {
    if (!$ref) return '';
    $h = parse_url($ref, PHP_URL_HOST);
    if (!$h) return '';
    $h = preg_replace('/^www\./', '', strtolower($h));
    if ($h === 'del-mar.it') return '';   /* navigazione interna */
    return substr($h, 0, 80);
}
