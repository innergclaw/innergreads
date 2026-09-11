import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@22.6.1";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";
import { hash, paidSupport, settledSupport, validSecret, validSupportAmount, READ_SLUG, READ_HOME } from "./rules.ts";

const origins = new Set(["https://www.innergreads.study", "https://innergreads.study"]);
const env = (key: string) => Deno.env.get(key) || "";
const service = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const stripe = new Stripe(env("STRIPE_SECRET_KEY"));
const fail = (message: string, status = 400) => { throw Object.assign(new Error(message), { status }); };
const check = (result: any) => { if (result.error) fail("we could not save that change. please try again.", 503); return result.data; };

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  const headers = { "Access-Control-Allow-Origin": origins.has(origin) ? origin : "https://www.innergreads.study",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store, private", "Vary": "Origin", "Content-Type": "application/json" };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === "OPTIONS") return new Response(null, { status: origins.has(origin) ? 204 : 403, headers });
  if (req.method !== "POST") return reply({ error: "method not allowed" }, 405);
  if (!origins.has(origin)) return reply({ error: "open this read on innergreads.study" }, 403);
  try {
    const raw = await req.text();
    if (raw.length > 8000) return reply({ error: "request is too long" }, 413);
    const body = JSON.parse(raw);
    if (body.slug !== READ_SLUG) return reply({ error: "read not found" }, 404);
    const action = body.action;
    if (!["access", "support_checkout", "support_status", "bookmark", "feedback"].includes(action)) fail("unknown request");
    const article = check(await service.from("innerg_reads").select("slug,title,body,published").eq("slug", READ_SLUG).maybeSingle());
    if (!article?.published) return reply({ error: "this read is not available yet" }, 404);

    let user: any = null;
    const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
    if (token) {
      const result = await service.auth.getUser(token);
      if (result.error || !result.data.user) fail("please sign in again to use your innerg account.", 401);
      user = result.data.user;
    }
    if (action === "access") {
      const saved = user ? check(await service.from("innerg_read_bookmarks").select("slug").eq("user_id", user.id).eq("slug", READ_SLUG).maybeSingle()) : null;
      const comments = check(await service.from("innerg_read_feedback").select("message,created_at")
        .eq("slug", READ_SLUG).eq("approved", true).order("created_at", { ascending: false }).limit(20));
      return reply({ access: "public", signedIn: Boolean(user), bookmarked: Boolean(saved), title: article.title,
        body: article.body, comments });
    }
    if (action === "bookmark") {
      if (!user) fail("sign in to save this read to your account.", 401);
      if (typeof body.saved !== "boolean") fail("choose whether to save this read.");
      if (body.saved) check(await service.from("innerg_read_bookmarks").upsert({ user_id: user.id, slug: READ_SLUG }, { onConflict: "user_id,slug" }));
      else check(await service.from("innerg_read_bookmarks").delete().eq("user_id", user.id).eq("slug", READ_SLUG));
      return reply({ saved: body.saved });
    }
    if (action === "feedback") {
      if (!validSecret(body.readerId)) fail("reload the page before leaving a note.");
      const message = typeof body.message === "string" ? body.message.trim() : "";
      if (message.length < 3 || message.length > 1500) fail("write a note between 3 and 1,500 characters.");
      const readerHash = await hash(env("SUPABASE_SERVICE_ROLE_KEY") + ":reads:" + body.readerId);
      const { error } = await service.from("innerg_read_feedback").insert({ slug: READ_SLUG, reader_hash: readerHash, message });
      if (error?.code === "23505") fail("your note for today is already saved. thank you.", 409);
      if (error) fail("your note could not be saved. please try again.", 503);
      return reply({ received: true });
    }
    if (action === "support_status") {
      if (typeof body.sessionId !== "string" || !/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(body.sessionId)) fail("support session not found.");
      const session = await stripe.checkout.sessions.retrieve(body.sessionId, { expand: ["line_items", "payment_intent.latest_charge"] });
      const amount = Number(session.metadata?.support_amount);
      const confirmed = paidSupport(session) && settledSupport(session.payment_intent, amount);
      if (confirmed) check(await service.from("innerg_read_supports").update({ status: "paid", confirmed_at: new Date().toISOString() }).eq("session_id", body.sessionId));
      return reply({ confirmed, amount: validSupportAmount(amount) ? amount / 100 : null });
    }
    const amount = Number(body.amount) * 100;
    if (!validSupportAmount(amount)) fail("choose a support amount from $1 to $5.");
    if (!validSecret(body.intent)) fail("support checkout could not start. reload and try again.");
    const intentHash = await hash(body.intent);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (!ip) fail("support checkout is temporarily unavailable. please try again.", 503);
    const ipHash = await hash(env("SUPABASE_SERVICE_ROLE_KEY") + ":read-support:" + ip);
    const limit = await service.from("innerg_read_supports").select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash).gte("created_at", new Date(Date.now() - 3600000).toISOString());
    check(limit);
    if ((limit.count || 0) >= 8) fail("too many checkout attempts. please try again later.", 429);
    const existing = check(await service.from("innerg_read_supports").select("amount_cents,session_id,status")
      .eq("intent_hash", intentHash).maybeSingle());
    if (existing) {
      if (existing.amount_cents !== amount) fail("choose the amount again and restart checkout.", 409);
      if (existing.status === "paid") return reply({ alreadySupported: true });
      if (existing.session_id) {
        const prior = await stripe.checkout.sessions.retrieve(existing.session_id);
        if (prior.status === "open" && prior.url) return reply({ checkoutUrl: prior.url });
        if (prior.status === "complete") return reply({ alreadySupported: true });
      }
    } else {
      check(await service.from("innerg_read_supports").insert({ slug: READ_SLUG, intent_hash: intentHash, ip_hash: ipHash, amount_cents: amount }));
    }
    const session = await stripe.checkout.sessions.create({ mode: "payment", payment_method_types: ["card"],
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: amount,
        product_data: { name: "support innerg reads", description: "optional support for future personal reads by nasirr g. mayo." } } }],
      metadata: { product_key: "innerg_read_support", read_slug: READ_SLUG, support_amount: String(amount), support_intent: intentHash },
      success_url: READ_HOME + "?support_session_id={CHECKOUT_SESSION_ID}#support",
      cancel_url: READ_HOME + "#support",
      custom_text: { submit: { message: "this is an optional one-time contribution. the full essay is free to read." } },
    }, { idempotencyKey: "innerg-read-support:" + intentHash + ":" + amount });
    check(await service.from("innerg_read_supports").update({ session_id: session.id }).eq("intent_hash", intentHash));
    return reply({ checkoutUrl: session.url });
  } catch (error) {
    const status = (error as any)?.status || 503;
    return reply({ error: (error as any)?.status ? (error as Error).message : "we could not complete that request. please try again." }, status);
  }
});
