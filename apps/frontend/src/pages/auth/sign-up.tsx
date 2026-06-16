import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth, type SignUpPayload } from "@/lib/auth";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BRAND } from "@/lib/brand";

export default function SignUpPage() {
  const [, setLocation] = useLocation();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [memberType, setMemberType] = useState<"student" | "alumni">("student");
  const [isWorkingProfessional, setIsWorkingProfessional] = useState<"yes" | "no">("no");
  const [company, setCompany] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [isConsultant, setIsConsultant] = useState<"yes" | "no">("no");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (isWorkingProfessional === "yes") {
      if (!company.trim() || !currentRole.trim() || !experienceYears) {
        setError("Please fill organization, role, and total experience.");
        return;
      }
    }

    const payload: SignUpPayload = {
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      memberType,
      isWorkingProfessional: isWorkingProfessional === "yes",
      isConsultant: isConsultant === "yes",
      ...(isWorkingProfessional === "yes"
        ? {
            company: company.trim(),
            currentRole: currentRole.trim(),
            experienceYears: Number(experienceYears),
          }
        : {}),
    };

    setLoading(true);
    try {
      await signUp(payload);
      setLocation("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout
      title="Create your account"
      subtitle={`Join ${BRAND.name} and start your referral journey`}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
            className="h-11"
          />
        </div>

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
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="h-11"
          />
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-4">
          <Label>Are you a Student or Alumni?</Label>
          <p className="text-xs text-muted-foreground">
            Alumni can post on the community feed and share job openings. Students can browse and engage.
          </p>
          <RadioGroup
            value={memberType}
            onValueChange={(v) => setMemberType(v as "student" | "alumni")}
            className="flex gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="student" id="member-student" />
              <Label htmlFor="member-student" className="font-normal cursor-pointer">Student</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="alumni" id="member-alumni" />
              <Label htmlFor="member-alumni" className="font-normal cursor-pointer">Alumni</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-4">
          <Label>Are you a working professional?</Label>
          <RadioGroup
            value={isWorkingProfessional}
            onValueChange={(v) => setIsWorkingProfessional(v as "yes" | "no")}
            className="flex gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="yes" id="pro-yes" />
              <Label htmlFor="pro-yes" className="font-normal cursor-pointer">Yes</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="no" id="pro-no" />
              <Label htmlFor="pro-no" className="font-normal cursor-pointer">No</Label>
            </div>
          </RadioGroup>

          {isWorkingProfessional === "yes" && (
            <div className="space-y-3 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor="company">Organization Name</Label>
                <Input
                  id="company"
                  placeholder="Acme Corp"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  placeholder="Software Engineer"
                  value={currentRole}
                  onChange={(e) => setCurrentRole(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">Total Experience (years)</Label>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  max="50"
                  placeholder="3"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-4">
          <Label>Would you like to be a consultant?</Label>
          <p className="text-xs text-muted-foreground">
            Consultants can offer 1:1 mentorship sessions to other members.
          </p>
          <RadioGroup
            value={isConsultant}
            onValueChange={(v) => setIsConsultant(v as "yes" | "no")}
            className="flex gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="yes" id="consult-yes" />
              <Label htmlFor="consult-yes" className="font-normal cursor-pointer">Yes</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="no" id="consult-no" />
              <Label htmlFor="consult-no" className="font-normal cursor-pointer">No</Label>
            </div>
          </RadioGroup>
          {isConsultant === "yes" && (
            <p className="text-xs text-primary bg-primary/10 rounded-lg px-3 py-2">
              After signup, go to <strong>Profile → Edit Profile</strong> to fill your mentorship details (About, Experience, Skills, Projects, Education, and more).
            </p>
          )}
        </div>

        <Button type="submit" className="w-full h-11" disabled={loading}>
          {loading ? "Creating account..." : "Sign up"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthSplitLayout>
  );
}
