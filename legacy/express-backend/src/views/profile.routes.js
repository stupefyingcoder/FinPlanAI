// // src/views/profile.routes.js
// const express = require("express");
// const router = express.Router();
// const { upsertProfilePresenter, getProfilePresenter } = require("../presenters/profile.presenter");

// router.post("/", async (req, res, next) => {
//   try {
//     const userId = req.user.userId;
//     const result = await upsertProfilePresenter(userId, req.body);
//     res.json(result);
//   } catch (err) { next(err); }
// });

// router.get("/", async (req, res, next) => {
//   try {
//     const userId = req.user.userId;
//     const profile = await getProfilePresenter(userId);
//     res.json({ profile });
//   } catch (err) { next(err); }
// });

// module.exports = router;

// src/views/profile.routes.js
import express from "express";
import { upsertProfilePresenter, getProfilePresenter } from "../presenters/profile.presenter.js";

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await upsertProfilePresenter(userId, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const profile = await getProfilePresenter(userId);
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

export default router;
