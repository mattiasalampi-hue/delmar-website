<?php
/*
  Le interrogazioni del pannello, tutte qui.

  PERCHE' UN FILE A PARTE. In pannello.php stavano mescolate all'HTML:
  finche' erano otto righe andava bene, ma le domande vere di questo
  pannello ("quanti visitatori diventano contatti, e da dove arrivano
  quelli che lo diventano") sono interrogazioni lunghe con
  sottointerrogazioni, e dentro un template non si rileggono piu'.

  NIENTE FUNZIONI FINESTRA (OVER / LAG). Le sessioni si ricaverebbero
  in tre righe con LAG(), ma quello richiede SQLite 3.25 o piu' nuovo e
  su un hosting condiviso la versione la decide qualcun altro: se un
  giorno il server tornasse indietro, il pannello morirebbe tutto
  insieme. Le stesse cose si ottengono con NOT EXISTS, che funziona da
  sempre.

  COSA E' UNA SESSIONE. Non c'e' una colonna: una visita comincia una
  sessione nuova se la stessa impronta non ha viste nella mezz'ora
  precedente. E' la regola dei 30 minuti, quella che usano tutti.

  COSA E' UN CONTATTO. Modulo inviato, WhatsApp, telefono o email
  premuti. Su un ingrosso B2B e' l'unico numero che cambia una
  decisione: le visite dicono quanti passano, questo dice quanti
  alzano la mano.

  ATTENZIONE ALLE IMPRONTE FRA GIORNI DIVERSI. L'impronta cambia ogni
  notte (vedi comune.php): confrontarla fra due giorni diversi non
  significa niente. Per questo ogni unione fra visite ed eventi passa
  SEMPRE da (giorno, impronta) e mai dalla sola impronta, e per questo
  le sessioni non attraversano la mezzanotte.

  PHP 7.4: niente match(), niente ?->
*/

require_once __DIR__ . '/comune.php';

/* I nomi degli eventi che valgono come contatto. In un posto solo:
   se domani si aggiunge un pulsante, si tocca questa riga e cambiano
   insieme conversioni, imbuto e sorgenti */
function st_contatti() {
    return array('modulo-inviato', 'whatsapp', 'telefono', 'email');
}

function st_q($sql, $p = array()) {
    $q = an_db()->prepare($sql);
    $q->execute($p);
    return $q->fetchAll(PDO::FETCH_ASSOC);
}

function st_uno($sql, $p = array()) {
    $r = st_q($sql, $p);
    return $r ? $r[0] : array();
}

/* Il periodo, e quello di pari durata subito prima. Un numero da solo
   non dice niente: 287 visitatori e' buono o brutto solo rispetto a
   prima */
function st_periodo($giorni) {
    $giorni = max(1, min(365, (int) $giorni));
    $a  = date('Y-m-d');
    $da = date('Y-m-d', strtotime('-' . ($giorni - 1) . ' day'));
    return array(
        'giorni' => $giorni,
        'da' => $da,
        'a'  => $a,
        'da_prec' => date('Y-m-d', strtotime($da . ' -' . $giorni . ' day')),
        'a_prec'  => date('Y-m-d', strtotime($da . ' -1 day'))
    );
}

/* La variazione percentuale. Da zero non si calcola nessuna
   percentuale (sarebbe infinito): in quel caso si restituisce null e
   il pannello mostra un trattino invece di un "+100%" inventato */
function st_variazione($ora, $prima) {
    if ($prima <= 0) return null;
    return ($ora - $prima) / $prima * 100;
}

/* ── Il sommario, per un periodo qualsiasi ───────────────────────── */

function st_sommario($da, $a) {
    $c = st_contatti();
    $in = implode(',', array_fill(0, count($c), '?'));

    $b = st_uno(
        'SELECT COUNT(*) viste, COUNT(DISTINCT giorno || impronta) visitatori
         FROM visite WHERE giorno BETWEEN ? AND ?', array($da, $a));

    /* Inizi di sessione: nessuna vista della stessa impronta nella
       mezz'ora prima */
    $s = st_uno(
        'SELECT COUNT(*) n FROM visite v
         WHERE v.giorno BETWEEN ? AND ?
           AND NOT EXISTS (SELECT 1 FROM visite p
                           WHERE p.giorno = v.giorno AND p.impronta = v.impronta
                             AND p.istante < v.istante AND p.istante > v.istante - 1800)',
        array($da, $a));

    /* Rimbalzi: inizi di sessione senza nessuna vista nella mezz'ora
       DOPO. E' esatto, non un'approssimazione: per la regola dei 30
       minuti una sessione di due pagine ha per forza la seconda entro
       quella mezz'ora */
    $r = st_uno(
        'SELECT COUNT(*) n FROM visite v
         WHERE v.giorno BETWEEN ? AND ?
           AND NOT EXISTS (SELECT 1 FROM visite p
                           WHERE p.giorno = v.giorno AND p.impronta = v.impronta
                             AND p.istante < v.istante AND p.istante > v.istante - 1800)
           AND NOT EXISTS (SELECT 1 FROM visite q
                           WHERE q.giorno = v.giorno AND q.impronta = v.impronta
                             AND q.istante > v.istante AND q.istante <= v.istante + 1800)',
        array($da, $a));

    /* La permanenza si sa solo per le visite che hanno mandato il
       secondo colpo: chi chiude col tasto indietro subito a volte non
       fa in tempo. Si tiene il conto di quante sono misurate, cosi'
       il pannello puo' dire su quante e' fatta la media invece di
       spacciarla per tutte */
    $p = st_uno(
        'SELECT AVG(durata) media, COUNT(*) misurate
         FROM visite WHERE giorno BETWEEN ? AND ? AND durata > 0', array($da, $a));

    $k = st_uno(
        'SELECT COUNT(DISTINCT giorno || impronta) n FROM eventi
         WHERE giorno BETWEEN ? AND ? AND nome IN (' . $in . ')',
        array_merge(array($da, $a), $c));

    $m = st_uno(
        "SELECT COUNT(DISTINCT giorno || impronta) n FROM eventi
         WHERE giorno BETWEEN ? AND ? AND nome = 'modulo-inviato'", array($da, $a));

    $vis = (int) $b['visitatori'];
    $ses = (int) $s['n'];

    return array(
        'viste'       => (int) $b['viste'],
        'visitatori'  => $vis,
        'sessioni'    => $ses,
        'rimbalzo'    => $ses ? (int) $r['n'] / $ses * 100 : 0,
        'permanenza'  => (float) (isset($p['media']) ? $p['media'] : 0),
        'misurate'    => (int) (isset($p['misurate']) ? $p['misurate'] : 0),
        'contatti'    => (int) $k['n'],
        'moduli'      => (int) $m['n'],
        'conversione' => $vis ? (int) $k['n'] / $vis * 100 : 0
    );
}

/* Sommario del periodo e di quello prima, con le variazioni gia'
   calcolate: al pannello arriva roba da stampare, non da elaborare */
function st_confronto($per) {
    $ora    = st_sommario($per['da'], $per['a']);
    $prima  = st_sommario($per['da_prec'], $per['a_prec']);
    $delta  = array();
    foreach ($ora as $k => $v) {
        $delta[$k] = st_variazione($v, isset($prima[$k]) ? $prima[$k] : 0);
    }
    return array('ora' => $ora, 'prima' => $prima, 'delta' => $delta);
}

/* ── Imbuto ──────────────────────────────────────────────────────── */

/* Dove si perdono. Ogni gradino e' un sottoinsieme del precedente,
   quindi va misurato sulle stesse persone: si contano le coppie
   (giorno, impronta), non gli eventi */
function st_imbuto($da, $a) {
    $c = st_contatti();
    $in = implode(',', array_fill(0, count($c), '?'));

    $vis = (int) st_uno('SELECT COUNT(DISTINCT giorno || impronta) n FROM visite
                         WHERE giorno BETWEEN ? AND ?', array($da, $a))['n'];

    $letto = (int) st_uno(
        "SELECT COUNT(DISTINCT giorno || impronta) n FROM eventi
         WHERE giorno BETWEEN ? AND ? AND nome = 'profondita'
           AND dettaglio IN ('50%','75%','90%')", array($da, $a))['n'];

    $agito = (int) st_uno(
        'SELECT COUNT(DISTINCT giorno || impronta) n FROM eventi
         WHERE giorno BETWEEN ? AND ? AND nome IN (' . $in . ')',
        array_merge(array($da, $a), $c))['n'];

    $modulo = (int) st_uno(
        "SELECT COUNT(DISTINCT giorno || impronta) n FROM eventi
         WHERE giorno BETWEEN ? AND ? AND nome = 'modulo-inviato'", array($da, $a))['n'];

    return array(
        array('et' => 'Sono arrivati',        'n' => $vis),
        array('et' => 'Hanno letto a metà',   'n' => $letto),
        array('et' => 'Hanno fatto qualcosa', 'n' => $agito),
        array('et' => 'Hanno scritto',        'n' => $modulo)
    );
}

/* ── Classificazione delle sorgenti ──────────────────────────────── */

/* Organico / social / referral non e' una distinzione estetica: dice
   se il traffico se lo guadagna il sito da solo o se dipende da
   qualcos'altro. Un elenco piatto di domini quella differenza non la
   fa vedere */
function st_classe($provenienza, $campagna) {
    if ($campagna !== '' && $campagna !== null) return 'campagna';
    $p = strtolower((string) $provenienza);
    if ($p === '') return 'diretto';
    if (preg_match('/google|bing|duckduckgo|yahoo|ecosia|qwant|search\.brave|startpage/', $p)) return 'organico';
    if (preg_match('/facebook|instagram|linkedin|tiktok|twitter|x\.com|t\.co|youtube|whatsapp|telegram|pinterest/', $p)) return 'social';
    return 'referral';
}

function st_sorgenti($da, $a) {
    $righe = st_q(
        'SELECT provenienza, campagna, COUNT(*) v FROM visite
         WHERE giorno BETWEEN ? AND ? GROUP BY provenienza, campagna', array($da, $a));

    $per = array('organico' => 0, 'diretto' => 0, 'referral' => 0, 'social' => 0, 'campagna' => 0);
    foreach ($righe as $r) {
        $per[st_classe($r['provenienza'], $r['campagna'])] += (int) $r['v'];
    }
    arsort($per);
    return $per;
}

/* Da dove arriva chi CONTATTA — non da dove arrivano tutti. E' la
   differenza fra sapere chi porta gente e sapere chi porta clienti:
   una fonte puo' portare il triplo delle visite e zero richieste.

   L'unione con le visite passa da (giorno, impronta) e prende la
   PRIMA vista di quella giornata: e' li' che si sa da dove e' entrato */
function st_sorgenti_contatti($da, $a) {
    $c = st_contatti();
    $in = implode(',', array_fill(0, count($c), '?'));

    $righe = st_q(
        'SELECT
            (SELECT v.provenienza FROM visite v
              WHERE v.giorno = k.giorno AND v.impronta = k.impronta
              ORDER BY v.istante LIMIT 1) provenienza,
            (SELECT v.campagna FROM visite v
              WHERE v.giorno = k.giorno AND v.impronta = k.impronta
              ORDER BY v.istante LIMIT 1) campagna
         FROM (SELECT DISTINCT giorno, impronta FROM eventi
               WHERE giorno BETWEEN ? AND ? AND nome IN (' . $in . ')) k',
        array_merge(array($da, $a), $c));

    $per = array();
    foreach ($righe as $r) {
        /* provenienza null = ha fatto un'azione ma la sua visita non
           c'e' piu' (pulizia, o evento arrivato a cavallo di
           mezzanotte). Va contato lo stesso, non buttato */
        $cl = $r['provenienza'] === null && $r['campagna'] === null
            ? 'non si sa'
            : st_classe($r['provenienza'], $r['campagna']);
        if (!isset($per[$cl])) $per[$cl] = 0;
        $per[$cl]++;
    }
    arsort($per);
    return $per;
}

/* ── Andamento ───────────────────────────────────────────────────── */

/* Serie giornaliera piena: i giorni senza visite devono esserci con
   zero, altrimenti il grafico li salta e una settimana morta sembra
   una settimana normale piu' stretta */
function st_serie($da, $a) {
    $righe = st_q(
        'SELECT giorno, COUNT(*) viste, COUNT(DISTINCT impronta) visitatori
         FROM visite WHERE giorno BETWEEN ? AND ? GROUP BY giorno', array($da, $a));

    $per = array();
    foreach ($righe as $r) $per[$r['giorno']] = $r;

    $serie = array();
    for ($g = $da; $g <= $a; $g = date('Y-m-d', strtotime($g . ' +1 day'))) {
        $serie[] = isset($per[$g])
            ? array('giorno' => $g, 'viste' => (int) $per[$g]['viste'], 'visitatori' => (int) $per[$g]['visitatori'])
            : array('giorno' => $g, 'viste' => 0, 'visitatori' => 0);
    }
    return $serie;
}

/* ── Pagine ──────────────────────────────────────────────────────── */

function st_pagine($da, $a, $quante = 15) {
    return st_q(
        'SELECT percorso, COUNT(*) viste, COUNT(DISTINCT giorno || impronta) visitatori,
                AVG(CASE WHEN durata > 0 THEN durata END) permanenza,
                SUM(CASE WHEN durata > 0 THEN 1 ELSE 0 END) misurate
         FROM visite WHERE giorno BETWEEN ? AND ?
         GROUP BY percorso ORDER BY viste DESC LIMIT ' . (int) $quante, array($da, $a));
}

/* ── Quando guardano il sito ─────────────────────────────────────── */

/* Giorno della settimana x ora. Per un fornitore di ristoranti sapere
   che il sito lo guardano a mezzanotte, dopo il servizio, e' operativo:
   dice quando ha senso rispondere e quando mandare un'offerta.

   L'ora viene spostata in Italia sommando i secondi di scarto PRIMA di
   passarla a strftime: 'localtime' di SQLite dipende dal fuso del
   sistema, che su un hosting condiviso non decidiamo noi */
function st_orari($da, $a) {
    $scarto = (int) (new DateTime('now', new DateTimeZone('Europe/Rome')))->getOffset();

    $righe = st_q(
        "SELECT CAST(strftime('%w', istante + ?, 'unixepoch') AS INTEGER) gs,
                CAST(strftime('%H', istante + ?, 'unixepoch') AS INTEGER) ora,
                COUNT(*) n
         FROM visite WHERE giorno BETWEEN ? AND ?
         GROUP BY gs, ora", array($scarto, $scarto, $da, $a));

    /* Griglia piena lunedi->domenica: strftime da' 0 = domenica */
    $g = array();
    for ($i = 0; $i < 7; $i++) $g[$i] = array_fill(0, 24, 0);
    $max = 0;
    foreach ($righe as $r) {
        $i = ((int) $r['gs'] + 6) % 7;          /* 0 = lunedi */
        $g[$i][(int) $r['ora']] = (int) $r['n'];
        if ($r['n'] > $max) $max = (int) $r['n'];
    }
    return array('griglia' => $g, 'max' => $max);
}

/* ── Adesso ──────────────────────────────────────────────────────── */

function st_adesso() {
    $mezzora = time() - 1800;
    $n = st_uno('SELECT COUNT(DISTINCT impronta) n FROM visite WHERE istante >= ?', array($mezzora));
    return array(
        'persone' => (int) $n['n'],
        'ultime'  => st_q('SELECT istante, percorso, provenienza, dispositivo
                           FROM visite ORDER BY id DESC LIMIT 10')
    );
}

/* ── Ricerche Google (copia locale di Search Console) ────────────── */

function st_ricerche($da, $a, $quante = 15) {
    return st_q(
        'SELECT chiave, SUM(clic) clic, SUM(impressioni) impressioni,
                SUM(posizione * impressioni) / NULLIF(SUM(impressioni), 0) posizione
         FROM ricerche WHERE giorno BETWEEN ? AND ?
         GROUP BY chiave ORDER BY clic DESC, impressioni DESC LIMIT ' . (int) $quante,
        array($da, $a));
}

/* Le occasioni: ricerche dove il sito COMPARE ma non viene cliccato,
   o e' appena sotto la parte alta della pagina. Sono quelle dove basta
   poco — un titolo, un paragrafo — per guadagnare clic, al contrario
   di una parola dove siamo settantesimi.

   La posizione media e' pesata sulle impressioni: una media semplice
   fra un giorno con 3 impressioni in posizione 2 e uno con 300 in
   posizione 40 direbbe 21, che non e' successo a nessuno */
function st_occasioni($da, $a, $quante = 12) {
    return st_q(
        'SELECT chiave, SUM(clic) clic, SUM(impressioni) impressioni,
                SUM(posizione * impressioni) / NULLIF(SUM(impressioni), 0) pos
         FROM ricerche WHERE giorno BETWEEN ? AND ?
         GROUP BY chiave
         HAVING SUM(impressioni) >= 10
            AND (pos BETWEEN 5 AND 20 OR SUM(clic) * 1.0 / SUM(impressioni) < 0.02)
         ORDER BY impressioni DESC LIMIT ' . (int) $quante,
        array($da, $a));
}

/* ── Compattini in fondo ─────────────────────────────────────────── */

function st_dispositivi($da, $a) {
    return st_q('SELECT dispositivo et, COUNT(*) v FROM visite
                 WHERE giorno BETWEEN ? AND ? GROUP BY et ORDER BY v DESC', array($da, $a));
}

function st_browser($da, $a) {
    return st_q('SELECT browser et, COUNT(*) v FROM visite
                 WHERE giorno BETWEEN ? AND ? GROUP BY et ORDER BY v DESC LIMIT 8', array($da, $a));
}

function st_azioni($da, $a) {
    return st_q("SELECT nome, dettaglio, COUNT(*) n, COUNT(DISTINCT giorno || impronta) u
                 FROM eventi WHERE giorno BETWEEN ? AND ? AND nome <> 'profondita'
                 GROUP BY nome, dettaglio ORDER BY n DESC LIMIT 20", array($da, $a));
}

/* ── Scarico ─────────────────────────────────────────────────────── */

/* Una riga per giorno: e' la forma che serve per aprirlo in un foglio
   e farci sopra un grafico o un confronto con l'anno prima */
function st_csv($da, $a) {
    $c = st_contatti();
    $in = implode(',', array_fill(0, count($c), '?'));

    $v = st_q('SELECT giorno, COUNT(*) viste, COUNT(DISTINCT impronta) visitatori,
                      AVG(CASE WHEN durata > 0 THEN durata END) permanenza
               FROM visite WHERE giorno BETWEEN ? AND ? GROUP BY giorno', array($da, $a));

    $k = st_q('SELECT giorno, COUNT(DISTINCT impronta) n FROM eventi
               WHERE giorno BETWEEN ? AND ? AND nome IN (' . $in . ') GROUP BY giorno',
              array_merge(array($da, $a), $c));

    $perK = array();
    foreach ($k as $r) $perK[$r['giorno']] = (int) $r['n'];

    $out = array(array('giorno', 'visitatori', 'pagine viste', 'permanenza media (s)', 'contatti'));
    foreach ($v as $r) {
        $out[] = array(
            $r['giorno'], (int) $r['visitatori'], (int) $r['viste'],
            $r['permanenza'] === null ? '' : round($r['permanenza']),
            isset($perK[$r['giorno']]) ? $perK[$r['giorno']] : 0
        );
    }
    return $out;
}
