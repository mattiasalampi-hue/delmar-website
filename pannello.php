<?php
/*
  Pannello dell'analitica — la sala di controllo.

  PROTETTO DA PASSWORD, e la password non sta qui: sta in config.php,
  che e' escluso da git e negato dall'.htaccess. Sta come IMPRONTA e non
  in chiaro, cosi' nemmeno chi legge il file la conosce.

  Freno sui tentativi: cinque sbagliati e si aspetta. Senza, una pagina
  di accesso su un indirizzo prevedibile e' un invito a provare le
  password a raffica.

  DUE FONTI, DUE ZONE. Meta' dei numeri viene dal nostro contatore
  (tutti i visitatori, tempo reale), meta' da Search Console (solo la
  ricerca Google, 2-3 giorni di ritardo). Prima stavano mescolati e
  ogni riquadro andava interpretato; adesso la pagina e' divisa in due
  zone dichiarate e OGNI riquadro porta il bollino della sua fonte.
  Quando i numeri delle due zone non coincidono — e non coincideranno —
  non e' un errore: misurano cose diverse.

  L'ORDINE NON E' CASUALE. In cima le conversioni, non le visite: su un
  ingrosso B2B "quante richieste sono arrivate e da dove" e' l'unica
  cosa che cambia una decisione, il resto e' contorno.

  I CONTI STANNO IN analitica/statistiche.php, i disegni (imbuto,
  flusso, scintille) sono SVG e clip-path scritti qui: niente librerie
  di grafici da caricare per disegnare venti rettangoli.

  PHP 7.4: niente match(), niente ?->
*/
session_start();
require_once __DIR__ . '/analitica/statistiche.php';

$cfgFile = __DIR__ . '/config.php';
$cfg = is_file($cfgFile) ? require $cfgFile : array();
$impronta = isset($cfg['pannello_password']) ? $cfg['pannello_password'] : '';

$errore = '';

if (isset($_GET['esci'])) {
    session_destroy();
    header('Location: pannello.php');
    exit;
}

if (!empty($_POST['password'])) {
    $adesso = time();
    $tent = isset($_SESSION['tentativi']) ? $_SESSION['tentativi'] : array();
    $tent = array_filter($tent, function ($t) use ($adesso) { return $t > $adesso - 900; });

    if (count($tent) >= 5) {
        $errore = 'Troppi tentativi. Riprova fra un quarto d\'ora.';
    } elseif ($impronta === '') {
        $errore = 'Password non configurata sul server.';
    } elseif (password_verify($_POST['password'], $impronta)) {
        session_regenerate_id(true);
        $_SESSION['dentro'] = true;
        $_SESSION['tentativi'] = array();
        header('Location: pannello.php');
        exit;
    } else {
        $tent[] = $adesso;
        $_SESSION['tentativi'] = $tent;
        /* Messaggio identico in tutti i casi: dire "password sbagliata"
           invece di "utente inesistente" e' il modo classico di regalare
           informazioni a chi prova */
        $errore = 'Password errata.';
    }
}

$dentro = !empty($_SESSION['dentro']);

function e($s) { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }
function n($x) { return number_format((float) $x, 0, ',', '.'); }
function dec($x, $c = 1) { return number_format((float) $x, $c, ',', '.'); }

/* Secondi in una forma che si legge al volo: "1m 20s" invece di 80 */
function durata($s) {
    $s = (int) round($s);
    if ($s <= 0) return '—';
    if ($s < 60) return $s . 's';
    return floor($s / 60) . 'm ' . str_pad($s % 60, 2, '0', STR_PAD_LEFT) . 's';
}

/* La variazione. $buono dice da che parte si va: sul rimbalzo scendere
   e' una buona notizia, e colorarlo di rosso perche' il numero cala
   sarebbe il contrario di quello che serve */
function delta($d, $buono = 1) {
    if ($d === null) return '<span class="pn-d pn-d-muto">nuovo</span>';
    $cl = abs($d) < 1 ? 'pn-d-muto' : (($d > 0 ? 1 : -1) * $buono > 0 ? 'pn-d-su' : 'pn-d-giu');
    return '<span class="pn-d ' . $cl . '">' . ($d > 0 ? '+' : '−')
         . dec(abs($d), 0) . '%</span>';
}

/* Il bollino della fonte, su OGNI riquadro: e' il pezzo che evita di
   leggere un numero di Google come se venisse dal contatore o viceversa */
function fonte($quale) {
    if ($quale === 'google') {
        return '<span class="pn-fonte pn-fonte-google">Google</span>';
    }
    return '<span class="pn-fonte pn-fonte-sito">Sito</span>';
}

/* ── I disegni ───────────────────────────────────────────────────── */

/* La scintilla: l'andamento in trenta pixel d'altezza dentro la scheda
   del numero. Non ha assi ne' etichette apposta — dice solo la forma */
function scintilla($valori) {
    $q = count($valori);
    if ($q < 2) return '';
    $max = max(1, max($valori));
    $punti = array();
    foreach ($valori as $i => $v) {
        $x = $q > 1 ? $i / ($q - 1) * 100 : 0;
        $y = 26 - ($v / $max * 24);
        $punti[] = round($x, 1) . ',' . round($y, 1);
    }
    $linea = implode(' ', $punti);
    $area = '0,28 ' . $linea . ' 100,28';
    return '<svg class="pn-scintilla" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">'
         . '<polygon points="' . $area . '" class="pn-scintilla-area"></polygon>'
         . '<polyline points="' . $linea . '" class="pn-scintilla-linea"></polyline>'
         . '</svg>';
}

/* L'imbuto a trapezi: il restringimento E' il dato, e un trapezio lo fa
   vedere meglio di una barra. Niente SVG: forme ritagliate col
   clip-path, cosi' il testo resta HTML e si legge a ogni misura */

/* Numero per il CSS: SEMPRE col punto decimale. dec() usa la virgola
   italiana, e "polygon(27,7% ...)" e' CSS invalido — il ritaglio
   sparisce in silenzio e i trapezi tornano rettangoli. Successo al
   collaudo, non in produzione, ed e' per questo che il collaudo c'e' */
function css_num($x) {
    return number_format((float) $x, 1, '.', '');
}

/* Un gradino = una riga: etichetta e numero GRANDE sopra, barra sotto,
   e fra un gradino e l'altro la frase che conta — "ne prosegue il X%".
   Niente trapezi centrati: con un gradino a zero collassavano in una
   clessidra, e il testo galleggiava staccato dalle forme. L'ultimo
   gradino e' WhatsApp e si veste del suo verde: e' il punto d'arrivo
   di tutto l'imbuto, deve essere inconfondibile */
function imbuto_html($gradini) {
    $base = max(1, $gradini[0]['n']);
    $fuori = '';
    foreach ($gradini as $i => $g) {
        $q = $g['n'] / $base * 100;

        if ($i > 0) {
            $prev = $gradini[$i - 1]['n'];
            $persi = $prev - $g['n'];
            if ($prev > 0 && $g['n'] <= $prev) {
                $frase = 'ne prosegue il <strong>' . dec($g['n'] / $prev * 100, 0) . '%</strong>'
                       . ($persi > 0 ? ' · si fermano in ' . n($persi) : '');
            } elseif ($prev > 0) {
                /* I gradini non sono sottoinsiemi rigidi: si puo' aprire
                   il catalogo senza aver letto meta' pagina. Sopra il
                   100% la percentuale confonde, meglio dirlo in parole */
                $frase = 'qui sono <strong>di più</strong> del passo prima (+' . n($g['n'] - $prev) . ')';
            } else {
                $frase = 'il passo prima è a zero';
            }
            $fuori .= '<div class="pn-fu-salto">' . $frase . '</div>';
        }

        $fuori .= '<div class="pn-fu-passo' . (!empty($g['wa']) ? ' pn-fu-wa' : '') . '">'
            . '<div class="pn-fu-info">'
            . '<span class="pn-fu-et">' . e($g['et'])
            . (!empty($g['nota']) ? ' <small>' . e($g['nota']) . '</small>' : '')
            . '</span>'
            . '<span class="pn-fu-num">' . n($g['n'])
            . '<small> · ' . dec($q, 0) . '% di chi arriva</small></span>'
            . '</div>'
            . '<div class="pn-fu-barra"><i style="width: ' . css_num(max(1.5, $q)) . '%"></i></div>'
            . '</div>';
    }
    return '<div class="pn-fu">' . $fuori . '</div>';
}

/* Il flusso a nastri: da dove entrano -> dove atterrano -> come
   finisce. Tre colonne e nastri spessi quanto le persone che passano.
   E' l'unico disegno in SVG vero perche' le curve non si fanno in CSS;
   i conti arrivano fatti da st_flusso() */
function flusso_svg($flussi) {
    $W = 660; $H = 300; $BAR = 10; $VUOTO = 8;

    $colori = array(
        'organico' => '#4dd0b0', 'diretto' => '#8b93c9', 'social' => '#c77dff',
        'referral' => '#f0a24c', 'campagna' => '#ff6b4d', 'non si sa' => '#5c6284'
    );

    /* Totali per colonna */
    $sorg = array(); $sez = array(); $esiti = array('Contattano' => 0, 'Solo visita' => 0);
    foreach ($flussi as $s => $perSez) {
        foreach ($perSez as $z => $v) {
            $tot = $v['si'] + $v['no'];
            $sorg[$s] = (isset($sorg[$s]) ? $sorg[$s] : 0) + $tot;
            $sez[$z]  = (isset($sez[$z]) ? $sez[$z] : 0) + $tot;
            $esiti['Contattano']  += $v['si'];
            $esiti['Solo visita'] += $v['no'];
        }
    }
    $totale = array_sum($sorg);
    if (!$totale) return '';
    arsort($sorg);

    /* Le sezioni nell'ordine fisso del sito, solo quelle attraversate */
    $sezOrd = array();
    foreach (st_sezioni_elenco() as $z) if (!empty($sez[$z])) $sezOrd[$z] = $sez[$z];

    /* Posizioni verticali: ogni colonna somma allo stesso totale, i
       nodi si impilano con un piccolo vuoto in mezzo */
    $scala = function ($nodi) use ($H, $VUOTO, $totale) {
        $utile = $H - $VUOTO * max(0, count($nodi) - 1);
        $pos = array(); $y = 0;
        foreach ($nodi as $k => $v) {
            $h = $totale ? $v / $totale * $utile : 0;
            $pos[$k] = array('y' => $y, 'h' => $h, 'pieno' => 0);
            $y += $h + $VUOTO;
        }
        return $pos;
    };
    $pSorg = $scala($sorg);
    $pSez  = $scala($sezOrd);
    $pEsi  = $scala($esiti);

    $x0 = 0; $x1 = ($W - $BAR) / 2; $x2 = $W - $BAR;
    $svg = '<svg class="pn-flusso" viewBox="0 0 ' . $W . ' ' . $H
         . '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Flusso dei visitatori">';

    /* Lo spessore di un nastro va calcolato sulla stessa scala dei
       nodi: quota del totale per l'altezza utile della colonna piu'
       affollata delle due. Per semplicita' — e perche' le tre colonne
       sommano allo stesso totale — si usa la scala della colonna con
       piu' nodi, che e' la piu' stretta */
    $spessore = function ($v, $nodi) use ($H, $VUOTO, $totale) {
        $utile = $H - $VUOTO * max(0, count($nodi) - 1);
        return $totale ? $v / $totale * $utile : 0;
    };

    /* Nastri sorgente -> sezione */
    foreach ($sorg as $s => $vs) {
        foreach ($sezOrd as $z => $vz) {
            $v = 0;
            if (isset($flussi[$s][$z])) $v = $flussi[$s][$z]['si'] + $flussi[$s][$z]['no'];
            if (!$v) continue;
            $hA = $spessore($v, $sorg);
            $hB = $spessore($v, $sezOrd);
            $ya = $pSorg[$s]['y'] + $pSorg[$s]['pieno'];
            $yb = $pSez[$z]['y'] + $pSez[$z]['pieno'];
            $pSorg[$s]['pieno'] += $hA;
            $pSez[$z]['pieno']  += $hB;
            $xa = $x0 + $BAR; $xb = $x1;
            $mx = ($xa + $xb) / 2;
            $c = isset($colori[$s]) ? $colori[$s] : '#8b93c9';
            $svg .= '<path class="pn-fl-nastro" fill="' . $c . '" d="M ' . $xa . ' ' . round($ya, 1)
                 . ' C ' . $mx . ' ' . round($ya, 1) . ', ' . $mx . ' ' . round($yb, 1) . ', ' . $xb . ' ' . round($yb, 1)
                 . ' L ' . $xb . ' ' . round($yb + $hB, 1)
                 . ' C ' . $mx . ' ' . round($yb + $hB, 1) . ', ' . $mx . ' ' . round($ya + $hA, 1) . ', ' . $xa . ' ' . round($ya + $hA, 1)
                 . ' Z"></path>';
        }
    }

    /* Nastri sezione -> esito. Il "pieno" delle sezioni riparte da
       zero: i nastri in uscita si impilano per conto loro */
    foreach ($pSez as $z => $d) $pSez[$z]['pieno'] = 0;
    foreach ($sezOrd as $z => $vz) {
        foreach (array('Contattano' => 'si', 'Solo visita' => 'no') as $et => $chiave) {
            $v = 0;
            foreach ($flussi as $s => $perSez) {
                if (isset($perSez[$z])) $v += $perSez[$z][$chiave];
            }
            if (!$v) continue;
            $hA = $spessore($v, $sezOrd);
            $hB = $spessore($v, $esiti);
            $ya = $pSez[$z]['y'] + $pSez[$z]['pieno'];
            $yb = $pEsi[$et]['y'] + $pEsi[$et]['pieno'];
            $pSez[$z]['pieno'] += $hA;
            $pEsi[$et]['pieno'] += $hB;
            $xa = $x1 + $BAR; $xb = $x2;
            $mx = ($xa + $xb) / 2;
            $c = $et === 'Contattano' ? '#ff6b4d' : '#3a4066';
            $svg .= '<path class="pn-fl-nastro" fill="' . $c . '" d="M ' . $xa . ' ' . round($ya, 1)
                 . ' C ' . $mx . ' ' . round($ya, 1) . ', ' . $mx . ' ' . round($yb, 1) . ', ' . $xb . ' ' . round($yb, 1)
                 . ' L ' . $xb . ' ' . round($yb + $hB, 1)
                 . ' C ' . $mx . ' ' . round($yb + $hB, 1) . ', ' . $mx . ' ' . round($ya + $hA, 1) . ', ' . $xa . ' ' . round($ya + $hA, 1)
                 . ' Z"></path>';
        }
    }

    /* I nodi sopra i nastri, con l'etichetta e il numero */
    foreach ($pSorg as $s => $d) {
        $c = isset($colori[$s]) ? $colori[$s] : '#8b93c9';
        $svg .= '<rect x="' . $x0 . '" y="' . round($d['y'], 1) . '" width="' . $BAR
             . '" height="' . max(2, round($d['h'], 1)) . '" rx="2" fill="' . $c . '"></rect>';
        $svg .= '<text class="pn-fl-et" x="' . ($x0 + $BAR + 6) . '" y="'
             . round($d['y'] + max(2, $d['h']) / 2 + 4, 1) . '">' . e($s) . ' · ' . n($sorg[$s]) . '</text>';
    }
    foreach ($pSez as $z => $d) {
        $svg .= '<rect x="' . $x1 . '" y="' . round($d['y'], 1) . '" width="' . $BAR
             . '" height="' . max(2, round($d['h'], 1)) . '" rx="2" fill="#aeb6e8"></rect>';
        $svg .= '<text class="pn-fl-et pn-fl-centro" x="' . ($x1 + $BAR + 6) . '" y="'
             . round($d['y'] + max(2, $d['h']) / 2 + 4, 1) . '">' . e($z) . ' · ' . n($sezOrd[$z]) . '</text>';
    }
    foreach ($pEsi as $et => $d) {
        $c = $et === 'Contattano' ? '#ff6b4d' : '#3a4066';
        $svg .= '<rect x="' . $x2 . '" y="' . round($d['y'], 1) . '" width="' . $BAR
             . '" height="' . max(2, round($d['h'], 1)) . '" rx="2" fill="' . $c . '"></rect>';
        $svg .= '<text class="pn-fl-et pn-fl-fine" x="' . ($x2 - 6) . '" y="'
             . round($d['y'] + max(2, $d['h']) / 2 + 4, 1) . '">' . e($et) . ' · ' . n($esiti[$et]) . '</text>';
    }

    $svg .= '</svg>';
    return $svg;
}

$giorni = isset($_GET['g']) ? (int) $_GET['g'] : 30;
$per = st_periodo($giorni);
$giorni = $per['giorni'];
$metrica = (isset($_GET['m']) && $_GET['m'] === 'v') ? 'viste' : 'visitatori';

/* ── Scarico CSV ─────────────────────────────────────────────────
   Prima di qualunque HTML: un solo byte stampato prima e le
   intestazioni non partono piu' */
if ($dentro && isset($_GET['csv'])) {
    $nome = 'delmar-analitica-' . $per['da'] . '_' . $per['a'] . '.csv';
    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="' . $nome . '"');
    /* Il segnabyte serve a Excel: senza, le lettere accentate delle
       intestazioni arrivano storte */
    echo "\xEF\xBB\xBF";
    $f = fopen('php://output', 'w');
    foreach (st_csv($per['da'], $per['a']) as $riga) fputcsv($f, $riga, ';');
    fclose($f);
    exit;
}

$D = array();
if ($dentro) {
    $C = st_confronto($per);
    $D['imbuto']    = st_imbuto($per['da'], $per['a']);
    $D['canali']    = st_canali_contatto($per['da'], $per['a']);
    $D['canali_p']  = st_canali_contatto($per['da_prec'], $per['a_prec']);
    $D['cta_pag']   = st_cta_pagine($per['da'], $per['a']);
    $D['fonti_k']   = st_sorgenti_contatti($per['da'], $per['a']);
    $D['fonti']     = st_sorgenti($per['da'], $per['a']);
    $D['serie']     = st_serie($per['da'], $per['a']);
    $D['serie_pre'] = st_serie($per['da_prec'], $per['a_prec']);
    $D['serie_k']   = st_serie_contatti($per['da'], $per['a']);
    $D['serie_wa']  = st_serie_contatti($per['da'], $per['a'], 'whatsapp');
    $D['mappa']     = st_mappa_sito($per['da'], $per['a']);
    $D['flusso']    = st_flusso($per['da'], $per['a']);
    $D['percorsi']  = st_percorsi($per['da'], $per['a']);
    $D['pagine']    = st_pagine($per['da'], $per['a']);
    $D['orari']     = st_orari($per['da'], $per['a']);
    $D['adesso']    = st_adesso();
    $D['disp']      = st_dispositivi($per['da'], $per['a']);
    $D['browser']   = st_browser($per['da'], $per['a']);
    $D['azioni']    = st_azioni($per['da'], $per['a']);
    $D['ricerche']  = st_ricerche($per['da'], $per['a']);
    $D['occasioni'] = st_occasioni($per['da'], $per['a']);
    $D['g_tot']     = st_google($per['da'], $per['a']);
    $D['g_prec']    = st_google($per['da_prec'], $per['a_prec']);
    $D['g_serie']   = st_google_serie($per['da'], $per['a']);
    $D['g_pagine']  = st_google_pagine($per['da'], $per['a']);
    $D['g_paesi']   = st_google_dim('paese', $per['da'], $per['a']);
    $D['g_disp']    = st_google_dim('dispositivo', $per['da'], $per['a']);
    $D['g_aspetto'] = st_google_dim('aspetto', $per['da'], $per['a']);
    $D['g_canali']  = st_google_canali($per['da'], $per['a']);
    $D['permesso']  = an_stato('sc_permesso');
    $D['sitemap']   = st_sitemap();
    $D['indice']    = st_indicizzazione();
    $D['sc_quando'] = an_stato('ricerche_aggiornate');
    $D['sc_errore'] = an_stato('ricerche_errore');
    $D['sm_errore'] = an_stato('sitemap_errore');
    $D['ix_errore'] = an_stato('indice_errore');
}

/* I codici paese di Google sono a tre lettere (ita, deu, fra). In un
   elenco da leggere di fretta valgono meno del nome scritto: qui ci
   sono quelli che possono capitare a un ingrosso di pesce in Toscana,
   per gli altri resta la sigla in maiuscolo */
function paese($c) {
    $n = array(
        'ita' => 'Italia', 'fra' => 'Francia', 'deu' => 'Germania', 'esp' => 'Spagna',
        'che' => 'Svizzera', 'aut' => 'Austria', 'gbr' => 'Regno Unito', 'usa' => 'Stati Uniti',
        'nld' => 'Paesi Bassi', 'bel' => 'Belgio', 'prt' => 'Portogallo', 'grc' => 'Grecia',
        'svn' => 'Slovenia', 'hrv' => 'Croazia', 'rou' => 'Romania', 'pol' => 'Polonia',
        'alb' => 'Albania', 'mar' => 'Marocco', 'tun' => 'Tunisia', 'chn' => 'Cina',
        'ind' => 'India', 'bra' => 'Brasile', 'arg' => 'Argentina', 'can' => 'Canada'
    );
    $c = strtolower((string) $c);
    return isset($n[$c]) ? $n[$c] : strtoupper($c);
}

/* Verde o rosso in base al VERDETTO, che è un codice, non alla
   descrizione, che arriva tradotta in italiano da Google e cambia
   parole quando vuole. Il testo si mostra com'è: è già in italiano e
   già chiaro ("Inviata e indicizzata", "L'URL è sconosciuto a
   Google") */
function statoIndice($verdetto) {
    if ($verdetto === 'PASS') return 'pn-stato-si';
    if ($verdetto === 'FAIL' || $verdetto === 'PARTIAL') return 'pn-stato-no';
    return '';
}

/* I canali di Search Console, in italiano. googleNews e news sono due
   cose diverse per Google (l'app Notizie e la sezione Notizie della
   ricerca) e restano separati anche qui */
function canale($c) {
    $n = array(
        'web' => 'Ricerca normale', 'image' => 'Ricerca per immagini',
        'video' => 'Video', 'news' => 'Notizie', 'discover' => 'Discover',
        'googleNews' => 'App Google Notizie'
    );
    return isset($n[$c]) ? $n[$c] : $c;
}

/* Lo stato dello scaricamento della pagina: se Google non riesce a
   prenderla, tutto il resto e' rumore */
function scaricamento($s) {
    $n = array(
        'SUCCESSFUL' => '', 'SOFT_404' => 'sembra una pagina vuota',
        'BLOCKED_ROBOTS_TXT' => 'bloccata da robots.txt',
        'NOT_FOUND' => 'non trovata (404)', 'ACCESS_DENIED' => 'accesso negato',
        'SERVER_ERROR' => 'errore del server', 'REDIRECT_ERROR' => 'reindirizzamento rotto',
        'ACCESS_FORBIDDEN' => 'vietata (403)', 'BLOCKED_4XX' => 'bloccata (4xx)',
        'INTERNAL_CRAWL_ERROR' => 'errore interno di Google',
        'INVALID_URL' => 'indirizzo non valido'
    );
    return isset($n[$s]) ? $n[$s] : '';
}
?><!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sala di controllo — DelMar</title>
    <meta name="robots" content="noindex, nofollow" />
    <link rel="icon" href="assets/favicon.png?v=1" type="image/png" />
    <link rel="stylesheet" href="css/poppins.css?v=1" />
    <link rel="stylesheet" href="css/pannello.css?v=5" />
  </head>
  <body>
<?php if (!$dentro): ?>
    <div class="pn-porta">
      <form method="post" class="pn-accesso">
        <p class="pn-occhiello">DelMar</p>
        <h1>Sala di controllo</h1>
        <?php if ($errore): ?><p class="pn-errore"><?= e($errore) ?></p><?php endif; ?>
        <label for="pw">Password</label>
        <input type="password" name="password" id="pw" autocomplete="current-password" autofocus />
        <button type="submit">Entra</button>
      </form>
    </div>
<?php else:
    $o = $C['ora']; $p = $C['prima']; $dl = $C['delta'];
    $tetto = 1;
    foreach ($D['serie'] as $r)     { if ($r[$metrica] > $tetto) $tetto = $r[$metrica]; }
    foreach ($D['serie_pre'] as $r) { if ($r[$metrica] > $tetto) $tetto = $r[$metrica]; }
    $tot_k = array_sum($D['fonti_k']);
    $tot_f = array_sum($D['fonti']);
    $giorniSet = array('Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom');
    $vv = array(); foreach ($D['serie'] as $r) $vv[] = (int) $r['visitatori'];
    $kk = array(); foreach ($D['serie_k'] as $r) $kk[] = (int) $r['n'];
    $canaliEt = array(
        'whatsapp'       => 'WhatsApp',
        'telefono'       => 'Telefono',
        'modulo-inviato' => 'Modulo',
        'email'          => 'Email'
    );
?>
    <header class="pn-testa">
      <div class="pn-testa-marca">
        <p class="pn-occhiello">DelMar</p>
        <h1>Sala di controllo</h1>
      </div>
      <p class="pn-adesso-chip" title="Persone sul sito negli ultimi 30 minuti">
        <span class="pn-lucina" aria-hidden="true"></span>
        <strong><?= n($D['adesso']['persone']) ?></strong>&nbsp;sul sito adesso
      </p>
      <nav class="pn-periodo">
        <?php foreach (array(7 => '7 giorni', 30 => '30 giorni', 90 => '90 giorni', 365 => '1 anno') as $g => $et): ?>
          <a href="?g=<?= $g ?>" class="<?= $giorni == $g ? 'pn-vivo' : '' ?>"><?= $et ?></a>
        <?php endforeach; ?>
        <a href="?g=<?= $giorni ?>&amp;csv=1" class="pn-scarico">Scarica CSV</a>
        <a href="?esci=1" class="pn-esci">Esci</a>
      </nav>
    </header>

    <main class="pn-corpo">
      <p class="pn-confronto">
        Dal <?= e(date('d/m', strtotime($per['da']))) ?> al <?= e(date('d/m', strtotime($per['a']))) ?>,
        confrontati con i <?= $giorni ?> giorni prima
        (<?= e(date('d/m', strtotime($per['da_prec']))) ?>–<?= e(date('d/m', strtotime($per['a_prec']))) ?>).
      </p>

      <!-- Le due fonti, dichiarate una volta per tutte -->
      <div class="pn-legenda">
        <p><span class="pn-fonte pn-fonte-sito">Sito</span>
          il nostro contatore: <strong>tutti</strong> i visitatori, senza cookie, in tempo reale.</p>
        <p><span class="pn-fonte pn-fonte-google">Google</span>
          Search Console: cosa succede <strong>nei risultati di ricerca</strong>, con 2–3 giorni di ritardo.
          Misurano cose diverse: quando non coincidono, non è un errore.</p>
      </div>

      <!-- 1. CONVERSIONI — in cima, prima delle visite. WhatsApp per
           primo: e' il canale con cui i locali ORDINANO, gli altri
           numeri gli fanno da contorno -->
      <?php
        $wa   = isset($D['canali']['whatsapp']) ? $D['canali']['whatsapp'] : array('n' => 0, 'persone' => 0);
        $waP  = isset($D['canali_p']['whatsapp']) ? $D['canali_p']['whatsapp'] : array('n' => 0, 'persone' => 0);
        $ww = array(); foreach ($D['serie_wa'] as $r) $ww[] = (int) $r['n'];
      ?>
      <section class="pn-numeri">
        <div class="pn-numero pn-numero-vivo">
          <span class="pn-n"><?= n($wa['persone']) ?></span>
          <span class="pn-e">hanno aperto WhatsApp<br /><?= n($wa['n']) ?> clic
            (<?= n($waP['persone']) ?> prima) <?= delta(st_variazione($wa['persone'], $waP['persone'])) ?></span>
          <?= scintilla($ww) ?>
        </div>
        <div class="pn-numero pn-numero-vivo">
          <span class="pn-n"><?= n($o['contatti']) ?></span>
          <span class="pn-e">contatti in tutto<br />WhatsApp, telefono, modulo, email <?= delta($dl['contatti']) ?></span>
          <?= scintilla($kk) ?>
        </div>
        <div class="pn-numero">
          <span class="pn-n"><?= dec($o['conversione'], 1) ?>%</span>
          <span class="pn-e">contattano<br />su 100 visitatori <?= delta($dl['conversione']) ?></span>
        </div>
        <div class="pn-numero">
          <span class="pn-n"><?= n($o['visitatori']) ?></span>
          <span class="pn-e">visitatori <?= delta($dl['visitatori']) ?></span>
          <?= scintilla($vv) ?>
        </div>
      </section>

      <section class="pn-secondari">
        <span><strong><?= n($o['viste']) ?></strong> pagine viste <?= delta($dl['viste']) ?></span>
        <span><strong><?= n($o['sessioni']) ?></strong> sessioni <?= delta($dl['sessioni']) ?></span>
        <span><strong><?= dec($o['rimbalzo'], 0) ?>%</strong> se ne vanno subito <?= delta($dl['rimbalzo'], -1) ?></span>
        <span><strong><?= durata($o['permanenza']) ?></strong> di permanenza media
          <small>su <?= n($o['misurate']) ?> di <?= n($o['viste']) ?> viste</small></span>
      </section>

      <!-- ══ ZONA SITO ══════════════════════════════════════════════ -->
      <div class="pn-zona pn-zona-sito">
        <h2>Misurato sul sito</h2>
        <p>Il contatore di casa: ogni visitatore, ogni clic, adesso.</p>
      </div>

      <!-- 2. I CANALI — come alzano la mano, uno per uno -->
      <section class="pn-riquadro pn-importante">
        <?= fonte('sito') ?>
        <h2>Come contattano</h2>
        <p class="pn-sotto">Persone, non clic: chi tocca due volte WhatsApp conta uno</p>
        <div class="pn-numeri pn-numeri-fitti">
          <?php foreach ($canaliEt as $ck => $cet):
              $cv = isset($D['canali'][$ck]) ? $D['canali'][$ck] : array('n' => 0, 'persone' => 0);
              $cp = isset($D['canali_p'][$ck]) ? $D['canali_p'][$ck] : array('n' => 0, 'persone' => 0);
          ?>
            <div class="pn-numero">
              <span class="pn-n"><?= n($cv['persone']) ?></span>
              <span class="pn-e"><?= e($cet) ?><br />
                <small><?= n($cv['n']) ?> <?= $ck === 'modulo-inviato' ? 'invii' : 'clic' ?></small>
                <?= delta(st_variazione($cv['persone'], $cp['persone'])) ?></span>
            </div>
          <?php endforeach; ?>
        </div>
      </section>

      <div class="pn-griglia pn-griglia-larga">
        <!-- 3. IMBUTO a trapezi -->
        <section class="pn-riquadro pn-importante">
          <?= fonte('sito') ?>
          <h2>Dove si perdono</h2>
          <p class="pn-sotto">Quante persone arrivano fino a lì — prodotti e zone contati dal 19/08, prima la sonda lì non c'era</p>
          <?= imbuto_html($D['imbuto']) ?>
        </section>

        <!-- 4. FLUSSO a nastri -->
        <section class="pn-riquadro pn-importante">
          <?= fonte('sito') ?>
          <h2>Il flusso</h2>
          <p class="pn-sotto">Da dove entrano → dove atterrano → come finisce. Lo spessore è quante persone</p>
          <?php $fl = flusso_svg($D['flusso']); ?>
          <?php if ($fl): ?>
            <div class="pn-flusso-guscio"><?= $fl ?></div>
          <?php else: ?>
            <p class="pn-vuoto">Ancora nessun flusso in questo periodo.</p>
          <?php endif; ?>
        </section>
      </div>

      <!-- 5. MAPPA DEL SITO -->
      <section class="pn-riquadro">
        <?= fonte('sito') ?>
        <h2>La mappa del sito</h2>
        <p class="pn-sotto">Dove vive il traffico, sezione per sezione — e i passaggi più battuti fra una sezione e l'altra</p>
        <div class="pn-mappa">
          <?php foreach ($D['mappa'] as $nome => $sz):
              if (!$sz['visite'] && $nome === 'Altro') continue;
              $maxPag = 1;
              foreach ($sz['pagine'] as $pg) { if ($pg['v'] > $maxPag) $maxPag = $pg['v']; }
          ?>
            <div class="pn-nodo">
              <div class="pn-nodo-testa">
                <h3><?= e($nome) ?></h3>
                <?php if ($sz['contatti']): ?>
                  <span class="pn-nodo-k"><?= n($sz['contatti']) ?> contatti</span>
                <?php endif; ?>
              </div>
              <p class="pn-nodo-visite"><?= n($sz['visite']) ?>
                <small>viste · <?= n($sz['persone']) ?> pers. · <?= durata($sz['tempo']) ?></small></p>
              <?php foreach (array_slice($sz['pagine'], 0, 3) as $pg): ?>
                <div class="pn-riga pn-riga-mini" style="--q: <?= round($pg['v'] / $maxPag * 100) ?>%">
                  <span class="pn-et"><?= e($pg['percorso']) ?></span>
                  <span class="pn-val"><?= n($pg['v']) ?></span>
                </div>
              <?php endforeach; ?>
              <?php if (!$sz['visite']): ?><p class="pn-vuoto">Nessuna visita.</p><?php endif; ?>
            </div>
          <?php endforeach; ?>
        </div>
        <?php if ($D['percorsi']): ?>
          <p class="pn-sotto pn-sotto-stacco">I passaggi fra sezioni, dentro la stessa visita:</p>
          <div class="pn-percorsi">
            <?php $maxP = max($D['percorsi']); ?>
            <?php foreach ($D['percorsi'] as $et => $v): ?>
              <div class="pn-riga" style="--q: <?= round($v / $maxP * 100) ?>%">
                <span class="pn-et"><?= e($et) ?></span>
                <span class="pn-val"><?= n($v) ?></span>
              </div>
            <?php endforeach; ?>
          </div>
        <?php endif; ?>
      </section>

      <div class="pn-griglia">
        <!-- 6. DA QUALE PAGINA contattano -->
        <section class="pn-riquadro pn-importante">
          <?= fonte('sito') ?>
          <h2>Da quale pagina contattano</h2>
          <p class="pn-sotto">La pagina su cui è partito il clic o l'invio</p>
          <?php $tot_cta = 0; foreach ($D['cta_pag'] as $r) $tot_cta += (int) $r['n']; ?>
          <?php foreach ($D['cta_pag'] as $r): $q = $tot_cta ? $r['n'] / $tot_cta * 100 : 0; ?>
            <div class="pn-riga" style="--q: <?= round($q) ?>%">
              <span class="pn-et"><?= e($r['percorso']) ?></span>
              <span class="pn-val"><?= n($r['persone']) ?><small> pers. · <?= n($r['n']) ?> azioni</small></span>
            </div>
          <?php endforeach; ?>
          <?php if (!$D['cta_pag']): ?>
            <p class="pn-vuoto">Nessun contatto in questo periodo.</p>
          <?php endif; ?>
        </section>

        <!-- 7. DA DOVE ARRIVA CHI CONTATTA -->
        <section class="pn-riquadro pn-importante">
          <?= fonte('sito') ?>
          <h2>Da dove arriva chi contatta</h2>
          <p class="pn-sotto">La sorgente dei soli visitatori che hanno agito</p>
          <?php foreach ($D['fonti_k'] as $et => $v): $q = $tot_k ? $v / $tot_k * 100 : 0; ?>
            <div class="pn-riga" style="--q: <?= round($q) ?>%">
              <span class="pn-et"><?= e($et) ?></span>
              <span class="pn-val"><?= n($v) ?><small> · <?= dec($q, 0) ?>%</small></span>
            </div>
          <?php endforeach; ?>
          <?php if (!$D['fonti_k']): ?>
            <p class="pn-vuoto">Nessun contatto in questo periodo.</p>
          <?php endif; ?>
        </section>

        <!-- 8. SORGENTI DI TUTTI -->
        <section class="pn-riquadro">
          <?= fonte('sito') ?>
          <h2>Da dove arrivano tutti</h2>
          <p class="pn-sotto">Se il traffico se lo guadagna il sito o dipende da altro</p>
          <?php foreach ($D['fonti'] as $et => $v): if (!$v) continue; $q = $tot_f ? $v / $tot_f * 100 : 0; ?>
            <div class="pn-riga" style="--q: <?= round($q) ?>%">
              <span class="pn-et"><?= e($et) ?></span>
              <span class="pn-val"><?= n($v) ?><small> · <?= dec($q, 0) ?>%</small></span>
            </div>
          <?php endforeach; ?>
          <?php if (!$tot_f): ?><p class="pn-vuoto">—</p><?php endif; ?>
        </section>
      </div>

      <!-- 9. ANDAMENTO -->
      <section class="pn-riquadro">
        <?= fonte('sito') ?>
        <h2>Andamento</h2>
        <p class="pn-sotto">
          La tacca chiara è lo stesso giorno del periodo precedente ·
          <a href="?g=<?= $giorni ?>&amp;m=u" class="<?= $metrica === 'visitatori' ? 'pn-vivo-t' : '' ?>">visitatori</a> ·
          <a href="?g=<?= $giorni ?>&amp;m=v" class="<?= $metrica === 'viste' ? 'pn-vivo-t' : '' ?>">pagine viste</a>
        </p>
        <?php if (!array_sum(array_column($D['serie'], $metrica))): ?>
          <p class="pn-vuoto">Ancora nessun dato in questo periodo.</p>
        <?php else: ?>
        <div class="pn-grafico">
          <?php foreach ($D['serie'] as $i => $r):
              $pre = isset($D['serie_pre'][$i]) ? $D['serie_pre'][$i][$metrica] : 0; ?>
            <div class="pn-colonna" title="<?= e(date('d/m', strtotime($r['giorno']))) ?> — <?= n($r[$metrica]) ?> (prima: <?= n($pre) ?>)">
              <div class="pn-barra" style="height: <?= max(1, round($r[$metrica] / $tetto * 100)) ?>%"></div>
              <?php if ($pre > 0): ?>
                <i class="pn-eco" style="bottom: <?= round($pre / $tetto * 100, 1) ?>%"></i>
              <?php endif; ?>
            </div>
          <?php endforeach; ?>
        </div>
        <div class="pn-asse">
          <span><?= e(date('d/m', strtotime($D['serie'][0]['giorno']))) ?></span>
          <span><?= e(date('d/m', strtotime($D['serie'][count($D['serie']) - 1]['giorno']))) ?></span>
        </div>
        <?php endif; ?>
      </section>

      <!-- 10. QUANDO guardano il sito -->
      <section class="pn-riquadro">
        <?= fonte('sito') ?>
        <h2>Quando guardano il sito</h2>
        <p class="pn-sotto">Ora italiana. Per un fornitore di ristoranti, sapere che aprono il sito a mezzanotte è operativo</p>
        <?php if (!$D['orari']['max']): ?>
          <p class="pn-vuoto">—</p>
        <?php else: ?>
        <div class="pn-orari">
          <div class="pn-orari-testa">
            <span></span>
            <?php for ($h = 0; $h < 24; $h++): ?>
              <span class="pn-ora"><?= $h % 3 === 0 ? $h : '' ?></span>
            <?php endfor; ?>
          </div>
          <?php foreach ($giorniSet as $i => $et): ?>
            <div class="pn-orari-riga">
              <span class="pn-orari-et"><?= $et ?></span>
              <?php for ($h = 0; $h < 24; $h++): $v = $D['orari']['griglia'][$i][$h]; ?>
                <span class="pn-cella" style="--i: <?= $v ? round(.15 + .85 * $v / $D['orari']['max'], 2) : 0 ?>"
                      title="<?= $et ?> <?= $h ?>:00 — <?= n($v) ?>"></span>
              <?php endfor; ?>
            </div>
          <?php endforeach; ?>
        </div>
        <?php endif; ?>
      </section>

      <div class="pn-griglia">
        <!-- 11. PAGINE -->
        <section class="pn-riquadro">
          <?= fonte('sito') ?>
          <h2>Pagine</h2>
          <?php foreach ($D['pagine'] as $r): $q = $o['viste'] ? $r['viste'] / $o['viste'] * 100 : 0; ?>
            <div class="pn-riga" style="--q: <?= round($q) ?>%">
              <span class="pn-et"><?= e($r['percorso']) ?>
                <small><?= durata($r['permanenza']) ?> in media</small></span>
              <span class="pn-val"><?= n($r['viste']) ?></span>
            </div>
          <?php endforeach; ?>
          <?php if (!$D['pagine']): ?><p class="pn-vuoto">—</p><?php endif; ?>
        </section>

        <!-- 12. AZIONI in dettaglio -->
        <section class="pn-riquadro">
          <?= fonte('sito') ?>
          <h2>Azioni</h2>
          <?php foreach ($D['azioni'] as $r): ?>
            <div class="pn-riga pn-riga-piatta">
              <span class="pn-et"><?= e($r['nome']) ?>
                <?php if ($r['dettaglio']): ?><small><?= e($r['dettaglio']) ?></small><?php endif; ?></span>
              <span class="pn-val"><?= n($r['n']) ?><small> / <?= n($r['u']) ?> pers.</small></span>
            </div>
          <?php endforeach; ?>
          <?php if (!$D['azioni']): ?><p class="pn-vuoto">—</p><?php endif; ?>
        </section>

        <!-- 13. ADESSO -->
        <section class="pn-riquadro">
          <?= fonte('sito') ?>
          <h2>Adesso</h2>
          <p class="pn-sotto"><strong><?= n($D['adesso']['persone']) ?></strong> negli ultimi 30 minuti</p>
          <?php foreach ($D['adesso']['ultime'] as $r): ?>
            <div class="pn-riga pn-riga-piatta">
              <span class="pn-et"><?= e($r['percorso']) ?>
                <?php if ($r['provenienza']): ?><small>da <?= e($r['provenienza']) ?></small><?php endif; ?></span>
              <span class="pn-val"><small><?= e(date('d/m H:i', $r['istante'])) ?></small></span>
            </div>
          <?php endforeach; ?>
          <?php if (!$D['adesso']['ultime']): ?><p class="pn-vuoto">—</p><?php endif; ?>
        </section>

        <!-- 14. DISPOSITIVI E BROWSER -->
        <section class="pn-riquadro">
          <?= fonte('sito') ?>
          <h2>Dispositivi e browser</h2>
          <?php foreach (array_merge($D['disp'], $D['browser']) as $r): $q = $o['viste'] ? $r['v'] / $o['viste'] * 100 : 0; ?>
            <div class="pn-riga" style="--q: <?= round($q) ?>%">
              <span class="pn-et"><?= e($r['et']) ?></span>
              <span class="pn-val"><?= dec($q, 0) ?>%</span>
            </div>
          <?php endforeach; ?>
        </section>
      </div>

      <!-- ══ ZONA GOOGLE ════════════════════════════════════════════ -->
      <div class="pn-zona pn-zona-google">
        <h2>Visto da Google</h2>
        <p>
          <?php if ($D['sc_quando']): ?>
            <?php /* Le lettere di una parola dentro il formato di date() sono
                     codici, non testo: vanno protette una per una con la
                     barra rovesciata, o "alle" diventa am/pm + giorno + fuso */ ?>
            Search Console, scaricata il <?= e(date('d/m \a\l\l\e H:i', (int) $D['sc_quando'])) ?>
            · <a href="?g=<?= $giorni ?>&amp;risincronizza=1">riscarica adesso</a>
            · i dati di Google arrivano con due o tre giorni di ritardo
          <?php else: ?>
            Search Console non è ancora collegata: mancano
            <code>search_console_chiave</code> e <code>search_console_sito</code>
            in <code>config.php</code>.
          <?php endif; ?>
        </p>
      </div>

      <?php
        $g = $D['g_tot']; $gp = $D['g_prec'];
        $gTetto = 1;
        foreach ($D['g_serie'] as $r) { if ($r['impressioni'] > $gTetto) $gTetto = $r['impressioni']; }
      ?>
      <section class="pn-riquadro pn-google">
        <?= fonte('google') ?>
        <h2>La ricerca Google</h2>

        <?php if ($D['sc_errore']): ?>
          <p class="pn-avviso">Ultimo scarico fallito: <?= e($D['sc_errore']) ?></p>
        <?php endif; ?>

        <?php if (!$g['impressioni'] && !$g['clic']): ?>
          <p class="pn-vuoto">
            Nessun dato per questo periodo. Su una proprietà appena verificata è
            normale: Search Console elabora i primi numeri in un giorno o due.
          </p>
        <?php else: ?>

        <div class="pn-numeri pn-numeri-fitti">
          <div class="pn-numero">
            <span class="pn-n"><?= n($g['clic']) ?></span>
            <span class="pn-e">clic da Google <?= delta(st_variazione($g['clic'], $gp['clic'])) ?></span>
          </div>
          <div class="pn-numero">
            <span class="pn-n"><?= n($g['impressioni']) ?></span>
            <span class="pn-e">volte che siamo comparsi <?= delta(st_variazione($g['impressioni'], $gp['impressioni'])) ?></span>
          </div>
          <div class="pn-numero">
            <span class="pn-n"><?= dec($g['ctr'], 1) ?>%</span>
            <span class="pn-e">di chi ci vede ci clicca <?= delta(st_variazione($g['ctr'], $gp['ctr'])) ?></span>
          </div>
          <div class="pn-numero">
            <span class="pn-n"><?= dec($g['posizione'], 1) ?></span>
            <span class="pn-e">posizione media <?= delta(st_variazione($g['posizione'], $gp['posizione']), -1) ?></span>
          </div>
        </div>

        <p class="pn-sotto pn-sotto-stacco">
          Colonna chiara: quante volte siamo comparsi. Colonna piena: i clic.
        </p>
        <div class="pn-grafico">
          <?php foreach ($D['g_serie'] as $r): ?>
            <div class="pn-colonna"
                 title="<?= e(date('d/m', strtotime($r['giorno']))) ?> — <?= n($r['clic']) ?> clic su <?= n($r['impressioni']) ?> comparse">
              <div class="pn-barra pn-barra-eco" style="height: <?= max(1, round($r['impressioni'] / $gTetto * 100)) ?>%"></div>
              <div class="pn-barra pn-barra-clic" style="height: <?= max(0, round($r['clic'] / $gTetto * 100)) ?>%"></div>
            </div>
          <?php endforeach; ?>
        </div>
        <div class="pn-asse">
          <span><?= e(date('d/m', strtotime($D['g_serie'][0]['giorno']))) ?></span>
          <span><?= e(date('d/m', strtotime($D['g_serie'][count($D['g_serie']) - 1]['giorno']))) ?></span>
        </div>
        <?php endif; ?>
      </section>

      <div class="pn-griglia">
        <section class="pn-riquadro pn-google">
          <?= fonte('google') ?>
          <h2>Ricerche che portano clic</h2>
          <?php foreach ($D['ricerche'] as $r): ?>
            <div class="pn-riga pn-riga-piatta">
              <span class="pn-et"><?= e($r['chiave']) ?></span>
              <span class="pn-val"><?= n($r['clic']) ?><small> clic · pos. <?= dec($r['posizione'], 1) ?></small></span>
            </div>
          <?php endforeach; ?>
          <?php if (!$D['ricerche']): ?><p class="pn-vuoto">—</p><?php endif; ?>
        </section>

        <section class="pn-riquadro pn-google">
          <?= fonte('google') ?>
          <h2>Occasioni</h2>
          <p class="pn-sotto">Ci vedono ma non ci cliccano: qui basta poco per guadagnare</p>
          <?php foreach ($D['occasioni'] as $r): ?>
            <div class="pn-riga pn-riga-piatta">
              <span class="pn-et"><?= e($r['chiave']) ?></span>
              <span class="pn-val"><?= n($r['impressioni']) ?><small> viste · pos. <?= dec($r['pos'], 1) ?></small></span>
            </div>
          <?php endforeach; ?>
          <?php if (!$D['occasioni']): ?><p class="pn-vuoto">—</p><?php endif; ?>
        </section>

        <section class="pn-riquadro pn-google">
          <?= fonte('google') ?>
          <h2>Pagine nei risultati</h2>
          <p class="pn-sotto">Tante comparse e pochi clic = il titolo non convince</p>
          <?php foreach ($D['g_pagine'] as $r):
              $ctr = $r['impressioni'] ? $r['clic'] / $r['impressioni'] * 100 : 0; ?>
            <div class="pn-riga pn-riga-piatta">
              <span class="pn-et"><?= e(preg_replace('#^https?://[^/]+#', '', $r['pagina'])) ?>
                <small><?= n($r['impressioni']) ?> comparse · <?= dec($ctr, 1) ?>%</small></span>
              <span class="pn-val"><?= n($r['clic']) ?></span>
            </div>
          <?php endforeach; ?>
          <?php if (!$D['g_pagine']): ?><p class="pn-vuoto">—</p><?php endif; ?>
        </section>

        <section class="pn-riquadro pn-google">
          <?= fonte('google') ?>
          <h2>Paesi</h2>
          <?php foreach ($D['g_paesi'] as $r): $q = $g['impressioni'] ? $r['impressioni'] / $g['impressioni'] * 100 : 0; ?>
            <div class="pn-riga" style="--q: <?= round($q) ?>%">
              <span class="pn-et"><?= e(paese($r['valore'])) ?>
                <small><?= n($r['impressioni']) ?> comparse</small></span>
              <span class="pn-val"><?= n($r['clic']) ?><small> clic</small></span>
            </div>
          <?php endforeach; ?>
          <?php if (!$D['g_paesi']): ?><p class="pn-vuoto">—</p><?php endif; ?>
        </section>

        <section class="pn-riquadro pn-google">
          <?= fonte('google') ?>
          <h2>Da che dispositivo cercano</h2>
          <p class="pn-sotto">Qui c'è anche chi ci ha visti e non è mai entrato</p>
          <?php foreach ($D['g_disp'] as $r): $q = $g['impressioni'] ? $r['impressioni'] / $g['impressioni'] * 100 : 0; ?>
            <div class="pn-riga" style="--q: <?= round($q) ?>%">
              <span class="pn-et"><?= e(strtolower($r['valore']) === 'mobile' ? 'telefono'
                    : (strtolower($r['valore']) === 'desktop' ? 'scrivania'
                    : (strtolower($r['valore']) === 'tablet' ? 'tavoletta' : $r['valore']))) ?></span>
              <span class="pn-val"><?= dec($q, 0) ?>%<small> · <?= n($r['clic']) ?> clic</small></span>
            </div>
          <?php endforeach; ?>
          <?php if (!$D['g_disp']): ?><p class="pn-vuoto">—</p><?php endif; ?>
        </section>

        <section class="pn-riquadro pn-google">
          <?= fonte('google') ?>
          <h2>Dove ci trovano</h2>
          <p class="pn-sotto">Le immagini contano a parte: per un ingrosso di pesce non è un dettaglio</p>
          <?php
            $totCan = 0;
            foreach ($D['g_canali'] as $r) $totCan += $r['impressioni'];
          ?>
          <?php foreach ($D['g_canali'] as $r): $q = $totCan ? $r['impressioni'] / $totCan * 100 : 0; ?>
            <div class="pn-riga" style="--q: <?= round($q) ?>%">
              <span class="pn-et"><?= e(canale($r['valore'])) ?>
                <small><?= n($r['impressioni']) ?> comparse · pos. <?= dec($r['posizione'], 1) ?></small></span>
              <span class="pn-val"><?= n($r['clic']) ?><small> clic</small></span>
            </div>
          <?php endforeach; ?>
          <?php if (!$D['g_canali']): ?><p class="pn-vuoto">—</p><?php endif; ?>
        </section>

        <?php if ($D['g_aspetto']): ?>
        <section class="pn-riquadro pn-google">
          <?= fonte('google') ?>
          <h2>Come compariamo</h2>
          <p class="pn-sotto">Risultato normale, scheda, recensioni…</p>
          <?php foreach ($D['g_aspetto'] as $r): ?>
            <div class="pn-riga pn-riga-piatta">
              <span class="pn-et"><?= e($r['valore']) ?></span>
              <span class="pn-val"><?= n($r['clic']) ?><small> clic / <?= n($r['impressioni']) ?></small></span>
            </div>
          <?php endforeach; ?>
        </section>
        <?php endif; ?>

        <section class="pn-riquadro pn-google">
          <?= fonte('google') ?>
          <h2>Google ci vede?</h2>
          <p class="pn-sotto">Se una pagina non è indicizzata, nessuna statistica sulle ricerche la riguarda</p>
          <?php foreach ($D['indice'] as $r):
              $guai = array();
              $sc = scaricamento($r['scaricamento']);
              if ($sc !== '') $guai[] = $sc;
              /* Il canonico scelto da Google diverso dal nostro e' la
                 trappola che non si vede da nessun'altra parte: da quel
                 momento le statistiche finiscono sull'altra pagina */
              if ($r['canonico_google'] && $r['canonico_nostro']
                  && $r['canonico_google'] !== $r['canonico_nostro']) {
                  $guai[] = 'Google preferisce ' . preg_replace('#^https?://[^/]+#', '', $r['canonico_google']);
              }
          ?>
            <div class="pn-riga pn-riga-piatta">
              <span class="pn-et"><?= e(preg_replace('#^https?://[^/]+/?#', '/', $r['url'])) ?>
                <small>
                  <?php if ($r['scansione']): ?>vista il <?= e(date('d/m/Y', strtotime($r['scansione']))) ?><?php endif; ?>
                  <?php if ($r['scansionata_come'] === 'MOBILE'): ?> · da telefono<?php endif; ?>
                  <?php if ($r['ricchi']): ?> · dati strutturati: <?= e($r['ricchi']) ?><?php endif; ?>
                  <?php if ($guai): ?> · <strong><?= e(implode(' · ', $guai)) ?></strong><?php endif; ?>
                </small>
              </span>
              <span class="pn-val pn-stato <?= statoIndice($r['verdetto']) ?>">
                <?= e($r['stato'] !== '' ? $r['stato'] : '—') ?>
              </span>
            </div>
          <?php endforeach; ?>
          <?php foreach ($D['sitemap'] as $s): ?>
            <div class="pn-riga pn-riga-piatta">
              <span class="pn-et"><?= e(preg_replace('#^https?://[^/]+#', '', $s['percorso'])) ?>
                <small><?= $s['letta'] ? 'letta il ' . e(date('d/m/Y', strtotime($s['letta']))) : 'mai letta' ?></small>
              </span>
              <span class="pn-val"><?= n($s['inviate']) ?><small> indirizzi<?= $s['errori'] ? ' · ' . n($s['errori']) . ' errori' : '' ?></small></span>
            </div>
          <?php endforeach; ?>
          <?php if (!$D['indice'] && !$D['sitemap']): ?><p class="pn-vuoto">—</p><?php endif; ?>
          <?php if ($D['permesso']): ?>
            <p class="pn-sotto pn-sotto-stacco">
              Permesso dell'account di servizio sulla proprietà:
              <strong><?= e($D['permesso']) ?></strong>.
              Sta qui perché un riquadro vuoto per mancanza di dati e uno vuoto
              per mancanza di diritti si assomigliano, e si risolvono in modi opposti.
            </p>
          <?php endif; ?>
          <?php if ($D['ix_errore'] || $D['sm_errore']): ?>
            <p class="pn-avviso">
              <?= e($D['ix_errore'] ? $D['ix_errore'] : $D['sm_errore']) ?>
              <br />Serve il permesso <strong>Completa</strong> in Search Console: l'account
              di servizio ha <strong>Limitata</strong>, che basta per le ricerche ma non per
              l'ispezione degli indirizzi.
            </p>
          <?php endif; ?>
        </section>
      </div>

      <p class="pn-nota">
        <span id="pn-esclusione" class="pn-esclusione">—</span>
      </p>

      <p class="pn-nota">
        Nessun cookie, nessun dato mandato a terzi, nessun indirizzo IP conservato:
        di ogni visitatore resta un'impronta che cambia ogni notte e diventa
        irreversibile dopo due giorni. Per questo il conteggio dei visitatori è
        <strong>per giornata</strong> e non dice chi torna dopo una settimana:
        è il prezzo scelto in cambio del non dover chiedere il consenso — e del
        misurare tutti, non solo chi accetta. Le sessioni si ricavano con la
        regola dei 30 minuti e per lo stesso motivo non attraversano la
        mezzanotte.
      </p>
    </main>
    <script src="js/pannello.js?v=1" defer></script>
<?php endif; ?>
  </body>
</html>
<?php
/* La sincronizzazione con Search Console va QUI, dopo l'ultimo byte
   della pagina e con la connessione gia' chiusa: chiamare l'API prima
   significherebbe far aspettare due secondi a chi apre il pannello per
   dei dati che comunque arrivano da Google con due giorni di ritardo.
   Cosi' la pagina mostra sempre subito la copia locale, e quella nuova
   si vede al giro dopo. */
if ($dentro) {
    if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
    require_once __DIR__ . '/analitica/ricerche.php';
    sc_sincronizza(isset($_GET['risincronizza']));
}
