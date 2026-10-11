// The homepage. Its text is the JSON block at the top of index.html; the
// simulation cards come from pages.js and the featured minitools from the
// catalogue, so neither can go out of date.
import { setupSite, setupSettingsPanel, pageUrl } from "./shell.js";
import { $ } from "./dom.js";
import { pages } from "./pages.js";
import { renderAllMath } from "./math.js";
import { iconSets } from "../../vendor/icons/sets.js";
import { toolById } from "../minitools/catalogue.js";
import { toolCard } from "../minitools/card.js";

setupSite();
setupSettingsPanel();

const copy = JSON.parse($("home-copy").textContent);
for (const el of document.querySelectorAll("[data-copy]"))
  el.textContent = copy[el.dataset.copy] ?? "";

// The GitHub mark (from the bundled Bootstrap Icons) whatever icon set the
// interface uses.
const mark = iconSets.bootstrap.github;
for (const el of document.querySelectorAll("[data-github]"))
  el.outerHTML = `<svg class="home-github-mark" viewBox="0 0 ${mark.width} ${mark.height}" aria-hidden="true" focusable="false">${mark.body}</svg>`;

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
