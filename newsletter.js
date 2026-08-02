const newsletterBody = document.body;
const newsletterGate = document.querySelector("#newsletter-gate");
const newsletterForm = document.querySelector("#newsletter-form");
const newsletterEmail = document.querySelector("#newsletter-email");
const newsletterError = document.querySelector("#newsletter-error");
const newsletterCompany = document.querySelector("#newsletter-company");
const newsletterSubmitButton = newsletterForm?.querySelector("button[type='submit']");

const NEWSLETTER_ENDPOINT =
  "https://zkyhhoxcrjkhywblzehr.supabase.co/functions/v1/innergreads-signup";

let newsletterPreviousFocus = null;

function getStoredNewsletterValue(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function storeNewsletterValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The form remains usable when browser storage is unavailable.
  }
}

function setNewsletterPageLock(isLocked) {
  newsletterBody.classList.toggle("newsletter-open", isLocked);
  document.querySelectorAll("body > :not(.newsletter-gate)").forEach((element) => {
    if (isLocked) element.setAttribute("inert", "");
    else element.removeAttribute("inert");
  });
}

function showNewsletterGate() {
  if (!newsletterGate || getStoredNewsletterValue("innerg-newsletter-confirmed", false)) return;

  newsletterPreviousFocus = document.activeElement;
  newsletterGate.hidden = false;
  setNewsletterPageLock(true);

  requestAnimationFrame(() => {
    newsletterGate.classList.add("is-visible");
    window.setTimeout(() => newsletterEmail?.focus(), 360);
  });
}

function confirmNewsletterSignal() {
  if (!newsletterGate || newsletterGate.classList.contains("is-confirmed")) return;

  storeNewsletterValue("innerg-newsletter-confirmed", true);
  newsletterGate.classList.add("is-confirmed");
  newsletterGate.querySelector(".newsletter-confirmation")?.setAttribute("aria-hidden", "false");

  window.setTimeout(() => newsletterGate.classList.add("is-exiting"), 1050);
  window.setTimeout(() => {
    newsletterGate.hidden = true;
    newsletterGate.classList.remove("is-visible", "is-confirmed", "is-exiting");
    setNewsletterPageLock(false);
    newsletterPreviousFocus?.focus?.();
  }, 1780);
}

newsletterForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!newsletterEmail?.checkValidity()) {
    if (newsletterError) newsletterError.textContent = "Enter a valid email to continue.";
    newsletterEmail?.focus();
    return;
  }

  if (newsletterCompany?.value) return;

  if (newsletterError) newsletterError.textContent = "";
  newsletterForm.classList.add("is-sending");
  newsletterSubmitButton?.setAttribute("aria-busy", "true");
  if (newsletterSubmitButton) newsletterSubmitButton.disabled = true;

  const email = newsletterEmail.value.trim().toLowerCase();

  try {
    const response = await fetch(NEWSLETTER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        source: "innergreads_home_gate",
        consent_copy_version: "2026-08-02",
        company: newsletterCompany?.value || "",
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error("signup_failed");

    confirmNewsletterSignal();
  } catch {
    if (newsletterError) {
      newsletterError.textContent = "We could not confirm access. Check your email and try again.";
    }
    newsletterForm.classList.remove("is-sending");
    newsletterSubmitButton?.removeAttribute("aria-busy");
    if (newsletterSubmitButton) newsletterSubmitButton.disabled = false;
  }
});

newsletterEmail?.addEventListener("input", () => {
  if (newsletterError) newsletterError.textContent = "";
});

window.addEventListener("keydown", (event) => {
  if (event.key !== "Tab" || !newsletterGate || newsletterGate.hidden) return;

  const focusable = [
    ...newsletterGate.querySelectorAll(
      'button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), a[href]'
    ),
  ];
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

window.setTimeout(showNewsletterGate, 420);
