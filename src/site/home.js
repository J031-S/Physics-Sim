// The homepage. Its text is the JSON block at the top of index.html; the
// simulation cards come from pages.js and the featured minitools from the
// catalogue, so neither can go out of date.
import { setupSite, setupSettingsPanel, pageUrl } from "./shell.js";
import { $ } from "./dom.js";
import { pages } from "./pages.js";
import { renderAllMath } from "./math.js";
import { renderIcons } from "./icons.js";
import { toolById } from "../minitools/catalogue.js";
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

const featured = document.querySelector(".home-featured");
for (const id of copy.featured) {
  const tool = toolById(id);
  if (tool) featured.append(toolCard(tool));
}
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
