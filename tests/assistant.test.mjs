import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { localAnswer, validateActions } from '../scope-assistant.js';
import { createAssistantService, sanitizeAssistantInput } from '../server/assistant-service.mjs';
import { createScopeServer } from '../server.mjs';

const context = {
  source: 'demo', places: ['Heim Jessheim', 'Heim Hamar'], selected: ['Heim Jessheim'], view: 'oversikt', period: 'igår',
  periodLabels: { 'igår': 'I går', uke: 'Denne uken', siste30: 'Siste 4 uker' },
  facts: ['Heim Jessheim', 'Heim Hamar'].flatMap((place, i) => ['igår', 'uke', 'siste30'].map((period, j) => ({ place, period, oms: (i + 1) * (j + 1) * 1000, gjester: 10, snittbong: 100, varekostKr: 300, lonnKr: 400, bidragKr: 300 }))),
};
const input = { question: 'Hvor mye solgte vi i går?', context };

test('local answers use selected place, named place, period and follow-up context', () => {
  assert.match(localAnswer(input.question, context).reply, /Jessheim: Omsetning 1\s000 kr/);
  assert.match(localAnswer('Hva var omsetningen i Hamar denne uken?', context).reply, /Hamar: Omsetning 4\s000 kr/);
  assert.match(localAnswer('Og Hamar?', context, [{ role: 'user', text: input.question }]).reply, /Hamar: Omsetning 2\s000 kr/);
  assert.match(localAnswer('Omsetning i dag?', context).reply, /ikke data/);
  assert.match(localAnswer('Hva er varekost i prosent?', context).reply, /Varekost 30 %/);
  assert.match(localAnswer('Hvorfor er varekosten høy?', context).reply, /ikke årsaken/);
  assert.match(localAnswer('Hvor mye er igjen etter alle faste kostnader?', context).reply, /ikke beregne overskudd/);
});

test('only explicit complete commands auto-execute; negations and questions do not', () => {
  assert.deepEqual(localAnswer('jeg vil logge ut', context).actions, [{ type: 'logout', value: '' }]);
  for (const q of ['Ikke logg meg ut', 'Hvordan logger jeg ut?', 'Kan du forklare hva logg ut betyr?', 'Åpne salg og slett alt']) assert.deepEqual(localAnswer(q, context).actions, []);
  assert.deepEqual(localAnswer('Åpne salg', context).actions, [{ type: 'navigate', value: 'salg' }]);
  assert.deepEqual(localAnswer('Bytt til Hamar', context).actions, [{ type: 'place', value: 'Heim Hamar' }]);
});

test('action contract rejects code, unknown targets and malformed output', () => {
  assert.throws(() => validateActions([{ type: 'navigate', value: 'salg' }, { type: 'logout', value: '' }], context));
  for (const actions of [[{ type: 'navigate', value: 'https://evil.example' }], [{ type: 'place', value: 'Other tenant' }], [{ type: 'eval', value: 'alert(1)' }], [{ type: 'logout', value: '', extra: true }], Array(5).fill({ type: 'logout', value: '' }), null]) assert.throws(() => validateActions(actions, context));
});

test('context whitelist drops credentials, rejects fake live data and limits input', () => {
  const clean = sanitizeAssistantInput({ ...input, context: { ...context, token: 'secret', facts: context.facts.map(f => ({ ...f, password: 'secret' })) } });
  assert.ok(!JSON.stringify(clean).includes('secret'));
  assert.equal(sanitizeAssistantInput({ ...input, context: { ...context, view: 'innstillinger', visibleData: 'private profile' } }).context.visibleData, '');
  for (const body of [null, { ...input, question: 'x'.repeat(4001) }, { ...input, context: { ...context, source: 'live' } }, { ...input, context: { ...context, selected: ['Other tenant'] } }]) assert.throws(() => sanitizeAssistantInput(body));
});

test('real model adapter uses only loopback, validates output and handles failures', async () => {
  let request;
  const service = createAssistantService({ fetchImpl: async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:11434/api/chat');
    request = JSON.parse(options.body);
    return Response.json({ done: true, message: { content: JSON.stringify({ reply: 'Demodata fra Scope.', actions: [{ type: 'navigate', value: 'salg' }] }) } });
  } });
  const answer = await service.answer(input);
  assert.equal(answer.mode, 'model'); assert.equal(request.think, false); assert.equal(request.stream, false);
  assert.equal(request.model, 'qwen3:4b'); assert.equal(request.format.additionalProperties, false);
  assert.throws(() => createAssistantService({ model: 'paid-cloud' }));
  for (const response of [Response.json({}, { status: 500 }), Response.json({ done: true, message: { content: '{broken' } }), Response.json({ done: false }), Response.json({ done: true, message: { content: JSON.stringify({ reply: '', actions: [{ type: 'delete', value: 'everything' }] }) } })]) {
    await assert.rejects(createAssistantService({ fetchImpl: async () => response }).answer(input), { status: 502 });
  }
});

test('assistant HTTP protects origin, reports capability and really invalidates login', async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'scope-assistant-test-'));
  const scope = await createScopeServer({ dataDir, silent: true, bootstrapEmail: 'ai@test.no', bootstrapPassword: 'test-password-long-enough', assistant: { fetchImpl: async url => url.endsWith('/tags') ? Response.json({ models: [{ name: 'qwen3:4b' }] }) : Response.json({ done: true, message: { content: JSON.stringify({ reply: 'Demodata', actions: [] }) } }) } });
  await new Promise(resolve => scope.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${scope.server.address().port}`;
  try {
    assert.equal((await (await fetch(base + '/api/assistant/status')).json()).mode, 'model');
    const post = headers => fetch(base + '/api/assistant/chat', { method: 'POST', headers, body: JSON.stringify(input) });
    assert.equal((await post({ 'Content-Type': 'application/json' })).status, 403);
    assert.equal((await post({ 'Content-Type': 'application/json', Origin: 'https://evil.example' })).status, 403);
    assert.equal((await post({ 'Content-Type': 'application/json', Origin: base })).status, 200);
    const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'ai@test.no', password: 'test-password-long-enough' }) });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    assert.equal((await fetch(base + '/api/auth/session', { headers: { Cookie: cookie } })).status, 200);
    assert.equal((await fetch(base + '/api/assistant/logout', { method: 'POST', headers: { Cookie: cookie, Origin: base } })).status, 403);
    const logout = await fetch(base + '/api/assistant/logout', { method: 'POST', headers: { Cookie: cookie, Origin: base, 'X-Scope-Action': 'logout' } });
    assert.equal(logout.status, 200);
    assert.equal((await logout.json()).authenticated, true);
    assert.equal((await fetch(base + '/api/auth/session', { headers: { Cookie: cookie } })).status, 401);
  } finally { await scope.close(); await rm(dataDir, { recursive: true, force: true }); }
});
