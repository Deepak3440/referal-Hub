export const MENTORSHIP_STATS = [
  { label: "300+ Mentors", sub: "Expert alumni" },
  { label: "2000+ Sessions", sub: "Booked on Referaa" },
  { label: "95% Satisfaction", sub: "From mentees" },
  { label: "25+ Companies", sub: "Top employers" },
] as const;

export const MENTOR_CATEGORIES = [
  { id: "software", label: "Software Engineering", keywords: ["software", "engineer", "developer", "react", "java", "frontend", "backend", "full stack"] },
  { id: "data", label: "Data Science", keywords: ["data", "analyst", "scientist", "ml", "machine learning", "sql", "python"] },
  { id: "product", label: "Product Management", keywords: ["product", "pm", "manager", "strategy"] },
  { id: "mba", label: "MBA Guidance", keywords: ["mba", "business", "management", "consulting"] },
  { id: "interview", label: "Interview Preparation", keywords: ["interview", "dsa", "system design", "coding", "placement"] },
  { id: "career", label: "Career Switch", keywords: ["career", "switch", "transition", "guidance"] },
  { id: "abroad", label: "Study Abroad", keywords: ["abroad", "ms", "gre", "university", "overseas"] },
] as const;

export type MentorCategoryId = (typeof MENTOR_CATEGORIES)[number]["id"] | "";

export const MENTOR_TOPIC_IDS = MENTOR_CATEGORIES.map((c) => c.id);

export const EXPERIENCE_FILTER_OPTIONS = [
  { value: "", label: "Any experience" },
  { value: "0-2", label: "0–2 years" },
  { value: "3-5", label: "3–5 years" },
  { value: "5+", label: "5+ years" },
] as const;

export const SESSION_LENGTH_OPTIONS = [
  { value: "", label: "Any length" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
] as const;

export const PRICE_FILTER_OPTIONS = [
  { value: "", label: "Any price" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
] as const;

export const SPECIALISATION_FILTER_OPTIONS = [
  { value: "", label: "Any specialisation" },
  { value: "Computer Science", label: "Computer Science (CSE)" },
  { value: "Information Technology", label: "Information Technology (IT)" },
  { value: "Electronics", label: "Electronics (ECE)" },
  { value: "Mechanical", label: "Mechanical" },
  { value: "MBA", label: "MBA / Business" },
  { value: "Civil", label: "Civil" },
] as const;

export const MENTOR_COMPANY_FILTER_OPTIONS = [
  "Google",
  "Microsoft",
  "Amazon",
  "Meta",
  "TCS",
  "Infosys",
  "Wipro",
  "HCL",
  "Accenture",
  "Deloitte",
  "Flipkart",
  "Goldman Sachs",
] as const;

export const MENTOR_COLLEGE_FILTER_OPTIONS = [
  "Moradabad Institute of Technology",
] as const;

export const MENTOR_PASSOUT_FILTER_OPTIONS = ["2023", "2024", "2025", "2026"] as const;
