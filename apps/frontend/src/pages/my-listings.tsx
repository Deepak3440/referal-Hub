import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useListMyJobs,
  useGetDashboardStats,
  useCreateJob,
  useGetMe,
  getGetDashboardStatsQueryKey,
} from "@workspace/api-client-react";
import { OfferOpeningCard } from "@/components/jobs/offer-opening-card";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Briefcase,
  Sparkles,
  Clock,
  Users,
  Trophy,
  Handshake,
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
import { companyReferralApi, COMPANY_REFERRAL_QUERY_KEYS } from "@/lib/company-referral-api";
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
    skills: z.string().min(2, "Skills are required"),
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

function StatCard({
  label,
  value,
  icon: Icon,
  highlight,
  loading,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 flex items-center gap-3 transition-colors",
        highlight && "border-primary/25 bg-primary/5",
      )}
    >
      <div
        className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
          highlight ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={cn("text-xl font-bold tabular-nums", highlight && "text-primary")}>
          {loading ? "–" : value}
        </p>
      </div>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

export default function MyListings() {
  const [, setLocation] = useLocation();
  const { data: me } = useGetMe();
  const canPostJobs = isAlumniMember(me);

  useEffect(() => {
    if (me && !canPostJobs) {
      setLocation("/home");
    }
  }, [me, canPostJobs, setLocation]);

  const { data: stats, isLoading: isStatsLoading } = useGetDashboardStats();
  const { data: myJobs, isLoading: isMyJobsLoading } = useListMyJobs();
  const { data: companyIncoming } = useQuery({
    queryKey: COMPANY_REFERRAL_QUERY_KEYS.incoming,
    queryFn: () => companyReferralApi.listIncoming(),
    enabled: Boolean(me),
  });
  const companyPending =
    companyIncoming?.items.filter((r) => r.status === "pending").length ?? 0;
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
  const openingCount = myJobs?.length ?? 0;

  const onSubmit = (data: JobFormValues) => {
    const { isRemote, isHybrid } = workTypeToFlags(data.workType);
    const payload = {
      title: data.title,
      company: data.company,
      location: data.location,
      isRemote,
      isHybrid,
      description: data.description,
      skills: data.skills.split(",").map((s) => s.trim()).filter(Boolean),
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
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post a referral opening</DialogTitle>
          <DialogDescription>
            Share a role at your company. Students and alumni can request a referral from you.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
            <FormSection title="Role details">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job title</FormLabel>
                      <FormControl>
                        <Input placeholder="Senior Software Engineer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Corp" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder={locationPlaceholderForWorkType(workType)} {...field} />
                        </FormControl>
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
                      <FormLabel>Skills (comma separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="React, Node.js, TypeScript" {...field} />
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
    <div className="space-y-5">
      {/* Hero */}
      <section className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 via-card to-card overflow-hidden shadow-sm">
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Alumni referrals</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Offer referrals at your company</h2>
            <p className="text-sm text-muted-foreground max-w-lg">
              Post openings you can refer for, review incoming requests, and earn points when candidates get hired.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {postDialog}
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Openings posted"
          value={stats?.totalJobsPosted ?? 0}
          icon={Briefcase}
          loading={isStatsLoading}
        />
        <StatCard
          label="Pending requests"
          value={stats?.pendingReferrals ?? 0}
          icon={Clock}
          highlight={(stats?.pendingReferrals ?? 0) > 0}
          loading={isStatsLoading}
        />
        <StatCard
          label="Active referrals"
          value={stats?.activeReferrals ?? 0}
          icon={Users}
          loading={isStatsLoading}
        />
      </div>

      {/* Main content + sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_272px] gap-5">
        <div className="space-y-4 min-w-0">
          {me && <CompanyReferralsPanel currentUserId={me.id} />}

          <div className="space-y-1 px-0.5">
            <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-bold tracking-tight text-foreground">
              Your openings
              {!isMyJobsLoading && (
                <span className="text-muted-foreground font-semibold ml-1.5">({openingCount})</span>
              )}
            </h3>
            {openingCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <Trophy className="h-3.5 w-3.5 text-primary" />
                <span>{stats?.totalPointsEarned ?? 0} pts earned</span>
              </div>
            )}
            </div>
            <p className="text-xs text-muted-foreground">
              Job postings — manage incoming requests per opening
            </p>
          </div>

          {isMyJobsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-[200px] rounded-2xl" />
              ))}
            </div>
          ) : myJobs && myJobs.length > 0 ? (
            <div className="space-y-4">
              {myJobs.map((job) => (
                <OfferOpeningCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border bg-card text-center py-14 px-6 shadow-sm">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Briefcase className="h-7 w-7 text-primary/70" />
              </div>
              <h3 className="text-lg font-semibold">No referral openings yet</h3>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
                Post a role at your company. When someone requests a referral, you&apos;ll review and respond here.
              </p>
              <Button className="mt-5 rounded-full" onClick={() => setIsDialogOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-1.5" />
                Post your first opening
              </Button>
            </div>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-foreground font-medium mb-3">
              <Handshake className="h-4 w-4 text-primary" />
              How referrals work
            </div>
            <ol className="space-y-2.5 text-xs text-muted-foreground list-decimal list-inside">
              <li>Post an opening with role details and reward points</li>
              <li>Requesters send a note when they want your referral</li>
              <li>Accept, chat, and move them through your company process</li>
              <li>Earn points when they get referred and hired</li>
            </ol>
          </div>

          {((stats?.pendingReferrals ?? 0) > 0 || companyPending > 0) && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 dark:bg-amber-950/30 dark:border-amber-800/50 p-4 text-sm space-y-2">
              {(stats?.pendingReferrals ?? 0) > 0 && (
                <p className="font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  {stats?.pendingReferrals} pending job request
                  {(stats?.pendingReferrals ?? 0) !== 1 ? "s" : ""}
                </p>
              )}
              {companyPending > 0 && (
                <p className="font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  {companyPending} pending company request{companyPending !== 1 ? "s" : ""}
                </p>
              )}
              <p className="text-xs text-amber-700/90 dark:text-amber-300/80">
                Review company requests above or expand an opening below to manage job referrals.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
