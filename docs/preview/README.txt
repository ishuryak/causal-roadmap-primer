CAUSAL ROADMAP: TEST EDITION
URL: https://ishuryak.github.io/causal-roadmap-primer/preview/
Current illustrated edition: ../v2/

This separate test edition responds to Alex Steele's November 14 review.
It does not replace the root page or v2, and is marked noindex for search engines.

Edit index.html, preview.css, story.mjs, bleile.mjs and practice-ui.mjs directly.
There is no generation/build step. app.mjs is the v2 controller with imports
pointing to v2 and a separate preview worksheet storage key. Calculations,
rubric, star geometry, synthetic data and artwork reuse unchanged v2 files.
Keep that dependency in mind if v2 assets are ever moved. Quiz links explicitly
open the existing self-tests in v2. Artwork attribution remains in the footer.

Changes to review:
- A clear opening and one eight-step teaching route, aligned with Navigator.
- Target-trial planning and the causal estimand within the first step.
- Dedicated observed-data and statistical-target steps.
- Optional game and advanced extensions after the core walkthrough.
- Local game controls beside the result, retaining profiles and assessment records.
- Corrected Dang/Balzer bibliographic metadata (DOI ...1637, pp.619-623).

Review questions are on the page. Scientific mapping and wording remain open
for Igor's review; this is a test edition, not a claim of Alex's endorsement.

From the repository root:
  node tests/test_preview.mjs
  node tests/test_bleile_v2.mjs
  python tools/serve_preview.py
Then open http://127.0.0.1:8000/preview/ .
The helper serves .mjs with a JavaScript MIME type on Windows as well as Unix.
Also run the existing root README test commands before publishing changes.
