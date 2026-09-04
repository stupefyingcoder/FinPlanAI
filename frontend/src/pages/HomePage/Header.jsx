import { apiUrl } from "../../api/config";
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import { useAuth } from "../../auth/AuthProvider";

const Header = ({ logo }) => {
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { user, setUser, logout } = useAuth();
  const isLoggedIn = !!user?.isLoggedIn;

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
    } finally {
      setOpen(false);
      setLoading(false);
      navigate("/");
    }
  };

  const handleDashboardClick = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    try {
      const refreshRes = await fetch(
        apiUrl("/auth/refresh"),
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (refreshRes.ok) {
        const body = await refreshRes.json();
        if (body.accessToken) {
          localStorage.setItem("accessToken", body.accessToken);
        }
      }

      const accessToken =
        localStorage.getItem("accessToken") || "";
      const meRes = await fetch(
        apiUrl("/api/me"),
        {
          method: "GET",
          credentials: "include",
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {},
        }
      );

      if (!meRes.ok) {
        navigate("/login");
        return;
      }

      const data = await meRes.json();
      setUser({ ...data, isLoggedIn: true });
      if (data.profileCompleted) navigate("/dashboard");
      else navigate("/profile-creation");
    } catch (err) {
      console.error("Error checking session:", err);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="w-full backdrop-blur-sm bg-white/75 border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between py-3 px-6">
        {/* Logo + Main Nav */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex-shrink-0">
            <img
              src={logo ?? "/placeholder.svg"}
              alt="Logo"
              className="h-10 w-auto object-contain"
            />
          </Link>

          {/* Only destinations that actually exist. Investments, Pricing, FAQ,
              Blog and About were linked here with no matching routes, so every
              one of them fell through the router's catch-all and silently
              returned the visitor to the homepage. The market search box was
              likewise decorative. */}
          <nav className="hidden lg:flex items-center gap-6 text-gray-700 text-sm font-medium">
            {!isHomePage && (
              <Link to="/" className="hover:text-gray-900 transition">
                Home
              </Link>
            )}
            <Link to="/dashboard" className="hover:text-gray-900 transition">
              Dashboard
            </Link>
          </nav>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">

          {/* Notifications */}

          {isLoggedIn ? (
            <>
              {/* Profile Preview */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold">
                  {user?.name?.[0] ?? "U"}
                </div>
                <div className="hidden md:flex flex-col leading-tight">
                  <span className="text-xs text-gray-500">
                    Hello,
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {user?.name ?? "User"}
                  </span>
                </div>
              </div>

              {/* Persistent Menu Button */}
              <div className="relative">
                <button
                  onClick={() => setOpen(!open)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition"
                >
                  <FiMenu className="w-5 h-5 text-gray-600" />
                </button>

                {open && (
                  <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <ul className="py-2">
                      <li>
                        <button
                          onClick={(e) => {
                            setOpen(false);
                            handleDashboardClick(e);
                          }}
                          disabled={loading}
                          className="w-full text-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
                        >
                          {loading
                            ? "Loading..."
                            : "Dashboard"}
                        </button>
                      </li>
                      <li>
                        <Link
                          to="/dashboard"
                          onClick={() => setOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                        >
                          Settings
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/dashboard"
                          onClick={() => setOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                        >
                          Notifications
                        </Link>
                      </li>
                    </ul>
                    <div className="border-t border-gray-200" />
                    <div className="px-4 py-1 bg-red-50">
                      <button
                        onClick={handleLogout}
                        disabled={loading}
                        className="w-full text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition disabled:opacity-50"
                      >
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              to="/login"
              className="text-sm font-medium px-4 py-2 rounded-lg bg-black text-white hover:bg-indigo-700 transition"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;