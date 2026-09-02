// src/utils/cookies.util.js
import { COOKIE_SECURE, COOKIE_SAMESITE } from "../config/index.js";

/**
 * Set the refresh token cookie.
 * @param {import("express").Response} res
 * @param {string} token
 * @param {number} maxAgeMs
 */
export function setRefreshCookie(res, token, maxAgeMs) {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    secure: !!COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE || "Lax",
    maxAge: maxAgeMs,
    path: "/"
  });
}

/**
 * Clear the refresh token cookie.
 * @param {import("express").Response} res
 */
export function clearRefreshCookie(res) {
  res.clearCookie("refresh_token", { path: "/" });
}
