import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createScopeServer} from '../server.mjs';

const read=name=>readFile(new URL(`../${name}`,import.meta.url),'utf8');

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

test('Notion page has one h1, labelled tabs wired to panels, and a toggle for every FAQ answer',async()=>{
  const html=await read('landing-notion.html');
  assert.equal(html.match(/<h1[ >]/g).length,1);
  for(const [,controls] of html.matchAll(/role="tab"[^>]*aria-controls="([^"]+)"/g))assert.match(html,new RegExp(`id="${controls}"`),controls);
  assert.equal(html.match(/<details>/g).length,html.match(/<\/details>/g).length);
  assert.ok(html.match(/<details>/g).length>=8);
});
