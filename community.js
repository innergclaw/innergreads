const body = document.body;
const mobileToggle = document.querySelector(".mobile-nav-toggle");
const channelLinks = [...document.querySelectorAll("[data-section-link]")];
const pathSteps = [...document.querySelectorAll("[data-path-step]")];
const progressCount = document.querySelector("#progress-count");
const progressBar = document.querySelector("#progress-bar");
const saveButtons = [...document.querySelectorAll("[data-save-class]")];
const noteSearch = document.querySelector("#note-search");
const filterButtons = [...document.querySelectorAll("[data-note-filter]")];
const noteCards = [...document.querySelectorAll("[data-note-topic]")];
const emptyNotes = document.querySelector("#empty-notes");
const discordChannels = [...document.querySelectorAll("[data-channel]")];
const roomName = document.querySelector("#room-name");
const roomTopic = document.querySelector("#room-topic");
const roomMessage = document.querySelector("#room-message p:last-child");
const roomPrompt = document.querySelector("#room-prompt");
const newsletterGate = document.querySelector("#newsletter-gate");
const newsletterCard = document.querySelector(".newsletter-card");
const newsletterForm = document.querySelector("#newsletter-form");
const newsletterEmail = document.querySelector("#newsletter-email");
const newsletterError = document.querySelector("#newsletter-error");
const newsletterFrame = document.querySelector('[name="newsletter-submit-frame"]');
const newsletterCloseButtons = [...document.querySelectorAll("[data-newsletter-close]")];

const storage = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // The experience remains usable when browser storage is unavailable.
    }
  },
};

let newsletterSubmitted = false;
let newsletterPreviousFocus = null;

function setNewsletterPageLock(isLocked) {
  body.classList.toggle("newsletter-open", isLocked);
}

function showNewsletterGate() {
  if (!newsletterGate) return;
  if (storage.get("innerg-newsletter-confirmed", false)) return;

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
  storage.set("innerg-newsletter-confirmed", true);

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

window.setTimeout(showNewsletterGate, 520);

function closeNavigation() {
  body.classList.remove("nav-open");
  mobileToggle?.setAttribute("aria-expanded", "false");
}

mobileToggle?.addEventListener("click", () => {
  const isOpen = body.classList.toggle("nav-open");
  mobileToggle.setAttribute("aria-expanded", String(isOpen));
});

channelLinks.forEach((link) => {
  link.addEventListener("click", closeNavigation);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeNavigation();
    hideNewsletterGate({ rememberDismissal: true });
  }

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

if ("IntersectionObserver" in window) {
  const sections = [...document.querySelectorAll(".section-anchor")];
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      channelLinks.forEach((link) => {
        const matches = link.getAttribute("href") === `#${visible.target.id}`;
        link.classList.toggle("is-active", matches);
      });
    },
    { rootMargin: "-18% 0px -64% 0px", threshold: [0.05, 0.2, 0.5] },
  );

  sections.forEach((section) => sectionObserver.observe(section));
}

const completedSteps = new Set(storage.get("innerg-study-path", []));

function updatePathProgress() {
  pathSteps.forEach((step) => {
    const isComplete = completedSteps.has(step.dataset.pathStep);
    step.setAttribute("aria-pressed", String(isComplete));
  });

  const completeCount = completedSteps.size;
  if (progressCount) progressCount.textContent = String(completeCount);
  if (progressBar) progressBar.style.width = `${(completeCount / pathSteps.length) * 100}%`;
  storage.set("innerg-study-path", [...completedSteps]);
}

pathSteps.forEach((step) => {
  step.addEventListener("click", () => {
    const id = step.dataset.pathStep;
    if (completedSteps.has(id)) completedSteps.delete(id);
    else completedSteps.add(id);
    updatePathProgress();
  });
});

updatePathProgress();

const savedClasses = new Set(storage.get("innerg-saved-classes", []));

function updateSavedClasses() {
  saveButtons.forEach((button) => {
    const isSaved = savedClasses.has(button.dataset.saveClass);
    button.classList.toggle("is-saved", isSaved);

    const icon = button.querySelector(".save-icon");
    if (icon) icon.textContent = isSaved ? "✓" : "+";

    const label = button.classList.contains("pulse-save")
      ? isSaved
        ? "Class saved"
        : "Save class"
      : isSaved
        ? "Saved to your path"
        : "Save this class";

    if (button.classList.contains("pulse-save")) {
      button.textContent = label;
    } else {
      button.lastChild.textContent = ` ${label}`;
    }
  });

  storage.set("innerg-saved-classes", [...savedClasses]);
}

saveButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const classId = button.dataset.saveClass;
    if (savedClasses.has(classId)) savedClasses.delete(classId);
    else savedClasses.add(classId);
    updateSavedClasses();
  });
});

updateSavedClasses();

let activeFilter = "all";

function updateNoteResults() {
  const query = noteSearch?.value.trim().toLowerCase() ?? "";
  let visibleCount = 0;

  noteCards.forEach((card) => {
    const matchesTopic =
      activeFilter === "all" || card.dataset.noteTopic === activeFilter;
    const matchesSearch = card.textContent.toLowerCase().includes(query);
    const isVisible = matchesTopic && matchesSearch;
    card.hidden = !isVisible;
    if (isVisible) visibleCount += 1;
  });

  if (emptyNotes) emptyNotes.hidden = visibleCount !== 0;
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.noteFilter;
    filterButtons.forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });
    updateNoteResults();
  });
});

noteSearch?.addEventListener("input", updateNoteResults);

const roomContent = {
  welcome: {
    name: "welcome-desk",
    topic: "Begin here. Learn how the Study Hall works.",
    message:
      "Welcome to the InnerG network. Introduce yourself with one thing you want to understand, build, or preserve.",
    prompt: "What do you want the InnerG ecosystem to help you build?",
  },
  ai: {
    name: "ai-agents-lab",
    topic: "Understand AI, test workflows, and share what actually works.",
    message:
      "This week we are breaking down AI agents: goals, context, tools, decisions, and the boundaries that keep a system useful.",
    prompt: "What repeated task would you trust a focused AI agent to help you complete?",
  },
  tech: {
    name: "technology-desk",
    topic: "Make emerging technology understandable and practical.",
    message:
      "Bring the technology you keep hearing about but have not had explained clearly. The goal is understanding before hype.",
    prompt: "What technology do you want explained in plain language?",
  },
  reads: {
    name: "reading-room",
    topic: "Books, verses, field notes, and ideas worth preserving.",
    message:
      "The current room is reading Verse 014 from The Final Frequency. The book is one doorway into the larger InnerG mission.",
    prompt: "What idea have you read that changed a real decision?",
  },
  builds: {
    name: "build-in-public",
    topic: "Turn what you learn into tools, media, businesses, and owned work.",
    message:
      "Share the thing you are building, the problem it solves, and the smallest version you can test with the community.",
    prompt: "What can you build this week instead of only researching?",
  },
};

discordChannels.forEach((button) => {
  button.addEventListener("click", () => {
    const content = roomContent[button.dataset.channel];
    if (!content) return;

    discordChannels.forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });

    if (roomName) roomName.textContent = content.name;
    if (roomTopic) roomTopic.textContent = content.topic;
    if (roomMessage) roomMessage.textContent = content.message;
    if (roomPrompt) roomPrompt.textContent = content.prompt;
  });
});
