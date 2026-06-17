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

  const handleReturn = async (assignment) => {
    try {
      if (assignment.status === "Returned") {
        toast.info("Device has already been returned");
        return;
      }

      await updateAssignment.mutateAsync({
        id: assignment.id,
        data: { status: "Returned", returned_date: format(new Date(), "yyyy-MM-dd") },
      });
      const device = devices.find(d => d.asset_tag === assignment.asset_tag);
      if (device) {
        await updateDevice.mutateAsync({ id: device.id, data: { status: "Available" } });
      }
      toast.success("Device returned successfully");
    } catch (error) {
      toast.error(errorMessage(error, "Unable to return device"));
    }
  };

  const handleDelete = (assignment) => {
    setDeletingAssignment(assignment);
  };

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
  };

  const handleSaveEdit = async (formData) => {
    if (!editingAssignment) {
      return;
    }

    try {
      await updateAssignment.mutateAsync({
        id: editingAssignment.id,
        data: {
          branch: formData.branch,
          notes: formData.notes,
        },
      });
      toast.success("Assignment updated successfully");
      setEditingAssignment(null);
    } catch (error) {
      toast.error(errorMessage(error, "Unable to update assignment"));
    }
  };

  const confirmDelete = async () => {
    if (!deletingAssignment) {
      return;
    }

    const assignment = deletingAssignment;

    try {
      if (assignment.status === "Active") {
        const device = devices.find((d) => d.id === assignment.device_id || d.asset_tag === assignment.asset_tag);
        if (device) {
          await updateDevice.mutateAsync({ id: device.id, data: { status: "Available" } });
        }
      }

      await deleteAssignment.mutateAsync(assignment.id);
      toast.success("Assignment deleted successfully");
    } catch (error) {
      toast.error(errorMessage(error, "Unable to delete assignment"));
    } finally {
      setDeletingAssignment(null);
    }
  };

  const handleGenerateLetter = async (assignment) => {
    try {
      const employee = employees.find(e => e.employee_id === assignment.employee_id || e.id === assignment.employee_id);
      const empAssignments = assignments.filter(
        a => a.employee_id === assignment.employee_id && a.status === "Active"
      );
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
      ) : filtered.length === 0 ? (
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
          assignments={filtered}
          onReturn={handleReturn}
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
        onSave={handleSaveEdit}
        assignment={editingAssignment}
        saving={updateAssignment.isPending}
      />

      <AlertDialog open={!!deletingAssignment} onOpenChange={() => setDeletingAssignment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the assignment for &quot;{deletingAssignment?.device_name}&quot; assigned to &quot;{deletingAssignment?.employee_name}&quot;? This action cannot be undone.
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
