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

    /* Password del pannello dell'analitica (pannello.php).
       Ci va l'IMPRONTA, non la password in chiaro: si ottiene con
       php -r "echo password_hash('la-password', PASSWORD_DEFAULT);"
       Da un'impronta non si torna indietro, quindi nemmeno chi legge
       questo file conosce la password. */
    'pannello_password' => 'INSERISCI_QUI_IMPRONTA_BCRYPT',

    /* Search Console dentro il pannello (analitica/ricerche.php).
       Facoltativi: senza, il blocco delle ricerche resta vuoto e tutto
       il resto funziona.

       Come si ottengono: in Google Cloud si crea un progetto, si
       abilita la "Google Search Console API", si crea un account di
       servizio e si scarica la sua chiave JSON. Poi, in Search Console,
       l'email dell'account di servizio va aggiunta come utente della
       proprieta' con permesso "Limitata" — basta per leggere le
       ricerche, e una chiave su un hosting condiviso e' meglio che
       possa fare poco.

       La chiave va in _dati/, che l'.htaccess nega al web, e NON deve
       mai finire in git: Google disattiva da sola le chiavi che trova
       nei repository pubblici, e questo lo e'.

       Il sito va scritto ESATTAMENTE come compare in Search Console,
       barra finale compresa: e' un identificativo, non un indirizzo. */
    'search_console_chiave' => __DIR__ . '/_dati/sc-chiave.json',
    'search_console_sito'   => 'https://del-mar.it/',

    /* Nome con cui il server si presenta. Se SMTP2GO dovesse lamentarsi,
       e' la prima cosa da guardare */
    'ehlo'          => 'del-mar.it',
];
