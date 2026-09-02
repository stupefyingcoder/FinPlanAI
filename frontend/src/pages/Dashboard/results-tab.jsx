import React, { useMemo, useState, useRef } from "react"
import { TrendingUp, PieChart, Star, Building, Coins, Target, AlertCircle, Loader2 } from "lucide-react"
import { useAllocation, useSegment, PROFILE_REQUIRED } from "../../api/hooks"
import { toAllocationList } from "../../api/assets"

const ResultsTab = ({ userData }) => {
  // Recommended plans (unchanged)
  const getRecommendedPlans = () => {
    const riskLevel = userData?.risk_comfort_level || "moderate"
    if (riskLevel === "high") {
      return [
        { name: "Aggressive Growth Plan", description: "High-risk, high-reward investment strategy", expectedReturn: "12-15%", riskLevel: "High", color: "#2563eb" },
        { name: "Equity Focus Plan", description: "Stock-heavy portfolio with growth potential", expectedReturn: "10-12%", riskLevel: "High", color: "#16a34a" },
        { name: "Balanced Growth Plan", description: "Mixed portfolio with moderate risk", expectedReturn: "8-10%", riskLevel: "Moderate", color: "#f59e0b" },
      ]
    } else if (riskLevel === "low") {
      return [
        { name: "Conservative Plan", description: "Low-risk, stable returns strategy", expectedReturn: "5-7%", riskLevel: "Low", color: "#4f46e5" },
        { name: "Fixed Income Plan", description: "Bond and FD focused portfolio", expectedReturn: "6-8%", riskLevel: "Low", color: "#7c3aed" },
        { name: "Hybrid Plan", description: "Mix of safe and moderate investments", expectedReturn: "7-9%", riskLevel: "Moderate", color: "#6b7280" },
      ]
    } else {
      return [
        { name: "Balanced Plan", description: "Optimal mix of risk and returns", expectedReturn: "8-10%", riskLevel: "Moderate", color: "#2563eb" },
        { name: "Growth Plan", description: "Focus on long-term wealth creation", expectedReturn: "9-11%", riskLevel: "Moderate", color: "#16a34a" },
        { name: "Stable Plan", description: "Conservative approach with steady growth", expectedReturn: "6-8%", riskLevel: "Low", color: "#4f46e5" },
      ]
    }
  }

  // Allocation comes from the trained softmax network via /api/ml/allocation.
  // This was a hardcoded array that showed every user the same portfolio.
  const { allocation, loading: allocationLoading, error: allocationError } = useAllocation()
  const { segment } = useSegment()

  const assetAllocation = useMemo(() => toAllocationList(allocation), [allocation])

  const recommendations = {
    stocks: ["Apple Inc. (AAPL)", "Microsoft Corp. (MSFT)", "Amazon.com Inc. (AMZN)"],
    schemes: ["PPF (Public Provident Fund)", "ELSS Mutual Funds", "NSC (National Savings Certificate)"],
    sip: ["SBI Bluechip Fund", "HDFC Top 100 Fund", "ICICI Prudential Value Discovery Fund"],
    gold: ["Gold ETF", "Digital Gold", "Gold Mutual Funds"],
  }

  // total of source percentages (may not be 100)
  const totalPercent = useMemo(() => assetAllocation.reduce((s, a) => s + (a.percentage || 0), 0), [assetAllocation])

  // Build pie slice paths from assetAllocation normalized by totalPercent so list and pie match visually.
  const slices = useMemo(() => {
    const cx = 100
    const cy = 100
    const r = 80
    let currentAngle = 0

    return assetAllocation.map((asset) => {
      const fraction = (asset.percentage || 0) / (totalPercent || 1) // normalize
      const sliceAngle = fraction * 360
      const startAngle = currentAngle
      const endAngle = currentAngle + sliceAngle
      const startRad = (Math.PI / 180) * startAngle
      const endRad = (Math.PI / 180) * endAngle

      const x1 = cx + r * Math.cos(startRad)
      const y1 = cy + r * Math.sin(startRad)
      const x2 = cx + r * Math.cos(endRad)
      const y2 = cy + r * Math.sin(endRad)

      const largeArc = sliceAngle > 180 ? 1 : 0
      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`

      const midAngle = startAngle + sliceAngle / 2
      const midRad = (Math.PI / 180) * midAngle
      const labelX = cx + (r - 30) * Math.cos(midRad)
      const labelY = cy + (r - 30) * Math.sin(midRad)

      currentAngle = endAngle
      return {
        ...asset,
        d,
        midAngle,
        labelX,
        labelY,
        computedPercent: fraction * 100,
      }
    })
  }, [assetAllocation, totalPercent])

  // Hover states + tooltip position
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

  // Tooltip handler - compute position relative to container
  const handleSliceMouseMove = (e, index) => {
    const rect = containerRef.current?.getBoundingClientRect()
    const clientX = e.clientX
    const clientY = e.clientY
    if (rect) {
      setTooltipPos({ x: clientX - rect.left + 12, y: clientY - rect.top + 12 })
    } else {
      setTooltipPos({ x: clientX + 12, y: clientY + 12 })
    }
    setHoveredIndex(index)
  }

  const handleSliceLeave = () => {
    setHoveredIndex(null)
  }

  if (allocationLoading) {
    return (
      <div className="flex items-center justify-center gap-3 py-24 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Calculating your recommended portfolio…</span>
      </div>
    )
  }

  if (allocationError === PROFILE_REQUIRED) {
    return (
      <div className="max-w-md mx-auto text-center py-24 space-y-3">
        <AlertCircle className="w-8 h-8 mx-auto text-amber-500" />
        <h2 className="text-lg font-semibold text-gray-900">Finish your profile first</h2>
        <p className="text-sm text-gray-600">
          Your recommendation is built from your income, savings, risk appetite and goal.
          Complete the profile step and this page fills in.
        </p>
      </div>
    )
  }

  if (allocationError) {
    return (
      <div className="max-w-md mx-auto text-center py-24 space-y-3">
        <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
        <h2 className="text-lg font-semibold text-gray-900">Could not load your recommendation</h2>
        <p className="text-sm text-gray-600">{allocationError}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Investment Recommendations</h2>
        <p className="text-gray-600 mt-2">Personalized plans based on your financial profile</p>
      </div>

      {/* Recommended Plans (unchanged) */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Recommended Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {getRecommendedPlans().map((plan, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1`} style={{ background: plan.color }} />
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold flex items-center text-green-900 bg-green-100 rounded-2xl py-1 px-4 border border-green-300">
                  <Star className="w-5 h-5 mr-2" />
                  {plan.name}
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600">{plan.description}</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Expected Return</span>
                    <span className="font-semibold text-green-600">{plan.expectedReturn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Risk Level</span>
                    <span className="font-semibold text-gray-900">{plan.riskLevel}</span>
                  </div>
                </div>
                <button
                  className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                    index === 0 ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {index === 0 ? "Recommended" : "Select Plan"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Asset Allocation (colorful, interactive pie) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold flex items-center text-green-900 bg-green-100 rounded-2xl py-1 px-4 border border-green-300">
            <PieChart className="w-5 h-5 mr-2" />
            Recommended Asset Allocation
          </h3>
          {segment && (
            <p className="text-sm text-gray-500 mt-2">
              Investor segment:{" "}
              <span className="font-medium text-gray-700">{segment.label}</span>
              {" "}&middot; generated by the portfolio model from your profile
            </p>
          )}
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            {/* Legend/List (source-of-truth) */}
            <div className="space-y-4">
              {assetAllocation.map((asset, index) => {
                // normalized percent shown so pie and list match visually
                const normalized = Math.round((asset.percentage / (totalPercent || 1)) * 100)
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded mr-3" style={{ background: asset.color }} />
                      <div>
                        <div className="text-gray-900">{asset.name}</div>
                        <div className="text-xs text-gray-500">source: {asset.percentage}%</div>
                      </div>
                    </div>
                    <span className="font-semibold text-gray-900">{normalized}%</span>
                  </div>
                )
              })}
            </div>

            {/* Pie chart + tooltip container */}
            <div className="flex items-center justify-center">
              <div ref={containerRef} className="relative" role="img" aria-label="Asset allocation pie chart">
                <svg viewBox="0 0 200 200" width="320" height="320" className="transform">
                  <defs>
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
                    </filter>
                  </defs>

                  {/* slices */}
                  {slices.map((slice, i) => {
                    const explode = hoveredIndex === i ? 8 : 0
                    const midRad = (Math.PI / 180) * slice.midAngle
                    const dx = explode * Math.cos(midRad)
                    const dy = explode * Math.sin(midRad)
                    return (
                      <g
                        key={i}
                        transform={`translate(${dx.toFixed(2)}, ${dy.toFixed(2)})`}
                        onMouseEnter={(e) => handleSliceMouseMove(e, i)}
                        onMouseMove={(e) => handleSliceMouseMove(e, i)}
                        onMouseLeave={handleSliceLeave}
                        style={{ cursor: "pointer" }}
                      >
                        <path
                          d={slice.d}
                          fill={slice.color}
                          stroke="white"
                          strokeWidth="0.8"
                          filter={hoveredIndex === i ? "url(#shadow)" : undefined}
                        />
                      </g>
                    )
                  })}

                  {/* donut center */}
                  <circle cx="100" cy="100" r="48" fill="white" />
                  <text x="100" y="92" textAnchor="middle" style={{ fontSize: 12, fill: "#374151", fontWeight: 700 }}>
                    Allocation
                  </text>
                  <text x="100" y="110" textAnchor="middle" style={{ fontSize: 11, fill: "#6b7280" }}>
                    100%
                  </text>
                </svg>

                {/* tooltip */}
                {hoveredIndex !== null && (
                  <div
                    className="absolute z-50 pointer-events-none transform -translate-y-full"
                    style={{
                      left: tooltipPos.x,
                      top: tooltipPos.y,
                      minWidth: 140,
                    }}
                  >
                    <div className="bg-white border border-gray-200 rounded-md shadow-md p-2 text-sm">
                      <div className="font-semibold text-gray-800">
                        {slices[hoveredIndex].name}
                      </div>
                      <div className="text-gray-600 text-xs">
                        {Math.round(slices[hoveredIndex].computedPercent)}% of allocation
                      </div>
                      {/* show raw source percent if differs */}
                      {totalPercent !== 100 && (
                        <div className="text-xs text-gray-400 mt-1">
                          source: {slices[hoveredIndex].percentage}%
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* hint */}
                <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
                  <span className="text-xs text-gray-400 mb-2">Hover a slice for detail</span>
                </div>
              </div>
            </div>
          </div>

          {/* Show raw total if not 100 */}
          {totalPercent !== 100 && (
            <div className="mt-4 text-sm text-gray-500">
              Note: asset source totals <strong>{totalPercent}%</strong>. Chart uses normalized proportions so legend and pie match visually.
            </div>
          )}
        </div>
      </div>

      {/* Recommendations (unchanged) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-green-900 bg-green-100 rounded-2xl py-1 px-4 border border-green-300 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Stock Recommendations
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {recommendations.stocks.map((stock, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-900">{stock}</span>
                  <button className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-green-900 bg-green-100 rounded-2xl py-1 px-4 border border-green-300 flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Government Schemes
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {recommendations.schemes.map((scheme, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-900">{scheme}</span>
                  <button className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-green-900 bg-green-100 rounded-2xl py-1 px-4 border border-green-300 flex items-center">
              <Target className="w-5 h-5 mr-2" />
              SIP Recommendations
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {recommendations.sip.map((sip, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-900">{sip}</span>
                  <button className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-green-900 bg-green-100 rounded-2xl py-1 px-4 border border-green-300 flex items-center">
              <Coins className="w-5 h-5 mr-2" />
              Gold/Silver Options
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {recommendations.gold.map((gold, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-900">{gold}</span>
                  <button className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResultsTab
