"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getCampaign,
  getTenants,
  uploadCSV,
  startCampaign,
  pauseCampaign,
  resetCampaign,
  deleteCampaign,
  addTenant,
  deleteTenant,
  getTenantCalls,
  sendSMS,
  sendBulkSMS,
  getMessageHistory,
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
  Search,
  PhoneCall,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PhoneOff,
  Filter,
  UserPlus,
  RotateCcw,
  Trash2,
  X,
  Clock,
  MessageSquare,
  Calendar,
  MapPin,
  Euro,
  MessageSquareText,
  Send,
  Mail,
  FileDown,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

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
  error_message: string | null;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  tenant_count: number;
  pending_count: number;
  completed_count: number;
}

// ─── Constants ───────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { bg: string; label: string; icon: React.ReactNode }> = {
  pending:      { bg: "bg-slate-100 text-slate-600",     label: "En attente",     icon: <Clock className="h-3 w-3" /> },
  will_pay:     { bg: "bg-emerald-100 text-emerald-700", label: "Va payer",       icon: <CheckCircle2 className="h-3 w-3" /> },
  cant_pay:     { bg: "bg-amber-100 text-amber-700",     label: "Difficultés",    icon: <AlertTriangle className="h-3 w-3" /> },
  no_answer:    { bg: "bg-gray-200 text-gray-600",       label: "Pas de réponse", icon: <PhoneOff className="h-3 w-3" /> },
  voicemail:    { bg: "bg-purple-100 text-purple-700",   label: "Répondeur",      icon: <MessageSquare className="h-3 w-3" /> },
  bad_number:   { bg: "bg-red-100 text-red-600",         label: "Mauvais n°",     icon: <XCircle className="h-3 w-3" /> },
  busy:         { bg: "bg-orange-100 text-orange-700",   label: "Occupé",         icon: <PhoneCall className="h-3 w-3" /> },
  refuses:      { bg: "bg-red-100 text-red-600",         label: "Refuse",         icon: <XCircle className="h-3 w-3" /> },
  call_dropped: { bg: "bg-red-100 text-red-600",         label: "Appel coupé",    icon: <PhoneOff className="h-3 w-3" /> },
  paid:         { bg: "bg-blue-100 text-blue-700",       label: "Payé",           icon: <CheckCircle2 className="h-3 w-3" /> },
  escalated:    { bg: "bg-red-100 text-red-600",         label: "Escaladé",       icon: <AlertTriangle className="h-3 w-3" /> },
};

const CALL_STATUS_LABEL: Record<string, string> = {
  initiated: "Initié", ringing: "Sonne", answered: "Décroché",
  completed: "Terminé", no_answer: "Pas de réponse", busy: "Occupé",
  failed: "Échoué", voicemail: "Répondeur",
};

const FILTER_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "pending", label: "En attente" },
  { value: "will_pay", label: "Va payer" },
  { value: "cant_pay", label: "Difficultés" },
  { value: "no_answer", label: "Pas de réponse" },
  { value: "refuses", label: "Refuse" },
  { value: "call_dropped", label: "Appel coupé" },
  { value: "paid", label: "Payé" },
  { value: "voicemail", label: "Répondeur" },
  { value: "bad_number", label: "Mauvais n°" },
  { value: "escalated", label: "Escaladé" },
];

// ─── Component ───────────────────────────────────────────────────────

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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Add tenant form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", phone: "", property_address: "", amount_due: "", due_date: "" });
  const [addingTenant, setAddingTenant] = useState(false);
  const [addError, setAddError] = useState("");

  // Modals
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteCampaignModal, setShowDeleteCampaignModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deletingCampaign, setDeletingCampaign] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState<string | null>(null);

  // SMS
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsTarget, setSmsTarget] = useState<{id: string; name: string; phone: string} | null>(null);
  const [smsMessage, setSmsMessage] = useState("");
  const [sendingSMS, setSendingSMS] = useState(false);
  const [smsResult, setSmsResult] = useState<{ok: boolean; text: string} | null>(null);

  // Bulk SMS
  const [showBulkSMS, setShowBulkSMS] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("Bonjour {nom}, ceci est un rappel concernant votre loyer. Merci de régulariser votre situation. — OutcallsAI");
  const [bulkFilter, setBulkFilter] = useState<string>("");
  const [sendingBulk, setSendingBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState<{sent: number; failed: number} | null>(null);

  // Message history
  const [tenantMessages, setTenantMessages] = useState<Record<string, Array<{id: string; channel: string; content: string; status: string; created_at: string}>>>({});

  // Active tab
  const [activeTab, setActiveTab] = useState<"tenants" | "import">("tenants");

  const loadData = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([getCampaign(id), getTenants(id)]);
      setCampaign(c);
      setTenants(t);
    } catch { /* handled */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (campaign?.status !== "running") return;
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [campaign?.status, loadData]);

  // ─── Handlers ────────────────────────────────────────────────────

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      await uploadCSV(id, file);
      await loadData();
      setActiveTab("tenants");
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Erreur upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleAddTenant(e: React.FormEvent) {
    e.preventDefault();
    setAddingTenant(true);
    setAddError("");
    try {
      await addTenant(id, {
        name: addForm.name,
        phone: addForm.phone,
        property_address: addForm.property_address,
        amount_due: parseFloat(addForm.amount_due),
        due_date: addForm.due_date,
      });
      setAddForm({ name: "", phone: "", property_address: "", amount_due: "", due_date: "" });
      setShowAddForm(false);
      await loadData();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setAddingTenant(false);
    }
  }

  async function handleDeleteTenant(tenantId: string) {
    setDeletingTenant(tenantId);
    try {
      await deleteTenant(tenantId);
      await loadData();
      if (expandedTenant === tenantId) setExpandedTenant(null);
    } catch { /* handled */ }
    finally { setDeletingTenant(null); }
  }

  async function handleStart() {
    try { await startCampaign(id); await loadData(); } catch { /* handled */ }
  }

  async function handlePause() {
    try { await pauseCampaign(id); await loadData(); } catch { /* handled */ }
  }

  async function handleReset() {
    setResetting(true);
    try {
      await resetCampaign(id);
      await loadData();
      setShowResetModal(false);
    } catch { /* handled */ }
    finally { setResetting(false); }
  }

  async function handleDeleteCampaign() {
    setDeletingCampaign(true);
    try {
      await deleteCampaign(id);
      router.push("/dashboard");
    } catch { /* handled */ }
    finally { setDeletingCampaign(false); }
  }

  async function handleSendSMS() {
    if (!smsTarget || !smsMessage.trim()) return;
    setSendingSMS(true);
    setSmsResult(null);
    try {
      await sendSMS(smsTarget.id, smsMessage);
      setSmsResult({ ok: true, text: "SMS envoyé avec succès" });
      setSmsMessage("");
      if (tenantMessages[smsTarget.id]) {
        const msgs = await getMessageHistory(smsTarget.id);
        setTenantMessages((prev) => ({ ...prev, [smsTarget.id]: msgs }));
      }
    } catch (err: unknown) {
      setSmsResult({ ok: false, text: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setSendingSMS(false);
    }
  }

  async function handleBulkSMS() {
    if (!bulkMessage.trim()) return;
    setSendingBulk(true);
    setBulkResult(null);
    try {
      const res = await sendBulkSMS(id, bulkMessage, bulkFilter || undefined);
      setBulkResult({ sent: res.sent, failed: res.failed });
    } catch { /* handled */ }
    finally { setSendingBulk(false); }
  }

  function openSMSForTenant(t: Tenant) {
    setSmsTarget({ id: t.id, name: t.name, phone: t.phone });
    setSmsMessage(`Bonjour ${t.name}, ceci est un rappel concernant votre loyer de ${t.amount_due}€ dû le ${t.due_date}. Merci de régulariser votre situation.`);
    setSmsResult(null);
    setShowSMSModal(true);
  }

  async function loadTenantMessages(tenantId: string) {
    if (!tenantMessages[tenantId]) {
      const msgs = await getMessageHistory(tenantId);
      setTenantMessages((prev) => ({ ...prev, [tenantId]: msgs }));
    }
  }

  async function toggleTenantCalls(tenantId: string) {
    if (expandedTenant === tenantId) { setExpandedTenant(null); return; }
    setExpandedTenant(tenantId);
    if (!tenantCalls[tenantId]) {
      const calls = await getTenantCalls(tenantId);
      setTenantCalls((prev) => ({ ...prev, [tenantId]: calls }));
    }
    loadTenantMessages(tenantId);
  }

  // ─── Computed ────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = tenants.length;
    const pending = tenants.filter((t) => t.status === "pending").length;
    const will_pay = tenants.filter((t) => t.status === "will_pay").length;
    const cant_pay = tenants.filter((t) => t.status === "cant_pay").length;
    const no_answer = tenants.filter((t) => t.status === "no_answer").length;
    const refuses = tenants.filter((t) => t.status === "refuses").length;
    const processed = total - pending;
    const progress = total > 0 ? Math.round((processed / total) * 100) : 0;
    const totalDue = tenants.reduce((s, t) => s + t.amount_due, 0);
    const recoverable = tenants.filter((t) => t.status === "will_pay").reduce((s, t) => s + t.amount_due, 0);
    return { total, pending, will_pay, cant_pay, no_answer, refuses, processed, progress, totalDue, recoverable };
  }, [tenants]);

  const filteredTenants = useMemo(() => {
    let result = tenants;
    if (statusFilter !== "all") result = result.filter((t) => t.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) =>
        t.name.toLowerCase().includes(q) || t.property_address.toLowerCase().includes(q) || t.phone.includes(q));
    }
    return result;
  }, [tenants, statusFilter, searchQuery]);

  // ─── Render ──────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
    </div>
  );

  if (!campaign) return <div className="p-8 text-gray-500">Campagne introuvable</div>;

  const isEditable = campaign.status === "draft" || campaign.status === "paused";
  const isCompleted = campaign.status === "completed";

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      {/* ── Nav ── */}
      <button onClick={() => router.push("/dashboard")}
        className="mb-5 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
            {campaign.status === "running" && (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Appels en cours
              </span>
            )}
            {isCompleted && (
              <span className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                <CheckCircle2 className="h-3 w-3" /> Terminée
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-gray-500">
            {stats.total} locataires &middot; {stats.processed} traités &middot; {stats.pending} en attente
            {stats.totalDue > 0 && (<> &middot; <span className="font-medium text-[#1e293b]">{stats.totalDue.toLocaleString("fr-BE")}€</span> en jeu</>)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={loadData} className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all" title="Rafraîchir">
            <RefreshCw className="h-4 w-4" />
          </button>

          {stats.total > 0 && (
            <button onClick={() => router.push(`/dashboard/campaigns/${id}/report`)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:text-emerald-600 hover:border-emerald-300 transition-all">
              <FileDown className="h-3.5 w-3.5" /> Rapport
            </button>
          )}

          {(isEditable || isCompleted) && (
            <button onClick={() => setShowResetModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:text-orange-600 hover:border-orange-300 transition-all">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}

          {(isEditable || isCompleted) && (
            <button onClick={() => setShowDeleteCampaignModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:border-red-300 transition-all">
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </button>
          )}

          {isEditable ? (
            <button onClick={handleStart} disabled={stats.pending === 0}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40 transition-all">
              <Play className="h-4 w-4" /> Lancer les appels
            </button>
          ) : campaign.status === "running" ? (
            <button onClick={handlePause}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 transition-all">
              <Pause className="h-4 w-4" /> Pause
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Progress + Money ── */}
      {stats.total > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">Progression des appels</span>
              <span className="text-sm font-bold text-[#1e293b]">{stats.progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 ease-out"
                style={{ width: `${stats.progress}%` }} />
            </div>
            <div className="mt-3 flex gap-6 text-xs text-gray-400">
              <span>{stats.processed} traités</span>
              <span>{stats.pending} restants</span>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Montant récupérable</p>
            <p className="mt-1 text-3xl font-bold text-emerald-600">{stats.recoverable.toLocaleString("fr-BE")}€</p>
            <p className="mt-1 text-xs text-gray-400">
              sur {stats.totalDue.toLocaleString("fr-BE")}€ total ({stats.totalDue > 0 ? Math.round((stats.recoverable / stats.totalDue) * 100) : 0}%)
            </p>
          </div>
        </div>
      )}

      {/* ── Stats grid ── */}
      <div className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[
          { label: "Total",       value: stats.total,     color: "text-[#1e293b]", ring: "ring-gray-200" },
          { label: "En attente",  value: stats.pending,   color: "text-slate-500",  ring: "ring-gray-200" },
          { label: "Va payer",    value: stats.will_pay,  color: "text-emerald-600", ring: "ring-emerald-200" },
          { label: "Difficultés", value: stats.cant_pay,  color: "text-amber-600",  ring: "ring-amber-200" },
          { label: "Pas de rép.", value: stats.no_answer, color: "text-gray-500",   ring: "ring-gray-200" },
          { label: "Refuse",      value: stats.refuses,   color: "text-red-600",    ring: "ring-red-200" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl bg-white p-3 text-center ring-1 ${s.ring}`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="mb-5 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-1">
          <button onClick={() => setActiveTab("tenants")}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === "tenants" ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-400 hover:text-gray-600"
            }`}>
            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Locataires ({stats.total})</span>
          </button>
          {isEditable && (
            <button onClick={() => setActiveTab("import")}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === "import" ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-400 hover:text-gray-600"
              }`}>
              <span className="flex items-center gap-1.5"><Upload className="h-3.5 w-3.5" /> Importer</span>
            </button>
          )}
        </div>
        {stats.total > 0 && (
          <button onClick={() => setShowBulkSMS(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-emerald-600 hover:border-emerald-300 transition-all -mb-px">
            <MessageSquareText className="h-3.5 w-3.5" /> SMS en masse
          </button>
        )}
      </div>

      {/* ── Tab: Import ── */}
      {activeTab === "import" && isEditable && (
        <div className="space-y-4">
          {/* CSV upload */}
          <label className="flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 transition-all hover:border-emerald-400 hover:shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 ring-1 ring-emerald-200">
              <Upload className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1e293b]">
                {uploading ? "Import en cours..." : "Importer un fichier CSV"}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                Colonnes attendues : name ; phone ; property_address ; amount_due ; due_date
              </p>
            </div>
            <input type="file" accept=".csv" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
        </div>
      )}

      {/* ── Tab: Tenants ── */}
      {activeTab === "tenants" && (
        <>
          {/* Toolbar */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Rechercher par nom, adresse, téléphone..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <button onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm transition-all ${
                    statusFilter !== "all"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 font-medium"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                  }`}>
                  <Filter className="h-4 w-4" />
                  {statusFilter !== "all" ? FILTER_OPTIONS.find((f) => f.value === statusFilter)?.label : "Filtrer"}
                </button>
                {showFilters && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
                    {FILTER_OPTIONS.map((opt) => (
                      <button key={opt.value} onClick={() => { setStatusFilter(opt.value); setShowFilters(false); }}
                        className={`flex w-full items-center px-3.5 py-2 text-left text-sm transition-colors ${
                          statusFilter === opt.value ? "bg-emerald-50 text-emerald-700 font-medium" : "text-gray-600 hover:bg-gray-50"
                        }`}>
                        {opt.label}
                        {opt.value !== "all" && (
                          <span className="ml-auto tabular-nums text-xs text-gray-400">
                            {tenants.filter((t) => t.status === opt.value).length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {isEditable && (
                <button onClick={() => setShowAddForm(!showAddForm)}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    showAddForm
                      ? "bg-gray-100 text-gray-700"
                      : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                  }`}>
                  {showAddForm ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  {showAddForm ? "Fermer" : "Ajouter"}
                </button>
              )}
            </div>
          </div>

          {/* Add tenant form */}
          {showAddForm && isEditable && (
            <form onSubmit={handleAddTenant}
              className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
              <h3 className="mb-4 text-sm font-semibold text-[#1e293b]">Ajouter un locataire</h3>
              {addError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-200">{addError}</p>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs text-gray-500"><UserPlus className="h-3 w-3" /> Nom complet</label>
                  <input type="text" required value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="Jean Dupont" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200" />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs text-gray-500"><Phone className="h-3 w-3" /> Téléphone</label>
                  <input type="tel" required value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="+32470123456" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200" />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs text-gray-500"><MapPin className="h-3 w-3" /> Adresse du bien</label>
                  <input type="text" required value={addForm.property_address} onChange={(e) => setAddForm({ ...addForm, property_address: e.target.value })}
                    placeholder="Rue de la Loi 16, 1000 Bruxelles" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200" />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs text-gray-500"><Euro className="h-3 w-3" /> Montant dû (€)</label>
                  <input type="number" step="0.01" min="0.01" max="100000" required value={addForm.amount_due}
                    onChange={(e) => setAddForm({ ...addForm, amount_due: e.target.value })}
                    placeholder="850.00" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200" />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs text-gray-500"><Calendar className="h-3 w-3" /> Date d&apos;échéance</label>
                  <input type="date" required value={addForm.due_date} onChange={(e) => setAddForm({ ...addForm, due_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200" />
                </div>
                <div className="flex items-end">
                  <button type="submit" disabled={addingTenant}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                    {addingTenant ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    {addingTenant ? "Ajout..." : "Ajouter"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Tenant list */}
          {tenants.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-lg font-semibold text-gray-600">Aucun locataire</p>
              <p className="mt-1 text-sm text-gray-400">Ajoutez-en manuellement ou importez un CSV</p>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white py-14 text-center">
              <Search className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-gray-500">Aucun résultat</p>
              <button onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
                className="mt-2 text-sm font-medium text-emerald-600 hover:underline">Réinitialiser</button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 mb-2">
                {filteredTenants.length} locataire{filteredTenants.length > 1 ? "s" : ""}
              </p>
              {filteredTenants.map((t) => {
                const badge = STATUS_BADGE[t.status] || { bg: "bg-gray-100 text-gray-700", label: t.status, icon: <Phone className="h-3 w-3" /> };
                const isExpanded = expandedTenant === t.id;

                return (
                  <div key={t.id} className={`group rounded-2xl border bg-white transition-all ${
                    isExpanded ? "border-emerald-200 shadow-md ring-1 ring-emerald-100" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  }`}>
                    <button onClick={() => toggleTenantCalls(t.id)} className="flex w-full items-center gap-4 p-4 text-left">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        t.status === "will_pay" ? "bg-emerald-100" :
                        t.status === "paid" ? "bg-blue-100" :
                        ["refuses", "call_dropped", "bad_number"].includes(t.status) ? "bg-red-50" : "bg-gray-100"
                      }`}>
                        <Phone className={`h-4 w-4 ${
                          t.status === "will_pay" ? "text-emerald-600" :
                          t.status === "paid" ? "text-blue-600" :
                          ["refuses", "call_dropped", "bad_number"].includes(t.status) ? "text-red-500" : "text-gray-400"
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-[#1e293b]">{t.name}</p>
                        <p className="truncate text-xs text-gray-400">{t.property_address}</p>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        <div className="hidden sm:block text-right">
                          <p className="text-sm font-bold tabular-nums">{t.amount_due.toLocaleString("fr-BE")}€</p>
                          <p className="text-[10px] text-gray-400">éch. {t.due_date}</p>
                        </div>
                        {t.attempt_count > 0 && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">{t.attempt_count}</span>
                        )}
                        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.bg}`}>
                          {badge.icon} {badge.label}
                        </span>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-300" />}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-5 py-5">
                        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                          <InfoCell icon={<Euro className="h-3.5 w-3.5" />} label="Montant" value={`${t.amount_due.toLocaleString("fr-BE")}€`} />
                          <InfoCell icon={<Calendar className="h-3.5 w-3.5" />} label="Échéance" value={t.due_date} />
                          <InfoCell icon={<Phone className="h-3.5 w-3.5" />} label="Téléphone" value={t.phone} />
                          <InfoCell icon={<Clock className="h-3.5 w-3.5" />} label="Dernier appel"
                            value={t.last_called_at ? new Date(t.last_called_at).toLocaleString("fr-BE") : "—"} />
                        </div>

                        {t.status_notes && (
                          <div className="mb-3 rounded-xl bg-blue-50 px-4 py-3 ring-1 ring-blue-100">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Notes IA</p>
                            <p className="mt-1 text-sm text-blue-900">{t.status_notes}</p>
                          </div>
                        )}

                        {t.promised_date && (
                          <div className="mb-3 rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Paiement promis le</p>
                            <p className="mt-1 text-sm font-bold text-emerald-800">{t.promised_date}</p>
                          </div>
                        )}

                        {/* Call timeline */}
                        <div className="mt-4">
                          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Historique des appels</p>
                          {tenantCalls[t.id] && tenantCalls[t.id].length > 0 ? (
                            <div className="relative space-y-3 pl-5 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
                              {tenantCalls[t.id].map((call) => (
                                <div key={call.id} className="relative">
                                  <div className={`absolute -left-5 top-2.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                                    call.status === "completed" ? "bg-emerald-500" :
                                    call.status === "failed" ? "bg-red-500" :
                                    call.status === "no_answer" ? "bg-gray-400" : "bg-amber-400"
                                  }`} />
                                  <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                      <span className="font-medium text-gray-700">
                                        {new Date(call.started_at).toLocaleString("fr-BE")}
                                      </span>
                                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                        call.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                                        call.status === "failed" ? "bg-red-100 text-red-600" :
                                        "bg-gray-200 text-gray-600"
                                      }`}>
                                        {CALL_STATUS_LABEL[call.status] || call.status}
                                      </span>
                                      {call.duration_seconds != null && call.duration_seconds > 0 && (
                                        <span className="text-gray-400">
                                          {Math.floor(call.duration_seconds / 60)}:{String(call.duration_seconds % 60).padStart(2, "0")}
                                        </span>
                                      )}
                                      {call.ai_status_result && (
                                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                          → {call.ai_status_result}
                                        </span>
                                      )}
                                    </div>
                                    {call.summary && <p className="mt-2 text-sm text-gray-700 leading-relaxed">{call.summary}</p>}
                                    {call.ai_notes && <p className="mt-1.5 text-xs text-gray-500 italic">{call.ai_notes}</p>}
                                    {call.error_message && (
                                      <p className="mt-1.5 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-600">{call.error_message}</p>
                                    )}
                                    {call.transcript && (
                                      <details className="mt-3 group/transcript">
                                        <summary className="cursor-pointer text-xs font-medium text-emerald-600 hover:text-emerald-700">
                                          Transcript complet
                                        </summary>
                                        <pre className="mt-2 max-h-60 overflow-auto rounded-xl bg-white p-4 whitespace-pre-wrap text-xs text-gray-600 ring-1 ring-gray-100 leading-relaxed">
                                          {call.transcript}
                                        </pre>
                                      </details>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : tenantCalls[t.id] ? (
                            <p className="text-xs text-gray-400 italic py-2">Aucun appel enregistré</p>
                          ) : (
                            <div className="flex items-center gap-2 py-2">
                              <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                              <span className="text-xs text-gray-400">Chargement...</span>
                            </div>
                          )}
                        </div>

                        {/* Message history */}
                        {tenantMessages[t.id] && tenantMessages[t.id].length > 0 && (
                          <div className="mt-4">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Messages envoyés</p>
                            <div className="space-y-1.5">
                              {tenantMessages[t.id].map((msg) => (
                                <div key={msg.id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs ring-1 ring-gray-100">
                                  {msg.channel === "sms" ? <MessageSquareText className="h-3 w-3 text-blue-500 shrink-0" /> : <Mail className="h-3 w-3 text-purple-500 shrink-0" />}
                                  <span className="flex-1 truncate text-gray-600">{msg.content}</span>
                                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                                    msg.status === "sent" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                                  }`}>{msg.status === "sent" ? "Envoyé" : "Échoué"}</span>
                                  <span className="shrink-0 text-gray-400">{new Date(msg.created_at).toLocaleDateString("fr-BE")}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions: SMS, Delete */}
                        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                          <button onClick={(e) => { e.stopPropagation(); openSMSForTenant(t); }}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-all ring-1 ring-blue-200">
                            <MessageSquareText className="h-3 w-3" /> Envoyer un SMS
                          </button>
                          {isEditable && (
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteTenant(t.id); }}
                              disabled={deletingTenant === t.id}
                              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all">
                              {deletingTenant === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Reset modal ── */}
      {showResetModal && (
        <Modal onClose={() => setShowResetModal(false)}>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100">
              <RotateCcw className="h-7 w-7 text-orange-600" />
            </div>
            <h2 className="text-lg font-bold">Réinitialiser la campagne ?</h2>
            <p className="mt-2 text-sm text-gray-500">
              Tous les locataires seront remis en &quot;En attente&quot;. Les tentatives, notes IA et dates promises seront effacées.
              L&apos;historique des appels sera conservé.
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowResetModal(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleReset} disabled={resetting}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors">
                {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                {resetting ? "Reset..." : "Confirmer le reset"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete campaign modal ── */}
      {showDeleteCampaignModal && (
        <Modal onClose={() => setShowDeleteCampaignModal(false)}>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
              <Trash2 className="h-7 w-7 text-red-600" />
            </div>
            <h2 className="text-lg font-bold">Supprimer cette campagne ?</h2>
            <p className="mt-2 text-sm text-gray-500">
              Cette action est irréversible. Tous les locataires et l&apos;historique des appels seront supprimés définitivement.
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowDeleteCampaignModal(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleDeleteCampaign} disabled={deletingCampaign}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deletingCampaign ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deletingCampaign ? "Suppression..." : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── SMS individual modal ── */}
      {showSMSModal && smsTarget && (
        <Modal onClose={() => { setShowSMSModal(false); setSmsResult(null); }}>
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <MessageSquareText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-bold">SMS à {smsTarget.name}</h2>
                <p className="text-xs text-gray-400">{smsTarget.phone}</p>
              </div>
            </div>
            <textarea value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)}
              rows={4} maxLength={480} placeholder="Votre message..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none" />
            <div className="mt-1 flex justify-between text-xs text-gray-400">
              <span>{smsMessage.length}/480 caractères</span>
              <span>{Math.ceil(smsMessage.length / 160)} SMS</span>
            </div>
            {smsResult && (
              <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${smsResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                {smsResult.text}
              </div>
            )}
            <div className="mt-4 flex gap-3">
              <button onClick={() => { setShowSMSModal(false); setSmsResult(null); }}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleSendSMS} disabled={sendingSMS || !smsMessage.trim()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {sendingSMS ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sendingSMS ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Bulk SMS modal ── */}
      {showBulkSMS && (
        <Modal onClose={() => { setShowBulkSMS(false); setBulkResult(null); }}>
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                <MessageSquareText className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-base font-bold">SMS en masse</h2>
                <p className="text-xs text-gray-400">Envoyer à tous les locataires de cette campagne</p>
              </div>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs text-gray-500">Filtrer par statut (optionnel)</label>
              <select value={bulkFilter} onChange={(e) => setBulkFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none">
                <option value="">Tous les locataires</option>
                {FILTER_OPTIONS.filter(f => f.value !== "all").map(f => (
                  <option key={f.value} value={f.value}>{f.label} ({tenants.filter(t => t.status === f.value).length})</option>
                ))}
              </select>
            </div>

            <textarea value={bulkMessage} onChange={(e) => setBulkMessage(e.target.value)}
              rows={4} maxLength={480} placeholder="Votre message... Utilisez {nom} pour personnaliser."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none" />
            <p className="mt-1 text-xs text-gray-400">
              Utilisez <code className="rounded bg-gray-200 px-1 text-[10px]">{"{nom}"}</code> pour insérer le nom du locataire
            </p>

            {bulkResult && (
              <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {bulkResult.sent} SMS envoyés{bulkResult.failed > 0 && `, ${bulkResult.failed} échoués`}
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <button onClick={() => { setShowBulkSMS(false); setBulkResult(null); }}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleBulkSMS} disabled={sendingBulk || !bulkMessage.trim()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                {sendingBulk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sendingBulk ? "Envoi..." : `Envoyer à ${bulkFilter ? tenants.filter(t => t.status === bulkFilter).length : tenants.length} locataires`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function InfoCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 text-gray-400">{icon}</div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-[#1e293b]">{value}</p>
      </div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        {children}
      </div>
    </div>
  );
}
