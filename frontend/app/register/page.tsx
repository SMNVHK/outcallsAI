"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "@/lib/api";
import { Phone, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(name, email, password, phone || undefined);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur d'inscription");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 text-[#1e293b]">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-200">
            <Phone className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Créer un compte</h1>
          <p className="mt-1 text-sm text-gray-500">
            Inscrivez votre agence pour commencer
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-600">
              Nom de l&apos;agence
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#1e293b] outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Agence Dupont Immobilier"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-600">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#1e293b] outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="agence@example.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-600">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#1e293b] outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="mt-1 text-xs text-gray-400">Minimum 6 caractères</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-600">
              Téléphone de l&apos;agence{" "}
              <span className="font-normal text-gray-400">(optionnel)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#1e293b] outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="+32 2 123 45 67"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Création..." : "Créer le compte"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          Déjà un compte ?{" "}
          <Link
            href="/login"
            className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
