import { compile } from "./expressions.js";
// Each module returns an SI force contribution. Future EM modules can read
// all bodies and their fields here without changing the editor or integrator.
export function kinematicsBehaviour(scene) {
  const equations = new Map(
    scene.bodies
      .filter((b) => b.motion)
      .map((b) => [
        b.id,
        { ax: compile(b.motion.ax), ay: compile(b.motion.ay) },
      ]),
  );
  return {
    id: "kinematics",
    force(spec, state, context) {
      const formula = equations.get(spec.id);
      if (!formula) return { x: 0, y: 0 };
      const scope = {
        ...state,
        t: context.time,
        x0: spec.x,
        y0: spec.y,
        v: Math.hypot(state.vx, state.vy),
        m: spec.mass,
        g: context.scene.gravity,
      };
      const ax = formula.ax(scope),
        ay = formula.ay(scope);
      if (Math.abs(ax) > 10000 || Math.abs(ay) > 10000)
        throw new Error(spec.name + ": acceleration exceeds 10,000 m/s².");
      return {
        x: spec.mass * ax,
        y: spec.mass * (ay + (spec.motion.gravity ? 0 : context.scene.gravity)),
      };
    },
  };
}
export const defaultBehaviourFactories = [kinematicsBehaviour];
