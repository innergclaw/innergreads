const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const origin = process.env.READS_TEST_ORIGIN || 'http://127.0.0.1:8791';
  try {
  for (const width of [1440,390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors=[]; page.on('pageerror', error=>errors.push(error.message));
    let mode='public', saved=false;
    await page.route('https://cdn.jsdelivr.net/**', route=>route.fulfill({contentType:'application/javascript',body:`export function createClient(){return {auth:{async getSession(){return {data:{session:${mode === 'member' ? '{access_token:"test"}' : 'null'}},error:null}},onAuthStateChange(){},async signOut(){return {error:null}}}}}`}));
    await page.route('**/functions/v1/innerg-reads', async route=>{
      const body=route.request().postDataJSON();
      if(mode==='error') return route.fulfill({status:503,json:{error:'read unavailable'}});
      if(body.action==='bookmark') {saved=body.saved; return route.fulfill({json:{saved}});}
      if(body.action==='feedback') return route.fulfill({json:{received:true}});
      if(body.action==='support_checkout') return route.fulfill({json:{checkoutUrl:'https://checkout.stripe.com/c/pay/test'}});
      return route.fulfill({json:{access:'public',signedIn:mode==='member',bookmarked:saved,body:[{type:'heading',text:'actions'},{type:'paragraph',text:'full public test passage.'}],comments:[{message:'a reader note. <img src=x onerror=alert(1)>',created_at:'2026-09-11T23:45:00.000Z'},{message:'a note with no recorded date.',created_at:null}]}});
    });
    await page.goto(origin+'/reads/?read=art-era');
    await page.locator('#full-read').waitFor({state:'visible'});
    assert.equal(await page.locator('#support').isVisible(),true);
    assert.equal(await page.locator('.support-explainer-link').getAttribute('href'),'./pay-as-you-wish/');
    assert.equal(await page.locator('#paywall').count(),0);
    assert((await page.locator('body').textContent()).includes('full public test passage.'));
    assert.equal(await page.locator('#read-index').isVisible(),false);
    assert.equal(await page.locator('#article-nav').isVisible(),true);
    assert.equal(await page.locator('[data-read-slug="art-era"]').getAttribute('aria-current'),'page');
    assert.equal(await page.locator('.art-concepts details').count(),3);
    assert.deepEqual(await page.locator('.art-concepts summary').allTextContents(),['actions','reactions','transactions']);
    assert.equal(await page.locator('.art-concepts details[open]').count(),0);
    assert(await page.evaluate(()=>Boolean(document.querySelector('.art-concepts').compareDocumentPosition(document.querySelector('#full-read')) & Node.DOCUMENT_POSITION_FOLLOWING)));
    const summary=page.locator('.art-concepts summary').first();
    await summary.focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('.art-concepts details').first().getAttribute('open'),'');
    await page.keyboard.press('Space');
    assert.equal(await page.locator('.art-concepts details').first().getAttribute('open'),null);
    await page.locator('.art-concepts summary').nth(2).click();
    assert.equal(await page.locator('.art-concepts details').nth(2).getAttribute('open'),'');
    assert.equal(await page.locator('#comments time').count(),1);
    assert.equal(await page.locator('#comments time').getAttribute('datetime'),'2026-09-11T23:45:00.000Z');
    assert.equal(await page.locator('#comments time').textContent(),'posted sep 11, 2026, 7:45 pm edt');
    assert.equal(await page.locator('#comments img').count(),0);
    await page.locator('body').click({position:{x:1,y:1}}); await page.keyboard.press('Tab');
    assert.equal(await page.locator('.skip').evaluate(element=>document.activeElement===element),true);
    await page.locator('#support-slider').fill('5');
    assert((await page.locator('#support-button').textContent()).includes('$5'));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');
    await page.screenshot({path:'/tmp/innerg-reads-public-'+width+'.png',fullPage:true});
    mode='member'; await page.reload(); await page.locator('#full-read').waitFor({state:'visible'});
    await page.locator('#bookmark').click(); await page.locator('#bookmark[aria-pressed="true"]').waitFor();
    await page.locator('#feedback').fill('a thoughtful test note.'); await page.locator('#feedback-form button').click();
    await page.locator('#feedback-status').filter({hasText:'saved for review'}).waitFor();
    mode='error'; await page.reload(); await page.locator('#retry').waitFor({state:'visible'});
    assert.equal(await page.locator('#full-read').isVisible(),false); assert.equal(await page.locator('#support').isVisible(),false);
    await page.emulateMedia({reducedMotion:'reduce'}); assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');
    assert.deepEqual(errors,[]); await page.close();
    console.log(width+'px: dated article archive, article selection, dropdowns, public read, support slider, comments, account tools and error states passed');
  }
  for (const width of [1440,390]) {
    const page=await browser.newPage({viewport:{width,height:900}}); let requestedSlug='';
    await page.route('https://cdn.jsdelivr.net/**', route=>route.fulfill({contentType:'application/javascript',body:'export function createClient(){return {auth:{async getSession(){return {data:{session:null},error:null}},onAuthStateChange(){}}}}'}));
    await page.route('**/functions/v1/innerg-reads', route=>{requestedSlug=route.request().postDataJSON().slug;return route.fulfill({json:{access:'public',signedIn:false,bookmarked:false,body:[{type:'paragraph',text:'latest public test passage.'},{type:'emphasis',text:'bold public test passage.'}],comments:[]}})});
    await page.goto(origin+'/reads/?read=black-men-step-up'); await page.locator('#full-read').waitFor({state:'visible'});
    assert.equal(requestedSlug,'black-men-step-up');
    assert.equal(await page.locator('#article-nav').isVisible(),true);
    assert.equal(await page.locator('#read-index').isVisible(),false);
    assert.equal(await page.locator('#read-title').textContent(),'calling black men, especially younger black men, back toward discipline, purpose, education, mentorship + thinking beyond the immediate moment.');
    assert.equal(await page.locator('.art-concepts').isVisible(),false);
    assert.equal(await page.locator('[data-read-slug="black-men-step-up"]').getAttribute('aria-current'),'page');
    assert.equal(await page.locator('#full-read strong').textContent(),'bold public test passage.');
    assert.equal(await page.locator('#support').isVisible(),true);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'latest article horizontal overflow');
    await page.screenshot({path:'/tmp/innerg-reads-004-'+width+'.png',fullPage:true}); await page.close();
    console.log(width+'px: article 004 title, emphasis, archive state, public body and support placement passed');
  }
  for (const width of [1440,390]) {
    const page=await browser.newPage({viewport:{width,height:900}}); let articleRequest=false;
    await page.route('https://cdn.jsdelivr.net/**', route=>route.fulfill({contentType:'application/javascript',body:'export function createClient(){return {auth:{async getSession(){return {data:{session:null},error:null}},onAuthStateChange(){}}}}'}));
    await page.route('**/functions/v1/innerg-reads', route=>{articleRequest=true;return route.abort()});
    await page.goto(origin+'/reads/');
    assert.equal(await page.locator('#index-intro').isVisible(),true);
    assert.equal(await page.locator('#read-index').isVisible(),true);
    assert.equal(await page.locator('nav a').filter({hasText:'pay as you wish'}).getAttribute('href'),'./pay-as-you-wish/');
    assert.equal(await page.locator('#article-feature').isVisible(),false);
    assert.equal(await page.locator('#reading-room').isVisible(),false);
    assert.equal(await page.locator('#support').isVisible(),false);
    assert.equal(await page.locator('.closing').isVisible(),true);
    assert.equal(await page.locator('.read-list details').count(),4);
    assert.deepEqual(await page.locator('.read-list time').allTextContents(),['sep 14, 2026','sep 12, 2026','sep 12, 2026','sep 11, 2026']);
    const summary=page.locator('.read-list summary').first(); await summary.focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('.read-list details').first().getAttribute('open'),'');
    assert((await page.locator('.read-list-copy').first().textContent()).includes('read article 004'));
    await page.keyboard.press('Space');
    assert.equal(await page.locator('.read-list details').first().getAttribute('open'),null);
    await page.locator('body').click({position:{x:1,y:1}});
    assert.equal(articleRequest,false);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'article index horizontal overflow');
    await page.screenshot({path:'/tmp/innerg-reads-index-'+width+'.png',fullPage:true}); await page.close();
    console.log(width+'px: homepage contains only the intro, dated accordion, closing section and footer');
  }
  for (const width of [1440,390]) {
    const page=await browser.newPage({viewport:{width,height:900}});
    await page.goto(origin+'/reads/pay-as-you-wish/');
    assert.equal(await page.locator('h1').textContent(),'the writing stays free.the support stays yours.');
    assert.equal(await page.locator('nav a[aria-current="page"]').textContent(),'pay as you wish');
    assert((await page.locator('.support-story-copy').textContent()).includes('i’m in a transitional stage'));
    assert((await page.locator('.support-story-copy').textContent()).includes('when somebody gives even $1'));
    assert.equal(await page.locator('#slider-example').getAttribute('min'),'1');
    assert.equal(await page.locator('#slider-example').getAttribute('max'),'5');
    assert.equal(await page.locator('#slider-example').isDisabled(),true);
    assert((await page.locator('.support').textContent()).includes('there is no locked ending and no pressure to pay'));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'pay as you wish page horizontal overflow');
    await page.screenshot({path:'/tmp/innerg-pay-as-you-wish-'+width+'.png',fullPage:true}); await page.close();
    console.log(width+'px: pay as you wish explanation and personal writing note passed');
  }
  {
    const page=await browser.newPage({viewport:{width:390,height:900}});
    await page.route('https://cdn.jsdelivr.net/**', route=>route.fulfill({contentType:'application/javascript',body:'export function createClient(){return {auth:{async getSession(){return {data:{session:null},error:null}},onAuthStateChange(){}}}}'}));
    await page.route('**/functions/v1/innerg-reads', route=>route.fulfill({json:{access:'public',signedIn:false,bookmarked:false,body:[{type:'paragraph',text:'article return test passage.'}],comments:[]}}));
    await page.goto(origin+'/reads/?read=philly-money-moving'); await page.locator('#full-read').waitFor({state:'visible'});
    await page.locator('#bookmark').click(); await page.waitForURL('**/account/?from=reads&read=philly-money-moving');
    assert.equal(await page.locator('#member-return-link').textContent(),'Back to article');
    assert.equal(await page.locator('#member-return-link').getAttribute('href'),'/reads/?read=philly-money-moving#reading-room');
    assert.equal(await page.locator('#member-email-form button').allTextContents().then(values=>values.join('|')),'Create account|Sign in');
    await page.locator('#member-return-link').click(); await page.waitForURL('**/reads/?read=philly-money-moving#reading-room');
    await page.close(); console.log('signed-out save opens InnerG ID access and returns to the selected article');
  }
  const noScript=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:900}});
  await noScript.goto(origin+'/reads/');
  await noScript.locator('.read-list summary').first().click();
  assert.equal(await noScript.locator('.read-list details').first().getAttribute('open'),'');
  await noScript.close(); console.log('the dated article archive remains usable without javascript');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
