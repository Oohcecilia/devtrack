import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import StatusBadge from "@/components/shared/StatusBadge";

function sortAssignments(items) {
  return [...items].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "Active" ? -1 : 1;
    }
    return String(right.assigned_date || "").localeCompare(String(left.assigned_date || ""));
  });
}

export default function AssignmentEditDialog({ open, onClose, onReturnSelected, assignmentGroup, saving }) {
  const assignments = useMemo(
    () => sortAssignments(assignmentGroup?.assignments || []),
    [assignmentGroup]
  );
  const activeAssignmentIds = useMemo(
    () => assignments.filter((assignment) => assignment.status === "Active").map((assignment) => assignment.id),
    [assignments]
  );
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState([]);

  useEffect(() => {
    setSelectedAssignmentIds(activeAssignmentIds);
  }, [activeAssignmentIds, open]);

  const toggleAssignment = (assignmentId) => {
    setSelectedAssignmentIds((prev) =>
      prev.includes(assignmentId)
        ? prev.filter((id) => id !== assignmentId)
        : [...prev, assignmentId]
    );
  };

  const handleReturn = async () => {
    if (!selectedAssignmentIds.length) {
      return;
    }
    await onReturnSelected(selectedAssignmentIds);
  };

  const activeSelectedCount = selectedAssignmentIds.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Update Assignment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-muted-foreground">Employee</p>
              <p className="text-sm font-medium">{assignmentGroup?.employee_name || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-muted-foreground">Branch</p>
              <p className="text-sm">{assignmentGroup?.branch || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-muted-foreground">Devices</p>
              <p className="text-sm">
                {assignmentGroup?.active_count || 0} active / {assignmentGroup?.device_count || 0} total
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border">
            <div className="grid grid-cols-[auto,1.8fr,1fr,1fr,auto] gap-3 border-b border-border bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span>Select</span>
              <span>Device</span>
              <span className="hidden sm:block">Asset Tag</span>
              <span className="hidden md:block">Assigned</span>
              <span>Status</span>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {assignments.map((assignment) => {
                const isActive = assignment.status === "Active";
                const isChecked = selectedAssignmentIds.includes(assignment.id);

                return (
                  <div
                    key={assignment.id}
                    className="grid grid-cols-[auto,1.8fr,1fr,1fr,auto] gap-3 border-b border-border/70 px-4 py-3 last:border-b-0"
                  >
                    <div className="flex items-start pt-0.5">
                      <Checkbox
                        checked={isChecked}
                        disabled={!isActive || saving}
                        onCheckedChange={() => toggleAssignment(assignment.id)}
                        aria-label={`Select ${assignment.device_name}`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{assignment.device_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{assignment.notes || "No notes"}</p>
                    </div>
                    <div className="hidden sm:block min-w-0">
                      <p className="truncate text-sm text-muted-foreground">{assignment.asset_tag || "—"}</p>
                    </div>
                    <div className="hidden md:block min-w-0">
                      <p className="text-sm text-muted-foreground">
                        {assignment.assigned_date ? format(new Date(assignment.assigned_date), "MMM d, yyyy") : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {assignment.returned_date ? `Returned ${format(new Date(assignment.returned_date), "MMM d, yyyy")}` : ""}
                      </p>
                    </div>
                    <div className="flex items-start justify-end">
                      <StatusBadge status={assignment.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Back to Table</Button>
          <Button type="button" onClick={handleReturn} disabled={saving || activeSelectedCount === 0}>
            {saving ? "Returning..." : `Return Selected${activeSelectedCount ? ` (${activeSelectedCount})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
