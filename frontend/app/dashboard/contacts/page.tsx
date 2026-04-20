"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getContacts } from "@/lib/api";
import {
  Loader2, Search, Users, Phone, MapPin, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, XCircle, PhoneOff, Clock,
} from "lucide-react";

interface ContactCampaign {
  campaign_id: string;
  campaign_name: string;
  status: string;
  amount_due: number;
  promised_date: string | null;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  property_address: string;
  total_campaigns: number;
  total_calls: number;
  total_amount_due: number;
  last_status: string;
  last_campaign_name: string;
  last_called_at: string | null;
  campaigns: ContactCampaign[];
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  will_pay:        { label: "Va payer",     color: "text-emerald-600 bg-emerald-50", icon: <CheckCircle2 className="h-3 w-3" /> },
  cant_pay:        { label: "Difficultés",  color: "text-amber-600 bg-amber-50",     icon: <AlertTriangle className="h-3 w-3" /> },
  refuses:         { label: "Refuse",       color: "text-red-600 bg-red-50",         icon: <XCircle className="h-3 w-3" /> },
  escalated:       { label: "Escaladé",     color: "text-red-600 bg-red-50",         icon: <AlertTriangle className="h-3 w-3" /> },
  no_answer:       { label: "Pas de rép.",  color: "text-gray-500 bg-gray-100",      icon: <PhoneOff className="h-3 w-3" /> },
  voicemail:       { label: "Répondeur",    color: "text-purple-600 bg-purple-50",   icon: <Phone className="h-3 w-3" /> },
  pending:         { label: "En attente",   color: "text-gray-500 bg-gray-100",      icon: <Clock className="h-3 w-3" /> },
  promise_overdue: { label: "Retard",       color: "text-orange-600 bg-orange-50",   icon: <AlertTriangle className="h-3 w-3" /> },
};

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setContacts(await getContacts()); } catch { /* handled */ }
    finally { setLoading(false); }
  }

  const filtered = contacts.filter((c) => {
    if (statusFilter && c.last_status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.property_address.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
        <p className="mt-1 text-sm text-gray-500">Tous vos locataires à travers toutes les campagnes</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1e293b]">{contacts.length}</p>
              <p className="text-xs text-gray-500">Contacts uniques</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1e293b]">{contacts.filter(c => c.last_status === "will_pay").length}</p>
              <p className="text-xs text-gray-500">Vont payer</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1e293b]">{contacts.filter(c => ["refuses", "escalated"].includes(c.last_status)).length}</p>
              <p className="text-xs text-gray-500">Problématiques</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
              <Phone className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1e293b]">{contacts.reduce((s, c) => s + c.total_calls, 0)}</p>
              <p className="text-xs text-gray-500">Appels total</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, téléphone, adresse..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-400">
          <option value="">Tous les statuts</option>
          <option value="will_pay">Va payer</option>
          <option value="cant_pay">Difficultés</option>
          <option value="refuses">Refuse</option>
          <option value="escalated">Escaladé</option>
          <option value="no_answer">Pas de réponse</option>
          <option value="promise_overdue">Promesse en retard</option>
          <option value="pending">En attente</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-gray-500">Aucun contact trouvé</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const st = STATUS_LABELS[c.last_status] || STATUS_LABELS.pending;
            const isOpen = expanded === c.id;
            return (
              <div key={c.id} className="rounded-2xl border border-gray-200 bg-white transition-all hover:shadow-sm">
                <button onClick={() => setExpanded(isOpen ? null : c.id)}
                  className="flex w-full items-center gap-4 p-4 text-left">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#1e293b]">{c.name}</span>
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.color}`}>
                        {st.icon} {st.label}
                      </span>
                      {c.total_campaigns > 1 && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                          {c.total_campaigns} campagnes
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</span>
                      <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" /> {c.property_address}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#1e293b]">{c.total_amount_due.toLocaleString("fr-BE")}€</p>
                    <p className="text-[10px] text-gray-400">{c.total_calls} appel{c.total_calls > 1 ? "s" : ""}</p>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Historique campagnes</h4>
                    <div className="space-y-2">
                      {c.campaigns.map((camp, i) => {
                        const cst = STATUS_LABELS[camp.status] || STATUS_LABELS.pending;
                        return (
                          <button key={i} onClick={() => router.push(`/dashboard/campaigns/${camp.campaign_id}`)}
                            className="flex w-full items-center justify-between rounded-xl bg-gray-50 p-3 text-left hover:bg-gray-100 transition-colors">
                            <div>
                              <p className="text-sm font-medium text-[#1e293b]">{camp.campaign_name}</p>
                              <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-bold ${cst.color} rounded-full px-2 py-0.5`}>
                                {cst.icon} {cst.label}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">{camp.amount_due.toLocaleString("fr-BE")}€</p>
                              {camp.promised_date && (
                                <p className="text-[10px] text-gray-400">Promis: {new Date(camp.promised_date).toLocaleDateString("fr-BE")}</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {c.email && <p className="mt-3 text-xs text-gray-400">Email: {c.email}</p>}
                    {c.last_called_at && (
                      <p className="mt-1 text-xs text-gray-400">
                        Dernier appel: {new Date(c.last_called_at).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
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
