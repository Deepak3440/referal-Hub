import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth, type SignUpPayload } from "@/lib/auth";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { AuthFormSection } from "@/components/auth/auth-form-section";
import { CollegePassoutFields } from "@/components/auth/college-passout-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SearchableCareerField } from "@/components/ui/searchable-career-field";
import {
  ProfilePhotoPicker,
  type ProfilePhotoValue,
} from "@/components/profile/profile-photo-picker";
import {
  COLLEGE_OPTIONS,
  deriveMemberType,
} from "@/lib/college-options";

export default function SignUpPage() {
  const [, setLocation] = useLocation();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [collegeName, setCollegeName] = useState<string>(COLLEGE_OPTIONS[0]);
  const [passoutYear, setPassoutYear] = useState<number | "">("");
  const [isWorkingProfessional, setIsWorkingProfessional] = useState<"yes" | "no">("no");
  const [company, setCompany] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [isConsultant, setIsConsultant] = useState<"yes" | "no">("no");
  const [profilePhoto, setProfilePhoto] = useState<ProfilePhotoValue>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isAlumni = useMemo(
    () => typeof passoutYear === "number" && deriveMemberType(passoutYear) === "alumni",
    [passoutYear],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (passoutYear === "") {
      setError("Please select your passout year.");
      return;
    }

    if (isAlumni && isWorkingProfessional === "yes") {
      if (!company.trim() || !currentRole.trim() || !experienceYears) {
        setError("Please fill company, role, and total experience.");
        return;
      }
    }

    const payload: SignUpPayload = {
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      collegeName,
      passoutYear,
      memberType: deriveMemberType(passoutYear),
      isWorkingProfessional: isAlumni && isWorkingProfessional === "yes",
      isConsultant: isConsultant === "yes",
      ...(isAlumni && isWorkingProfessional === "yes"
        ? {
            company: company.trim(),
            currentRole: currentRole.trim(),
            experienceYears: Number(experienceYears),
          }
        : {}),
      ...(profilePhoto
        ? {
            avatarData: profilePhoto.data,
            avatarMimeType: profilePhoto.mimeType,
          }
        : {}),
    };

    setLoading(true);
    try {
      const result = await signUp(payload);
      if ("requiresVerification" in result) {
        setLocation(`/verify-email-pending?email=${encodeURIComponent(result.email)}`);
        return;
      }
      setLocation("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout
      wide
      title="Create your account"
      subtitle="Join alumni & students — get referrals, mentorship, and career support"
    >
      <form onSubmit={handleSubmit} className="space-y-6 overflow-visible">
        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</p>
        )}

        <AuthFormSection title="Personal details">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              className="h-11 bg-background shadow-sm"
            />
          </div>

          <ProfilePhotoPicker
            fullName={fullName}
            value={profilePhoto}
            onChange={setProfilePhoto}
            onError={setError}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 bg-background shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="h-11 bg-background shadow-sm"
              />
            </div>
          </div>
        </AuthFormSection>

        <CollegePassoutFields
          collegeName={collegeName}
          passoutYear={passoutYear}
          onCollegeChange={setCollegeName}
          onPassoutYearChange={setPassoutYear}
          className="overflow-visible border-border/70 bg-card/50 p-4 sm:p-5"
        />

        {isAlumni && (
          <AuthFormSection
            title="Work experience"
            description="Optional — helps others find you for referrals and mentorship."
            className="overflow-visible"
          >
            <div className="space-y-3">
              <Label className="text-sm">Are you a working professional?</Label>
              <RadioGroup
                value={isWorkingProfessional}
                onValueChange={(v) => setIsWorkingProfessional(v as "yes" | "no")}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yes" id="pro-yes" />
                  <Label htmlFor="pro-yes" className="cursor-pointer font-normal">Yes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id="pro-no" />
                  <Label htmlFor="pro-no" className="cursor-pointer font-normal">No</Label>
                </div>
              </RadioGroup>
            </div>

            {isWorkingProfessional === "yes" && (
              <div className="space-y-4 overflow-visible border-t border-border/60 pt-4">
                <div className="grid gap-4 overflow-visible sm:grid-cols-2">
                  <SearchableCareerField
                    kind="company"
                    label="Company name"
                    value={company}
                    onChange={setCompany}
                    placeholder="e.g. Google, TCS, Infosys"
                  />
                  <SearchableCareerField
                    kind="role"
                    label="Role"
                    value={currentRole}
                    onChange={setCurrentRole}
                    placeholder="e.g. Software Engineer"
                  />
                </div>
                <div className="space-y-2 sm:max-w-xs">
                  <Label htmlFor="experience">Total experience (years)</Label>
                  <Input
                    id="experience"
                    type="number"
                    min="0"
                    max="50"
                    placeholder="3"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className="h-11 bg-background shadow-sm"
                  />
                </div>
              </div>
            )}
          </AuthFormSection>
        )}

        <AuthFormSection
          title="Mentorship"
          description="Consultants can offer 1:1 mentorship sessions to other members."
        >
          <RadioGroup
            value={isConsultant}
            onValueChange={(v) => setIsConsultant(v as "yes" | "no")}
            className="flex gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="yes" id="consult-yes" />
              <Label htmlFor="consult-yes" className="cursor-pointer font-normal">
                Yes, I want to mentor
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="no" id="consult-no" />
              <Label htmlFor="consult-no" className="cursor-pointer font-normal">Not now</Label>
            </div>
          </RadioGroup>
          {isConsultant === "yes" && (
            <p className="rounded-lg bg-primary/10 px-3 py-2.5 text-xs leading-relaxed text-primary">
              After signup, open <strong>Profile → Edit Profile</strong> to add your mentorship details.
            </p>
          )}
        </AuthFormSection>

        <Button type="submit" className="h-12 w-full rounded-full text-sm font-semibold shadow-sm" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="font-medium text-primary hover:underline">
            Terms &amp; Conditions
          </Link>
          .
        </p>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthSplitLayout>
  );
}
