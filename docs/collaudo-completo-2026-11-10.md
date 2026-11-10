# Collaudo del preventivo 67 e percorso operatore

Il 10 novembre 2026 è stato generato dal menu nativo Bitrix24 il documento **74, TEST-CAN-8**, modello **12**, sul preventivo dimostrativo **67** di `test.kenovy.it`. Non è stata usata l'estensione per emettere il documento e non è stato eseguito alcun invio al cliente.

## Risultato documentale

PDF finale: `TEST Novotecna B2C — Canoni nativi TEST-CAN-8.pdf`, **766230 byte**, **16 pagine**, SHA-256 `d56092723a7b28832a62055a55b131736deff4c6fcd5301ad2bf988caae0bed3`.

A pagina 8 sono presenti i prodotti nativi, seguiti dai canoni O&M **97,00 euro/kWp annuo** e Assistenza Tecnica Aggiuntiva **15,00 euro/impianto mensile**, con riferimento, durata, decorrenza e note complete. Non sono calcolate moltiplicazioni, somme o totale canoni. Imponibile **9900 euro**, IVA **2178 euro** e totale **12078 euro** sono nella stessa pagina e non sono cambiati.

L'immagine finale è 2200×760 pixel, con lo stesso carattere a 34 px, nel segnaposto di circa 18,2×6,29 cm. Il cambio di sezione che nel modello sorgente precedeva le note è stato spostato dopo la firma, prima delle condizioni generali. Le cinque sezioni rimangono presenti. Il DOCX originale resta invariato: SHA-256 `3317964b1fd60e9cef55909808e6c7aac86b18242b61d84a8b97da4cddf1a6ca`.

Tutte le pagine sono state rese con Poppler. Le pagine 1–7 e 10–16 sono identiche pixel per pixel al documento 69; controllate visivamente le nuove pagine 8 e 9. Non risultano segnaposto testuali irrisolti. La firma resta sulla pagina 9, come nella precedente struttura del modello. Restano nella brochure sorgente l'immagine oltre il margine inferiore di pagina 4 e la doppia dicitura verticale a pagina 5.

## Correzioni emerse nel collaudo

- Nel documento 70 l'immagine nuova era compressa alle precedenti dimensioni, sebbene il DOCX caricato avesse già il segnaposto ampliato. La risincronizzazione mediante l'app ha prodotto le dimensioni corrette nel documento 71.
- Il riquadro da 900 pixel portava il totale finale sulla pagina successiva. La versione compatta da 760 pixel evita questo problema sul caso qualificato.
- La sezione interrotta a metà offerta faceva cambiare l'intestazione con la diversa quantità di testo. Estendere la sezione fino alla firma ha stabilizzato il documento 74. I documenti 70–73 rimangono prove intermedie, non il risultato da consegnare.
- Annulla ora sostituisce il vecchio errore con una conferma coerente. Cambiare o rimuovere una voce mentre il modulo è aperto non cancella più la compilazione. È disponibile Annulla rimozione, con controllo del limite di 30 voci.
- La scheda operatore indica il nome esatto del modello nativo e la scelta Crea nuovo. La selezione del modello dell'estensione è nascosta nel percorso nativo. La configurazione è accessibile dalla pagina principale dell'app.

## Scenari verificati

| Scenario | Ambiente ed esito |
|---|---|
| Due voci salvate, riapertura e generazione dal menu | CRM e PDF nativo: superato |
| Tariffa non numerica | Browser CRM: errore leggibile, voci salvate intatte |
| Campi obbligatori | Anteprima locale: validazione e focus sulla descrizione |
| Compilazione aperta e cambio voce | Browser CRM: bozza preservata e istruzioni esplicite |
| Annulla dopo un errore | Browser CRM: stato ripristinato senza messaggio residuo |
| Rimuovi e annulla rimozione | Browser CRM: voce ripristinata identica |
| Modifica con virgola e salvataggio | CRM: 15,50 euro salvati e riletti; ripristinati poi i 15,00 euro iniziali |
| Due sessioni, seconda con versione vecchia | CRM: secondo salvataggio rifiutato; rilettura conferma il primo |
| Note oltre lo spazio di stampa | CRM: errore prima della scrittura, tre voci in bozza e due precedenti ancora salvate |
| Verifica dopo le prove temporanee | CRM: righe canone e prodotti identici ai dati iniziali; totale 12078 euro |
| Lista vuota e tariffa zero | Anteprima locale: messaggio esplicito e 0,00 euro ammessi |
| Tastiera | Anteprima locale: Tab raggiunge la tariffa, Invio inserisce la voce |
| 30 voci, tentativo della 31a e ripristino al limite | Anteprima locale: entrambi i superamenti bloccati, compilazione preservata |
| Layout 390 e 820 pixel | Viewport emulato: nessuno scorrimento orizzontale; override ripristinato |
| B2B/B2C, schema, limiti, proiezione e rilettura incompleta | 21 test Node superati; i test della rilettura incompleta usano un adapter simulato |

L'ispezione del codice e le prove browser sono state svolte nella stessa sessione, senza revisione indipendente. Il detector ha segnalato il padding della testata: falso positivo verificato nel browser, dove risultano 25 px di padding e 1 px di bordo. Il successivo hook non ha segnalato problemi deterministici. Non sono state iniettate sovrapposizioni o script di audit nelle pagine del portale.

## Limiti ancora presenti

- **Salvataggio esplicito:** Aggiungi/Aggiorna modifica la lista nella scheda; solo Salva canoni scrive il CRM e la stampa. Le bozze non vengono recuperate dopo ricaricamento o chiusura. Nella prova automatizzata non è stato osservato un dialogo intercettabile prima della ricarica: non fare affidamento sull'avviso di uscita come unica protezione. Il recupero automatico della bozza è un miglioramento da prevedere per operatori inesperti.
- **Stampa a pagina singola:** il limite dati di 30 voci non equivale alla capacità del modello immagine. Note o elenchi estesi possono superare lo spazio; la stampa multipagina non è qualificata.
- **Concorrenza:** provata una seconda sessione che salva dopo la prima. Non c'è un confronto/scrittura atomico per richieste che arrivino nello stesso istante.
- **B2B:** la struttura dati è provata per entrambe le tipologie. Questo PDF e questo modello qualificano il caso B2C; il documento contrattuale B2B richiede il suo collaudo reale.
- **Ambiente:** usato l'account di test già autenticato. Restano da verificare i permessi dell'operatore commerciale reale, guasti di rete e portale cliente. Tablet e telefono sono emulazioni, non prove dell'app mobile Bitrix24.
- **Formato economico:** i totali mantengono il formato nativo attuale del portale (ad esempio `€12,078.00`). La localizzazione italiana va definita nella configurazione documentale del cliente.
- **Pubblicazione:** container locale soltanto; nessun deploy sulla VPS. Logo, DOCX, PDF e screenshot restano esclusi dal repository pubblico.

## Percorso da mostrare all'operatore

1. Aprire la scheda Canoni del Preventivo.
2. Inserire o modificare la voce e premere Aggiungi canone o Aggiorna canone.
3. Premere Salva canoni e attendere la conferma.
4. Aprire Documento e scegliere il modello indicato nella scheda.
5. Se richiesto, scegliere Crea nuovo e controllare il PDF della nuova emissione.

Le evidenze locali sono in `artifacts/collaudo-2026-11-10/`; il PDF finale è anche nella cartella `Varie`. I dati temporanei delle prove sono stati ripristinati e le schede di collaudo chiuse. Restano aperti soltanto il documento finale e la scheda Canoni usati per la revisione.
