# Canoni Novotecna

App di collaudo per il partner Bitrix24: salva canoni informativi nel Preventivo e prepara una tabella Word dinamica per il generatore documentale nativo. I prodotti e i totali rimangono gestiti da Bitrix24.

## Percorso attuale a otto colonne

La soluzione corrente usa la SPA tecnica 1074 come archivio di stampa: l'operatore lavora in **Canoni → Salva canoni → Documento → nome del modello**. Le righe Word corrispondono ai canoni salvati, senza tre righe prenotate. Descrizione, tariffa, unità, periodicità, quantità di riferimento, durata, decorrenza e note occupano colonne indipendenti. Il JSON `UF_CRM_NOVOTECNA_CANONI` resta la fonte modificabile; `UF_CRM_NOVOTECNA_CANONI_WORD` collega la revisione di stampa verificata.

I modelli del collaudo sono **17 — Novotecna — Preventivo B2C con canoni** e **18 — Novotecna — Preventivo B2B con canoni**. Il builder `scripts/build_word_template.py --native-eight` produce la variante B2C; per il B2B usare anche `--source public/templates/novotecna-b2b-canoni-test.docx`. Il builder di base B2B usa `--dynamic-product-units` per sostituire le tre unità statiche del vecchio modello con la misura della singola riga prodotto. I file cliente rimangono locali.

Le sezioni successive sulle varianti a immagine, cinque colonne e tre righe fisse descrivono **prove precedenti**. Non sono il percorso corrente. Il collaudo dell'11 novembre documenta PDF, schede allineate e configurazione del menu in [righe dinamiche B2B e B2C](docs/collaudo-dinamico-2026-11-11.md).

Nel repository, `index.html` alla radice conserva la preview standalone del collega. L'app integrata si trova in `public/` e viene servita da `server.py` tramite Docker. I file DOCX, il logo estratto dal modello cliente, i PDF e le schermate di collaudo restano locali. Sono inclusi il codice dei builder e le istruzioni di preparazione.

Il modello minimale `public/templates/canoni-prova.docx` si genera con `python scripts/build_template.py` usando `python-docx`. I comandi di preparazione del caso cliente richiedono i file locali `public/templates/novotecna-b2c-canoni-test.docx` e `public/templates/novotecna-b2c-canoni-native.docx`. Per rigenerarli, lo script `scripts/build_client_template.py` usa il DOCX originale nella cartella `Varie` accanto al progetto; eseguire poi `scripts/build_native_template.py`. Questi script richiedono Python con `lxml`, `Pillow` e `python-docx`. I modelli reali non sono necessari per avviare l'anteprima, eseguire i test Node o usare il modello minimale. I test Python dei documenti richiedono invece i DOCX locali indicati in `tests/word_template_test.py`, esclusi dal repository. Per riprodurre il marchio dell'interfaccia, fornire separatamente il file autorizzato `public/assets/novotecna-logo.jpg`; in sua assenza il browser mostra il testo alternativo Novotecna.

Il 9 novembre 2026 è stata eseguita una prova reale sul portale di test: prodotti nativi e due canoni compaiono nel PDF, anche dopo modifica della tariffa e riapertura dei dati. Il totale prodotti è rimasto invariato. Identificativi, prove eseguite e limiti sono nel [resoconto del collaudo](docs/collaudo-2026-11-09.md).

Il 10 novembre è stato verificato anche il **clic diretto sul modello con una vera tabella Word**, sul preventivo di collaudo 68. Il nuovo percorso supera la rappresentazione a immagine: conserva descrizioni estese e allinea stile e larghezza alla tabella prodotti. Vedere [collaudo Word e limiti della prova](docs/collaudo-word-2026-11-10.md).

## Avvio locale

Richiede Docker Desktop con container Linux. Dalla cartella del progetto:

```powershell
docker compose -p novotecna-canoni-test -f compose.local.yaml up -d --build
```

Aprire `http://127.0.0.1:8787/canoni/index.html?demo=1` per provare l'interfaccia senza CRM. La modalità demo salva soltanto nel browser e disabilita le operazioni Bitrix24.

Per arrestare il solo prototipo:

```powershell
docker compose -p novotecna-canoni-test -f compose.local.yaml stop
```

## Applicazione locale Bitrix24

Il prototipo è limitato a `test.kenovy.it` in `public/config.json`.

Nelle risorse per sviluppatori configurare:

- Nome e voce menu: `TEST Canoni Novotecna`.
- Percorso di installazione: `http://127.0.0.1:8787/canoni/install.html?install=1`.
- Percorso gestore: `http://127.0.0.1:8787/canoni/index.html`.
- Completamento dell'installazione da parte dell'app: abilitato.
- Permessi: `crm`, `placement`.

L'app usa BX24.js nell'iframe, con l'autorizzazione dell'operatore. Non contiene webhook, client secret o token nel codice. Il piccolo server HTTP accetta i POST di apertura, non salva il corpo della richiesta e non registra gli URL con parametri di autorizzazione.

In questa configurazione l'app si apre soltanto dal PC che esegue Docker. Il collegamento locale è per il collaudo, non è un servizio pubblicato per altri operatori.

## Prova documentale

Gli strumenti di preparazione e collaudo descritti sotto sono visibili aprendo l'app dal menu principale, oppure con `admin=1`. Nella scheda del Preventivo l'operatore vede l'editor, lo stato di salvataggio e il modello nativo da scegliere. La separazione visiva non modifica i permessi CRM.

1. Aprire l'app e scegliere **Prepara applicazione**. Crea, se assente, un campo testo multilinea identificato da `NOVOTECNA_CANONI_V1`, più scheda Canoni e voce nel menu Documento.
2. Scegliere **Crea preventivo dimostrativo**. Viene creato un nuovo preventivo TEST con due righe prodotto native e due canoni riconoscibili come dati dimostrativi, senza cliente o invio email.
3. Scegliere **Carica modello di prova**. Crea un numeratore TEST e carica `public/templates/canoni-prova.docx`; il modello è inizialmente disponibile all'utente che lo carica. Un successivo caricamento aggiorna il solo modello del prototipo registrato nelle opzioni dell'app.
4. Scegliere **Genera preventivo con canoni**. Salva e rilegge i dati, chiama `crm.documentgenerator.document.add` con `entityTypeId=7` e attende la conversione PDF.
5. Aprire DOCX/PDF e verificare contenuto delle due tabelle. Un messaggio di creazione o un ID documento da soli non validano l'impaginazione o l'espansione delle righe.

Il modello minimale non contiene le condizioni generali del cliente. È stata inoltre collaudata una copia del modello reale B2C con il preventivo completo 67: vedere [prova cliente](docs/collaudo-modello-cliente-2026-11-09.md).

## Scheda Canoni e comando Documento

La scheda **Canoni** apre il modulo per inserire, modificare e salvare le voci. La voce **Documento → Estensioni → Preventivo con canoni** riconosce invece il contesto di generazione: usa i dati già salvati e il modello memorizzato nel preventivo, senza mostrare l'editor o richiedere un secondo clic Genera. Se manca un modello selezionato, presenta soltanto la scelta del modello.

Bitrix24 apre comunque il pannello dell'estensione, che mostra avanzamento e collegamenti DOCX/PDF. La riapertura mediante refresh dello stesso contesto riutilizza l'ID documento già creato; una richiesta con esito incerto non viene ripetuta automaticamente.

### Clic diretto con tabella Word

Nell'app di test è attivo il percorso **Canoni → Salva canoni → Documento → TEST Novotecna B2C — Word nativo** (modello 14). Il documento 80, TEST-CAN-14, è stato generato dalla voce del modello nel menu nativo. Due canoni, una descrizione di 673 caratteri, note e totale prodotti sono nella pagina 8, su 16 pagine complessive.

Il JSON del preventivo resta la fonte dei dati modificabili. Al salvataggio l'app prepara cinque campi testo in record CRM di servizio, collegati tramite `UF_CRM_NOVOTECNA_CANONI_WORD`. Il modello Word ripete questi record in una tabella reale. Il processo intelligente è un supporto tecnico: l'operatore continua a usare la scheda Canoni e il menu Documento. Non si creano righe prodotto né calcoli economici per i canoni.

Ogni revisione crea nuove righe di stampa, ne verifica il testo e collega JSON e righe nella stessa chiamata di aggiornamento del preventivo. Un errore durante la preparazione non modifica la tabella già collegata. Non viene eseguita una pulizia automatica delle vecchie righe. Il controllo delle modifiche concorrenti non è un blocco transazionale del CRM.

La descrizione ammette fino a 2000 caratteri. Una verifica preventiva conservativa limita l'altezza della tabella nel modello collaudato; non riduce il carattere né tronca il testo. L'impaginazione finale dipende anche dai prodotti e dalle altre sezioni dell'offerta. La prova documentale reale riguarda il modello **B2C**: per il B2B va preparato il corrispondente DOCX e configurata l'opzione `canoniWordNativeTemplateB2BId`. Il modulo conserva entrambi i tipi di dati, ma non seleziona il modello B2C come ripiego per il B2B.

I DOCX restano locali. Dopo aver preparato il modello cliente di base, il builder per il portale di test è:

```powershell
python scripts/build_word_template.py
python scripts/build_word_template.py --native --target public/templates/novotecna-b2c-canoni-word-native.docx
```

La variante nativa richiama i campi del processo di test con ID 18: la mappatura deve essere adattata se si prepara un altro portale. **Aggiorna modello Word** modifica soltanto il modello 14. **Attiva percorso Word** abilita il nuovo salvataggio nell'app; i preventivi precedenti preparano la tabella al successivo Salva canoni. La sessione di compilazione già aperta sul 67 non è stata ricaricata o sovrascritta durante la prova.

### Prova senza SPA con otto colonne

Sul preventivo **69** è disponibile **Documento → TEST Novotecna B2C — Word senza SPA (3 righe)**, modello **15**. Questa variante salva e rilegge il JSON e 24 campi stringa del Preventivo, senza usare processi intelligenti o righe prodotto per i canoni. Descrizione, tariffa, unità, periodicità, quantità di riferimento, durata, decorrenza e note occupano otto colonne distinte.

Il modello è predisposto per **tre canoni**: le righe non utilizzate restano vuote. L'editor blocca la quarta voce e pulisce i campi di stampa delle voci rimosse. Il limite è del modello di prova; questa soluzione non rende dinamico il numero di righe. Il controllo preventivo di altezza è conservativo e il PDF va verificato con i dati dell'offerta effettiva.

Per preparare il DOCX locale:

```powershell
python scripts/build_word_template.py --direct-slots 3 --target public/templates/novotecna-b2c-canoni-word-direct.docx
```

**Prepara prova Word senza SPA** crea i campi e una copia autonoma del caso 68, poi prepara la stampa. **Aggiorna modello senza SPA** aggiorna soltanto il DOCX del modello 15. L'app riconosce la variante dal preventivo registrato nell'opzione `canoniDirectQuoteId`; la prova senza SPA è isolata sul 69 e non cambia le precedenti prove sui preventivi 67 e 68. Il modello di test è visibile nel menu Documento: sulle altre schede i suoi campi di stampa non sono preparati, quindi va usato esclusivamente sul caso 69.

La generazione dal clic sul modello è stata verificata con due e tre canoni. Nel documento finale **83, TEST-CAN-17**, prodotti, tabella e riepilogo completo sono a pagina 8, con totale invariato di 12.078,00 €. La colonna Unità mantiene intera anche la parola «Impianto». La prova reale riguarda B2C sul portale di test; non qualifica un'installazione nel cloud cliente o il modello B2B.

### Catalogo e campi elenco

Il campo **Nome / descrizione del canone** cerca i prodotti attivi di Bitrix24. La scelta copia esclusivamente il nome: tariffa, unità, quantità, periodicità, durata, decorrenza e note restano quelle del canone. È consentito anche scrivere liberamente. La ricerca è ritardata di 350 ms; le risposte superate vengono scartate. Il risultato mostra al massimo dieci nomi per volta e invita a restringere la ricerca. Con descrizioni oltre 200 caratteri rimane disponibile la compilazione libera, senza interrogare il catalogo.

Sono ripristinati i quattro elenchi della preview originale: unità, periodicità, durata e decorrenza. Sono aggiunti kWp e la durata contrattuale del servizio O&M. I valori già salvati fuori elenco vengono conservati quando si modifica una voce, evitando sostituzioni automatiche.

L'adapter richiede soltanto ID e NAME tramite `crm.product.list`, compatibile con il permesso CRM già autorizzato. Il metodo è deprecato: prima della produzione occorre qualificare `catalog.product.list` e il relativo permesso. Non vengono importati prezzi o descrizioni estese dal catalogo.

### Verifica delle righe dinamiche senza SPA

La verifica isolata sul preventivo **70**, modello **16**, documento **84**, non ha fornito una soluzione funzionante che unisca righe Word dinamiche, assenza di SPA e clic diretto sul modello. I campi testo multipli producono più valori nella stessa cella, anche usando `mseparator`; non ripetono le righe Word. L'aggiornamento CRM accetta i valori ma, nella prova, non applica il provider di array passato in `fields`.

Dopo l'aggiunta autorizzata del solo ambito `documentgenerator`, le chiamate generali `documentgenerator.document.get/update` rispondono **Access denied** sul documento 84, mentre la lettura CRM dello stesso documento riesce. La documentazione distingue i documenti alimentati dall'app da quelli CRM: il riscontro non dimostra un'impossibilità assoluta di qualunque integrazione, ma esclude questa strada nella configurazione provata.

Il modello 16 è stato disattivato, il documento conservato come evidenza e il permesso aggiuntivo rimosso: l'app torna ai soli ambiti CRM e incorporamento. I comandi sperimentali sono stati rimossi dall'interfaccia. Il codice della prova e le schermate rimangono in `artifacts/`, esclusi da Git. La variante disponibile sul 69 resta quella con tre righe predisposte; tre è un limite del prototipo, non del CRM.

### Percorso precedente a immagine

Sul preventivo **67** è stata collaudata la voce **Documento → TEST Novotecna B2C — Canoni nativi**, modello **12**, senza estensione. Il documento finale del 10 novembre è **74, TEST-CAN-8**, con due canoni completi e 16 pagine. L'app salva una rappresentazione PNG della tabella in un campo File del preventivo; il modello richiama il campo tramite il testo alternativo di un'immagine segnaposto. Prodotti e totali continuano a usare le mappature CRM originali.

L'operatore modifica le voci nell'app e preme **Salva canoni**, che aggiorna JSON e immagine nella stessa chiamata CRM e ne controlla la rilettura; poi seleziona direttamente il modello nel menu Documento. Il campo JSON resta la fonte dei dati. Nel documento la tabella è un'immagine. Il riquadro finale è **2200×760 pixel**, stampato a circa **18,2×6,29 cm**, con carattere a 34 px. La sezione dell'offerta include note, riepilogo e firma prima delle condizioni generali: questo conserva intestazione, tabella e totali correttamente impaginati. Se il testo supera il riquadro, il salvataggio viene bloccato prima di scrivere nel CRM. La stampa resta a pagina singola.

**Verifica completata il 10 novembre:** documento 74 generato dal menu nativo, scaricato e reso in immagini. Entrambi i canoni e tutti i totali sono a pagina 8; le pagine 1–7 e 10–16 sono identiche al precedente documento 69. La risincronizzazione di immagine e modello mediante il comando amministrativo ha risolto le proporzioni rimaste vecchie dopo il primo caricamento manuale. Il [resoconto con scenari e limiti](docs/collaudo-completo-2026-11-10.md) distingue il collaudo B2C, le prove locali e le verifiche ancora necessarie prima della produzione.

La preparazione amministrativa **Prepara modello per clic nativo** è limitata al caso 67. Non modifica i modelli 10 e 11 e non cambia permessi o impostazioni globali. Dettagli e limiti nel [collaudo del clic nativo](docs/collaudo-clic-nativo-2026-11-09.md).

## Salvataggio e limiti

I canoni sono salvati come JSON nel campo del singolo Preventivo. Non vengono create righe prodotto per i canoni. L'app verifica schema, ID preventivo e rilettura del valore dopo il salvataggio; rileva anche modifiche rispetto alla versione caricata. Non è implementato un blocco transazionale fra salvataggi simultanei.

L'operatore deve completare **Aggiungi/Aggiorna canone** e poi premere **Salva canoni**. Non è presente autosalvataggio delle bozze. La compilazione aperta è protetta dal cambio voce e dall'eliminazione; l'ultima rimozione può essere annullata prima del salvataggio. I documenti già generati restano copie della precedente emissione.

Il prototipo accetta fino a 30 righe e 45 KB di dati. Sono limiti applicativi, non una certificazione dei limiti del portale. Le tariffe sono normalizzate e formattate, senza moltiplicazioni per quantità o somme.

Per compatibilità iniziale con il portale di prova l'adapter usa `crm.quote.get/update/add` e `crm.quote.productrows.set` (quest'ultimo solo per creare i prodotti del nuovo preventivo dimostrativo). Il generatore è `crm.documentgenerator.*`. La successiva versione deve qualificare l'uso di `crm.item.*` supportato dall'installazione effettiva.

La selezione B2B/B2C viene salvata con il preventivo; in questo prototipo il modello è selezionato esplicitamente dall'operatore. Non esiste ancora un'associazione automatica ai modelli reali del cliente.

## Test

Con Node 22 o successivo:

```powershell
node --test
```

Non occorre installare dipendenze npm. I test verificano tariffe italiane, dati persistenti, isolamento del portale e payload che non sostituisce prodotti/totali. La verifica nativa del documento è distinta dai test locali.

## Pubblicazione futura sulla VPS

È stata letta la documentazione VPS fornita dall'utente. Descrive Docker Standalone, Portainer e NPMplus collegati tramite `proxy-network`. Non è stato effettuato accesso alla VPS e questo progetto non vi è stato distribuito.

Per pubblicare su `https://apps.kenovy.it/canoni` andranno preparati l'immagine/stack definitivi e la location NPMplus, usando la rete esterna `proxy-network` e il DNS del servizio anziché un IP fisso. Le rotte gestiscono sia il prefisso `/canoni/` sia il percorso riscritto alla radice. Il server HTTP corrente serve il collaudo locale; la configurazione di servizio per la VPS è un passaggio separato.

I dati applicativi risiedono nel CRM: il container locale non richiede un volume database. L'app di produzione avrà un'installazione separata e una configurazione dei portali autorizzati coerente con il cliente.
