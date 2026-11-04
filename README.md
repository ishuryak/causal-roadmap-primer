# Causal Roadmap Primer

Igor Shuryak, MD, PhD · is144@cumc.columbia.edu · Center for Radiological Research, Columbia University Irving Medical Center

**Live page:** https://ishuryak.github.io/causal-roadmap-primer/
**Self-tests:** https://ishuryak.github.io/causal-roadmap-primer/quiz/ (the roadmap) and https://ishuryak.github.io/causal-roadmap-primer/dag-quiz/ (causal diagrams)

A teaching page for medical students and residents who know Cox regression, random forests and XGBoost and want to ask a cause-and-effect question of clinical data. It walks from a clinical question to a causal analysis plan, using hypofractionated versus conventional radiotherapy as the running example.

## What the page covers

- **The goal.** Better treatment, for groups of patients and, as far as the data allow, for individual patients.
- **The roadmap.**
  - the kind of question
  - the target trial
  - causal diagrams, with an optional section that explains them in depth: chains, forks and colliders, the backdoor criterion, what not to adjust for, selection bias, time zero and immortal time, what a diagram cannot do, and how to report one. It includes an interactive diagram where you choose what to adjust for and see which paths open or close.
  - the estimand
  - identification, including censoring
  - treatment policies
  - estimators, from weighting to double machine learning and causal forests
  - checks and sensitivity analysis
- **Causal machine learning on randomized trial data.** What it adds when assignment is already random.
- **The end goal of the analysis.** A conditional argument about whether a new randomized trial would be useful, with an interactive builder.
- **A worksheet.** It turns your own question into a one-page plan.

Main points are shown, and details, examples and questions open on click. Two 30-question self-tests, one on the roadmap and one on causal diagrams, check each section, with every answer tied to a quotation from its full-text source. A glossary and a short note on Pearl's ladder of causation, cross-fitting, missing data and the limits of simulation studies round out the page.

## Related work

This page is a companion to the [Causal Analysis for Survival Trajectories (CAST) demo](https://ishuryak.github.io/cast_demo_website/tutorial/) by Andy Wilson, Aimee Harrison and Igor Shuryak. For survival-specific material, such as effects that change over follow-up and causal survival forests, the page links to that site.

## Data and provenance

- All three simulations use synthetic data and run in the browser. Simulation 3 is precomputed by `docs/build_sim3.mjs`.
- No patient data are used anywhere.
- Every cited source was read in full text.
- Parts of the text, code and checks were prepared with the help of an AI assistant (Anthropic Claude). The author is responsible for the scientific content.

## Layout and tests

`docs/` is the site, served by GitHub Pages:
- `index.html`, `app.mjs`, `style.css`: the page.
- `sims.mjs`: the simulations.
- `trial_argument.mjs`: the trial-argument logic.
- `dag_paths.mjs`: the path logic and text of the interactive causal diagram.
- `quiz/`: the roadmap self-test and the quiz engine. Edit `quiz/questions_source.json`, then run `node docs/quiz/build_bank.mjs docs/quiz/questions_source.json`.
- `dag-quiz/`: the causal-diagram self-test, run by the same engine. Edit `dag-quiz/questions_source.json`, then run `node docs/quiz/build_bank.mjs docs/dag-quiz/questions_source.json docs/dag-quiz`.

## Maintaining the page

- **Edit these files directly. They are the source:** `docs/index.html`, `docs/quiz/questions_source.json`, `docs/dag-quiz/questions_source.json`, and the scripts in `docs/`.
- **Derived files.** Never edit these by hand. Rebuild them:
  - `docs/quiz/bank.json`: `node docs/quiz/build_bank.mjs docs/quiz/questions_source.json`
  - `docs/dag-quiz/bank.json`: `node docs/quiz/build_bank.mjs docs/dag-quiz/questions_source.json docs/dag-quiz`
  - `docs/sim3.json`: `node docs/build_sim3.mjs`, only after editing the simulation code.
- **Adding a reference.** Give its `<li>` and its citation links any unused number, add the full-text file name to `tools/reference_manifest.json`, then run `python3 tools/renumber_refs.py` and rebuild both banks. The script puts references in first-citation order. In the same pass it updates both question sources, the manifest and `tools/page_claims.json`. `python3 tools/renumber_refs.py --check` only reports.
- **Checking quotes.** Run `python3 tools/check_evidence.py FILE --sources DIR`. FILE is a question source or `tools/page_claims.json`, and DIR is the private folder of full texts. The full texts are not in this repository because several are under copyright. A quote match shows the quoted words are in the source. It does not show that the sentence around them follows from them, so read every changed passage against the full text.
- **Retired.** The one-time page generator and DAG-bank converter that built the 2026-11-03 version from templates are retired and refuse to run, because they would overwrite later edits.

Run the tests with Node 20 or later:

```
node tests/test_causal_roadmap_primer.mjs
node tests/test_causal_roadmap_numerics.mjs
node tests/test_causal_roadmap_quiz.mjs
node tests/test_dag_paths.mjs
node tests/test_dag_quiz.mjs
node tests/test_review_2026_11_03.mjs
python3 tools/renumber_refs.py --check
```

The same commands run in GitHub Actions on every push.
