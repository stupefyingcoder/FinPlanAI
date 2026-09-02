/**
 * Single place the frontend learns where the API lives.
 *
 * The base URL was previously hardcoded as http://localhost:5000 in five files,
 * which meant the port could not change without a find-and-replace and the app
 * could never be deployed anywhere.
 *
 * Override with REACT_APP_API_URL (see .env.example).
 */
export const API_BASE =
  process.env.REACT_APP_API_URL || "http://localhost:8000";

/** Build a full URL for an API path: apiUrl("/auth/login"). */
export function apiUrl(path) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export default API_BASE;
