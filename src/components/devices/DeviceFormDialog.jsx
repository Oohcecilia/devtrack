import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Keyboard, ScanLine } from "lucide-react";
import { couchdb } from "@/api/couchdbClient";
import { cn } from "@/lib/utils";
import InlineScannerModal from "./InlineScannerModal";
import CategorySelect from "./CategorySelect";

const emptyDevice = {
  asset_tag: "",
  device_name: "",
  brand: "",
  model: "",
  serial_number: "",
  category: "",
  status: "Available",
  notes: "",
};

function hasKnownValue(value) {
  return typeof value === "string" && value.trim() && value.trim().toLowerCase() !== "unknown";
}

function categoryFromDeviceType(deviceType) {
  const type = String(deviceType || "").trim().toLowerCase();
  if (type.includes("phone")) return "Phone";
  if (type.includes("laptop") || type.includes("notebook")) return "Laptop";
  if (type === "pc" || type.includes("desktop") || type.includes("workstation")) return "Desktop";
  if (type.includes("network") || type.includes("router") || type.includes("switch")) return "Networking";
  if (type.includes("tablet")) return "Tablet";
  return hasKnownValue(deviceType) ? deviceType : "";
}

function statusFromDeviceInfo(status) {
  if (status === "active") return "Available";
  if (status === "inactive") return "Maintenance";
  return "";
}

function isDeviceInfoResult(value) {
  return value && typeof value === "object" && "serial_number" in value && "device_type" in value;
}

export default function DeviceFormDialog({ open, onClose, onSave, device }) {
  const [form, setForm] = useState(emptyDevice);
  const [scanTarget, setScanTarget] = useState(null); // "asset_tag" | "serial_number"
  const [serialEntryMode, setSerialEntryMode] = useState("manual");
  const [scanLookupLoading, setScanLookupLoading] = useState(false);
  const [scanLookupError, setScanLookupError] = useState("");
  const isEditing = !!device;

  useEffect(() => {
    if (device) {
      setForm({ ...emptyDevice, ...device });
    } else {
      setForm(emptyDevice);
    }
    setSerialEntryMode("manual");
    setScanLookupError("");
  }, [device, open]);

  const applyDeviceInfo = (deviceInfo, fallbackSerialNumber) => {
    const serialNumber = hasKnownValue(deviceInfo.serial_number)
      ? deviceInfo.serial_number.trim()
      : fallbackSerialNumber;
    const manufacturer = hasKnownValue(deviceInfo.manufacturer) ? deviceInfo.manufacturer.trim() : "";
    const model = hasKnownValue(deviceInfo.model) ? deviceInfo.model.trim() : "";
    const category = categoryFromDeviceType(deviceInfo.device_type);
    const status = statusFromDeviceInfo(deviceInfo.status);

    setForm((prev) => {
      const generatedName = [manufacturer, model].filter(Boolean).join(" ");
      return {
        ...prev,
        serial_number: serialNumber,
        brand: manufacturer || prev.brand,
        model: model || prev.model,
        category: category || prev.category,
        status: status || prev.status,
        device_name: prev.device_name?.trim() ? prev.device_name : generatedName || prev.device_name,
      };
    });
  };

  const handleScanCapture = async (value) => {
    const target = scanTarget;
    const scannedValue = value.trim();
    setScanTarget(null);

    if (!target || !scannedValue) {
      return;
    }

    setForm((prev) => ({ ...prev, [target]: scannedValue }));
    if (target !== "serial_number") {
      return;
    }

    setScanLookupError("");
    setScanLookupLoading(true);

    try {
      const deviceInfo = await couchdb.scanner.deviceInfo(scannedValue);
      applyDeviceInfo(deviceInfo, scannedValue);
    } catch (error) {
      if (isDeviceInfoResult(error.data)) {
        applyDeviceInfo(error.data, scannedValue);
        setScanLookupError(error.data.error?.message || "");
      } else {
        setScanLookupError(error.message || "Device details could not be retrieved.");
      }
    } finally {
      setScanLookupLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Device" : "Add New Device"}</DialogTitle>
          <DialogDescription className="sr-only">
            Enter device inventory details, scan or type the serial number, and add optional notes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Asset Tag</Label>
              <div className="flex gap-2">
                <Input
                  required
                  value={form.asset_tag}
                  onChange={(e) => setForm({ ...form, asset_tag: e.target.value })}
                  placeholder="e.g. AST-001"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setScanTarget("asset_tag")} title="Scan">
                  <ScanLine className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Device Name</Label>
              <Input
                required
                value={form.device_name}
                onChange={(e) => setForm({ ...form, device_name: e.target.value })}
                placeholder="e.g. MacBook Pro"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input
                required
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="e.g. Apple"
              />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input
                required
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="e.g. A2442"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <Label>Serial Number</Label>
              <div className="relative grid w-full grid-cols-2 rounded-full bg-muted p-1 sm:w-44">
                <span
                  className={cn(
                    "absolute left-1 top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-full bg-background shadow-sm transition-transform",
                    serialEntryMode === "scan" && "translate-x-full"
                  )}
                />
                <button
                  type="button"
                  aria-pressed={serialEntryMode === "manual"}
                  className={cn(
                    "relative z-10 flex h-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    serialEntryMode === "manual" ? "text-foreground" : "text-muted-foreground"
                  )}
                  onClick={() => setSerialEntryMode("manual")}
                >
                  <Keyboard className="w-3.5 h-3.5 mr-1.5" />
                  Manual
                </button>
                <button
                  type="button"
                  aria-pressed={serialEntryMode === "scan"}
                  className={cn(
                    "relative z-10 flex h-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    serialEntryMode === "scan" ? "text-foreground" : "text-muted-foreground"
                  )}
                  onClick={() => {
                    setSerialEntryMode("scan");
                    setScanTarget("serial_number");
                  }}
                >
                  <ScanLine className="w-3.5 h-3.5 mr-1.5" />
                  Scan
                </button>
              </div>
            </div>
            {serialEntryMode === "manual" ? (
              <Input
                required
                value={form.serial_number}
                onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                placeholder="e.g. C02X1234"
              />
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  required
                  value={form.serial_number}
                  onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                  placeholder="Scan serial number..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={scanLookupLoading}
                  className="sm:w-auto"
                  onClick={() => setScanTarget("serial_number")}
                >
                  <ScanLine className="w-4 h-4 mr-2" />
                  {scanLookupLoading ? "Scanning..." : "Scan"}
                </Button>
              </div>
            )}
            {scanLookupError && (
              <p className="text-xs text-destructive">{scanLookupError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <CategorySelect
              value={form.category}
              onChange={(v) => setForm({ ...form, category: v })}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Assigned">Assigned</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Device-specific notes..."
              rows={3}
            />
          </div>
          <InlineScannerModal
            open={!!scanTarget}
            onClose={() => setScanTarget(null)}
            label={scanTarget === "asset_tag" ? "Asset Tag" : "Serial Number"}
            onCapture={handleScanCapture}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={scanLookupLoading}>{isEditing ? "Save Changes" : "Add Device"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
