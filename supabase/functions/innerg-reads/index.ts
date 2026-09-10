import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@22.6.1";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";
import { activePaidMember, paidRead, settledCharge, hash, validSecret, READ_SLUG, READ_PRICE, READ_HOME } from "./rules.ts";

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
    if (!["access", "checkout", "bookmark", "feedback"].includes(action)) fail("unknown request");
    const article = check(await service.from("innerg_reads").select("slug,title,body,published").eq("slug", READ_SLUG).maybeSingle());
    if (!article?.published) return reply({ error: "this read is not available yet" }, 404);

    // Identity comes only from the Auth server. Membership is read from the database.
    let user: any = null;
    const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
    if (token) {
      const result = await service.auth.getUser(token);
      if (result.error || !result.data.user) fail("please sign in again to check your member access.", 401);
      user = result.data.user;
    }
    let memberAccess = false;
    if (user) {
      const member = check(await service.from("innerg_memberships")
        .select("status,payment_verified,access_expires_at").eq("user_id", user.id).maybeSingle());
      memberAccess = activePaidMember(member);
    }
    const accessHash = validSecret(body.secret) ? await hash(body.secret) : null;
    const purchase = accessHash ? check(await service.from("innerg_read_purchases").select("*")
      .eq("access_hash", accessHash).eq("slug", READ_SLUG).maybeSingle()) : null;
    let guestAccess = false;
    // Check current Stripe state, including refunds/disputes, instead of trusting a return URL or stale flag.
    if (!memberAccess && purchase?.session_id && purchase.status !== "revoked") {
      const session = await stripe.checkout.sessions.retrieve(purchase.session_id, { expand: ["line_items", "payment_intent.latest_charge"] });
      guestAccess = paidRead(session, accessHash!) && settledCharge(session.payment_intent);
      if (guestAccess && purchase.status !== "paid") {
        check(await service.from("innerg_read_purchases").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", purchase.id));
      }
    }
    const access = memberAccess ? "member" : guestAccess ? "guest" : "locked";
    if (action === "access") {
      const saved = user ? check(await service.from("innerg_read_bookmarks").select("slug").eq("user_id", user.id).eq("slug", READ_SLUG).maybeSingle()) : null;
      const comments = check(await service.from("innerg_read_feedback").select("message,created_at")
        .eq("slug", READ_SLUG).eq("approved", true).order("created_at", { ascending: false }).limit(20));
      return reply({ access, signedIn: Boolean(user), bookmarked: Boolean(saved), title: article.title,
        body: access !== "locked" ? article.body : null, comments: access !== "locked" ? comments : [] });
    }
    if (action === "bookmark") {
      if (!user) fail("sign in to save this read to your account.", 401);
      if (typeof body.saved !== "boolean") fail("choose whether to save this read.");
      if (body.saved) check(await service.from("innerg_read_bookmarks").upsert({ user_id: user.id, slug: READ_SLUG }, { onConflict: "user_id,slug" }));
      else check(await service.from("innerg_read_bookmarks").delete().eq("user_id", user.id).eq("slug", READ_SLUG));
      return reply({ saved: body.saved });
    }
    if (action === "feedback") {
      if (access === "locked") fail("unlock the read before leaving a note.", 403);
      const message = typeof body.message === "string" ? body.message.trim() : "";
      if (message.length < 3 || message.length > 1500) fail("write a note between 3 and 1,500 characters.");
      // One anonymous note per reader per day. A one-way hash prevents names/emails appearing in feedback.
      const readerHash = await hash(env("SUPABASE_SERVICE_ROLE_KEY") + ":reads:" + (guestAccess ? accessHash : user.id));
      const { error } = await service.from("innerg_read_feedback").insert({ slug: READ_SLUG, reader_hash: readerHash, message });
      if (error?.code === "23505") fail("your note for today is already saved. thank you.", 409);
      if (error) fail("your note could not be saved. please try again.", 503);
      return reply({ received: true });
    }
    if (access !== "locked") return reply({ alreadyUnlocked: true });
    if (!accessHash) fail("your private reading key could not be created. reload and try again.");
    if (purchase?.session_id) {
      const existing = await stripe.checkout.sessions.retrieve(purchase.session_id);
      if (existing.status === "open" && existing.url) return reply({ checkoutUrl: existing.url });
      if (existing.status === "complete") fail("payment could not be verified. contact support before paying again.", 409);
      fail("this checkout expired. start a new checkout.", 410);
    }
    // A persisted attempt and Stripe idempotency key prevent duplicate Checkout sessions on retries.
    if (purchase && Date.now() - Date.parse(purchase.created_at) > 23 * 60 * 60 * 1000) fail("this checkout expired. start a new checkout.", 410);
    if (!purchase) {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      if (!ip) fail("checkout is temporarily unavailable. please try again.", 503);
      const ipHash = await hash(env("SUPABASE_SERVICE_ROLE_KEY") + ":reads-ip:" + ip);
      const limit = await service.from("innerg_read_purchases").select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash).gte("created_at", new Date(Date.now() - 3600000).toISOString());
      check(limit);
      if ((limit.count || 0) >= 8) fail("too many checkout attempts. please try again later.", 429);
      check(await service.from("innerg_read_purchases").upsert({ slug: READ_SLUG, access_hash: accessHash, ip_hash: ipHash }, { onConflict: "access_hash", ignoreDuplicates: true }));
    }
    const session = await stripe.checkout.sessions.create({ mode: "payment", payment_method_types: ["card"],
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: READ_PRICE,
        product_data: { name: "a.r.t. era | innerg reads", description: "one personal essay by nasirr g. mayo. one-time purchase, no subscription." } } }],
      metadata: { product_key: "innerg_read", read_slug: READ_SLUG, access_hash: accessHash },
      success_url: READ_HOME + "#key=" + body.secret,
      cancel_url: READ_HOME + "#checkout-cancelled",
      custom_text: { submit: { message: "save your private reading link after payment. this purchase unlocks one essay and does not create an INNERG membership." } },
    }, { idempotencyKey: "innerg-read:" + accessHash });
    check(await service.from("innerg_read_purchases").update({ session_id: session.id }).eq("access_hash", accessHash));
    return reply({ checkoutUrl: session.url });
  } catch (error) {
    const status = (error as any)?.status || 503;
    return reply({ error: (error as any)?.status ? (error as Error).message : "we could not complete that request. please try again." }, status);
  }
});
