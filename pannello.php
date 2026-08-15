<?php
/*
  Pannello dell'analitica — la pagina che si guarda.

  PROTETTO DA PASSWORD, e la password non sta qui: sta in config.php,
  che e' escluso da git e negato dall'.htaccess. Sta come IMPRONTA e non
  in chiaro, cosi' nemmeno chi legge il file la conosce.

  Freno sui tentativi: cinque sbagliati e si aspetta. Senza, una pagina
  di accesso su un indirizzo prevedibile e' un invito a provare le
  password a raffica.
*/
session_start();
require_once __DIR__ . '/analitica/comune.php';

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
    $ora = time();
    $tent = isset($_SESSION['tentativi']) ? $_SESSION['tentativi'] : array();
    $tent = array_filter($tent, function ($t) use ($ora) { return $t > $ora - 900; });

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
        $tent[] = $ora;
        $_SESSION['tentativi'] = $tent;
        /* Messaggio identico in tutti i casi: dire "password sbagliata"
           invece di "utente inesistente" e' il modo classico di regalare
           informazioni a chi prova */
        $errore = 'Password errata.';
    }
}

$dentro = !empty($_SESSION['dentro']);

/* ── Dati ─────────────────────────────────────── */
$giorni = isset($_GET['g']) ? max(1, min(365, (int) $_GET['g'])) : 30;
$da = date('Y-m-d', strtotime('-' . ($giorni - 1) . ' day'));
$D = array();

if ($dentro) {
    $db = an_db();
    function an_q($sql, $p) { $q = an_db()->prepare($sql); $q->execute($p); return $q->fetchAll(PDO::FETCH_ASSOC); }

    $D['totali'] = an_q('SELECT COUNT(*) v, COUNT(DISTINCT impronta) u FROM visite WHERE giorno >= ?', array($da));
    $D['oggi']   = an_q('SELECT COUNT(*) v, COUNT(DISTINCT impronta) u FROM visite WHERE giorno = ?', array(date('Y-m-d')));
    $D['perGiorno'] = an_q(
        'SELECT giorno, COUNT(*) v, COUNT(DISTINCT impronta) u FROM visite
         WHERE giorno >= ? GROUP BY giorno ORDER BY giorno', array($da));
    $D['pagine'] = an_q(
        'SELECT percorso, COUNT(*) v, COUNT(DISTINCT impronta) u FROM visite
         WHERE giorno >= ? GROUP BY percorso ORDER BY v DESC LIMIT 15', array($da));
    $D['provenienze'] = an_q(
        "SELECT CASE WHEN provenienza = '' THEN '(diretto)' ELSE provenienza END p,
                COUNT(*) v FROM visite WHERE giorno >= ? GROUP BY p ORDER BY v DESC LIMIT 12", array($da));
    $D['dispositivi'] = an_q(
        'SELECT dispositivo d, COUNT(*) v FROM visite WHERE giorno >= ? GROUP BY d ORDER BY v DESC', array($da));
    $D['browser'] = an_q(
        'SELECT browser b, COUNT(*) v FROM visite WHERE giorno >= ? GROUP BY b ORDER BY v DESC LIMIT 8', array($da));
    $D['eventi'] = an_q(
        'SELECT nome, COUNT(*) n, COUNT(DISTINCT impronta) u FROM eventi
         WHERE giorno >= ? GROUP BY nome ORDER BY n DESC', array($da));
    $D['campagne'] = an_q(
        "SELECT campagna c, COUNT(*) v FROM visite WHERE giorno >= ? AND campagna <> ''
         GROUP BY c ORDER BY v DESC LIMIT 10", array($da));
    $D['ultimi'] = an_q(
        'SELECT istante, percorso, provenienza, dispositivo FROM visite
         ORDER BY id DESC LIMIT 12', array());
}

function e($s) { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }
function n($x) { return number_format((float) $x, 0, ',', '.'); }
?><!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Analitica — DelMar</title>
    <meta name="robots" content="noindex, nofollow" />
    <link rel="icon" href="assets/favicon.png?v=1" type="image/png" />
    <link rel="stylesheet" href="css/poppins.css?v=1" />
    <link rel="stylesheet" href="css/pannello.css?v=1" />
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
    $tot = $D['totali'][0]; $og = $D['oggi'][0];
    $max = 1;
    foreach ($D['perGiorno'] as $r) { if ($r['v'] > $max) $max = $r['v']; }
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
        <a href="?esci=1" class="pn-esci">Esci</a>
      </nav>
    </header>

    <main class="pn-corpo">
      <section class="pn-numeri">
        <div class="pn-numero">
          <span class="pn-n"><?= n($tot['u']) ?></span>
          <span class="pn-e">visitatori<br />in <?= $giorni ?> giorni</span>
        </div>
        <div class="pn-numero">
          <span class="pn-n"><?= n($tot['v']) ?></span>
          <span class="pn-e">pagine viste</span>
        </div>
        <div class="pn-numero">
          <span class="pn-n"><?= n($og['u']) ?></span>
          <span class="pn-e">visitatori<br />oggi</span>
        </div>
        <div class="pn-numero">
          <span class="pn-n"><?= $tot['u'] > 0 ? number_format($tot['v'] / $tot['u'], 1, ',', '') : '0' ?></span>
          <span class="pn-e">pagine<br />per visitatore</span>
        </div>
      </section>

      <section class="pn-riquadro">
        <h2>Andamento</h2>
        <?php if (!$D['perGiorno']): ?>
          <p class="pn-vuoto">Ancora nessun dato. Le prime visite compaiono qui entro pochi minuti.</p>
        <?php else: ?>
        <div class="pn-grafico">
          <?php foreach ($D['perGiorno'] as $r): ?>
            <div class="pn-colonna" title="<?= e($r['giorno']) ?> — <?= n($r['v']) ?> pagine, <?= n($r['u']) ?> visitatori">
              <div class="pn-barra" style="height: <?= max(2, round($r['v'] / $max * 100)) ?>%"></div>
            </div>
          <?php endforeach; ?>
        </div>
        <div class="pn-asse">
          <span><?= e(date('d/m', strtotime($D['perGiorno'][0]['giorno']))) ?></span>
          <span><?= e(date('d/m', strtotime($D['perGiorno'][count($D['perGiorno']) - 1]['giorno']))) ?></span>
        </div>
        <?php endif; ?>
      </section>

      <div class="pn-griglia">
        <section class="pn-riquadro">
          <h2>Pagine</h2>
          <?php foreach ($D['pagine'] as $r): $q = $tot['v'] ? $r['v'] / $tot['v'] * 100 : 0; ?>
            <div class="pn-riga" style="--q: <?= round($q) ?>%">
              <span class="pn-et"><?= e($r['percorso']) ?></span>
              <span class="pn-val"><?= n($r['v']) ?></span>
            </div>
          <?php endforeach; ?>
          <?php if (!$D['pagine']): ?><p class="pn-vuoto">—</p><?php endif; ?>
        </section>

        <section class="pn-riquadro">
          <h2>Da dove arrivano</h2>
          <?php foreach ($D['provenienze'] as $r): $q = $tot['v'] ? $r['v'] / $tot['v'] * 100 : 0; ?>
            <div class="pn-riga" style="--q: <?= round($q) ?>%">
              <span class="pn-et"><?= e($r['p']) ?></span>
              <span class="pn-val"><?= n($r['v']) ?></span>
            </div>
          <?php endforeach; ?>
          <?php if (!$D['provenienze']): ?><p class="pn-vuoto">—</p><?php endif; ?>
        </section>

        <section class="pn-riquadro pn-importante">
          <h2>Azioni</h2>
          <p class="pn-sotto">Quanti hanno fatto qualcosa, non solo guardato</p>
          <?php foreach ($D['eventi'] as $r): ?>
            <div class="pn-riga pn-riga-piatta">
              <span class="pn-et"><?= e($r['nome']) ?></span>
              <span class="pn-val"><?= n($r['n']) ?><small> / <?= n($r['u']) ?> pers.</small></span>
            </div>
          <?php endforeach; ?>
          <?php if (!$D['eventi']): ?><p class="pn-vuoto">—</p><?php endif; ?>
        </section>

        <section class="pn-riquadro">
          <h2>Dispositivi</h2>
          <?php foreach ($D['dispositivi'] as $r): $q = $tot['v'] ? $r['v'] / $tot['v'] * 100 : 0; ?>
            <div class="pn-riga" style="--q: <?= round($q) ?>%">
              <span class="pn-et"><?= e($r['d']) ?></span>
              <span class="pn-val"><?= round($q) ?>%</span>
            </div>
          <?php endforeach; ?>
          <?php if (!$D['dispositivi']): ?><p class="pn-vuoto">—</p><?php endif; ?>
        </section>

        <section class="pn-riquadro">
          <h2>Browser</h2>
          <?php foreach ($D['browser'] as $r): $q = $tot['v'] ? $r['v'] / $tot['v'] * 100 : 0; ?>
            <div class="pn-riga" style="--q: <?= round($q) ?>%">
              <span class="pn-et"><?= e($r['b']) ?></span>
              <span class="pn-val"><?= round($q) ?>%</span>
            </div>
          <?php endforeach; ?>
        </section>

        <?php if ($D['campagne']): ?>
        <section class="pn-riquadro">
          <h2>Campagne</h2>
          <?php foreach ($D['campagne'] as $r): ?>
            <div class="pn-riga pn-riga-piatta">
              <span class="pn-et"><?= e($r['c']) ?></span>
              <span class="pn-val"><?= n($r['v']) ?></span>
            </div>
          <?php endforeach; ?>
        </section>
        <?php endif; ?>

        <section class="pn-riquadro">
          <h2>Ultime visite</h2>
          <?php foreach ($D['ultimi'] as $r): ?>
            <div class="pn-riga pn-riga-piatta">
              <span class="pn-et"><?= e($r['percorso']) ?>
                <?php if ($r['provenienza']): ?><small>da <?= e($r['provenienza']) ?></small><?php endif; ?>
              </span>
              <span class="pn-val"><small><?= e(date('d/m H:i', $r['istante'])) ?></small></span>
            </div>
          <?php endforeach; ?>
          <?php if (!$D['ultimi']): ?><p class="pn-vuoto">—</p><?php endif; ?>
        </section>
      </div>

      <p class="pn-nota">
        Nessun cookie, nessun dato mandato a terzi, nessun indirizzo IP conservato:
        di ogni visitatore resta un'impronta che cambia ogni notte e diventa
        irreversibile dopo due giorni. Per questo il conteggio dei visitatori è
        <strong>per giornata</strong> e non dice chi torna dopo una settimana:
        è il prezzo scelto in cambio del non dover chiedere il consenso — e del
        misurare tutti, non solo chi accetta.
      </p>
    </main>
<?php endif; ?>
  </body>
</html>
