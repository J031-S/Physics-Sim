// The homepage. Its text is the JSON block at the top of index.html; the
// simulation cards come from pages.js and the featured minitools from the
// catalogue, so neither can go out of date.
import { setupSite, setupSettingsPanel, pageUrl } from "./shell.js";
import { $ } from "./dom.js";
import { pages } from "./pages.js";
import { renderAllMath } from "./math.js";
import { renderIcons } from "./icons.js";
import { tools, toolById } from "../minitools/catalogue.js";
import { toolCard } from "../minitools/card.js";

const prefs = setupSite();
setupSettingsPanel();

const copy = JSON.parse($("home-copy").textContent);
for (const el of document.querySelectorAll("[data-copy]"))
  el.textContent = copy[el.dataset.copy] ?? "";

// The GitHub links carry the GitHub icon, drawn like every other icon.
for (const el of document.querySelectorAll("[data-copy-label]"))
  el.dataset.iconLabel = copy[el.dataset.copyLabel] ?? "";
renderIcons(prefs.iconWeight);

const sims = document.querySelector(".home-sims");
for (const page of pages.filter((p) => p.group === "simulation")) {
  const card = document.createElement("a");
  card.className = "card home-sim";
  card.href = pageUrl(page);
  card.innerHTML = `<strong></strong><span class="home-sim-short"></span><span class="home-sim-text"></span>`;
  card.querySelector("strong").textContent = page.title;
  card.querySelector(".home-sim-short").textContent = page.description;
  card.querySelector(".home-sim-text").textContent =
    copy.simulations[page.id] ?? "";
  sims.append(card);
}

const about = document.querySelector(".home-about-text");
for (const text of copy.about ?? []) {
  const p = document.createElement("p");
  p.textContent = text;
  about.append(p);
}

// Every minitool, the featured ones first, in a row that scrolls sideways.
const featured = document.querySelector(".home-featured"),
  first = copy.featured.map(toolById).filter(Boolean);
for (const tool of [...first, ...tools.filter((t) => !first.includes(t))])
  featured.append(toolCard(tool));
const steps = [...document.querySelectorAll(".carousel-step")];
function updateSteps() {
  const end = featured.scrollWidth - featured.clientWidth - 2;
  steps[0].disabled = featured.scrollLeft <= 2;
  steps[1].disabled = featured.scrollLeft >= end;
}
for (const button of steps)
  button.addEventListener("click", () =>
    featured.scrollBy({
      // Most of a screenful, so the last card seen stays in view.
      left: Number(button.dataset.step) * featured.clientWidth * 0.85,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    }),
  );
featured.addEventListener("scroll", updateSteps, { passive: true });
window.addEventListener("resize", updateSteps);
featured.addEventListener("keydown", (e) => {
  if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
  e.preventDefault();
  steps[e.key === "ArrowLeft" ? 0 : 1].click();
});
document.querySelector(".home-more").href = pageUrl(
  pages.find((p) => p.id === "minitools"),
);

const how = document.querySelector(".home-how");
for (const line of copy.how) {
  const item = document.createElement("li");
  item.textContent = line;
  how.append(item);
}
renderAllMath(featured);
updateSteps();
