"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Phone, ArrowRight, CheckCircle2, Shield, Clock, BarChart3,
  Zap, Users, FileText, Bot, PhoneCall, TrendingUp,
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.replace("/dashboard");
      return;
    }
    setChecked(true);
  }, [router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 animate-pulse">
          <Phone className="h-6 w-6 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b]">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-gray-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
              <Phone className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">Recovia</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Connexion
            </Link>
            <Link href="/register"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors">
              Essai gratuit
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-emerald-100/40 blur-3xl" />
        </div>
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
            <Zap className="h-3.5 w-3.5" /> Automatisation IA pour agences immobilières
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Vos relances de loyer,{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              automatisées par l&apos;IA
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500 leading-relaxed">
            Votre assistante vocale appelle vos locataires en retard de paiement,
            négocie intelligemment, et vous fournit un rapport complet.
            Zéro effort. Traçabilité juridique totale.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/register"
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 hover:shadow-emerald-500/30 transition-all">
              Commencer gratuitement <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login"
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-base font-medium text-gray-600 hover:border-gray-300 hover:shadow-sm transition-all">
              J&apos;ai déjà un compte
            </Link>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-gray-200 bg-white py-10">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 text-center">
            <Stat value="500+" label="Appels réalisés" />
            <Stat value="87%" label="Taux de contact" />
            <Stat value="2 min" label="Durée moyenne" />
            <Stat value="100%" label="Traçabilité légale" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Tout ce dont une agence a besoin
            </h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto">
              Un outil complet qui remplace des heures de travail téléphonique
              par des résultats immédiats et vérifiables.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={<Bot className="h-5 w-5" />}
              title="IA conversationnelle avancée"
              description="Sophie, votre assistante vocale, parle un français belge naturel. Elle négocie, détecte les mensonges et sait quand escalader."
            />
            <Feature
              icon={<PhoneCall className="h-5 w-5" />}
              title="Appels automatiques"
              description="Importez votre liste, lancez la campagne. Les appels s'enchaînent avec retry automatique des non-réponses."
            />
            <Feature
              icon={<Shield className="h-5 w-5" />}
              title="Conformité juridique"
              description="Chaque appel est retranscrit. Rapport exportable comme preuve de relance légale. RGPD compliant."
            />
            <Feature
              icon={<BarChart3 className="h-5 w-5" />}
              title="Dashboard temps réel"
              description="Voyez en direct l'avancement des appels, les promesses de paiement, et les cas nécessitant votre attention."
            />
            <Feature
              icon={<Clock className="h-5 w-5" />}
              title="Planification intelligente"
              description="Programmez vos campagnes à l'avance. Fenêtres d'appels, jours ouvrables, et limites de sécurité incluses."
            />
            <Feature
              icon={<FileText className="h-5 w-5" />}
              title="Rapports & Exports"
              description="Export CSV, rapport PDF par campagne, journal d'activité détaillé. Tout est traçable et partageable."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-gray-200 bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              3 étapes. C&apos;est tout.
            </h2>
          </div>
          <div className="space-y-8">
            <Step number="1" title="Importez votre liste"
              description="Uploadez un CSV ou ajoutez manuellement vos locataires en retard. Nom, téléphone, montant dû, adresse." />
            <Step number="2" title="Lancez la campagne"
              description="Cliquez sur 'Lancer' ou planifiez pour plus tard. Sophie appelle chaque locataire un par un, avec retry automatique." />
            <Step number="3" title="Consultez les résultats"
              description="Retrouvez chaque appel avec transcript, résumé IA, statut, et montant récupérable. Exportez le tout en un clic." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 p-12 text-white shadow-2xl shadow-emerald-500/20">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Prêt à automatiser vos relances ?
            </h2>
            <p className="mt-4 text-emerald-100 text-lg">
              Créez votre compte en 30 secondes. Aucune carte bancaire requise.
            </p>
            <Link href="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-emerald-700 shadow-lg hover:bg-emerald-50 transition-all">
              Commencer gratuitement <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600">
              <Phone className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold">Recovia</span>
          </div>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Recovia. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-bold text-emerald-600 sm:text-3xl">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}

function Feature({ icon, title, description }: {
  icon: React.ReactNode; title: string; description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-emerald-200 hover:shadow-md">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
        {icon}
      </div>
      <h3 className="text-base font-bold">{title}</h3>
      <p className="mt-2 text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: {
  number: string; title: string; description: string;
}) {
  return (
    <div className="flex gap-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-lg">
        {number}
      </div>
      <div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-1 text-gray-500">{description}</p>
      </div>
    </div>
  );
}
