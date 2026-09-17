"use client";

import dynamic from "next/dynamic";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { QrCode } from "lucide-react";
import { authedFetch } from "@/lib/browser-api";
import { StatusMessage } from "@/components/StatusMessage";
import { labelStatus } from "@/lib/labels";
import { AdminPageHeader, GlassCard, StatusBadge } from "@/components/admin";
import { Toast, useToast } from "@/components/portal/Toast";

const QrScanner = dynamic(() => import("@/components/QrScanner").then((mod) => mod.QrScanner), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-500">Chargement de la caméra...</p>,
});

type AttendanceScanResult = {
  id: number;
  status: string;
  arrived_at: string | null;
  validation_method: string;
  volunteer_name?: string;
  event_title?: string;
  mission_name?: string;
};

export default function AttendanceScanPage() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<AttendanceScanResult | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const scanLockRef = useRef(false);
  const { toast, showToast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("token");
    if (value) {
      setToken(value);
    }
  }, []);

  const scanToken = useCallback(async (rawToken: string) => {
    const nextToken = rawToken.trim();
    if (!nextToken || scanLockRef.current) {
      return;
    }

    scanLockRef.current = true;
    setToken(nextToken);
    setMessage("");
    setError("");
    setResult(null);

    try {
      const data = await authedFetch<AttendanceScanResult>("/attendance/scan/", {
        method: "POST",
        body: JSON.stringify({ token: nextToken }),
      });
      setResult(data);
      setMessage(`Présence validée pour ${data.volunteer_name ?? "le bénévole"}.`);
      showToast("Présence validée avec succès !");
      setScanning(false);
    } catch (err) {
      scanLockRef.current = false;
      const scanError = err instanceof Error ? err.message : "Impossible de scanner.";
      if (scanError.includes("409")) {
        setError("Ce QR Code a déjà été scanné. Présence déjà enregistrée.");
      } else {
        setError(scanError);
      }
    }
  }, [showToast]);

  const handleCameraScan = useCallback((value: string) => {
    void scanToken(value);
  }, [scanToken]);

  async function scan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await scanToken(token);
  }

  return (
    <section>
      <AdminPageHeader
        kicker="Organisation"
        title="Scanner un QR Code"
        subtitle="Caméra ou collage du jeton : la présence passe à Présent et les statistiques se mettent à jour."
      />

      <div className="mt-6 grid gap-3">
        <StatusMessage message={message} tone="info" />
        <StatusMessage message={error} tone="error" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <GlassCard hover={false}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-brand-100 to-cyan-100 p-3 text-brand-600">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-black">Scanner avec la caméra</h2>
                <p className="text-sm text-slate-600">Pointez vers le QR Code du bénévole.</p>
              </div>
            </div>
            <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => setScanning((value) => !value)}>
              {scanning ? "Arrêter" : "Démarrer la caméra"}
            </button>
          </div>
          {scanning ? <div className="mt-5 overflow-hidden rounded-2xl">{<QrScanner onScan={handleCameraScan} />}</div> : null}
        </GlassCard>

        <GlassCard hover={false}>
          <form onSubmit={scan} className="grid gap-5">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Jeton QR ou URL scannée
              <textarea
                className="min-h-28"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Collez ici le jeton ou l'URL du QR Code"
                required
              />
            </label>
            <button className="btn-primary" type="submit">
              Valider la présence
            </button>
            {result ? (
              <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-black">{result.volunteer_name}</p>
                <p className="mt-1">
                  {result.event_title} — {result.mission_name}
                </p>
                <div className="mt-3">
                  <StatusBadge label={`${labelStatus(result.status)} · ${labelStatus(result.validation_method)}`} tone="success" />
                </div>
              </div>
            ) : null}
          </form>
        </GlassCard>
      </div>
      <Toast toast={toast} />
    </section>
  );
}
