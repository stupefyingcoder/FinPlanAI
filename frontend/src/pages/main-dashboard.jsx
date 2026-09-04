import { useState } from "react"
import { LayoutDashboard, Target, TrendingUp, User, Sparkles, Loader2, AlertCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"

import DashboardTab from "./Dashboard/dashboard-tab"
import ResultsTab from "./Dashboard/results-tab"
import { MarketAnalysisTab } from "./Dashboard/market-analysis-tab"
import { FinancialGoals } from "./Dashboard/financial-goals"
import ProfileTab from "./Dashboard/profile-tab"
import AIInsightsTab from "./Dashboard/ai-insights-tab"
import { useProfile } from "../api/hooks"

/**
 * Dashboard shell.
 *
 * Fetches the account and profile once here and passes them down, rather than
 * expecting a `userData` prop that nothing ever passed — which is why the
 * Dashboard and Profile tabs rendered zeros and "N/A" for users whose profile
 * was sitting in the database.
 */
const MainDashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard")
  const { userData, loading, error } = useProfile()
  const navigate = useNavigate()

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "results", label: "Results", icon: Target },
    { id: "market", label: "Market Analysis", icon: TrendingUp },
    { id: "goals", label: "Financial Goals", icon: Target },
    { id: "ai", label: "AI Insights", icon: Sparkles },
    { id: "profile", label: "Profile", icon: User },
  ]

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center gap-3 py-24 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading your dashboard…</span>
        </div>
      )
    }

    if (error) {
      return (
        <div className="max-w-md mx-auto text-center py-24 space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
          <h2 className="text-lg font-semibold text-gray-900">Could not load your account</h2>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      )
    }

    // Every tab depends on the profile, so prompt for it once here instead of
    // letting each tab discover the same problem separately.
    if (userData && !userData.profileCompleted) {
      return (
        <div className="max-w-md mx-auto text-center py-24 space-y-4">
          <AlertCircle className="w-8 h-8 mx-auto text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900">Finish your profile</h2>
          <p className="text-sm text-gray-600">
            Your segment, allocation and plan are all built from your income, savings, risk
            appetite and goal. It takes a couple of minutes.
          </p>
          <button
            type="button"
            onClick={() => navigate("/profile-creation")}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2"
          >
            Complete profile
          </button>
        </div>
      )
    }

    switch (activeTab) {
      case "dashboard":
        return <DashboardTab userData={userData} />
      case "results":
        return <ResultsTab userData={userData} />
      case "market":
        return <MarketAnalysisTab />
      case "goals":
        return <FinancialGoals />
      case "ai":
        return <AIInsightsTab />
      case "profile":
        return <ProfileTab userData={userData} />
      default:
        return <DashboardTab userData={userData} />
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-gray-900 text-white shrink-0">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white">FinPlan AI</h1>
          <p className="text-sm text-gray-300 mt-1">Financial planning</p>
        </div>

        <nav className="mt-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? "page" : undefined}
                className={`w-full flex items-center px-6 py-3 text-left transition-colors ${
                  activeTab === tab.id
                    ? "bg-gray-800 text-white border-r-2 border-blue-500"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {tab.label}
              </button>
            )
          })}
        </nav>

        {userData?.full_name && (
          <div className="px-6 mt-8 pt-6 border-t border-gray-800">
            <p className="text-xs text-gray-400">Signed in as</p>
            <p className="text-sm text-white truncate">{userData.full_name}</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-8">{renderContent()}</div>
      </div>
    </div>
  )
}

export default MainDashboard
