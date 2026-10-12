// The files each tool saves, and the check every loader makes first. A file
// from another tool is named, so a student knows where to open it.
export const FORMATS = {
  "physics-sim-scene": "Mechanics sandbox",
  "physics-sim-fields": "Electric & magnetic fields",
  "physics-sim-orbits": "Orbits & gravitation",
  "physics-sim-circuit": "Electric circuits",
};
export const NOT_OURS = "This file is not a Physium scene.";
export function checkFormat(data, format) {
  const found = data && typeof data === "object" ? data.format : undefined;
  if (found === format) {
    if (data.version === 1) return;
    throw new Error(
      "This file was saved by a newer version of Physium and cannot be opened here.",
    );
  }
  if (typeof found === "string" && Object.hasOwn(FORMATS, found))
    throw new Error(
      `This file was saved from the ${FORMATS[found]} tool. Open it there instead.`,
    );
  throw new Error(NOT_OURS);
}
// An optional list in a file: absent is empty, anything but an array is damage.
export function listOf(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("This scene file is damaged.");
  for (const entry of value)
    if (!entry || typeof entry !== "object" || Array.isArray(entry))
      throw new Error("This scene file is damaged.");
  return value;
}
