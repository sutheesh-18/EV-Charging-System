import { useMemo, useState, type ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  BatteryCharging,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  History,
  MapPin,
  RefreshCw,
  Search,
  XCircle,
  Zap,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { api } from "../../api/client";
import type { Booking } from "../../types";

/* ============================================================
   SHARED STYLES (light + dark)
============================================================ */

const CARD =
  "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-grid-700/70 dark:bg-grid-850/90 dark:shadow-card";
const PANEL =
  "rounded-xl bg-slate-50 dark:bg-grid-900/60";
const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-grid-400";
const HEADING = "text-slate-900 dark:text-grid-50";
const BODY = "text-slate-600 dark:text-grid-300";
const MUTED = "text-slate-500 dark:text-grid-400";
const INPUT =
  "w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-grid-600 dark:bg-grid-900/90 dark:text-grid-50 dark:placeholder:text-grid-400 dark:focus:border-volt-500 dark:focus:ring-volt-500/20";

const PAGE_SIZE = 10;

type Filter = "all" | "completed" | "cancelled" | "no_show";

/* ============================================================
   HELPERS
============================================================ */

function formatDate(value?: string) {
  if (!value) return "Unknown date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusLabel(status?: string) {
  if (!status) return "Unknown";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status?: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 dark:bg-volt-500/10 dark:text-volt-400";
    case "cancelled":
      return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
    case "no_show":
      return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-grid-800 dark:text-grid-400";
  }
}

function csvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(rows: Booking[]) {
  const header = [
    "booking_id",
    "station_id",
    "charger_id",
    "date",
    "status",
    "predicted_wait_minutes",
  ];

  const lines = rows.map((b) =>
    [
      b.id,
      b.station_id,
      b.charger_id,
      b.slot_start,
      b.status,
      b.predicted_wait_minutes ?? "",
    ]
      .map(csvCell)
      .join(","),
  );

  const blob = new Blob([[header.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "voltgrid-charging-history.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/80 dark:bg-grid-700/60 ${className}`}
    />
  );
}

/* ============================================================
   PAGE
============================================================ */

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery<Booking[]>({
    queryKey: ["bookings"],
    queryFn: async () => {
      const response = await api.get("/bookings/me");
      return response.data;
    },
  });

  const bookings = useMemo<Booking[]>(
    () => (Array.isArray(data) ? data : []),
    [data],
  );

  /* all finished bookings (before filter/search) */
  const finished = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.status === "completed" ||
          booking.status === "cancelled" ||
          booking.status === "no_show",
      ),
    [bookings],
  );

  const history = useMemo(() => {
    let result = finished;

    if (filter !== "all") {
      result = result.filter((booking) => booking.status === filter);
    }

    if (search.trim()) {
      const query = search.trim().toLowerCase();

      result = result.filter(
        (booking) =>
          String(booking.id).includes(query) ||
          String(booking.station_id).includes(query) ||
          String(booking.charger_id).includes(query),
      );
    }

    return [...result].sort(
      (a, b) =>
        new Date(b.slot_start).getTime() - new Date(a.slot_start).getTime(),
    );
  }, [finished, filter, search]);

  const completedCount = finished.filter((b) => b.status === "completed").length;
  const cancelledCount = finished.filter((b) => b.status === "cancelled").length;
  const noShowCount = finished.filter((b) => b.status === "no_show").length;
  const completionRate =
    finished.length > 0
      ? Math.round((completedCount / finished.length) * 100)
      : 0;

  const shown = history.slice(0, visible);
  const hasMore = history.length > visible;

  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: finished.length },
    { value: "completed", label: "Completed", count: completedCount },
    { value: "cancelled", label: "Cancelled", count: cancelledCount },
    { value: "no_show", label: "No show", count: noShowCount },
  ];

  const filtering = filter !== "all" || search.trim() !== "";

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2">
              <History size={18} className="text-teal-700 dark:text-volt-400" />
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-volt-300">
                Charging activity
              </p>
            </div>

            <h1
              className={`mt-2 font-display text-3xl font-bold tracking-tight ${HEADING}`}
            >
              Charging history
            </h1>

            <p className={`mt-2 max-w-2xl text-sm leading-6 ${BODY}`}>
              Review your previous charging reservations and track your
              charging activity over time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-grid-700 dark:bg-grid-900/60">
              <BatteryCharging
                size={18}
                className="text-teal-700 dark:text-volt-400"
              />

              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-grid-400">
                  Total sessions
                </p>

                {isLoading ? (
                  <Skeleton className="mt-1 h-5 w-8" />
                ) : (
                  <p className={`font-display text-xl font-bold ${HEADING}`}>
                    {completedCount}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => downloadCsv(history)}
              disabled={isLoading || history.length === 0}
              className="inline-flex h-[62px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-teal-300 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-grid-700 dark:bg-grid-900/60 dark:text-grid-200 dark:hover:border-volt-500/50 dark:hover:text-volt-300"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </section>

        {/* =====================================================
            SUMMARY CARDS
        ===================================================== */}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            loading={isLoading}
            icon={CheckCircle2}
            label="Completed"
            value={completedCount}
            detail="Successful sessions"
            type="success"
          />
          <SummaryCard
            loading={isLoading}
            icon={XCircle}
            label="Cancelled"
            value={cancelledCount}
            detail="Cancelled bookings"
            type="danger"
          />
          <SummaryCard
            loading={isLoading}
            icon={Clock3}
            label="No shows"
            value={noShowCount}
            detail="Missed reservations"
            type="warning"
          />
          <SummaryCard
            loading={isLoading}
            icon={BatteryCharging}
            label="Completion rate"
            value={`${completionRate}%`}
            detail="Of finished bookings"
            type="info"
          />
        </section>

        {/* =====================================================
            FILTER BAR
        ===================================================== */}

        <section className={`${CARD} p-4`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-grid-400"
              />

              <input
                className={INPUT}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setVisible(PAGE_SIZE);
                }}
                placeholder="Search booking, station or charger..."
                aria-label="Search history"
              />
            </div>

            <div
              role="group"
              aria-label="Filter by status"
              className="flex gap-2 overflow-x-auto pb-1 lg:pb-0"
            >
              {filters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={filter === item.value}
                  onClick={() => {
                    setFilter(item.value);
                    setVisible(PAGE_SIZE);
                  }}
                  className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                    filter === item.value
                      ? "border-teal-700 bg-teal-700 text-white dark:border-volt-500 dark:bg-volt-500 dark:text-grid-950"
                      : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700 dark:border-grid-700 dark:bg-grid-900/60 dark:text-grid-300 dark:hover:border-volt-500/50 dark:hover:text-volt-300"
                  }`}
                >
                  {item.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      filter === item.value
                        ? "bg-white/20"
                        : "bg-slate-100 dark:bg-grid-800"
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            LOADING
        ===================================================== */}

        {isLoading && (
          <div className={`${CARD} space-y-3 p-6`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}

        {/* =====================================================
            ERROR
        ===================================================== */}

        {isError && (
          <div className="flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-500/30 dark:bg-red-500/10">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300">
              <XCircle size={21} />
            </div>

            <div className="flex-1">
              <h2 className="font-display font-semibold text-red-900 dark:text-red-200">
                Unable to load charging history
              </h2>

              <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-300/80">
                Please check that the backend is running and try again.
              </p>
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex shrink-0 items-center gap-1.5 self-center text-sm font-semibold text-red-700 dark:text-red-300"
            >
              <RefreshCw size={14} />
              Try again
            </button>
          </div>
        )}

        {/* =====================================================
            EMPTY STATE
        ===================================================== */}

        {!isLoading && !isError && history.length === 0 && (
          <div
            className={`${CARD} flex min-h-[320px] items-center justify-center p-8`}
          >
            <div className="max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-volt-400/10 dark:text-volt-400">
                <History size={30} />
              </div>

              <h2
                className={`mt-5 font-display text-xl font-bold ${HEADING}`}
              >
                {filtering
                  ? "No matching sessions"
                  : "No charging history found"}
              </h2>

              <p className={`mt-2 text-sm leading-6 ${BODY}`}>
                {filtering
                  ? "Try a different search or filter."
                  : "Completed and cancelled charging reservations will appear here."}
              </p>

              {filtering ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                    setVisible(PAGE_SIZE);
                  }}
                  className="mt-6 inline-flex rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700 dark:border-grid-600 dark:text-grid-200 dark:hover:border-volt-500/50 dark:hover:text-volt-300"
                >
                  Clear filters
                </button>
              ) : (
                <Link
                  to="/map"
                  className="mt-6 inline-flex rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 dark:bg-volt-500 dark:text-grid-950 dark:hover:bg-volt-400"
                >
                  Find a charging station
                </Link>
              )}
            </div>
          </div>
        )}

        {/* =====================================================
            DESKTOP TABLE
        ===================================================== */}

        {!isLoading && !isError && history.length > 0 && (
          <>
            <section className={`${CARD} hidden overflow-hidden md:block`}>
              <div className="border-b border-slate-100 px-6 py-5 dark:border-grid-700/60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={EYEBROW}>Session records</p>
                    <h2
                      className={`mt-1 font-display text-lg font-semibold ${HEADING}`}
                    >
                      Previous charging activity
                    </h2>
                  </div>

                  <span className={`text-xs ${MUTED}`}>
                    Showing {shown.length} of {history.length} record
                    {history.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 dark:bg-grid-950/50 dark:text-grid-400">
                    <tr>
                      <th className="px-6 py-4">Booking</th>
                      <th className="px-6 py-4">Station</th>
                      <th className="px-6 py-4">Charger</th>
                      <th className="px-6 py-4">Date & time</th>
                      <th className="px-6 py-4">Predicted wait</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {shown.map((booking) => (
                      <tr
                        key={booking.id}
                        className="border-t border-slate-100 transition hover:bg-slate-50 dark:border-grid-700/60 dark:hover:bg-grid-900/40"
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-slate-500 dark:text-grid-400">
                            #{booking.id}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-volt-400/10 dark:text-volt-400">
                              <MapPin size={16} />
                            </div>

                            <div>
                              <p
                                className={`font-medium ${HEADING}`}
                              >
                                Station #{booking.station_id}
                              </p>
                              <p className={`mt-0.5 text-xs ${MUTED}`}>
                                EV charging station
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className={`flex items-center gap-2 ${BODY}`}>
                            <Zap
                              size={15}
                              className="text-teal-600 dark:text-volt-400"
                            />
                            Charger #{booking.charger_id}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <CalendarDays
                              size={15}
                              className="text-slate-400 dark:text-grid-400"
                            />
                            <span className={BODY}>
                              {formatDate(booking.slot_start)}
                            </span>
                          </div>
                        </td>

                        <td className={`px-6 py-4 ${BODY}`}>
                          {booking.predicted_wait_minutes != null
                            ? `${booking.predicted_wait_minutes} min`
                            : "--"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(booking.status)}`}
                          >
                            {statusLabel(booking.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* =================================================
                MOBILE CARDS
            ================================================= */}

            <section className="space-y-3 md:hidden">
              <p className={`text-xs ${MUTED}`}>
                Showing {shown.length} of {history.length} record
                {history.length !== 1 ? "s" : ""}
              </p>

              {shown.map((booking) => (
                <div key={booking.id} className={`${CARD} p-5`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-volt-400/10 dark:text-volt-400">
                        <Zap size={18} />
                      </div>

                      <div>
                        <p
                          className={`font-display font-semibold ${HEADING}`}
                        >
                          Station #{booking.station_id}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-grid-400">
                          Booking #{booking.id}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass(booking.status)}`}
                    >
                      {statusLabel(booking.status)}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className={`${PANEL} p-3`}>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-grid-400">
                        Date
                      </p>
                      <p className={`mt-1 text-xs ${BODY}`}>
                        {formatDate(booking.slot_start)}
                      </p>
                    </div>

                    <div className={`${PANEL} p-3`}>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-grid-400">
                        Charger
                      </p>
                      <p className={`mt-1 text-xs ${BODY}`}>
                        #{booking.charger_id}
                      </p>
                    </div>
                  </div>

                  {booking.predicted_wait_minutes != null && (
                    <div
                      className={`mt-3 flex items-center gap-2 text-xs ${MUTED}`}
                    >
                      <Clock3 size={14} />
                      Predicted wait at booking:{" "}
                      <span className={`font-medium ${BODY}`}>
                        {booking.predicted_wait_minutes} min
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </section>

            {hasMore && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisible((count) => count + PAGE_SIZE)}
                  className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700 dark:border-grid-700 dark:bg-grid-900/60 dark:text-grid-200 dark:hover:border-volt-500/50 dark:hover:text-volt-300"
                >
                  Show more ({history.length - visible} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

/* ============================================================
   SUMMARY CARD
============================================================ */

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  type,
  loading,
}: {
  icon: ElementType;
  label: string;
  value: number | string;
  detail: string;
  type: "success" | "danger" | "warning" | "info";
  loading: boolean;
}) {
  const styles = {
    success: "bg-emerald-50 text-emerald-700 dark:bg-volt-400/10 dark:text-volt-400",
    danger: "bg-red-50 text-red-600 dark:bg-red-400/10 dark:text-red-400",
    warning: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
    info: "bg-blue-50 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
  };

  return (
    <div
      className={`${CARD} p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[type]}`}
        >
          <Icon size={19} />
        </div>

        <div>
          <p className={EYEBROW}>{label}</p>

          {loading ? (
            <Skeleton className="mt-1.5 h-7 w-12" />
          ) : (
            <p className={`mt-1 font-display text-2xl font-bold ${HEADING}`}>
              {value}
            </p>
          )}
        </div>
      </div>

      <p className={`mt-3 text-xs ${MUTED}`}>{detail}</p>
    </div>
  );
}