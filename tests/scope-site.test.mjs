import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createScopeServer } from '../server.mjs';
import { copy, periods, dishes, demoMailto } from '../scope-content.js';

const read = name => readFile(new URL(`../${name}`, import.meta.url), 'utf8');
const routes = ['/clean','/leken','/enkel','/vakt','/brutal','/kombi','/netflix','/enkel-2','/kvittering','/meny','/for-etter','/sesong','/drift','/signal','/vertskap','/test','/scope'];

test('collection keeps its original 16 routes in order and adds Scope as number 17', async () => {
  const [gallery,index] = await Promise.all([read('landing-velger.html'),read('index.html')]);
  assert.equal(gallery,index);
  assert.deepEqual([...gallery.matchAll(/class="page-option [^"]+" href="([^"]+)"/g)].map(match=>match[1]),routes);
  assert.deepEqual([...gallery.matchAll(/class="option-number">(\d+)</g)].map(match=>Number(match[1])),Array.from({length:17},(_,i)=>i+1));
});

test('all 17 websites and Scope modules are served locally; Netlify resolves the same page', async () => {
  const dataDir = await mkdtemp(join(tmpdir(),'scope17-test-'));
  const scope = await createScopeServer({dataDir,silent:true});
  await new Promise(resolve=>scope.server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${scope.server.address().port}`;
  try {
    for(const route of routes) {
      const response = await fetch(base+route);
      assert.equal(response.status,200,route);
      assert.match(await response.text(),/<title>[^<]+<\/title>/,route);
    }
    for(const route of ['/scope','/scope/']) {
      const html = await (await fetch(base+route)).text();
      assert.equal(html,await read('landing-scope.html'));
      const rules = (await read('_redirects')).split('\n').map(line=>line.trim().split(/\s+/));
      assert.deepEqual(rules.find(rule=>rule[0]===route),[route,'/landing-scope.html','200!']);
    }
    for(const asset of ['scope-site.css','scope-site.js','scope-content.js']) {
      const response=await fetch(`${base}/${asset}?v=20260916-1`);
      assert.equal(response.status,200,asset);
      assert.equal(await response.text(),await read(asset));
    }
  } finally { await scope.close(); await rm(dataDir,{recursive:true,force:true}); }
});

test('Norwegian and English cover every content and accessibility key', async () => {
  function keys(value,prefix='') { return Object.entries(value).flatMap(([key,item])=>typeof item==='object'&&!Array.isArray(item)?keys(item,prefix+key+'.'):[prefix+key]).sort(); }
  assert.deepEqual(keys(copy.no),keys(copy.en));
  const html=await read('landing-scope.html');
  for(const [,key] of html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)) {
    for(const language of ['no','en']) {assert.equal(typeof copy[language][key],'string',`${language}.${key}`);assert.ok(copy[language][key].length>0);}
  }
  for(const data of Object.values(periods)) {
    assert.equal(data.values.reduce((sum,value)=>sum+value,0),data.revenue,'Chart values must add up to revenue');
    assert.equal(Math.round(data.revenue*(1-(data.labor+data.food+data.other)/100)),data.profit,'Profit includes all estimated costs');
  }
  const sales=dishes.reduce((sum,dish)=>sum+dish.price*dish.week,0);
  const costs=dishes.reduce((sum,dish)=>sum+dish.cost*dish.week,0);
  const average=(sales-costs)/sales;
  const carbonara=dishes.at(-1);
  assert.equal(Math.round((1-(carbonara.price-carbonara.cost)/carbonara.price/average)*100),23,'Recommendation matches the illustrated menu margins');
});

test('demo requests stay in the user email app and encode personal text safely', () => {
  for(const language of ['no','en']) {
    const value=demoMailto(language,'Åse & Alex','Bistro #1? & Café\nBcc: other@example.invalid');
    const url=new URL(value);
    assert.equal(url.protocol,'mailto:');
    assert.equal(url.pathname,'post@scopeanalytics.no');
    assert.deepEqual([...url.searchParams.keys()],['subject','body']);
    assert.equal(url.searchParams.get('subject'),copy[language].emailSubject);
    assert.ok(url.searchParams.get('body').includes('Åse & Alex'));
    assert.ok(url.searchParams.get('body').includes('Bistro #1? & Café'));
  }
});
