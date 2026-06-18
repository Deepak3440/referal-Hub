import { Router, type IRouter } from "express";
import {
  JobModel,
  SavedJobModel,
  UserModel,
  ReferralModel,
  getNextSequence,
  toJob,
  toReferral,
  toUserProfile,
  type JobDoc,
  type ReferralDoc,
} from "@workspace/db";
import { findPublicUserById, toPublicUserProfile } from "../lib/public-user";
import { optionalAuth, requireAuth } from "../middlewares/auth";
import {
  CreateJobBody,
  UpdateJobBody,
  ListJobsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.use(optionalAuth);

function toMyReferralOnJob(ref: ReferralDoc) {
  return {
    id: ref.id,
    status: ref.status,
    note: ref.note ?? null,
    totalPointsCredited: ref.totalPointsCredited ?? 0,
    totalPointsDeducted: ref.totalPointsDeducted ?? 0,
    createdAt: ref.createdAt.toISOString(),
    updatedAt: ref.updatedAt?.toISOString(),
  };
}

async function enrichJob(
  job: JobDoc,
  currentUserId?: number,
  referralByJobId?: Map<number, ReferralDoc>,
) {
  const poster = await findPublicUserById(job.posterId);
  if (!poster) return null;

  let isSaved = false;
  const isOwnJob = currentUserId ? job.posterId === currentUserId : false;
  const myRef = currentUserId ? referralByJobId?.get(job.id) : undefined;
  const myReferralStatus = myRef?.status ?? null;
  const myReferral = myRef ? toMyReferralOnJob(myRef) : null;

  if (currentUserId) {
    const saved = await SavedJobModel.findOne({ userId: currentUserId, jobId: job.id }).lean();
    isSaved = Boolean(saved);
  }

  const referralCount = await ReferralModel.countDocuments({ jobId: job.id });

  return {
    ...toJob(job),
    poster: toPublicUserProfile(poster),
    isSaved,
    referralCount,
    isOwnJob,
    myReferralStatus,
    myReferral,
  };
}

router.get("/jobs", async (req, res): Promise<void> => {
  const filters = ListJobsQueryParams.parse(req.query);

  const query: Record<string, unknown> = { status: "active" };

  if (filters.company) {
    query.company = { $regex: filters.company, $options: "i" };
  }
  if (filters.title) {
    query.title = { $regex: filters.title, $options: "i" };
  }
  if (filters.location) {
    query.location = { $regex: filters.location, $options: "i" };
  }
  if (filters.experienceMin != null) {
    query.experienceMin = { $gte: filters.experienceMin };
  }
  if (filters.salaryMin != null) {
    query.salaryMin = { $gte: filters.salaryMin };
  }
  if (filters.remote === "true") {
    query.isRemote = true;
  }

  const userId = (req as any).currentUser?.id;
  const scope = filters.scope ?? "community";
  if (scope === "community" && userId) {
    query.posterId = { $ne: userId };
  }

  const jobs = await JobModel.find(query).sort({ createdAt: -1 }).lean();

  let referralByJobId = new Map<number, ReferralDoc>();
  if (userId) {
    const refs = await ReferralModel.find({ requesterId: userId }).lean();
    referralByJobId = new Map(refs.map((r) => [r.jobId, r]));
  }

  const enriched = (
    await Promise.all(jobs.map((j) => enrichJob(j, userId, referralByJobId)))
  ).filter((j) => j !== null);

  const visible =
    scope === "community" && userId
      ? enriched.filter((j) => j.posterId !== userId)
      : enriched;

  res.json(visible);
});

router.post("/jobs", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number; memberType?: string } }).currentUser;

  if (user.memberType !== "alumni") {
    res.status(403).json({ error: "Only alumni can post jobs." });
    return;
  }

  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const body = { ...parsed.data };
  if (!body.salaryDisclosed) {
    body.salaryMin = undefined;
    body.salaryMax = undefined;
  } else {
    const min = body.salaryMin ?? 0;
    const max = body.salaryMax ?? 0;
    if (min <= 0 && max <= 0) {
      res.status(400).json({ error: "Enter salary range when salary is disclosed." });
      return;
    }
    if (min > 0 && max > 0 && max < min) {
      res.status(400).json({ error: "Maximum salary must be greater than or equal to minimum." });
      return;
    }
  }

  const id = await getNextSequence("job");
  const job = await JobModel.create({
    id,
    ...body,
    salaryMin: body.salaryDisclosed ? (body.salaryMin ?? null) : null,
    salaryMax: body.salaryDisclosed ? (body.salaryMax ?? null) : null,
    posterId: user.id,
  });

  res.status(201).json(await enrichJob(job.toObject(), user.id));
});

router.get("/jobs/my", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).currentUser;
  const jobs = await JobModel.find({ posterId: user.id }).sort({ createdAt: -1 }).lean();

  const enriched = await Promise.all(jobs.map((j) => enrichJob(j, user.id)));
  res.json(enriched);
});

router.get("/jobs/saved", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).currentUser;
  const saved = await SavedJobModel.find({ userId: user.id }).lean();
  const jobIds = saved.map((s) => s.jobId);
  const jobs = await JobModel.find({ id: { $in: jobIds } }).lean();

  const refs = await ReferralModel.find({ requesterId: user.id, jobId: { $in: jobIds } }).lean();
  const referralByJobId = new Map(refs.map((r) => [r.jobId, r]));

  const enriched = await Promise.all(jobs.map((j) => enrichJob(j, user.id, referralByJobId)));
  res.json(enriched);
});

router.get("/jobs/:jobId/referrals", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).currentUser;
  const raw = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const jobId = parseInt(raw, 10);

  const job = await JobModel.findOne({ id: jobId }).lean();
  if (!job || job.posterId !== user.id) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const referrals = await ReferralModel.find({ jobId }).sort({ createdAt: -1 }).lean();
  const enriched = await Promise.all(
    referrals.map(async (ref) => {
      const requester = await UserModel.findOne({ id: ref.requesterId }).lean();
      return {
        ...toReferral(ref),
        requester: toUserProfile(requester),
      };
    }),
  );
  res.json(enriched);
});

router.get("/jobs/:jobId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const id = parseInt(raw, 10);

  const job = await JobModel.findOne({ id }).lean();
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const userId = (req as any).currentUser?.id;
  let referralByJobId = new Map<number, ReferralDoc>();
  if (userId) {
    const ref = await ReferralModel.findOne({ requesterId: userId, jobId: id }).lean();
    if (ref) referralByJobId.set(id, ref);
  }
  const enriched = await enrichJob(job, userId, referralByJobId);
  if (!enriched) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(enriched);
});

router.patch("/jobs/:jobId", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).currentUser;
  const raw = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const id = parseInt(raw, 10);

  const parsed = UpdateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const body = { ...parsed.data };
  if (body.salaryDisclosed === false) {
    body.salaryMin = null as unknown as undefined;
    body.salaryMax = null as unknown as undefined;
  } else if (body.salaryDisclosed === true) {
    const min = body.salaryMin ?? 0;
    const max = body.salaryMax ?? 0;
    if (min <= 0 && max <= 0) {
      res.status(400).json({ error: "Enter salary range when salary is disclosed." });
      return;
    }
    if (min > 0 && max > 0 && max < min) {
      res.status(400).json({ error: "Maximum salary must be greater than or equal to minimum." });
      return;
    }
  }

  const existing = await JobModel.findOne({ id }).lean();
  if (!existing || existing.posterId !== user.id) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const updated = await JobModel.findOneAndUpdate(
    { id },
    {
      ...body,
      ...(body.salaryDisclosed === false
        ? { salaryMin: null, salaryMax: null }
        : {}),
    },
    { new: true },
  ).lean();

  res.json(await enrichJob(updated!, user.id));
});

router.delete("/jobs/:jobId", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).currentUser;
  const raw = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const id = parseInt(raw, 10);

  const existing = await JobModel.findOne({ id }).lean();
  if (!existing || existing.posterId !== user.id) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  await JobModel.deleteOne({ id });
  await SavedJobModel.deleteMany({ jobId: id });
  res.sendStatus(204);
});

router.post("/jobs/:jobId/save", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).currentUser;
  const raw = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const jobId = parseInt(raw, 10);

  const existing = await SavedJobModel.findOne({ userId: user.id, jobId }).lean();
  if (!existing) {
    const id = await getNextSequence("savedJob");
    await SavedJobModel.create({ id, userId: user.id, jobId });
  }

  res.json({ saved: true });
});

router.delete("/jobs/:jobId/save", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).currentUser;
  const raw = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const jobId = parseInt(raw, 10);

  await SavedJobModel.deleteOne({ userId: user.id, jobId });
  res.json({ saved: false });
});

export default router;
