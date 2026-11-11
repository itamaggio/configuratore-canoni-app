# Tabella Word nel preventivo nativo

Il percorso provato è **Canoni → Salva canoni → Documento → TEST Novotecna B2C — Word nativo → Crea nuovo**. Il comando del modello usa il generatore nativo, senza riaprire l'estensione.

## Risultato verificato

Portale `test.kenovy.it`, preventivo di collaudo **68**, separato dal preventivo **67** che l'utente stava compilando. I dati sono dimostrativi. Non sono stati inviati documenti a clienti.

| Prova | Esito osservato |
| --- | --- |
| Salvataggio dall'editor | Nuove righe Word create e rilette; JSON e collegamento salvati nel preventivo |
| Generazione dal menu nativo | Modello **14**, documento **80**, numero **TEST-CAN-14** |
| Descrizione O&M | 673 caratteri presenti integralmente |
| Secondo canone | Assistenza Tecnica Aggiuntiva, con nota aggiunta dall'editor |
| Tariffe | 15,00 € per ciascuna voce, senza moltiplicare per 10 kWp |
| Offerta | Due prodotti, due canoni, note e riepilogo nella pagina **8** |
| Totale prodotti | **12.078,00 €**, invariato; imponibile 9.900,00 €, imposta 2.178,00 € |
| Documento completo | **16 pagine** nell'anteprima PDF nativa |

Il documento 79 (TEST-CAN-13) aveva già confermato la lettura nativa dei record senza passare array dall'app: il suo PDF è stato scaricato, analizzato e reso in immagini. Il documento 80 conferma il successivo percorso completo dall'editor e dal menu Documento; è stato verificato nell'anteprima PDF nativa e ne è stata salvata una schermata della pagina 8. Non si attribuisce al file locale del documento 79 il contenuto aggiornato del documento 80.

Gli artefatti sono locali in `artifacts/word-layout-2026-11-10/`: `documento-79.pdf`, `documento-79-08.png`, `bitrix-documento-80.jpg`. DOCX, PDF, logo e schermate sono esclusi dal repository.

## Impaginazione e UX

Il builder riusa larghezza, bordi, colore dell'intestazione e caratteri della tabella prodotti. Le cinque colonne si allineano a confini ottenuti unendo le otto colonne native. Il test sul pacchetto DOCX verifica che la tabella prodotti originale e le altre parti del documento siano conservate. Non ci sono immagini o altezze fisse nelle righe dei canoni.

La descrizione è un campo su più righe. Nella lista, i testi lunghi hanno un riepilogo e **Leggi la descrizione completa**, senza trasformare tutta la scheda in un titolo. Il documento riceve il testo integrale. Le note sono nella colonna larga del servizio; tariffa, unità, periodicità, riferimento, durata e decorrenza restano distinti.

L'operatore non deve aprire o compilare il processo intelligente. Lo gestisce Salva canoni. Il messaggio sotto la lista indica esattamente il modello da scegliere. La compilazione incompleta continua a richiedere Aggiungi/Aggiorna prima del salvataggio e la rimozione resta annullabile.

## Configurazione osservata

Processo di test: ID **18**, `entityTypeId=1074`, codice `NOVOTECNA_CANONI_WORD_TEST`. Campo multiplo sul preventivo: `UF_CRM_NOVOTECNA_CANONI_WORD`, identificato da `NOVOTECNA_CANONI_WORD_V2`. I collegamenti provati dal generatore usano ID numerici delle righe.

I cinque campi stringa del processo sono `UF_CRM_18_NOVO_DESCRIPTION`, `UF_CRM_18_NOVO_TARIFFA`, `UF_CRM_18_NOVO_UNITPER`, `UF_CRM_18_NOVO_RIFERIMENTO`, `UF_CRM_18_NOVO_CONDIZIONI`. I relativi segnaposto sono ricavati dalla lista Campi del generatore nativo e sono nel builder.

Nel portale di test, la creazione REST del campo CRM non aveva applicato correttamente il collegamento al processo. La configurazione è stata completata nell'interfaccia nativa scegliendo esclusivamente il processo 1074. Questo passaggio e i campi del processo devono essere riprodotti nell'installazione cliente; l'attuale app non automatizza il provisioning completo di un nuovo portale.

I permessi dell'app restano CRM e incorporamento. Non sono stati aggiunti nuovi ambiti di autorizzazione. L'attivazione ha impostato `canoniWordEnabled=Y`; i preventivi esistenti preparano il collegamento Word al successivo salvataggio. I dati salvati e la compilazione aperta del 67 non sono stati sostituiti da fixture.

## Verifiche locali e limiti

**31 test Node superati**, più **1 test del builder DOCX**. Copertura: testo esteso, escape HTML, entrambi i tipi B2B/B2C, lista vuota, ordine delle righe, tariffe senza calcoli, cambiamenti da altre sessioni prima e durante la preparazione, rilettura incompleta senza ripetizione della scrittura e controllo preventivo di altezza.

Il limite di altezza è una stima conservativa per il modello collaudato, non una misura della paginazione interna di Bitrix24. Nel caso provato, la tabella e i totali restano sulla stessa pagina. Quantità diverse di prodotti, descrizioni prodotto molto lunghe e un nuovo modello richiedono la verifica del PDF effettivo. Non vengono tagliati testi o ridotti automaticamente i caratteri per farli entrare.

La prova reale riguarda B2C con profilo amministrativo. Restano da qualificare il DOCX B2B e un profilo operatore con i permessi minimi sul processo tecnico. Le vecchie revisioni di stampa non vengono eliminate automaticamente; una gestione della loro conservazione è da definire prima della produzione. La rilevazione delle modifiche concorrenti non elimina la finestra fra l'ultima lettura e la scrittura CRM.

La pubblicazione sulla VPS non fa parte di questa prova: continua a essere usato il container locale di Docker Desktop.

## Prova successiva senza SPA

Su richiesta dell'utente, confermato che Novotecna usa Bitrix24 cloud, è stata preparata una seconda variante che mantiene il clic diretto sul nome del modello e usa esclusivamente campi del Preventivo. Non sono stati rimossi i dati delle prove precedenti.

- Preventivo autonomo **69**, copiato dal caso dimostrativo 68; il 67 resta invariato.
- Modello **15**, **TEST Novotecna B2C — Word senza SPA (3 righe)**.
- Tre gruppi da otto campi stringa, `UF_CRM_NOVO_C1_*`, `C2_*`, `C3_*`, con descrizione, tariffa, unità, periodicità, quantità, durata, decorrenza e note separati.
- Salvataggio e rilettura mediante `crm.quote.get/update`; nessuna chiamata a `crm.type.*` o `crm.item.*` nel percorso della prova senza SPA.
- Nessun canone inserito tra i prodotti o sommato al totale.

Il documento **81, TEST-CAN-15**, ha confermato due canoni con descrizione lunga e terza riga vuota. È stato rilevato che il totale finale scivolava alla pagina 9: la versione successiva riduce soltanto gli spazi vuoti prima delle note e del riepilogo, conservando il carattere del corpo a 8 punti, e mantiene unite le righe dei totali.

Il terzo canone **Monitoraggio da remoto**, 8,00 €/impianto al mese, è stato inserito e salvato dall'editor. Il documento **82, TEST-CAN-16**, generato tramite **Documento → nome del modello → Crea nuovo**, contiene tutti e tre i canoni e il riepilogo completo nella pagina **8 di 16**, con totale **12.078,00 €** invariato. Il testo della descrizione O&M è completo; durata, decorrenza e note sono in colonne autonome. La verifica del PDF è stata svolta nell'anteprima nativa.

L'ultima revisione amplia la colonna Unità affinché «Impianto» non sia spezzato. Il documento finale **83, TEST-CAN-17**, è stato nuovamente generato dal nome del modello nel menu nativo. Sono confermati tutti e tre i canoni, l'unità intera e il totale nella stessa pagina 8, su 16 pagine complessive. La schermata finale è locale in `artifacts/direct-word-2026-11-10/documento-83-tre-canoni.jpg`; non è stata eseguita una pubblicazione o un invio al cliente.

Il modello ha un limite dichiarato di tre righe e lascia vuote quelle inutilizzate. Non è una tabella con numero di righe dinamico. L'editor blocca la quarta voce e il salvataggio azzera i campi delle voci rimosse. La variante è abilitata soltanto sul caso 69; l'uso del relativo modello su altre schede non prepara automaticamente i campi. Prima dell'adozione servono la scelta del numero massimo di righe, il modello B2B e la qualificazione nel portale cloud cliente.

Le verifiche locali aggiornate comprendono **34 test Node** e **2 test del builder DOCX**. I nuovi controlli verificano otto colonne distinte, 24 segnaposto, pulizia delle righe rimosse, tariffe senza moltiplicazioni, operazioni limitate al Preventivo e controllo preventivo dell'altezza. Logo e documenti restano esclusivamente locali.

## Catalogo, menu e verifica dinamica successiva

Il 10 novembre sono stati ripristinati i menu originali per unità, periodicità, durata e decorrenza. Sono disponibili anche kWp e la durata dell'intero contratto. In modifica, i valori preesistenti non appartenenti all'elenco, come durata «14» e decorrenza «Dall’attivazione», restano selezionati senza conversioni. La ricerca sul nome mostra i prodotti attivi del catalogo, con selezione da tastiera e chiusura tramite Escape o uscita dal campo. La descrizione rimane modificabile liberamente.

La prova nel browser ha selezionato **TEST — Attivazione sistema virtuale**, il cui prezzo di catalogo è 200 €, dopo aver compilato una tariffa di **77,00 €**, durata **36 mesi** e decorrenza **Dal secondo anno**. La selezione ha copiato solo il nome e conservato tutti questi valori. La bozza è stata annullata: i tre canoni salvati del preventivo 69 sono rimasti invariati. La schermata è `artifacts/catalog-menu-2026-11-10/selezione-solo-nome.jpg`.

L'elenco esplicita quando mostra soltanto i primi dieci risultati. La navigazione da tastiera è implementata, ma il comando di verifica automatica ArrowDown non è stato eseguito dal controllo browser: questa prova non ne certifica il funzionamento reale.

Per la richiesta di righe dinamiche è stato predisposto il caso autonomo **70**, con campo testo multiplo `UF_CRM_NOVO_DYN_ROWS`, modello **16** e documento **84**, generato dal nome del modello nel menu nativo. Nessuna di queste prove ha modificato i preventivi 67, 68 o 69.

| Tentativo | Risultato effettivamente osservato |
| --- | --- |
| Campo multiplo ordinario | Due valori dentro un'unica cella e riga Word, separati da virgola |
| Modificatore `mseparator=2` | Due linee di testo dentro la stessa cella; nessuna seconda riga Word |
| Modificatore `mfirst=Y` | Solo il primo valore |
| `crm.documentgenerator.document.update` con array e descrizione `fields` | Chiamata accettata; il percorso dell'array compare come testo letterale, senza ripetizione della riga |
| `documentgenerator.document.update` prima del permesso dedicato | Errore di ambito insufficiente |
| Stessa chiamata dopo il permesso autorizzato | `Access denied` |
| Lettura del documento 84 con i due gruppi di metodi | Lettura CRM riuscita; lettura del generatore generale negata |

L'autorizzazione è stata verificata nell'elenco Integrazioni: è stato aggiunto soltanto `documentgenerator`, mantenendo CRM e incorporamento. Il confronto in sola lettura, successivo al rinnovo della sessione dell'app, conferma che non si tratta più del precedente errore di ambito. Non sono stati ampliati altri permessi. La documentazione ufficiale distingue `crm.documentgenerator.*`, alimentato dalle entità CRM, da `documentgenerator.*`, alimentato dai dati dell'app: questo è coerente con il rifiuto osservato, senza dimostrare da solo la causa interna del controllo di accesso.

La verifica **non qualifica una tabella Word dinamica senza SPA con clic diretto**. Il limite di tre canoni rimane nella variante a campi singoli; è una scelta del prototipo e non un limite globale Bitrix24. Non è stato dichiarato funzionante un automatismo successivo alla generazione.

A fine verifica il modello 16 è **inattivo**, il documento 84 è conservato e il permesso `documentgenerator` è stato rimosso. L'app ha nuovamente i soli ambiti CRM e incorporamento. I comandi e il modulo sperimentale sono stati tolti da `public/`; una copia del codice e le evidenze restano localmente in `artifacts/catalog-menu-2026-11-10/`. Non sono stati pubblicati link ai documenti né inviati file a clienti.

Sono stati aumentati a 12 px i testi di aiuto e le piccole etichette dell'interfaccia, con risultati del catalogo a 13 px. Il pannello dei suggerimenti ha spazio interno di 12 px e pulsanti con spazio di 10×12 px. Non sono state aggiunte esclusioni ai controlli di leggibilità.

Verifica locale finale: **38 test Node superati**, **2 test del builder DOCX superati**, controllo sintattico di `public/app.mjs` e `git diff --check` riusciti. Le sole segnalazioni Git riguardano la conversione LF/CRLF su Windows. Questi controlli non trasformano l'esito negativo della verifica dinamica in un collaudo positivo.

Fonti ufficiali consultate:

- [Metodi CRM e generatore generale: differenze](https://apidocs.bitrix24.com/api-reference/crm/document-generator/index.html)
- [Aggiornamento documento CRM](https://apidocs.bitrix24.com/api-reference/crm/document-generator/documents/crm-document-generator-document-update.html)
- [Aggiornamento del generatore generale e parametro fields](https://apidocs.bitrix24.com/api-reference/document-generator/document-generator-document-update.html)
- [Compatibilità della ricerca nel catalogo](https://apidocs.bitrix24.com/api-reference/crm/outdated/products/crm-product-list.html)
