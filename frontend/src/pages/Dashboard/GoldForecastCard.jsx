import React, { useMemo, useRef, useState } from "react"
import { TrendingUp, Loader2, AlertCircle, Table2 } from "lucide-react"

import { useGoldForecast } from "../../api/hooks"

/**
 * Prophet gold-price forecast with its uncertainty band.
 *
 * One series, so no legend box — the title names it. The band is the same hue at
 * low opacity rather than a second colour, because it is the same quantity's
 * uncertainty, not a second series. A table view is available for anyone who
 * cannot read the chart.
 */

const SERIES = "#B45309" // validated: L in band, chroma >= 0.1, 5.02:1 on white
const BAND = "rgba(180, 83, 9, 0.16)"
const GRID = "#E5E7EB"

const VIEW_W = 720
const VIEW_H = 260
const PAD = { top: 16, right: 16, bottom: 28, left: 56 }

const inr = (n) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n))

const monthLabel = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" })

export default function GoldForecastCard({ limit = 60 }) {
  const { points, loading, error } = useGoldForecast(limit)
  const [hover, setHover] = useState(null)
  const [showTable, setShowTable] = useState(false)
  const svgRef = useRef(null)

  const geom = useMemo(() => {
    if (!points.length) return null

    const lows = points.map((p) => p.yhat_lower ?? p.yhat)
    const highs = points.map((p) => p.yhat_upper ?? p.yhat)
    const min = Math.min(...lows)
    const max = Math.max(...highs)
    const span = max - min || 1

    const plotW = VIEW_W - PAD.left - PAD.right
    const plotH = VIEW_H - PAD.top - PAD.bottom

    const x = (i) => PAD.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW)
    const y = (v) => PAD.top + plotH - ((v - min) / span) * plotH

    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.yhat)}`).join(" ")
    const band = [
      ...points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.yhat_upper ?? p.yhat)}`),
      ...points
        .slice()
        .reverse()
        .map((p, i) => {
          const idx = points.length - 1 - i
          return `L${x(idx)},${y(p.yhat_lower ?? p.yhat)}`
        }),
      "Z",
    ].join(" ")

    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      value: min + span * (1 - t),
      yPos: PAD.top + plotH * t,
    }))

    return { x, y, line, band, min, max, ticks, plotW, plotH }
  }, [points])

  const handleMove = (event) => {
    if (!geom || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const ratio = (event.clientX - rect.left) / rect.width
    const svgX = ratio * VIEW_W
    const step = geom.plotW / Math.max(1, points.length - 1)
    const index = Math.round((svgX - PAD.left) / step)
    setHover(index >= 0 && index < points.length ? index : null)
  }

  const last = points[points.length - 1]
  const first = points[0]
  const active = hover != null ? points[hover] : null

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center text-amber-900">
            <TrendingUp className="w-5 h-5 mr-2" />
            Gold price forecast
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Prophet model, ₹ per 10g. The shaded band is the 80% uncertainty interval.
          </p>
        </div>
        {points.length > 0 && (
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2 py-1 flex items-center gap-1 shrink-0"
          >
            <Table2 className="w-3.5 h-3.5" />
            {showTable ? "Chart" : "Table"}
          </button>
        )}
      </div>

      <div className="p-6">
        {loading && (
          <div className="flex items-center justify-center gap-3 py-16 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading forecast…</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center gap-3 py-16 text-gray-600 justify-center">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && geom && !showTable && (
          <>
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-3xl font-semibold text-gray-900">₹{inr(last.yhat)}</span>
              <span className="text-sm text-gray-500">
                projected for {monthLabel(last.date)}
              </span>
            </div>

            <svg
              ref={svgRef}
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              className="w-full h-auto"
              role="img"
              aria-label={`Gold price forecast from ${monthLabel(first.date)} to ${monthLabel(last.date)}`}
              onMouseMove={handleMove}
              onMouseLeave={() => setHover(null)}
            >
              {geom.ticks.map((tick, i) => (
                <g key={i}>
                  <line
                    x1={PAD.left}
                    x2={VIEW_W - PAD.right}
                    y1={tick.yPos}
                    y2={tick.yPos}
                    stroke={GRID}
                    strokeWidth="1"
                  />
                  <text x={PAD.left - 8} y={tick.yPos + 4} textAnchor="end" fontSize="11" fill="#9CA3AF">
                    {inr(tick.value)}
                  </text>
                </g>
              ))}

              <path d={geom.band} fill={BAND} />
              <path d={geom.line} fill="none" stroke={SERIES} strokeWidth="2" strokeLinejoin="round" />

              <circle cx={geom.x(points.length - 1)} cy={geom.y(last.yhat)} r="4" fill={SERIES} />

              <text x={PAD.left} y={VIEW_H - 8} fontSize="11" fill="#9CA3AF">
                {monthLabel(first.date)}
              </text>
              <text x={VIEW_W - PAD.right} y={VIEW_H - 8} fontSize="11" fill="#9CA3AF" textAnchor="end">
                {monthLabel(last.date)}
              </text>

              {active && (
                <g>
                  <line
                    x1={geom.x(hover)}
                    x2={geom.x(hover)}
                    y1={PAD.top}
                    y2={VIEW_H - PAD.bottom}
                    stroke="#9CA3AF"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={geom.x(hover)}
                    cy={geom.y(active.yhat)}
                    r="5"
                    fill={SERIES}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                </g>
              )}
            </svg>

            <div className="mt-3 min-h-[2.5rem] text-sm">
              {active ? (
                <span className="text-gray-700">
                  <span className="font-medium">{monthLabel(active.date)}</span>
                  {" — ₹"}
                  {inr(active.yhat)}
                  <span className="text-gray-500">
                    {" "}
                    (range ₹{inr(active.yhat_lower)}–₹{inr(active.yhat_upper)})
                  </span>
                </span>
              ) : (
                <span className="text-gray-400">Hover the chart for a month-by-month figure.</span>
              )}
            </div>
          </>
        )}

        {!loading && !error && showTable && (
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="py-2 pr-4 font-medium">Month</th>
                  <th className="py-2 pr-4 font-medium">Forecast</th>
                  <th className="py-2 pr-4 font-medium">Low</th>
                  <th className="py-2 font-medium">High</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p.date} className="border-b border-gray-100">
                    <td className="py-1.5 pr-4 text-gray-700">{monthLabel(p.date)}</td>
                    <td className="py-1.5 pr-4 tabular-nums">₹{inr(p.yhat)}</td>
                    <td className="py-1.5 pr-4 tabular-nums text-gray-500">₹{inr(p.yhat_lower)}</td>
                    <td className="py-1.5 tabular-nums text-gray-500">₹{inr(p.yhat_upper)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
