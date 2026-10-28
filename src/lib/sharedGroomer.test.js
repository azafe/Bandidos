import test from 'node:test';
import assert from 'node:assert/strict';
import { groomerShares, groomerShare, groomerPayout } from './sharedGroomer.js';
const employees = [{id:'a',commission_rate:0.4},{id:'b',commission_rate:0.6}];
test('a single groomer receives the full commission',()=>{
  const service={groomer_id:'a'};
  assert.equal(groomerPayout(service,20000,employees,'a'),8000);
  assert.equal(groomerShare(service,'b'),0);
});
test('sharing divides the principal commission equally even with different employee rates',()=>{
  const service={groomer_id:'a',second_groomer_id:'b'};
  assert.equal(groomerPayout(service,20000,employees,'a'),4000);
  assert.equal(groomerPayout(service,20000,employees,'b'),4000);
  assert.equal(groomerShares(service).reduce((sum,p)=>sum+20000*p.share,0),20000);
});
test('legacy and unassigned records keep a single share',()=>{
  assert.deepEqual(groomerShares({}),[{groomerId:null,share:1}]);
  assert.deepEqual(groomerShares({groomer_id:'a',second_groomer_id:'a'}),[{groomerId:'a',share:1}]);
});
