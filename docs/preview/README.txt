CAUSAL ROADMAP: TEST EDITION
URL: https://ishuryak.github.io/causal-roadmap-primer/preview/
Current illustrated edition: ../v2/

This separate test edition responds to Alex Steele's November 14 review.
It does not replace the root page or v2, and is marked noindex for search engines.

Edit index.html, preview.css, story.mjs, bleile.mjs and practice-ui.mjs directly.
There is no generation/build step. app.mjs adapts the v2 controller with imports
pointing to v2, descriptive lesson references, and a separate worksheet key. Calculations,
rubric, star geometry, synthetic data and artwork reuse unchanged v2 files.
Keep that dependency in mind if v2 assets are ever moved. Quiz links explicitly
open the existing self-tests in v2. Artwork attribution remains in the footer.

Changes to review:
- A short opening and one eight-step index, aligned with Navigator.
- A concrete Susan example and one optional detail panel per step.
- Target-trial planning and the causal estimand within the first step.
- Dedicated observed-data and statistical-target steps.
- Collapsed worksheet and practice area after Susan's actual conclusion.
- Local practice controls with a compact live interpretation, retaining profiles
  and assessment records. The longer interpretation opens on demand.
- Corrected Dang/Balzer bibliographic metadata (DOI ...1637, pp.619-623).

Independent source review used Claude Fable 5.2 with both transcripts, the plan,
and the implementation. Transcripts, review inputs and full reports stay private.
Scientific mapping and wording remain open for Igor's review; this is a test
edition, not a claim of Alex's endorsement. Ask Alex whether the opening makes
Susan's causal purpose clear, the short steps suffice, and the practice controls
show the effect of a change without losing the explanation.

Preview-owned assets have a version query to prevent stale browser modules.
When updating it, keep index.html's bleile.mjs URL and practice-ui.mjs's import
identical so the checkpoint controller initializes only once.

From the repository root:
  node tests/test_preview.mjs
  node tests/test_bleile_v2.mjs
  python tools/serve_preview.py
Then open http://127.0.0.1:8000/preview/ .
The helper serves .mjs with a JavaScript MIME type on Windows as well as Unix.
Also run the existing root README test commands before publishing changes.
