import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeState} from '../public/core.mjs';
import * as word from '../public/word-projection.mjs';

test('la proiezione Word conserva testo e tutti gli attributi senza calcolare corrispettivi',async()=>{
 const module=await import('../public/word-projection.mjs').catch(()=>({}));
 assert.equal(typeof module.wordCells,'function','Manca la proiezione delle righe Word');
 const source={description:'Servizio O&M\nDescrizione <completa>',amount:'97',unit:'kWp',period:'Annuale',quantity:'10 kWp',duration:'Contratto',start:'Attivazione',notes:'Nota & condizioni'};
 const before=JSON.stringify(source);const cells=module.wordCells(source);
 assert.equal(cells.description,'Servizio O&M\nDescrizione <completa>\nNota & condizioni');
 assert.equal(cells.amount,'97,00 €');assert.equal(cells.unitPeriod,'kWp\nAnnuale');assert.equal(cells.reference,'10 kWp');
 assert.equal(cells.conditions,'Durata: Contratto\nDecorrenza: Attivazione');assert.equal(JSON.stringify(source),before);
 assert.ok(!Object.keys(cells).some(k=>/total|sum/i.test(k)));
});

const row={id:'om',description:'O&M <servizio>',amount:'97',unit:'kWp',period:'Annuale',quantity:'10 kWp',duration:'Contratto',start:'Attivazione',notes:'Nota & condizioni'};
const fieldMap={description:'ufDesc',amount:'ufAmount',unitPeriod:'ufUnit',reference:'ufRef',conditions:'ufTerms'};
test('i campi Word trattano il testo operatore come testo e mantengono la descrizione in grassetto',()=>{
 const fields=word.wordItemFields(row,fieldMap);
 assert.match(fields.ufDesc,/<b>O&amp;M &lt;servizio&gt;<\/b>/);
 assert.ok(fields.ufDesc.includes('Nota &amp; condizioni'));
});
function fixture({stale=false,incomplete=false,empty=false,rows=[row],race=false}={}){
 const json=encodeState(68,empty?[]:rows);const baseline='old';const calls=[],items=new Map();let reads=0;let stored={UF_DATA:stale?'other':baseline,OPPORTUNITY:'12078.00',TAX_VALUE:'2178.00',CURRENCY_ID:'EUR'};
 const call=async(method,params)=>{
  calls.push({method,params});
  if(method==='crm.quote.get'){reads++;return {...stored,...(race&&reads===2?{UF_DATA:'new session'}:{})};}
  if(method==='crm.item.add'){const id=101+items.size;items.set(id,params.fields);return {item:{id}};}
  if(method==='crm.item.get')return {item:items.get(params.id)};
  if(method==='crm.quote.update'){stored={...stored,...params.fields};if(incomplete)stored.UF_WORD=[];return true;}
  throw Error(method);
 };
 return {json,baseline,calls,call,args:{quoteId:68,json,baseline,dataField:'UF_DATA',bindingField:'UF_WORD',entityTypeId:1074,fieldMap,call}};
}
test('salva la proiezione Word e collega dati e righe insieme senza toccare prodotti o totali',async()=>{
 const f=fixture();assert.equal(typeof word.saveWithWordProjection,'function');
 const result=await word.saveWithWordProjection(f.args);
 const update=f.calls.find(c=>c.method==='crm.quote.update');
 assert.deepEqual(Object.keys(update.params.fields),['UF_DATA','UF_WORD']);assert.deepEqual(update.params.fields.UF_WORD,[101]);
 assert.equal(result.quote.OPPORTUNITY,'12078.00');assert.equal(result.quote.UF_DATA,f.json);
 assert.ok(f.calls.find(c=>c.method==='crm.item.add').params.fields.xmlId.includes('Q68_'));
});
test('una sessione superata non crea proiezioni e non sovrascrive il preventivo',async()=>{
 const f=fixture({stale:true});await assert.rejects(word.saveWithWordProjection(f.args),/altra sessione/);
 assert.equal(f.calls.length,1);
});
test('conserva ordine e tariffa delle due righe anche se le quantità sono differenti',async()=>{
 const f=fixture({rows:[row,{...row,id:'assist',description:'Assistenza',amount:'15',quantity:'100 impianti'}]});await word.saveWithWordProjection(f.args);
 const update=f.calls.find(c=>c.method==='crm.quote.update');assert.deepEqual(update.params.fields.UF_WORD,[101,102]);
 assert.ok(f.calls.filter(c=>c.method==='crm.item.add')[1].params.fields.ufAmount.includes('15,00 €'));
});
test('un cambiamento durante la preparazione non sostituisce la tabella già collegata',async()=>{
 const f=fixture({race:true});await assert.rejects(word.saveWithWordProjection(f.args),/altra sessione/);
 assert.equal(f.calls.filter(c=>c.method==='crm.quote.update').length,0);
});
test('un esito incompleto non ripete la scrittura e lascia un messaggio di verifica',async()=>{
 const f=fixture({incomplete:true});await assert.rejects(word.saveWithWordProjection(f.args),/non conferma/);
 assert.equal(f.calls.filter(c=>c.method==='crm.quote.update').length,1);
});
test('la lista vuota produce una riga esplicita e nessun importo fittizio',async()=>{
 const f=fixture({empty:true});await word.saveWithWordProjection(f.args);
 const fields=f.calls.find(c=>c.method==='crm.item.add').params.fields;
 assert.ok(fields.ufDesc.includes('Nessun canone previsto'));assert.ok(!fields.ufAmount.includes('0,00'));
});
test('la pagina Word accetta una descrizione estesa e rifiuta un elenco troppo alto prima del salvataggio',()=>{
 assert.equal(typeof word.assertWordPageFits,'function');
 const measure=(text)=>text.length*4;
 assert.doesNotThrow(()=>word.assertWordPageFits([{...row,description:'Manutenzione ordinaria del sistema fotovoltaico. '.repeat(14),notes:''},{...row,notes:''}],measure));
 assert.doesNotThrow(()=>word.assertWordPageFits([row,row,row],measure));
 assert.throws(()=>word.assertWordPageFits(Array.from({length:15},()=>row),measure),/pagina/);
});
