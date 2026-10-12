// The one list of pages on the site. Every link the site writes (the header
// brand, the navigation drop-down, homepage cards, the 404 redirects) comes
// from here, so adding a page means adding one entry. No DOM.
//
// `address` is the extensionless path from the site root, exactly as it shows
// in the address bar ("" is the homepage); `file` is the HTML file that
// GitHub Pages and server.mjs serve for it.
export const pages = [
  {
    id: "home",
    address: "",
    file: "index.html",
    title: "Home",
    description: "What Physium is, and where to start",
    group: "home",
  },
  {
    id: "mechanics",
    address: "sims/Mechanics",
    file: "sims/Mechanics.html",
    title: "Mechanics sandbox",
    description: "Kinematics, forces, springs and pulleys",
    group: "simulation",
  },
  {
    id: "fields",
    address: "sims/EMFields",
    file: "sims/EMFields.html",
    title: "Electric & magnetic fields",
    description: "Charges, currents and their field lines",
    group: "simulation",
  },
  {
    id: "orbits",
    address: "sims/Orbits",
    file: "sims/Orbits.html",
    title: "Orbits & gravitation",
    description: "Satellites, escape speed and Kepler's laws",
    group: "simulation",
  },
  {
    id: "circuits",
    address: "sims/Circuits",
    file: "sims/Circuits.html",
    title: "Electric circuits",
    description: "Build circuits; read current, p.d. and power",
    group: "simulation",
  },
  {
    id: "minitools",
    address: "minitools/",
    file: "minitools/index.html",
    title: "Minitools",
    description: "One equation at a time, with values to change",
    group: "minitools",
  },
  {
    id: "gallery",
    address: "dev/gallery",
    file: "dev/gallery.html",
    title: "Component gallery",
    description: "Developer page: every shared component, light and dark",
    group: "developer",
  },
];

// Addresses the site used before pages moved into folders, and the page each
// now lives at (the 404 page redirects them).
export const oldAddresses = {
  "fields.html": "fields",
  "orbits.html": "orbits",
  "circuits.html": "circuits",
  fields: "fields",
  orbits: "orbits",
  circuits: "circuits",
};

export const pageById = (id) => pages.find((p) => p.id === id);

// The page a requested path names, ignoring case, a trailing ".html" and a
// trailing slash; or null. `path` is relative to the site root.
export function findPage(path) {
  const key = (p) =>
    p
      .replace(/^\/+/, "")
      .replace(/\/+$/, "")
      .replace(/\.html$/i, "")
      .replace(/(^|\/)index$/i, "")
      .toLowerCase();
  const wanted = key(path);
  const old = Object.entries(oldAddresses).find(
    ([from]) => key(from) === wanted,
  );
  if (old) return pageById(old[1]);
  return pages.find((p) => key(p.address) === wanted) || null;
}
