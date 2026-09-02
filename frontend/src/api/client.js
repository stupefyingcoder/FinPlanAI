/**
 * Authenticated fetch for the FinPlan API.
 *
 * Every protected call needs the same three things: the bearer token, cookie
 * credentials for the refresh cookie, and a retry after refreshing when the
 * access token has expired. That logic was previously copy-pasted into five
 * components, each with slightly different behaviour on failure. It lives here
 * once now.
 */

import { apiUrl } from "./config";

const TOKEN_KEY = "accessToken";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/** Exchange the httpOnly refresh cookie for a new access token. */
async function refreshAccessToken() {
  const res = await fetch(apiUrl("/auth/refresh"), {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return null;
  const body = await res.json().catch(() => ({}));
  if (body.accessToken) {
    setToken(body.accessToken);
    return body.accessToken;
  }
  return null;
}

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Call the API, refreshing once on 401 before giving up.
 *
 * Returns parsed JSON, or null for 204.
 */
export async function apiFetch(path, options = {}) {
  const { retryOnUnauthorized = true, ...init } = options;

  const send = (token) =>
    fetch(apiUrl(path), {
      ...init,
      credentials: "include",
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
    });

  let res = await send(getToken());

  if (res.status === 401 && retryOnUnauthorized) {
    const token = await refreshAccessToken();
    if (token) res = await send(token);
  }

  if (res.status === 204) return null;

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    // FastAPI puts the human-readable reason in `detail`.
    const detail =
      (body && (typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail))) ||
      res.statusText;
    throw new ApiError(detail, res.status, body);
  }

  return body;
}

export const api = {
  get: (path) => apiFetch(path),
  post: (path, data) => apiFetch(path, { method: "POST", body: JSON.stringify(data ?? {}) }),
  patch: (path, data) => apiFetch(path, { method: "PATCH", body: JSON.stringify(data ?? {}) }),
  del: (path) => apiFetch(path, { method: "DELETE" }),
};

export default api;
