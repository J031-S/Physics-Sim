import { Simulation, DT } from './physics.js';
import { preset, object, validateScene, clone } from './scenes.js';
const $ = id => document.getElementById(id);
const canvas = $('canvas'), ctx = canvas.getContext('2d'), graph = $('graph'), gx = graph.getContext('2d');
const STORAGE = 'physics-sim-scene-v1';
let scene = preset('Projectile'), sim, running = false, selected = 'ball', tool = 'select', pending = null;
let undo = [], redo = [], samples = [], trails = new Map(), accumulator = 0, lastFrame = 0, frameCount = 0;
let view = { scale: 60, x: 70, y: 350 }, pointer = null, drag = null, toastTimer, storageError = false;
try { const saved = localStorage.getItem(STORAGE); if (saved) { scene = validateScene(JSON.parse(saved)); selected = scene.bodies.find(b => !b.fixed)?.id || null; } } catch { storageError = true; }
function toast(text) { $('toast').textContent = text; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3500); }
function persist() { try { localStorage.setItem(STORAGE, JSON.stringify(scene)); $('save-state').textContent = 'Saved on this device'; } catch { $('save-state').textContent = 'Local saving unavailable — use Save file'; } }
function setRunning(value) { running = value; accumulator = 0; $('play').textContent = running ? 'Ⅱ Pause' : '▶ Run'; $('mode').textContent = running ? 'RUNNING' : sim?.time > 0 ? 'PAUSED' : 'EDITING'; $('step').disabled = running; }
function rebuild() { sim?.dispose(); sim = new Simulation(scene); setRunning(false); samples = []; trails.clear(); frameCount = 0; refresh(); }
function commit(change) { const next = clone(scene); change(next); try { validateScene(next); } catch (e) { toast(e.message); return false; } undo.push(clone(scene)); if (undo.length > 80) undo.shift(); redo = []; scene = next; rebuild(); persist(); return true; }
function history(direction) { const from = direction === 'undo' ? undo : redo, to = direction === 'undo' ? redo : undo; if (!from.length) return; to.push(clone(scene)); scene = from.pop(); pending = null; rebuild(); persist(); }
function ensureEditing() { if (sim.time > 0 || running) { rebuild(); toast('Returned to initial conditions for editing.'); } }
function chooseTool(value) { tool = value; pending = null; document.querySelectorAll('[data-tool]').forEach(b => { b.classList.toggle('active', b.dataset.tool === tool); b.setAttribute('aria-pressed', b.dataset.tool === tool); }); $('tool-hint').textContent = { select: 'Click an object to inspect it. Drag to reposition.', pan: 'Drag the canvas to explore your scene.', circle: 'Click the canvas to place a ball.', box: 'Click the canvas to place a block.', wall: 'Click to place a fixed wall. Adjust size and angle in the inspector.', spring: 'Click two objects, or an empty anchor point and an object.', rod: 'Click two endpoints. An empty point creates a fixed pivot.', rope: 'Click two endpoints. A rope goes slack when compressed.' }[tool]; canvas.style.cursor = tool === 'pan' ? 'grab' : tool === 'select' ? 'default' : 'crosshair'; }
function refresh() {
  if (!scene.bodies.some(b => b.id === selected) && !scene.links.some(l => l.id === selected)) selected = null;
  $('title').value = scene.title; $('gravity').value = scene.gravity; $('object-count').textContent = `${scene.bodies.length} objects`;
  $('stage-info').textContent = `GRAVITY · ${scene.gravity.toFixed(2)} m/s² ↓`;
  $('undo').disabled = !undo.length; $('redo').disabled = !redo.length;
  const sel = $('selection'); sel.replaceChildren(new Option('Select an object…', ''));
  for (const b of scene.bodies) sel.add(new Option(`${b.fixed ? '▪' : '●'} ${b.name}`, b.id));
  for (const l of scene.links) sel.add(new Option(`↔ ${l.type[0].toUpperCase() + l.type.slice(1)}`, l.id));
  sel.value = selected || ''; renderProperties();
}
const fields = { x: ['Position x', 'm', -10000, 10000, .1], y: ['Position y', 'm', -10000, 10000, .1], vx: ['Velocity x', 'm/s', -1000, 1000, .1], vy: ['Velocity y', 'm/s', -1000, 1000, .1], mass: ['Mass', 'kg', .01, 10000, .1], radius: ['Radius', 'm', .05, 100, .05], width: ['Width', 'm', .05, 100, .1], height: ['Height', 'm', .05, 100, .1], angle: ['Angle ↺', '°', -1000, 1000, 1], omega: ['Angular speed ↺', 'rad/s', -1000, 1000, .1], friction: ['Friction', 'μ', 0, 1, .05], restitution: ['Restitution', '0–1', 0, 1, .05], fx: ['Constant force x', 'N', -1000, 1000, .1], fy: ['Constant force y', 'N', -1000, 1000, .1], length: ['Rest / max length', 'm', .05, 1000, .1], k: ['Spring stiffness', 'N/m', .1, 1000, .1], damping: ['Damping', 'N·s/m', 0, 100, .1] };
function renderProperties() {
  const root = $('properties'); root.replaceChildren();
  const b = scene.bodies.find(b => b.id === selected), l = scene.links.find(l => l.id === selected), target = b || l;
  $('tracking').textContent = b ? b.name : 'Select an object';
  $('readouts').replaceChildren();
  if (!target) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'Select something on the canvas, or add an object to make this experiment your own.'; root.append(p); return; }
  const grid = document.createElement('div'); grid.className = 'property-grid'; root.append(grid);
  function field(key, label, unit, type = 'number', range = []) {
    const el = document.createElement('label'); el.className = 'field' + (type === 'text' ? ' full' : ''); el.append(document.createTextNode(label));
    const u = document.createElement('span'); u.textContent = unit; el.append(u);
    const input = document.createElement('input'); input.type = type; input.value = target[key]; input.setAttribute('aria-label', label);
    if (type === 'text') input.maxLength = 100;
    if (type === 'number') { input.min = range[0]; input.max = range[1]; input.step = 'any'; }
    input.addEventListener('change', () => { if (!input.checkValidity() || input.value === '') { toast('Please enter a value within the allowed range.'); input.value = target[key]; return; } const id = selected; commit(s => { const t = (b ? s.bodies : s.links).find(v => v.id === id); t[key] = type === 'number' ? Number(input.value) : input.value; }); });
    el.append(input); grid.append(el);
  }
  if (b) {
    field('name', 'Object name', '', 'text');
    for (const key of ['x', 'y', 'vx', 'vy', 'mass', ...(b.shape === 'circle' ? ['radius'] : ['width', 'height']), 'angle', 'omega', 'friction', 'restitution', 'fx', 'fy']) { const [label, unit, ...range] = fields[key]; field(key, label, unit, 'number', range); }
    field('color', 'Colour', '', 'color');
    const label = document.createElement('label'); label.className = 'check-field'; const input = document.createElement('input'); input.type = 'checkbox'; input.checked = b.fixed; input.onchange = () => commit(s => { s.bodies.find(v => v.id === selected).fixed = input.checked; }); label.append(input, document.createTextNode('Fixed in place')); grid.append(label);
    for (const [id, title] of [['speed-readout', 'SPEED · m/s'], ['energy-readout', 'KINETIC ENERGY · J'], ['x-readout', 'POSITION X · m'], ['y-readout', 'POSITION Y · m']]) { const div = document.createElement('div'); div.className = 'readout'; const span = document.createElement('span'); span.textContent = title; const strong = document.createElement('strong'); strong.id = id; div.append(span, strong); $('readouts').append(div); }
  } else {
    for (const key of ['length', ...(l.type === 'spring' ? ['k', 'damping'] : [])]) { const [label, unit, ...range] = fields[key]; field(key, label, unit, 'number', range); }
    const p = document.createElement('p'); p.className = 'empty'; p.textContent = l.type === 'spring' ? 'Hooke’s law: F = −kΔx. Damping opposes relative motion along the spring.' : 'Connects object centres. Rods hold a fixed distance; ropes only resist extension.'; root.append(p);
  }
  const actions = document.createElement('div'); actions.className = 'property-actions';
  if (b) { const duplicate = document.createElement('button'); duplicate.textContent = 'Duplicate'; duplicate.onclick = () => { const copy = clone(b); copy.id = crypto.randomUUID(); copy.x += .6; copy.y += .6; copy.name += ' copy'; selected = copy.id; commit(s => s.bodies.push(copy)); }; actions.append(duplicate); }
  const remove = document.createElement('button'); remove.className = 'danger'; remove.textContent = 'Delete'; remove.onclick = deleteSelection; actions.append(remove); root.append(actions);
}
function deleteSelection() { if (!selected) return; const id = selected; commit(s => { s.bodies = s.bodies.filter(b => b.id !== id); s.links = s.links.filter(l => l.id !== id && l.a !== id && l.b !== id); }); }
function select(id) { selected = id; samples = []; refresh(); }
function screen(p) { return { x: view.x + p.x * view.scale, y: view.y - p.y * view.scale }; }
function world(x, y) { return { x: (x - view.x) / view.scale, y: (view.y - y) / view.scale }; }
function locate(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function hit(p) {
  return [...scene.bodies].reverse().find(b => {
    const s = sim.state(b.id), angle = s.angle * Math.PI / 180, dx = p.x - s.x, dy = p.y - s.y;
    const x = dx * Math.cos(angle) + dy * Math.sin(angle), y = -dx * Math.sin(angle) + dy * Math.cos(angle);
    return b.shape === 'circle' ? x * x + y * y <= b.radius ** 2 : Math.abs(x) <= b.width / 2 && Math.abs(y) <= b.height / 2;
  });
}
function fit() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const bodies = scene.bodies.filter(b => b.id !== 'floor');
  let minX = 0, maxX = 12, minY = 0, maxY = 7;
  if (bodies.length) { minX = Math.min(0, ...bodies.map(b => b.x - Math.max(b.width, b.radius))); maxX = Math.max(12, ...bodies.map(b => b.x + Math.max(b.width, b.radius))); minY = Math.min(0, ...bodies.map(b => b.y - b.height)); maxY = Math.max(7, ...bodies.map(b => b.y + Math.max(b.height, b.radius))); }
  for (const l of scene.links) for (const side of ['A', 'B']) if (!l[side.toLowerCase()]) { const p = l['anchor' + side]; minX = Math.min(minX, p.x - 1); maxX = Math.max(maxX, p.x + 1); minY = Math.min(minY, p.y - 1); maxY = Math.max(maxY, p.y + 1); }
  view.scale = Math.max(.01, Math.min((w - 80) / (maxX - minX), (h - 90) / (maxY - minY)));
  view.x = (w - (maxX + minX) * view.scale) / 2; view.y = (h + (maxY + minY) * view.scale) / 2; updateZoom();
}
function updateZoom() { $('zoom').textContent = Math.round(view.scale / 60 * 100) + '%'; }
function zoom(factor, at = { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 }) { const p = world(at.x, at.y); view.scale = Math.max(.01, Math.min(600, view.scale * factor)); view.x = at.x - p.x * view.scale; view.y = at.y + p.y * view.scale; updateZoom(); }
canvas.addEventListener('wheel', e => { e.preventDefault(); zoom(Math.exp(-e.deltaY * .001), locate(e)); }, { passive: false });
canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0 && e.button !== 1) return;
  canvas.focus(); const at = locate(e); pointer = world(at.x, at.y); canvas.setPointerCapture(e.pointerId);
  if (tool === 'pan' || e.button === 1) { e.preventDefault(); drag = { type: 'pan', at, view: { ...view } }; return; }
  if (tool === 'select') {
    const b = hit(pointer); select(b?.id || null);
    if (b && sim.time === 0 && !running) drag = { type: 'object', id: b.id, start: pointer, original: { x: b.x, y: b.y }, end: pointer };
    else if (b) toast('Inspecting live motion. Reset before dragging objects.');
    return;
  }
  ensureEditing(); const b = hit(pointer);
  if (['circle', 'box', 'wall'].includes(tool)) {
    const id = crypto.randomUUID(); const shape = tool === 'circle' ? 'circle' : 'box'; selected = id;
    commit(s => s.bodies.push(object(id, shape, +pointer.x.toFixed(2), +pointer.y.toFixed(2), tool === 'wall' ? { name: 'Wall', fixed: true, width: 4, height: .25, color: '#84919e' } : {}))); return;
  }
  const end = { id: b?.id || null, point: b ? { x: b.x, y: b.y } : { ...pointer } };
  if (!pending) { pending = end; toast('Now click the other endpoint. Escape cancels.'); }
  else {
    if (pending.id === end.id) { toast('Choose a different object; at least one endpoint must be an object.'); return; }
    const a = pending, id = crypto.randomUUID(); selected = id;
    const ok = commit(s => s.links.push({ id, type: tool, a: a.id, b: end.id, anchorA: a.point, anchorB: end.point, length: Math.max(.05, Math.hypot(end.point.x - a.point.x, end.point.y - a.point.y)), k: 20, damping: .2 }));
    if (ok) pending = null;
  }
});
canvas.addEventListener('pointermove', e => {
  const at = locate(e); pointer = world(at.x, at.y);
  $('coordinates').textContent = `x ${pointer.x.toFixed(2)} m · y ${pointer.y.toFixed(2)} m`;
  if (drag?.type === 'pan') { view.x = drag.view.x + at.x - drag.at.x; view.y = drag.view.y + at.y - drag.at.y; }
  if (drag?.type === 'object') drag.end = pointer;
});
canvas.addEventListener('pointerup', () => {
  if (drag?.type === 'object') { const d = drag, dx = d.end.x - d.start.x, dy = d.end.y - d.start.y; if (Math.hypot(dx, dy) > .01) commit(s => { const b = s.bodies.find(b => b.id === d.id); b.x = +(d.original.x + dx).toFixed(3); b.y = +(d.original.y + dy).toFixed(3); }); }
  drag = null;
});
canvas.addEventListener('pointercancel', () => { drag = null; });
function resizeCanvas(el, context) { const r = el.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; if (el.width !== Math.round(r.width * dpr) || el.height !== Math.round(r.height * dpr)) { el.width = Math.round(r.width * dpr); el.height = Math.round(r.height * dpr); } context.setTransform(dpr, 0, 0, dpr, 0, 0); return r; }
function line(a, b, color, width = 1) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); }
function arrow(p, v, color, label) { const start = screen(p), length = Math.hypot(v.x, v.y); if (length < .03) return; const factor = Math.min(16, 120 / length), end = { x: start.x + v.x * factor, y: start.y - v.y * factor }, angle = Math.atan2(end.y - start.y, end.x - start.x); line(start, end, color, 1.5); ctx.beginPath(); ctx.moveTo(end.x, end.y); ctx.lineTo(end.x - 7 * Math.cos(angle - .4), end.y - 7 * Math.sin(angle - .4)); ctx.lineTo(end.x - 7 * Math.cos(angle + .4), end.y - 7 * Math.sin(angle + .4)); ctx.closePath(); ctx.fillStyle = color; ctx.fill(); if (label) { ctx.font = '9px sans-serif'; ctx.fillText(label, end.x + 6, end.y - 5); } }
function draw() {
  const { width: w, height: h } = resizeCanvas(canvas, ctx); ctx.clearRect(0, 0, w, h);
  const bottom = world(0, h), top = world(w, 0);
  if ($('grid').checked) {
    const spacing = 10 ** Math.ceil(Math.log10(22 / view.scale));
    ctx.fillStyle = '#d7dfe9';
    for (let x = Math.ceil(bottom.x / spacing) * spacing; x <= top.x; x += spacing) for (let y = Math.ceil(bottom.y / spacing) * spacing; y <= top.y; y += spacing) { const p = screen({ x, y }); ctx.beginPath(); ctx.arc(p.x, p.y, .8, 0, Math.PI * 2); ctx.fill(); }
    line({ x: 0, y: view.y }, { x: w, y: view.y }, '#d7dfe9'); line({ x: view.x, y: 0 }, { x: view.x, y: h }, '#d7dfe9');
    ctx.font = '8px monospace'; ctx.fillStyle = '#a7b3c2';
    const tick = spacing * (view.scale * spacing < 45 ? 2 : 1);
    for (let x = Math.ceil(bottom.x / tick) * tick; x <= top.x; x += tick) { const p = screen({ x, y: 0 }); ctx.fillText(+x.toFixed(3), p.x + 4, Math.max(46, Math.min(h - 37, p.y + 13))); }
  }
  if ($('trails').checked) for (const [id, points] of trails) { if (points.length < 2) continue; ctx.beginPath(); points.forEach((p, i) => { const q = screen(p); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }); ctx.strokeStyle = (scene.bodies.find(b => b.id === id)?.color || '#5279dd') + '60'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 4]); ctx.stroke(); ctx.setLineDash([]); }
  for (const l of scene.links) {
    const a = screen(sim.endpoint(l, 'A')), b = screen(sim.endpoint(l, 'B')), dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy), nx = -dy / (length || 1), ny = dx / (length || 1);
    ctx.strokeStyle = selected === l.id ? '#426ac4' : '#93a2b7'; ctx.lineWidth = selected === l.id ? 2.5 : 1.8; ctx.beginPath(); ctx.moveTo(a.x, a.y);
    if (l.type === 'spring') { for (let i = 1; i < 24; i++) { const t = i / 24, offset = i < 3 || i > 21 ? 0 : (i % 2 ? 5 : -5); ctx.lineTo(a.x + t * dx + nx * offset, a.y + t * dy + ny * offset); } }
    else if (l.type === 'rope' && length < l.length * view.scale) { const sag = Math.min(45, (l.length * view.scale - length) / 2); ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + sag, b.x, b.y); }
    ctx.lineTo(b.x, b.y); ctx.stroke();
    for (const [id, p] of [[l.a, a], [l.b, b]]) if (!id) { ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fillStyle = '#506078'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke(); }
  }
  for (const b of scene.bodies) {
    const state = sim.state(b.id);
    if (drag?.type === 'object' && drag.id === b.id) { state.x = drag.original.x + drag.end.x - drag.start.x; state.y = drag.original.y + drag.end.y - drag.start.y; }
    const p = screen(state); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(-state.angle * Math.PI / 180);
    ctx.beginPath(); if (b.shape === 'circle') ctx.arc(0, 0, b.radius * view.scale, 0, Math.PI * 2); else ctx.rect(-b.width * view.scale / 2, -b.height * view.scale / 2, b.width * view.scale, b.height * view.scale);
    ctx.fillStyle = b.color + (b.fixed ? '55' : 'db'); ctx.fill(); ctx.strokeStyle = b.id === selected ? '#263f6c' : b.color; ctx.lineWidth = b.id === selected ? 2 : 1; ctx.stroke();
    if (b.shape === 'circle') line({ x: 0, y: 0 }, { x: b.radius * view.scale * .75, y: 0 }, '#ffffff85');
    ctx.beginPath(); ctx.arc(0, 0, b.fixed ? 2 : 2.5, 0, Math.PI * 2); ctx.fillStyle = b.fixed ? '#6d7c90' : '#ffffffbb'; ctx.fill(); ctx.restore();
    if (b.id !== 'floor') { ctx.font = '10px sans-serif'; ctx.fillStyle = '#74849a'; ctx.textAlign = 'center'; ctx.fillText(b.name, p.x, p.y - (b.shape === 'circle' ? b.radius : b.height / 2) * view.scale - 13); ctx.textAlign = 'left'; }
    if (!b.fixed && $('vectors').checked) arrow(state, { x: state.vx, y: state.vy }, '#5279dd', b.id === selected ? `${Math.hypot(state.vx, state.vy).toFixed(1)} m/s` : '');
    if (!b.fixed && $('forces').checked) arrow(state, sim.forces.get(b.id), '#d38a50', b.id === selected ? 'F applied + mg' : '');
  }
  if (pending && pointer) { ctx.setLineDash([4, 4]); line(screen(pending.point), screen(pointer), '#8a71be', 2); ctx.setLineDash([]); }
  if (pointer && ['circle', 'box', 'wall'].includes(tool)) { const p = screen(pointer); ctx.strokeStyle = '#5279dd88'; ctx.setLineDash([3, 3]); ctx.beginPath(); if (tool === 'circle') ctx.arc(p.x, p.y, .4 * view.scale, 0, Math.PI * 2); else ctx.rect(p.x - (tool === 'wall' ? 2 : .5) * view.scale, p.y - (tool === 'wall' ? .125 : .5) * view.scale, (tool === 'wall' ? 4 : 1) * view.scale, (tool === 'wall' ? .25 : 1) * view.scale); ctx.stroke(); ctx.setLineDash([]); }
}
function record() {
  for (const b of scene.bodies) if (!b.fixed) { const points = trails.get(b.id) || []; points.push(sim.state(b.id)); if (points.length > 400) points.shift(); trails.set(b.id, points); }
  if (sim.bodies.has(selected)) { const s = sim.state(selected); samples.push({ time: sim.time, x: s.x, y: s.y, vx: s.vx, vy: s.vy, speed: Math.hypot(s.vx, s.vy), energy: sim.energy(selected) }); if (samples.length > 400) samples.shift(); }
}
function tick() {
  sim.step(); frameCount++; if (frameCount % 6 === 0) record();
  for (const b of scene.bodies) { const s = sim.state(b.id); if (!Number.isFinite(s.x) || !Number.isFinite(s.y) || Math.abs(s.x) > 1e6 || Math.abs(s.y) > 1e6) { rebuild(); toast('Simulation exceeded its numerical limits. Try lower forces or a softer spring.'); break; } }
}
function drawGraph() {
  const { width: w, height: h } = resizeCanvas(graph, gx), left = 42, right = w - 8, top = 12, bottom = h - 18;
  gx.clearRect(0, 0, w, h); gx.font = '8px monospace'; const metric = $('metric').value;
  const values = samples.map(s => s[metric]); let min = Math.min(0, ...values), max = Math.max(1, ...values); if (max - min < .001) max = min + 1;
  gx.textAlign = 'right'; for (let i = 0; i <= 3; i++) { const y = top + (bottom - top) * i / 3; gx.strokeStyle = '#e8ecf2'; gx.beginPath(); gx.moveTo(left, y); gx.lineTo(right, y); gx.stroke(); gx.fillStyle = '#a0adbd'; gx.fillText((max - (max - min) * i / 3).toFixed(1), left - 9, y + 3); }
  $('graph-empty').style.display = samples.length < 2 ? 'grid' : 'none';
  if (samples.length > 1) { const start = samples[0].time, end = Math.max(start + 1, samples.at(-1).time); gx.beginPath(); samples.forEach((s, i) => { const x = left + (s.time - start) / (end - start) * (right - left), y = bottom - (s[metric] - min) / (max - min) * (bottom - top); i ? gx.lineTo(x, y) : gx.moveTo(x, y); }); gx.strokeStyle = '#6484cf'; gx.lineWidth = 1.8; gx.stroke(); gx.textAlign = 'left'; gx.fillText(start.toFixed(1) + ' s', left, h - 3); gx.textAlign = 'right'; gx.fillText(end.toFixed(1) + ' s', right, h - 3); }
  $('samples').textContent = samples.length + ' samples'; $('csv').disabled = !samples.length;
}
function readouts() {
  $('time').innerHTML = sim.time.toFixed(2) + ' <small>s</small>';
  if ($('speed-readout') && sim.bodies.has(selected)) { const s = sim.state(selected); $('speed-readout').textContent = Math.hypot(s.vx, s.vy).toFixed(2); $('energy-readout').textContent = sim.energy(selected).toFixed(2); $('x-readout').textContent = s.x.toFixed(2); $('y-readout').textContent = s.y.toFixed(2); }
}
function frame(now) {
  const elapsed = lastFrame ? Math.min((now - lastFrame) / 1000, .1) : 0; lastFrame = now;
  if (running) { accumulator += elapsed * Number($('speed').value); let steps = 0; while (accumulator >= DT && steps < 30 && running) { accumulator -= DT; tick(); steps++; } }
  draw(); readouts(); drawGraph(); requestAnimationFrame(frame);
}
function download(name, content, type) { const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function filename() { return (scene.title.replace(/[^a-z0-9_-]/gi, '-').slice(0, 70) || 'experiment'); }
$('play').onclick = () => { pending = null; setRunning(!running); };
$('step').onclick = () => { tick(); $('mode').textContent = 'PAUSED'; };
$('reset').onclick = () => { pending = null; rebuild(); toast('Initial conditions restored.'); };
$('undo').onclick = () => history('undo'); $('redo').onclick = () => history('redo');
$('gravity').onchange = e => { const n = Number(e.target.value); if (e.target.value === '' || !e.target.checkValidity()) { toast('Gravity must be between −100 and 100 m/s².'); e.target.value = scene.gravity; return; } commit(s => { s.gravity = n; }); };
$('title').onchange = e => commit(s => { s.title = e.target.value.trim().slice(0, 100) || 'Untitled experiment'; });
$('selection').onchange = e => select(e.target.value || null);
$('zoom-in').onclick = () => zoom(1.2); $('zoom-out').onclick = () => zoom(1 / 1.2); $('fit').onclick = fit;
$('export').onclick = () => download(filename() + '.json', JSON.stringify(scene, null, 2), 'application/json');
$('import').onclick = () => $('file').click();
$('file').onchange = async e => { const file = e.target.files[0]; if (!file) return; try { if (file.size > 1000000) throw new Error('Scene file must be smaller than 1 MB.'); const loaded = validateScene(JSON.parse(await file.text())); commit(s => Object.assign(s, loaded)); fit(); toast('Scene opened. Undo restores your previous scene.'); } catch (error) { toast('Could not open scene: ' + error.message); } e.target.value = ''; };
$('csv').onclick = () => { const keys = ['time', 'x', 'y', 'vx', 'vy', 'speed', 'energy']; download(filename() + '-measurements.csv', 'time_s,x_m,y_m,vx_m_s,vy_m_s,speed_m_s,kinetic_energy_J\n' + samples.map(s => keys.map(k => s[k].toFixed(6)).join(',')).join('\n'), 'text/csv'); };
$('help').onclick = () => $('help-dialog').showModal(); document.querySelector('.close').onclick = () => $('help-dialog').close();
$('blank').onclick = () => { pending = null; selected = null; commit(s => Object.assign(s, preset('Blank experiment'))); fit(); };
document.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => chooseTool(b.dataset.tool));
document.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => { pending = null; const next = preset(b.dataset.preset); selected = next.bodies.find(v => !v.fixed)?.id || null; commit(s => Object.assign(s, next)); fit(); toast('Experiment loaded. Undo restores the previous scene.'); });
document.addEventListener('keydown', e => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || $('help-dialog').open) return;
  if (e.code === 'Space') { e.preventDefault(); setRunning(!running); }
  if (e.key === 'Escape') { drag = null; chooseTool('select'); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); history(e.shiftKey ? 'redo' : 'undo'); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelection(); }
  const tools = { v: 'select', h: 'pan', c: 'circle', b: 'box', w: 'wall' }; if (tools[e.key]) chooseTool(tools[e.key]);
});
document.addEventListener('visibilitychange', () => { lastFrame = 0; accumulator = 0; });
rebuild(); chooseTool('select'); fit(); requestAnimationFrame(frame); persist();
if (storageError) toast('Previous local scene could not be restored. A fresh example is loaded.');
