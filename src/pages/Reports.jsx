import { useQuery } from "@tanstack/react-query";
import { couchdb } from "@/api/couchdbClient";
import { Button } from "@/components/ui/button";
import { FileDown, Monitor, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["hsl(173, 58%, 39%)", "hsl(199, 89%, 48%)", "hsl(43, 74%, 66%)"];

export default function Reports() {
  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: () => couchdb.entities.Device.list(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => couchdb.entities.Assignment.list(),
  });

  const handleInventoryReport = async () => {
    const { generateInventoryReportPDF } = await import("@/lib/pdfUtils");
    generateInventoryReportPDF(devices);
    toast.success("Inventory report downloaded");
  };

  const handleAssignmentReport = async () => {
    const { generateAssignmentReportPDF } = await import("@/lib/pdfUtils");
    generateAssignmentReportPDF(assignments);
    toast.success("Assignment report downloaded");
  };

  const statusData = [
    { name: "Available", count: devices.filter(d => d.status === "Available").length },
    { name: "Assigned", count: devices.filter(d => d.status === "Assigned").length },
    { name: "Maintenance", count: devices.filter(d => d.status === "Maintenance").length },
  ];

  // Count by brand
  const brandCounts = {};
  devices.forEach(d => {
    const brand = d.brand || "Unknown";
    brandCounts[brand] = (brandCounts[brand] || 0) + 1;
  });
  const brandData = Object.entries(brandCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Inventory Report</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Complete list of all devices with their current status, brand, model, and serial numbers.
              </p>
            </div>
          </div>
          <Button onClick={handleInventoryReport} className="w-full" disabled={devices.length === 0}>
            <FileDown className="w-4 h-4 mr-2" />
            Download Inventory PDF
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10">
              <ArrowLeftRight className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Assignment Report</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Full history of device assignments including active and returned items.
              </p>
            </div>
          </div>
          <Button onClick={handleAssignmentReport} className="w-full" disabled={assignments.length === 0}>
            <FileDown className="w-4 h-4 mr-2" />
            Download Assignment PDF
          </Button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-base font-semibold mb-4">Devices by Status</h3>
          {devices.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    color: "hsl(var(--card-foreground))"
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {statusData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              No data available
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-base font-semibold mb-4">Devices by Brand</h3>
          {brandData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={brandData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    color: "hsl(var(--card-foreground))"
                  }}
                />
                <Bar dataKey="count" fill="hsl(173, 58%, 39%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              No data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
