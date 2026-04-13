"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getCampaign,
  getTenants,
  uploadCSV,
  startCampaign,
  pauseCampaign,
  getTenantCalls,
} from "@/lib/api";
import {
  ArrowLeft,
  Upload,
  Play,
  Pause,
  Loader2,
  Phone,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  phone: string;
  property_address: string;
  amount_due: number;
  due_date: string;
  status: string;
  status_notes: string | null;
  promised_date: string | null;
  attempt_count: number;
  last_called_at: string | null;
}

interface Call {
  id: string;
  status: string;
  duration_seconds: number | null;
  transcript: string | null;
  summary: string | null;
  ai_status_result: string | null;
  ai_notes: string | null;
  started_at: string;
  ended_at: string | null;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  tenant_count: number;
  pending_count: number;
  completed_count: number;
}

const STATUS_BADGE: Record<string, { bg: string; label: string }> = {
  pending: { bg: "bg-gray-100 text-gray-700", label: "En attente" },
  will_pay: { bg: "bg-emerald-100 text-emerald-700", label: "Va payer" },
  cant_pay: { bg: "bg-amber-100 text-amber-700", label: "Difficultés" },
  no_answer: { bg: "bg-gray-200 text-gray-700", label: "Pas de réponse" },
  voicemail: { bg: "bg-purple-100 text-purple-700", label: "Répondeur" },
  bad_number: { bg: "bg-red-100 text-red-700", label: "Mauvais numéro" },
  busy: { bg: "bg-orange-100 text-orange-700", label: "Occupé" },
  refuses: { bg: "bg-red-100 text-red-700", label: "Refuse" },
  call_dropped: { bg: "bg-red-100 text-red-700", label: "Appel coupé" },
  paid: { bg: "bg-blue-100 text-blue-700", label: "Payé" },
  escalated: { bg: "bg-red-100 text-red-700", label: "Escaladé" },
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
  const [tenantCalls, setTenantCalls] = useState<Record<string, Call[]>>({});

  const loadData = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([getCampaign(id), getTenants(id)]);
      setCampaign(c);
      setTenants(t);
    } catch {
      /* handled */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (campaign?.status !== "running") return;
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [campaign?.status, loadData]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      await uploadCSV(id, file);
      await loadData();
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error ? err.message : "Erreur upload",
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleStart() {
    try {
      await startCampaign(id);
      await loadData();
    } catch {
      /* handled */
    }
  }

  async function handlePause() {
    try {
      await pauseCampaign(id);
      await loadData();
    } catch {
      /* handled */
    }
  }

  async function toggleTenantCalls(tenantId: string) {
    if (expandedTenant === tenantId) {
      setExpandedTenant(null);
      return;
    }
    setExpandedTenant(tenantId);
    if (!tenantCalls[tenantId]) {
      const calls = await getTenantCalls(tenantId);
      setTenantCalls((prev) => ({ ...prev, [tenantId]: calls }));
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-8 text-gray-500">Campagne introuvable</div>
    );
  }

  const stats = {
    total: tenants.length,
    pending: tenants.filter((t) => t.status === "pending").length,
    will_pay: tenants.filter((t) => t.status === "will_pay").length,
    cant_pay: tenants.filter((t) => t.status === "cant_pay").length,
    no_answer: tenants.filter((t) => t.status === "no_answer").length,
    refuses: tenants.filter((t) => t.status === "refuses").length,
  };

  return (
    <div className="p-8">
      <button
        onClick={() => router.push("/dashboard")}
        className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux campagnes
      </button>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {stats.total} locataires &middot; {stats.pending} en attente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:text-gray-900"
            title="Rafraîchir"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {campaign.status === "draft" || campaign.status === "paused" ? (
            <button
              onClick={handleStart}
              disabled={stats.pending === 0}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Lancer les appels
            </button>
          ) : campaign.status === "running" ? (
            <button
              onClick={handlePause}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              <Pause className="h-4 w-4" />
              Mettre en pause
            </button>
          ) : null}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total", value: stats.total, color: "text-[#1e293b]" },
          { label: "En attente", value: stats.pending, color: "text-gray-500" },
          { label: "Va payer", value: stats.will_pay, color: "text-emerald-600" },
          { label: "Difficultés", value: stats.cant_pay, color: "text-amber-600" },
          { label: "Pas de rép.", value: stats.no_answer, color: "text-gray-500" },
          { label: "Refuse", value: stats.refuses, color: "text-red-600" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-gray-200 bg-white p-3 text-center"
          >
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Upload CSV */}
      {(campaign.status === "draft" || campaign.status === "paused") && (
        <div className="mb-6">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 transition hover:border-gray-400">
            <Upload className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium">
                {uploading ? "Import en cours..." : "Importer un fichier CSV"}
              </p>
              <p className="text-xs text-gray-400">
                Colonnes : name, phone, property_address, amount_due, due_date
                (séparateur : point-virgule)
              </p>
            </div>
            <input
              type="file"
              accept=".csv"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
          {uploadError && (
            <p className="mt-2 text-sm text-red-600">{uploadError}</p>
          )}
        </div>
      )}

      {/* Tenant list */}
      {tenants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-gray-400" />
          <p className="text-gray-500">
            Importez un CSV pour ajouter des locataires
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tenants.map((t) => {
            const badge = STATUS_BADGE[t.status] || {
              bg: "bg-gray-100 text-gray-700",
              label: t.status,
            };
            const isExpanded = expandedTenant === t.id;

            return (
              <div
                key={t.id}
                className="rounded-xl border border-gray-200 bg-white"
              >
                <button
                  onClick={() => toggleTenantCalls(t.id)}
                  className="flex w-full items-center gap-4 p-4 text-left"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                    <Phone className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t.name}</p>
                    <p className="truncate text-xs text-gray-400">
                      {t.property_address} &middot; {t.amount_due}€ dû le{" "}
                      {t.due_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {t.attempt_count > 0 && (
                      <span className="text-xs text-gray-400">
                        {t.attempt_count} appel
                        {t.attempt_count > 1 ? "s" : ""}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg}`}
                    >
                      {badge.label}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200 px-4 py-3">
                    {t.status_notes && (
                      <p className="mb-2 text-sm text-gray-700">
                        <span className="text-gray-400">Notes IA :</span>{" "}
                        {t.status_notes}
                      </p>
                    )}
                    {t.promised_date && (
                      <p className="mb-2 text-sm text-emerald-600">
                        Date promise : {t.promised_date}
                      </p>
                    )}
                    <p className="mb-3 text-xs text-gray-400">
                      Tél : {t.phone}
                      {t.last_called_at &&
                        ` · Dernier appel : ${new Date(t.last_called_at).toLocaleString("fr-BE")}`}
                    </p>

                    {tenantCalls[t.id] && tenantCalls[t.id].length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-500">
                          Historique des appels
                        </p>
                        {tenantCalls[t.id].map((call) => (
                          <div
                            key={call.id}
                            className="rounded-lg border border-gray-200 bg-white p-3 text-sm"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">
                                {new Date(call.started_at).toLocaleString(
                                  "fr-BE",
                                )}
                              </span>
                              <span className="text-xs text-gray-400">
                                {call.duration_seconds
                                  ? `${call.duration_seconds}s`
                                  : "—"}
                              </span>
                            </div>
                            {call.summary && (
                              <p className="mt-1 text-gray-700">
                                {call.summary}
                              </p>
                            )}
                            {call.transcript && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-xs text-gray-400">
                                  Voir le transcript
                                </summary>
                                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-gray-500">
                                  {call.transcript}
                                </pre>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : tenantCalls[t.id] ? (
                      <p className="text-xs text-gray-400">
                        Aucun appel enregistré
                      </p>
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
