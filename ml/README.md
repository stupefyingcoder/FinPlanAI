# FinPlan ML

Trained models and the planning agents, importable as `finplan_ml`.

The FastAPI backend imports this package directly — segmentation, allocation,
forecasting and the conversational planner are all served from `/api/ml/*` and
`/api/ai/*` rather than from a separate app.

See `../docs/MODEL_CARD.md` for how each model was built and what it scores,
and `training/` for the scripts that produce the artifacts.
