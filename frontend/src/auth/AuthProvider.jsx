import React, { createContext, useContext, useEffect, useState } from "react";
import { apiUrl } from "../api/config";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * AuthProvider
 * - Restores session on mount using /auth/refresh -> /api/me
 * - Exposes: user, setUser, loading, login(), logout()
 *
 * NOTE: accessToken is stored in localStorage in this example for simplicity.
 * Prefer in-memory storage for better security in production.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = not logged in, object = logged in
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Attempt refresh (server will read httpOnly cookie)
        await fetch(apiUrl("/auth/refresh"), {
          method: "POST",
          credentials: "include",
        });

        // Try to fetch /api/me using any stored access token
        const storedToken = localStorage.getItem("accessToken") || "";
        const meRes = await fetch(apiUrl("/api/me"), {
          method: "GET",
          credentials: "include",
          headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {},
        });

        if (meRes.ok) {
          const data = await meRes.json();
          if (!mounted) return;
          setUser({
            name: data.account?.full_name || "User",
            email: data.account?.email || "",
            avatar: data.account?.avatar || null,
            isLoggedIn: true,
            profileCompleted: !!data.profileCompleted,
            userId: data.account?.user_id || null,
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.warn("Session restore failed:", err);
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // login helper — call after successful /auth/login response
  const login = ({ accessToken, fullName, email, avatar = null, profileCompleted = false, userId = null }) => {
    if (accessToken) localStorage.setItem("accessToken", accessToken);
    setUser({
      name: fullName || email?.split?.("@")?.[0] || "User",
      email: email || "",
      avatar,
      isLoggedIn: true,
      profileCompleted: !!profileCompleted,
      userId: userId || null,
    });
  };

  // logout helper — revokes on server and clears local state
  const logout = async () => {
    try {
      await fetch(apiUrl("/auth/logout"), {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.warn("Logout request failed:", err);
    } finally {
      localStorage.removeItem("accessToken");
      setUser(null);
    }
  };

  const value = { user, setUser, login, logout, loading };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
