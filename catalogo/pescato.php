<?php
/*
  IL PESCATO DEL GIORNO, preso dal gestionale.

  I dati vivono sull'altro server (listini.del-mar.it, l'Operations Hub):
  li' il buyer prepara la vetrina ogni sera e la pubblica. Qui si legge
  e basta.

  PERCHE' UNA COPIA LOCALE E NON UNA CHIAMATA DIRETTA A OGNI VISITA.
  Sono due server diversi: se quello dei listini e' spento, lento o in
  aggiornamento, il sito NON deve accorgersene. Chi apre del-mar.it non
  sa niente di quel server e non gli interessa. Quindi si tiene una
  copia in _dati/ e la si rinfresca ogni tanto: se il rinfresco fallisce
  si continua a servire l'ultima buona, e se non c'e' nemmeno quella la
  sezione semplicemente non compare — mai un errore in faccia a chi
  legge.

  E' lo stesso principio dell'analitica: il sito viene prima.
*/

/* L'indirizzo dell'Operations Hub. Sottodominio dello stesso dominio,
   ma e' un'altra macchina (VPS Serverlet) con un altro ciclo di vita. */
define('PESCATO_SORGENTE', 'https://listini.del-mar.it/api/pescato');

define('PESCATO_COPIA', dirname(__DIR__) . '/_dati/pescato.json');

/* Ogni quanto ritentare. Il pescato cambia una volta al giorno — il
   buyer pubblica la sera — quindi mezz'ora e' gia' piu' del necessario;
   serve soprattutto a non far dipendere ogni singola visita da una
   chiamata di rete. */
define('PESCATO_FRESCHEZZA', 1800);

/* Quanto si aspetta l'altro server. Tre secondi: oltre, la pagina si
   fa attendere per una sezione che e' un di piu'. Se non risponde in
   tempo si usa la copia vecchia, che e' comunque di stanotte. */
define('PESCATO_ATTESA', 3);

/*
  Ritorna l'elenco del pescato pubblicato, oppure null se non c'e'
  proprio niente da mostrare.

  Non lancia mai eccezioni: qualunque cosa vada storta, la pagina deve
  restare in piedi.
*/
function pescato_del_giorno()
{
    $copia = pescato_copia_valida();

    /* Copia fresca: si usa senza disturbare nessuno. */
    if ($copia !== null && $copia['eta'] < PESCATO_FRESCHEZZA) {
        return $copia['dati'];
    }

    $fresco = pescato_scarica();

    if ($fresco !== null) {
        pescato_salva($fresco);
        return $fresco;
    }

    /* Il rinfresco non e' riuscito: meglio il pescato di stamattina che
       una sezione vuota. Il pesce di oggi resta vero fino a stasera. */
    return $copia !== null ? $copia['dati'] : null;
}

/* La copia su disco, con la sua eta'. null se manca o e' illeggibile. */
function pescato_copia_valida()
{
    if (!is_readable(PESCATO_COPIA)) {
        return null;
    }

    $grezzo = @file_get_contents(PESCATO_COPIA);
    if ($grezzo === false) {
        return null;
    }

    $dati = json_decode($grezzo, true);
    if (!is_array($dati) || !isset($dati['pescato'])) {
        return null;
    }

    return array('dati' => $dati, 'eta' => time() - (int) @filemtime(PESCATO_COPIA));
}

function pescato_scarica()
{
    $contesto = stream_context_create(array(
        'http' => array(
            'method' => 'GET',
            'timeout' => PESCATO_ATTESA,
            'header' => "Accept: application/json\r\nUser-Agent: del-mar.it\r\n",
            /* Un 500 dall'altro server non deve diventare un'eccezione
               qui: si legge il corpo e si decide guardando il codice. */
            'ignore_errors' => true,
        ),
        'ssl' => array('verify_peer' => true, 'verify_peer_name' => true),
    ));

    $grezzo = @file_get_contents(PESCATO_SORGENTE, false, $contesto);
    if ($grezzo === false) {
        return null;
    }

    /* $http_response_header lo riempie file_get_contents: se la
       risposta non e' 200 (404 perche' il ciclo non e' ancora
       deployato, 502 durante un rilascio) si tiene la copia vecchia. */
    if (isset($http_response_header[0]) && strpos($http_response_header[0], '200') === false) {
        return null;
    }

    $dati = json_decode($grezzo, true);
    if (!is_array($dati) || !isset($dati['pescato']) || !is_array($dati['pescato'])) {
        return null;
    }

    return $dati;
}

/*
  Scrittura ATOMICA: si scrive un file temporaneo e lo si rinomina.
  Senza, una visita che arriva mentre stiamo scrivendo leggerebbe mezzo
  JSON e la sezione sparirebbe per un istante, senza che nessuno capisca
  perche'.
*/
function pescato_salva($dati)
{
    $cartella = dirname(PESCATO_COPIA);
    if (!is_dir($cartella) || !is_writable($cartella)) {
        return;
    }

    $temporaneo = $cartella . '/.pescato-' . getmypid() . '.tmp';
    if (@file_put_contents($temporaneo, json_encode($dati)) === false) {
        return;
    }

    @rename($temporaneo, PESCATO_COPIA);
}

/*
  Le due provenienze si dicono con parole diverse, ed e' il motivo per
  cui il dato porta con se' la fonte: "arrivo" e' merce ordinata che
  arriva domani, "giacenza" e' merce che c'e' adesso. Prometterle
  uguali sarebbe una bugia in una delle due direzioni.
*/
function pescato_etichetta_fonte($fonte)
{
    return $fonte === 'arrivo' ? 'in arrivo domani' : 'oggi al banco';
}
