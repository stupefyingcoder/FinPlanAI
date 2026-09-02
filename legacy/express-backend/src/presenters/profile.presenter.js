// src/presenters/profile.presenter.js
import profileModel from "../models/profile.model.js";
import { profileSchema } from "../utils/validators.js";

/* ---------- helper mappers ---------- */
const mapToEnum = (val, mapObj) => {
  if (val == null) return null;
  const s = String(val).trim();
  if (!s) return null;
  if (Object.prototype.hasOwnProperty.call(mapObj, s)) return mapObj[s];
  const lower = s.toLowerCase();
  for (const k of Object.keys(mapObj)) {
    if (k.toLowerCase() === lower) return mapObj[k];
  }
  for (const k of Object.keys(mapObj)) {
    if (k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase())) return mapObj[k];
    const v = String(mapObj[k]).toLowerCase();
    if (v.includes(lower) || lower.includes(v)) return mapObj[k];
  }
  return null;
};

/* ---------- Enum Mappings ---------- */
const TAX_MAP = {
  "0-5%": "0%", "5-10%": "5%", "10-20%": "20%", "20-30%": "20%", "30%+": "30%",
  "0%": "0%", "5%": "5%", "20%": "20%", "30%": "30%",
  "0": "0%", "5": "5%", "20": "20%", "30": "30%"
};

const OCCUPATION_MAP = {
  "salaried": "Salaried - Private",
  "salaried - private": "Salaried - Private",
  "salaried - government": "Salaried - Government",
  "self-employed": "Self-Employed",
  "self_employed": "Self-Employed",
  "self employed": "Self-Employed",
  "business": "Business",
  "student": "Student",
  "retired": "Retired",
  "Salaried - Private": "Salaried - Private",
  "Salaried - Government": "Salaried - Government",
  "Self-Employed": "Self-Employed"
};

const GENDER_MAP = {
  "male": "Male", "m": "Male",
  "female": "Female", "f": "Female",
  "other": "Other",
  "prefer not to say": "Prefer not to say",
  "Prefer not to say": "Prefer not to say"
};

const MARITAL_MAP = {
  "single": "Single",
  "married": "Married",
  "married with children": "Married with children",
  "Married with children": "Married with children"
};

const INVEST_HORIZON_MAP = {
  "short": "Short (< 5 years)", "short (< 5 years)": "Short (< 5 years)",
  "medium": "Medium (5-10 years)", "medium (5-10 years)": "Medium (5-10 years)",
  "long": "Long (> 10 years)", "long (> 10 years)": "Long (> 10 years)"
};

const RISK_MAP = { "low": "Low", "moderate": "Moderate", "high": "High" };

const EXPERIENCE_MAP = { "beginner": "Beginner", "intermediate": "Intermediate", "advanced": "Advanced" };

/* ---------- Helper Functions ---------- */
const toNumber = (v) => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[,\s]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const parseJsonSafe = (v) => {
  if (v == null) return null;
  if (typeof v === "object") return v;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    try { return JSON.parse(s); } catch { return null; }
  }
  return null;
};

/* ---------- Date Helpers ---------- */
function parseDateToYYYYMMDD(raw) {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date && !isNaN(raw)) {
    return formatDateYYYYMMDD(raw);
  }
  if (typeof raw === "number") {
    const d = new Date(raw);
    if (!isNaN(d)) return formatDateYYYYMMDD(d);
    return null;
  }
  if (typeof raw === "string") {
    let s = raw.trim();
    try {
      const parsed = JSON.parse(s);
      if (typeof parsed === "string") s = parsed;
    } catch (e) {}
    s = s.replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "");
    s = s.replace(/\\"/g, '"').replace(/\\'/g, "'");
    const d = new Date(s);
    if (!isNaN(d)) return formatDateYYYYMMDD(d);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return null;
  }
  return null;
}

function formatDateYYYYMMDD(d) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateTimeISO(raw) {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date && !isNaN(raw)) return raw.toISOString();
  if (typeof raw === "number") {
    const d = new Date(raw);
    if (!isNaN(d)) return d.toISOString();
    return null;
  }
  if (typeof raw === "string") {
    let s = raw.trim();
    try {
      const parsed = JSON.parse(s);
      if (typeof parsed === "string") s = parsed;
    } catch (e) {}
    s = s.replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "");
    s = s.replace(/\\"/g, '"').replace(/\\'/g, "'");
    const d = new Date(s);
    if (!isNaN(d)) return d.toISOString();
    return s || null;
  }
  return null;
}

/* ---------- Normalize Goals & Insurance ---------- */
function normalizeGoals(raw) {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : (parseJsonSafe(raw) || []);
  return arr.map((g) => {
    if (!g || typeof g !== "object") return { name: String(g || ""), targetAmount: 0, targetDate: null, role: null };
    const name = g.name || g.title || g.primary_goal || g.primaryGoal || null;
    const targetAmount = toNumber(g.targetAmount ?? g.amount ?? g.target_amount ?? g.goal_target) ?? null;
    const targetDateRaw = g.targetDate ?? g.date ?? g.target_date ?? null;
    const targetDate = parseDateToYYYYMMDD(targetDateRaw);
    const roleRaw = String(g.role ?? g.type ?? "").toLowerCase();
    const role = roleRaw === "primary" ? "primary" : roleRaw === "secondary" ? "secondary" : (g.role || null);
    return { name, targetAmount, targetDate, role };
  });
}

function normalizeInsurance(raw) {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : (parseJsonSafe(raw) || []);
  return arr.map((p) => {
    if (!p || typeof p !== "object") return { type: p || null, coverage: null, premium: null };
    const type = p.type ?? p.policyType ?? p.name ?? null;
    const coverage = toNumber(p.coverage ?? p.amount ?? p.coverage_amount) ?? null;
    const premium = toNumber(p.premium ?? p.premium_amount) ?? null;
    return { type, coverage, premium };
  });
}
/* ---------- employmentType mapping ---------- */
const canonicalEmploymentType = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).trim().toLowerCase();

  if (s.includes("full") || s.includes("ft")) return "Full-time";
  if (s.includes("part")) return "Part-time";
  if (s.includes("contract")) return "Contract";
  if (s.includes("free") || s.includes("freelance")) return "Freelance";
  if (s.includes("self") || s.includes("self-employed") || s.includes("self_employed") || s.includes("self employed"))
    return "Self-Employed";
  if (s.includes("business") || s.includes("owner")) return "Business Owner";
  if (s.includes("retir")) return "Retired";
  if (s.includes("student")) return "Student";

  return String(v).trim();
};

/* ---------- mapping helpers ---------- */
const mapToGender = (v) => mapToEnum(v, GENDER_MAP);
const mapToMarital = (v) => mapToEnum(v, MARITAL_MAP);
const mapToOccupation = (v) => mapToEnum(v, OCCUPATION_MAP);
const mapInvestHorizon = (v) => mapToEnum(v, INVEST_HORIZON_MAP);
const mapRisk = (v) => mapToEnum(v, RISK_MAP);
const mapExperience = (v) => mapToEnum(v, EXPERIENCE_MAP);
const mapToTax = (v) => mapToEnum(v, TAX_MAP);

/* ---------- Normalize to Nested ---------- */
function normalizeToNested(body = {}) {
  if (!body || typeof body !== "object") return {};
  if (body.personal || body.financials || body.residence) {
    const b = { ...body };
    if (b.personal) {
      b.personal.gender = mapToGender(b.personal.gender);
      b.personal.maritalStatus = mapToMarital(b.personal.maritalStatus);
      if (b.personal.dob !== undefined) b.personal.dob = parseDateToYYYYMMDD(b.personal.dob);
    }
    if (b.employment) {
      b.employment.occupation = mapToOccupation(b.employment.occupation);
      b.employment.employmentType = canonicalEmploymentType(b.employment.employmentType);
    }
    if (b.preferences) {
      b.preferences.experience = mapExperience(b.preferences.experience);
      b.preferences.investHorizon = mapInvestHorizon(b.preferences.investHorizon);
      b.preferences.riskLevel = mapRisk(b.preferences.riskLevel);
    }
    if (b.tax) {
      b.tax.taxBracket = mapToTax(b.tax.taxBracket);
    }
    b.goals = normalizeGoals(b.goals);
    b.insurance = normalizeInsurance(b.insurance);
    if (b.collectedAt !== undefined) b.collectedAt = formatDateTimeISO(b.collectedAt);
    return b;
  }

  // flat -> nested mapping
  const nested = {
    personal: {
      fullName: body.full_name ?? body.fullName ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      dob: parseDateToYYYYMMDD(body.dob ?? body.personal_dob ?? body.personalDob ?? body.personalDob),
      age: toNumber(body.age ?? body.personal_age ?? body.personalAge),
      gender: mapToGender(body.gender ?? body.personal_gender ?? body.personalGender),
      maritalStatus: mapToMarital(body.marital_status ?? body.maritalStatus),
    },
    residence: {
      addressLine: body.address_line ?? body.addressLine ?? body.address ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
    },
    family: {
      dependentsCount: toNumber(body.dependents_count ?? body.dependentsCount) ?? 0,
      dependentsAges: parseJsonSafe(body.dependents_ages) ?? (body.dependentsAges ?? []),
    },
    employment: {
      occupation: mapToOccupation(body.occupation ?? body.employment_occupation ?? body.employmentOccupation),
      employmentType: canonicalEmploymentType(body.employment_type ?? body.employmentType),
      employer: body.employer ?? null,
    },
    financials: {
      monthlyIncome: toNumber(body.monthly_income ?? body.monthlyIncome),
      monthlyExpenses: toNumber(body.monthly_expenses ?? body.monthlyExpenses),
      monthlySavingsAmt: toNumber(body.monthly_savings_amt ?? body.monthlySavingsAmt),
      monthlySavingsPct: toNumber(body.monthly_savings_pct ?? body.monthlySavingsPct),
      annualGrossIncome: toNumber(body.annual_income ?? body.annualIncome),
      annualIncomeBand: body.annual_income_band ?? body.annualIncomeBand ?? null,
      investableAssets: toNumber(body.investable_assets ?? body.investableAssets),
      investableAssetsBand: body.investable_assets_band ?? body.investableAssetsBand ?? null,
      outstandingDebt: toNumber(body.outstanding_debt ?? body.outstandingDebt),
      outstandingDebtBand: body.outstanding_debt_band ?? body.outstandingDebtBand ?? null,
      emergencyFund: toNumber(body.emergency_fund ?? body.emergencyFund),
      healthInsurance: toNumber(body.health_insurance ?? body.healthInsurance),
      lifeInsurance: toNumber(body.life_insurance ?? body.lifeInsurance),
    },
    loans: {
      hasLoans: (body.has_loans ?? body.hasLoans) ? true : false,
      loanTypes: parseJsonSafe(body.loan_types) ?? (body.loanTypes ?? []),
      approxEmi: toNumber(body.approx_emi ?? body.approxEmi),
    },
    goals: normalizeGoals(body.goals ?? parseJsonSafe(body.goals) ?? []),
    preferences: {
      prefInstruments: parseJsonSafe(body.pref_instruments) ?? (body.prefInstruments ?? []),
      preferredAssets: parseJsonSafe(body.preferred_assets) ?? (body.preferredAssets ?? []),
      investHorizon: mapInvestHorizon(body.invest_horizon ?? body.investHorizon),
      riskLevel: mapRisk(body.risk_level ?? body.riskLevel),
      desiredEmergencyMonths: toNumber(body.desired_emergency_months ?? body.desiredEmergencyMonths),
      experience: mapExperience(body.experience_level ?? body.experience),
    },
    insurance: normalizeInsurance(body.insurance_policies ?? body.insurance ?? parseJsonSafe(body.insurance_policies) ?? []),
    tax: {
      taxBracket: mapToTax(body.tax_bracket ?? body.taxBracket),
      filingStatus: body.filing_status ?? body.filingStatus ?? null,
    },
    risk: {
      score: toNumber(body.risk_score ?? body.riskScore),
    },
    notes: body.notes ?? null,
    collectedAt: formatDateTimeISO(body.collected_at ?? body.collectedAt ?? null),
  };

  return nested;
}

/**
 * Maps nested profile structure to flat DB columns
 */
function mapToDbColumns(validated) {
  const p = validated.personal || {};
  const f = validated.financials || {};
  const emp = validated.employment || {};
  const pref = validated.preferences || {};
  
  return {
    full_name: p.fullName || null,
    email: p.email || null,
    phone: p.phone || null,
    age: p.age || null,
    gender: p.gender || null,
    occupation: emp.occupation || null,
    marital_status: p.maritalStatus || null,
    dependents_count: (validated.family?.dependentsCount || 0),
    annual_income: f.annualGrossIncome || null,
    monthly_income: f.monthlyIncome || null,
    monthly_expenses: f.monthlyExpenses || null,
    current_net_worth: f.investableAssets || null,
    risk_taking_ability: pref.riskLevel || null,
    preferred_investment_horizon: pref.investHorizon || null,
    goals: JSON.stringify(validated.goals || []),
    monthly_surplus: f.monthlySavingsAmt || null,
    starting_principal: f.investableAssets || null,
    collected_at: validated.collectedAt || new Date().toISOString()
  };
}

export async function upsertProfilePresenter(userId, payload) {
  try {
    // Normalize and validate payload
    const normalized = normalizeToNested(payload);
    const validated = await profileSchema.validateAsync(normalized);
    
    // Map to flat DB structure
    const dbPayload = {
      user_id: userId,
      ...mapToDbColumns(validated)
    };
    
    // Save to DB
    const saved = await profileModel.upsertFlatProfile(userId, dbPayload);
    
    if (saved) {
      try {
        const { setProfileCompleted } = await import("../models/user.model.js");
        if (setProfileCompleted) {
          await setProfileCompleted(userId);
        }
      } catch (e) {
        console.warn("Could not set profile completed:", e);
      }
    }
    return saved;
  } catch (err) {
    console.error("Profile upsert failed:", err);
    return false;
  }
}

export async function getProfilePresenter(userId) {
  try {
    const profile = await profileModel.getProfileByUserId(userId);
    if (!profile) return null;
    return normalizeToNested(profile);
  } catch (err) {
    console.error("Get profile failed:", err);
    return null;
  }
}
