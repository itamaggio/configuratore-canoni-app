import {normalizeRow,displayAmount,decodeState} from './core.mjs';

export const WORD_FIELD='UF_CRM_NOVOTECNA_CANONI_WORD';
export const WORD_COLUMNS={description:'NOVO_DESCRIPTION',amount:'NOVO_TARIFFA',unitPeriod:'NOVO_UNITPER',reference:'NOVO_RIFERIMENTO',conditions:'NOVO_CONDIZIONI'};
export function wordCells(raw){
 const row=normalizeRow(raw);
 return {description:[row.description,row.notes].filter(Boolean).join('\n'),amount:displayAmount(row.amount),unitPeriod:[row.unit,row.period].filter(Boolean).join('\n'),reference:row.quantity,conditions:[row.duration&&`Durata: ${row.duration}`,row.start&&`Decorrenza: ${row.start}`].filter(Boolean).join('\n')};
}
export function resolveWordFields(schema,columns=WORD_COLUMNS){
 const fields={};
 for(const [column,suffix] of Object.entries(columns)){
  const matches=Object.entries(schema).filter(([key,v])=>String(v.upperName||key).replaceAll('_','').toUpperCase().endsWith(suffix.replaceAll('_','')));
  if(matches.length!==1)throw Error(`Il campo Word ${suffix} non è configurato correttamente.`);
  fields[column]=matches[0][0];
 }
 return fields;
}
function escaped(value){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;').replaceAll('\n','<br>');}
export function wordItemFields(raw,fieldMap){
 const row=normalizeRow(raw),cells=wordCells(row);
 const fields=Object.fromEntries(Object.entries(cells).map(([key,value])=>[fieldMap[key],'<p>'+escaped(value)+'</p>']));
 fields[fieldMap.description]=`<p><b>${escaped(row.description)}</b>${row.notes?'<br>'+escaped(row.notes):''}</p>`;
 return fields;
}
export function wordBindingIds(value){
 return Object.values(value||[]).map(v=>Number(String(v).split('_').at(-1)));
}
// Conservative budget for the validated client template (points, Calibri 8).
// This is a preflight, not a substitute for checking the final native PDF.
export function assertWordPageFits(rows,measure){
 const widths=[5103,851,1417,1276,1675].map(twips=>twips/20-4.5);
 function lines(text,width,bold){
  let count=0;
  for(const paragraph of String(text).split('\n')){
   let line='';count++;
   for(const word of paragraph.split(/\s+/)){
    if(measure((line?line+' ':'')+word,bold)>width){
     if(line){count++;line='';}
     if(measure(word,bold)>width){let chunk='';for(const ch of word){if(chunk&&measure(chunk+ch,bold)>width){count++;chunk='';}chunk+=ch;}line=chunk;}else line=word;
    }else line+=(line?' ':'')+word;
   }
  }
  return count;
 }
 let height=28.5;
 for(const raw of rows){
  const cells=Object.values(wordCells(raw));
  height+=Math.max(...cells.map((value,i)=>lines(value,widths[i],i===0)*9.6+(String(value).split('\n').length-1)*12))+16.5;
 }
 if(height>220)throw Error('Questi canoni superano lo spazio previsto per una pagina. Riduci il testo o il numero di voci. Le modifiche restano qui: il preventivo conserva l’ultima versione salvata.');
 return {estimatedHeightPt:height};
}
export async function saveWithWordProjection({quoteId,json,baseline,dataField,bindingField=WORD_FIELD,entityTypeId,fieldMap,call,additionalFields}){
 const saved=decodeState(json,quoteId);
 if(!Number.isSafeInteger(entityTypeId)||entityTypeId<1||!bindingField||Object.keys(WORD_COLUMNS).some(key=>!fieldMap?.[key]))throw Error('La tabella Word non è configurata. Contatta il referente.');
 const stale=quote=>{if((quote[dataField]||'')!==baseline)throw Error('I canoni sono stati modificati da un’altra sessione. Ricarica il preventivo prima di salvare.');};
 stale(await call('crm.quote.get',{id:quoteId}));
 // New revisions use new records: a partial write cannot alter the currently linked table.
 const records=saved.rows.length?saved.rows:[null],ids=[];
 for(let i=0;i<records.length;i++){
  const content=records[i]?wordItemFields(records[i],fieldMap):Object.fromEntries(Object.entries(fieldMap).map(([key,value])=>[value,key==='description'?'<p><b>Nessun canone previsto</b></p>':'<p>—</p>']));
  if(additionalFields)Object.assign(content,additionalFields(records[i]));
  const fields={title:`Canone preventivo ${quoteId} · ${i+1}`,xmlId:`NOVOTECNA_CANONI_Q${quoteId}_${saved.revision}_${i+1}`,...content};
  const added=await call('crm.item.add',{entityTypeId,fields});const id=Number(added.item?.id);
  if(!Number.isSafeInteger(id)||id<1)throw Error('La creazione della riga Word non è confermata. Ricarica i dati prima di riprovare.');
  const check=(await call('crm.item.get',{entityTypeId,id})).item;
  if(!check||Object.entries(content).some(([key,value])=>String(check[key]??'')!==value))throw Error('La rilettura non conferma il testo della tabella Word. Il preventivo conserva i dati precedenti.');
  ids.push(id);
 }
 const before=await call('crm.quote.get',{id:quoteId});stale(before);
 await call('crm.quote.update',{id:quoteId,fields:{[dataField]:json,[bindingField]:ids}});
 const quote=await call('crm.quote.get',{id:quoteId});
 if(quote[dataField]!==json||JSON.stringify(wordBindingIds(quote[bindingField]))!==JSON.stringify(ids)||['OPPORTUNITY','TAX_VALUE','CURRENCY_ID'].some(key=>quote[key]!==before[key]))throw Error('La rilettura non conferma il salvataggio completo. Ricarica i dati prima di generare; non ripetere il salvataggio alla cieca.');
 return {quote,ids};
}
