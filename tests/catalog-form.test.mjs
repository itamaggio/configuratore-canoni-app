import test from 'node:test';
import assert from 'node:assert/strict';

test('la scelta del catalogo riporta solo il nome e conserva la tariffa e le condizioni inserite',async()=>{
 const m=await import('../public/catalog.mjs').catch(()=>({}));assert.equal(typeof m.useCatalogName,'function');
 const current={description:'Prima',amount:'97,00',unit:'kWp',period:'Annuale',quantity:'10 kWp',duration:'36 mesi',start:'Dal secondo anno',notes:'Nota'};
 const next=m.useCatalogName(current,{ID:'3',NAME:'Servizio O&M',PRICE:'999',DESCRIPTION:'Descrizione catalogo',MEASURE:'kW'});
 assert.deepEqual(next,{...current,description:'Servizio O&M'});assert.equal(current.description,'Prima');
});
test('la ricerca richiede esclusivamente ID e nome del catalogo',async()=>{
 const m=await import('../public/catalog.mjs').catch(()=>({}));assert.equal(typeof m.searchCatalogNames,'function');
 const calls=[];const result=await m.searchCatalogNames({query:'virtuale',call:async(method,params)=>{calls.push({method,params});return [{ID:'3',NAME:'Sistema Virtuale',PRICE:999}];}});
 assert.equal(calls[0].method,'crm.product.list');assert.deepEqual(calls[0].params.select,['ID','NAME']);assert.equal(calls[0].params.filter['%NAME'],'virtuale');
 assert.deepEqual(result,[{id:'3',name:'Sistema Virtuale'}]);
});
test('i menu conservano le opzioni originali e i valori precedentemente salvati',async()=>{
 const m=await import('../public/form-options.mjs').catch(()=>({}));assert.equal(typeof m.optionsFor,'function');
 for(const [field,values] of Object.entries({unit:['kW','Fisso','Impianto','Dispositivo','Colonnina','Utente','Contratto','Altro'],period:['Annuale','Mensile','Bimestrale','Trimestrale','Semestrale','Personalizzata'],duration:['','12 mesi','24 mesi','36 mesi','48 mesi','60 mesi','Tempo indeterminato','Da concordare'],start:['','Immediata','Dalla firma',"Dall'attivazione",'Dal collaudo','Dal secondo anno','Da concordare']})){
  const options=m.optionsFor(field).map(x=>x.value);for(const value of values)assert.ok(options.includes(value),field+': '+value);
 }
 assert.ok(m.optionsFor('duration','14').some(x=>x.value==='14'));
 assert.ok(m.optionsFor('start','Dall’attivazione').some(x=>x.value==='Dall’attivazione'));
});
