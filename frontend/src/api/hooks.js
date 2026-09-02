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
