<?php
/*
  Search Console dentro il pannello.

  PERCHE' UN ACCOUNT DI SERVIZIO E NON OAUTH. Con OAuth servirebbe una
  schermata di consenso e un refresh token da custodire e rinnovare: e'
  la parte che si rompe da sola nei mesi, di solito il giorno che serve
  il dato. Un account di servizio si aggiunge come utente della
  proprieta' in Search Console, si firma da se' un gettone a ogni
  chiamata e non scade mai niente.

  NIENTE LIBRERIE, NIENTE COMPOSER. PHP 7.4 firma RS256 con
  openssl_sign, che sul server c'e' gia' (lo usa smtp.php per il TLS).
  Tirare dentro google/apiclient per fare due chiamate HTTP
  significherebbe centinaia di file da aggiornare per sempre.

  UNA COPIA LOCALE, NON INTERROGAZIONI AL VOLO. L'API e' lenta, ha
  quote, e i suoi dati arrivano comunque con due o tre giorni di
  ritardo: chiamarla a ogni apertura del pannello sarebbe lento e
  fragile per niente. Si scarica ogni sei ore e il pannello legge la
  tabella.

  SE IL COLLEGAMENTO SI ROMPE non deve cadere nient'altro: ogni errore
  finisce in una riga di stato che il pannello mostra accanto
  all'ultima copia, e le altre statistiche continuano a funzionare.
*/

require_once __DIR__ . '/comune.php';

define('SC_AMBITO', 'https://www.googleapis.com/auth/webmasters.readonly');
define('SC_GETTONE', 'https://oauth2.googleapis.com/token');

/* Quanto indietro riguardare a ogni giro. Non basta scaricare i giorni
   nuovi: Google riscrive i numeri dei giorni gia' passati per due o tre
   giorni dopo, quindi si riprendono sempre gli ultimi cinque e si
   sovrascrivono */
define('SC_RIPASSO', 5);

function sc_config() {
    $f = dirname(__DIR__) . '/config.php';
    $cfg = is_file($f) ? require $f : array();
    return array(
        'chiave' => isset($cfg['search_console_chiave']) ? $cfg['search_console_chiave'] : '',
        'sito'   => isset($cfg['search_console_sito']) ? $cfg['search_console_sito'] : ''
    );
}

function sc_collegata() {
    $c = sc_config();
    return $c['chiave'] !== '' && $c['sito'] !== '' && is_file($c['chiave']);
}

/* ── Il gettone ──────────────────────────────────────────────────── */

/* base64 per URL: senza +, / e = finali, come vuole la specifica JWT */
function sc_b64($s) {
    return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
}

function sc_gettone($chiaveFile) {
    /* Il gettone dura un'ora: si tiene da parte invece di rifarlo a
       ogni chiamata. In un file dentro _dati, che il web non serve */
    $cache = AN_DIR . '/sc-gettone.json';
    if (is_file($cache)) {
        $c = json_decode(file_get_contents($cache), true);
        if (is_array($c) && isset($c['scade']) && $c['scade'] > time() + 60) return $c['gettone'];
    }

    $k = json_decode(file_get_contents($chiaveFile), true);
    if (!is_array($k) || empty($k['client_email']) || empty($k['private_key'])) {
        throw new Exception('la chiave dell\'account di servizio non si legge');
    }

    $ora = time();
    $testa = sc_b64(json_encode(array('alg' => 'RS256', 'typ' => 'JWT')));
    $corpo = sc_b64(json_encode(array(
        'iss'   => $k['client_email'],
        'scope' => SC_AMBITO,
        'aud'   => SC_GETTONE,
        'iat'   => $ora,
        'exp'   => $ora + 3600
    )));

    $firma = '';
    if (!openssl_sign($testa . '.' . $corpo, $firma, $k['private_key'], OPENSSL_ALGO_SHA256)) {
        throw new Exception('la firma del gettone non riesce');
    }
    $jwt = $testa . '.' . $corpo . '.' . sc_b64($firma);

    $r = sc_posta(SC_GETTONE, http_build_query(array(
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion'  => $jwt
    )), 'application/x-www-form-urlencoded');

    $d = json_decode($r, true);
    if (!isset($d['access_token'])) {
        /* Il messaggio di Google e' l'unica cosa che dice se il
           problema e' la chiave, l'orologio o i permessi mancanti:
           buttarlo via vorrebbe dire indovinare */
        throw new Exception('gettone rifiutato: ' . substr($r, 0, 200));
    }

    file_put_contents($cache, json_encode(array(
        'gettone' => $d['access_token'],
        'scade'   => $ora + (int) $d['expires_in']
    )));
    @chmod($cache, 0600);

    return $d['access_token'];
}

/* Una chiamata HTTP e basta. curl se c'e', altrimenti i flussi: su
   questo hosting curl c'e', ma un fallback costa sei righe e toglie di
   mezzo una dipendenza dal fornitore.

   $corpo a null = GET. Serve per l'elenco delle sitemap, che e' l'unica
   cosa che non si chiede in POST */
function sc_posta($url, $corpo, $tipo, $gettone = '') {
    $testate = array();
    if ($corpo !== null) $testate[] = 'Content-Type: ' . $tipo;
    if ($gettone !== '') $testate[] = 'Authorization: Bearer ' . $gettone;

    if (function_exists('curl_init')) {
        $c = curl_init($url);
        $opt = array(
            CURLOPT_HTTPHEADER => $testate,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_CONNECTTIMEOUT => 8
        );
        if ($corpo !== null) {
            $opt[CURLOPT_POST] = true;
            $opt[CURLOPT_POSTFIELDS] = $corpo;
        }
        curl_setopt_array($c, $opt);
        $r = curl_exec($c);
        $err = curl_error($c);
        curl_close($c);
        if ($r === false) throw new Exception('rete: ' . $err);
        return $r;
    }

    $ctx = stream_context_create(array('http' => array(
        'method' => $corpo === null ? 'GET' : 'POST',
        'header' => implode("\r\n", $testate),
        'content' => $corpo === null ? '' : $corpo,
        'timeout' => 20,
        'ignore_errors' => true
    )));
    $r = @file_get_contents($url, false, $ctx);
    if ($r === false) throw new Exception('rete: chiamata fallita');
    return $r;
}

/* Chiede una fetta di searchAnalytics e restituisce le righe.
   Impaginata: Google ne da' al massimo 25000 per volta, e su sedici
   mesi di storico una parola sola puo' superarle */
function sc_interroga($url, $gettone, $dimensioni, $inizio, $fine, $canale = 'web') {
    $tutte = array();
    $salto = 0;
    do {
        $r = sc_posta($url, json_encode(array(
            'startDate'  => $inizio,
            'endDate'    => $fine,
            'dimensions' => $dimensioni,
            'rowLimit'   => 5000,
            'startRow'   => $salto,
            'type'       => $canale,
            /* dataState 'all' include anche gli ultimi due giorni, quelli
               che Google marca come provvisori e che di default non
               manderebbe affatto. Su un pannello che si guarda la
               mattina, "ieri non risulta niente" sembra un guasto: meglio
               un numero che nei giorni dopo si assesta — tanto lo
               riscarichiamo comunque, vedi SC_RIPASSO */
            'dataState'  => 'all'
        )), 'application/json', $gettone);

        $d = json_decode($r, true);
        if (isset($d['error'])) {
            throw new Exception(isset($d['error']['message']) ? $d['error']['message'] : 'errore da Google');
        }
        $righe = isset($d['rows']) ? $d['rows'] : array();
        foreach ($righe as $x) $tutte[] = $x;
        $salto += 5000;
    } while (count($righe) === 5000 && $salto < 50000);

    return $tutte;
}

/* ── La sincronizzazione ─────────────────────────────────────────── */

/* Torna true se ha scaricato qualcosa. Non solleva mai: gli errori
   finiscono nella riga di stato, perche' questa funzione viene
   chiamata a connessione gia' chiusa e un'eccezione qui non la
   vedrebbe nessuno */
function sc_sincronizza($forza = false) {
    if (!sc_collegata()) return false;

    $ultimo = (int) an_stato('ricerche_aggiornate');
    if (!$forza && $ultimo > time() - 21600) return false;   /* sei ore */

    /* Blocco: due aperture del pannello nello stesso momento
       chiamerebbero l'API due volte e si sovrascriverebbero a vicenda */
    $lucchetto = AN_DIR . '/sc-lavoro.lock';
    $fp = @fopen($lucchetto, 'c');
    if (!$fp) return false;
    if (!flock($fp, LOCK_EX | LOCK_NB)) { fclose($fp); return false; }

    /* Il giro completo sono una ventina di chiamate: sopra i 30 secondi
       di default PHP taglierebbe a meta', e l'ultima cosa scritta
       resterebbe li' senza che nessuno se ne accorga — gira a
       connessione gia' chiusa, quindi l'errore non lo vedrebbe nessuno */
    @set_time_limit(180);

    try {
        $cfg = sc_config();
        $gettone = sc_gettone($cfg['chiave']);

        /* Gli ultimi giorni: si riparte da qualche giorno prima
           dell'ultima volta perche' Google li riscrive (vedi
           SC_RIPASSO). Se non si e' mai sincronizzato, si prendono
           sedici mesi: e' tutto quello che Search Console conserva */
        $fine  = date('Y-m-d', strtotime('-1 day'));
        $inizio = $ultimo
            ? date('Y-m-d', strtotime('-' . SC_RIPASSO . ' day', $ultimo))
            : date('Y-m-d', strtotime('-16 month'));

        $sito = rawurlencode($cfg['sito']);
        $url = 'https://searchconsole.googleapis.com/webmasters/v3/sites/' . $sito . '/searchAnalytics/query';

        $db = an_db();
        $prese = 0;

        /* 1. Parola cercata x pagina di arrivo — il dettaglio fine */
        $righe = sc_interroga($url, $gettone, array('date', 'query', 'page'), $inizio, $fine);
        $ins = $db->prepare('INSERT OR REPLACE INTO ricerche
            (giorno, chiave, pagina, clic, impressioni, posizione) VALUES (?, ?, ?, ?, ?, ?)');
        $db->beginTransaction();
        foreach ($righe as $x) {
            $ins->execute(array(
                $x['keys'][0],
                mb_substr($x['keys'][1], 0, 200),
                mb_substr($x['keys'][2], 0, 200),
                (int) $x['clicks'], (int) $x['impressions'], (float) $x['position']
            ));
        }
        $db->commit();
        $prese += count($righe);

        /* 2. Le altre dimensioni, una interrogazione ciascuna.

           Nessuna di queste si ricava sommando le righe del punto 1:
           Google nasconde le parole cercate da pochissime persone, per
           non far risalire a chi ha cercato, quindi la somma delle
           query e' sistematicamente piu' bassa del vero. Ogni taglio
           va chiesto per intero, e i totali arrivano dal canale 'web'
           al punto 3. */
        $dim = array(
            'paese'       => array('date', 'country'),
            'dispositivo' => array('date', 'device'),
            'aspetto'     => array('date', 'searchAppearance')
        );
        $insD = $db->prepare('INSERT OR REPLACE INTO ricerche_dim
            (giorno, tipo, valore, clic, impressioni, posizione) VALUES (?, ?, ?, ?, ?, ?)');

        foreach ($dim as $tipo => $chiavi) {
            /* searchAppearance non si puo' chiedere insieme ad altro su
               alcune proprieta': se rifiuta, si salta quella e basta,
               non si butta via tutto il resto */
            try {
                $righe = sc_interroga($url, $gettone, $chiavi, $inizio, $fine);
            } catch (Exception $e) {
                continue;
            }
            $db->beginTransaction();
            foreach ($righe as $x) {
                $insD->execute(array(
                    $x['keys'][0], $tipo,
                    isset($x['keys'][1]) ? mb_substr($x['keys'][1], 0, 60) : '',
                    (int) $x['clicks'], (int) $x['impressions'], (float) $x['position']
                ));
            }
            $db->commit();
            $prese += count($righe);
        }

        /* 3. I CANALI. Search Console non misura solo la ricerca
           normale: tiene separate immagini, video, notizie e Discover.
           Di default l'API dà solo 'web', e per un ingrosso di pesce
           con le foto dei banchi la ricerca per immagini non è un
           dettaglio — è gente che cerca "branzino" e vede la nostra
           vasca.

           Una chiamata per canale, e chi non ha dati risponde vuoto
           senza lamentarsi. Se un canale non è disponibile sulla
           proprietà solleva: si salta quello e basta */
        foreach (array('web', 'image', 'video', 'news', 'discover', 'googleNews') as $canale) {
            try {
                $righe = sc_interroga($url, $gettone, array('date'), $inizio, $fine, $canale);
            } catch (Exception $e) {
                continue;
            }
            $db->beginTransaction();
            foreach ($righe as $x) {
                $insD->execute(array(
                    $x['keys'][0], 'canale', $canale,
                    (int) $x['clicks'], (int) $x['impressions'], (float) $x['position']
                ));
            }
            $db->commit();
            $prese += count($righe);
        }

        /* 4. Sitemap, indicizzazione e livello di permesso: non sono
           statistiche, sono lo stato di salute. Se falliscono non
           devono portarsi dietro i numeri appena scaricati, quindi
           stanno dentro un try loro */
        try { sc_sitemap($sito, $gettone); } catch (Exception $e) {
            an_stato('sitemap_errore', mb_substr($e->getMessage(), 0, 200));
        }
        try { sc_indicizzazione($cfg['sito'], $gettone); } catch (Exception $e) {
            an_stato('indice_errore', mb_substr($e->getMessage(), 0, 200));
        }
        try { sc_proprieta($sito, $gettone); } catch (Exception $e) { /* niente di grave */ }

        an_stato('ricerche_aggiornate', (string) time());
        an_stato('ricerche_errore', '');
        an_pulisci();
        return $prese > 0;

    } catch (Exception $ex) {
        /* Se e' saltato in mezzo a una scrittura, la transazione resta
           aperta e la riga di stato qui sotto non verrebbe mai scritta:
           si chiude prima di tutto il resto */
        if (isset($db) && $db->inTransaction()) $db->rollBack();
        an_stato('ricerche_errore', mb_substr($ex->getMessage(), 0, 300));
        return false;
    } finally {
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}

/* ── Sitemap ─────────────────────────────────────────────────────── */

/* Quante pagine Google dice di aver trovato nella sitemap e quando
   l'ha letta l'ultima volta. E' il controllo che si fa per primo
   quando una pagina nuova non compare: se la sitemap non viene letta
   da tre settimane, il problema non sono le parole chiave */
function sc_sitemap($sitoCodificato, $gettone) {
    $r = sc_posta('https://searchconsole.googleapis.com/webmasters/v3/sites/'
        . $sitoCodificato . '/sitemaps', null, '', $gettone);
    $d = json_decode($r, true);
    if (isset($d['error'])) {
        throw new Exception(isset($d['error']['message']) ? $d['error']['message'] : 'errore sitemap');
    }

    $out = array();
    foreach (isset($d['sitemap']) ? $d['sitemap'] : array() as $s) {
        $inviate = 0;
        $indicizzate = 0;
        foreach (isset($s['contents']) ? $s['contents'] : array() as $c) {
            $inviate += (int) (isset($c['submitted']) ? $c['submitted'] : 0);
            $indicizzate += (int) (isset($c['indexed']) ? $c['indexed'] : 0);
        }
        $out[] = array(
            'percorso'  => isset($s['path']) ? $s['path'] : '',
            'letta'     => isset($s['lastDownloaded']) ? $s['lastDownloaded'] : '',
            'errori'    => (int) (isset($s['errors']) ? $s['errors'] : 0),
            'avvisi'    => (int) (isset($s['warnings']) ? $s['warnings'] : 0),
            'inviate'   => $inviate,
            'indicizzate' => $indicizzate
        );
    }
    an_stato('sitemap', json_encode($out));
    an_stato('sitemap_errore', '');
    return $out;
}

/* ── Indicizzazione ──────────────────────────────────────────────── */

/* "Google questa pagina ce l'ha?" — la domanda che viene prima di
   tutte le altre: se la risposta e' no, nessuna statistica sulle
   ricerche ha senso.

   Si controllano solo le pagine vere del sito, che sono tre: l'API di
   ispezione ha una quota di 2000 al giorno ma va a una richiesta per
   indirizzo, e chiederle a raffica non servirebbe a niente.

   RICHIEDE PERMESSO "COMPLETA" sulla proprieta': con "Limitata" Google
   risponde 403. Se succede, il messaggio finisce nella riga di stato e
   il pannello lo dice, invece di lasciare il riquadro vuoto senza
   spiegazione. */
function sc_indicizzazione($sito, $gettone) {
    /* Gli indirizzi si leggono dalla NOSTRA sitemap invece di tenerli
       scritti qui: aggiungendo una pagina al sito, il pannello se ne
       accorge da solo. Un elenco a mano invecchia in silenzio, e la
       pagina nuova — proprio quella su cui ci si chiede "ma Google
       l'ha vista?" — sarebbe l'unica a mancare */
    $pagine = sc_indirizzi_sitemap($sito);
    if (!$pagine) $pagine = array($sito);

    $db = an_db();
    $ins = $db->prepare('INSERT OR REPLACE INTO pagine_google
        (url, stato, motivo, scansione, robots, aggiornato, verdetto,
         canonico_google, canonico_nostro, scaricamento, scansionata_come, ricchi)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

    foreach ($pagine as $u) {
        $r = sc_posta('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
            json_encode(array('inspectionUrl' => $u, 'siteUrl' => $sito, 'languageCode' => 'it')),
            'application/json', $gettone);
        $d = json_decode($r, true);
        if (isset($d['error'])) {
            throw new Exception(isset($d['error']['message']) ? $d['error']['message'] : 'errore ispezione');
        }
        $res = isset($d['inspectionResult']) ? $d['inspectionResult'] : array();
        $i = isset($res['indexStatusResult']) ? $res['indexStatusResult'] : array();

        /* I risultati arricchiti: sono i dati strutturati JSON-LD che
           abbiamo messo nella pagina. Sapere che Google li ha LETTI e
           quanti oggetti ci ha trovato è l'unico modo di scoprire che
           si sono rotti — altrimenti la pagina resta uguale e la scheda
           nei risultati sparisce senza dire niente */
        $ricchi = array();
        if (isset($res['richResultsResult']['detectedItems'])) {
            foreach ($res['richResultsResult']['detectedItems'] as $x) {
                $ricchi[] = (isset($x['richResultType']) ? $x['richResultType'] : '?')
                    . (isset($x['items']) ? ' (' . count($x['items']) . ')' : '');
            }
        }

        $ins->execute(array(
            $u,
            isset($i['coverageState']) ? mb_substr($i['coverageState'], 0, 120) : '',
            isset($i['indexingState']) ? mb_substr($i['indexingState'], 0, 60) : '',
            isset($i['lastCrawlTime']) ? $i['lastCrawlTime'] : '',
            isset($i['robotsTxtState']) ? $i['robotsTxtState'] : '',
            time(),
            isset($i['verdict']) ? $i['verdict'] : '',
            isset($i['googleCanonical']) ? mb_substr($i['googleCanonical'], 0, 200) : '',
            isset($i['userCanonical']) ? mb_substr($i['userCanonical'], 0, 200) : '',
            isset($i['pageFetchState']) ? $i['pageFetchState'] : '',
            isset($i['crawledAs']) ? $i['crawledAs'] : '',
            mb_substr(implode(', ', $ricchi), 0, 200)
        ));
    }

    /* Le pagine tolte dalla sitemap non devono restare a fare numero */
    $tieni = str_repeat('?,', count($pagine) - 1) . '?';
    $db->prepare('DELETE FROM pagine_google WHERE url NOT IN (' . $tieni . ')')->execute($pagine);

    an_stato('indice_errore', '');
}

/* Legge gli indirizzi dalla sitemap del sito. A mano invece che con
   SimpleXML: e' un elenco di <loc>, e non vale la pena dipendere da
   un'estensione che su un hosting condiviso potrebbe non esserci.

   Tetto a 40: l'API di ispezione ha una quota di 2000 al giorno ma va
   a una chiamata per indirizzo, e su un sito di tre pagine il tetto
   serve solo a non far esplodere niente se un domani la sitemap
   diventasse enorme */
function sc_indirizzi_sitemap($sito) {
    $xml = @file_get_contents(rtrim($sito, '/') . '/sitemap.xml');
    if ($xml === false) return array();
    if (!preg_match_all('#<loc>\s*([^<\s]+)\s*</loc>#i', $xml, $m)) return array();
    return array_slice(array_unique($m[1]), 0, 40);
}

/* Che permesso ha davvero l'account di servizio sulla proprieta'.
   Serve a rispondere in un colpo alla domanda "il riquadro e' vuoto
   perche' non ci sono dati o perche' non abbiamo il diritto di
   leggerli?" — due cause identiche a vedersi e opposte da risolvere */
function sc_proprieta($sitoCodificato, $gettone) {
    $r = sc_posta('https://searchconsole.googleapis.com/webmasters/v3/sites/' . $sitoCodificato,
        null, '', $gettone);
    $d = json_decode($r, true);
    if (isset($d['permissionLevel'])) an_stato('sc_permesso', $d['permissionLevel']);
}
