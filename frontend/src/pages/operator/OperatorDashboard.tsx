import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  IndianRupee,
  Zap,
  Activity,
  BatteryCharging,
  Gauge,
  TrendingUp,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { api } from "../../api/client";

interface OperatorStats {
  total_stations: number;
  total_chargers: number;
  live_occupancy_percent: number;
  faulty_chargers: number;
  revenue: number;
  total_bookings: number;
  electricity_usage_kwh: number;
}

function MetricCard({
  label,
  value,
  suffix,
  icon: Icon,
  description,
  tone = "teal",
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon: React.ElementType;
  description: string;
  tone?: "teal" | "blue" | "amber" | "red" | "purple";
}) {
  const tones = {
    teal: {
      icon: "bg-teal-50 text-teal-700",
      accent: "bg-teal-500",
    },
    blue: {
      icon: "bg-blue-50 text-blue-700",
      accent: "bg-blue-500",
    },
    amber: {
      icon: "bg-amber-50 text-amber-700",
      accent: "bg-amber-500",
    },
    red: {
      icon: "bg-red-50 text-red-700",
      accent: "bg-red-500",
    },
    purple: {
      icon: "bg-violet-50 text-violet-700",
      accent: "bg-violet-500",
    },
  };

  const currentTone = tones[tone];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div
        className={`absolute left-0 top-0 h-full w-1 ${currentTone.accent}`}
      />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {label}
          </p>

          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {value}
            </span>

            {suffix && (
              <span className="text-sm font-medium text-slate-500">
                {suffix}
              </span>
            )}
          </div>

          <p className="mt-2 text-xs text-slate-500">{description}</p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${currentTone.icon}`}
        >
          <Icon size={21} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone: "green" | "amber" | "red";
}) {
  const styles = {
    green: {
      wrapper: "bg-emerald-50 border-emerald-100",
      icon: "bg-emerald-100 text-emerald-700",
      text: "text-emerald-700",
    },
    amber: {
      wrapper: "bg-amber-50 border-amber-100",
      icon: "bg-amber-100 text-amber-700",
      text: "text-amber-700",
    },
    red: {
      wrapper: "bg-red-50 border-red-100",
      icon: "bg-red-100 text-red-700",
      text: "text-red-700",
    },
  };

  const style = styles[tone];

  return (
    <div
      className={`flex items-center justify-between rounded-xl border p-4 ${style.wrapper}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${style.icon}`}
        >
          <Icon size={17} />
        </div>

        <span className="text-sm font-semibold text-slate-700">
          {label}
        </span>
      </div>

      <span className={`text-lg font-bold ${style.text}`}>{value}</span>
    </div>
  );
}

export default function OperatorDashboard() {
  const { data, isLoading, isError } = useQuery<OperatorStats>({
    queryKey: ["operator-dashboard"],
    queryFn: async () => (await api.get("/operator/dashboard")).data,
  });

  const stats = {
    total_stations: data?.total_stations ?? 0,
    total_chargers: data?.total_chargers ?? 0,
    live_occupancy_percent: data?.live_occupancy_percent ?? 0,
    faulty_chargers: data?.faulty_chargers ?? 0,
    revenue: data?.revenue ?? 0,
    total_bookings: data?.total_bookings ?? 0,
    electricity_usage_kwh: data?.electricity_usage_kwh ?? 0,
  };

  const availableChargers = Math.max(
    stats.total_chargers - stats.faulty_chargers,
    0,
  );

  const healthyPercent =
    stats.total_chargers > 0
      ? Math.round((availableChargers / stats.total_chargers) * 100)
      : 0;

  if (isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="animate-pulse">
            <div className="h-3 w-36 rounded bg-slate-200" />
            <div className="mt-3 h-8 w-72 rounded bg-slate-200" />
            <div className="mt-2 h-4 w-96 rounded bg-slate-100" />
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-7">
        {/* =====================================================
            PAGE HEADER
        ====================================================== */}

        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-teal-100/70 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <Building2 size={19} />
                </div>

                <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
                  Operations center
                </p>
              </div>

              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Network operations
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Monitor your charging network, track live utilization, and
                identify operational issues before they affect drivers.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Activity size={18} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Network status
                </p>
                <p className="mt-0.5 text-sm font-bold text-emerald-800">
                  Operational
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            ERROR STATE
        ====================================================== */}

        {isError && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertTriangle className="mt-0.5 shrink-0" size={19} />

            <div>
              <p className="text-sm font-bold">
                Unable to load live operator data
              </p>

              <p className="mt-1 text-xs text-red-700">
                Please check that the backend is running and the operator API
                endpoint is available.
              </p>
            </div>
          </div>
        )}

        {/* =====================================================
            PRIMARY METRICS
        ====================================================== */}

        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Network overview
              </p>

              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Performance at a glance
              </h2>
            </div>

            <div className="hidden items-center gap-1 text-xs font-medium text-slate-400 sm:flex">
              <TrendingUp size={14} />
              Live network metrics
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Stations"
              value={stats.total_stations}
              icon={Building2}
              description="Active locations in network"
              tone="teal"
            />

            <MetricCard
              label="Chargers"
              value={stats.total_chargers}
              icon={Zap}
              description="Total charging points"
              tone="blue"
            />

            <MetricCard
              label="Live occupancy"
              value={stats.live_occupancy_percent}
              suffix="%"
              icon={Gauge}
              description="Current network utilization"
              tone="purple"
            />

            <MetricCard
              label="Faulty chargers"
              value={stats.faulty_chargers}
              icon={AlertTriangle}
              description="Require operational attention"
              tone={stats.faulty_chargers > 0 ? "red" : "teal"}
            />
          </div>
        </section>

        {/* =====================================================
            BUSINESS METRICS
        ====================================================== */}

        <section className="grid gap-5 md:grid-cols-3">
          <MetricCard
            label="Revenue"
            value={`₹${stats.revenue.toLocaleString("en-IN")}`}
            icon={IndianRupee}
            description="Total recorded network revenue"
            tone="teal"
          />

          <MetricCard
            label="Bookings"
            value={stats.total_bookings}
            icon={CalendarClock}
            description="Charging reservations recorded"
            tone="blue"
          />

          <MetricCard
            label="Energy delivered"
            value={stats.electricity_usage_kwh}
            suffix="kWh"
            icon={BatteryCharging}
            description="Electricity consumed by vehicles"
            tone="purple"
          />
        </section>

        {/* =====================================================
            OPERATIONS HEALTH
        ====================================================== */}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Charger health */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Infrastructure health
                </p>

                <h3 className="mt-1 text-lg font-bold text-slate-900">
                  Charger availability
                </h3>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Zap size={19} />
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-bold tracking-tight text-slate-900">
                    {healthyPercent}%
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Chargers currently healthy
                  </p>
                </div>

                <p className="text-sm font-semibold text-slate-600">
                  {availableChargers} / {stats.total_chargers}
                </p>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-600 to-teal-400 transition-all duration-500"
                  style={{
                    width: `${Math.min(Math.max(healthyPercent, 0), 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <StatusRow
                label="Healthy"
                value={availableChargers}
                icon={CheckCircle2}
                tone="green"
              />

              <StatusRow
                label="Faulty"
                value={stats.faulty_chargers}
                icon={AlertTriangle}
                tone={stats.faulty_chargers > 0 ? "red" : "green"}
              />

              <StatusRow
                label="Occupancy"
                value={`${stats.live_occupancy_percent}%`}
                icon={Gauge}
                tone={
                  stats.live_occupancy_percent >= 85
                    ? "red"
                    : stats.live_occupancy_percent >= 60
                      ? "amber"
                      : "green"
                }
              />
            </div>
          </div>

          {/* Operational insight */}

          <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-500/20 blur-3xl" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-300">
                    Operator insight
                  </p>

                  <h3 className="mt-2 text-xl font-bold">
                    Network efficiency
                  </h3>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-teal-300">
                  <Gauge size={19} />
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-slate-300">
                Keep an eye on charger occupancy and fault conditions. High
                utilization can indicate strong demand, while faulty chargers
                directly reduce available network capacity.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                  <span className="text-sm text-slate-300">
                    Current utilization
                  </span>

                  <span className="font-bold text-white">
                    {stats.live_occupancy_percent}%
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                  <span className="text-sm text-slate-300">
                    Energy delivered
                  </span>

                  <span className="font-bold text-white">
                    {stats.electricity_usage_kwh} kWh
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-teal-300 transition hover:text-teal-200"
              >
                View operational insights
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================
            ACTION AREA
        ====================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Network management
              </p>

              <h3 className="mt-1 text-lg font-bold text-slate-900">
                Keep your charging network ready
              </h3>

              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Add stations and chargers through the backend API to populate
                live operational data, occupancy, revenue, and energy metrics.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <CheckCircle2 size={18} className="text-teal-600" />

              <span className="text-sm font-semibold text-slate-700">
                Network connected
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <code className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
              POST /stations
            </code>

            <code className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
              POST /stations/{"{id}"}/chargers
            </code>
          </div>
        </section>
      </div>
    </AppShell>
  );
}