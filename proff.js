const advice = {
  bemanning: {
    label: "Bemanning",
    title: "Flytt én vakt fra tirsdag til fredag.",
    why: "Fredag mellom 18 og 21 har 31 % høyere trykk enn tirsdag, mens bemanningen er lik. Scope foreslår en konkret flytting før neste vaktplan låses.",
    effect: "+8 400 kr per måned",
  },
  varekost: {
    label: "Varekost",
    title: "Juster innkjøpet av laks før helgen.",
    why: "Svinnet har økt tre helger på rad. Med samme salgstakt holder det å redusere bestillingen med 11 kg denne uken.",
    effect: "+3 200 kr per måned",
  },
  meny: {
    label: "Meny",
    title: "Løft retten gjestene allerede velger.",
    why: "Pastaen har høyest dekningsbidrag og flest gjenkjøp, men ligger nederst i menyen. Scope anbefaler én enkel plasseringstest.",
    effect: "+5 700 kr per måned",
  },
};

const setAdvice = (key) => {
  const item = advice[key];
  if (!item) return;

  document.querySelectorAll("[data-advice-button]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.adviceButton === key));
  });
  document.querySelector("[data-advice-label]").textContent = item.label;
  document.querySelector("[data-advice-title]").textContent = item.title;
  document.querySelector("[data-advice-why]").textContent = item.why;
  document.querySelector("[data-advice-effect]").textContent = item.effect;
};

document.querySelectorAll("[data-advice-button]").forEach((button) => {
  button.addEventListener("click", () => setAdvice(button.dataset.adviceButton));
});

const nav = document.querySelector("[data-nav]");
const updateNav = () => nav?.classList.toggle("is-scrolled", window.scrollY > 12);
updateNav();
window.addEventListener("scroll", updateNav, { passive: true });

const reveals = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  reveals.forEach((element) => observer.observe(element));
} else {
  reveals.forEach((element) => element.classList.add("is-visible"));
}
