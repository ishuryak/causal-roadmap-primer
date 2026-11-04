# A closer look at causal diagrams, a DAG self-test, and material from the talk's backup slides (2026-11-03)

Requested by Igor Shuryak on 2026-11-03: add a section that explains causal diagrams
(DAGs) and tests them, modeled on the 2026-11-01 DAG study guide and 30-question test,
opened only by readers who want it. Also bring in suitable backup slides from the
October 2026 University of Hawaiʻi talk (v10 deck, slides 47-72). Use nothing that is
not backed by a verifiable URL or a downloaded full text.

## Plan

1. **Optional DAG section** `#dag-more`, placed right after section 3 and closed by
   default (one `details` the reader opens). It has eight nested subsections:
   - reading a DAG
   - the three building blocks
   - confounding and the backdoor criterion
   - what not to adjust for
   - selection bias as collider stratification
   - time and treatment
   - what a DAG cannot do
   - drawing and reporting a DAG

   The text is condensed from the study guide's verified claims (`{gN}` IDs), and every
   sentence keeps the source its claim was verified against. A provenance file maps each
   paragraph to its claim IDs. Verify: every cited reference exists in the list, and
   every claim ID resolves to an evidence quote that passes the strict quote checker.
2. **Interactive path checker** inside that section: a small hypothetical DAG on the
   running example. The reader ticks variables to adjust for and sees which paths from
   schedule to survival are open or closed, and whether the set is sufficient for the
   total effect. The logic is plain d-separation (What If, chapter 6). Verify: unit tests
   against hand-worked answers, each broken on purpose once to confirm it goes red.
3. **DAG self-test**: the 30 audited questions as a second bank at `docs/dag-quiz/`,
   run by the existing quiz engine. The engine is changed to accept a bank URL and
   section labels, and its default behavior stays the same. References are renumbered
   to the primer's list. Verify: the bank rules (30 items, 5 unique choices, balance,
   style, glossary, guarded terms), the quote checker on every evidence quote, and a
   headless play-through.
4. **From the backup slides**, only content that generalizes and is sourced:
   - slide 58, Pearl's ladder, goes to section 0 (Pearl 2019, author's version downloaded).
   - slide 60, why a post-treatment variable is not adjusted for, goes to the DAG
     section. Its rule is corrected to the What If wording (timing alone does not
     decide), with consolidation immunotherapy after chemoradiation as the example
     (PACIFIC 5-year report).
   - slide 61, cross-fitting and honest forests, goes to section 7 (refs 6 and 7, on disk).
   - slide 62, split before imputing and keep treatment and outcome in the imputation
     model, goes to section 8 (Kapoor and Narayanan 2023, Sterne et al. 2009).
   - slide 52, what a simulation can and cannot show, goes to section 8 (Morris et al. 2019).
   - slide 57, the glossary, becomes a closed glossary near the references.

   Left out: the registry-analysis result slides (on the deck's confidential list), the
   cohort-specific confounding and target-trial slides (the primer already has its own
   versions), the method-landscape table (the estimator menu already covers it), and
   the LMTP software traps (code-level, and the page has no code). The plasmode idea is
   left out because its paper (Franklin et al. 2014, PMID 24587587) is closed access.
5. **Tests**: extend the primer suite (DAG section closed by default, anchors, refs,
   guarded terms, glossary terms used on the page), add the path-checker tests and a
   DAG-quiz suite, and add both to CI.
6. **Review and audit**: two independent auditors, one for content against the full
   texts and one for code, tests and accessibility. Then fix and re-run everything.
7. Commit locally. Pushing updates a public site, so it waits for Igor's OK.

## What was built

- `docs/index.html`: the optional section `#dag-more` (subsections 3a to 3h and a link to the
  self-test), Pearl's ladder in section 0, cross-fitting and honest trees in section 7, missing
  covariates and the limits of simulations in section 8, a glossary, and references 9, 15-32 and
  40-42 added. References are renumbered in first-citation order.
- `docs/dag_paths.mjs`: path logic and the checker's text. `docs/app.mjs` draws the diagram and
  shows that text. Only the verdict sits in the live region.
- `docs/dag-quiz/`: the 30-question causal-diagram self-test, run by `docs/quiz/quiz.js`, which now
  takes section labels from a bank that has them.
- Reference 1 now names the August 19, 2026 online revision of What If, which the DAG material
  was quoted from. Older quiz quotes still match the 2020 copy, so the checker accepts either file.

The page is built by `causal_roadmap_primer_tools/build_dag_section.py` (outside the repository),
which starts from commit 4833ff5, inserts the templates, checks that every claimed element cites
exactly the references its claims were verified against, renumbers, and strips the internal
claim ids before writing. The roadmap quiz source was renumbered once with the same map
(`refNumbering: 2026-11-03`).

## Review and audit (2026-11-03)

Two independent auditors, one on content against the full texts and one on code and tests.

- Content: no high-severity findings. All 30 keyed answers confirmed. No registry numbers or names
  from the talk leaked. Six medium and nine low wording findings were all applied. Examples:
  "one non-collider" closes a backdoor path; "can become" for the hospitalized-sample example; the
  PACIFIC inference marked as an inference, with a note that the total effect includes the
  consolidation practice of its era; the held-out imputation caveat restored from slide 62;
  "reduces" instead of "removes most" for double machine learning; glossary definitions of
  confounder and collider aligned with the text; "naive correction ... minimum change" wording for
  the immortal-time example (page and quiz item dags-10).
- Code: the path logic held on every adversarial diagram tried. Applied: checker text moved into
  a tested pure function, six previously undetected mutations now fail the suite, input validation
  (cycles, treatment equal to outcome, adjusting for either), corrected "minimal" comment with a
  test of minimal sets of different sizes, scroll to anchors opened from the quiz report, a
  shorter live region, the evidence checker's word-only fallback now keeps decimals, signs and
  comparison symbols and prints each such match for an eye check, README updated, workflow header
  corrected.
- Not changed: the stricter backdoor criterion (a harmless descendant of the treatment fails it)
  is kept, as on the page. Ten long-sentence review notes from the style checker were left as is,
  except three uses of "carry" reduced to none.

## Tests (2026-11-03)

Node suites: primer 76, numerics 20, roadmap quiz 21, path logic 36, DAG section and quiz 37, all
passing. Outside the repository: quote checks 77 (roadmap bank), 33 (DAG bank) and 197 (claims
behind the new page text), 0 problems, 4 matched on words only and confirmed by eye (line-break
hyphens in PDF text). Headless Chrome play-through of both quizzes, links and the primer: pass.
Each new check was broken on purpose once and turned red.

## Open

- Pushing updates the public site and waits for Igor's OK.
- `causal_roadmap_primer_tools/quiz_bank_draft.json` is an old draft, not the quiz source. The
  source is `docs/quiz/questions_source.json`.
