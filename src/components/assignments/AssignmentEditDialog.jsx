import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const emptyForm = {
  branch: "",
  notes: "",
};

export default function AssignmentEditDialog({ open, onClose, onSave, assignment, saving }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (assignment) {
      setForm({
        branch: assignment.branch || "",
        notes: assignment.notes || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [assignment, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      branch: form.branch,
      notes: form.notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Update Assignment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Input readOnly value={assignment?.employee_name || ""} />
            </div>
            <div className="space-y-2">
              <Label>Device</Label>
              <Input readOnly value={assignment?.device_name || ""} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Branch</Label>
            <Input
              value={form.branch}
              onChange={(e) => setForm({ ...form, branch: e.target.value })}
              placeholder="e.g. Main Office"
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Assignment notes..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
