"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Phone, Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    router.replace(token ? "/dashboard" : "/login");
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f8fafc]">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600">
        <Phone className="h-6 w-6 text-white" />
      </div>
      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
    </div>
  );
}
