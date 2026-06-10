import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { couchdb } from "@/api/couchdbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Monitor } from "lucide-react";
import DeviceTable from "@/components/devices/DeviceTable";
import DeviceFormDialog from "@/components/devices/DeviceFormDialog";
import EmptyState from "@/components/shared/EmptyState";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Devices() {
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [deletingDevice, setDeletingDevice] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: () => couchdb.entities.Device.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => couchdb.entities.Device.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["devices"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => couchdb.entities.Device.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["devices"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => couchdb.entities.Device.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["devices"] }),
  });

  const handleSave = (formData) => {
    if (editingDevice) {
      updateMutation.mutate({ id: editingDevice.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
    setEditingDevice(null);
  };

  const handleEdit = (device) => {
    setEditingDevice(device);
    setShowForm(true);
  };

  const handleDelete = (device) => {
    setDeletingDevice(device);
  };

  const confirmDelete = () => {
    if (deletingDevice) {
      deleteMutation.mutate(deletingDevice.id);
      setDeletingDevice(null);
    }
  };

  const categories = [...new Set(devices.map(d => d.category).filter(Boolean))];

  const filtered = devices.filter(d => {
    const matchSearch = !search || 
      d.device_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.asset_tag?.toLowerCase().includes(search.toLowerCase()) ||
      d.brand?.toLowerCase().includes(search.toLowerCase()) ||
      d.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
      d.notes?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    const matchCategory = categoryFilter === "all" || d.category === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search devices..."
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
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Assigned">Assigned</SelectItem>
              <SelectItem value="Maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
          {categories.length > 0 && (
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
	        <Button className="w-full sm:w-auto" onClick={() => { setEditingDevice(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Device
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Monitor}
          title={devices.length === 0 ? "No devices yet" : "No matching devices"}
          description={devices.length === 0 ? "Start by adding your first device to the inventory." : "Try adjusting your search or filter."}
          action={devices.length === 0 && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add First Device
            </Button>
          )}
        />
      ) : (
        <DeviceTable devices={filtered} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      <DeviceFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditingDevice(null); }}
        onSave={handleSave}
        device={editingDevice}
      />

      <AlertDialog open={!!deletingDevice} onOpenChange={() => setDeletingDevice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingDevice?.device_name}&quot;? This action cannot be undone.
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
