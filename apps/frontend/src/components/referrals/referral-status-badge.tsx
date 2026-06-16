import { Badge } from "@/components/ui/badge";
import {
  STATUS_LABELS,
  getStatusColor,
  getStatusColorSoft,
  type ReferralStatus,
} from "@/lib/referral";

export function ReferralStatusBadge({
  status,
  soft,
}: {
  status: string;
  /** Softer colors — still shows green/red/etc. but not loud */
  soft?: boolean;
}) {
  return (
    <Badge variant="outline" className={soft ? getStatusColorSoft(status) : getStatusColor(status)}>
      {STATUS_LABELS[status as ReferralStatus] ?? status}
    </Badge>
  );
}
