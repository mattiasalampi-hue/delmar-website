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

    /* L'imbuto FINISCE su WhatsApp, non sul modulo: e' il canale con
       cui i locali ordinano davvero, ed e' il numero per cui questa
       pagina esiste. Il modulo resta nel riquadro dei canali */
    $wa = (int) st_uno(
        "SELECT COUNT(DISTINCT giorno || impronta) n FROM eventi
         WHERE giorno BETWEEN ? AND ? AND nome = 'whatsapp'", array($da, $a))['n'];

    /* Chi e' andato a guardare COSA vendiamo o DOVE arriviamo: e' il
       gradino fra "e' passato" e "ha alzato la mano". Prima del 19/08
       la sonda non girava su quelle pagine, quindi sui periodi vecchi
       questo numero parte basso: non e' un crollo, e' che prima non si
       misurava */
    $sezioni = (int) st_uno(
        "SELECT COUNT(DISTINCT giorno || impronta) n FROM visite
         WHERE giorno BETWEEN ? AND ?
           AND (percorso LIKE '/catalogo/%' OR percorso LIKE '/consegna/%')",
        array($da, $a))['n'];

    return array(
        array('et' => 'Sono arrivati',                'n' => $vis),
        array('et' => 'Hanno letto a metà',           'n' => $letto),
        array('et' => 'Hanno aperto prodotti o zone', 'n' => $sezioni,
              'nota' => 'contati dal 19/08'),
        array('et' => 'Hanno contattato',             'n' => $agito),
        array('et' => 'Hanno aperto WhatsApp',        'n' => $wa, 'wa' => true)
    );
}

/* ── I contatti, canale per canale ───────────────────────────────── */

/* WhatsApp, telefono, email e modulo separati: "23 contatti" non dice
   su che canale rispondere ne' quale pulsante lavora. Le persone sono
   coppie (giorno, impronta) come ovunque; i colpi sono i clic totali,
   che su WhatsApp possono essere piu' d'uno a persona */
function st_canali_contatto($da, $a) {
    $c = st_contatti();
    $in = implode(',', array_fill(0, count($c), '?'));

    $righe = st_q(
        'SELECT nome, COUNT(*) n, COUNT(DISTINCT giorno || impronta) persone
         FROM eventi WHERE giorno BETWEEN ? AND ? AND nome IN (' . $in . ')
         GROUP BY nome', array_merge(array($da, $a), $c));

    /* Tutti i canali sempre presenti, anche a zero: un canale che
       sparisce dal riquadro sembra rotto, uno a zero dice "nessuno" */
    $per = array();
    foreach ($c as $nome) $per[$nome] = array('n' => 0, 'persone' => 0);
    foreach ($righe as $r) {
        $per[$r['nome']] = array('n' => (int) $r['n'], 'persone' => (int) $r['persone']);
    }
    return $per;
}

/* ── La mappa del sito e i flussi ────────────────────────────────── */

/* Ogni percorso appartiene a una sezione. La mappa, il flusso e i
   percorsi ragionano per sezioni e non per singole pagine: quaranta
   schede prodotto sono QUARANTA righe ma UNA decisione */
function st_sezione($percorso) {
    $p = (string) $percorso;
    if (strpos($p, '/catalogo/') === 0) return 'Catalogo';
    if (strpos($p, '/consegna/') === 0) return 'Consegne';
    if (strpos($p, '/domande-frequenti') === 0) return 'Domande';
    if ($p === '/' || strpos($p, '/index') === 0) return 'Home';
    return 'Altro';
}

/* Le sezioni nell'ordine in cui vanno mostrate, sempre tutte: una
   sezione a zero e' un'informazione, una sezione sparita e' un dubbio */
function st_sezioni_elenco() {
    return array('Home', 'Catalogo', 'Consegne', 'Domande', 'Altro');
}

/* La mappa: per ogni sezione visite, persone, permanenza, contatti
   partiti da li', e le pagine piu' viste dentro. E' la fotografia di
   dove vive il traffico e dove muore */
function st_mappa_sito($da, $a) {
    $c = st_contatti();
    $in = implode(',', array_fill(0, count($c), '?'));

    $visite = st_q(
        'SELECT percorso, COUNT(*) v, COUNT(DISTINCT giorno || impronta) p,
                AVG(CASE WHEN durata > 0 THEN durata END) t
         FROM visite WHERE giorno BETWEEN ? AND ? GROUP BY percorso', array($da, $a));

    $kappa = st_q(
        'SELECT percorso, COUNT(*) n FROM eventi
         WHERE giorno BETWEEN ? AND ? AND nome IN (' . $in . ')
         GROUP BY percorso', array_merge(array($da, $a), $c));

    $perK = array();
    foreach ($kappa as $r) $perK[st_sezione($r['percorso'])] =
        (isset($perK[st_sezione($r['percorso'])]) ? $perK[st_sezione($r['percorso'])] : 0) + (int) $r['n'];

    $sez = array();
    foreach (st_sezioni_elenco() as $s) {
        $sez[$s] = array('visite' => 0, 'persone' => 0, 'tempo' => 0, 'pesate' => 0,
                         'contatti' => isset($perK[$s]) ? $perK[$s] : 0, 'pagine' => array());
    }
    foreach ($visite as $r) {
        $s = st_sezione($r['percorso']);
        $sez[$s]['visite'] += (int) $r['v'];
        $sez[$s]['persone'] += (int) $r['p'];
        if ($r['t'] !== null) {
            $sez[$s]['tempo'] += (float) $r['t'] * (int) $r['v'];
            $sez[$s]['pesate'] += (int) $r['v'];
        }
        $sez[$s]['pagine'][] = array('percorso' => $r['percorso'], 'v' => (int) $r['v']);
    }
    foreach ($sez as $s => $d) {
        $sez[$s]['tempo'] = $d['pesate'] ? $d['tempo'] / $d['pesate'] : 0;
        usort($sez[$s]['pagine'], function ($x, $y) { return $y['v'] - $x['v']; });
        $sez[$s]['pagine'] = array_slice($sez[$s]['pagine'], 0, 5);
    }
    return $sez;
}

/* Il flusso, persona per persona: da dove entra (classe di sorgente),
   dove atterra (sezione della prima pagina), come finisce (contatta o
   se ne va). Tre colonne che insieme dicono quale ingresso porta
   clienti — che e' un'altra cosa da quale ingresso porta traffico.

   Si scaricano le prime viste e l'elenco di chi ha contattato, e i
   conti si fanno in PHP: su un sito con centinaia di visite al giorno
   e' piu' semplice e piu' robusto di una interrogazione a tre piani */
function st_flusso($da, $a) {
    $c = st_contatti();
    $in = implode(',', array_fill(0, count($c), '?'));

    $prime = st_q(
        'SELECT v.giorno, v.impronta, v.percorso, v.provenienza, v.campagna
         FROM visite v
         WHERE v.giorno BETWEEN ? AND ?
           AND NOT EXISTS (SELECT 1 FROM visite p
                           WHERE p.giorno = v.giorno AND p.impronta = v.impronta
                             AND p.istante < v.istante)', array($da, $a));

    $hanno = st_q(
        'SELECT DISTINCT giorno, impronta FROM eventi
         WHERE giorno BETWEEN ? AND ? AND nome IN (' . $in . ')',
        array_merge(array($da, $a), $c));

    $kSet = array();
    foreach ($hanno as $r) $kSet[$r['giorno'] . '|' . $r['impronta']] = true;

    $flussi = array();       /* sorgente -> sezione -> [contatta, va via] */
    foreach ($prime as $r) {
        $sor = st_classe($r['provenienza'], $r['campagna']);
        $sez = st_sezione($r['percorso']);
        $ha  = isset($kSet[$r['giorno'] . '|' . $r['impronta']]);
        if (!isset($flussi[$sor])) $flussi[$sor] = array();
        if (!isset($flussi[$sor][$sez])) $flussi[$sor][$sez] = array('si' => 0, 'no' => 0);
        $flussi[$sor][$sez][$ha ? 'si' : 'no']++;
    }
    return $flussi;
}

/* I percorsi piu' battuti FRA le sezioni: dentro la stessa sessione,
   ogni cambio di sezione conta un passaggio. Dice se il catalogo porta
   alle consegne o se sono due isole */
function st_percorsi($da, $a, $quanti = 8) {
    $righe = st_q(
        'SELECT giorno, impronta, istante, percorso FROM visite
         WHERE giorno BETWEEN ? AND ?
         ORDER BY giorno, impronta, istante', array($da, $a));

    $salti = array();
    $chi = ''; $dove = ''; $quando = 0;
    foreach ($righe as $r) {
        $k = $r['giorno'] . '|' . $r['impronta'];
        $s = st_sezione($r['percorso']);
        /* Stessa persona, entro mezz'ora, sezione diversa: un passaggio */
        if ($k === $chi && $r['istante'] - $quando <= 1800 && $s !== $dove) {
            $et = $dove . ' → ' . $s;
            $salti[$et] = (isset($salti[$et]) ? $salti[$et] : 0) + 1;
        }
        $chi = $k; $dove = $s; $quando = (int) $r['istante'];
    }
    arsort($salti);
    return array_slice($salti, 0, $quanti, true);
}

/* Da QUALE pagina si contatta. E' la domanda che decide dove mettere le
   prossime CTA: una pagina con tante visite e zero contatti ha un
   problema, una con poche visite e tanti contatti va spinta */
function st_cta_pagine($da, $a, $quante = 12) {
    $c = st_contatti();
    $in = implode(',', array_fill(0, count($c), '?'));

    return st_q(
        "SELECT percorso, COUNT(*) n, COUNT(DISTINCT giorno || impronta) persone
         FROM eventi
         WHERE giorno BETWEEN ? AND ? AND nome IN (" . $in . ")
           AND percorso IS NOT NULL AND percorso <> ''
         GROUP BY percorso ORDER BY n DESC LIMIT " . (int) $quante,
        array_merge(array($da, $a), $c));
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

/* Serie giornaliera dei contatti, coi buchi a zero come st_serie:
   serve alla scintilla dentro la scheda dei contatti, che senza i
   giorni vuoti racconterebbe una curva mai successa.

   $solo restringe a UN canale ('whatsapp'): WhatsApp e' il canale
   d'ordine principale e ha la sua scheda in cima, con la sua curva */
function st_serie_contatti($da, $a, $solo = null) {
    $c = $solo !== null ? array($solo) : st_contatti();
    $in = implode(',', array_fill(0, count($c), '?'));

    $righe = st_q(
        'SELECT giorno, COUNT(DISTINCT impronta) n FROM eventi
         WHERE giorno BETWEEN ? AND ? AND nome IN (' . $in . ') GROUP BY giorno',
        array_merge(array($da, $a), $c));

    $per = array();
    foreach ($righe as $r) $per[$r['giorno']] = (int) $r['n'];

    $serie = array();
    for ($g = $da; $g <= $a; $g = date('Y-m-d', strtotime($g . ' +1 day'))) {
        $serie[] = array('giorno' => $g, 'n' => isset($per[$g]) ? $per[$g] : 0);
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

/* I totali di Google del periodo: clic, quante volte siamo comparsi,
   ogni quante volte ci cliccano, in che posizione stiamo.

   Vengono dal canale 'web' chiesto per intero, non dalla somma delle
   parole cercate: Google nasconde le ricerche fatte da pochissime
   persone, quindi sommare le parole darebbe sempre meno clic del vero.

   Solo 'web' e non tutti i canali insieme: mescolare la posizione
   media della ricerca normale con quella delle immagini darebbe un
   numero che non descrive niente. Gli altri canali stanno nel loro
   riquadro */
function st_google($da, $a) {
    $r = st_uno("SELECT SUM(clic) clic, SUM(impressioni) impressioni,
                        SUM(posizione * impressioni) / NULLIF(SUM(impressioni), 0) posizione
                 FROM ricerche_dim WHERE tipo = 'canale' AND valore = 'web'
                   AND giorno BETWEEN ? AND ?",
                array($da, $a));

    $clic = (int) (isset($r['clic']) ? $r['clic'] : 0);
    $imp  = (int) (isset($r['impressioni']) ? $r['impressioni'] : 0);
    return array(
        'clic' => $clic,
        'impressioni' => $imp,
        'posizione' => (float) (isset($r['posizione']) ? $r['posizione'] : 0),
        'ctr' => $imp ? $clic / $imp * 100 : 0
    );
}

/* Serie giornaliera di Google, coi buchi riempiti a zero come
   st_serie: i giorni mancanti farebbero sembrare continua una curva
   che non lo e' */
function st_google_serie($da, $a) {
    $righe = st_q("SELECT giorno, clic, impressioni FROM ricerche_dim
                   WHERE tipo = 'canale' AND valore = 'web'
                     AND giorno BETWEEN ? AND ?", array($da, $a));
    $per = array();
    foreach ($righe as $r) $per[$r['giorno']] = $r;

    $serie = array();
    for ($g = $da; $g <= $a; $g = date('Y-m-d', strtotime($g . ' +1 day'))) {
        $serie[] = array(
            'giorno' => $g,
            'clic' => isset($per[$g]) ? (int) $per[$g]['clic'] : 0,
            'impressioni' => isset($per[$g]) ? (int) $per[$g]['impressioni'] : 0
        );
    }
    return $serie;
}

function st_google_dim($tipo, $da, $a, $quante = 8) {
    return st_q('SELECT valore, SUM(clic) clic, SUM(impressioni) impressioni,
                        SUM(posizione * impressioni) / NULLIF(SUM(impressioni), 0) posizione
                 FROM ricerche_dim WHERE tipo = ? AND giorno BETWEEN ? AND ? AND valore <> \'\'
                 GROUP BY valore ORDER BY impressioni DESC LIMIT ' . (int) $quante,
                array($tipo, $da, $a));
}

/* Le pagine viste da Google, non dal nostro contatore: sono due cose
   diverse e vale la pena confrontarle — una pagina con tante
   impressioni e poche visite ha un titolo che non convince */
function st_google_pagine($da, $a, $quante = 10) {
    return st_q('SELECT pagina, SUM(clic) clic, SUM(impressioni) impressioni,
                        SUM(posizione * impressioni) / NULLIF(SUM(impressioni), 0) posizione
                 FROM ricerche WHERE giorno BETWEEN ? AND ? AND pagina <> \'\'
                 GROUP BY pagina ORDER BY clic DESC, impressioni DESC LIMIT ' . (int) $quante,
                array($da, $a));
}

function st_sitemap() {
    $j = an_stato('sitemap');
    $v = $j ? json_decode($j, true) : array();
    return is_array($v) ? $v : array();
}

function st_indicizzazione() {
    return st_q('SELECT * FROM pagine_google ORDER BY url');
}

/* I canali: ricerca normale, immagini, video, notizie, Discover.
   Quelli a zero non si mostrano — un elenco di cinque righe vuote
   occupa spazio per dire niente */
function st_google_canali($da, $a) {
    return st_q("SELECT valore, SUM(clic) clic, SUM(impressioni) impressioni,
                        SUM(posizione * impressioni) / NULLIF(SUM(impressioni), 0) posizione
                 FROM ricerche_dim WHERE tipo = 'canale' AND giorno BETWEEN ? AND ?
                 GROUP BY valore HAVING SUM(impressioni) > 0
                 ORDER BY impressioni DESC", array($da, $a));
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
