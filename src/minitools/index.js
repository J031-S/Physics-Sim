// The minitool catalogue (/minitools/): cards grouped by topic, with a search
// box, a topic filter and a filter for single equations or combinations.
import { setupSite, setupSettingsPanel } from "../site/shell.js";
import { $, option } from "../site/dom.js";
import { renderAllMath } from "../site/math.js";
import { tools, TOPICS } from "./catalogue.js";
import { toolCard } from "./card.js";

setupSite();
setupSettingsPanel();

const list = $("catalogue"),
  search = $("tool-search"),
  topic = $("tool-topic"),
  count = $("tool-count");
topic.append(...TOPICS.map((t) => option(t, t)));

// Every card is built once; filtering only hides them.
const sections = new Map();
for (const name of TOPICS) {
  const section = document.createElement("section");
  section.className = "mt-topic-group";
  section.setAttribute("aria-labelledby", "topic-" + sections.size);
  section.innerHTML = `<h2 id="topic-${sections.size}"></h2><div class="mt-grid"></div>`;
  section.querySelector("h2").textContent = name;
  for (const tool of tools.filter((t) => t.topic === name))
    section.querySelector(".mt-grid").append(toolCard(tool));
  sections.set(name, section);
  list.append(section);
}

function filter() {
  const words = search.value.toLowerCase().split(/\s+/).filter(Boolean),
    kind = document.querySelector('input[name="tool-kind"]:checked').value;
  let shown = 0;
  for (const [name, section] of sections) {
    let any = false;
    for (const card of section.querySelectorAll(".mt-card")) {
      const tool = tools.find((t) => t.id === card.dataset.tool),
        text = [tool.title, tool.purpose, tool.topic, tool.id]
          .join(" ")
          .toLowerCase(),
        visible =
          (!topic.value || topic.value === name) &&
          (kind === "all" || tool.kind === kind) &&
          words.every((w) => text.includes(w));
      card.hidden = !visible;
      if (visible) {
        any = true;
        shown++;
      }
    }
    section.hidden = !any;
  }
  count.textContent =
    shown === tools.length
      ? `${tools.length} minitools`
      : `${shown} of ${tools.length} minitools`;
}
search.addEventListener("input", filter);
topic.addEventListener("change", filter);
for (const radio of document.querySelectorAll('input[name="tool-kind"]'))
  radio.addEventListener("change", filter);
filter();
renderAllMath(list);
