# Canoni con selezione diretta del modello

Il 9 novembre 2026 è stata eseguita la prova richiesta su `test.kenovy.it`, preventivo nativo **67**, senza usare la voce Estensioni per generare il documento.

## Risultato verificato

Percorso effettivo: **Documento → TEST Novotecna B2C — Canoni nativi**. Si apre il visualizzatore `crm.document.view`, non l'iframe dell'app. Primo documento **68**, TEST-CAN-2; dopo la rifinitura del salto pagina della firma, documento finale **69**, TEST-CAN-3. Alla seconda emissione Bitrix24 ha chiesto se usare il numero precedente o crearne uno nuovo; è stato scelto **CREA NUOVO**.

Modello dedicato **12**, distinto dai modelli 10 e 11. PDF finale: `Varie/TEST Novotecna B2C — Canoni nativi TEST-CAN-3.pdf`, **718973 byte**, **16 pagine**. A pagina 8 compaiono prodotti nativi e canoni separati, inclusa tariffa O&M di **97,00 euro**, unità kWp, periodicità annuale, riferimento 10 kWp, durata, decorrenza e note. Nessun totale canoni o moltiplicazione per quantità. Imponibile prodotti 9.900 euro, IVA 2.178 euro, totale 12.078 euro, invariati.

## Meccanismo e limiti

Il campo File Quote **UF_CRM_NOVOTECNA_CANONI_STAMPA**, XML ID **NOVOTECNA_CANONI_NATIVE_PRINT_V1**, contiene il PNG renderizzato dai canoni JSON salvati. Il segnaposto immagine del DOCX usa **{UfCrmNovotecnaCanoniStampa}**. Bitrix24 sostituisce l'immagine leggendo il campo CRM durante la generazione standard. L'app non deve essere aperta al momento dell'emissione.

**La tabella nel documento è un'immagine, non una tabella Word modificabile.** I dati restano modificabili nella scheda Canoni. Quando il campo stampa è già attivo sul preventivo, Salva canoni aggiorna dati e PNG nella stessa chiamata `crm.quote.update`, con controllo della rilettura. Questo percorso è stato provato sul caso 67 mantenendo i dati economici del caso B2C. L'ultima immagine preparata prima del documento 69 aveva ID file **1219**.

La proiezione ha spazio fisso **2200×520 pixel**, stampato a circa **18,2×4,3 cm**. Il rendering misura le righe e rifiuta il contenuto troppo alto prima di aggiornare il CRM. Questo collaudo non qualifica liste lunghe né immagini estese su più pagine; l'alternativa con estensione mantiene la tabella Word dinamica. La preparazione del modello nativo è intenzionalmente limitata al preventivo 67.

La copia conserva i segnaposto prodotti, imposte e totali del modello cliente. Rispetto alla copia con array Canoni cambiano solo la sostituzione della tabella con il segnaposto immagine, la relazione dell'immagine e una proprietà keepNext per tenere uniti nome azienda e firmatario. L'originale cliente resta invariato.

## Evidenze

- PDF finale reso in 16 PNG con Poppler. Le pagine **1–7 e 10–16 sono identiche pixel per pixel** al documento 67 del precedente collaudo cliente. Controllate visivamente le nuove pagine 8 e 9; firma unita a pagina 9.
- Nessun segnaposto testuale irrisolto nel PDF. Il testo dei canoni è incluso nell'immagine e pertanto non compare nell'estrazione testuale del PDF.
- Verifica visiva della tabella anche nel visualizzatore nativo, pagina 8/16.
- **15/15 test automatici superati**, inclusi proiezione informativa, salvataggio dei soli campi applicativi e rifiuto dei dati appartenenti ad altro preventivo.
- Restano i limiti d'impaginazione delle parti illustrative e del formato numerico del portale già rilevati nel collaudo precedente; non sono stati modificati i testi contrattuali.
- Container locale aggiornato, nessun deploy VPS, nessuna nuova autorizzazione dell'app e nessun invio del documento.

Riferimenti ufficiali utilizzati, oltre alla consultazione MCP Bitrix24 (indice non dettagliato per questo caso): [campi personalizzati e tipo File](https://helpdesk.bitrix24.com/open/23479452/), [segnaposto immagine nei modelli](https://helpdesk.bitrix24.com/open/20795250/).

Codice: `public/native-print.mjs`, integrazione in `public/app.mjs`; builder riproducibile `scripts/build_native_template.py`. Le prove sono in `artifacts/native-direct`.
