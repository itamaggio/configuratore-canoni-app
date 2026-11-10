import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeTableContent,renderNativeTable,saveWithNativePrint} from '../public/native-print.mjs';
import {encodeState} from '../public/core.mjs';
const row={description:'Servizio O&M',amount:'97',unit:'kWp',period:'Annuale',quantity:'10 kWp',duration:'Contratto',start:'Attivazione',notes:'Anticipato'};
function withCanvas(check){
 const drawn=[];let encoded=false;
 const context={font:'',measureText:s=>({width:s.length*17}),fillRect(){},strokeRect(){},fillText:s=>drawn.push(s)};
 const canvas={getContext:()=>context,toDataURL:()=>{encoded=true;return 'data:image/png;base64,cHJvdmE=';}};
 const previous=globalThis.document;globalThis.document={createElement:()=>canvas};
 try{check({drawn,encoded:()=>encoded});}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
}
test('la stampa senza canoni dichiara esplicitamente che non sono previsti',()=>withCanvas(({drawn})=>{
 renderNativeTable([]);assert.ok(drawn.includes('Nessun canone previsto'));
}));
test('un testo eccessivo viene rifiutato senza produrre una stampa troncata',()=>withCanvas(({encoded,drawn})=>{
 assert.throws(()=>renderNativeTable([{...row,notes:'Condizione lunga. '.repeat(100)}]),/spazio|tabella/);
 assert.equal(encoded(),false);assert.equal(drawn.length,0);
}));
test('i due canoni completi del preventivo 67 entrano senza tagliare testo o ridurre il carattere',()=>{
 const drawn=[];const sizes=[];
 const ctx={font:'',measureText:s=>({width:s.length*17}),fillRect(){},strokeRect(){},fillText(text,x,y){drawn.push({text,x,y,font:this.font});}};
 const canvas={width:0,height:0,getContext:()=>ctx,toDataURL:()=>{sizes.push([canvas.width,canvas.height]);return 'data:image/png;base64,cHJvdmE=';}};
 const previous=globalThis.document;globalThis.document={createElement:()=>canvas};
 try{
  const result=renderNativeTable([
   {...row,description:'Servizio O&M del Sistema Virtuale',quantity:'10 kWp',duration:'Per tutta la durata del contratto',start:'Dall’attivazione del Sistema Virtuale',notes:'Fatturazione annuale anticipata tramite SDD. Tariffa al netto IVA; dato dimostrativo.'},
   {...row,description:'Assistenza Tecnica Aggiuntiva',amount:'15',unit:'Impianto',period:'Mensile',quantity:'1 impianto',duration:'12 Mesi',start:"Dall'attivazione del servizio",notes:'Servizio opzionale. Dati esclusivamente dimostrativi.'}
  ]);
  const text=drawn.map(x=>x.text).join(' ');
  for(const expected of ['97,00 €','15,00 €','Per tutta la durata del contratto','Fatturazione annuale anticipata tramite SDD.','Servizio opzionale. Dati esclusivamente dimostrativi.'])assert.ok(text.includes(expected),expected);
  assert.ok(drawn.every(x=>x.y>=0&&x.y+42<=result.height));
  assert.ok(drawn.every(x=>x.font.includes('34px')));
  assert.equal(result.width,2200);assert.equal(result.height,760);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
test('la proiezione espone tutti gli attributi senza calcolare importi',()=>{
 const cells=nativeTableContent([row])[0];
 assert.deepEqual(cells,[['Servizio O&M'],['97,00 €'],['kWp','Annuale'],['10 kWp'],['Durata: Contratto','Decorrenza: Attivazione','Anticipato']]);
});
test('il salvataggio aggiorna dati e stampa insieme senza riscrivere prodotti o totali',async()=>{
 const json=encodeState(67,[row],{templateId:11});let fields;
 const result=await saveWithNativePrint({quoteId:67,json,dataField:'UF_DATA',imageField:'UF_IMAGE',base64:'iVBORw0KGgo=test',call:async(m,p)=>{
  if(m==='crm.quote.update'){fields=p.fields;return true;}
  if(m==='crm.quote.get')return {UF_DATA:json,UF_IMAGE:123};
  throw Error(m);
 }});
 assert.deepEqual(Object.keys(fields),['UF_DATA','UF_IMAGE']);
 assert.deepEqual(fields.UF_IMAGE,{fileData:['canoni-67.png','iVBORw0KGgo=test']});
 assert.equal(result.fileId,123);
});
test('rifiuta la proiezione di un altro preventivo prima di scrivere',async()=>{
 let calls=0;await assert.rejects(saveWithNativePrint({quoteId:67,json:encodeState(66,[row]),dataField:'UF_DATA',imageField:'UF_IMAGE',base64:'x',call:async()=>{calls++;}}));assert.equal(calls,0);
});
test('una rilettura incompleta viene segnalata senza ripetere la scrittura',async()=>{
 let calls=0;const json=encodeState(67,[row]);
 await assert.rejects(saveWithNativePrint({quoteId:67,json,dataField:'UF_DATA',imageField:'UF_IMAGE',base64:'cHJvdmE=',call:async(method)=>{
  calls++;return method==='crm.quote.update'?true:{UF_DATA:'valore precedente',UF_IMAGE:123};
 }}),/non conferma/);
 assert.equal(calls,2);
});
