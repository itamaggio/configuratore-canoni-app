# Canoni Word dinamici Implementation Plan

> **For agentic workers:** Use executing-plans inline. Track completed checks below.

**Goal:** Vere righe Word ripetute dal numero di canoni, otto colonne autonome, clic sul modello nel menu Documento.

**Architecture:** Dopo l'autorizzazione del 10 novembre si riusa la SPA tecnica 1074 e il collegamento multiplo già collaudato. Il JSON nel Preventivo rimane la fonte modificabile; ogni salvataggio crea una nuova revisione delle righe, la rilegge e collega JSON e righe insieme. Sei nuovi campi conservano il vecchio modello a cinque colonne e permettono otto colonne indipendenti.

**Tech Stack:** Moduli JavaScript, BX24.js, Python e lxml del runtime fornito, generatore nativo CRM Bitrix24.

**Spec:** Decisione utente del 10 novembre: archivio tecnico SPA autorizzato per mantenere il clic diretto sul modello; nessun operatore deve gestirlo manualmente. La domanda successiva sugli Elenchi non revoca questa autorizzazione.

## Global Constraints

- Portale test.kenovy.it; nessuna modifica VPS o cloud Novotecna.
- Canoni informativi, nessuna moltiplicazione per quantità e nessuna somma ai prodotti.
- Preservare tutti i prodotti, i totali e i documenti già emessi.
- Otto colonne: descrizione, tariffa, unità, periodicità, quantità di riferimento, durata, decorrenza, note.
- DOCX, PDF e logo esclusi da Git.
- Nessuna nuova autorizzazione REST; creazione campi dall'interfaccia se il metodo richiede un ambito aggiuntivo.

## Review Focus

- Quattro o più voci devono creare altrettante righe, senza spazi prenotati per voci inesistenti.
- Rimozione e riordinamento devono apparire nel documento successivo, senza cambiare quelli già emessi.
- Descrizioni e note con caratteri speciali devono restare testo, senza interpretare HTML operatore.
- Errori parziali e modifiche concorrenti non devono sostituire la revisione collegata prima della conferma.
- B2B: reperito il DOCX originale nell'archivio OneDrive Novotecna; preservare contenuto e package, senza usare il B2C come ripiego.

### Task 1 — Proiezione e modello a otto colonne

- [x] Scrivere e osservare fallire test per quattro voci, otto valori separati, revisione e conservazione della proiezione precedente.
- [x] Aggiungere public/word-eight.mjs; estendere word-projection.mjs con campi aggiuntivi senza cambiare il comportamento precedente.
- [x] Aggiungere al builder la variante nativa a otto colonne e verificarne il pacchetto Word.
- [x] Eseguire i test Node e Python: 48 e 5 superati.

### Task 2 — Preparazione e integrazione nel test

- [x] Preparare i sei campi e il modello mediante comandi amministrativi con controlli sugli ID e sui marcatori.
- [x] Abilitare il nuovo percorso nell'editor, senza limite di tre voci e senza usare la variante fissa sul 69.
- [x] Migrare una copia di collaudo prima di allineare i dati richiesti sul 67, conservandone il contenuto.

### Task 3 — Prova completa e consegna

- [x] Generare dal nome del modello e verificare il PDF con quattro voci e con una voce rimossa.
- [x] Verificare lista vuota ed eccesso di spazio nei test automatici; testo lungo anche nel PDF nativo del 69.
- [x] Conservare evidenze locali: entrambi i modelli cliente B2B e B2C verificati nel test, nessun deploy sul portale cliente.
- [x] Revisione finale e resoconto dei limiti effettivi in docs/collaudo-dinamico-2026-11-11.md. Risultato nativo e menu a due modelli verificati; nessun push eseguito in questo collaudo.
