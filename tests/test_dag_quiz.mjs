// Tests for the optional causal-diagram section of the primer and its
// self-test (docs/dag-quiz/).
//   node tests/test_dag_quiz.mjs
// Exits 1 on any failure. Quote-level checks against the full-text sources run
// outside the repository (check_quiz_evidence.py), because the sources are
// under copyright and are not committed.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateBank, primerRefs } from "../docs/quiz/bank_rules.mjs";
import { findGuardedTerms } from "../docs/guard_terms.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "docs");
let fails = 0, passes = 0;
const check = (name, ok, detail = "") => {
  if (ok) { passes++; console.log(`PASS ${name}`); } else { fails++; console.log(`FAIL ${name}${detail ? `: ${detail}` : ""}`); }
};
const read = (p) => readFileSync(join(dir, p), "utf8");
const html = read("index.html"), app = read("app.mjs"), css = read("style.css");
const bank = JSON.parse(read("dag-quiz/bank.json"));
const source = JSON.parse(read("dag-quiz/questions_source.json"));
const page = read("dag-quiz/index.html"), quizJs = read("quiz/quiz.js");
const refs = primerRefs(html);
const sections = bank.sections.map(([id]) => id);

// ---------- The optional section on the primer page ----------
const at = (id) => html.indexOf(`id="${id}"`);
check("section: the optional DAG section sits after section 3 and before section 4", at("dag") < at("dag-more") && at("dag-more") < at("estimand"));
const opt = html.slice(at("dag-more"), at("estimand"));
check("section: it is one collapsible block, closed by default", /<details class="more wide" id="dag-more-body">/.test(opt) && !/<details[^>]*\bopen\b/.test(opt));
check("section: it has a visible lede saying it is optional", /class="lede">Section 3 gave three rules/.test(opt) && /Optional/.test(opt));
check("section: every self-test section is a subsection of it", sections.every((id) => opt.includes(`<details class="more" id="${id}">`)), sections.filter((id) => !opt.includes(`id="${id}"`)).join(","));
check("section: it links to the causal-diagram self-test", /href="dag-quiz\/"/.test(opt));
check("section: section 3 and the roadmap nav point to it", (html.match(/href="#dag-more"/g) || []).length >= 2);
check("section: the three building blocks are drawn, with a text alternative", /<figure class="mini-dags">\s*<svg[^>]*role="img" aria-label="Three diagrams/.test(opt));
check("checker: the page has its figure, controls and live answer", /id="pc-figure"/.test(opt) && /id="pc-boxes"/.test(opt) && /id="pc-answer" aria-live="polite"/.test(opt));
check("checker: the page script shows the tested text and redraws on change", /from "\.\/dag_paths\.mjs"/.test(app) && /explanationHtml\(D, adjusted, NAMES\)/.test(app) && /\$\("#pc-boxes"\)\.addEventListener\("change", update\)/.test(app));
check("checker: only the verdict is in the live region", /<div id="pc-answer" aria-live="polite"><\/div><div id="pc-list"><\/div>/.test(opt));
check("navigation: a link into a closed section opens it and scrolls to the target", /el\?\.scrollIntoView\(\)/.test(app));
check("checker: the diagram is labeled hypothetical", /A hypothetical diagram for the running example/.test(opt));
check("checker: the checker styles exist", /\.pc-set \{/.test(css) && /\.pc-paths \{/.test(css));
const text = opt.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
check("section: no em dash and no semicolon-joined prose", !/—/.test(opt) && !/[a-z]; [a-z]/.test(text));
check("section: no guarded names or numbers", findGuardedTerms(opt + page).length === 0);

// Additions from the talk's backup slides.
check("additions: Pearl's ladder is in section 0", html.indexOf('id="ladder"') > at("questions") && html.indexOf('id="ladder"') < at("question"));
check("additions: cross-fitting and honesty are in section 7", html.indexOf('id="crossfit"') > at("estimators") && html.indexOf('id="crossfit"') < at("checks"));
check("additions: missing data and simulation limits are in section 8", ["missing", "sim-limits"].every((id) => html.indexOf(`id="${id}"`) > at("checks") && html.indexOf(`id="${id}"`) < at("compare")));
check("additions: a closed glossary sits before the references", at("glossary") < at("references") && /<section class="part" id="glossary">[\s\S]*?<details class="more">/.test(html));
check("additions: the imputation advice keeps the outcome in and splits first", /including the treatment and the outcome/.test(html) && /fit any imputation on the training patients only/.test(html) && /without using the held-out outcomes/.test(html));

// ---------- The self-test bank ----------
const { errors, stats } = validateBank(bank, refs, sections);
check("bank: passes every rule against its own sections", errors.length === 0, errors.join(" | "));
check("bank: the keyed answer is uniquely longest in at most 7 items", stats.longest <= 7, String(stats.longest));
check("bank: the section list matches its source", JSON.stringify(bank.sections) === JSON.stringify(source.sections));
check("bank: questions match the source exactly", JSON.stringify(bank.questions) === JSON.stringify(source.questions.map(({ id, topic, section, stem, choices, answer, explanation, refs: r, evidence }) => ({ id, topic, section, stem, choices, answer, explanation, refs: r, evidence }))));
const stale = bank.refs.filter((r) => { const p = refs.find((x) => x.n === r.n); return !p || p.citation !== r.citation || p.url !== r.url; });
check("bank: references match the primer's current list", stale.length === 0, stale.map((r) => r.n).join(","));
const used = new Set(bank.questions.flatMap((q) => q.refs));
check("bank: every reference shown is cited by a question, and every cited one is shown", bank.refs.length === used.size && bank.refs.every((r) => used.has(r.n)));
check("bank: every evidence quote names a cited reference and has 6+ words",
  bank.questions.every((q) => q.evidence.length && q.evidence.every((e) => q.refs.includes(e.ref) && e.quote.split(/\s+/).length >= 6)));
check("bank: labels are numbered as subsections of section 3", bank.sections.every(([, label]) => /^3[a-h] · /.test(label)));
const qtext = bank.questions.map((q) => [q.stem, ...q.choices, q.explanation].join(" ")).join(" ");
check("bank: every glossary entry is used in some question", bank.glossary.every(([a]) => new RegExp(`(^|[^A-Za-z])${a}`).test(qtext)));

// ---------- The self-test page ----------
check("page: reuses the roadmap quiz engine and styles", /<script src="\.\.\/quiz\/quiz\.js"><\/script>/.test(page) && /href="\.\.\/quiz\/quiz\.css"/.test(page));
check("page: links back to the primer's DAG section", /href="\.\.\/#dag-more"/.test(page) && /href="\.\.\/"/.test(page));
check("page: the engine takes section labels from the bank only when it has them", /if \(Array\.isArray\(data\.sections\) && data\.sections\.length\) SECTIONS = Object\.fromEntries\(data\.sections\);/.test(quizJs) && /let SECTIONS = \{/.test(quizJs));
check("page: no semicolon-joined prose on the self-test page", !/[a-z]; [a-z]/.test(page.replace(/<[^>]+>/g, " ")));
check("bank: section labels and title have no em dash, semicolon or guarded term", !/[—;]/.test(JSON.stringify(bank.sections) + bank.title) && findGuardedTerms(JSON.stringify(bank.sections) + bank.title).length === 0);
check("published page carries no internal claim ids", !/data-src=/.test(html));
check("page: no em dash", !/—/.test(page));
const hosts = [...page.matchAll(/(?:href|src)="(https?:\/\/[^/"]+)/g)].map((m) => m[1]);
check("page: external hosts only fonts", hosts.every((h) => ["https://fonts.googleapis.com", "https://fonts.gstatic.com"].includes(h)), hosts.join(","));

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
