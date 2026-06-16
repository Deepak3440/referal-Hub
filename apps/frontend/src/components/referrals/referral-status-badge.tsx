import { Badge } from "@/components/ui/badge";
import {
  STATUS_LABELS,
  getStatusColor,
  getStatusColorSoft,
  type ReferralStatus,
} from "@/lib/referral";
import { cn } from "@/lib/utils";

export function ReferralStatusBadge({
  status,
  soft,
  className,
}: {
  status: string;
  /** Softer colors — still shows green/red/etc. but not loud */
  soft?: boolean;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(soft ? getStatusColorSoft(status) : getStatusColor(status), className)}
    >
      {STATUS_LABELS[status as ReferralStatus] ?? status}
    </Badge>
  );
}
