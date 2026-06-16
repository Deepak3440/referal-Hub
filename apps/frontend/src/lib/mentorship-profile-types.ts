/** Mentorship / consultant profile sections — stored on user document */

export type WorkExperienceEntry = {
  company: string;
  role?: string;
  fromYear?: string;
  toYear?: string;
  description?: string;
};

export type ProjectEntry = {
  name: string;
  description?: string;
  technologies?: string;
};

export type EducationEntry = {
  level: "UG" | "PG" | "PhD";
  institution: string;
  stream?: string;
  batchYear?: number;
};

export type ResearchPaperEntry = {
  title: string;
  publication?: string;
  year?: number;
  link?: string;
};

export type CertificationEntry = {
  name: string;
  issuer?: string;
  year?: number;
};

export type MentorshipProfileFields = {
  workExperiences?: WorkExperienceEntry[];
  projects?: ProjectEntry[];
  education?: EducationEntry[];
  researchPapers?: ResearchPaperEntry[];
  certifications?: CertificationEntry[];
};

export const EMPTY_WORK: WorkExperienceEntry = { company: "", role: "", fromYear: "", toYear: "", description: "" };
export const EMPTY_PROJECT: ProjectEntry = { name: "", description: "", technologies: "" };
export const EMPTY_EDUCATION: EducationEntry = { level: "UG", institution: "", stream: "", batchYear: undefined };
export const EMPTY_RESEARCH: ResearchPaperEntry = { title: "", publication: "", year: undefined, link: "" };
export const EMPTY_CERT: CertificationEntry = { name: "", issuer: "", year: undefined };
