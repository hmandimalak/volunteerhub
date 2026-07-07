"use client";

import { useEffect, useState } from "react";
import { Certificate, formatDate } from "@/lib/api";
import { authedFetch, downloadAuthedFile } from "@/lib/browser-api";
import { RoleGate } from "@/components/RoleGate";
import { StatusMessage } from "@/components/StatusMessage";

export default function VolunteerCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    authedFetch<Certificate[]>("/users/me/certificats/")
      .then(setCertificates)
      .catch((err) => setError(err instanceof Error ? err.message : "Certificats indisponibles."));
  }, []);

  async function downloadCertificate(certificate: Certificate) {
    setMessage("");
    setError("");
    try {
      await downloadAuthedFile(`/users/me/certificats/${certificate.id}/download/`, `certificat-${certificate.id}.pdf`);
      setMessage("Certificat telecharge.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Telechargement impossible.");
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <p className="font-bold text-brand-600">Benevole</p>
      <h1 className="mt-2 text-4xl font-black">Mes certificats</h1>
      <RoleGate allowedRoles={["benevole", "admin"]}>
        <div className="mt-6 grid gap-3">
          <StatusMessage message={message} tone="info" />
          <StatusMessage message={error} tone="error" />
        </div>

        <div className="card mt-8">
          {certificates.length === 0 ? <p className="text-slate-600">Aucun certificat disponible pour le moment.</p> : null}
          <div className="grid gap-4">
            {certificates.map((certificate) => (
              <div key={certificate.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center">
                <div>
                  <h2 className="font-black">Certificat #{certificate.id}</h2>
                  <p className="mt-1 text-sm text-slate-600">Genere le {formatDate(certificate.generated_at)}</p>
                </div>
                <button className="btn-primary px-4 py-2 text-sm" onClick={() => downloadCertificate(certificate)}>
                  Telecharger PDF
                </button>
              </div>
            ))}
          </div>
        </div>
      </RoleGate>
    </section>
  );
}
