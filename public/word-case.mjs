import {decodeState,encodeState} from './core.mjs';

export const LONG_WORD_DESCRIPTION='Servizio O&M (Operation & Maintenance cioè Esercizio e Manutenzione) del Sistema Virtuale. Il servizio è funzionale a gestire, mantenere e far funzionare al meglio il Sistema Virtuale acquistato dal Cliente garantendone l’efficienza, la sicurezza, la redditività e la longevità. Comprende la manutenzione ordinaria e la pulizia dell’impianto fotovoltaico effettuata una volta l’anno e la manutenzione straordinaria della quota di impianto fisico acquistata. Il servizio è obbligatorio per tutta la durata del contratto e verrà contabilizzato e fatturato a canone annuale anticipato per ogni kWp di fotovoltaico acquistato. Testo dimostrativo per verificare l’impaginazione.';

export async function prepareWordCase({call,templateFile,onProgress=()=>{}}){
 const opts=await call('app.option.get');const quoteId=Number(opts.canoniWordProbeQuoteId);
 if(!quoteId)throw Error('Preparare prima la copia di collaudo Word.');
 const copy=await call('crm.quote.get',{id:quoteId});
 if(quoteId===67||!copy.COMMENTS?.includes('NOVOTECNA_CANONI_WORD_TEST'))throw Error('La destinazione non è la copia di collaudo Word.');
 const source=await call('crm.quote.get',{id:67});
 if(!source.TITLE?.startsWith('TEST NOVOTECNA'))throw Error('Il preventivo sorgente non è quello dimostrativo.');
 const field='UF_CRM_NOVOTECNA_CANONI';const saved=decodeState(source[field],67);
 if(!saved.rows.length)throw Error('La prova richiede almeno un canone salvato nel preventivo 67.');
 const sourceProducts=await call('crm.quote.productrows.get',{id:67});
 onProgress('Preparazione del modello con tabella Word reale…');
 const name='TEST Novotecna B2C — Canoni Word';
 const templateFields={name,file:['novotecna-b2c-canoni-word.docx',templateFile],numeratorId:Number(opts.canoniNumeratorId),region:'it',entityTypeId:[7],active:'N',withStamps:'N'};
 let templateId=Number(opts.canoniWordLayoutTemplateId)||0;
 if(templateId){const t=await call('crm.documentgenerator.template.get',{id:templateId});if((t.template||t).name!==name)throw Error('Modello Word di prova non corrispondente.');await call('crm.documentgenerator.template.update',{id:templateId,fields:templateFields});}
 else{
  if(opts.canoniWordLayoutTemplateId==='pending')throw Error('Importazione Word da verificare prima di ripetere.');
  await call('app.option.set',{options:{canoniWordLayoutTemplateId:'pending'}});
  const result=await call('crm.documentgenerator.template.add',{fields:templateFields});templateId=Number(result.template?.id||result.id||result);
  if(!templateId)throw Error('ID del modello Word non leggibile.');
  await call('app.option.set',{options:{canoniWordLayoutTemplateId:String(templateId)}});
 }
 onProgress('Compilazione della copia con una descrizione estesa…');
 const cloneKeys=['DEAL_ID','CONTACT_ID','CONTACT_IDS','COMPANY_ID','MYCOMPANY_ID','BEGINDATE','CLOSEDATE','ACTUAL_DATE','CURRENCY_ID','CLIENT_TITLE','CLIENT_CONTACT','CLIENT_ADDR','CLIENT_EMAIL','CLIENT_PHONE','CLIENT_TPA_ID','CONTENT','TERMS','UF_CRM_QUOTE_1780561303442','UF_CRM_6A0C96C0B8AC3','UF_CRM_QUOTE_1780314824245','UF_CRM_6A0B2FAB1640A'];
 const fields=Object.fromEntries(cloneKeys.filter(k=>source[k]!==undefined&&source[k]!==null).map(k=>[k,source[k]]));
 const rows=saved.rows.map((r,i)=>i===0?{...r,description:LONG_WORD_DESCRIPTION}:{...r});
 fields[field]=encodeState(quoteId,rows,{type:saved.type,templateId});
 await call('crm.quote.update',{id:quoteId,fields});
 const productKeys=['PRODUCT_ID','PRODUCT_NAME','PRICE','QUANTITY','DISCOUNT_TYPE_ID','DISCOUNT_RATE','DISCOUNT_SUM','TAX_RATE','TAX_INCLUDED','MEASURE_CODE','MEASURE_NAME','CUSTOMIZED'];
 await call('crm.quote.productrows.set',{id:quoteId,rows:sourceProducts.map(r=>Object.fromEntries(productKeys.filter(k=>r[k]!==undefined).map(k=>[k,r[k]])))});
 const check=await call('crm.quote.get',{id:quoteId});
 if(check[field]!==fields[field]||String(check.OPPORTUNITY)!==String(source.OPPORTUNITY)||String(check.TAX_VALUE)!==String(source.TAX_VALUE))throw Error('La copia non coincide con i dati attesi: verificare prima di generare.');
 return {quoteId,templateId,rows:rows.length,total:check.OPPORTUNITY,tax:check.TAX_VALUE,descriptionLength:rows[0].description.length};
}
