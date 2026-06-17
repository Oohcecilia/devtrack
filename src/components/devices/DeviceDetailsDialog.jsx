import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";

function DetailRow({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm break-words">{value || "—"}</div>
    </div>
  );
}

export default function DeviceDetailsDialog({ open, onClose, device }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Device Details</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailRow label="Record ID" value={device?.id} />
          <DetailRow label="Device Name" value={device?.device_name} />
          <DetailRow label="Brand" value={device?.brand} />
          <DetailRow label="Model" value={device?.model} />
          <DetailRow label="Serial Number" value={device?.serial_number} />
          <DetailRow label="Category" value={device?.category} />
          <DetailRow label="Asset Tag" value={device?.asset_tag} />
          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</div>
            <StatusBadge status={device?.status} />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</div>
            <div className="text-sm whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/30 p-3 min-h-20">
              {device?.notes || "—"}
            </div>
          </div>
          <DetailRow label="Created" value={device?.created_at ? new Date(device.created_at).toLocaleString() : ""} />
          <DetailRow label="Updated" value={device?.updated_at ? new Date(device.updated_at).toLocaleString() : ""} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
