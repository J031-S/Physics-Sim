import { iconSets } from "../vendor/icons/sets.js";
export const iconSetNames = Object.keys(iconSets);
export function renderIcons(set = "material") {
  const icons = iconSets[set] || iconSets.material;
  for (const button of document.querySelectorAll("[data-icon]")) {
    const icon = icons[button.dataset.icon];
    if (!icon) continue;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${icon.width} ${icon.height}`);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.classList.add("ui-icon");
    svg.innerHTML = icon.body;
    const label = document.createElement("span");
    label.textContent = button.dataset.iconLabel;
    if (button.dataset.iconOnly === "true") label.classList.add("sr-only");
    button.replaceChildren(svg, label);
    button.dataset.iconSet = set;
  }
}
export function prepareIcons() {
  for (const button of document.querySelectorAll("[data-tool]")) {
    const key = button.dataset.tool;
    button.dataset.icon = key;
    button.dataset.iconLabel = key[0].toUpperCase() + key.slice(1);
  }
  const controls = {
    "settings-toggle": ["settings", "Settings"],
    shortcuts: ["keys", "Keys"],
    pause: ["pause", "Pause"],
    clear: ["clear", "Clear scene"],
    delete: ["delete", "Delete"],
    "resize-object": ["resize", "Resize (R)"],
    "zoom-in": ["zoomIn", "Zoom in", true],
    "zoom-out": ["zoomOut", "Zoom out", true],
    "fit-scene": ["fit", "Fit scene"],
    "close-menu": ["close", "Close material constants", true],
    "close-settings": ["close", "Close simulation settings", true],
    "close-keys": ["close", "Close shortcuts", true],
  };
  for (const [id, [icon, label, only]] of Object.entries(controls)) {
    const button = document.getElementById(id);
    button.dataset.icon = icon;
    button.dataset.iconLabel = label;
    if (only) button.dataset.iconOnly = "true";
  }
}
export function setPlaybackIcon(running, set) {
  const button = document.getElementById("pause");
  button.dataset.icon = running ? "pause" : "play";
  button.dataset.iconLabel = running ? "Pause" : "Run";
  renderIcons(set);
}
