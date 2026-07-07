"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { User } from "@/lib/api";
import { fetchCurrentUser, getAccessToken, getCurrentUserFromStorage, saveCurrentUser } from "@/lib/browser-api";
import { StatusMessage } from "./StatusMessage";

type RoleGateProps = {
  allowedRoles: User["role"][];
  children: ReactNode;
};

export function RoleGate({ allowedRoles, children }: RoleGateProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cachedUser = getCurrentUserFromStorage();
    if (cachedUser) {
      setUser(cachedUser);
    }

    if (!getAccessToken()) {
      setLoading(false);
      return;
    }

    fetchCurrentUser()
      .then((currentUser) => {
        saveCurrentUser(currentUser);
        setUser(currentUser);
      })
      .catch(() => setError("Session invalide. Reconnectez-vous."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="card mt-8 text-slate-600">Verification des droits...</div>;
  }

  if (error) {
    return (
      <div className="mt-8 grid gap-4">
        <StatusMessage message={error} tone="error" />
        <Link href="/login" className="btn-primary w-fit">
          Se connecter
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card mt-8">
        <h2 className="text-xl font-black">Connexion requise</h2>
        <p className="mt-2 text-slate-600">Vous devez vous connecter pour acceder a cet espace.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/login" className="btn-primary">
            Se connecter
          </Link>
          <Link href="/register" className="btn-secondary">
            Creer un compte
          </Link>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="card mt-8">
        <h2 className="text-xl font-black">Acces refuse</h2>
        <p className="mt-2 text-slate-600">
          Votre role actuel est `{user.role}`. Cette page est reservee a : {allowedRoles.join(", ")}.
        </p>
      </div>
    );
  }

  return children;
}
