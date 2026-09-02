import { useMemo, useState, useCallback, useEffect } from "react"
import {
  User,
  CreditCard,
  Briefcase,
  ShieldCheck,
  PlusCircle,
  PieChart,
  Upload,
  Link2,
  Phone,
  Mail,
} from "lucide-react"

import {
  INDIA_STATES_AND_UTS,
  INCOME_BANDS,
  EXPENSE_BANDS,
  ASSET_BANDS,
  EMPLOYMENT_TYPES,
  TAX_BRACKETS,
  FILING_STATUSES,
  EXPERIENCE_OPTIONS,
  ASSET_OPTIONS,
  BAND_TO_ESTIMATE,
  GOAL_OPTIONS,
} from "../Data/Data"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../auth/AuthProvider"

const CURRENT_YEAR = new Date().getFullYear()
const clamp = (n, a, b) => Math.max(a, Math.min(b, n))
const parseNumber = (s) => {
  if (s === null || s === undefined || s === "") return 0
  const n = Number(String(s).replace(/[^\d.-]/g, ""))
  return Number.isNaN(n) ? 0 : n
}
const isPositiveNumber = (v) => !(v === null || v === undefined || v === "") && parseNumber(v) >= 0
const isStrictPositive = (v) => !(v === null || v === undefined || v === "") && parseNumber(v) > 0

const SectionCard = ({ title, subtitle, icon, children }) => (
  <section className="bg-white rounded-lg border border-gray-400 p-4 shadow-sm">
    <div className="flex items-start gap-3 mb-3 bg-green-100 rounded py-2 px-2">
      <div className="p-2 bg-slate-50 rounded-md border border-green-400" aria-hidden="true">
        {icon}
      </div>
      <div className="flex flex-col items-start">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {subtitle && <div className="text-xs text-slate-600">{subtitle}</div>}
      </div>
    </div>
    {children}
  </section>
)

const Err = ({ msg }) => (msg ? <div className="text-xs text-red-600 mt-1">{msg}</div> : null)

const getMinDate = () => {
  const today = new Date()
  today.setDate(today.getDate() + 1) // Goals should be at least tomorrow
  return today.toISOString().slice(0, 10)
}

const getMaxDOBDate = () => {
  const today = new Date()
  today.setFullYear(today.getFullYear() - 18) // Must be at least 18 years old
  return today.toISOString().slice(0, 10)
}

const validateDate = (dateString, isGoalDate = false) => {
  if (!dateString) return "Date is required."
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return "Invalid date format."

  if (isGoalDate) {
    const today = new Date()
    if (date <= today) return "Goal date must be in the future."
    const maxYear = today.getFullYear() + 50
    if (date.getFullYear() > maxYear) return `Goal date cannot be more than 50 years in the future.`
  } else {
    // DOB validation
    const today = new Date()
    let age = today.getFullYear() - date.getFullYear()
    const m = today.getMonth() - date.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--
    if (age < 18) return "Must be at least 18 years old."
    if (age > 120) return "Please enter a valid birth date."
  }
  return null
}

export default function ProfileCreation({ onSave = (payload) => console.log("Final payload:", payload) }) {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)

  /* ---------- Personal & contact ---------- */
  const [fullName, setFullName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [phone, setPhone] = useState("")
  const [dob, setDob] = useState("")
  const age = useMemo(() => {
    if (!dob) return null
    const d = new Date(dob)
    if (Number.isNaN(d.getTime())) return null
    const t = new Date()
    let yrs = t.getFullYear() - d.getFullYear()
    const m = t.getMonth() - d.getMonth()
    if (m < 0 || (m === 0 && t.getDate() < d.getDate())) yrs--
    return yrs
  }, [dob])

  // NEW: demographics
  const [gender, setGender] = useState("")
  const [occupation, setOccupation] = useState("")
  const [maritalStatus, setMaritalStatus] = useState("")

  /* ---------- Residence & address ---------- */
  const [city, setCity] = useState("")
  const [stateVal, setStateVal] = useState("")
  const [addressLine, setAddressLine] = useState("")

  /* ---------- Family ---------- */
  const [dependentsCount, setDependentsCount] = useState(0)
  const [dependentsAges, setDependentsAges] = useState([])
  const setDependentNumber = useCallback((n) => {
    const cnt = Math.max(0, Math.floor(Number(n) || 0))
    setDependentsCount(cnt)
    setDependentsAges((prev) => {
      const arr = prev.slice(0, cnt)
      while (arr.length < cnt) arr.push("")
      return arr
    })
  }, [])
  const setDependentAgeAt = (i, v) => {
    setDependentsAges((prev) => {
      const n = [...prev]
      n[i] = v
      return n
    })
  }

  /* ---------- Financials (bands + exact fallback) ---------- */
  const [annualIncomeBand, setAnnualIncomeBand] = useState("")
  const [annualGrossIncome, setAnnualGrossIncome] = useState("")
  // NEW: monthly income (allow user to enter monthly directly)
  const [monthlyIncome, setMonthlyIncome] = useState("")

  const [monthlyExpenseBand, setMonthlyExpenseBand] = useState("")
  const [monthlyExpenses, setMonthlyExpenses] = useState("")
  const [investableAssetBand, setInvestableAssetBand] = useState("")
  const [investableAssets, setInvestableAssets] = useState("")
  const [outstandingDebtBand, setOutstandingDebtBand] = useState("")
  const [outstandingDebt, setOutstandingDebt] = useState("")

  // NEW: monthly savings (amount or percent)
  const [monthlySavingsAmt, setMonthlySavingsAmt] = useState("")
  const [monthlySavingsPct, setMonthlySavingsPct] = useState("")

  const [taxBracket, setTaxBracket] = useState("")
  const [filingStatus, setFilingStatus] = useState("")

  /* ---------- Goals ---------- */
  const [goals, setGoals] = useState([])
  const [primaryDraft, setPrimaryDraft] = useState({ name: "", customName: "", amount: "", date: "" })
  const [primaryError, setPrimaryError] = useState("")
  const [secondaryDraft, setSecondaryDraft] = useState({ name: "", customName: "", amount: "", date: "" })
  const [secondaryError, setSecondaryError] = useState("")
  const finalizeName = (draft) => (draft.name === "Other" ? (draft.customName || "").trim() : (draft.name || "").trim())

  const validateAndAdd = (draft, setError) => {
    setError("")
    const name = finalizeName(draft)
    if (!name) {
      setError("Please choose or enter a goal name.")
      return false
    }
    if (!isStrictPositive(draft.amount)) {
      setError("Enter a valid target amount (> 0).")
      return false
    }
    const dateError = validateDate(draft.date, true)
    if (dateError) {
      setError(dateError)
      return false
    }
    if (goals.some((g) => g.name.toLowerCase() === name.toLowerCase() && g.date === draft.date)) {
      setError("A similar goal with the same date already exists.")
      return false
    }
    return true
  }

  const addPrimaryGoal = () => {
    if (!validateAndAdd(primaryDraft, setPrimaryError)) return
    const name = finalizeName(primaryDraft)
    const secName = finalizeName(secondaryDraft)
    if (secName && secName.toLowerCase() === name.toLowerCase()) {
      setPrimaryError("Primary and secondary goals cannot be the same.")
      return
    }
    setGoals((s) => [
      ...s,
      {
        id: Date.now() + Math.random(),
        name,
        amount: parseNumber(primaryDraft.amount),
        date: primaryDraft.date,
        type: "primary",
      },
    ])
    setPrimaryDraft({ name: "", customName: "", amount: "", date: "" })
    setPrimaryError("")
  }

  const addSecondaryGoal = () => {
    if (!validateAndAdd(secondaryDraft, setSecondaryError)) return
    const name = finalizeName(secondaryDraft)
    const primName = finalizeName(primaryDraft)
    if (primName && primName.toLowerCase() === name.toLowerCase()) {
      setSecondaryError("Secondary goal cannot be the same as the primary goal draft.")
      return
    }
    if (goals.some((g) => g.name.toLowerCase() === name.toLowerCase() && g.date === secondaryDraft.date)) {
      setSecondaryError("A similar goal with the same date already exists.")
      return false
    }
    setGoals((s) => [
      ...s,
      {
        id: Date.now() + Math.random(),
        name,
        amount: parseNumber(secondaryDraft.amount),
        date: secondaryDraft.date,
        type: "secondary",
      },
    ])
    setSecondaryDraft({ name: "", customName: "", amount: "", date: "" })
    setSecondaryError("")
  }

  /* ---------- Risk ---------- */
  const [riskScore, setRiskScore] = useState(40)
  const [riskQuick] = useState([null, null, null])

  /* ---------- Insurance ---------- */
  const [insurancePolicies, setInsurancePolicies] = useState([])
  const [insDraft, setInsDraft] = useState({ type: "Life", coverage: "", premium: "" })
  const addInsurance = () => {
    if (!isPositiveNumber(insDraft.coverage) || !isPositiveNumber(insDraft.premium)) return
    setInsurancePolicies((s) => [
      ...s,
      {
        id: Date.now(),
        type: insDraft.type,
        coverage: parseNumber(insDraft.coverage),
        premium: parseNumber(insDraft.premium),
      },
    ])
    setInsDraft({ type: "Life", coverage: "", premium: "" })
  }

  /* ---------- Loans (NEW) ---------- */
  const [hasLoans, setHasLoans] = useState(false)
  const [loanTypes, setLoanTypes] = useState([]) // array of strings
  const [approxEmi, setApproxEmi] = useState("")
  const toggleLoanType = (t) => setLoanTypes((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))

  /* ---------- Connectors & docs ---------- */
  const [bankConnected, setBankConnected] = useState(false)
  const [brokerConnected, setBrokerConnected] = useState(false)
  const [insuranceConnected, setInsuranceConnected] = useState(false)
  const toggleConnector = (t) => {
    if (t === "bank") setBankConnected((p) => !p)
    if (t === "broker") setBrokerConnected((p) => !p)
    if (t === "insurance") setInsuranceConnected((p) => !p)
  }
  const [docs, setDocs] = useState([])
  const handleDocUpload = (e) => {
    const files = Array.from(e.target.files || [])
    setDocs((p) => [...p, ...files.map((f) => ({ name: f.name, size: f.size }))])
  }

  /* ---------- Preferences & employment ---------- */
  const [experience, setExperience] = useState("")
  const [preferredAssets, setPreferredAssets] = useState([])
  const toggleAsset = (a) => setPreferredAssets((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]))
  const [desiredEmergencyMonths, setDesiredEmergencyMonths] = useState(3)
  const [employmentType, setEmploymentType] = useState("")
  const [employer, setEmployer] = useState("")
  const [notes, setNotes] = useState("")
  const [errors, setErrors] = useState({})
  const [loadingSave, setLoadingSave] = useState(false)
  const [investHorizon, setInvestHorizon] = useState("")

  /* ---------- Validation per step ---------- */
  const validateStep = useCallback(
    (idx) => {
      const iss = {}
      if (idx === 0) {
        if (!fullName.trim()) iss.fullName = "Full name required"
        if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) iss.email = "Valid email required"
        if (!phone.trim()) iss.phone = "Phone required"
        if (!dob) iss.dob = "DOB required"
        else {
          const yr = Number(String(dob).split("-")[0])
          if (Number.isNaN(yr) || yr < 1900 || yr > CURRENT_YEAR) iss.dob = "Invalid DOB"
        }
        if (!city.trim() || !stateVal.trim()) iss.residence = "City & state required"
        if (!gender) iss.gender = "Select gender"
        if (!occupation) iss.occupation = "Select occupation"
      }
      if (idx === 1) {
        const okIncome = monthlyIncome || annualIncomeBand || isPositiveNumber(annualGrossIncome)
        const okExpense = monthlyExpenseBand || isPositiveNumber(monthlyExpenses)
        const okAssets = investableAssetBand || isPositiveNumber(investableAssets)

        if (!okIncome) iss.monthlyIncome = "Enter monthly income (or annual/band)"
        if (!okExpense) iss.monthlyExpenses = "Enter monthly expenses (band or exact)"
        if (!okAssets) iss.investableAssets = "Enter investable assets (band or exact)"
        if (outstandingDebt === "" || outstandingDebt === null) {
          if (!outstandingDebtBand) iss.outstandingDebt = "Enter outstanding debt (0 if none)"
        }
        if (!taxBracket) iss.taxBracket = "Select tax bracket"
        if (!filingStatus) iss.filingStatus = "Select filing status"
        if (!employmentType) iss.employmentType = "Select employment type"
      }
      if (idx === 2) {
        if (!goals.length) iss.goals = "Add at least one goal"
        if (!experience) iss.experience = "Select experience"
      }
      setErrors(iss)
      return Object.keys(iss).length === 0
    },
    [
      fullName,
      email,
      phone,
      dob,
      city,
      monthlyIncome, 
      stateVal,
      annualIncomeBand,
      annualGrossIncome,
      monthlyExpenseBand,
      monthlyExpenses,
      investableAssetBand,
      investableAssets,
      outstandingDebtBand,
      outstandingDebt,
      taxBracket,
      filingStatus,
      employmentType,
      goals,
      experience,
      gender,
      occupation,
    ],
  )

  const handleNext = () => {
    if (preferredAssets.length === 0) {
      setErrors((prev) => ({
        ...prev,
        preferredAssets: "Please select at least one preferred asset.",
      }))
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }
    next()
  }

  /* ---------- Navigation ---------- */
  const next = useCallback(() => {
    if (validateStep(step)) setStep((s) => clamp(s + 1, 0, 3))
    else window.scrollTo({ top: 0, behavior: "smooth" })
  }, [step, validateStep])
  const back = () => setStep((s) => clamp(s - 1, 0, 3))

  /* ---------- Ensure user logged in + prefill ---------- */
  useEffect(() => {
    if (!user || !user.isLoggedIn) {
      navigate("/login")
      return
    }
    setFullName(user?.name || "")
    setEmail(user?.email || "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate])

  /* ---------- Save final payload (build safe payload matching user_profile schema) ---------- */
  const saveProfile = async () => {
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) {
      window.alert("Please fix errors before saving.")
      return
    }
    setLoadingSave(true)

    // Resolve monthlyIncome: prefer explicit monthly, else derive from annual
    const resolvedMonthly = isPositiveNumber(monthlyIncome)
      ? parseNumber(monthlyIncome)
      : isPositiveNumber(annualGrossIncome)
        ? Math.round(parseNumber(annualGrossIncome) / 12)
        : annualIncomeBand && BAND_TO_ESTIMATE.income[annualIncomeBand]
          ? Math.round(BAND_TO_ESTIMATE.income[annualIncomeBand] / 12)
          : null

    const resolvedExpenses = isPositiveNumber(monthlyExpenses)
      ? parseNumber(monthlyExpenses)
      : monthlyExpenseBand && BAND_TO_ESTIMATE.expenses[monthlyExpenseBand]
        ? BAND_TO_ESTIMATE.expenses[monthlyExpenseBand]
        : null

    const resolvedAssets = isPositiveNumber(investableAssets)
      ? parseNumber(investableAssets)
      : investableAssetBand && BAND_TO_ESTIMATE.assets[investableAssetBand]
        ? BAND_TO_ESTIMATE.assets[investableAssetBand]
        : null

    // Monthly savings: prefer explicit amount, else percent of resolvedMonthly
    const resolvedMonthlySavingsAmt = isPositiveNumber(monthlySavingsAmt)
      ? parseNumber(monthlySavingsAmt)
      : isPositiveNumber(monthlySavingsPct) && resolvedMonthly
        ? Math.round((resolvedMonthly * parseNumber(monthlySavingsPct)) / 100)
        : null

    const resolvedMonthlySavingsPct = isPositiveNumber(monthlySavingsPct)
      ? parseNumber(monthlySavingsPct)
      : resolvedMonthly && resolvedMonthlySavingsAmt
        ? Math.round((resolvedMonthlySavingsAmt / resolvedMonthly) * 100 * 100) / 100
        : null

    // Primary goal mapping
    const primary = goals.find((g) => g.type === "primary") || goals[0] || null
    const primaryGoal = primary ? primary.name : null
    const goalTarget = primary ? primary.amount : null
    let goalTimelineYears = null
    if (primary && primary.date) {
      const now = new Date()
      const then = new Date(primary.date)
      const diffDays = Math.max(0, (then - now) / (1000 * 60 * 60 * 24))
      goalTimelineYears = Math.ceil(diffDays / 365)
    }

    // Map preferred instruments (use preferredAssets array)
    const prefInstruments = preferredAssets || []

    // risk level mapping
    const riskLevel = riskScore < 34 ? "low" : riskScore < 67 ? "moderate" : "high"

    // Insurance aggregates
    const healthInsurance = insurancePolicies
      .filter((p) => String(p.type).toLowerCase().includes("health"))
      .reduce((s, p) => s + (parseNumber(p.coverage) || 0), 0)
    const lifeInsurance = insurancePolicies
      .filter((p) => String(p.type).toLowerCase().includes("life"))
      .reduce((s, p) => s + (parseNumber(p.coverage) || 0), 0)

    // Emergency fund: prefer explicit emergencyFund if provided in notes? else compute desiredEmergencyMonths * resolvedExpenses
    const resolvedEmergencyFund =
      desiredEmergencyMonths && resolvedExpenses ? Math.round(desiredEmergencyMonths * resolvedExpenses) : null

    const serverPayload = {
      // Basic profile fields
      dob: dob || null,
      age: age === null ? null : age,
      gender: gender || null,
      occupation: occupation || null,
      marital_status: maritalStatus || null,
      dependents_count: Number.isFinite(Number(dependentsCount)) ? Number(dependentsCount) : 0,

      // Financial fields
      monthly_income: resolvedMonthly,
      monthly_expenses: resolvedExpenses,
      monthly_savings_amt: resolvedMonthlySavingsAmt,
      monthly_savings_pct: resolvedMonthlySavingsPct,
      has_loans: hasLoans ? true : false,
      loan_types: JSON.stringify(loanTypes),
      approx_emi: isPositiveNumber(approxEmi) ? parseNumber(approxEmi) : null,
      primary_goal: primaryGoal,
      goal_target: goalTarget,
      goal_timeline_years: goalTimelineYears,
      pref_instruments: JSON.stringify(prefInstruments),
      invest_horizon: investHorizon || null,
      risk_level: riskLevel,
      health_insurance: healthInsurance || null,
      life_insurance: lifeInsurance || null,
      emergency_fund: resolvedEmergencyFund,
      collected_at: new Date().toISOString(),

      // Personal information
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      address_line: addressLine.trim() || null,
      city: city.trim() || null,
      state: stateVal.trim() || null,

      // Tax and employment
      tax_bracket: taxBracket || null,
      filing_status: filingStatus || null,
      employment_type: employmentType || null,
      employer: employer.trim() || null,
      dependents_ages: JSON.stringify(dependentsAges.filter((age) => age && age.trim())),

      // Financial assets and income
      annual_income: isPositiveNumber(annualGrossIncome) ? parseNumber(annualGrossIncome) : null,
      annual_income_band: annualIncomeBand || null,
      investable_assets: isPositiveNumber(investableAssets)
        ? parseNumber(investableAssets)
        : investableAssetBand && BAND_TO_ESTIMATE.assets[investableAssetBand]
          ? BAND_TO_ESTIMATE.assets[investableAssetBand]
          : null,
      investable_assets_band: investableAssetBand || null,
      outstanding_debt: isPositiveNumber(outstandingDebt)
        ? parseNumber(outstandingDebt)
        : outstandingDebtBand &&
            outstandingDebtBand !== "0" &&
            BAND_TO_ESTIMATE.debt &&
            BAND_TO_ESTIMATE.debt[outstandingDebtBand]
          ? BAND_TO_ESTIMATE.debt[outstandingDebtBand]
          : null,
      outstanding_debt_band: outstandingDebtBand || null,

      goals: JSON.stringify(goals || []),
      preferred_assets: JSON.stringify(preferredAssets || []),
      risk_score: riskScore || null,
      experience_level: experience || null,
      insurance_policies: JSON.stringify(insurancePolicies || []),
      desired_emergency_months: desiredEmergencyMonths || null,
    }

    // Keep a debug payload for human-friendly display / local save
    const debugPayload = {
      personal: { fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), dob, age },
      residence: { addressLine: addressLine.trim() || null, city: city.trim() || null, state: stateVal.trim() || null },
      family: { dependentsCount, dependentsAges },
      employment: { occupation, employmentType, employer: employer.trim() || null },
      financials: {
        monthlyIncome: resolvedMonthly,
        monthlyExpenses: resolvedExpenses,
        monthlySavingsAmt: resolvedMonthlySavingsAmt,
        monthlySavingsPct: resolvedMonthlySavingsPct,
        investableAssets: resolvedAssets,
        outstandingDebt: parseNumber(outstandingDebt) || null,
      },
      loans: { hasLoans, loanTypes, approxEmi: parseNumber(approxEmi) || null },
      goals,
      risk: {
        quickAnswers: Array.isArray(riskQuick) ? riskQuick : [], // 👈 Fixed: use riskQuick instead of riskAnswers
        score: riskScore,
      },
      insurance: insurancePolicies,
      preferences: { experience, preferredAssets, desiredEmergencyMonths, investHorizon },
      collectedAt: new Date().toISOString(),
    }

    console.log("=== PROFILE PAYLOAD DEBUG ===")
    console.log("DEBUG payload (nested structure):", debugPayload)
    console.log("SERVER payload (flat for DB):", serverPayload)
    console.log(JSON.stringify(serverPayload, null, 2))
    console.log("=============================")

    try {
      const ok = await sendProfileToBackend(serverPayload)
      if (ok) {
        setUser((prev) => ({ ...(prev || {}), profileCompleted: true }))
        onSave(debugPayload)
      }
    } finally {
      setLoadingSave(false)
    }
  }

  /* sendProfileToBackend unchanged */
  const sendProfileToBackend = async (serverPayload) => {
    try {
      let accessToken = localStorage.getItem("accessToken")
      if (!accessToken) {
        const refreshRes = await fetch("http://localhost:5000/auth/refresh", { method: "POST", credentials: "include" })
        if (refreshRes.ok) {
          const refreshBody = await refreshRes.json().catch(() => ({}))
          if (refreshBody.accessToken) {
            accessToken = refreshBody.accessToken
            localStorage.setItem("accessToken", accessToken)
          }
        }
      }

      console.log("[v1] Sending profile data to backend...")
      console.log("[v1] Request URL:", "http://localhost:5000/api/profile")

      let response = await fetch("http://localhost:5000/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(serverPayload),
      })

      console.log("[v1] Response status:", response.status)

      if (response.status === 401) {
        const refreshRes2 = await fetch("http://localhost:5000/auth/refresh", {
          method: "POST",
          credentials: "include",
        })
        if (refreshRes2.ok) {
          const r2 = await refreshRes2.json().catch(() => ({}))
          if (r2.accessToken) {
            accessToken = r2.accessToken
            localStorage.setItem("accessToken", accessToken)
            response = await fetch("http://localhost:5000/api/profile", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
              },
              credentials: "include",
              body: JSON.stringify(serverPayload),
            })
          }
        }
      }

      if (response.ok) {
        const result = await response.json().catch(() => ({ message: "Profile saved" }))
        console.log("[v1] Profile saved successfully:", result)
        navigate("/dashboard")
        return true
      } else {
        const errorText = await response.text().catch(() => "Unknown error")
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }

        console.error("[v1] Backend error response:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        })

        if (response.status === 401) {
          navigate("/login")
          return false
        } else {
          const errorMessage = errorData.error || errorData.message || `Server error (${response.status}): ${errorText}`
          window.alert(`Failed to save profile: ${errorMessage}`)
          return false
        }
      }
    } catch (error) {
      console.error("[v1] Network or server error while saving profile:", error)
      window.alert("Network or server error. Check console for details.")
      return false
    }
  }

  const handleDependentChange = (e) => {
    const inputVal = Number(e.target.value)
    const clampedVal = Math.min(Math.max(0, Math.floor(inputVal || 0)), 6)
    setDependentNumber(clampedVal)
  }

  const Progress = () => {
    const pct = Math.round(((step + 1) / 4) * 100)
    return (
      <div className="w-48">
        <div className="text-xs text-slate-600 mb-1">Step {step + 1} / 4</div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div style={{ width: `${pct}%` }} className="h-full bg-black" />
        </div>
      </div>
    )
  }

  /* ---------- Render (all sections visible) ---------- */
  return (
    <div
      className="min-h-screen bg-gray-50 p-6 bg-cover bg-center"
      style={{
        backgroundImage:
          "url('https://png.pngtree.com/thumb_back/fh260/background/20240914/pngtree-a-colorful-wave-with-pink-and-blue-gradient-image_16207304.jpg')",
        opacity: "10",
      }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-md">
              <User size={18} />
            </div>
            <div className="flex flex-col items-start text-l">
              <h1 className="text-2xl font-semibold text-slate-900">Basic Details</h1>
              <p className="text-sm text-slate-500">Collect essential planning inputs in 4 quick steps.</p>
            </div>
          </div>
          <div>
            <Progress />
          </div>
        </div>

        {/* step 0 */}
        {step === 0 && (
          <SectionCard
            title="Personal & contact"
            subtitle="Identity, email, phone, DOB, residence"
            icon={<User size={18} />}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600">Full name *</label>
                <input
                  aria-label="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-400 rounded-md"
                />
                <Err msg={errors.fullName} />
              </div>

              <div>
                <label className="text-xs text-slate-600">Email *</label>
                <div className="relative">
                  <div className="absolute left-2 top-1/2 -translate-y-1/2">
                    <Mail size={14} />
                  </div>
                  <input
                    aria-label="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full px-3 py-2 pl-8 border border-gray-400 rounded-md"
                  />
                </div>
                <Err msg={errors.email} />
              </div>

              <div>
                <label className="text-xs text-slate-600">Phone *</label>
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <div className="absolute left-2 top-1/2 -translate-y-1/2">
                      <Phone size={14} />
                    </div>
                    <input
                      aria-label="Phone"
                      placeholder="XXXXX-XXXXX"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value)
                      }}
                      className="mt-1 w-full px-3 py-2 pl-8 border border-gray-400 rounded-md"
                    />
                  </div>
                </div>
                <Err msg={errors.phone} />
              </div>

              <div>
                <label className="text-xs text-slate-600">Date of birth *</label>
                <input
                  aria-label="DOB"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  min="1900-01-01"
                  max={getMaxDOBDate()}
                  className="mt-1 w-full px-3 py-2 border border-gray-400 rounded-md"
                />
                <Err msg={errors.dob} />
                <div className="text-xs text-slate-400 mt-1">Age: {age === null ? "—" : `${age} yrs`}</div>
              </div>

              {/* NEW: gender, occupation */}
              <div>
                <label className="text-xs text-slate-600">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-400 rounded-md"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not">Prefer not to say</option>
                </select>
                <Err msg={errors.gender} />
              </div>

              <div>
                <label className="text-xs text-slate-600">Occupation</label>
                <select
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-400 rounded-md"
                >
                  <option value="">Select</option>
                  <option value="salaried_private">Salaried — Private</option>
                  <option value="salaried_govt">Salaried — Govt</option>
                  <option value="self_employed">Self-Employed</option>
                  <option value="business">Business</option>
                  <option value="student">Student</option>
                  <option value="retired">Retired</option>
                </select>
                <Err msg={errors.occupation} />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs text-slate-600">Address (city, state) *</label>
                <div className="mt-1 flex gap-2 items-center">
                  <div className="flex-1">
                    <input
                      aria-label="Address line"
                      placeholder="Street, building (optional)"
                      value={addressLine}
                      onChange={(e) => setAddressLine(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-400 rounded-md"
                    />
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        aria-label="City"
                        placeholder="City"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-400 rounded-md appearance-none"
                        autoComplete="off"
                      />
                      <select
                        aria-label="State"
                        value={stateVal}
                        onChange={(e) => setStateVal(e.target.value)}
                        className="w-36 px-3 py-2 border border-gray-400 rounded-md"
                      >
                        <option value="">Select</option>
                        {INDIA_STATES_AND_UTS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <Err msg={errors.residence} />
              </div>

              <div>
                <label className="text-xs text-slate-600">Marital status</label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-400 rounded-md"
                >
                  <option value="">Select</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="married_children">Married with children</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setStep(0)} className="px-4 py-2 border border-gray-400 rounded-md">
                Cancel
              </button>
              <button type="button" onClick={next} className="px-4 py-2 bg-black text-white rounded-md">
                Next
              </button>
            </div>
          </SectionCard>
        )}

        {/* step 1 */}
        {step === 1 && (
          <SectionCard
            title="Financial snapshot & employment"
            subtitle="Income, expenses, assets, debt, employment"
            icon={<CreditCard size={18} />}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600">Monthly income (preferred)</label>
                <input
                  aria-label="Monthly income exact"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  placeholder="Enter monthly income (₹) or leave blank to use annual/band"
                  className="mt-1 w-full px-3 py-2 border border-gray-400 rounded-md"
                />
                <div className="text-xs text-slate-400 mt-1">Or choose annual band below (we will derive monthly).</div>
                <select
                  aria-label="Annual income band"
                  value={annualIncomeBand}
                  onChange={(e) => setAnnualIncomeBand(e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-gray-400 rounded-md"
                >
                  <option value="">Select</option>
                  {INCOME_BANDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                {annualIncomeBand === "Other (enter exact)" && (
                  <input
                    aria-label="Annual income exact"
                    value={annualGrossIncome}
                    onChange={(e) => setAnnualGrossIncome(e.target.value)}
                    placeholder="Enter exact annual income (₹)"
                    className="mt-2 w-full px-3 py-2 border border-gray-400 rounded-md"
                  />
                )}
              </div>

              <div>
                <label className="text-xs text-slate-600">Monthly expenses *</label>
                <select
                  aria-label="Monthly expense band"
                  value={monthlyExpenseBand}
                  onChange={(e) => setMonthlyExpenseBand(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-400 rounded-md"
                >
                  <option value="">Select</option>
                  {EXPENSE_BANDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                {monthlyExpenseBand === "Other (enter exact)" && (
                  <input
                    aria-label="Monthly expenses exact"
                    value={monthlyExpenses}
                    onChange={(e) => setMonthlyExpenses(e.target.value)}
                    placeholder="Enter exact monthly expenses (₹)"
                    className="mt-2 w-full px-3 py-2 border border-gray-400 rounded-md"
                  />
                )}
                <Err msg={errors.monthlyExpenses} />
              </div>

              <div>
                <label className="text-xs text-slate-600">Investable assets (net worth) *</label>
                <select
                  aria-label="Investable asset band"
                  value={investableAssetBand}
                  onChange={(e) => setInvestableAssetBand(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-400 rounded-md"
                >
                  <option value="">Select</option>
                  {ASSET_BANDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                {investableAssetBand === "Other (enter exact)" && (
                  <input
                    aria-label="Investable assets exact"
                    value={investableAssets}
                    onChange={(e) => setInvestableAssets(e.target.value)}
                    placeholder="Enter exact investable assets (₹)"
                    className="mt-2 w-full px-3 py-2 border border-gray-400 rounded-md"
                  />
                )}
                <Err msg={errors.investableAssets} />
              </div>

              <div>
                <label className="text-xs text-slate-600">Outstanding debt *</label>
                <select
                  aria-label="Outstanding debt band"
                  value={outstandingDebtBand}
                  onChange={(e) => setOutstandingDebtBand(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-400 rounded-md"
                >
                  <option value="">Select</option>
                  <option value="0">No debt</option>
                  <option value="< ₹50k">&lt; ₹50k</option>
                  <option value="₹50k - ₹5L">₹50k - ₹5L</option>
                  <option value=">= ₹5L">&gt;= ₹5L</option>
                  <option value="Other (enter exact)">Other (enter exact)</option>
                </select>
                {outstandingDebtBand === "Other (enter exact)" && (
                  <input
                    aria-label="Outstanding debt exact"
                    value={outstandingDebt}
                    onChange={(e) => setOutstandingDebt(e.target.value)}
                    placeholder="Enter outstanding debt (₹)"
                    className="mt-2 w-full px-3 py-2 border border-gray-400 rounded-md"
                  />
                )}
                <Err msg={errors.outstandingDebt} />
              </div>

              <div>
                <label className="text-xs text-slate-600">Employment type *</label>
                <select
                  aria-label="Employment type"
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-400 rounded-md"
                >
                  <option value="">Select</option>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <Err msg={errors.employmentType} />
              </div>

              <div>
                <label className="text-xs text-slate-600">Employer (optional)</label>
                <input
                  aria-label="Employer"
                  value={employer}
                  onChange={(e) => setEmployer(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-400 rounded-md"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600">Tax bracket *</label>
                <select
                  aria-label="Tax bracket"
                  value={taxBracket}
                  onChange={(e) => setTaxBracket(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-400 rounded-md"
                >
                  <option value="">Select</option>
                  {TAX_BRACKETS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <Err msg={errors.taxBracket} />
              </div>

              <div>
                <label className="text-xs text-slate-600">Filing status *</label>
                <select
                  aria-label="Filing status"
                  value={filingStatus}
                  onChange={(e) => setFilingStatus(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-400 rounded-md"
                >
                  <option value="">Select</option>
                  {FILING_STATUSES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <Err msg={errors.filingStatus} />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs text-slate-600">Dependents (count & ages)</label>
                <div className="flex gap-2 items-center mt-1">
                  <input
                    aria-label="Dependents count"
                    type="number"
                    min="0"
                    max="6"
                    value={dependentsCount}
                    onChange={handleDependentChange}
                    className="w-24 px-2 py-1 border border-gray-400 rounded-md"
                  />
                  <div className="text-xs text-slate-500">Count</div>
                </div>
                {dependentsCount > 0 && dependentsCount <= 6 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {dependentsAges.map((a, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <label className="text-xs"># {i + 1}</label>
                        <input
                          aria-label={`Dependent ${i + 1} age`}
                          type="number"
                          min="0"
                          value={a}
                          onChange={(e) => setDependentAgeAt(i, e.target.value)}
                          className="w-20 px-2 py-1 border-gray-400 border rounded-md"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {dependentsCount > 6 && (
                  <div className="mt-2">
                    <label className="text-xs text-slate-500">Enter ages comma-separated</label>
                    <input
                      value={dependentsAges.join(",")}
                      onChange={(e) =>
                        setDependentsAges(
                          String(e.target.value)
                            .split(",")
                            .map((s) => s.trim()),
                        )
                      }
                      className="mt-1 w-full px-3 py-2 border-gray-400 border rounded-md"
                    />
                  </div>
                )}
              </div>

              {/* NEW: monthly savings */}
              <div>
                <label className="text-xs text-slate-600">Monthly savings (amount)</label>
                <input
                  value={monthlySavingsAmt}
                  onChange={(e) => setMonthlySavingsAmt(e.target.value)}
                  placeholder="₹ amount"
                  className="mt-1 w-full px-3 py-2 border border-gray-400 rounded-md"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600">Monthly savings (%)</label>
                <input
                  value={monthlySavingsPct}
                  onChange={(e) => setMonthlySavingsPct(e.target.value)}
                  placeholder="% of income"
                  className="mt-1 w-full px-3 py-2 border border-gray-400 rounded-md"
                />
              </div>

              {/* NEW: Loans quick capture */}
              <div>
                <label className="text-xs text-slate-600">Do you have loans?</label>
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHasLoans(true)}
                    className={`px-3 py-2 rounded-md ${hasLoans ? "bg-black text-white" : "bg-white border"}`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasLoans(false)}
                    className={`px-3 py-2 rounded-md ${!hasLoans ? "bg-black text-white" : "bg-white border"}`}
                  >
                    No
                  </button>
                </div>
                {hasLoans && (
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      {["Home", "Car", "Education", "Personal", "Business"].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleLoanType(t.toLowerCase())}
                          className={`px-3 py-2 rounded-md ${loanTypes.includes(t.toLowerCase()) ? "bg-black text-white" : "bg-white border"}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <input
                      value={approxEmi}
                      onChange={(e) => setApproxEmi(e.target.value)}
                      placeholder="Approx EMI (₹)"
                      className="mt-2 w-full px-3 py-2 border border-gray-400 rounded-md"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-between gap-2">
              <button type="button" onClick={back} className="px-4 py-2 border rounded-md">
                Back
              </button>
              <button type="button" onClick={next} className="px-4 py-2 bg-black text-white rounded-md">
                Next
              </button>
            </div>
          </SectionCard>
        )}

        {/* step 2: goals, risk & preferences (visible) */}
        {step === 2 && (
          <SectionCard
            title="Goals, risk & preferences"
            subtitle="Goals, risk quick-capture, preferred assets"
            icon={<PlusCircle size={18} />}
          >
            <div className="space-y-8">
              {/* Goals UI (primary + secondary + list) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <PlusCircle size={16} />
                    <div className="text-sm font-medium">Goals</div>
                  </div>
                  <div className="text-xs text-slate-400">Add up to primary + secondary goals</div>
                </div>

                <div className="mb-4 border border-gray-100 p-3 rounded">
                  <div className="text-xs text-slate-600 mb-2 font-medium">Primary goal</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                    <div>
                      <select
                        aria-label="Primary goal"
                        value={primaryDraft.name}
                        onChange={(e) => setPrimaryDraft((s) => ({ ...s, name: e.target.value, customName: "" }))}
                        className="w-full px-3 py-2 border border-gray-400 rounded-md"
                      >
                        <option value="">Select primary goal</option>
                        {GOAL_OPTIONS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                      {primaryDraft.name === "Other" && (
                        <input
                          aria-label="Primary custom name"
                          placeholder="Custom primary goal name"
                          value={primaryDraft.customName}
                          onChange={(e) => setPrimaryDraft((s) => ({ ...s, customName: e.target.value }))}
                          className="mt-2 w-full px-3 py-2 border border-gray-400 rounded-md"
                        />
                      )}
                    </div>

                    <div>
                      <input
                        aria-label="Primary amount"
                        placeholder="Amount (₹)"
                        value={primaryDraft.amount}
                        onChange={(e) => setPrimaryDraft((s) => ({ ...s, amount: e.target.value }))}
                        className="px-3 py-2 border border-gray-400 rounded-md w-full"
                      />
                    </div>

                    <div className="flex gap-2">
                      <input
                        aria-label="Primary goal target date"
                        type="date"
                        value={primaryDraft.date}
                        onChange={(e) => setPrimaryDraft((s) => ({ ...s, date: e.target.value }))}
                        min={getMinDate()}
                        className="px-3 py-2 border border-gray-400 rounded-md"
                      />
                      <button
                        type="button"
                        onClick={addPrimaryGoal}
                        className="px-3 py-2 bg-black text-white rounded-md"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  {primaryError && <div className="text-xs text-red-600 mt-2">{primaryError}</div>}
                </div>

                <div className="mb-4 border border-gray-100 p-3 rounded">
                  <div className="text-xs text-slate-600 mb-2 font-medium">Secondary goal (optional)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                    <div>
                      <select
                        aria-label="Secondary goal"
                        value={secondaryDraft.name}
                        onChange={(e) => setSecondaryDraft((s) => ({ ...s, name: e.target.value, customName: "" }))}
                        className="w-full px-3 py-2 border border-gray-400 rounded-md"
                      >
                        <option value="">Select secondary goal</option>
                        {GOAL_OPTIONS.map((g) => {
                          const primaryFinal = finalizeName(primaryDraft)
                          if (primaryFinal && g.toLowerCase() === primaryFinal.toLowerCase()) return null
                          return (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          )
                        })}
                      </select>
                      {secondaryDraft.name === "Other" && (
                        <input
                          aria-label="Secondary custom name"
                          placeholder="Custom secondary goal name"
                          value={secondaryDraft.customName}
                          onChange={(e) => setSecondaryDraft((s) => ({ ...s, customName: e.target.value }))}
                          className="mt-2 w-full px-3 py-2 border border-gray-400 rounded-md"
                        />
                      )}
                    </div>

                    <div>
                      <input
                        aria-label="Secondary amount"
                        placeholder="Amount (₹)"
                        value={secondaryDraft.amount}
                        onChange={(e) => setSecondaryDraft((s) => ({ ...s, amount: e.target.value }))}
                        className="px-3 py-2 border border-gray-400 rounded-md w-full"
                      />
                    </div>

                    <div className="flex gap-2">
                      <input
                        aria-label="Secondary goal target date"
                        type="date"
                        value={secondaryDraft.date}
                        onChange={(e) => setSecondaryDraft((s) => ({ ...s, date: e.target.value }))}
                        min={getMinDate()}
                        className="px-3 py-2 border border-gray-400 rounded-md"
                      />
                      <button
                        type="button"
                        onClick={addSecondaryGoal}
                        className="px-3 py-2 bg-black text-white rounded-md"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  {secondaryError && <div className="text-xs text-red-600 mt-2">{secondaryError}</div>}
                </div>

                <div>
                  <div className="text-xs text-slate-600 mb-2 font-medium">Added goals</div>
                  <div className="space-y-2">
                    {goals.length === 0 ? (
                      <div className="text-xs text-slate-400">No goals added</div>
                    ) : (
                      goals.map((g) => (
                        <div
                          key={g.id}
                          className="flex items-center justify-between bg-gray-100 px-6 p-2 rounded border border-gray-300"
                        >
                          <div className="flex flex-col items-start">
                            <div className="text-sm font-medium">
                              {g.name} <span className="text-xs text-slate-400">({g.type})</span>
                            </div>
                            <div className="text-xs text-slate-500">
                              {g.date} • ₹{g.amount.toLocaleString()}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setGoals((s) => s.filter((x) => x.id !== g.id))}
                            className="text-xs text-red-600 font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Risk & Preferences */}
              <div>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <PieChart size={16} />
                      <div className="text-sm font-medium">Risk quick-capture</div>
                    </div>
                    <div className="text-xs text-slate-400">Slide for primary score</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      aria-label="Risk score"
                      type="range"
                      min="0"
                      max="100"
                      value={riskScore}
                      onChange={(e) => setRiskScore(Number(e.target.value))}
                    />
                    <div className="text-sm font-medium w-12">{riskScore}%</div>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Optional 3 quick questions (kept lightweight).</div>
                </div>

                <div className="mb-4">
                  <div className="text-sm font-medium">Experience</div>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {EXPERIENCE_OPTIONS.map((x) => (
                      <button
                        type="button"
                        key={x}
                        onClick={() => setExperience(x.toLowerCase())}
                        className={`px-3 py-2 rounded-md ${experience === x.toLowerCase() ? "bg-black text-white" : "bg-white border"}`}
                      >
                        {x}
                      </button>
                    ))}
                  </div>
                  <Err msg={errors.experience} />
                </div>

                <div className="mb-4">
                  <div className="text-xs text-slate-600 mb-1">Preferred assets</div>
                  <div className="flex gap-2 flex-wrap">
                    {ASSET_OPTIONS.map((a) => (
                      <button
                        type="button"
                        key={a}
                        onClick={() => toggleAsset(a)}
                        className={`px-3 py-2 rounded-md ${preferredAssets.includes(a) ? "bg-black text-white" : "bg-white border"}`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  {errors.preferredAssets && <div className="text-xs text-red-600 mt-2">{errors.preferredAssets}</div>}
                </div>

                <div>
                  <label className="text-xs text-slate-600">Investment horizon</label>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setInvestHorizon("short")}
                      className={`px-3 py-2 rounded-md ${investHorizon === "short" ? "bg-black text-white" : "bg-white border"}`}
                    >
                      Short &lt;5 yrs
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvestHorizon("medium")}
                      className={`px-3 py-2 rounded-md ${investHorizon === "medium" ? "bg-black text-white" : "bg-white border"}`}
                    >
                      Medium 5–10 yrs
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvestHorizon("long")}
                      className={`px-3 py-2 rounded-md ${investHorizon === "long" ? "bg-black text-white" : "bg-white border"}`}
                    >
                      Long 10+ yrs
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-600">Emergency buffer (months)</label>
                  <input
                    aria-label="Emergency months"
                    type="number"
                    min="0"
                    max="24"
                    value={desiredEmergencyMonths}
                    onChange={(e) => setDesiredEmergencyMonths(clamp(Number(e.target.value || 0), 0, 24))}
                    className="mt-1 px-3 py-2 border border-gray-400 rounded-md w-28"
                  />
                  <div className="text-xs text-slate-400 mt-1">Recommended 3–6 months</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between gap-2">
              <button type="button" onClick={back} className="px-4 py-2 border rounded-md">
                Back
              </button>
              <button type="button" onClick={handleNext} className="px-4 py-2 bg-black text-white rounded-md">
                Next
              </button>
            </div>
          </SectionCard>
        )}

        {/* step 3: connectors, docs, insurance & review */}
        {step === 3 && (
          <SectionCard
            title="Connectors, documents & review"
            subtitle="Link accounts, upload docs, insurance"
            icon={<Link2 size={18} />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard size={16} />
                  <div className="text-sm font-medium">Connectors</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} />
                      <div className="flex flex-col items-start">
                        <div className="text-sm font-medium">Bank</div>
                        <div className="text-xs text-slate-400">Plaid / Open Banking (backend)</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleConnector("bank")}
                      className={`px-3 py-2 rounded-md ${bankConnected ? "bg-emerald-500 text-white" : "bg-white border"}`}
                    >
                      {bankConnected ? "Connected" : "Connect"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} />
                      <div className="flex flex-col items-start">
                        <div className="text-sm font-medium">Brokerage</div>
                        <div className="text-xs text-slate-400">Sync holdings (tokenized)</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleConnector("broker")}
                      className={`px-3 py-2 rounded-md ${brokerConnected ? "bg-emerald-500 text-white" : "bg-white border"}`}
                    >
                      {brokerConnected ? "Connected" : "Connect"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} />
                      <div className="flex flex-col items-start">
                        <div className="text-sm font-medium">Insurance providers</div>
                        <div className="text-xs text-slate-400">Upload policy or connect</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleConnector("insurance")}
                      className={`px-3 py-2 rounded-md ${insuranceConnected ? "bg-emerald-500 text-white" : "bg-white border"}`}
                    >
                      {insuranceConnected ? "Connected" : "Connect"}
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Upload size={16} />
                    <div className="text-sm font-medium">Documents</div>
                  </div>

                  <label className="px-3 py-2 border rounded-md bg-white inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      onChange={handleDocUpload}
                      aria-label="Upload documents"
                      accept=".pdf,.csv,.png,.jpg,.jpeg"
                    />
                    <Upload size={14} /> Upload
                  </label>

                  <div className="mt-2 space-y-2">
                    {docs.length === 0 ? (
                      <div className="text-xs text-slate-400">No documents uploaded</div>
                    ) : (
                      docs.map((d, i) => (
                        <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                          <div className="truncate">{d.name}</div>
                          <div className="text-xs text-slate-400">{Math.round(d.size / 1024)} KB</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <ShieldCheck size={16} />
                  <div className="text-sm font-medium">Insurance (existing)</div>
                </div>

                <div className="flex gap-2 items-end">
                  <select
                    value={insDraft.type}
                    onChange={(e) => setInsDraft((s) => ({ ...s, type: e.target.value }))}
                    className="px-3 py-2 border border-gray-400 rounded-md"
                  >
                    <option>Life</option>
                    <option>Health</option>
                    <option>Disability</option>
                    <option>Home</option>
                  </select>
                  <input
                    placeholder="Coverage (₹)"
                    value={insDraft.coverage}
                    onChange={(e) => setInsDraft((s) => ({ ...s, coverage: e.target.value }))}
                    className="px-3 py-2 border border-gray-400 rounded-md"
                  />
                </div>

                <div className="flex items-center justify-start mt-2 space-x-1">
                  <input
                    placeholder="Premium (₹)"
                    value={insDraft.premium}
                    onChange={(e) => setInsDraft((s) => ({ ...s, premium: e.target.value }))}
                    className="px-6 py-2 border border-gray-400 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={addInsurance}
                    className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition"
                  >
                    Add
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {insurancePolicies.length === 0 ? (
                    <div className="text-xs text-slate-400">No policies added</div>
                  ) : (
                    insurancePolicies.map((p) => (
                      <div
                        key={p.id}
                        className="flex justify-between bg-gray-100 border border-gray-300 p-2 rounded text-sm"
                      >
                        <div>
                          {p.type} • ₹{(p.coverage ?? 0).toLocaleString()} (premium ₹{(p.premium ?? 0).toLocaleString()}
                          )
                        </div>
                        <button
                          type="button"
                          onClick={() => setInsurancePolicies((s) => s.filter((x) => x.id !== p.id))}
                          className="text-xs text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4">
                  <label className="text-xs text-slate-600">Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="mt-1 w-full px-3 py-2 border-gray-400 border rounded-md"
                  />
                </div>

                <div className="mt-4 bg-green-100 p-3 rounded">
                  <div className="text-sm font-medium mb-2">Quick review</div>
                  <div className="text-xs text-slate-700 space-y-1">
                    <div>
                      <strong>{fullName || "—"}</strong> • {email || "—"}
                    </div>
                    <div>
                      Age: {age === null ? "—" : `${age} yrs`} • {city || "—"}, {stateVal || "—"}
                    </div>
                    <div>
                      Income: ₹{resolvedNumberToDisplay(annualGrossIncome, monthlyIncome, annualIncomeBand)} • Assets: ₹
                      {resolvedNumberToDisplay(investableAssets, null, investableAssetBand)}
                    </div>
                    <div>
                      Goals: {goals.length} • Risk: {riskScore}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-between gap-2">
              <button type="button" onClick={back} className="px-4 py-2 border rounded-md">
                Back
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(0)} className="px-4 py-2 border rounded-md">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={saveProfile}
                  className="px-4 py-2 bg-black text-white rounded-md"
                  disabled={loadingSave}
                >
                  {loadingSave ? "Saving..." : "Save profile"}
                </button>
              </div>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  )
}

/* Helper used inside the JSX quick review. Keeping it at bottom to keep file self-contained. */
function resolvedNumberToDisplay(altExact, altMonthly, band) {
  // altExact: could be annual or assets
  // altMonthly: monthly input (for income display)
  if (isPositiveNumber(altMonthly)) return parseNumber(altMonthly).toLocaleString()
  if (isPositiveNumber(altExact)) return parseNumber(altExact).toLocaleString()
  if (band) return band
  return "—"
}
