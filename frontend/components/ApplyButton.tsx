"use client";

import { useState } from "react";
import { authedFetch, getCurrentUserFromStorage } from "@/lib/browser-api";

type ApplyButtonProps = {
  missionId: number;
};

export function ApplyButton({ missionId }: ApplyButtonProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function apply() {
    const user = getCurrentUserFromStorage();
    if (!user) {
      setMessage("Connectez-vous comme benevole pour candidater.");
      return;
    }
    if (user.role === "organisation") {
      setMessage("Les organisations peuvent consulter les missions mais ne peuvent pas candidater.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await authedFetch(`/missions/${missionId}/candidater/`, { method: "POST" });
      setMessage("Candidature envoyee.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Candidature impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button className="btn-primary w-full" disabled={loading} onClick={apply} type="button">
        {loading ? "Envoi..." : "Candidater"}
      </button>
      {message ? <p className="mt-2 text-xs font-semibold text-slate-500">{message}</p> : null}
    </div>
  );
}
