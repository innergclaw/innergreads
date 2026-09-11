import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('./reads.mjs', import.meta.url), 'utf8').replace(/^import .*;\n/, '');
async function setup() {
  const elements = new Map(), events = {}, windowEvents = {};
  const element = () => ({ hidden: true, dataset: {}, children: [], listeners: {},
    replaceChildren(...items) { this.children = items; }, append(item) { this.children.push(item); },
    setAttribute() {}, addEventListener(name, fn) { this.listeners[name] = fn; } });
  const get = id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
  let response = {access:'member',signedIn:true,body:[{text:'private essay'}]}, pending;
  const context = vm.createContext({
    createClient: () => ({auth: {getSession:async()=>({data:{session:null}}),onAuthStateChange:fn=>events.auth=fn,signOut:async()=>({})}}),
    document: {getElementById:get,createElement:element,visibilityState:'visible',addEventListener:(name,fn)=>events[name]=fn},
    window: {addEventListener:(name,fn)=>windowEvents[name]=fn},
    location:{hash:'',pathname:'/reads/'},localStorage:{getItem:()=>null},URLSearchParams,
    AbortSignal, setTimeout, fetch:async()=> pending ? await pending : ({ok:true,json:async()=>response}),
  });
  vm.runInContext(source, context);
  await new Promise(resolve=>setTimeout(resolve,0));
  return {context,get,events,windowEvents,setResponse:r=>response=r,setPending:p=>pending=p};
}
test('member content is cleared before recheck; locked and unexpected responses cannot render it', async()=>{
  const app=await setup();
  assert.equal(app.get('full-read').hidden,false);
  let release; app.setPending(new Promise(resolve=>release=resolve));
  const check=vm.runInContext('refresh()',app.context);
  assert.equal(app.get('full-read').hidden,true);
  assert.equal(app.get('full-read').children.length,0);
  release({ok:true,json:async()=>({access:'locked',body:[{text:'must not render'}]})}); await check;
  app.setPending(null);
  for (const result of [{},{access:'unexpected'},{access:'member',signedIn:false},{access:'locked'}]) {
    app.setResponse({...result,body:[{text:'must not render'}]});
    await vm.runInContext('refresh()',app.context);
    assert.equal(app.get('full-read').hidden,true);
    assert.equal(app.get('full-read').children.length,0);
  }
});
test('backgrounding and sign-out remove member writing immediately',async()=>{
  const app=await setup();
  app.context.document.visibilityState='hidden'; app.events.visibilitychange();
  assert.equal(app.get('full-read').children.length,0);
  await vm.runInContext('refresh()',app.context);
  const signingOut=app.get('sign-out').listeners.click();
  assert.equal(app.get('full-read').children.length,0);
  await signingOut;
  app.windowEvents.pagehide();
  assert.equal(app.get('full-read').hidden,true);
});
test('verified paid guest access stays supported',async()=>{
  const app=await setup(); app.setResponse({access:'guest',signedIn:false,body:[{text:'paid essay'}]});
  await vm.runInContext('refresh()',app.context);
  assert.equal(app.get('full-read').hidden,false);
  assert.equal(app.get('guest-tools').hidden,false);
});
