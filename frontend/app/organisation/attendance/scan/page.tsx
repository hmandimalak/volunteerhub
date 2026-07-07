"use client";

import { FormEvent, useEffect, useState } from "react";
import { QrCode } from "lucide-react";
import { authedFetch } from "@/lib/browser-api";
import { RoleGate } from "@/components/RoleGate";
import { StatusMessage } from "@/components/StatusMessage";

type AttendanceScanResult = {
  id: number;
  status: string;
  arrived_at: string | null;
  validation_method: string;
};

export default function AttendanceScanPage() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<AttendanceScanResult | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("token");
    if (value) {
      setToken(value);
    }
  }, []);

  async function scan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setResult(null);

    try {
      const data = await authedFetch<AttendanceScanResult>("/attendance/scan/", {
        method: "POST",
        body: JSON.stringify({ token })
      });
      setResult(data);
      setMessage("Presence validee avec succes.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan impossible.");
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <p className="font-bold text-brand-600">Organisation</p>
      <h1 className="mt-2 text-4xl font-black">Scan QR attendance</h1>
      <p className="mt-3 text-slate-600">Scannez le QR Code du benevole ou collez le lien/token affiche par le scanner.</p>

      <RoleGate allowedRoles={["organisation", "admin"]}>
        <div className="mt-6 grid gap-3">
          <StatusMessage message={message} tone="info" />
          <StatusMessage message={error} tone="error" />
        </div>

        <form onSubmit={scan} className="card mt-8 grid gap-5">
          <QrCode className="h-10 w-10 text-brand-600" />
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            QR token ou URL scannee
            <textarea
              className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Collez ici le token ou l'URL du QR Code"
              required
            />
          </label>
          <button className="btn-primary" type="submit">Valider la presence</button>

          {result ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              Presence #{result.id} - statut {result.status} - methode {result.validation_method}
            </div>
          ) : null}
        </form>
      </RoleGate>
    </section>
  );
}
