import { useEffect, useRef, useState } from "react"
import { Sparkles, Loader2, AlertCircle, RefreshCw, Send, FileText, Info } from "lucide-react"

import api from "../../api/client"
import { usePlan, PROFILE_REQUIRED } from "../../api/hooks"
import { toAllocationList } from "../../api/assets"

/**
 * AI Insights.
 *
 * The plan and the chat both run against the API, which routes them through the
 * retrieval index and the planning agents. This replaced an embedded Streamlit
 * page: a second service with its own deploy, its own cold start and a look that
 * never matched the dashboard.
 *
 * The segment and allocation shown here are the same numbers the Results tab
 * renders, because both come from the same endpoints — the two views cannot
 * disagree.
 */

const SUGGESTIONS = [
  "Am I saving enough for my goal?",
  "Why is my allocation weighted this way?",
  "How much emergency fund should I hold?",
  "What should I change if my income drops?",
]

export default function AIInsightsTab() {
  const { plan, loading, error, reload } = usePlan()

  const [status, setStatus] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    api
      .get("/api/ai/status")
      .then(setStatus)
      .catch(() => setStatus({ available: false, detail: "unreachable" }))
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [messages, sending])

  const send = async (text) => {
    const question = (text ?? input).trim()
    if (!question || sending) return

    setMessages((prev) => [...prev, { role: "user", text: question }])
    setInput("")
    setSending(true)

    try {
      const reply = await api.post("/api/ai/chat", { message: question })
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: reply.answer,
          sources: reply.sources || [],
          agents: reply.agents_used || [],
          generatedBy: reply.generated_by,
          note: reply.note,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: err.message || "Something went wrong.", isError: true },
      ])
    } finally {
      setSending(false)
    }
  }

  const allocation = toAllocationList(plan?.allocation)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-blue-600" />
            AI Insights
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Your segment and allocation come from the trained models. The plan and the answers
            below are written by the planning agents, grounded in the document index.
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          className="flex items-center gap-2 text-sm border border-gray-300 hover:border-blue-500 hover:text-blue-600 rounded-lg px-3 py-2 shrink-0"
        >
          <RefreshCw className="h-4 w-4" />
          Regenerate
        </button>
      </div>

      {status && !status.available && (
        <div className="flex items-start gap-3 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
          <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-amber-900">
            The conversational planner needs a Gemini API key ({status.detail}). Your segment,
            allocation and forecast are produced locally and are unaffected — answers below fall
            back to a summary built from your profile.
          </p>
        </div>
      )}

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
                {plan.generated_by === "gemini" ? "Written by the agents" : "Generated locally"}
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
            <div>
              <h2 className="text-sm font-medium text-gray-500">Investor segment</h2>
              <p className="text-lg font-semibold text-gray-900 mt-1">{plan.segment.label}</p>
            </div>

            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-2">Recommended allocation</h2>
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
        </div>
      )}

      {/* Conversation */}
      <div className="bg-white border rounded-lg shadow-sm flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Ask about your plan</h2>
          {status?.documents_indexed > 0 && (
            <span className="text-xs text-gray-500 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              {status.documents_indexed} documents indexed
            </span>
          )}
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[420px] overflow-y-auto">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Ask anything about your own numbers — the planner sees your profile.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="text-xs border border-gray-300 hover:border-blue-500 hover:text-blue-600 rounded-full px-3 py-1.5"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${
                  m.role === "user"
                    ? "bg-blue-600 text-white"
                    : m.isError
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-gray-50 text-gray-800 border border-gray-200"
                }`}
              >
                <p className="whitespace-pre-line leading-relaxed">{m.text}</p>

                {m.role === "assistant" && m.sources?.length > 0 && (
                  <details className="mt-3 text-xs text-gray-600">
                    <summary className="cursor-pointer hover:text-gray-900">
                      {m.sources.length} source{m.sources.length === 1 ? "" : "s"} retrieved
                    </summary>
                    <ul className="mt-2 space-y-1.5 pl-3 border-l-2 border-gray-200">
                      {m.sources.map((src, j) => (
                        <li key={j} className="text-gray-600">
                          {String(src).slice(0, 240)}
                          {String(src).length > 240 ? "…" : ""}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {m.role === "assistant" && m.note && (
                  <p className="mt-2 text-xs text-amber-700">{m.note}</p>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Thinking…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
          className="border-t border-gray-200 px-6 py-4 flex items-center gap-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your savings, allocation or goal…"
            aria-label="Ask the planner a question"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Ask
          </button>
        </form>
      </div>
    </div>
  )
}
