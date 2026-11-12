import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  CheckCircle2,
  Clock3,
  IndianRupee,
  MapPin,
  Navigation,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingDown,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";

import AppShell from "../../components/layout/AppShell";
import { api } from "../../api/client";
import { useTheme } from "../../lib/theme";

interface Charger {
  id: number;
  charger_code?: string;
  charger_type?: string;
  power_kw?: number;
  status?: string;
  connector_type?: string;
}

interface Station {
  id: number;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  distance_km?: number;
  available_chargers?: number;
  total_chargers?: number;
  charging_cost_per_kwh?: number;
  price_per_kwh?: number;
  rating?: number;
  average_rating?: number;
  predicted_wait_minutes?: number;
  chargers?: Charger[];
}

/* ============================================================
   SHARED STYLES (light + dark) - same tokens as the other pages
============================================================ */

const CARD =
  "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-grid-700/70 dark:bg-grid-850/90 dark:shadow-card";
const INSET =
  "border-slate-200 bg-slate-50 dark:border-grid-700/60 dark:bg-grid-900/60";
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
  "inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 dark:bg-volt-500 dark:text-grid-950 dark:hover:bg-volt-400";
const BTN_DISABLED =
  "inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-500 dark:bg-grid-800 dark:text-grid-500";
const BTN_OUTLINE =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700 dark:border-grid-600 dark:bg-transparent dark:text-grid-200 dark:hover:border-volt-500/60 dark:hover:bg-volt-500/10 dark:hover:text-volt-300";

/* ============================================================
   HELPERS
============================================================ */

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const isNum = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/80 motion-reduce:animate-none dark:bg-grid-700/60 ${className}`}
    />
  );
}

function chargerStatusText(status?: string) {
  switch (status) {
    case "available":
      return "Available now";
    case "occupied":
      return "Occupied";
    case "maintenance":
      return "Under maintenance";
    case "offline":
      return "Offline";
    default:
      return "Unavailable";
  }
}

/* ============================================================
   PAGE
============================================================ */

export default function StationDetails() {
  const { id } = useParams();
  const [selectedCharger, setSelectedCharger] = useState<number | null>(null);

  const {
    data: station,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery<Station>({
    queryKey: ["station", id],

    queryFn: async () => {
      const response = await api.get(`/stations/${id}`);
      return response.data;
    },

    enabled: Boolean(id),

    // charger status changes, so keep it fresh
    refetchInterval: 30000,
  });

  const chargers = useMemo(() => station?.chargers ?? [], [station]);

  // "available" means exactly that, so chargers under maintenance or
  // offline are never offered
  const availableChargers = useMemo(
    () => chargers.filter((charger) => charger.status === "available"),
    [chargers],
  );

  const fastestAvailableCharger = useMemo(
    () =>
      [...availableChargers].sort(
        (a, b) => (b.power_kw ?? 0) - (a.power_kw ?? 0),
      )[0],
    [availableChargers],
  );

  // a selection belongs to one station
  useEffect(() => {
    setSelectedCharger(null);
  }, [id]);

  // drop a selection that is no longer available after a refresh
  useEffect(() => {
    if (
      selectedCharger !== null &&
      !availableChargers.some((charger) => charger.id === selectedCharger)
    ) {
      setSelectedCharger(null);
    }
  }, [availableChargers, selectedCharger]);

  /* ---------- LOADING ---------- */

  if (isLoading) {
    return (
      <AppShell>
        <div
          className="mx-auto max-w-7xl space-y-6"
          role="status"
          aria-label="Loading station"
        >
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-56 rounded-2xl" />
          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
          <span className="sr-only">Loading station details...</span>
        </div>
      </AppShell>
    );
  }

  /* ---------- ERROR ---------- */

  if (isError || !station) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl py-20 text-center">
          <MapPin size={40} className="mx-auto text-red-500 dark:text-red-400" />

          <h1 className={`mt-4 font-display text-2xl font-bold ${HEADING}`}>
            Station unavailable
          </h1>

          <p className={`mt-2 text-sm ${BODY}`}>
            Live station data could not be loaded. Check that the backend is
            running and try again.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className={`${BTN_OUTLINE} ${FOCUS}`}
            >
              <RefreshCw
                size={16}
                className={
                  isFetching ? "animate-spin motion-reduce:animate-none" : ""
                }
              />
              {isFetching ? "Retrying" : "Try again"}
            </button>

            <Link to="/map" className={`${BTN_PRIMARY} ${FOCUS}`}>
              Back to stations
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  /* ---------- real values only: missing data shows "--" ---------- */

  const price = station.charging_cost_per_kwh ?? station.price_per_kwh ?? null;

  const waitTime = isNum(station.predicted_wait_minutes)
    ? station.predicted_wait_minutes
    : null;

  const ratingValue = station.rating ?? station.average_rating;
  const rating = isNum(ratingValue) ? ratingValue : null;

  const distance = isNum(station.distance_km) ? station.distance_km : null;

  // the charger list is what the user can actually pick from, so when it
  // exists the counts come from it (the backend totals can disagree)
  const availableCount =
    chargers.length > 0
      ? availableChargers.length
      : (station.available_chargers ?? 0);

  const totalCount =
    chargers.length > 0 ? chargers.length : (station.total_chargers ?? 0);

  const fastestPower = fastestAvailableCharger?.power_kw ?? null;

  const lowCongestion = waitTime === null ? null : waitTime <= 10;

  const canBook = availableCount > 0;

  /*
   * Match score = the average of the factors below that we actually have
   * data for. Nothing is assumed for the missing ones.
   */
  const factors: { label: string; value: number | null }[] = [
    {
      label: "Waiting time",
      value: waitTime !== null ? clamp(100 - waitTime * 5, 20, 100) : null,
    },
    {
      label: "Charger availability",
      value:
        totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : null,
    },
    {
      label: "Distance",
      value:
        distance !== null ? clamp(Math.round(100 - distance * 10), 20, 100) : null,
    },
    {
      label: "Station rating",
      value: rating !== null ? Math.round((rating / 5) * 100) : null,
    },
  ];

  const known = factors
    .map((factor) => factor.value)
    .filter((value): value is number => value !== null);

  const recommendationScore = known.length
    ? Math.round(known.reduce((sum, value) => sum + value, 0) / known.length)
    : null;

  const topMatch = recommendationScore !== null && recommendationScore >= 80;

  const bookingHref =
    selectedCharger !== null
      ? `/booking/${station.id}?charger=${selectedCharger}`
      : `/booking/${station.id}`;

  const hasCoordinates = isNum(station.latitude) && isNum(station.longitude);

  const directionsUrl = hasCoordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`
    : null;

  const distanceText = distance !== null ? distance.toFixed(1) : null;

  const bookButton = (children: ReactNode) =>
    canBook ? (
      <Link to={bookingHref} className={`${BTN_PRIMARY} ${FOCUS}`}>
        {children}
      </Link>
    ) : (
      <span
        role="link"
        aria-disabled="true"
        title="No chargers are available right now"
        className={BTN_DISABLED}
      >
        {children}
      </span>
    );

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* BACK */}

        <Link
          to="/map"
          className={`inline-flex items-center gap-2 rounded text-sm font-medium transition hover:text-teal-700 dark:hover:text-volt-300 ${BODY} ${FOCUS}`}
        >
          <ArrowLeft size={16} />
          Back to stations
        </Link>

        {/* =====================================================
            STATION HERO
        ===================================================== */}

        <section className={`${CARD} overflow-hidden`}>
          <div
            className={`relative overflow-hidden border-b bg-gradient-to-br from-teal-50 via-white to-white p-6 dark:from-grid-900 dark:via-grid-900 dark:to-grid-850 sm:p-8 ${DIVIDER}`}
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-teal-100/70 blur-3xl dark:bg-volt-400/10" />

            <div className="relative flex flex-col justify-between gap-8 lg:flex-row">
              {/* Station identity */}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {topMatch && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 dark:border-volt-400/20 dark:bg-volt-400/10 dark:text-volt-300">
                      <Sparkles size={13} />
                      Top match
                    </span>
                  )}

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                      availableCount > 0
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"
                        : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300"
                    }`}
                  >
                    <CheckCircle2 size={13} />
                    {availableCount > 0 ? "Available" : "Currently busy"}
                  </span>
                </div>

                <h1
                  className={`mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl ${HEADING}`}
                >
                  {station.name}
                </h1>

                <p
                  className={`mt-3 flex items-start gap-2 text-sm leading-6 ${BODY}`}
                >
                  <MapPin size={16} className={`mt-1 shrink-0 ${MUTED}`} />

                  <span>{station.address ?? "Charging station location"}</span>
                </p>

                <div
                  className={`mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm ${MUTED}`}
                >
                  <span className="flex items-center gap-1.5">
                    <Navigation
                      size={15}
                      className="text-teal-600 dark:text-volt-400"
                    />
                    {distanceText !== null
                      ? `${distanceText} km away`
                      : "Distance --"}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Star size={15} className="fill-amber-400 text-amber-400" />
                    {rating !== null ? rating.toFixed(1) : "--"}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Clock3 size={15} className="text-amber-500" />
                    {waitTime !== null
                      ? `${waitTime} min predicted wait`
                      : "Wait time unavailable"}
                  </span>
                </div>
              </div>

              {/* Actions */}

              <div className="flex flex-wrap items-end gap-3">
                {directionsUrl ? (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${BTN_OUTLINE} ${FOCUS}`}
                  >
                    <Navigation size={16} />
                    Navigate
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    title="This station has no map location"
                    className={`${BTN_OUTLINE} cursor-not-allowed opacity-50`}
                  >
                    <Navigation size={16} />
                    Navigate
                  </span>
                )}

                {bookButton(
                  <>
                    Book charger
                    <ArrowRight size={16} />
                  </>,
                )}
              </div>
            </div>
          </div>

          {/* METRICS */}

          <div className="grid divide-y divide-slate-200 dark:divide-grid-700/70 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            <Metric
              icon={Clock3}
              label="Predicted wait"
              value={waitTime !== null ? `${waitTime} min` : "--"}
              detail={
                lowCongestion === null
                  ? "No live data"
                  : lowCongestion
                    ? "Low congestion"
                    : "Higher congestion"
              }
            />

            <Metric
              icon={Zap}
              label="Fastest power"
              value={fastestPower ? `${fastestPower} kW` : "--"}
              detail={
                fastestPower === null
                  ? "No charger available"
                  : fastestPower >= 100
                    ? "Fast charging"
                    : "Available power"
              }
            />

            <Metric
              icon={IndianRupee}
              label="Charging price"
              value={price !== null ? `₹${price}` : "--"}
              detail={price !== null ? "per kWh" : "Price unavailable"}
            />

            <Metric
              icon={PlugZap}
              label="Chargers"
              value={totalCount > 0 ? `${availableCount}/${totalCount}` : "--"}
              detail="currently available"
            />
          </div>
        </section>

        {/* =====================================================
            MAIN CONTENT
        ===================================================== */}

        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          {/* CHARGER SELECTION */}

          <div className={`${CARD} p-6`}>
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <p className={EYEBROW}>Live charger availability</p>

                <h2
                  className={`mt-1 font-display text-xl font-bold ${HEADING}`}
                >
                  Choose a charger
                </h2>
              </div>

              <p className={`text-xs ${MUTED}`} aria-live="polite">
                {availableCount} available now
              </p>
            </div>

            {chargers.length === 0 ? (
              <div className={`mt-6 rounded-2xl border p-8 text-center ${INSET}`}>
                <PlugZap size={28} className={`mx-auto ${MUTED}`} />

                <p className={`mt-3 font-medium ${STRONG}`}>
                  Charger information unavailable
                </p>

                <p className={`mt-1 text-sm ${MUTED}`}>
                  Please check the station again shortly.
                </p>
              </div>
            ) : (
              <div
                className="mt-6 space-y-3"
                role="radiogroup"
                aria-label="Chargers"
              >
                {chargers.map((charger) => {
                  const available = charger.status === "available";

                  const selected = selectedCharger === charger.id;

                  return (
                    <button
                      key={charger.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!available}
                      onClick={() => {
                        if (available) setSelectedCharger(charger.id);
                      }}
                      className={`w-full rounded-2xl border p-4 text-left transition ${FOCUS} ${
                        selected
                          ? "border-teal-400 bg-teal-50/70 dark:border-volt-400/50 dark:bg-volt-400/5"
                          : available
                            ? "border-slate-200 bg-white hover:border-teal-300 dark:border-grid-700 dark:bg-grid-900/40 dark:hover:border-grid-600"
                            : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60 dark:border-grid-700 dark:bg-grid-950/20"
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            available
                              ? ACCENT_TILE
                              : "bg-slate-100 text-slate-400 dark:bg-grid-800 dark:text-grid-500"
                          }`}
                        >
                          <PlugZap size={20} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={`font-display font-semibold ${HEADING}`}
                            >
                              {charger.charger_code ?? `Charger #${charger.id}`}
                            </p>

                            {charger.connector_type && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-600 dark:bg-grid-800 dark:text-grid-300">
                                {charger.connector_type}
                              </span>
                            )}
                          </div>

                          <div
                            className={`mt-1 flex flex-wrap gap-3 text-xs ${MUTED}`}
                          >
                            <span>{charger.charger_type ?? "Charging unit"}</span>

                            <span>{charger.power_kw ?? "--"} kW</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 sm:justify-end">
                          <span
                            className={`text-xs font-semibold ${
                              available
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {chargerStatusText(charger.status)}
                          </span>

                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                              selected
                                ? "border-teal-600 bg-teal-600 dark:border-volt-400 dark:bg-volt-400"
                                : "border-slate-300 dark:border-grid-600"
                            }`}
                          >
                            {selected && (
                              <CheckCircle2
                                size={14}
                                className="text-white dark:text-grid-950"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected charger */}

            {selectedCharger !== null && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50/60 p-4 dark:border-volt-400/20 dark:bg-volt-400/5">
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-teal-600 dark:text-volt-400"
                />

                <div>
                  <p className={`text-sm font-semibold ${STRONG}`}>
                    Charger selected
                  </p>

                  <p className={`mt-1 text-xs leading-5 ${BODY}`}>
                    Continue to booking to choose your arrival time. This
                    charger will be pre-selected.
                  </p>
                </div>
              </div>
            )}

            <div className={`mt-5 flex gap-3 rounded-xl border p-4 ${INSET}`}>
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
              />

              <p className={`text-xs leading-5 ${BODY}`}>
                Charger status refreshes every 30 seconds. Availability may
                still change before you arrive.
              </p>
            </div>
          </div>

          {/* INSIGHT SIDEBAR */}

          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-6 shadow-sm dark:border-volt-400/20 dark:from-grid-900 dark:to-grid-900 dark:shadow-glow">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-100/80 blur-3xl dark:bg-volt-400/10" />

              <div className="relative">
                <div className="flex items-center gap-2">
                  <Sparkles
                    size={18}
                    className="text-teal-600 dark:text-volt-300"
                  />

                  <p
                    className={`text-xs font-bold uppercase tracking-widest ${ACCENT_TEXT}`}
                  >
                    Station insight
                  </p>
                </div>

                <h3
                  className={`mt-4 font-display text-xl font-bold ${HEADING}`}
                >
                  {lowCongestion === null
                    ? "No live congestion data yet"
                    : lowCongestion
                      ? "Good time to charge here"
                      : "Expect some congestion"}
                </h3>

                <p className={`mt-2 text-sm leading-6 ${BODY}`}>
                  {lowCongestion === null
                    ? "This station has no predicted waiting time yet, so the score below uses only the data we have."
                    : lowCongestion
                      ? "The predicted waiting time is low, which makes this a strong charging option."
                      : "Predicted congestion is elevated. Consider checking nearby stations before booking."}
                </p>

                <div className="mt-6 space-y-3">
                  <Insight
                    icon={TrendingDown}
                    title="Predicted queue"
                    value={waitTime !== null ? `${waitTime} min` : "--"}
                  />

                  <Insight
                    icon={Zap}
                    title="Fastest charger"
                    value={fastestPower ? `${fastestPower} kW` : "Unavailable"}
                  />

                  <Insight
                    icon={BatteryCharging}
                    title="Chargers available"
                    value={totalCount > 0 ? `${availableCount}/${totalCount}` : "--"}
                  />
                </div>
              </div>
            </div>

            {/* Score */}

            <div className={`${CARD} p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={EYEBROW}>Match score</p>

                  <p className={`mt-1 text-xs ${MUTED}`}>
                    Average of the factors below
                  </p>
                </div>

                <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-teal-100 dark:border-volt-400/20">
                  <span
                    className={`font-display text-xl font-bold ${ACCENT_TEXT}`}
                  >
                    {recommendationScore ?? "--"}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {factors.map((factor) => (
                  <ScoreBar
                    key={factor.label}
                    label={factor.label}
                    value={factor.value}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            LOCATION (real map)
        ===================================================== */}

        <section className={`${CARD} overflow-hidden`}>
          <div
            className={`flex flex-col justify-between gap-3 border-b p-5 sm:flex-row sm:items-center ${DIVIDER}`}
          >
            <div>
              <p className={EYEBROW}>Location</p>

              <h3
                className={`mt-1 font-display text-lg font-semibold ${HEADING}`}
              >
                Station location
              </h3>
            </div>

            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${BTN_OUTLINE} !px-4 !py-2 ${FOCUS}`}
              >
                <Navigation size={15} />
                Get directions
              </a>
            )}
          </div>

          {hasCoordinates ? (
            <StationMiniMap
              key={station.id}
              latitude={station.latitude as number}
              longitude={station.longitude as number}
              name={station.name}
              distanceText={distanceText}
            />
          ) : (
            <div
              className={`flex h-48 items-center justify-center px-6 text-center text-sm ${MUTED}`}
            >
              This station has no map location yet.
            </div>
          )}
        </section>

        {/* =====================================================
            FINAL CTA
        ===================================================== */}

        <section className="rounded-3xl border border-teal-200 bg-gradient-to-r from-teal-50 via-white to-white p-6 dark:border-volt-400/20 dark:from-volt-400/10 dark:via-grid-900 dark:to-grid-900">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="flex gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${ACCENT_TILE}`}
              >
                <Zap size={22} />
              </div>

              <div>
                <h3 className={`font-display text-lg font-bold ${HEADING}`}>
                  Ready to reserve your charging slot?
                </h3>

                <p className={`mt-1 text-sm ${BODY}`}>
                  {selectedCharger !== null
                    ? "Your charger is selected. Continue to choose your arrival time."
                    : "Select an available charger and choose your arrival time."}
                </p>
              </div>
            </div>

            {bookButton(
              <>
                Continue to booking
                <ArrowRight size={16} />
              </>,
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

/* ============================================================
   MINI MAP
============================================================ */

function StationMiniMap({
  latitude,
  longitude,
  name,
  distanceText,
}: {
  latitude: number;
  longitude: number;
  name: string;
  distanceText: string | null;
}) {
  const { theme } = useTheme();
  const dark = theme === "dark";

  return (
    <div className="relative isolate h-64">
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          key={dark ? "dark" : "light"}
          attribution={
            dark
              ? "&copy; OpenStreetMap contributors &copy; CARTO"
              : "&copy; OpenStreetMap contributors"
          }
          url={
            dark
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
        />

        <CircleMarker
          center={[latitude, longitude]}
          radius={11}
          pathOptions={{
            color: "#0ea5e9",
            fillColor: "#0ea5e9",
            fillOpacity: 0.9,
            weight: 3,
          }}
        />
      </MapContainer>

      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-grid-700 dark:bg-grid-900/90">
        <p className={`text-xs font-semibold ${STRONG}`}>{name}</p>

        <p className={`mt-1 text-xs ${BODY}`}>
          {distanceText !== null
            ? `${distanceText} km from your location`
            : "Distance unavailable"}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   SMALL PIECES
============================================================ */

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="p-5">
      <div className={`flex items-center gap-2 ${BODY}`}>
        <Icon size={15} />

        <span className="text-xs">{label}</span>
      </div>

      <p className={`mt-2 font-display text-xl font-bold ${HEADING}`}>{value}</p>

      <p className={`mt-1 text-xs ${MUTED}`}>{detail}</p>
    </div>
  );
}

function Insight({
  icon: Icon,
  title,
  value,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border p-3 ${INSET}`}
    >
      <div className="flex items-center gap-3">
        <Icon size={16} className="text-teal-600 dark:text-volt-300" />

        <span className={`text-sm ${BODY}`}>{title}</span>
      </div>

      <span className={`text-sm font-semibold ${STRONG}`}>{value}</span>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const safeValue = value === null ? null : clamp(value);

  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className={BODY}>{label}</span>

        <span className={`font-medium ${BODY}`}>
          {safeValue === null ? "No data" : `${safeValue}%`}
        </span>
      </div>

      <div
        className="h-1.5 rounded-full bg-slate-100 dark:bg-grid-800"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue ?? undefined}
      >
        <div
          className="h-full rounded-full bg-teal-500 transition-all dark:bg-volt-400"
          style={{ width: `${safeValue ?? 0}%` }}
        />
      </div>
    </div>
  );
}