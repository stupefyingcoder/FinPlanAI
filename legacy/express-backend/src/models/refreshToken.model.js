// // src/models/refreshToken.model.js
// const pool = require("../db");

// async function insertToken({ userId, tokenHash, expiresAt }) {
//   return pool.query("INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)", [userId, tokenHash, expiresAt]);
// }

// async function findByUserIdOrdered(userId) {
//   const [rows] = await pool.query("SELECT id, token_hash, expires_at, revoked, created_at FROM refresh_tokens WHERE user_id = ? ORDER BY created_at DESC", [userId]);
//   return rows;
// }

// async function revokeById(id) {
//   return pool.query("UPDATE refresh_tokens SET revoked = 1 WHERE id = ?", [id]);
// }

// async function revokeAllForUser(userId) {
//   return pool.query("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?", [userId]);
// }

// module.exports = { insertToken, findByUserIdOrdered, revokeById, revokeAllForUser };

// src/models/refreshToken.model.js
import pool from "../db.js";

/**
 * Insert a refresh token row.
 * @param {{ userId: number, tokenHash: string, expiresAt: Date }} param0
 * @returns {Promise<number>} inserted id
 */
export async function insertToken({ userId, tokenHash, expiresAt }) {
  const sql = `
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
  `;
  const [result] = await pool.execute(sql, [userId, tokenHash, expiresAt]);
  return result.insertId;
}

/**
 * Get all refresh-token rows for a user, ordered newest first.
 * @param {number} userId
 * @returns {Promise<Array>}
 */
export async function findByUserIdOrdered(userId) {
  const sql = `
    SELECT id, user_id, token_hash, expires_at, revoked, created_at
    FROM refresh_tokens
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;
  const [rows] = await pool.execute(sql, [userId]);
  return rows;
}

/**
 * Revoke (mark revoked = 1) a single refresh token by id.
 * @param {number} id
 * @returns {Promise<number>} affectedRows
 */
export async function revokeById(id) {
  const sql = `UPDATE refresh_tokens SET revoked = 1 WHERE id = ?`;
  const [result] = await pool.execute(sql, [id]);
  return result.affectedRows;
}

/**
 * Revoke all refresh tokens for a user.
 * @param {number} userId
 * @returns {Promise<number>} affectedRows
 */
export async function revokeAllForUser(userId) {
  const sql = `UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?`;
  const [result] = await pool.execute(sql, [userId]);
  return result.affectedRows;
}
