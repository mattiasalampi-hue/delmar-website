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

/* L'ora italiana, non quella del server. Senza questa riga "oggi" nel
   pannello finisce a mezzanotte UTC, cioe' alle due del mattino d'estate:
   le visite serali di ieri comparirebbero in "oggi" */
date_default_timezone_set('Europe/Rome');

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
        lingua TEXT,
        /* rif: un codice a caso creato dal browser per QUELLA pagina
           vista. Serve solo a ritrovare la riga quando, chiudendo la
           scheda, arriva il secondo colpo con i secondi passati.
           Non identifica una persona: cambia a ogni pagina e non e'
           collegato a niente */
        rif TEXT,
        durata INTEGER DEFAULT 0
    )');
    $db->exec('CREATE INDEX IF NOT EXISTS i_visite_giorno ON visite(giorno)');
    $db->exec('CREATE INDEX IF NOT EXISTS i_visite_impronta ON visite(giorno, impronta)');
    $db->exec('CREATE INDEX IF NOT EXISTS i_visite_rif ON visite(rif)');

    /* Le colonne aggiunte dopo: su un database gia' popolato CREATE
       TABLE IF NOT EXISTS non le crea, e senza questo il pannello
       cadrebbe su "no such column" solo in produzione */
    an_colonna($db, 'visite', 'rif', 'TEXT');
    an_colonna($db, 'visite', 'durata', 'INTEGER DEFAULT 0');

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

    /* Copia locale di Search Console. Una copia e non interrogazioni al
       volo: l'API e' lenta, ha quote, e i suoi dati arrivano comunque
       con due o tre giorni di ritardo — chiamarla a ogni apertura del
       pannello sarebbe lento e fragile per niente */
    $db->exec('CREATE TABLE IF NOT EXISTS ricerche (
        giorno TEXT NOT NULL,
        chiave TEXT NOT NULL,
        pagina TEXT NOT NULL DEFAULT \'\',
        clic INTEGER NOT NULL DEFAULT 0,
        impressioni INTEGER NOT NULL DEFAULT 0,
        posizione REAL NOT NULL DEFAULT 0,
        PRIMARY KEY (giorno, chiave, pagina)
    )');
    $db->exec('CREATE INDEX IF NOT EXISTS i_ricerche_giorno ON ricerche(giorno)');

    /* Sacchetto per le cose che il codice deve ricordarsi fra una
       chiamata e l'altra: quando ha sincronizzato l'ultima volta, e
       simili */
    $db->exec('CREATE TABLE IF NOT EXISTS stato (
        chiave TEXT PRIMARY KEY,
        valore TEXT
    )');

    /* I totali dei periodi vecchi, riassunti da an_pulisci(). Creata
       qui e non solo li' perche' il pannello la legge: se la pulizia
       non e' ancora mai girata, una tabella mancante farebbe cadere il
       pannello invece di mostrare zero righe */
    $db->exec('CREATE TABLE IF NOT EXISTS totali (
        giorno TEXT PRIMARY KEY,
        visite INTEGER,
        visitatori INTEGER,
        azioni INTEGER
    )');

    return $db;
}

/* Aggiunge una colonna solo se non c'e' gia'. SQLite non ha
   ADD COLUMN IF NOT EXISTS, e rieseguirlo darebbe errore: si guarda
   prima cosa c'e' */
function an_colonna($db, $tabella, $nome, $tipo) {
    $c = $db->query('PRAGMA table_info(' . $tabella . ')')->fetchAll(PDO::FETCH_ASSOC);
    foreach ($c as $r) {
        if ($r['name'] === $nome) return;
    }
    $db->exec('ALTER TABLE ' . $tabella . ' ADD COLUMN ' . $nome . ' ' . $tipo);
}

function an_stato($chiave, $valore = null) {
    $db = an_db();
    if ($valore === null) {
        $q = $db->prepare('SELECT valore FROM stato WHERE chiave = ?');
        $q->execute(array($chiave));
        return $q->fetchColumn();
    }
    $q = $db->prepare('INSERT INTO stato (chiave, valore) VALUES (?, ?)
                       ON CONFLICT(chiave) DO UPDATE SET valore = excluded.valore');
    $q->execute(array($chiave, $valore));
    return $valore;
}

/* Pulizia. Le righe grezze oltre 14 mesi diventano totali giornalieri e
   poi spariscono: lo storico dei grafici resta, il database non cresce
   per sempre. 14 mesi perche' e' quello che serve a confrontare un mese
   con lo stesso mese dell'anno prima */
function an_pulisci() {
    $db = an_db();
    $limite = date('Y-m-d', strtotime('-14 month'));

    $q = $db->prepare('INSERT OR REPLACE INTO totali (giorno, visite, visitatori, azioni)
        SELECT v.giorno, COUNT(*), COUNT(DISTINCT v.impronta),
               (SELECT COUNT(*) FROM eventi e WHERE e.giorno = v.giorno)
        FROM visite v WHERE v.giorno < ? GROUP BY v.giorno');
    $q->execute(array($limite));

    $db->prepare('DELETE FROM visite WHERE giorno < ?')->execute(array($limite));
    $db->prepare('DELETE FROM eventi WHERE giorno < ?')->execute(array($limite));
    $db->prepare('DELETE FROM ricerche WHERE giorno < ?')->execute(array($limite));
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
