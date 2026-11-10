# Canoni Novotecna

Prototipo per il partner Bitrix24: inserisce canoni informativi nel Preventivo e chiama il generatore documentale nativo con una seconda tabella. I prodotti e i totali rimangono gestiti da Bitrix24.

Nel repository, `index.html` alla radice conserva la preview standalone del collega. L'app integrata si trova in `public/` e viene servita da `server.py` tramite Docker. I file DOCX, il logo estratto dal modello cliente, i PDF e le schermate di collaudo restano locali. Sono inclusi il codice dei builder e le istruzioni di preparazione.

Il modello minimale `public/templates/canoni-prova.docx` si genera con `python scripts/build_template.py` usando `python-docx`. I comandi di preparazione del caso cliente richiedono i file locali `public/templates/novotecna-b2c-canoni-test.docx` e `public/templates/novotecna-b2c-canoni-native.docx`. Per rigenerarli, lo script `scripts/build_client_template.py` usa il DOCX originale nella cartella `Varie` accanto al progetto; eseguire poi `scripts/build_native_template.py`. Questi script richiedono Python con `lxml`, `Pillow` e `python-docx`. I modelli reali non sono necessari per avviare l'anteprima, eseguire i test o usare il modello minimale. Per riprodurre il marchio dell'interfaccia, fornire separatamente il file autorizzato `public/assets/novotecna-logo.jpg`; in sua assenza il browser mostra il testo alternativo Novotecna.

Il 9 novembre 2026 è stata eseguita una prova reale sul portale di test: prodotti nativi e due canoni compaiono nel PDF, anche dopo modifica della tariffa e riapertura dei dati. Il totale prodotti è rimasto invariato. Identificativi, prove eseguite e limiti sono nel [resoconto del collaudo](docs/collaudo-2026-11-09.md).

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

Gli strumenti di preparazione e collaudo descritti sotto sono visibili aggiungendo `admin=1` all'URL dell'app. La vista operativa mostra l'editor dei canoni, lo stato di salvataggio e le istruzioni per generare il documento. La separazione visiva non modifica i permessi CRM.

1. Aprire l'app e scegliere **Prepara applicazione**. Crea, se assente, un campo testo multilinea identificato da `NOVOTECNA_CANONI_V1`, più scheda Canoni e voce nel menu Documento.
2. Scegliere **Crea preventivo dimostrativo**. Viene creato un nuovo preventivo TEST con due righe prodotto native e due canoni riconoscibili come dati dimostrativi, senza cliente o invio email.
3. Scegliere **Carica modello di prova**. Crea un numeratore TEST e carica `public/templates/canoni-prova.docx`; il modello è inizialmente disponibile all'utente che lo carica. Un successivo caricamento aggiorna il solo modello del prototipo registrato nelle opzioni dell'app.
4. Scegliere **Genera preventivo con canoni**. Salva e rilegge i dati, chiama `crm.documentgenerator.document.add` con `entityTypeId=7` e attende la conversione PDF.
5. Aprire DOCX/PDF e verificare contenuto delle due tabelle. Un messaggio di creazione o un ID documento da soli non validano l'impaginazione o l'espansione delle righe.

Il modello minimale non contiene le condizioni generali del cliente. È stata inoltre collaudata una copia del modello reale B2C con il preventivo completo 67: vedere [prova cliente](docs/collaudo-modello-cliente-2026-11-09.md).

## Scheda Canoni e comando Documento

La scheda **Canoni** apre il modulo per inserire, modificare e salvare le voci. La voce **Documento → Estensioni → Preventivo con canoni** riconosce invece il contesto di generazione: usa i dati già salvati e il modello memorizzato nel preventivo, senza mostrare l'editor o richiedere un secondo clic Genera. Se manca un modello selezionato, presenta soltanto la scelta del modello.

Bitrix24 apre comunque il pannello dell'estensione, che mostra avanzamento e collegamenti DOCX/PDF. La riapertura mediante refresh dello stesso contesto riutilizza l'ID documento già creato; una richiesta con esito incerto non viene ripetuta automaticamente.

### Clic diretto sul modello nativo

Sul preventivo **67** è stata collaudata anche la voce **Documento → TEST Novotecna B2C — Canoni nativi**, modello **12**, senza estensione. Il documento finale **69** si apre nel visualizzatore nativo Bitrix24. L'app salva una rappresentazione PNG della tabella in un campo File del preventivo; il modello richiama il campo tramite il testo alternativo di un'immagine segnaposto. Prodotti e totali continuano a usare le mappature CRM originali.

L'operatore modifica le voci nell'app e preme **Salva canoni**, che aggiorna JSON e immagine nella stessa chiamata CRM e ne controlla la rilettura; poi seleziona direttamente il modello nel menu Documento. Il campo JSON resta la fonte dei dati. Non è una tabella Word modificabile: nel documento è un'immagine. Il riquadro iniziale di 2200×520 pixel è stato ampliato a **2200×900 pixel**, mantenendo il carattere a 34 px e adeguando il segnaposto DOCX a circa 18,2×7,45 cm. Se il testo supera il riquadro, il salvataggio viene bloccato prima di scrivere nel CRM. Non è qualificata per liste estese o distribuite su più pagine.

**Stato dell'ultima modifica:** entrambi i canoni completi sono stati salvati e riletti sul preventivo 67; il test di regressione riproduce il precedente errore e passa con il riquadro ampliato. Il caricamento del DOCX aggiornato nel modello 12 e la generazione/verifica del nuovo PDF nativo sono **ancora da completare**. Il collaudo del documento 69 citato sopra riguarda il precedente modello con un solo canone e non convalida questa modifica.

La preparazione amministrativa **Prepara modello per clic nativo** è limitata al caso 67. Non modifica i modelli 10 e 11 e non cambia permessi o impostazioni globali. Dettagli e limiti nel [collaudo del clic nativo](docs/collaudo-clic-nativo-2026-11-09.md).

## Salvataggio e limiti

I canoni sono salvati come JSON nel campo del singolo Preventivo. Non vengono create righe prodotto per i canoni. L'app verifica schema, ID preventivo e rilettura del valore dopo il salvataggio; rileva anche modifiche rispetto alla versione caricata. Non è implementato un blocco transazionale fra salvataggi simultanei.

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
