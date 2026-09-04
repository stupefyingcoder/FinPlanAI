import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginImg from "../assets/LoginBg.png";
import Lockup from "../assets/horizontal_logo_with_FinPlan_written.png";
import { useAuth } from "../auth/AuthProvider";
import { apiUrl } from "../api/config";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState(""); // ✅ unified
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [capsLock, setCapsLock] = useState(false);

  function handleKeyEvent(e) {
    setCapsLock(e.getModifierState && e.getModifierState("CapsLock"));
  }

  useEffect(() => {
    if ((email || password || fullName) && (error || success)) {
      setError("");
      setSuccess("");
    }
  }, [email, password, fullName, error, success]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isSignUp) {
        // --- SIGNUP ---
        const res = await fetch(apiUrl("/auth/signup"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            fullName, // ✅ matches backend schema
            email,
            password,
          }),
        });

        const body = await res.json();
        if (!res.ok)
          throw new Error(body.error || body.message || "Signup failed");

        setSuccess("Account created successfully. Please sign in!");
        setIsSignUp(false);
        setFullName("");
        setEmail("");
        setPassword("");
        return;
      } else {
        // --- LOGIN ---
        const res = await fetch(apiUrl("/auth/login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });

        const body = await res.json();
        if (!res.ok)
          throw new Error(body.error || body.message || "Login failed");

        login({
          accessToken: body.accessToken,
          fullName: body.fullName || body.full_name || email.split("@")[0],
          email,
          avatar: body.avatar || null,
          profileCompleted: !!body.profileCompleted,
          userId: body.userId || body.user_id || null,
        });

        navigate("/");
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.message || "Authentication error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex">
      {/* Left Section */}
      <section className="hidden md:flex w-1/2 relative items-start px-12 py-16 bg-black">
        <img
          src={LoginImg}
          alt="Black minimalist background"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
        <div className="flex flex-col items-start relative z-20 max-w-lg text-white mt-20">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-3 text-left">
            Clarity for Your Financial Future.
          </h2>
          <p className="text-sm md:text-lg mb-6">
            Unlock the intelligent strategy our AI has tailored just for you.
          </p>
        </div>
        <div className="absolute left-12 bottom-8 z-20 inline-flex items-center gap-4 bg-white/10 rounded-lg px-3 py-2 text-xs text-white">
          <div className="flex flex-col">
            <span className="text-sm font-semibold">4.8</span>
            <span className="text-xs">User rating</span>
          </div>
          <div className="h-6 border-l border-white/20" />
          <div className="text-xs">Trusted by 15k+ users</div>
        </div>
      </section>

      {/* Right Section */}
      <section className="relative w-full md:w-1/2 min-h-screen flex items-center justify-center bg-gray-100">
        <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-white/5 z-0" />
        <div className="relative z-10 w-full max-w-md px-4">
          <div
            key={isSignUp ? "signup" : "signin"}
            className="fade-in bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-8 w-full"
          >
            <div className="mb-8">
              <img src={Lockup} alt="FinPlan AI" className="h-8 w-auto object-contain mb-5" />
              <h1 className="text-2xl font-semibold">
                {isSignUp ? "Create your account" : "Welcome back"}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {isSignUp
                  ? "Sign up to build your financial plan."
                  : "Sign in to your FinPlan AI account."}
              </p>
            </div>

            {/* Error & Success Messages */}
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <label htmlFor="fullName" className="text-sm font-medium">
                    Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="e.g. Aarav Sharma"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 mt-1"
                  />
                </div>
              )}
              <div>
                <label htmlFor="email" className="text-sm font-medium">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 mt-1"
                />
              </div>
              <div>
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={handleKeyEvent}
                  onKeyDown={handleKeyEvent}
                  required
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 mt-1"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-xs mt-1"
                >
                  {showPassword ? "Hide" : "Show"} password
                </button>
                {password.length > 0 && password.length < 8 && (
                  <p className="text-xs text-gray-600">
                    Use at least 8 characters for a stronger password.
                  </p>
                )}
                {capsLock && (
                  <p className="text-xs text-black">Caps Lock is on.</p>
                )}
              </div>

              {!isSignUp && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span className="text-sm">Remember me</span>
                </label>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-gray-900 disabled:opacity-70"
              >
                {loading
                  ? isSignUp
                    ? "Signing up..."
                    : "Signing in..."
                  : isSignUp
                  ? "Sign up"
                  : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm">
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="font-medium hover:underline"
                    onClick={() => setIsSignUp(false)}
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    className="font-medium hover:underline"
                    onClick={() => setIsSignUp(true)}
                  >
                    Sign up
                  </button>
                </>
              )}
            </p>

            <p className="mt-4 text-center text-xs">
              Secure login. Your data is encrypted and protected.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
