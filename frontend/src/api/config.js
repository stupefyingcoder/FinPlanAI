/**
 * Single place the frontend learns where the API lives.
 *
 * The base URL was previously hardcoded as http://localhost:5000 in five files,
 * which meant the port could not change without a find-and-replace and the app
 * could never be deployed anywhere.
 *
 * Override with REACT_APP_API_URL (see .env.example).
 */
// An *unset* variable means local development, so default to the dev API port.
// An explicitly *empty* variable means "same origin" — that is what the Docker
// build sets, so nginx can proxy /api and /auth to the backend and the browser
// never makes a cross-origin request. `||` cannot express that difference,
// because an empty string is falsy.
const configured = process.env.REACT_APP_API_URL;

export const API_BASE = configured === undefined ? "http://localhost:8000" : configured;

/** Build a full URL for an API path: apiUrl("/auth/login"). */
export function apiUrl(path) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export default API_BASE;
