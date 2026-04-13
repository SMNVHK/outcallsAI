"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCampaigns, createCampaign } from "@/lib/api";
import {
  Plus,
  Loader2,
  FolderOpen,
  Play,
  Pause,
  CheckCircle,
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

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-700 text-zinc-300",
  running: "bg-emerald-900 text-emerald-300",
  paused: "bg-amber-900 text-amber-300",
  completed: "bg-blue-900 text-blue-300",
  cancelled: "bg-red-900 text-red-300",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  draft: <FolderOpen className="h-3 w-3" />,
  running: <Play className="h-3 w-3" />,
  paused: <Pause className="h-3 w-3" />,
  completed: <CheckCircle className="h-3 w-3" />,
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  running: "En cours",
  paused: "En pause",
  completed: "Terminée",
  cancelled: "Annulée",
};

export default function DashboardPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    try {
      const data = await getCampaigns();
      setCampaigns(data);
    } catch {
      /* handled by api.ts */
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const campaign = await createCampaign(newName.trim());
      router.push(`/dashboard/campaigns/${campaign.id}`);
    } catch {
      /* handled by api.ts */
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campagnes de relance</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Gérez vos campagnes d&apos;appels automatisés
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Nouvelle campagne
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-6 flex items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
        >
          <div className="flex-1">
            <label className="mb-1 block text-sm text-zinc-400">
              Nom de la campagne
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              placeholder="Relances Avril 2026"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {creating ? "Création..." : "Créer"}
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white"
          >
            Annuler
          </button>
        </form>
      )}

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16 text-center">
          <FolderOpen className="mb-3 h-10 w-10 text-zinc-600" />
          <p className="text-zinc-400">Aucune campagne pour le moment</p>
          <p className="mt-1 text-sm text-zinc-600">
            Créez votre première campagne pour commencer les relances
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/dashboard/campaigns/${c.id}`)}
              className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div>
                <h3 className="font-medium">{c.name}</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Créée le{" "}
                  {new Date(c.created_at).toLocaleDateString("fr-BE")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] || "bg-zinc-700"}`}
                >
                  {STATUS_ICONS[c.status]}
                  {STATUS_LABELS[c.status] || c.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
