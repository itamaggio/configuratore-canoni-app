# Configuratore canoni Novotecna

Prototipo web autonomo per selezionare e visualizzare i canoni in un preventivo Bitrix24. Non richiede installazione di dipendenze: aprire `index.html` in un browser.

## Funzioni

- Otto parametri: descrizione, importo, unità di riferimento, periodicità, quantità di riferimento, durata, decorrenza e note.
- Inserimento di più canoni, anteprima e rimozione delle singole voci.
- Copia di un riepilogo testuale ed esportazione dei dati in JSON.
- Nessun calcolo: **gli importi dei canoni non vengono sommati, moltiplicati o inseriti nel totale del preventivo**.

## Perimetro

È un prototipo standalone per validare l'interfaccia e i requisiti. Non è ancora integrato con Bitrix24, con il catalogo prodotti o con la generazione PDF. I dati rimangono nella memoria della pagina fino alla chiusura/ricarica; usare l'esportazione JSON per conservarli.

## Pubblicazione

Il progetto è versionato su GitHub. L'eventuale pubblicazione come pagina web e la connessione a Bitrix24 sono passaggi separati.
