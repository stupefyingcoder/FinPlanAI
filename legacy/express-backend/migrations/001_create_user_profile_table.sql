-- Migration: create user_profile table used by profile.model
-- Run this against your MySQL database (e.g. using mysql CLI or a migration tool)

CREATE TABLE IF NOT EXISTS user_profile (
  user_id BIGINT PRIMARY KEY,
  full_name VARCHAR(255),
  dob DATE,
  age INT,
  gender VARCHAR(50),
  occupation VARCHAR(255),
  marital_status VARCHAR(100),
  dependents_count INT DEFAULT 0,
  dependents_ages JSON DEFAULT NULL,
  phone VARCHAR(50),
  address_line TEXT,
  city VARCHAR(150),
  state VARCHAR(150),

  monthly_income DECIMAL(14,2) DEFAULT 0,
  monthly_expenses DECIMAL(14,2) DEFAULT 0,
  monthly_savings_amt DECIMAL(14,2) DEFAULT NULL,
  monthly_savings_pct DECIMAL(5,2) DEFAULT NULL,
  annual_income DECIMAL(14,2) DEFAULT NULL,
  annual_income_band VARCHAR(100) DEFAULT NULL,
  investable_assets DECIMAL(14,2) DEFAULT NULL,
  investable_assets_band VARCHAR(100) DEFAULT NULL,
  outstanding_debt DECIMAL(14,2) DEFAULT NULL,
  outstanding_debt_band VARCHAR(100) DEFAULT NULL,

  has_loans TINYINT(1) DEFAULT 0,
  loan_types JSON DEFAULT NULL,
  approx_emi DECIMAL(14,2) DEFAULT NULL,

  primary_goal VARCHAR(150) DEFAULT NULL,
  goal_target DECIMAL(14,2) DEFAULT NULL,
  goal_timeline_years INT DEFAULT NULL,
  goals JSON DEFAULT NULL,

  pref_instruments JSON DEFAULT NULL,
  preferred_assets JSON DEFAULT NULL,
  invest_horizon VARCHAR(150) DEFAULT NULL,
  risk_level VARCHAR(50) DEFAULT NULL,
  risk_score INT DEFAULT NULL,
  experience_level VARCHAR(50) DEFAULT NULL,

  health_insurance DECIMAL(14,2) DEFAULT NULL,
  life_insurance DECIMAL(14,2) DEFAULT NULL,
  insurance_policies JSON DEFAULT NULL,
  emergency_fund DECIMAL(14,2) DEFAULT NULL,
  desired_emergency_months INT DEFAULT NULL,

  tax_bracket VARCHAR(50) DEFAULT NULL,
  filing_status VARCHAR(100) DEFAULT NULL,
  employment_type VARCHAR(150) DEFAULT NULL,
  employer VARCHAR(255) DEFAULT NULL,

  notes TEXT DEFAULT NULL,
  collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
