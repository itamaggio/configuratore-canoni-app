import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeState} from '../public/core.mjs';
test('il marcatore di prova sopravvive alla formattazione BBCode del CRM',async()=>{
 const m=await import('../public/word-eight-setup.mjs');assert.equal(typeof m.isWordEightFixtureComment,'function');
 assert.equal(m.isWordEightFixtureComment('[p]\nNOVOTECNA_WORD_EIGHT_TEST_V1\n[/p]'),true);
 assert.equal(m.isWordEightFixtureComment('<p>NOVOTECNA_WORD_EIGHT_TEST_V1</p>'),true);
 assert.equal(m.isWordEightFixtureComment('Altro NOVOTECNA_WORD_EIGHT_TEST_V1'),false);
});

test('un permesso mancante nella preparazione non crea preventivi e non attiva il nuovo percorso',async()=>{
 const m=await import('../public/word-eight-setup.mjs').catch(()=>({}));assert.equal(typeof m.prepareWordEightSetup,'function');
 const calls=[];const call=async(method,params)=>{calls.push({method,params});if(method==='app.option.get')return {canoniWordProbeTypeId:'18'};if(method==='crm.type.get')return {type:{id:18,entityTypeId:1074,code:'NOVOTECNA_CANONI_WORD_TEST'}};if(method==='crm.item.fields')return {fields:{}};if(method==='userfieldconfig.add')throw Error('insufficient_scope');throw Error(method);};
 await assert.rejects(m.prepareWordEightSetup({call,templateFile:'test'}),/insufficient_scope/);
 assert.ok(!calls.some(c=>/quote\.(add|update)|template\.(add|update)|app.option.set/.test(c.method)));
});
test('il caso B2B richiede il proprio modello prima di creare anagrafiche o preventivi',async()=>{
 const m=await import('../public/word-eight-setup.mjs');assert.equal(typeof m.prepareWordEightB2BCase,'function');
 const calls=[];const call=async(method)=>{calls.push(method);if(method==='app.option.get')return {canoniWordProbeTypeId:'18',canoniWordEightTestQuoteId:'71'};if(method==='crm.type.get')return {type:{id:18,entityTypeId:1074,code:'NOVOTECNA_CANONI_WORD_TEST'}};throw Error(method);};
 await assert.rejects(m.prepareWordEightB2BCase({call,measure:s=>s.length}),/B2B/);assert.ok(!calls.some(m=>/\.add|\.update|\.set/.test(m)));
});
test('la configurazione definitiva non viene attivata se manca un modello',async()=>{
 const m=await import('../public/word-eight-setup.mjs');assert.equal(typeof m.finalizeWordEight,'function');const calls=[];
 const call=async(method)=>{calls.push(method);if(method==='app.option.get')return {canoniWordProbeTypeId:'18',canoniWordEightTemplateB2CId:'17'};if(method==='crm.type.get')return {type:{id:18,entityTypeId:1074,code:'NOVOTECNA_CANONI_WORD_TEST'}};throw Error(method);};
 await assert.rejects(m.finalizeWordEight({call}),/modelli/);assert.ok(!calls.includes('app.option.set'));
});
test('il menu conserva solo i due modelli e preserva le associazioni degli altri modelli ad altre entità',async()=>{
 const {finalizeWordEight}=await import('../public/word-eight-setup.mjs');const calls=[];
 const templates=[{id:'17',name:'Novotecna — Preventivo B2C con canoni',active:'Y',entityTypeId:['7']},{id:'18',name:'Novotecna — Preventivo B2B con canoni',active:'Y',entityTypeId:['7']},{id:'9',name:'Vecchio modello preventivo',active:'Y',entityTypeId:['7']},{id:'10',name:'Modello condiviso',active:'Y',entityTypeId:['2','7']}];
 const call=async(method,params)=>{calls.push({method,params});if(method==='app.option.get')return {canoniWordProbeTypeId:'18',canoniWordEightTemplateB2CId:'17',canoniWordEightTemplateB2BId:'18',canoniWordEightTestQuoteId:'71',canoniWordEightB2BQuoteId:'72'};if(method==='crm.type.get')return {type:{id:18,entityTypeId:1074,code:'NOVOTECNA_CANONI_WORD_TEST'}};if(method==='crm.documentgenerator.template.get')return {template:templates.find(t=>Number(t.id)===params.id)};if(method==='crm.quote.get')return {UF_CRM_NOVOTECNA_CANONI:encodeState(params.id,[],{wordLayout:8}),UF_CRM_NOVOTECNA_CANONI_WORD:[101]};if(method==='crm.documentgenerator.template.list')return {templates};if(method==='app.option.set'||method==='crm.documentgenerator.template.update')return true;throw Error(method);};
 await finalizeWordEight({call});const updates=calls.filter(c=>c.method==='crm.documentgenerator.template.update');
 assert.deepEqual(updates.find(c=>c.params.id===9)?.params.fields,{active:'N'});
 assert.deepEqual(updates.find(c=>c.params.id===10)?.params.fields,{entityTypeId:['2']});
 assert.ok(!updates.some(c=>[17,18].includes(c.params.id)));
});
