import {decodeState,documentPayload} from './core.mjs';

// Reads the canonical CRM data. The document command never saves editor state.
export async function createSavedDocument({quoteId,fieldName,call,templateId,onBeforeCreate,onCreated}){
 const before=await call('crm.quote.get',{id:quoteId});
 if(!before[fieldName])throw new Error('Non ci sono canoni salvati. Compilali e salvali dalla scheda Canoni.');
 const saved=decodeState(before[fieldName],quoteId);
 if(!saved.rows.length)throw new Error('Non ci sono canoni salvati. Aggiungine almeno uno dalla scheda Canoni.');
 const selected=Number(templateId||saved.templateId);
 if(!Number.isSafeInteger(selected)||selected<1)throw new Error('Scegli il modello per generare il documento.');
 const payload=documentPayload(quoteId,selected,saved.rows);
 onBeforeCreate?.();
 const result=await call('crm.documentgenerator.document.add',payload);
 const doc=result.document||result;
 if(!Number.isSafeInteger(Number(doc.id))||Number(doc.id)<1)throw new Error('La risposta non contiene un ID documento. Controlla i documenti del preventivo prima di riprovare.');
 onCreated?.(doc);
 const after=await call('crm.quote.get',{id:quoteId});
 if(['OPPORTUNITY','TAX_VALUE','CURRENCY_ID'].some(k=>String(before[k]??'')!==String(after[k]??'')))throw new Error(`Documento #${doc.id} creato, ma il riepilogo CRM è cambiato. Verifica il preventivo prima di utilizzarlo.`);
 return doc;
}
