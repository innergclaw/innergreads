const body = document.body;
const intro = document.querySelector(".intro");
const menuToggle = document.querySelector(".menu-toggle");
const menuLinks = document.querySelectorAll(".site-nav a");
const revealItems = document.querySelectorAll(".reveal");
const bookStage = document.querySelector("[data-tilt]");
const bookObject = bookStage?.querySelector(".book-object");
const year = document.querySelector("#year");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (year) {
  year.textContent = new Date().getFullYear();
}

if (intro && !reducedMotion.matches) {
  window.addEventListener("load", () => {
    window.setTimeout(() => intro.classList.add("is-finished"), 1750);
  });
} else {
  intro?.classList.add("is-finished");
}

if ("IntersectionObserver" in window && !reducedMotion.matches) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

function closeMenu() {
  body.classList.remove("menu-open");
  menuToggle?.setAttribute("aria-expanded", "false");
}

menuToggle?.addEventListener("click", () => {
  const isOpen = body.classList.toggle("menu-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

menuLinks.forEach((link) => link.addEventListener("click", closeMenu));

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

if (bookStage && bookObject && !reducedMotion.matches) {
  bookStage.addEventListener("pointermove", (event) => {
    const rect = bookStage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateY = -15 + x * 18;
    const rotateX = 8 - y * 16;

    bookObject.style.setProperty("--rotate-x", `${rotateX.toFixed(2)}deg`);
    bookObject.style.setProperty("--rotate-y", `${rotateY.toFixed(2)}deg`);
    bookObject.style.setProperty("--glare-x", `${(x * 100).toFixed(1)}%`);
    bookObject.style.setProperty("--glare-y", `${(y * 100).toFixed(1)}%`);
  });

  bookStage.addEventListener("pointerleave", () => {
    bookObject.style.setProperty("--rotate-x", "-3deg");
    bookObject.style.setProperty("--rotate-y", "-11deg");
    bookObject.style.setProperty("--glare-x", "50%");
    bookObject.style.setProperty("--glare-y", "20%");
  });
}
