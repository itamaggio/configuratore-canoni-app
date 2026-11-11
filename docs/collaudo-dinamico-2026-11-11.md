# Collaudo canoni dinamici B2B e B2C

Il collaudo è completato su **test.kenovy.it** con vere righe Word, otto colonne indipendenti e generazione dal nome del modello nel menu Documento. La SPA è un archivio tecnico di stampa: l'operatore usa **Canoni → Salva canoni → Documento → modello B2C o B2B**.

Non è un rilascio sul portale cloud di Novotecna o sulla VPS. L'app resta servita dal container locale sul PC di test. I contenuti economici e anagrafici delle prove sono dimostrativi.

## Risultati documentali

| Caso | Modello | Documento nativo | Canoni | Esito |
| --- | --- | --- | --- | --- |
| Preventivo 67, B2C | 17 | 95, TEST-CAN-28 | 2 | Prodotti, due canoni, riepilogo e accettazione a pagina 8 |
| Preventivo 69, B2C con descrizione estesa | 17 | 98, TEST-CAN-31 | 3 | Descrizione completa, tre canoni, riepilogo e accettazione a pagina 8; linea firma separata dal piè di pagina |
| Preventivo 72, B2B | 18 | 96, TEST-CAN-29 | 4 | Quattro righe effettive, anagrafica azienda, unità prodotto corrette, riepilogo e accettazione a pagina 8 |
| Preventivo 71, variazione B2C | 17 | 86 e 87, TEST-CAN-19/20 | 4 → 3 | La rimozione di una voce elimina la relativa riga nella nuova emissione; il documento precedente conserva le quattro voci |

I tre PDF finali scaricati contano **15 pagine**: offerta a pagina 8 e condizioni generali dalla 9. Le precedenti 16 pagine comprendevano uno slittamento della parte finale dell'offerta; nessun testo contrattuale è stato rimosso per recuperare spazio.

Il totale dei prodotti resta **12.078,00 €**, con imponibile 9.900,00 € e imposta 2.178,00 €. Le tariffe dei canoni non vengono moltiplicate per quantità né sommate al totale. Nessun segnaposto CRM irrisolto o tag HTML letterale nelle tabelle dei PDF finali. Le celle facoltative vuote rimangono vuote.

Tutte le pagine dei PDF sono state renderizzate con Poppler e controllate in panoramica; la pagina economica è stata verificata anche in dettaglio. L'ultima correzione della linea firma è stata verificata nel nuovo PDF del 69, il caso con meno spazio disponibile.

## Dati e allineamento

- `UF_CRM_NOVOTECNA_CANONI` conserva il JSON modificabile del singolo Preventivo.
- `UF_CRM_NOVOTECNA_CANONI_WORD` collega le righe della revisione di stampa alla SPA tecnica **1074**, tipo **18**, codice `NOVOTECNA_CANONI_WORD_TEST`.
- I sei nuovi campi `NOVO_NAME`, `NOVO_UNIT`, `NOVO_PERIOD`, `NOVO_DURATION`, `NOVO_START`, `NOVO_NOTES` separano gli attributi nelle otto colonne. Tariffa e riferimento riusano i campi già disponibili. I cinque campi precedenti restano compatibili con i documenti storici.
- Il salvataggio crea nuove righe, ne rilegge il contenuto e aggiorna JSON e collegamenti insieme. Non modifica le righe prodotto. Nessuna cancellazione automatica delle revisioni precedenti.
- Il 67 conserva **2 canoni** e il 69 **3 canoni**, con contenuti preesistenti e totale invariati. Sono entrambi preparati per il layout 8. Le copie 71 e 72 sono allineate rispettivamente con 3 e 4 righe di stampa.
- `canoniWordEightEnabled=Y` abilita il nuovo percorso dell'editor; il 69 non usa più il salvataggio a tre slot fissi.

La durata di esempio `14` già presente nel 67/69 è stata conservata come valore personalizzato; non è stata trasformata arbitrariamente in mesi o anni.

## Modelli e menu

Nel menu Documento dei Preventivi rimangono soltanto:

1. **17 — Novotecna — Preventivo B2C con canoni**.
2. **18 — Novotecna — Preventivo B2B con canoni**.

I precedenti modelli di prova 10, 11, 12, 14 e 15 sono stati disattivati. Ai modelli condivisi 1, 6 e 7 è stata tolta soltanto l'associazione ai Preventivi: le associazioni a lead e affari sono conservate. Il modello sperimentale 16 era già disattivato. Nessun modello o documento è stato eliminato.

È stato rimosso il solo collegamento dell'app a `CRM_QUOTE_DOCUMENTGENERATOR_BUTTON`. La scheda Canoni resta disponibile; i normali controlli Bitrix24 Documenti, Aggiungi nuovo modello ed Estensioni restano controlli del prodotto, non ulteriori modelli.

La presenza delle due sole voci è stata verificata nel menu nativo del 67, con la scheda Canoni aperta e stato **Modifiche salvate**.

## Correzioni e UX

- Vera tabella Word con numero di righe corrispondente ai canoni salvati; nessuna riga prenotata per una voce inesistente.
- Otto colonne autonome, intestazione blu, larghezza e bordi esterni allineati alla tabella prodotti; testo a capo e nessuna altezza fissa delle righe.
- Ripristinati gli elenchi di unità, periodicità, durata e decorrenza della preview. I valori personalizzati già salvati vengono conservati.
- La ricerca nel catalogo copia soltanto il nome del prodotto, lasciando tariffa e condizioni inalterate.
- Stato salvato visibile, indicazione del modello da scegliere e istruzione **Crea nuovo** quando Bitrix24 propone un numero precedente. I documenti già emessi non si aggiornano automaticamente.
- Rimozione con possibilità di annullamento collaudata prima del salvataggio; nessuna seconda apertura dell'app per stampare.
- Separazione delle condizioni generali dalla pagina economica: evita che una sezione continua sovrascriva intestazione e margini dell'offerta breve.
- Recupero dei soli spazi vuoti del modello, senza ridurre il carattere o troncare descrizioni. Ancoraggio della linea firma coerente a 6 pt sia in DrawingML sia nel fallback VML, per evitare interferenze con il piè di pagina.
- Nel B2B le tre unità statiche `kWp` del vecchio modello sono sostituite da `ProductsProductMeasureName`: il servizio di attivazione stampa correttamente `pz.`. Completato l'indirizzo di consegna dell'azienda dimostrativa, richiamato dal campo esistente del modello.

## Verifiche tecniche e limiti

**48 test Node e 5 test Python superati**, più controllo sintattico dei moduli e controllo del diff. La revisione finale ha verificato proiezione, conservazione dei dati, pulizia del menu e ancoraggio della firma. Nessuna soppressione dei controlli di design è stata aggiunta.

I test automatici coprono anche lista vuota, quattro o più voci, caratteri speciali, celle opzionali vuote, riletture incomplete, modifiche concorrenti, errori parziali e rifiuto dei testi troppo estesi prima del salvataggio. La lista vuota non è stata oggetto di un'ulteriore emissione PDF nativa in questo collaudo.

Il numero di righe è dinamico, ma lo spazio di una pagina è finito. Rimangono il limite tecnico generale di 30 voci/45 KB e un controllo conservativo dell'altezza; questi non equivalgono alla possibilità di stampare 30 voci su una pagina. Il collaudo visivo riguarda le offerte di prova con due righe prodotto e i testi indicati. Un'offerta con molti prodotti o contenuti diversi richiede il controllo della relativa anteprima PDF. Il controllo delle modifiche concorrenti non è un blocco transazionale del CRM.

Il DOCX B2B proviene dall'archivio OneDrive Novotecna, file `Template Fotovoltaico Virtuale - B2B.docx`, SHA-256 `8fe05546081c148dfecb3716ee41aee662df72264ebe500a698ea191175462e5`. Il sorgente B2C è il R01 del 07/10/26 già fornito. I contenuti contrattuali sono preservati; il collaudo tecnico non costituisce approvazione commerciale delle versioni contrattuali.

PDF, DOCX, logo e schermate restano esclusi da Git. Evidenze locali in `artifacts/word-eight/qa-2026-11-11/`: PDF, PNG della pagina 8, panoramiche, hash in `pdf-verification.json`, stato finale CRM, ricevuta della configurazione del menu e schermata `menu-definitivo.png`. Nessun nuovo push eseguito nell'ambito di questo collaudo.
