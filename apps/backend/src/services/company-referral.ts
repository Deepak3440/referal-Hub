import {
  UserModel,
  JobModel,
  CompanyReferralRequestModel,
  MessageModel,
  getNextSequence,
  toUserProfile,
  toCompanyReferralRequest,
} from "@workspace/db";
import { buildConversationId } from "../lib/conversation";
import { createNotification } from "./notification.service";

export type CompanyReferrerRow = {
  company: string;
  companyKey: string;
  referrerCount: number;
  jobCount: number;
};

function normalizeCompanyKey(company: string): string {
  return company.trim().toLowerCase();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listCompanyReferrers(
  search?: string,
  excludeUserId?: number,
): Promise<CompanyReferrerRow[]> {
  const alumni = await UserModel.find({
    memberType: "alumni",
    company: { $exists: true, $nin: [null, ""] },
  })
    .select("id company")
    .lean();

  const grouped = new Map<string, { company: string; referrerIds: Set<number> }>();

  for (const user of alumni) {
    if (excludeUserId != null && user.id === excludeUserId) continue;
    const company = user.company?.trim();
    if (!company) continue;
    const key = normalizeCompanyKey(company);
    const existing = grouped.get(key);
    if (existing) {
      existing.referrerIds.add(user.id);
      if (company.length > existing.company.length) {
        existing.company = company;
      }
    } else {
      grouped.set(key, { company, referrerIds: new Set([user.id]) });
    }
  }

  const jobs = await JobModel.find({ status: { $ne: "closed" } }).select("company").lean();
  const jobCounts = new Map<string, number>();
  for (const job of jobs) {
    const company = job.company?.trim();
    if (!company) continue;
    const key = normalizeCompanyKey(company);
    jobCounts.set(key, (jobCounts.get(key) ?? 0) + 1);
  }

  let rows: CompanyReferrerRow[] = Array.from(grouped.entries()).map(([companyKey, value]) => ({
    company: value.company,
    companyKey,
    referrerCount: value.referrerIds.size,
    jobCount: jobCounts.get(companyKey) ?? 0,
  }));

  const q = search?.trim().toLowerCase();
  if (q) {
    rows = rows.filter((row) => row.company.toLowerCase().includes(q));
  }

  rows.sort((a, b) => b.referrerCount - a.referrerCount || a.company.localeCompare(b.company));
  return rows;
}

export async function listCompanyReferralRequestsForRequester(requesterId: number) {
  const items = await CompanyReferralRequestModel.find({ requesterId })
    .sort({ createdAt: -1 })
    .lean();

  return items.map((doc) => ({
    ...toCompanyReferralRequest(doc),
    referrerCount: doc.referrerIds?.length ?? 0,
  }));
}

export async function listCompanyReferralRequestsForReferrer(referrerId: number) {
  const items = await CompanyReferralRequestModel.find({ referrerIds: referrerId })
    .sort({ createdAt: -1 })
    .lean();

  const requesterIds = [...new Set(items.map((item) => item.requesterId))];
  const requesters = await UserModel.find({ id: { $in: requesterIds } }).lean();
  const requesterMap = new Map(requesters.map((u) => [u.id, toUserProfile(u)]));

  return items.map((doc) => ({
    ...toCompanyReferralRequest(doc),
    requester: requesterMap.get(doc.requesterId) ?? null,
  }));
}

export async function findReferrersAtCompany(company: string, excludeUserId?: number) {
  const key = normalizeCompanyKey(company);
  const filter: Record<string, unknown> = {
    memberType: "alumni",
    company: { $regex: new RegExp(`^${escapeRegex(company.trim())}$`, "i") },
  };
  if (excludeUserId != null) {
    filter.id = { $ne: excludeUserId };
  }
  const referrers = await UserModel.find(filter).lean();
  return referrers.filter((r) => normalizeCompanyKey(r.company ?? "") === key);
}

function buildCompanyRequestMessage(params: {
  company: string;
  roleTitle: string;
  jobUrl: string;
  note: string;
  resumeUrl?: string | null;
}) {
  const lines = [
    `🏢 Company referral request at ${params.company}`,
    `Role: ${params.roleTitle}`,
    `Job link: ${params.jobUrl}`,
    "",
    params.note.trim(),
  ];
  if (params.resumeUrl) {
    lines.push("", `Resume: ${params.resumeUrl}`);
  }
  return lines.join("\n");
}

export async function createCompanyReferralRequest(params: {
  requesterId: number;
  requesterName: string;
  company: string;
  roleTitle: string;
  jobUrl: string;
  note: string;
  resumeUrl?: string | null;
}) {
  const companyKey = normalizeCompanyKey(params.company);
  const allAtCompany = await findReferrersAtCompany(params.company);
  const referrers = await findReferrersAtCompany(params.company, params.requesterId);

  if (referrers.length === 0) {
    const onlySelf =
      allAtCompany.length === 1 && allAtCompany[0]?.id === params.requesterId;
    const err = new Error(
      onlySelf
        ? "You are the only alumni referrer at this company. You cannot request a referral from yourself — use a student account, or ask a teammate to join as alumni."
        : allAtCompany.length === 0
          ? "No alumni referrers at this company yet. Alumni must set their company on profile."
          : "No other alumni referrers available at this company.",
    );
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }

  const existing = await CompanyReferralRequestModel.findOne({
    requesterId: params.requesterId,
    companyKey,
  }).lean();

  if (existing) {
    const err = new Error("You already sent a company referral request for this company.");
    (err as Error & { statusCode?: number }).statusCode = 409;
    throw err;
  }

  const id = await getNextSequence("companyReferralRequest");
  const referrerIds = referrers.map((r) => r.id);
  const request = await CompanyReferralRequestModel.create({
    id,
    requesterId: params.requesterId,
    company: params.company.trim(),
    companyKey,
    roleTitle: params.roleTitle.trim(),
    jobUrl: params.jobUrl.trim(),
    note: params.note.trim(),
    resumeUrl: params.resumeUrl ?? null,
    referrerIds,
    status: "pending",
  });

  const messageBody = buildCompanyRequestMessage(params);

  await Promise.all(
    referrers.map(async (referrer) => {
      const conversationId = buildConversationId(params.requesterId, referrer.id);
      const messageId = await getNextSequence("message");
      await MessageModel.create({
        id: messageId,
        conversationId,
        senderId: params.requesterId,
        content: messageBody,
      });

      await createNotification({
        userId: referrer.id,
        type: "company_referral_requested",
        title: "Company referral request",
        message: `${params.requesterName} requested a referral at ${params.company} for ${params.roleTitle}.`,
        referenceId: id,
        referenceType: "company_referral",
        linkPath: "/my-listings",
      });
    }),
  );

  const requester = await UserModel.findOne({ id: params.requesterId }).lean();
  return {
    ...toCompanyReferralRequest(request.toObject()),
    requester: toUserProfile(requester),
    referrerCount: referrerIds.length,
  };
}
