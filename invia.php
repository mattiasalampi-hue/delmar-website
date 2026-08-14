<?php
/*
  Ricezione del form contatti del sito e invio via SMTP2GO.

  PERCHE' UN FILE PHP E NON UN SERVIZIO ESTERNO.
  Il sito e' statico, e da un browser non si puo' parlare con un server
  SMTP: le credenziali finirebbero in chiaro dentro la pagina, leggibili
  da chiunque. Serve qualcosa che giri sul server, e l'hosting di
  del-mar.it ha gia' PHP. Cosi' si riusa lo stesso SMTP2GO del progetto
  listini invece di aggiungere un terzo servizio da mantenere.

  LE CREDENZIALI NON STANNO QUI. Stanno in config.php, che e' escluso da
  git: questo repository e' pubblico, e una chiave dentro un file
  tracciato sarebbe pubblica dal primo push. config.php si crea a mano
  sul server, una volta sola.
*/

header('Content-Type: application/json; charset=utf-8');

function esito($ok, $messaggio, $codice = 200) {
    http_response_code($codice);
    echo json_encode(['success' => $ok, 'message' => $messaggio], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    esito(false, 'Metodo non consentito.', 405);
}

/*
  Il file con le credenziali sta FUORI dalla cartella del sito, un
  livello sopra. Dentro, oggi, non si vedrebbe comunque: PHP lo esegue e
  restituisce una pagina vuota. Ma basta che PHP smetta di funzionare su
  quella cartella — un modulo disattivato, un .htaccess sbagliato, un
  aggiornamento del server — e il file verrebbe servito come testo, con
  la password dentro, a chiunque ne indovini il nome. Fuori dalla radice
  del sito quel rischio non esiste proprio.

  Il ripiego sulla stessa cartella serve solo agli ambienti dove non si
  puo' scrivere un livello sopra.
*/
$cfgFile = dirname(__DIR__) . '/config.php';
if (!is_file($cfgFile)) $cfgFile = __DIR__ . '/config.php';
if (!is_file($cfgFile)) {
    /* Messaggio generico verso l'esterno, dettaglio solo nel log: dire a
       un visitatore "manca il file di configurazione" e' un invito a
       provare. */
    error_log('invia.php: config.php mancante');
    esito(false, 'Modulo non disponibile. Scrivici su WhatsApp o a info@del-mar.it.', 500);
}
$cfg = require $cfgFile;

/* ── Trappola per i robot ─────────────────────────────────────────
   Un campo nascosto che una persona non vede e non compila mai. Se
   arriva pieno e' un robot: si risponde "inviato" senza inviare niente,
   cosi' non impara che e' stato scoperto. */
if (!empty($_POST['sito_web'])) {
    esito(true, 'Messaggio inviato. Ti contatteremo presto.');
}

/* ── Freno per indirizzo IP ───────────────────────────────────────
   Non e' sicurezza, e' educazione: impedisce che un dito nervoso o uno
   script banale riempiano la casella. Un file per IP nella cartella
   temporanea, niente database. */
$ip = preg_replace('/[^a-zA-Z0-9.:]/', '', $_SERVER['REMOTE_ADDR'] ?? 'ignoto');
$traccia = sys_get_temp_dir() . '/dmform_' . md5($ip);
$attesa = 30;
if (is_file($traccia) && (time() - filemtime($traccia)) < $attesa) {
    esito(false, 'Hai gia\' inviato una richiesta. Riprova fra qualche secondo.', 429);
}

/* ── Lettura e pulizia dei campi ──────────────────────────────────
   Le righe a capo vanno tolte da tutto cio' che finisce in
   un'intestazione: un "\r\n" dentro il nome permetterebbe di aggiungere
   destinatari all'email. E' l'iniezione di intestazioni, ed e' il modo
   classico di trasformare un form contatti in un rilancio di spam. */
function campo($nome, $max = 200) {
    $v = isset($_POST[$nome]) ? trim((string) $_POST[$nome]) : '';
    $v = str_replace(["\r", "\n", "\0"], ' ', $v);
    return mb_substr($v, 0, $max);
}

$nome     = campo('nome', 120);
$azienda  = campo('azienda', 160);
$email    = campo('email', 180);
$telefono = campo('telefono', 60);
$interesse = campo('interesse', 80);
/* Il messaggio finisce nel CORPO, non in un'intestazione: qui gli a capo
   servono e si tengono, si toglie solo il byte nullo */
$messaggio = isset($_POST['messaggio']) ? mb_substr(str_replace("\0", '', trim((string) $_POST['messaggio'])), 0, 4000) : '';

if ($nome === '' || $azienda === '' || $email === '') {
    esito(false, 'Compila nome, azienda ed email.', 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    esito(false, 'L\'indirizzo email non sembra valido.', 422);
}

/* ── Il testo dell'email ──────────────────────────────────────────
   Testo semplice e non HTML: si legge ovunque, non finisce nello spam
   per una tabella malfatta e non c'e' niente da ripulire. */
$corpo = "Nuova richiesta dal sito del-mar.it\n"
       . str_repeat('-', 44) . "\n\n"
       . "Nome:      $nome\n"
       . "Azienda:   $azienda\n"
       . "Email:     $email\n"
       . "Telefono:  " . ($telefono !== '' ? $telefono : '—') . "\n"
       . "Interesse: " . ($interesse !== '' ? $interesse : '—') . "\n\n"
       . "Messaggio:\n"
       . ($messaggio !== '' ? $messaggio : '(nessun messaggio)') . "\n\n"
       . str_repeat('-', 44) . "\n"
       . 'Ricevuto il ' . date('d/m/Y \a\l\l\e H:i') . "\n";

$oggetto = "Richiesta dal sito — $azienda";

require __DIR__ . '/smtp.php';

$inviata = smtp_invia(
    $cfg,
    $oggetto,
    $corpo,
    /* Rispondi-a su chi ha compilato: si risponde dalla casella con un
       tasto, senza ricopiare l'indirizzo a mano */
    $email,
    $nome
);

if (!$inviata['ok']) {
    error_log('invia.php: invio fallito — ' . $inviata['errore']);
    esito(false, 'Non siamo riusciti a inviare. Scrivici su WhatsApp o a info@del-mar.it.', 502);
}

touch($traccia);
esito(true, 'Messaggio inviato. Ti contatteremo presto.');
