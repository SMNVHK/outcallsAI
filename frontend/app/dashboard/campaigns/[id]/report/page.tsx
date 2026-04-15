"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCampaignReport } from "@/lib/api";
import { ArrowLeft, Loader2, Printer, CheckCircle2, XCircle, AlertTriangle, Phone, PhoneOff } from "lucide-react";

interface CallRecord {
  date: string;
  end_date: string | null;
  status: string;
  duration_seconds: number | null;
  ai_result: string | null;
  summary: string | null;
  ai_notes: string | null;
  transcript: string | null;
}

interface TenantReport {
  name: string;
  phone: string;
  property_address: string;
  amount_due: number;
  due_date: string;
  current_status: string;
  status_notes: string | null;
  promised_date: string | null;
  attempt_count: number;
  calls: CallRecord[];
  messages: Array<{ date: string; channel: string; content: string; status: string }>;
}

interface Report {
  campaign: { name: string; status: string; created_at: string };
  agency: { name: string; email: string; phone: string };
  generated_at: string;
  tenant_count: number;
  tenants: TenantReport[];
}

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente", will_pay: "Va payer", cant_pay: "Difficultés",
  no_answer: "Pas de réponse", refuses: "Refuse", voicemail: "Répondeur",
  bad_number: "Mauvais n°", busy: "Occupé", call_dropped: "Appel coupé",
  paid: "Payé", escalated: "Escaladé",
  completed: "Terminé", failed: "Échoué", initiated: "Initié", ringing: "Sonne", answered: "Décroché",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  will_pay: <CheckCircle2 className="inline h-3 w-3 text-emerald-600" />,
  refuses: <XCircle className="inline h-3 w-3 text-red-600" />,
  cant_pay: <AlertTriangle className="inline h-3 w-3 text-amber-600" />,
  escalated: <AlertTriangle className="inline h-3 w-3 text-red-600" />,
  no_answer: <PhoneOff className="inline h-3 w-3 text-gray-500" />,
};

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCampaignReport(id)
      .then(setReport)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
    </div>
  );

  if (!report) return <div className="p-8 text-gray-500">Rapport introuvable</div>;

  return (
    <div className="p-6 lg:p-8 max-w-[900px] mx-auto">
      {/* Screen-only controls */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
          <Printer className="h-4 w-4" /> Imprimer / PDF
        </button>
      </div>

      {/* Report header */}
      <div className="mb-8 border-b-2 border-emerald-600 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Rapport de relance</h1>
            <h2 className="mt-1 text-lg font-semibold text-emerald-700">{report.campaign.name}</h2>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p className="font-semibold text-[#1e293b]">{report.agency.name}</p>
            {report.agency.email && <p>{report.agency.email}</p>}
            {report.agency.phone && <p>{report.agency.phone}</p>}
          </div>
        </div>
        <div className="mt-4 flex gap-6 text-xs text-gray-500">
          <span>Généré le {new Date(report.generated_at).toLocaleString("fr-BE")}</span>
          <span>{report.tenant_count} locataires</span>
          <span>Campagne créée le {new Date(report.campaign.created_at).toLocaleDateString("fr-BE")}</span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="mb-8 grid grid-cols-4 gap-3 text-center">
        {[
          { label: "Total", value: report.tenants.length },
          { label: "Va payer", value: report.tenants.filter(t => t.current_status === "will_pay").length },
          { label: "Difficultés", value: report.tenants.filter(t => t.current_status === "cant_pay").length },
          { label: "Refuse", value: report.tenants.filter(t => t.current_status === "refuses").length },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-gray-200 py-2">
            <p className="text-lg font-bold">{s.value}</p>
            <p className="text-[10px] uppercase text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tenant dossiers */}
      <div className="space-y-6">
        {report.tenants.map((t, idx) => (
          <div key={idx} className="break-inside-avoid rounded-xl border border-gray-200 p-5">
            {/* Tenant header */}
            <div className="mb-3 flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-[#1e293b]">{t.name}</h3>
                <p className="text-xs text-gray-500">{t.property_address}</p>
                <p className="text-xs text-gray-400">Tél: {t.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{t.amount_due.toLocaleString("fr-BE")}€</p>
                <p className="text-xs text-gray-400">Éch. {t.due_date}</p>
                <div className="mt-1 flex items-center justify-end gap-1 text-xs font-semibold">
                  {STATUS_ICON[t.current_status]}
                  <span>{STATUS_LABEL[t.current_status] || t.current_status}</span>
                </div>
              </div>
            </div>

            {t.status_notes && (
              <p className="mb-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
                <span className="font-bold">Notes IA :</span> {t.status_notes}
              </p>
            )}
            {t.promised_date && (
              <p className="mb-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                <span className="font-bold">Paiement promis le :</span> {t.promised_date}
              </p>
            )}

            {/* Call log */}
            <p className="mb-2 mt-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Historique des relances ({t.calls.length} appel{t.calls.length > 1 ? "s" : ""})
            </p>
            {t.calls.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-400">
                    <th className="py-1.5 pr-2">Date</th>
                    <th className="py-1.5 pr-2">Statut</th>
                    <th className="py-1.5 pr-2">Durée</th>
                    <th className="py-1.5 pr-2">Résultat IA</th>
                    <th className="py-1.5">Résumé</th>
                  </tr>
                </thead>
                <tbody>
                  {t.calls.map((c, ci) => (
                    <tr key={ci} className="border-b border-gray-50">
                      <td className="py-1.5 pr-2 text-gray-600">{new Date(c.date).toLocaleString("fr-BE")}</td>
                      <td className="py-1.5 pr-2">{STATUS_LABEL[c.status] || c.status}</td>
                      <td className="py-1.5 pr-2 tabular-nums">
                        {c.duration_seconds ? `${Math.floor(c.duration_seconds / 60)}:${String(c.duration_seconds % 60).padStart(2, "0")}` : "—"}
                      </td>
                      <td className="py-1.5 pr-2">
                        {c.ai_result ? (
                          <span className="flex items-center gap-1">
                            {STATUS_ICON[c.ai_result]} {STATUS_LABEL[c.ai_result] || c.ai_result}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-1.5 text-gray-600">{c.summary || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-gray-400 italic">Aucun appel enregistré</p>
            )}

            {/* Transcripts */}
            {t.calls.some(c => c.transcript) && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-emerald-600">
                  Voir les transcripts complets
                </summary>
                {t.calls.filter(c => c.transcript).map((c, ci) => (
                  <div key={ci} className="mt-2">
                    <p className="text-[10px] font-bold text-gray-400">
                      Appel du {new Date(c.date).toLocaleString("fr-BE")}
                    </p>
                    <pre className="mt-1 rounded-lg bg-gray-50 p-3 text-[11px] text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {c.transcript}
                    </pre>
                  </div>
                ))}
              </details>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
        <p>Rapport généré automatiquement par Recovia — {report.agency.name}</p>
        <p>{new Date(report.generated_at).toLocaleString("fr-BE")}</p>
        <p className="mt-1">Ce document constitue une preuve de relance effectuée par voie téléphonique automatisée.</p>
      </div>
    </div>
  );
}
