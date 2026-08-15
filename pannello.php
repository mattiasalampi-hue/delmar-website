<?php
/*
  Pannello dell'analitica — la pagina che si guarda.

  PROTETTO DA PASSWORD, e la password non sta qui: sta in config.php,
  che e' escluso da git e negato dall'.htaccess. Sta come IMPRONTA e non
  in chiaro, cosi' nemmeno chi legge il file la conosce.

  Freno sui tentativi: cinque sbagliati e si aspetta. Senza, una pagina
  di accesso su un indirizzo prevedibile e' un invito a provare le
  password a raffica.

  L'ORDINE DEI BLOCCHI NON E' CASUALE. In cima le conversioni, non le
  visite: su un ingrosso B2B "quante richieste sono arrivate e da dove"
  e' l'unica cosa che cambia una decisione, il resto e' contorno. Le
  visite senza le richieste sono un numero che fa sentire bene e non
  dice niente.

  I CONTI STANNO IN analitica/statistiche.php. Qui dentro solo il
  guscio: se le interrogazioni tornano in mezzo all'HTML, fra sei mesi
  non si rileggono piu'.
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
    $D['fonti_k']   = st_sorgenti_contatti($per['da'], $per['a']);
    $D['fonti']     = st_sorgenti($per['da'], $per['a']);
    $D['serie']     = st_serie($per['da'], $per['a']);
    $D['serie_pre'] = st_serie($per['da_prec'], $per['a_prec']);
    $D['pagine']    = st_pagine($per['da'], $per['a']);
    $D['orari']     = st_orari($per['da'], $per['a']);
    $D['adesso']    = st_adesso();
    $D['disp']      = st_dispositivi($per['da'], $per['a']);
    $D['browser']   = st_browser($per['da'], $per['a']);
    $D['azioni']    = st_azioni($per['da'], $per['a']);
    $D['ricerche']  = st_ricerche($per['da'], $per['a']);
    $D['occasioni'] = st_occasioni($per['da'], $per['a']);
    $D['sc_quando'] = an_stato('ricerche_aggiornate');
    $D['sc_errore'] = an_stato('ricerche_errore');
}
?><!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Analitica — DelMar</title>
    <meta name="robots" content="noindex, nofollow" />
    <link rel="icon" href="assets/favicon.png?v=1" type="image/png" />
    <link rel="stylesheet" href="css/poppins.css?v=1" />
    <link rel="stylesheet" href="css/pannello.css?v=2" />
  </head>
  <body>
<?php if (!$dentro): ?>
    <div class="pn-porta">
      <form method="post" class="pn-accesso">
        <p class="pn-occhiello">DelMar</p>
        <h1>Analitica</h1>
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
    $base = $D['imbuto'][0]['n'] ? $D['imbuto'][0]['n'] : 1;
    $tot_k = array_sum($D['fonti_k']);
    $tot_f = array_sum($D['fonti']);
    $giorniSet = array('Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom');
?>
    <header class="pn-testa">
      <div>
        <p class="pn-occhiello">DelMar</p>
        <h1>Analitica</h1>
      </div>
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

      <!-- 1. CONVERSIONI — in cima, prima delle visite -->
      <section class="pn-numeri">
        <div class="pn-numero pn-numero-vivo">
          <span class="pn-n"><?= dec($o['conversione'], 1) ?>%</span>
          <span class="pn-e">contattano<br />su 100 visitatori <?= delta($dl['conversione']) ?></span>
        </div>
        <div class="pn-numero pn-numero-vivo">
          <span class="pn-n"><?= n($o['contatti']) ?></span>
          <span class="pn-e">hanno alzato la mano<br />(<?= n($p['contatti']) ?> prima) <?= delta($dl['contatti']) ?></span>
        </div>
        <div class="pn-numero">
          <span class="pn-n"><?= n($o['moduli']) ?></span>
          <span class="pn-e">moduli inviati <?= delta($dl['moduli']) ?></span>
        </div>
        <div class="pn-numero">
          <span class="pn-n"><?= n($o['visitatori']) ?></span>
          <span class="pn-e">visitatori <?= delta($dl['visitatori']) ?></span>
        </div>
      </section>

      <section class="pn-secondari">
        <span><strong><?= n($o['viste']) ?></strong> pagine viste <?= delta($dl['viste']) ?></span>
        <span><strong><?= n($o['sessioni']) ?></strong> sessioni <?= delta($dl['sessioni']) ?></span>
        <span><strong><?= dec($o['rimbalzo'], 0) ?>%</strong> se ne vanno subito <?= delta($dl['rimbalzo'], -1) ?></span>
        <span><strong><?= durata($o['permanenza']) ?></strong> di permanenza media
          <small>su <?= n($o['misurate']) ?> di <?= n($o['viste']) ?> viste</small></span>
      </section>

      <!-- 2. IMBUTO — dove si perdono -->
      <section class="pn-riquadro pn-importante">
        <h2>Dove si perdono</h2>
        <p class="pn-sotto">Ogni gradino è un pezzo del precedente, sulle stesse persone</p>
        <div class="pn-imbuto">
          <?php foreach ($D['imbuto'] as $i => $g):
              $q = $g['n'] / $base * 100;
              $calo = $i > 0 && $D['imbuto'][$i - 1]['n'] > 0
                  ? 100 - ($g['n'] / $D['imbuto'][$i - 1]['n'] * 100) : null; ?>
            <div class="pn-gradino">
              <div class="pn-gradino-barra" style="width: <?= max(1.5, round($q, 1)) ?>%"></div>
              <span class="pn-gradino-et"><?= e($g['et']) ?></span>
              <span class="pn-gradino-val"><?= n($g['n']) ?>
                <small><?= dec($q, 1) ?>%<?php if ($calo !== null): ?> · −<?= dec($calo, 0) ?>% dal passo prima<?php endif; ?></small>
              </span>
            </div>
          <?php endforeach; ?>
        </div>
      </section>

      <div class="pn-griglia">
        <!-- 3. DA DOVE ARRIVA CHI CONTATTA — non da dove arrivano tutti -->
        <section class="pn-riquadro pn-importante">
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

        <!-- 6. SORGENTI DI TUTTI, classificate -->
        <section class="pn-riquadro">
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

      <!-- 4. RICERCHE GOOGLE -->
      <div class="pn-griglia">
        <section class="pn-riquadro">
          <h2>Ricerche che portano clic</h2>
          <p class="pn-sotto">
            <?php if ($D['sc_quando']): ?>
              Da Search Console, aggiornate il <?= e(date('d/m alle H:i', (int) $D['sc_quando'])) ?>
              · <a href="?g=<?= $giorni ?>&amp;risincronizza=1">riscarica adesso</a>
            <?php else: ?>
              Search Console non è ancora collegata: manca la chiave dell'account
              di servizio in <code>config.php</code>.
            <?php endif; ?>
          </p>
          <?php foreach ($D['ricerche'] as $r): ?>
            <div class="pn-riga pn-riga-piatta">
              <span class="pn-et"><?= e($r['chiave']) ?></span>
              <span class="pn-val"><?= n($r['clic']) ?><small> clic · pos. <?= dec($r['posizione'], 1) ?></small></span>
            </div>
          <?php endforeach; ?>
          <?php if (!$D['ricerche']): ?><p class="pn-vuoto">—</p><?php endif; ?>
          <?php if ($D['sc_errore']): ?>
            <p class="pn-avviso">Ultimo aggiornamento fallito: <?= e($D['sc_errore']) ?></p>
          <?php endif; ?>
        </section>

        <section class="pn-riquadro">
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
      </div>

      <!-- 5. ANDAMENTO, con il periodo prima sovrapposto -->
      <section class="pn-riquadro">
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

      <!-- 8. QUANDO guardano il sito -->
      <section class="pn-riquadro">
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
        <!-- 7. PAGINE -->
        <section class="pn-riquadro">
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

        <!-- 10. AZIONI in dettaglio -->
        <section class="pn-riquadro">
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

        <!-- 9. ADESSO -->
        <section class="pn-riquadro">
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

        <!-- 10. DISPOSITIVI E BROWSER, compattati in fondo -->
        <section class="pn-riquadro">
          <h2>Dispositivi e browser</h2>
          <?php foreach (array_merge($D['disp'], $D['browser']) as $r): $q = $o['viste'] ? $r['v'] / $o['viste'] * 100 : 0; ?>
            <div class="pn-riga" style="--q: <?= round($q) ?>%">
              <span class="pn-et"><?= e($r['et']) ?></span>
              <span class="pn-val"><?= dec($q, 0) ?>%</span>
            </div>
          <?php endforeach; ?>
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
