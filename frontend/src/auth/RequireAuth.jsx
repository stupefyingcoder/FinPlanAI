import { Navigate, useLocation } from "react-router-dom";

import { getToken } from "../api/client";

/**
 * Gate for routes that need a signed-in user.
 *
 * Without this, /dashboard and /profile-creation rendered for anyone who typed
 * the URL: the tabs mounted, fired authenticated requests, and filled the page
 * with error states. On a public link that is the most likely way a visitor sees
 * something broken.
 *
 * The check is deliberately shallow — presence of an access token, not its
 * validity. Tokens are short-lived, so the API remains the real authority; this
 * only avoids rendering a signed-in surface to someone who has plainly not
 * signed in. `replace` keeps the login page out of the back-button history.
 */
export default function RequireAuth({ children }) {
  const location = useLocation();

  if (!getToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
