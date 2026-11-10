import {normalizeRow,displayAmount,decodeState} from './core.mjs';
export const PRINT_FIELD='UF_CRM_NOVOTECNA_CANONI_STAMPA';
export const PRINT_XML_ID='NOVOTECNA_CANONI_NATIVE_PRINT_V1';
export const PRINT_CODE='UfCrmNovotecnaCanoniStampa';
export function nativeTableContent(rows){
 return rows.map(normalizeRow).map(r=>[[r.description],[displayAmount(r.amount)],[r.unit,r.period],[r.quantity],[r.duration&&`Durata: ${r.duration}`,r.start&&`Decorrenza: ${r.start}`,r.notes].filter(Boolean)]);
}
export function renderNativeTable(rows){
 // Keep the aspect ratio in sync with the placeholder in build_native_template.py.
 // The compact frame keeps both full services and the native totals on the offer page.
 const width=2200,height=760,padding=18,lineHeight=42,fontSize=34;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');ctx.font=`${fontSize}px Arial`;ctx.textBaseline='top';
 const widths=[540,260,330,320,750];
 function wrap(text,max){
  const result=[];let line='';
  for(const word of String(text).split(/\s+/)){
   if(ctx.measureText(word).width>max){
    if(line){result.push(line);line='';}
    let chunk='';for(const char of word){if(ctx.measureText(chunk+char).width>max){result.push(chunk);chunk='';}chunk+=char;}line=chunk;continue;
   }
   const candidate=line?line+' '+word:word;
   if(line&&ctx.measureText(candidate).width>max){result.push(line);line=word;}else line=candidate;
  }
  if(line||!result.length)result.push(line);return result;
 }
 const headers=['Canone / servizio','Tariffa + IVA','Unità e periodicità','Riferimento','Condizioni'];
 const headerLines=headers.map((s,i)=>wrap(s,widths[i]-2*padding));
 const headerHeight=Math.max(...headerLines.map(a=>a.length))*lineHeight+2*padding;
 const contents=nativeTableContent(rows).map(cells=>cells.map((values,i)=>values.flatMap(s=>wrap(s,widths[i]-2*padding))));
 if(!contents.length)contents.push([['Nessun canone previsto'],['—'],['—'],['—'],['—']]);
 const heights=contents.map(c=>Math.max(...c.map(a=>a.length))*lineHeight+2*padding);
 const required=headerHeight+heights.reduce((a,b)=>a+b,0);
 if(required>height)throw Error('La tabella supera lo spazio del modello. Riduci le note o rimuovi una voce e riprova. Le modifiche restano aperte in questa scheda; il preventivo conserva l’ultima versione salvata. Per elenchi più lunghi, contatta il referente.');
 const extra=(height-required)/heights.length;
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);
 function draw(cells,y,h,header=false){
  let x=0;
  ctx.font=`${header?'bold ':''}${fontSize}px Arial`;
  for(let i=0;i<cells.length;i++){
   ctx.fillStyle=header?'#e7e6e6':'#ffffff';ctx.fillRect(x,y,widths[i],h);
   ctx.strokeStyle='#cfcfcf';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,widths[i]-2,h-2);
   ctx.fillStyle='#111111';const top=y+(h-cells[i].length*lineHeight)/2;
   cells[i].forEach((line,k)=>ctx.fillText(line,x+padding,top+k*lineHeight));x+=widths[i];
  }
 }
 draw(headerLines,0,headerHeight,true);let y=headerHeight;
 contents.forEach((cells,i)=>{const h=heights[i]+extra;draw(cells,y,h);y+=h;});
 return {base64:canvas.toDataURL('image/png').split(',')[1],width,height};
}
export async function saveWithNativePrint({quoteId,json,dataField,imageField,base64,call}){
 decodeState(json,quoteId);
 if(!base64||base64.length>4000000)throw Error('Immagine canoni non valida o troppo grande.');
 await call('crm.quote.update',{id:quoteId,fields:{[dataField]:json,[imageField]:{fileData:[`canoni-${quoteId}.png`,base64]}}});
 const check=await call('crm.quote.get',{id:quoteId});
 const fileId=Number(check[imageField]?.id||check[imageField]?.ID||check[imageField]);
 if(check[dataField]!==json||!fileId)throw Error('Il CRM non conferma il salvataggio completo dei canoni e della tabella di stampa. Ricarica prima di generare.');
 return {quote:check,fileId};
}
