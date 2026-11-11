import {ROW_FIELDS,normalizeRow,encodeState,decodeState,documentPayload,displayAmount,requirePortal,placementContext} from './core.mjs';
import {createSavedDocument} from './document-action.mjs';
import {prepareClientCase,refineClientCase} from './client-case.mjs';
import {PRINT_FIELD,PRINT_XML_ID,renderNativeTable,saveWithNativePrint} from './native-print.mjs';
import {WORD_FIELD,resolveWordFields,saveWithWordProjection,assertWordPageFits} from './word-projection.mjs';
import {saveWithDirectFields,assertDirectPageFits} from './direct-fields.mjs';
import {optionsFor,SELECT_DEFAULTS} from './form-options.mjs';
import {searchCatalogNames,useCatalogName} from './catalog.mjs';
import {bitrixErrorMessage} from './bitrix-errors.mjs';
import {resolveWordEightFields,saveWithWordEightProjection,assertWordEightPageFits} from './word-eight.mjs';
const $=id=>document.getElementById(id);
const state={quoteId:0,rows:[],baseline:'',dirty:false,busy:false,editing:null,formTouched:false,removed:null,demo:false,field:null,printField:null,nativePrint:false,wordPrint:null,directPrint:null,templates:[],config:null,domain:null,actionMode:false,actionKey:null,actionDocumentId:0,actionPending:false};
const form=$('row-form');
const catalog={timer:null,request:0,suppressFocus:false};
function fillSelects(values=SELECT_DEFAULTS){
 for(const key of Object.keys(SELECT_DEFAULTS)){const select=form.elements[key],value=values[key]??SELECT_DEFAULTS[key];select.replaceChildren(...optionsFor(key,value).map(x=>new Option(x.label,x.value)));select.value=value;}
}
fillSelects();
function closeCatalog(){clearTimeout(catalog.timer);catalog.request++;$('catalog-menu').hidden=true;}
async function showCatalog(){
 if(state.busy)return;const query=form.elements.description.value.trim();if(query.length>200){closeCatalog();return;}const request=++catalog.request;$('catalog-menu').hidden=false;$('catalog-results').replaceChildren();$('catalog-message').textContent='Ricerca nel catalogo…';resize();
 try{
  const products=state.demo?[{id:'demo',name:'DEMO — Manutenzione impianto fotovoltaico'}]:await searchCatalogNames({query,call:api});
  if(request!==catalog.request)return;
  $('catalog-message').textContent=products.length?(products.length>10?'Mostrati i primi 10 risultati.':products.length===1?'1 prodotto trovato.':`${products.length} prodotti trovati.`)+' Scrivi per affinare la ricerca.':'Nessun prodotto trovato. Puoi continuare con il nome inserito.';
  for(const product of products.slice(0,10)){
   const button=el('button',product.name);button.type='button';
   button.addEventListener('click',()=>{const next=useCatalogName(Object.fromEntries(new FormData(form)),product);form.elements.description.value=next.description;closeCatalog();state.formTouched=true;controls();catalog.suppressFocus=true;form.elements.description.focus();});
   $('catalog-results').append(button);
  }
 }catch(error){if(request===catalog.request)$('catalog-message').textContent='Catalogo non disponibile. Puoi scrivere il nome manualmente.';}
 resize();
}
form.elements.description.addEventListener('focus',()=>{if(catalog.suppressFocus){catalog.suppressFocus=false;return;}showCatalog();});
form.elements.description.addEventListener('click',()=>{if($('catalog-menu').hidden)showCatalog();});
form.elements.description.addEventListener('input',()=>{clearTimeout(catalog.timer);catalog.request++;if(form.elements.description.value.trim().length>200){closeCatalog();return;}$('catalog-results').replaceChildren();$('catalog-message').textContent='Ricerca nel catalogo…';$('catalog-menu').hidden=false;catalog.timer=setTimeout(showCatalog,350);});
$('catalog-close').addEventListener('click',()=>{closeCatalog();catalog.suppressFocus=true;form.elements.description.focus();});
$('catalog-field').addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('catalog-menu').hidden){event.preventDefault();closeCatalog();catalog.suppressFocus=true;form.elements.description.focus();event.stopPropagation();}else if(event.key==='ArrowDown'&&event.target===form.elements.description&&!$('catalog-menu').hidden){const button=$('catalog-results').querySelector('button');if(button){event.preventDefault();button.focus();}}});
document.addEventListener('pointerdown',event=>{if(!$('catalog-field').contains(event.target))closeCatalog();});
$('catalog-field').addEventListener('focusout',event=>{if(event.relatedTarget&&!$('catalog-field').contains(event.relatedTarget))closeCatalog();});
function status(message,kind=''){ $('status').textContent=message;$('status').className=`status ${kind}`;$('status').hidden=message==='Canoni caricati dal preventivo.'; }
function el(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
function api(method,params={}){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('La richiesta a Bitrix24 non ha risposto. Ricarica i dati prima di riprovare.')),45000);
  BX24.callMethod(method,params,r=>{clearTimeout(timer);const error=r.error();if(error){reject(new Error(bitrixErrorMessage(error)||'Errore Bitrix24'));}else resolve(r.data());});
 });
}
function list(method,params,key){return new Promise((resolve,reject)=>{const out=[];BX24.callMethod(method,params,function next(r){if(r.error()){reject(new Error(String(r.error())));return;}const data=r.data();const rows=Array.isArray(data)?data:(data[key]||[]);out.push(...Object.values(rows));if(r.more())r.next();else resolve(out);});});}
function recordId(value,key){return Number(value?.[key]?.id||value?.id||value);}
function completedForm(){if(!state.formTouched&&state.editing===null)return true;status('Completa il canone con «Aggiungi canone» o «Aggiorna canone», oppure premi «Annulla» prima di cambiare voce.','error');form.elements.description.focus();return false;}
function controls(){
 const pendingForm=state.formTouched||state.editing!==null;
 $('cancel-edit').hidden=!pendingForm;
 $('form-guidance').hidden=!pendingForm;
 $('form-guidance').textContent=state.editing===null?'Premi «Aggiungi canone» per inserire questa voce, poi «Salva canoni» per conservarla nel preventivo.':'Premi «Aggiorna canone» per applicare la modifica, poi «Salva canoni». Con «Annulla» conservi la voce precedente.';
 $('undo-remove').hidden=!state.removed;$('undo-remove').disabled=state.busy;
 for(const id of ['prepare','create-test','import-template','open-quote','create-client-case','inspect-client','refine-client-case','prepare-native-print'])$(id).disabled=state.busy||state.demo;
 $('save').disabled=state.busy||!state.dirty||pendingForm;
 $('generate').disabled=state.busy||!state.quoteId||!$('template').value||state.demo;
 $('action-generate').disabled=state.busy||!$('action-template').value||!!state.actionDocumentId||state.actionPending;
 for(const id of ['document-type','template','action-template'])$(id).disabled=state.busy;
 for(const control of form.elements)control.disabled=state.busy;
 for(const button of document.querySelectorAll('.row-actions button'))button.disabled=state.busy;
 $('saved').textContent=pendingForm?'Canone da completare':state.dirty?'Modifiche da salvare':(state.demo?'Anteprima locale':state.quoteId?'Modifiche salvate':'');
 $('saved').dataset.state=state.dirty||pendingForm?'dirty':state.demo?'preview':'saved';
 document.querySelector('.save-controls').hidden=!state.quoteId&&!state.demo;
}
async function run(fn){if(state.busy)return;state.busy=true;controls();try{await fn();}catch(error){status(error.message,'error');}finally{state.busy=false;controls();}}
function changed(){state.dirty=true;controls();}
function render(){
 $('rows').replaceChildren();$('count').textContent=`${state.rows.length} ${state.rows.length===1?'voce':'voci'}`;
 if(!state.rows.length){const empty=el('div',undefined,'empty');empty.append(el('strong','Nessun canone inserito'),el('p','Aggiungi il primo servizio con la sua tariffa e le condizioni da riportare nel preventivo.'));$('rows').append(empty);}
 state.rows.forEach((row,index)=>{
  const a=el('article',undefined,'row'),top=el('div',undefined,'row-top'),price=el('div',undefined,'price-block');
  price.append(el('div',displayAmount(row.amount),'tariff'),el('p',[row.unit,row.period].filter(Boolean).join(' · '),'price-context'));
  const expanded=row.description.length>160;
  const title=expanded?row.description.slice(0,110).replace(/\s+\S*$/,'')+'…':row.description;
  top.append(el('h3',title,'row-title'),price);a.append(top);
  if(expanded){const description=el('details',undefined,'full-description');description.append(el('summary','Leggi la descrizione completa'),el('p',row.description));a.append(description);}
  const details=el('dl',undefined,'row-details');
  for(const [label,value] of [['Riferimento',row.quantity],['Durata',row.duration],['Decorrenza',row.start]]){const cell=el('div');cell.append(el('dt',label),el('dd',value||'Non specificata'));details.append(cell);}a.append(details);
  if(row.notes)a.append(el('p',row.notes,'row-notes'));
  const actions=el('div',undefined,'row-actions'),edit=el('button','Modifica'),remove=el('button','Rimuovi','remove');
  edit.type=remove.type='button';edit.addEventListener('click',()=>{if(state.busy||!completedForm())return;state.editing=index;fillSelects(row);for(const key of ROW_FIELDS)form.elements[key].value=row[key];state.formTouched=false;$('form-title').textContent='Modifica canone';$('add-row').textContent='Aggiorna canone';$('cancel-edit').hidden=false;closeCatalog();controls();catalog.suppressFocus=true;form.elements.description.focus();});
  edit.setAttribute('aria-label',`Modifica ${title}`);remove.setAttribute('aria-label',`Rimuovi ${title}`);
  remove.addEventListener('click',()=>{if(state.busy||!completedForm())return;state.removed={row:{...row},index};state.rows.splice(index,1);resetForm();changed();render();status('Canone rimosso dalla lista. Puoi annullare la rimozione prima di salvare.');});actions.append(edit,remove);a.append(actions);$('rows').append(a);
 });controls();resize();
}
function resize(){if(!state.demo&&window.BX24?.fitWindow)BX24.fitWindow();}
function resetForm(){form.reset();fillSelects();closeCatalog();state.editing=null;state.formTouched=false;$('form-title').textContent='Aggiungi un canone';$('add-row').textContent='Aggiungi canone';$('cancel-edit').hidden=true;controls();}
form.addEventListener('input',()=>{state.formTouched=true;controls();});
form.addEventListener('submit',event=>{event.preventDefault();try{const wasEditing=state.editing!==null;const data=Object.fromEntries(new FormData(form));if(wasEditing)data.id=state.rows[state.editing].id;const row=normalizeRow(data);if(wasEditing)state.rows[state.editing]=row;else{const limit=state.directPrint?3:30;if(state.rows.length>=limit)throw new Error(`Puoi inserire al massimo ${limit} canoni nel modello attuale.`);state.rows.push(row);}resetForm();changed();render();status(`${wasEditing?'Canone aggiornato':'Canone aggiunto'}. Premi «Salva canoni» per conservarlo nel preventivo.`);}catch(error){status(error.message,'error');}});
$('cancel-edit').addEventListener('click',()=>{resetForm();status(state.dirty?'Compilazione annullata. Restano modifiche da salvare.':'Compilazione annullata. I canoni salvati non sono cambiati.','success');});
$('undo-remove').addEventListener('click',()=>{if(state.busy||!state.removed||!completedForm())return;const limit=state.directPrint?3:30;if(state.rows.length>=limit){status(`La lista contiene già ${limit} canoni. Rimuovi una voce prima di ripristinare quella precedente.`,'error');return;}const removed=state.removed;state.rows.splice(Math.min(removed.index,state.rows.length),0,removed.row);state.removed=null;changed();render();status('Canone ripristinato. Premi «Salva canoni» per confermare la lista.');});
async function findField(){
 const found=await api('crm.quote.userfield.list',{filter:{XML_ID:state.config.fieldXmlId}});
 state.field=Object.values(found||[]).find(x=>x.XML_ID===state.config.fieldXmlId)||null;
 return state.field;
}
async function options(){return await api('app.option.get');}
async function prepare(){
 status('Preparazione del salvataggio nel CRM…');
 await findField();
 if(!state.field){
  const id=await api('crm.quote.userfield.add',{fields:{FIELD_NAME:state.config.fieldName,XML_ID:state.config.fieldXmlId,USER_TYPE_ID:'string',MULTIPLE:'N',MANDATORY:'N',SHOW_FILTER:'N',SHOW_IN_LIST:'N',EDIT_IN_LIST:'N',EDIT_FORM_LABEL:{it:'Canoni Novotecna — dati applicazione',en:'Novotecna recurring fees — app data'},SETTINGS:{ROWS:10,SIZE:60},SORT:9900}});
  state.field=await api('crm.quote.userfield.get',{id});
 }
 const handler=new URL('index.html',location.href);handler.search='';handler.hash='';
 const placements=await api('placement.get');
 for(const code of ['CRM_QUOTE_DETAIL_TAB']){
  const exact=Object.values(placements||[]).some(x=>(x.PLACEMENT||x.placement)===code&&(x.HANDLER||x.handler)===handler.href);
  if(!exact)await api('placement.bind',{PLACEMENT:code,HANDLER:handler.href,TITLE:code.endsWith('_TAB')?'Canoni':'Preventivo con canoni'});
 }
 if(new URLSearchParams(location.search).has('install'))BX24.installFinish();
 status('Applicazione preparata. Puoi creare il preventivo dimostrativo.','success');
}
async function refreshTemplates(selected=0){
 state.templates=await list('crm.documentgenerator.template.list',{filter:{active:'Y'}},'templates');
 const select=$('template');select.replaceChildren(new Option('Scegli un modello',''));
 for(const t of state.templates){const entities=Object.values(t.entityTypeId||[]).map(String);if(entities.length&&!entities.includes('7'))continue;select.add(new Option(t.name,String(t.id)));}
 if(selected)select.value=String(selected);controls();
}
async function loadQuote(id){
 if(state.dirty||state.formTouched)throw new Error('Salva i canoni e completa la modifica prima di aprire un altro preventivo.');
 const quoteId=Number(id);if(!Number.isSafeInteger(quoteId)||quoteId<1)throw new Error('Inserisci un ID preventivo valido.');
 if(!state.field)await findField();if(!state.field)throw new Error('Usa prima «Prepara applicazione» nella configurazione.');
 const quote=await api('crm.quote.get',{id:quoteId});
 const raw=quote[state.field.FIELD_NAME]||'';const s=decodeState(raw,quoteId);
 const printFields=await api('crm.quote.userfield.list',{filter:{XML_ID:PRINT_XML_ID}});state.printField=Object.values(printFields||[]).find(f=>f.XML_ID===PRINT_XML_ID)||null;
 state.nativePrint=!!(state.printField&&quote[state.printField.FIELD_NAME]);
 const opts=await options();state.wordPrint=null;state.directPrint=null;
 const eight=opts.canoniWordEightEnabled==='Y'||String(opts.canoniWordEightQuoteIds||'').split(',').includes(String(quoteId));
 if(!eight&&Number(opts.canoniDirectQuoteId)===quoteId&&Number(opts.canoniDirectTemplateId)){
  state.directPrint={templateId:Number(opts.canoniDirectTemplateId)};state.nativePrint=false;
 }
 if(!state.directPrint&&opts.canoniWordNativeTemplateId&&(eight||opts.canoniWordEnabled==='Y'||quote[WORD_FIELD]?.length)){
  const type=(await api('crm.type.get',{id:Number(opts.canoniWordProbeTypeId)})).type;
  const schema=await api('crm.item.fields',{entityTypeId:Number(type.entityTypeId)});
  const templateIds=eight?{B2C:Number(opts.canoniWordEightTemplateB2CId)||0,B2B:Number(opts.canoniWordEightTemplateB2BId)||0}:{B2C:Number(opts.canoniWordNativeTemplateId)||0,B2B:Number(opts.canoniWordNativeTemplateB2BId)||0};
  state.wordPrint={entityTypeId:Number(type.entityTypeId),fieldMap:resolveWordFields(schema.fields||schema),templateId:templateIds[s.type],templateIds};
  if(eight){state.wordPrint.layout=8;state.wordPrint.eightFieldMap=resolveWordEightFields(schema.fields||schema);state.nativePrint=false;}
 }
 $('native-print-notice').hidden=!state.nativePrint&&!state.wordPrint&&!state.directPrint;
 state.quoteId=quoteId;state.baseline=raw;state.rows=s.rows;state.dirty=!!(state.wordPrint&&(!quote[WORD_FIELD]?.length||(eight&&s.wordLayout!==8)));state.removed=null;
 $('document-type').value=s.type;$('editor').hidden=state.actionMode;$('quote-id').value=String(quoteId);
 $('context').textContent=`Preventivo #${quoteId} · ${quote.TITLE||''}`;$('context').title=$('context').textContent;
 await refreshTemplates(state.directPrint?.templateId||(state.wordPrint?state.wordPrint.templateId:s.templateId));
 $('document-settings').hidden=!!(state.nativePrint||state.wordPrint||state.directPrint)&&document.documentElement.dataset.admin!=='true';
 if(state.nativePrint||state.wordPrint||state.directPrint){const nativeTemplate=state.templates.find(t=>Number(t.id)===Number(state.directPrint?.templateId||(state.wordPrint?state.wordPrint.templateId:opts.canoniNativeTemplateId)));$('native-print-notice').textContent=nativeTemplate?`Seleziona «${nativeTemplate.name}». Se Bitrix24 chiede il numero, scegli «Crea nuovo». I documenti già creati non si aggiornano.${state.directPrint?' Il modello di prova contiene tre righe; quelle non utilizzate restano vuote.':''}`:`Il referente deve completare la preparazione del modello ${s.type} prima della generazione.`;}
 resetForm();render();status(state.dirty?'Premi «Salva canoni» per preparare la nuova tabella Word. Poi scegli il modello dal menu Documento.':'Canoni caricati dal preventivo.','success');
}
async function save(){
 if(state.formTouched||state.editing!==null)throw new Error('Completa «Aggiungi canone» o «Aggiorna canone» prima di salvare.');
 if(state.demo){localStorage.setItem('novotecna-canoni-demo',JSON.stringify(state.rows));state.dirty=false;state.removed=null;render();status('Anteprima salvata solo in questo browser.');return;}
 status('Salvataggio dei canoni in corso…');
 const current=await api('crm.quote.get',{id:state.quoteId});
 if((current[state.field.FIELD_NAME]||'')!==state.baseline)throw new Error('I canoni sono stati modificati da un’altra sessione. Ricarica il preventivo prima di salvare.');
 const json=encodeState(state.quoteId,state.rows,{type:$('document-type').value,templateId:$('template').value,wordLayout:state.wordPrint?.layout||0});
 let check;
 if(state.directPrint){
  if($('document-type').value!=='B2C')throw Error('Questo modello di prova è B2C. Il modello B2B deve essere preparato separatamente.');
  const ctx=document.createElement('canvas').getContext('2d');
  assertDirectPageFits(state.rows,(text,bold)=>{ctx.font=`${bold?'bold ':''}8pt Calibri,Arial`;return ctx.measureText(text).width*.75;});
  ({quote:check}=await saveWithDirectFields({quoteId:state.quoteId,json,baseline:state.baseline,dataField:state.field.FIELD_NAME,call:api}));
 }
 else if(state.wordPrint){
  const ctx=document.createElement('canvas').getContext('2d');
  const measure=(text,bold)=>{ctx.font=`${bold?'bold ':''}8pt Calibri,Arial`;return ctx.measureText(text).width*.75;};
  (state.wordPrint.layout===8?assertWordEightPageFits:assertWordPageFits)(state.rows,measure);
  ({quote:check}=await (state.wordPrint.layout===8?saveWithWordEightProjection:saveWithWordProjection)({quoteId:state.quoteId,json,baseline:state.baseline,dataField:state.field.FIELD_NAME,...state.wordPrint,call:api}));
 }
 else if(state.nativePrint){const image=renderNativeTable(state.rows);({quote:check}=await saveWithNativePrint({quoteId:state.quoteId,json,dataField:state.field.FIELD_NAME,imageField:state.printField.FIELD_NAME,base64:image.base64,call:api}));}
 else{await api('crm.quote.update',{id:state.quoteId,fields:{[state.field.FIELD_NAME]:json}});check=await api('crm.quote.get',{id:state.quoteId});}
 if(check[state.field.FIELD_NAME]!==json)throw new Error('La rilettura non conferma il salvataggio completo. Le modifiche restano aperte.');
 state.baseline=json;state.dirty=false;state.removed=null;render();status('Canoni salvati. Ora puoi creare il documento dal menu Documento.','success');
}
async function createTest(){
 if(!state.field)await prepare();
 if(state.dirty||state.formTouched)throw new Error('Completa e salva il preventivo aperto prima di creare un’altra prova.');
 status('Creazione del preventivo dimostrativo…');
 const id=await api('crm.quote.add',{fields:{TITLE:`TEST CANONI NOVOTECNA ${new Date().toISOString().slice(0,16)}`,STATUS_ID:'DRAFT',CURRENCY_ID:'EUR'}});
 state.quoteId=Number(id);$('quote-id').value=String(id);
 status(`Preventivo di prova #${id} creato. Inserimento dei prodotti nativi…`);
 await api('crm.quote.productrows.set',{id,rows:[{PRODUCT_NAME:'TEST — fornitura fotovoltaico',PRICE:1000,QUANTITY:1,TAX_RATE:22,TAX_INCLUDED:'N'},{PRODUCT_NAME:'TEST — installazione',PRICE:200,QUANTITY:1,TAX_RATE:22,TAX_INCLUDED:'N'}]});
 await loadQuote(id);
 state.rows=[normalizeRow({description:'TEST — Servizio O&M',amount:'97',unit:'kWp',period:'Annuale',quantity:'10 kWp',duration:'Durata del contratto',start:'Dall’attivazione',notes:'Dati dimostrativi. Fatturazione annuale anticipata.'}),normalizeRow({description:'TEST — Piattaforma NOVIR',amount:'2,89',unit:'kWp',period:'Mensile',quantity:'10 kWp',duration:'Durata del contratto',start:'Dall’attivazione',notes:'Dati dimostrativi, da confermare con Novotecna.'})];
 changed();render();await save();
}
async function importTemplate(){
 status('Preparazione del modello di prova…');
 const opts=await options();
 let numeratorId=Number(opts.canoniNumeratorId)||0;
 if(!numeratorId){const n=await api('crm.documentgenerator.numerator.add',{fields:{name:'TEST CANONI Novotecna',template:'TEST-CAN-{NUMBER}'}});numeratorId=recordId(n,'numerator');if(!numeratorId)throw new Error('Bitrix24 non ha restituito l’ID del numeratore.');await api('app.option.set',{options:{canoniNumeratorId:String(numeratorId)}});}
 const response=await fetch(new URL('templates/canoni-prova.docx',location.href));if(!response.ok)throw new Error('Il file del modello non è disponibile.');
 const bytes=new Uint8Array(await response.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
 const region=state.templates.find(t=>t.region)?.region||'it';
 const fields={name:'TEST Novotecna — Prodotti e canoni',file:['canoni-prova.docx',btoa(binary)],numeratorId,region,entityTypeId:[7],active:'Y',withStamps:'N'};
 let id=Number(opts.canoniPocTemplateId)||0;
 if(id){const existing=await api('crm.documentgenerator.template.get',{id});if((existing.template||existing).name!==fields.name)throw new Error('Il modello registrato non corrisponde al prototipo. Nessun modello è stato sostituito.');await api('crm.documentgenerator.template.update',{id,fields});}
 else{const result=await api('crm.documentgenerator.template.add',{fields});id=recordId(result,'template');}
 if(!id)throw new Error('Il modello è stato inviato ma l’identificativo non è leggibile. Controlla l’elenco prima di riprovare.');
 await api('app.option.set',{options:{canoniPocTemplateId:String(id)}});await refreshTemplates(id);if(state.quoteId)changed();status(`Modello di prova #${id} disponibile. Selezionalo per generare il documento.`, 'success');
}
function documentLinks(doc){
 const box=$(state.actionMode?'action-result':'document-result');box.replaceChildren(el('p',`Documento Bitrix24 #${doc.id}`));
 for(const [label,raw] of [['Apri DOCX',doc.downloadUrl],['Apri PDF',doc.pdfUrl]]){if(!raw)continue;const u=new URL(raw,`https://${state.domain}`);if(u.protocol!=='https:'||u.hostname!==state.domain)continue;const link=el('a',label);link.href=u.href;link.target='_blank';link.rel='noopener noreferrer';box.append(link);}
}
async function generate(){
 if(state.formTouched||state.editing!==null)throw new Error('Completa il canone in modifica prima di generare.');
 await save();
 const before=await api('crm.quote.get',{id:state.quoteId});
 status('Generazione nel motore documentale Bitrix24…');$('document-result').replaceChildren();
 const nativeId=state.directPrint?.templateId||state.wordPrint?.templateId;
 const payload=nativeId&&Number($('template').value)===nativeId?{templateId:nativeId,entityTypeId:7,entityId:state.quoteId,stampsEnabled:0}:documentPayload(state.quoteId,$('template').value,state.rows);
 const result=await api('crm.documentgenerator.document.add',payload);
 let doc=result.document||result;if(!doc.id)throw new Error('La risposta non contiene un ID documento. Controlla i documenti del preventivo prima di riprovare.');
 documentLinks(doc);
 const after=await api('crm.quote.get',{id:state.quoteId});
 if(['OPPORTUNITY','TAX_VALUE','CURRENCY_ID'].some(k=>String(before[k]??'')!==String(after[k]??'')))throw new Error(`Documento #${doc.id} creato, ma il riepilogo CRM è cambiato. Verifica il preventivo prima di utilizzarlo.`);
 await finishDocument(doc);
}
async function finishDocument(doc){
 documentLinks(doc);
 for(let i=0;!doc.pdfUrl&&i<35;i++){
  if(doc.isTransformationError)throw new Error(`Documento #${doc.id}: conversione PDF non riuscita.`);
  status(`Documento #${doc.id} creato. Bitrix24 sta preparando il PDF…`);
  await new Promise(r=>setTimeout(r,4000));const response=await api('crm.documentgenerator.document.get',{id:doc.id});doc=response.document||response;documentLinks(doc);
 }
 status(doc.pdfUrl?'Documento e PDF disponibili. Il totale del preventivo è invariato.':'DOCX disponibile. Il PDF è ancora in preparazione in Bitrix24.',doc.pdfUrl?'success':'');
}
function actionCache(value){try{if(value===undefined)return sessionStorage.getItem(state.actionKey);sessionStorage.setItem(state.actionKey,String(value));}catch{}return null;}
async function generateSavedAction(templateId){
 if(state.actionDocumentId||state.actionPending)return;
 status('Generazione del documento con i canoni salvati…');
 const doc=await createSavedDocument({quoteId:state.quoteId,fieldName:state.field.FIELD_NAME,call:api,templateId,
  onBeforeCreate:()=>{state.actionPending=true;actionCache('pending');},
  onCreated:doc=>{state.actionDocumentId=Number(doc.id);state.actionPending=false;actionCache(doc.id);documentLinks(doc);}
 });
 $('action-choice').hidden=true;await finishDocument(doc);
}
async function openDocumentAction(quoteId){
 state.quoteId=quoteId;state.actionMode=true;
 document.querySelector('.shell').classList.add('action-mode');
 $('page-title').textContent='Generazione preventivo';$('editor-notice').hidden=true;
 $('client-setup').hidden=true;
 $('editor').hidden=true;$('setup').hidden=true;$('open-panel').hidden=true;$('document-action').hidden=false;
 $('context').textContent=`Preventivo #${quoteId} · ${state.domain}`;
 const sid=new URL(location.href).searchParams.get('APP_SID')||crypto.randomUUID();
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(sid));
 state.actionKey=`canoni-document:${state.domain}:${quoteId}:`+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 const cached=actionCache();
 if(cached==='pending'){state.actionPending=true;status('La richiesta è già stata avviata in questa finestra. Controlla i Documenti del preventivo prima di riprovare.');return;}
 if(Number(cached)>0){state.actionDocumentId=Number(cached);const r=await api('crm.documentgenerator.document.get',{id:state.actionDocumentId});await finishDocument(r.document||r);return;}
 await loadQuote(quoteId);
 if(!state.rows.length)throw new Error('Non ci sono canoni salvati. Aggiungili dalla scheda Canoni prima di generare.');
 if($('template').value){await generateSavedAction();return;}
 const select=$('action-template');select.replaceChildren(...Array.from($('template').options,o=>new Option(o.text,o.value)));
 $('action-choice').hidden=false;status('Scegli il modello per generare il documento.');resize();
}
for(const [id,fn] of [['prepare',prepare],['create-test',createTest],['import-template',importTemplate],['save',save],['generate',generate],['open-quote',()=>loadQuote($('quote-id').value)]])$(id).addEventListener('click',()=>run(fn));
$('document-type').addEventListener('change',()=>{if(state.wordPrint){state.wordPrint.templateId=state.wordPrint.templateIds[$('document-type').value]||0;$('template').value=String(state.wordPrint.templateId);}changed();});$('template').addEventListener('change',changed);
$('action-template').addEventListener('change',controls);
$('action-generate').addEventListener('click',()=>run(()=>generateSavedAction(Number($('action-template').value))));
$('inspect-client').addEventListener('click',()=>run(async()=>{
 const result={};
 const opts=await options();
 for(const [method,params] of [['crm.quote.get',{id:Number(opts.novotecnaClientQuoteId)||66}],['crm.quote.productrows.get',{id:Number(opts.novotecnaClientQuoteId)||66}],['crm.documentgenerator.template.get',{id:Number(opts.canoniNativeTemplateId)||12}],['crm.documentgenerator.template.getfields',{id:Number(opts.canoniNativeTemplateId)||12,entityTypeId:7,entityId:Number(opts.novotecnaClientQuoteId)||66}]]){
  try{const data=await api(method,params);result[method]=method==='crm.documentgenerator.template.get'?{template:Object.fromEntries(Object.entries(data.template||data).filter(([key])=>['id','name','region','numeratorId','updateTime'].includes(key)))}:data;}catch(error){result[method]={error:error.message};}
 }
 const q=result['crm.quote.get'];if(q)result['crm.quote.get']=Object.fromEntries(Object.entries(q).filter(([key])=>!key.startsWith('UF_')||['UF_CRM_NOVOTECNA_CANONI','UF_CRM_QUOTE_1780561303442','UF_CRM_6A0C96C0B8AC3','UF_CRM_QUOTE_1780314824245','UF_CRM_6A0B2FAB1640A'].includes(key)));
 $('client-diagnostics').textContent=JSON.stringify(result,null,2);status('Campi del portale letti. Nessun dato CRM modificato.');resize();
}));
$('create-client-case').addEventListener('click',()=>run(async()=>{
 if(state.dirty||state.formTouched)throw Error('Salva le modifiche prima di aprire il caso cliente.');
 if(!state.field)await findField();if(!state.field)throw Error('Preparare prima l’applicazione.');
 const response=await fetch(new URL('templates/novotecna-b2c-canoni-test.docx',location.href));if(!response.ok)throw Error('Copia del modello cliente non disponibile.');
 const bytes=new Uint8Array(await response.arrayBuffer());let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
 const result=await prepareClientCase({call:api,fieldName:state.field.FIELD_NAME,templateFile:btoa(binary),onProgress:status});
 $('client-diagnostics').textContent=JSON.stringify(result,null,2);await loadQuote(result.quoteId);status(`Preventivo cliente dimostrativo #${result.quoteId} compilato. Modello B2C #${result.templateId} pronto.`,'success');
}));
$('refine-client-case').addEventListener('click',()=>run(async()=>{
 const result=await refineClientCase(api);$('client-diagnostics').textContent=JSON.stringify(result,null,2);status('Unità kWp e azienda emittente di prova aggiornate. Totali invariati.','success');
}));
$('prepare-native-print').addEventListener('click',()=>run(async()=>{
 if(state.quoteId!==67)throw Error('Apri il preventivo 67 per questa prova.');
 if(state.dirty||state.formTouched)throw Error('Salva prima le modifiche ai canoni.');
 const quote=await api('crm.quote.get',{id:state.quoteId});const raw=quote[state.field.FIELD_NAME];
 const saved=decodeState(raw,state.quoteId);const image=renderNativeTable(saved.rows);
 let fields=Object.values(await api('crm.quote.userfield.list',{filter:{XML_ID:PRINT_XML_ID}}));
 let printField=fields.find(f=>f.XML_ID===PRINT_XML_ID);
 if(!printField){const id=await api('crm.quote.userfield.add',{fields:{FIELD_NAME:PRINT_FIELD,XML_ID:PRINT_XML_ID,USER_TYPE_ID:'file',MULTIPLE:'N',MANDATORY:'N',SHOW_IN_LIST:'N',EDIT_IN_LIST:'N',EDIT_FORM_LABEL:{it:'Canoni — tabella per il documento',en:'Recurring fees — document table'},SETTINGS:{EXTENSIONS:'png',MAX_ALLOWED_SIZE:4000000}}});printField=await api('crm.quote.userfield.get',{id});}
 status('Salvataggio della tabella nel campo File del preventivo…');
 const result=await saveWithNativePrint({quoteId:state.quoteId,json:raw,dataField:state.field.FIELD_NAME,imageField:printField.FIELD_NAME,base64:image.base64,call:api});
 if(['OPPORTUNITY','TAX_VALUE','CURRENCY_ID'].some(k=>String(result.quote[k])!==String(quote[k])))throw Error('Riepilogo CRM cambiato: verificare prima di generare.');
 const opts=await options();const response=await fetch(new URL('templates/novotecna-b2c-canoni-native.docx',location.href));if(!response.ok)throw Error('Modello nativo non disponibile.');
 const bytes=new Uint8Array(await response.arrayBuffer());let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
 const name='TEST Novotecna B2C — Canoni nativi';
 const templateFields={name,file:['novotecna-b2c-canoni-native.docx',btoa(binary)],numeratorId:Number(opts.canoniNumeratorId),region:'it',entityTypeId:[7],active:'Y',withStamps:'N'};
 let id=Number(opts.canoniNativeTemplateId)||0;
 if(id){const existing=await api('crm.documentgenerator.template.get',{id});if((existing.template||existing).name!==name)throw Error('Modello di prova non corrispondente.');await api('crm.documentgenerator.template.update',{id,fields:templateFields});}
 else{if(opts.canoniNativeTemplateId==='pending')throw Error('Importazione modello da verificare prima di ripetere.');await api('app.option.set',{options:{canoniNativeTemplateId:'pending'}});const r=await api('crm.documentgenerator.template.add',{fields:templateFields});id=recordId(r,'template');if(!id)throw Error('ID modello non leggibile.');await api('app.option.set',{options:{canoniNativeTemplateId:String(id)}});}
 $('client-diagnostics').textContent=JSON.stringify({quoteId:state.quoteId,templateId:id,fileId:result.fileId,field:printField.FIELD_NAME},null,2);
 await loadQuote(state.quoteId);status(`Modello nativo #${id} pronto. Nel Preventivo usa Documento → ${name}.`,'success');
}));
const wordCaseButton=el('button','Prepara prova Word completa','secondary');wordCaseButton.type='button';wordCaseButton.id='prepare-word-case';$('client-setup').querySelector('.actions').append(wordCaseButton);
function eightMeasure(text,bold){const ctx=document.createElement('canvas').getContext('2d');ctx.font=`${bold?'bold ':''}8pt Calibri,Arial`;return ctx.measureText(text).width*.75;}
for(const [label,action] of [
 ['Leggi stato canoni dinamici',async()=>{const m=await import('./word-eight-setup.mjs');return m.inspectWordEightState({call:api});}],
 ['Verifica indirizzo B2B',async()=>{const m=await import('./word-eight-setup.mjs');return m.inspectWordEightB2BAddresses({call:api});}],
 ['Completa indirizzo B2B dimostrativo',async()=>{const m=await import('./word-eight-setup.mjs');return m.completeWordEightB2BAddress({call:api});}],
 ['Prepara Word dinamico (8 colonne)',async()=>{const m=await import('./word-eight-setup.mjs');const r=await fetch(new URL('templates/novotecna-b2c-canoni-word-eight-native.docx',location.href));if(!r.ok)throw Error('Modello dinamico non disponibile.');let binary='';for(const b of new Uint8Array(await r.arrayBuffer()))binary+=String.fromCharCode(b);return m.prepareWordEightSetup({call:api,templateFile:btoa(binary),onProgress:status});}],
 ['Prepara Word dinamico B2B',async()=>{const m=await import('./word-eight-setup.mjs');const r=await fetch(new URL('templates/novotecna-b2b-canoni-word-eight-native.docx',location.href));if(!r.ok)throw Error('Modello B2B non disponibile.');let binary='';for(const b of new Uint8Array(await r.arrayBuffer()))binary+=String.fromCharCode(b);return m.prepareWordEightSetup({call:api,templateFile:btoa(binary),onProgress:status,profile:'B2B'});}],
 ['Prepara collaudo con 4 canoni',async()=>{const m=await import('./word-eight-setup.mjs');return m.prepareWordEightCase({call:api,measure:eightMeasure});}],
 ['Ripristina 4 canoni nel collaudo',async()=>{const m=await import('./word-eight-setup.mjs');return m.prepareWordEightCase({call:api,measure:eightMeasure,reset:true});}],
 ['Prepara collaudo B2B',async()=>{const m=await import('./word-eight-setup.mjs');return m.prepareWordEightB2BCase({call:api,measure:eightMeasure});}],
 ['Concludi configurazione canoni',async()=>{const m=await import('./word-eight-setup.mjs');const url=new URL('index.html',location.href);url.search='';url.hash='';return m.finalizeWordEight({call:api,documentHandler:url.href});}],
 ...[67,69].map(quoteId=>[`Allinea canoni del preventivo ${quoteId}`,async()=>{const m=await import('./word-eight-setup.mjs');return m.migrateWordEightQuote({call:api,quoteId,measure:eightMeasure});}])
]){const b=el('button',label,'secondary');b.type='button';$('client-setup').querySelector('.actions').append(b);b.addEventListener('click',()=>run(async()=>{if(state.dirty||state.formTouched)throw Error('Salva o annulla le modifiche prima della configurazione.');$('client-diagnostics').textContent='';status('Preparazione in corso…');const result=await action();$('client-diagnostics').textContent=JSON.stringify(result,null,2);status('Preparazione completata. Verifica il documento dal nome del modello.','success');resize();}));}
const directCaseButton=el('button','Prepara prova Word senza SPA','secondary');directCaseButton.type='button';$('client-setup').querySelector('.actions').append(directCaseButton);
const directUpdateButton=el('button','Aggiorna modello senza SPA','secondary');directUpdateButton.type='button';$('client-setup').querySelector('.actions').append(directUpdateButton);
directUpdateButton.addEventListener('click',()=>run(async()=>{
 const {updateDirectTemplate}=await import('./direct-setup.mjs');const response=await fetch(new URL('templates/novotecna-b2c-canoni-word-direct.docx',location.href));if(!response.ok)throw Error('Modello senza SPA non disponibile.');
 let binary='';for(const byte of new Uint8Array(await response.arrayBuffer()))binary+=String.fromCharCode(byte);
 const result=await updateDirectTemplate({call:api,templateFile:btoa(binary)});$('client-diagnostics').textContent=JSON.stringify(result,null,2);status('Modello senza SPA aggiornato. I dati salvati non sono cambiati.','success');
}));
directCaseButton.addEventListener('click',()=>run(async()=>{
 if(state.dirty||state.formTouched)throw Error('Completa e salva le modifiche prima di preparare la prova.');
 const {prepareDirectCase}=await import('./direct-setup.mjs');const response=await fetch(new URL('templates/novotecna-b2c-canoni-word-direct.docx',location.href));if(!response.ok)throw Error('Modello senza SPA non disponibile.');
 let binary='';for(const byte of new Uint8Array(await response.arrayBuffer()))binary+=String.fromCharCode(byte);
 const result=await prepareDirectCase({call:api,templateFile:btoa(binary),onProgress:status});$('client-diagnostics').textContent=JSON.stringify(result,null,2);await loadQuote(result.quoteId);status('Prova senza SPA pronta. Genera dal nome del modello nel menu Documento.','success');resize();
}));
const wordUpdateButton=el('button','Aggiorna modello Word','secondary');wordUpdateButton.type='button';$('client-setup').querySelector('.actions').append(wordUpdateButton);
wordUpdateButton.addEventListener('click',()=>run(async()=>{const {updateWordTemplate}=await import('./word-setup.mjs');const response=await fetch(new URL('templates/novotecna-b2c-canoni-word-native.docx',location.href));if(!response.ok)throw Error('Modello Word nativo non disponibile.');let binary='';for(const byte of new Uint8Array(await response.arrayBuffer()))binary+=String.fromCharCode(byte);const result=await updateWordTemplate({call:api,templateFile:btoa(binary)});$('client-diagnostics').textContent=JSON.stringify(result,null,2);status('Modello Word aggiornato. I preventivi e i documenti esistenti sono invariati.','success');resize();}));
const enableWord=el('button','Attiva percorso Word','secondary');enableWord.type='button';$('client-setup').querySelector('.actions').append(enableWord);
enableWord.addEventListener('click',()=>run(async()=>{
 if(state.dirty||state.formTouched)throw Error('Completa e salva il preventivo aperto prima di attivare il percorso Word.');
 const opts=await options();const type=(await api('crm.type.get',{id:Number(opts.canoniWordProbeTypeId)})).type;
 if(type?.code!=='NOVOTECNA_CANONI_WORD_TEST'||!Number(opts.canoniWordNativeTemplateId))throw Error('Preparazione Word da completare.');
 const schema=await api('crm.item.fields',{entityTypeId:Number(type.entityTypeId)});resolveWordFields(schema.fields||schema);
 const template=(await api('crm.documentgenerator.template.get',{id:Number(opts.canoniWordNativeTemplateId)})).template;
 if(template?.name!=='TEST Novotecna B2C — Word nativo'||template.active!=='Y')throw Error('Modello Word non disponibile.');
 await api('app.option.set',{options:{canoniWordEnabled:'Y'}});
 if(state.quoteId)await loadQuote(state.quoteId);
 status('Percorso Word attivo. I preventivi esistenti preparano la nuova tabella al prossimo «Salva canoni».','success');resize();
}));
wordCaseButton.addEventListener('click',()=>run(async()=>{
 if(state.dirty||state.formTouched)throw Error('Completa e salva le modifiche prima di preparare la copia di collaudo.');
 const {prepareWordCase}=await import('./word-case.mjs');const response=await fetch(new URL('templates/novotecna-b2c-canoni-word.docx',location.href));
 if(!response.ok)throw Error('Modello Word non disponibile.');let binary='';for(const byte of new Uint8Array(await response.arrayBuffer()))binary+=String.fromCharCode(byte);
 const result=await prepareWordCase({call:api,templateFile:btoa(binary),onProgress:status});$('client-diagnostics').textContent=JSON.stringify(result,null,2);
 await loadQuote(result.quoteId);
 if(state.wordPrint){changed();await save();}
 else{const t=await api('crm.documentgenerator.template.get',{id:result.templateId});const template=t.template||t;if(!state.templates.some(x=>Number(x.id)===result.templateId))state.templates.push(template);$('template').append(new Option(template.name,String(result.templateId)));$('template').value=String(result.templateId);}
 status('Copia Word pronta. Genera il documento dalla copia per controllare la descrizione estesa.','success');controls();resize();
}));
window.addEventListener('beforeunload',event=>{if(state.dirty||state.formTouched){event.preventDefault();event.returnValue='';}});
async function init(){
 document.documentElement.dataset.admin=new URLSearchParams(location.search).get('admin')==='1'?'true':'false';
 state.config=await (await fetch(new URL('config.json',location.href))).json();
 if(new URLSearchParams(location.search).has('demo')){
  state.demo=true;state.quoteId=1;state.rows=JSON.parse(localStorage.getItem('novotecna-canoni-demo')||'[]').map(normalizeRow);$('context').textContent='Anteprima interfaccia · dati dimostrativi, non collegati al CRM';$('editor').hidden=false;$('setup').hidden=true;render();status('');return;
 }
 if(window.parent===window){status('Apri questa app dal portale Bitrix24. Per la sola interfaccia locale usa il link Anteprima.');$('status').append(document.createTextNode(' '));const a=el('a','Anteprima');a.href='?demo=1';$('status').append(a);return;}
 if(!window.BX24)throw new Error('La libreria Bitrix24 non è raggiungibile.');
 await new Promise(resolve=>BX24.init(resolve));state.domain=requirePortal(BX24.getDomain(),state.config.allowedPortals);
 $('context').textContent='Gestione dei servizi ricorrenti';
 const context=placementContext(BX24.placement.info());
 // The main application is the configuration entry point; quote tabs keep the operator view.
 if(!context.quoteId&&context.mode==='editor')document.documentElement.dataset.admin='true';
 if(context.mode==='document'){await run(()=>openDocumentAction(context.quoteId));}
 else{$('setup').hidden=false;if(context.quoteId){await run(()=>loadQuote(context.quoteId));}else{$('open-panel').hidden=false;status('');}}
 controls();resize();
}
init().catch(error=>status(error.message,'error'));
