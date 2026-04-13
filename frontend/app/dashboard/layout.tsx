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
    <div className="flex min-h-screen bg-[#f8fafc] text-[#1e293b]">
      <aside className="flex w-64 flex-col border-l border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
            <Phone className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold">OutcallsAI</span>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <LayoutDashboard className="h-4 w-4" />
            Campagnes
          </Link>
        </nav>

        <div className="border-t border-gray-200 px-4 py-3">
          <p className="truncate text-sm text-gray-500">{agencyName}</p>
          <button
            onClick={handleLogout}
            className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
          >
            <LogOut className="h-3 w-3" />
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-[#f8fafc] text-[#1e293b]">
        {children}
      </main>
    </div>
  );
}
