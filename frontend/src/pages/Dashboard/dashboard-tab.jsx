import { DollarSign, TrendingUp, Target, Users, PiggyBank, Home, GraduationCap } from "lucide-react"

const DashboardTab = ({ userData }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getGoalIcon = (goal) => {
    switch (goal) {
      case "retirement":
        return <PiggyBank className="w-6 h-6 text-emerald-600" />
      case "child_education":
        return <GraduationCap className="w-6 h-6 text-indigo-600" />
      case "buying_home":
        return <Home className="w-6 h-6 text-blue-600" />
      default:
        return <Target className="w-6 h-6 text-gray-600" />
    }
  }

  const stats = [
    {
      title: "Monthly Income",
      value: formatCurrency(userData?.monthly_income || 0),
      icon: DollarSign,
      change: "+12.5%",
      positive: true,
    },
    {
      title: "Monthly Savings",
      value: formatCurrency(userData?.monthly_savings || 0),
      icon: TrendingUp,
      change: "+8.2%",
      positive: true,
    },
    {
      title: "Goal Progress",
      value: "68%",
      icon: Target,
      change: "+5.1%",
      positive: true,
    },
    {
      title: "Dependents",
      value: userData?.number_of_dependents || 0,
      icon: Users,
      change: "No change",
      positive: null,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="text-center lg:text-left">
        <h2 className="text-3xl font-bold text-gray-900">
          Welcome back, <span className="text-blue-600">{userData?.full_name || "User"}</span>
        </h2>
        <p className="text-gray-600 mt-2 text-lg">Here’s your personalized financial dashboard</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-xl">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span
                  className={`font-medium ${
                    stat.positive === true
                      ? "text-green-600"
                      : stat.positive === false
                        ? "text-red-600"
                        : "text-gray-500"
                  }`}
                >
                  {stat.change}
                </span>
                <span className="text-gray-500 ml-2">from last month</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Profile + Goal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Summary */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-green-900 bg-green-100 rounded-2xl py-1 px-4 border border-green-300">Profile Summary</h3>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <div className="p-6 grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-gray-500">Age</p>
              <p className="font-semibold text-gray-900">
                {userData?.date_of_birth
                  ? new Date().getFullYear() - new Date(userData.date_of_birth).getFullYear()
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Occupation</p>
              <p className="font-semibold text-gray-900 capitalize">
                {userData?.occupation_type?.replace("_", " ") || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Marital Status</p>
              <p className="font-semibold text-gray-900 capitalize">
                {userData?.marital_status?.replace("_", " ") || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Risk Level</p>
              <p className="font-semibold text-gray-900 capitalize">{userData?.risk_comfort_level || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Primary Goal */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex items-center">
            {getGoalIcon(userData?.primary_goal)}
            <h3 className="ml-2 text-lg font-semibold text-green-900 bg-green-100 rounded-2xl py-1 px-4 border border-green-300">Primary Goal</h3>
          </div>
          <div className="p-6 space-y-4 text-sm">
            <div>
              <p className="text-gray-500">Goal Type</p>
              <p className="font-semibold text-gray-900 capitalize">
                {userData?.primary_goal?.replace("_", " ") || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Target Amount</p>
              <p className="font-semibold text-gray-900">{formatCurrency(userData?.goal_target_amount || 0)}</p>
            </div>
            <div>
              <p className="text-gray-500">Timeline</p>
              <p className="font-semibold text-gray-900">{userData?.goal_timeline_years || 0} years</p>
            </div>

            {/* Progress bar */}
            <div className="pt-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Progress</span>
                <span className="text-gray-900">68%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-green-400 to-emerald-600 h-2 rounded-full" style={{ width: "68%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-md border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-green-900 bg-green-100 rounded-2xl py-1 px-4 border border-green-300">Financial Overview</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-4 rounded-lg hover:bg-gray-50 transition">
            <p className="text-sm text-gray-500">Monthly Income</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {formatCurrency(userData?.monthly_income || 0)}
            </p>
          </div>
          <div className="p-4 rounded-lg hover:bg-gray-50 transition">
            <p className="text-sm text-gray-500">Monthly Expenses</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {formatCurrency(userData?.monthly_expenses || 0)}
            </p>
          </div>
          <div className="p-4 rounded-lg hover:bg-gray-50 transition">
            <p className="text-sm text-gray-500">Net Savings</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {formatCurrency((userData?.monthly_income || 0) - (userData?.monthly_expenses || 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardTab
