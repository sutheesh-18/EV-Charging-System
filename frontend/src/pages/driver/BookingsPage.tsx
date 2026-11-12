import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  QrCode,
  RefreshCw,
  TicketCheck,
  X,
  XCircle,
  Zap,
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

type StationLite = { id: number; name: string };

type VehicleLite = {
  id: number;
  name: string;
  manufacturer: string;
  model: string;
};

/* ============================================================
   SHARED STYLES (light + dark) - same tokens as the other pages
============================================================ */

const CARD =
  "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-grid-700/70 dark:bg-grid-850/90 dark:shadow-card";
const INSET =
  "border-slate-100 bg-slate-50 dark:border-grid-700/60 dark:bg-grid-900/40";
const DIVIDER = "border-slate-200 dark:border-grid-700/70";
const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-grid-400";
const HEADING = "text-slate-900 dark:text-grid-50";
const STRONG = "text-slate-800 dark:text-grid-100";
const BODY = "text-slate-600 dark:text-grid-300";
const MUTED = "text-slate-500 dark:text-grid-400";
const ACCENT_TEXT = "text-teal-700 dark:text-volt-300";
const ACCENT_TILE =
  "bg-teal-50 text-teal-700 dark:bg-volt-500/15 dark:text-volt-300";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-volt-400 dark:focus-visible:ring-offset-grid-950";

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-volt-500 dark:text-grid-950 dark:hover:bg-volt-400";
const BTN_OUTLINE =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-grid-600 dark:bg-transparent dark:text-grid-200 dark:hover:border-volt-500/60 dark:hover:bg-volt-500/10 dark:hover:text-volt-300";
const BTN_DANGER =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10";

/* ============================================================
   HELPERS
============================================================ */

function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

function formatDate(value?: string | null) {
  if (!value) return "Not scheduled";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatTimeRange(start?: string | null, end?: string | null) {
  if (!start) return "Not scheduled";

  const startDate = new Date(start);

  if (Number.isNaN(startDate.getTime())) return "Invalid time";

  const startText = startDate.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (!end) return startText;

  const endDate = new Date(end);

  if (Number.isNaN(endDate.getTime())) return startText;

  const endText = endDate.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${startText} → ${endText}`;
}

/** Minutes until the slot starts. Negative once it has started. */
function minutesUntil(start: string | undefined, now: number) {
  if (!start) return null;

  const time = new Date(start).getTime();

  if (Number.isNaN(time)) return null;

  return Math.round((time - now) / 60000);
}

/** "in 25 min", "in 3 h 10 min", "in 2 days" (future starts only) */
function formatCountdown(minutes: number) {
  if (minutes < 1) return "Starting now";
  if (minutes < 60) return `in ${minutes} min`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `in ${hours} h ${minutes % 60} min`;

  const days = Math.floor(hours / 24);

  return `in ${days} day${days === 1 ? "" : "s"}`;
}

function getStatusLabel(status?: BookingStatus) {
  if (!status) return "Unknown";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusClass(status?: BookingStatus) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-50 text-emerald-700 dark:bg-volt-500/15 dark:text-volt-300";
    case "pending":
      return "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
    case "in_progress":
      return "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
    case "cancelled":
    case "no_show":
      return "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-grid-700 dark:text-grid-200";
  }
}

const isUpcoming = (status: BookingStatus) =>
  status === "pending" || status === "confirmed" || status === "in_progress";

const canCancel = (status: BookingStatus) =>
  status === "pending" || status === "confirmed";

/** Prefer the backend's message (FastAPI `detail`) over a generic one. */
function errorMessage(error: unknown) {
  const detail = (error as { response?: { data?: { detail?: unknown } } })
    ?.response?.data?.detail;

  if (typeof detail === "string" && detail) return detail;

  return "We couldn't cancel this booking. Please refresh and try again.";
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/80 motion-reduce:animate-none dark:bg-grid-700/60 ${className}`}
    />
  );
}

/* ============================================================
   MODAL SHELL (QR code and cancel confirmation)
   Escape closes it, Tab stays inside it, and focus returns to the
   button that opened it.
============================================================ */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function ModalShell({
  labelledBy,
  onClose,
  children,
}: {
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;

    const items = () =>
      Array.from(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);

    // a child may already have focus (autoFocus on the safe action)
    if (dialog && !dialog.contains(document.activeElement)) {
      (items()[0] ?? dialog).focus();
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const list = items();

      if (!list.length) {
        event.preventDefault();
        return;
      }

      const first = list[0];
      const last = list[list.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm dark:bg-black/70"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`relative w-full max-w-md rounded-3xl border p-6 shadow-2xl outline-none ${CARD}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={`absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-grid-300 dark:hover:bg-grid-800 dark:hover:text-grid-50 ${FOCUS}`}
        >
          <X size={18} />
        </button>

        {children}
      </div>
    </div>
  );
}

function BookingQrModal({
  booking,
  stationName,
  onClose,
}: {
  booking: BookingView;
  stationName: string;
  onClose: () => void;
}) {
  return (
    <ModalShell labelledBy="qr-modal-title" onClose={onClose}>
      <div className="text-center">
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl ${ACCENT_TILE}`}
        >
          <QrCode size={22} />
        </div>

        <p
          className={`mt-4 text-xs font-bold uppercase tracking-widest ${ACCENT_TEXT}`}
        >
          Charging pass
        </p>

        <h2
          id="qr-modal-title"
          className={`mt-2 font-display text-xl font-bold ${HEADING}`}
        >
          Booking #{booking.id}
        </h2>

        <p className={`mt-1 text-sm font-medium ${BODY}`}>
          Show this QR code at {stationName}.
        </p>

        {booking.qr_code ? (
          <div
            className={`mx-auto mt-6 w-fit rounded-2xl border bg-white p-3 ${DIVIDER}`}
          >
            <img
              src={booking.qr_code}
              alt={`QR code for booking ${booking.id}`}
              className="h-56 w-56 object-contain"
            />
          </div>
        ) : (
          <div
            className={`mx-auto mt-6 flex h-56 w-56 items-center justify-center rounded-2xl border border-dashed bg-slate-50 text-center dark:bg-grid-950 ${DIVIDER}`}
          >
            <div className="px-6">
              <QrCode size={36} className={`mx-auto ${BODY}`} />
              <p className={`mt-3 text-sm font-medium ${BODY}`}>
                QR code is not available for this booking.
              </p>
            </div>
          </div>
        )}

        <div className={`mt-6 rounded-2xl border p-4 text-left ${INSET}`}>
          <p className={EYEBROW}>Charging session</p>

          <p className={`mt-2 text-sm font-semibold ${STRONG}`}>
            {formatDate(booking.slot_start)}
          </p>

          <p className={`mt-1 text-xs font-medium ${MUTED}`}>
            {formatTimeRange(booking.slot_start, booking.slot_end)}
          </p>
        </div>
      </div>
    </ModalShell>
  );
}

function CancelDialog({
  booking,
  stationName,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  booking: BookingView;
  stationName: string;
  pending: boolean;
  error: unknown;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ModalShell labelledBy="cancel-modal-title" onClose={onClose}>
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300">
          <XCircle size={22} />
        </div>

        <h2
          id="cancel-modal-title"
          className={`mt-4 font-display text-xl font-bold ${HEADING}`}
        >
          Cancel booking #{booking.id}?
        </h2>

        <p className={`mt-2 text-sm leading-6 ${BODY}`}>
          This releases your reserved charging slot at {stationName} on{" "}
          {formatDate(booking.slot_start)}.
        </p>

        {Boolean(error) && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300"
          >
            {errorMessage(error)}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`}
          >
            {pending ? "Cancelling..." : "Cancel booking"}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            autoFocus
            className={`${BTN_OUTLINE} flex-1 ${FOCUS}`}
          >
            Keep booking
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ============================================================
   MAIN PAGE
============================================================ */

export default function BookingsPage() {
  const queryClient = useQueryClient();
  const now = useNow();

  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>(
    "all",
  );

  const [selectedBooking, setSelectedBooking] = useState<BookingView | null>(
    null,
  );

  const [cancelTarget, setCancelTarget] = useState<BookingView | null>(null);

  /* ---------- bookings ---------- */

  const {
    data: bookings = [],
    isLoading,
    isError,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery<BookingView[]>({
    queryKey: ["bookings"],

    queryFn: async () => {
      const response = await api.get("/bookings/me");

      return Array.isArray(response.data) ? response.data : [];
    },

    refetchInterval: 30000,
    staleTime: 10000,
  });

  /* ---------- names for stations and vehicles (shared, cached) ---------- */

  const { data: stations = [] } = useQuery<StationLite[]>({
    queryKey: ["stations"],
    queryFn: async () => {
      const response = await api.get("/stations");
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  const { data: vehicles = [] } = useQuery<VehicleLite[]>({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const response = await api.get("/users/me/vehicles");
      if (Array.isArray(response.data)) return response.data;
      if (Array.isArray(response.data?.vehicles)) return response.data.vehicles;
      return [];
    },
  });

  const stationName = (id: number) =>
    stations.find((station) => station.id === id)?.name ?? `Station #${id}`;

  const vehicleName = (id: number) => {
    const vehicle = vehicles.find((item) => item.id === id);
    return vehicle
      ? `${vehicle.name} · ${vehicle.manufacturer} ${vehicle.model}`
      : `Vehicle #${id}`;
  };

  /* ---------- cancel ---------- */

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const response = await api.post(`/bookings/${bookingId}/cancel`);

      return response.data as BookingView;
    },

    onSuccess: () => {
      setCancelTarget(null);

      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["station-queue"] });
      // matches every ["station", id], so the freed charger shows up
      queryClient.invalidateQueries({ queryKey: ["station"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
  });

  /* ---------- grouping and filtering ---------- */

  const time = (booking: BookingView) =>
    booking.slot_start
      ? new Date(booking.slot_start).getTime()
      : Number.MAX_SAFE_INTEGER;

  const filtered = useMemo(
    () =>
      statusFilter === "all"
        ? bookings
        : bookings.filter((booking) => booking.status === statusFilter),
    [bookings, statusFilter],
  );

  // upcoming: soonest first.  past: most recent first.
  const upcoming = useMemo(
    () =>
      filtered
        .filter((booking) => isUpcoming(booking.status))
        .sort((a, b) => time(a) - time(b)),
    [filtered],
  );

  const past = useMemo(
    () =>
      filtered
        .filter((booking) => !isUpcoming(booking.status))
        .sort((a, b) => time(b) - time(a)),
    [filtered],
  );

  const activeCount = bookings.filter((b) => isUpcoming(b.status)).length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;
  const cancelledCount = bookings.filter((b) => b.status === "cancelled").length;

  const filterOptions: { value: "all" | BookingStatus; label: string }[] = [
    { value: "all", label: "All" },
    { value: "confirmed", label: "Confirmed" },
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "no_show", label: "No-show" },
  ];

  const countFor = (value: "all" | BookingStatus) =>
    value === "all"
      ? bookings.length
      : bookings.filter((b) => b.status === value).length;

  // Cached bookings stay on screen even if a background refresh fails.
  const hasData = !isLoading && bookings.length > 0;

  const updatedLabel = (() => {
    if (!dataUpdatedAt) return "";
    const seconds = Math.max(0, Math.round((now - dataUpdatedAt) / 1000));
    if (seconds < 10) return "Updated just now";
    if (seconds < 60) return `Updated ${seconds}s ago`;
    return `Updated ${Math.floor(seconds / 60)}m ago`;
  })();

  /* ---------- one booking card ---------- */

  const renderBooking = (booking: BookingView, nextUp: boolean) => {
    const status = booking.status ?? "pending";
    const waiting = status === "pending" || status === "confirmed";
    const minutes = waiting ? minutesUntil(booking.slot_start, now) : null;
    const startPassed = minutes !== null && minutes < 0;

    return (
      <article
        key={booking.id}
        className={`${CARD} overflow-hidden transition hover:border-teal-200 dark:hover:border-grid-600`}
      >
        {/* TOP */}

        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${ACCENT_TILE}`}
            >
              <Zap size={21} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={`font-display text-lg font-bold ${HEADING}`}>
                  {stationName(booking.station_id)}
                </h3>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(status)}`}
                >
                  {getStatusLabel(status)}
                </span>

                {nextUp && !startPassed && (
                  <span className="rounded-full bg-teal-700 px-2.5 py-1 text-xs font-semibold text-white dark:bg-volt-500 dark:text-grid-950">
                    Next up
                  </span>
                )}
              </div>

              <p
                className={`mt-2 inline-flex items-center gap-2 text-sm font-medium ${BODY}`}
              >
                <Zap size={15} />
                Charger #{booking.charger_id}
              </p>
            </div>
          </div>

          <div className="shrink-0 lg:text-right">
            {minutes !== null ? (
              <>
                <p className={EYEBROW}>{startPassed ? "Start time" : "Starts"}</p>
                <p
                  className={`mt-1 text-sm font-bold ${
                    startPassed
                      ? "text-amber-700 dark:text-amber-300"
                      : ACCENT_TEXT
                  }`}
                >
                  {startPassed ? "Has passed" : formatCountdown(minutes)}
                </p>
              </>
            ) : (
              <>
                <p className={EYEBROW}>Booking ID</p>
                <p className={`mt-1 font-mono text-sm font-medium ${STRONG}`}>
                  #{booking.id}
                </p>
              </>
            )}
          </div>
        </div>

        {/* DETAILS */}

        <div className={`border-t px-6 py-5 ${INSET}`}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Detail
              label="Charging time"
              icon={Clock3}
              value={formatTimeRange(booking.slot_start, booking.slot_end)}
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
              value={vehicleName(booking.vehicle_id)}
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
          className={`flex flex-col gap-4 border-t px-6 py-4 lg:flex-row lg:items-center lg:justify-between ${DIVIDER}`}
        >
          <div
            className={`flex items-center gap-2 text-xs font-medium ${BODY}`}
          >
            {startPassed ? (
              <>
                <AlertTriangle
                  size={15}
                  className="text-amber-600 dark:text-amber-300"
                />
                <span>Start time has passed</span>
              </>
            ) : status === "confirmed" || status === "completed" ? (
              <>
                <CheckCircle2
                  size={15}
                  className="text-teal-600 dark:text-volt-400"
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
                onClick={() => setSelectedBooking(booking)}
                className={`${BTN_OUTLINE} ${FOCUS}`}
              >
                <QrCode size={16} />
                View QR
              </button>
            )}

            <Link
              to={`/stations/${booking.station_id}`}
              className={`${BTN_OUTLINE} ${FOCUS}`}
            >
              <ExternalLink size={15} />
              Station
            </Link>

            {canCancel(status) && (
              <button
                type="button"
                onClick={() => {
                  cancelMutation.reset();
                  setCancelTarget(booking);
                }}
                className={`${BTN_DANGER} ${FOCUS}`}
              >
                <XCircle size={16} />
                Cancel
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* ====================================================
            HEADER
        ==================================================== */}

        <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarClock
                size={20}
                className="text-teal-700 dark:text-volt-400"
              />

              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-volt-300">
                Charging activity
              </p>
            </div>

            <h1
              className={`mt-2 font-display text-3xl font-bold tracking-tight ${HEADING}`}
            >
              My Bookings
            </h1>

            <p className={`mt-2 max-w-2xl text-sm leading-6 ${BODY}`}>
              Manage your charging reservations, open your charging pass, and
              track booking status.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {updatedLabel && (
              <span className={`hidden text-xs sm:block ${MUTED}`}>
                {updatedLabel}
              </span>
            )}

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-busy={isFetching}
              className={`${BTN_OUTLINE} ${FOCUS}`}
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
        </section>

        {/* ====================================================
            REFRESH FAILED (cached bookings stay visible)
        ==================================================== */}

        {isError && bookings.length > 0 && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/30 dark:bg-amber-400/10 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300"
              />

              <p className="text-sm text-amber-900 dark:text-amber-200">
                We couldn't refresh your bookings. You're seeing the last
                loaded list.
              </p>
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className={`${BTN_OUTLINE} !py-1.5 ${FOCUS}`}
            >
              {isFetching ? "Retrying" : "Try again"}
            </button>
          </div>
        )}

        {/* ====================================================
            SUMMARY
        ==================================================== */}

        {isLoading && (
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            aria-hidden="true"
          >
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={`${CARD} p-5`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-7 w-12" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        )}

        {hasData && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Total bookings"
              value={bookings.length}
              icon={CalendarClock}
            />
            <SummaryCard label="Active" value={activeCount} icon={TicketCheck} />
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
          <div className="flex flex-wrap items-center gap-2" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        )}

        {hasData && (
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filter bookings by status"
          >
            {filterOptions.map(({ value, label }) => {
              const count = countFor(value);

              // hide statuses with no bookings, but never hide the active one
              if (value !== "all" && count === 0 && statusFilter !== value) {
                return null;
              }

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  aria-pressed={statusFilter === value}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${FOCUS} ${
                    statusFilter === value
                      ? "border-teal-700 bg-teal-700 text-white dark:border-volt-500 dark:bg-volt-500 dark:text-grid-950"
                      : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700 dark:border-grid-700 dark:bg-grid-900/60 dark:text-grid-300 dark:hover:border-volt-500/50 dark:hover:text-volt-300"
                  }`}
                >
                  {label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      statusFilter === value
                        ? "bg-white/20"
                        : "bg-slate-100 dark:bg-grid-800"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
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
            {[0, 1].map((i) => (
              <div key={i} className={`${CARD} overflow-hidden`} aria-hidden="true">
                <div className="flex items-start gap-4 p-6">
                  <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-56" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
                <div className={`border-t px-6 py-5 ${INSET}`}>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="space-y-3">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <span className="sr-only">Loading your bookings...</span>
          </div>
        )}

        {/* ====================================================
            ERROR (only when there is nothing to show)
        ==================================================== */}

        {isError && !isLoading && bookings.length === 0 && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-500/30 dark:bg-red-500/10"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300">
                <XCircle size={21} />
              </div>

              <div className="flex-1">
                <h2 className="font-display font-semibold text-red-900 dark:text-red-200">
                  Unable to load bookings
                </h2>

                <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-300/80">
                  We couldn't retrieve your reservations. Make sure the
                  backend is running and your session is still signed in.
                </p>

                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className={`mt-4 inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-500/40 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-500/10 ${FOCUS}`}
                >
                  <RefreshCw
                    size={15}
                    className={
                      isFetching ? "animate-spin motion-reduce:animate-none" : ""
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
          <div
            className={`${CARD} flex min-h-[380px] items-center justify-center p-8`}
          >
            <div className="max-w-md text-center">
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${ACCENT_TILE}`}
              >
                <CalendarClock size={30} />
              </div>

              <h2 className={`mt-5 font-display text-xl font-bold ${HEADING}`}>
                No bookings yet
              </h2>

              <p className={`mt-2 text-sm leading-6 ${BODY}`}>
                You haven't made a charging reservation yet. Find a station and
                reserve a charger for your next trip.
              </p>

              <Link to="/map" className={`${BTN_PRIMARY} mt-6 ${FOCUS}`}>
                Find a charging station
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}

        {/* FILTERED EMPTY */}

        {hasData && filtered.length === 0 && (
          <div className={`${CARD} p-10 text-center`}>
            <CalendarClock size={32} className={`mx-auto ${BODY}`} />

            <h2 className={`mt-4 font-display text-lg font-semibold ${HEADING}`}>
              No {statusFilter.replace(/_/g, " ")} bookings
            </h2>

            <p className={`mt-1 text-sm ${BODY}`}>
              Try another booking status filter.
            </p>

            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`${BTN_OUTLINE} mt-5 ${FOCUS}`}
            >
              Show all bookings
            </button>
          </div>
        )}

        {/* ====================================================
            BOOKINGS: upcoming, then past
        ==================================================== */}

        {hasData && upcoming.length > 0 && (
          <section className="space-y-4" aria-label="Upcoming bookings">
            <h2 className={EYEBROW}>Upcoming · {upcoming.length}</h2>
            {upcoming.map((booking, index) => renderBooking(booking, index === 0))}
          </section>
        )}

        {hasData && past.length > 0 && (
          <section className="space-y-4" aria-label="Past bookings">
            <h2 className={EYEBROW}>Past · {past.length}</h2>
            {past.map((booking) => renderBooking(booking, false))}
          </section>
        )}

        {/* ====================================================
            FOOTER
        ==================================================== */}

        {hasData && (
          <div
            className={`flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${INSET}`}
          >
            <div>
              <p className={`text-sm font-semibold ${STRONG}`}>
                Need another charging session?
              </p>

              <p className={`mt-1 text-sm font-medium ${BODY}`}>
                Use the live map to find stations and current charger
                availability.
              </p>
            </div>

            <Link
              to="/map"
              className={`inline-flex items-center gap-2 rounded-lg text-sm font-semibold transition hover:underline ${ACCENT_TEXT} ${FOCUS}`}
            >
              Explore live network
              <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>

      {/* QR MODAL */}

      {selectedBooking && (
        <BookingQrModal
          booking={selectedBooking}
          stationName={stationName(selectedBooking.station_id)}
          onClose={() => setSelectedBooking(null)}
        />
      )}

      {/* CANCEL CONFIRMATION */}

      {cancelTarget && (
        <CancelDialog
          booking={cancelTarget}
          stationName={stationName(cancelTarget.station_id)}
          pending={cancelMutation.isPending}
          error={cancelMutation.isError ? cancelMutation.error : null}
          onConfirm={() => cancelMutation.mutate(cancelTarget.id)}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </AppShell>
  );
}

/* ============================================================
   SMALL PIECES
============================================================ */

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ElementType;
}) {
  return (
    <div
      className={`${CARD} p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={EYEBROW}>{label}</p>

          <p className={`mt-2 font-display text-2xl font-bold ${HEADING}`}>
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${ACCENT_TILE}`}
        >
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  icon: Icon,
  value,
  subValue,
}: {
  label: string;
  icon: ElementType;
  value: string;
  subValue?: string;
}) {
  return (
    <div>
      <p className={EYEBROW}>{label}</p>

      <div className="mt-2 flex items-start gap-2">
        <Icon
          size={16}
          className="mt-0.5 shrink-0 text-teal-600 dark:text-volt-400"
        />

        <div className="min-w-0">
          <p className={`text-sm font-semibold ${STRONG}`}>{value}</p>

          {subValue && (
            <p className={`mt-1 text-xs font-medium leading-5 ${MUTED}`}>
              {subValue}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}