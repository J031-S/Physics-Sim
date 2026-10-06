// Non-modal property popover. Uses the same field renderer as the inspector.
export function createObjectMenu({ render, getSelected, onInspector }) {
  const menu = document.createElement("section");
  menu.id = "object-menu";
  menu.className = "object-menu";
  menu.hidden = true;
  menu.setAttribute("role", "dialog");
  menu.setAttribute("aria-labelledby", "object-menu-title");
  const header = document.createElement("div");
  header.className = "object-menu-header";
  const title = document.createElement("strong");
  title.id = "object-menu-title";
  const closeButton = document.createElement("button");
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "Close object properties");
  header.append(title, closeButton);
  const hint = document.createElement("p");
  hint.className = "object-menu-hint";
  hint.textContent =
    "Live properties · playback continues. Enter or leave a field to apply.";
  const content = document.createElement("div");
  content.className = "object-menu-content";
  const footer = document.createElement("button");
  footer.className = "object-menu-inspect";
  footer.textContent = "Open in inspector ↗";
  menu.append(header, hint, content, footer);
  document.body.append(menu);
  let targetId = null,
    point = { x: 0, y: 0 },
    returnFocus = null;
  function position() {
    const margin = 10,
      width =
        menu.getBoundingClientRect().width ||
        Math.min(340, window.innerWidth - 20);
    menu.style.maxHeight =
      Math.max(120, window.innerHeight - 2 * margin) + "px";
    const height =
      menu.getBoundingClientRect().height ||
      Math.min(560, window.innerHeight - 20);
    menu.style.left =
      Math.max(margin, Math.min(point.x, window.innerWidth - width - margin)) +
      "px";
    menu.style.top =
      Math.max(
        margin,
        Math.min(point.y, window.innerHeight - height - margin),
      ) + "px";
  }
  function close(restoreFocus = false) {
    if (menu.hidden) return;
    menu.hidden = true;
    targetId = null;
    content.replaceChildren();
    if (restoreFocus && returnFocus?.isConnected) returnFocus.focus();
  }
  function refresh() {
    if (menu.hidden) return;
    const object = getSelected();
    if (!object || object.id !== targetId) {
      close();
      return;
    }
    const focused = menu.contains(document.activeElement)
      ? document.activeElement.getAttribute("aria-label")
      : null;
    const scrollTop = content.scrollTop;
    title.textContent = object.name || object.type;
    render(content);
    content.scrollTop = scrollTop;
    if (focused)
      [...content.querySelectorAll("[aria-label]")]
        .find((el) => el.getAttribute("aria-label") === focused)
        ?.focus();
    position();
  }
  function open(x, y) {
    const object = getSelected();
    if (!object) return;
    returnFocus = document.activeElement;
    targetId = object.id;
    point = { x, y };
    menu.hidden = false;
    refresh();
    closeButton.focus();
  }
  closeButton.onclick = () => close(true);
  footer.onclick = () => {
    close();
    onInspector();
  };
  menu.addEventListener("contextmenu", (e) => e.preventDefault());
  menu.addEventListener("keydown", (e) => {
    // Text edits and menu buttons must never activate canvas shortcuts.
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    }
    if (
      e.key === "Enter" &&
      e.target.tagName === "INPUT" &&
      e.target.type !== "checkbox" &&
      e.target.type !== "color"
    ) {
      e.preventDefault();
      e.target.blur();
    }
  });
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!menu.hidden && !menu.contains(e.target)) {
        const active = document.activeElement;
        if (menu.contains(active) && active.tagName === "INPUT") active.blur();
        close();
      }
    },
    true,
  );
  document.addEventListener("focusin", (e) => {
    if (!menu.hidden && !menu.contains(e.target)) close();
  });
  window.addEventListener("resize", () => {
    if (!menu.hidden) position();
  });
  window.addEventListener("blur", () => close());
  return { open, close, refresh };
}
