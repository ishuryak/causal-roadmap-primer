CAUSAL ROADMAP: TEST EDITION
URL: https://ishuryak.github.io/causal-roadmap-primer/preview/
Current illustrated edition: ../v2/

This separate test edition responds to Alex Steele's November 14 and 16 reviews.
It does not replace the root page or v2, and is marked noindex for search engines.

Edit index.html, preview.css, story.mjs, bleile.mjs, spotlight.mjs,
spotlight-model.mjs and practice-ui.mjs directly. The main primer has no build
step. The embedded Glasshouses game has editable src/ files and a reproducible
bundle; see glasshouses/README.txt. app.mjs adapts the v2 controller with imports
pointing to v2, descriptive lesson references, and a separate worksheet key. Calculations,
rubric, star geometry and synthetic data reuse unchanged v2 files. The original
artwork is retained in optional reading. Four separate sketches in
assets/illustrations/ support the main route; see assets/README.txt.
Keep that dependency in mind if v2 assets are ever moved. Quiz links explicitly
open the existing self-tests in v2. Artwork attribution remains in the footer.

Step 6 links to estimators/index.html, a self-contained six-patient worksheet.
Its analysis.Rmd reproduces the training counts, learner fits and target averages.
Its math panel follows the selected patient. The complete journal article in
estimators/kunzel-2019.pdf opens at the learner equations on PDF page 3.
For the teaching sequence, reader checkpoints and proposed dose extension, see
development/2026_11_21_estimator_tutorial.md at the repository root.

Changes to review:
- A short opening and one eight-step index, aligned with Navigator.
- A clear purpose: plan a credible treatment comparison before fitting models,
  then interpret the answer in light of the study's assumptions and limits.
- A concrete Susan example and one optional detail panel per step.
- Four separate sketches in the main flow: the unseen causal comparison in
  the opening, context and missingness before step 2, the DAG within step 2,
  and the conditional Inference Engine in step 4. Full-size links allow zooming.
  Earlier opening, cohort and hidden-thread artwork stays in optional reading.
- Target-trial planning and the causal estimand within the first step.
- A brief explanation of how target-trial planning and the broader roadmap
  connect, grounded in Dang and Balzer (reference 50).
- Dedicated observed-data and statistical-target steps.
- Collapsed worksheet and practice area after Susan's actual conclusion.
- Local practice controls with a compact live interpretation, retaining profiles
  and assessment records. The longer interpretation opens on demand.
- Corrected Dang/Balzer bibliographic metadata (DOI ...1637, pp.619-623).
- Cause, context and confounding lead the prediction and uncertainty discussion.
- A general explanation before each visually marked Susan example, with real
  step headings and smaller guiding questions.
- DAG purpose, construction from subject-matter knowledge, a sketch showing
  confounding and outcome-dependent recording (Y to R), and optional math
  distinguishing a fully observed example from the missing-outcome problem.
- A static trial/records comparison replaces the low-value text toggle.
- The actual Glasshouses spotlight game adapted to Susan's 60-to-50 profile.
  Discovery leaves scores unchanged; named repairs update the star, editor,
  share state and recorded assessment. Manual edits close the running game.
- Measurement and applicability controls link to their relevant explanations.

Independent source review used Claude Fable 5.2 with both transcripts, the plan,
and the implementation. Transcripts, review inputs and full reports stay private.
Scientific mapping and wording remain open for Igor's review; this is a test
edition, not a claim of Alex's endorsement. Ask Alex whether the opening makes
Susan's causal purpose clear, the short steps suffice, and the practice controls
show the effect of a change without losing the explanation.

Preview-owned assets have a version query to prevent stale browser modules.
practice-ui.mjs is the single entry point importing bleile.mjs, so the checkpoint
controller initializes only once. Keep preview-owned import version strings
consistent after module changes. CSS has its own version query.

From the repository root:
  node tests/test_preview.mjs
  node tests/test_bleile_v2.mjs
  node tests/test_spotlight.mjs
  python tools/serve_preview.py
Then open http://127.0.0.1:8000/preview/ .
The helper serves .mjs with a JavaScript MIME type on Windows as well as Unix.
Also run the existing root README test commands before publishing changes.
The preview workflow also rebuilds the Glasshouses bundle and checks that it
matches its source. Original-game invariants and Susan-specific integration
tests are both retained. The original three-house public game is unchanged.
