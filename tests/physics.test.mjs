import test from 'node:test';
import assert from 'node:assert/strict';
import Matter from '../vendor/matter.js';
globalThis.Matter = Matter;
const { Simulation, DT } = await import('../src/physics.js');
const { object, preset, validateScene } = await import('../src/scenes.js');
const close = (value, expected, tolerance, label) => assert.ok(Math.abs(value - expected) < tolerance, `${label}: ${value} expected ${expected} ± ${tolerance}`);
const run = (s, seconds) => { for (let i = 0; i < Math.round(seconds / DT); i++) s.step(); };
const scene = (bodies, gravity = 0, links = []) => ({ version: 1, title: 'Test', gravity, bodies, links });
test('SI projectile trajectory agrees with constant-acceleration solution', () => {
  const s = new Simulation(scene([object('a', 'circle', 0, 100, { vx: 6, vy: 8 })], 9.81));
  run(s, 1); const b = s.state('a');
  close(b.x, 6, .001, 'x'); close(b.y, 100 + 8 - .5 * 9.81, .05, 'y'); close(b.vy, 8 - 9.81, .001, 'vy'); s.dispose();
});
test('constant applied force gives acceleration F/m', () => {
  const s = new Simulation(scene([object('a', 'circle', 0, 0, { fx: 6, mass: 2 })])); run(s, 1); close(s.state('a').vx, 3, .001, 'vx'); s.dispose();
});
test('elastic head-on collision preserves momentum and kinetic energy', () => {
  const s = new Simulation(preset('Collisions')); const initialEnergy = s.energy('a') + s.energy('b'); run(s, 2);
  const a = s.state('a'), b = s.state('b'); close(a.vx + 2 * b.vx, 1, .01, 'momentum'); close(s.energy('a') + s.energy('b'), initialEnergy, .08, 'energy'); assert.ok(a.vx < 0 && b.vx > 0); s.dispose();
});
test('spring period agrees with 2π√(m/k)', () => {
  const s = new Simulation(preset('Spring oscillator')); run(s, 2 * Math.PI / Math.sqrt(8)); close(s.state('mass').x, 8, .015, 'one-period position'); close(s.state('mass').vx, 0, .12, 'one-period velocity'); s.dispose();
});
test('pendulum maintains anchor distance', () => {
  const p = preset('Pendulum'), s = new Simulation(p), l = p.links[0]; run(s, 5); const bob = s.state('bob'); close(Math.hypot(bob.x - 6, bob.y - 6), l.length, .02, 'rod length'); s.dispose();
});
test('rope stays slack under compression and limits extension', () => {
  const p = scene([object('b', 'circle', 2, 0, { vx: -1 })], 0, [{ id: 'r', type: 'rope', a: null, b: 'b', anchorA: { x: 0, y: 0 }, anchorB: { x: 2, y: 0 }, length: 3, k: 10, damping: 0 }]);
  const s = new Simulation(p); run(s, 1); close(s.state('b').x, 1, .001, 'slack position'); run(s, 7); assert.ok(Math.abs(s.state('b').x) < 3.05); s.dispose();
});
test('fixed objects do not move, reset recreates identical initial state', () => {
  const p = preset('Projectile'), s = new Simulation(p); run(s, 3); close(s.state('floor').y, -.25, .0001, 'floor'); s.dispose(); const reset = new Simulation(p); close(reset.state('ball').vx, 6, .0001, 'reset velocity'); close(reset.state('ball').y, 1, .0001, 'reset position'); reset.dispose();
});
test('all presets serialize, validate, and remain finite for 10 seconds', () => {
  for (const name of ['Projectile', 'Pendulum', 'Spring oscillator', 'Collisions', 'Ramp', 'Blank experiment']) { const p = preset(name), loaded = validateScene(JSON.parse(JSON.stringify(p))); assert.deepEqual(loaded, p); const s = new Simulation(loaded); run(s, 10); for (const b of p.bodies) for (const v of Object.values(s.state(b.id))) assert.ok(Number.isFinite(v), name); s.dispose(); }
});
test('malformed scenes fail validation before replacing a scene', () => {
  assert.throws(() => validateScene({}), /v1/);
  const s = preset('Projectile'); s.bodies[1].mass = -1; assert.throws(() => validateScene(s), /mass/);
  s.bodies[1].mass = 1; s.bodies[1].x = Infinity; assert.throws(() => validateScene(s), /x/);
  const p = preset('Pendulum'); p.links[0].b = 'missing'; assert.throws(() => validateScene(p), /endpoints/);
  const d = preset('Projectile'); d.bodies.push({ ...d.bodies[0] }); assert.throws(() => validateScene(d), /unique/);
});
