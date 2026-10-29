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
test('three groomers divide the primary commission in thirds and preserve total billing', () => {
  const service = { groomer_id: 'a', second_groomer_id: 'b', third_groomer_id: 'c' };
  assert.deepEqual(groomerShares(service).map((part) => part.share), [1/3, 1/3, 1/3]);
  for (const id of ['a', 'b', 'c']) assert.equal(groomerPayout(service, 30000, employees, id), 4000);
  assert.equal(groomerShares(service).reduce((sum, part) => sum + 30000 * part.share, 0), 30000);
  assert.equal(groomerShare(service, 'outsider'), 0);
});
test('removing the third groomer restores a half share for both remaining participants', () => {
  const service = { groomer_id: 'a', second_groomer_id: 'b', third_groomer_id: null };
  assert.equal(groomerPayout(service, 30000, employees, 'a'), 6000);
  assert.equal(groomerPayout(service, 30000, employees, 'b'), 6000);
});
