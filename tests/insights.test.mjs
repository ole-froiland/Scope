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

test('hourly demo reconciles with the day and evening share without losing rounded guests',async()=>{
  const {buildDayTimeline}=await import('../scope-insights.js');
  const points=buildDayTimeline(126730,310.3,9);
  assert.equal(points.length,12);
  assert.equal(points.reduce((sum,p)=>sum+p.revenue,0),126730);
  assert.equal(points.reduce((sum,p)=>sum+p.guests,0),310);
  assert.equal(points.at(-1).totalGuests,310);
  assert.equal(points.at(-1).totalRevenue,126730);
  assert.equal(points.slice(6).reduce((sum,p)=>sum+p.revenue,0),126730-Math.round(126730*.45));
  assert.ok(points.every(p=>p.staff>0&&p.guests>=0));
  assert.equal(points[6].staff,9);
  const empty=buildDayTimeline(0,0,3);assert.ok(empty.every(p=>p.revenue===0&&p.guests===0));
});

test('operational advice uses real gaps, staffing pressure and missing receipt counts', async () => {
  const {buildOperationalAdvice} = await import('../scope-insights.js');
  const thursday = new Date(2026, 9, 1);
  const busy = buildOperationalAdvice({varekost: 32, bilag: 3}, {guests: 110, staff: 5, date: thursday}, 500000);
  assert.equal(busy[0].id, 'plan');
  assert.match(busy[0].title, /2 ekstra/);
  assert.match(busy.find(x => x.id === 'receipts').title, /3 manglende kvitteringer/);
  assert.match(busy.find(x => x.id === 'cost').title, /tre største innkjøpene/);
  const quiet = buildOperationalAdvice({varekost: 28, bilag: 0}, {guests: 35, staff: 4, date: thursday}, 500000);
  assert.equal(quiet.length, 2);
  assert.match(quiet.find(x => x.id === 'plan').title, /prep/);
  assert.doesNotMatch(quiet.find(x => x.id === 'cost').title, /prisene/);
  assert.ok(quiet.every(x => !x.text.includes('spar')));
});

test('operational advice prices the cost gap and names tomorrow evening', async () => {
  const {buildOperationalAdvice} = await import('../scope-insights.js');
  const thursday = new Date(2026, 9, 1);
  const busy = buildOperationalAdvice({varekost: 32, bilag: 3}, {guests: 110, staff: 5, date: thursday}, 500000);
  const cost = busy.find(x => x.id === 'cost');
  assert.equal(cost.value.replace(/\s/g, ' '), 'kr 10 000');
  assert.equal(cost.valueNote, 'per uke');
  const plan = busy.find(x => x.id === 'plan');
  assert.equal(plan.value, '+2 på vakt');
  assert.equal(plan.valueNote, 'torsdag kveld');
  assert.equal(busy.find(x => x.id === 'receipts').value, '3 igjen');
  const quiet = buildOperationalAdvice({varekost: 28, bilag: 0}, {guests: 35, staff: 4, date: thursday}, 500000);
  assert.equal(quiet.find(x => x.id === 'plan').value, '35 gjester');
  assert.equal(quiet.find(x => x.id === 'cost').value, 'Lager');
  assert.ok(busy.concat(quiet).every(x => x.value && x.valueNote && x.action));
});

const W13 = [0.03, 0.09, 0.1, 0.05, 0.04, 0.05, 0.09, 0.14, 0.15, 0.12, 0.08, 0.04, 0.02];
const at = (h, m) => new Date(2026, 8, 29, h, m);

test('a normal day spreads the whole day over the opening hours', async () => {
  const {normalDay, OPEN_HOUR} = await import('../scope-insights.js');
  assert.equal(OPEN_HOUR, 11);
  const day = normalDay(10000, 100, [0.25, 0.25, 0.5]);
  assert.deepEqual(day.map(s => s.hour), [11, 12, 13]);
  assert.equal(day.reduce((s, x) => s + x.revenue, 0), 10000);
  assert.equal(day[2].guests, 50);
});

test('demo actuals are stable per seed and a finished hour never changes', async () => {
  const {normalDay, dayActuals} = await import('../scope-insights.js');
  const normal = normalDay(65550, 161, W13);
  const seed = 'Heim Jessheim|2026-9-29';
  const afternoon = dayActuals(normal, seed, at(16, 30));
  const evening = dayActuals(normal, seed, at(20, 0));
  assert.deepEqual(afternoon.slice(0, 5), evening.slice(0, 5));
  assert.equal(afternoon[5].share, 0.5);
  assert.equal(afternoon[6].share, 0);
  assert.equal(afternoon[6].revenue, 0);
  assert.deepEqual(dayActuals(normal, seed, at(20, 0)), evening);
  assert.notDeepEqual(dayActuals(normal, 'Heim Hamar|2026-9-29', at(20, 0)), evening);
});

test('forecast keeps what is sold and adds the rest at a damped pace', async () => {
  const {normalDay, forecastDay} = await import('../scope-insights.js');
  const normal = normalDay(1000, 10, [0.5, 0.5]);
  const f = forecastDay(normal, [{hour: 11, share: 1, revenue: 600, guests: 6}, {hour: 12, share: 0, revenue: 0, guests: 0}]);
  assert.equal(f.pace, 1.2);
  assert.equal(f.hours[0].revenue, 600);
  assert.equal(f.hours[1].revenue, 560);
  assert.equal(f.revenue, 1160);
  assert.equal(f.guests, 12);
  const untouched = forecastDay(normal, [{hour: 11, share: 0, revenue: 0, guests: 0}, {hour: 12, share: 0, revenue: 0, guests: 0}]);
  assert.equal(untouched.pace, 1);
  assert.equal(untouched.revenue, 1000);
});

test('staff on the floor follows the evening shape and is zero when closed', async () => {
  const {staffAt} = await import('../scope-insights.js');
  assert.equal(staffAt(6, 9), 0);
  assert.equal(staffAt(6, 12), 3);
  assert.equal(staffAt(6, 17), 5);
  assert.equal(staffAt(6, 19), 6);
  assert.equal(staffAt(6, 23), 4);
  assert.equal(staffAt(1, 12), 1);
});

test('before opening the day is all forecast; during service it splits at the clock', async () => {
  const {buildToday} = await import('../scope-insights.js');
  const base = {dayRevenue: 65550, dayGuests: 161, hourWeights: W13, seed: 'Heim Jessheim|2026-9-29', plannedStaff: 6};
  const early = buildToday({...base, now: at(9, 0)});
  assert.equal(early.phase, 'before');
  assert.equal(early.nowIndex, -1);
  assert.equal(early.revenue, 0);
  assert.equal(early.staffNow, 0);
  assert.ok(Math.abs(early.forecastRevenue - 65550) <= 7);
  assert.ok(early.hours.every(h => h.actual === 0 && h.forecast > 0));
  const mid = buildToday({...base, now: at(19, 30)});
  assert.equal(mid.phase, 'open');
  assert.equal(mid.nowIndex, 8);
  assert.equal(mid.hours[8].share, 0.5);
  assert.equal(mid.revenue, mid.hours.reduce((s, h) => s + h.actual, 0));
  assert.ok(mid.forecastRevenue > mid.revenue);
  assert.ok(mid.hours.slice(0, 8).every(h => h.forecast === h.actual));
  assert.equal(mid.staffNow, 6);
  assert.equal(buildToday({...base, now: at(23, 59)}).nowIndex, 12);
});
