// // // src/presenters/auth.presenter.js
// // const bcrypt = require("bcrypt");
// // const { findByEmail, createUser } = require("../models/user.model");
// // const { insertToken, findByUserIdOrdered, revokeById, revokeAllForUser } = require("../models/refreshToken.model");
// // const { signAccessToken, signRefreshToken, hashToken, compareTokenHash, verifyRefreshToken } = require("../utils/tokens.util");

// // const REFRESH_MAX_AGE_MS = 7 * 24 * 3600 * 1000;

// // async function signupPresenter({ fullName, email, password }) {
// //   const existing = await findByEmail(email);
// //   if (existing.length > 0) {
// //     const err = new Error("Email already used");
// //     err.status = 409;
// //     throw err;
// //   }
// //   const passwordHash = await bcrypt.hash(password, 12);
// //   const userId = await createUser({ fullName, email, passwordHash });
// //   return { userId };
// // }

// // async function loginPresenter({ email, password }) {
// //   const rows = await findByEmail(email);
// //   if (!rows.length) {
// //     const err = new Error("Invalid credentials");
// //     err.status = 401;
// //     throw err;
// //   }
// //   const user = rows[0];
// //   const ok = await bcrypt.compare(password, user.password_hash);
// //   if (!ok) {
// //     const err = new Error("Invalid credentials");
// //     err.status = 401;
// //     throw err;
// //   }

// //   const payload = { userId: user.user_id, email };
// //   const accessToken = await signAccessToken(payload);
// //   const refreshToken = await signRefreshToken(payload);
// //   const refreshHash = await hashToken(refreshToken);
// //   const expiresAt = new Date(Date.now() + REFRESH_MAX_AGE_MS);

// //   await insertToken({ userId: user.user_id, tokenHash: refreshHash, expiresAt });

// //   return {
// //     accessToken,
// //     refreshToken,
// //     profileCompleted: !!user.profile_completed,
// //     fullName: user.full_name
// //   };
// // }

// // async function refreshPresenter(refreshToken) {
// //   if (!refreshToken) {
// //     const err = new Error("No refresh token");
// //     err.status = 401;
// //     throw err;
// //   }

// //   // verify signature
// //   let payload;
// //   try {
// //     payload = await verifyRefreshToken(refreshToken);
// //   } catch (e) {
// //     const err = new Error("Invalid refresh token");
// //     err.status = 401;
// //     throw err;
// //   }

// //   // find matching token rows
// //   const rows = await findByUserIdOrdered(payload.userId);
// //   if (!rows.length) {
// //     const err = new Error("Refresh token not recognized");
// //     err.status = 401;
// //     throw err;
// //   }

// //   let matched = null;
// //   for (const r of rows) {
// //     if (r.revoked) continue;
// //     if (new Date(r.expires_at) < new Date()) continue;
// //     const matches = await compareTokenHash(refreshToken, r.token_hash);
// //     if (matches) { matched = r; break; }
// //   }

// //   if (!matched) {
// //     const err = new Error("Refresh token not recognized");
// //     err.status = 401;
// //     throw err;
// //   }

// //   // rotate token
// //   const newRefreshToken = await signRefreshToken({ userId: payload.userId, email: payload.email || "" });
// //   const newHash = await hashToken(newRefreshToken);
// //   const expiresAt = new Date(Date.now() + REFRESH_MAX_AGE_MS);

// //   // revoke old; insert new
// //   await revokeById(matched.id);
// //   await insertToken({ userId: payload.userId, tokenHash: newHash, expiresAt });

// //   const accessToken = await signAccessToken({ userId: payload.userId, email: payload.email || "" });

// //   return { accessToken, newRefreshToken };
// // }

// // async function logoutPresenter(refreshToken) {
// //   if (!refreshToken) return;
// //   try {
// //     const payload = await verifyRefreshToken(refreshToken);
// //     if (payload && payload.userId) {
// //       await revokeAllForUser(payload.userId);
// //     }
// //   } catch (e) {
// //     // ignore invalid token on logout but still clear cookie in view
// //   }
// // }

// // module.exports = { signupPresenter, loginPresenter, refreshPresenter, logoutPresenter };


// // src/presenters/auth.presenter.js
// import bcrypt from "bcrypt";
// import { findByEmail, createUser } from "../models/user.model.js";
// import {
//   insertToken,
//   findByUserIdOrdered,
//   revokeById,
//   revokeAllForUser
// } from "../models/refreshToken.model.js";
// import {
//   signAccessToken,
//   signRefreshToken,
//   hashToken,
//   compareTokenHash,
//   verifyRefreshToken
// } from "../utils/tokens.util.js";

// const REFRESH_MAX_AGE_MS = 7 * 24 * 3600 * 1000;

// export async function signupPresenter({ fullName, email, password }) {
//   const existing = await findByEmail(email);
//   if (existing.length > 0) {
//     const err = new Error("Email already used");
//     err.status = 409;
//     throw err;
//   }
//   const passwordHash = await bcrypt.hash(password, 12);
//   const userId = await createUser({ fullName, email, passwordHash });
//   return { userId };
// }

// export async function loginPresenter({ email, password }) {
//   const rows = await findByEmail(email);
//   if (!rows.length) {
//     const err = new Error("Invalid credentials");
//     err.status = 401;
//     throw err;
//   }
//   const user = rows[0];
//   const ok = await bcrypt.compare(password, user.password_hash);
//   if (!ok) {
//     const err = new Error("Invalid credentials");
//     err.status = 401;
//     throw err;
//   }

//   const payload = { userId: user.user_id, email };
//   const accessToken = await signAccessToken(payload);
//   const refreshToken = await signRefreshToken(payload);
//   const refreshHash = await hashToken(refreshToken);
//   const expiresAt = new Date(Date.now() + REFRESH_MAX_AGE_MS);

//   await insertToken({ userId: user.user_id, tokenHash: refreshHash, expiresAt });

//   return {
//     accessToken,
//     refreshToken,
//     profileCompleted: !!user.profile_completed,
//     fullName: user.full_name
//   };
// }

// export async function refreshPresenter(refreshToken) {
//   if (!refreshToken) {
//     const err = new Error("No refresh token");
//     err.status = 401;
//     throw err;
//   }

//   // verify signature
//   let payload;
//   try {
//     payload = await verifyRefreshToken(refreshToken);
//   } catch (e) {
//     const err = new Error("Invalid refresh token");
//     err.status = 401;
//     throw err;
//   }

//   // find matching token rows
//   const rows = await findByUserIdOrdered(payload.userId);
//   if (!rows.length) {
//     const err = new Error("Refresh token not recognized");
//     err.status = 401;
//     throw err;
//   }

//   let matched = null;
//   for (const r of rows) {
//     if (r.revoked) continue;
//     if (new Date(r.expires_at) < new Date()) continue;
//     const matches = await compareTokenHash(refreshToken, r.token_hash);
//     if (matches) { matched = r; break; }
//   }

//   if (!matched) {
//     const err = new Error("Refresh token not recognized");
//     err.status = 401;
//     throw err;
//   }

//   // rotate token
//   const newRefreshToken = await signRefreshToken({ userId: payload.userId, email: payload.email || "" });
//   const newHash = await hashToken(newRefreshToken);
//   const expiresAt = new Date(Date.now() + REFRESH_MAX_AGE_MS);

//   // revoke old; insert new
//   await revokeById(matched.id);
//   await insertToken({ userId: payload.userId, tokenHash: newHash, expiresAt });

//   const accessToken = await signAccessToken({ userId: payload.userId, email: payload.email || "" });

//   return { accessToken, newRefreshToken };
// }

// export async function logoutPresenter(refreshToken) {
//   if (!refreshToken) return;
//   try {
//     const payload = await verifyRefreshToken(refreshToken);
//     if (payload && payload.userId) {
//       await revokeAllForUser(payload.userId);
//     }
//   } catch (e) {
//     // ignore invalid token on logout but still clear cookie in view
//   }
// }

// src/presenters/auth.presenter.js
import bcrypt from "bcrypt";
import { findByEmail, createUser } from "../models/user.model.js";
import {
  insertToken,
  findByUserIdOrdered,
  revokeById,
  revokeAllForUser
} from "../models/refreshToken.model.js";
import {
  signAccessToken,
  signRefreshToken,
  hashToken,
  compareTokenHash,
  verifyRefreshToken
} from "../utils/tokens.util.js";

const REFRESH_MAX_AGE_MS = 7 * 24 * 3600 * 1000; // 7 days

/**
 * Signup presenter: creates user if email not taken.
 * Returns { userId } on success.
 */
export async function signupPresenter({ fullName, email, password }) {
  const existing = await findByEmail(email);
  if (existing.length > 0) {
    const err = new Error("Email already used");
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = await createUser({ fullName, email, passwordHash });

  return { userId };
}

/**
 * Login presenter: validates credentials, issues access + refresh tokens,
 * stores a hashed refresh token in DB, returns tokens + profile flags.
 */
export async function loginPresenter({ email, password }) {
  const rows = await findByEmail(email);
  if (!rows.length) {
    const err = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }

  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    const err = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }

  const payload = { userId: user.user_id, email };
  const accessToken = await signAccessToken(payload);
  const refreshToken = await signRefreshToken(payload);
  const refreshHash = await hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_MAX_AGE_MS);

  await insertToken({ userId: user.user_id, tokenHash: refreshHash, expiresAt });

  return {
    accessToken,
    refreshToken,
    profileCompleted: !!user.profile_completed,
    fullName: user.full_name
  };
}

/**
 * Refresh presenter: validates the provided refresh token, rotates it,
 * revokes the old DB row, inserts a new hashed token row, returns new tokens.
 */
export async function refreshPresenter(refreshToken) {
  if (!refreshToken) {
    const err = new Error("No refresh token");
    err.status = 401;
    throw err;
  }

  // verify signature and payload
  let payload;
  try {
    payload = await verifyRefreshToken(refreshToken);
  } catch (e) {
    const err = new Error("Invalid refresh token");
    err.status = 401;
    throw err;
  }

  // find token rows for user (ordered newest first)
  const rows = await findByUserIdOrdered(payload.userId);
  if (!rows.length) {
    const err = new Error("Refresh token not recognized");
    err.status = 401;
    throw err;
  }

  // find matching non-revoked, non-expired token by comparing hashes
  let matched = null;
  for (const r of rows) {
    if (r.revoked) continue;
    if (r.expires_at && new Date(r.expires_at) < new Date()) continue;
    const matches = await compareTokenHash(refreshToken, r.token_hash);
    if (matches) {
      matched = r;
      break;
    }
  }

  if (!matched) {
    const err = new Error("Refresh token not recognized");
    err.status = 401;
    throw err;
  }

  // rotate token: revoke old, insert new
  const newRefreshToken = await signRefreshToken({ userId: payload.userId, email: payload.email || "" });
  const newHash = await hashToken(newRefreshToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_MAX_AGE_MS);

  await revokeById(matched.id);
  await insertToken({ userId: payload.userId, tokenHash: newHash, expiresAt: newExpiresAt });

  const accessToken = await signAccessToken({ userId: payload.userId, email: payload.email || "" });

  return { accessToken, newRefreshToken };
}

/**
 * Logout presenter: revoke all refresh tokens associated with this token's user.
 */
export async function logoutPresenter(refreshToken) {
  if (!refreshToken) return;
  try {
    const payload = await verifyRefreshToken(refreshToken);
    if (payload && payload.userId) {
      await revokeAllForUser(payload.userId);
    }
  } catch (e) {
    // ignore invalid token on logout but still clear cookie in view
  }
}
