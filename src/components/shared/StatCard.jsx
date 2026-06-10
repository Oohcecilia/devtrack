import { cn } from "@/lib/utils";

export default function StatCard({ title, value, icon: Icon, color }) {
  const colorMap = {
    teal: "bg-primary/10 text-primary",
    blue: "bg-blue-500/10 text-blue-500",
    amber: "bg-amber-500/10 text-amber-500",
    purple: "bg-purple-500/10 text-purple-500",
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold text-card-foreground mt-2 tracking-tight">{value}</p>
        </div>
        <div className={cn("p-2.5 rounded-xl", colorMap[color] || colorMap.teal)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}