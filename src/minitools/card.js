// A minitool's card (catalogue, homepage, component gallery): title, the
// equation (typeset by renderAllMath), purpose, and whether it is one
// equation or a combination. The developer review aids show its id and
// verified flag.
const root = new URL("../../", import.meta.url);
export const toolUrl = (tool) => new URL("minitools/" + tool.id, root).href;

export function reviewBadges(tool) {
  return `<span class="dev-review">${tool.id}</span><span class="dev-review${
    tool.verified ? "" : " unverified"
  }">${tool.verified ? "verified" : "not verified"}</span>`;
}

export function toolCard(tool) {
  const card = document.createElement("a");
  card.className = "card mt-card";
  card.href = toolUrl(tool);
  card.dataset.tool = tool.id;
  card.innerHTML = `<span class="mt-card-kind"></span>
    <strong class="mt-card-title"></strong>
    <span class="mt-card-equation" data-math></span>
    <span class="mt-card-purpose"></span>
    <span class="mt-card-review">${reviewBadges(tool)}</span>`;
  card.querySelector(".mt-card-kind").textContent =
    tool.kind === "combined" ? "Combination" : "One equation";
  card.querySelector(".mt-card-title").textContent = tool.title;
  // Full-size fractions and roots, as on the tool's own page (the box in
  // minitools.css is sized for them).
  card.querySelector(".mt-card-equation").dataset.math =
    "\\displaystyle " + tool.latex;
  card.querySelector(".mt-card-purpose").textContent = tool.purpose;
  return card;
}
