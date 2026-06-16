import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { feedApi, FEED_QUERY_KEYS } from "@/lib/feed-api";
import { memberTypeLabel } from "@/lib/user-utils";
import { Briefcase, Sparkles, TrendingUp, Users, Video } from "lucide-react";

function ContributorSkeleton() {
  return (
    <div className="flex items-center gap-2.5 py-2">
      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function FeedSidebar() {
  const { data, isLoading } = useQuery({
    queryKey: FEED_QUERY_KEYS.contributors,
    queryFn: () => feedApi.listContributors(5),
    staleTime: 60_000,
  });

  const contributors = data?.items ?? [];

  return (
    <aside className="space-y-3 xl:sticky xl:top-3 xl:self-start">
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary shrink-0" />
          <h3 className="font-semibold text-sm">Top contributors</h3>
        </div>
        <div className="px-3 py-2">
          {isLoading ? (
            <>
              <ContributorSkeleton />
              <ContributorSkeleton />
              <ContributorSkeleton />
            </>
          ) : contributors.length > 0 ? (
            <ul className="divide-y divide-border/60">
              {contributors.map((item, index) => {
                const author = item.author;
                if (!author) return null;
                return (
                  <li key={item.authorId}>
                    <Link
                      href={`/profile/${author.id}`}
                      className="flex items-center gap-2.5 py-2.5 px-1 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-9 w-9 ring-1 ring-border">
                          <AvatarImage src={author.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                            {author.fullName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {index < 3 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {author.fullName}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.postCount} {item.postCount === 1 ? "post" : "posts"}
                          {author.company ? ` · ${author.company}` : ""}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[9px] h-5 px-1.5 shrink-0 capitalize font-normal">
                        {memberTypeLabel(author.memberType)}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground py-4 px-1 text-center">
              Be the first to share on the feed.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <h3 className="font-semibold text-sm">Explore</h3>
        </div>
        <div className="p-2 space-y-0.5">
          <Link
            href="/home"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <Briefcase className="h-4 w-4 shrink-0" />
            Browse jobs
          </Link>
          <Link
            href="/consult"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <Video className="h-4 w-4 shrink-0" />
            Book a mentor
          </Link>
          <Link
            href="/referrals"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <Users className="h-4 w-4 shrink-0" />
            Track requests
          </Link>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center px-2 leading-relaxed">
        Alumni share jobs & updates here. Students can like and comment.
      </p>
    </aside>
  );
}
