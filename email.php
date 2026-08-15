<?php
/*
  Il modello dell'email che arriva in azienda.

  PERCHE' TABELLE E STILI SCRITTI SU OGNI TAG. Non e' pigrizia ne'
  codice vecchio: i programmi di posta non sono browser. Outlook disegna
  con il motore di Word, Gmail scarta buona parte di un foglio di stile,
  e su flex o griglie non ci si puo' contare. Tabelle annidate e stili in
  linea sono l'unica cosa che si comporta allo stesso modo ovunque.
  Stessa ragione per la larghezza fissa a 600px: e' la misura che tutti
  mostrano senza tagliare.

  Il carattere del sito non c'e': in un'email non si possono caricare
  caratteri esterni, quindi si usa quello di sistema.

  NOTA PHP: tutti i valori arrivano al modello GIA' ripuliti e messi in
  variabili. Dentro un testo delimitato non si possono chiamare funzioni
  — niente {$pulisci($x)} — ed e' un errore che non si vede finche' la
  pagina non va in esecuzione.
*/

function email_html(array $d) {
    $INK     = '#151c64';
    $CORALLO = '#c9432c';
    $CHIARO  = '#f7f8fa';
    $BORDO   = '#e6e8f2';
    $GRIGIO  = '#6b7194';
    $FONT    = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

    /* Ripulito UNA volta, all'ingresso: quello che scrive un visitatore
       non deve poter diventare marcatura dentro l'email di chi legge */
    $pulisci = fn($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');

    $nome      = $pulisci($d['nome']);
    $azienda   = $pulisci($d['azienda']);
    $email     = $pulisci($d['email']);
    $telefono  = $pulisci($d['telefono']);
    $interesse = $pulisci($d['interesse']);
    $quando    = $pulisci($d['quando']);
    $telUrl    = $pulisci(preg_replace('/[^0-9+]/', '', (string) $d['telefono']));

    $messaggio = trim((string) $d['messaggio']) !== ''
        ? nl2br($pulisci($d['messaggio']))
        : '<span style="color:' . $GRIGIO . ';">Nessun messaggio.</span>';

    /* Una riga della scheda: etichetta a sinistra, valore a destra */
    $riga = function ($etichetta, $valore, $ultima = false) use ($INK, $GRIGIO, $BORDO, $FONT) {
        $bordo = $ultima ? '' : "border-bottom:1px solid $BORDO;";
        return '<tr>'
            . '<td style="padding:13px 0;' . $bordo . 'width:112px;vertical-align:top;'
            . "font-family:$FONT;font-size:11px;font-weight:700;letter-spacing:1.4px;"
            . "text-transform:uppercase;color:$GRIGIO;\">$etichetta</td>"
            . '<td style="padding:13px 0;' . $bordo . 'vertical-align:top;'
            . "font-family:$FONT;font-size:15px;color:$INK;\">$valore</td>"
            . '</tr>';
    };

    $righe  = $riga('Nome', $nome);
    $righe .= $riga('Azienda', "<strong style=\"font-weight:600;\">$azienda</strong>");
    /* Indirizzo e telefono cliccabili: da telefono si risponde o si
       chiama con un tocco, senza ricopiare niente a mano */
    $righe .= $riga('Email', "<a href=\"mailto:$email\" style=\"color:$CORALLO;text-decoration:none;\">$email</a>");
    if ($telefono !== '') {
        $righe .= $riga('Telefono', "<a href=\"tel:$telUrl\" style=\"color:$CORALLO;text-decoration:none;\">$telefono</a>");
    }
    if ($interesse !== '') {
        /* La pastiglia e' la stessa forma premuta sul sito: chi legge
           riconosce la scelta invece di doverla leggere */
        $righe .= $riga('Interesse',
            "<span style=\"display:inline-block;background:$CORALLO;color:#ffffff;"
            . "font-size:13px;line-height:1;padding:7px 14px;border-radius:99px;\">$interesse</span>", true);
    }

    /* Il tasto "Chiama" esiste solo se un numero c'e' */
    $tastoChiama = $telefono === '' ? '' :
        '<td style="width:10px;">&nbsp;</td>'
        . '<td><a href="tel:' . $telUrl . '"'
        . " style=\"display:inline-block;padding:12px 24px;border:1px solid $BORDO;border-radius:5px;"
        . "font-family:$FONT;font-size:13px;font-weight:600;color:$INK;text-decoration:none;\">Chiama</a></td>";

    $oggettoRisposta = rawurlencode('Re: la tua richiesta a DelMar');

    return <<<HTML
<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nuova richiesta dal sito</title>
</head>
<body style="margin:0;padding:0;background:$CHIARO;">

<!-- Riga di anteprima: e' quello che si legge nell'elenco della posta
     accanto all'oggetto, e senza si vedrebbe l'inizio del codice -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">$nome di $azienda — $email</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:$CHIARO;padding:28px 12px;">
<tr><td align="center">

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid $BORDO;">

    <!-- Marchio. Se il programma blocca le immagini resta la scritta -->
    <tr><td style="padding:26px 32px 20px;">
      <img src="https://del-mar.it/assets/logo.png" alt="DelMar" width="132" style="display:block;width:132px;height:auto;border:0;">
    </td></tr>
    <tr><td style="height:3px;background:$CORALLO;font-size:0;line-height:0;">&nbsp;</td></tr>

    <tr><td style="padding:30px 32px 4px;">
      <div style="font-family:$FONT;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:$CORALLO;">
        Nuova richiesta dal sito
      </div>
      <div style="font-family:$FONT;font-size:27px;line-height:1.2;color:$INK;padding-top:8px;">$azienda</div>
    </td></tr>

    <tr><td style="padding:14px 32px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">$righe</table>
    </td></tr>

    <tr><td style="padding:26px 32px 0;">
      <div style="font-family:$FONT;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:$GRIGIO;padding-bottom:9px;">Messaggio</div>
      <div style="font-family:$FONT;font-size:15px;line-height:1.65;color:$INK;background:$CHIARO;border-left:3px solid $CORALLO;padding:15px 18px;">$messaggio</div>
    </td></tr>

    <!-- I due gesti che servono davvero, in ordine di frequenza -->
    <tr><td style="padding:26px 32px 30px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="background:$INK;border-radius:5px;">
          <a href="mailto:$email?subject=$oggettoRisposta" style="display:inline-block;padding:13px 26px;font-family:$FONT;font-size:13px;font-weight:600;color:#ffffff;text-decoration:none;">Rispondi a $nome</a>
        </td>
        $tastoChiama
      </tr></table>
    </td></tr>

    <tr><td style="background:$CHIARO;border-top:1px solid $BORDO;padding:16px 32px;font-family:$FONT;font-size:12px;color:$GRIGIO;">
      Ricevuto il $quando &nbsp;·&nbsp; <a href="https://del-mar.it" style="color:$GRIGIO;">del-mar.it</a>
    </td></tr>

  </table>

  <div style="font-family:$FONT;font-size:11px;color:#9aa0bd;padding-top:14px;">
    Rispondendo a questo messaggio scrivi direttamente a chi ha compilato il modulo.
  </div>

</td></tr>
</table>
</body>
</html>
HTML;
}
