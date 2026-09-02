export const INDIA_STATES_AND_UTS = [
  // 28 States
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  // 8 Union Territories
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi (NCT)",
  "Jammu and Kashmir",
  "Ladakh",
  "Puducherry",
  "Lakshadweep",
];

export const INCOME_BANDS = [
  "< ₹3 Lakh",
  "₹3L - ₹6L",
  "₹6L - ₹12L",
  "₹12L - ₹25L",
  "₹25L - ₹1 Crore",
  ">= ₹1 Crore",
  "Other (enter exact)",
];

export const EXPENSE_BANDS = [
  "< ₹10,000",
  "₹10k - ₹25k",
  "₹25k - ₹50k",
  "₹50k - ₹1L",
  "Other (enter exact)",
];

export const ASSET_BANDS = [
  "< ₹50,000",
  "₹50k - ₹5L",
  "₹5L - ₹50L",
  "₹50L - ₹5Cr",
  ">= ₹5Cr",
  "Other (enter exact)",
];

export const EMPLOYMENT_TYPES = [
  "Salaried",
  "Self-employed",
  "Retired",
  "Student",
  "Unemployed",
];

export const TAX_BRACKETS = [
  "0-5%",
  "5-10%",
  "10-20%",
  "20-30%",
  "30%+",
];

export const FILING_STATUSES = ["Individual", "HUF", "Joint"];

export const EXPERIENCE_OPTIONS = ["Beginner", "Intermediate", "Expert"];

export const ASSET_OPTIONS = [
  "Equity",
  "Debt",
  "Mutual Funds",
  "Real Estate",
  "Gold/Silver",
  "Alternatives",
];

// Small helper to map band -> approximate numeric (useful for downstream heuristics)
export const BAND_TO_ESTIMATE = {
  income: {
    "< ₹3 Lakh": 200000,
    "₹3L - ₹6L": 450000,
    "₹6L - ₹12L": 900000,
    "₹12L - ₹25L": 1800000,
    "₹25L - ₹1 Crore": 6500000,
    ">= ₹1 Crore": 10000000,
  },
  expenses: {
    "< ₹10,000": 7000,
    "₹10k - ₹25k": 17500,
    "₹25k - ₹50k": 37500,
    "₹50k - ₹1L": 75000,
  },
  assets: {
    "< ₹50,000": 25000,
    "₹50k - ₹5L": 275000,
    "₹5L - ₹50L": 2750000,
    "₹50L - ₹5Cr": 27500000,
    ">= ₹5Cr": 50000000,
  },
};

export const GOAL_OPTIONS = [
"Emergency fund",
"Buy house / down payment",
"Child education",
"Child wedding",
"Retirement corpus",
"Buy a car",
"Home renovation",
"Pay off debt",
"Start a business",
"Vacation / travel",
"Health & medical fund",
"Property purchase (investment)",
"Higher studies (self)",
"Tax-efficient investments (SIP)",
"Wealth preservation / legacy",
"Other",
];