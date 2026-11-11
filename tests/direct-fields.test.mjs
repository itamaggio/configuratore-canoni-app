import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeState} from '../public/core.mjs';
const row={description:'O&M del Sistema Virtuale',amount:'97',unit:'kWp',period:'Annuale',quantity:'10 kWp',duration:'Contratto',start:'Attivazione',notes:'Nota & condizioni'};
test('otto campi per canone, senza somme e con pulizia delle righe rimosse',async()=>{
 const m=await import('../public/direct-fields.mjs').catch(()=>({}));assert.equal(typeof m.directFields,'function');
 const fields=m.directFields([row]);assert.equal(Object.keys(fields).length,24);
 assert.equal(fields.UF_CRM_NOVO_C1_AMOUNT,'97,00 €');assert.equal(fields.UF_CRM_NOVO_C1_QTY,'10 kWp');
 assert.equal(fields.UF_CRM_NOVO_C1_NOTES,'Nota & condizioni');assert.equal(fields.UF_CRM_NOVO_C2_DESC,'');assert.equal(fields.UF_CRM_NOVO_C3_AMOUNT,'');
 assert.throws(()=>m.directFields([row,row,row,row]),/3 canoni/);
});
test('il salvataggio usa solo i campi del preventivo e rilegge ogni colonna',async()=>{
 const m=await import('../public/direct-fields.mjs').catch(()=>({}));assert.equal(typeof m.saveWithDirectFields,'function');
 const json=encodeState(69,[row]),calls=[];let record={UF_DATA:'old',UF_CRM_NOVO_C3_DESC:'Canone eliminato',OPPORTUNITY:'12078',TAX_VALUE:'2178',CURRENCY_ID:'EUR'};
 const call=async(method,p)=>{calls.push(method);if(method==='crm.quote.get')return {...record};if(method==='crm.quote.update'){record={...record,...p.fields};return true;}throw Error('Metodo non previsto: '+method);};
 const result=await m.saveWithDirectFields({quoteId:69,json,baseline:'old',dataField:'UF_DATA',call});
 assert.equal(result.quote.UF_CRM_NOVO_C1_AMOUNT,'97,00 €');assert.deepEqual(calls,['crm.quote.get','crm.quote.update','crm.quote.get']);
 assert.equal(result.quote.UF_CRM_NOVO_C3_DESC,'');
});
test('la pagina a otto colonne conserva il carattere e rifiuta tre descrizioni eccessive',async()=>{
 const m=await import('../public/direct-fields.mjs');assert.equal(typeof m.assertDirectPageFits,'function');
 const measure=text=>text.length*3.8;
 assert.doesNotThrow(()=>m.assertDirectPageFits([{...row,description:'Manutenzione ordinaria del sistema fotovoltaico. '.repeat(14),notes:''},row],measure));
 assert.throws(()=>m.assertDirectPageFits(Array.from({length:3},()=>({...row,description:'Descrizione estesa del servizio fotovoltaico. '.repeat(40)})),measure),/pagina/);
});
