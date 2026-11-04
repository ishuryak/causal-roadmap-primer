# External review of fb891d3: findings and fixes (2026-11-03)

Review: `AUDIT_causal_roadmap_primer_2026_11_03.md` (outside this repository), 11 correction
groups (U01 to U11) and 4 hardening items (H01 to H04). Igor Shuryak asked for every item to be
checked, implemented, committed and published. Each finding was first reproduced: the review's
counterexample script ran against fb891d3, and the new regression file
`tests/test_review_2026_11_03.mjs` was run before any fix (18 passed, 45 failed). All findings
held. None was dismissed.

## Correction to the earlier record

`2026_11_03b_dag-section.md` says the "naive correction ... minimum change" wording was applied to
the immortal-time example. The page and quiz item dags-10 actually said "simple correction". The
one-time converter also reinstated that wording when it was re-run. Both now say "naive
adjustment", call it an illustration of how large the bias can be, and say it is not a corrected
estimate of the effect (U06).

## Disposition

| ID | Finding | Fix |
|---|---|---|
| U01 | Disclosure was offered as the remedy for imputing held-out patients from their own outcomes | `#missing` now has two purposes. Inference uses outcome-informed multiple imputation, Rubin's rules, and sensitivity analysis for data missing not at random (Sterne 2009). Prediction made before the outcome is known imputes held-out patients without their outcomes. Ideal and pragmatic performance are named, with Wood, Royston and White 2015 added as reference 42 |
| U02 | An undirected threshold crossing was read as possible efficacy loss | The builder no longer infers a direction from "crosses". Every such output asks which threshold the bias range reaches. For noninferiority it says to compare the range with the margin. "Explain it away" is removed |
| U03 | The glossary confounder and collider definitions, dags-01 and dags-29 | The confounder is a common cause only. A collider can open a path unless another variable still blocks it. A missing arrow means no direct effect. One non-collider closes that path |
| U04 | dags-17 said adjustment within the selected sample cannot fix the path | In the stated diagram, demographics or severity can block the opened route. The limits are stated |
| U05 | dags-23 forced an inverse sign on collider bias | The key is now "a spurious association whose direction depends on the mechanisms". The source's inverse case is kept as an example |
| U06 | Time zero, immortal time, dags-10, dags-19, dags-24 | Time zero is now eligibility plus assignment plus start of follow-up, with non-initiators and grace periods (Hernán and Robins 2016). The subtraction is called naive and illustrative. Time-varying analysis alone does not handle time-varying confounding |
| U07 | cr-17 policy could give invalid courses and claimed realism | Now hypothetical, with a prespecified allowed range and a fallback to the original course. It separates defining a policy from identifying its effect and from clinical safety |
| U08 | The population changed between the main conclusion and the notes | One population label is used in every sentence. A visible precondition now sits next to the builder |
| U09 | Absolute claims | "Only randomization" is removed. Table 2 coefficients cannot "automatically" be read causally. Pearl's first level is association-based learning. Progression status is separated from the PFS endpoint (page and dags-09) |
| U10 | The generator rebuilt from an old base and could overwrite edits | The generator and converter are retired and refuse to run. `docs/index.html` and both question sources are canonical. `tools/renumber_refs.py` (idempotent, `--check` writes nothing), `tools/check_evidence.py` (no personal paths), `tools/reference_manifest.json` and `tools/page_claims.json` are now in the repository. The README has a maintenance recipe |
| U11 | Expand all skipped nested details, and the browser probe never drove the checker | Expand all now opens every details element. The external play-through drives Expand all, all 16 checker states, the `#dag-checker` anchor, and 320 and 375 px with everything expanded |
| H01 | Graph API contract | Malformed edges and unknown names are refused. Candidates are de-duplicated and capped at 16 |
| H02 | Teaching-specific renderer accepted any graph | `explanationHtml` accepts only the teaching diagram |
| H03 | The finite-number check was a regex | It now walks the parsed file. Controls: null, NaN, Infinity and a numeric string are each caught, and the old check missed all four |
| H04 | Malformed banks | Nested records, unique ids and reference membership are validated. Setup errors from inline data show the load error and keep Start disabled |

## Verification (2026-11-03)

- Node suites, all passing: primer 76, numerics 22, roadmap quiz 21, path logic 36, DAG section and quiz 37, review regressions 63. `tools/renumber_refs.py --check` passes.
- Evidence quotes: 77 (roadmap quiz), 33 (DAG quiz) and 203 (page claims, including 6 new) found in their full texts. 4 matched on words only, and each is a line-break hyphen from PDF extraction. Every changed passage was also read against its source.
- The review's exhaustive DAG oracle: 0 failures in 163,840 adjustment and 20,480 minimal-set cases.
- Headless Chrome play-through:
  - both quizzes at 20/30, 30/30 and 0/30, and at 320 px
  - quiz-to-primer links
  - primer: builder, simulations, Expand and Collapse all including nested details, all 16 checker states, anchor opening
  - 320 and 375 px with everything expanded: all pass.
- Browser mutations, run on copies, turned the probe red:
  - checker change listener removed
  - Expand all limited to outer details.
- Print to PDF: 52 pages, nested content present.
- Not done here: native keyboard navigation with a real keyboard, and a screen-reader pass. The keyboard contract is covered by synthetic events and source checks only.
- Simulation numbers: unchanged. No refit.
