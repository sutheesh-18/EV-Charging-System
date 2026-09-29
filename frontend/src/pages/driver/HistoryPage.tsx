import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BatteryCharging,
  CalendarDays,
  CheckCircle2,
  Clock3,
  History,
  MapPin,
  Search,
  XCircle,
  Zap,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { api } from "../../api/client";
import type { Booking } from "../../types";

function formatDate(value?: string) {
  if (!value) return "Unknown date";

  return new Date(value).toLocaleString("en-IN", {
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
      return "bg-volt-500/10 text-volt-400";

    case "cancelled":
      return "bg-red-500/10 text-red-400";

    case "no_show":
      return "bg-amber-500/10 text-amber-400";

    default:
      return "bg-grid-800 text-grid-400";
  }
}

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const {
    data: bookings = [],
    isLoading,
    isError,
  } = useQuery<Booking[]>({
    queryKey: ["bookings"],
    queryFn: async () => {
      const response = await api.get("/bookings/me");
      return response.data;
    },
  });

  const history = useMemo(() => {
    let result = bookings.filter(
      (booking) =>
        booking.status === "completed" ||
        booking.status === "cancelled" ||
        booking.status === "no_show",
    );

    if (filter !== "all") {
      result = result.filter(
        (booking) => booking.status === filter,
      );
    }

    if (search.trim()) {
      const query = search.toLowerCase();

      result = result.filter(
        (booking) =>
          String(booking.id).includes(query) ||
          String(booking.station_id).includes(query) ||
          String(booking.charger_id).includes(query),
      );
    }

    return result.sort(
      (a, b) =>
        new Date(b.slot_start).getTime() -
        new Date(a.slot_start).getTime(),
    );
  }, [bookings, filter, search]);

  const completedCount = bookings.filter(
    (booking) => booking.status === "completed",
  ).length;

  const cancelledCount = bookings.filter(
    (booking) => booking.status === "cancelled",
  ).length;

  const noShowCount = bookings.filter(
    (booking) => booking.status === "no_show",
  ).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">

          <div>
            <div className="flex items-center gap-2">
              <History
                size={18}
                className="text-volt-400"
              />

              <p className="label-eyebrow">
                Charging activity
              </p>
            </div>

            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-grid-50">
              Charging history
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-grid-300">
              Review your previous charging reservations and
              track your charging activity over time.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-grid-800 bg-grid-900/60 px-4 py-3">

            <BatteryCharging
              size={18}
              className="text-volt-400"
            />

            <div>
              <p className="text-[10px] uppercase tracking-wider text-grid-400">
                Total sessions
              </p>

              <p className="font-display text-xl font-bold text-grid-50">
                {completedCount}
              </p>
            </div>

          </div>

        </div>

        {/* =====================================================
            SUMMARY CARDS
        ===================================================== */}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">

          <SummaryCard
            icon={CheckCircle2}
            label="Completed"
            value={completedCount}
            detail="Successful sessions"
            type="success"
          />

          <SummaryCard
            icon={XCircle}
            label="Cancelled"
            value={cancelledCount}
            detail="Cancelled bookings"
            type="danger"
          />

          <SummaryCard
            icon={Clock3}
            label="No shows"
            value={noShowCount}
            detail="Missed reservations"
            type="warning"
          />

        </div>

        {/* =====================================================
            FILTER BAR
        ===================================================== */}

        <div className="card mb-5 p-4">

          <div className="flex flex-col gap-3 md:flex-row">

            <div className="relative flex-1">

              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-grid-400"
              />

              <input
                className="input-field pl-10"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search booking, station or charger..."
              />

            </div>

            <select
              className="input-field md:w-48"
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value)
              }
            >
              <option value="all">
                All history
              </option>

              <option value="completed">
                Completed
              </option>

              <option value="cancelled">
                Cancelled
              </option>

              <option value="no_show">
                No show
              </option>
            </select>

          </div>

        </div>

        {/* =====================================================
            LOADING
        ===================================================== */}

        {isLoading && (
          <div className="card flex min-h-[300px] items-center justify-center">

            <div className="text-center">

              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-grid-700 border-t-volt-400" />

              <p className="mt-4 text-sm text-grid-300">
                Loading charging history...
              </p>

            </div>

          </div>
        )}

        {/* =====================================================
            ERROR
        ===================================================== */}

        {isError && (
          <div className="card border-red-500/20 p-6">

            <div className="flex items-start gap-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                <XCircle size={21} />
              </div>

              <div>

                <h2 className="font-display font-semibold text-grid-100">
                  Unable to load charging history
                </h2>

                <p className="mt-1 text-sm leading-6 text-grid-300">
                  Please check that the backend is running and
                  try again.
                </p>

              </div>

            </div>

          </div>
        )}

        {/* =====================================================
            EMPTY STATE
        ===================================================== */}

        {!isLoading &&
          !isError &&
          history.length === 0 && (
            <div className="card flex min-h-[360px] items-center justify-center p-8">

              <div className="max-w-md text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-volt-400/10 text-volt-400">
                  <History size={30} />
                </div>

                <h2 className="mt-5 font-display text-xl font-bold text-grid-50">
                  No charging history found
                </h2>

                <p className="mt-2 text-sm leading-6 text-grid-300">
                  Completed and cancelled charging reservations
                  will appear here.
                </p>

                <a
                  href="/map"
                  className="btn-primary mt-6 inline-flex"
                >
                  Find a charging station
                </a>

              </div>

            </div>
          )}

        {/* =====================================================
            DESKTOP TABLE
        ===================================================== */}

        {!isLoading &&
          !isError &&
          history.length > 0 && (
            <>

              <div className="card hidden overflow-hidden md:block">

                <div className="border-b border-grid-800 px-6 py-5">

                  <div className="flex items-center justify-between">

                    <div>
                      <p className="label-eyebrow">
                        Session records
                      </p>

                      <h2 className="mt-1 font-display text-lg font-semibold text-grid-50">
                        Previous charging activity
                      </h2>
                    </div>

                    <span className="text-xs text-grid-400">
                      {history.length} record
                      {history.length !== 1 ? "s" : ""}
                    </span>

                  </div>

                </div>

                <div className="overflow-x-auto">

                  <table className="w-full text-left text-sm">

                    <thead className="bg-grid-950/50 text-[11px] uppercase tracking-wider text-grid-400">

                      <tr>

                        <th className="px-6 py-4">
                          Booking
                        </th>

                        <th className="px-6 py-4">
                          Station
                        </th>

                        <th className="px-6 py-4">
                          Charger
                        </th>

                        <th className="px-6 py-4">
                          Date & time
                        </th>

                        <th className="px-6 py-4">
                          Status
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {history.map((booking) => (

                        <tr
                          key={booking.id}
                          className="border-t border-grid-800 transition hover:bg-grid-900/40"
                        >

                          <td className="px-6 py-4">

                            <span className="font-mono text-xs text-grid-400">
                              #{booking.id}
                            </span>

                          </td>

                          <td className="px-6 py-4">

                            <div className="flex items-center gap-3">

                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-volt-400/10 text-volt-400">
                                <MapPin size={16} />
                              </div>

                              <div>

                                <p className="font-medium text-grid-200">
                                  Station #{booking.station_id}
                                </p>

                                <p className="mt-0.5 text-xs text-grid-400">
                                  EV charging station
                                </p>

                              </div>

                            </div>

                          </td>

                          <td className="px-6 py-4">

                            <div className="flex items-center gap-2 text-grid-300">

                              <Zap
                                size={15}
                                className="text-volt-400"
                              />

                              Charger #{booking.charger_id}

                            </div>

                          </td>

                          <td className="px-6 py-4">

                            <div className="flex items-center gap-2">

                              <CalendarDays
                                size={15}
                                className="text-grid-400"
                              />

                              <span className="text-grid-300">
                                {formatDate(
                                  booking.slot_start,
                                )}
                              </span>

                            </div>

                          </td>

                          <td className="px-6 py-4">

                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                                booking.status,
                              )}`}
                            >
                              {statusLabel(
                                booking.status,
                              )}
                            </span>

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              </div>

              {/* =================================================
                  MOBILE CARDS
              ================================================= */}

              <div className="space-y-3 md:hidden">

                {history.map((booking) => (

                  <div
                    key={booking.id}
                    className="card p-5"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-volt-400/10 text-volt-400">
                          <Zap size={18} />
                        </div>

                        <div>

                          <p className="font-display font-semibold text-grid-100">
                            Station #{booking.station_id}
                          </p>

                          <p className="mt-0.5 font-mono text-[11px] text-grid-400">
                            Booking #{booking.id}
                          </p>

                        </div>

                      </div>

                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass(
                          booking.status,
                        )}`}
                      >
                        {statusLabel(
                          booking.status,
                        )}
                      </span>

                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">

                      <div className="rounded-xl bg-grid-950/50 p-3">

                        <p className="text-[10px] uppercase tracking-wider text-grid-400">
                          Date
                        </p>

                        <p className="mt-1 text-xs text-grid-300">
                          {formatDate(
                            booking.slot_start,
                          )}
                        </p>

                      </div>

                      <div className="rounded-xl bg-grid-950/50 p-3">

                        <p className="text-[10px] uppercase tracking-wider text-grid-400">
                          Charger
                        </p>

                        <p className="mt-1 text-xs text-grid-300">
                          #{booking.charger_id}
                        </p>

                      </div>

                    </div>

                    {booking.predicted_wait_minutes !=
                      null && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-grid-400">

                        <Clock3 size={14} />

                        Predicted wait at booking:{" "}
                        <span className="font-medium text-grid-300">
                          {booking.predicted_wait_minutes} min
                        </span>

                      </div>
                    )}

                  </div>

                ))}

              </div>

            </>
          )}

      </div>
    </AppShell>
  );
}

/* =============================================================
   SUMMARY CARD
============================================================= */

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  type,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  detail: string;
  type: "success" | "danger" | "warning";
}) {
  const styles = {
    success: "bg-volt-400/10 text-volt-400",
    danger: "bg-red-400/10 text-red-400",
    warning: "bg-amber-400/10 text-amber-400",
  };

  return (
    <div className="card p-5">

      <div className="flex items-center gap-3">

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[type]}`}
        >
          <Icon size={19} />
        </div>

        <div>

          <p className="text-xs uppercase tracking-wider text-grid-400">
            {label}
          </p>

          <p className="mt-1 font-display text-2xl font-bold text-grid-50">
            {value}
          </p>

        </div>

      </div>

      <p className="mt-3 text-xs text-grid-400">
        {detail}
      </p>

    </div>
  );
}