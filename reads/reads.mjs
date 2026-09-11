import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
const URL = "https://zkyhhoxcrjkhywblzehr.supabase.co";
const KEY = "sb_publishable_bdi3BexAKWDBaUIh40hJ_A_8CNVdnM_";
const client = createClient(URL, KEY);
const $ = id => document.getElementById(id);
let signedIn = false, saved = false, requestId = 0;
const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, "0")).join("");
let readerId = "";
try {
  readerId = localStorage.getItem("innerg-reads-reader-id") || randomId();
  localStorage.setItem("innerg-reads-reader-id", readerId);
} catch { readerId = randomId(); }
const status = (text, error = false) => { $("status").textContent = text; $("status").dataset.error = String(error); };
const supportStatus = (text, error = false) => { $("support-status").textContent = text; $("support-status").dataset.error = String(error); };

async function api(action, extra = {}) {
  const { data, error } = await client.auth.getSession();
  if (error) throw new Error("we could not check your sign-in. please try again.");
  const response = await fetch(URL + "/functions/v1/innerg-reads", { method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json", apikey: KEY, ...(data.session ? { Authorization: "Bearer " + data.session.access_token } : {}) },
    body: JSON.stringify({ action, slug: "art-era", ...extra }), signal: AbortSignal.timeout(25000) });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || "please try again."), { status: response.status });
  return result;
}

function renderBody(blocks) {
  $("full-read").replaceChildren();
  for (const block of blocks || []) {
    const el = document.createElement(block.type === "heading" ? "h3" : "p");
    el.textContent = block.text;
    $("full-read").append(el);
  }
}

async function refresh() {
  const id = ++requestId;
  $("retry").hidden = true;
  status("loading the full read...");
  try {
    const result = await api("access");
    if (id !== requestId) return;
    signedIn = result.signedIn === true;
    saved = result.bookmarked === true;
    $("sign-in").hidden = signedIn;
    $("sign-out").hidden = !signedIn;
    $("bookmark").textContent = saved ? "saved to my reads" : "save this read";
    $("bookmark").setAttribute("aria-pressed", String(saved));
    renderBody(result.body);
    $("full-read").hidden = false;
    $("support").hidden = false;
    $("feedback-section").hidden = false;
    status(signedIn ? "full read loaded. you are signed in with your innerg account." : "full read loaded. sign in only if you want to save it.");
    $("comments").replaceChildren();
    for (const comment of result.comments || []) {
      const note = document.createElement("blockquote"), by = document.createElement("small");
      note.textContent = comment.message;
      by.textContent = "anonymous reader";
      note.append(by); $("comments").append(note);
    }
  } catch (error) {
    if (id !== requestId) return;
    renderBody([]);
    $("full-read").hidden = true;
    $("support").hidden = true;
    $("feedback-section").hidden = true;
    $("retry").hidden = false;
    status(error.message || "the read could not load. please try again.", true);
  }
}

$("retry").addEventListener("click", refresh);
$("bookmark").addEventListener("click", async () => {
  if (!signedIn) { location.assign("/account/?from=reads"); return; }
  $("bookmark").disabled = true;
  try { const result = await api("bookmark", { saved: !saved }); saved = result.saved;
    $("bookmark").textContent = saved ? "saved to my reads" : "save this read";
    $("bookmark").setAttribute("aria-pressed", String(saved));
    status(saved ? "saved to your account. return here to pick up this read." : "removed from your saved reads.");
  } catch (error) { status(error.message, true); }
  finally { $("bookmark").disabled = false; }
});
$("sign-out").addEventListener("click", async () => {
  $("sign-out").disabled = true;
  const { error } = await client.auth.signOut();
  $("sign-out").disabled = false;
  if (error) status("sign-out failed. try again.", true); else refresh();
});

const updateSupport = () => {
  const amount = Number($("support-slider").value);
  $("support-value").textContent = String(amount);
  $("support-button").childNodes[0].textContent = `support with $${amount} `;
};
$("support-slider").addEventListener("input", updateSupport);
$("support-button").addEventListener("click", async () => {
  const button = $("support-button"), amount = Number($("support-slider").value);
  button.disabled = true;
  supportStatus(`opening your $${amount} support checkout...`);
  try {
    let intent = "";
    try {
      const stored = JSON.parse(sessionStorage.getItem("innerg-read-support") || "null");
      intent = stored?.amount === amount && /^[a-f0-9]{64}$/.test(stored.intent) ? stored.intent : randomId();
      sessionStorage.setItem("innerg-read-support", JSON.stringify({ amount, intent }));
    } catch { intent = randomId(); }
    const result = await api("support_checkout", { amount, intent });
    if (result.alreadySupported) {
      supportStatus("your support is already confirmed. thank you for helping fund the next read.");
      sessionStorage.removeItem("innerg-read-support");
      button.disabled = false;
      return;
    }
    if (!/^https:\/\/checkout\.stripe\.com\//.test(result.checkoutUrl)) throw new Error("secure checkout could not be opened.");
    location.assign(result.checkoutUrl);
  } catch (error) { supportStatus(error.message || "checkout could not open. please try again.", true); button.disabled = false; }
});

$("feedback-form").addEventListener("submit", async event => {
  event.preventDefault(); const button = event.currentTarget.querySelector("button"); button.disabled = true;
  try { await api("feedback", { readerId, message: $("feedback").value }); $("feedback").value = "";
    $("feedback-status").textContent = "thank you. your anonymous note is saved for review.";
  } catch (error) { $("feedback-status").textContent = error.message; }
  finally { button.disabled = false; }
});
client.auth.onAuthStateChange(() => setTimeout(refresh, 0));
updateSupport();
await refresh();

const supportSession = new URLSearchParams(location.search).get("support_session_id");
if (supportSession) {
  history.replaceState(null, "", location.pathname + "#support");
  supportStatus("confirming your support...");
  try {
    const result = await api("support_status", { sessionId: supportSession });
    supportStatus(result.confirmed ? `your $${result.amount} support is confirmed. thank you for helping fund the next read.` : "payment is not confirmed. no support payment has been recorded.", !result.confirmed);
    if (result.confirmed) sessionStorage.removeItem("innerg-read-support");
  } catch (error) { supportStatus(error.message || "support could not be confirmed. check your stripe receipt before trying again.", true); }
}
