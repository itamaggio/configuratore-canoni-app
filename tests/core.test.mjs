import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAmount, normalizeRow, encodeState, decodeState, documentPayload, requirePortal, placementContext} from '../public/core.mjs';

const row={description:'O&M fotovoltaico',amount:'97,00',unit:'kWp',period:'Annuale',quantity:'10 kWp',duration:'Durata del contratto',start:'Dall’attivazione',notes:'Anticipato'};
test('normalizza tariffa italiana senza calcolare il corrispettivo',()=>{
 assert.equal(normalizeAmount('1.250,50'),'1250.50');
 assert.equal(normalizeAmount('97'),'97.00');
 assert.equal(normalizeAmount('0'),'0.00');
 for(const value of ['', '-1', 'NaN', '1e3', '1.2.3', '1,234'])assert.throws(()=>normalizeAmount(value));
});
test('non accetta descrizione vuota o campi eccessivi',()=>{
 assert.throws(()=>normalizeRow({...row,description:'  '}));
 assert.throws(()=>normalizeRow({...row,notes:'x'.repeat(2001)}));
});
test('salvataggio legato al preventivo, rifiuta schema corrotto e ID diversi',()=>{
 const state=encodeState(42,[row],{type:'B2C',templateId:9});
 assert.equal(decodeState(state,42).rows[0].quantity,'10 kWp');
 assert.throws(()=>decodeState(state,43));
 assert.throws(()=>decodeState('{errore}',42));
 assert.throws(()=>decodeState(JSON.stringify({version:99,quoteId:42,rows:[]}),42));
});
test('payload genera da QUOTE con array autonomo senza sovrascrivere prodotti e totali',()=>{
 const p=documentPayload(42,9,[row]);
 assert.equal(p.entityTypeId,7);assert.equal(p.entityId,42);assert.equal(p.templateId,9);
 assert.equal(p.values.Canoni[0].Amount,'97,00 €');
 assert.equal(p.values.Canoni[0].Quantity,'10 kWp');
 assert.match(p.fields.Canoni.PROVIDER,/ArrayDataProvider$/);
 assert.equal(p.values.CanoniItemDescription,'Canoni.Item.Description');
 assert.ok(!Object.keys(p.values).some(k=>/Products|Total|Tax/.test(k)));
 assert.ok(!Object.keys(p.fields).some(k=>/Products|Total|Tax/.test(k)));
 assert.throws(()=>documentPayload(0,9,[row]));
 assert.throws(()=>documentPayload(42,0,[row]));
});
test('il prototipo resta vincolato al portale di test',()=>{
 assert.equal(requirePortal('test.kenovy.it',['test.kenovy.it']),'test.kenovy.it');
 for(const domain of ['kenovy.bitrix24.it','test.kenovy.it.evil.test','https://test.kenovy.it'])assert.throws(()=>requirePortal(domain,['test.kenovy.it']));
});
test('il menu Documento sceglie la generazione, la scheda Canoni sceglie la modifica',()=>{
 assert.deepEqual(placementContext({placement:'CRM_QUOTE_DOCUMENTGENERATOR_BUTTON',options:{ENTITY_ID:'66'}}),{mode:'document',quoteId:66});
 assert.deepEqual(placementContext({placement:'CRM_QUOTE_DETAIL_TAB',options:{ID:'66'}}),{mode:'editor',quoteId:66});
 assert.throws(()=>placementContext({placement:'CRM_QUOTE_DOCUMENTGENERATOR_BUTTON',options:{}}));
});
