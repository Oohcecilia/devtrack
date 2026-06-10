import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RotateCcw, FileDown } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { format } from "date-fns";

export default function AssignmentTable({ assignments, onReturn, onGenerateLetter }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold">Employee</TableHead>
            <TableHead className="font-semibold">Device</TableHead>
            <TableHead className="font-semibold hidden md:table-cell">Asset Tag</TableHead>
            <TableHead className="font-semibold hidden md:table-cell">Assigned</TableHead>
            <TableHead className="font-semibold hidden lg:table-cell">Returned</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((a) => (
            <TableRow key={a.id} className="group">
              <TableCell className="font-medium">{a.employee_name}</TableCell>
              <TableCell>{a.device_name}</TableCell>
              <TableCell className="hidden md:table-cell font-mono text-sm text-muted-foreground">{a.asset_tag}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {a.assigned_date ? format(new Date(a.assigned_date), "MMM d, yyyy") : "—"}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground">
                {a.returned_date ? format(new Date(a.returned_date), "MMM d, yyyy") : "—"}
              </TableCell>
              <TableCell><StatusBadge status={a.status} /></TableCell>
              <TableCell className="text-right">
	                <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  {a.status === "Active" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Return Device" onClick={() => onReturn(a)}>
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Generate Letter" onClick={() => onGenerateLetter(a)}>
                    <FileDown className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
