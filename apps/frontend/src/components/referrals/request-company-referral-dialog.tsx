import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { companyReferralApi, type CompanyReferrerRow, COMPANY_REFERRAL_QUERY_KEYS } from "@/lib/company-referral-api";
import { readFileAsBase64 } from "@/lib/feed-utils";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Loader2, Upload, Users } from "lucide-react";
import { cn } from "@/lib/utils";

function companyColor(name: string) {
  const colors = [
    "bg-blue-600",
    "bg-violet-600",
    "bg-emerald-600",
    "bg-orange-600",
    "bg-rose-600",
    "bg-cyan-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

type Props = {
  company: CompanyReferrerRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function RequestCompanyReferralDialog({ company, open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [roleTitle, setRoleTitle] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [note, setNote] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);

  const reset = () => {
    setRoleTitle("");
    setJobUrl("");
    setNote("");
    setResumeFile(null);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error("No company selected");
      let resumeUrl: string | null = null;
      if (resumeFile) {
        setUploadingResume(true);
        try {
          const base64 = await readFileAsBase64(resumeFile);
          const saved = await companyReferralApi.uploadResume(base64, resumeFile.type);
          resumeUrl = saved.url;
        } finally {
          setUploadingResume(false);
        }
      }
      return companyReferralApi.createRequest({
        company: company.company,
        roleTitle: roleTitle.trim(),
        jobUrl: jobUrl.trim(),
        note: note.trim(),
        resumeUrl,
      });
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: COMPANY_REFERRAL_QUERY_KEYS.mine });
      void queryClient.invalidateQueries({ queryKey: COMPANY_REFERRAL_QUERY_KEYS.incoming });
      toast({
        title: "Request sent",
        description: `Your referral request was sent to ${result.referrerCount} alumni at ${result.company}.`,
      });
      reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const busy = mutation.isPending || uploadingResume;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleTitle.trim() || !jobUrl.trim() || !note.trim()) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  if (!company) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request a referral</DialogTitle>
          <DialogDescription>
            Submit your request to verified alumni referrers at this company.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border bg-muted/20 p-3 flex items-center gap-3">
          <div
            className={cn(
              "h-11 w-11 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0",
              companyColor(company.company),
            )}
          >
            {company.company.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{company.company}</p>
            <Badge variant="secondary" className="mt-1 text-[10px] font-normal">
              <Users className="h-3 w-3 mr-1" />
              {company.referrerCount} verified referrer{company.referrerCount !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>

        <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/40 px-3 py-2.5 text-xs text-emerald-900 dark:text-emerald-100">
          <p className="font-semibold uppercase tracking-wide text-[10px] mb-1">Available referrers</p>
          <p>
            {company.referrerCount} verified alumni at {company.company} will receive your request.
            {company.jobCount > 0 && (
              <span className="text-muted-foreground"> · {company.jobCount} active opening{company.jobCount !== 1 ? "s" : ""} posted</span>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role-title">
              Role title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="role-title"
              placeholder="e.g., Senior Software Engineer"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              disabled={busy}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="job-url">
              Job posting URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="job-url"
              placeholder="https://company.com/careers/job-123"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              disabled={busy}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Link to the job posting on the company website or job board.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Resume (optional)</Label>
            <input
              ref={resumeInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => resumeInputRef.current?.click()}
              disabled={busy}
              className="w-full rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-6 text-center hover:bg-muted/40 transition-colors disabled:opacity-50"
            >
              <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                {resumeFile ? resumeFile.name : "Click to upload resume"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">PDF or Word (max 5MB)</p>
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="elevator-pitch">
              Elevator pitch <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="elevator-pitch"
              placeholder="Think of this as your 30-second intro. What would you want an alumni referrer to know about you?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              disabled={busy}
              required
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  Send to all referrers
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { companyColor };
