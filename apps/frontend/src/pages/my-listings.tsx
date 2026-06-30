import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  useListMyJobs,
  useGetDashboardStats,
  useCreateJob,
  useGetMe,
  useListReferrals,
  getGetDashboardStatsQueryKey,
  getListMyJobsQueryKey,
  getListReferralsQueryKey,
} from "@workspace/api-client-react";
import { OfferOpeningCard } from "@/components/jobs/offer-opening-card";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Briefcase,
  Clock,
  Trophy,
  Building2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { isAlumniMember } from "@/lib/user-utils";
import { useQuery } from "@tanstack/react-query";
import { CompanyReferralsPanel } from "@/components/referrals/incoming-company-referrals";
import type { ReferralFilter } from "@/components/referrals/referral-request-row";
import { companyReferralApi, COMPANY_REFERRAL_QUERY_KEYS } from "@/lib/company-referral-api";
import {
  buildJobReferralCounts,
  companyReferralFilterCounts,
  filterJobOpenings,
  jobOpeningFilterCounts,
  sumJobPending,
} from "@/lib/offer-referral-filters";
import { PageHeader, DashboardCard } from "@/components/layout/page-header";
import { SegmentFilterChip, SegmentGroup, SegmentTab } from "@/components/layout/segmented-control";
import { SearchableCareerField } from "@/components/ui/searchable-career-field";
import { SkillsInput } from "@/components/profile/skills-input";
import { parseSkills } from "@/lib/skill-suggestions";
import { cn } from "@/lib/utils";
import {
  JOB_WORK_TYPE_OPTIONS,
  locationPlaceholderForWorkType,
  workTypeToFlags,
  type JobWorkType,
} from "@/lib/job-work-type";

const jobSchema = z
  .object({
    title: z.string().min(5, "Title is required"),
    company: z.string().min(2, "Company is required"),
    location: z.string().min(2, "Location is required"),
    workType: z.enum(["remote", "hybrid", "in_office"]).default("in_office"),
    description: z.string().min(20, "Description is required"),
    skills: z.string().refine((s) => parseSkills(s).length >= 1, "Add at least one skill"),
    experienceMin: z.coerce.number().min(0).optional(),
    experienceMax: z.coerce.number().min(0).optional(),
    salaryDisclosed: z.boolean().default(false),
    salaryMin: z.coerce.number().min(0).optional(),
    salaryMax: z.coerce.number().min(0).optional(),
    rewardPoints: z.coerce.number().min(90).default(200),
  })
  .refine(
    (data) => {
      if (!data.salaryDisclosed) return true;
      const min = data.salaryMin ?? 0;
      const max = data.salaryMax ?? 0;
      return min > 0 || max > 0;
    },
    { message: "Enter at least minimum or maximum package (LPA)", path: ["salaryMin"] },
  )
  .refine(
    (data) => {
      if (!data.salaryDisclosed) return true;
      const min = data.salaryMin ?? 0;
      const max = data.salaryMax ?? 0;
      if (min > 0 && max > 0) return max >= min;
      return true;
    },
    { message: "Max package must be >= min package (LPA)", path: ["salaryMax"] },
  );

type JobFormValues = z.infer<typeof jobSchema>;

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

type OfferMainTab = "company" | "jobs";

const FILTER_LABELS: Record<ReferralFilter, string> = {
  all: "All",
  pending: "Pending",
  active: "Active",
  closed: "Closed",
};

const FILTER_EMPTY_JOBS: Partial<Record<ReferralFilter, string>> = {
  pending: "No openings with pending requests — you're all caught up.",
  active: "No openings with active referrals right now.",
  closed: "All your openings have received at least one request.",
};

export default function MyListings() {
  const [, setLocation] = useLocation();
  const { data: me } = useGetMe();
  const canPostJobs = isAlumniMember(me);

  useEffect(() => {
    if (me && !canPostJobs) {
      setLocation("/home");
    }
  }, [me, canPostJobs, setLocation]);

  const { data: stats } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() },
  });
  const { data: myJobs, isLoading: isMyJobsLoading } = useListMyJobs({
    query: { queryKey: getListMyJobsQueryKey() },
  });
  const { data: companyIncoming } = useQuery({
    queryKey: COMPANY_REFERRAL_QUERY_KEYS.incoming,
    queryFn: () => companyReferralApi.listIncoming(),
    enabled: Boolean(me),
  });
  const { data: receivedReferrals } = useListReferrals(
    { role: "referrer" },
    {
      query: {
        queryKey: getListReferralsQueryKey({ role: "referrer" }),
        enabled: Boolean(me),
      },
    },
  );
  const [mainTab, setMainTab] = useState<OfferMainTab>("company");
  const [statusFilter, setStatusFilter] = useState<ReferralFilter>("all");
  const [tabInitialized, setTabInitialized] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const createJob = useCreateJob();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: "",
      company: "",
      location: "",
      workType: "in_office" as JobWorkType,
      description: "",
      skills: "",
      experienceMin: 0,
      experienceMax: 0,
      salaryDisclosed: false,
      salaryMin: undefined,
      salaryMax: undefined,
      rewardPoints: 200,
    },
  });

  const salaryDisclosed = form.watch("salaryDisclosed");
  const workType = form.watch("workType");

  useEffect(() => {
    if (isDialogOpen && me?.company) {
      const current = form.getValues("company");
      if (!current?.trim()) {
        form.setValue("company", me.company);
      }
    }
  }, [isDialogOpen, me?.company, form]);
  const openingCount = myJobs?.length ?? 0;
  const companyItems = companyIncoming?.items ?? [];
  const jobReferralCounts = useMemo(
    () => buildJobReferralCounts(receivedReferrals ?? []),
    [receivedReferrals],
  );
  const companyCounts = useMemo(() => companyReferralFilterCounts(companyItems), [companyItems]);
  const jobCounts = useMemo(
    () => jobOpeningFilterCounts(myJobs ?? [], jobReferralCounts),
    [myJobs, jobReferralCounts],
  );
  const filteredJobs = useMemo(
    () => filterJobOpenings(myJobs ?? [], statusFilter, jobReferralCounts),
    [myJobs, statusFilter, jobReferralCounts],
  );
  const companyPending =
    companyIncoming?.items.filter((r) => r.referrerStatus === "pending").length ?? 0;
  const jobPending = sumJobPending(jobReferralCounts);
  const companyActive = companyCounts.active;

  const activeCounts = mainTab === "company" ? companyCounts : jobCounts;
  const activePending = mainTab === "company" ? companyPending : jobCounts.pending;
  const activeActive = mainTab === "company" ? companyActive : jobCounts.active;
  const closedLabel = mainTab === "company" ? "Closed" : "No requests";

  const switchTab = (tab: OfferMainTab) => {
    setMainTab(tab);
    setStatusFilter("all");
  };

  useEffect(() => {
    if (tabInitialized) return;
    if (companyPending > 0 || companyCounts.all > 0) {
      setMainTab("company");
      setTabInitialized(true);
      return;
    }
    if (!isMyJobsLoading && openingCount > 0) {
      setMainTab("jobs");
      setTabInitialized(true);
      return;
    }
    setTabInitialized(true);
  }, [tabInitialized, companyPending, companyCounts.all, isMyJobsLoading, openingCount]);

  const listCount =
    mainTab === "company" ? activeCounts[statusFilter] : filteredJobs.length;

  const onSubmit = (data: JobFormValues) => {
    const { isRemote, isHybrid } = workTypeToFlags(data.workType);
    const payload = {
      title: data.title,
      company: data.company,
      location: data.location,
      isRemote,
      isHybrid,
      description: data.description,
      skills: parseSkills(data.skills),
      experienceMin: data.experienceMin || undefined,
      experienceMax: data.experienceMax || undefined,
      salaryDisclosed: data.salaryDisclosed,
      salaryMin: data.salaryDisclosed ? data.salaryMin || undefined : undefined,
      salaryMax: data.salaryDisclosed ? data.salaryMax || undefined : undefined,
      rewardPoints: data.rewardPoints,
    };

    createJob.mutate(
      { data: payload },
      {
        onSuccess: () => {
          toast({ title: "Opening posted!" });
          setIsDialogOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: ["/api/jobs/my"] });
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
        },
        onError: () => {
          toast({ title: "Failed to post opening", variant: "destructive" });
        },
      },
    );
  };

  if (!me || !canPostJobs) {
    return null;
  }

  const postDialog = (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full gap-2 shadow-sm">
          <PlusCircle className="h-4 w-4" />
          Post opening
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto overflow-x-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Post a referral opening</DialogTitle>
          <DialogDescription>
            Share a role at your company. Students and alumni can request a referral from you.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 overflow-visible py-2">
            <FormSection title="Role details">
              <div className="space-y-4 overflow-visible">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="overflow-visible">
                      <SearchableCareerField
                        kind="role"
                        label="Job title"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="e.g. Senior Software Engineer"
                        required
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 gap-4 overflow-visible sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem className="overflow-visible">
                        <SearchableCareerField
                          kind="company"
                          label="Company"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="e.g. Google, TCS"
                          required
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem className="overflow-visible">
                        <SearchableCareerField
                          kind="location"
                          label="Location"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={locationPlaceholderForWorkType(workType)}
                          required
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="workType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Work type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                        >
                          {JOB_WORK_TYPE_OPTIONS.map((option) => (
                            <FormItem key={option.value} className="space-y-0">
                              <FormControl>
                                <label
                                  className={cn(
                                    "flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                                    field.value === option.value
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border hover:bg-muted/50",
                                  )}
                                >
                                  <RadioGroupItem value={option.value} className="sr-only" />
                                  {option.label}
                                </label>
                              </FormControl>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormDescription className="text-xs">
                        Remote · Hybrid · In office
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skills</FormLabel>
                      <FormControl>
                        <SkillsInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Type a skill — React, Java, System Design…"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="experienceMin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min experience (yrs)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="experienceMax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max experience (yrs)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </FormSection>

            <FormSection title="Compensation">
              <FormField
                control={form.control}
                name="salaryDisclosed"
                render={({ field }) => (
                  <FormItem className="rounded-xl border p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-0.5">
                        <FormLabel>Disclose package range?</FormLabel>
                        <FormDescription className="text-xs">
                          Annual CTC in lakhs per annum (LPA), e.g. 7 – 9 LPA. Shown as &quot;Not disclosed&quot; if hidden.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                    {salaryDisclosed && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <FormField
                          control={form.control}
                          name="salaryMin"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min package (LPA)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="0.5" placeholder="7" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="salaryMax"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max package (LPA)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="0.5" placeholder="9" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </FormItem>
                )}
              />
            </FormSection>

            <FormSection title="Description & rewards">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role description</FormLabel>
                      <FormControl>
                        <Textarea
                          className="h-28 resize-none"
                          placeholder="What does the role involve? Who is a good fit?"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rewardPoints"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reward points</FormLabel>
                      <FormControl>
                        <Input type="number" min="90" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Points the requester spends; you earn when you refer successfully.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-full min-w-[120px]" disabled={createJob.isPending}>
                {createJob.isPending ? "Posting..." : "Post opening"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-4">
      <PageHeader description="Review company requests and manage referrals on your posted openings.">
        {postDialog}
      </PageHeader>

      <DashboardCard className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <SegmentGroup>
            <SegmentTab
              active={mainTab === "company"}
              icon={Building2}
              label="Company"
              count={companyCounts.all}
              badge={companyPending}
              onClick={() => switchTab("company")}
            />
            <SegmentTab
              active={mainTab === "jobs"}
              icon={Briefcase}
              label="Openings"
              count={openingCount}
              badge={jobPending}
              onClick={() => switchTab("jobs")}
            />
          </SegmentGroup>

          <div className="flex flex-wrap items-center gap-2">
            <SegmentGroup>
              <SegmentFilterChip
                active={statusFilter === "all"}
                label="All"
                count={activeCounts.all}
                onClick={() => setStatusFilter("all")}
              />
              <SegmentFilterChip
                active={statusFilter === "pending"}
                label="Pending"
                count={activePending}
                highlight={activePending > 0 || (mainTab === "jobs" && jobPending > 0)}
                onClick={() => setStatusFilter("pending")}
              />
              <SegmentFilterChip
                active={statusFilter === "active"}
                label="Active"
                count={activeActive}
                onClick={() => setStatusFilter("active")}
              />
              <SegmentFilterChip
                active={statusFilter === "closed"}
                label={closedLabel}
                count={activeCounts.closed}
                onClick={() => setStatusFilter("closed")}
              />
            </SegmentGroup>
            {mainTab === "jobs" && openingCount > 0 && (
              <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
                <Trophy className="h-3 w-3 text-primary" />
                <span>{stats?.totalPointsEarned ?? 0} pts</span>
              </div>
            )}
          </div>
        </div>

        {(companyPending > 0 || jobPending > 0) && statusFilter !== "pending" && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0 text-warning" />
            {companyPending > 0 && (
              <span>
                <strong className="text-foreground">{companyPending}</strong> company pending
              </span>
            )}
            {jobPending > 0 && (
              <span>
                <strong className="text-foreground">{jobPending}</strong> job pending
              </span>
            )}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => setStatusFilter("pending")}
            >
              View pending
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-b bg-muted/10 px-4 py-2">
          <p className="text-xs text-muted-foreground">
            {mainTab === "company" ? "Company requests" : "Your openings"}
            {statusFilter !== "all" && (
              <span className="text-foreground"> · {FILTER_LABELS[statusFilter]}</span>
            )}
            {listCount > 0 && (
              <span className="text-foreground/80"> · {listCount} shown</span>
            )}
          </p>
          {statusFilter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setStatusFilter("all")}
            >
              Clear
            </Button>
          )}
        </div>

        {mainTab === "company" ? (
          me && (
            <CompanyReferralsPanel
              currentUserId={me.id}
              embedded
              statusFilter={statusFilter}
            />
          )
        ) : isMyJobsLoading ? (
          <div className="space-y-3 p-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-[180px] rounded-xl" />
            ))}
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="space-y-3 p-4">
            {filteredJobs.map((job) => {
              const pendingCount = jobReferralCounts.get(job.id)?.pending ?? 0;
              return (
                <OfferOpeningCard
                  key={job.id}
                  job={job}
                  pendingCount={pendingCount}
                  focusPending={statusFilter === "pending"}
                />
              );
            })}
          </div>
        ) : openingCount === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Briefcase className="h-5 w-5 text-primary/70" />
            </div>
            <h3 className="text-base font-semibold">No referral openings yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Post a role at your company. Referral requests will show up here.
            </p>
            <Button className="mt-4 rounded-full" size="sm" onClick={() => setIsDialogOpen(true)}>
              <PlusCircle className="mr-1.5 h-4 w-4" />
              Post opening
            </Button>
          </div>
        ) : (
          <div className="m-4 rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center">
            <Briefcase className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
            <p className="text-sm text-foreground">
              {FILTER_EMPTY_JOBS[statusFilter] ?? "No openings match this filter."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 rounded-full"
              onClick={() => setStatusFilter("all")}
            >
              Show all
            </Button>
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
