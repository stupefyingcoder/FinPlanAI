import { useCallback, useEffect, useState } from "react"
import { Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react"

import api from "../../api/client"
import { usePlan, PROFILE_REQUIRED } from "../../api/hooks"
import { toAllocationList } from "../../api/assets"

const STREAMLIT_BASE = process.env.REACT_APP_STREAMLIT_URL || "http://localhost:8501"

/**
 * AI Insights.
 *
 * The plan summary at the top is rendered natively, so this tab is useful even
 * if the Streamlit planner is not running — and because those numbers come from
 * the API, the dashboard and the iframe cannot disagree about them.
 *
 * The iframe receives a short-lived signed token, never a user id. A raw id in
 * the URL would let anyone read another person's finances by editing the
 * address bar.
 */
export default function AIInsightsTab() {
  const { plan, loading, error, reload } = usePlan()
  const [embedUrl, setEmbedUrl] = useState(null)
  const [embedError, setEmbedError] = useState(null)

  const loadEmbed = useCallback(async () => {
    setEmbedError(null)
    try {
      const { token } = await api.post("/api/session/streamlit-token")
      // embed=true hides Streamlit's own menu and footer chrome.
      setEmbedUrl(`${STREAMLIT_BASE}/?embed=true&session=${encodeURIComponent(token)}`)
    } catch (err) {
      setEmbedError(err.message || "Could not start the planner session")
    }
  }, [])

  useEffect(() => {
    loadEmbed()
  }, [loadEmbed])

  const allocation = toAllocationList(plan?.allocation)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-blue-600" />
            AI Insights
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Your segment and allocation come from the trained models; the written plan is
            generated on top of them.
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          className="flex items-center gap-2 text-sm border border-gray-300 hover:border-blue-500 hover:text-blue-600 rounded-lg px-3 py-2"
        >
          <RefreshCw className="h-4 w-4" />
          Regenerate
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-3 py-16 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Building your plan…</span>
        </div>
      )}

      {error === PROFILE_REQUIRED && (
        <div className="max-w-md mx-auto text-center py-16 space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900">Finish your profile first</h2>
          <p className="text-sm text-gray-600">
            The planner needs your income, savings, risk appetite and goal before it can
            recommend anything.
          </p>
        </div>
      )}

      {error && error !== PROFILE_REQUIRED && (
        <div className="flex items-center justify-center gap-3 py-16 text-gray-600">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {plan && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border rounded-lg shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Your plan</h2>
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                {plan.generated_by === "gemini" ? "Written by Gemini" : "Generated locally"}
              </span>
            </div>

            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {plan.narrative}
            </p>

            {plan.note && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                {plan.note}
              </p>
            )}
          </div>

          <div className="bg-white border rounded-lg shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-medium text-gray-500">Investor segment</h2>
            <p className="text-lg font-semibold text-gray-900">{plan.segment.label}</p>

            <h2 className="text-sm font-medium text-gray-500 pt-2">Recommended allocation</h2>
            <ul className="space-y-2">
              {allocation.map((asset) => (
                <li key={asset.key} className="flex items-center gap-3 text-sm">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: asset.color }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 text-gray-700">{asset.name}</span>
                  <span className="tabular-nums font-medium text-gray-900">
                    {asset.percentage}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Ask the planner</h2>
          <button
            type="button"
            onClick={loadEmbed}
            className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2 py-1"
          >
            Reconnect
          </button>
        </div>

        {embedError ? (
          <div className="p-6 text-sm text-gray-600 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="font-medium text-gray-900">The planner is not reachable</p>
              <p className="mt-1">{embedError}</p>
              <p className="mt-2 text-gray-500">
                Start it with{" "}
                <code className="bg-gray-100 px-1 rounded">streamlit run streamlit_app.py</code> in
                the <code className="bg-gray-100 px-1 rounded">ml/</code> folder. Your plan above is
                unaffected.
              </p>
            </div>
          </div>
        ) : embedUrl ? (
          <iframe
            title="FinPlan AI planner"
            src={embedUrl}
            className="w-full"
            style={{ height: "640px", border: "none" }}
          />
        ) : (
          <div className="flex items-center justify-center gap-3 py-16 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Connecting to the planner…</span>
          </div>
        )}
      </div>
    </div>
  )
}
