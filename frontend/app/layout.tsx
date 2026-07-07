import type { Metadata } from "next";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "VolunteerHub",
  description: "Plateforme web de gestion des benevoles pour associations et ONG"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
