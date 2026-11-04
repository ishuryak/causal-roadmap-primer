// Tests for docs/dag_paths.mjs, the path logic behind the causal-diagram checker.
//   node tests/test_dag_paths.mjs
// Expected answers are worked by hand from the diagrams, not recomputed the way
// the code computes them. The DAG self-test items that ask for an adjustment set
// are checked here too, so a wrong key in the bank and a bug in the checker
// would have to agree to slip through.
import { TEACHING_DAG as D, allPaths, assess, colliders, descendants, kindOf, minimalSufficientSets, pathLabel, explanationHtml } from "../docs/dag_paths.mjs";

let fails = 0, passes = 0;
const check = (name, ok, detail = "") => {
  if (ok) { passes++; console.log(`PASS ${name}`); } else { fails++; console.log(`FAIL ${name}${detail ? `: ${detail}` : ""}`); }
};
const label = (p) => pathLabel(D, p, Object.fromEntries(Object.keys(D.nodes).map((k) => [k, k])));
const open = (adj) => assess(D, adj).paths.filter((p) => p.open).map(label).sort();
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const dag = (spec) => ({ nodes: {}, edges: spec.split(";").map((e) => e.trim()).filter(Boolean).map((e) => e.split("->").map((x) => x.trim())) });

// The teaching diagram has exactly six paths between schedule and survival.
const paths = allPaths(D, "A", "Y").map(label).sort();
check("teaching DAG: six paths, listed by hand", same(paths, [
  "A → Y", "A → tox → Y", "A ← age → Y", "A ← stage → Y", "A ← ps → Y", "A → tox ← u → Y",
]), paths.join(" | "));
const kinds = Object.fromEntries(allPaths(D, "A", "Y").map((p) => [label(p), kindOf(p)]));
check("teaching DAG: two causal, three backdoor, one other",
  kinds["A → Y"] === "causal" && kinds["A → tox → Y"] === "causal" && kinds["A ← age → Y"] === "backdoor" &&
  kinds["A ← ps → Y"] === "backdoor" && kinds["A → tox ← u → Y"] === "other", JSON.stringify(kinds));
check("teaching DAG: toxicity is the only collider, on the path through U",
  same(allPaths(D, "A", "Y").flatMap(colliders), ["tox"]));
check("teaching DAG: descendants of the schedule are toxicity and survival", same([...descendants(D, "A")], ["tox", "Y"]));

// Nothing adjusted: the three backdoor paths and both causal paths are open, the collider path is closed.
check("no adjustment: backdoors open, collider path closed",
  same(open([]), ["A → Y", "A → tox → Y", "A ← age → Y", "A ← stage → Y", "A ← ps → Y"]), open([]).join(" | "));
check("no adjustment: fails the backdoor criterion", !assess(D, []).backdoorCriterion);

// Age, stage and performance status: the correct set for the total effect.
const right = assess(D, ["age", "stage", "ps"]);
check("age + stage + PS: satisfies the backdoor criterion", right.backdoorCriterion);
check("age + stage + PS: only the two causal paths stay open", same(open(["age", "stage", "ps"]), ["A → Y", "A → tox → Y"]));

// Performance status not recorded: one backdoor path stays open.
const noPs = assess(D, ["age", "stage"]);
check("age + stage only: the path through PS stays open", !noPs.backdoorCriterion && noPs.openBackdoor.map(label).join() === "A ← ps → Y");

// Adding toxicity: blocks the mediated path and opens the collider path.
const tox = assess(D, ["age", "stage", "ps", "tox"]);
check("adding toxicity: fails the criterion because toxicity is a descendant", !tox.backdoorCriterion && tox.adjustedDescendants.join() === "tox");
check("adding toxicity: the mediated causal path is blocked", tox.blockedCausal.map(label).join() === "A → tox → Y");
check("adding toxicity: the collider path through U opens", tox.openOther.map(label).join() === "A → tox ← u → Y");
check("adding toxicity: all backdoor paths are still closed", tox.openBackdoor.length === 0);

check("teaching DAG: the only minimal sufficient set is age + stage + PS",
  JSON.stringify(minimalSufficientSets(D, D.adjustable).map((s) => s.sort())) === JSON.stringify([["age", "ps", "stage"]]));

// A collider is opened by adjusting for its descendant, too (What If, chapter 6).
const desc = dag("A -> C; Y -> C; C -> D");
check("descendant of a collider: adjusting for D opens A → C ← Y",
  assess(desc, ["D"]).paths.some((p) => label(p) === "A → C ← Y" && p.open) && !assess(desc, []).paths.some((p) => p.open));

// The DAG self-test items with a keyed adjustment set, solved by the checker.
const q25 = dag("A -> Y; L -> A; L -> Y; A -> M; M -> Y; A -> C; Y -> C");
check("self-test item dags-25: minimal set is {L}", JSON.stringify(minimalSufficientSets(q25, ["L", "M", "C"])) === JSON.stringify([["L"]]));
const q26 = dag("A -> Y; U1 -> A; U1 -> L; U2 -> L; U2 -> Y");
check("self-test item dags-26: the empty set works and adjusting for L opens a path",
  assess(q26, []).backdoorCriterion && !assess(q26, ["L"]).backdoorCriterion);
const q27 = dag("A -> Y; A -> M; M -> Y; U2 -> A; U2 -> L; U1 -> L; L -> A; U1 -> L1; L1 -> Y");
check("self-test item dags-27: minimal set over measured variables is {L1}", JSON.stringify(minimalSufficientSets(q27, ["L", "L1", "M"])) === JSON.stringify([["L1"]]));
const q28 = dag("Z -> A; U -> A; U -> Y; L -> A; L -> Y; A -> Y");
check("self-test item dags-28: no set of measured variables suffices", minimalSufficientSets(q28, ["Z", "L"]).length === 0);
const q29 = dag("L1 -> A; L1 -> Y; L2 -> A; L2 -> L3; L3 -> Y; A -> M; M -> Y; A -> Y");
const s29 = minimalSufficientSets(q29, ["L1", "L2", "L3", "M"]).map((s) => s.join("+"));
check("self-test item dags-29: L1 + L3 is a minimal set, L1 alone is not", s29.includes("L1+L3") && !s29.includes("L1"), s29.join(" | "));
const q30 = dag("L -> A; L -> Y; A -> Y; A -> M; M -> Y; W -> M; W -> Y");
const r30 = assess(q30, ["L", "M"]);
check("self-test item dags-30: {L, M} blocks A → M → Y and opens A → M ← W → Y",
  r30.blockedCausal.map(label).join() === "A → M → Y" && r30.openOther.map(label).join() === "A → M ← W → Y");

// Minimal sets can differ in size: {B} and {C, D} both close A ← B → C → Y and A ← B → D → Y.
const sizes = dag("B -> A; B -> C; C -> Y; B -> D; D -> Y; A -> Y");
check("minimal sets of different sizes are all returned",
  JSON.stringify(minimalSufficientSets(sizes, ["B", "C", "D"]).map((s) => s.join("+")).sort()) === JSON.stringify(["B", "C+D"]));

// Inputs the rules do not cover are refused, not answered.
const throws = (f) => { try { f(); return false; } catch { return true; } };
check("a cyclic graph is refused", throws(() => assess(dag("A -> B; B -> A; B -> Y"), [])));
check("treatment equal to outcome is refused", throws(() => assess(D, [], "A", "A")));
check("adjusting for the treatment or the outcome is refused", throws(() => assess(D, ["A"])) && throws(() => assess(D, ["Y"])));
check("a node named like an object method is labeled by its name", pathLabel(dag("A -> toString; toString -> Y"), allPaths(dag("A -> toString; toString -> Y"), "A", "Y")[0], {}) === "A → toString → Y");

// The checker's text, as the page shows it.
const html = (adj) => explanationHtml(D, adj);
const rows = (adj) => [...html(adj).list.matchAll(/<li><span class="(good|bad)">(Open|Blocked)<\/span> · ([^<]*) </g)].map((m) => [m[1], m[2], m[3]]);
const row = (adj, lab) => rows(adj).find((r) => r[2] === lab);
check("text: a causal path is shown Open and good when unadjusted", JSON.stringify(row([], "Fractionation schedule → Survival")) === JSON.stringify(["good", "Open", "Fractionation schedule → Survival"]));
check("text: an open backdoor path is shown Open and bad", JSON.stringify(row([], "Fractionation schedule ← Age → Survival")) === JSON.stringify(["bad", "Open", "Fractionation schedule ← Age → Survival"]));
check("text: a blocked backdoor path is shown Blocked and good", JSON.stringify(row(["age"], "Fractionation schedule ← Age → Survival")) === JSON.stringify(["good", "Blocked", "Fractionation schedule ← Age → Survival"]));
check("text: adjusting for toxicity shows the mediated path Blocked and bad", JSON.stringify(row(["tox"], "Fractionation schedule → Acute toxicity → Survival")) === JSON.stringify(["bad", "Blocked", "Fractionation schedule → Acute toxicity → Survival"]));
check("text: the sufficient set gets the positive verdict and the PS caveat", /satisfies the backdoor criterion/.test(html(["age", "stage", "ps"]).verdict) && /often do not record/.test(html(["age", "stage", "ps"]).verdict));
check("text: a missing confounder gets the confounding verdict naming its path", /Confounding remains<\/span> through Fractionation schedule ← Performance status → Survival\./.test(html(["age", "stage"]).verdict));
check("text: three open paths are listed as A, B and C", /Age → Survival, Fractionation schedule ← Stage → Survival and Fractionation/.test(html([]).verdict));
check("text: adjusting for toxicity names the collider path it opens", /opens Fractionation schedule → Acute toxicity ← Unrecorded factor U → Survival, because toxicity is a collider/.test(html(["age", "stage", "ps", "tox"]).verdict));
check("text: the list is outside the verdict, so the live region stays short", !/<li>/.test(html([]).verdict) && rows([]).length === 6);
// The renderer is for the teaching diagram only (review H02), so escaping is
// tested with hostile display names on that diagram.
const evilNames = { ...D.nodes, A: "<b>x</b>" };
check("text: labels are escaped", /&lt;b&gt;x&lt;\/b&gt;/.test(explanationHtml(D, [], evilNames).list) && !/<b>/.test(explanationHtml(D, [], evilNames).list + explanationHtml(D, ["age"], evilNames).verdict));

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
