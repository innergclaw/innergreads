const newsletterBody = document.body;
const newsletterGate = document.querySelector("#newsletter-gate");
const newsletterForm = document.querySelector("#newsletter-form");
const newsletterEmail = document.querySelector("#newsletter-email");
const newsletterError = document.querySelector("#newsletter-error");
const newsletterFrame = document.querySelector('[name="newsletter-submit-frame"]');
const newsletterCloseButtons = [...document.querySelectorAll("[data-newsletter-close]")];

let newsletterSubmitted = false;
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
}

function showNewsletterGate() {
  if (!newsletterGate || getStoredNewsletterValue("innerg-newsletter-confirmed", false)) return;

  try {
    if (sessionStorage.getItem("innerg-newsletter-dismissed") === "true") return;
  } catch {
    // A blocked session store should not prevent the signup from working.
  }

  newsletterPreviousFocus = document.activeElement;
  newsletterGate.hidden = false;
  setNewsletterPageLock(true);

  requestAnimationFrame(() => {
    newsletterGate.classList.add("is-visible");
    window.setTimeout(() => newsletterEmail?.focus(), 360);
  });
}

function hideNewsletterGate({ rememberDismissal = false } = {}) {
  if (!newsletterGate || newsletterGate.hidden) return;

  newsletterGate.classList.remove("is-visible");
  newsletterGate.classList.add("is-closing");
  setNewsletterPageLock(false);

  if (rememberDismissal) {
    try {
      sessionStorage.setItem("innerg-newsletter-dismissed", "true");
    } catch {
      // The modal still closes when browser storage is unavailable.
    }
  }

  window.setTimeout(() => {
    newsletterGate.hidden = true;
    newsletterGate.classList.remove("is-closing", "is-confirmed", "is-exiting");
    newsletterPreviousFocus?.focus?.();
  }, 420);
}

function confirmNewsletterSignal() {
  if (!newsletterGate || newsletterGate.classList.contains("is-confirmed")) return;

  newsletterGate.classList.add("is-confirmed");
  newsletterGate.querySelector(".newsletter-confirmation")?.setAttribute("aria-hidden", "false");
  storeNewsletterValue("innerg-newsletter-confirmed", true);

  window.setTimeout(() => newsletterGate.classList.add("is-exiting"), 1050);
  window.setTimeout(() => {
    newsletterGate.hidden = true;
    newsletterGate.classList.remove("is-visible", "is-confirmed", "is-exiting");
    setNewsletterPageLock(false);
    newsletterPreviousFocus?.focus?.();
  }, 1780);
}

newsletterCloseButtons.forEach((button) => {
  button.addEventListener("click", () => hideNewsletterGate({ rememberDismissal: true }));
});

newsletterForm?.addEventListener("submit", (event) => {
  if (!newsletterEmail?.checkValidity()) {
    event.preventDefault();
    if (newsletterError) newsletterError.textContent = "Enter a valid email to join the network.";
    newsletterEmail?.focus();
    return;
  }

  if (newsletterError) newsletterError.textContent = "";
  newsletterSubmitted = true;
  newsletterForm.classList.add("is-sending");
  newsletterForm.querySelector("button[type='submit']")?.setAttribute("aria-busy", "true");
});

newsletterFrame?.addEventListener("load", () => {
  if (newsletterSubmitted) confirmNewsletterSignal();
});

newsletterEmail?.addEventListener("input", () => {
  if (newsletterError) newsletterError.textContent = "";
});

newsletterForm?.querySelectorAll('input[name="first_url"], input[name="current_url"]').forEach((input) => {
  input.value = window.location.href;
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideNewsletterGate({ rememberDismissal: true });

  if (event.key !== "Tab" || !newsletterGate || newsletterGate.hidden) return;

  const focusable = [...newsletterGate.querySelectorAll("button:not([disabled]), input:not([disabled]), a[href]")];
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
