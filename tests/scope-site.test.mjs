import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createScopeServer } from '../server.mjs';
import { copy, periods, dishes, demoMailto } from '../scope-content.js';
import { storyFrame, menuPriceScenario } from '../scope-motion.js';

const read = name => readFile(new URL(`../${name}`, import.meta.url), 'utf8');
const routes = ['/clean','/leken','/enkel','/vakt','/brutal','/kombi','/netflix','/enkel-2','/kvittering','/meny','/for-etter','/sesong','/drift','/signal','/vertskap','/test','/scope','/enkel-mork'];

test('collection preserves the first 17 routes and adds Enkel Mørk as number 18', async () => {
  const [gallery,index] = await Promise.all([read('landing-velger.html'),read('index.html')]);
  assert.equal(gallery,index);
  assert.deepEqual([...gallery.matchAll(/class="page-option [^"]+" href="([^"]+)"/g)].map(match=>match[1]),routes);
  assert.deepEqual([...gallery.matchAll(/class="option-number">(\d+)</g)].map(match=>Number(match[1])),Array.from({length:18},(_,i)=>i+1));
});

test('all 18 websites and Scope modules are served locally; Netlify resolves the same page', async () => {
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
    for(const asset of ['scope-site.css','scope-experience.css','scope-site.js','scope-content.js','scope-motion.js']) {
      const response=await fetch(`${base}/${asset}?v=20260916-2`);
      assert.equal(response.status,200,asset);
      assert.equal(await response.text(),await read(asset));
    }
    for(const asset of ['scope-restaurant-hero.jpg','scope-restaurant-mobile.jpg','scope-carbonara-editorial.jpg']) {
      const response=await fetch(`${base}/assets/${asset}`);
      assert.equal(response.status,200,asset);
      assert.match(response.headers.get('content-type'),/image\/jpeg/);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()),await readFile(new URL(`../assets/${asset}`,import.meta.url)));
    }
  } finally { await scope.close(); await rm(dataDir,{recursive:true,force:true}); }
});

test('Norwegian and English cover every content and accessibility key', async () => {
  function keys(value,prefix='') { return Object.entries(value).flatMap(([key,item])=>typeof item==='object'&&!Array.isArray(item)?keys(item,prefix+key+'.'):[prefix+key]).sort(); }
  assert.deepEqual(keys(copy.no),keys(copy.en));
  const html=await read('landing-scope.html');
  for(const [,key] of html.matchAll(/data-i18n(?:-aria|-alt)?="([^"]+)"/g)) {
    for(const language of ['no','en']) {assert.equal(typeof copy[language][key],'string',`${language}.${key}`);assert.ok(copy[language][key].length>0);}
  }
  for(const language of ['no','en']) {
    assert.equal(copy[language].storyPhases.length,3);
    for(const phase of copy[language].storyPhases) {
      for(const key of ['title','subtitle','description']) assert.ok(phase[key]?.length,`${language} story ${key}`);
    }
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

test('native scroll and reduced-motion controls reveal the same complete product story', () => {
  const gather=storyFrame(0), analysis=storyFrame(.54), action=storyFrame(.93);
  assert.equal(gather.phase,0);
  assert.equal(gather.orbit,1);
  assert.equal(gather.gather,0);
  assert.equal(gather.console,0);
  assert.equal(analysis.phase,1);
  assert.equal(analysis.gather,1);
  assert.equal(analysis.console,1);
  assert.ok(analysis.analysis>.5);
  assert.equal(action.phase,2);
  assert.equal(action.analysis,1);
  assert.equal(action.action,1);
  assert.deepEqual(storyFrame(-1),gather,'Overscroll holds the first scene');
  assert.deepEqual(storyFrame(2),storyFrame(1),'Overscroll holds the final scene');
  for(let step=0;step<=100;step++) {
    const frame=storyFrame(step/100);
    for(const [key,value] of Object.entries(frame)) {
      assert.ok(Number.isFinite(value),key);
      if(key!=='phase') assert.ok(value>=0&&value<=1,key);
    }
    assert.ok(Math.max(1-frame.gather,frame.console)>.25,'The handoff never leaves an empty stage');
  }
});

test('menu price exploration agrees with the illustrated dish and weekly recommendation', () => {
  const dish=dishes.at(-1);
  const baseline=menuPriceScenario(dish.price);
  assert.equal(baseline.cost,dish.cost);
  assert.equal(baseline.contribution,124);
  assert.equal(baseline.weeklyChange,0);
  assert.equal(baseline.margin,(dish.price-dish.cost)/dish.price*100);
  const raised=menuPriceScenario(265);
  assert.equal(raised.contribution,144);
  assert.equal(raised.weeklyChange,20*dish.week);
  assert.equal(raised.weeklyChange,1840);
  assert.equal(menuPriceScenario(225).weeklyChange,-1840);
  assert.equal(menuPriceScenario(0).price,245);
  assert.equal(menuPriceScenario('invalid').price,245);
  assert.equal(menuPriceScenario(200).price,225);
  assert.equal(menuPriceScenario(300).price,285);
  assert.equal(menuPriceScenario(263).price,265);
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
