import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export default function BarcodeScanner({ active, onScan, onError, className }) {
  const containerIdRef = useRef(`barcode-scanner-${Math.random().toString(36).slice(2)}`);
  const scannerRef = useRef(null);
  const capturedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    let cancelled = false;
    let scanner = null;
    capturedRef.current = false;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) {
          return;
        }

        scanner = new Html5Qrcode(containerIdRef.current);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            const value = decodedText.trim();
            if (value && !capturedRef.current) {
              capturedRef.current = true;
              onScan(value);
            }
          },
          () => {},
        );
      } catch (error) {
        if (!cancelled) {
          onError?.(error);
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      const currentScanner = scannerRef.current || scanner;
      scannerRef.current = null;

      if (currentScanner) {
        Promise.resolve().then(async () => {
          try {
            if (currentScanner.isScanning) {
              await currentScanner.stop();
            }
          } catch {}

          try {
            currentScanner.clear();
          } catch {}
        });
      }
    };
  }, [active, onError, onScan]);

  return (
    <div
      id={containerIdRef.current}
      className={cn("rounded-lg overflow-hidden bg-black min-h-64", className)}
    />
  );
}
