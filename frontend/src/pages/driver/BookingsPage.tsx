import { useEffect, useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link } from "react-router-dom";

import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPin,
  QrCode,
  RefreshCw,
  TicketCheck,
  XCircle,
  Zap,
  X,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { api } from "../../api/client";
import type { Booking } from "../../types";

type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"
  | string;

type BookingView = Omit<
  Booking,
  "slot_end" | "qr_code" | "created_at" | "predicted_wait_minutes"
> & {
  slot_end?: string;
  qr_code?: string | null;
  created_at?: string;
  predicted_wait_minutes?: number | null;
};

/* ============================================================
   THEME TOKENS (light first, dark: overrides)
   Shared class strings so light/dark pairs live in one place.
============================================================ */

const ui = {
  title: "text-grid-900 dark:text-grid-50",
  strong: "text-grid-800 dark:text-grid-100",
  body: "text-grid-600 dark:text-grid-300",
  muted: "text-grid-500 dark:text-grid-400",
  label:
    "text-xs font-bold uppercase tracking-wider text-grid-500 dark:text-grid-400",
  accentText: "text-volt-700 dark:text-volt-300",
  accentIcon: "text-volt-600 dark:text-volt-400",
  accentTile:
    "bg-volt-500/10 text-volt-600 dark:bg-volt-400/10 dark:text-volt-400",
  border: "border-grid-200 dark:border-grid-700",
  panel: "bg-white dark:bg-grid-900",
  inset: "bg-grid-50 dark:bg-grid-900/40",
  skeleton: "bg-grid-200 dark:bg-grid-800",
  focus:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-volt-400 dark:focus-visible:ring-offset-grid-950",
};

/* ============================================================
   DATE HELPERS
============================================================ */

function formatDate(value?: string | null) {
  if (!value) return "Not scheduled";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatTimeRange(
  start?: string | null,
  end?: string | null,
) {
  if (!start) return "Not scheduled";

  const startDate = new Date(start);

  if (Number.isNaN(startDate.getTime())) {
    return "Invalid time";
  }

  const startText = startDate.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (!end) return startText;

  const endDate = new Date(end);

  if (Number.isNaN(endDate.getTime())) {
    return startText;
  }

  const endText = endDate.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${startText} → ${endText}`;
}

/* ============================================================
   STATUS
============================================================ */

function getStatusLabel(status?: BookingStatus) {
  if (!status) return "Unknown";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusClass(status?: BookingStatus) {
  switch (status) {
    case "confirmed":
      return "bg-volt-500/15 text-volt-700 dark:text-volt-300";

    case "pending":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";

    case "in_progress":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-300";

    case "completed":
      return "bg-grid-100 text-grid-700 dark:bg-grid-700 dark:text-grid-200";

    case "cancelled":
    case "no_show":
      return "bg-red-500/15 text-red-700 dark:text-red-300";

    default:
      return "bg-grid-100 text-grid-700 dark:bg-grid-700 dark:text-grid-200";
  }
}

function canCancel(status: BookingStatus) {
  return status === "pending" || status === "confirmed";
}

/* ============================================================
   QR MODAL
============================================================ */

function BookingQrModal({
  booking,
  onClose,
}: {
  booking: BookingView;
  onClose: () => void;
}) {
  // Close on Escape (presentation/accessibility only)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-grid-950/60 p-4 backdrop-blur-sm dark:bg-black/70"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
        className={`relative w-full max-w-md rounded-3xl border p-6 shadow-2xl ${ui.border} ${ui.panel}`}
      >
        {/* CLOSE */}

        <button
          type="button"
          onClick={onClose}
          className={`absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl transition hover:bg-grid-100 hover:text-grid-900 dark:hover:bg-grid-800 dark:hover:text-grid-50 ${ui.body} ${ui.focus}`}
          aria-label="Close QR code"
        >
          <X size={18} />
        </button>

        <div className="text-center">
          <div
            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl ${ui.accentTile}`}
          >
            <QrCode size={22} />
          </div>

          <p
            className={`mt-4 text-xs font-bold uppercase tracking-widest ${ui.accentText}`}
          >
            Charging pass
          </p>

          <h2
            id="qr-modal-title"
            className={`mt-2 font-display text-xl font-bold ${ui.title}`}
          >
            Booking #{booking.id}
          </h2>

          <p className={`mt-1 text-sm font-medium ${ui.body}`}>
            Show this QR code at the charging station.
          </p>

          {booking.qr_code ? (
            <div
              className={`mx-auto mt-6 w-fit rounded-2xl border bg-white p-3 ${ui.border}`}
            >
              <img
                src={booking.qr_code}
                alt={`QR code for booking ${booking.id}`}
                className="h-56 w-56 object-contain"
              />
            </div>
          ) : (
            <div
              className={`mx-auto mt-6 flex h-56 w-56 items-center justify-center rounded-2xl border border-dashed bg-grid-50 text-center dark:bg-grid-950 ${ui.border}`}
            >
              <div className="px-6">
                <QrCode size={36} className={`mx-auto ${ui.body}`} />

                <p className={`mt-3 text-sm font-medium ${ui.body}`}>
                  QR code is not available for this booking.
                </p>
              </div>
            </div>
          )}

          <div
            className={`mt-6 rounded-2xl border bg-grid-50 p-4 text-left dark:bg-grid-950/70 ${ui.border}`}
          >
            <p className={ui.label}>Charging session</p>

            <p className={`mt-2 text-sm font-semibold ${ui.strong}`}>
              {formatDate(booking.slot_start)}
            </p>

            <p className={`mt-1 text-xs font-medium ${ui.muted}`}>
              {formatTimeRange(booking.slot_start, booking.slot_end)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SKELETONS
============================================================ */

function Bar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md motion-reduce:animate-none ${ui.skeleton} ${className}`}
    />
  );
}

function SummarySkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <Bar className="h-3 w-24" />
          <Bar className="h-7 w-12" />
        </div>
        <Bar className="h-10 w-10 rounded-xl" />
      </div>
    </div>
  );
}

function BookingCardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <Bar className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="space-y-3">
            <Bar className="h-5 w-56" />
            <Bar className="h-4 w-40" />
          </div>
        </div>
        <div className="space-y-2">
          <Bar className="h-3 w-16" />
          <Bar className="h-4 w-12" />
        </div>
      </div>

      <div className={`border-t px-6 py-5 ${ui.border} ${ui.inset}`}>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <Bar className="h-3 w-20" />
              <Bar className="h-4 w-32" />
              <Bar className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>

      <div
        className={`flex items-center justify-between border-t px-6 py-4 ${ui.border}`}
      >
        <Bar className="h-4 w-36" />
        <div className="flex gap-2">
          <Bar className="h-9 w-24 rounded-xl" />
          <Bar className="h-9 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN PAGE
============================================================ */

export default function BookingsPage() {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<
    "all" | BookingStatus
  >("all");

  const [selectedBooking, setSelectedBooking] =
    useState<BookingView | null>(null);

  /* ============================================================
     LOAD BOOKINGS
  ============================================================ */

  const {
    data: bookings = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery<BookingView[]>({
    queryKey: ["bookings"],

    queryFn: async () => {
      const response = await api.get("/bookings/me");

      return Array.isArray(response.data) ? response.data : [];
    },

    refetchInterval: 30000,
    staleTime: 10000,
  });

  /* ============================================================
     CANCEL BOOKING
  ============================================================ */

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const response = await api.post(
        `/bookings/${bookingId}/cancel`,
      );

      return response.data as BookingView;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["bookings"],
      });

      queryClient.invalidateQueries({
        queryKey: ["station-queue"],
      });

      queryClient.invalidateQueries({
        queryKey: ["dashboard-overview"],
      });
    },
  });

  /* ============================================================
     FILTER BOOKINGS
  ============================================================ */

  const filteredBookings = useMemo(() => {
    const sorted = [...bookings].sort((a, b) => {
      const aTime = a.slot_start
        ? new Date(a.slot_start).getTime()
        : Number.MAX_SAFE_INTEGER;

      const bTime = b.slot_start
        ? new Date(b.slot_start).getTime()
        : Number.MAX_SAFE_INTEGER;

      return aTime - bTime;
    });

    if (statusFilter === "all") {
      return sorted;
    }

    return sorted.filter(
      (booking) => booking.status === statusFilter,
    );
  }, [bookings, statusFilter]);

  /* ============================================================
     COUNTS
  ============================================================ */

  const activeCount = bookings.filter(
    (booking) =>
      booking.status === "confirmed" ||
      booking.status === "pending" ||
      booking.status === "in_progress",
  ).length;

  const completedCount = bookings.filter(
    (booking) => booking.status === "completed",
  ).length;

  const cancelledCount = bookings.filter(
    (booking) => booking.status === "cancelled",
  ).length;

  /* ============================================================
     CANCEL HANDLER
  ============================================================ */

  const handleCancel = (booking: BookingView) => {
    const confirmed = window.confirm(
      `Cancel booking #${booking.id}? This will release your reserved charging slot.`,
    );

    if (!confirmed) return;

    cancelMutation.mutate(booking.id);
  };

  const hasData = !isLoading && !isError && bookings.length > 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarClock size={21} className={ui.accentIcon} />

              <p className="label-eyebrow">Charging activity</p>
            </div>

            <h1
              className={`mt-2 font-display text-3xl font-bold ${ui.title}`}
            >
              My Bookings
            </h1>

            <p
              className={`mt-2 max-w-2xl text-sm leading-6 ${ui.body}`}
            >
              Manage your charging reservations, access your charging
              pass, and track booking status.
            </p>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-busy={isFetching}
            className={`btn-secondary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 ${ui.focus}`}
          >
            <RefreshCw
              size={16}
              className={
                isFetching ? "animate-spin motion-reduce:animate-none" : ""
              }
            />
            {isFetching ? "Refreshing" : "Refresh"}
          </button>
        </div>

        {/* ====================================================
            SUMMARY
        ==================================================== */}

        {isLoading && (
          <div
            className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            aria-hidden="true"
          >
            {Array.from({ length: 4 }).map((_, index) => (
              <SummarySkeleton key={index} />
            ))}
          </div>
        )}

        {hasData && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Total bookings"
              value={bookings.length}
              icon={CalendarClock}
            />

            <SummaryCard
              label="Active"
              value={activeCount}
              icon={TicketCheck}
            />

            <SummaryCard
              label="Completed"
              value={completedCount}
              icon={CheckCircle2}
            />

            <SummaryCard
              label="Cancelled"
              value={cancelledCount}
              icon={XCircle}
            />
          </div>
        )}

        {/* ====================================================
            FILTER
        ==================================================== */}

        {isLoading && (
          <div
            className="mb-5 flex flex-wrap items-center gap-2"
            aria-hidden="true"
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <Bar key={index} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        )}

        {hasData && (
          <div
            className="mb-5 flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filter bookings by status"
          >
            {(
              [
                ["all", "All"],
                ["confirmed", "Confirmed"],
                ["pending", "Pending"],
                ["in_progress", "In progress"],
                ["completed", "Completed"],
                ["cancelled", "Cancelled"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                aria-pressed={statusFilter === value}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${ui.focus} ${
                  statusFilter === value
                    ? "border-volt-500/50 bg-volt-500/10 text-volt-700 dark:border-volt-400/40 dark:bg-volt-400/10 dark:text-volt-300"
                    : "border-grid-200 bg-white text-grid-600 hover:border-grid-300 hover:text-grid-900 dark:border-grid-700 dark:bg-grid-900 dark:text-grid-300 dark:hover:border-grid-600 dark:hover:text-grid-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ====================================================
            LOADING
        ==================================================== */}

        {isLoading && (
          <div
            className="space-y-4"
            role="status"
            aria-live="polite"
            aria-label="Loading your bookings"
          >
            <BookingCardSkeleton />
            <BookingCardSkeleton />
            <span className="sr-only">Loading your bookings...</span>
          </div>
        )}

        {/* ====================================================
            ERROR
        ==================================================== */}

        {isError && (
          <div
            role="alert"
            className="card border-red-500/30 p-7 dark:border-red-500/20"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-300">
                <XCircle size={21} />
              </div>

              <div className="flex-1">
                <h2
                  className={`font-display font-semibold ${ui.title}`}
                >
                  Unable to load bookings
                </h2>

                <p className={`mt-1 text-sm leading-6 ${ui.body}`}>
                  We couldn't retrieve your reservations. Make sure the
                  backend is running and your session is still
                  authenticated.
                </p>

                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className={`btn-secondary mt-4 inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 ${ui.focus}`}
                >
                  <RefreshCw
                    size={15}
                    className={
                      isFetching
                        ? "animate-spin motion-reduce:animate-none"
                        : ""
                    }
                  />
                  {isFetching ? "Retrying" : "Try again"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            EMPTY
        ==================================================== */}

        {!isLoading && !isError && bookings.length === 0 && (
          <div className="card flex min-h-[380px] items-center justify-center p-8">
            <div className="max-w-md text-center">
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${ui.accentTile}`}
              >
                <CalendarClock size={30} />
              </div>

              <h2
                className={`mt-5 font-display text-xl font-bold ${ui.title}`}
              >
                No bookings yet
              </h2>

              <p className={`mt-2 text-sm leading-6 ${ui.body}`}>
                You haven't made a charging reservation yet. Find a
                station and reserve a charger for your next trip.
              </p>

              <Link
                to="/map"
                className={`btn-primary mt-6 inline-flex items-center gap-2 ${ui.focus}`}
              >
                Find a charging station
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}

        {/* ====================================================
            FILTERED EMPTY
        ==================================================== */}

        {!isLoading &&
          !isError &&
          bookings.length > 0 &&
          filteredBookings.length === 0 && (
            <div className="card p-10 text-center">
              <CalendarClock
                size={32}
                className={`mx-auto ${ui.body}`}
              />

              <h2
                className={`mt-4 font-display text-lg font-semibold ${ui.title}`}
              >
                No {statusFilter.replace("_", " ")} bookings
              </h2>

              <p className={`mt-1 text-sm ${ui.body}`}>
                Try another booking status filter.
              </p>

              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`btn-secondary mt-5 ${ui.focus}`}
              >
                Show all bookings
              </button>
            </div>
          )}

        {/* ====================================================
            BOOKINGS
        ==================================================== */}

        {!isLoading && !isError && filteredBookings.length > 0 && (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const status = booking.status ?? "pending";

              const viewBooking = booking as BookingView;

              return (
                <article
                  key={booking.id}
                  className="card overflow-hidden transition hover:border-grid-300 dark:hover:border-grid-600"
                >
                  {/* TOP */}

                  <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${ui.accentTile}`}
                      >
                        <Zap size={21} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2
                            className={`font-display text-lg font-bold ${ui.title}`}
                          >
                            VoltGrid Charging Station
                          </h2>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                              status,
                            )}`}
                          >
                            {getStatusLabel(status)}
                          </span>
                        </div>

                        <div
                          className={`mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium ${ui.body}`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <MapPin size={15} />
                            Station #{booking.station_id}
                          </span>

                          <span className="inline-flex items-center gap-2">
                            <Zap size={15} />
                            Charger #{booking.charger_id}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <p className={ui.label}>Booking ID</p>

                      <p
                        className={`mt-1 font-mono text-sm font-medium text-grid-700 dark:text-grid-200`}
                      >
                        #{booking.id}
                      </p>
                    </div>
                  </div>

                  {/* DETAILS */}

                  <div
                    className={`border-t px-6 py-5 ${ui.border} ${ui.inset}`}
                  >
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                      <Detail
                        label="Charging time"
                        icon={Clock3}
                        value={formatTimeRange(
                          booking.slot_start,
                          viewBooking.slot_end,
                        )}
                        subValue={formatDate(booking.slot_start)}
                      />

                      <Detail
                        label="Charger"
                        icon={Zap}
                        value={`Charger #${booking.charger_id}`}
                        subValue="Reserved charging point"
                      />

                      <Detail
                        label="Vehicle"
                        icon={TicketCheck}
                        value={`Vehicle #${booking.vehicle_id}`}
                        subValue="Vehicle used for booking"
                      />

                      <Detail
                        label="Predicted wait"
                        icon={Clock3}
                        value={
                          booking.predicted_wait_minutes != null
                            ? `${booking.predicted_wait_minutes} min`
                            : "Not available"
                        }
                        subValue="At booking time"
                      />
                    </div>
                  </div>

                  {/* ACTIONS */}

                  <div
                    className={`flex flex-col gap-4 border-t px-6 py-4 lg:flex-row lg:items-center lg:justify-between ${ui.border}`}
                  >
                    <div
                      className={`flex items-center gap-2 text-xs font-medium ${ui.body}`}
                    >
                      {status === "confirmed" ||
                      status === "completed" ? (
                        <>
                          <CheckCircle2
                            size={15}
                            className={ui.accentIcon}
                          />

                          <span>
                            {status === "completed"
                              ? "Charging session completed"
                              : "Reservation confirmed"}
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock3
                            size={15}
                            className="text-amber-600 dark:text-amber-300"
                          />

                          <span>{getStatusLabel(status)}</span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {booking.qr_code && (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedBooking(viewBooking)
                          }
                          className={`btn-secondary inline-flex items-center gap-2 ${ui.focus}`}
                        >
                          <QrCode size={16} />
                          View QR
                        </button>
                      )}

                      <Link
                        to={`/stations/${booking.station_id}`}
                        className={`btn-secondary inline-flex items-center gap-2 ${ui.focus}`}
                      >
                        <ExternalLink size={15} />
                        Station
                      </Link>

                      {canCancel(status) && (
                        <button
                          type="button"
                          onClick={() => handleCancel(viewBooking)}
                          disabled={cancelMutation.isPending}
                          className={`inline-flex items-center gap-2 rounded-xl border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-500/60 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:text-red-300 dark:hover:border-red-500/50 ${ui.focus}`}
                        >
                          <XCircle size={16} />

                          {cancelMutation.isPending
                            ? "Cancelling..."
                            : "Cancel"}
                        </button>
                      )}
                    </div>
                  </div>

                  {cancelMutation.isError &&
                    cancelMutation.variables === booking.id && (
                      <div
                        role="alert"
                        className="border-t border-red-500/30 bg-red-500/5 px-6 py-3 text-xs font-medium text-red-700 dark:border-red-500/20 dark:text-red-300"
                      >
                        We couldn't cancel this booking. Please refresh
                        and try again.
                      </div>
                    )}
                </article>
              );
            })}
          </div>
        )}

        {/* ====================================================
            FOOTER
        ==================================================== */}

        {hasData && (
          <div
            className={`mt-6 flex flex-col gap-3 rounded-2xl border bg-grid-50 p-5 sm:flex-row sm:items-center sm:justify-between dark:bg-grid-900/70 ${ui.border}`}
          >
            <div>
              <p className={`text-sm font-semibold ${ui.strong}`}>
                Need another charging session?
              </p>

              <p className={`mt-1 text-sm font-medium ${ui.body}`}>
                Use the live map to find stations and current charger
                availability.
              </p>
            </div>

            <Link
              to="/map"
              className={`inline-flex items-center gap-2 rounded-lg text-sm font-semibold transition hover:text-volt-800 dark:hover:text-volt-200 ${ui.accentText} ${ui.focus}`}
            >
              Explore live network
              <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>

      {/* ======================================================
          QR MODAL
      ====================================================== */}

      {selectedBooking && (
        <BookingQrModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </AppShell>
  );
}

/* ============================================================
   SUMMARY CARD
============================================================ */

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof CalendarClock;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className={ui.label}>{label}</p>

          <p
            className={`mt-2 font-display text-2xl font-bold ${ui.title}`}
          >
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${ui.accentTile}`}
        >
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   DETAIL
============================================================ */

function Detail({
  label,
  icon: Icon,
  value,
  subValue,
}: {
  label: string;
  icon: typeof Clock3;
  value: string;
  subValue?: string;
}) {
  return (
    <div>
      <p className={ui.label}>{label}</p>

      <div className="mt-2 flex items-start gap-2">
        <Icon
          size={16}
          className={`mt-0.5 shrink-0 ${ui.accentIcon}`}
        />

        <div className="min-w-0">
          <p className={`text-sm font-semibold ${ui.strong}`}>{value}</p>

          {subValue && (
            <p
              className={`mt-1 text-xs font-medium leading-5 ${ui.muted}`}
            >
              {subValue}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}