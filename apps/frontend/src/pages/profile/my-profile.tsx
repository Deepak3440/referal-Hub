import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useGetMe,
  getGetMeQueryKey,
  useGetDashboardStats,
  useUpdateMe,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Edit, X, Video } from "lucide-react";
import { PageHeader, DashboardCard } from "@/components/layout/page-header";
import {
  ProfileForm,
  formValuesToPayload,
  type ProfileFormValues,
  type ProfilePhotoSubmit,
} from "@/components/profile/profile-form";
import { useToast } from "@/hooks/use-toast";
import { ProfileProfessionalCard } from "@/components/profile/profile-professional-card";
import { MentorshipProfileView } from "@/components/profile/mentorship-profile-view";
import { ReferralStatsCard } from "@/components/profile/referral-stats-card";
import { AddPointsCard } from "@/components/profile/add-points-card";
import { DeleteAccountCard } from "@/components/profile/delete-account-card";
import { referralStatsApi, REFERRAL_STATS_QUERY_KEYS } from "@/lib/referral-stats-api";
import { isAlumniMember } from "@/lib/user-utils";
import { resolveUploadUrl, withCacheBust } from "@/lib/upload-url";

export default function MyProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useGetMe();
  const { data: stats } = useGetDashboardStats();
  const updateMe = useUpdateMe();
  const isAlumni = isAlumniMember(profile);

  const { data: referralStats } = useQuery({
    queryKey: REFERRAL_STATS_QUERY_KEYS.user(profile?.id ?? 0),
    queryFn: () => referralStatsApi.getUserStats(profile!.id),
    enabled: isAlumni && !!profile?.id,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const handleSave = (data: ProfileFormValues, photo?: ProfilePhotoSubmit) => {
    updateMe.mutate(
      { data: { ...formValuesToPayload(data), ...photo } },
      {
        onSuccess: (updatedUser) => {
          queryClient.setQueryData(getGetMeQueryKey(), updatedUser);
          setIsEditing(false);
          toast({
            title: "Profile updated",
            description: "Your changes have been saved.",
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Error updating profile",
            description: "Please try again later.",
          });
        },
      },
    );
  };

  if (isLoading || !profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Edit profile"
          description="Update your details below. You stay on this page after saving."
        >
          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
            <X className="w-3.5 h-3.5 mr-1" />
            Cancel
          </Button>
        </PageHeader>

        <DashboardCard className="p-6">
          <ProfileForm
            profile={profile}
            onSubmit={handleSave}
            isPending={updateMe.isPending}
            onCancel={() => setIsEditing(false)}
            onPhotoUpdated={(avatarUrl) => {
              queryClient.setQueryData(getGetMeQueryKey(), (old) =>
                old ? { ...old, avatarUrl } : old,
              );
              toast({ title: "Profile photo updated" });
            }}
          />
        </DashboardCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader description="Your public profile and referral impact." />

      <DashboardCard className="overflow-hidden">
        <div className="h-32 bg-primary/10"></div>
        <div className="px-4 sm:px-6 pb-6 relative">
          <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-background absolute -top-10 sm:-top-12 left-4 sm:left-6">
            <AvatarImage
              src={withCacheBust(resolveUploadUrl(profile.avatarUrl), profile.id)}
            />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {profile.fullName.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex justify-end pt-12 sm:pt-4">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-3.5 h-3.5" /> Edit Profile
            </Button>
          </div>

          <div className="mt-2 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold break-words">{profile.fullName}</h1>
            <p className="text-base sm:text-lg text-muted-foreground break-words">{profile.headline}</p>
            {profile.company && (
              <p className="text-sm text-muted-foreground mt-1">{profile.company}</p>
            )}
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
            {profile.successRate && (
              <Badge variant="secondary" className="px-3 py-1 text-green-600">
                Success Rate: {profile.successRate}%
              </Badge>
            )}
          </div>
        </div>
      </DashboardCard>

      <AddPointsCard balance={profile.totalPoints} />

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {isAlumni && referralStats && <ReferralStatsCard stats={referralStats} />}
          <ProfileProfessionalCard profile={profile} />
          {profile.isConsultant && <MentorshipProfileView profile={profile} />}

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
              {profile.skills.length > 0 ? (
                profile.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No skills added yet.</p>
              )}
            </div>
          </DashboardCard>
          )}
        </div>

        {isAlumni && (
        <div className="space-y-6">
          <DashboardCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Your impact</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Jobs posted</span>
                <span className="font-bold">{stats?.totalJobsPosted || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Requests received</span>
                <span className="font-bold">{stats?.referralsGiven || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Pending responses</span>
                <span className="font-bold">{stats?.pendingReferrals || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Successful hires</span>
                <span className="font-bold text-green-600">{stats?.successfulHires || 0}</span>
              </div>
            </div>
          </DashboardCard>
        </div>
        )}
      </div>

      <DeleteAccountCard email={profile.email} />
    </div>
  );
}
