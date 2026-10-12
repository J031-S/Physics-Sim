// Running a mini simulation: building the scene, stepping the engine and
// taking the measurement. No DOM, so the page (minisim.js) and the tests run
// exactly the same code.
//
// `sim` is a tool's entry in sims.js, `E` the engine module it names.

// One sandbox step, in seconds.
const STEP = 1 / 120;
// The most engine work done for one frame, so a long scene played fast
// cannot stall the page.
const MOST_STEPS = 1500;

const blend = (a, b, f) => {
  const number = (x) => (typeof x === "object" ? x.value : x),
    value = number(a) + f * (number(b) - number(a));
  return typeof b === "object" ? { ...b, value } : value;
};

/**
 * Start a run. `values()` gives every quantity (the unknown worked out) and
 * `unknown()` the key being solved for; both are read afresh as needed.
 * Throws what the engine throws if it cannot build the scene.
 */
export function startRun(sim, E, values, unknown) {
  const model = sim.build(values(), E),
    still = sim.engine === "fieldlab",
    time = () => (still ? 0 : model.time),
    end = () => (sim.duration ? sim.duration(values(), model) : null),
    speed = () => (sim.speed ? sim.speed(values(), model) : 1);
  let measured = null,
    stopped = false,
    carry = 0,
    before = null,
    latest = null;

  function read() {
    const watch =
      typeof sim.watch === "function" ? sim.watch : sim.watch?.[unknown()];
    if (!watch) return;
    let m = null;
    try {
      m = watch(model, unknown(), values());
    } catch {
      // A measurement that cannot be taken yet stays blank.
    }
    before = latest;
    latest = m === null || m === undefined ? null : { m, t: time() };
    if (latest) measured = m;
  }
  // The scene stops at its duration or when it has shown its result. A
  // sandbox step usually carries it a little past the duration, so the
  // measurement is taken between the last two steps, at the duration itself.
  function finished() {
    const e = end();
    if (e !== null && time() >= e - 1e-9) {
      if (before && latest && latest.t > e + 1e-9 && before.t < e)
        measured = blend(before.m, latest.m, (e - before.t) / (latest.t - before.t));
      return true;
    }
    return !!sim.until?.(model, values());
  }

  read();
  return {
    model,
    still,
    get measured() {
      return measured;
    },
    get stopped() {
      return stopped;
    },
    speed,
    // The clock to show: never past the scene's duration.
    time() {
      const e = end();
      return e === null ? time() : Math.min(time(), e);
    },
    // Carry the scene on by `seconds` of watching.
    advance(seconds) {
      if (stopped || still || !(seconds > 0)) return;
      const rate = speed();
      if (sim.engine === "sandbox") {
        carry += seconds * rate * (1 / STEP);
        const steps = Math.min(MOST_STEPS, Math.floor(carry));
        carry -= Math.floor(carry);
        for (let i = 0; i < steps && !stopped; i++) {
          model.step();
          read();
          stopped = finished();
        }
        return;
      }
      let dt = seconds * rate * (sim.engine === "orbitlab" ? model.tags.warp : 1);
      const e = end();
      if (e !== null) dt = Math.min(dt, e - model.time);
      if (dt > 0) model.advance(dt);
      read();
      stopped = finished();
    },
    dispose() {
      model.dispose?.();
    },
  };
}
