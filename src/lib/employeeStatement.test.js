import assert from 'node:assert/strict';
import test from 'node:test';
import { employeeStatementActivity } from './employeeStatement.js';

function statement(works,period={from:'2026-09-01',to:'2026-09-30'}){
  return {...period,employee:{payroll_start_date:'2026-10-30'},works,summary:{earned:0,balance:0}};
}

test('los trabajos anteriores al inicio de pagos suman a las comisiones del mes',()=>{
  const result=employeeStatementActivity(statement([
    {date:'2026-09-30',price:'27000.00',earned:'10800.00',participants:1,commission_historical_estimate:true},
    {date:'2026-09-29',price:'30000.00',earned:'6000.00',participants:2,commission_historical_estimate:true},
  ]));
  assert.equal(result.earned,16800);assert.equal(result.count,2);
  assert.equal(result.beforePayroll,true);assert.equal(result.beforeStart,2);
  assert.equal(result.estimated,2);assert.equal(result.shared,1);
});

test('un mes que cruza el inicio conserva la actividad completa sin convertirla en deuda',()=>{
  const data=statement([
    {date:'2026-10-15',price:10000,earned:4000},
    {date:'2026-10-30',price:20000,earned:8000},
  ],{from:'2026-10-01',to:'2026-10-31'});
  data.summary={earned:8000,advances:2000,balance:6000};
  const result=employeeStatementActivity(data);
  assert.equal(result.earned,12000);assert.equal(result.partialPayroll,true);
  assert.equal(result.beforePayroll,false);assert.equal(result.beforeStart,1);
  assert.equal(data.summary.balance,6000);assert.equal(data.summary.earned,8000);
});

test('conserva centavos del reparto y señala precios pendientes',()=>{
  const result=employeeStatementActivity(statement([
    {date:'2026-11-01',price:10000.01,earned:'1333.34',participants:3},
    {date:'2026-11-02',price:10000.01,earned:'1333.33',participants:3},
    {date:'2026-11-03',price:null,earned:0},
  ],{from:'2026-11-01',to:'2026-11-30'}));
  assert.equal(result.earned,2666.67);assert.equal(result.missingPrices,1);
  assert.equal(result.beforePayroll,false);assert.equal(result.partialPayroll,false);
});

test('un mes sin trabajos y posterior al inicio tiene actividad cero',()=>{
  const result=employeeStatementActivity(statement([],{from:'2026-11-01',to:'2026-11-30'}));
  assert.equal(result.earned,0);assert.equal(result.count,0);
  assert.equal(result.beforePayroll,false);
});
