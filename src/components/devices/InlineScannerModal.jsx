import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Keyboard, QrCode, ScanLine } from "lucide-react";
import BarcodeScanner from "@/components/shared/BarcodeScanner";

export default function InlineScannerModal({ open, onClose, onCapture, label }) {
  const [manualValue, setManualValue] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [mode, setMode] = useState("scan");

  useEffect(() => {
    if (open) {
      setCameraError("");
      setManualValue("");
      setMode("scan");
    }
  }, [open]);

  const handleScan = useCallback((value) => {
    if (value) {
      onCapture(value);
      onClose();
    }
  }, [onCapture, onClose]);

  const handleScannerError = useCallback(() => {
    setCameraError("Camera not available. Enter the value manually.");
    setMode("manual");
  }, []);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualValue.trim()) {
      onCapture(manualValue.trim());
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" />
            Scan {label}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={mode === "scan" ? "default" : "outline"}
              onClick={() => {
                setMode("scan");
                setCameraError("");
              }}
            >
              <ScanLine className="w-4 h-4 mr-2" />
              Scan
            </Button>
            <Button
              type="button"
              variant={mode === "manual" ? "default" : "outline"}
              onClick={() => setMode("manual")}
            >
              <Keyboard className="w-4 h-4 mr-2" />
              Manual
            </Button>
          </div>

          {mode === "scan" && (
            <>
              {cameraError ? (
                <div className="bg-muted rounded-lg p-4 text-center text-sm text-muted-foreground">
                  {cameraError}
                </div>
              ) : (
                <BarcodeScanner
                  active={open && mode === "scan"}
                  onScan={handleScan}
                  onError={handleScannerError}
                />
              )}
            </>
          )}

          {mode === "manual" && (
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                autoFocus
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                placeholder={`Enter ${label.toLowerCase()}...`}
                className="flex-1"
              />
              <Button type="submit" disabled={!manualValue.trim()}>Use</Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
