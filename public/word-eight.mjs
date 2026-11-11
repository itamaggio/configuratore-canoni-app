import {ROW_FIELDS,normalizeRow,displayAmount} from './core.mjs';
import {resolveWordFields,saveWithWordProjection} from './word-projection.mjs';

export const WORD_EIGHT_COLUMNS={description:'NOVO_NAME',amount:'NOVO_TARIFFA',unit:'NOVO_UNIT',period:'NOVO_PERIOD',quantity:'NOVO_RIFERIMENTO',duration:'NOVO_DURATION',start:'NOVO_START',notes:'NOVO_NOTES'};
export const WORD_EIGHT_WIDTHS=[3600,700,800,900,800,900,1150,1472];
export function resolveWordEightFields(schema){return resolveWordFields(schema,WORD_EIGHT_COLUMNS);}
export function wordEightCells(raw){const row=normalizeRow(raw);return Object.fromEntries(ROW_FIELDS.map(key=>[key,key==='amount'?displayAmount(row[key]):row[key]]));}
function escape(value){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;').replaceAll('\n','<br>');}
export function wordEightItemFields(raw,fieldMap){
 if(Object.keys(WORD_EIGHT_COLUMNS).some(key=>!fieldMap?.[key]))throw Error('Le otto colonne Word non sono configurate. Contatta il referente.');
 const cells=raw?wordEightCells(raw):Object.fromEntries(ROW_FIELDS.map(key=>[key,key==='description'?'Nessun canone previsto':'—']));
 return Object.fromEntries(Object.entries(cells).map(([key,value])=>[fieldMap[key],value===''?'':key==='description'?`<p><b>${escape(value)}</b></p>`:`<p>${escape(value)}</p>`]));
}
export function assertWordEightPageFits(rows,measure){
 const widths=WORD_EIGHT_WIDTHS.map(w=>w/20-4.5);
 function lines(value,width,bold){
  let count=0;
  for(const paragraph of String(value).split('\n')){
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
 for(const raw of rows){const cells=wordEightCells(raw);height+=Math.max(...ROW_FIELDS.map((key,col)=>lines(cells[key],widths[col],col===0)))*9.6+4.5;}
 if(height>260)throw Error('I canoni superano lo spazio disponibile su una pagina. Riduci descrizioni o note; le modifiche restano aperte e il preventivo conserva l’ultima versione salvata.');
 return {estimatedHeightPt:height};
}
export async function saveWithWordEightProjection({eightFieldMap,...args}){
 wordEightItemFields(null,eightFieldMap);
 return saveWithWordProjection({...args,additionalFields:row=>wordEightItemFields(row,eightFieldMap)});
}
