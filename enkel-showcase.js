const adviceShowcaseItems = Array.from(document.querySelectorAll("[data-showcase-advice]"));
const adviceShowcaseDetail = document.querySelector(".advice-preview-detail");
const adviceShowcaseTitle = adviceShowcaseDetail?.querySelector("[data-advice-title]");
const adviceShowcaseDescription = adviceShowcaseDetail?.querySelector("[data-advice-description]");
const adviceShowcaseLabel = adviceShowcaseDetail?.querySelector("[data-advice-label]");
const adviceShowcaseSource = adviceShowcaseDetail?.querySelector("[data-advice-source]");
const adviceShowcaseMetricLabel = adviceShowcaseDetail?.querySelector("[data-advice-metric-label]");
const adviceShowcaseMetric = adviceShowcaseDetail?.querySelector("[data-advice-metric]");
const adviceShowcaseAutoplayToggle = document.querySelector("[data-advice-autoplay-toggle]");
const adviceShowcaseAutoplayLabel = adviceShowcaseAutoplayToggle?.querySelector("[data-advice-autoplay-label]");
const adviceShowcaseMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const adviceShowcaseInterval = 4800;
let adviceShowcaseTimer = null;
let adviceShowcaseIsPaused = adviceShowcaseMotionQuery.matches;

function selectShowcaseAdvice(selectedItem) {
  adviceShowcaseItems.forEach((item) => {
    const isSelected = item === selectedItem;

    item.classList.toggle("is-active", isSelected);
    item.setAttribute("aria-pressed", String(isSelected));
  });

  adviceShowcaseTitle.textContent = selectedItem.dataset.adviceTitle;
  adviceShowcaseDescription.textContent = selectedItem.dataset.adviceDescription;
  adviceShowcaseLabel.textContent = selectedItem.dataset.adviceLabel;
  adviceShowcaseSource.textContent = selectedItem.dataset.adviceSource;
  adviceShowcaseMetricLabel.textContent = selectedItem.dataset.adviceMetricLabel;
  adviceShowcaseMetric.textContent = selectedItem.dataset.adviceMetric;
  adviceShowcaseDetail.dataset.adviceTone = selectedItem.dataset.adviceTone;

  adviceShowcaseDetail.classList.remove("is-changing");
  requestAnimationFrame(() => adviceShowcaseDetail.classList.add("is-changing"));
}

function updateShowcaseAutoplayControl() {
  if (!adviceShowcaseAutoplayToggle || !adviceShowcaseAutoplayLabel) return;

  adviceShowcaseAutoplayToggle.classList.toggle("is-paused", adviceShowcaseIsPaused);
  adviceShowcaseAutoplayToggle.setAttribute("aria-pressed", String(adviceShowcaseIsPaused));
  adviceShowcaseAutoplayToggle.setAttribute(
    "aria-label",
    adviceShowcaseIsPaused ? "Start automatisk visning" : "Stopp automatisk visning",
  );
  adviceShowcaseAutoplayLabel.textContent = adviceShowcaseIsPaused ? "Fortsett" : "Auto";
}

function stopShowcaseAutoplay() {
  window.clearInterval(adviceShowcaseTimer);
  adviceShowcaseTimer = null;
}

function startShowcaseAutoplay() {
  stopShowcaseAutoplay();
  updateShowcaseAutoplayControl();

  if (adviceShowcaseIsPaused || document.hidden) return;

  adviceShowcaseTimer = window.setInterval(() => {
    const selectedIndex = adviceShowcaseItems.findIndex((item) => item.classList.contains("is-active"));
    const nextIndex = (selectedIndex + 1) % adviceShowcaseItems.length;
    selectShowcaseAdvice(adviceShowcaseItems[nextIndex]);
  }, adviceShowcaseInterval);
}

if (
  adviceShowcaseItems.length > 0
  && adviceShowcaseTitle
  && adviceShowcaseDescription
  && adviceShowcaseLabel
  && adviceShowcaseSource
  && adviceShowcaseMetricLabel
  && adviceShowcaseMetric
) {
  adviceShowcaseItems.forEach((item) => {
    item.addEventListener("click", () => {
      selectShowcaseAdvice(item);
      startShowcaseAutoplay();
    });
  });

  adviceShowcaseAutoplayToggle?.addEventListener("click", () => {
    adviceShowcaseIsPaused = !adviceShowcaseIsPaused;
    startShowcaseAutoplay();
  });

  document.addEventListener("visibilitychange", startShowcaseAutoplay);
  adviceShowcaseMotionQuery.addEventListener("change", (event) => {
    adviceShowcaseIsPaused = event.matches;
    startShowcaseAutoplay();
  });

  startShowcaseAutoplay();
}
