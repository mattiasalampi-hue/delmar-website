<?php
/*
  Riceve le visite dal sito. Sta nella radice perche' l'indirizzo lo
  scrive il browser a ogni pagina: piu' e' corto, meno byte.

  RISPONDE SEMPRE 204 E SEMPRE IN FRETTA. Se qualcosa qui dentro va
  storto non deve succedere niente a chi sta navigando: l'analitica e'
  un di piu', il sito viene prima. Percio' niente output, nessun errore
  mostrato, e la risposta parte prima ancora di scrivere sul database.
*/

header('Content-Type: text/plain');
/* Solo dal nostro sito: senza questo chiunque potrebbe gonfiare i
   numeri da qualunque pagina */
$org = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if ($org !== '' && strpos($org, 'del-mar.it') === false && strpos($org, 'localhost') === false) {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(204); exit; }

$ua = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';

require_once __DIR__ . '/analitica/comune.php';

if (an_robot($ua)) { http_response_code(204); exit; }

$crudo = file_get_contents('php://input');
$d = json_decode($crudo, true);
if (!is_array($d)) { http_response_code(204); exit; }

/* Chi sta navigando ha finito: la risposta parte adesso, il lavoro
   sotto lo facciamo con la connessione gia' chiusa */
http_response_code(204);
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
}

function an_taglia($v, $n) {
    $v = is_string($v) ? trim($v) : '';
    $v = str_replace(array("\r", "\n", "\0"), ' ', $v);
    return mb_substr($v, 0, $n);
}

try {
    $db = an_db();
    $giorno = date('Y-m-d');
    $ora = time();
    $imp = an_impronta($giorno);

    $tipo = isset($d['t']) ? $d['t'] : 'v';

    if ($tipo === 'e') {
        /* Un evento: modulo inviato, WhatsApp premuto, e simili. Sono i
           dati che contano davvero su un sito B2B — le visite dicono
           quanti passano, gli eventi quanti fanno qualcosa */
        $nome = an_taglia(isset($d['n']) ? $d['n'] : '', 40);
        if ($nome === '') exit;
        $q = $db->prepare('INSERT INTO eventi (giorno, istante, impronta, nome, dettaglio, percorso)
                           VALUES (?, ?, ?, ?, ?, ?)');
        $q->execute(array($giorno, $ora, $imp, $nome,
            an_taglia(isset($d['d']) ? $d['d'] : '', 120),
            an_taglia(isset($d['p']) ? $d['p'] : '', 160)));
        exit;
    }

    /* Campagne: solo le etichette utm, non l'indirizzo intero */
    $camp = '';
    if (!empty($d['u']) && is_array($d['u'])) {
        $pezzi = array();
        foreach (array('source', 'medium', 'campaign') as $k) {
            if (!empty($d['u'][$k])) $pezzi[] = $k[0] . ':' . an_taglia($d['u'][$k], 40);
        }
        $camp = implode(' ', $pezzi);
    }

    $q = $db->prepare('INSERT INTO visite
        (giorno, istante, impronta, percorso, titolo, provenienza, campagna,
         dispositivo, browser, sistema, larghezza, lingua)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $q->execute(array(
        $giorno, $ora, $imp,
        an_taglia(isset($d['p']) ? $d['p'] : '/', 160),
        an_taglia(isset($d['ti']) ? $d['ti'] : '', 120),
        an_provenienza(isset($d['r']) ? $d['r'] : ''),
        $camp,
        an_dispositivo($ua),
        an_browser($ua),
        an_sistema($ua),
        isset($d['w']) ? (int) $d['w'] : 0,
        an_taglia(substr(isset($_SERVER['HTTP_ACCEPT_LANGUAGE']) ? $_SERVER['HTTP_ACCEPT_LANGUAGE'] : '', 0, 5), 5)
    ));
} catch (Exception $e) {
    /* Nel registro del server, mai a schermo: un'analitica che rompe
       una pagina ha fatto piu' danni di quanti ne risolva */
    error_log('raccogli.php: ' . $e->getMessage());
}
