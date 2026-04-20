"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAnalyticsDashboard, getOverduePromises } from "@/lib/api";
import {
  Loader2, TrendingUp, Users, Phone, Euro, AlertTriangle, CheckCircle2,
  XCircle, PhoneOff, ArrowRight, CalendarDays, BarChart3, Clock,
} from "lucide-react";

interface Analytics {
  total_campaigns: number;
  active_campaigns: number;
  total_tenants: number;
  total_calls: number;
  total_amount_due: number;
  total_recoverable: number;
  total_recovered_rate: number;
  by_status: Record<string, number>;
  avg_call_duration_seconds: number;
  promises_due_soon: { tenant_name: string; promised_date: string; amount_due: number; campaign_name: string; campaign_id: string }[];
  monthly_trend: { month: string; calls: number; recoverable: number }[];
}

interface OverdueItem {
  tenant_id: string;
  tenant_name: string;
  amount_due: number;
  days_overdue: number;
  campaign_name: string;
  campaign_id: string;
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Fév", "03": "Mar", "04": "Avr", "05": "Mai", "06": "Juin",
  "07": "Juil", "08": "Aoû", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Déc",
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Analytics | null>(null);
  const [overdue, setOverdue] = useState<OverdueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [agencyName, setAgencyName] = useState("");

  useEffect(() => {
    setAgencyName(localStorage.getItem("agency_name") || "");
    Promise.all([
      getAnalyticsDashboard().then(setData).catch(() => {}),
      getOverduePromises().then(setOverdue).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading || !data) return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
    </div>
  );

  const maxCalls = Math.max(...data.monthly_trend.map(m => m.calls), 1);
  const overdueTotal = overdue.reduce((s, o) => s + o.amount_due, 0);
  const bs = data.by_status;
  const totalStatusKnown = (bs.will_pay || 0) + (bs.cant_pay || 0) + (bs.refuses || 0) + (bs.escalated || 0) + (bs.no_answer || 0) + (bs.voicemail || 0);

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {agencyName ? `Bonjour, ${agencyName}` : "Tableau de bord"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">Vue d&apos;ensemble de votre activité de recouvrement</p>
      </div>

      {/* KPI row */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI icon={<Euro className="h-5 w-5 text-emerald-600" />} bg="bg-emerald-50"
          value={`${(data.total_recoverable / 1000).toFixed(1)}k€`} label="Montant récupérable" />
        <KPI icon={<TrendingUp className="h-5 w-5 text-blue-600" />} bg="bg-blue-50"
          value={`${data.total_recovered_rate}%`} label="Taux de recouvrement" />
        <KPI icon={<Phone className="h-5 w-5 text-purple-600" />} bg="bg-purple-50"
          value={data.total_calls} label="Appels total" />
        <KPI icon={<Users className="h-5 w-5 text-amber-600" />} bg="bg-amber-50"
          value={data.total_tenants} label="Locataires" />
      </div>

      {/* Second KPI row — ROI */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI icon={<BarChart3 className="h-5 w-5 text-emerald-600" />} bg="bg-emerald-50"
          value={data.total_campaigns} label="Campagnes total" />
        <KPI icon={<Clock className="h-5 w-5 text-blue-600" />} bg="bg-blue-50"
          value={data.active_campaigns} label="Campagnes actives" highlight={data.active_campaigns > 0} />
        <KPI icon={<Euro className="h-5 w-5 text-gray-600" />} bg="bg-gray-50"
          value={`${(data.total_amount_due / 1000).toFixed(1)}k€`} label="Montant total dû" />
        <KPI icon={<Clock className="h-5 w-5 text-purple-600" />} bg="bg-purple-50"
          value={`${Math.floor(data.avg_call_duration_seconds / 60)}:${String(data.avg_call_duration_seconds % 60).padStart(2, "0")}`}
          label="Durée moy. appel" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status breakdown */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">Répartition des résultats</h2>
          {totalStatusKnown === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Aucun appel terminé</p>
          ) : (
            <div className="space-y-3">
              <StatusBar label="Va payer" count={bs.will_pay || 0} total={totalStatusKnown} color="bg-emerald-500"
                icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />} />
              <StatusBar label="Difficultés" count={bs.cant_pay || 0} total={totalStatusKnown} color="bg-amber-500"
                icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-600" />} />
              <StatusBar label="Refuse" count={bs.refuses || 0} total={totalStatusKnown} color="bg-red-500"
                icon={<XCircle className="h-3.5 w-3.5 text-red-600" />} />
              <StatusBar label="Escaladé" count={bs.escalated || 0} total={totalStatusKnown} color="bg-red-400"
                icon={<AlertTriangle className="h-3.5 w-3.5 text-red-500" />} />
              <StatusBar label="Pas de réponse" count={(bs.no_answer || 0) + (bs.voicemail || 0)} total={totalStatusKnown} color="bg-gray-400"
                icon={<PhoneOff className="h-3.5 w-3.5 text-gray-500" />} />
            </div>
          )}
        </div>

        {/* Monthly trend */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">Tendance mensuelle</h2>
          {data.monthly_trend.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Pas encore de données</p>
          ) : (
            <div className="flex items-end gap-2 h-48">
              {data.monthly_trend.slice(-6).map((m) => {
                const pct = (m.calls / maxCalls) * 100;
                const monthNum = m.month.split("-")[1];
                return (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                    <p className="text-[10px] font-bold text-emerald-600">{(m.recoverable / 1000).toFixed(1)}k</p>
                    <div className="w-full flex flex-col justify-end h-32">
                      <div className="w-full rounded-t-lg bg-emerald-500 transition-all" style={{ height: `${Math.max(pct, 4)}%` }} />
                    </div>
                    <p className="text-[10px] font-bold text-gray-500">{m.calls}</p>
                    <p className="text-[10px] text-gray-400">{MONTH_LABELS[monthNum] || monthNum}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Overdue + Upcoming promises */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Overdue */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-red-500">
              <AlertTriangle className="h-4 w-4" /> Promesses en retard
            </h2>
            {overdue.length > 0 && (
              <button onClick={() => router.push("/dashboard/calendar")} className="text-xs text-emerald-600 font-medium hover:underline">
                Voir tout →
              </button>
            )}
          </div>
          {overdue.length === 0 ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-400" />
              <p className="text-sm text-gray-500">Aucune promesse en retard</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {overdue.slice(0, 5).map((o) => (
                  <button key={o.tenant_id} onClick={() => router.push(`/dashboard/campaigns/${o.campaign_id}`)}
                    className="flex w-full items-center justify-between rounded-xl bg-red-50 p-3 text-left hover:bg-red-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-[#1e293b]">{o.tenant_name}</p>
                      <p className="text-[10px] text-gray-400">{o.campaign_name} &middot; {o.days_overdue}j retard</p>
                    </div>
                    <p className="font-bold text-red-600">{o.amount_due.toLocaleString("fr-BE")}€</p>
                  </button>
                ))}
              </div>
              <div className="mt-3 rounded-lg bg-red-100 p-2 text-center">
                <p className="text-xs font-bold text-red-700">{overdueTotal.toLocaleString("fr-BE")}€ non récupérés</p>
              </div>
            </>
          )}
        </div>

        {/* Upcoming */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-600">
              <CalendarDays className="h-4 w-4" /> Paiements attendus
            </h2>
            {data.promises_due_soon.length > 0 && (
              <button onClick={() => router.push("/dashboard/calendar")} className="text-xs text-emerald-600 font-medium hover:underline">
                Calendrier →
              </button>
            )}
          </div>
          {data.promises_due_soon.length === 0 ? (
            <div className="py-6 text-center">
              <CalendarDays className="mx-auto mb-2 h-6 w-6 text-gray-300" />
              <p className="text-sm text-gray-500">Aucun paiement attendu cette semaine</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.promises_due_soon.map((p, i) => (
                <button key={i} onClick={() => router.push(`/dashboard/campaigns/${p.campaign_id}`)}
                  className="flex w-full items-center justify-between rounded-xl bg-emerald-50 p-3 text-left hover:bg-emerald-100 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-[#1e293b]">{p.tenant_name}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(p.promised_date).toLocaleDateString("fr-BE")} &middot; {p.campaign_name}
                    </p>
                  </div>
                  <p className="font-bold text-emerald-600">{p.amount_due.toLocaleString("fr-BE")}€</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-6 flex gap-3 flex-wrap">
        <button onClick={() => router.push("/dashboard/campaigns")}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:border-emerald-300 hover:text-emerald-700 transition-all">
          Voir les campagnes <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => router.push("/dashboard/contacts")}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:border-emerald-300 hover:text-emerald-700 transition-all">
          Voir les contacts <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => router.push("/dashboard/calendar")}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:border-emerald-300 hover:text-emerald-700 transition-all">
          Voir le calendrier <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function KPI({ icon, bg, value, label, highlight }: {
  icon: React.ReactNode; bg: string; value: string | number; label: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border bg-white p-4 transition-all ${highlight ? "border-emerald-200 ring-1 ring-emerald-100" : "border-gray-200"}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-[#1e293b]">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBar({ label, count, total, color, icon }: {
  label: string; count: number; total: number; color: string; icon: React.ReactNode;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600">{icon} {label}</span>
        <span className="text-xs font-bold text-gray-700">{count} ({pct}%)</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
