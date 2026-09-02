// // src/middlewares/auth.middleware.js
// const { verifyAccessToken } = require("../utils/tokens.util");
// const { findById } = require("../models/user.model");

// async function requireAuth(req, res, next) {
//   try {
//     const authHeader = req.headers.authorization;
//     if (!authHeader) return res.status(401).json({ error: "Missing authorization" });
//     const parts = authHeader.split(" ");
//     if (parts.length !== 2 || parts[0] !== "Bearer") return res.status(401).json({ error: "Invalid authorization header" });

//     const token = parts[1];
//     let payload;
//     try {
//       payload = await verifyAccessToken(token);
//     } catch (e) {
//       return res.status(401).json({ error: "Invalid or expired access token" });
//     }

//     const users = await findById(payload.userId);
//     if (!users.length) return res.status(401).json({ error: "User not found" });
//     const u = users[0];
//     req.user = { userId: u.user_id || u.userId || payload.userId, profileCompleted: !!u.profile_completed, email: u.email };
//     next();
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server error" });
//   }
// }

// module.exports = { requireAuth };
// src/middlewares/auth.middleware.js
// const { verifyAccessToken } = require("../utils/tokens.util");
// const { findById } = require("../models/user.model");

// async function requireAuth(req, res, next) {
//   try {
//     const authHeader = req.headers.authorization;
//     if (!authHeader) return res.status(401).json({ error: "Missing authorization" });
//     const parts = authHeader.split(" ");
//     if (parts.length !== 2 || parts[0] !== "Bearer")
//       return res.status(401).json({ error: "Invalid authorization header" });

//     const token = parts[1];
//     let payload;
//     try {
//       payload = await verifyAccessToken(token);
//     } catch (e) {
//       return res.status(401).json({ error: "Invalid or expired access token" });
//     }

//     // findById currently returns an array — keep that check
//     const users = await findById(payload.userId);
//     if (!users || !users.length) return res.status(401).json({ error: "User not found" });
//     const u = users[0];

//     // normalize numeric id and expose both id and userId for compatibility
//     const resolvedId = Number(u.user_id ?? u.userId ?? payload.userId);
//     const normalizedId = Number.isFinite(resolvedId) ? resolvedId : null;

//     req.user = {
//       // modern/short form many routes expect
//       id: normalizedId,
//       // keep the original key too so other code that checks .userId still works
//       userId: normalizedId,
//       profileCompleted: !!u.profile_completed,
//       email: u.email,
//     };

//     // helpful debug (remove or guard behind env check in production)
//     console.log("requireAuth attached req.user =", req.user);

//     next();
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server error" });
//   }
// }

// module.exports = { requireAuth };
// src/middlewares/auth.middleware.js
import { verifyAccessToken } from "../utils/tokens.util.js";
import { findById } from "../models/user.model.js";

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing authorization" });
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer")
      return res.status(401).json({ error: "Invalid authorization header" });

    const token = parts[1];
    let payload;
    try {
      payload = await verifyAccessToken(token);
    } catch (e) {
      return res.status(401).json({ error: "Invalid or expired access token" });
    }

    const users = await findById(payload.userId);
    if (!users || !users.length) return res.status(401).json({ error: "User not found" });
    const u = users[0];

    const resolvedId = Number(u.user_id ?? u.userId ?? payload.userId);
    const normalizedId = Number.isFinite(resolvedId) ? resolvedId : null;

    req.user = {
      id: normalizedId,
      userId: normalizedId,
      profileCompleted: !!u.profile_completed,
      email: u.email,
    };

    console.log("requireAuth attached req.user =", req.user);

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
