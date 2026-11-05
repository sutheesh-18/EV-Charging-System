import type { ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
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

/* ============================================================
   SHARED STYLES (light + dark)
============================================================ */

const CARD =
  "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-grid-700/70 dark:bg-grid-850/90 dark:shadow-card";
const PANEL =
  "rounded-xl border border-slate-200 bg-slate-50 dark:border-grid-700/60 dark:bg-grid-900/60";
const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-grid-400";
const HEADING = "text-slate-900 dark:text-grid-50";
const BODY = "text-slate-600 dark:text-grid-300";
const MUTED = "text-slate-500 dark:text-grid-400";
const GREEN_TEXT = "text-emerald-700 dark:text-volt-300";

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/80 dark:bg-grid-700/60 ${className}`}
    />
  );
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

/* ============================================================
   PAGE
============================================================ */

export default function AnalyticsPage() {
  const {
    data: carbon,
    isLoading: carbonLoading,
    isError: carbonError,
    refetch: refetchCarbon,
  } = useQuery<CarbonFootprint>({
    queryKey: ["carbon"],
    queryFn: async () => (await api.get("/analytics/carbon-footprint/me")).data,
  });

  const {
    data: spending,
    isLoading: spendingLoading,
    isError: spendingError,
    refetch: refetchSpending,
  } = useQuery<SpendingData>({
    queryKey: ["spending"],
    queryFn: async () => (await api.get("/analytics/spending/me")).data,
  });

  const energy = carbon?.energy_consumed_kwh ?? 0;
  const carbonSaved = carbon?.carbon_saved_kg ?? 0;
  const trees = carbon?.trees_equivalent ?? 0;
  const score = clamp(carbon?.monthly_sustainability_score ?? 0);
  const greenEnergy = clamp(carbon?.green_energy_used_percent ?? 0);

  const totalSpent = spending?.total_spent ?? 0;
  const sessions = spending?.total_sessions ?? 0;
  const averageSpend = spending?.average_spend_per_session ?? 0;

  // derived from the totals above (no extra API needed)
  const costPerKwh = energy > 0 ? totalSpent / energy : undefined;
  const energyPerSession = sessions > 0 ? energy / sessions : undefined;
  const co2PerSession = sessions > 0 ? carbonSaved / sessions : undefined;

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

  const loading = carbonLoading || spendingLoading;
  const hasActivity = sessions > 0 || energy > 0;
  const isError = carbonError || spendingError;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2">
              <Leaf size={18} className={GREEN_TEXT} />
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-volt-300">
                Climate impact
              </p>
            </div>

            <h1
              className={`mt-2 font-display text-3xl font-bold tracking-tight ${HEADING}`}
            >
              Sustainability
            </h1>

            <p className={`mt-2 max-w-2xl text-sm leading-6 ${BODY}`}>
              Understand the environmental impact of your EV charging activity
              and track your progress over time.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-volt-400/20 dark:bg-volt-400/5">
            <Leaf size={17} className={GREEN_TEXT} />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-grid-400">
                Monthly score
              </p>
              {loading ? (
                <Skeleton className="mt-1 h-5 w-14" />
              ) : (
                <p className={`font-display text-lg font-bold ${GREEN_TEXT}`}>
                  {score}/100
                </p>
              )}
            </div>
          </div>
        </section>

        {/* =====================================================
            ERROR
        ===================================================== */}

        {isError && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300">
              <AlertTriangle size={17} />
            </div>

            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                Unable to load some sustainability data
              </p>
              <p className="mt-1 text-xs leading-5 text-red-700 dark:text-red-300/80">
                Please check that the VoltGrid backend is running and that you
                are signed in.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                refetchCarbon();
                refetchSpending();
              }}
              className="shrink-0 self-center text-sm font-semibold text-red-700 dark:text-red-300"
            >
              Try again
            </button>
          </div>
        )}

        {/* =====================================================
            IMPACT HERO
        ===================================================== */}

        <section className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-sm dark:border-volt-400/20 dark:from-grid-900 dark:via-grid-900 dark:to-grid-850 dark:shadow-glow sm:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-200/50 blur-3xl dark:bg-volt-400/10" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-volt-400/10 dark:text-volt-300">
                  <Leaf size={20} />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-volt-300">
                    Your environmental impact
                  </p>
                  <p className={`mt-0.5 text-xs ${MUTED}`}>
                    Based on your charging activity
                  </p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap items-end gap-3">
                {loading ? (
                  <Skeleton className="h-12 w-40" />
                ) : (
                  <span
                    className={`font-display text-5xl font-bold ${HEADING}`}
                  >
                    {carbonSaved.toFixed(1)}
                  </span>
                )}

                <span className={`mb-1 text-sm ${BODY}`}>kg CO₂ saved</span>
              </div>

              <p className={`mt-3 max-w-xl text-sm leading-6 ${BODY}`}>
                {!loading && !hasActivity
                  ? "Your impact will appear here after your first charging session. Every smarter charging decision contributes to a cleaner mobility network."
                  : "Every smarter charging decision contributes to a cleaner mobility network. This is the estimated carbon offset from your charging activity."}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <ImpactPill
                  icon={TreeDeciduous}
                  value={trees.toFixed(1)}
                  label="tree equivalent"
                />
                <ImpactPill
                  icon={Zap}
                  value={energy.toFixed(1)}
                  label="kWh consumed"
                />
                <ImpactPill
                  icon={BatteryCharging}
                  value={greenEnergy.toFixed(0)}
                  label="% green energy"
                />
              </div>

              {!loading && !hasActivity && (
                <Link
                  to="/map"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 dark:bg-volt-500 dark:text-grid-950 dark:hover:bg-volt-400"
                >
                  Find a charger
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>

            {/* score ring */}
            <div className="flex justify-center lg:pr-8">
              <ScoreRing score={score} label={scoreLabel} loading={loading} />
            </div>
          </div>
        </section>

        {/* =====================================================
            KPI CARDS
        ===================================================== */}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ImpactCard
            loading={loading}
            icon={Zap}
            label="Energy consumed"
            value={energy.toFixed(1)}
            unit="kWh"
            description="Total charging energy"
            type="green"
          />
          <ImpactCard
            loading={loading}
            icon={Leaf}
            label="Carbon saved"
            value={carbonSaved.toFixed(1)}
            unit="kg CO₂"
            description="Estimated emissions avoided"
            type="green"
          />
          <ImpactCard
            loading={loading}
            icon={TreeDeciduous}
            label="Tree equivalent"
            value={trees.toFixed(1)}
            unit="trees"
            description="Environmental equivalent"
            type="green"
          />
          <ImpactCard
            loading={loading}
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

        <section className={`${CARD} p-6 sm:p-7`}>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-volt-400/10 dark:text-volt-300">
                  <Leaf size={17} />
                </div>

                <div>
                  <p className={EYEBROW}>Energy mix</p>
                  <h2
                    className={`mt-1 font-display text-lg font-bold ${HEADING}`}
                  >
                    Green energy usage
                  </h2>
                </div>
              </div>

              <p className={`mt-3 max-w-xl text-sm leading-6 ${BODY}`}>
                A higher share of renewable energy can reduce the environmental
                impact of your charging.
              </p>
            </div>

            <div className="text-right">
              <p className={`font-display text-3xl font-bold ${GREEN_TEXT}`}>
                {greenEnergy.toFixed(0)}%
              </p>
              <p className={`text-xs ${MUTED}`}>renewable energy</p>
            </div>
          </div>

          <div className="mt-7">
            <div className="relative h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-grid-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-300 transition-all duration-700 dark:from-volt-700 dark:via-volt-500 dark:to-volt-300"
                style={{ width: `${greenEnergy}%` }}
              />
            </div>

            <div
              className={`mt-2 flex justify-between text-[11px] ${MUTED}`}
            >
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MiniInsight title="Current level" value={`${greenEnergy.toFixed(0)}%`} />
            <MiniInsight title="Target" value="100%" />
            <MiniInsight
              title="Potential"
              value={`${Math.max(0, 100 - greenEnergy).toFixed(0)}%`}
            />
          </div>
        </section>

        {/* =====================================================
            SPENDING + INSIGHT
        ===================================================== */}

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className={`${CARD} p-6 sm:p-7`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300">
                <PiggyBank size={19} />
              </div>

              <div>
                <p className={EYEBROW}>Charging economics</p>
                <h2
                  className={`mt-1 font-display text-lg font-bold ${HEADING}`}
                >
                  Spending overview
                </h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Metric
                loading={loading}
                icon={IndianRupee}
                label="Total spent"
                value={`₹${totalSpent.toFixed(2)}`}
              />
              <Metric
                loading={loading}
                icon={BatteryCharging}
                label="Sessions"
                value={String(sessions)}
              />
              <Metric
                loading={loading}
                icon={TrendingUp}
                label="Average / session"
                value={`₹${averageSpend.toFixed(2)}`}
              />
            </div>

            {/* efficiency, calculated from the totals */}
            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-grid-700/60">
              <p className={`mb-3 ${EYEBROW}`}>Efficiency</p>

              <div className="grid gap-3 sm:grid-cols-3">
                <MiniInsight
                  title="Cost per kWh"
                  value={costPerKwh !== undefined ? `₹${costPerKwh.toFixed(2)}` : "--"}
                />
                <MiniInsight
                  title="Energy per session"
                  value={
                    energyPerSession !== undefined
                      ? `${energyPerSession.toFixed(1)} kWh`
                      : "--"
                  }
                />
                <MiniInsight
                  title="CO₂ saved per session"
                  value={
                    co2PerSession !== undefined
                      ? `${co2PerSession.toFixed(1)} kg`
                      : "--"
                  }
                />
              </div>
            </div>
          </div>

          {/* insight */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/60 p-6 dark:border-grid-700/70 dark:bg-grid-850/90">
            <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-amber-200/50 blur-2xl dark:bg-volt-400/5" />

            <div className="relative">
              <div className="flex items-center gap-2">
                <Lightbulb
                  size={18}
                  className="text-amber-600 dark:text-amber-400"
                />
                <p className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                  Sustainability insight
                </p>
              </div>

              <h3
                className={`mt-4 font-display text-lg font-bold ${HEADING}`}
              >
                {score >= 80
                  ? "You're charging sustainably."
                  : "There is room to go greener."}
              </h3>

              <p className={`mt-2 text-sm leading-6 ${BODY}`}>{scoreMessage}</p>

              <div className={`mt-5 flex items-center gap-2 text-xs ${BODY}`}>
                <ArrowUpRight size={14} className={GREEN_TEXT} />
                <span>VoltGrid tracks your impact as you charge.</span>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            HOW IT'S CALCULATED
        ===================================================== */}

        <section
          className={`rounded-2xl border border-slate-200 bg-white/60 p-6 dark:border-grid-700/70 dark:bg-grid-900/60`}
        >
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-volt-400/10 dark:text-volt-300">
              <Leaf size={20} />
            </div>

            <div>
              <h3 className={`font-display font-semibold ${HEADING}`}>
                How your impact is calculated
              </h3>

              <p className={`mt-2 max-w-4xl text-sm leading-6 ${BODY}`}>
                VoltGrid uses your charging activity and the sustainability data
                returned by the network to estimate energy consumption, carbon
                savings, renewable energy usage and your monthly sustainability
                score.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  "Energy usage",
                  "Carbon impact",
                  "Renewable energy",
                  "Charging activity",
                ].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 dark:border-grid-700 dark:bg-grid-950 dark:text-grid-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

/* ============================================================
   COMPONENTS
============================================================ */

function ScoreRing({
  score,
  label,
  loading,
}: {
  score: number;
  label: string;
  loading: boolean;
}) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative h-44 w-44">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-emerald-100 dark:text-volt-400/10"
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          className="text-emerald-600 transition-all duration-700 dark:text-volt-400"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {loading ? (
          <Skeleton className="h-9 w-14" />
        ) : (
          <p className={`font-display text-4xl font-bold ${GREEN_TEXT}`}>
            {score}
          </p>
        )}
        <p className={`text-xs ${MUTED}`}>sustainability</p>
        <p className={`mt-1 text-xs font-semibold ${BODY}`}>{label}</p>
      </div>
    </div>
  );
}

function ImpactCard({
  icon: Icon,
  label,
  value,
  unit,
  description,
  type,
  loading,
}: {
  icon: ElementType;
  label: string;
  value: string;
  unit: string;
  description: string;
  type: "green" | "blue";
  loading: boolean;
}) {
  const iconClass =
    type === "green"
      ? "bg-emerald-50 text-emerald-700 dark:bg-volt-400/10 dark:text-volt-300"
      : "bg-blue-50 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300";

  return (
    <div
      className={`${CARD} p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={19} />
        </div>

        <p className={EYEBROW}>{label}</p>
      </div>

      <div className="mt-5 flex items-end gap-2">
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <span className={`font-display text-2xl font-bold ${HEADING}`}>
            {value}
          </span>
        )}
        <span className={`mb-0.5 text-xs ${MUTED}`}>{unit}</span>
      </div>

      <p className={`mt-2 text-xs ${MUTED}`}>{description}</p>
    </div>
  );
}

function ImpactPill({
  icon: Icon,
  value,
  label,
}: {
  icon: ElementType;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white/70 px-3 py-2 dark:border-grid-700 dark:bg-grid-950/50">
      <Icon size={15} className={GREEN_TEXT} />
      <span className={`text-sm font-semibold ${HEADING}`}>{value}</span>
      <span className={`text-xs ${MUTED}`}>{label}</span>
    </div>
  );
}

function MiniInsight({ title, value }: { title: string; value: string }) {
  return (
    <div className={`${PANEL} p-4`}>
      <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-grid-400">
        {title}
      </p>
      <p className={`mt-2 font-display text-lg font-bold ${HEADING}`}>
        {value}
      </p>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: ElementType;
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className={`${PANEL} p-4`}>
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-blue-600 dark:text-blue-300" />
        <p className={`text-xs ${MUTED}`}>{label}</p>
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-6 w-20" />
      ) : (
        <p className={`mt-3 font-display text-xl font-bold ${HEADING}`}>
          {value}
        </p>
      )}
    </div>
  );
}