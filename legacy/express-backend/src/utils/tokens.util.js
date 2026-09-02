// // src/utils/tokens.util.js
// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcrypt");
// const { promisify } = require("util");
// const jwtVerify = promisify(jwt.verify);
// const {
//   JWT_ACCESS_SECRET,
//   JWT_REFRESH_SECRET,
//   ACCESS_TOKEN_EXPIRES,
//   REFRESH_TOKEN_EXPIRES,
// } = require("../config");

// async function signAccessToken(payload) {
//   return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
// }
// async function signRefreshToken(payload) {
//   return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES });
// }
// async function verifyAccessToken(token) {
//   return jwtVerify(token, JWT_ACCESS_SECRET);
// }
// async function verifyRefreshToken(token) {
//   return jwtVerify(token, JWT_REFRESH_SECRET);
// }

// async function hashToken(token) {
//   const saltRounds = 10;
//   return bcrypt.hash(token, saltRounds);
// }
// async function compareTokenHash(token, hash) {
//   return bcrypt.compare(token, hash);
// }

// module.exports = {
//   signAccessToken,
//   signRefreshToken,
//   verifyAccessToken,
//   verifyRefreshToken,
//   hashToken,
//   compareTokenHash
// };


// src/utils/tokens.util.js
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { promisify } from "util";
import {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_TOKEN_EXPIRES,
  REFRESH_TOKEN_EXPIRES
} from "../config/index.js";

const jwtVerify = promisify(jwt.verify);

export async function signAccessToken(payload) {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
}

export async function signRefreshToken(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES });
}

export async function verifyAccessToken(token) {
  return jwtVerify(token, JWT_ACCESS_SECRET);
}

export async function verifyRefreshToken(token) {
  return jwtVerify(token, JWT_REFRESH_SECRET);
}

export async function hashToken(token) {
  const saltRounds = 10;
  return bcrypt.hash(token, saltRounds);
}

export async function compareTokenHash(token, hash) {
  return bcrypt.compare(token, hash);
}
