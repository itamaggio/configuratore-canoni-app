import {encodeState,normalizeRow} from './core.mjs';
const MARKER='NOVOTECNA_CANONI_CLIENT_CASE_V1';
const idOf=r=>Number(r?.id||r?.template?.id||r);
export async function ensureTestRecord({call,opts,key,method,fields}){
 if(opts[key]==='pending')throw Error(`Esito incerto per ${key}. Controllare il CRM prima di ripetere la creazione.`);
 if(Number(opts[key])>0){
  const record=await call(method.replace(/\.add$/,'.get'),{id:Number(opts[key])});
  if(!JSON.stringify(record).includes(MARKER))throw Error(`Il record ${key} non corrisponde al collaudo Novotecna.`);
  return Number(opts[key]);
 }
 opts[key]='pending';await call('app.option.set',{options:{[key]:'pending'}});
 const id=idOf(await call(method,{fields}));if(!id)throw Error(`ID ${key} non leggibile. Verificare il CRM.`);
 opts[key]=String(id);await call('app.option.set',{options:{[key]:String(id)}});return id;
}
export async function prepareClientCase({call,fieldName,templateFile,onProgress=()=>{}}){
 const opts=await call('app.option.get');
 if(Number(opts.novotecnaClientCaseDone)>0)return {quoteId:Number(opts.novotecnaClientCaseDone),templateId:Number(opts.novotecnaClientTemplateId)};
 const ensure=(key,method,fields)=>ensureTestRecord({call,opts,key,method,fields});
 onProgress('Preparazione dei campi del modello cliente…');
 const custom=[
  ['UF_CRM_QUOTE_1780561303442','Nome offerta Novotecna TEST','TEST B2C Fotovoltaico 10 kWp'],
  ['UF_CRM_6A0C96C0B8AC3','Destinazione Novotecna TEST','Via dell’Esempio 10, 80100 Napoli (NA)'],
  ['UF_CRM_QUOTE_1780314824245','Pagamento Novotecna TEST','Bonifico anticipato — TEST'],
  ['UF_CRM_6A0B2FAB1640A','Note offerta Novotecna TEST','PROVA DIMOSTRATIVA. Impianto virtuale da 10 kWp. Prezzi, anagrafica e condizioni inseriti esclusivamente per il collaudo. Il canone O&M è informativo ed escluso dal totale prodotti.']
 ];
 const existing=Object.values(await call('crm.quote.userfield.list',{}));
 for(const [name,label] of custom)if(!existing.some(f=>f.FIELD_NAME===name))await call('crm.quote.userfield.add',{fields:{FIELD_NAME:name,XML_ID:MARKER+'_'+name,USER_TYPE_ID:'string',MULTIPLE:'N',MANDATORY:'N',EDIT_FORM_LABEL:{it:label,en:label},LIST_COLUMN_LABEL:{it:label,en:label},SHOW_IN_LIST:'Y',SETTINGS:{ROWS:name==='UF_CRM_6A0B2FAB1640A'?4:1,SIZE:60}}});
 onProgress('Creazione dell’anagrafica dimostrativa…');
 const contactId=await ensure('novotecnaClientContactId','crm.contact.add',{NAME:'TEST Mario',LAST_NAME:'Rossi',COMMENTS:MARKER,OPENED:'N',EMAIL:[{VALUE:'mario.rossi@example.invalid',VALUE_TYPE:'HOME'}]});
 const requisiteId=await ensure('novotecnaClientRequisiteId','crm.requisite.add',{ENTITY_TYPE_ID:3,ENTITY_ID:contactId,PRESET_ID:2,NAME:'TEST '+MARKER,ACTIVE:'Y',RQ_FIRST_NAME:'TEST Mario',RQ_LAST_NAME:'Rossi'});
 await call('crm.address.add',{fields:{ENTITY_TYPE_ID:8,ENTITY_ID:requisiteId,TYPE_ID:1,ADDRESS_1:'Via dell’Esempio 10',CITY:'Napoli',PROVINCE:'NA',POSTAL_CODE:'80100',COUNTRY:'Italia',COUNTRY_CODE:'IT'}});
 const dealId=await ensure('novotecnaClientDealId','crm.deal.add',{TITLE:'TEST Fotovoltaico Virtuale 10 kWp',CONTACT_ID:contactId,CURRENCY_ID:'EUR',COMMENTS:MARKER,OPENED:'N'});
 onProgress('Preparazione dei prodotti del catalogo per la prova…');
 const properties=Object.values(await call('crm.product.property.list',{}));
 let codeProperty=properties.find(p=>p.CODE==='CODICE_PRODOTTO_MNJ6CT');
 if(!codeProperty){const catalogId=Number(properties[0]?.IBLOCK_ID);if(!catalogId)throw Error('Catalogo di test non identificato.');const id=await call('crm.product.property.add',{fields:{IBLOCK_ID:catalogId,CODE:'CODICE_PRODOTTO_MNJ6CT',NAME:'Codice Prodotto — TEST Novotecna',XML_ID:MARKER,PROPERTY_TYPE:'S',ACTIVE:'Y',MULTIPLE:'N'}});codeProperty={ID:id};}
 const prop='PROPERTY_'+codeProperty.ID;
 const product1=await ensure('novotecnaClientProduct1Id','crm.product.add',{NAME:'TEST — Fotovoltaico Virtuale 10 kWp',CODE:'test-novotecna-virtuale-10kwp',XML_ID:MARKER+'_PRODUCT_1',DESCRIPTION:'Sistema Fotovoltaico Virtuale: quota di potenza acquistata pari a 10 kWp. Fornitura dimostrativa per collaudo del preventivo Novotecna.',DESCRIPTION_TYPE:'text',ACTIVE:'Y',CURRENCY_ID:'EUR',PRICE:970,[prop]:{value:'EV050023-T'}});
 const product2=await ensure('novotecnaClientProduct2Id','crm.product.add',{NAME:'TEST — Attivazione sistema virtuale',CODE:'test-novotecna-attivazione',XML_ID:MARKER+'_PRODUCT_2',DESCRIPTION:'Servizio di attivazione del Sistema Virtuale e configurazione iniziale dell’accesso cliente. Voce una tantum dimostrativa.',DESCRIPTION_TYPE:'text',ACTIVE:'Y',CURRENCY_ID:'EUR',PRICE:200,[prop]:{value:'TEST-ATT'}});
 onProgress('Importazione della copia del modello B2C…');
 let templateId=Number(opts.novotecnaClientTemplateId)||0;
 if(!templateId){
  if(opts.novotecnaClientTemplateId==='pending')throw Error('Importazione modello con esito incerto. Controllare i modelli prima di riprovare.');
  const numeratorId=Number(opts.canoniNumeratorId);if(!numeratorId)throw Error('Preparare prima il numeratore del modello di prova.');
  await call('app.option.set',{options:{novotecnaClientTemplateId:'pending'}});
  const r=await call('crm.documentgenerator.template.add',{fields:{name:'TEST Novotecna B2C — Modello cliente con canoni',file:['novotecna-b2c-canoni-test.docx',templateFile],numeratorId,region:'it',entityTypeId:[7],active:'Y',withStamps:'N'}});
  templateId=idOf(r);if(!templateId)throw Error('ID del modello cliente non leggibile.');
  opts.novotecnaClientTemplateId=String(templateId);await call('app.option.set',{options:{novotecnaClientTemplateId:String(templateId)}});
 }
 onProgress('Compilazione del preventivo completo…');
 const quoteId=await ensure('novotecnaClientQuoteId','crm.quote.add',{TITLE:'TEST NOVOTECNA — Fotovoltaico Virtuale 10 kWp B2C',STATUS_ID:'DRAFT',DEAL_ID:dealId,CONTACT_ID:contactId,CONTACT_IDS:[contactId],CURRENCY_ID:'EUR',BEGINDATE:'2026-11-09',CLOSEDATE:'2026-12-09',ACTUAL_DATE:'2026-12-09',CLIENT_TITLE:'TEST Mario Rossi',CLIENT_CONTACT:'TEST Mario Rossi',CLIENT_ADDR:'Via dell’Esempio 10, 80100 Napoli (NA), Italia',CLIENT_EMAIL:'mario.rossi@example.invalid',CONTENT:'Sistema Fotovoltaico Virtuale da 10 kWp — offerta dimostrativa.',TERMS:'Bonifico anticipato — dati dimostrativi',COMMENTS:MARKER+' — Tutti i dati sono di prova.',OPENED:'N',...Object.fromEntries(custom.map(([name,,value])=>[name,value]))});
 const products=[{PRODUCT_ID:product1,PRODUCT_NAME:'TEST — Fotovoltaico Virtuale',PRODUCT_DESCRIPTION:'Sistema Fotovoltaico Virtuale: quota di potenza acquistata pari a 10 kWp. Fornitura dimostrativa.',PRICE:1183.4,QUANTITY:10,MEASURE_CODE:796,MEASURE_NAME:'kWp',TAX_RATE:22,TAX_INCLUDED:'N',DISCOUNT_TYPE_ID:2,DISCOUNT_RATE:0,CUSTOMIZED:'Y'},{PRODUCT_ID:product2,PRODUCT_NAME:'TEST — Attivazione sistema virtuale',PRODUCT_DESCRIPTION:'Attivazione e configurazione iniziale dell’accesso cliente. Servizio una tantum dimostrativo.',PRICE:244,QUANTITY:1,MEASURE_CODE:796,MEASURE_NAME:'servizio',TAX_RATE:22,TAX_INCLUDED:'N',DISCOUNT_TYPE_ID:2,DISCOUNT_RATE:0,CUSTOMIZED:'Y'}];
 await call('crm.quote.productrows.set',{id:quoteId,rows:products});
 const rows=[normalizeRow({description:'Servizio O&M del Sistema Virtuale',amount:'97',unit:'kWp',period:'Annuale',quantity:'10 kWp',duration:'Per tutta la durata del contratto',start:'Dall’attivazione del Sistema Virtuale',notes:'Fatturazione annuale anticipata tramite SDD. Tariffa al netto IVA; dato dimostrativo.'})];
 const data=encodeState(quoteId,rows,{type:'B2C',templateId});
 await call('crm.quote.update',{id:quoteId,fields:{[fieldName]:data}});
 const check=await call('crm.quote.get',{id:quoteId});
 if(check[fieldName]!==data||custom.some(([name,,value])=>check[name]!==value))throw Error(`Preventivo #${quoteId} creato: completare la verifica dei campi prima di generare.`);
 await call('app.option.set',{options:{novotecnaClientCaseDone:String(quoteId)}});
 return {quoteId,templateId,contactId,dealId,requisiteId,productIds:[product1,product2],total:check.OPPORTUNITY,tax:check.TAX_VALUE};
}
export async function refineClientCase(call){
 const opts=await call('app.option.get');const quoteId=Number(opts.novotecnaClientCaseDone);
 if(!quoteId)throw Error('Preparare prima il caso cliente.');
 const quote=await call('crm.quote.get',{id:quoteId});
 if(!quote.COMMENTS?.includes(MARKER))throw Error('Il preventivo non appartiene al collaudo.');
 const companyId=await ensureTestRecord({call,opts,key:'novotecnaClientMyCompanyId',method:'crm.company.add',fields:{TITLE:'TEST Novotecna SBRL',IS_MY_COMPANY:'Y',COMMENTS:MARKER,OPENED:'N'}});
 const measures=Object.values(await call('crm.measure.list',{}));
 let measure=measures.find(m=>(m.SYMBOL_INTL||m.SYMBOL_RUS)==='kWp');
 if(!measure){
  if(measures.some(m=>Number(m.CODE)===99067))throw Error('Codice unità di prova già occupato.');
  const id=await call('crm.measure.add',{fields:{CODE:99067,MEASURE_TITLE:'Kilowatt picco — TEST Novotecna',SYMBOL_RUS:'kWp',SYMBOL_INTL:'kWp',SYMBOL_LETTER_INTL:'KWP',IS_DEFAULT:'N'}});
  measure={ID:id,CODE:99067};
 }
 const productId=Number(opts.novotecnaClientProduct1Id);
 const product=await call('crm.product.get',{id:productId});
 if(!product.XML_ID?.startsWith(MARKER))throw Error('Prodotto estraneo alla prova.');
 await call('crm.product.update',{id:productId,fields:{MEASURE:Number(measure.ID),DESCRIPTION:'Quota unitaria da 1 kWp del Sistema Fotovoltaico Virtuale. Potenza complessiva acquistata: 10 kWp. Fornitura dimostrativa per il collaudo Novotecna.'}});
 const rows=await call('crm.quote.productrows.get',{id:quoteId});
 const before={total:quote.OPPORTUNITY,tax:quote.TAX_VALUE};
 await call('crm.quote.productrows.set',{id:quoteId,rows:rows.map(r=>({...r,TAX_NAME:'IVA',...(Number(r.PRODUCT_ID)===productId?{MEASURE_CODE:Number(measure.CODE),MEASURE_NAME:'kWp'}:{})}))});
 const metadata=await call('crm.quote.fields');const sales=metadata.UF_CRM_6A90545C88C20;
 const fields={MYCOMPANY_ID:companyId};
 if(sales?.type==='employee'||sales?.type==='user')fields.UF_CRM_6A90545C88C20=6;
 if(sales?.type==='enumeration'&&sales.items?.length){const selected=sales.items.find(i=>/francesco|golino/i.test(i.VALUE));if(selected)fields.UF_CRM_6A90545C88C20=selected.ID;}
 await call('crm.quote.update',{id:quoteId,fields});
 const check=await call('crm.quote.get',{id:quoteId});
 if(check.OPPORTUNITY!==before.total||check.TAX_VALUE!==before.tax)throw Error('Il totale dei prodotti è cambiato durante la revisione: verificare il preventivo.');
 return {quoteId,companyId,measure,salesAccount:sales?{type:sales.type,items:sales.items,value:check.UF_CRM_6A90545C88C20}:null,total:check.OPPORTUNITY,tax:check.TAX_VALUE};
}
