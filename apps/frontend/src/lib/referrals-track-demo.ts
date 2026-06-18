import type { Referral } from "@workspace/api-client-react";
import type { CompanyReferralRequestResult } from "@/lib/company-referral-api";

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

const demoReferrer = {
  id: 101,
  clerkId: "demo-referrer",
  fullName: "Deepak Singh Chauhan",
  email: "deepak@demo.com",
  headline: "Senior Engineer · Carrum",
  company: "Carrum",
  currentRole: "Senior Engineer",
  skills: ["React", "Node.js"],
  totalPoints: 240,
  isWorkingProfessional: true,
  isConsultant: true,
  memberType: "alumni" as const,
  workExperiences: [],
  projects: [],
  education: [],
  researchPapers: [],
  certifications: [],
  isProfileComplete: true,
  createdAt: hoursAgo(720),
};

const demoRequester = {
  id: 102,
  clerkId: "demo-requester",
  fullName: "You (demo)",
  email: "seeker@demo.com",
  skills: [],
  totalPoints: 180,
  isWorkingProfessional: false,
  isConsultant: false,
  memberType: "student" as const,
  workExperiences: [],
  projects: [],
  education: [],
  researchPapers: [],
  certifications: [],
  isProfileComplete: true,
  createdAt: hoursAgo(48),
};

function demoJob(
  id: number,
  title: string,
  company: string,
  status: Referral["status"],
  note: string,
  hours: number,
  pointsPaid = 10,
): Referral {
  return {
    id,
    jobId: 9000 + id,
    requesterId: demoRequester.id,
    requester: demoRequester,
    referrerId: demoReferrer.id,
    referrer: demoReferrer,
    status,
    note,
    rewardTransferred: false,
    rewardStagesApplied: ["request"],
    totalPointsDeducted: pointsPaid,
    totalPointsCredited: 0,
    createdAt: hoursAgo(hours),
    updatedAt: hoursAgo(hours - 1),
    job: {
      id: 9000 + id,
      title,
      company,
      location: "Remote",
      isRemote: true,
      isHybrid: false,
      description: "Demo job opening for UI preview.",
      skills: ["TypeScript"],
      salaryDisclosed: false,
      rewardPoints: 100,
      status: "open",
      posterId: demoReferrer.id,
      poster: demoReferrer,
      isSaved: false,
      referralCount: 1,
      isOwnJob: false,
      createdAt: hoursAgo(1000),
    },
  };
}

/** 2 job requests — pending + accepted */
export const DEMO_JOB_REFERRALS: Referral[] = [
  demoJob(
    9001,
    "Marketing Associate",
    "Carrum",
    "pending",
    "I have 2 years of digital marketing experience and would love to join the growth team.",
    3,
  ),
  demoJob(
    9002,
    "Software Engineer II",
    "Carrum",
    "accepted",
    "Full-stack developer with React and Node — happy to share portfolio and resume.",
    18,
  ),
];

/** 2 company-wide requests — waiting + referred */
export const DEMO_COMPANY_REFERRALS: CompanyReferralRequestResult[] = [
  {
    id: 8001,
    requesterId: demoRequester.id,
    company: "Flipkart",
    roleTitle: "SDE 2",
    jobUrl: "https://example.com/jobs/sde2",
    note: "Looking for a backend-heavy role. 3 years Java/Spring experience.",
    resumeUrl: null,
    referrerCount: 4,
    referrerIds: [101, 102, 103, 104],
    acceptedByReferrerId: null,
    status: "pending",
    pendingReferrerCount: 4,
    workflowStatus: "pending",
    rewardPoints: 100,
    totalPointsDeducted: 10,
    totalPointsCredited: 0,
    createdAt: hoursAgo(8),
  },
  {
    id: 8002,
    requesterId: demoRequester.id,
    company: "Carrum",
    roleTitle: "SDE 2",
    jobUrl: "https://example.com/jobs/carrum-sde2",
    note: "Former intern — would appreciate a referral for the SDE2 opening.",
    resumeUrl: null,
    referrerCount: 3,
    referrerIds: [101, 105, 106],
    acceptedByReferrerId: 101,
    status: "referred",
    workflowStatus: "referred",
    rewardPoints: 100,
    totalPointsDeducted: 30,
    totalPointsCredited: 0,
    createdAt: hoursAgo(15),
    handlerReferrer: demoReferrer,
  },
];
