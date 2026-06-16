import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const jobSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    company: { type: String, required: true },
    companyLogoUrl: { type: String, default: null },
    location: { type: String, required: true },
    isRemote: { type: Boolean, required: true, default: false },
    isHybrid: { type: Boolean, required: true, default: false },
    description: { type: String, required: true },
    skills: { type: [String], default: [] },
    experienceMin: { type: Number, default: null },
    experienceMax: { type: Number, default: null },
    salaryMin: { type: Number, default: null },
    salaryMax: { type: Number, default: null },
    salaryDisclosed: { type: Boolean, required: true, default: false },
    rewardPoints: { type: Number, required: true, default: 500 },
    status: { type: String, required: true, default: "active" },
    posterId: { type: Number, required: true, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
    versionKey: false,
  },
);

export type JobDoc = InferSchemaType<typeof jobSchema>;

export const JobModel: Model<JobDoc> =
  mongoose.models.Job ?? mongoose.model<JobDoc>("Job", jobSchema);

const savedJobSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    userId: { type: Number, required: true, index: true },
    jobId: { type: Number, required: true, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

savedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export type SavedJobDoc = InferSchemaType<typeof savedJobSchema>;

export const SavedJobModel: Model<SavedJobDoc> =
  mongoose.models.SavedJob ?? mongoose.model<SavedJobDoc>("SavedJob", savedJobSchema);

export function toJob(job: JobDoc) {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    companyLogoUrl: job.companyLogoUrl,
    location: job.location,
    isRemote: job.isRemote,
    isHybrid: job.isHybrid,
    description: job.description,
    skills: job.skills,
    experienceMin: job.experienceMin,
    experienceMax: job.experienceMax,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryDisclosed:
      job.salaryDisclosed ??
      Boolean((job.salaryMin ?? 0) > 0 || (job.salaryMax ?? 0) > 0),
    rewardPoints: job.rewardPoints,
    status: job.status,
    posterId: job.posterId,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt?.toISOString(),
  };
}
