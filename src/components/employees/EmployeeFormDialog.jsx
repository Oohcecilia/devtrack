import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const emptyEmployee = {
  full_name: "",
  department: "",
  position: "",
};

export default function EmployeeFormDialog({ open, onClose, onSave, employee, saving = false, error = "" }) {
  const [form, setForm] = useState(emptyEmployee);
  const isEditing = !!employee;

  useEffect(() => {
    if (employee) {
      setForm(employee);
    } else {
      setForm(emptyEmployee);
    }
  }, [employee, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Employee" : "Add New Employee"}</DialogTitle>
          <DialogDescription className="sr-only">
            Enter the employee name and department. Employee ID is generated automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="e.g. John Doe"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                required
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="e.g. Engineering"
              />
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Input
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="e.g. Software Engineer"
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Add Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
