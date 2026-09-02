// src/views/me.routes.js
import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const [acctRows] = await pool.query(
      "SELECT user_id, full_name, email, profile_completed FROM user_accounts WHERE user_id = ?",
      [req.user.userId]
    );
    if (acctRows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json({ account: acctRows[0], profileCompleted: !!acctRows[0].profile_completed });
  } catch (err) {
    next(err);
  }
});

export default router;
