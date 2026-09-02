
// // export async function upsert(profileData) {
// //   if (!profileData || typeof profileData !== "object") {
// //     throw new Error("profileData must be an object");
// //   }
// //   const userId = profileData.user_id ?? profileData.userId ?? profileData.user_id;
// //   if (!userId) throw new Error("Missing user_id in profileData");

// //   // Ensure columns are strings and values are provided in the same order
// //   const cols = Object.keys(profileData);
// //   if (cols.length === 0) throw new Error("Empty profileData");

// //   // Build placeholders and update clause
// //   const placeholders = cols.map(() => "?").join(", ");
// //   // Use VALUES(col) to update columns on duplicate key
// //   const updateClause = cols.map((c) => `${c} = VALUES(${c})`).join(", ");

// //   const sql = `INSERT INTO user_profile (${cols.join(", ")})
// //     VALUES (${placeholders})
// //     ON DUPLICATE KEY UPDATE ${updateClause}`;

// //   const values = cols.map((k) => {
// //     // If values are objects/arrays, store as JSON strings
// //     const val = profileData[k];
// //     if (val === undefined) return null;
// //     if (val === null) return null;
// //     // leave strings/numbers/dates as-is
// //     if (typeof val === "object") {
// //       try {
// //         return JSON.stringify(val);
// //       } catch {
// //         return String(val);
// //       }
// //     }
// //     return val;
// //   });

// //   const [result] = await pool.query(sql, values);
// //   return result;
// // }

// // /**
// //  * Compatibility wrapper (keeps older name working if other code calls it)
// //  * Accepts userId and a `flat` object of DB columns (legacy naming).
// //  */
// // export async function upsertFlatProfile(userId, flat) {
// //   if (!userId && (!flat || !flat.user_id)) {
// //     throw new Error("Missing user id for upsertFlatProfile");
// //   }
// //   // ensure flat has user_id column
// //   const payload = { ...flat, user_id: userId ?? flat.user_id };
// //   return upsert(payload);
// // }

// // /**
// //  * Get a single profile row by user_id
// //  */
// // export async function getByUserId(userId) {
// //   if (!userId) return null;
// //   const [rows] = await pool.query("SELECT * FROM user_profile WHERE user_id = ? LIMIT 1", [userId]);
// //   if (!rows || rows.length === 0) return null;
// //   return rows[0];
// // }

// // // keep previous name too if some modules call getProfileByUserId
// // export async function getProfileByUserId(userId) {
// //   return getByUserId(userId);
// // }

// // // default export (works with `import profileModel from "./profile.model.js"`)
// // export default {
// //   upsert,
// //   upsertFlatProfile,
// //   getByUserId,
// //   getProfileByUserId,
// // };

// // src/models/profile.model.js
// // import pool from "../db.js";

// // /**
// //  * Allowed columns in your user_profile table (adjust if your schema differs).
// //  * These names must match the actual DB column names exactly.
// //  */
// // const ALLOWED_COLUMNS = [
// //   "user_id",
// //   "full_name",
// //   "dob",
// //   "age",
// //   "gender",
// //   "occupation",
// //   "marital_status",
// //   "dependents_count",
// //   "dependents_ages",
// //   "phone",
// //   "address_line",
// //   "city",
// //   "state",
// //   "monthly_income",
// //   "monthly_expenses",
// //   "monthly_savings_amt",
// //   "monthly_savings_pct",
// //   "annual_income",
// //   "annual_income_band",
// //   "investable_assets",
// //   "investable_assets_band",
// //   "outstanding_debt",
// //   "outstanding_debt_band",
// //   "has_loans",
// //   "loan_types",
// //   "approx_emi",
// //   "primary_goal",
// //   "goal_target",
// //   "goal_timeline_years",
// //   "goals",
// //   "pref_instruments",
// //   "preferred_assets",
// //   "invest_horizon",
// //   "risk_level",
// //   "risk_score",
// //   "experience_level",
// //   "health_insurance",
// //   "life_insurance",
// //   "insurance_policies",
// //   "emergency_fund",
// //   "desired_emergency_months",
// //   "tax_bracket",
// //   "filing_status",
// //   "employment_type",
// //   "employer",
// //   "collected_at",
// //   "created_at",
// //   "updated_at"
// // ];

// // /**
// //  * Utility: convert JS value -> SQL value for query binding.
// //  * - objects/arrays are JSON-stringified
// //  * - undefined -> null
// //  */
// // function sqlValue(v) {
// //   if (v === undefined) return null;
// //   if (v === null) return null;
// //   if (typeof v === "object") {
// //     try { return JSON.stringify(v); } catch { return String(v); }
// //   }
// //   return v;
// // }

// // /**
// //  * Upsert: accepts profileData (flat object keyed by DB column names).
// //  * Will only use keys present in ALLOWED_COLUMNS.
// //  */
// // export async function upsert(profileData) {
// //   if (!profileData || typeof profileData !== "object") {
// //     throw new Error("profileData must be an object");
// //   }

// //   // Ensure user_id present (use common fallbacks)
// //   const userId = profileData.user_id ?? profileData.userId ?? profileData.id;
// //   if (!userId) throw new Error("Missing user_id in profileData");

// //   // Filter incoming keys to only allowed columns (and ensure user_id present)
// //   const cols = Object.keys(profileData)
// //     .filter((k) => ALLOWED_COLUMNS.includes(k))
// //     // ensure user_id is present and first so ordering predictable (optional)
// //     .sort((a, b) => (a === "user_id" ? -1 : b === "user_id" ? 1 : 0));

// //   // Guarantee user_id in columns (if not present in incoming but found earlier)
// //   if (!cols.includes("user_id")) cols.unshift("user_id");

// //   if (cols.length === 0) throw new Error("No valid columns provided to upsert");

// //   const placeholders = cols.map(() => "?").join(", ");
// //   const updateClause = cols.map((c) => `${c} = VALUES(${c})`).join(", ");

// //   const sql = `INSERT INTO user_profile (${cols.join(", ")})
// //                VALUES (${placeholders})
// //                ON DUPLICATE KEY UPDATE ${updateClause}`;

// //   const values = cols.map((k) => {
// //     if (k === "user_id") return userId;
// //     return sqlValue(profileData[k]);
// //   });

// //   const [result] = await pool.query(sql, values);
// //   return result;
// // }

// // /**
// //  * Compatibility wrapper if you had a function named upsertFlatProfile
// //  * that previously accepted userId and a flat object.
// //  */
// // export async function upsertFlatProfile(userId, flat) {
// //   if (!userId && (!flat || !flat.user_id)) throw new Error("Missing user id for upsertFlatProfile");
// //   const payload = { ...flat, user_id: userId ?? flat.user_id };
// //   return upsert(payload);
// // }

// // /**
// //  * Get a single profile row by user_id
// //  */
// // export async function getByUserId(userId) {
// //   if (!userId) return null;
// //   const [rows] = await pool.query("SELECT * FROM user_profile WHERE user_id = ? LIMIT 1", [userId]);
// //   if (!rows || rows.length === 0) return null;
// //   return rows[0];
// // }

// // // alias for older code that might call getProfileByUserId
// // export async function getProfileByUserId(userId) {
// //   return getByUserId(userId);
// // }

// // // default export for `import profileModel from './profile.model.js'`
// // export default {
// //   upsert,
// //   upsertFlatProfile,
// //   getByUserId,
// //   getProfileByUserId
// // };

// // src/models/profile.model.js
// import pool from "../db.js";

// /**
//  * Allowed columns in your user_profile table (adjust if your schema differs).
//  */
// const ALLOWED_COLUMNS = [
//   "user_id",
//   "full_name",
//   "dob",
//   "age",
//   "gender",
//   "occupation",
//   "marital_status",
//   "dependents_count",
//   "dependents_ages",
//   "phone",
//   "address_line",
//   "city",
//   "state",
//   "monthly_income",
//   "monthly_expenses",
//   "monthly_savings_amt",
//   "monthly_savings_pct",
//   "annual_income",
//   "annual_income_band",
//   "investable_assets",
//   "investable_assets_band",
//   "outstanding_debt",
//   "outstanding_debt_band",
//   "has_loans",
//   "loan_types",
//   "approx_emi",
//   "primary_goal",
//   "goal_target",
//   "goal_timeline_years",
//   "goals",
//   "pref_instruments",
//   "preferred_assets",
//   "invest_horizon",
//   "risk_level",
//   "risk_score",
//   "experience_level",
//   "health_insurance",
//   "life_insurance",
//   "insurance_policies",
//   "emergency_fund",
//   "desired_emergency_months",
//   "tax_bracket",
//   "filing_status",
//   "employment_type",
//   "employer",
//   "collected_at",
//   "created_at",
//   "updated_at"
// ];

// /**
//  * Try to convert a string value that may have been JSON-encoded back to its inner value.
//  * E.g. '"2007-09-03T00:00:00.000Z"' -> "2007-09-03T00:00:00.000Z"
//  * If parse yields an object/array, return that object (caller will JSON.stringify it).
//  */
// function tryJsonUnwrap(v) {
//   if (typeof v !== "string") return v;
//   const s = v.trim();
//   if (!s) return v;
//   // If it looks like JSON (starts with " or { or [), try to parse
//   if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]")) || (s.startsWith('"') && s.endsWith('"'))) {
//     try {
//       const parsed = JSON.parse(s);
//       return parsed;
//     } catch (e) {
//       return v;
//     }
//   }
//   return v;
// }

// /**
//  * Convert JS value -> SQL-binding value:
//  * - If null/undefined -> null
//  * - If object/array -> JSON string
//  * - If string that contains a JSON encoded value -> unwrap it and handle accordingly
//  * - If key === 'dob' convert to YYYY-MM-DD if possible
//  */

// src/models/profile.model.js
import pool from "../db.js";

/**
 * Allowed columns in your user_profile table
 */
const ALLOWED_COLUMNS = [
  "user_id","full_name","dob","age","gender","occupation","marital_status","dependents_count","dependents_ages",
  "phone","address_line","city","state","monthly_income","monthly_expenses","monthly_savings_amt","monthly_savings_pct",
  "annual_income","annual_income_band","investable_assets","investable_assets_band","outstanding_debt","outstanding_debt_band",
  "has_loans","loan_types","approx_emi","primary_goal","goal_target","goal_timeline_years","goals","pref_instruments",
  "preferred_assets","invest_horizon","risk_level","risk_score","experience_level","health_insurance","life_insurance",
  "insurance_policies","emergency_fund","desired_emergency_months","tax_bracket","filing_status","employment_type",
  "employer","collected_at","created_at","updated_at"
];

/* ---------- helpers ---------- */

/**
 * Aggressively unwrap/clean a string that may be JSON-encoded or escaped.
 * Examples this handles:
 * - '"2007-09-03T00:00:00.000Z"'
 * - '\"2007-09-03T00:00:00.000Z\"'
 * - '"{\"a\":1}"'
 * - '["a"]'
 */
function aggressiveUnwrapString(s) {
  if (typeof s !== "string") return s;
  let t = s.trim();

  // 1) Try direct JSON.parse first (handles plain quoted JSON, arrays, objects, primitives)
  try {
    return JSON.parse(t);
  } catch (e) {
    // continue to clean
  }

  // 2) Unescape common escaped-quote patterns
  t = t.replace(/\\"/g, '"').replace(/\\'/g, "'");

  // 3) Remove repeated wrapping quotes (both " and ')
  while ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1);
  }

  // 4) Strip leading/trailing backslashes
  while (t.startsWith("\\") || t.endsWith("\\")) {
    if (t.startsWith("\\")) t = t.slice(1);
    if (t.endsWith("\\")) t = t.slice(0, -1);
  }

  // 5) Try JSON.parse one more time
  try {
    return JSON.parse(t);
  } catch (e) {
    // final fallback to cleaned string
  }

  return t;
}

function pad(n) { return n < 10 ? "0" + n : String(n); }
function formatDateYYYYMMDD(d) {
  if (!(d instanceof Date) || isNaN(d)) return null;
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
}
function formatDatetimeMySQL(d) {
  if (!(d instanceof Date) || isNaN(d)) return null;
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth()+1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const mins = pad(d.getUTCMinutes());
  const secs = pad(d.getUTCSeconds());
  return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
}

/**
 * Clean a raw value for a given DB column.
 * - aggressively unwrap string encodings
 * - convert dob to YYYY-MM-DD
 * - convert timestamp-like fields to MySQL DATETIME
 * - JSON.stringify objects/arrays
 */
function cleanValueForColumn(key, rawVal) {
  if (rawVal === undefined) return null;
  if (rawVal === null) return null;

  // Unwrap if it's a string that was JSON-encoded or escaped
  let v = rawVal;
  if (typeof v === "string") v = aggressiveUnwrapString(v);

  // If v is now an object/array -> JSON stringify for JSON columns
  if (typeof v === "object" && v !== null) {
    try { return JSON.stringify(v); } catch { return String(v); }
  }

  // Handle DOB (DATE) -> YYYY-MM-DD
  if (key === "dob") {
    // Accept Date objects
    if (v instanceof Date && !isNaN(v)) return formatDateYYYYMMDD(v);

    // Accept numeric timestamps
    if (typeof v === "number") {
      const d = new Date(v);
      if (!isNaN(d)) return formatDateYYYYMMDD(d);
    }

    // Accept ISO strings or other date strings
    if (typeof v === "string") {
      const s = v.trim().replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "");
      // Try parse
      const d = new Date(s);
      if (!isNaN(d)) return formatDateYYYYMMDD(d);
      // If already YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      // otherwise return null (don't pass invalid)
      return null;
    }
    return null;
  }

  // Timestamp-like columns -> MySQL DATETIME
  if (key === "collected_at" || key === "created_at" || key === "updated_at") {
    if (v instanceof Date && !isNaN(v)) return formatDatetimeMySQL(v);
    if (typeof v === "number") {
      const d = new Date(v);
      if (!isNaN(d)) return formatDatetimeMySQL(d);
    }
    if (typeof v === "string") {
      const s = v.trim().replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "");
      const d = new Date(s);
      if (!isNaN(d)) return formatDatetimeMySQL(d);
      return s; // fallback to raw
    }
  }

  // Booleans -> tinyint
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") return v;

  // fallback stringify
  return String(v);
}

/* ---------- upsert/get ---------- */

export async function upsert(profileData) {
  if (!profileData || typeof profileData !== "object") throw new Error("profileData must be an object");
  const userId = profileData.user_id ?? profileData.userId ?? profileData.id;
  if (!userId) throw new Error("Missing user_id in profileData");

  // Filter allowed columns & ensure deterministic order (user_id first)
  let cols = Object.keys(profileData).filter(k => ALLOWED_COLUMNS.includes(k));
  if (!cols.includes("user_id")) cols.unshift("user_id");
  cols = [...new Set(cols)];

  if (cols.length === 0) throw new Error("No valid columns provided to upsert");

  const placeholders = cols.map(() => "?").join(", ");
  const updateClause = cols.map(c => `${c} = VALUES(${c})`).join(", ");

  const sql = `INSERT INTO user_profile (${cols.join(", ")})
               VALUES (${placeholders})
               ON DUPLICATE KEY UPDATE ${updateClause}`;

  const values = cols.map(k => {
    if (k === "user_id") return userId;
    return cleanValueForColumn(k, profileData[k]);
  });

  // Optional debug output: set DEBUG_PROFILE=true in env to see what is being written
  if (process.env.DEBUG_PROFILE === "true") {
    console.log("[DEBUG_PROFILE] SQL:", sql);
    console.log("[DEBUG_PROFILE] COLS:", cols);
    console.log("[DEBUG_PROFILE] VALUES:", values);
  }

  const [result] = await pool.query(sql, values);
  return result;
}

export async function upsertFlatProfile(userId, flat) {
  if (!userId && (!flat || !flat.user_id)) throw new Error("Missing user id for upsertFlatProfile");
  const payload = { ...flat, user_id: userId ?? flat.user_id };
  return upsert(payload);
}

export async function getByUserId(userId) {
  if (!userId) return null;
  const [rows] = await pool.query("SELECT * FROM user_profile WHERE user_id = ? LIMIT 1", [userId]);
  if (!rows || rows.length === 0) return null;
  return rows[0];
}
export async function getProfileByUserId(userId) { return getByUserId(userId); }

export default {
  upsert,
  upsertFlatProfile,
  getByUserId,
  getProfileByUserId
};
