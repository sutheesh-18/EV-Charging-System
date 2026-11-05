import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Clock3, MapPin, PieChart as PieIcon } from "lucide-react";

import { api } from "../../api/client";
import { useTheme } from "../../lib/theme";
import type { Booking } from "../../types";

/* ============================================================
   STYLES
============================================================ */

const CARD =
  "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-grid-700/70 dark:bg-grid-850/90 dark:shadow-card";
const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-grid-400";
const HEADING = "text-slate-900 dark:text-grid-50";
const MUTED = "text-slate-500 dark:text-grid-400";

/* ============================================================
   DATA HELPERS (all numbers come from /bookings/me)
============================================================ */

type Range = 7 | 30 | 90;

const RANGES: { value: Range; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

type Bucket = {
  label: string;
  completed: number;
  cancelled: number;
  no_show: number;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildActivity(bookings: Booking[], range: Range): Bucket[] {
  const bucketDays = range === 7 ? 1 : range === 30 ? 5 : 10;
  const count = range / bucketDays;

  const start = startOfDay(new Date());
  start.setDate(start.getDate() - (range - 1));

  const buckets: Bucket[] = Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i * bucketDays);
    return {
      label:
        bucketDays === 1
          ? d.toLocaleDateString("en-IN", { weekday: "short" })
          : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      completed: 0,
      cancelled: 0,
      no_show: 0,
    };
  });

  for (const booking of bookings) {
    const status = booking.status;
    if (status !== "completed" && status !== "cancelled" && status !== "no_show") {
      continue;
    }
    const time = new Date(booking.slot_start).getTime();
    if (Number.isNaN(time)) continue;

    const index = Math.floor(
      (startOfDay(new Date(time)).getTime() - start.getTime()) /
        (bucketDays * 86400000),
    );
    if (index < 0 || index >= count) continue;

    buckets[index][status] += 1;
  }

  return buckets;
}

/* ============================================================
   CHART THEME
============================================================ */

function useChartColors() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  return {
    text: dark ? "#91A4C2" : "#64748b",
    grid: dark ? "rgba(255,255,255,0.07)" : "#e2e8f0",
    completed: dark ? "#22e08c" : "#0d9488",
    cancelled: "#ef4444",
    noShow: "#f59e0b",
    line: dark ? "#54f7a8" : "#0f766e",
    cursor: dark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)",
  };
}

type TooltipPayload = {
  name?: string | number;
  value?: number | string;
  color?: string;
};

function ChartTooltip({
  active,
  payload,
  label,
  unit = "",
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-grid-700 dark:bg-grid-900">
      {label !== undefined && (
        <p className={`mb-1 font-semibold ${HEADING}`}>{label}</p>
      )}
      {payload.map((entry) => (
        <p
          key={String(entry.name)}
          className="flex items-center gap-2 text-slate-600 dark:text-grid-300"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}: <span className={`font-semibold ${HEADING}`}>{entry.value}{unit}</span>
        </p>
      ))}
    </div>
  );
}

/* ============================================================
   SECTION
============================================================ */

export default function ActivityCharts() {
  const [range, setRange] = useState<Range>(30);
  const colors = useChartColors();

  // same query key as the History page, so the data is shared and cached
  const {
    data,
    isLoading,
    isError,
  } = useQuery<Booking[]>({
    queryKey: ["bookings"],
    queryFn: async () => (await api.get("/bookings/me")).data,
  });

  // be defensive: an unexpected response shape must never crash the dashboard
  const bookings = useMemo<Booking[]>(
    () => (Array.isArray(data) ? data : []),
    [data],
  );

  const activity = useMemo(() => buildActivity(bookings, range), [bookings, range]);

  const totals = useMemo(() => {
    const completed = bookings.filter((b) => b.status === "completed").length;
    const cancelled = bookings.filter((b) => b.status === "cancelled").length;
    const noShow = bookings.filter((b) => b.status === "no_show").length;
    const total = completed + cancelled + noShow;
    return {
      completed,
      cancelled,
      noShow,
      total,
      rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [bookings]);

  const rangeCompleted = activity.reduce((sum, b) => sum + b.completed, 0);
  const rangeTotal = activity.reduce(
    (sum, b) => sum + b.completed + b.cancelled + b.no_show,
    0,
  );

  const waitTrend = useMemo(() => {
    return bookings
      .filter(
        (b) =>
          b.predicted_wait_minutes != null &&
          !Number.isNaN(new Date(b.slot_start).getTime()),
      )
      .sort(
        (a, b) =>
          new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime(),
      )
      .slice(-12)
      .map((b) => ({
        label: new Date(b.slot_start).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        }),
        wait: Number(b.predicted_wait_minutes),
      }));
  }, [bookings]);

  const avgWait =
    waitTrend.length > 0
      ? Math.round(waitTrend.reduce((s, p) => s + p.wait, 0) / waitTrend.length)
      : undefined;

  const topStations = useMemo(() => {
    const counts = new Map<number, number>();
    for (const b of bookings) {
      if (b.status !== "completed") continue;
      counts.set(b.station_id, (counts.get(b.station_id) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([id, sessions]) => ({ id, sessions }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5);
  }, [bookings]);

  const outcomes = [
    { name: "Completed", value: totals.completed, color: colors.completed },
    { name: "Cancelled", value: totals.cancelled, color: colors.cancelled },
    { name: "No show", value: totals.noShow, color: colors.noShow },
  ];

  const axisTick = { fill: colors.text, fontSize: 11 };

  return (
    <section aria-label="Charging activity">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={EYEBROW}>Charging activity</p>
          <h2 className={`mt-1 font-display text-xl font-bold ${HEADING}`}>
            Your charging at a glance
          </h2>
        </div>

        {/* range switch */}
        <div
          role="group"
          aria-label="Time range"
          className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-grid-700 dark:bg-grid-900/60"
        >
          {RANGES.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={range === item.value}
              onClick={() => setRange(item.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                range === item.value
                  ? "bg-teal-700 text-white dark:bg-volt-500 dark:text-grid-950"
                  : "text-slate-500 hover:text-slate-900 dark:text-grid-300 dark:hover:text-grid-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {isError && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          Unable to load your charging activity right now.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {/* ---------- sessions over time ---------- */}
        <ChartCard
          icon={BarChart3}
          title="Sessions over time"
          subtitle={
            isLoading
              ? "Loading…"
              : `${rangeCompleted} completed of ${rangeTotal} in the last ${range} days`
          }
        >
          {isLoading ? (
            <ChartSkeleton />
          ) : rangeTotal === 0 ? (
            <EmptyChart text="No sessions in this period yet. Completed, cancelled and missed bookings will appear here." />
          ) : (
            <>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activity} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke={colors.grid} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={axisTick}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={axisTick}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: colors.cursor }}
                      content={<ChartTooltip />}
                    />
                    <Bar dataKey="completed" name="Completed" stackId="a" fill={colors.completed} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="cancelled" name="Cancelled" stackId="a" fill={colors.cancelled} />
                    <Bar dataKey="no_show" name="No show" stackId="a" fill={colors.noShow} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <Legend
                items={[
                  { label: "Completed", color: colors.completed },
                  { label: "Cancelled", color: colors.cancelled },
                  { label: "No show", color: colors.noShow },
                ]}
              />
            </>
          )}
        </ChartCard>

        {/* ---------- outcomes donut ---------- */}
        <ChartCard
          icon={PieIcon}
          title="Booking outcomes"
          subtitle="All time"
        >
          {isLoading ? (
            <ChartSkeleton />
          ) : totals.total === 0 ? (
            <EmptyChart text="Your completion rate will show here after your first booking." />
          ) : (
            <>
              <div className="relative mx-auto h-52 w-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={outcomes}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={64}
                      outerRadius={90}
                      paddingAngle={totals.total > 0 ? 3 : 0}
                      stroke="none"
                    >
                      {outcomes.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className={`font-display text-3xl font-bold ${HEADING}`}>
                    {totals.rate}%
                  </p>
                  <p className={`text-xs ${MUTED}`}>completion</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {outcomes.map((o) => (
                  <div
                    key={o.name}
                    className="rounded-lg bg-slate-50 px-2 py-2 dark:bg-grid-900/60"
                  >
                    <p className={`text-base font-bold ${HEADING}`}>{o.value}</p>
                    <p className="flex items-center justify-center gap-1 text-[10px] text-slate-500 dark:text-grid-400">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: o.color }}
                      />
                      {o.name}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>

        {/* ---------- predicted wait trend ---------- */}
        <ChartCard
          icon={Clock3}
          title="Predicted wait at booking"
          subtitle={
            avgWait !== undefined
              ? `Average ${avgWait} min across your last ${waitTrend.length} bookings`
              : "Queue forecast the AI made when you booked"
          }
        >
          {isLoading ? (
            <ChartSkeleton />
          ) : waitTrend.length === 0 ? (
            <EmptyChart text="No wait predictions recorded yet. They are saved with each booking." />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={waitTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="waitFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.line} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={colors.line} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip unit=" min" />} />
                  <Area
                    type="monotone"
                    dataKey="wait"
                    name="Wait"
                    stroke={colors.line}
                    strokeWidth={2.5}
                    fill="url(#waitFill)"
                    dot={{ r: 3, fill: colors.line, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* ---------- most used stations ---------- */}
        <ChartCard
          icon={MapPin}
          title="Most used stations"
          subtitle="By completed sessions"
        >
          {isLoading ? (
            <ChartSkeleton />
          ) : topStations.length === 0 ? (
            <EmptyChart text="Your favourite stations will appear after you complete a session." />
          ) : (
            <ul className="space-y-4 py-1">
              {topStations.map((station, index) => {
                const max = topStations[0].sessions;
                return (
                  <li key={station.id}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className={`flex items-center gap-2 font-medium ${HEADING}`}>
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-50 text-[11px] font-bold text-teal-700 dark:bg-volt-500/15 dark:text-volt-300">
                          {index + 1}
                        </span>
                        Station #{station.id}
                      </span>
                      <span className={`text-xs ${MUTED}`}>
                        {station.sessions} session{station.sessions !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-grid-700">
                      <div
                        className="h-full rounded-full bg-teal-500 transition-all duration-700 dark:bg-volt-400"
                        style={{ width: `${(station.sessions / max) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ChartCard>
      </div>
    </section>
  );
}

/* ============================================================
   SMALL PIECES
============================================================ */

function ChartCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof BarChart3;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className={`${CARD} p-6`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={`font-display text-base font-bold ${HEADING}`}>{title}</h3>
          <p className={`mt-1 text-xs ${MUTED}`}>{subtitle}</p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-volt-500/15 dark:text-volt-300">
          <Icon size={17} />
        </div>
      </div>

      {children}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-4">
      {items.map((item) => (
        <span
          key={item.label}
          className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-grid-400"
        >
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex h-56 items-end gap-2">
      {[40, 65, 30, 80, 55, 70, 45, 60].map((h, i) => (
        <div
          key={i}
          className="flex-1 animate-pulse rounded-t-md bg-slate-200/80 dark:bg-grid-700/60"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center dark:border-grid-600 dark:bg-grid-900/40">
      <p className={`max-w-xs text-xs leading-5 ${MUTED}`}>{text}</p>
    </div>
  );
}