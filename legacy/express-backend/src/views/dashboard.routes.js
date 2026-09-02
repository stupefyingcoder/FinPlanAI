const express = require("express");
const router = express.Router();
const db = require("../db"); // adjust to your db connection file
const { requireAuth } = require("../middlewares/auth.middleware");

// GET dashboard data by userId (must match logged-in user)
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);

    // ✅ prevent access to other users' data
    if (userId !== req.user.userId) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const result = await db.query("SELECT * FROM user_profile WHERE user_id = $1", [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No dashboard data found for this user." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET dashboard data for current logged-in user
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.userId; // ✅ always use userId
    const result = await db.query("SELECT * FROM user_profile WHERE user_id = $1", [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No dashboard data found for current user." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
