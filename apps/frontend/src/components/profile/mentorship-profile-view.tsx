import type { UserProfile } from "@workspace/api-client-react";
import { DashboardCard } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Briefcase,
  FileText,
  GraduationCap,
  Layers,
  Award,
  FlaskConical,
  Clock,
} from "lucide-react";
import { MentorshipSessionOffer } from "@/components/consult/mentorship-session-offer";
import { MentorAvailabilitySummary } from "@/components/consult/mentor-availability-summary";
import { hasMentorshipSessionOffer } from "@/lib/mentor-utils";
import { mentorshipTopicLabels } from "@/components/profile/mentorship-topics-picker";
import { useQuery } from "@tanstack/react-query";
import { consultApi, CONSULT_QUERY_KEYS } from "@/lib/consult-api";

function MentorshipProfileAvailability({ profile }: { profile: UserProfile }) {
  const { data } = useQuery({
    queryKey: CONSULT_QUERY_KEYS.slots(profile.id),
    queryFn: () => consultApi.getMentorSlots(profile.id),
    enabled: profile.isConsultant === true,
  });

  return (
    <MentorAvailabilitySummary
      profile={profile}
      openSlotCount={data?.slots?.length}
    />
  );
}

function SectionBlock({
  step,
  title,
  icon: Icon,
  children,
  empty,
}: {
  step: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  empty?: boolean;
}) {
  if (empty) return null;
  return (
    <DashboardCard className="p-5 space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
          {step}
        </span>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">{title}</h3>
        </div>
      </div>
      {children}
    </DashboardCard>
  );
}

export function MentorshipProfileView({ profile }: { profile: UserProfile }) {
  if (!profile.isConsultant) return null;

  const work = profile.workExperiences ?? [];
  const projects = profile.projects ?? [];
  const education = profile.education ?? [];
  const papers = profile.researchPapers ?? [];
  const certs = profile.certifications ?? [];
  const topicLabels = mentorshipTopicLabels(profile.mentorshipTopics);

  const hasAny =
    hasMentorshipSessionOffer(profile) ||
    topicLabels.length > 0 ||
    profile.bio ||
    work.length > 0 ||
    profile.skills?.length > 0 ||
    projects.length > 0 ||
    education.length > 0 ||
    papers.length > 0 ||
    certs.length > 0;

  if (!hasAny) {
    return (
      <DashboardCard className="p-5 border-dashed">
        <p className="text-sm text-muted-foreground text-center py-4">
          Mentorship profile not filled yet. Click <strong>Edit Profile</strong> to add your background.
        </p>
      </DashboardCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Mentorship Profile</h2>
      </div>

      {hasMentorshipSessionOffer(profile) && (
        <DashboardCard className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Session offer</h3>
          </div>
          <MentorshipSessionOffer profile={profile} />
        </DashboardCard>
      )}

      <DashboardCard className="p-5">
        <MentorshipProfileAvailability profile={profile} />
      </DashboardCard>

      {topicLabels.length > 0 && (
        <DashboardCard className="p-5 space-y-3">
          <h3 className="font-semibold">Mentorship topics</h3>
          <div className="flex flex-wrap gap-2">
            {topicLabels.map((label) => (
              <Badge key={label} variant="secondary" className="bg-primary/10 text-primary border-0">
                {label}
              </Badge>
            ))}
          </div>
        </DashboardCard>
      )}

      <SectionBlock step={1} title="About (Professional Summary)" icon={FileText} empty={!profile.bio}>
        <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">{profile.bio}</p>
      </SectionBlock>

      <SectionBlock step={2} title="Experience" icon={Briefcase} empty={work.length === 0}>
        <div className="space-y-3">
          {work.map((exp, i) => (
            <div key={i} className="rounded-lg bg-muted/30 p-3 text-sm">
              <p className="font-semibold">{exp.company}</p>
              {exp.role && <p className="text-muted-foreground">{exp.role}</p>}
              {(exp.fromYear || exp.toYear) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {[exp.fromYear, exp.toYear].filter(Boolean).join(" – ")}
                </p>
              )}
              {exp.description && <p className="mt-2 text-muted-foreground">{exp.description}</p>}
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock step={3} title="Skills" icon={Layers} empty={!profile.skills?.length}>
        <div className="flex flex-wrap gap-2">
          {profile.skills.map((s) => (
            <Badge key={s} variant="secondary">{s}</Badge>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock step={4} title="Projects" icon={Briefcase} empty={projects.length === 0}>
        <div className="space-y-3">
          {projects.map((p, i) => (
            <div key={i} className="rounded-lg bg-muted/30 p-3 text-sm">
              <p className="font-semibold">{p.name}</p>
              {p.technologies && <p className="text-xs text-primary mt-1">{p.technologies}</p>}
              {p.description && <p className="text-muted-foreground mt-1">{p.description}</p>}
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock step={5} title="Education" icon={GraduationCap} empty={education.length === 0}>
        <div className="space-y-3">
          {education.map((edu, i) => (
            <div key={i} className="rounded-lg bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{edu.level}</Badge>
                <span className="font-semibold">{edu.institution}</span>
              </div>
              <p className="text-muted-foreground mt-1">
                {[edu.stream, edu.batchYear ? `Batch ${edu.batchYear}` : null].filter(Boolean).join(" · ")}
              </p>
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock step={6} title="Research Papers" icon={FlaskConical} empty={papers.length === 0}>
        <div className="space-y-3">
          {papers.map((paper, i) => (
            <div key={i} className="rounded-lg bg-muted/30 p-3 text-sm">
              <p className="font-semibold">{paper.title}</p>
              <p className="text-muted-foreground text-xs mt-1">
                {[paper.publication, paper.year].filter(Boolean).join(" · ")}
              </p>
              {paper.link && (
                <a href={paper.link} target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline mt-1 inline-block">
                  View paper
                </a>
              )}
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock step={7} title="Certifications" icon={Award} empty={certs.length === 0}>
        <div className="space-y-2">
          {certs.map((cert, i) => (
            <div key={i} className="flex justify-between items-start text-sm rounded-lg bg-muted/30 p-3">
              <div>
                <p className="font-semibold">{cert.name}</p>
                {cert.issuer && <p className="text-muted-foreground text-xs">{cert.issuer}</p>}
              </div>
              {cert.year && <span className="text-muted-foreground text-xs">{cert.year}</span>}
            </div>
          ))}
        </div>
      </SectionBlock>
    </div>
  );
}
