// Small DOM helpers that every page used to define for itself.
export const $ = (id) => document.getElementById(id);
export const isDark = () => document.documentElement.dataset.theme === "dark";
// Show a message in the page's #toast for `duration` ms. Pages keep their own
// durations, so each wraps this with its own.
let toastTimer;
export function showToast(message, duration = 3200) {
  const el = $("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), duration);
}
