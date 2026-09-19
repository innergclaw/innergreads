import { activePaidMember, memberCanRead, paidRead, settledCharge, paidSupport, settledSupport, validReadSlug, validSupportAmount, validSecret, hash } from "../supabase/functions/innerg-reads/rules.ts";
import { fulfillRead } from "../supabase/functions/watchlist-stripe-webhook/reads-fulfillment.ts";
const assert = (value: unknown, message = "assertion failed") => { if (!value) throw new Error(message); };
const now = Date.parse("2026-09-10T12:00:00Z");
const member = {status:"active",payment_verified:true,access_expires_at:"2026-10-10T12:00:00Z"};
Deno.test("only published reader slugs are accepted", () => {
  assert(validReadSlug("art-era"));
  assert(validReadSlug("pull-the-plug-on-intelligence"));
  assert(validReadSlug("philly-money-moving"));
  assert(validReadSlug("black-men-step-up"));
  assert(validReadSlug("ya-hochu-zhenu"));
  for (const value of ["", "unknown", "../art-era", null, 2]) assert(!validReadSlug(value));
});
Deno.test("only active paid unexpired membership unlocks", () => {
  assert(activePaidMember(member,now));
  for (const value of [null,{}, {...member,payment_verified:false}, {...member,status:"past_due"}, {...member,access_expires_at:null}, {...member,access_expires_at:"2026-09-09"}]) assert(!activePaidMember(value,now));
});
Deno.test("original active numbered members read without a payment", () => {
  const original = {status:"active",access_source:"grandfathered",payment_verified:false,membership_number:"test-original-id",access_expires_at:null};
  assert(memberCanRead(original,now));
  for (const change of [{membership_number:null},{membership_number:""},{membership_number:" "},{status:"canceled"},{status:"pending"},{access_source:"stripe"}]) assert(!memberCanRead({...original,...change},now));
});
Deno.test("paid ID members remain included and inactive or unnumbered accounts remain locked", () => {
  const paid={...member,membership_number:"test-paid-id",access_source:"stripe"};
  assert(memberCanRead(paid,now));
  assert(!memberCanRead({...paid,access_expires_at:"2026-09-09"},now));
  assert(!memberCanRead({...paid,payment_verified:false},now));
  assert(!memberCanRead({...paid,membership_number:null},now));
  assert(!memberCanRead(null,now));
  assert(!memberCanRead({user_metadata:{membership_number:"copied-id",access_source:"grandfathered"}},now));
});
const session = {id:"cs_unit_test",status:"complete",payment_status:"paid",mode:"payment",currency:"usd",amount_total:100,
  metadata:{product_key:"innerg_read",read_slug:"art-era",access_hash:"hash"},
  line_items:{data:[{quantity:1,price:{unit_amount:100,currency:"usd"}}]},
  payment_intent:{status:"succeeded",amount_received:100,currency:"usd",latest_charge:{paid:true,disputed:false,refunded:false,amount_refunded:0}}};
Deno.test("guest needs exact product, amount, currency and secret", () => {
  assert(paidRead(session,"hash"));
  assert(!paidRead(session,"wrong"));
  for (const change of [{payment_status:"unpaid"},{status:"open"},{amount_total:1},{mode:"subscription"},{currency:"eur"},{metadata:{...session.metadata,product_key:"innerg_founding"}},{line_items:{data:[]}}]) assert(!paidRead({...session,...change},"hash"));
});
Deno.test("refunds and disputes never unlock", () => {
  const intent=session.payment_intent;
  assert(settledCharge(intent));
  for(const change of [{refunded:true},{amount_refunded:1},{disputed:true},{paid:false}]) assert(!settledCharge({...intent,latest_charge:{...intent.latest_charge,...change}}));
  assert(!settledCharge({...intent,status:"processing"}));
});
Deno.test("support accepts whole dollar choices from one through five", () => {
  for (const amount of [100,200,300,400,500]) assert(validSupportAmount(amount));
  for (const amount of [0,99,101,550,600,NaN]) assert(!validSupportAmount(amount));
});
Deno.test("support confirmation needs the exact product, amount and settled charge", () => {
  const support={...session,amount_total:300,metadata:{product_key:"innerg_read_support",read_slug:"art-era",support_amount:"300",support_intent:"hash"},
    line_items:{data:[{quantity:1,price:{unit_amount:300,currency:"usd"}}]},payment_intent:{...session.payment_intent,amount_received:300}};
  assert(paidSupport(support)); assert(settledSupport(support.payment_intent,300));
  assert(!paidSupport(support,"pull-the-plug-on-intelligence"));
  for (const change of [{amount_total:100},{payment_status:"unpaid"},{metadata:{...support.metadata,product_key:"innerg_read"}},{line_items:{data:[]}}]) assert(!paidSupport({...support,...change}));
  assert(!settledSupport({...support.payment_intent,latest_charge:{...support.payment_intent.latest_charge,refunded:true}},300));
});
Deno.test("capability is validated and stored as a hash", async () => {
  assert(validSecret("a".repeat(64))); assert(!validSecret("short")); assert(!validSecret("x".repeat(64)));
  assert((await hash("a".repeat(64))).length === 64); assert((await hash("a".repeat(64))) !== "a".repeat(64));
});
Deno.test("webhook fulfillment is repeat safe and does not touch member tables", async () => {
  let updates=0; const record={id:"purchase",session_id:session.id,status:"pending"};
  const service={from(table:string){assert(table==="innerg_read_purchases");return {
    select(){const chain:any={eq(){return chain},async maybeSingle(){return {data:record,error:null}}};return chain},
    update(value:any){return {async eq(){updates++;record.status=value.status;return {error:null}}}}
  }}};
  const stripe={checkout:{sessions:{async retrieve(){return session}}}};
  await fulfillRead(stripe,service,session.id); await fulfillRead(stripe,service,session.id); assert(updates===1);
});
