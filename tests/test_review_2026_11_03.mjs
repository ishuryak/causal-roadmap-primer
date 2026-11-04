// Regression tests for the 2026-11-03 external review (AUDIT_causal_roadmap_primer_2026_11_03.md,
// findings U01-U11 and H01-H04). Each block names its finding. Where a finding is
// about reasoning rather than wording, the block runs a small executable control
// (a counterexample from the review) next to the text check, so the page cannot
// drift back to a claim the control contradicts.
//   node tests/test_review_2026_11_03.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { trialArgument, classifyInterval, OPTIONS } from "../docs/trial_argument.mjs";
import { TEACHING_DAG, assess, minimalSufficientSets, explanationHtml } from "../docs/dag_paths.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "docs");
let fails = 0, passes = 0;
const check = (name, ok, detail = "") => {
  if (ok) { passes++; console.log(`PASS ${name}`); } else { fails++; console.log(`FAIL ${name}${detail ? `: ${detail}` : ""}`); }
};
const read = (p) => readFileSync(join(dir, p), "utf8");
const html = read("index.html"), app = read("app.mjs"), quizJs = read("quiz/quiz.js");
const textOf = (h) => h.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");
const block = (id) => { const i = html.indexOf(`id="${id}"`); return textOf(html.slice(i, html.indexOf("</details>", i))); };
const rq = JSON.parse(read("quiz/questions_source.json")).questions;
const dq = JSON.parse(read("dag-quiz/questions_source.json")).questions;
const item = (bank, id) => bank.find((q) => q.id === id);
const all = (q) => [q.stem, ...q.choices, q.explanation].join(" ");
const txt = (r) => [r.lean, ...r.supports, ...r.cannot, ...r.open, ...r.extras].join(" ");
const combos = [];
(function walk(keys, acc) {
  if (!keys.length) { combos.push(acc); return; }
  for (const v of OPTIONS[keys[0]]) walk(keys.slice(1), { ...acc, [keys[0]]: v });
})(Object.keys(OPTIONS), {});

// ---------- U01: imputation for inference vs prediction available at use time ----------
{
  const m = block("missing");
  check("U01: the section names two purposes, inference and prediction at use time", /inference/i.test(m) && /prediction/i.test(m) && /before (the|their|the patient's) outcome is known|at the time of use|when the prediction is made/i.test(m), m.slice(0, 200));
  check("U01: for prediction, held-out imputations never read held-out outcomes", /without (using|reading) (the )?held-out (patients' )?outcomes|make no use of (their|the held-out|held-out) outcomes/i.test(m));
  check("U01: disclosure is no longer offered as the remedy", !/Report this when presenting them/.test(m));
  check("U01: ideal complete-data performance is named as a separate target", /ideal/i.test(m) && /pragmatic/i.test(m));
  check("U01: the summary no longer promises one recipe for both purposes", !/impute with the outcome, and split before imputing/.test(html));
  // Control from the review: a training-only imputer that learned X = Y, and a predictor Yhat = X.
  const trainX = [-1, 1, -1, 1], testY = [-1, 1, 1, -1];
  const slope = 1, meanX = trainX.reduce((s, x) => s + x, 0) / trainX.length;
  const leaky = (ys) => ys.map((y) => slope * y), hidden = (ys) => ys.map(() => slope * meanX);
  const permuted = [...testY.slice(1), testY[0]]; // a rotation, which changes the order of these outcomes
  check("U01 control: an outcome-hidden pipeline gives the same predictions when held-out outcomes are permuted", JSON.stringify(hidden(testY)) === JSON.stringify(hidden(permuted)));
  check("U01 control: the leaky pipeline's predictions move with the held-out outcomes", JSON.stringify(leaky(testY)) !== JSON.stringify(leaky(permuted)));
}

// ---------- U02: an undirected threshold crossing gives no direction ----------
{
  const crosses = combos.filter((c) => c.bias === "crosses");
  const bad = crosses.filter((c) => { const t = txt(trialArgument(c)); return /loss of efficacy cannot be ruled out|explain it away/i.test(t); });
  check("U02: no 'crosses' output infers efficacy loss or an explained-away effect", bad.length === 0, JSON.stringify(bad[0] || ""));
  const noDirection = crosses.filter((c) => !["duplicate", "investigate"].includes(trialArgument(c).key) && !/which threshold/i.test(txt(trialArgument(c))));
  check("U02: every weighed 'crosses' output asks which threshold the bias range reaches", noDirection.length === 0, JSON.stringify(noDirection[0] || ""));
  const ni = trialArgument({ aim: "noninferiority", prior: "none", bench: "na", ci: "clear_benefit", bias: "crosses", support: "full", hte: "no" });
  check("U02: the noninferiority case compares the bias range with the prespecified margin", /margin/.test(txt(ni)));
  // Control from the review: H = -2, B = +2, interval [3, 4] moves to [1.5, 2.5] under the bias range.
  check("U02 control: the positive-only range changes the reading but never reaches zero or the margin",
    classifyInterval(3, 4, -2, 2) === "clear_benefit" && classifyInterval(1.5, 2.5, -2, 2) === "benefit_or_none" && 1.5 > 0 && 1.5 > -2);
  const raw = [["clear_harm", "harm"], ["negligible", "lowpriority"], ["clear_benefit", "hypothesis"], ["harm_or_none", "nobenefit"]];
  check("U02: raw harm, negligible, benefit and no-benefit cases are unchanged",
    raw.every(([ci, key]) => trialArgument({ aim: "superiority", prior: "none", bench: "na", ci, bias: "within", support: "full", hte: "no" }).key === key));
}

// ---------- U08: one target population throughout the builder output ----------
{
  const restricted = combos.filter((c) => c.support === "restricted" && c.prior === "excludes" && !["duplicate", "investigate", "notready"].includes(trialArgument(c).key));
  const loose = restricted.filter((c) => { const r = trialArgument(c); return r.extras.some((t) => /earlier trial excluded/.test(t) && !/supported subset/.test(t)); });
  check("U08: with restricted overlap, every note about excluded patients names the supported subset", restricted.length > 0 && loose.length === 0, JSON.stringify(loose[0] || ""));
  check("U08: no output says the analysis speaks to exactly the excluded patients", combos.every((c) => !/speaks to exactly those patients/.test(txt(trialArgument(c)))));
  const full = trialArgument({ aim: "superiority", prior: "excludes", bench: "na", ci: "negligible", bias: "within", support: "full", hte: "no" });
  check("U08: with full overlap, the low-priority conclusion is still allowed", full.key === "lowpriority");
  const argue = html.slice(html.indexOf('id="argue"') - 600, html.indexOf('id="argue"'));
  check("U08: a visible precondition sits next to the builder", /only after/i.test(textOf(argue)) && /sections 2 to 5/.test(textOf(argue)), textOf(argue).slice(-300));
}

// ---------- U09: narrowed absolute claims ----------
{
  check("U09: no 'only randomization' or 'only a randomized trial' claim on the page or in the builder", !/only randomization|only a randomized trial/i.test(textOf(html) + combos.map((c) => txt(trialArgument(c))).join(" ")));
  const t2 = textOf(html.slice(html.indexOf("The Table 2 fallacy is"), html.indexOf("Reading an observational oncology paper")));
  check("U09: Table 2 coefficients cannot automatically be read as the same kind of effect", /automatically/.test(t2) && !/each confounder's own coefficient cannot be read causally, because/.test(t2));
  check("U09: Pearl's first level is attributed to association-based learning", /association-based/.test(block("ladder")) && !/Pearl places current machine learning on the first level/.test(html));
  const med = textOf(html.slice(html.indexOf("Mediator, oncology"), html.indexOf("Mediator, oncology") + 600));
  check("U09: the mediator row uses progression status and keeps the PFS endpoint distinct", /progression status/.test(med) && /endpoint/.test(med));
  const d9 = item(dq, "dags-09");
  check("U09: dags-09 separates progression status from the PFS endpoint", /progression status/.test(all(d9)) && /composite|endpoint/.test(d9.explanation));
}

// ---------- U03: glossary and DAG items follow the path rules ----------
{
  const g = textOf(html.slice(html.indexOf('id="glossary"'), html.indexOf('id="references"')));
  const conf = (g.match(/Confounder (.*?) Cross-fitting/) || [])[1] || "";
  check("U03: the glossary defines a confounder as a common cause only", /common cause of treatment and outcome/.test(conf) && !/or a variable on a backdoor path/.test(conf) && /can be a collider/.test(conf), conf);
  const coll = (g.match(/Collider (.*?) Confounder/) || [])[1] || "";
  check("U03: the glossary says adjusting for a collider can open the path, unless something else blocks it", /can open/.test(coll) && /other|another/.test(coll), coll);
  check("U03: dags-01 says a missing arrow rules out a direct effect only", /no direct (causal )?effect/.test(item(dq, "dags-01").explanation) && /indirect|through other/.test(item(dq, "dags-01").explanation));
  check("U03: dags-29 says one non-collider closes that path", /non-collider/.test(item(dq, "dags-29").explanation));
  // Controls from the review.
  const dag = (s) => ({ nodes: {}, edges: s.split(";").map((e) => e.trim().split("->").map((x) => x.trim())) });
  const m = dag("U1 -> A; U1 -> L; U2 -> L; U2 -> Y; A -> Y");
  check("U03 control: in M-bias the path through collider L is closed until L is adjusted for",
    assess(m, []).backdoorCriterion && !assess(m, ["L"]).backdoorCriterion);
  const chain = dag("A -> M; M -> Y");
  check("U03 control: with no direct arrow, A → M → Y is still a causal path", assess(chain, []).paths.some((p) => p.kind === "causal" && p.open));
  const two = dag("A -> C1; U -> C1; U -> C2; Y -> C2; A -> Y");
  check("U03 control: a path with two colliders stays blocked when only one is adjusted for", assess(two, ["C1"]).paths.filter((p) => p.kind !== "causal").every((p) => !p.open));
  check("U03 control: a fork closes on its middle variable", assess(dag("L -> A; L -> Y; A -> Y"), ["L"]).backdoorCriterion);
}

// ---------- U04: dags-17, adjustment within the selected sample ----------
{
  const e = item(dq, "dags-17").explanation;
  check("U04: dags-17 no longer says adjustment within the sample cannot fix it", !/do not fix this/.test(e));
  check("U04: dags-17 says demographics or severity can block the opened route, with limits", /demographics or (injury )?severity/.test(e) && /(unmeasured|broader|not hospitali)/.test(e));
  const g = { nodes: {}, edges: [["D", "A"], ["D", "H"], ["S", "H"], ["S", "Y"]] };
  const open = (z) => assess(g, z).openBackdoor.length;
  check("U04 control: {H} opens one path, {H, D} and {H, S} close it", open(["H"]) === 1 && open(["H", "D"]) === 0 && open(["H", "S"]) === 0);
}

// ---------- U05: dags-23, the sign of collider bias is not fixed by the graph ----------
{
  const q = item(dq, "dags-23");
  check("U05: the keyed answer says the direction depends on the mechanisms", /direction depends/.test(q.choices[q.answer]), q.choices[q.answer]);
  check("U05: no choice forces an inverse association as the answer", !/inverse/.test(q.choices[q.answer]));
  check("U05: the explanation keeps the source's inverse case as an example", /for example|example/i.test(q.explanation) && /Lederer/.test(q.explanation));
  const or = (p) => (p[3] * p[0]) / (p[1] * p[2]);
  check("U05 control: two monotone mechanisms give opposite signs among sleepy people", or([0.1, 0.2, 0.2, 0.9]) > 1 && or([0.1, 0.4, 0.4, 0.7]) < 1);
}

// ---------- U06: time zero and the illustrative subtraction ----------
{
  const time = block("dag-time");
  check("U06: the subtraction is called naive and illustrative, not a correction of the effect", /naive/.test(time) && /illustrat/.test(time) && !/A simple correction/.test(time));
  check("U06: time zero is the aligned point of eligibility, assignment and start of follow-up", /eligibility/.test(time) && /assign/.test(time) && /non-initiators|not to start/.test(time) && /grace period/.test(time));
  check("U06: a time-varying exposure alone does not handle time-varying confounding", /does not (by itself |on its own )?(handle|adjust for|remove) time-varying confounding/.test(time));
  check("U06: dags-10 calls the subtraction naive and illustrative", /naive/.test(item(dq, "dags-10").explanation) && /illustrat/.test(item(dq, "dags-10").explanation));
  const d24 = item(dq, "dags-24");
  check("U06: dags-24 ties immortal time to classifying by later receipt, and covers non-initiators", /later/.test(d24.explanation) && /non-initiators|not to start|do not start/.test(d24.explanation) && !/starting before treatment assignment creates immortal time/.test(d24.explanation));
  check("U06: dags-19 notes that time-varying analysis alone does not adjust for time-varying confounding", /time-varying confounding/.test(item(dq, "dags-19").explanation));
}

// ---------- U07: cr-17, a complete and feasible hypothetical policy ----------
{
  const q = item(rq, "cr-17");
  check("U07: cr-17 is framed as hypothetical with a feasibility rule and a fallback", /hypothetical/i.test(all(q)) && /otherwise|only when|only if/.test(q.stem) && !/realistic shift in practice/.test(q.explanation));
  check("U07: cr-17 separates defining a policy from identifying its effect and from safety", /identif/.test(q.explanation) && /safe/.test(q.explanation));
  const rule = (n, min = 5) => (n - 5 >= min ? n - 5 : n);
  check("U07 control: a rule with a minimum course never produces an invalid course", [5, 6, 9, 10, 30].every((n) => rule(n) >= 5) && rule(30) === 25 && rule(6) === 6);
}

// ---------- U11: Expand all covers nested details ----------
{
  const handler = app.slice(app.indexOf('$("#expand-all").addEventListener'), app.indexOf("// Printing shows everything"));
  check("U11: Expand all opens and closes every details element, nested ones included", /querySelectorAll\("details"\)/.test(handler) && !/details\.more"\)/.test(handler));
  check("U11: the inner checker is a details element the control now reaches", /<details class="inner" id="dag-checker">/.test(html));
}

// ---------- H02: the explanation renderer is for the teaching graph only ----------
{
  let threw = false;
  try { explanationHtml({ nodes: { A: "A", Y: "Y", D: "D" }, edges: [["A", "Y"], ["A", "D"]] }, ["D"]); } catch { threw = true; }
  check("H02: another graph gets an explicit error, not invented mechanisms", threw);
  const subsets = [];
  for (let m = 0; m < 16; m++) subsets.push(TEACHING_DAG.adjustable.filter((_, i) => m & (1 << i)));
  const coherent = subsets.every((z) => {
    const r = assess(TEACHING_DAG, z), h = explanationHtml(TEACHING_DAG, z);
    const opens = (h.list.match(/>Open</g) || []).length;
    return opens === r.paths.filter((p) => p.open).length && /satisfies the backdoor criterion/.test(h.verdict) === r.backdoorCriterion;
  });
  check("H02: all 16 checkbox combinations give a list and verdict that agree with the path logic", coherent);
}

// ---------- H01: the graph API refuses inputs outside its contract ----------
{
  const throws = (f) => { try { f(); return false; } catch { return true; } };
  const fork = { nodes: {}, edges: [["L", "A"], ["L", "Y"], ["A", "Y"]] };
  check("H01: unknown adjustment names are refused", throws(() => assess(fork, ["Q"])));
  check("H01: an unknown endpoint is refused", throws(() => assess(fork, [], "A", "Z")));
  check("H01: malformed edges are refused", throws(() => assess({ nodes: {}, edges: [["A"]] }, [])));
  const many = { nodes: {}, edges: [["L", "A"], ["L", "Y"], ["A", "Y"], ...Array.from({ length: 30 }, (_, i) => [`N${i}`, "Y"])] };
  check("H01: more than 16 candidates is refused rather than answered with []", throws(() => minimalSufficientSets(many, ["L", ...Array.from({ length: 30 }, (_, i) => `N${i}`)])));
  check("H01: duplicate candidates are de-duplicated", JSON.stringify(minimalSufficientSets(fork, ["L", "L"])) === JSON.stringify([["L"]]));
  check("H01: a normal fork still returns {L}", JSON.stringify(minimalSufficientSets(fork, ["L"])) === JSON.stringify([["L"]]));
}

// ---------- H04: malformed banks show an error and keep Start disabled ----------
function loadQuiz(data) {
  const els = {};
  const el = (id) => (els[id] ||= { id, textContent: "", innerHTML: "", disabled: true, hidden: true, style: {}, classList: { add() {}, toggle() {} },
    addEventListener() {}, focus() {}, querySelectorAll: () => [], insertAdjacentHTML() {} });
  const window = { QUIZ_DATA: data, scrollTo() {} };
  const document = { getElementById: el };
  const ctx = { window, document, location: { protocol: "https:" }, fetch: () => Promise.reject(new Error("no fetch")), AbortSignal: {}, console };
  window.window = window;
  vm.runInNewContext(quizJs, ctx);
  return { start: el("start"), err: el("loaderr") };
}
{
  const good = JSON.parse(read("quiz/bank.json")), goodDag = JSON.parse(read("dag-quiz/bank.json"));
  check("H04: both real banks enable Start", !loadQuiz(good).start.disabled && !loadQuiz(goodDag).start.disabled);
  const bad = {
    "sections=[null]": { ...goodDag, sections: [null] },
    "refs=[null]": { ...good, refs: [null] },
    "non-string choice": { ...good, questions: good.questions.map((q, i) => (i ? q : { ...q, choices: [1, 2, 3, 4, 5] })) },
    "missing reference": { ...good, questions: good.questions.map((q, i) => (i ? q : { ...q, refs: [999] })) },
    "duplicate id": { ...good, questions: good.questions.map((q, i) => (i === 1 ? { ...q, id: good.questions[0].id } : q)) },
    "answer out of range": { ...good, questions: good.questions.map((q, i) => (i ? q : { ...q, answer: 7 })) },
    "empty questions": { ...good, questions: [] },
  };
  for (const [name, b] of Object.entries(bad)) {
    let r, threw = false;
    try { r = loadQuiz(b); } catch { threw = true; }
    check(`H04: ${name} shows an error and keeps Start disabled`, !threw && r.start.disabled && !r.err.hidden && /could not be loaded/.test(r.err.textContent));
  }
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
