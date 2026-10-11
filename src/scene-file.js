// The Save scene and Load scene buttons of a tool page. `save()` returns the
// scene as plain data; `load(data)` applies a parsed file and throws an Error
// with a student-readable message if it cannot, which is shown as a toast.
import { NOT_OURS } from "./scene-format.js";

export function setupSceneFiles({ filename, save, load, toast }) {
  const $ = (id) => document.getElementById(id),
    input = $("scene-file");
  $("save-scene").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(save(), null, 2)], {
        type: "application/json",
      }),
      link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    // Some browsers start the download after the click returns.
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });
  $("load-scene").addEventListener("click", () => input.click());
  input.addEventListener("change", async () => {
    const file = input.files[0];
    // Cleared so that choosing the same file again still fires.
    input.value = "";
    if (!file) return;
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      toast(NOT_OURS);
      return;
    }
    try {
      load(data);
    } catch (error) {
      // The scene that was open is untouched.
      toast(error.message);
    }
  });
}
