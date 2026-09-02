// // // src/config/index.js
// // const dotenv = require("dotenv");
// // dotenv.config();

// // module.exports = {
// //   PORT: process.env.PORT || 5000,
// //   DB_HOST: process.env.DB_HOST,
// //   DB_USER: process.env.DB_USER,
// //   DB_PASS: process.env.DB_PASS,
// //   DB_NAME: process.env.DB_NAME,
// //   JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
// //   JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
// //   ACCESS_TOKEN_EXPIRES: process.env.ACCESS_TOKEN_EXPIRES_IN || "900s",
// //   REFRESH_TOKEN_EXPIRES: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
// //   COOKIE_SECURE: process.env.COOKIE_SECURE === "true",
// //   COOKIE_SAMESITE: process.env.COOKIE_SAMESITE || "Lax"
// // };

// // src/config/index.js
// // src/config/index.js
// import dotenv from "dotenv";
// dotenv.config();

// export const PORT = process.env.PORT || 5000;
// export const DB_HOST = process.env.DB_HOST;
// export const DB_PORT = process.env.DB_PORT; // parse as int where needed
// export const DB_USER = process.env.DB_USER;
// export const DB_PASS = process.env.DB_PASS;
// export const DB_NAME = process.env.DB_NAME;

// export const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
// export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
// export const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES_IN || "900s";
// export const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

// export const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";
// export const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || "Lax";

// // ADD THIS - frontend origin used by server.js for CORS
// export const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

// src/config/index.js
import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 5000;
export const DB_HOST = process.env.DB_HOST;
export const DB_PORT = process.env.DB_PORT; // parse as int where needed
export const DB_USER = process.env.DB_USER;
export const DB_PASS = process.env.DB_PASS;
export const DB_NAME = process.env.DB_NAME;

// TiDB SSL CA path
export const DB_SSL_CA_PATH = process.env.DB_SSL_CA_PATH; // <- Add this

export const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
export const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES_IN || "900s";
export const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

export const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";
export const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || "Lax";

export const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
