// Site navigation: the drop-down at the left of the top bar that switches
// between the simulations. The entries are ordinary links.
export function setupNav() {
  const toggle = document.getElementById("nav-toggle"),
    menu = document.getElementById("nav-menu");
  if (!toggle || !menu) return;
  const links = () => [...menu.querySelectorAll("a")];
  const close = (refocus) => {
    if (menu.hidden) return;
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    if (refocus) toggle.focus();
  };
  const open = () => {
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
  };
  toggle.addEventListener("click", () => (menu.hidden ? open() : close()));
  toggle.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown") return;
    e.preventDefault();
    open();
    links()[0]?.focus();
  });
  menu.addEventListener("keydown", (e) => {
    const list = links(),
      at = list.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      list[(at + step + list.length) % list.length]?.focus();
    }
  });
  toggle.parentElement.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || menu.hidden) return;
    e.stopPropagation();
    close(true);
  });
  // A press anywhere else closes the menu.
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!e.target.closest?.(".site-nav")) close();
    },
    true,
  );
  document.addEventListener("focusin", (e) => {
    if (!e.target.closest?.(".site-nav")) close();
  });
}
