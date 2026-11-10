# Verifica interfaccia canoni — 9 novembre 2026

Intervento richiesto prima di correggere il limite della tabella immagine. Aggiornati `public/index.html`, `public/style.css` e la presentazione degli stati in `public/app.mjs`. Logo originale del cliente estratto dal DOCX senza modificarlo; provenienza in `public/assets/SOURCE.md`.

La nuova vista distingue modulo di inserimento, schede dei canoni e istruzioni documento. Il salvataggio è nella testata; gli strumenti tecnici sono accessibili con `admin=1`. Nessun totale dei canoni è stato introdotto.

## Riscontri

- 15 test locali superati. Lint dell'interfaccia: nessun errore o avviso.
- Verifica browser nel Preventivo 67 e in anteprima locale, con entrambe le voci fornite dall'utente. Le due voci sono in bozza, non salvate nel CRM durante questo intervento.
- Verifica a 390 px e 820 px senza scorrimento orizzontale; override del viewport ripristinato.
- Inserimento incompleto: stato «Canone da completare», Salva disabilitato e Annulla disponibile. Annulla conserva le voci già inserite.
- Revisione indipendente di sorgenti e schermate: risolti i due rilievi su stato del modulo e contrasto. Testi secondari oltre 4,5:1 sul bianco; focus 5,69:1.
- Bozza originale dell'utente lasciata aperta e non ricaricata, con entrambe le voci intatte. Nuova UI aperta separatamente nel portale di test.

Schermate in `artifacts/ui/`: `canoni-desktop.png`, `canoni-mobile.png`, `canoni-tablet.png` e `canoni-anteprima-completa.png`.

## Limite ancora presente

Il generatore PNG e il riquadro di 2200×520 pixel non sono stati modificati. Il messaggio di capacità resta riproducibile con le due voci complete. Nessuna nuova generazione documentale, modifica ai prodotti, ai totali o ai permessi è stata eseguita in questa fase. Nessuna pubblicazione sulla VPS.
