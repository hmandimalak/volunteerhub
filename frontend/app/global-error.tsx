"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body>
        <main className="mx-auto max-w-xl px-6 py-16 text-center">
          <h1 className="text-2xl font-black">Une erreur est survenue</h1>
          <p className="mt-3 text-sm text-slate-600">{error.message}</p>
          <button className="btn-primary mt-6" type="button" onClick={() => reset()}>
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
