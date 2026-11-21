# Six patients, three learners

The [test roadmap](../docs/preview/index.html#estimators) offers an optional [estimator tutorial](../docs/preview/estimators/index.html) at Step 6. It is written for residents, postdocs and early-career researchers in radiation oncology or radiobiology who know regression. Susan’s clinical decision can be read from start to finish with the tutorial closed.

## What the reader does

| Reader action | What it should reveal |
| --- | --- |
| Start with the six observed patients. Select a patient, then reveal the arm means. | One binary outcome is known for each person. A predicted risk can be estimated even though that person’s other potential outcome remains unknown. |
| Switch between S and T, then remove the interaction in S. | One logistic regression with a schedule-by-frailty interaction reproduces the fitted risks from two separate regressions in this example. Sharing the frailty slope changes the model and can change the sign of a subgroup contrast. |
| Open X and trace a death in each schedule group. | The subtraction changes order across arms to keep short minus conventional as the direction. The second-stage fits smooth these noisy pseudo-outcomes. |
| Keep the fitted contrasts and change who counts in the average. | With these synthetic records, the mortality difference moves from −4.80 percentage points in all eligible patients to −1.27 points among short-schedule recipients. |
| Try the clinic missing an entire treatment arm for one frailty group. | The original population contrast lacks support. Naming a group for which both schedules were available changes the question. |

## Fit with the clinical story

Susan first checks what randomized evidence already answers for her patients. The roadmap’s outcome is average months alive through five years. The tutorial uses a simpler outcome, death by five years with complete ascertainment. Its estimates illustrate arithmetic and carry no clinical recommendation. A resident can return directly to Step 6 or to Susan’s Step 8 decision.

The interactive page and its [R Markdown notebook](../docs/preview/estimators/analysis.Rmd) are paired. When changing the example, update both and knit the notebook to run its numerical checks. The 5,000 fitting records determine the models and target populations. The six independent display rows are for the reader to follow through each operation.

## Reader review and next edition

- Ask a reader to explain what remains unknown for patient P04 after selecting X, and why changing the target population changes the answer without refitting the models.
- At Step 8, ask which patients Susan can study from the records, what a new trial could add, and what existing evidence would let her advise against one.
- Keep the continuous-dose example as a separate extension with linked R and Python notebooks and a package map. Review the clinical wording and navigation here before considering promotion of the test edition to the main site.
