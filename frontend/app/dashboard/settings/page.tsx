"use client";

import { useEffect, useState } from "react";
import { getProfile, updateProfile } from "@/lib/api";
import {
  Loader2,
  Building2,
  Mail,
  Phone,
  PhoneOutgoing,
  Save,
  CheckCircle,
  AlertCircle,
  Calendar,
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

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
      setError("Impossible de charger le profil");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const updated = await updateProfile({
        name: name || undefined,
        phone: phone || undefined,
        caller_id: callerId || undefined,
      });
      setProfile(updated);
      localStorage.setItem("agency_name", updated.name);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez les informations de votre agence
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Account info card */}
        {profile && (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Informations du compte
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                  <Mail className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-sm font-medium">{profile.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                  <Calendar className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Inscrit le</p>
                  <p className="text-sm font-medium">
                    {new Date(profile.created_at).toLocaleDateString("fr-BE")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit form */}
        <form
          onSubmit={handleSave}
          className="rounded-xl border border-gray-200 bg-white p-5"
        >
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Modifier le profil
          </h2>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Profil mis à jour avec succès
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm text-gray-500">
                <Building2 className="h-4 w-4" />
                Nom de l&apos;agence
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="Agence Dupont Immobilier"
              />
            </div>

            <div>
              <label className="mb-1 flex items-center gap-2 text-sm text-gray-500">
                <Phone className="h-4 w-4" />
                Téléphone de l&apos;agence
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="+32 2 123 45 67"
              />
            </div>

            <div>
              <label className="mb-1 flex items-center gap-2 text-sm text-gray-500">
                <PhoneOutgoing className="h-4 w-4" />
                Caller ID (numéro sortant)
              </label>
              <input
                type="tel"
                value={callerId}
                onChange={(e) => setCallerId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="+32476047625"
              />
              <p className="mt-1 text-xs text-gray-400">
                Le numéro qui s&apos;affichera chez le locataire
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>

        {/* Usage info */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Limites d&apos;utilisation
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-400">Appels max / jour</p>
              <p className="text-lg font-bold">50</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-400">Appels max / mois</p>
              <p className="text-lg font-bold">500</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-400">Taille CSV max</p>
              <p className="text-lg font-bold">500 lignes</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-400">Fenêtre d&apos;appels</p>
              <p className="text-lg font-bold">09:00 — 18:00</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
