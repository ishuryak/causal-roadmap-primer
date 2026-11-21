# Different learners, the same estimate?

The [test roadmap](../docs/preview/index.html#estimators) offers an optional [estimator tutorial](../docs/preview/estimators/index.html) at Step 6 for residents, postdocs and early-career researchers in radiation oncology or radiobiology who know regression. A hand-drawn map introduces the methods. Readers can trace one of six example patients in the [S-, T- and X-learner worksheet](../docs/preview/estimators/worksheet.html), compare [TMLE and DML across the full cohort](../docs/preview/estimators/cousins.html), look up [estimator vocabulary](../docs/preview/estimators/guide.html#vocabulary), or read the [original meta-learner paper](../docs/preview/estimators/paper.html).

## What the reader does

| Reader action | What it should reveal |
| --- | --- |
| Start with the six observed patients. Select a patient, then reveal the arm means. | One binary outcome is known for each person. A predicted risk can be estimated even though that person’s other potential outcome remains unknown. |
| Switch between S and T, then remove the interaction in S. | One logistic regression with a schedule-by-frailty interaction reproduces the fitted risks from two separate regressions in this example. Sharing the frailty slope changes the model and can change the sign of a subgroup contrast. |
| Open X and trace a death in each schedule group. | The subtraction changes order across arms to keep short minus conventional as the direction. The second-stage fits smooth these noisy pseudo-outcomes. |
| Keep the fitted contrasts and change who counts in the average. | With these synthetic records, the mortality difference moves from −4.80 percentage points in all eligible patients to −1.27 points among short-schedule recipients. |
| Compare how [TMLE and DML](../docs/preview/estimators/cousins.html) use the 5,000 eligible records. | TMLE updates its predicted risks, then compares the cohort averages under each schedule. DML averages contrasts corrected with weighted prediction errors on held-out records. Both estimate −4.80 percentage points in this example. |
| Partial out frailty from treatment and outcome. | The FWL residual slope is −4.34 points. It gives more weight to frailty groups where both schedules were commonly used. |
| Try the clinic missing an entire treatment arm for one frailty group. | The original population contrast lacks support. Naming a group for which both schedules were available changes the question. |

## Fit with the clinical story

Susan first checks what randomized evidence already answers for her patients. The roadmap’s outcome is average months alive through five years. The tutorial uses a simpler outcome, death by five years with complete ascertainment. Its estimates illustrate arithmetic and carry no clinical recommendation. A resident can return directly to Step 6 or to Susan’s Step 8 decision.

The [R Markdown notebook](../docs/preview/estimators/analysis.Rmd) reproduces the models fitted in the 5,000-record cohort and the averages for each target population. The six additional records illustrate how S, T and X use each patient’s observed data. The TMLE and DML examples use the full cohort. When changing the example, update the notebook and knit it to run its numerical checks.

The [original six-row drawings](../docs/preview/estimators/guide.html#original-sketch) are embedded illustrations from slides 56 and 60 of Andy Wilson’s ECA deck. Indigo labels, green observed values, red question marks and blue estimates follow those drawings. The live clinical example uses binary outcomes. Its missing potential outcome stays marked even after estimating the risk.

The worksheet’s optional math panel connects each patient trace to the paper. Printed page 4158, the third PDF page, contains equations 3–9. The [complete article](../docs/preview/estimators/kunzel-2019.pdf) is the ten-page published PDF from [PubMed Central](https://pmc.ncbi.nlm.nih.gov/articles/PMC6410831/). The authors license it under [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/). Keep it intact. The public test edition lives at [the repository’s GitHub Pages tutorial route](https://ishuryak.github.io/causal-roadmap-primer/preview/estimators/).

## Reader review and next edition

- Ask a reader to explain what remains unknown for patient P04 after selecting X, and why changing the target population changes the answer without refitting the models.
- At Step 8, ask which patients Susan can study from the records, what a new trial could add, and what existing evidence would let her advise against one.
- Keep the continuous-dose example as a separate extension with linked R and Python notebooks and a package map. Review the clinical wording and navigation here before considering promotion of the test edition to the main site.
