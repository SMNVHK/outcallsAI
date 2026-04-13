import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OutcallsAI — Relances de loyer automatisées",
  description: "Automatisez vos appels de relance de loyer avec l'IA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-[#f8fafc] text-[#1e293b] antialiased`}>
        {children}
      </body>
    </html>
  );
}
