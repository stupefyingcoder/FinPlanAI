"use client"

import { useState, useEffect } from "react"
import { CSSTransition } from "react-transition-group"
import "./loginTransitions.css" // Create this CSS file for transitions
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [capsLock, setCapsLock] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)

  function validateEmail(value) {
    return /\S+@\S+\.\S+/.test(value)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    
    try {
      if (isSignUp) {
        // Create new user
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        
        // Update profile with name
        await updateProfile(userCredential.user, {
          displayName: name
        });
        
        // Clear form and show success message
        setSignupSuccess(true)
        setIsSignUp(false)
        setEmail("")
        setPassword("")
        setName("")
        
      } else {
        // Sign in existing user
        await signInWithEmailAndPassword(auth, email, password);
        navigate("/"); // Only redirect to home after successful login
      }
    } catch (error) {
      console.error("Auth error:", error);
      
      // Handle specific Firebase errors
      switch (error.code) {
        case "auth/email-already-in-use":
          setError("This email is already registered. Please sign in instead.");
          break;
        case "auth/wrong-password":
          setError("Incorrect password. Please try again.");
          break;
        case "auth/user-not-found":
          setError("No account found with this email. Please sign up.");
          break;
        case "auth/too-many-requests":
          setError("Too many attempts. Please try again later.");
          break;
        default:
          setError(isSignUp ? "Failed to create account." : "Failed to sign in.");
      }
    } finally {
      setLoading(false)
    }
  }

  function handleKeyEvent(e) {
    setCapsLock(e.getModifierState && e.getModifierState("CapsLock"))
  }

  useEffect(() => {
    if (error && (email || password || name)) setError("")
  }, [email, password, name])

  return (
    <main className="min-h-screen bg-gray-50 flex">
      {/* Left Section - improved */}
      <section className="hidden md:flex w-1/2 relative items-start px-12 py-16 bg-black">
        <img
          src="/black_minimalist.png"
          alt="Black minimalist background"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/30 via-transparent to-black/10"></div>
        <div className="relative z-20 max-w-lg text-white mt-20">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
            Clarity for Your Financial Future.
          </h2>
          <p className="text-sm md:text-lg text-white mb-6">
            Unlock the intelligent strategy our AI has tailored just for you.
          </p>
          <ul className="space-y-3 mb-6">
            <li className="flex items-center gap-3">
              {/* Target/goal icon */}
              <svg aria-hidden className="w-5 h-5 text-white flex-shrink-0 mt-[2px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="12" r="2" fill="currentColor"/>
              </svg>
              <span className="text-sm md:text-base text-white">
                For your unique goals.
              </span>
            </li>
            <li className="flex items-center gap-3">
              {/* Shield/risk icon */}
              <svg aria-hidden className="w-5 h-5 text-white flex-shrink-0 mt-[2px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l8 4v5c0 5.25-3.5 9.74-8 11-4.5-1.26-8-5.75-8-11V7l8-4z" />
              </svg>
              <span className="text-sm md:text-base text-white">
                For your comfort with risk.
              </span>
            </li>
            <li className="flex items-center gap-3">
              {/* Trending up/future icon */}
              <svg aria-hidden className="w-5 h-5 text-white flex-shrink-0 mt-[2px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 17l6-6 4 4 8-8" />
              </svg>
              <span className="text-sm md:text-base text-white">
                For your financial future.
              </span>
            </li>
          </ul>
        </div>
        {/* User rating and trusted info at the bottom */}
        <div className="absolute left-12 bottom-8 z-20 inline-flex items-center gap-4 bg-white/10 rounded-lg px-3 py-2 text-xs max-w-lg text-white">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">4.8</span>
            <span className="text-xs text-white">User rating</span>
          </div>
          <div className="h-6 border-l border-white/20" />
          <div className="text-xs text-white">Trusted by 15k+ users</div>
        </div>
      </section>

      {/* Right Section */}
      <section className="relative w-full md:w-1/2 min-h-screen flex items-center justify-center overflow-hidden">
        {/* Grey gradient background covering the entire right side */}
        <img
          src="/grey_gradient.png"
          alt="Grey gradient background"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        {/* Optional: overlay for extra effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-white/5 z-0"></div>
        <div className="relative z-10 w-full max-w-md flex flex-col items-center justify-center px-4">
          <div 
            key={isSignUp ? "signup" : "signin"} 
            className="relative fade-in bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-100 
            shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-8 w-full z-10"
          >
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-black tracking-tight">
                {isSignUp ? "Create your account" : "Secure your future today!"}
              </h1>
              <p className="mt-2 text-sm text-gray-800">
                {isSignUp ? "Sign up for FinPlan AI" : "Sign in to your FinPlan AI account"}
              </p>
            </div>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <label htmlFor="name" className="text-sm font-medium text-black">Name</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Your Name"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 mt-1"
                  />
                </div>
              )}
              <div>
                <label htmlFor="email" className="text-sm font-medium text-black">Email address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  autoComplete="email"
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 mt-1"
                />
              </div>
              <div>
                <label htmlFor="password" className="text-sm font-medium text-black">Password</label>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  autoComplete="current-password"
                  onChange={e => setPassword(e.target.value)}
                  onKeyUp={handleKeyEvent}
                  onKeyDown={handleKeyEvent}
                  required
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 mt-1"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="text-xs text-black mt-1"
                >
                  {showPassword ? "Hide" : "Show"} password
                </button>
                {password.length > 0 && password.length < 8 && (
                  <p className="text-xs text-gray-800">Use at least 8 characters for a stronger password.</p>
                )}
                {capsLock && <p className="text-xs text-black">Caps Lock is on.</p>}
              </div>
              {!isSignUp && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-black"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                  />
                  <span className="text-sm text-black">Remember me</span>
                </label>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-black px-4 py-3 text-sm font-medium 
                text-white shadow-sm transition duration-200
                hover:bg-gray-900 hover:shadow-md
                active:transform active:scale-[0.98]
                disabled:opacity-70 disabled:cursor-not-allowed"
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
            <p className="mt-6 text-center text-sm text-black">
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="font-medium text-black hover:text-gray-900 
                    transition duration-200 underline-offset-4 hover:underline"
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
                    className="font-medium text-black hover:text-gray-900 
                    transition duration-200 underline-offset-4 hover:underline"
                    onClick={() => setIsSignUp(true)}
                  >
                    Sign up
                  </button>
                </>
              )}
            </p>
            <p className="mt-4 text-center text-xs text-black">Secure login. Your data is encrypted and protected.</p>
          </div>
        </div>
      </section>
    </main>
  )
}

