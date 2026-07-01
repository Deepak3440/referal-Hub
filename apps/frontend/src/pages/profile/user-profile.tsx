import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetUser, getGetUserQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConsultBookSlotDialog } from "@/components/consult/consult-book-slot-dialog";
import { CONSULT_QUERY_KEYS } from "@/lib/consult-api";
import { PageHeader, DashboardCard } from "@/components/layout/page-header";
import { ProfileProfessionalCard } from "@/components/profile/profile-professional-card";
import { MentorshipProfileView } from "@/components/profile/mentorship-profile-view";

export default function UserProfile() {
  const { id } = useParams();
  const userId = id || "0";
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useGetUser(userId, {
    query: {
      enabled: !!userId,
      queryKey: getGetUserQueryKey(userId),
    },
  });

  if (isLoading || !profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={profile.fullName} description={profile.headline || "Member profile"} />

      <DashboardCard className="overflow-hidden">
        <div className="h-32 bg-primary/10" />
        <div className="px-6 pb-6 relative">
          <Avatar className="w-24 h-24 border-4 border-background absolute -top-12">
            <AvatarImage src={profile.avatarUrl || undefined} />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {profile.fullName.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex justify-end pt-4 gap-2 flex-wrap">
            {profile.isConsultant && (
              <ConsultBookSlotDialog
                consultantId={profile.id}
                consultantName={profile.fullName}
                priceInr={profile.mentorshipPriceInr ?? 0}
                durationMinutes={profile.mentorshipDurationMinutes ?? 30}
                onBooked={() => {
                  queryClient.invalidateQueries({ queryKey: CONSULT_QUERY_KEYS.list("all") });
                }}
                trigger={
                  <Button size="sm">
                    <Video className="w-4 h-4 mr-1" />
                    Book mentorship
                  </Button>
                }
              />
            )}
            <Button asChild variant="outline" size="sm">
              <Link href="/consult">My Sessions</Link>
            </Button>
          </div>

          <div className="mt-2">
            <h1 className="text-2xl font-bold">{profile.fullName}</h1>
            <p className="text-lg text-muted-foreground">{profile.headline}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {profile.isWorkingProfessional
                ? [profile.currentRole, profile.company].filter(Boolean).join(" at ") || "Role & company not set"
                : "Not a working professional"}
              {profile.experienceYears != null && profile.experienceYears > 0
                ? ` • ${profile.experienceYears} yrs exp`
                : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Badge className="bg-primary/10 text-primary hover:bg-primary/15 px-3 py-1 flex items-center gap-1 border-0">
              <Trophy className="w-4 h-4" /> {profile.totalPoints} Points
            </Badge>
            {profile.isConsultant && (
              <Badge className="bg-primary/10 text-primary border-0 gap-1">
                <Video className="h-3.5 w-3.5" />
                Consultant
              </Badge>
            )}
            {profile.resumeScore && (
              <Badge variant="secondary" className="px-3 py-1 text-primary">
                Resume Score: {profile.resumeScore}/100
              </Badge>
            )}
          </div>
        </div>
      </DashboardCard>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <ProfileProfessionalCard profile={profile} />
          <MentorshipProfileView profile={profile} />

          {!profile.isConsultant && (
          <DashboardCard className="p-6">
            <h3 className="text-lg font-semibold mb-3">About</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {profile.bio || "No bio provided."}
            </p>
          </DashboardCard>
          )}

          {!profile.isConsultant && (
          <DashboardCard className="p-6">
            <h3 className="text-lg font-semibold mb-3">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <Badge key={skill} variant="secondary">{skill}</Badge>
              ))}
            </div>
          </DashboardCard>
          )}
        </div>
      </div>
    </div>
  );
}
