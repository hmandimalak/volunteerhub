"use client";

import { useEffect, useState } from "react";
import { authedFetch, getCurrentUserFromStorage } from "@/lib/browser-api";
import { MissionApplicationStatus } from "@/lib/api";

type ApplyButtonProps = {
  missionId: number;
  onApplied?: () => void;
};

export function ApplyButton({ missionId, onApplied }: ApplyButtonProps) {
  const [applicationStatus, setApplicationStatus] = useState<MissionApplicationStatus["status"]>("none");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const user = getCurrentUserFromStorage();
    if (!user || user.role !== "benevole") {
      setChecking(false);
      return;
    }
    authedFetch<MissionApplicationStatus>(`/missions/${missionId}/my-application/`)
      .then((data) => setApplicationStatus(data.status ?? "none"))
      .catch(() => setApplicationStatus("none"))
      .finally(() => setChecking(false));
  }, [missionId]);

  async function apply() {
    const user = getCurrentUserFromStorage();
    if (!user) {
      setMessage("Connectez-vous comme bénévole pour candidater.");
      return;
    }
    if (user.role === "organisation") {
      setMessage("Les organisations peuvent consulter les missions mais ne peuvent pas candidater.");
      return;
    }
    if (applicationStatus === "en_attente" || applicationStatus === "acceptee") {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const data = await authedFetch<{ status: MissionApplicationStatus["status"] }>(`/missions/${missionId}/candidater/`, {
        method: "POST",
      });
      setApplicationStatus(data.status ?? "en_attente");
      setMessage("Candidature envoyée avec succès !");
      onApplied?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Candidature impossible.");
    } finally {
      setLoading(false);
    }
  }

  function label() {
    if (checking) return "Chargement...";
    if (loading) return "Envoi...";
    if (applicationStatus === "en_attente" || applicationStatus === "liste_attente") return "Candidature en attente";
    if (applicationStatus === "acceptee") return "Acceptée";
    if (applicationStatus === "refusee" || applicationStatus === "annulee") return "Postuler à nouveau";
    return "Postuler";
  }

  const disabled =
    checking ||
    loading ||
    applicationStatus === "en_attente" ||
    applicationStatus === "acceptee" ||
    applicationStatus === "liste_attente";

  return (
    <div className="mt-4">
      <button
        className={`w-full rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
          applicationStatus === "acceptee"
            ? "bg-mint/40 text-emerald-800"
            : applicationStatus === "en_attente" || applicationStatus === "liste_attente"
              ? "bg-amber-100 text-amber-800"
              : "btn-primary"
        }`}
        disabled={disabled}
        onClick={apply}
        type="button"
      >
        {label()}
      </button>
      {message ? <p className="mt-2 text-xs font-semibold text-slate-500">{message}</p> : null}
    </div>
  );
}
