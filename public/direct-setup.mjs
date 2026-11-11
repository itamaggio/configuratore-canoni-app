import {decodeState,encodeState,ROW_FIELDS} from './core.mjs';
import {DIRECT_SLOTS,DIRECT_COLUMNS,directName,saveWithDirectFields} from './direct-fields.mjs';

export async function updateDirectTemplate({call,templateFile}){
 const opts=await call('app.option.get'),id=Number(opts.canoniDirectTemplateId);
 if(!id||!templateFile)throw Error('Modello senza SPA da preparare.');
 const result=await call('crm.documentgenerator.template.get',{id});const template=result.template||result;
 if(template.name!=='TEST Novotecna B2C — Word senza SPA (3 righe)')throw Error('Modello non corrispondente alla prova.');
 await call('crm.documentgenerator.template.update',{id,fields:{file:['novotecna-b2c-canoni-word-direct.docx',templateFile]}});
 return {templateId:id,name:template.name};
}

export async function prepareDirectCase({call,templateFile,onProgress=()=>{}}){
 const opts=await call('app.option.get'),dataField='UF_CRM_NOVOTECNA_CANONI';
 const source=await call('crm.quote.get',{id:68});
 if(!source.COMMENTS?.includes('NOVOTECNA_CANONI_WORD_TEST'))throw Error('La sorgente non è la copia di collaudo Word.');
 const saved=decodeState(source[dataField],68);if(saved.type!=='B2C')throw Error('La sorgente di questa prova deve essere B2C.');if(saved.rows.length>DIRECT_SLOTS)throw Error('La prova ammette tre canoni.');
 const labels=['Descrizione','Tariffa','Unità','Periodicità','Quantità di riferimento','Durata','Decorrenza','Note e condizioni'];
 for(let slot=1;slot<=DIRECT_SLOTS;slot++)for(let i=0;i<DIRECT_COLUMNS.length;i++){
  const column=DIRECT_COLUMNS[i],name=directName(slot,column),xml=`NOVO_DIRECT_C${slot}_${column}_V1`;
  onProgress(`Preparazione campi del Preventivo: canone ${slot} di ${DIRECT_SLOTS}…`);
  const found=Object.values(await call('crm.quote.userfield.list',{filter:{XML_ID:xml}}));let field=found.find(f=>f.XML_ID===xml);
  if(!field){const id=await call('crm.quote.userfield.add',{fields:{FIELD_NAME:name,XML_ID:xml,USER_TYPE_ID:'string',MULTIPLE:'N',MANDATORY:'N',SHOW_IN_LIST:'N',EDIT_IN_LIST:'N',SHOW_FILTER:'N',EDIT_FORM_LABEL:{it:`Stampa canone ${slot} — ${labels[i]}`,en:`Print fee ${slot} — ${ROW_FIELDS[i]}`},SETTINGS:{ROWS:i===0||i===7?4:2,SIZE:40},SORT:9950+slot*8+i}});field=await call('crm.quote.userfield.get',{id});}
  if(field.FIELD_NAME!==name||field.USER_TYPE_ID!=='string'||field.MULTIPLE==='Y')throw Error('Un campo di stampa esistente non corrisponde alla configurazione.');
 }
 const name='TEST Novotecna B2C — Word senza SPA (3 righe)';let templateId=Number(opts.canoniDirectTemplateId)||0;
 const fields={name,file:['novotecna-b2c-canoni-word-direct.docx',templateFile],numeratorId:Number(opts.canoniNumeratorId),region:'it',entityTypeId:[7],active:'Y',withStamps:'N'};
 if(templateId){const t=await call('crm.documentgenerator.template.get',{id:templateId});if((t.template||t).name!==name)throw Error('Il modello non appartiene alla prova senza SPA.');await call('crm.documentgenerator.template.update',{id:templateId,fields});}
 else{if(opts.canoniDirectTemplateId==='pending')throw Error('Creazione del modello da verificare.');await call('app.option.set',{options:{canoniDirectTemplateId:'pending'}});const r=await call('crm.documentgenerator.template.add',{fields});templateId=Number(r.template?.id||r.id||r);if(!templateId)throw Error('ID modello non leggibile.');await call('app.option.set',{options:{canoniDirectTemplateId:String(templateId)}});}
 let quoteId=Number(opts.canoniDirectQuoteId)||0;
 if(!quoteId){if(opts.canoniDirectQuoteId==='pending')throw Error('Creazione del preventivo da verificare.');await call('app.option.set',{options:{canoniDirectQuoteId:'pending'}});quoteId=Number(await call('crm.quote.add',{fields:{TITLE:'TEST NOVOTECNA — Canoni Word senza SPA',STATUS_ID:'DRAFT',COMMENTS:'NOVOTECNA_DIRECT_WORD_TEST — copia autonoma del preventivo 68',CURRENCY_ID:'EUR',OPENED:'N'}}));if(!quoteId)throw Error('ID preventivo non leggibile.');await call('app.option.set',{options:{canoniDirectQuoteId:String(quoteId)}});}
 const destination=await call('crm.quote.get',{id:quoteId});if(quoteId===67||quoteId===68||!destination.COMMENTS?.includes('NOVOTECNA_DIRECT_WORD_TEST'))throw Error('Destinazione della prova non corretta.');
 if(!destination[dataField]){
  const keys=['DEAL_ID','CONTACT_ID','CONTACT_IDS','COMPANY_ID','MYCOMPANY_ID','BEGINDATE','CLOSEDATE','ACTUAL_DATE','CURRENCY_ID','CLIENT_TITLE','CLIENT_CONTACT','CLIENT_ADDR','CLIENT_EMAIL','CLIENT_PHONE','CLIENT_TPA_ID','CONTENT','TERMS','UF_CRM_QUOTE_1780561303442','UF_CRM_6A0C96C0B8AC3','UF_CRM_QUOTE_1780314824245','UF_CRM_6A0B2FAB1640A'];
  await call('crm.quote.update',{id:quoteId,fields:Object.fromEntries(keys.filter(k=>source[k]!=null).map(k=>[k,source[k]]))});
  const products=await call('crm.quote.productrows.get',{id:68});const productKeys=['PRODUCT_ID','PRODUCT_NAME','PRICE','QUANTITY','DISCOUNT_TYPE_ID','DISCOUNT_RATE','DISCOUNT_SUM','TAX_RATE','TAX_INCLUDED','MEASURE_CODE','MEASURE_NAME','CUSTOMIZED'];
  await call('crm.quote.productrows.set',{id:quoteId,rows:products.map(row=>Object.fromEntries(productKeys.filter(k=>row[k]!==undefined).map(k=>[k,row[k]])))});
 }
 const baseline=destination[dataField]||'';const content=baseline?decodeState(baseline,quoteId):saved;
 const json=encodeState(quoteId,content.rows,{type:content.type,templateId});
 onProgress('Salvataggio nei soli campi del Preventivo…');
 const result=await saveWithDirectFields({quoteId,json,baseline,dataField,call});
 if(String(result.quote.OPPORTUNITY)!==String(source.OPPORTUNITY))throw Error('Il totale della copia richiede una verifica.');
 return {quoteId,templateId,rows:content.rows.length,slots:DIRECT_SLOTS,columns:8,total:result.quote.OPPORTUNITY,storage:'Campi del Preventivo; nessun processo intelligente'};
}
