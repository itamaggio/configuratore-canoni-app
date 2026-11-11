import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeState,decodeState} from '../public/core.mjs';

const row={id:'a',description:'O&M <servizio>',amount:'97',unit:'kWp',period:'Annuale',quantity:'10 kWp',duration:'36 mesi',start:'Dal collaudo',notes:'Nota & condizioni'};
const legacy={description:'oldDesc',amount:'tariffa',unitPeriod:'oldUnit',reference:'qty',conditions:'oldTerms'};
const eight={description:'name',amount:'tariffa',unit:'unit',period:'period',quantity:'qty',duration:'duration',start:'start',notes:'notes'};

test('la revisione distingue i canoni già pronti per le otto colonne',()=>{
 const json=encodeState(71,[row],{wordLayout:8});assert.equal(decodeState(json,71).wordLayout,8);
});

test('otto colonne indipendenti conservano testo e tariffa senza calcoli',async()=>{
 const m=await import('../public/word-eight.mjs').catch(()=>({}));assert.equal(typeof m.wordEightCells,'function');
 const cells=m.wordEightCells(row);assert.deepEqual(cells,{description:row.description,amount:'97,00 €',unit:'kWp',period:'Annuale',quantity:'10 kWp',duration:'36 mesi',start:'Dal collaudo',notes:'Nota & condizioni'});
 const fields=m.wordEightItemFields(row,eight);assert.match(fields.name,/<b>O&amp;M &lt;servizio&gt;<\/b>/);assert.equal(fields.notes,'<p>Nota &amp; condizioni</p>');
 assert.ok(!fields.name.includes('Nota'));assert.equal(Object.keys(fields).length,8);
});
test('le celle facoltative vuote non inseriscono tag HTML nel documento',async()=>{
 const m=await import('../public/word-eight.mjs');const fields=m.wordEightItemFields({...row,notes:'',duration:'',start:''},eight);
 assert.equal(fields.notes,'');assert.equal(fields.duration,'');assert.equal(fields.start,'');
});
test('quattro canoni creano quattro righe ordinate senza toccare prodotti o totali',async()=>{
 const m=await import('../public/word-eight.mjs').catch(()=>({}));assert.equal(typeof m.saveWithWordEightProjection,'function');
 const rows=Array.from({length:4},(_,i)=>({...row,id:String(i),description:'Canone '+i,amount:String(i+1),notes:i===0?'':row.notes}));
 const json=encodeState(71,rows),calls=[],items=new Map();let quote={DATA:'before',OPPORTUNITY:'12078',TAX_VALUE:'2178',CURRENCY_ID:'EUR'};
 const call=async(method,params)=>{calls.push({method,params});if(method==='crm.quote.get')return {...quote};if(method==='crm.item.add'){const id=101+items.size;items.set(id,params.fields);return {item:{id}};}if(method==='crm.item.get')return {item:Object.fromEntries(Object.entries(items.get(params.id)).map(([k,v])=>[k,v===''?null:v]))};if(method==='crm.quote.update'){quote={...quote,...params.fields};return true;}throw Error(method);};
 await m.saveWithWordEightProjection({quoteId:71,json,baseline:'before',dataField:'DATA',bindingField:'ROWS',entityTypeId:1074,fieldMap:legacy,eightFieldMap:eight,call});
 assert.deepEqual(quote.ROWS,[101,102,103,104]);assert.deepEqual(Object.keys(calls.find(c=>c.method==='crm.quote.update').params.fields),['DATA','ROWS']);
 assert.equal(items.get(104).name,'<p><b>Canone 3</b></p>');assert.equal(items.get(104).tariffa,'<p>4,00 €</p>');assert.equal(items.get(104).oldUnit,'<p>kWp<br>Annuale</p>');assert.equal(quote.OPPORTUNITY,'12078');
});
test('il controllo della pagina considera le sole righe presenti, senza limite fisso di tre',async()=>{
 const m=await import('../public/word-eight.mjs').catch(()=>({}));assert.equal(typeof m.assertWordEightPageFits,'function');
 const short={...row,description:'Servizio',notes:'',duration:'',start:'',quantity:''};const measure=s=>s.length*3.5;
 assert.doesNotThrow(()=>m.assertWordEightPageFits(Array.from({length:4},()=>short),measure));
 assert.ok(m.assertWordEightPageFits([short],measure).estimatedHeightPt<m.assertWordEightPageFits([short,short],measure).estimatedHeightPt);
 assert.throws(()=>m.assertWordEightPageFits(Array.from({length:20},()=>row),measure),/pagina/);
});
