import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

export default function AssignDeviceDialog({ open, onClose, onAssign, employees, devices }) {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [notes, setNotes] = useState("");

  const availableDevices = devices.filter(d => d.status === "Available");

  const toggleDevice = (deviceId) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const employee = employees.find(emp => emp.id === selectedEmployee);
    if (!employee || selectedDevices.length === 0) return;

    const assignments = selectedDevices.map(deviceId => {
      const device = devices.find(d => d.id === deviceId);
      return {
        employee_id: employee.employee_id,
        employee_name: employee.full_name,
        device_id: device.id,
        device_name: device.device_name,
        asset_tag: device.asset_tag,
        assigned_date: format(new Date(), "yyyy-MM-dd"),
        status: "Active",
        notes,
      };
    });

    onAssign(assignments, selectedDevices);
    setSelectedEmployee("");
    setSelectedDevices([]);
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Devices</DialogTitle>
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
                    {emp.full_name} ({emp.employee_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!selectedEmployee || selectedDevices.length === 0}>
              Assign {selectedDevices.length > 0 ? `(${selectedDevices.length})` : ""}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
