import { activePaidMember, paidRead, settledCharge, validSecret, hash } from "../supabase/functions/innerg-reads/rules.ts";
import { fulfillRead } from "../supabase/functions/watchlist-stripe-webhook/reads-fulfillment.ts";
const assert = (value: unknown, message = "assertion failed") => { if (!value) throw new Error(message); };
const now = Date.parse("2026-09-10T12:00:00Z");
const member = {status:"active",payment_verified:true,access_expires_at:"2026-10-10T12:00:00Z"};
Deno.test("only active paid unexpired membership unlocks", () => {
  assert(activePaidMember(member,now));
  for (const value of [null,{}, {...member,payment_verified:false}, {...member,status:"past_due"}, {...member,access_expires_at:null}, {...member,access_expires_at:"2026-09-09"}]) assert(!activePaidMember(value,now));
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
