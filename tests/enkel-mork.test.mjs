import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createScopeServer} from '../server.mjs';

const read=name=>readFile(new URL(`../${name}`,import.meta.url),'utf8');
const pages=['landing-enkel-mork.html',...['kunder','integrasjoner','om-oss','faq','cookies'].map(name=>`enkel-mork-${name}.html`)];

test('Enkel Mørk keeps all informational navigation and resources in a working dark edition',async()=>{
  const dataDir=await mkdtemp(join(tmpdir(),'scope18-test-'));
  const scope=await createScopeServer({dataDir,silent:true});
  await new Promise(resolve=>scope.server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${scope.server.address().port}`;
  const checked=new Set();
  try {
    const home=await read(pages[0]);
    for(const route of ['/enkel-mork','/enkel-mork/']) {
      const response=await fetch(base+route);
      assert.equal(response.status,200);
      assert.equal(await response.text(),home);
    }
    const rules=(await read('_redirects')).split('\n').map(line=>line.trim().split(/\s+/));
    for(const route of ['/enkel-mork','/enkel-mork/'])assert.deepEqual(rules.find(r=>r[0]===route),[route,'/landing-enkel-mork.html','200!']);
    for(const file of pages) {
      const html=await read(file);
      assert.match(html,/<body class="enkel-site enkel-dark">/,file);
      assert.match(html,/href="enkel-mork\.css\?v=/,file);
      for(const [,ref] of html.matchAll(/(?:href|src|srcset)="([^"]+)"/g)) {
        if(ref.startsWith('#')||/^(https?:|data:|mailto:)/.test(ref))continue;
        const url=new URL(ref,base+'/'+file);
        // Onboarding is the existing application flow, outside this visual variant.
        if(url.pathname==='/onboarding')continue;
        assert.ok(!/^\/enkel(?:$|\?|\/(?:$)|-(?:kunder|integrasjoner|om-oss|faq)\.html)/.test(url.pathname),`${file} leaves the edition: ${ref}`);
        if(checked.has(url.pathname))continue;
        const response=await fetch(url);
        assert.equal(response.status,200,`${file}: ${ref}`);
        checked.add(url.pathname);
      }
    }
    assert.ok(checked.has('/assets/enkel-mork-hero.jpg'));
    assert.ok(checked.has('/assets/enkel-mork-hero-mobile.jpg'));
    for(const page of pages.slice(1))assert.ok(checked.has('/'+page),page);
  } finally {await scope.close();await rm(dataDir,{recursive:true,force:true});}
});
