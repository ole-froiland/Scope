import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runInNewContext} from 'node:vm';
import {createScopeServer} from '../server.mjs';

const read=name=>readFile(new URL(`../${name}`,import.meta.url),'utf8');

test('Hero types and backspaces complete phrases, pauses in hidden tabs and respects reduced motion',async()=>{
  const html=await read('landing-notion.html');
  assert.match(html, /aria-label="Scope: din AI-rådgiver\. Laget for restaurantbransjen\."/);
  assert.match(html, /data-n-hero-typewriter data-tone="blue">din AI-rådgiver\.<\/span>/);
  const script=(await read('notion.js')).split('const pill =')[0];
  const phrases=['din AI-rådgiver.','laget for restaurantbransjen.'];
  for(const initiallyReduced of [false,true]) {
    const word={textContent:'',dataset:{}};
    let pending;
    let motionChange;
    const media={matches:initiallyReduced,addEventListener:(event,callback)=>{assert.equal(event,'change');motionChange=callback;}};
    const document={hidden:false,querySelector:()=>word};
    runInNewContext(script,{
      document,window:{matchMedia:()=>media},
      setTimeout:(callback,delay)=>{pending={callback,delay};return 1;},clearTimeout:()=>{pending=undefined;},
    });
    const tick=()=>{assert.ok(pending);const callback=pending.callback;pending=undefined;callback();};
    assert.equal(word.textContent,phrases[0]);
    assert.equal(word.dataset.tone,'blue');
    if(initiallyReduced)assert.equal(pending,undefined);
    else {
      assert.equal(pending.delay,2600);
      document.hidden=true;tick();assert.equal(word.textContent,phrases[0]);
      document.hidden=false;
      for(const [current,next] of [[phrases[0],phrases[1]],[phrases[1],phrases[0]]]) {
        for(let i=current.length-1;i>=0;i--) {tick();assert.equal(word.textContent,current.slice(0,i));}
        assert.equal(pending.delay,350);
        for(let i=1;i<=next.length;i++) {tick();assert.equal(word.textContent,next.slice(0,i));}
        assert.equal(word.dataset.tone,next===phrases[0]?'blue':'green');
        assert.equal(pending.delay,2600);
      }
      tick();media.matches=true;motionChange();
      assert.equal(pending,undefined);assert.equal(word.textContent,phrases[0]);
      assert.equal(word.dataset.tone,'blue');
    }
    media.matches=false;motionChange();tick();assert.equal(word.textContent,phrases[0].slice(0,-1));
  }
});

test('Notion serves at /notion, resolves on Netlify and loads every resource it links',async()=>{
  const dataDir=await mkdtemp(join(tmpdir(),'scope19-test-'));
  const scope=await createScopeServer({dataDir,silent:true});
  await new Promise(resolve=>scope.server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${scope.server.address().port}`;
  try {
    const home=await read('landing-notion.html');
    for(const route of ['/notion','/notion/']) {
      const response=await fetch(base+route);
      assert.equal(response.status,200);
      assert.equal(await response.text(),home);
    }
    const rules=(await read('_redirects')).split('\n').map(line=>line.trim().split(/\s+/));
    for(const route of ['/notion','/notion/'])assert.deepEqual(rules.find(r=>r[0]===route),[route,'/landing-notion.html','200!']);
    assert.match(home,/<body class="notion-site">/);
    for(const [,ref] of home.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if(ref.startsWith('#')||/^(https?:|data:|mailto:|tel:)/.test(ref)||ref==='/notion')continue;
      const response=await fetch(new URL(ref,base+'/landing-notion.html'));
      assert.equal(response.status,200,ref);
    }
    for(const asset of ['notion.css','notion.js'])assert.equal(await (await fetch(`${base}/${asset}`)).text(),await read(asset));
  } finally {await scope.close();await rm(dataDir,{recursive:true,force:true});}
});

test('Notion page has one h1, accessible FAQ answers and no advice board',async()=>{
  const html=await read('landing-notion.html');
  assert.equal(html.match(/<h1[ >]/g).length,1);
  assert.doesNotMatch(html,/radstavlen|data-n-database|role="tab"/);
  assert.equal(html.match(/<details>/g).length,html.match(/<\/details>/g).length);
  assert.equal(html.match(/<details>/g).length,6);
  for(const [,question,answer] of html.matchAll(/<details><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>/g)) {
    assert.ok(question.trim());assert.ok(answer.trim());
  }
});

test('Notion preview and interactive demo use the real dashboard with isolated demo storage',async()=>{
  const html=await read('landing-notion.html');
  const frames=[...html.matchAll(/<iframe\b[^>]*>/g)].map(match=>match[0]);
  assert.equal(frames.length,2);
  for(const frame of frames) {
    const source=frame.match(/(?:src|data-src)="([^"]+)"/)[1];
    const url=new URL(source,'https://scopeanalytics.netlify.app');
    assert.equal(url.pathname,'/test');
    assert.equal(url.searchParams.get('embed'),'1');
  }
  assert.match(frames[0],/\binert\b/);
  assert.match(html,/<dialog id="n-demo-dialog"[^>]*aria-labelledby="n-demo-dialog-title"/);
});
