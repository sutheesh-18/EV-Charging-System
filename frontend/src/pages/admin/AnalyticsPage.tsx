import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BatteryCharging,
  Gauge,
  IndianRupee,
  Leaf,
  Lightbulb,
  PiggyBank,
  TreeDeciduous,
  TrendingUp,
  Zap,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { api } from "../../api/client";
import type { CarbonFootprint } from "../../types";

interface SpendingData {
  total_spent?: number;
  total_sessions?: number;
  average_spend_per_session?: number;
}

export default function AnalyticsPage() {
  const {
    data: carbon,
    isLoading: carbonLoading,
  } = useQuery<CarbonFootprint>({
    queryKey: ["carbon"],
    queryFn: async () =>
      (await api.get("/analytics/carbon-footprint/me")).data,
  });

  const {
    data: spending,
    isLoading: spendingLoading,
  } = useQuery<SpendingData>({
    queryKey: ["spending"],
    queryFn: async () =>
      (await api.get("/analytics/spending/me")).data,
  });

  const energy = carbon?.energy_consumed_kwh ?? 0;
  const carbonSaved = carbon?.carbon_saved_kg ?? 0;
  const trees = carbon?.trees_equivalent ?? 0;
  const score = carbon?.monthly_sustainability_score ?? 0;
  const greenEnergy = carbon?.green_energy_used_percent ?? 0;

  const totalSpent = spending?.total_spent ?? 0;
  const sessions = spending?.total_sessions ?? 0;
  const averageSpend =
    spending?.average_spend_per_session ?? 0;

  const scoreLabel =
    score >= 80
      ? "Excellent"
      : score >= 60
        ? "Good"
        : score >= 40
          ? "Improving"
          : "Getting started";

  const scoreMessage =
    score >= 80
      ? "You're making consistently sustainable charging choices."
      : score >= 60
        ? "You're on a good path. A few greener charging choices can improve your score."
        : "There is room to improve your charging sustainability.";

  const greenEnergyWidth = Math.min(
    100,
    Math.max(0, greenEnergy),
  );

  const loading = carbonLoading || spendingLoading;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <section>
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

            <div>
              <div className="flex items-center gap-2">
                <Leaf
                  size={18}
                  className="text-volt-400"
                />

                <p className="label-eyebrow">
                  Climate impact
                </p>
              </div>

              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-grid-50">
                Sustainability
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-grid-300">
                Understand the environmental impact of your EV
                charging activity and track your progress over
                time.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-volt-400/15 bg-volt-400/5 px-4 py-3">

              <Leaf
                size={17}
                className="text-volt-400"
              />

              <div>
                <p className="text-[10px] uppercase tracking-wider text-grid-400">
                  Monthly score
                </p>

                <p className="font-display text-lg font-bold text-volt-300">
                  {score}/100
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* =====================================================
            IMPACT HERO
        ===================================================== */}

        <section className="relative overflow-hidden rounded-3xl border border-volt-400/20 bg-gradient-to-br from-grid-900 via-grid-900 to-grid-850 p-6 shadow-glow sm:p-8">

          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-volt-400/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">

            <div>

              <div className="flex items-center gap-2">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-volt-400/10 text-volt-300">
                  <Leaf size={20} />
                </div>

                <div>

                  <p className="text-xs font-bold uppercase tracking-widest text-volt-300">
                    Your environmental impact
                  </p>

                  <p className="mt-0.5 text-xs text-grid-400">
                    Based on your charging activity
                  </p>

                </div>

              </div>

              <div className="mt-7 flex flex-wrap items-end gap-3">

                <span className="font-display text-5xl font-bold text-grid-50">
                  {carbonSaved.toFixed(1)}
                </span>

                <span className="mb-1 text-sm text-grid-300">
                  kg CO₂ saved
                </span>

              </div>

              <p className="mt-3 max-w-xl text-sm leading-6 text-grid-300">
                Every smarter charging decision contributes to a
                cleaner mobility network. Your charging activity
                has an estimated environmental impact equivalent
                to the carbon offset represented below.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">

                <ImpactPill
                  icon={TreeDeciduous}
                  value={trees}
                  label="tree equivalent"
                />

                <ImpactPill
                  icon={Zap}
                  value={energy}
                  label="kWh consumed"
                />

                <ImpactPill
                  icon={BatteryCharging}
                  value={greenEnergy}
                  label="% green energy"
                />

              </div>

            </div>

            {/* Score */}

            <div className="flex justify-center lg:pr-8">

              <div className="relative flex h-44 w-44 items-center justify-center rounded-full border-[10px] border-volt-400/10">

                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(#22e08c ${score}%, rgba(34,224,140,0.08) ${score}% 100%)`,
                    mask: "radial-gradient(farthest-side, transparent calc(100% - 10px), #000 0)",
                    WebkitMask:
                      "radial-gradient(farthest-side, transparent calc(100% - 10px), #000 0)",
                  }}
                />

                <div className="relative text-center">

                  <p className="font-display text-4xl font-bold text-volt-300">
                    {score}
                  </p>

                  <p className="text-xs text-grid-400">
                    sustainability
                  </p>

                  <p className="mt-1 text-xs font-medium text-grid-400">
                    {scoreLabel}
                  </p>

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* =====================================================
            KPI CARDS
        ===================================================== */}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <ImpactCard
            icon={Zap}
            label="Energy consumed"
            value={energy.toFixed(1)}
            unit="kWh"
            description="Total charging energy"
            type="green"
          />

          <ImpactCard
            icon={Leaf}
            label="Carbon saved"
            value={carbonSaved.toFixed(1)}
            unit="kg CO₂"
            description="Estimated emissions avoided"
            type="green"
          />

          <ImpactCard
            icon={TreeDeciduous}
            label="Tree equivalent"
            value={trees.toFixed(1)}
            unit="trees"
            description="Environmental equivalent"
            type="green"
          />

          <ImpactCard
            icon={Gauge}
            label="Green energy"
            value={greenEnergy.toFixed(0)}
            unit="%"
            description="Share of green energy"
            type="blue"
          />

        </section>

        {/* =====================================================
            GREEN ENERGY
        ===================================================== */}

        <section className="card p-6 sm:p-7">

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

            <div>

              <div className="flex items-center gap-2">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-volt-400/10 text-volt-400">
                  <Leaf size={17} />
                </div>

                <div>

                  <p className="label-eyebrow">
                    Energy mix
                  </p>

                  <h2 className="mt-1 font-display text-lg font-bold text-grid-50">
                    Green energy usage
                  </h2>

                </div>

              </div>

              <p className="mt-3 max-w-xl text-sm leading-6 text-grid-300">
                A higher share of renewable energy can reduce
                the environmental impact of your charging.
              </p>

            </div>

            <div className="text-right">

              <p className="font-display text-3xl font-bold text-volt-300">
                {greenEnergy.toFixed(0)}%
              </p>

              <p className="text-xs text-grid-400">
                renewable energy
              </p>

            </div>

          </div>

          <div className="mt-7">

            <div className="h-3 overflow-hidden rounded-full bg-grid-800">

              <div
                className="h-full rounded-full bg-gradient-to-r from-volt-700 via-volt-500 to-volt-300 transition-all duration-700"
                style={{
                  width: `${greenEnergyWidth}%`,
                }}
              />

            </div>

            <div className="mt-2 flex justify-between text-[11px] text-grid-400">

              <span>0%</span>
              <span>50%</span>
              <span>100%</span>

            </div>

          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">

            <EnergyInsight
              title="Current level"
              value={`${greenEnergy.toFixed(0)}%`}
            />

            <EnergyInsight
              title="Target"
              value="100%"
            />

            <EnergyInsight
              title="Potential"
              value={`${Math.max(0, 100 - greenEnergy).toFixed(0)}%`}
            />

          </div>

        </section>

        {/* =====================================================
            SPENDING
        ===================================================== */}

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">

          <div className="card p-6 sm:p-7">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-400/10 text-blue-400">
                <PiggyBank size={19} />
              </div>

              <div>

                <p className="label-eyebrow">
                  Charging economics
                </p>

                <h2 className="mt-1 font-display text-lg font-bold text-grid-50">
                  Spending overview
                </h2>

              </div>

            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">

              <SpendingMetric
                icon={IndianRupee}
                label="Total spent"
                value={`₹${totalSpent.toFixed(2)}`}
              />

              <SpendingMetric
                icon={BatteryCharging}
                label="Sessions"
                value={sessions}
              />

              <SpendingMetric
                icon={TrendingUp}
                label="Average / session"
                value={`₹${averageSpend.toFixed(2)}`}
              />

            </div>

          </div>

          {/* AI INSIGHT */}

          <div className="relative overflow-hidden rounded-2xl border border-grid-800 bg-grid-900 p-6">

            <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-volt-400/5 blur-2xl" />

            <div className="relative">

              <div className="flex items-center gap-2">

                <Lightbulb
                  size={18}
                  className="text-amber-400"
                />

                <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
                  Sustainability insight
                </p>

              </div>

              <h3 className="mt-4 font-display text-lg font-bold text-grid-50">
                {score >= 80
                  ? "You're charging sustainably."
                  : "There is room to go greener."}
              </h3>

              <p className="mt-2 text-sm leading-6 text-grid-300">
                {scoreMessage}
              </p>

              <div className="mt-5 flex items-center gap-2 text-xs text-grid-300">

                <ArrowUpRight
                  size={14}
                  className="text-volt-400"
                />

                <span>
                  VoltGrid tracks your impact as you charge.
                </span>

              </div>

            </div>

          </div>

        </section>

        {/* =====================================================
            IMPACT EXPLANATION
        ===================================================== */}

        <section className="rounded-2xl border border-grid-800 bg-grid-900/60 p-6">

          <div className="flex flex-col gap-4 sm:flex-row">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-volt-400/10 text-volt-400">
              <Leaf size={20} />
            </div>

            <div>

              <h3 className="font-display font-semibold text-grid-100">
                How your impact is calculated
              </h3>

              <p className="mt-2 max-w-4xl text-sm leading-6 text-grid-300">
                VoltGrid uses your charging activity and the
                sustainability data returned by the network to
                estimate energy consumption, carbon savings,
                renewable energy usage and your monthly
                sustainability score.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">

                <span className="rounded-full border border-grid-800 bg-grid-950 px-3 py-1 text-xs text-grid-300">
                  Energy usage
                </span>

                <span className="rounded-full border border-grid-800 bg-grid-950 px-3 py-1 text-xs text-grid-300">
                  Carbon impact
                </span>

                <span className="rounded-full border border-grid-800 bg-grid-950 px-3 py-1 text-xs text-grid-300">
                  Renewable energy
                </span>

                <span className="rounded-full border border-grid-800 bg-grid-950 px-3 py-1 text-xs text-grid-300">
                  Charging activity
                </span>

              </div>

            </div>

          </div>

        </section>

        {/* Loading */}

        {loading && (
          <div className="fixed bottom-5 right-5 rounded-xl border border-grid-700 bg-grid-900 px-4 py-3 text-xs text-grid-400 shadow-card">
            Loading sustainability data...
          </div>
        )}

      </div>
    </AppShell>
  );
}

/* =============================================================
   IMPACT CARD
============================================================= */

function ImpactCard({
  icon: Icon,
  label,
  value,
  unit,
  description,
  type,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  unit: string;
  description: string;
  type: "green" | "blue";
}) {
  const iconClass =
    type === "green"
      ? "bg-volt-400/10 text-volt-400"
      : "bg-blue-400/10 text-blue-400";

  return (
    <div className="card p-5">

      <div className="flex items-center gap-3">

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={19} />
        </div>

        <p className="text-xs uppercase tracking-wider text-grid-400">
          {label}
        </p>

      </div>

      <div className="mt-5 flex items-end gap-2">

        <span className="font-display text-2xl font-bold text-grid-50">
          {value}
        </span>

        <span className="mb-0.5 text-xs text-grid-400">
          {unit}
        </span>

      </div>

      <p className="mt-2 text-xs text-grid-400">
        {description}
      </p>

    </div>
  );
}

/* =============================================================
   IMPACT PILL
============================================================= */

function ImpactPill({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Leaf;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-grid-800 bg-grid-950/50 px-3 py-2">

      <Icon
        size={15}
        className="text-volt-400"
      />

      <span className="text-sm font-semibold text-grid-200">
        {typeof value === "number"
          ? value.toFixed(1)
          : value}
      </span>

      <span className="text-xs text-grid-400">
        {label}
      </span>

    </div>
  );
}

/* =============================================================
   ENERGY INSIGHT
============================================================= */

function EnergyInsight({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-grid-800 bg-grid-950/40 p-4">

      <p className="text-[10px] uppercase tracking-wider text-grid-400">
        {title}
      </p>

      <p className="mt-2 font-display text-lg font-bold text-grid-200">
        {value}
      </p>

    </div>
  );
}

/* =============================================================
   SPENDING METRIC
============================================================= */

function SpendingMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof IndianRupee;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-grid-800 bg-grid-950/40 p-4">

      <div className="flex items-center gap-2">

        <Icon
          size={15}
          className="text-blue-400"
        />

        <p className="text-xs text-grid-400">
          {label}
        </p>

      </div>

      <p className="mt-3 font-display text-xl font-bold text-grid-100">
        {value}
      </p>

    </div>
  );
}