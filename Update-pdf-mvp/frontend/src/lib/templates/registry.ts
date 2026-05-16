export type FieldType = "text" | "textarea" | "date" | "number" | "email" | "select" | "array";

export interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];          // for select
  subFields?: TemplateField[]; // for array (repeatable group)
  maxItems?: number;           // for array
  rows?: number;               // for textarea
  hint?: string;
}

export interface TemplateDefinition {
  slug: string;
  name: string;
  description: string;
  category: "business" | "hr" | "finance" | "productivity" | "personal";
  credits: number;
  tier: "free" | "pro";
  isAiAssisted: boolean;
  icon: string;       // lucide icon name as string
  accentColor: string; // hex
  fields: TemplateField[];
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    slug: "invoice",
    name: "Invoice",
    description: "Professional invoice with line items, tax, and payment details.",
    category: "finance",
    credits: 1,
    tier: "free",
    isAiAssisted: false,
    icon: "FileSpreadsheet",
    accentColor: "#DC2626",
    fields: [
      { key: "invoiceNumber", label: "Invoice Number", type: "text", required: true, placeholder: "INV-001" },
      { key: "invoiceDate", label: "Invoice Date", type: "date", required: true },
      { key: "dueDate", label: "Due Date", type: "date" },
      { key: "fromName", label: "From (Your Name / Company)", type: "text", required: true },
      { key: "fromAddress", label: "From Address", type: "textarea", rows: 2 },
      { key: "fromEmail", label: "From Email", type: "email" },
      { key: "toName", label: "Bill To (Client Name)", type: "text", required: true },
      { key: "toAddress", label: "Client Address", type: "textarea", rows: 2 },
      { key: "toEmail", label: "Client Email", type: "email" },
      {
        key: "currency", label: "Currency", type: "select",
        options: ["USD", "EUR", "GBP", "CAD", "AUD", "INR"], required: true,
      },
      {
        key: "lineItems", label: "Line Items", type: "array", required: true, maxItems: 20,
        subFields: [
          { key: "description", label: "Description", type: "text", required: true, placeholder: "Service or product" },
          { key: "quantity", label: "Qty", type: "number", required: true, placeholder: "1" },
          { key: "unitPrice", label: "Unit Price", type: "number", required: true, placeholder: "100.00" },
        ],
      },
      { key: "taxRate", label: "Tax Rate (%)", type: "number", placeholder: "0" },
      { key: "notes", label: "Notes", type: "textarea", rows: 3, placeholder: "Payment terms, bank details…" },
    ],
  },
  {
    slug: "resume",
    name: "AI Resume Builder",
    description: "AI-enhanced resume with professional formatting and optimized language.",
    category: "hr",
    credits: 3,
    tier: "free",
    isAiAssisted: true,
    icon: "UserCheck",
    accentColor: "#7C3AED",
    fields: [
      { key: "fullName", label: "Full Name", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "phone", label: "Phone", type: "text" },
      { key: "location", label: "Location", type: "text", placeholder: "City, Country" },
      { key: "linkedIn", label: "LinkedIn URL", type: "text" },
      {
        key: "summary", label: "Professional Summary", type: "textarea", rows: 4, required: true,
        hint: "AI will refine and enhance this summary",
      },
      {
        key: "experience", label: "Work Experience", type: "array", required: true, maxItems: 8,
        subFields: [
          { key: "title", label: "Job Title", type: "text", required: true },
          { key: "company", label: "Company", type: "text", required: true },
          { key: "duration", label: "Duration", type: "text", placeholder: "Jan 2020 – Dec 2022" },
          {
            key: "description", label: "Responsibilities", type: "textarea", rows: 3,
            hint: "AI will improve bullet points",
          },
        ],
      },
      {
        key: "education", label: "Education", type: "array", maxItems: 4,
        subFields: [
          { key: "degree", label: "Degree / Qualification", type: "text", required: true },
          { key: "institution", label: "Institution", type: "text", required: true },
          { key: "year", label: "Year", type: "text", placeholder: "2018" },
        ],
      },
      {
        key: "skills", label: "Skills", type: "textarea", rows: 2,
        placeholder: "JavaScript, React, TypeScript, Node.js…",
        hint: "Comma-separated list",
      },
    ],
  },
  {
    slug: "contract",
    name: "Service Contract",
    description: "Professional service agreement between two parties.",
    category: "business",
    credits: 1,
    tier: "free",
    isAiAssisted: false,
    icon: "FileSignature",
    accentColor: "#2563EB",
    fields: [
      { key: "contractDate", label: "Contract Date", type: "date", required: true },
      { key: "clientName", label: "Client Name", type: "text", required: true },
      { key: "clientAddress", label: "Client Address", type: "textarea", rows: 2 },
      { key: "providerName", label: "Service Provider Name", type: "text", required: true },
      { key: "providerAddress", label: "Provider Address", type: "textarea", rows: 2 },
      {
        key: "serviceDescription", label: "Services Description", type: "textarea", rows: 5, required: true,
        placeholder: "Describe the services to be provided…",
      },
      { key: "startDate", label: "Start Date", type: "date", required: true },
      { key: "endDate", label: "End Date", type: "date" },
      { key: "paymentAmount", label: "Payment Amount", type: "text", required: true, placeholder: "$5,000" },
      {
        key: "paymentTerms", label: "Payment Terms", type: "select",
        options: ["Net 30", "Net 15", "Due on receipt", "50% upfront, 50% on completion", "Monthly"],
      },
      { key: "governingLaw", label: "Governing Law (State/Country)", type: "text", placeholder: "California, USA" },
      { key: "additionalTerms", label: "Additional Terms", type: "textarea", rows: 4 },
    ],
  },
  {
    slug: "proposal",
    name: "Business Proposal",
    description: "AI-structured proposal with executive summary, scope, and pricing.",
    category: "business",
    credits: 3,
    tier: "free",
    isAiAssisted: true,
    icon: "Presentation",
    accentColor: "#2563EB",
    fields: [
      { key: "proposalTitle", label: "Proposal Title", type: "text", required: true },
      { key: "preparedBy", label: "Prepared By", type: "text", required: true },
      { key: "preparedFor", label: "Prepared For", type: "text", required: true },
      { key: "proposalDate", label: "Date", type: "date", required: true },
      {
        key: "executiveSummary", label: "Executive Summary", type: "textarea", rows: 5, required: true,
        hint: "AI will expand and polish this section",
      },
      {
        key: "problemStatement", label: "Problem / Opportunity", type: "textarea", rows: 4,
        hint: "AI will structure this professionally",
      },
      { key: "proposedSolution", label: "Proposed Solution", type: "textarea", rows: 5, required: true },
      {
        key: "deliverables", label: "Key Deliverables", type: "textarea", rows: 4,
        placeholder: "List your deliverables, one per line",
      },
      {
        key: "timeline", label: "Timeline", type: "textarea", rows: 3,
        placeholder: "Week 1: Discovery, Week 2-4: Implementation…",
      },
      {
        key: "pricing", label: "Pricing", type: "textarea", rows: 3,
        placeholder: "Phase 1: $2,000, Phase 2: $3,000…",
      },
      {
        key: "whyUs", label: "Why Choose Us", type: "textarea", rows: 3,
        hint: "AI will strengthen this section",
      },
    ],
  },
  {
    slug: "salary-slip",
    name: "Salary Slip",
    description: "Employee payslip with earnings, deductions, and net pay.",
    category: "hr",
    credits: 1,
    tier: "free",
    isAiAssisted: false,
    icon: "Banknote",
    accentColor: "#059669",
    fields: [
      { key: "companyName", label: "Company Name", type: "text", required: true },
      { key: "companyAddress", label: "Company Address", type: "textarea", rows: 2 },
      { key: "employeeName", label: "Employee Name", type: "text", required: true },
      { key: "employeeId", label: "Employee ID", type: "text" },
      { key: "designation", label: "Designation / Job Title", type: "text", required: true },
      { key: "department", label: "Department", type: "text" },
      { key: "payPeriod", label: "Pay Period", type: "text", required: true, placeholder: "January 2025" },
      { key: "payDate", label: "Pay Date", type: "date", required: true },
      { key: "currency", label: "Currency", type: "select", options: ["USD", "EUR", "GBP", "INR", "CAD", "AUD"] },
      {
        key: "earnings", label: "Earnings", type: "array", required: true, maxItems: 10,
        subFields: [
          { key: "description", label: "Earning Type", type: "text", required: true, placeholder: "Basic Salary" },
          { key: "amount", label: "Amount", type: "number", required: true },
        ],
      },
      {
        key: "deductions", label: "Deductions", type: "array", maxItems: 10,
        subFields: [
          { key: "description", label: "Deduction Type", type: "text", required: true, placeholder: "Tax" },
          { key: "amount", label: "Amount", type: "number", required: true },
        ],
      },
      { key: "notes", label: "Notes", type: "textarea", rows: 2 },
    ],
  },
  {
    slug: "daily-planner",
    name: "Daily Planner",
    description: "Structured daily schedule with time blocks, priorities, and notes.",
    category: "productivity",
    credits: 1,
    tier: "free",
    isAiAssisted: false,
    icon: "CalendarDays",
    accentColor: "#059669",
    fields: [
      { key: "plannerDate", label: "Date", type: "date", required: true },
      {
        key: "topPriorities", label: "Top 3 Priorities", type: "array", required: true, maxItems: 3,
        subFields: [{ key: "priority", label: "Priority", type: "text", required: true }],
      },
      {
        key: "schedule", label: "Time Blocks", type: "array", maxItems: 16,
        subFields: [
          { key: "time", label: "Time", type: "text", placeholder: "9:00 AM" },
          { key: "task", label: "Task", type: "text" },
        ],
      },
      { key: "notes", label: "Notes / Brain Dump", type: "textarea", rows: 5 },
      { key: "gratitude", label: "Gratitude / Wins", type: "textarea", rows: 3 },
    ],
  },
  {
    slug: "content-calendar",
    name: "Content Calendar",
    description: "Weekly content planning with platform, topic, and status tracking.",
    category: "productivity",
    credits: 1,
    tier: "free",
    isAiAssisted: false,
    icon: "LayoutGrid",
    accentColor: "#059669",
    fields: [
      { key: "weekOf", label: "Week Of", type: "date", required: true },
      { key: "brand", label: "Brand / Project Name", type: "text" },
      { key: "goal", label: "Weekly Goal", type: "text", placeholder: "Increase engagement by 20%" },
      {
        key: "content", label: "Content Items", type: "array", required: true, maxItems: 20,
        subFields: [
          { key: "day", label: "Day", type: "select", options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
          { key: "platform", label: "Platform", type: "select", options: ["Instagram", "Twitter/X", "LinkedIn", "Facebook", "TikTok", "YouTube", "Blog", "Email", "Other"] },
          { key: "topic", label: "Topic / Caption", type: "text", required: true },
          { key: "format", label: "Format", type: "select", options: ["Post", "Story", "Reel", "Video", "Article", "Newsletter", "Thread"] },
          { key: "status", label: "Status", type: "select", options: ["Planned", "In Progress", "Scheduled", "Published"] },
        ],
      },
      { key: "notes", label: "Notes", type: "textarea", rows: 3 },
    ],
  },
  {
    slug: "business-plan",
    name: "Business Plan",
    description: "AI-structured business plan with market analysis and financials.",
    category: "business",
    credits: 3,
    tier: "free",
    isAiAssisted: true,
    icon: "TrendingUp",
    accentColor: "#2563EB",
    fields: [
      { key: "businessName", label: "Business Name", type: "text", required: true },
      { key: "tagline", label: "Tagline / One-Liner", type: "text" },
      { key: "founderName", label: "Founder / CEO Name", type: "text", required: true },
      { key: "industry", label: "Industry", type: "text", required: true, placeholder: "SaaS / E-commerce / Healthcare…" },
      {
        key: "missionStatement", label: "Mission Statement", type: "textarea", rows: 3, required: true,
        hint: "AI will refine this",
      },
      {
        key: "problemSolution", label: "Problem & Solution", type: "textarea", rows: 5, required: true,
        hint: "AI will expand with market context",
      },
      { key: "targetMarket", label: "Target Market", type: "textarea", rows: 3, required: true },
      { key: "competitiveAdvantage", label: "Competitive Advantage", type: "textarea", rows: 3 },
      {
        key: "revenueModel", label: "Revenue Model", type: "textarea", rows: 3, required: true,
        placeholder: "Subscription, transaction fee, advertising…",
      },
      {
        key: "financialProjections", label: "Financial Projections", type: "textarea", rows: 4,
        placeholder: "Year 1: $100K, Year 2: $500K, Year 3: $1.5M…",
        hint: "AI will structure this into a clear table",
      },
      { key: "fundingNeeds", label: "Funding Requirements", type: "text", placeholder: "$500,000 seed round" },
    ],
  },
  {
    slug: "cheque",
    name: "Cheque Template",
    description: "Print-ready cheque with MICR encoding and signature line.",
    category: "finance",
    credits: 1,
    tier: "free",
    isAiAssisted: false,
    icon: "Landmark",
    accentColor: "#DC2626",
    fields: [
      { key: "payee", label: "Pay To", type: "text", required: true },
      { key: "amountNumeric", label: "Amount (numbers)", type: "number", required: true, placeholder: "1250.00" },
      { key: "date", label: "Date", type: "date", required: true },
      { key: "memo", label: "Memo", type: "text", placeholder: "Invoice #123" },
      { key: "bankName", label: "Bank Name", type: "text" },
      { key: "accountHolder", label: "Account Holder Name", type: "text", required: true },
      { key: "routingNumber", label: "Routing Number", type: "text" },
      { key: "accountNumber", label: "Account Number", type: "text" },
    ],
  },
  {
    slug: "job-description",
    name: "Job Description",
    description: "Professional job posting with requirements and benefits.",
    category: "hr",
    credits: 1,
    tier: "free",
    isAiAssisted: false,
    icon: "Briefcase",
    accentColor: "#7C3AED",
    fields: [
      { key: "jobTitle", label: "Job Title", type: "text", required: true },
      { key: "companyName", label: "Company Name", type: "text", required: true },
      { key: "location", label: "Location", type: "text", placeholder: "Remote / New York, NY" },
      {
        key: "employmentType", label: "Employment Type", type: "select",
        options: ["Full-time", "Part-time", "Contract", "Freelance", "Internship"],
      },
      { key: "salaryRange", label: "Salary Range", type: "text", placeholder: "$80,000 – $120,000/year" },
      { key: "aboutCompany", label: "About the Company", type: "textarea", rows: 4 },
      { key: "roleOverview", label: "Role Overview", type: "textarea", rows: 4, required: true },
      {
        key: "responsibilities", label: "Key Responsibilities", type: "textarea", rows: 6, required: true,
        placeholder: "- Lead product development\n- Manage team of 5 engineers\n- …",
      },
      {
        key: "requirements", label: "Requirements", type: "textarea", rows: 5, required: true,
        placeholder: "- 3+ years experience\n- Strong TypeScript skills\n- …",
      },
      { key: "niceToHave", label: "Nice to Have", type: "textarea", rows: 3 },
      {
        key: "benefits", label: "Benefits & Perks", type: "textarea", rows: 4,
        placeholder: "- Health insurance\n- Remote work\n- 401k matching\n- …",
      },
      { key: "howToApply", label: "How to Apply", type: "textarea", rows: 3 },
    ],
  },
];

export function getTemplate(slug: string): TemplateDefinition | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}
