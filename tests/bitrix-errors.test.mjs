import test from 'node:test';import assert from 'node:assert/strict';
import {bitrixErrorMessage} from '../public/bitrix-errors.mjs';
test('un errore SDK annidato produce un messaggio e non un oggetto o parametri di autorizzazione',()=>{
 assert.equal(bitrixErrorMessage({ex:{error:'insufficient_scope',error_description:'Permesso mancante'},auth:'SEGRETO'}),'Permesso mancante');
 assert.equal(bitrixErrorMessage({ex:{response:{data:{error:'ACCESS_DENIED'}}}}),'ACCESS_DENIED');
 assert.equal(bitrixErrorMessage({auth:'SEGRETO'}),'');
});
