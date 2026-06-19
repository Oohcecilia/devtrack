import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileDown, Pencil, Trash2 } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { format } from "date-fns";

export default function AssignmentTable({ assignments, onGenerateLetter, onEdit, onDelete }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold">Employee</TableHead>
            <TableHead className="font-semibold hidden md:table-cell">Branch</TableHead>
            <TableHead className="font-semibold">Devices</TableHead>
            <TableHead className="font-semibold hidden md:table-cell">Assigned</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((a) => (
            <TableRow key={a.id} className="group">
              <TableCell className="font-medium">{a.employee_name}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">{a.branch || "—"}</TableCell>
              <TableCell>
                <p className="font-medium">{a.device_count} device{a.device_count === 1 ? "" : "s"}</p>
                <p className="text-xs text-muted-foreground">
                  {a.active_count} active / {a.returned_count} returned
                </p>
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {a.last_assigned_date ? format(new Date(a.last_assigned_date), "MMM d, yyyy") : "—"}
              </TableCell>
              <TableCell><StatusBadge status={a.status} /></TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Generate Letter" onClick={() => onGenerateLetter(a)}>
                    <FileDown className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Update Assignment" onClick={() => onEdit(a)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete Assignment" onClick={() => onDelete(a)}>
                    <Trash2 className="w-4 h-4" />
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
