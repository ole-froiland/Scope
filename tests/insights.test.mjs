import test from 'node:test';
import assert from 'node:assert/strict';
import {reportRange,buildReport,improvementEffect} from '../scope-insights.js';
test('reports use completed calendar months including leap years and year boundaries',()=>{
  const leap=reportRange('month',0,new Date(2024,2,8));
  assert.equal(leap.days.length,29); assert.equal(leap.start.getMonth(),1); assert.equal(leap.end.getDate(),29);
  const previous=reportRange('month',1,new Date(2026,0,8));
  assert.equal(previous.start.getFullYear(),2025);assert.equal(previous.start.getMonth(),10);
});
test('weekly report is a completed Monday to Sunday on both Monday and Sunday',()=>{
  for(const now of [new Date(2026,8,6),new Date(2026,8,7)]){
    const range=reportRange('week',0,now);assert.equal(range.days.length,7);assert.equal(range.start.getDay(),1);assert.equal(range.end.getDay(),0);assert.ok(range.end<now);
  }
});
test('report totals reconcile with daily rows and expenses; months are not four weeks',()=>{
  const r=buildReport({oms:1000,gjester:10,varekost:30,lonn:25},'month',0,new Date(2026,8,6),[1,1,1,1,1,1,1]);
  assert.equal(r.points.length,31);assert.equal(r.revenue,31000);assert.equal(r.guests,310);assert.equal(r.cost+r.wages+r.contribution,r.revenue);
});
test('scenario has zero baseline and bounded inputs, never recorded realized savings',()=>{
  assert.equal(improvementEffect(100000,0,0),0);assert.equal(improvementEffect(100000,1,1.5),2500);assert.equal(improvementEffect(100000,-1,99),3000);
});
