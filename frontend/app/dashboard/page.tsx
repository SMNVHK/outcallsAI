"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCampaigns, getRecentActivity } from "@/lib/api";
import {
  Plus,
  Loader2,
  FolderOpen,
  Play,
  Pause,
  CheckCircle,
  Users,
  TrendingUp,
  Phone,
  PhoneOff,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Zap,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  status: string;
  created_at: string;
  tenant_count?: number;
  pending_count?: number;
  completed_count?: number;
}

interface ActivityItem {
  call_id: string;
  tenant_name: string;
  property_address: string;
  amount_due: number;
  campaign_name: string;
  campaign_id: string;
  call_status: string;
  ai_result: string | null;
  summary: string | null;
  ai_notes: string | null;
  duration_seconds: number | null;
  started_at: string;
  needs_attention: boolean;
}

const STATUS_CONFIG: Record<string, { bg: string; dot: string; label: string; icon: React.ReactNode }> = {
  draft:     { bg: "bg-gray-100 text-gray-600",      dot: "bg-gray-400",    label: "Brouillon",  icon: <FolderOpen className="h-3.5 w-3.5" /> },
  scheduled: { bg: "bg-purple-50 text-purple-700",   dot: "bg-purple-500",  label: "Planifiée",  icon: <Clock className="h-3.5 w-3.5" /> },
  running:   { bg: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", label: "En cours",   icon: <Play className="h-3.5 w-3.5" /> },
  paused:    { bg: "bg-amber-50 text-amber-700",     dot: "bg-amber-500",   label: "En pause",   icon: <Pause className="h-3.5 w-3.5" /> },
  completed: { bg: "bg-blue-50 text-blue-700",       dot: "bg-blue-500",    label: "Terminée",   icon: <CheckCircle className="h-3.5 w-3.5" /> },
  cancelled: { bg: "bg-red-50 text-red-600",         dot: "bg-red-500",     label: "Annulée",    icon: <FolderOpen className="h-3.5 w-3.5" /> },
};

const AI_RESULT_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  will_pay:     { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-emerald-600", label: "Va payer" },
  cant_pay:     { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-amber-600", label: "Difficultés" },
  refuses:      { icon: <XCircle className="h-3.5 w-3.5" />, color: "text-red-600", label: "Refuse" },
  no_answer:    { icon: <PhoneOff className="h-3.5 w-3.5" />, color: "text-gray-500", label: "Pas de réponse" },
  escalated:    { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-red-600", label: "Escaladé" },
  voicemail:    { icon: <Phone className="h-3.5 w-3.5" />, color: "text-purple-600", label: "Répondeur" },
};

export default function DashboardPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [activityFilter, setActivityFilter] = useState<"all" | "attention">("all");
  const [agencyName, setAgencyName] = useState("");

  useEffect(() => {
    const name = localStorage.getItem("agency_name");
    if (name) setAgencyName(name);
  }, []);

  useEffect(() => {
    Promise.all([loadCampaigns(), loadActivity()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const hasRunning = campaigns.some((c) => c.status === "running");
    if (!hasRunning) return;
    const interval = setInterval(() => {
      loadCampaigns();
      loadActivity();
    }, 8000);
    return () => clearInterval(interval);
  }, [campaigns]);

  async function loadCampaigns() {
    try { const data = await getCampaigns(); setCampaigns(data); } catch { /* handled */ }
  }

  async function loadActivity() {
    try { const data = await getRecentActivity(); setActivity(data); } catch { /* handled */ }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { createCampaign } = await import("@/lib/api");
      const campaign = await createCampaign(newName.trim());
      router.push(`/dashboard/campaigns/${campaign.id}`);
    } catch { /* handled */ }
    finally { setCreating(false); }
  }

  const totalTenants = campaigns.reduce((s, c) => s + (c.tenant_count || 0), 0);
  const totalCompleted = campaigns.reduce((s, c) => s + (c.completed_count || 0), 0);
  const activeCampaigns = campaigns.filter((c) => c.status === "running").length;
  const needsAttention = activity.filter((a) => a.needs_attention).length;

  const filteredActivity = activityFilter === "attention"
    ? activity.filter((a) => a.needs_attention)
    : activity;

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {agencyName ? `Bonjour, ${agencyName}` : "Tableau de bord"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Vue d&apos;ensemble de vos campagnes de relance</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors">
          <Plus className="h-4 w-4" /> Nouvelle campagne
        </button>
      </div>

      {/* Live banner */}
      {activeCampaigns > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <Zap className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-800">
              {activeCampaigns} campagne{activeCampaigns > 1 ? "s" : ""} en cours
            </p>
            <p className="text-xs text-emerald-600">
              Rafraîchissement auto toutes les 8s &middot; {totalCompleted} appels traités
            </p>
          </div>
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
        </div>
      )}

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard icon={<TrendingUp className="h-5 w-5 text-emerald-600" />} bg="bg-emerald-50" value={activeCampaigns} label="Campagnes actives" />
        <KPICard icon={<Users className="h-5 w-5 text-blue-600" />} bg="bg-blue-50" value={totalTenants} label="Locataires total" />
        <KPICard icon={<Phone className="h-5 w-5 text-purple-600" />} bg="bg-purple-50" value={totalCompleted} label="Appels traités" />
        <KPICard icon={<AlertTriangle className="h-5 w-5 text-red-600" />} bg="bg-red-50" value={needsAttention} label="Attention requise"
          highlight={needsAttention > 0} />
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 flex items-end gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-gray-600">Nom de la campagne</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus
              placeholder="Relances Avril 2026"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
          </div>
          <button type="submit" disabled={creating}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {creating ? "Création..." : "Créer"}
          </button>
          <button type="button" onClick={() => { setShowCreate(false); setNewName(""); }}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50">Annuler</button>
        </form>
      )}

      {/* Two columns: Campaigns + Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Campaigns list */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">Campagnes</h2>
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
              <FolderOpen className="mb-3 h-10 w-10 text-gray-300" />
              <p className="font-medium text-gray-500">Aucune campagne</p>
              <button onClick={() => setShowCreate(true)}
                className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white">
                <Plus className="h-3.5 w-3.5" /> Créer
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.map((c) => {
                const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft;
                const total = c.tenant_count || 0;
                const completed = c.completed_count || 0;
                const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

                return (
                  <button key={c.id} onClick={() => router.push(`/dashboard/campaigns/${c.id}`)}
                    className="flex w-full items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-gray-300 hover:shadow-sm group">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#1e293b] truncate">{c.name}</h3>
                        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.bg}`}>
                          {c.status === "running" && (
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            </span>
                          )}
                          {cfg.label}
                        </span>
                      </div>
                      {total > 0 && (
                        <div className="mt-2 flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-xs tabular-nums text-gray-400">{completed}/{total}</span>
                        </div>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Journal d&apos;activité</h2>
            <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
              <button onClick={() => setActivityFilter("all")}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  activityFilter === "all" ? "bg-white text-[#1e293b] shadow-sm" : "text-gray-500"}`}>
                Tout ({activity.length})
              </button>
              <button onClick={() => setActivityFilter("attention")}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  activityFilter === "attention" ? "bg-white text-red-600 shadow-sm" : "text-gray-500"}`}>
                Attention ({needsAttention})
              </button>
            </div>
          </div>

          {filteredActivity.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center">
              <Clock className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-gray-500">
                {activityFilter === "attention" ? "Aucun appel nécessitant votre attention" : "Aucun appel récent"}
              </p>
            </div>
          ) : (
            <div className="relative space-y-2 pl-6 before:absolute before:left-[9px] before:top-3 before:bottom-3 before:w-px before:bg-gray-200">
              {filteredActivity.map((a) => {
                const aiCfg = AI_RESULT_CONFIG[a.ai_result || a.call_status] || AI_RESULT_CONFIG.no_answer;
                const time = new Date(a.started_at);
                const timeStr = time.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
                const dateStr = time.toLocaleDateString("fr-BE");

                return (
                  <div key={a.call_id}
                    className={`relative rounded-xl border bg-white p-4 transition-all hover:shadow-sm ${
                      a.needs_attention ? "border-red-200 ring-1 ring-red-100" : "border-gray-200"
                    }`}>
                    <div className={`absolute -left-6 top-5 h-3 w-3 rounded-full ring-2 ring-white ${
                      a.call_status === "completed" ? "bg-emerald-500" :
                      a.call_status === "failed" ? "bg-red-500" :
                      a.call_status === "no_answer" ? "bg-gray-400" : "bg-amber-400"
                    }`} />

                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[#1e293b]">{a.tenant_name}</span>
                          {a.ai_result && aiCfg && (
                            <span className={`flex items-center gap-1 text-xs font-bold ${aiCfg.color}`}>
                              {aiCfg.icon} {aiCfg.label}
                            </span>
                          )}
                          {a.needs_attention && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold text-red-600 uppercase">Attention</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-400 truncate">
                          {a.property_address} &middot; {a.amount_due.toLocaleString("fr-BE")}€
                        </p>
                        {a.summary && (
                          <p className="mt-2 text-sm text-gray-600 leading-relaxed">{a.summary}</p>
                        )}
                        {a.ai_notes && a.ai_notes !== a.summary && (
                          <p className="mt-1 text-xs text-gray-500 italic">{a.ai_notes}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium text-gray-600">{timeStr}</p>
                        <p className="text-[10px] text-gray-400">{dateStr}</p>
                        {a.duration_seconds != null && a.duration_seconds > 0 && (
                          <p className="mt-0.5 text-[10px] text-gray-400">
                            {Math.floor(a.duration_seconds / 60)}:{String(a.duration_seconds % 60).padStart(2, "0")}
                          </p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => router.push(`/dashboard/campaigns/${a.campaign_id}`)}
                      className="mt-2 text-[10px] text-emerald-600 font-medium hover:underline">
                      {a.campaign_name} →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon, bg, value, label, highlight }: {
  icon: React.ReactNode; bg: string; value: number; label: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border bg-white p-4 transition-all ${highlight ? "border-red-200 ring-1 ring-red-100" : "border-gray-200"}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>{icon}</div>
        <div>
          <p className={`text-2xl font-bold ${highlight ? "text-red-600" : "text-[#1e293b]"}`}>{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
