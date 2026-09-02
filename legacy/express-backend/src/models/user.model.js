// // src/models/user.model.js
// const pool = require("../db");

// async function findByEmail(email) {
//   const [rows] = await pool.query("SELECT user_id, password_hash, profile_completed, full_name, email FROM user_accounts WHERE email = ?", [email]);
//   return rows;
// }
// async function findById(userId) {
//   const [rows] = await pool.query("SELECT user_id, full_name, email, profile_completed FROM user_accounts WHERE user_id = ?", [userId]);
//   return rows;
// }
// async function createUser({ fullName, email, passwordHash }) {
//   const [result] = await pool.query(
//     "INSERT INTO user_accounts (full_name, email, password_hash) VALUES (?, ?, ?)",
//     [fullName, email, passwordHash]
//   );
//   return result.insertId;
// }
// async function setProfileCompleted(userId) {
//   await pool.query("UPDATE user_accounts SET profile_completed = 1 WHERE user_id = ?", [userId]);
// }

// module.exports = { findByEmail, findById, createUser, setProfileCompleted };

// src/models/user.model.js
import pool from "../db.js";

// find user rows by email
export async function findByEmail(email) {
  const [rows] = await pool.execute(
    "SELECT user_id, password_hash, profile_completed, full_name, email FROM user_accounts WHERE email = ?",
    [email]
  );
  return rows;
}

// find user rows by id
export async function findById(userId) {
  const [rows] = await pool.execute(
    "SELECT user_id, full_name, email, profile_completed FROM user_accounts WHERE user_id = ?",
    [userId]
  );
  return rows;
}

// create a new user, return inserted id
export async function createUser({ fullName, email, passwordHash }) {
  const [result] = await pool.execute(
    "INSERT INTO user_accounts (full_name, email, password_hash) VALUES (?, ?, ?)",
    [fullName, email, passwordHash]
  );
  return result.insertId;
}

// mark profile as completed
export async function setProfileCompleted(userId) {
  await pool.execute(
    "UPDATE user_accounts SET profile_completed = 1 WHERE user_id = ?",
    [userId]
  );
}
