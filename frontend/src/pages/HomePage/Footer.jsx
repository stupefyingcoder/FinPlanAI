// src/components/Footer.jsx
import React, { useState } from "react";
import {
  FaTwitter,
  FaLinkedin,
  FaFacebookF,
  FaGithub,
  FaInstagram,
} from "react-icons/fa";
import { HiOutlineMail } from "react-icons/hi";
import Logo from "../../assets/logo.png";
import Logo1 from "../../assets/Logo-1.png";
import Logo2 from "../../assets/Logo-2.png";
import Logo3 from "../../assets/Logo-3.png";
import Logo4 from "../../assets/Logo-4.png";

const FallbackLogo = "/placeholder.svg";

/**
 * Simplified Footer
 * - Uses direct logo imports only (Logo, Logo1..Logo4)
 * - No conditional "rendering logic" or props for logos
 * - Keeps image onError fallback to placeholder
 */
const Footer = ({ sticky = false }) => {
  const year = new Date().getFullYear();

  // Newsletter form state
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [error, setError] = useState("");

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubscribe = (e) => {
    e.preventDefault();
    setError("");
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      setStatus("error");
      return;
    }

    // Simulate an async subscribe (replace with real API call)
    setStatus("sending");
    setTimeout(() => {
      setStatus("success");
      setEmail("");
    }, 700);
  };

  const handleImgError = (e) => {
    if (e?.currentTarget?.src !== FallbackLogo) e.currentTarget.src = FallbackLogo;
  };

  return (
    <footer
      role="contentinfo"
      aria-label="Site footer"
      className={`text-slate-200 bg-gradient-to-b from-slate-900 via-slate-950 to-black ${
        sticky ? "fixed bottom-0 left-0 w-full z-40" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 pb-12">
        {/* Top grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-32 h-12 rounded bg-white p-2 flex items-center justify-center shadow-md"
                aria-hidden
              >
                <img
                  src={Logo || FallbackLogo}
                  alt="Company logo"
                  className="w-full h-full object-contain"
                  onError={handleImgError}
                  loading="lazy"
                />
              </div>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed">
              Intelligent and data-driven financial planning for advisors and investors — clear insights and better outcomes.
            </p>

            <div className="flex items-center gap-3 mt-2">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                title="Twitter"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/6 hover:bg-lime-400 hover:text-black transition focus:outline-none focus:ring-2 focus:ring-lime-400"
              >
                <FaTwitter className="w-4 h-4" aria-hidden />
              </a>

              <a
                href="https://www.linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                title="LinkedIn"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/6 hover:bg-lime-400 hover:text-black transition focus:outline-none focus:ring-2 focus:ring-lime-400"
              >
                <FaLinkedin className="w-4 h-4" aria-hidden />
              </a>

              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                title="Facebook"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/6 hover:bg-lime-400 hover:text-black transition focus:outline-none focus:ring-2 focus:ring-lime-400"
              >
                <FaFacebookF className="w-3.5 h-3.5" aria-hidden />
              </a>

              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                title="GitHub"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/6 hover:bg-lime-400 hover:text-black transition focus:outline-none focus:ring-2 focus:ring-lime-400"
              >
                <FaGithub className="w-4 h-4" aria-hidden />
              </a>

              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                title="Instagram"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/6 hover:bg-lime-400 hover:text-black transition focus:outline-none focus:ring-2 focus:ring-lime-400"
              >
                <FaInstagram className="w-4 h-4" aria-hidden />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 tracking-wide">Product</h4>
            <ul className="space-y-3 text-sm text-slate-300">
              <li><a className="hover:text-lime-400 transition" href="/features">Features</a></li>
              <li><a className="hover:text-lime-400 transition" href="/pricing">Pricing</a></li>
              <li><a className="hover:text-lime-400 transition" href="/integrations">Integrations</a></li>
              <li><a className="hover:text-lime-400 transition" href="/api">Developer API</a></li>
              <li><a className="hover:text-lime-400 transition" href="/changelog">Changelog</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 tracking-wide">Resources</h4>
            <ul className="space-y-3 text-sm text-slate-300">
              <li><a className="hover:text-lime-400 transition" href="/blog">Blog</a></li>
              <li><a className="hover:text-lime-400 transition" href="/help">Help Center</a></li>
              <li><a className="hover:text-lime-400 transition" href="/community">Community</a></li>
              <li><a className="hover:text-lime-400 transition" href="/guides">Guides</a></li>
              <li><a className="hover:text-lime-400 transition" href="/security">Security</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 tracking-wide">Company</h4>
            <ul className="space-y-3 text-sm text-slate-300">
              <li><a className="hover:text-lime-400 transition" href="/about">About Us</a></li>
              <li><a className="hover:text-lime-400 transition" href="/careers">Careers</a></li>
              <li><a className="hover:text-lime-400 transition" href="/press">Press</a></li>
              <li><a className="hover:text-lime-400 transition" href="/partners">Partners</a></li>
              <li><a className="hover:text-lime-400 transition" href="/contact">Contact</a></li>
            </ul>
          </div>

          {/* Newsletter & partners */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white tracking-wide">Get our newsletter</h4>

            <form onSubmit={handleSubscribe} noValidate className="flex gap-2" aria-label="Subscribe to newsletter">
              <label htmlFor="footer-email" className="sr-only">Email</label>
              <input
                id="footer-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setStatus("idle");
                  setError("");
                }}
                placeholder="your@email.com"
                className="flex-1 px-4 py-3 rounded-l-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                aria-label="Email address"
                required
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className={`inline-flex items-center gap-2 px-4 py-3 rounded-r-md font-medium transition
                  ${status === "sending" ? "bg-blue-300 text-white" : "bg-blue-800 text-white hover:bg-blue-600"}`}
                aria-live="polite"
                aria-busy={status === "sending"}
                title="Subscribe"
              >
                <HiOutlineMail className="w-5 h-5" aria-hidden />
                <span className="text-sm">
                  {status === "success" ? "Subscribed" : status === "sending" ? "Sending..." : "Subscribe"}
                </span>
              </button>
            </form>

            {/* status message */}
            <div aria-live="polite" className="min-h-[1.25rem]">
              {status === "error" && error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
              {status === "success" && <p className="text-xs text-lime-400 mt-1">Thanks — you'll get our next update.</p>}
            </div>

            {/* partners row (direct imports only) */}
            <div className="pt-3">
              <p className="text-xs text-slate-400 mb-2">Trusted by</p>
              <div className="flex items-center gap-4 flex-wrap">
                <img src={Logo1 || FallbackLogo} alt="partner-1" className="h-6 object-contain filter grayscale hover:grayscale-0 opacity-80 hover:opacity-100 transition" loading="lazy" onError={handleImgError} />
                <img src={Logo2 || FallbackLogo} alt="partner-2" className="h-6 object-contain filter grayscale hover:grayscale-0 opacity-80 hover:opacity-100 transition" loading="lazy" onError={handleImgError} />
                <img src={Logo3 || FallbackLogo} alt="partner-3" className="h-6 object-contain filter grayscale hover:grayscale-0 opacity-80 hover:opacity-100 transition" loading="lazy" onError={handleImgError} />
                <img src={Logo4 || FallbackLogo} alt="partner-4" className="h-6 object-contain filter grayscale hover:grayscale-0 opacity-80 hover:opacity-100 transition" loading="lazy" onError={handleImgError} />
              </div>
            </div>
          </div>
        </div>

        {/* divider */}
        <div className="mt-12 border-t border-slate-800" />

        {/* Bottom row */}
        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="text-center md:text-left">
            <p>© {year} YourFinanceCo. All rights reserved.</p>
            <p className="mt-1">
              Support:{" "}
              <a href="tel:+18005550123" className="hover:text-white">1-800-555-0123</a>{" "}
              |{" "}
              <a href="mailto:support@yourfinanceco.com" className="hover:text-white">support@yourfinanceco.com</a>
            </p>
          </div>

          <div className="flex items-center gap-6">
            <a href="/terms" className="hover:text-white">Terms</a>
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <a href="/cookies" className="hover:text-white">Cookies</a>
            <a href="/sitemap" className="hover:text-white">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
