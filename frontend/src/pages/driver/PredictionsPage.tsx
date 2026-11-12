import { useMemo, useState, type ElementType, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  type ChartData,
  type ChartOptions,
  type ScriptableContext,
} from "chart.js";
import {
  Activity,
  AlertCircle,
  BrainCircuit,
  Clock3,
  Minus,
  RefreshCw,
  Sunrise,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { api } from "../../api/client";
import { useTheme } from "../../lib/theme";

import type {
  Station,
  QueuePrediction,
  DemandForecast,
} from "../../types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

/* ============================================================
   SHARED STYLES (light + dark) - same tokens as the other pages
============================================================ */

const CARD =
  "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-grid-700/70 dark:bg-grid-850/90 dark:shadow-card";
const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-grid-400";
const HEADING = "text-slate-900 dark:text-grid-50";
const BODY = "text-slate-600 dark:text-grid-300";
const MUTED = "text-slate-500 dark:text-grid-400";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-volt-400 dark:focus-visible:ring-offset-grid-950";

const SELECT =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-grid-600 dark:bg-grid-900/90 dark:text-grid-50 dark:focus:border-volt-500 dark:focus:ring-volt-500/20";

type Tone = "orange" | "blue" | "red" | "green";

const TONES: Record<Tone, string> = {
  orange:
    "bg-orange-50 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
  red: "bg-red-50 text-red-600 dark:bg-red-400/15 dark:text-red-300",
  green:
    "bg-emerald-50 text-emerald-700 dark:bg-volt-400/15 dark:text-volt-300",
};

/* ============================================================
   HELPERS
============================================================ */

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/80 motion-reduce:animate-none dark:bg-grid-700/60 ${className}`}
    />
  );
}

function hourLabel(timestamp?: string) {
  if (!timestamp) return "--";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "--";
  return `${String(date.getHours()).padStart(2, "0")}:00`;
}

const isNum = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/* ============================================================
   CHART THEME
============================================================ */

function useChartTheme() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const text = dark ? "#91A4C2" : "#64748b";
  const grid = dark ? "rgba(255,255,255,0.07)" : "#e2e8f0";

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: dark ? "#0D1728" : "#ffffff",
        titleColor: dark ? "#F8FAFF" : "#0f172a",
        bodyColor: dark ? "#B5C3D9" : "#475569",
        borderColor: dark ? "#344A6B" : "#e2e8f0",
        borderWidth: 1,
        padding: 10,
        cornerRadius: 10,
        displayColors: false,
      },
    },
    scales: {
      x: {
        ticks: { color: text, maxRotation: 0, autoSkipPadding: 12 },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: text },
        grid: { color: grid },
        border: { display: false },
      },
    },
  };

  return {
    options,
    demandColor: dark ? "#22e08c" : "#0d9488",
    queueColor: dark ? "#FFB648" : "#ea580c",
  };
}

function gradientFill(color: string) {
  return (context: ScriptableContext<"line">) => {
    const { ctx, chartArea } = context.chart;
    if (!chartArea) return "transparent";
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, `${color}55`);
    gradient.addColorStop(1, `${color}00`);
    return gradient;
  };
}

/* ============================================================
   PAGE
============================================================ */

export default function PredictionsPage() {
  const [stationId, setStationId] = useState<number | null>(null);
  const chartTheme = useChartTheme();

  /* ---------- stations ---------- */

  const {
    data: stations = [],
    isLoading: stationsLoading,
    isError: stationsError,
    refetch: refetchStations,
  } = useQuery<Station[]>({
    queryKey: ["stations"],
    queryFn: async () => {
      const response = await api.get("/stations");
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  // fall back to the first station if the chosen one is no longer listed
  const activeStationId =
    stationId !== null && stations.some((station) => station.id === stationId)
      ? stationId
      : stations[0]?.id;

  const activeStation = stations.find((s) => s.id === activeStationId);

  /* ---------- demand prediction ---------- */

  const {
    data: demand,
    isLoading: demandLoading,
    isError: demandError,
    refetch: refetchDemand,
  } = useQuery<DemandForecast>({
    queryKey: ["demand", activeStationId],
    queryFn: async () => {
      const response = await api.get(
        `/predictions/demand/${activeStationId}?horizon_hours=24`,
      );
      return response.data;
    },
    enabled: Boolean(activeStationId),
    staleTime: 5 * 60 * 1000,
  });

  /* ---------- queue prediction ---------- */

  const {
    data: queue,
    isLoading: queueLoading,
    isError: queueError,
    refetch: refetchQueue,
  } = useQuery<QueuePrediction>({
    queryKey: ["queue", activeStationId],
    queryFn: async () => {
      const response = await api.get(`/predictions/queue/${activeStationId}`);
      return response.data;
    },
    enabled: Boolean(activeStationId),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  /* ---------- derived insights (from the forecast itself) ---------- */

  const demandStats = useMemo(() => {
    const values = (demand?.forecast ?? []).filter(isNum);

    if (!values.length) return null;

    const stamps = demand?.timestamps ?? [];
    let minIndex = 0;
    let maxIndex = 0;

    (demand?.forecast ?? []).forEach((value, index) => {
      if (!isNum(value)) return;
      const lowest = demand?.forecast[minIndex];
      const highest = demand?.forecast[maxIndex];
      if (!isNum(lowest) || value < lowest) minIndex = index;
      if (!isNum(highest) || value > highest) maxIndex = index;
    });

    const min = demand?.forecast[minIndex] as number;
    const max = demand?.forecast[maxIndex] as number;

    return {
      min,
      max,
      minHour: hourLabel(stamps[minIndex]),
      maxHour: hourLabel(stamps[maxIndex]),
      // the same value all day = no real pattern to point out
      flat: max - min < 0.01 * Math.max(max, 1),
    };
  }, [demand]);

  const trend: "rising" | "falling" | "steady" | undefined = queue
    ? queue.queue_30min > queue.current_queue
      ? "rising"
      : queue.queue_30min < queue.current_queue
        ? "falling"
        : "steady"
    : undefined;

  // the line chart shows the timeline only; the peak is a separate value
  const queueTimeline = queue
    ? [
        queue.current_queue,
        queue.queue_15min,
        queue.queue_30min,
        queue.queue_1hr,
        queue.queue_2hr,
      ]
    : [];

  const queueAll = queue ? [...queueTimeline, queue.peak_hour_queue] : [];

  const queueAllZero = queueAll.length > 0 && queueAll.every((v) => v === 0);
  const queueSteady =
    queueAll.length > 0 &&
    !queueAllZero &&
    queueAll.every((v) => v === queueAll[0]);

  /* ---------- chart data ---------- */

  const demandChart: ChartData<"line"> | null =
    demand?.forecast?.length
      ? {
          labels: demand.forecast.map((_, index) =>
            hourLabel(demand.timestamps?.[index]),
          ),
          datasets: [
            {
              label: "Predicted demand (kWh)",
              data: demand.forecast,
              borderColor: chartTheme.demandColor,
              backgroundColor: gradientFill(chartTheme.demandColor),
              fill: true,
              tension: 0.35,
              borderWidth: 2.5,
              pointRadius: 0,
              pointHoverRadius: 5,
              pointBackgroundColor: chartTheme.demandColor,
            },
          ],
        }
      : null;

  const queueChart: ChartData<"line"> | null = queue
    ? {
        labels: ["Now", "15 min", "30 min", "1 hr", "2 hr"],
        datasets: [
          {
            label: "Predicted queue length",
            data: queueTimeline,
            borderColor: chartTheme.queueColor,
            backgroundColor: gradientFill(chartTheme.queueColor),
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: chartTheme.queueColor,
          },
        ],
      }
    : null;

  // headroom so a line at 0 stays visible, and whole vehicles only
  const queueOptions: ChartOptions<"line"> = {
    ...chartTheme.options,
    scales: {
      ...chartTheme.options.scales,
      y: {
        ...chartTheme.options.scales?.y,
        suggestedMax: 3,
        ticks: { ...chartTheme.options.scales?.y?.ticks, precision: 0 },
      },
    },
  };

  const demandLabel = demandStats
    ? demandStats.flat
      ? `Line chart of predicted demand for the next 24 hours. It stays at about ${demandStats.max.toFixed(1)} kWh.`
      : `Line chart of predicted demand for the next 24 hours. Lowest ${demandStats.min.toFixed(1)} kWh around ${demandStats.minHour}, highest ${demandStats.max.toFixed(1)} kWh around ${demandStats.maxHour}.`
    : "Line chart of predicted demand for the next 24 hours.";

  const queueLabel = queue
    ? `Line chart of predicted queue length. Now ${queue.current_queue}, in 15 minutes ${queue.queue_15min}, in 30 minutes ${queue.queue_30min}, in 1 hour ${queue.queue_1hr}, in 2 hours ${queue.queue_2hr} vehicles.`
    : "Line chart of predicted queue length.";

  /* ---------- page states ---------- */

  if (stationsLoading) {
    return (
      <AppShell>
        <div
          className="mx-auto max-w-7xl space-y-6"
          role="status"
          aria-label="Loading predictions"
        >
          <Skeleton className="h-16 w-72" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
          <span className="sr-only">Loading predictions...</span>
        </div>
      </AppShell>
    );
  }

  if (stationsError) {
    return (
      <AppShell>
        <div className={`${CARD} mx-auto max-w-xl p-8 text-center`}>
          <AlertCircle size={40} className="mx-auto text-red-500 dark:text-red-400" />

          <h2 className={`mt-4 font-display text-xl font-bold ${HEADING}`}>
            Unable to load stations
          </h2>

          <p className={`mt-2 text-sm ${BODY}`}>
            We could not retrieve charging station information. Please try
            again.
          </p>

          <button
            type="button"
            onClick={() => refetchStations()}
            className={`mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 dark:bg-volt-500 dark:text-grid-950 dark:hover:bg-volt-400 ${FOCUS}`}
          >
            <RefreshCw size={15} />
            Try again
          </button>
        </div>
      </AppShell>
    );
  }

  if (!stations.length) {
    return (
      <AppShell>
        <div className={`${CARD} mx-auto max-w-xl p-8 text-center`}>
          <Zap size={40} className="mx-auto text-teal-600 dark:text-volt-400" />

          <h2 className={`mt-4 font-display text-xl font-bold ${HEADING}`}>
            No charging stations available
          </h2>

          <p className={`mt-2 text-sm ${BODY}`}>
            Predictions will appear once charging stations are available.
          </p>
        </div>
      </AppShell>
    );
  }

  /* ---------- main page ---------- */

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-volt-400/10 dark:text-volt-300">
                <BrainCircuit size={23} />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-volt-300">
                  Intelligence center
                </p>

                <h1
                  className={`mt-1 font-display text-2xl font-bold tracking-tight ${HEADING}`}
                >
                  Predictions
                </h1>
              </div>
            </div>

            <p className={`mt-3 max-w-2xl text-sm leading-6 ${BODY}`}>
              Predicted charging demand and queue congestion for each station.
            </p>
          </div>

          {/* station selector */}

          <div className="w-full lg:w-72">
            <label
              htmlFor="station-select"
              className={`mb-2 block ${EYEBROW}`}
            >
              Charging station
            </label>

            <select
              id="station-select"
              className={SELECT}
              value={activeStationId ?? ""}
              onChange={(event) => {
                const value = Number(event.target.value);
                setStationId(Number.isFinite(value) ? value : null);
              }}
            >
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* =====================================================
            KPI CARDS
        ===================================================== */}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            loading={queueLoading}
            label="Current queue"
            value={queue?.current_queue}
            hint={queueError ? "Unavailable" : "Vehicles waiting"}
            icon={Clock3}
            tone="orange"
            badge={
              trend
                ? {
                    text:
                      trend === "rising"
                        ? "Rising"
                        : trend === "falling"
                          ? "Easing"
                          : "Steady",
                    icon:
                      trend === "rising"
                        ? TrendingUp
                        : trend === "falling"
                          ? TrendingDown
                          : Minus,
                    className:
                      trend === "rising"
                        ? "bg-red-50 text-red-700 dark:bg-red-400/15 dark:text-red-300"
                        : trend === "falling"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-volt-400/15 dark:text-volt-300"
                          : "bg-slate-100 text-slate-600 dark:bg-grid-800 dark:text-grid-300",
                  }
                : undefined
            }
          />

          <Kpi
            loading={queueLoading}
            label="15 min queue"
            value={queue?.queue_15min}
            hint={queueError ? "Unavailable" : "Predicted vehicles"}
            icon={Activity}
            tone="blue"
          />

          <Kpi
            loading={queueLoading}
            label="Peak queue"
            value={queue?.peak_hour_queue}
            hint={queueError ? "Unavailable" : "Expected peak"}
            icon={TrendingUp}
            tone="red"
          />

          <Kpi
            loading={demandLoading}
            label="Peak demand"
            value={demandStats ? demandStats.max.toFixed(1) : undefined}
            unit="kWh"
            hint={
              demandError
                ? "Unavailable"
                : demandStats
                  ? demandStats.flat
                    ? "Steady all day"
                    : `Around ${demandStats.maxHour}`
                  : "Next 24 hours"
            }
            icon={Zap}
            tone="green"
          />
        </section>

        {/* =====================================================
            BEST TIME STRIP
        ===================================================== */}

        {demandStats && (
          <section className="flex flex-col gap-4 rounded-2xl border border-teal-100 bg-teal-50/60 p-5 dark:border-volt-400/15 dark:bg-volt-400/5 sm:flex-row sm:items-center">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-volt-400/15 dark:text-volt-300">
              <Sunrise size={20} />
            </div>

            <div className="flex-1">
              {demandStats.flat ? (
                <>
                  <p className={`text-sm font-bold ${HEADING}`}>
                    No clear quiet or busy time yet
                  </p>

                  <p className={`mt-1 text-xs leading-5 ${BODY}`}>
                    The forecast stays at about{" "}
                    <span className="font-semibold">
                      {demandStats.max.toFixed(1)} kWh
                    </span>{" "}
                    for the next 24 hours, so no hour stands out. This usually
                    means there isn't enough charging history for this
                    station yet.
                  </p>
                </>
              ) : (
                <>
                  <p className={`text-sm font-bold ${HEADING}`}>
                    Quietest time to charge{" "}
                    {activeStation ? `at ${activeStation.name}` : ""}
                  </p>

                  <p className={`mt-1 text-xs leading-5 ${BODY}`}>
                    Lowest predicted demand is around{" "}
                    <span className="font-semibold">{demandStats.minHour}</span>{" "}
                    ({demandStats.min.toFixed(1)} kWh), and the busiest period
                    is around{" "}
                    <span className="font-semibold">{demandStats.maxHour}</span>{" "}
                    ({demandStats.max.toFixed(1)} kWh).
                  </p>
                </>
              )}
            </div>
          </section>
        )}

        {/* =====================================================
            CHARTS
        ===================================================== */}

        <section className="grid gap-6 lg:grid-cols-2">
          <ChartPanel
            eyebrow="Energy"
            title="Electricity demand forecast"
            subtitle="Next 24 hours"
            icon={TrendingUp}
            tone="green"
            loading={demandLoading}
            error={demandError}
            onRetry={() => refetchDemand()}
            loadingText="Generating demand forecast..."
            errorText="Demand prediction unavailable."
            emptyText="No demand data available."
            hasData={Boolean(demandChart)}
            chartLabel={demandLabel}
          >
            {demandChart && (
              <Line data={demandChart} options={chartTheme.options} />
            )}
          </ChartPanel>

          <ChartPanel
            eyebrow="Congestion"
            title="Queue length forecast"
            subtitle="Short-term, next 2 hours"
            icon={Clock3}
            tone="orange"
            loading={queueLoading}
            error={queueError}
            onRetry={() => refetchQueue()}
            loadingText="Calculating queue forecast..."
            errorText="Queue prediction unavailable."
            emptyText="No queue data available."
            hasData={Boolean(queueChart)}
            chartLabel={queueLabel}
            note={
              queueAllZero
                ? "No vehicles are expected to wait at this station over the next 2 hours, including the peak."
                : queueSteady
                  ? `The queue is expected to stay at ${queueAll[0]} vehicle${queueAll[0] === 1 ? "" : "s"}.`
                  : undefined
            }
          >
            {queueChart && <Line data={queueChart} options={queueOptions} />}
          </ChartPanel>
        </section>

        {/* =====================================================
            HOW PREDICTIONS WORK
        ===================================================== */}

        <section className={`${CARD} overflow-hidden`}>
          <div className="border-b border-slate-100 bg-slate-50/70 p-6 dark:border-grid-700/60 dark:bg-grid-900/40">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-volt-400/10 dark:text-volt-300">
                <BrainCircuit size={20} />
              </div>

              <div>
                <p className={EYEBROW}>Forecasting</p>
                <h2
                  className={`mt-1 font-display text-lg font-bold ${HEADING}`}
                >
                  What the predictions use
                </h2>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4">
            <InfoCard
              title="Queue length"
              text="Looks at past demand, time of day, day of week, holidays, active chargers and booking activity."
            />
            <InfoCard
              title="Waiting time"
              text="Estimates delays from the current queue length and how quickly chargers turn over."
            />
            <InfoCard
              title="Energy demand"
              text="Forecasts electricity use from past charging patterns over rolling time windows."
            />
            <InfoCard
              title="Charger risk"
              text="Looks at usage history, charger age and earlier faults to flag chargers likely to fail."
              last
            />
          </div>

          <p
            className={`border-t border-slate-100 px-6 py-4 text-xs leading-5 dark:border-grid-700/60 ${MUTED}`}
          >
            Forecasts are estimates. They get more reliable as a station builds
            up charging history.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

/* ============================================================
   COMPONENTS
============================================================ */

function Kpi({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone,
  loading,
  badge,
}: {
  label: string;
  value?: number | string;
  unit?: string;
  hint: string;
  icon: ElementType;
  tone: Tone;
  loading: boolean;
  badge?: { text: string; icon: ElementType; className: string };
}) {
  const BadgeIcon = badge?.icon;

  return (
    <div
      className={`${CARD} p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={EYEBROW}>{label}</p>

          {loading ? (
            <Skeleton className="mt-3 h-8 w-16" />
          ) : (
            <p
              className={`mt-2 flex items-baseline gap-1 font-display text-3xl font-bold ${HEADING}`}
            >
              {value ?? "--"}
              {unit && value !== undefined && (
                <span className={`text-sm font-medium ${MUTED}`}>{unit}</span>
              )}
            </p>
          )}
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}
        >
          <Icon size={19} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className={`text-xs ${MUTED}`}>{hint}</p>

        {badge && BadgeIcon && !loading && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
          >
            <BadgeIcon size={11} />
            {badge.text}
          </span>
        )}
      </div>
    </div>
  );
}

function ChartPanel({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  tone,
  loading,
  error,
  onRetry,
  loadingText,
  errorText,
  emptyText,
  hasData,
  chartLabel,
  note,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: ElementType;
  tone: Tone;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  loadingText: string;
  errorText: string;
  emptyText: string;
  hasData: boolean;
  chartLabel: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`${CARD} p-6`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={EYEBROW}>{eyebrow}</p>
          <h2 className={`mt-1 font-display text-lg font-bold ${HEADING}`}>
            {title}
          </h2>
          <p className={`mt-1 text-xs ${MUTED}`}>{subtitle}</p>
        </div>

        <div className={`rounded-lg p-2 ${TONES[tone]}`}>
          <Icon size={18} />
        </div>
      </div>

      <div className="relative mt-6 h-[320px]">
        {loading ? (
          <div
            className="flex h-full flex-col items-center justify-center gap-3"
            role="status"
          >
            <div className="flex h-40 w-full items-end gap-2 px-2" aria-hidden="true">
              {[35, 55, 40, 70, 50, 80, 60, 45, 65, 55].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 animate-pulse rounded-t-md bg-slate-200/70 motion-reduce:animate-none dark:bg-grid-700/50"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <p className={`text-sm ${MUTED}`}>{loadingText}</p>
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-center">
            <div role="alert">
              <AlertCircle
                size={30}
                className="mx-auto text-red-500 dark:text-red-400"
              />
              <p className={`mt-3 text-sm ${BODY}`}>{errorText}</p>
              <button
                type="button"
                onClick={onRetry}
                className={`mt-3 inline-flex items-center gap-1.5 rounded text-sm font-semibold text-teal-700 dark:text-volt-300 ${FOCUS}`}
              >
                <RefreshCw size={14} />
                Try again
              </button>
            </div>
          </div>
        ) : hasData ? (
          <div role="img" aria-label={chartLabel} className="h-full">
            {children}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className={`text-sm ${MUTED}`}>{emptyText}</p>
          </div>
        )}
      </div>

      {note && !loading && !error && hasData && (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600 dark:bg-grid-900/60 dark:text-grid-300">
          {note}
        </p>
      )}
    </div>
  );
}

function InfoCard({
  title,
  text,
  last = false,
}: {
  title: string;
  text: string;
  last?: boolean;
}) {
  return (
    <div
      className={`p-6 ${
        last
          ? ""
          : "border-b border-slate-100 dark:border-grid-700/60 md:border-r lg:border-b-0"
      }`}
    >
      <p className={`text-sm font-semibold ${HEADING}`}>{title}</p>
      <p className={`mt-2 text-sm leading-6 ${MUTED}`}>{text}</p>
    </div>
  );
}