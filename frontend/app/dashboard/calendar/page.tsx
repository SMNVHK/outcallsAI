"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAnalyticsDashboard, getOverduePromises } from "@/lib/api";
import {
  Loader2, CalendarDays, AlertTriangle, CheckCircle2, Clock, ArrowRight,
} from "lucide-react";

interface PromiseDue {
  tenant_name: string;
  promised_date: string;
  amount_due: number;
  campaign_name: string;
  campaign_id: string;
}

interface OverduePromise {
  tenant_id: string;
  tenant_name: string;
  phone: string;
  property_address: string;
  amount_due: number;
  promised_date: string;
  days_overdue: number;
  campaign_name: string;
  campaign_id: string;
}

export default function CalendarPage() {
  const router = useRouter();
  const [upcoming, setUpcoming] = useState<PromiseDue[]>([]);
  const [overdue, setOverdue] = useState<OverduePromise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadUpcoming(), loadOverdue()]).finally(() => setLoading(false));
  }, []);

  async function loadUpcoming() {
    try {
      const data = await getAnalyticsDashboard();
      setUpcoming(data.promises_due_soon || []);
    } catch { /* handled */ }
  }
  async function loadOverdue() {
    try { setOverdue(await getOverduePromises()); } catch { /* handled */ }
  }

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
    </div>
  );

  const today = new Date();
  const todayStr = today.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const groupedUpcoming: Record<string, PromiseDue[]> = {};
  for (const p of upcoming) {
    const d = new Date(p.promised_date).toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" });
    if (!groupedUpcoming[d]) groupedUpcoming[d] = [];
    groupedUpcoming[d].push(p);
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1200px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Calendrier</h1>
        <p className="mt-1 text-sm text-gray-500">{todayStr} &mdash; Suivi des dates promises et échéances</p>
      </div>

      {overdue.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-red-500">
            <AlertTriangle className="h-4 w-4" /> Promesses en retard ({overdue.length})
          </h2>
          <div className="space-y-2">
            {overdue.map((o) => (
              <button key={o.tenant_id} onClick={() => router.push(`/dashboard/campaigns/${o.campaign_id}`)}
                className="flex w-full items-center gap-4 rounded-2xl border border-red-200 bg-white p-4 text-left ring-1 ring-red-100 hover:shadow-sm transition-all">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#1e293b]">{o.tenant_name}</span>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                      {o.days_overdue}j de retard
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {o.property_address} &middot; {o.campaign_name}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Promis le {new Date(o.promised_date).toLocaleDateString("fr-BE")} &middot; {o.phone}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-red-600">{o.amount_due.toLocaleString("fr-BE")}€</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300" />
              </button>
            ))}
          </div>
          <div className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3">
            <p className="text-xs text-red-700 font-medium">
              {overdue.reduce((s, o) => s + o.amount_due, 0).toLocaleString("fr-BE")}€ de promesses non tenues.
              Envisagez une relance ou une mise en demeure.
            </p>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-600">
          <CalendarDays className="h-4 w-4" /> Paiements attendus (7 prochains jours)
        </h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white py-12 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-gray-500">Aucune date promise dans les 7 prochains jours</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedUpcoming).map(([dateLabel, promises]) => (
              <div key={dateLabel}>
                <h3 className="mb-2 flex items-center gap-2 text-xs font-bold text-gray-500">
                  <Clock className="h-3 w-3" /> {dateLabel}
                </h3>
                <div className="space-y-2">
                  {promises.map((p, i) => (
                    <button key={i} onClick={() => router.push(`/dashboard/campaigns/${p.campaign_id}`)}
                      className="flex w-full items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 text-left hover:border-emerald-300 hover:shadow-sm transition-all">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-[#1e293b]">{p.tenant_name}</span>
                        <p className="mt-0.5 text-xs text-gray-400">{p.campaign_name}</p>
                      </div>
                      <p className="text-lg font-bold text-emerald-600">{p.amount_due.toLocaleString("fr-BE")}€</p>
                      <ArrowRight className="h-4 w-4 text-gray-300" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {upcoming.length > 0 && (
          <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
            <p className="text-xs text-emerald-700 font-medium">
              {upcoming.reduce((s, p) => s + p.amount_due, 0).toLocaleString("fr-BE")}€ de paiements attendus cette semaine.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
