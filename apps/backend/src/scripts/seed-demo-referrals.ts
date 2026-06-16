/**
 * Seeds 5 referral requests with different statuses for the "senior Fuck" job (alumni deeku).
 * Run: pnpm seed:demo-referrals
 */
import bcrypt from "bcryptjs";
import {
  connectDB,
  disconnectDB,
  UserModel,
  JobModel,
  ReferralModel,
  getNextSequence,
} from "@workspace/db";

const JOB_TITLE_MATCH = /senior\s*fuck/i;
const ALUMNI_MATCH = /deeku|deepu/i;

const DUMMY_REQUESTERS = [
  { fullName: "Aarav Sharma", email: "aarav.demo@referaa.com", note: "3 yrs React experience, ready to relocate to Jammu." },
  { fullName: "Priya Nair", email: "priya.demo@referaa.com", note: "Former intern — would love a referral for this senior role." },
  { fullName: "Rohan Mehta", email: "rohan.demo@referaa.com", note: "Strong in system design. Portfolio link in profile." },
  { fullName: "Sneha Kapoor", email: "sneha.demo@referaa.com", note: "Currently interviewing elsewhere; need referral soon." },
  { fullName: "Vikram Singh", email: "vikram.demo@referaa.com", note: "Alumni from same college — happy to share resume." },
] as const;

const STATUSES = [
  "pending",
  "accepted",
  "referred",
  "interviewing",
  "hired",
] as const;

async function ensureRequester(
  demo: (typeof DUMMY_REQUESTERS)[number],
): Promise<number> {
  const email = demo.email.toLowerCase();
  const existing = await UserModel.findOne({ email }).lean();
  if (existing) return existing.id;

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const id = await getNextSequence("user");
  await UserModel.create({
    id,
    fullName: demo.fullName,
    email,
    passwordHash,
    headline: "Looking for referrals",
    totalPoints: 200,
    isProfileComplete: true,
    isWorkingProfessional: false,
    memberType: "student",
    skills: ["JavaScript", "React"],
  });
  console.log(`  Created requester ${demo.fullName} (${email})`);
  return id;
}

async function seed() {
  await connectDB();

  const alumni = await UserModel.findOne({
    $or: [{ fullName: ALUMNI_MATCH }, { email: ALUMNI_MATCH }],
    memberType: "alumni",
  }).lean();

  if (!alumni) {
    const anyAlumni = await UserModel.findOne({ memberType: "alumni" }).lean();
    if (!anyAlumni) {
      throw new Error("No alumni user found. Run pnpm seed:demo first.");
    }
    console.warn(`Alumni deeku/deepu not found — using ${anyAlumni.fullName} (${anyAlumni.email})`);
  }

  const poster = alumni ?? (await UserModel.findOne({ memberType: "alumni" }).lean());
  if (!poster) throw new Error("No alumni poster found");

  let job = await JobModel.findOne({ title: JOB_TITLE_MATCH, posterId: poster.id }).lean();
  if (!job) {
    job = await JobModel.findOne({ title: JOB_TITLE_MATCH }).lean();
  }
  if (!job) {
    job = await JobModel.findOne({ posterId: poster.id }).sort({ createdAt: -1 }).lean();
    if (job) {
      console.warn(`Job "${JOB_TITLE_MATCH}" not found — using latest job: "${job.title}" (id ${job.id})`);
    }
  }
  if (!job) {
    throw new Error('No job found for alumni. Post the "senior Fuck" opening first, then re-run seed.');
  }

  console.log(`Target job: "${job.title}" (id ${job.id}) · poster: ${poster.fullName}`);

  const existing = await ReferralModel.find({ jobId: job.id }).lean();
  if (existing.length >= 5) {
    console.log(`Already ${existing.length} referrals on this job — skipping create.`);
    console.log(existing.map((r) => `  #${r.id} status=${r.status} requesterId=${r.requesterId}`).join("\n"));
    await disconnectDB();
    return;
  }

  // Remove old single test referral if re-seeding with fewer than 5
  if (existing.length > 0 && existing.length < 5) {
    await ReferralModel.deleteMany({ jobId: job.id });
    console.log(`Cleared ${existing.length} existing referral(s) to re-seed 5 statuses.`);
  }

  console.log("Creating 5 dummy referrals with different statuses…");

  for (let i = 0; i < DUMMY_REQUESTERS.length; i++) {
    const demo = DUMMY_REQUESTERS[i];
    const status = STATUSES[i];
    const requesterId = await ensureRequester(demo);
    const id = await getNextSequence("referral");

    await ReferralModel.create({
      id,
      jobId: job.id,
      requesterId,
      referrerId: job.posterId,
      status,
      note: demo.note,
      rewardStagesApplied: status === "pending" ? ["request"] : ["request", status],
      totalPointsDeducted: status === "pending" ? 10 : 10 + (status === "accepted" ? 0 : 0),
      totalPointsCredited: status === "hired" ? 70 : status === "interviewing" ? 50 : status === "referred" ? 30 : status === "accepted" ? 20 : 10,
    });

    console.log(`  ✓ ${demo.fullName} → ${status}`);
  }

  const count = await ReferralModel.countDocuments({ jobId: job.id });
  console.log(`\nDone. Job "${job.title}" now has ${count} referral requests.`);
  console.log("Log in as the job poster to see them on Offer Referrals.");

  await disconnectDB();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
