import {ROW_FIELDS,normalizeRow,decodeState,displayAmount} from './core.mjs';
export const DIRECT_SLOTS=3;
export const DIRECT_COLUMNS=['DESC','AMOUNT','UNIT','PERIOD','QTY','DURATION','START','NOTES'];
export function directName(slot,column){return `UF_CRM_NOVO_C${slot}_${column}`;}
function literal(value){
 // Plain text keeps the template's run formatting. Escape text that could be HTML.
 if(!/[<>]/.test(value))return value;
 return '<p>'+value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\n','<br>')+'</p>';
}
export function directFields(rows){
 if(rows.length>DIRECT_SLOTS)throw Error('Questo modello di prova ammette al massimo 3 canoni. Le modifiche restano aperte.');
 const normalized=rows.map(normalizeRow),fields={};
 for(let slot=1;slot<=DIRECT_SLOTS;slot++){
  const row=normalized[slot-1];
  for(let i=0;i<ROW_FIELDS.length;i++){
   const key=ROW_FIELDS[i];fields[directName(slot,DIRECT_COLUMNS[i])]=row?literal(key==='amount'?displayAmount(row.amount):row[key]):'';
  }
 }
 return fields;
}
export function assertDirectPageFits(rows,measure){
 directFields(rows);
 const widths=[3600,700,800,900,800,900,1150,1472].map(w=>w/20-4.5);
 function lineCount(text,width,bold){
  let count=0;
  for(const paragraph of String(text).split('\n')){
   let line='';count++;
   for(const word of paragraph.split(/\s+/)){
    if(measure((line?line+' ':'')+word,bold)<=width){line+=(line?' ':'')+word;continue;}
    if(line){count++;line='';}
    for(const ch of word){if(line&&measure(line+ch,bold)>width){count++;line='';}line+=ch;}
   }
  }
  return count;
 }
 let height=28.5;
 for(let i=0;i<DIRECT_SLOTS;i++){
  const row=rows[i]?normalizeRow(rows[i]):null;
  height+=Math.max(...ROW_FIELDS.map((key,col)=>lineCount(row?(key==='amount'?displayAmount(row.amount):row[key]):'',widths[col],col===0)))*9.6+4.5;
 }
 if(height>260)throw Error('Il testo supera lo spazio previsto per una pagina del modello di prova. Riduci descrizioni o note; le modifiche restano aperte.');
 return {estimatedHeightPt:height};
}
export async function saveWithDirectFields({quoteId,json,baseline,dataField,call}){
 const saved=decodeState(json,quoteId),projection=directFields(saved.rows);
 const before=await call('crm.quote.get',{id:quoteId});
 if((before[dataField]||'')!==baseline)throw Error('I canoni sono stati modificati da un’altra sessione. Ricarica il preventivo prima di salvare.');
 await call('crm.quote.update',{id:quoteId,fields:{[dataField]:json,...projection}});
 const quote=await call('crm.quote.get',{id:quoteId});
 if(quote[dataField]!==json||Object.entries(projection).some(([key,value])=>String(quote[key]||'')!==value)||['OPPORTUNITY','TAX_VALUE','CURRENCY_ID'].some(key=>String(quote[key]??'')!==String(before[key]??'')))throw Error('La rilettura non conferma il salvataggio completo. Ricarica i dati prima di generare.');
 return {quote};
}
