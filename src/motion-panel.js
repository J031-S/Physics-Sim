import { VARIABLES } from "./expressions.js";
export function motionPanel(body, commit) {
  const root = document.createElement("details");
  root.className = "motion-panel";
  root.open = true;
  const heading = document.createElement("summary");
  heading.textContent = "Motion equations";
  root.append(heading);
  const hint = document.createElement("p");
  hint.textContent =
    "Define acceleration in m/s² using time and the object’s state. Use * for multiplication; trig functions use radians.";
  root.append(hint);
  const label = document.createElement("label");
  label.className = "check-field";
  const enabled = document.createElement("input");
  enabled.type = "checkbox";
  enabled.checked = !!body.motion;
  label.append(enabled, document.createTextNode("Enable custom acceleration"));
  root.append(label);
  enabled.onchange = () =>
    commit((s) => {
      const b = s.bodies.find((v) => v.id === body.id);
      if (enabled.checked)
        b.motion = { type: "acceleration", ax: "0", ay: "0", gravity: true };
      else delete b.motion;
    });
  if (!body.motion) return root;
  let focused;
  for (const key of ["ax", "ay"]) {
    const label = document.createElement("label");
    label.className = "field";
    label.textContent = key === "ax" ? "aₓ (m/s²)" : "aᵧ (m/s²)";
    const input = document.createElement("input");
    input.value = body.motion[key];
    input.maxLength = 256;
    input.spellcheck = false;
    input.setAttribute("aria-label", "Equation " + key);
    input.onfocus = () => {
      focused = input;
    };
    // Apply is explicit so clicking a symbol never commits an incomplete expression.
    input.dataset.axis = key;
    label.append(input);
    root.append(label);
    if (!focused) focused = input;
  }
  const symbols = document.createElement("div");
  symbols.className = "symbols";
  for (const symbol of [
    ...VARIABLES,
    "+",
    "-",
    "*",
    "/",
    "^",
    "(",
    ")",
    "sin(",
    "cos(",
    "sqrt(",
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = symbol;
    button.title = "Insert " + symbol;
    button.onclick = () => {
      const start = focused.selectionStart ?? focused.value.length,
        end = focused.selectionEnd ?? start;
      focused.value =
        focused.value.slice(0, start) + symbol + focused.value.slice(end);
      focused.focus();
      focused.setSelectionRange(start + symbol.length, start + symbol.length);
    };
    symbols.append(button);
  }
  root.append(symbols);
  const gravityLabel = document.createElement("label");
  gravityLabel.className = "check-field";
  const gravity = document.createElement("input");
  gravity.type = "checkbox";
  gravity.checked = body.motion.gravity;
  gravityLabel.append(
    gravity,
    document.createTextNode("Also apply world gravity"),
  );
  root.append(gravityLabel);
  const apply = document.createElement("button");
  apply.textContent = "Apply equations";
  apply.className = "wide";
  apply.onclick = () =>
    commit((s) => {
      s.bodies.find((v) => v.id === body.id).motion = {
        type: "acceleration",
        ax: root.querySelector("[data-axis=ax]").value,
        ay: root.querySelector("[data-axis=ay]").value,
        gravity: gravity.checked,
      };
    });
  root.append(apply);
  const examples = document.createElement("select");
  examples.setAttribute("aria-label", "Motion equation examples");
  examples.add(new Option("Insert an example…", ""));
  const presets = {
    uniform: ["0", "0"],
    accelerate: ["2", "0"],
    fall: ["0", "-g"],
    oscillate: ["-4*(x-x0)", "0"],
    periodic: ["2*cos(t)", "0"],
  };
  for (const [key, name] of [
    ["uniform", "Uniform velocity"],
    ["accelerate", "Constant acceleration"],
    ["fall", "Free fall"],
    ["oscillate", "Oscillate about starting x"],
    ["periodic", "Time-varying acceleration"],
  ])
    examples.add(new Option(name, key));
  examples.onchange = () => {
    if (!presets[examples.value]) return;
    const [ax, ay] = presets[examples.value];
    root.querySelector("[data-axis=ax]").value = ax;
    root.querySelector("[data-axis=ay]").value = ay;
    gravity.checked = false;
  };
  root.append(examples);
  const variables = document.createElement("p");
  variables.textContent =
    "t: elapsed seconds · x/y: current metres · x0/y0: start · vx/vy/v: velocity/speed · m: kg · g: world gravity · omega: rad/s. Turning off world gravity prevents double-counting −g.";
  root.append(variables);
  return root;
}
