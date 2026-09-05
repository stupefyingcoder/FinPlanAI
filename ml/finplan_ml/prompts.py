# prompt.py
"""
Prompt builders for text-only planning with RAG grounding.
We keep legacy prompts for compatibility and add new ones for:
- personalized plan (with deep financial situation analysis),
- peer/cluster plan (intentionally high-level),
- safety-first plan (assurance, confirmed-return focus),
- SWOT JSON,
- PDF -> CustomerProfile JSON extraction.
"""

# ---------- Legacy (kept for compatibility) ---------- #

bank_batch_prompt = """
You are a bank financial planning assistant.
Create 5 generic cluster-based sample plans (not personalized, no external tools).
Clusters:
0: High NW • Long-Term Retirement
1: Mid NW • Short-Term Aspirers
2: Low NW • Emergency/Liquidity
3: Young • Aggressive Growth
4: Older • Conservative Investors

For each cluster, output a clear, human-readable section describing the plan in detail.
Do not include any JSON or code blocks. Use only plain text, bullet points, and headings.
Keep language neutral and bank-compliant.
"""

def user_plan_prompt(cluster_id: int, cluster_label: str, customer: dict) -> str:
    return f"""
You are a financial assistant. You are in Cluster {cluster_id}: "{cluster_label}".

Generate a sample financial plan in plain, readable text (no JSON, no code blocks).
Use the following details for context:
- Your age: {customer.get('Age','unknown')}
- Your current net worth: ₹{customer.get('Current_Net_Worth','unknown')}
- Your risk taking ability: {customer.get('Risk_Taking_Ability','unknown')}
- Your primary financial goal: {customer.get('Primary_Financial_Goal','unknown')}
- Your preferred investment horizon: {customer.get('Preferred_Investment_Horizon','unknown')}

Structure your answer with headings and bullet points.
Include sections for:
- Why this plan fits you
- Short, medium, and long-term actions
- Suggested monthly investment and target corpus
- Example asset allocation (percentages, sum to 100)
- Key notes and disclaimers

Do not include any JSON or code blocks. Keep language neutral and non-advisory.
"""

# ---------- New builders for the 3-plan text flow ---------- #

def personalized_plan_prompt(customer_summary: str, context_block: str) -> str:
    """
    Produce a detailed, text-only plan like your CUST200000 example.
    Must include Financial Situation Analysis with explicit SWOT, Risk Assessment,
    Recommended Strategy, Suggested Asset Allocation (textual), Goals by horizon,
    and Monthly Investment Recommendations. No charts, no code.
    """
    return f"""
You are a financial planning assistant. Use ONLY the provided context to write a personalized financial plan. Address the customer as "you" and "your" throughout. Do not invent facts beyond the context.

Context (retrieved knowledge + policy/product notes):
{context_block}

Customer summary (JSON-like):
{customer_summary}

Write a concise, bank-compliant plan with these sections:

1) SWOT Analysis (Current Situation)
    - Strengths: List strengths based on the user's current financial situation.
    - Weaknesses: List weaknesses based on the user's current financial situation.
    - Opportunities: List opportunities, including where money is already invested and what good outcomes may result.
    - Threats: List threats based on the user's current financial situation.

2) Risk Assessment (one sentence)
    - Summarize the user's risk profile in one sentence.

3) Recommended Investment Strategy
    - Briefly describe the philosophy and strategy for the user's goals.

4) Asset Allocation
    - Use the following asset classes and show the recommended percentage for each (from the model):
        Stocks, Bonds, Mutual Funds, ETFs, Real Estate, Crypto, Gold, Savings Accounts, Retirement Plans, International Equities
    - For each, show the percentage and a short rationale if possible.
    - Include monthly investment recommendations as a sub-part of this section (no separate section).

Rules:
- Plain text only. No JSON, no code blocks, no tables.
- Stay grounded in the context. If data is missing, note the assumption rather than fabricating.
- Keep the plan concise and focused.
"""


def peer_plan_prompt(customer_summary: str, context_block: str) -> str:
    """
    High-level plan focused on what similar customers typically do.
    Intentionally vague; no per-customer math or tight numbers.
    """
    return f"""
You are a financial planning assistant. Using ONLY the provided context, write a brief
Peer/Cluster Plan that explains what you should typically do to achieve similar goals.

Context (retrieved cluster/policy/product snippets):
{context_block}

Customer summary (JSON-like):
{customer_summary}

Write 250–400 words covering:
- Typical allocation tendencies for your segment (e.g., “balanced equity tilt with debt stabilizers”)
- Common product categories/wrappers you might use
- Usual goal sequencing (emergency/insurance → near-term → long-term)
- Review cadence and behavioural best practices for you

Rules:
- Keep it intentionally high-level; no specific SIP numbers or projections.
- Plain text only. No JSON or tables.
"""


def safety_plan_prompt(customer_summary: str, context_block: str) -> str:
    """
    Assurance-first plan: confirmed returns, liquidity, inflation awareness,
    no leverage. Make it calm, confidence-building, and practical.
    """
    return f"""
You are a financial planning assistant. Using ONLY the provided context, write a
Safety-First Plan for the customer, addressing them as "you" and "your" throughout. Focus on capital protection, liquidity, and predictable outcomes.

Context (retrieved policy/product snippets):
{context_block}

Customer summary (JSON-like):
{customer_summary}

Write 300–500 words that:
- Emphasize your emergency fund, insurance adequacy, and no leverage
- Favour instruments with predictable/confirmed returns (e.g., liquid/short-term debt, FDs/SSY/PPF/EPF, high-quality bonds),
  with a small inflation hedge (e.g., gold or short-duration gilt)
- Address inflation clearly: “keep pace with inflation with conservative mix”
- Offer monitoring/rebalancing guidance and warnings against chasing returns for you

Rules:
- Plain text only; no JSON, no tables, no projections.
"""


def swot_json_prompt(customer_summary: str, context_block: str) -> str:
    """
    Ask the model to return a compact SWOT JSON grounded in context.
    """
    return f"""
Create a concise SWOT for the customer's current financial situation using ONLY this context.

Context:
{context_block}

Customer summary (JSON-like):
{customer_summary}

Return ONLY JSON with keys EXACTLY:
{{
  "strengths": ["..."],
  "weaknesses": ["..."],
  "opportunities": ["..."],
  "threats": ["..."]
}}
No extra keys, no prose outside the JSON.
"""


def extract_profile_from_pdf_prompt(pdf_text: str) -> str:
    """
    Convert raw PDF text to a CustomerProfile JSON. No extra prose.
    """
    return f"""
Extract a structured customer profile JSON from this PDF text.

PDF Text:
{pdf_text}

Return ONLY JSON with keys:
{{
  "Customer_ID": "string",
  "Name": "string",
  "Age": 0,
  "Gender": "string",
  "Occupation": "string",
  "Marital_Status": "string",
  "Number_of_Dependents": 0,
  "Annual_Income": 0,
  "Monthly_Expenses": 0,
  "Current_Net_Worth": 0,
  "Risk_Taking_Ability": "low|moderate|high",
  "Preferred_Investment_Horizon": "short|medium|long",
  "Primary_Financial_Goal": "string",
  "Goal_Timeline_Years": 0,
  "Monthly_Surplus": 0,
  "Starting_Principal": 0,
  "Inflation_Rate_At_Investment_Start": 5
}}
If a field is missing, infer safe defaults (e.g., Monthly_Surplus = Annual_Income/12 - Monthly_Expenses) or set null.
No text outside JSON.
"""
