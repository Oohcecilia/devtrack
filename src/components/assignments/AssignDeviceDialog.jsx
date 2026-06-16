import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

export default function AssignDeviceDialog({ open, onClose, onAssign, employees, devices }) {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [branch, setBranch] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableDevices = devices.filter(d => d.status === "Available");

  const toggleDevice = (deviceId) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const resetForm = () => {
    setSelectedEmployee("");
    setSelectedDevices([]);
    setBranch("");
    setNotes("");
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const employee = employees.find(emp => emp.id === selectedEmployee);
    if (!employee || selectedDevices.length === 0) {
      setFormError("Select an employee and at least one available device");
      return;
    }

    const assignments = selectedDevices.map(deviceId => {
      const device = devices.find(d => d.id === deviceId);
      if (!device || device.status !== "Available") {
        return null;
      }
      return {
        employee_id: employee.employee_id || employee.id,
        employee_name: employee.full_name,
        branch: branch.trim(),
        device_id: device.id,
        device_name: device.device_name,
        asset_tag: device.asset_tag,
        assigned_date: format(new Date(), "yyyy-MM-dd"),
        status: "Active",
        notes,
      };
    }).filter(Boolean);

    if (assignments.length !== selectedDevices.length) {
      setFormError("One or more selected devices are no longer available");
      return;
    }

    setIsSubmitting(true);
    try {
      const assigned = await onAssign(assignments, selectedDevices);
      if (assigned === false) {
        return;
      }
      resetForm();
      onClose();
    } catch (error) {
      setFormError(error.message || "Unable to assign selected device(s)");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Devices</DialogTitle>
          <DialogDescription className="sr-only">
            Select an employee, enter an optional branch, choose one or more available devices, and add optional assignment notes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Branch</Label>
            <Input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="e.g. Main Office"
            />
          </div>

          <div className="space-y-2">
            <Label>Select Devices ({selectedDevices.length} selected)</Label>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-3 space-y-2">
              {availableDevices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No available devices</p>
              ) : (
                availableDevices.map(device => (
                  <label
                    key={device.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedDevices.includes(device.id)}
                      onCheckedChange={() => toggleDevice(device.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{device.device_name}</p>
                      <p className="text-xs text-muted-foreground">{device.asset_tag} • {device.brand} {device.model}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this assignment..."
              rows={2}
            />
          </div>

          {formError && (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !selectedEmployee || selectedDevices.length === 0}>
              {isSubmitting ? "Assigning..." : `Assign ${selectedDevices.length > 0 ? `(${selectedDevices.length})` : ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
