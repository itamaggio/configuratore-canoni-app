export const ROW_FIELDS=['description','amount','unit','period','quantity','duration','start','notes'];
export function normalizeAmount(raw){
 let s=String(raw??'').trim();
 if(/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(s))s=s.replaceAll('.','').replace(',','.');
 else if(/^\d+(?:[.,]\d{1,2})?$/.test(s))s=s.replace(',','.');
 else throw new Error('Inserisci una tariffa valida, ad esempio 97,00 oppure 1.250,50.');
 let [whole,decimal='']=s.split('.');whole=whole.replace(/^0+(?=\d)/,'');
 if(whole.length>9)throw new Error('La tariffa supera il limite del prototipo.');
 return `${whole}.${decimal.padEnd(2,'0')}`;
}
export function normalizeRow(raw){
 const row={};
 for(const key of ROW_FIELDS){row[key]=String(raw[key]??'').trim();if(row[key].length>(key==='notes'?2000:300))throw new Error('Uno dei campi è troppo lungo.');}
 if(!row.description)throw new Error('Inserisci la descrizione del canone.');
 row.amount=normalizeAmount(row.amount);
 row.id=String(raw.id||crypto.randomUUID());
 return row;
}
function positiveId(value){const id=Number(value);if(!Number.isSafeInteger(id)||id<1)throw new Error('Identificativo non valido.');return id;}
export function encodeState(quoteId,rows,{type='B2C',templateId=0}={}){
 if(!['B2B','B2C'].includes(type))throw new Error('Tipologia documento non valida.');
 if(!Array.isArray(rows)||rows.length>30)throw new Error('Il prototipo ammette fino a 30 canoni.');
 const state={version:1,quoteId:positiveId(quoteId),revision:crypto.randomUUID(),type,templateId:Number(templateId)||0,rows:rows.map(normalizeRow)};
 const json=JSON.stringify(state);if(new TextEncoder().encode(json).length>45000)throw new Error('I dati superano la dimensione prevista dal prototipo.');
 return json;
}
export function decodeState(raw,quoteId){
 if(!raw)return {version:1,quoteId:positiveId(quoteId),type:'B2C',templateId:0,rows:[]};
 let s;try{s=JSON.parse(raw);}catch{throw new Error('I dati canone salvati non sono leggibili. Nessun dato è stato sovrascritto.');}
 if(s.version!==1||s.quoteId!==positiveId(quoteId)||!Array.isArray(s.rows)||s.rows.length>30||!['B2B','B2C'].includes(s.type))throw new Error('I dati salvati hanno uno schema o un preventivo diverso.');
 return {...s,rows:s.rows.map(normalizeRow)};
}
export function displayAmount(raw){return new Intl.NumberFormat('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(normalizeAmount(raw)))+' €';}
export function documentPayload(quoteId,templateId,rows){
 const columns={Description:'description',Amount:'amount',Unit:'unit',Period:'period',Quantity:'quantity',Duration:'duration',Start:'start',Notes:'notes'};
 const values={Canoni:rows.map(normalizeRow).map(row=>Object.fromEntries(Object.entries(columns).map(([k,v])=>[k,v==='amount'?displayAmount(row[v]):row[v]])))};
 for(const key of Object.keys(columns))values[`CanoniItem${key}`]=`Canoni.Item.${key}`;
 return {templateId:positiveId(templateId),entityTypeId:7,entityId:positiveId(quoteId),values,fields:{Canoni:{PROVIDER:'Bitrix\\DocumentGenerator\\DataProvider\\ArrayDataProvider',OPTIONS:{ITEM_NAME:'Item',ITEM_PROVIDER:'Bitrix\\DocumentGenerator\\DataProvider\\HashDataProvider'}}},stampsEnabled:0};
}
export function requirePortal(domain,allowed){if(!allowed.includes(domain))throw new Error('Questo prototipo è configurato esclusivamente per il portale di test.');return domain;}
export function placementContext(info={}){
 const mode=info.placement==='CRM_QUOTE_DOCUMENTGENERATOR_BUTTON'?'document':'editor';
 const raw=mode==='document'?info.options?.ENTITY_ID:info.options?.ID;
 return {mode,quoteId:raw?positiveId(raw):(mode==='document'?positiveId(raw):0)};
}
