"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser, login, saveCurrentUser, saveTokens } from "@/lib/browser-api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const tokens = await login(email, password);
      saveTokens(tokens);
      const user = await fetchCurrentUser();
      saveCurrentUser(user);
      if (user.role === "admin") {
        window.location.href = "/admin";
      } else if (user.role === "organisation") {
        window.location.href = "/organisation";
      } else {
        window.location.href = "/events";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-xl px-6 py-16">
      <div className="card">
        <p className="font-bold text-brand-600">Connexion</p>
        <h1 className="mt-2 text-3xl font-black">Acceder a VolunteerHub</h1>
        <p className="mt-3 text-sm text-slate-600">
          Connectez-vous avec un compte cree dans Django Admin ou via l'endpoint d'inscription.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">
            Email
            <input
              className="rounded-2xl border border-slate-300 px-4 py-3 font-normal"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Mot de passe
            <input
              className="rounded-2xl border border-slate-300 px-4 py-3 font-normal"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

          <button className="btn-primary mt-2" disabled={loading} type="submit">
            {loading ? "Connexion..." : "Se connecter"}
          </button>
          <button className="btn-secondary" type="button" onClick={() => router.push("/register")}>
            Creer un compte
          </button>
        </form>
      </div>
    </section>
  );
}
