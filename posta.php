<?php
/*
  Spedizione dal server del sito, con SMTP2GO come riserva.

  PERCHE' PRIMA IL SERVER E POI SMTP2GO, che e' l'inverso di come era
  nato. Da SMTP2GO il messaggio parte come workflowai.it — l'unico
  dominio verificato su quell'account — mentre parla di del-mar.it, ci
  mette il logo e ci linka. Quel disallineamento fra mittente e contenuto
  e' uno dei segnali di spam che pesano di piu', e infatti la versione
  impaginata non arrivava. Dal server del sito invece si parte come
  sito@del-mar.it, e l'SPF del dominio autorizza gia' i server Shellrent
  (include:_spf.serverlet.com): mittente allineato e SPF valido, senza
  dover verificare niente da nessuna parte.

  LE INTESTAZIONI SONO TUTTE, E NON E' PIGNOLERIA. Una prova con Date e
  Message-ID mancanti si e' presa un "***SPAM***" davanti all'oggetto,
  aggiunto dal filtro in uscita del server. Sono fra le regole piu'
  vecchie e piu' severe: un messaggio legittimo quelle due intestazioni
  ce le ha sempre.
*/

function posta_intestazioni(array $cfg, $rispondiA, $rispondiNome, $conf) {
    $dominio = substr(strrchr($cfg['mittente'], '@'), 1) ?: 'del-mar.it';
    $t = [
        'From: ' . smtp_intestazione($cfg['mittente_nome']) . ' <' . $cfg['mittente'] . '>',
        'Date: ' . date('r'),
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . $dominio . '>',
        'MIME-Version: 1.0',
        /* Dice a chi filtra che dietro c'e' un programma identificabile
           e non un invio anonimo di massa */
        'X-Mailer: DelMar Sito (PHP)',
        'Content-Language: it-IT',
        /* Transazionale: e' la risposta a un gesto di chi scrive, non una
           comunicazione promozionale. Alcuni filtri la contano */
        'Auto-Submitted: auto-generated',
        'Content-Type: multipart/alternative; boundary="' . $conf . '"',
    ];
    /* PHP consegna a sendmail con -t, che ricava i destinatari LEGGENDO le
       intestazioni: qui, a differenza della strada SMTP, scrivere il Cc
       basta perche' la copia parta davvero */
    if (!empty($cfg['copia'])) {
        $t[] = 'Cc: ' . implode(', ', (array) $cfg['copia']);
    }
    if ($rispondiA) {
        $t[] = 'Reply-To: ' . ($rispondiNome ? smtp_intestazione($rispondiNome) . ' ' : '')
             . '<' . $rispondiA . '>';
    }
    return $t;
}

function posta_corpo($conf, $corpo, $html) {
    /* Le due versioni viaggiano INSIEME: chi legge da orologio, da
       terminale o con le immagini spente vede il testo, gli altri
       l'impaginato. Un messaggio di solo HTML e' a sua volta un indizio
       che i filtri contano */
    return "--$conf\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($corpo), 76, "\r\n")
        . "--$conf\r\n"
        . "Content-Type: text/html; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($html), 76, "\r\n")
        . "--$conf--\r\n";
}

/*
  Prova prima la posta del server, poi SMTP2GO. Torna quale strada ha
  funzionato, cosi' nel registro si legge cosa e' successo davvero.
*/
function posta_invia(array $cfg, $oggetto, $corpo, $rispondiA, $rispondiNome, $html) {
    require_once __DIR__ . '/smtp.php';

    /* PRIMA SMTP2GO, dal 15/08/2026: del-mar.it e' un mittente verificato
       e SMTP2GO FIRMA ogni messaggio con DKIM. E' la firma che mancava e
       che faceva marcare le email come sospette.
       La strada del server resta sotto come riserva, ma passa dal filtro
       in uscita di Shellrent che, senza firma, aggiunge "***SPAM***"
       davanti all'oggetto. */
    $r = smtp_invia($cfg, $oggetto, $corpo, $rispondiA, $rispondiNome, $html);
    if ($r['ok']) return ['ok' => true, 'via' => 'smtp2go', 'errore' => ''];

    if (function_exists('mail')) {
        $conf = 'dm_' . bin2hex(random_bytes(10));
        $testa = posta_intestazioni($cfg, $rispondiA, $rispondiNome, $conf);

        /* Il quinto argomento imposta il mittente di BUSTA, che e' quello
           su cui l'SPF viene controllato davvero. Senza, il messaggio
           partirebbe come utente di sistema e l'SPF fallirebbe */
        $ok = @mail(
            implode(', ', (array) $cfg['destinatari']),
            $oggetto,
            posta_corpo($conf, $corpo, $html),
            implode("\r\n", $testa),
            '-f ' . $cfg['mittente']
        );
        if ($ok) return ['ok' => true, 'via' => 'server', 'errore' => ''];
    }

    return ['ok' => false, 'via' => 'nessuna', 'errore' => $r['errore']];
}
