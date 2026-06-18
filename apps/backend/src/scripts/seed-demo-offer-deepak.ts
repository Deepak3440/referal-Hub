/**
 * Seeds 5 company requests + 5 job referral requests for Deepak Singh Chauhan (alumni).
 *
 * Run:  pnpm seed:demo-offer-deepak
 * Clean: pnpm seed:demo-offer-deepak -- --clean
 */
import bcrypt from "bcryptjs";
import {
  connectDB,
  disconnectDB,
  UserModel,
  JobModel,
  ReferralModel,
  CompanyReferralRequestModel,
  getNextSequence,
} from "@workspace/db";

const ALUMNI_NAME = /deepak\s*singh\s*chauhan/i;
const ALUMNI_EMAIL = /thakurdeep3440/i;
const DEMO_EMAIL_DOMAIN = "@referaa-offer-demo.local";

const COMPANY_DEMOS = [
  {
    fullName: "Aarav Sharma",
    roleTitle: "Product Analyst",
    note: "2 years product ops. Strong Excel and SQL — would love a referral at your company.",
    status: "pending" as const,
    accepted: false,
  },
  {
    fullName: "Priya Nair",
    roleTitle: "SDE 2",
    note: "Full-stack developer — React, Node, MongoDB. Former intern, happy to share portfolio.",
    status: "pending" as const,
    accepted: false,
  },
  {
    fullName: "Rohan Mehta",
    roleTitle: "Data Engineer",
    note: "3 yrs Python/Spark. Built pipelines at a startup — ready to relocate.",
    status: "accepted" as const,
    accepted: true,
  },
  {
    fullName: "Sneha Kapoor",
    roleTitle: "QA Engineer",
    note: "ISTQB certified. Automation with Cypress and Playwright.",
    status: "referred" as const,
    accepted: true,
  },
  {
    fullName: "Vikram Singh",
    roleTitle: "DevOps Engineer",
    note: "AWS + Kubernetes. Led CI/CD migration at previous company.",
    status: "interviewing" as const,
    accepted: true,
  },
];

const JOB_DEMOS = [
  {
    fullName: "Pooja Verma",
    note: "MBA + 3 years growth marketing. Led campus campaigns for a fintech club.",
    status: "pending" as const,
  },
  {
    fullName: "Karan Joshi",
    note: "Strong communication skills. D2C brand internship experience.",
    status: "pending" as const,
  },
  {
    fullName: "Meera Iyer",
    note: "Portfolio includes 3 successful ad campaigns. Available immediately.",
    status: "accepted" as const,
  },
  {
    fullName: "Arjun Patel",
    note: "Graphic design lead at college fest. Proficient in Figma and Adobe Suite.",
    status: "referred" as const,
  },
  {
    fullName: "Nisha Gupta",
    note: "Backend-focused full-stack dev. Built APIs serving 50k daily users.",
    status: "interviewing" as const,
  },
];

function demoEmail(fullName: string, kind: "company" | "job"): string {
  const slug = fullName.toLowerCase().replace(/\s+/g, ".");
  return `${slug}.${kind}${DEMO_EMAIL_DOMAIN}`;
}

function normalizeCompanyKey(company: string): string {
  return company.trim().toLowerCase();
}

async function findDeepak() {
  const user = await UserModel.findOne({
    $or: [
      { fullName: /deepak\s*singh\s*chauhan/i },
      { email: /thakurdeep3440/i },
    ],
    memberType: "alumni",
  }).lean();

  if (!user) {
    throw new Error(
      "Deepak Singh Chauhan (alumni) not found. Log in once or set company on profile, then re-run.",
    );
  }
  return user;
}

async function ensureDemoStudent(fullName: string, kind: "company" | "job"): Promise<number> {
  const email = demoEmail(fullName, kind).toLowerCase();
  const existing = await UserModel.findOne({ email }).lean();
  if (existing) return existing.id;

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const id = await getNextSequence("user");
  await UserModel.create({
    id,
    fullName,
    email,
    passwordHash,
    headline: "Looking for referrals",
    totalPoints: 200,
    isProfileComplete: true,
    isWorkingProfessional: false,
    memberType: "student",
    skills: ["JavaScript", "React"],
  });
  console.log(`  + student ${fullName} (${email})`);
  return id;
}

async function getReferrerIdsAtCompany(company: string, deepakId: number): Promise<number[]> {
  const key = normalizeCompanyKey(company);
  const alumni = await UserModel.find({
    memberType: "alumni",
    company: { $exists: true, $nin: [null, ""] },
  })
    .select("id company")
    .lean();

  const ids = alumni
    .filter((u) => normalizeCompanyKey(u.company ?? "") === key)
    .map((u) => u.id);

  if (!ids.includes(deepakId)) ids.push(deepakId);
  return [...new Set(ids)];
}

async function cleanDemoData(deepakId: number) {
  const demoUsers = await UserModel.find({
    email: { $regex: /@referaa-offer-demo\.local$/i },
  }).lean();
  const demoUserIds = demoUsers.map((u) => u.id);

  if (demoUserIds.length === 0) {
    console.log("No demo offer users to clean.");
    return;
  }

  const companyDeleted = await CompanyReferralRequestModel.deleteMany({
    requesterId: { $in: demoUserIds },
  });
  const jobs = await JobModel.find({ posterId: deepakId }).select("id").lean();
  const jobIds = jobs.map((j) => j.id);
  const referralDeleted = await ReferralModel.deleteMany({
    requesterId: { $in: demoUserIds },
    jobId: { $in: jobIds },
  });

  console.log(
    `Cleaned: ${companyDeleted.deletedCount} company request(s), ${referralDeleted.deletedCount} job referral(s).`,
  );
}

async function seedCompanyRequests(
  deepakId: number,
  company: string,
  referrerIds: number[],
) {
  const companyKey = normalizeCompanyKey(company);
  const existing = await CompanyReferralRequestModel.countDocuments({
    requesterId: {
      $in: await UserModel.find({ email: { $regex: DEMO_EMAIL_DOMAIN } }).distinct("id"),
    },
    companyKey,
  });

  if (existing >= 5) {
    console.log(`Already ${existing} demo company requests — skip (use --clean to reset).`);
    return;
  }

  if (existing > 0) {
    await CompanyReferralRequestModel.deleteMany({
      requesterId: {
        $in: await UserModel.find({ email: { $regex: /\.company@referaa-offer-demo\.local$/i } }).distinct(
          "id",
        ),
      },
    });
  }

  console.log("\nCompany requests (5):");
  for (const demo of COMPANY_DEMOS) {
    const requesterId = await ensureDemoStudent(demo.fullName, "company");
    const id = await getNextSequence("companyReferralRequest");

    await CompanyReferralRequestModel.create({
      id,
      requesterId,
      company,
      companyKey,
      roleTitle: demo.roleTitle,
      jobUrl: `https://example.com/jobs/${demo.roleTitle.toLowerCase().replace(/\s+/g, "-")}`,
      note: demo.note,
      resumeUrl: null,
      referrerIds,
      acceptedByReferrerId: demo.accepted ? deepakId : null,
      rejectedReferrerIds: [],
      status: demo.status,
      rewardPoints: 100,
      rewardStagesApplied: demo.accepted ? ["request", "accepted"] : ["request"],
      totalPointsDeducted: demo.accepted ? 20 : 10,
      totalPointsCredited: 0,
    });

    console.log(`  ✓ ${demo.fullName} → ${demo.status}${demo.accepted ? "" : " (needs response)"}`);
  }
}

async function seedJobReferrals(deepakId: number) {
  const jobs = await JobModel.find({ posterId: deepakId }).sort({ createdAt: -1 }).lean();
  if (jobs.length === 0) {
    throw new Error("Deepak has no job postings. Post at least one opening on Offer Referrals, then re-run.");
  }

  const demoRequesterIds = await UserModel.find({
    email: { $regex: /\.job@referaa-offer-demo\.local$/i },
  }).distinct("id");

  const existing = await ReferralModel.countDocuments({
    requesterId: { $in: demoRequesterIds },
    jobId: { $in: jobs.map((j) => j.id) },
  });

  if (existing >= 5) {
    console.log(`\nAlready ${existing} demo job referrals — skip (use --clean to reset).`);
    return;
  }

  if (existing > 0) {
    await ReferralModel.deleteMany({
      requesterId: { $in: demoRequesterIds },
      jobId: { $in: jobs.map((j) => j.id) },
    });
  }

  console.log("\nJob referrals (5):");
  for (let i = 0; i < JOB_DEMOS.length; i++) {
    const demo = JOB_DEMOS[i];
    const job = jobs[i % jobs.length];
    const requesterId = await ensureDemoStudent(demo.fullName, "job");
    const id = await getNextSequence("referral");

    const stages = ["request"];
    if (demo.status !== "pending") stages.push(demo.status);

    await ReferralModel.create({
      id,
      jobId: job.id,
      requesterId,
      referrerId: deepakId,
      status: demo.status,
      note: demo.note,
      rewardTransferred: demo.status === "hired",
      rewardStagesApplied: stages,
      rewardPoints: job.rewardPoints ?? 100,
      totalPointsDeducted: demo.status === "pending" ? 10 : 20,
      totalPointsCredited:
        demo.status === "hired"
          ? 70
          : demo.status === "interviewing"
            ? 50
            : demo.status === "referred"
              ? 30
              : demo.status === "accepted"
                ? 20
                : 10,
    });

    console.log(
      `  ✓ ${demo.fullName} → ${job.title} @ ${job.company} · ${demo.status}${demo.status === "pending" ? " (needs response)" : ""}`,
    );
  }
}

async function main() {
  const cleanOnly = process.argv.includes("--clean");
  await connectDB();

  const deepak = await findDeepak();
  const company = deepak.company?.trim();
  if (!company) {
    throw new Error(`Set company on ${deepak.fullName}'s profile (alumni), then re-run.`);
  }

  console.log(`Alumni: ${deepak.fullName} (id ${deepak.id}) · ${deepak.email}`);
  console.log(`Company: ${company}`);

  if (cleanOnly) {
    await cleanDemoData(deepak.id);
    await disconnectDB();
    return;
  }

  await cleanDemoData(deepak.id);

  const referrerIds = await getReferrerIdsAtCompany(company, deepak.id);
  await seedCompanyRequests(deepak.id, company, referrerIds);
  await seedJobReferrals(deepak.id);

  const companyCount = await CompanyReferralRequestModel.countDocuments({
    referrerIds: deepak.id,
    requesterId: {
      $in: await UserModel.find({ email: { $regex: DEMO_EMAIL_DOMAIN } }).distinct("id"),
    },
  });
  const jobCount = await ReferralModel.countDocuments({
    referrerId: deepak.id,
    requesterId: {
      $in: await UserModel.find({ email: { $regex: DEMO_EMAIL_DOMAIN } }).distinct("id"),
    },
  });

  console.log(`\nDone for ${deepak.fullName}.`);
  console.log(`  Company requests visible to you: ${companyCount}`);
  console.log(`  Job referrals on your openings: ${jobCount}`);
  console.log("  Log in → Offer Referrals to test. Pending: 2 company + 2 job.");
  console.log("  Remove later: pnpm seed:demo-offer-deepak -- --clean");

  await disconnectDB();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
