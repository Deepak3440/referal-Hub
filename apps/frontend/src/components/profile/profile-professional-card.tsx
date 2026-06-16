import type { UserProfile } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Video } from "lucide-react";
import { DashboardCard } from "@/components/layout/page-header";

export function ProfileProfessionalCard({ profile }: { profile: UserProfile }) {
  return (
    <DashboardCard className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Professional Details</h3>

      <div className="grid sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Working Professional</p>
          <p className="font-medium mt-0.5">
            {profile.isWorkingProfessional ? "Yes" : "No"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Consultant</p>
          <p className="font-medium mt-0.5 flex items-center gap-2">
            {profile.isConsultant ? (
              <>
                <Video className="h-4 w-4 text-primary" />
                Yes — open for mentorship
              </>
            ) : (
              "No"
            )}
          </p>
        </div>
      </div>

      {profile.isWorkingProfessional && (
        <div className="rounded-lg bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Briefcase className="h-4 w-4 text-primary" />
            Work Information
          </div>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Organization</p>
              <p className="font-medium">{profile.company || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Role</p>
              <p className="font-medium">{profile.currentRole || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Experience</p>
              <p className="font-medium">
                {profile.experienceYears != null && profile.experienceYears > 0
                  ? `${profile.experienceYears} years`
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {profile.isWorkingProfessional && (
          <Badge variant="secondary" className="gap-1">
            <Briefcase className="h-3 w-3" />
            Professional
          </Badge>
        )}
        {profile.isConsultant && (
          <Badge className="bg-primary/10 text-primary border-0 gap-1">
            <Video className="h-3 w-3" />
            Consultant
          </Badge>
        )}
      </div>
    </DashboardCard>
  );
}
