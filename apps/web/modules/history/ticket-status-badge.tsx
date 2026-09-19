import type { TicketStatus } from "@repo/types";
import { Badge } from "@/components/ui/badge";

const STATUS_DISPLAY: Record<
  TicketStatus,
  { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }
> = {
  pending_verification: { label: "Unverified", variant: "outline" },
  waiting: { label: "Waiting", variant: "secondary" },
  serving: { label: "Serving", variant: "default" },
  done: { label: "Done", variant: "default" },
  no_show: { label: "No-show", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "outline" },
  expired: { label: "Expired", variant: "outline" },
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const { label, variant } = STATUS_DISPLAY[status];
  return <Badge variant={variant}>{label}</Badge>;
}
