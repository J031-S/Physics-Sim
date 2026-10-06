// Small mathematical language: no JavaScript evaluation, properties, or assignments.
const functions = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  exp: Math.exp,
  log: Math.log,
  min: Math.min,
  max: Math.max,
};
export const VARIABLES = [
  "t",
  "x",
  "y",
  "x0",
  "y0",
  "vx",
  "vy",
  "v",
  "m",
  "g",
  "omega",
  "pi",
];
export function compile(source) {
  if (typeof source !== "string" || !source.trim() || source.length > 256)
    throw new Error("Use an equation of 1–256 characters.");
  const tokens = [];
  let at = 0;
  while (at < source.length) {
    if (/\s/.test(source[at])) {
      at++;
      continue;
    }
    const match =
      /^(?:(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?|[a-z][a-z0-9]*|[+\-*/^(),])/i.exec(
        source.slice(at),
      );
    if (!match)
      throw new Error("Unsupported equation character: " + source[at]);
    tokens.push(match[0]);
    at += match[0].length;
  }
  if (tokens.length > 128) throw new Error("Equation is too complex.");
  let i = 0;
  function primary() {
    const token = tokens[i++];
    if (token === "(") {
      const node = sum();
      if (tokens[i++] !== ")") throw new Error("Missing closing bracket.");
      return node;
    }
    if (token && /^(?:\d|\.)/.test(token)) {
      const n = Number(token);
      if (!Number.isFinite(n)) throw new Error("Invalid number.");
      return () => n;
    }
    if (Object.hasOwn(functions, token)) {
      if (tokens[i++] !== "(") throw new Error(token + " needs brackets.");
      const args = [sum()];
      while (tokens[i] === ",") {
        i++;
        args.push(sum());
      }
      if (tokens[i++] !== ")") throw new Error("Missing function bracket.");
      if (["min", "max"].includes(token) ? args.length < 2 : args.length !== 1)
        throw new Error("Incorrect number of function arguments.");
      return (scope) => functions[token](...args.map((f) => f(scope)));
    }
    if (VARIABLES.includes(token))
      return (scope) => (token === "pi" ? Math.PI : scope[token]);
    throw new Error("Unknown symbol: " + (token || "end of equation"));
  }
  function power() {
    const a = primary();
    if (tokens[i] !== "^") return a;
    i++;
    const b = unary();
    return (s) => a(s) ** b(s);
  }
  function unary() {
    if (tokens[i] === "+") {
      i++;
      return unary();
    }
    if (tokens[i] === "-") {
      i++;
      const a = unary();
      return (s) => -a(s);
    }
    return power();
  }
  function product() {
    let a = unary();
    while (["*", "/"].includes(tokens[i])) {
      const op = tokens[i++],
        left = a,
        b = unary();
      a = (s) => (op === "*" ? left(s) * b(s) : left(s) / b(s));
    }
    return a;
  }
  function sum() {
    let a = product();
    while (["+", "-"].includes(tokens[i])) {
      const op = tokens[i++],
        left = a,
        b = product();
      a = (s) => (op === "+" ? left(s) + b(s) : left(s) - b(s));
    }
    return a;
  }
  const evaluate = sum();
  if (i !== tokens.length)
    throw new Error("Use explicit multiplication, for example 2*t.");
  return (scope) => {
    const value = evaluate(scope);
    if (!Number.isFinite(value))
      throw new Error("Equation produced an undefined value.");
    return value;
  };
}
