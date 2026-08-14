<?php
/*
  Client SMTP minimo, scritto a mano.

  PERCHE' NON UNA LIBRERIA. Servirebbe scaricarla e caricarla sul server,
  e per spedire un solo messaggio di testo il dialogo SMTP e' una decina
  di righe. Meno codice da tenere aggiornato e niente da fidarsi.

  Le due cose che si sbagliano scrivendolo a mano, ed entrambe sono
  gestite qui sotto:
    - i terminatori di riga devono essere \r\n, sempre, anche dentro il
      corpo: con soli \n alcuni server tagliano il messaggio;
    - una riga del corpo che inizia con un punto chiude anticipatamente
      i dati. Qui il corpo viaggia in base64, il cui alfabeto il punto
      non ce l'ha, quindi il problema non puo' presentarsi.
*/

function smtp_leggi($sock, &$errore) {
    $risposta = '';
    while (($riga = fgets($sock, 515)) !== false) {
        $risposta .= $riga;
        /* Le risposte multiriga hanno un trattino dopo il codice:
           "250-PIPELINING". L'ultima ha uno spazio: "250 OK" */
        if (strlen($riga) < 4 || $riga[3] === ' ') break;
    }
    if ($risposta === '') { $errore = 'nessuna risposta dal server'; return 0; }
    return (int) substr($risposta, 0, 3);
}

function smtp_dice($sock, $comando, $attesi, &$errore, $etichetta = null) {
    if ($comando !== null) fwrite($sock, $comando . "\r\n");
    $codice = smtp_leggi($sock, $errore);
    if (!in_array($codice, (array) $attesi, true)) {
        $errore = ($etichetta ?: trim(explode(' ', (string) $comando)[0])) . ": codice $codice";
        return false;
    }
    return true;
}

/* Intestazione con accenti: va codificata, altrimenti arriva a pezzi.
   Se il testo e' tutto ASCII si lascia com'e', che si legge meglio nei
   log e nei client vecchi */
function smtp_intestazione($testo) {
    return preg_match('/[\x80-\xFF]/', $testo)
        ? '=?UTF-8?B?' . base64_encode($testo) . '?='
        : $testo;
}

function smtp_invia(array $cfg, $oggetto, $corpo, $rispondiA = null, $rispondiNome = null) {
    $errore = '';
    $contesto = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);

    $sock = @stream_socket_client(
        'tcp://' . $cfg['smtp_host'] . ':' . $cfg['smtp_porta'],
        $n, $s, 15, STREAM_CLIENT_CONNECT, $contesto
    );
    if (!$sock) return ['ok' => false, 'errore' => "connessione fallita: $s ($n)"];
    stream_set_timeout($sock, 15);

    $mittente = $cfg['mittente'];
    $ehlo = 'EHLO ' . ($cfg['ehlo'] ?? 'del-mar.it');

    $passi =
        smtp_dice($sock, null, 220, $errore, 'saluto')
        && smtp_dice($sock, $ehlo, 250, $errore)
        && smtp_dice($sock, 'STARTTLS', 220, $errore);

    if ($passi) {
        /* Da qui in poi in chiaro non passa piu' niente: senza questo, la
           password volerebbe leggibile sulla rete */
        if (!@stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            fclose($sock);
            return ['ok' => false, 'errore' => 'TLS rifiutato'];
        }
        $passi = smtp_dice($sock, $ehlo, 250, $errore, 'EHLO dopo TLS')
            && smtp_dice($sock, 'AUTH LOGIN', 334, $errore)
            && smtp_dice($sock, base64_encode($cfg['smtp_utente']), 334, $errore, 'utente')
            && smtp_dice($sock, base64_encode($cfg['smtp_password']), 235, $errore, 'password')
            && smtp_dice($sock, 'MAIL FROM:<' . $mittente . '>', 250, $errore);
    }

    if ($passi) {
        foreach ((array) $cfg['destinatari'] as $dest) {
            if (!smtp_dice($sock, 'RCPT TO:<' . $dest . '>', [250, 251], $errore)) { $passi = false; break; }
        }
    }

    if ($passi && smtp_dice($sock, 'DATA', 354, $errore)) {
        $testa = [
            'From: ' . smtp_intestazione($cfg['mittente_nome']) . ' <' . $mittente . '>',
            'To: ' . implode(', ', (array) $cfg['destinatari']),
            'Subject: ' . smtp_intestazione($oggetto),
            'Date: ' . date('r'),
            'Message-ID: <' . bin2hex(random_bytes(12)) . '@del-mar.it>',
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
        ];
        if ($rispondiA) {
            $testa[] = 'Reply-To: ' . ($rispondiNome ? smtp_intestazione($rispondiNome) . ' ' : '')
                     . '<' . $rispondiA . '>';
        }
        $messaggio = implode("\r\n", $testa) . "\r\n\r\n"
                   . chunk_split(base64_encode($corpo), 76, "\r\n");

        fwrite($sock, $messaggio . "\r\n.\r\n");
        $passi = smtp_dice($sock, null, 250, $errore, 'consegna');
    } elseif ($passi) {
        $passi = false;
    }

    @fwrite($sock, "QUIT\r\n");
    fclose($sock);

    return $passi ? ['ok' => true, 'errore' => ''] : ['ok' => false, 'errore' => $errore];
}
