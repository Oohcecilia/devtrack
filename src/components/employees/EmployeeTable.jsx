import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

export default function EmployeeTable({ employees, onEdit, onDelete }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold">Employee ID</TableHead>
            <TableHead className="font-semibold">Name</TableHead>
            <TableHead className="font-semibold hidden md:table-cell">Department</TableHead>
            <TableHead className="font-semibold hidden md:table-cell">Position</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((emp) => (
            <TableRow key={emp.id} className="group">
              <TableCell className="font-mono text-sm font-medium">{emp.employee_id}</TableCell>
              <TableCell className="font-medium">{emp.full_name}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">{emp.department}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">{emp.position}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(emp)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(emp)}>
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
