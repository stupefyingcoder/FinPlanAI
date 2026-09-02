import { Target, Calendar, TrendingUp, PiggyBank, Home, Car, GraduationCap, Plane } from "lucide-react"

const financialGoals = [
  {
    id: 1,
    title: "Emergency Fund",
    target: 600000,
    current: 450000,
    deadline: "Dec 2025",
    category: "Safety",
    icon: PiggyBank,
    color: "bg-blue-500",
  },
  {
    id: 2,
    title: "House Down Payment",
    target: 2000000,
    current: 800000,
    deadline: "Jun 2026",
    category: "Investment",
    icon: Home,
    color: "bg-green-500",
  },
  {
    id: 3,
    title: "New Car",
    target: 800000,
    current: 320000,
    deadline: "Mar 2025",
    category: "Lifestyle",
    icon: Car,
    color: "bg-orange-500",
  },
  {
    id: 4,
    title: "Child's Education",
    target: 1500000,
    current: 200000,
    deadline: "Dec 2030",
    category: "Education",
    icon: GraduationCap,
    color: "bg-purple-500",
  },
  {
    id: 5,
    title: "Vacation Fund",
    target: 300000,
    current: 180000,
    deadline: "Dec 2024",
    category: "Lifestyle",
    icon: Plane,
    color: "bg-pink-500",
  },
]

const assetAllocation = [
  { category: "Emergency Fund", percentage: 15, description: "3-6 months of expenses in liquid savings" },
  {
    category: "Equity Mutual Funds",
    percentage: 40,
    description: "Long-term wealth creation through diversified equity",
  },
  { category: "Debt Funds", percentage: 20, description: "Stable returns with lower risk" },
  { category: "PPF/ELSS", percentage: 15, description: "Tax-saving investments with long-term benefits" },
  { category: "Real Estate", percentage: 10, description: "Property investment for portfolio diversification" },
]

export function FinancialGoals() {
  const calculateProgress = (current, target) => Math.round((current / target) * 100)

  const calculateTimeToGoal = (current, target, monthlyContribution = 25000) => {
    const remaining = target - current
    const months = Math.ceil(remaining / monthlyContribution)
    return months > 12 ? `${Math.round(months / 12)} years` : `${months} months`
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Financial Goals</h1>
        <div className="flex items-center gap-2 text-gray-500">
          <Target className="h-5 w-5" />
          <span>Track your progress</span>
        </div>
      </div>

      {/* Goals Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {financialGoals.map((goal) => {
          const progress = calculateProgress(goal.current, goal.target)
          const Icon = goal.icon

          return (
            <div key={goal.id} className="border rounded-lg p-4 shadow-sm bg-white space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${goal.color}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100">{goal.category}</span>
              </div>

              <h2 className="text-lg font-semibold">{goal.title}</h2>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-2"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Financial Numbers */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Current</span>
                  <span className="font-medium">₹{goal.current.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Target</span>
                  <span className="font-medium">₹{goal.target.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Remaining</span>
                  <span className="font-medium text-orange-600">
                    ₹{(goal.target - goal.current).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Deadline + Time */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-1 text-gray-500 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>{goal.deadline}</span>
                </div>
                <span className="text-sm font-medium text-blue-600">
                  {calculateTimeToGoal(goal.current, goal.target)} to go
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Asset Allocation */}
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5" />
          Recommended Asset Allocation
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Allocation List */}
          <div className="space-y-4">
            {assetAllocation.map((asset, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{asset.category}</span>
                  <span className="text-sm font-semibold">{asset.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
                  <div
                    className="bg-green-500 h-2"
                    style={{ width: `${asset.percentage}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500">{asset.description}</p>
              </div>
            ))}
          </div>

          {/* Investment Tips */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Investment Tips</h3>
            <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500 text-sm">
              <strong>Start Early:</strong> The power of compounding works best over longer periods.
            </div>
            <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500 text-sm">
              <strong>Diversify:</strong> Don't put all your eggs in one basket.
            </div>
            <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500 text-sm">
              <strong>Review Regularly:</strong> Rebalance your portfolio annually or when life changes.
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500 text-sm">
              <strong>Stay Disciplined:</strong> Stick to your plan despite market volatility.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
