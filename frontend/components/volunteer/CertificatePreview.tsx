"use client";

import { Certificate, formatDate } from "@/lib/api";

type CertificatePreviewProps = {
  certificate: Certificate;
  onClose: () => void;
  onDownload: () => void;
};

export function CertificatePreview({ certificate, onClose, onDownload }: CertificatePreviewProps) {
  function printCertificate() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-brand-900/40 backdrop-blur-sm print:hidden" aria-label="Fermer l'aperçu" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/40 bg-white/95 p-4 shadow-2xl backdrop-blur-xl print:max-h-none print:overflow-visible print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
        <div className="mb-4 flex flex-wrap justify-end gap-2 print:hidden">
          <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={printCertificate}>
            Imprimer
          </button>
          <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={onDownload}>
            Télécharger le PDF
          </button>
          <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={onClose}>
            Fermer
          </button>
        </div>
        <article className="certificate-sheet relative overflow-hidden rounded-[2rem] border-4 border-brand-200 bg-gradient-to-br from-white via-brand-50 to-cyan-50 px-8 py-12 text-center shadow-[0_0_40px_rgba(139,92,246,0.18)]">
          <div className="pointer-events-none absolute inset-4 rounded-[1.6rem] border border-lilac/40" />
          <p className="text-xs font-black uppercase tracking-[0.35em] text-brand-400">VolunteerHub</p>
          <h2 className="mt-4 text-4xl font-black text-brand-900">Certificat de bénévolat</h2>
          <p className="mt-6 text-sm font-semibold text-slate-500">Ce document atteste que</p>
          <p className="mt-3 text-3xl font-black text-brand-700">{certificate.volunteer_name || "Bénévole"}</p>
          <p className="mt-6 text-sm font-semibold text-slate-500">a accompli une mission officielle lors de</p>
          <p className="mt-2 text-2xl font-black text-brand-900">{certificate.event_title || "Événement"}</p>
          <div className="mx-auto mt-8 grid max-w-lg gap-3 text-sm font-bold text-slate-600">
            <p>Organisation : {certificate.organisation_name || "—"}</p>
            <p>Date : {certificate.event_date ? formatDate(certificate.event_date) : formatDate(certificate.generated_at)}</p>
            <p>Heures réalisées : {certificate.hours} h</p>
          </div>
          <div className="mt-10 flex items-end justify-between gap-6 px-4 text-left text-xs text-slate-500">
            <div>
              <div className="mb-2 h-px w-32 bg-brand-300" />
              <p className="font-bold">Signature autorisée</p>
            </div>
            <p className="max-w-[12rem] text-right font-semibold">ID de vérification : {certificate.verification_id}</p>
          </div>
        </article>
      </div>
    </div>
  );
}
