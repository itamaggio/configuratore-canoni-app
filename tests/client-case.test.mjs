import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureTestRecord} from '../public/client-case.mjs';

test('un record di collaudo viene riutilizzato senza duplicarlo',async()=>{
 const opts={contact:'42'};const calls=[];
 const call=async(m,p)=>{calls.push([m,p]);if(m==='crm.contact.get')return {ID:'42',COMMENTS:'NOVOTECNA_CANONI_CLIENT_CASE_V1'};throw Error(m);};
 assert.equal(await ensureTestRecord({call,opts,key:'contact',method:'crm.contact.add',fields:{}}),42);
 assert.deepEqual(calls.map(x=>x[0]),['crm.contact.get']);
});
test('una creazione con esito incerto resta pendente e impedisce duplicati',async()=>{
 const opts={};const call=async(m)=>{if(m==='app.option.set')return true;throw Error('timeout');};
 await assert.rejects(ensureTestRecord({call,opts,key:'contact',method:'crm.contact.add',fields:{}}),/timeout/);
 assert.equal(opts.contact,'pending');
 await assert.rejects(ensureTestRecord({call,opts,key:'contact',method:'crm.contact.add',fields:{}}),/incerto/);
});
