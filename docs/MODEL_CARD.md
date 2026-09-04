# Model card — FinPlan AI

Three trained models back the product. Every number here was produced by the
scripts in `ml/training/` on the dataset in `ml/data/`, and is reproducible with
the commands shown. Where a figure differs from the project deck, this file is
correct and the deck is out of date.

Regenerate everything:

```bash
cd ml
.venv/Scripts/python -m training.train_clustering   # writes artifacts/customer_clustering*
.venv/Scripts/python -m training.train_portfolio    # writes artifacts/portfolio_model*
.venv/Scripts/python -m pytest tests -q             # asserts each model loads and behaves
```

---

## 1. Investor segmentation — K-Means

**Purpose.** Group investors with similar financial shapes so recommendations can
be described in human terms ("Mid NW · Retirement") rather than as a bare vector.
The assigned cluster is also an input feature to the allocation model.

| | |
|---|---|
| Algorithm | `StandardScaler` + `OneHotEncoder` → `KMeans(k=5)`, one scikit-learn pipeline |
| Features | `Current_Net_Worth`, `Savings_Rate(%)`, `Goal_Amount(₹)`, one-hot `Primary_Financial_Goal` |
| Training rows | 5,000 |
| **Silhouette** | **0.4199** |
| Artifact | `ml/artifacts/customer_clustering.joblib` + `customer_clustering_meta.json` |

**Choice of k.** k=5 is kept for consistency with the project deck, not because it
scores best. The full sweep is recorded in the metadata:

| k | 3 | 4 | **5** | 6 | 7 | 8 |
|---|---|---|---|---|---|---|
| Silhouette | 0.328 | 0.325 | **0.420** | 0.427 | 0.460 | 0.458 |

k=7 scores highest. k=5 is a deliberate, stated trade-off for interpretability and
continuity with the presentation — not an accident.

**Segments found.**

| Cluster | Label | n |
|---|---|---|
| 3 | Mid NW · Retirement | 1,725 |
| 0 | Mid NW · House | 1,387 |
| 2 | Low NW · Education | 973 |
| 1 | High NW · Wealth (large goals) | 522 |
| 4 | High NW · Wealth (modest goals) | 393 |

Labels are derived from each cluster's own centroid statistics rather than written
by hand, so they cannot drift out of sync with a refit. When two clusters would
otherwise share a name they are disambiguated by median goal size.

**Known limitations.** Four features is a narrow basis — age, income and dependants
are deliberately excluded, so two people of very different ages with similar net
worth and the same goal land together. The silhouette of 0.42 indicates
moderately separated, overlapping clusters, which is normal for behavioural
financial data and should not be read as crisp segmentation.

> The deck and earlier metadata claim **0.63**. That figure is not reproducible
> from the documented feature set and has been corrected here.

---

## 2. Portfolio allocation — softmax neural network

**Purpose.** Recommend how to split a portfolio across five asset classes given a
customer profile.

| | |
|---|---|
| Architecture | MLP `37 → 64 → 32 → 5`, ReLU, dropout 0.15, softmax head |
| Loss | Cross-entropy against soft targets (allocations are proportions, not labels) |
| Optimiser | AdamW, lr 2e-3, weight decay 1e-4, cosine schedule, early stopping |
| Split | 70 / 15 / 15, seed 42, scaler fitted on the training split only |
| Outputs | `RealEstate`, `Equity`, `Debt`, `Cash`, `Gold` — always sum to 1.0 |
| Artifact | `ml/artifacts/portfolio_model.pt` (`state_dict`) for training, `portfolio_model.npz` for serving, + `portfolio_model_meta.json` |
| Serving | Pure NumPy. The network is 4,677 parameters; PyTorch is a 536 MB dependency to evaluate three matrix multiplies, and its absence is what makes free-tier hosting possible. A test asserts the two paths agree to 1e-5. |

**Held-out performance.** Errors are in percentage points of allocation.

| | Model | Baseline (predict training mean) |
|---|---|---|
| **Overall MAE** | **2.77 pp** | 6.15 pp |
| Improvement | **54.9%** | — |

| Asset class | MAE |
|---|---|
| Equity | 3.71 pp |
| Debt | 3.19 pp |
| Real estate | 3.08 pp |
| Cash | 2.35 pp |
| Gold | 1.51 pp |

The baseline matters more than the absolute error: giving every customer the
average portfolio is the obvious thing a product could do without any model, and
beating it by 55% is what shows the network learned something profile-specific.

**Behavioural check.** Holding one profile fixed and varying only risk appetite:

| Risk | Equity | Debt | Cash |
|---|---|---|---|
| Low | 15.8% | 40.2% | 18.2% |
| Medium | 33.0% | 25.0% | 13.6% |
| High | 56.4% | 12.8% | 7.8% |

This is asserted by a test — a model that ignored its inputs would still pass
every "allocation sums to 1" check.

**On the target.** The inherited artifacts disagreed with each other.
`classes.json` listed Bonds / Crypto / Mutual Funds / SIPs / Stocks, which are the
values of the dataset's `Current_Investment_Type` column — meaning the original
model classified which product a customer *already held* and presented the class
probabilities as a recommendation. The dataset also carries five genuine
allocation columns summing to 100% per row, and those are what this model is
trained on. It is an allocation model, and it matches what the deck describes.

**Known limitations.** Trained entirely on synthetic data, so it reproduces the
generator's assumptions, not market reality. It is not investment advice, and the
UI says so.

---

## 3. Gold price forecast — Prophet

**Purpose.** Project gold in INR per 10g over five years, with an uncertainty band.

| | |
|---|---|
| Model | Prophet with external regressors, multiplicative seasonality |
| Regressors | USD gold price, USD/INR, Indian CPI inflation — each forecast first, then fed in |
| Output | 237 monthly points to September 2030, with `yhat_lower` / `yhat_upper` |
| Artifact | `ml/artifacts/model_output_forecast.json`, notebook at `ml/artifacts/Gold_Prophet.ipynb` |

The committed forecast is served directly rather than re-running Prophet per
request: the projection does not vary by user, and keeping Prophet off the API's
critical path avoids a heavy, awkward-to-install dependency in the runtime image.
`prophet` is therefore commented out of `ml/requirements.txt` and is needed only to
regenerate the forecast.

**Known limitations.** A driver-based extrapolation, not a market prediction. The
uncertainty band widens with horizon and should be read as the honest part of the
output.

---

## Data

All 5,000 records are **synthetic**. The sourced dataset held 40 rows — too few to
train on. Distributions and ratios were derived from the RBI Household Financial
Survey, the SEBI Investor Survey, World Gold Council reports and the NSE
Investment Behaviour Study, with 5% noise and logical relationships preserved
(higher income implies higher savings, and so on).

The customer documents in `ml/data/` are synthetic personas, not real people.

> The deck says "about 6,000 records". The file contains **5,000**.

## Reproducibility notes

Two inherited checkpoints could not be loaded at all, which is why both models
were retrained here:

- `full_portfolio_model.pth` was written with `torch.save(model)`, pickling a
  reference to a class `RobustPortfolioNN` that was never committed —
  `torch.load` raises `AttributeError`.
- `customer_clustering_k5.pkl` was pickled under scikit-learn 1.6.1 and raises
  `AttributeError: Can't get attribute '_RemainderColsList'` on 1.9.

Both are kept in `ml/artifacts/` for provenance and are not loaded by the
application. The replacements are saved as a `state_dict` and a joblib pipeline,
with the architecture and the training script in version control.
