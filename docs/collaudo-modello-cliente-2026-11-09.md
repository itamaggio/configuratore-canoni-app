# Prova con il modello cliente Novotecna

Prova funzionale completata il 9 novembre 2026 su `test.kenovy.it`, con l'app 59 nel container Docker locale. Nessun rilascio sulla VPS e nessun invio al cliente.

## Caso compilato

- Preventivo nativo CRM **67**: TEST NOVOTECNA — Fotovoltaico Virtuale 10 kWp B2C.
- Cliente fittizio TEST Mario Rossi, contatto **57**, dati anagrafici/requisito **57**, indirizzo dimostrativo e casella nel dominio riservato `example.invalid`.
- Affare collegato **109**, usato dai segnaposto Deal del modello cliente.
- Azienda emittente **85**, TEST Novotecna SBRL. Il default del portale non è stato modificato.
- Nome offerta, luogo di destinazione, pagamento, note, date e responsabile compilati. Sales Account obbligatorio del portale di test impostato all'utente corrente 6.
- Due prodotti catalogo di prova, **302** e **303**, con codice prodotto, descrizione e IVA 22%. Primo prodotto: 10 kWp a 970 euro netti/kWp; secondo: attivazione dimostrativa una tantum a 200 euro netti.
- Unità kWp di collaudo **6**, codice **99067**, senza cambiare l'unità predefinita.
- Canone O&M: **97 euro/kWp/anno**, riferimento 10 kWp, durata del contratto, decorrenza dall'attivazione, fatturazione annuale anticipata via SDD. La tariffa è informativa e non viene moltiplicata né sommata.

Totali nativi confermati: imponibile **9.900,00 euro**, IVA **2.178,00 euro**, totale **12.078,00 euro**. La generazione non ha modificato importo, imposta o valuta del preventivo.

## Modello e generazione

Originale: `Varie/Template Fotovoltaico Virtuale - R01 del 07_10_26  - B2C.docx`.

SHA-256 originale: `3317964b1fd60e9cef55909808e6c7aac86b18242b61d84a8b97da4cddf1a6ca`.

Copia locale: `public/templates/novotecna-b2c-canoni-test.docx`; modello Bitrix24 **11**, TEST Novotecna B2C — Modello cliente con canoni. Modificato solo `word/document.xml`, inserendo titolo, tabella canoni e nota subito dopo la tabella prodotti. Tutti gli altri componenti del pacchetto e tutti i blocchi originali del body sono preservati. Nessuna rimappatura dei segnaposto cliente: sul portale di test sono stati creati quattro campi Quote e la proprietà codice prodotto corrispondenti ai codici del DOCX.

La tabella Prodotti e i totali rimangono alimentati dal provider nativo CRM. L'app passa esclusivamente l'array aggiuntivo Canoni al generatore.

Prima generazione dal pulsante app: documento **66**, PDF TEST-CAN-5. Dopo il completamento delle unità e dell'azienda di prova, generazione dal percorso operativo **Documento → Estensioni → Preventivo con canoni**: documento **67**, PDF **TEST-CAN-1**. Il PDF finale è salvato in `Varie/TEST Novotecna B2C — Modello cliente con canoni TEST-CAN-1.pdf` (643402 byte, 16 pagine).

## Verifica e limiti osservati

- Tutti i segnaposto originali dell'anagrafica e dell'offerta risultano valorizzati nel provider; nel testo del PDF finale non restano segnaposto fra parentesi graffe.
- Pagina **8**: codici e descrizioni prodotti, quantità e prezzi nativi, tabella canoni immediatamente sotto, tutte le otto informazioni del canone visibili e totale separato.
- PDF finale reso in 16 PNG con Poppler; controllate tutte le pagine. Nelle pagine illustrative permangono difetti del layout ottenuto dalla conversione del modello, in particolare immagine fuori margine nella pagina 4 e testo verticale duplicato nella pagina 5. La copia è una prova funzionale, non un impaginato definitivo per l'invio commerciale.
- Gli importi dei prodotti e dei totali usano il formato numerico inglese del portale di test; la tariffa canone usa il formato italiano. Non sono state modificate impostazioni globali di valuta o portale.
- Il renderer DOCX locale non è disponibile perché il runtime non include LibreOffice: la verifica è stata eseguita sul PDF realmente prodotto dal motore Bitrix24.
- Il modello originale e il modello minimale 10 non sono stati sovrascritti.
- La selezione diretta del modello dal menu nativo è rinviata su richiesta dell'utente. Per questa prova va usata l'estensione, che passa le righe Canoni.
- I test automatici dell'app sono **12/12** superati. Il collaudo B2C sul modello cliente non equivale al collaudo di un modello B2B commerciale definitivo.

Script riproducibile di preparazione copia: `scripts/build_client_template.py`. Gli strumenti di preparazione del caso restano nella sezione Collaudo modello Novotecna dell'app di test; le creazioni con esito incerto vengono marcate come pendenti per evitare duplicazioni automatiche.
