import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { couchdb } from "@/api/couchdbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ArrowLeftRight } from "lucide-react";
import AssignmentTable from "@/components/assignments/AssignmentTable";
import AssignDeviceDialog from "@/components/assignments/AssignDeviceDialog";
import AssignmentEditDialog from "@/components/assignments/AssignmentEditDialog";
import EmptyState from "@/components/shared/EmptyState";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { toast } from "sonner";

function errorMessage(error, fallback) {
  return error?.message || fallback;
}

function getAssignmentGroupKey(assignment) {
  return assignment.employee_id || assignment.employee_name || assignment.id;
}

function groupAssignments(assignments) {
  const grouped = new Map();

  for (const assignment of assignments) {
    const key = getAssignmentGroupKey(assignment);
    const existing = grouped.get(key);

    if (existing) {
      existing.assignments.push(assignment);
      continue;
    }

    grouped.set(key, {
      id: key,
      employee_id: assignment.employee_id,
      employee_name: assignment.employee_name,
      branch: assignment.branch || "",
      assignments: [assignment],
    });
  }

  return Array.from(grouped.values())
    .map((group) => {
      const sortedAssignments = [...group.assignments].sort((left, right) =>
        String(right.assigned_date || "").localeCompare(String(left.assigned_date || ""))
      );
      const activeAssignments = sortedAssignments.filter((assignment) => assignment.status === "Active");
      const returnedAssignments = sortedAssignments.filter((assignment) => assignment.status === "Returned");
      const distinctBranches = [...new Set(sortedAssignments.map((assignment) => assignment.branch).filter(Boolean))];

      return {
        ...group,
        assignments: sortedAssignments,
        device_count: sortedAssignments.length,
        active_count: activeAssignments.length,
        returned_count: returnedAssignments.length,
        status: activeAssignments.length > 0 ? "Active" : "Returned",
        branch: distinctBranches.length === 1 ? distinctBranches[0] : distinctBranches.length > 1 ? "Multiple" : "",
        last_assigned_date: sortedAssignments[0]?.assigned_date || "",
      };
    })
    .sort((left, right) => left.employee_name.localeCompare(right.employee_name));
}

export default function Assignments() {
  const [showAssign, setShowAssign] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [deletingAssignment, setDeletingAssignment] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => couchdb.entities.Assignment.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => couchdb.entities.Employee.list(),
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: () => couchdb.entities.Device.list(),
  });

  const createAssignment = useMutation({
    mutationFn: (data) => couchdb.entities.Assignment.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments"] }),
  });

  const updateAssignment = useMutation({
    mutationFn: ({ id, data }) => couchdb.entities.Assignment.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments"] }),
  });

  const updateDevice = useMutation({
    mutationFn: ({ id, data }) => couchdb.entities.Device.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["devices"] }),
  });

  const deleteAssignment = useMutation({
    mutationFn: (id) => couchdb.entities.Assignment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments"] }),
  });

  const handleAssign = async (assignmentsList, deviceIds) => {
    try {
      if (!assignmentsList.length || !deviceIds.length) {
        throw new Error("Select at least one available device to assign");
      }

      const hasUnavailableDevice = deviceIds
        .map((deviceId) => devices.find((device) => device.id === deviceId))
        .some((device) => !device || device.status !== "Available");

      if (hasUnavailableDevice) {
        throw new Error("One or more selected devices are no longer available");
      }

      for (const assignment of assignmentsList) {
        await createAssignment.mutateAsync(assignment);
      }
      for (const deviceId of deviceIds) {
        await updateDevice.mutateAsync({ id: deviceId, data: { status: "Assigned" } });
      }
      toast.success(`${assignmentsList.length} device(s) assigned successfully`);
      return true;
    } catch (error) {
      toast.error(errorMessage(error, "Unable to assign selected device(s)"));
      return false;
    }
  };

  const handleReturnAssignments = async (assignmentsToReturn) => {
    try {
      const activeAssignments = assignmentsToReturn.filter((assignment) => assignment.status === "Active");

      if (activeAssignments.length === 0) {
        toast.info("No active devices selected for return");
        return;
      }

      for (const assignment of activeAssignments) {
        await updateAssignment.mutateAsync({
          id: assignment.id,
          data: { status: "Returned", returned_date: format(new Date(), "yyyy-MM-dd") },
        });

        const device = devices.find((item) => item.id === assignment.device_id || item.asset_tag === assignment.asset_tag);
        if (device) {
          await updateDevice.mutateAsync({ id: device.id, data: { status: "Available" } });
        }
      }

      toast.success(`${activeAssignments.length} device(s) returned successfully`);
    } catch (error) {
      toast.error(errorMessage(error, "Unable to return selected device(s)"));
    }
  };

  const handleDelete = (assignmentGroup) => {
    setDeletingAssignment(assignmentGroup);
  };

  const handleEdit = (assignmentGroup) => {
    setEditingAssignment(assignmentGroup);
  };

  const handleSaveEdit = async (selectedAssignmentIds) => {
    if (!editingAssignment) {
      return;
    }

    try {
      const assignmentsToReturn = editingAssignment.assignments.filter((assignment) =>
        selectedAssignmentIds.includes(assignment.id)
      );

      await handleReturnAssignments(assignmentsToReturn);
      setEditingAssignment(null);
    } catch (error) {
      toast.error(errorMessage(error, "Unable to update assignment"));
    }
  };

  const confirmDelete = async () => {
    if (!deletingAssignment) {
      return;
    }

    const assignmentGroup = deletingAssignment;

    try {
      for (const assignment of assignmentGroup.assignments) {
        if (assignment.status === "Active") {
          const device = devices.find((d) => d.id === assignment.device_id || d.asset_tag === assignment.asset_tag);
          if (device) {
            await updateDevice.mutateAsync({ id: device.id, data: { status: "Available" } });
          }
        }

        await deleteAssignment.mutateAsync(assignment.id);
      }

      toast.success("Assignments deleted successfully");
    } catch (error) {
      toast.error(errorMessage(error, "Unable to delete assignment"));
    } finally {
      setDeletingAssignment(null);
    }
  };

  const handleGenerateLetter = async (assignmentGroup) => {
    try {
      const assignment = assignmentGroup.assignments[0];
      const employee = employees.find(e => e.employee_id === assignmentGroup.employee_id || e.id === assignmentGroup.employee_id);
      const empAssignments = assignmentGroup.assignments.filter((item) => item.status === "Active");
      const { generateAcknowledgementPDF } = await import("@/lib/pdfUtils");
      generateAcknowledgementPDF(assignment, employee, empAssignments);
      toast.success("Acknowledgement letter downloaded");
    } catch (error) {
      toast.error(errorMessage(error, "Unable to generate acknowledgement letter"));
    }
  };

  const filtered = assignments.filter(a => {
    const matchSearch = !search ||
      a.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.branch?.toLowerCase().includes(search.toLowerCase()) ||
      a.device_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.asset_tag?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const groupedAssignments = groupAssignments(filtered);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="sticky top-0 z-20 -mx-3 border-b border-border bg-background/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-4 sm:px-4 md:-mx-6 md:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 w-full sm:flex-row sm:items-center sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search assignments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Returned">Returned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full sm:w-auto" onClick={() => setShowAssign(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Assign Devices
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : groupedAssignments.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title={assignments.length === 0 ? "No assignments yet" : "No matching assignments"}
          description={assignments.length === 0 ? "Assign devices to employees to track equipment." : "Try adjusting your search or filter."}
          action={assignments.length === 0 && (
            <Button onClick={() => setShowAssign(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create First Assignment
            </Button>
          )}
        />
      ) : (
        <AssignmentTable
          assignments={groupedAssignments}
          onGenerateLetter={handleGenerateLetter}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <AssignDeviceDialog
        open={showAssign}
        onClose={() => setShowAssign(false)}
        onAssign={handleAssign}
        employees={employees}
        devices={devices}
      />

      <AssignmentEditDialog
        open={!!editingAssignment}
        onClose={() => setEditingAssignment(null)}
        onReturnSelected={handleSaveEdit}
        assignmentGroup={editingAssignment}
        saving={updateAssignment.isPending}
      />

      <AlertDialog open={!!deletingAssignment} onOpenChange={() => setDeletingAssignment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all assignments for &quot;{deletingAssignment?.employee_name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
