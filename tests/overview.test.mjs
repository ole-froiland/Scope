import test from 'node:test';
import assert from 'node:assert/strict';

test('chart axis tops out at a friendly number', async () => {
  const {niceScale} = await import('../scope-chart.js');
  assert.deepEqual(niceScale(9100), {max: 10000, ticks: [0, 5000, 10000]});
  assert.deepEqual(niceScale(139840), {max: 160000, ticks: [0, 80000, 160000]});
  assert.deepEqual(niceScale(0), {max: 1, ticks: [0, 1]});
});
