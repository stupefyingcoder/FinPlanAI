/**
 * Presentation for the five asset classes the model allocates across.
 *
 * The model's class names (RealEstate, Equity, Debt, Cash, Gold) are the
 * dataset's column names. This maps them to labels a person reads and a stable
 * colour, so the pie chart and the list cannot disagree about either.
 */

export const ASSET_DISPLAY = {
  Equity: { label: "Equity", color: "#1E3A8A" },
  Debt: { label: "Debt", color: "#2E865F" },
  RealEstate: { label: "Real Estate", color: "#8D6E63" },
  Gold: { label: "Gold", color: "#D4AF37" },
  Cash: { label: "Cash", color: "#374151" },
};

const FALLBACK_COLOR = "#9CA3AF";

/**
 * Turn { Equity: 0.56, ... } into the [{ name, percentage, color }] shape the
 * chart components already expect. Percentages are rounded for display but the
 * largest slice absorbs the rounding error, so they always total exactly 100.
 */
export function toAllocationList(allocation) {
  if (!allocation) return [];

  const entries = Object.entries(allocation)
    .map(([key, weight]) => ({
      key,
      name: ASSET_DISPLAY[key]?.label ?? key,
      color: ASSET_DISPLAY[key]?.color ?? FALLBACK_COLOR,
      exact: weight * 100,
      percentage: Math.round(weight * 1000) / 10,
    }))
    .sort((a, b) => b.exact - a.exact);

  if (entries.length === 0) return entries;

  const total = entries.reduce((sum, e) => sum + e.percentage, 0);
  const drift = Math.round((100 - total) * 10) / 10;
  if (drift !== 0) {
    entries[0].percentage = Math.round((entries[0].percentage + drift) * 10) / 10;
  }

  return entries;
}
