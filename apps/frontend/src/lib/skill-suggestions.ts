/** Common skills — used for profile & job autocomplete (Naukri / LinkedIn style). */
export const SKILL_SUGGESTIONS = [
  "Java",
  "Python",
  "JavaScript",
  "TypeScript",
  "C++",
  "C#",
  "Go",
  "Rust",
  "Kotlin",
  "Swift",
  "PHP",
  "Ruby",
  "React",
  "React Native",
  "Angular",
  "Vue.js",
  "Next.js",
  "Node.js",
  "Express.js",
  "Spring Boot",
  "Django",
  "FastAPI",
  ".NET",
  "HTML",
  "CSS",
  "Tailwind CSS",
  "Flutter",
  "Android",
  "iOS",
  "SQL",
  "MySQL",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "Elasticsearch",
  "AWS",
  "Azure",
  "Google Cloud",
  "Docker",
  "Kubernetes",
  "Terraform",
  "DevOps",
  "CI/CD",
  "Git",
  "REST APIs",
  "GraphQL",
  "Microservices",
  "System Design",
  "Data Structures",
  "Algorithms",
  "Machine Learning",
  "Deep Learning",
  "Data Science",
  "Data Analysis",
  "TensorFlow",
  "PyTorch",
  "Pandas",
  "NumPy",
  "Power BI",
  "Tableau",
  "Excel",
  "Product Management",
  "Project Management",
  "Agile",
  "Scrum",
  "Leadership",
  "Communication",
  "Problem Solving",
  "Team Management",
  "Interview Prep",
  "Mentoring",
  "Business Analysis",
  "UI/UX Design",
  "Figma",
  "Sales",
  "Marketing",
  "Digital Marketing",
  "SEO",
  "Content Writing",
  "Finance",
  "Accounting",
  "Human Resources",
] as const;

export function parseSkills(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinSkills(skills: string[]): string {
  return skills.join(", ");
}

export function filterSkillSuggestions(query: string, selected: string[], limit = 8): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const selectedLower = new Set(selected.map((s) => s.toLowerCase()));

  return SKILL_SUGGESTIONS.filter((skill) => {
    if (selectedLower.has(skill.toLowerCase())) return false;
    return skill.toLowerCase().includes(q);
  }).slice(0, limit);
}
