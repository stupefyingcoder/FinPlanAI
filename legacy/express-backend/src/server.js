import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet"; // optional but recommended
import morgan from "morgan"; // optional (dev logging)

import { PORT, COOKIE_SAMESITE, FRONTEND_ORIGIN } from "./config/index.js";
import authRoutes from "./views/auth.routes.js";
import profileRoutes from "./views/profile.routes.js";
import meRoutes from "./views/me.routes.js";
import { requireAuth } from "./middlewares/auth.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

// Middlewares
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// CORS - allow credentials and the configured frontend origin (default to http://localhost:3000)
const allowedOrigin = FRONTEND_ORIGIN || process.env.FRONTEND_ORIGIN || "http://localhost:3000";
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// simple health check
app.get("/health", (req, res) => res.json({ ok: true, now: new Date().toISOString() }));

/* AUTH */
app.use("/auth", authRoutes);

/* Protected profile & me */
app.use("/api/profile", requireAuth, profileRoutes);
app.use("/api/me", requireAuth, meRoutes);

/* error handler (last) */
app.use(errorHandler);

const port = process.env.PORT || 5001; // Change 5000 to 5001
app.listen(port, () => console.log(`Server started on ${port}`));
