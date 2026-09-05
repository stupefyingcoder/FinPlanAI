"use client"

import { useState } from "react"
import { User, Save, Edit3, Briefcase, Heart, DollarSign, Target } from "lucide-react"

/* --- Local UI primitives (replacements for removed imports) --- */
const Card = ({ children, className = "", ...props }) => (
  <div className={`${className} rounded-lg`} {...props}>
    {children}
  </div>
)

const CardHeader = ({ children, className = "", ...props }) => (
  <div className={`${className}`} {...props}>
    {children}
  </div>
)

const CardTitle = ({ children, className = "", ...props }) => (
  <h3 className={`text-lg font-semibold ${className}`} {...props}>
    {children}
  </h3>
)

const CardContent = ({ children, className = "", ...props }) => (
  <div className={`${className}`} {...props}>
    {children}
  </div>
)

const Button = ({ children, onClick, disabled = false, className = "", type = "button", ...props }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-md transition-colors focus:outline-none ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

const Label = ({ htmlFor, children, className = "" }) => (
  <label htmlFor={htmlFor} className={`block text-sm font-medium ${className}`}>
    {children}
  </label>
)

const TextInput = ({ id, type = "text", value, onChange, disabled = false, className = "", ...props }) => (
  <input
    id={id}
    type={type}
    value={value}
    onChange={onChange}
    disabled={disabled}
    className={`w-full p-2 border border-input rounded-md bg-background ${className}`}
    {...props}
  />
)

/* ---------------- Component ---------------- */
const ProfileTab = ({ userData = {} }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    full_name: userData?.full_name || "",
    date_of_birth: userData?.date_of_birth || "",
    gender: userData?.gender || "",
    occupation_type: userData?.occupation_type || "",
    marital_status: userData?.marital_status || "",
    number_of_dependents: userData?.number_of_dependents || 0,
    monthly_income: userData?.monthly_income || 0,
    monthly_expenses: userData?.monthly_expenses || 0,
    monthly_savings: userData?.monthly_savings || 0,
    has_loans: userData?.has_loans || false,
    loan_type: userData?.loan_type || "",
    monthly_emi: userData?.monthly_emi || 0,
    primary_goal: userData?.primary_goal || "",
    goal_target_amount: userData?.goal_target_amount || 0,
    goal_timeline_years: userData?.goal_timeline_years || 0,
    preferred_investment: userData?.preferred_investment || "",
    investment_horizon: userData?.investment_horizon || "",
    risk_comfort_level: userData?.risk_comfort_level || "",
    health_insurance_cover: userData?.health_insurance_cover || 0,
    life_insurance_cover: userData?.life_insurance_cover || 0,
    emergency_fund_amount: userData?.emergency_fund_amount || 0,
  })

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = () => {
    // Here you would typically save to database
    console.log("Saving profile data:", formData)
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Profile Management</h2>
          <p className="text-muted-foreground mt-2">Update your personal and financial information</p>
        </div>
        <Button onClick={() => (isEditing ? handleSave() : setIsEditing(true))} className="flex items-center">
          {isEditing ? (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          ) : (
            <>
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Profile
            </>
          )}
        </Button>
      </div>

      {/* Personal Information */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground flex items-center">
            <User className="w-5 h-5 mr-2" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full_name" className="text-muted-foreground">
                Full Name
              </Label>
              <TextInput
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange("full_name", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="date_of_birth" className="text-muted-foreground">
                Date of Birth
              </Label>
              <TextInput
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="gender" className="text-muted-foreground">
                Gender
              </Label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => handleInputChange("gender", e.target.value)}
                disabled={!isEditing}
                className="w-full p-2 border border-input rounded-md bg-background"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="marital_status" className="text-muted-foreground">
                Marital Status
              </Label>
              <select
                id="marital_status"
                value={formData.marital_status}
                onChange={(e) => handleInputChange("marital_status", e.target.value)}
                disabled={!isEditing}
                className="w-full p-2 border border-input rounded-md bg-background"
              >
                <option value="">Select Status</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="married_with_children">Married with Children</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Information */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground flex items-center">
            <Briefcase className="w-5 h-5 mr-2" />
            Professional Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="occupation_type" className="text-muted-foreground">
                Occupation Type
              </Label>
              <select
                id="occupation_type"
                value={formData.occupation_type}
                onChange={(e) => handleInputChange("occupation_type", e.target.value)}
                disabled={!isEditing}
                className="w-full p-2 border border-input rounded-md bg-background"
              >
                <option value="">Select Occupation</option>
                <option value="salaried_private">Salaried Private</option>
                <option value="salaried_govt">Salaried Government</option>
                <option value="self_employed">Self Employed</option>
                <option value="business">Business</option>
                <option value="student">Student</option>
                <option value="retired">Retired</option>
              </select>
            </div>
            <div>
              <Label htmlFor="number_of_dependents" className="text-muted-foreground">
                Number of Dependents
              </Label>
              <TextInput
                id="number_of_dependents"
                type="number"
                value={formData.number_of_dependents}
                onChange={(e) =>
                  handleInputChange("number_of_dependents", Number.isNaN(parseInt(e.target.value, 10)) ? 0 : parseInt(e.target.value, 10))
                }
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Information */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Financial Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="monthly_income" className="text-muted-foreground">
                Monthly Income
              </Label>
              <TextInput
                id="monthly_income"
                type="number"
                value={formData.monthly_income}
                onChange={(e) => handleInputChange("monthly_income", Number.parseFloat(e.target.value))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="monthly_expenses" className="text-muted-foreground">
                Monthly Expenses
              </Label>
              <TextInput
                id="monthly_expenses"
                type="number"
                value={formData.monthly_expenses}
                onChange={(e) => handleInputChange("monthly_expenses", Number.parseFloat(e.target.value))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="monthly_savings" className="text-muted-foreground">
                Monthly Savings
              </Label>
              <TextInput
                id="monthly_savings"
                type="number"
                value={formData.monthly_savings}
                onChange={(e) => handleInputChange("monthly_savings", Number.parseFloat(e.target.value))}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="has_loans" className="text-muted-foreground">
                Has Loans
              </Label>
              <select
                id="has_loans"
                value={formData.has_loans.toString()}
                onChange={(e) => handleInputChange("has_loans", e.target.value === "true")}
                disabled={!isEditing}
                className="w-full p-2 border border-input rounded-md bg-background"
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            {formData.has_loans && (
              <>
                <div>
                  <Label htmlFor="loan_type" className="text-muted-foreground">
                    Loan Type
                  </Label>
                  <select
                    id="loan_type"
                    value={formData.loan_type}
                    onChange={(e) => handleInputChange("loan_type", e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-2 border border-input rounded-md bg-background"
                  >
                    <option value="">Select Loan Type</option>
                    <option value="home">Home Loan</option>
                    <option value="car">Car Loan</option>
                    <option value="education">Education Loan</option>
                    <option value="personal">Personal Loan</option>
                    <option value="business">Business Loan</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="monthly_emi" className="text-muted-foreground">
                    Monthly EMI
                  </Label>
                  <TextInput
                    id="monthly_emi"
                    type="number"
                    value={formData.monthly_emi}
                    onChange={(e) => handleInputChange("monthly_emi", Number.parseFloat(e.target.value))}
                    disabled={!isEditing}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Investment Goals */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Investment Goals & Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary_goal" className="text-muted-foreground">
                Primary Goal
              </Label>
              <select
                id="primary_goal"
                value={formData.primary_goal}
                onChange={(e) => handleInputChange("primary_goal", e.target.value)}
                disabled={!isEditing}
                className="w-full p-2 border border-input rounded-md bg-background"
              >
                <option value="">Select Goal</option>
                <option value="retirement">Retirement</option>
                <option value="child_education">Child Education</option>
                <option value="buying_home">Buying Home</option>
                <option value="emergency_fund">Emergency Fund</option>
                <option value="wealth_creation">Wealth Creation</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="goal_target_amount" className="text-muted-foreground">
                Goal Target Amount
              </Label>
              <TextInput
                id="goal_target_amount"
                type="number"
                value={formData.goal_target_amount}
                onChange={(e) => handleInputChange("goal_target_amount", Number.parseFloat(e.target.value))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="goal_timeline_years" className="text-muted-foreground">
                Goal Timeline (Years)
              </Label>
              <TextInput
                id="goal_timeline_years"
                type="number"
                value={formData.goal_timeline_years}
                onChange={(e) => handleInputChange("goal_timeline_years", Number.parseInt(e.target.value))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="risk_comfort_level" className="text-muted-foreground">
                Risk Comfort Level
              </Label>
              <select
                id="risk_comfort_level"
                value={formData.risk_comfort_level}
                onChange={(e) => handleInputChange("risk_comfort_level", e.target.value)}
                disabled={!isEditing}
                className="w-full p-2 border border-input rounded-md bg-background"
              >
                <option value="">Select Risk Level</option>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insurance & Emergency Fund */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground flex items-center">
            <Heart className="w-5 h-5 mr-2" />
            Insurance & Emergency Fund
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="health_insurance_cover" className="text-muted-foreground">
                Health Insurance Cover
              </Label>
              <TextInput
                id="health_insurance_cover"
                type="number"
                value={formData.health_insurance_cover}
                onChange={(e) => handleInputChange("health_insurance_cover", Number.parseFloat(e.target.value))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="life_insurance_cover" className="text-muted-foreground">
                Life Insurance Cover
              </Label>
              <TextInput
                id="life_insurance_cover"
                type="number"
                value={formData.life_insurance_cover}
                onChange={(e) => handleInputChange("life_insurance_cover", Number.parseFloat(e.target.value))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="emergency_fund_amount" className="text-muted-foreground">
                Emergency Fund Amount
              </Label>
              <TextInput
                id="emergency_fund_amount"
                type="number"
                value={formData.emergency_fund_amount}
                onChange={(e) => handleInputChange("emergency_fund_amount", Number.parseFloat(e.target.value))}
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ProfileTab
