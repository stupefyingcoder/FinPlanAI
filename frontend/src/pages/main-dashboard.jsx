import { useState } from "react"
import { LayoutDashboard, Target, TrendingUp, User } from "lucide-react"
import DashboardTab from "./Dashboard/dashboard-tab"
import ResultsTab from "./Dashboard/results-tab"
import { MarketAnalysisTab } from "./Dashboard/market-analysis-tab"
import { FinancialGoals } from "./Dashboard/financial-goals";
import ProfileTab from "./Dashboard/profile-tab"

const MainDashboard = ({ userData }) => {
  const [activeTab, setActiveTab] = useState("dashboard")

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "results", label: "Results", icon: Target },
    { id: "market", label: "Market Analysis", icon: TrendingUp },
    { id: "goals", label: "Financial Goals", icon: TrendingUp },
    { id: "profile", label: "Profile", icon: User },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardTab userData={userData} />
      case "results":
        return <ResultsTab userData={userData} />
      case "market":
        return <MarketAnalysisTab />
      case "goals":
        return <FinancialGoals />
      case "profile":
        return <ProfileTab userData={userData} />
      default:
        return <DashboardTab userData={userData} />
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white">FinancePro</h1>
          <p className="text-sm text-gray-300 mt-1">Financial Planning</p>
        </div>

        <nav className="mt-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">{renderContent()}</div>
      </div>
    </div>
  )
}

export default MainDashboard
