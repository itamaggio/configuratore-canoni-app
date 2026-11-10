# Stato del modulo pubblicato

Il ramo `feat/novotecna-bitrix24-canoni` raccoglie l'app integrata e conserva la preview standalone `index.html` già presente nel repository. La configurazione dell'app consente solo `test.kenovy.it`; il compose pubblica il servizio su loopback del PC. Nessun deploy VPS è compreso.

## Verifiche eseguite

La suite locale completa contiene 16 test e passa, incluso il caso di regressione con i due canoni completi del preventivo 67. L'interfaccia è stata controllata nel CRM e a larghezze di 390 e 820 px. Le prove documentali precedenti sono descritte separatamente nei resoconti, con i rispettivi ID e limiti.

L'ultimo intervento amplia il riquadro PNG da 2200×520 a 2200×900 pixel e adegua il segnaposto della copia DOCX locale. Entrambe le voci sono state salvate e rilette dal CRM. Il modello aggiornato non è ancora caricato nel portale e il PDF con entrambe le voci non è stato generato né verificato: il controllo browser si è fermato durante il caricamento del file. Il modello 12 nel portale conserva quindi ancora le precedenti dimensioni del segnaposto.

## Contenuti locali

Il repository è pubblico. Tutti i DOCX, il logo estratto dal modello cliente, i documenti PDF, gli screenshot e gli altri artefatti del collaudo sono esclusi dal versionamento. Restano disponibili nella cartella locale di lavoro. Sono inclusi il codice dei builder, che permette di rigenerare il modello minimale dimostrativo, e le istruzioni per fornire separatamente le risorse cliente. Non sono presenti webhook, password o token applicativi.

## Passaggio ancora richiesto

Caricare la copia locale `public/templates/novotecna-b2c-canoni-native.docx` nel modello 12, quindi dal preventivo 67 scegliere **Documento → TEST Novotecna B2C — Canoni nativi** e creare un nuovo documento. Controllare nel PDF le due tariffe informative, tutte le condizioni, la posizione sotto i prodotti e i totali nativi.
