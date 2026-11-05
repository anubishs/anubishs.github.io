import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const pwaSource=readFileSync(new URL('../calculadora/pwa.mjs',import.meta.url),'utf8');
const workerSource=readFileSync(new URL('../calculadora/sw.js',import.meta.url),'utf8');
function installation({installed=false,secure=true}={}) {
  const handlers=new Map(),button={hidden:true,disabled:false,addEventListener:(name,fn)=>handlers.set('button:'+name,fn)},registrations=[];
  const navigator={standalone:installed,serviceWorker:{register:async url=>registrations.push(url.href)}};
  const media={matches:installed,addEventListener:(name,fn)=>handlers.set('media:'+name,fn)};
  const window={navigator,isSecureContext:secure,matchMedia:()=>media,addEventListener:(name,fn)=>handlers.set(name,fn)};
  vm.runInNewContext(pwaSource.replaceAll('import.meta.url',JSON.stringify('https://example.test/calculadora/pwa.mjs')),{window,navigator,document:{readyState:'complete',getElementById:()=>button},URL,console});
  return {handlers,button,registrations,media};
}
test('install control only exposes a real native prompt and consumes it once',async()=>{
  const app=installation();assert.equal(app.button.hidden,true);
  let prompts=0,prevented=0;
  app.handlers.get('beforeinstallprompt')({preventDefault:()=>prevented++,prompt:async()=>prompts++,userChoice:Promise.resolve({outcome:'dismissed'})});
  assert.equal(app.button.hidden,false);assert.equal(prevented,1);
  await app.handlers.get('button:click')();await app.handlers.get('button:click')();
  assert.equal(prompts,1);assert.equal(app.button.hidden,true);assert.equal(app.button.disabled,false);
  assert.equal(app.registrations[0],'https://example.test/calculadora/sw.js');
});
test('installed applications hide the control and insecure pages skip worker registration',()=>{
  const app=installation({installed:true});
  app.handlers.get('beforeinstallprompt')({preventDefault(){}});assert.equal(app.button.hidden,true);
  assert.equal(installation({secure:false}).registrations.length,0);
});
test('failed native prompts leave the interface usable without an instructions screen',async()=>{
  const app=installation();
  app.handlers.get('beforeinstallprompt')({preventDefault(){},prompt:async()=>{throw new Error('cancelled');}});
  await app.handlers.get('button:click')();assert.equal(app.button.hidden,true);assert.equal(app.button.disabled,false);
});
function worker(scope='https://example.test/calculadora/',redirect=false){
  const handlers=new Map(),stores=new Map([['unrelated-site-v1',new Map()]]),requests=[];
  const caches={keys:async()=>[...stores.keys()],delete:async key=>stores.delete(key),open:async key=>{
    if(!stores.has(key))stores.set(key,new Map());const entries=stores.get(key);
    return {put:async(key,value)=>entries.set(key,value),match:async key=>entries.get(key)};
  }};
  const fetch=async request=>{
    const url=typeof request==='string'?request:request.url;requests.push(url);
    const type=url.endsWith('.html')?'text/html':/\.(m?js)$/.test(url)?'text/javascript':url.endsWith('.css')?'text/css':url.endsWith('.png')?'image/png':'application/manifest+json';
    const response=new Response('asset:'+url,{headers:{'content-type':type}});
    if(redirect)Object.defineProperty(response,'redirected',{value:true});return response;
  };
  const self={registration:{scope},addEventListener:(name,fn)=>handlers.set(name,fn),clients:{claim:async()=>{}}};
  vm.runInNewContext(workerSource,{self,caches,fetch,Request,URL,console});
  const life=async name=>{let done;handlers.get(name)({waitUntil:promise=>done=promise});await done;};
  const request=(url,mode='same-origin',method='GET')=>{let response;handlers.get('fetch')({request:{url,mode,method},respondWith:promise=>response=promise});return response;};
  return {life,request,stores,requests};
}
test('offline shell covers calculator assets at both root and subdirectory scopes',async()=>{
  for(const scope of ['https://example.test/','https://example.test/calculadora/']){
    const app=worker(scope);await app.life('install');await app.life('activate');
    assert.ok(app.stores.has('unrelated-site-v1'));
    const count=app.requests.length;
    assert.equal(await(await app.request(scope,'navigate')).text(),'asset:'+scope+'index.html');
    assert.equal(await(await app.request(scope+'draft.mjs')).text(),'asset:'+scope+'draft.mjs');
    assert.equal(await(await app.request(scope+'assets/jspdf.umd.min.js')).text(),'asset:'+scope+'assets/jspdf.umd.min.js');
    assert.equal(app.requests.length,count,'offline shell is served without network');
    assert.equal(app.request('https://example.test/login','navigate'),undefined);
    assert.equal(app.request(scope+'api/private'),undefined);
    assert.equal(app.request('https://other.test/app.js'),undefined);
    assert.equal(app.request(scope+'app.js?authorization=value'),undefined);
    assert.equal(app.request(scope+'app.js','same-origin','POST'),undefined);
  }
});
test('authentication redirects cannot become the cached offline shell',async()=>{
  const app=worker(undefined,true);await assert.rejects(app.life('install'),/App asset unavailable/);
  assert.equal([...app.stores.keys()].filter(key=>key.startsWith('anubis-calculadora:')).length,0);
});
test('manifest icons and relative launch URLs are valid deployable assets',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../calculadora/manifest.webmanifest',import.meta.url),'utf8'));
  assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');
  for(const icon of manifest.icons){assert.ok(existsSync(new URL('../calculadora/'+icon.src,import.meta.url)));const buffer=readFileSync(new URL('../calculadora/'+icon.src,import.meta.url));assert.equal(buffer.readUInt32BE(16)+'x'+buffer.readUInt32BE(20),icon.sizes);}
});
