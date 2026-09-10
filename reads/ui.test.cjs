const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const origin = process.env.READS_TEST_ORIGIN || 'http://127.0.0.1:8791';
  for (const width of [1440,390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors=[];page.on('pageerror', e=>errors.push(e.message));
    await page.route('https://cdn.jsdelivr.net/**', route=>route.fulfill({contentType:'application/javascript',body:`export function createClient(){return {auth:{async getSession(){return {data:{session:null},error:null}},onAuthStateChange(){},async signOut(){return {error:null}}}}}`}));
    let mode='locked',saved=false;
    await page.route('**/functions/v1/innerg-reads', async route=>{
      const body=route.request().postDataJSON();
      if(mode==='error') return route.fulfill({status:503,json:{error:'access check unavailable'}});
      if(body.action==='bookmark') {saved=body.saved;return route.fulfill({json:{saved}});}
      if(body.action==='feedback') return route.fulfill({json:{received:true}});
      return route.fulfill({json:{access:mode,signedIn:mode==='member',bookmarked:saved,body:mode==='locked'?null:[{type:'heading',text:'actions'},{type:'paragraph',text:'protected test passage.'}],comments:[]}});
    });
    await page.goto(origin+'/reads/');
    await page.locator('#paywall').waitFor({state:'visible'});
    assert.equal(await page.locator('#full-read').isVisible(),false);
    assert(!await page.locator('body').textContent().then(s=>s.includes('protected test passage.')));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');
    await page.keyboard.press('Tab');assert.equal(await page.locator('.skip').evaluate(e=>document.activeElement===e),true);
    await page.screenshot({path:'/tmp/innerg-reads-'+width+'.png',fullPage:true});
    mode='member';await page.reload();await page.locator('#full-read').waitFor({state:'visible'});
    assert.equal(await page.locator('#paywall').isVisible(),false);
    await page.locator('#bookmark').click();assert.equal(await page.locator('#bookmark').getAttribute('aria-pressed'),'true');
    await page.locator('#feedback').fill('a thoughtful test note.');await page.locator('#feedback-form button').click();
    await page.locator('#feedback-status').filter({hasText:'saved for review'}).waitFor();
    mode='guest';await page.reload();await page.locator('#guest-tools').waitFor({state:'visible'});
    mode='error';await page.reload();await page.locator('#retry').waitFor({state:'visible'});
    assert.equal(await page.locator('#full-read').isVisible(),false);assert.equal(await page.locator('#paywall').isVisible(),false);
    await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');
    assert.deepEqual(errors,[]);await page.close();
    console.log(width+'px: locked, member, guest, bookmarks, anonymous note, error, focus and reduced motion passed');
  }
  await browser.close();
})().catch(error=>{console.error(error);process.exitCode=1});
