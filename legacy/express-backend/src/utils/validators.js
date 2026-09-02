import Joi from "joi"

// Updated signup schema to handle name fields correctly
export const signupSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .messages({
      "string.min": "Name must be at least 2 characters",
      "string.max": "Name cannot exceed 100 characters"
    }),
  fullName: Joi.string()
    .min(2)
    .max(100)
    .messages({
      "string.min": "Name must be at least 2 characters",
      "string.max": "Name cannot exceed 100 characters"
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      "string.email": "Please enter a valid email address",
      "any.required": "Email is required"
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      "string.min": "Password must be at least 6 characters",
      "any.required": "Password is required"
    })
})
.or('name', 'fullName') // Changed from xor to or - allow either name field
.custom((value, helpers) => {
  // Normalize to always have name field
  if (!value.name && value.fullName) {
    value.name = value.fullName;
  }
  return value;
})
.required()

// Personal Info (camelCase keys to match frontend/presenter)
export const personalSchema = Joi.object({
  fullName: Joi.string().min(2).max(200).required(),
  email: Joi.string().email().allow(null, "").optional(),
  phone: Joi.string().allow(null, "").optional(),
  dob: Joi.date().iso().allow(null, "").optional(),
  age: Joi.number().integer().min(0).max(120).allow(null).optional(),
  gender: Joi.string()
    .valid("Male", "Female", "Other", "Prefer not to say")
    .allow(null, "")
    .optional(),
  maritalStatus: Joi.string()
    .valid("Single", "Married", "Married with children")
    .allow(null, "")
    .optional(),
}).required();

// Residence
export const residenceSchema = Joi.object({
  addressLine: Joi.string().allow(null, "").optional(),
  city: Joi.string().allow(null, "").optional(),
  state: Joi.string().allow(null, "").optional(),
}).optional();

// Family
export const familySchema = Joi.object({
  dependentsCount: Joi.number().integer().min(0).optional().default(0),
  dependentsAges: Joi.array()
    .items(Joi.number().integer().min(0))
    .length(Joi.ref("dependentsCount"))
    .optional()
    .default([]),
}).optional();

// Employment
// src/utils/validators.js (ESM version)
// src/utils/validators.js (employmentSchema)
export const employmentSchema = Joi.object({
  employmentType: Joi.string().allow(null, "").optional(), // temporarily allow any string
  employer: Joi.string().allow(null, "").optional(),
  occupation: Joi.string()
    .valid(
      "Full-time",
      "Part-time",
      "Contract",
      "Freelance",
      "Business Owner",
      "Self-Employed",
      "Retired",
      "Student"
    )
    .allow(null, "")
    .optional(),
  employer: Joi.string().allow(null, "").optional(),
  occupation: Joi.string()
    .valid(
      "Salaried - Private",
      "Salaried - Government",
      "Self-Employed",
      "Business",
      "Student",
      "Retired"
    )
    .allow(null, "")
    .optional(),
}).optional();


// Financials (camelCase)
export const financialsSchema = Joi.object({
  monthlyIncome: Joi.number().precision(2).min(0).required(),
  monthlyExpenses: Joi.number().precision(2).min(0).required(),
  monthlySavingsAmt: Joi.number().precision(2).min(0).allow(null).optional(),
  monthlySavingsPct: Joi.number().precision(2).min(0).max(100).allow(null).optional(),
  annualGrossIncome: Joi.number().precision(2).min(0).allow(null).optional(),
  annualIncomeBand: Joi.string().allow(null, "").optional(),
  investableAssets: Joi.number().precision(2).min(0).allow(null).optional(),
  investableAssetsBand: Joi.string().allow(null, "").optional(),
  outstandingDebt: Joi.number().precision(2).min(0).allow(null).optional(),
  outstandingDebtBand: Joi.string().allow(null, "").optional(),
  emergencyFund: Joi.number().precision(2).min(0).allow(null).optional(),
  healthInsurance: Joi.number().precision(2).min(0).allow(null).optional(),
  lifeInsurance: Joi.number().precision(2).min(0).allow(null).optional(),
}).optional();

// Loans
export const loansSchema = Joi.object({
  hasLoans: Joi.boolean().optional(),
  loanTypes: Joi.array().items(Joi.string()).optional().default([]),
  approxEmi: Joi.number().precision(2).min(0).allow(null).optional(),
}).optional();

// Goals
// goalItem allow unknown keys (so incoming 'id' or 'amount' won't fail validation)
export const goalItem = Joi.object({
  name: Joi.string().min(1).required(),
  targetAmount: Joi.number().precision(2).min(0).required(),
  targetDate: Joi.date().iso().allow(null, "").optional(),
  role: Joi.string().valid("primary", "secondary", "").allow(null, "").optional(),
}).unknown(true); // allow other keys like id/amount/type that we normalized earlier

// insurancePolicy allow unknown keys (strip id on normalize)
export const insurancePolicy = Joi.object({
  type: Joi.string().allow(null, "").optional(),
  coverage: Joi.number().precision(2).min(0).allow(null).optional(),
  premium: Joi.number().precision(2).min(0).allow(null).optional(),
}).unknown(true);


export const goalsSchema = Joi.array().items(goalItem).default([]);

// Preferences (camelCase)
export const preferencesSchema = Joi.object({
  experience: Joi.string().valid("Beginner", "Intermediate", "Advanced").allow(null, "").optional(),
  preferredAssets: Joi.array().items(Joi.string()).optional().default([]),
  desiredEmergencyMonths: Joi.number().integer().min(0).max(60).allow(null).optional(),
  investHorizon: Joi.string()
    .valid("Short (< 5 years)", "Medium (5-10 years)", "Long (> 10 years)")
    .allow(null, "")
    .optional(),
  prefInstruments: Joi.array().items(Joi.string()).optional().default([]),
  riskLevel: Joi.string().valid("Low", "Moderate", "High").allow(null, "").optional(),
}).optional();

// Insurance

export const insuranceSchema = Joi.array().items(insurancePolicy).optional().default([]);

// Tax
export const taxSchema = Joi.object({
  taxBracket: Joi.string().valid("0%", "5%", "20%", "30%").allow(null, "").optional(),
  filingStatus: Joi.string().valid("Individual", "HUF", "Company").allow(null, "").optional(),
}).optional();

// Risk
export const riskSchema = Joi.object({
  score: Joi.number().integer().min(0).max(100).allow(null).optional(),
}).optional();

// Main profile schema (camelCase top-level keys)
export const profileSchema = Joi.object({
  personal: personalSchema,
  residence: residenceSchema,
  family: familySchema,
  employment: employmentSchema,
  financials: financialsSchema,
  loans: loansSchema,
  goals: goalsSchema,
  preferences: preferencesSchema,
  insurance: insuranceSchema,
  tax: taxSchema,
  risk: riskSchema,
  notes: Joi.string().allow(null, "").optional(),
  collectedAt: Joi.date().iso().allow(null, "").optional(),
  userId: Joi.any().optional(),
}).options({ abortEarly: false });

// Login schema
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      "string.email": "Please enter a valid email address",
      "string.empty": "Email is required",
      "any.required": "Email is required"
    }),
  
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      "string.min": "Password must be at least 6 characters",
      "string.empty": "Password is required",
      "any.required": "Password is required"
    })
}).required()