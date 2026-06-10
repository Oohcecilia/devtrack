import { useQuery } from "@tanstack/react-query";
import { couchdb } from "@/api/couchdbClient";
import { Monitor, CheckCircle, ArrowLeftRight, Users } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ["hsl(173, 58%, 39%)", "hsl(199, 89%, 48%)", "hsl(43, 74%, 66%)"];

export default function Dashboard() {
  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: () => couchdb.entities.Device.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => couchdb.entities.Employee.list(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => couchdb.entities.Assignment.list(),
  });

  const available = devices.filter(d => d.status === "Available").length;
  const assigned = devices.filter(d => d.status === "Assigned").length;
  const maintenance = devices.filter(d => d.status === "Maintenance").length;

  const chartData = [
    { name: "Available", value: available },
    { name: "Assigned", value: assigned },
    { name: "Maintenance", value: maintenance },
  ].filter(d => d.value > 0);

  const recentAssignments = assignments
    .filter(a => a.status === "Active")
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Devices" value={devices.length} icon={Monitor} color="teal" />
        <StatCard title="Available" value={available} icon={CheckCircle} color="blue" />
        <StatCard title="Assigned" value={assigned} icon={ArrowLeftRight} color="amber" />
        <StatCard title="Total Employees" value={employees.length} icon={Users} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-base font-semibold mb-4">Device Status Overview</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: "8px", 
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    color: "hsl(var(--card-foreground))"
                  }} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              No devices yet. Add some to see the chart.
            </div>
          )}
        </div>

        {/* Recent Assignments */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-base font-semibold mb-4">Active Assignments</h3>
          {recentAssignments.length > 0 ? (
            <div className="space-y-3">
              {recentAssignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{a.employee_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.device_name} • {a.asset_tag}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              No active assignments yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
