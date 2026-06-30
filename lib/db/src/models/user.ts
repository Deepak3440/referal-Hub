import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const workExperienceSchema = new Schema(
  {
    company: { type: String, required: true },
    role: { type: String, default: null },
    fromYear: { type: String, default: null },
    toYear: { type: String, default: null },
    description: { type: String, default: null },
  },
  { _id: false },
);

const projectSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: null },
    technologies: { type: String, default: null },
  },
  { _id: false },
);

const educationSchema = new Schema(
  {
    level: { type: String, enum: ["UG", "PG", "PhD"], required: true },
    institution: { type: String, required: true },
    stream: { type: String, default: null },
    batchYear: { type: Number, default: null },
  },
  { _id: false },
);

const researchPaperSchema = new Schema(
  {
    title: { type: String, required: true },
    publication: { type: String, default: null },
    year: { type: Number, default: null },
    link: { type: String, default: null },
  },
  { _id: false },
);

const certificationSchema = new Schema(
  {
    name: { type: String, required: true },
    issuer: { type: String, default: null },
    year: { type: Number, default: null },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    mobile: { type: String, default: null },
    headline: { type: String, default: null },
    bio: { type: String, default: null },
    company: { type: String, default: null },
    currentRole: { type: String, default: null },
    experienceYears: { type: Number, default: null },
    skills: { type: [String], default: [] },
    linkedinUrl: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    resumeScore: { type: Number, default: null },
    successRate: { type: Number, default: null },
    totalPoints: { type: Number, required: true, default: 0 },
    isWorkingProfessional: { type: Boolean, default: false },
    isConsultant: { type: Boolean, default: false },
    mentorshipDurationMinutes: { type: Number, default: null },
    mentorshipPriceInr: { type: Number, default: null },
    mentorshipTopics: { type: [String], default: [] },
    mentorshipSessionsCompleted: { type: Number, default: 0 },
    memberType: { type: String, enum: ["student", "alumni"], default: "student" },
    workExperiences: { type: [workExperienceSchema], default: [] },
    projects: { type: [projectSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    researchPapers: { type: [researchPaperSchema], default: [] },
    certifications: { type: [certificationSchema], default: [] },
    isProfileComplete: { type: Boolean, required: true, default: false },
    emailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, default: null, select: false },
    emailVerificationExpiresAt: { type: Date, default: null, select: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
    versionKey: false,
  },
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export type User = UserDoc & { _id: mongoose.Types.ObjectId };

export const UserModel: Model<UserDoc> =
  mongoose.models.User ?? mongoose.model<UserDoc>("User", userSchema);

export function toUserProfile(user: UserDoc | null) {
  if (!user) return null;

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    mobile: user.mobile,
    headline: user.headline,
    bio: user.bio,
    company: user.company,
    currentRole: user.currentRole,
    experienceYears: user.experienceYears,
    skills: user.skills,
    linkedinUrl: user.linkedinUrl,
    avatarUrl: user.avatarUrl,
    resumeScore: user.resumeScore,
    successRate: user.successRate,
    totalPoints: user.totalPoints,
    isWorkingProfessional: user.isWorkingProfessional ?? false,
    isConsultant: user.isConsultant ?? false,
    mentorshipDurationMinutes: user.mentorshipDurationMinutes ?? null,
    mentorshipPriceInr: user.mentorshipPriceInr ?? null,
    mentorshipTopics: user.mentorshipTopics ?? [],
    mentorshipSessionsCompleted: user.mentorshipSessionsCompleted ?? 0,
    memberType: user.memberType ?? "student",
    workExperiences: user.workExperiences ?? [],
    projects: user.projects ?? [],
    education: user.education ?? [],
    researchPapers: user.researchPapers ?? [],
    certifications: user.certifications ?? [],
    isProfileComplete: user.isProfileComplete,
    emailVerified: user.emailVerified ?? false,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt?.toISOString(),
  };
}
