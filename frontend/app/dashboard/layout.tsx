"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Phone, LogOut, LayoutDashboard } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [agencyName, setAgencyName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    setAgencyName(localStorage.getItem("agency_name") || "Mon Agence");
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("agency_id");
    localStorage.removeItem("agency_name");
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
            <Phone className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold">OutcallsAI</span>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <LayoutDashboard className="h-4 w-4" />
            Campagnes
          </Link>
        </nav>

        <div className="border-t border-zinc-800 px-4 py-3">
          <p className="truncate text-sm text-zinc-400">{agencyName}</p>
          <button
            onClick={handleLogout}
            className="mt-2 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
          >
            <LogOut className="h-3 w-3" />
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
