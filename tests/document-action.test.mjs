import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeState} from '../public/core.mjs';
import {createSavedDocument} from '../public/document-action.mjs';

const field='UF_CRM_NOVOTECNA_CANONI';
const rows=[{description:'O&M salvato',amount:'125,50',unit:'kWp',period:'Annuale',quantity:'10 kWp'}];
function fixture(saved=encodeState(66,rows,{templateId:10,type:'B2B'})){
 const calls=[];const quote={ID:'66',TITLE:'Prova',OPPORTUNITY:'1200.00',CURRENCY_ID:'EUR',TAX_VALUE:'216.39',[field]:saved};
 return {calls,quote,call:async(method,params)=>{calls.push({method,params});if(method==='crm.quote.get')return quote;if(method==='crm.documentgenerator.document.add')return {document:{id:64}};throw new Error('Operazione inattesa: '+method);}};
}
test('il comando Documento usa solo dati già salvati e non risalva il preventivo',async()=>{
 const f=fixture();let created=0;let pending=false;
 const doc=await createSavedDocument({quoteId:66,fieldName:field,call:f.call,onBeforeCreate:()=>{pending=true;},onCreated:d=>{created=d.id;}});
 assert.equal(doc.id,64);assert.equal(created,64);assert.equal(pending,true);
 assert.deepEqual(f.calls.map(c=>c.method),['crm.quote.get','crm.documentgenerator.document.add','crm.quote.get']);
 assert.equal(f.calls[1].params.values.Canoni[0].Amount,'125,50 €');
 assert.equal(f.calls[1].params.templateId,10);
});
test('senza modello salvato non genera finché non viene scelto un modello',async()=>{
 const f=fixture(encodeState(66,rows,{templateId:0}));
 await assert.rejects(createSavedDocument({quoteId:66,fieldName:field,call:f.call}),/modello/i);
 assert.equal(f.calls.length,1);
 const doc=await createSavedDocument({quoteId:66,fieldName:field,call:f.call,templateId:11});
 assert.equal(doc.id,64);assert.equal(f.calls.find(c=>c.method.endsWith('document.add')).params.templateId,11);
});
test('non genera da canoni assenti, corrotti o appartenenti a un altro preventivo',async()=>{
 for(const raw of ['', '{corrotto}', encodeState(99,rows,{templateId:10})]){
  const f=fixture(raw);await assert.rejects(createSavedDocument({quoteId:66,fieldName:field,call:f.call}));
  assert.ok(!f.calls.some(c=>c.method.endsWith('document.add')));
 }
});
test('conserva l’ID del documento anche se il controllo successivo fallisce',async()=>{
 const f=fixture();let reads=0;let created;
 const call=async(method,params)=>{const result=await f.call(method,params);if(method==='crm.quote.get'&&++reads===2)return {...result,OPPORTUNITY:'1400'};return result;};
 await assert.rejects(createSavedDocument({quoteId:66,fieldName:field,call,onCreated:d=>{created=d.id;}}),/64/);
 assert.equal(created,64);
});
