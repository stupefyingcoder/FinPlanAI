/**
 * Hooks for the model-backed endpoints.
 *
 * Each returns { data, loading, error, reload } and handles the one state the
 * old placeholder UI never had to: the user has not filled in a profile yet, so
 * there is nothing to predict from. The API answers 409 in that case, and the
 * components render a prompt instead of an error.
 */

import { useCallback, useEffect, useState } from "react";

import api, { ApiError } from "./client";

export const PROFILE_REQUIRED = "PROFILE_REQUIRED";

function useEndpoint(path, { method = "get", enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      setData(method === "post" ? await api.post(path) : await api.get(path));
    } catch (err) {
      // 409 is not a failure — it means "finish your profile first".
      if (err instanceof ApiError && err.status === 409) setError(PROFILE_REQUIRED);
      else setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [path, method, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

/** Portfolio allocation from the trained softmax network. */
export function useAllocation() {
  const { data, ...rest } = useEndpoint("/api/ml/allocation");
  return { allocation: data?.allocation ?? null, ...rest };
}

/** Investor segment from the fitted K-Means pipeline. */
export function useSegment() {
  const { data, ...rest } = useEndpoint("/api/ml/segment");
  return { segment: data, ...rest };
}

/** Prophet gold forecast, most recent `limit` points. */
export function useGoldForecast(limit = 60) {
  const { data, ...rest } = useEndpoint(`/api/ml/forecast/gold?limit=${limit}`);
  return { points: data?.points ?? [], ...rest };
}

/** Segment + allocation + a written plan. POST because it may call the LLM. */
export function usePlan(enabled = true) {
  const { data, ...rest } = useEndpoint("/api/ai/plan", { method: "post", enabled });
  return { plan: data, ...rest };
}

/** Financial goals, with create / update / delete. */
export function useGoals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setGoals(await api.get("/api/goals"));
    } catch (err) {
      setError(err.message || "Could not load goals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const createGoal = useCallback(
    async (goal) => {
      await api.post("/api/goals", goal);
      await reload();
    },
    [reload]
  );

  const updateGoal = useCallback(
    async (goalId, changes) => {
      await api.patch(`/api/goals/${goalId}`, changes);
      await reload();
    },
    [reload]
  );

  const deleteGoal = useCallback(
    async (goalId) => {
      await api.del(`/api/goals/${goalId}`);
      await reload();
    },
    [reload]
  );

  return { goals, loading, error, reload, createGoal, updateGoal, deleteGoal };
}

/**
 * The signed-in user's account and profile, in the shape the dashboard tabs
 * already read.
 *
 * The tabs were written against a flat snake_case object (`monthly_income`,
 * `risk_comfort_level`, ...) that nothing ever supplied — App.js rendered the
 * dashboard with no props at all, so every field was undefined and the Dashboard
 * and Profile tabs showed zeros and "N/A" even for a user with a complete
 * profile. Adapting here rather than editing each tab keeps the change small and
 * puts the mapping in one reviewable place.
 */
export function useProfile() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, profileResponse] = await Promise.all([
        api.get("/api/me"),
        api.get("/api/profile"),
      ]);

      const p = profileResponse?.profile ?? {};
      const extra = p.extra ?? {};
      const asList = (value) => (Array.isArray(value) ? value.join(", ") : value || null);

      const income = p.monthlyIncome ?? 0;
      const expenses = p.monthlyExpenses ?? 0;

      setData({
        profileCompleted: profileResponse?.profileCompleted ?? false,

        full_name: me?.account?.fullName ?? null,
        email: me?.account?.email ?? null,
        date_of_birth: extra.dob ?? null,
        gender: p.gender ?? null,
        marital_status: p.maritalStatus ?? null,
        occupation_type: p.occupation ?? null,
        number_of_dependents: p.dependentsCount ?? 0,

        monthly_income: income,
        monthly_expenses: expenses,
        // The form stores a rate, not an amount; fall back to income - expenses.
        monthly_savings: extra.monthly_savings_amt ?? Math.max(0, income - expenses),
        emergency_fund_amount: p.emergencyFund ?? null,

        has_loans: extra.has_loans ?? false,
        loan_type: asList(extra.loan_types),
        monthly_emi: p.approxEmi ?? null,

        primary_goal: p.primaryGoal ?? null,
        goal_target_amount: p.goalAmount ?? null,
        goal_timeline_years: p.goalTimelineYears ?? null,

        risk_comfort_level: p.riskLevel ?? null,
        investment_horizon: p.investHorizon ?? null,
        preferred_investment: asList(extra.preferred_assets),

        health_insurance_cover: extra.health_insurance ?? null,
        life_insurance_cover: extra.life_insurance ?? null,
      });
    } catch (err) {
      setError(err.message || "Could not load your profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { userData: data, loading, error, reload: load };
}
