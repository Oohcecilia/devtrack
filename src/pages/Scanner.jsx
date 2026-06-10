import { useCallback, useState } from "react";
import { couchdb } from "@/api/couchdbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, QrCode, X } from "lucide-react";
import BarcodeScanner from "@/components/shared/BarcodeScanner";
import StatusBadge from "@/components/shared/StatusBadge";

function isDeviceInfoResult(value) {
  return value && typeof value === "object" && "serial_number" in value && "device_type" in value;
}

export default function Scanner() {
  const [manualCode, setManualCode] = useState("");
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [scannerError, setScannerError] = useState(null);

  const searchDevice = useCallback(async (code) => {
    // Step 1: Normalize the scanned/manual serial before sending it to the API.
    const query = code.trim();
    if (!query) {
      return;
    }

    setLookupLoading(true);
    setScannerError(null);
    setNotFound(false);

    try {
      // Step 2: Retrieve the normalized single-object device response from the backend.
      const result = await couchdb.scanner.deviceInfo(query);

      // Step 3: Store the formatted scanner output exactly as returned by the API.
      setDeviceInfo(result);
      setNotFound(Boolean(result.error));
    } catch (error) {
      // Step 4: Preserve normalized error output when the API knows the serial is invalid or unknown.
      if (isDeviceInfoResult(error.data)) {
        setDeviceInfo(error.data);
        setNotFound(true);
      } else {
        setDeviceInfo(null);
        setNotFound(true);
        setScannerError(error.message || "Device lookup failed.");
      }
    } finally {
      setLookupLoading(false);
    }
  }, []);

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (manualCode.trim()) searchDevice(manualCode);
  };

  const startScanner = async () => {
    setScannerError(null);
    setScanning(true);
  };

  const stopScanner = () => {
    setScanning(false);
  };

  const handleScannerResult = useCallback((decodedText) => {
    setManualCode(decodedText);
    setScanning(false);
    searchDevice(decodedText);
  }, [searchDevice]);

  const handleScannerError = useCallback(() => {
    setScannerError("Camera access denied, unavailable, or scanner failed to load.");
    setScanning(false);
  }, []);

  return (
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      {/* Manual Search */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Look Up Device
        </h3>
        <form onSubmit={handleManualSearch} className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Enter asset tag or serial number..."
            className="flex-1"
          />
          <Button type="submit" disabled={lookupLoading}>Search</Button>
        </form>
      </div>

      {/* Camera Scanner */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          QR / Barcode Scanner
        </h3>

        {scannerError && (
          <p className="text-sm text-destructive mb-3">{scannerError}</p>
        )}

        <BarcodeScanner
          active={scanning}
          onScan={handleScannerResult}
          onError={handleScannerError}
          className={scanning ? "" : "hidden"}
        />

        {scanning ? (
          <Button variant="outline" onClick={stopScanner} className="w-full mt-4">
            <X className="w-4 h-4 mr-2" />
            Stop Scanner
          </Button>
        ) : (
          <Button variant="outline" onClick={startScanner} className="w-full">
            <QrCode className="w-4 h-4 mr-2" />
            Start Scanner
          </Button>
        )}
      </div>

      {/* Result */}
      {deviceInfo && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-semibold">Device Details</h3>
            <StatusBadge status={deviceInfo.status} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ["Serial Number", deviceInfo.serial_number],
              ["Device Type", deviceInfo.device_type],
              ["Manufacturer", deviceInfo.manufacturer],
              ["Model", deviceInfo.model],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className="text-sm font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          {deviceInfo.warranty && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground font-medium">Warranty</p>
              <p className="text-sm font-medium mt-0.5">{deviceInfo.warranty.status}</p>
              {deviceInfo.warranty.expiry_date && (
                <p className="text-xs text-muted-foreground mt-1">Expires {deviceInfo.warranty.expiry_date}</p>
              )}
            </div>
          )}
        </div>
      )}

      {notFound && (
        <div className="bg-card rounded-xl border border-destructive/30 p-4 text-center sm:p-6">
          <p className="text-sm text-destructive font-medium">{deviceInfo?.error?.message || `No device found matching "${manualCode}"`}</p>
          <p className="text-xs text-muted-foreground mt-1">Check the asset tag or serial number and try again.</p>
        </div>
      )}
    </div>
  );
}
