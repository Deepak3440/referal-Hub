import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { companyReferralApi, type CompanyReferrerRow } from "@/lib/company-referral-api";
import {
  RequestCompanyReferralDialog,
} from "@/components/referrals/request-company-referral-dialog";
import { companyColor } from "@/lib/avatar-colors";
import { ArrowRight, Building2, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function CompanyReferrerList() {
  const { data: me } = useGetMe();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState<CompanyReferrerRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["companies", "referrers", debouncedSearch],
    queryFn: () => companyReferralApi.listCompanies(debouncedSearch || undefined),
    enabled: Boolean(me),
  });

  const companies = data?.items ?? [];

  const handleSearch = () => setDebouncedSearch(search.trim());

  const openRequest = (company: CompanyReferrerRow) => {
    setSelected(company);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            className="pl-9 h-11 bg-background border-muted-foreground/15 rounded-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button type="button" variant="secondary" className="h-11 shrink-0" onClick={handleSearch}>
          Search
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : companies.length > 0 ? (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_120px_120px] gap-3 px-4 py-2.5 bg-muted/30 border-b text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Company</span>
            <span className="text-center">Referrers</span>
            <span className="text-right">Action</span>
          </div>
          <div className="divide-y divide-border">
            {companies.map((row) => (
              <div
                key={row.companyKey}
                className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_120px_120px] gap-3 items-center px-4 py-3.5 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold shrink-0",
                      companyColor(row.company),
                    )}
                  >
                    {row.company.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{row.company}</p>
                    {row.jobCount > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {row.jobCount} active opening{row.jobCount !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex sm:justify-center items-center gap-1.5 text-sm">
                  <Users className="h-3.5 w-3.5 text-muted-foreground sm:hidden" />
                  <span className="font-bold tabular-nums">{row.referrerCount}</span>
                  <span className="text-muted-foreground text-xs sm:hidden">referrers</span>
                </div>

                <div className="sm:text-right">
                  <Button
                    type="button"
                    size="sm"
                    className="w-full sm:w-auto rounded-full h-9 px-4"
                    onClick={() => openRequest(row)}
                  >
                    Request
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card text-center py-14 px-6">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-4">
            <Building2 className="h-7 w-7 text-primary/60" />
          </div>
          <h3 className="font-semibold text-lg">No companies found</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            Alumni referrers appear here when they add their company on profile. Try a different search.
          </p>
        </div>
      )}

      <RequestCompanyReferralDialog
        company={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => void refetch()}
      />
    </div>
  );
}
