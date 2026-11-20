import type { ReactNode } from "react";
import { Badge, type Tone } from "./Badge";

export type ToolStatus = "available" | "on_loan" | "removed";
export type LoanStatus = "pending" | "approved" | "declined" | "cancelled" | "returned" | "overdue";

export const STATUS: Record<ToolStatus | LoanStatus, { tone: Tone; icon: string; label: string }> = {
  available: { tone: "pine", icon: "check", label: "Available" },
  on_loan: { tone: "sky", icon: "clock", label: "On loan" },
  pending: { tone: "brass", icon: "clock", label: "Pending" },
  approved: { tone: "sky", icon: "check", label: "Approved" },
  declined: { tone: "neutral", icon: "x", label: "Declined" },
  cancelled: { tone: "neutral", icon: "x", label: "Cancelled" },
  returned: { tone: "neutral", icon: "loop", label: "Returned" },
  overdue: { tone: "clay-solid", icon: "alert", label: "Overdue" },
  removed: { tone: "neutral", icon: "trash", label: "Removed" },
};

export function StatusBadge({ status, children, className }: { status: ToolStatus | LoanStatus; children?: ReactNode; className?: string }) {
  const meta = STATUS[status];
  return (
    <Badge tone={meta.tone} icon={meta.icon} className={className}>
      {children ?? meta.label}
    </Badge>
  );
}
