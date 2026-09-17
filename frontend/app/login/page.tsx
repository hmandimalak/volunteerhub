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
        window.location.href = "/volunteer";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-xl px-6 py-16">
      <div className="card glow-ring">
        <p className="kicker">Connexion</p>
        <h1 className="mt-4 text-3xl font-black">Accéder à VolunteerHub</h1>
        <p className="mt-3 text-sm text-slate-600">
          Connectez-vous avec un compte créé dans l'administration Django ou via le formulaire d'inscription.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">
            E-mail
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Mot de passe
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>

          {error ? <p className="rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}

          <button className="btn-primary mt-2" disabled={loading} type="submit">
            {loading ? "Connexion..." : "Se connecter"}
          </button>
          <button className="btn-secondary" type="button" onClick={() => router.push("/register")}>
            Créer un compte
          </button>
        </form>
      </div>
    </section>
  );
}
