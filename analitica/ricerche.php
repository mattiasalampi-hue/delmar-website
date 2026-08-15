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

/* Una POST e basta. curl se c'e', altrimenti i flussi: su questo
   hosting curl c'e', ma un fallback costa sei righe e toglie di mezzo
   una dipendenza dal fornitore */
function sc_posta($url, $corpo, $tipo, $gettone = '') {
    $testate = array('Content-Type: ' . $tipo);
    if ($gettone !== '') $testate[] = 'Authorization: Bearer ' . $gettone;

    if (function_exists('curl_init')) {
        $c = curl_init($url);
        curl_setopt_array($c, array(
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $corpo,
            CURLOPT_HTTPHEADER => $testate,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_CONNECTTIMEOUT => 8
        ));
        $r = curl_exec($c);
        $err = curl_error($c);
        curl_close($c);
        if ($r === false) throw new Exception('rete: ' . $err);
        return $r;
    }

    $ctx = stream_context_create(array('http' => array(
        'method' => 'POST',
        'header' => implode("\r\n", $testate),
        'content' => $corpo,
        'timeout' => 20,
        'ignore_errors' => true
    )));
    $r = @file_get_contents($url, false, $ctx);
    if ($r === false) throw new Exception('rete: chiamata fallita');
    return $r;
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
        $ins = $db->prepare('INSERT OR REPLACE INTO ricerche
            (giorno, chiave, pagina, clic, impressioni, posizione) VALUES (?, ?, ?, ?, ?, ?)');

        $prese = 0;
        $salto = 0;
        do {
            $r = sc_posta($url, json_encode(array(
                'startDate'  => $inizio,
                'endDate'    => $fine,
                'dimensions' => array('date', 'query', 'page'),
                'rowLimit'   => 5000,
                'startRow'   => $salto,
                'type'       => 'web'
            )), 'application/json', $gettone);

            $d = json_decode($r, true);
            if (isset($d['error'])) {
                throw new Exception(isset($d['error']['message']) ? $d['error']['message'] : 'errore da Google');
            }
            $righe = isset($d['rows']) ? $d['rows'] : array();

            $db->beginTransaction();
            foreach ($righe as $x) {
                $ins->execute(array(
                    $x['keys'][0],
                    mb_substr($x['keys'][1], 0, 200),
                    mb_substr($x['keys'][2], 0, 200),
                    (int) $x['clicks'],
                    (int) $x['impressions'],
                    (float) $x['position']
                ));
            }
            $db->commit();

            $prese += count($righe);
            $salto += 5000;
            /* Meno di una pagina piena vuol dire che sono finite */
        } while (count($righe) === 5000 && $salto < 50000);

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
