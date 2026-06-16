import { useRoute, Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetUser, getGetUserQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Video, GraduationCap, Building2, BookOpen } from "lucide-react";
import { DashboardCard } from "@/components/layout/page-header";
import { MentorshipProfileView } from "@/components/profile/mentorship-profile-view";
import { ConsultRequestDialog } from "@/components/consult/consult-request-dialog";
import { MentorshipSessionOffer } from "@/components/consult/mentorship-session-offer";
import { consultApi, CONSULT_QUERY_KEYS } from "@/lib/consult-api";
import { getPrimaryEducation } from "@/lib/mentor-utils";
import { useToast } from "@/hooks/use-toast";

export default function MentorDetail() {
  const [matched, params] = useRoute("/consult/:userId");
  const id = matched ? String(params?.userId ?? "0") : "0";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, isError } = useGetUser(id, {
    query: {
      enabled: matched && id !== "0",
      queryKey: getGetUserQueryKey(id),
    },
  });

  const requestConsult = useMutation({
    mutationFn: (message: string) => consultApi.requestConsultation(Number(id), message),
    onSuccess: () => {
      toast({
        title: "Mentorship request sent",
        description: "Check My Sessions for updates and your Meet link.",
      });
      queryClient.invalidateQueries({ queryKey: CONSULT_QUERY_KEYS.list("all") });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!matched || id === "0") {
    return (
      <div className="text-center space-y-4 py-12">
        <p className="text-muted-foreground">Invalid mentor link.</p>
        <Button asChild variant="outline">
          <Link href="/consult">Back to mentors</Link>
        </Button>
      </div>
    );
  }

  if (!profile || isError) {
    return (
      <div className="text-center space-y-4 py-12">
        <p className="text-muted-foreground">Mentor not found.</p>
        <Button asChild variant="outline">
          <Link href="/consult">Back to mentors</Link>
        </Button>
      </div>
    );
  }

  const edu = getPrimaryEducation(profile);
  const canBook = profile.isConsultant === true;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/consult"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to mentors
      </Link>

      <DashboardCard className="overflow-hidden border-primary/20">
        <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 px-6 py-8 text-primary-foreground">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <Avatar className="w-20 h-20 border-4 border-white/30 shadow-lg">
              <AvatarImage src={profile.avatarUrl || undefined} />
              <AvatarFallback className="text-xl bg-white/20 text-white font-bold">
                {profile.fullName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{profile.fullName}</h1>
                <Badge className="bg-white/20 text-white border-0 hover:bg-white/20">
                  <Video className="h-3.5 w-3.5 mr-1" />
                  Mentor
                </Badge>
              </div>
              <p className="text-primary-foreground/90">{profile.headline || "Mentor"}</p>
              {profile.isWorkingProfessional && (
                <p className="text-sm text-primary-foreground/80">
                  {[profile.currentRole, profile.company].filter(Boolean).join(" at ")}
                  {profile.experienceYears ? ` · ${profile.experienceYears} yrs exp` : ""}
                </p>
              )}
              <MentorshipSessionOffer profile={profile} variant="onPrimary" />
            </div>
            <ConsultRequestDialog
              consultantName={profile.fullName}
              consultantId={profile.id}
              onSubmit={async (message) => {
                await requestConsult.mutateAsync(message);
              }}
              trigger={
                <Button
                  size="lg"
                  variant="secondary"
                  className="shrink-0 w-full sm:w-auto shadow-md"
                  disabled={!canBook}
                >
                  <Video className="w-4 h-4 mr-2" />
                  {canBook ? "Book session" : "Not available"}
                </Button>
              }
            />
          </div>
        </div>

        <div className="px-6 py-4 flex flex-wrap gap-3 border-t bg-muted/20">
          <Badge variant="outline" className="gap-1 bg-background">
            <Trophy className="h-3 w-3" />
            {profile.totalPoints} pts
          </Badge>
          {edu?.college && (
            <Badge variant="outline" className="gap-1 bg-background">
              <Building2 className="h-3 w-3" />
              {edu.college}
            </Badge>
          )}
          {edu?.branch && (
            <Badge variant="outline" className="gap-1 bg-background">
              <BookOpen className="h-3 w-3" />
              {edu.branch}
            </Badge>
          )}
          {edu?.graduationYear && (
            <Badge variant="outline" className="gap-1 bg-background">
              <GraduationCap className="h-3 w-3" />
              Passout {edu.graduationYear}
            </Badge>
          )}
          {profile.skills?.slice(0, 3).map((s) => (
            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
          ))}
        </div>
      </DashboardCard>

      {profile.isConsultant ? (
        <MentorshipProfileView profile={profile} />
      ) : (
        <DashboardCard className="p-6">
          <h3 className="font-semibold mb-2">About</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {profile.bio || profile.headline || "No summary added yet."}
          </p>
          {profile.skills?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {profile.skills.map((s) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
            </div>
          )}
        </DashboardCard>
      )}
    </div>
  );
}
