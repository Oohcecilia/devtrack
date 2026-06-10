import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { couchdb } from "@/api/couchdbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users } from "lucide-react";
import EmployeeTable from "@/components/employees/EmployeeTable";
import EmployeeFormDialog from "@/components/employees/EmployeeFormDialog";
import EmptyState from "@/components/shared/EmptyState";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Employees() {
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deletingEmployee, setDeletingEmployee] = useState(null);
  const [search, setSearch] = useState("");
  const [formError, setFormError] = useState("");
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => couchdb.entities.Employee.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => couchdb.entities.Employee.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => couchdb.entities.Employee.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => couchdb.entities.Employee.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });

  const handleSave = async (formData) => {
    setFormError("");

    try {
      if (editingEmployee) {
        await updateMutation.mutateAsync({ id: editingEmployee.id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setShowForm(false);
      setEditingEmployee(null);
    } catch (error) {
      setFormError(error.message || "Unable to save employee");
    }
  };

  const handleEdit = (emp) => {
    setEditingEmployee(emp);
    setFormError("");
    setShowForm(true);
  };

  const confirmDelete = () => {
    if (deletingEmployee) {
      deleteMutation.mutate(deletingEmployee.id);
      setDeletingEmployee(null);
    }
  };

  const filtered = employees.filter(e =>
    !search ||
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button className="w-full sm:w-auto" onClick={() => { setEditingEmployee(null); setFormError(""); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={employees.length === 0 ? "No employees yet" : "No matching employees"}
          description={employees.length === 0 ? "Add your first employee to get started." : "Try adjusting your search."}
          action={employees.length === 0 && (
            <Button onClick={() => { setFormError(""); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add First Employee
            </Button>
          )}
        />
      ) : (
        <EmployeeTable employees={filtered} onEdit={handleEdit} onDelete={(emp) => setDeletingEmployee(emp)} />
      )}

      <EmployeeFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditingEmployee(null); setFormError(""); }}
        onSave={handleSave}
        employee={editingEmployee}
        saving={createMutation.isPending || updateMutation.isPending}
        error={formError}
      />

      <AlertDialog open={!!deletingEmployee} onOpenChange={() => setDeletingEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingEmployee?.full_name}&quot;? This action cannot be undone.
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
