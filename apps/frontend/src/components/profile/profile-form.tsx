import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { UserProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { MentorshipFormSections } from "@/components/profile/mentorship-form-sections";
import { SkillsInput } from "@/components/profile/skills-input";
import {
  ProfilePhotoPicker,
  type ProfilePhotoValue,
} from "@/components/profile/profile-photo-picker";
import type {
  CertificationEntry,
  EducationEntry,
  ProjectEntry,
  ResearchPaperEntry,
  WorkExperienceEntry,
} from "@/lib/mentorship-profile-types";
import {
  COLLEGE_OPTIONS,
  PASSOUT_YEAR_OPTIONS,
  deriveMemberType,
  educationFromCollegePassout,
  memberTypeLabel,
  primaryCollegeFromEducation,
} from "@/lib/college-options";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableCareerField } from "@/components/ui/searchable-career-field";

const workExperienceSchema = z.object({
  company: z.string(),
  role: z.string().optional(),
  fromYear: z.string().optional(),
  toYear: z.string().optional(),
  description: z.string().optional(),
});

const projectSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  technologies: z.string().optional(),
});

const educationSchema = z.object({
  level: z.enum(["UG", "PG", "PhD"]),
  institution: z.string(),
  stream: z.string().optional(),
  batchYear: z.coerce.number().optional(),
});

const researchPaperSchema = z.object({
  title: z.string(),
  publication: z.string().optional(),
  year: z.coerce.number().optional(),
  link: z.string().optional(),
});

const certificationSchema = z.object({
  name: z.string(),
  issuer: z.string().optional(),
  year: z.coerce.number().optional(),
});

export const profileSchema = z
  .object({
    fullName: z.string().min(2, "Full name is required"),
    mobile: z.string().optional(),
    headline: z.string().min(5, "Headline is required"),
    bio: z.string().optional(),
    collegeName: z.string().min(1, "Select your college"),
    passoutYear: z.coerce.number(),
    isWorkingProfessional: z.enum(["yes", "no"]),
    company: z.string().optional(),
    currentRole: z.string().optional(),
    experienceYears: z.coerce.number().min(0).max(50).optional(),
    isConsultant: z.enum(["yes", "no"]),
    mentorshipDurationMinutes: z.coerce.number().optional(),
    mentorshipPriceInr: z.coerce.number().min(0).optional(),
    mentorshipTopics: z.array(z.string()).default([]),
    mentorshipWeeklyAvailability: z
      .array(
        z.object({
          dayOfWeek: z.number().int().min(0).max(6),
          startTime: z.string(),
          endTime: z.string(),
        }),
      )
      .default([]),
    skills: z.string().optional(),
    linkedinUrl: z.string().url().optional().or(z.literal("")),
    workExperiences: z.array(workExperienceSchema).default([]),
    projects: z.array(projectSchema).default([]),
    education: z.array(educationSchema).default([]),
    researchPapers: z.array(researchPaperSchema).default([]),
    certifications: z.array(certificationSchema).default([]),
  })
  .superRefine((data, ctx) => {
    const isAlumni = deriveMemberType(data.passoutYear) === "alumni";

    if (isAlumni && data.isWorkingProfessional === "yes") {
      if (!data.company?.trim()) {
        ctx.addIssue({ code: "custom", message: "Organization is required", path: ["company"] });
      }
      if (!data.currentRole?.trim()) {
        ctx.addIssue({ code: "custom", message: "Role is required", path: ["currentRole"] });
      }
      if (data.experienceYears == null) {
        ctx.addIssue({ code: "custom", message: "Experience is required", path: ["experienceYears"] });
      }
    }
    const skillsOk = (data.skills?.trim().length ?? 0) >= 2;
    if (data.isConsultant === "yes" && !skillsOk) {
      ctx.addIssue({ code: "custom", message: "Add at least one skill", path: ["skills"] });
    }
    if (data.isConsultant === "yes") {
      const duration = data.mentorshipDurationMinutes;
      if (!duration || ![30, 45, 60].includes(duration)) {
        ctx.addIssue({
          code: "custom",
          message: "Select session duration (30, 45, or 60 min)",
          path: ["mentorshipDurationMinutes"],
        });
      }
      if (data.mentorshipPriceInr == null || Number.isNaN(data.mentorshipPriceInr)) {
        ctx.addIssue({
          code: "custom",
          message: "Enter session fee (use 0 for free)",
          path: ["mentorshipPriceInr"],
        });
      }
      if (!data.mentorshipTopics?.length) {
        ctx.addIssue({
          code: "custom",
          message: "Select at least one mentorship topic",
          path: ["mentorshipTopics"],
        });
      }
      if (!data.mentorshipWeeklyAvailability?.length) {
        ctx.addIssue({
          code: "custom",
          message: "Add at least one weekly availability block so students can book you",
          path: ["mentorshipWeeklyAvailability"],
        });
      }
    }
    if (data.isConsultant === "no" && !skillsOk) {
      ctx.addIssue({ code: "custom", message: "At least one skill is required", path: ["skills"] });
    }
  });

export type ProfileFormValues = z.infer<typeof profileSchema>;

export type ProfilePhotoSubmit = {
  avatarData: string;
  avatarMimeType: string;
};

function mapWork(list?: UserProfile["workExperiences"]): WorkExperienceEntry[] {
  return (list ?? []).map((e) => ({
    company: e.company ?? "",
    role: e.role ?? "",
    fromYear: e.fromYear ?? "",
    toYear: e.toYear ?? "",
    description: e.description ?? "",
  }));
}

function mapProjects(list?: UserProfile["projects"]): ProjectEntry[] {
  return (list ?? []).map((p) => ({
    name: p.name ?? "",
    description: p.description ?? "",
    technologies: p.technologies ?? "",
  }));
}

function mapEducation(list?: UserProfile["education"]): EducationEntry[] {
  return (list ?? []).map((e) => ({
    level: (e.level as EducationEntry["level"]) ?? "UG",
    institution: e.institution ?? "",
    stream: e.stream ?? "",
    batchYear: e.batchYear ?? undefined,
  }));
}

function mapPapers(list?: UserProfile["researchPapers"]): ResearchPaperEntry[] {
  return (list ?? []).map((p) => ({
    title: p.title ?? "",
    publication: p.publication ?? "",
    year: p.year ?? undefined,
    link: p.link ?? "",
  }));
}

function mapCerts(list?: UserProfile["certifications"]): CertificationEntry[] {
  return (list ?? []).map((c) => ({
    name: c.name ?? "",
    issuer: c.issuer ?? "",
    year: c.year ?? undefined,
  }));
}

export function profileToFormValues(profile: UserProfile): ProfileFormValues {
  const { collegeName, passoutYear } = primaryCollegeFromEducation(profile.education);

  return {
    fullName: profile.fullName || "",
    mobile: profile.mobile || "",
    headline: profile.headline || "",
    bio: profile.bio || "",
    collegeName,
    passoutYear,
    isWorkingProfessional: profile.isWorkingProfessional ? "yes" : "no",
    company: profile.company || "",
    currentRole: profile.currentRole || "",
    experienceYears: profile.experienceYears || 0,
    isConsultant: profile.isConsultant ? "yes" : "no",
    mentorshipDurationMinutes: profile.mentorshipDurationMinutes ?? 30,
    mentorshipPriceInr: profile.mentorshipPriceInr ?? 0,
    mentorshipTopics: profile.mentorshipTopics ?? [],
    mentorshipWeeklyAvailability:
      (profile as UserProfile & { mentorshipWeeklyAvailability?: { dayOfWeek: number; startTime: string; endTime: string }[] })
        .mentorshipWeeklyAvailability ?? [],
    skills: profile.skills?.join(", ") || "",
    linkedinUrl: profile.linkedinUrl || "",
    workExperiences: mapWork(profile.workExperiences),
    projects: mapProjects(profile.projects),
    education: mapEducation(profile.education?.slice(1) ?? []),
    researchPapers: mapPapers(profile.researchPapers),
    certifications: mapCerts(profile.certifications),
  };
}

function cleanWork(list: WorkExperienceEntry[]) {
  return list.filter((e) => e.company.trim()).map((e) => ({
    company: e.company.trim(),
    role: e.role?.trim() || undefined,
    fromYear: e.fromYear?.trim() || undefined,
    toYear: e.toYear?.trim() || undefined,
    description: e.description?.trim() || undefined,
  }));
}

function cleanProjects(list: ProjectEntry[]) {
  return list.filter((p) => p.name.trim()).map((p) => ({
    name: p.name.trim(),
    description: p.description?.trim() || undefined,
    technologies: p.technologies?.trim() || undefined,
  }));
}

function cleanEducation(list: EducationEntry[]) {
  return list.filter((e) => e.institution.trim()).map((e) => ({
    level: e.level,
    institution: e.institution.trim(),
    stream: e.stream?.trim() || undefined,
    batchYear: e.batchYear || undefined,
  }));
}

function cleanPapers(list: ResearchPaperEntry[]) {
  return list.filter((p) => p.title.trim()).map((p) => ({
    title: p.title.trim(),
    publication: p.publication?.trim() || undefined,
    year: p.year || undefined,
    link: p.link?.trim() || undefined,
  }));
}

function cleanCerts(list: CertificationEntry[]) {
  return list.filter((c) => c.name.trim()).map((c) => ({
    name: c.name.trim(),
    issuer: c.issuer?.trim() || undefined,
    year: c.year || undefined,
  }));
}

export function formValuesToPayload(data: ProfileFormValues) {
  const isAlumni = deriveMemberType(data.passoutYear) === "alumni";
  const isPro = isAlumni && data.isWorkingProfessional === "yes";
  const isConsultant = data.isConsultant === "yes";
  const primaryEducation = educationFromCollegePassout(data.collegeName, data.passoutYear);
  const extraEducation = cleanEducation(data.education).filter((e) => e.level !== "UG");

  const base = {
    fullName: data.fullName,
    mobile: data.mobile,
    headline: data.headline,
    bio: data.bio,
    isWorkingProfessional: isPro,
    isConsultant,
    company: isPro ? data.company?.trim() : "",
    currentRole: isPro ? data.currentRole?.trim() : "",
    experienceYears: isPro ? data.experienceYears : 0,
    skills: (data.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    linkedinUrl: data.linkedinUrl,
    mentorshipDurationMinutes: undefined as number | undefined,
    mentorshipPriceInr: undefined as number | undefined,
    education: [...primaryEducation, ...extraEducation],
  };

  if (!isConsultant) return base;

  return {
    ...base,
    mentorshipDurationMinutes: data.mentorshipDurationMinutes ?? 30,
    mentorshipPriceInr: data.mentorshipPriceInr ?? 0,
    mentorshipTopics: data.mentorshipTopics ?? [],
    mentorshipWeeklyAvailability: data.mentorshipWeeklyAvailability ?? [],
    workExperiences: cleanWork(data.workExperiences),
    projects: cleanProjects(data.projects),
    researchPapers: cleanPapers(data.researchPapers),
    certifications: cleanCerts(data.certifications),
  };
}

function YesNoField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: "yes" | "no";
  onChange: (v: "yes" | "no") => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
      <Label>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <RadioGroup value={value} onValueChange={(v) => onChange(v as "yes" | "no")} className="flex gap-6">
        <div className="flex items-center gap-2">
          <RadioGroupItem value="yes" id={`${label}-yes`} />
          <Label htmlFor={`${label}-yes`} className="font-normal cursor-pointer">Yes</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="no" id={`${label}-no`} />
          <Label htmlFor={`${label}-no`} className="font-normal cursor-pointer">No</Label>
        </div>
      </RadioGroup>
    </div>
  );
}

export function ProfileForm({
  profile,
  onSubmit,
  isPending,
  submitLabel = "Save changes",
  onCancel,
  onPhotoUpdated,
}: {
  profile: UserProfile;
  onSubmit: (data: ProfileFormValues, photo?: ProfilePhotoSubmit) => void;
  isPending?: boolean;
  submitLabel?: string;
  onCancel?: () => void;
  onPhotoUpdated?: (avatarUrl: string) => void;
}) {
  const [profilePhoto, setProfilePhoto] = useState<ProfilePhotoValue>(null);
  const [photoError, setPhotoError] = useState("");

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileToFormValues(profile),
  });

  const isPro = form.watch("isWorkingProfessional") === "yes";
  const isConsultant = form.watch("isConsultant") === "yes";
  const fullName = form.watch("fullName");
  const passoutYear = form.watch("passoutYear");
  const isAlumni = deriveMemberType(Number(passoutYear)) === "alumni";
  const memberType = deriveMemberType(Number(passoutYear));

  useEffect(() => {
    form.reset(profileToFormValues(profile));
    setProfilePhoto(null);
    setPhotoError("");
  }, [profile, form]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => {
          setPhotoError("");
          onSubmit(
            data,
            profilePhoto
              ? { avatarData: profilePhoto.data, avatarMimeType: profilePhoto.mimeType }
              : undefined,
          );
        })}
        className="space-y-6 overflow-visible"
      >
        <ProfilePhotoPicker
          fullName={fullName}
          existingUrl={profile.avatarUrl}
          cacheKey={profile.id}
          value={profilePhoto}
          onChange={setProfilePhoto}
          onError={setPhotoError}
          uploadOnPick
          onUploaded={onPhotoUpdated}
        />
        {photoError && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{photoError}</p>
        )}

        <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
          <div>
            <p className="text-sm font-medium">College details</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Student or Alumni is set automatically from your passout year.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="collegeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>College name</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue placeholder="Select college" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COLLEGE_OPTIONS.map((college) => (
                        <SelectItem key={college} value={college}>
                          {college}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="passoutYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Passout year</FormLabel>
                  <Select
                    value={field.value ? String(field.value) : undefined}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PASSOUT_YEAR_OPTIONS.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Account type</p>
            <p className="text-sm font-semibold text-primary">{memberTypeLabel(memberType)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Jane Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="headline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Professional Headline</FormLabel>
                <FormControl>
                  <Input placeholder="Senior Software Engineer" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isAlumni && (
          <FormField
            control={form.control}
            name="isWorkingProfessional"
            render={({ field }) => (
              <FormItem>
                <YesNoField label="Are you a working professional?" value={field.value} onChange={field.onChange} />
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isAlumni && isPro && (
          <div className="grid grid-cols-1 gap-4 overflow-visible md:grid-cols-2">
            <FormField control={form.control} name="company" render={({ field }) => (
              <FormItem className="overflow-visible">
                <SearchableCareerField
                  kind="company"
                  label="Company name"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="e.g. Google, TCS, Infosys"
                />
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="currentRole" render={({ field }) => (
              <FormItem className="overflow-visible">
                <SearchableCareerField
                  kind="role"
                  label="Role"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="e.g. Software Engineer"
                />
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="experienceYears" render={({ field }) => (
              <FormItem className="md:col-span-2 md:max-w-xs">
                <FormLabel>Total experience (years)</FormLabel>
                <FormControl><Input type="number" min="0" className="h-11" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        )}

        <FormField
          control={form.control}
          name="isConsultant"
          render={({ field }) => (
            <FormItem>
              <YesNoField
                label="Would you like to be a consultant (Mentorship)?"
                description="If Yes, fill the mentorship profile below so others can book sessions with you."
                value={field.value}
                onChange={field.onChange}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {isConsultant ? (
          <MentorshipFormSections control={form.control} />
        ) : (
          <>
            <FormField control={form.control} name="skills" render={({ field }) => (
              <FormItem>
                <FormLabel>Skills</FormLabel>
                <FormControl>
                  <SkillsInput
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="e.g. React, Java, System Design"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="bio" render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea placeholder="Brief background..." className="resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </>
        )}

        <FormField control={form.control} name="linkedinUrl" render={({ field }) => (
          <FormItem>
            <FormLabel>LinkedIn URL</FormLabel>
            <FormControl><Input placeholder="https://linkedin.com/in/..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" className="sm:flex-1" onClick={onCancel}>Cancel</Button>
          )}
          <Button type="submit" className={onCancel ? "sm:flex-1" : "w-full"} disabled={isPending}>
            {isPending ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
