"use client";

import { useEffect, useState } from "react";
import { Download, Eye } from "lucide-react";
import { Certificate, PaginatedResponse, formatDate, unwrapResults } from "@/lib/api";
import { authedFetch, downloadAuthedFile } from "@/lib/browser-api";
import { AdminPageHeader, EmptyState, GlassCard } from "@/components/admin";
import { CertificatePreview } from "@/components/volunteer/CertificatePreview";
import { Toast, useToast } from "@/components/portal/Toast";
import { StatusMessage } from "@/components/StatusMessage";

export function CertificatesGallery() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [preview, setPreview] = useState<Certificate | null>(null);
  const [error, setError] = useState("");
  const { toast, showToast } = useToast();

  useEffect(() => {
    authedFetch<PaginatedResponse<Certificate> | Certificate[]>("/users/me/certificats/")
      .then((data) => setCertificates(unwrapResults(data)))
      .catch((err) => setError(err instanceof Error ? err.message : "Impossible de charger les certificats."));
  }, []);

  async function downloadCertificate(certificate: Certificate) {
    try {
      await downloadAuthedFile(`/users/me/certificats/${certificate.id}/download/`, `certificat-${certificate.id}.pdf`);
      showToast("Certificat téléchargé avec succès !");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Téléchargement impossible.");
    }
  }

  return (
    <section>
      <AdminPageHeader
        kicker="Mes certificats"
        title="Certificats et attestations"
        subtitle="Retrouvez chaque attestation officielle, prévisualisez-la et téléchargez le PDF signé."
      />
      <div className="mt-6">
        <StatusMessage message={error} tone="error" />
      </div>
      {certificates.length === 0 && !error ? (
        <GlassCard className="mt-8" hover={false}>
          <EmptyState title="Aucun certificat" description="Les attestations apparaissent après validation de votre présence." />
        </GlassCard>
      ) : null}
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {certificates.map((certificate) => (
          <GlassCard key={certificate.id} className="glow-border">
            <p className="text-xs font-black uppercase tracking-wide text-brand-400">Attestation officielle</p>
            <h2 className="mt-2 text-xl font-black">{certificate.event_title || `Certificat n°${certificate.id}`}</h2>
            <p className="mt-2 text-sm text-slate-600">{certificate.organisation_name || "Organisation"}</p>
            <p className="mt-3 text-sm font-semibold text-slate-500">
              {certificate.event_date ? formatDate(certificate.event_date) : formatDate(certificate.generated_at)} · {certificate.hours} h réalisées
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => setPreview(certificate)}>
                <Eye className="h-4 w-4" /> Aperçu
              </button>
              <button type="button" className="btn-primary glow-ring px-4 py-2 text-sm" onClick={() => downloadCertificate(certificate)}>
                <Download className="h-4 w-4" /> Télécharger le PDF
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
      {preview ? (
        <CertificatePreview certificate={preview} onClose={() => setPreview(null)} onDownload={() => downloadCertificate(preview)} />
      ) : null}
      <Toast toast={toast} />
    </section>
  );
}
