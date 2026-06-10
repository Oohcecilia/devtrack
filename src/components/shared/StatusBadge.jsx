import { cn } from "@/lib/utils";

const statusStyles = {
  Available: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Assigned: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  Maintenance: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Inactive: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  Returned: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  inactive: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  unknown: "bg-muted text-muted-foreground border-border",
};

export default function StatusBadge({ status }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
      statusStyles[status] || "bg-muted text-muted-foreground border-border"
    )}>
      {status}
    </span>
  );
}
