"use client";

import { useEffect, useRef, useState } from "react";

type QrScannerProps = {
  onScan: (value: string) => void;
};

export function QrScanner({ onScan }: QrScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const onScanRef = useRef(onScan);
  const [error, setError] = useState("");

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let active = true;

    async function startScanner() {
      if (!containerRef.current) {
        return;
      }

      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode(containerRef.current.id);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            onScanRef.current(decodedText);
          },
          () => undefined
        );

        if (!active) {
          await scanner.stop();
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Caméra indisponible.");
        }
      }
    }

    startScanner();

    return () => {
      active = false;
      scannerRef.current?.stop().catch(() => undefined);
    };
  }, []);

  return (
    <div className="grid gap-3">
      <div
        id="qr-scanner-region"
        ref={containerRef}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-black"
      />
      {error ? <p className="text-sm text-amber-700">{error}</p> : null}
    </div>
  );
}
