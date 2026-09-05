import { useState } from "react"
import {
  Target,
  Calendar,
  PiggyBank,
  Home,
  Car,
  GraduationCap,
  Plane,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react"

import { useGoals } from "../../api/hooks"

/**
 * Financial goals, stored in the `financial_goals` table.
 *
 * This tab previously rendered a hardcoded array — the same three goals for
 * every user, with no way to add or change one. Goals are now real rows behind
 * /api/goals, which is also what gives the Goal agent something to reason over.
 */

// Chosen from the goal's own name, so a goal still gets a sensible icon without
// asking the user to pick one.
const ICON_RULES = [
  [/emergency|safety|fund/i, PiggyBank, "bg-blue-500"],
  [/house|home|property|flat/i, Home, "bg-green-500"],
  [/car|vehicle|bike/i, Car, "bg-purple-500"],
  [/education|college|school|study/i, GraduationCap, "bg-amber-500"],
  [/travel|trip|vacation|holiday/i, Plane, "bg-rose-500"],
]

function iconFor(name) {
  for (const [pattern, Icon, color] of ICON_RULES) {
    if (pattern.test(name)) return { Icon, color }
  }
  return { Icon: Target, color: "bg-gray-500" }
}

const inr = (n) => `₹${new Intl.NumberFormat("en-IN").format(Math.round(n || 0))}`

const PRIORITY_STYLES = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-600",
}

const EMPTY_FORM = {
  goal_name: "",
  target_amount: "",
  current_amount: "",
  target_date: "",
  priority: "medium",
}

export function FinancialGoals() {
  const { goals, loading, error, createGoal, updateGoal, deleteGoal } = useGoals()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      await createGoal({
        goal_name: form.goal_name.trim(),
        target_amount: Number(form.target_amount),
        current_amount: Number(form.current_amount || 0),
        target_date: form.target_date || null,
        priority: form.priority,
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (err) {
      setFormError(err.message || "Could not save the goal")
    } finally {
      setSaving(false)
    }
  }

  const addToGoal = async (goal, amount) => {
    await updateGoal(goal.goal_id, { current_amount: Number(goal.current_amount) + amount })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Financial Goals</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2"
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "Add goal"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white border rounded-lg p-4 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Goal</span>
              <input
                required
                value={form.goal_name}
                onChange={(e) => setForm({ ...form, goal_name: e.target.value })}
                placeholder="House down payment"
                className="w-full border rounded px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Target amount</span>
              <input
                required
                type="number"
                min="1"
                value={form.target_amount}
                onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                placeholder="2000000"
                className="w-full border rounded px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Saved so far</span>
              <input
                type="number"
                min="0"
                value={form.current_amount}
                onChange={(e) => setForm({ ...form, current_amount: e.target.value })}
                placeholder="0"
                className="w-full border rounded px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Target date</span>
              <input
                type="date"
                value={form.target_date}
                onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </label>
          </div>

          <div className="flex items-end gap-3">
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Priority</span>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="border rounded px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2"
            >
              {saving ? "Saving…" : "Save goal"}
            </button>
          </div>

          {formError && (
            <p className="text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </p>
          )}
        </form>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-3 py-16 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading your goals…</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center justify-center gap-3 py-16 text-gray-600">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && goals.length === 0 && (
        <div className="text-center py-16 space-y-2">
          <Target className="h-8 w-8 mx-auto text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">No goals yet</h2>
          <p className="text-sm text-gray-600">
            Add your first goal and the planner will factor it into your recommendations.
          </p>
        </div>
      )}

      {!loading && !error && goals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const { Icon, color } = iconFor(goal.goal_name)
            const progress = goal.progress_pct
            const remaining = Math.max(0, goal.target_amount - goal.current_amount)

            return (
              <div key={goal.goal_id} className="border rounded-lg p-4 shadow-sm bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${color}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        PRIORITY_STYLES[goal.priority] || PRIORITY_STYLES.medium
                      }`}
                    >
                      {goal.priority}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteGoal(goal.goal_id)}
                      aria-label={`Delete ${goal.goal_name}`}
                      className="text-gray-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h2 className="text-lg font-semibold">{goal.goal_name}</h2>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Saved</span>
                    <span className="font-medium">{inr(goal.current_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Target</span>
                    <span className="font-medium">{inr(goal.target_amount)}</span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{progress}% complete</span>
                    <span>{inr(remaining)} to go</span>
                  </div>

                  {goal.target_date && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>
                        by{" "}
                        {new Date(goal.target_date).toLocaleDateString("en-IN", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  {[10000, 25000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => addToGoal(goal, amount)}
                      className="flex-1 text-xs border border-gray-300 hover:border-blue-500 hover:text-blue-600 rounded px-2 py-1.5"
                    >
                      + {inr(amount)}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default FinancialGoals
