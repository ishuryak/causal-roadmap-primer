// Builds a bank.json from a question draft plus the primer's reference list.
//   node docs/quiz/build_bank.mjs DRAFT.json [OUT_DIR]
// OUT_DIR defaults to this folder (the roadmap self-test). A draft with its own
// "sections" list (for example docs/dag-quiz/questions_source.json) is checked
// against those sections, and the list is copied into the bank so the quiz page
// can label them.
// The references are read from ../index.html, so a renumbered or edited primer
// reference shows up here (and tests/test_causal_roadmap_quiz.mjs fails if
// bank.json is stale). Exits 1 without writing if the draft breaks a rule.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateBank, GLOSSARY, primerRefs, SECTIONS } from "./bank_rules.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const draft = JSON.parse(readFileSync(process.argv[2], "utf8"));
const refs = primerRefs(readFileSync(join(here, "..", "index.html"), "utf8"));
const used = [...new Set(draft.questions.flatMap((q) => q.refs))].sort((a, b) => a - b);
const text = draft.questions.map((q) => [q.stem, ...q.choices, q.explanation].join(" ")).join(" ");
const outDir = process.argv[3] || here;
const sections = draft.sections ? draft.sections.map(([id]) => id) : SECTIONS;
const bank = {
  title: draft.bankTitle || "Causal Roadmap Self-Test",
  ...(draft.sections ? { sections: draft.sections } : {}),
  questions: draft.questions.map(({ id, topic, section, stem, choices, answer, explanation, refs: r, evidence }) =>
    ({ id, topic, section, stem, choices, answer, explanation, refs: r, evidence })),
  refs: used.map((n) => refs.find((r) => r.n === n)).filter(Boolean),
  glossary: GLOSSARY.filter(([a]) => new RegExp(`(^|[^A-Za-z])${a}([^A-Za-z]|$)`).test(text)),
};
const { errors, stats } = validateBank(bank, refs, sections);
console.log(stats);
if (errors.length) {
  errors.forEach((e) => console.log("ERROR", e));
  process.exit(1);
}
writeFileSync(join(outDir, "bank.json"), JSON.stringify(bank, null, 1) + "\n");
console.log(`wrote bank.json: ${bank.questions.length} questions, ${bank.refs.length} references, ${bank.glossary.length} abbreviations`);
