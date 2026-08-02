type SignupPayload = {
  email?: string;
  source?: string;
  consent_copy_version?: string;
  company?: string;
};

const allowedOrigins = new Set([
  "https://www.innergreads.study",
  "https://innergreads.study",
  "http://127.0.0.1:4177",
  "http://localhost:4177",
]);

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://www.innergreads.study",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function jsonResponse(origin: string, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function env(name: string) {
  return Deno.env.get(name)?.trim() || "";
}

function cleanEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase().slice(0, 254);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function serviceHeaders(prefer = "") {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return {
    "Content-Type": "application/json",
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    ...(prefer ? { "Prefer": prefer } : {}),
  };
}

async function getSubscriber(email: string) {
  const query = new URLSearchParams({
    select: "id,confirmation_sent_at",
    email: `eq.${email}`,
    limit: "1",
  });
  const response = await fetch(`${env("SUPABASE_URL")}/rest/v1/innergreads_signups?${query}`, {
    headers: serviceHeaders(),
  });
  if (!response.ok) throw new Error("subscriber_lookup_failed");
  const rows = await response.json();
  return rows[0] || null;
}

async function saveSubscriber(email: string) {
  const response = await fetch(`${env("SUPABASE_URL")}/rest/v1/innergreads_signups`, {
    method: "POST",
    headers: serviceHeaders("return=representation"),
    body: JSON.stringify({
      email,
      source: "innergreads_home_gate",
      consent_copy_version: "2026-08-02",
    }),
  });
  if (!response.ok) throw new Error("subscriber_save_failed");
  const rows = await response.json();
  return rows[0];
}

async function updateConfirmation(email: string, values: Record<string, unknown>) {
  const response = await fetch(
    `${env("SUPABASE_URL")}/rest/v1/innergreads_signups?email=eq.${encodeURIComponent(email)}`,
    {
      method: "PATCH",
      headers: serviceHeaders("return=minimal"),
      body: JSON.stringify(values),
    },
  );
  if (!response.ok) throw new Error("confirmation_status_update_failed");
}

async function getBrevoApiKey() {
  const configuredKey = env("BREVO_API_KEY");
  if (configuredKey) return configuredKey;

  const response = await fetch(`${env("SUPABASE_URL")}/rest/v1/rpc/innergreads_get_brevo_api_key`, {
    method: "POST",
    headers: serviceHeaders(),
    body: "{}",
  });
  if (!response.ok) throw new Error("email_service_secret_unavailable");

  const vaultKey = await response.json().catch(() => "");
  if (typeof vaultKey !== "string" || !vaultKey.trim()) {
    throw new Error("email_service_not_configured");
  }
  return vaultKey.trim();
}

function confirmationEmailHtml() {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#171212;color:#f3eadb;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;">Your InnerGReads frequency has been confirmed.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#171212;">
      <tr>
        <td align="center" style="padding:38px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#f4ecdc;color:#1d1715;border-radius:18px;overflow:hidden;">
            <tr><td style="height:9px;background:#9f2f24;"></td></tr>
            <tr>
              <td style="padding:42px 42px 18px;">
                <p style="margin:0 0 34px;color:#9f2f24;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">InnerG Intelligence / Signal confirmed</p>
                <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:42px;line-height:1.02;font-weight:500;letter-spacing:-1.5px;">You are now inside the frequency.</h1>
                <p style="margin:24px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.65;color:#4e403a;">Your email has been added to the InnerGReads network. You will receive new frequencies, field notes, releases, and selected transmissions from InnerG Intelligence and Substack.</p>
                <p style="margin:18px 0 0;font-size:14px;line-height:1.65;color:#6a5951;"><strong style="color:#9f2f24;">No spam. No daily noise.</strong> Only ideas worth preserving.</p>
                <p style="margin:18px 0 0;font-size:14px;line-height:1.65;color:#6a5951;">When you return to InnerGReads, enter this same email to restore access. You will not be subscribed twice.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 42px 38px;">
                <a href="https://www.innergreads.study/" style="display:inline-block;margin:0 8px 8px 0;padding:15px 22px;background:#9f2f24;color:#fff8ec;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Open InnerGReads</a>
                <a href="https://open.substack.com/pub/innergintelligence" style="display:inline-block;margin:0 0 8px;padding:15px 22px;background:#2a211e;color:#fff8ec;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Read Substack</a>
                <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#7d6b62;">Explore the library at <a href="https://www.innergreads.study/" style="color:#9f2f24;">innergreads.study</a>.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 42px;background:#e7dcc9;font-size:11px;line-height:1.55;color:#75645c;">If you did not request this message, you can ignore it. To leave the list, reply with “unsubscribe.”</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendConfirmation(email: string) {
  const apiKey = await getBrevoApiKey();

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: "InnerGReads",
        email: env("BREVO_SENDER_EMAIL") || "ownyourwebsmm@gmail.com",
      },
      to: [{ email }],
      replyTo: {
        name: "InnerGReads",
        email: env("INNERGREADS_EMAIL_REPLY_TO") || "ownyourwebsmm@gmail.com",
      },
      subject: "Frequency confirmed — welcome to InnerGReads",
      htmlContent: confirmationEmailHtml(),
      textContent: [
        "You are now inside the frequency.",
        "",
        "Your email has been added to the InnerGReads network. You will receive new frequencies, field notes, releases, and selected transmissions from InnerG Intelligence and Substack.",
        "",
        "No spam. No daily noise. Only ideas worth preserving.",
        "",
        "When you return to InnerGReads, enter this same email to restore access. You will not be subscribed twice.",
        "",
        "Read InnerG Intelligence: https://open.substack.com/pub/innergintelligence",
        "Explore InnerGReads: https://www.innergreads.study/",
        "",
        "To leave the list, reply with unsubscribe.",
      ].join("\n"),
    }),
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";

  if (req.method === "OPTIONS") {
    if (!allowedOrigins.has(origin)) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") return jsonResponse(origin, { ok: false, error: "Method not allowed" }, 405);
  if (!allowedOrigins.has(origin)) return jsonResponse(origin, { ok: false, error: "Origin not allowed" }, 403);
  if (!env("SUPABASE_URL") || !env("SUPABASE_SERVICE_ROLE_KEY")) {
    return jsonResponse(origin, { ok: false, error: "Storage is unavailable" }, 503);
  }

  let body: SignupPayload;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(origin, { ok: false, error: "Invalid request" }, 400);
  }

  if (body.company) return jsonResponse(origin, { ok: true, confirmation: "skipped" });

  const email = cleanEmail(body.email);
  if (!isValidEmail(email)) return jsonResponse(origin, { ok: false, error: "A valid email is required" }, 400);
  if (body.source !== "innergreads_home_gate" || body.consent_copy_version !== "2026-08-02") {
    return jsonResponse(origin, { ok: false, error: "Invalid signup source" }, 400);
  }

  try {
    const subscriber = await getSubscriber(email);
    if (subscriber) {
      return jsonResponse(origin, { ok: true, stored: true, confirmation: "accepted" });
    }

    const newSubscriber = await saveSubscriber(email);

    const lastSent = newSubscriber.confirmation_sent_at
      ? new Date(newSubscriber.confirmation_sent_at).getTime()
      : 0;
    if (lastSent && Date.now() - lastSent < 15 * 60 * 1000) {
      return jsonResponse(origin, { ok: true, stored: true, confirmation: "accepted" });
    }

    const delivery = await sendConfirmation(email);
    const providerId = typeof delivery.data?.messageId === "string" ? delivery.data.messageId : null;

    await updateConfirmation(email, {
      confirmation_sent_at: delivery.ok ? new Date().toISOString() : null,
      confirmation_status: delivery.ok ? "sent" : "failed",
      confirmation_provider_id: providerId,
    });

    if (!delivery.ok) {
      console.error("innergreads_confirmation_failed", JSON.stringify(delivery.data));
      return jsonResponse(
        origin,
        {
          ok: false,
          error: "Confirmation could not be sent",
        },
        502,
      );
    }
    return jsonResponse(origin, { ok: true, stored: true, confirmation: "accepted" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "signup_failed";
    return jsonResponse(origin, { ok: false, error: message }, 500);
  }
});
