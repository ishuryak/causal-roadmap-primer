// Path logic for the causal-diagram checker in the "A closer look at causal
// diagrams" section. Pure functions, no DOM, so tests can run them in Node.
// The rules are the standard ones (Hernán and Robins, What If, chapter 6):
//   - a path is blocked if it contains a non-collider that is adjusted for, or a
//     collider that is not adjusted for and has no adjusted descendant;
//   - a set satisfies the backdoor criterion if it blocks every backdoor path and
//     contains no descendant of the treatment.

// The teaching diagram for the running example. Hypothetical: the arrows are
// assumptions chosen to show each structure once, not a fitted model.
export const TEACHING_DAG = {
  nodes: {
    A: "Fractionation schedule",
    Y: "Survival",
    age: "Age",
    stage: "Stage",
    ps: "Performance status",
    tox: "Acute toxicity",
    u: "Unrecorded factor U",
  },
  edges: [
    ["age", "A"], ["age", "Y"],
    ["stage", "A"], ["stage", "Y"],
    ["ps", "A"], ["ps", "Y"],
    ["A", "tox"], ["tox", "Y"], ["A", "Y"],
    ["u", "tox"], ["u", "Y"],
  ],
  adjustable: ["age", "stage", "ps", "tox"],
};

export function children(dag, v) { return dag.edges.filter(([x]) => x === v).map(([, y]) => y); }

export function descendants(dag, v) {
  const seen = new Set(), stack = [...children(dag, v)];
  while (stack.length) { const w = stack.pop(); if (!seen.has(w)) { seen.add(w); stack.push(...children(dag, w)); } }
  return seen;
}

// Every simple path between `from` and `to`, ignoring arrow direction.
// Each path is a list of nodes plus, for each step, whether the arrow points forward.
export function allPaths(dag, from, to) {
  const out = [];
  const walk = (v, nodes, fwd) => {
    if (v === to) { out.push({ nodes, fwd }); return; }
    for (const [x, y] of dag.edges) {
      if (x === v && !nodes.includes(y)) walk(y, [...nodes, y], [...fwd, true]);
      else if (y === v && !nodes.includes(x)) walk(x, [...nodes, x], [...fwd, false]);
    }
  };
  walk(from, [from], []);
  return out;
}

// "causal": every arrow points from treatment toward outcome.
// "backdoor": the first arrow points into the treatment.
// "other": any remaining non-causal path (it leaves the treatment and meets a collider).
export function kindOf(path) {
  if (path.fwd.every(Boolean)) return "causal";
  return path.fwd[0] === false ? "backdoor" : "other";
}

// Interior nodes where two arrowheads meet.
export function colliders(path) {
  const out = [];
  for (let i = 1; i < path.nodes.length - 1; i++) if (path.fwd[i - 1] && !path.fwd[i]) out.push(path.nodes[i]);
  return out;
}

export function isOpen(dag, path, adjusted) {
  const Z = new Set(adjusted);
  const cs = new Set(colliders(path));
  for (const v of path.nodes.slice(1, -1)) {
    if (cs.has(v)) {
      const opened = Z.has(v) || [...descendants(dag, v)].some((d) => Z.has(d));
      if (!opened) return false;
    } else if (Z.has(v)) return false;
  }
  return true;
}

// Rejects inputs the rules do not cover: a cycle, treatment equal to outcome,
// or the treatment or outcome in the adjustment set.
function validate(dag, adjusted, A, Y) {
  if (A === Y) throw new Error("treatment and outcome must differ");
  if (adjusted.includes(A) || adjusted.includes(Y)) throw new Error("the treatment and outcome cannot be adjusted for");
  for (const v of new Set(dag.edges.flat())) if (descendants(dag, v).has(v)) throw new Error(`the graph has a cycle through ${v}`);
}

export function assess(dag, adjusted, A = "A", Y = "Y") {
  validate(dag, adjusted, A, Y);
  const paths = allPaths(dag, A, Y).map((p) => ({ ...p, kind: kindOf(p), open: isOpen(dag, p, adjusted) }));
  const desc = descendants(dag, A);
  const adjustedDescendants = adjusted.filter((v) => desc.has(v));
  const openBackdoor = paths.filter((p) => p.kind === "backdoor" && p.open);
  const openOther = paths.filter((p) => p.kind === "other" && p.open);
  const blockedCausal = paths.filter((p) => p.kind === "causal" && !p.open);
  return {
    paths,
    adjustedDescendants,
    openBackdoor,
    openOther,
    blockedCausal,
    backdoorCriterion: openBackdoor.length === 0 && adjustedDescendants.length === 0,
  };
}

// Minimal adjustment sets drawn from `candidates` that satisfy the backdoor
// criterion: no proper subset also satisfies it. Minimal sets can differ in size.
export function minimalSufficientSets(dag, candidates, A = "A", Y = "Y") {
  const sets = [];
  for (let mask = 0; mask < 1 << candidates.length; mask++) {
    const s = candidates.filter((_, i) => mask & (1 << i));
    if (assess(dag, s, A, Y).backdoorCriterion) sets.push(s);
  }
  return sets.filter((s) => !sets.some((t) => t.length < s.length && t.every((v) => s.includes(v))));
}

export function pathLabel(dag, path, names = dag.nodes) {
  const name = (v) => (Object.hasOwn(names, v) ? names[v] : v);
  let t = name(path.nodes[0]);
  for (let i = 1; i < path.nodes.length; i++) t += (path.fwd[i - 1] ? " → " : " ← ") + name(path.nodes[i]);
  return t;
}

// What the page shows for an adjustment set: one row per path, with whether it
// is open and whether that is what the total effect needs (causal paths open,
// every other path blocked), plus the verdict's ingredients.
export function explain(dag, adjusted, names = dag.nodes, A = "A", Y = "Y") {
  const r = assess(dag, adjusted, A, Y);
  const label = (p) => pathLabel(dag, p, names);
  return {
    ok: r.backdoorCriterion,
    rows: r.paths.map((p) => ({ label: label(p), kind: p.kind, open: p.open, wanted: p.kind === "causal" ? p.open : !p.open })),
    openBackdoor: r.openBackdoor.map(label),
    adjustedDescendants: r.adjustedDescendants,
    blockedCausal: r.blockedCausal.map(label),
    openOther: r.openOther.map(label),
  };
}

// The checker's text, as HTML strings: `verdict` goes in a polite live region,
// `list` (one row per path) beside it. Every label is escaped.
const escHtml = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const listing = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const KIND = { causal: "causal path", backdoor: "backdoor path", other: "non-causal path through a collider" };

export function explanationHtml(dag, adjusted, names = dag.nodes) {
  const e = explain(dag, adjusted, names);
  const out = [];
  if (e.ok) {
    out.push(`<p><span class="good">This set satisfies the backdoor criterion</span>: every backdoor path is blocked, both causal paths are open, and nothing the schedule affects is adjusted for. If the diagram is right, it identifies the total effect.</p>`);
    if (adjusted.includes("ps")) out.push("<p>It needs performance status, which registries often do not record (section 3). Without it, this set is not available, and section 8 asks how strong the missing confounder would have to be.</p>");
  } else {
    if (e.openBackdoor.length) out.push(`<p><span class="bad">Confounding remains</span> through ${listing(e.openBackdoor.map(escHtml))}. Adjust for a variable on ${e.openBackdoor.length > 1 ? "each of these paths" : "this path"}.</p>`);
    if (e.adjustedDescendants.length) out.push(`<p><span class="bad">Acute toxicity is caused by the schedule.</span> Adjusting for it blocks part of the effect (${e.blockedCausal.map(escHtml).join(", ")}) and opens ${e.openOther.map(escHtml).join(", ")}, because toxicity is a collider on that path, and U, which could close it, is not recorded.</p>`);
  }
  const list = e.rows.map((r) => `<li><span class="${r.wanted ? "good" : "bad"}">${r.open ? "Open" : "Blocked"}</span> · ${escHtml(r.label)} <span class="pc-kind">(${KIND[r.kind]})</span></li>`).join("");
  return { verdict: out.join(""), list: `<ul class="pc-paths">${list}</ul>` };
}
