import {decodeState,encodeState} from './core.mjs';
import {resolveWordFields,wordBindingIds,WORD_FIELD} from './word-projection.mjs';
import {WORD_EIGHT_COLUMNS,resolveWordEightFields,saveWithWordEightProjection,assertWordEightPageFits} from './word-eight.mjs';

const DATA='UF_CRM_NOVOTECNA_CANONI',MARKER='NOVOTECNA_WORD_EIGHT_TEST_V1';
export function isWordEightFixtureComment(value){return String(value||'').replace(/<\/?p(?:\s[^>]*)?>|\[\/?p\]/gi,'').trim()===MARKER;}
export async function inspectWordEightState({call}){
 const {opts}=await context(call),result=[];
 for(const id of new Set([67,69,Number(opts.canoniWordEightTestQuoteId),Number(opts.canoniWordEightB2BQuoteId)])){
  if(!id)continue;const q=await call('crm.quote.get',{id}),saved=decodeState(q[DATA],id),r=await call('crm.documentgenerator.document.list',{filter:{entityTypeId:7,entityId:id},select:['id','title','number','templateId','entityId','entityTypeId'],order:{id:'DESC'}});
  const docs=Object.values(r.documents||r).filter(d=>Number(d.entityId)===id&&Number(d.entityTypeId)===7).map(d=>({id:d.id,number:d.number,title:d.title,templateId:d.templateId}));
  result.push({id,title:q.TITLE,layout:saved.wordLayout,profile:saved.type,rows:saved.rows.length,printRows:wordBindingIds(q[WORD_FIELD]).length,total:q.OPPORTUNITY,documents:docs});
 }
 return {enabled:opts.canoniWordEightEnabled==='Y',quotes:result};
}
const labels={NOVO_NAME:'Descrizione canone',NOVO_UNIT:'Unità',NOVO_PERIOD:'Periodicità',NOVO_DURATION:'Durata',NOVO_START:'Decorrenza',NOVO_NOTES:'Note e condizioni'};
export async function inspectWordEightB2BAddresses({call}){const {opts}=await context(call);const id=Number(opts.canoniWordEightB2BRequisiteId);if(!id)throw Error('Dettagli B2B non pronti.');return {types:await call('crm.enum.addresstype'),addresses:await call('crm.address.list',{filter:{ENTITY_TYPE_ID:8,ENTITY_ID:id}}),requisite:await call('crm.requisite.get',{id})};}
export async function completeWordEightB2BAddress({call}){
 const {opts}=await context(call),id=Number(opts.canoniWordEightB2BRequisiteId),companyId=Number(opts.canoniWordEightB2BCompanyId);
 const requisite=await call('crm.requisite.get',{id});
 if(!id||!companyId||Number(requisite.ENTITY_TYPE_ID)!==4||Number(requisite.ENTITY_ID)!==companyId||requisite.NAME!=='TEST '+MARKER)throw Error('Anagrafica dimostrativa non corrispondente.');
 const addresses=Object.values(await call('crm.address.list',{filter:{ENTITY_TYPE_ID:8,ENTITY_ID:id}}));
 if(addresses.some(a=>Number(a.TYPE_ID)===11))return {requisiteId:id,deliveryAddress:'già presente'};
 const source=addresses.find(a=>Number(a.TYPE_ID)===1);if(!source?.ADDRESS_1)throw Error('Indirizzo dimostrativo mancante.');
 const keys=['ADDRESS_1','ADDRESS_2','CITY','POSTAL_CODE','REGION','PROVINCE','COUNTRY','COUNTRY_CODE'];
 await call('crm.address.add',{fields:{ENTITY_TYPE_ID:8,ENTITY_ID:id,TYPE_ID:11,...Object.fromEntries(keys.filter(k=>source[k]!=null).map(k=>[k,source[k]]))}});
 return {requisiteId:id,deliveryAddress:source.ADDRESS_1};
}
async function context(call){
 const opts=await call('app.option.get'),id=Number(opts.canoniWordProbeTypeId);
 if(!id)throw Error('Archivio tecnico Word da preparare.');
 const type=(await call('crm.type.get',{id})).type;
 if(type?.code!=='NOVOTECNA_CANONI_WORD_TEST'||Number(type.entityTypeId)!==1074)throw Error('Archivio tecnico di collaudo non corrispondente.');
 return {opts,type};
}
export async function prepareWordEightSetup({call,templateFile,onProgress=()=>{},profile='B2C'}){
 if(!['B2B','B2C'].includes(profile))throw Error('Tipologia modello non valida.');
 const {opts,type}=await context(call);let schema=(await call('crm.item.fields',{entityTypeId:type.entityTypeId})).fields;
 for(const [suffix,label] of Object.entries(labels)){
  if(Object.entries(schema).some(([k,v])=>String(v.upperName||k).replaceAll('_','').toUpperCase().endsWith(suffix.replaceAll('_',''))))continue;
  onProgress(`Preparazione archivio: ${label}…`);
  await call('userfieldconfig.add',{moduleId:'crm',field:{entityId:`CRM_${type.id}`,fieldName:`UF_CRM_${type.id}_${suffix}`,userTypeId:'string',xmlId:'NOVOTECNA_EIGHT_'+suffix,multiple:'N',mandatory:'N',editFormLabel:{it:label,en:label},settings:{ROWS:suffix==='NOVO_NAME'||suffix==='NOVO_NOTES'?5:1,SIZE:50}}});
 }
 schema=(await call('crm.item.fields',{entityTypeId:type.entityTypeId})).fields;
 resolveWordFields(schema);resolveWordEightFields(schema);
 const name=`Novotecna — Preventivo ${profile} con canoni`,key=`canoniWordEightTemplate${profile}Id`;let templateId=Number(opts[key])||0;
 const fields={name,file:[`novotecna-${profile.toLowerCase()}-canoni-word-eight-native.docx`,templateFile],numeratorId:Number(opts.canoniNumeratorId),region:'it',entityTypeId:[7],active:'Y',withStamps:'N'};
 if(templateId){const r=await call('crm.documentgenerator.template.get',{id:templateId});if((r.template||r).name!==name)throw Error('Modello dinamico non corrispondente.');await call('crm.documentgenerator.template.update',{id:templateId,fields});}
 else{if(opts[key]==='pending')throw Error('Esito del modello da verificare prima di ripetere.');await call('app.option.set',{options:{[key]:'pending'}});const r=await call('crm.documentgenerator.template.add',{fields});templateId=Number(r.template?.id||r.id||r);if(!templateId)throw Error('ID modello non leggibile.');await call('app.option.set',{options:{[key]:String(templateId)}});}
 return {entityTypeId:Number(type.entityTypeId),templateId,columns:Object.keys(WORD_EIGHT_COLUMNS).length};
}
export async function migrateWordEightQuote({call,quoteId,measure}){
 const {opts,type}=await context(call),quote=await call('crm.quote.get',{id:quoteId});
 if(![67,69,Number(opts.canoniWordEightTestQuoteId),Number(opts.canoniWordEightB2BQuoteId)].includes(Number(quoteId))||!String(quote.TITLE).startsWith('TEST'))throw Error('La scheda non appartiene al collaudo autorizzato.');
 const baseline=quote[DATA]||'',saved=decodeState(baseline,quoteId),templateId=Number(opts[saved.type==='B2B'?'canoniWordEightTemplateB2BId':'canoniWordEightTemplateB2CId']);
 if(!templateId)throw Error(`Il modello ${saved.type} non è ancora disponibile.`);
 assertWordEightPageFits(saved.rows,measure);
 const schema=(await call('crm.item.fields',{entityTypeId:type.entityTypeId})).fields;
 const json=encodeState(quoteId,saved.rows,{type:saved.type,templateId,wordLayout:8});
 const result=await saveWithWordEightProjection({quoteId,json,baseline,dataField:DATA,entityTypeId:Number(type.entityTypeId),fieldMap:resolveWordFields(schema),eightFieldMap:resolveWordEightFields(schema),call});
 const ids=new Set(String(opts.canoniWordEightQuoteIds||'').split(',').filter(Boolean));ids.add(String(quoteId));
 await call('app.option.set',{options:{canoniWordEightQuoteIds:[...ids].join(',')}});
 return {quoteId,templateId,rows:saved.rows.length,total:result.quote.OPPORTUNITY};
}
export async function prepareWordEightCase({call,measure,reset=false}){
 const {opts}=await context(call),source=await call('crm.quote.get',{id:69});
 if(!source.COMMENTS?.includes('NOVOTECNA_DIRECT_WORD_TEST'))throw Error('La sorgente non è il caso dimostrativo.');
 let quoteId=Number(opts.canoniWordEightTestQuoteId)||0;
 if(!quoteId){if(opts.canoniWordEightTestQuoteId==='pending')throw Error('Creazione del preventivo da verificare.');await call('app.option.set',{options:{canoniWordEightTestQuoteId:'pending'}});quoteId=Number(await call('crm.quote.add',{fields:{TITLE:'TEST NOVOTECNA — Canoni dinamici',STATUS_ID:'DRAFT',CURRENCY_ID:'EUR',COMMENTS:MARKER,OPENED:'N'}}));if(!quoteId)throw Error('ID della copia non leggibile.');await call('app.option.set',{options:{canoniWordEightTestQuoteId:String(quoteId)}});}
 const copy=await call('crm.quote.get',{id:quoteId});if(!isWordEightFixtureComment(copy.COMMENTS))throw Error('Copia di collaudo non corrispondente.');
 if(!copy[DATA]||reset){
  const keys=['DEAL_ID','CONTACT_ID','CONTACT_IDS','COMPANY_ID','MYCOMPANY_ID','BEGINDATE','CLOSEDATE','ACTUAL_DATE','CURRENCY_ID','CLIENT_TITLE','CLIENT_CONTACT','CLIENT_ADDR','CLIENT_EMAIL','CLIENT_PHONE','CLIENT_TPA_ID','CONTENT','TERMS','UF_CRM_QUOTE_1780561303442','UF_CRM_6A0C96C0B8AC3','UF_CRM_QUOTE_1780314824245','UF_CRM_6A0B2FAB1640A'];
  await call('crm.quote.update',{id:quoteId,fields:Object.fromEntries(keys.filter(k=>source[k]!=null).map(k=>[k,source[k]]))});
  const products=await call('crm.quote.productrows.get',{id:69}),productKeys=['PRODUCT_ID','PRODUCT_NAME','PRICE','QUANTITY','DISCOUNT_TYPE_ID','DISCOUNT_RATE','DISCOUNT_SUM','TAX_RATE','TAX_INCLUDED','MEASURE_CODE','MEASURE_NAME','CUSTOMIZED'];
  await call('crm.quote.productrows.set',{id:quoteId,rows:products.map(row=>Object.fromEntries(productKeys.filter(k=>row[k]!==undefined).map(k=>[k,row[k]])))});
  const rows=decodeState(source[DATA],69).rows.map((r,i)=>i===0?{...r,description:'Servizio O&M del Sistema Virtuale',duration:'Per tutta la durata del contratto'}:r);
  rows.push({description:'Gestione piattaforma Novir',amount:'12',unit:'Contratto',period:'Annuale',quantity:'1 contratto',duration:'36 mesi',start:'Dalla firma',notes:'Dati dimostrativi; tariffa informativa.'});
  await call('crm.quote.update',{id:quoteId,fields:{[DATA]:encodeState(quoteId,rows,{templateId:Number(opts.canoniWordEightTemplateB2CId)})}});
 }
 const result=await migrateWordEightQuote({call,quoteId,measure});
 if(String(result.total)!==String(source.OPPORTUNITY))throw Error('Il totale della copia richiede una verifica.');
 return result;
}
export async function prepareWordEightB2BCase({call,measure}){
 const {opts}=await context(call);
 if(!Number(opts.canoniWordEightTemplateB2BId)||!Number(opts.canoniWordEightTestQuoteId))throw Error('Preparare il modello B2B e la copia B2C prima della prova.');
 const source=await call('crm.quote.get',{id:Number(opts.canoniWordEightTestQuoteId)});
 if(!isWordEightFixtureComment(source.COMMENTS))throw Error('La sorgente non è il collaudo dinamico.');
 async function ensure(key,method,fields){
  if(opts[key]==='pending')throw Error('Creazione precedente da verificare: '+key);
  if(Number(opts[key])){const r=await call(method.replace(/\.add$/,'.get'),{id:Number(opts[key])});if(!isWordEightFixtureComment(r.COMMENTS)&&!String(r.NAME||'').includes(MARKER))throw Error('Record di collaudo non corrispondente.');return Number(opts[key]);}
  await call('app.option.set',{options:{[key]:'pending'}});const id=Number(await call(method,{fields}));if(!id)throw Error('ID del record non confermato.');opts[key]=String(id);await call('app.option.set',{options:{[key]:String(id)}});return id;
 }
 const companyId=await ensure('canoniWordEightB2BCompanyId','crm.company.add',{TITLE:'TEST Cliente Azienda Canoni Srl',COMPANY_TYPE:'CUSTOMER',COMMENTS:MARKER,OPENED:'N'});
 const requisiteId=await ensure('canoniWordEightB2BRequisiteId','crm.requisite.add',{ENTITY_TYPE_ID:4,ENTITY_ID:companyId,PRESET_ID:1,NAME:'TEST '+MARKER,ACTIVE:'Y',RQ_COMPANY_NAME:'TEST Cliente Azienda Canoni Srl'});
 await call('crm.address.add',{fields:{ENTITY_TYPE_ID:8,ENTITY_ID:requisiteId,TYPE_ID:1,ADDRESS_1:'Via Dimostrativa 20',CITY:'Napoli',PROVINCE:'NA',POSTAL_CODE:'80100',COUNTRY:'Italia',COUNTRY_CODE:'IT'}});
 const dealId=await ensure('canoniWordEightB2BDealId','crm.deal.add',{TITLE:'TEST Fotovoltaico Virtuale — Cliente B2B',COMPANY_ID:companyId,CURRENCY_ID:'EUR',COMMENTS:MARKER,OPENED:'N'});
 const quoteId=await ensure('canoniWordEightB2BQuoteId','crm.quote.add',{TITLE:'TEST NOVOTECNA — Canoni dinamici B2B',STATUS_ID:'DRAFT',CURRENCY_ID:'EUR',COMMENTS:MARKER,COMPANY_ID:companyId,DEAL_ID:dealId,OPENED:'N'});
 const copy=await call('crm.quote.get',{id:quoteId});
 if(!copy[DATA]){
  const keys=['MYCOMPANY_ID','BEGINDATE','CLOSEDATE','ACTUAL_DATE','CURRENCY_ID','CONTENT','TERMS','UF_CRM_6A0C96C0B8AC3','UF_CRM_QUOTE_1780314824245','UF_CRM_6A0B2FAB1640A'];
  await call('crm.quote.update',{id:quoteId,fields:{...Object.fromEntries(keys.filter(k=>source[k]!=null).map(k=>[k,source[k]])),UF_CRM_QUOTE_1780561303442:'TEST B2B Fotovoltaico 10 kWp',CLIENT_TITLE:'TEST Cliente Azienda Canoni Srl'}});
  const rows=await call('crm.quote.productrows.get',{id:Number(opts.canoniWordEightTestQuoteId)}),keysProduct=['PRODUCT_ID','PRODUCT_NAME','PRICE','QUANTITY','DISCOUNT_TYPE_ID','DISCOUNT_RATE','DISCOUNT_SUM','TAX_RATE','TAX_INCLUDED','MEASURE_CODE','MEASURE_NAME','CUSTOMIZED'];
  await call('crm.quote.productrows.set',{id:quoteId,rows:rows.map(row=>Object.fromEntries(keysProduct.filter(k=>row[k]!==undefined).map(k=>[k,row[k]])))});
  const saved=decodeState(source[DATA],Number(opts.canoniWordEightTestQuoteId));
  await call('crm.quote.update',{id:quoteId,fields:{[DATA]:encodeState(quoteId,saved.rows,{type:'B2B',templateId:Number(opts.canoniWordEightTemplateB2BId)})}});
 }
 const result=await migrateWordEightQuote({call,quoteId,measure});
 if(String(result.total)!==String(source.OPPORTUNITY))throw Error('Il totale B2B richiede una verifica.');
 return {...result,companyId,dealId,requisiteId};
}
export async function finalizeWordEight({call,documentHandler}){
 const {opts}=await context(call),templates={B2C:Number(opts.canoniWordEightTemplateB2CId),B2B:Number(opts.canoniWordEightTemplateB2BId)};
 if(!templates.B2C||!templates.B2B)throw Error('Entrambi i modelli devono essere pronti prima dell’attivazione.');
 for(const [profile,id] of Object.entries(templates)){const r=await call('crm.documentgenerator.template.get',{id}),t=r.template||r;if(t.name!==`Novotecna — Preventivo ${profile} con canoni`||t.active!=='Y')throw Error('Un modello definitivo non corrisponde alla configurazione.');}
 for(const quoteId of [67,69,Number(opts.canoniWordEightTestQuoteId),Number(opts.canoniWordEightB2BQuoteId)]){
  if(!quoteId)throw Error('Completare le copie di collaudo.');const q=await call('crm.quote.get',{id:quoteId}),saved=decodeState(q[DATA],quoteId);
  if(saved.wordLayout!==8||wordBindingIds(q[WORD_FIELD]).length!==Math.max(saved.rows.length,1))throw Error(`Completare l’allineamento del preventivo ${quoteId}.`);
 }
 await call('app.option.set',{options:{canoniWordEightEnabled:'Y'}});
 // Read every page before changing bindings, so pagination cannot skip a model.
 const candidates=[];
 for(let start=0;;start+=50){const r=await call('crm.documentgenerator.template.list',{filter:{active:'Y',entityTypeId:['7']},select:['id','name','active','entityTypeId'],order:{id:'ASC'},start});const page=Object.values(r.templates||r);candidates.push(...page);if(page.length<50)break;}
 const retired=[],menuChanges=[];
 for(const t of candidates){const id=Number(t.id),entities=Object.values(t.entityTypeId||[]).map(String),isQuote=v=>v==='7'||v.startsWith('7_');if(!id||Object.values(templates).includes(id)||t.active!=='Y'||!entities.some(isQuote))continue;const remaining=entities.filter(v=>!isQuote(v)),fields=remaining.length?{entityTypeId:remaining}:{active:'N'};await call('crm.documentgenerator.template.update',{id,fields});retired.push(id);menuChanges.push({id,name:t.name,previousEntityTypeId:entities,...fields});}
 let documentCommandRemoved=0;
 if(documentHandler){const bindings=await call('placement.get');for(const p of Object.values(bindings||[])){if((p.PLACEMENT||p.placement)==='CRM_QUOTE_DOCUMENTGENERATOR_BUTTON'&&(p.HANDLER||p.handler)===documentHandler){await call('placement.unbind',{PLACEMENT:'CRM_QUOTE_DOCUMENTGENERATOR_BUTTON',HANDLER:documentHandler});documentCommandRemoved++;}}}
 return {enabled:true,templates,retired,menuChanges,documentCommandRemoved};
}
