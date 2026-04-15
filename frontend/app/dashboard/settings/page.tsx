"use client";

import { useEffect, useState } from "react";
import { getProfile, updateProfile } from "@/lib/api";
import { useToast } from "@/components/toast";
import {
  Loader2,
  Building2,
  Mail,
  Phone,
  PhoneOutgoing,
  Save,
  Calendar,
  Bell,
  Clock,
  Shield,
  Zap,
  ExternalLink,
} from "lucide-react";

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  caller_id: string | null;
  created_at: string;
}

export default function SettingsPage() {
  const toast = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [callerId, setCallerId] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await getProfile();
      setProfile(data);
      setName(data.name || "");
      setPhone(data.phone || "");
      setCallerId(data.caller_id || "");
    } catch {
      toast.error("Impossible de charger le profil");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateProfile({
        name: name || undefined,
        phone: phone || undefined,
        caller_id: callerId || undefined,
      });
      setProfile(updated);
      localStorage.setItem("agency_name", updated.name);
      toast.success("Profil mis à jour");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-[900px]">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez les informations de votre agence et vos préférences
        </p>
      </div>

      <div className="space-y-6">
        {/* Account info card */}
        {profile && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400">
              <Shield className="h-4 w-4" /> Compte
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <Mail className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">Email</p>
                  <p className="text-sm font-semibold">{profile.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">Inscrit le</p>
                  <p className="text-sm font-semibold">
                    {new Date(profile.created_at).toLocaleDateString("fr-BE", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                  <Zap className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">Plan</p>
                  <p className="text-sm font-semibold">Beta</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit form */}
        <form onSubmit={handleSave} className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400">
            <Building2 className="h-4 w-4" /> Profil de l&apos;agence
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-600">
                Nom de l&apos;agence
              </label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                placeholder="Agence Dupont Immobilier"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-600">
                  <Phone className="h-3.5 w-3.5" /> Téléphone
                </label>
                <input
                  type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  placeholder="+32 2 123 45 67"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-600">
                  <PhoneOutgoing className="h-3.5 w-3.5" /> Caller ID
                </label>
                <input
                  type="tel" value={callerId} onChange={(e) => setCallerId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  placeholder="+32476047625"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Le numéro qui s&apos;affiche chez le locataire
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit" disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>

        {/* Notifications */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400">
            <Bell className="h-4 w-4" /> Notifications
          </h2>
          <div className="space-y-4">
            <NotifRow
              title="Fin de campagne"
              description="Recevoir un email récapitulatif quand une campagne se termine"
              defaultOn
            />
            <NotifRow
              title="Escalade urgente"
              description="Être alerté immédiatement quand un locataire nécessite une intervention humaine"
              defaultOn
            />
            <NotifRow
              title="Résumé quotidien"
              description="Un email chaque soir avec le résumé des appels de la journée"
              defaultOn={false}
            />
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Les notifications sont envoyées à l&apos;adresse email de votre compte.
          </p>
        </div>

        {/* Limites */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400">
            <Clock className="h-4 w-4" /> Limites &amp; configuration
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <LimitCard label="Appels / jour" value="50" />
            <LimitCard label="Appels / mois" value="500" />
            <LimitCard label="Max CSV" value="500 lignes" />
            <LimitCard label="Fenêtre d'appels" value="09h — 18h" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <LimitCard label="Tentatives max" value="3" />
            <LimitCard label="Délai entre appels" value="10s" />
            <LimitCard label="Délai retry" value="2 min" />
            <LimitCard label="Jours d'appel" value="Lun — Ven" />
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Ces limites sont configurées par défaut. Contactez-nous pour les modifier.
          </p>
        </div>

        {/* Integrations */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400">
            <Zap className="h-4 w-4" /> Intégrations
          </h2>
          <div className="space-y-3">
            <IntegrationRow
              name="DIDWW"
              description="Téléphonie SIP — appels sortants"
              status="connected"
            />
            <IntegrationRow
              name="OpenAI"
              description="IA conversationnelle — Realtime API"
              status="connected"
            />
            <IntegrationRow
              name="Resend"
              description="Envoi d'emails transactionnels"
              status="pending"
              action="Configurer"
            />
            <IntegrationRow
              name="DIDWW SMS"
              description="Envoi de SMS sortants"
              status="pending"
              action="Activer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function NotifRow({ title, description, defaultOn }: {
  title: string; description: string; defaultOn: boolean;
}) {
  const [enabled, setEnabled] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-[#1e293b]">{title}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <button
        onClick={() => setEnabled(!enabled)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          enabled ? "bg-emerald-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

function LimitCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-100">
      <p className="text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-[#1e293b]">{value}</p>
    </div>
  );
}

function IntegrationRow({ name, description, status, action }: {
  name: string; description: string; status: "connected" | "pending"; action?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-[#1e293b]">{name}</p>
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
            status === "connected"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}>
            {status === "connected" ? "Connecté" : "Non configuré"}
          </span>
        </div>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      {action && (
        <button className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-emerald-600 hover:border-emerald-300 transition-all">
          <ExternalLink className="h-3 w-3" /> {action}
        </button>
      )}
    </div>
  );
}
