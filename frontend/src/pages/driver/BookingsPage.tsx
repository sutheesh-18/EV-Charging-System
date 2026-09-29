import { useMemo, useState } from "react";
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

  const startText =
    startDate.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });

  if (!end) return startText;

  const endDate = new Date(end);

  if (Number.isNaN(endDate.getTime())) {
    return startText;
  }

  const endText =
    endDate.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });

  return `${startText} → ${endText}`;
}

/* ============================================================
   STATUS
============================================================ */

function getStatusLabel(
  status?: BookingStatus,
) {
  if (!status) return "Unknown";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function getStatusClass(
  status?: BookingStatus,
) {
  switch (status) {
    case "confirmed":
      return "bg-volt-500/15 text-volt-300";

    case "pending":
      return "bg-amber-500/15 text-amber-300";

    case "in_progress":
      return "bg-blue-500/15 text-blue-300";

    case "completed":
      return "bg-grid-700 text-grid-200";

    case "cancelled":
    case "no_show":
      return "bg-red-500/15 text-red-300";

    default:
      return "bg-grid-700 text-grid-200";
  }
}

function canCancel(
  status: BookingStatus,
) {
  return (
    status === "pending" ||
    status === "confirmed"
  );
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
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md rounded-3xl border border-grid-700 bg-grid-900 p-6 shadow-2xl">

        {/* CLOSE */}

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-grid-300 transition hover:bg-grid-800 hover:text-grid-50"
          aria-label="Close QR code"
        >
          <X size={18} />
        </button>

        <div className="text-center">

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-volt-400/10 text-volt-300">
            <QrCode size={22} />
          </div>

          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-volt-300">
            Charging pass
          </p>

          <h2 className="mt-2 font-display text-xl font-bold text-grid-50">
            Booking #{booking.id}
          </h2>

          <p className="mt-1 text-sm font-medium text-grid-300">
            Show this QR code at the charging station.
          </p>

          {booking.qr_code ? (
            <div className="mx-auto mt-6 w-fit rounded-2xl bg-white p-3">
              <img
                src={booking.qr_code}
                alt={`QR code for booking ${booking.id}`}
                className="h-56 w-56 object-contain"
              />
            </div>
          ) : (
            <div className="mx-auto mt-6 flex h-56 w-56 items-center justify-center rounded-2xl border border-dashed border-grid-700 bg-grid-950 text-center">

              <div className="px-6">

                <QrCode
                  size={36}
                  className="mx-auto text-grid-300"
                />

                <p className="mt-3 text-sm font-medium text-grid-300">
                  QR code is not available for this booking.
                </p>

              </div>

            </div>
          )}

          <div className="mt-6 rounded-2xl border border-grid-700 bg-grid-950/70 p-4 text-left">

            <p className="text-xs font-bold uppercase tracking-wider text-grid-400">
              Charging session
            </p>

            <p className="mt-2 text-sm font-semibold text-grid-100">
              {formatDate(
                booking.slot_start,
              )}
            </p>

            <p className="mt-1 text-xs font-medium text-grid-400">
              {formatTimeRange(
                booking.slot_start,
                booking.slot_end,
              )}
            </p>

          </div>

        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN PAGE
============================================================ */

export default function BookingsPage() {
  const queryClient =
    useQueryClient();

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    "all" | BookingStatus
  >("all");

  const [
    selectedBooking,
    setSelectedBooking,
  ] =
    useState<BookingView | null>(
      null,
    );

  /* ============================================================
     LOAD BOOKINGS
  ============================================================ */

  const {
    data: bookings = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } =
    useQuery<BookingView[]>({
      queryKey: ["bookings"],

      queryFn: async () => {
        const response =
          await api.get(
            "/bookings/me",
          );

        return Array.isArray(
          response.data,
        )
          ? response.data
          : [];
      },

      refetchInterval: 30000,
      staleTime: 10000,
    });

  /* ============================================================
     CANCEL BOOKING
  ============================================================ */

  const cancelMutation =
    useMutation({
      mutationFn: async (
        bookingId: number,
      ) => {
        const response =
          await api.post(
            `/bookings/${bookingId}/cancel`,
          );

        return response.data as BookingView;
      },

      onSuccess: () => {
        queryClient.invalidateQueries(
          {
            queryKey: ["bookings"],
          },
        );

        queryClient.invalidateQueries(
          {
            queryKey: ["station-queue"],
          },
        );

        queryClient.invalidateQueries(
          {
            queryKey: [
              "dashboard-overview",
            ],
          },
        );
      },
    });

  /* ============================================================
     FILTER BOOKINGS
  ============================================================ */

  const filteredBookings =
    useMemo(() => {
      const sorted = [
        ...bookings,
      ].sort((a, b) => {
        const aTime = a.slot_start
          ? new Date(
              a.slot_start,
            ).getTime()
          : Number.MAX_SAFE_INTEGER;

        const bTime = b.slot_start
          ? new Date(
              b.slot_start,
            ).getTime()
          : Number.MAX_SAFE_INTEGER;

        return aTime - bTime;
      });

      if (
        statusFilter === "all"
      ) {
        return sorted;
      }

      return sorted.filter(
        (booking) =>
          booking.status ===
          statusFilter,
      );
    }, [
      bookings,
      statusFilter,
    ]);

  /* ============================================================
     COUNTS
  ============================================================ */

  const activeCount =
    bookings.filter(
      (booking) =>
        booking.status ===
          "confirmed" ||
        booking.status ===
          "pending" ||
        booking.status ===
          "in_progress",
    ).length;

  const completedCount =
    bookings.filter(
      (booking) =>
        booking.status ===
        "completed",
    ).length;

  const cancelledCount =
    bookings.filter(
      (booking) =>
        booking.status ===
        "cancelled",
    ).length;

  /* ============================================================
     CANCEL HANDLER
  ============================================================ */

  const handleCancel = (
    booking: BookingView,
  ) => {
    const confirmed =
      window.confirm(
        `Cancel booking #${booking.id}? This will release your reserved charging slot.`,
      );

    if (!confirmed) return;

    cancelMutation.mutate(
      booking.id,
    );
  };

  return (
    <AppShell>

      <div className="mx-auto max-w-6xl">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <div className="flex items-center gap-2">

              <CalendarClock
                size={21}
                className="text-volt-400"
              />

              <p className="label-eyebrow">
                Charging activity
              </p>

            </div>

            <h1 className="mt-2 font-display text-3xl font-bold text-grid-50">
              My Bookings
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-grid-300">
              Manage your charging reservations, access your charging pass,
              and track booking status.
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              refetch()
            }
            disabled={isFetching}
            className="btn-secondary inline-flex items-center justify-center gap-2"
          >

            <RefreshCw
              size={16}
              className={
                isFetching
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh

          </button>

        </div>

        {/* ====================================================
            SUMMARY
        ==================================================== */}

        {!isLoading &&
          !isError &&
          bookings.length >
            0 && (
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <SummaryCard
                label="Total bookings"
                value={
                  bookings.length
                }
                icon={
                  CalendarClock
                }
              />

              <SummaryCard
                label="Active"
                value={
                  activeCount
                }
                icon={
                  TicketCheck
                }
              />

              <SummaryCard
                label="Completed"
                value={
                  completedCount
                }
                icon={
                  CheckCircle2
                }
              />

              <SummaryCard
                label="Cancelled"
                value={
                  cancelledCount
                }
                icon={
                  XCircle
                }
              />

            </div>
          )}

        {/* ====================================================
            FILTER
        ==================================================== */}

        {!isLoading &&
          !isError &&
          bookings.length >
            0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">

              {(
                [
                  ["all", "All"],
                  [
                    "confirmed",
                    "Confirmed",
                  ],
                  [
                    "pending",
                    "Pending",
                  ],
                  [
                    "in_progress",
                    "In progress",
                  ],
                  [
                    "completed",
                    "Completed",
                  ],
                  [
                    "cancelled",
                    "Cancelled",
                  ],
                ] as const
              ).map(
                ([
                  value,
                  label,
                ]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setStatusFilter(
                        value,
                      )
                    }
                    className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                      statusFilter ===
                      value
                        ? "border-volt-400/40 bg-volt-400/10 text-volt-300"
                        : "border-grid-700 bg-grid-900 text-grid-300 hover:border-grid-600 hover:text-grid-100"
                    }`}
                  >
                    {label}
                  </button>
                ),
              )}

            </div>
          )}

        {/* ====================================================
            LOADING
        ==================================================== */}

        {isLoading && (
          <div className="card flex min-h-[300px] items-center justify-center">

            <div className="text-center">

              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-grid-700 border-t-volt-400" />

              <p className="mt-4 text-sm font-medium text-grid-300">
                Loading your bookings...
              </p>

            </div>

          </div>
        )}

        {/* ====================================================
            ERROR
        ==================================================== */}

        {isError && (
          <div className="card border-red-500/20 p-7">

            <div className="flex items-start gap-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-300">
                <XCircle size={21} />
              </div>

              <div className="flex-1">

                <h2 className="font-display font-semibold text-grid-50">
                  Unable to load bookings
                </h2>

                <p className="mt-1 text-sm leading-6 text-grid-300">
                  We couldn't retrieve your reservations. Make sure the
                  backend is running and your session is still authenticated.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    refetch()
                  }
                  className="btn-secondary mt-4"
                >
                  Try again
                </button>

              </div>

            </div>

          </div>
        )}

        {/* ====================================================
            EMPTY
        ==================================================== */}

        {!isLoading &&
          !isError &&
          bookings.length ===
            0 && (
            <div className="card flex min-h-[380px] items-center justify-center p-8">

              <div className="max-w-md text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-volt-500/10 text-volt-400">
                  <CalendarClock
                    size={30}
                  />
                </div>

                <h2 className="mt-5 font-display text-xl font-bold text-grid-50">
                  No bookings yet
                </h2>

                <p className="mt-2 text-sm leading-6 text-grid-300">
                  You haven't made a charging reservation yet. Find a station
                  and reserve a charger for your next trip.
                </p>

                <Link
                  to="/map"
                  className="btn-primary mt-6 inline-flex"
                >
                  Find a charging station
                  <ArrowRight
                    size={16}
                  />
                </Link>

              </div>

            </div>
          )}

        {/* ====================================================
            FILTERED EMPTY
        ==================================================== */}

        {!isLoading &&
          !isError &&
          bookings.length >
            0 &&
          filteredBookings.length ===
            0 && (
            <div className="card p-10 text-center">

              <CalendarClock
                size={32}
                className="mx-auto text-grid-300"
              />

              <h2 className="mt-4 font-display text-lg font-semibold text-grid-50">
                No{" "}
                {statusFilter.replace(
                  "_",
                  " ",
                )}{" "}
                bookings
              </h2>

              <p className="mt-1 text-sm text-grid-300">
                Try another booking status filter.
              </p>

            </div>
          )}

        {/* ====================================================
            BOOKINGS
        ==================================================== */}

        {!isLoading &&
          !isError &&
          filteredBookings.length >
            0 && (
            <div className="space-y-4">

              {filteredBookings.map(
                (booking) => {
                  const status =
                    booking.status ??
                    "pending";

                  const viewBooking =
                    booking as BookingView;

                  return (
                    <article
                      key={booking.id}
                      className="card overflow-hidden transition hover:border-grid-600"
                    >

                      {/* TOP */}

                      <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between">

                        <div className="flex min-w-0 items-start gap-4">

                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-volt-500/10 text-volt-400">
                            <Zap size={21} />
                          </div>

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-3">

                              <h2 className="font-display text-lg font-bold text-grid-50">
                                VoltGrid Charging Station
                              </h2>

                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                  status,
                                )}`}
                              >
                                {getStatusLabel(
                                  status,
                                )}
                              </span>

                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-grid-300">

                              <span className="inline-flex items-center gap-2">
                                <MapPin
                                  size={15}
                                />
                                Station #
                                {
                                  booking.station_id
                                }
                              </span>

                              <span className="inline-flex items-center gap-2">
                                <Zap
                                  size={15}
                                />
                                Charger #
                                {
                                  booking.charger_id
                                }
                              </span>

                            </div>

                          </div>

                        </div>

                        <div className="shrink-0">

                          <p className="text-xs font-bold uppercase tracking-wider text-grid-400">
                            Booking ID
                          </p>

                          <p className="mt-1 font-mono text-sm font-medium text-grid-200">
                            #{booking.id}
                          </p>

                        </div>

                      </div>

                      {/* DETAILS */}

                      <div className="border-t border-grid-700 bg-grid-900/40 px-6 py-5">

                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

                          <Detail
                            label="Charging time"
                            icon={Clock3}
                            value={formatTimeRange(
                              booking.slot_start,
                              viewBooking.slot_end,
                            )}
                            subValue={formatDate(
                              booking.slot_start,
                            )}
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
                              booking.predicted_wait_minutes !=
                              null
                                ? `${booking.predicted_wait_minutes} min`
                                : "Not available"
                            }
                            subValue="At booking time"
                          />

                        </div>

                      </div>

                      {/* ACTIONS */}

                      <div className="flex flex-col gap-4 border-t border-grid-700 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">

                        <div className="flex items-center gap-2 text-xs font-medium text-grid-300">

                          {status ===
                            "confirmed" ||
                          status ===
                            "completed" ? (
                            <>
                              <CheckCircle2
                                size={15}
                                className="text-volt-400"
                              />

                              <span>
                                {status ===
                                "completed"
                                  ? "Charging session completed"
                                  : "Reservation confirmed"}
                              </span>
                            </>
                          ) : (
                            <>
                              <Clock3
                                size={15}
                                className="text-amber-300"
                              />

                              <span>
                                {getStatusLabel(
                                  status,
                                )}
                              </span>
                            </>
                          )}

                        </div>

                        <div className="flex flex-wrap gap-2">

                          {booking.qr_code && (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedBooking(
                                  viewBooking,
                                )
                              }
                              className="btn-secondary inline-flex items-center gap-2"
                            >
                              <QrCode
                                size={16}
                              />
                              View QR
                            </button>
                          )}

                          <Link
                            to={`/stations/${booking.station_id}`}
                            className="btn-secondary inline-flex items-center gap-2"
                          >
                            <ExternalLink
                              size={15}
                            />
                            Station
                          </Link>

                          {canCancel(
                            status,
                          ) && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCancel(
                                  viewBooking,
                                )
                              }
                              disabled={
                                cancelMutation.isPending
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-300 transition hover:border-red-500/50 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <XCircle
                                size={16}
                              />

                              {cancelMutation.isPending
                                ? "Cancelling..."
                                : "Cancel"}
                            </button>
                          )}

                        </div>

                      </div>

                      {cancelMutation.isError &&
                        cancelMutation.variables ===
                          booking.id && (
                          <div className="border-t border-red-500/20 bg-red-500/5 px-6 py-3 text-xs font-medium text-red-300">
                            We couldn't cancel this booking.
                            Please refresh and try again.
                          </div>
                        )}

                    </article>
                  );
                },
              )}

            </div>
          )}

        {/* ====================================================
            FOOTER
        ==================================================== */}

        {!isLoading &&
          !isError &&
          bookings.length >
            0 && (
            <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-grid-700 bg-grid-900/70 p-5 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-sm font-semibold text-grid-100">
                  Need another charging session?
                </p>

                <p className="mt-1 text-sm font-medium text-grid-300">
                  Use the live map to find stations and current charger
                  availability.
                </p>

              </div>

              <Link
                to="/map"
                className="inline-flex items-center gap-2 text-sm font-semibold text-volt-300 transition hover:text-volt-200"
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
          booking={
            selectedBooking
          }
          onClose={() =>
            setSelectedBooking(
              null,
            )
          }
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

          <p className="text-xs font-bold uppercase tracking-wider text-grid-400">
            {label}
          </p>

          <p className="mt-2 font-display text-2xl font-bold text-grid-50">
            {value}
          </p>

        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-volt-400/10 text-volt-400">
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

      <p className="text-xs font-bold uppercase tracking-wider text-grid-400">
        {label}
      </p>

      <div className="mt-2 flex items-start gap-2">

        <Icon
          size={16}
          className="mt-0.5 shrink-0 text-volt-400"
        />

        <div className="min-w-0">

          <p className="text-sm font-semibold text-grid-100">
            {value}
          </p>

          {subValue && (
            <p className="mt-1 text-xs font-medium leading-5 text-grid-400">
              {subValue}
            </p>
          )}

        </div>

      </div>

    </div>
  );
}