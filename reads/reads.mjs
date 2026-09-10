import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
const URL = "https://zkyhhoxcrjkhywblzehr.supabase.co";
const KEY = "sb_publishable_bdi3BexAKWDBaUIh40hJ_A_8CNVdnM_";
const client = createClient(URL, KEY);
const $ = id => document.getElementById(id);
const keyName = "innerg-read-art-era-key";
let secret = "", signedIn = false, saved = false, requestId = 0;
const status = (text, error = false) => { $("status").textContent = text; $("status").dataset.error = String(error); };
const persist = value => { localStorage.setItem(keyName, value); if (localStorage.getItem(keyName) !== value) throw new Error("allow browser storage so your reading key can be saved before payment."); secret = value; };
try {
  const incoming = new URLSearchParams(location.hash.slice(1)).get("key");
  const stored = localStorage.getItem(keyName);
  if (incoming && /^[a-f0-9]{64}$/.test(incoming)) persist(incoming);
  else if (stored && /^[a-f0-9]{64}$/.test(stored)) secret = stored;
  if (incoming) history.replaceState(null, "", location.pathname + "#reading-room");
} catch { status("allow browser storage to keep a guest reading key on this device.", true); }

async function api(action, extra = {}) {
  const { data, error } = await client.auth.getSession();
  if (error) throw new Error("we could not check your sign-in. please try again.");
  const response = await fetch(URL + "/functions/v1/innerg-reads", { method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json", apikey: KEY, ...(data.session ? { Authorization: "Bearer " + data.session.access_token } : {}) },
    body: JSON.stringify({ action, slug: "art-era", secret, ...extra }), signal: AbortSignal.timeout(25000) });
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
  try {
    const result = await api("access");
    if (id !== requestId) return;
    signedIn = result.signedIn;
    saved = result.bookmarked;
    $("sign-in").hidden = signedIn;
    $("sign-out").hidden = !signedIn;
    $("bookmark").textContent = saved ? "saved to my reads" : "save this read";
    $("bookmark").setAttribute("aria-pressed", String(saved));
    const unlocked = result.access !== "locked";
    $("paywall").hidden = unlocked;
    $("public-excerpt").hidden = unlocked;
    $("full-read").hidden = !unlocked;
    $("feedback-section").hidden = !unlocked;
    $("guest-tools").hidden = result.access !== "guest";
    renderBody(unlocked ? result.body : []);
    status(result.access === "member" ? "included with your active paid innerg id. welcome to the reading room." : result.access === "guest" ? "your read is unlocked. thank you for supporting innerg reads." : signedIn ? "you are signed in. this read needs an active paid innerg id or a $1 guest purchase." : "you are reading the preview.");
    $("comments").replaceChildren();
    for (const comment of result.comments || []) {
      const note = document.createElement("blockquote"), by = document.createElement("small");
      note.textContent = comment.message;
      by.textContent = "anonymous reader";
      note.append(by); $("comments").append(note);
    }
  } catch (error) {
    if (id !== requestId) return;
    // Fail closed and remove previously visible text if entitlement rechecking fails.
    renderBody([]);
    $("full-read").hidden = true;
    $("feedback-section").hidden = true;
    $("guest-tools").hidden = true;
    $("public-excerpt").hidden = false;
    $("paywall").hidden = true;
    $("retry").hidden = false;
    status(error.message || "access could not be checked. please try again.", true);
  }
}

$("retry").addEventListener("click", refresh);
$("buy").addEventListener("click", async () => {
  $("buy").disabled = true;
  status("opening your $1 checkout...");
  try {
    if (!secret) persist(Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, "0")).join(""));
    const result = await api("checkout");
    if (result.alreadyUnlocked) { await refresh(); return; }
    if (!/^https:\/\/checkout\.stripe\.com\//.test(result.checkoutUrl)) throw new Error("secure checkout could not be opened.");
    location.assign(result.checkoutUrl);
  } catch (error) {
    if (error.status === 410) { localStorage.removeItem(keyName); secret = ""; }
    status(error.message, true);
  } finally { $("buy").disabled = false; }
});
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
const privateLink = () => "https://www.innergreads.study/reads/#key=" + secret;
$("copy-key").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(privateLink()); status("private link copied. keep it safe."); }
  catch { status("copy is unavailable. use download my reading key instead.", true); }
});
$("download-key").addEventListener("click", () => {
  const blob = new Blob(["your private innerg reads link\n\n" + privateLink() + "\n\nkeep this link private. anyone with it can open your purchased read.\n"], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob), anchor = document.createElement("a");
  anchor.href = url; anchor.download = "innerg-art-reading-key.txt"; anchor.click();
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
});
$("feedback-form").addEventListener("submit", async event => {
  event.preventDefault(); const button = event.currentTarget.querySelector("button"); button.disabled = true;
  try { await api("feedback", { message: $("feedback").value }); $("feedback").value = "";
    $("feedback-status").textContent = "thank you. your anonymous note is saved for review.";
  } catch (error) { $("feedback-status").textContent = error.message; }
  finally { button.disabled = false; }
});
client.auth.onAuthStateChange(event => {
  if (event === "SIGNED_OUT") {
    requestId++;
    renderBody([]);
    $("full-read").hidden = true;
    $("feedback-section").hidden = true;
    $("guest-tools").hidden = true;
  }
  setTimeout(refresh, 0);
});
refresh();
