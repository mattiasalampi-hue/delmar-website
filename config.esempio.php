<?php
/*
  MODELLO. Va copiato in config.php SUL SERVER e riempito con le
  credenziali vere.

  config.php e' escluso da git di proposito: questo repository e'
  pubblico, e una password dentro un file tracciato diventa pubblica al
  primo push — e resta nella storia anche se la si cancella dopo.

  Le credenziali SMTP2GO sono le stesse gia' in uso dal progetto
  delmar_agent_pricing: si trovano nel suo file .env, alle voci
  SMTP_USERNAME e SMTP_PASSWORD. Non serve crearne di nuove.
*/

return [
    /* Server SMTP2GO, sede europea — lo stesso del progetto listini */
    'smtp_host'     => 'mail-eu.smtp2go.com',
    'smtp_porta'    => 587,
    'smtp_utente'   => 'INSERISCI_QUI_SMTP_USERNAME',
    'smtp_password' => 'INSERISCI_QUI_SMTP_PASSWORD',

    /* Mittente dedicato al sito: in casella si distingue a colpo d'occhio
       cosa arriva dal form. Va creata la casella o un alias nel pannello
       Shellrent, altrimenti le risposte automatiche non hanno dove
       tornare. Il Rispondi-a viene comunque impostato su chi ha
       compilato, quindi rispondere funziona in ogni caso */
    'mittente'      => 'sito@del-mar.it',
    'mittente_nome' => 'Sito DelMar',

    /* Dove arrivano le richieste: 'destinatari' e' chi la deve lavorare,
       'copia' chi la riceve per saperlo. Sono due elenchi, una riga per
       indirizzo.
       Cc e non Ccn: chi risponde vede che ce l'hanno anche gli altri, e
       non si finisce per scrivere in due allo stesso cliente. */
    'destinatari'   => ['info@del-mar.it'],
    'copia'         => ['mattias.alampi@gmail.com'],

    /* Nome con cui il server si presenta. Se SMTP2GO dovesse lamentarsi,
       e' la prima cosa da guardare */
    'ehlo'          => 'del-mar.it',
];
