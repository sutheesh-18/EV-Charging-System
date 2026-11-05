import { useEffect, useMemo, useState, type ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BatteryCharging,
  BrainCircuit,
  CalendarClock,
  Car,
  CheckCircle2,
  Clock3,
  Gauge,
  History,
  IndianRupee,
  Leaf,
  LineChart,
  MapPin,
  Navigation,
  PlugZap,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

import AppShell from "../../components/layout/AppShell";
import ActivityCharts from "../../components/dashboard/ActivityCharts";
import VehicleShowcase from "../../components/common/VehicleShowcase";
import { api } from "../../api/client";

/* ============================================================
   TYPES (unchanged API contract)
============================================================ */

type Recommendation = {
  station_id?: number;
  station_name?: string;
  distance_km?: number;
  wait_minutes?: number;
  charger_power_kw?: number;
  price_per_kwh?: number;
  score?: number;
  reachable?: boolean;
  reasons?: string[];
};

type DashboardOverview = {
  battery_percentage?: number;
  range_km?: number;
  vehicle_name?: string;
  recommendation?: Recommendation | null;
  active_booking?: {
    id: number;
    station_name: string;
    start_time?: string;
    status?: string;
  } | null;
  energy_consumed_kwh?: number;
  co2_saved_kg?: number;
  location_available?: boolean;
  vehicle_configured?: boolean;
};

/* the driver's saved vehicle (same endpoint as the My EV page) */
type DriverVehicle = {
  id: number;
  name: string;
  manufacturer: string;
  model: string;
  is_default: boolean;
};

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
const MUTED = "text-slate-500 dark:text-grid-400";

/* ============================================================
   SMALL HELPERS
============================================================ */

function useNow(intervalMs = 5000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

function timeAgo(timestamp: number, now: number) {
  if (!timestamp) return "waiting for data";
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

function formatStart(value?: string) {
  if (!value) return "Scheduled session";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function clampPercent(value: number) {
  return Math.min(Math.max(value, 0), 100);
}

function batteryTone(percent?: number) {
  if (percent === undefined) {
    return {
      bar: "bg-slate-300 dark:bg-grid-600",
      chip: "bg-slate-100 text-slate-500 dark:bg-grid-800 dark:text-grid-300",
      label: "Unknown",
    };
  }
  if (percent < 20) {
    return {
      bar: "bg-red-500",
      chip: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
      label: "Low",
    };
  }
  if (percent < 50) {
    return {
      bar: "bg-amber-500",
      chip: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
      label: "Moderate",
    };
  }
  return {
    bar: "bg-teal-500",
    chip: "bg-teal-50 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300",
    label: "Healthy",
  };
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

export default function Dashboard() {
  /* ---------- browser location ---------- */

  const [location, setLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Location services are not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setLocationError(null);
      },
      () => {
        setLocationError(
          "Location permission is required for live AI recommendations.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    );
  }, []);

  /* ---------- dashboard API ---------- */

  const { data, isLoading, isError, isFetching, refetch, dataUpdatedAt } =
    useQuery<DashboardOverview>({
      queryKey: ["dashboard-overview", location?.lat, location?.lon],

      queryFn: async () => {
        const params =
          location !== null
            ? { lat: location.lat, lon: location.lon }
            : undefined;

        return (await api.get("/dashboard/overview", { params })).data;
      },

      refetchInterval: 30000,
    });

  /* ---------- saved vehicle (for the real car photo) ---------- */

  const { data: vehicleList } = useQuery<DriverVehicle[]>({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const response = await api.get("/users/me/vehicles");
      if (Array.isArray(response.data)) return response.data;
      if (Array.isArray(response.data?.vehicles)) return response.data.vehicles;
      return [];
    },
  });

  const savedVehicle =
    vehicleList?.find((item) => item.is_default) ?? vehicleList?.[0];

  // manufacturer + model identify the car best; the nickname is a fallback
  const carNames = useMemo(
    () => [
      savedVehicle ? `${savedVehicle.manufacturer} ${savedVehicle.model}` : "",
      savedVehicle?.name,
      data?.vehicle_name,
    ],
    [savedVehicle, data?.vehicle_name],
  );

  const now = useNow();

  const recommendation = data?.recommendation ?? null;
  const battery = data?.battery_percentage;
  const range = data?.range_km;
  const vehicleReady = data?.vehicle_configured === true;

  const hasRecommendation = recommendation?.station_name !== undefined;
  const stationId = recommendation?.station_id;

  const tone = batteryTone(battery);
  const lowBattery = vehicleReady && battery !== undefined && battery < 20;

  // Approximate range left when arriving at the recommended station
  const arrivalRange =
    range !== undefined && recommendation?.distance_km !== undefined
      ? Math.round(range - recommendation.distance_km)
      : undefined;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <section className={`relative overflow-hidden ${CARD} p-6 sm:p-8`}>
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-teal-100/70 blur-3xl dark:bg-volt-500/10" />

          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-volt-500/15 dark:text-volt-300">
                  <Zap size={19} />
                </div>

                <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-volt-300">
                  Driver workspace
                </p>
              </div>

              <h1
                className={`mt-3 font-display text-3xl font-bold tracking-tight ${HEADING}`}
              >
                Your charging command center
              </h1>

              <p className={`mt-2 max-w-2xl text-sm leading-6 ${MUTED}`}>
                VoltGrid combines live station data and AI predictions to help
                you choose the best place to charge.
              </p>

              {/* live status row */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    isError
                      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300"
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    {!isError && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                    )}
                    <span
                      className={`relative inline-flex h-2 w-2 rounded-full ${
                        isError ? "bg-red-500" : "bg-emerald-500"
                      }`}
                    />
                  </span>
                  {isError ? "Offline" : "Live"} · updated{" "}
                  {timeAgo(dataUpdatedAt, now)}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    locationError
                      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300"
                      : "border-slate-200 bg-white text-slate-600 dark:border-grid-700 dark:bg-grid-900/60 dark:text-grid-300"
                  }`}
                >
                  <MapPin size={13} />
                  {locationError
                    ? "Location off"
                    : location
                      ? "Location on"
                      : "Locating…"}
                </span>

                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:text-teal-700 disabled:opacity-60 dark:border-grid-700 dark:bg-grid-900/60 dark:text-grid-300 dark:hover:border-volt-500/50 dark:hover:text-volt-300"
                >
                  <RefreshCw
                    size={13}
                    className={isFetching ? "animate-spin" : ""}
                  />
                  Refresh
                </button>
              </div>
            </div>

            <Link
              to="/map"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 dark:bg-volt-500 dark:text-grid-950 dark:hover:bg-volt-400 dark:hover:shadow-glow"
            >
              <MapPin size={17} />
              Find a charger
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        {/* =====================================================
            ALERTS
        ===================================================== */}

        {(locationError || isError || lowBattery) && (
          <div className="space-y-3">
            {lowBattery && (
              <AlertBanner
                tone="red"
                icon={BatteryCharging}
                title={`Battery is low (${battery}%)`}
                text="Charge soon. Pick a nearby station below to avoid running out of range."
                actionLabel="Find a charger"
                actionTo="/map"
              />
            )}

            {locationError && (
              <AlertBanner
                tone="amber"
                icon={MapPin}
                title="Location required for AI recommendations"
                text="Allow location access in your browser so VoltGrid can calculate the best charging station near you."
              />
            )}

            {isError && (
              <AlertBanner
                tone="red"
                icon={AlertTriangle}
                title="Unable to load live charging data"
                text="Please check that the VoltGrid backend is running and that you are signed in."
                actionLabel="Try again"
                onAction={() => refetch()}
              />
            )}
          </div>
        )}

        {/* =====================================================
            KPI ROW
        ===================================================== */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            loading={isLoading}
            label="Battery"
            value={battery !== undefined ? `${battery}%` : "--"}
            description={
              range !== undefined
                ? `Estimated range ${range} km`
                : "Vehicle range unavailable"
            }
            icon={BatteryCharging}
            accent="teal"
            progress={battery}
            progressClass={tone.bar}
            badge={battery !== undefined ? tone.label : undefined}
            badgeClass={tone.chip}
          />

          <Kpi
            loading={isLoading}
            label="AI match score"
            value={
              recommendation?.score !== undefined
                ? `${recommendation.score}`
                : "--"
            }
            suffix={recommendation?.score !== undefined ? "/100" : undefined}
            description={
              hasRecommendation
                ? "Best station for your trip"
                : "Waiting for recommendation"
            }
            icon={Sparkles}
            accent="blue"
          />

          <Kpi
            loading={isLoading}
            label="Predicted wait"
            value={
              recommendation?.wait_minutes !== undefined
                ? `${recommendation.wait_minutes}`
                : "--"
            }
            suffix={recommendation?.wait_minutes !== undefined ? "min" : undefined}
            description="Expected queue time"
            icon={Clock3}
            accent="amber"
          />

          <Kpi
            loading={isLoading}
            label="Fast charging"
            value={
              recommendation?.charger_power_kw !== undefined
                ? `${recommendation.charger_power_kw}`
                : "--"
            }
            suffix={
              recommendation?.charger_power_kw !== undefined ? "kW" : undefined
            }
            description="Recommended charger speed"
            icon={PlugZap}
            accent="purple"
          />
        </section>

        {/* =====================================================
            RECOMMENDATION + SIDE COLUMN
        ===================================================== */}

        <section className="grid gap-6 xl:grid-cols-[1.5fr_0.5fr]">
          {/* ------------- AI RECOMMENDATION ------------- */}

          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8 dark:border-teal-400/15 dark:bg-gradient-to-br dark:from-grid-850 dark:to-grid-900">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-500/15 blur-3xl" />

            <div className="relative">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300">
                    <BrainCircuit size={22} />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">
                      AI recommendation
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Best charging option right now
                    </p>
                  </div>
                </div>

                <span className="rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1 text-xs font-semibold text-teal-300">
                  {hasRecommendation ? "Live decision" : "Waiting for data"}
                </span>
              </div>

              {isLoading ? (
                <div className="mt-8 space-y-4">
                  <div className="h-3 w-40 animate-pulse rounded bg-white/10" />
                  <div className="h-9 w-2/3 animate-pulse rounded bg-white/10" />
                  <div className="grid gap-3 sm:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-20 animate-pulse rounded-xl bg-white/5"
                      />
                    ))}
                  </div>
                </div>
              ) : hasRecommendation ? (
                <div className="mt-8">
                  <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Recommended station
                      </p>

                      <h2 className="mt-2 truncate font-display text-2xl font-bold text-white sm:text-3xl">
                        {recommendation?.station_name}
                      </h2>

                      {/* key facts */}
                      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <DarkFact
                          icon={Navigation}
                          iconClass="text-teal-400"
                          label="Distance"
                          value={`${recommendation?.distance_km ?? "--"} km`}
                        />
                        <DarkFact
                          icon={Clock3}
                          iconClass="text-amber-400"
                          label="Wait"
                          value={`${recommendation?.wait_minutes ?? "--"} min`}
                        />
                        <DarkFact
                          icon={Zap}
                          iconClass="text-blue-400"
                          label="Power"
                          value={`${recommendation?.charger_power_kw ?? "--"} kW`}
                        />
                        <DarkFact
                          icon={IndianRupee}
                          iconClass="text-violet-400"
                          label="Price"
                          value={`₹${recommendation?.price_per_kwh ?? "--"}/kWh`}
                        />
                      </div>

                      {/* arrival range */}
                      {arrivalRange !== undefined && range !== undefined && (
                        <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="flex items-center gap-2 text-slate-300">
                              <Route size={15} className="text-teal-400" />
                              Range on arrival (approx.)
                            </span>
                            <span
                              className={`font-semibold ${
                                arrivalRange < 0
                                  ? "text-red-300"
                                  : arrivalRange < range * 0.15
                                    ? "text-amber-300"
                                    : "text-teal-300"
                              }`}
                            >
                              {arrivalRange < 0
                                ? "May not be reachable"
                                : `${arrivalRange} km left`}
                            </span>
                          </div>

                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                arrivalRange < 0
                                  ? "bg-red-400"
                                  : arrivalRange < range * 0.15
                                    ? "bg-amber-400"
                                    : "bg-teal-400"
                              }`}
                              style={{
                                width: `${clampPercent(
                                  range > 0 ? (arrivalRange / range) * 100 : 0,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* AI reasons */}
                      <div className="mt-6">
                        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Why this station
                        </p>

                        <div className="space-y-2.5">
                          {recommendation?.reasons &&
                          recommendation.reasons.length > 0 ? (
                            recommendation.reasons
                              .slice(0, 5)
                              .map((reason) => (
                                <Reason key={reason} text={reason} />
                              ))
                          ) : (
                            <Reason
                              text={
                                recommendation?.reachable
                                  ? "Reachable with your current battery"
                                  : "Recommendation data available"
                              }
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* score ring */}
                    <div className="flex items-start justify-center lg:pt-6">
                      <ScoreRing score={recommendation?.score} />
                    </div>
                  </div>

                  {/* actions */}
                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    {stationId !== undefined ? (
                      <Link
                        to={`/booking/${stationId}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-teal-500/10 transition hover:bg-teal-400"
                      >
                        <PlugZap size={17} />
                        Book this charger
                        <ArrowRight size={16} />
                      </Link>
                    ) : (
                      <Link
                        to="/map"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-5 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-teal-400"
                      >
                        <MapPin size={17} />
                        Choose a station
                        <ArrowRight size={16} />
                      </Link>
                    )}

                    <Link
                      to="/map"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      <Navigation size={17} />
                      View on map
                    </Link>
                  </div>

                  <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-5 text-sm text-slate-400">
                    <ShieldCheck
                      size={16}
                      className={
                        recommendation?.reachable === false
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }
                    />
                    {recommendation?.reachable === false
                      ? "Battery range may be insufficient"
                      : "Battery-safe recommendation"}
                  </div>
                </div>
              ) : (
                <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-7 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-400/10 text-teal-300">
                    <BrainCircuit size={25} />
                  </div>

                  <h2 className="mt-4 text-lg font-semibold text-white">
                    No charging recommendation yet
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                    {vehicleReady
                      ? "VoltGrid needs your current location to calculate the best charging station."
                      : "Set up your EV first, then VoltGrid can combine your vehicle data with live station conditions."}
                  </p>

                  <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                    <Link
                      to={vehicleReady ? "/map" : "/my-ev"}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-400"
                    >
                      {vehicleReady ? <MapPin size={16} /> : <Car size={16} />}
                      {vehicleReady ? "Find a charger" : "Set up your EV"}
                      <ArrowRight size={15} />
                    </Link>

                    <Link
                      to="/bookings"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      My bookings
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ------------- SIDE COLUMN ------------- */}

          <div className="space-y-6">
            {/* vehicle */}
            <div className={`${CARD} p-6`}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className={EYEBROW}>Your vehicle</p>

                  {isLoading ? (
                    <Skeleton className="mt-2 h-5 w-32" />
                  ) : (
                    <h2
                      className={`mt-1 truncate font-display text-lg font-bold ${HEADING}`}
                    >
                      {vehicleReady ? data?.vehicle_name : "No EV configured"}
                    </h2>
                  )}
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300">
                  <Car size={21} />
                </div>
              </div>

              {/* photo of the driver's real car, or the interactive 3D car */}
              {vehicleReady && (
                <div className="mt-5">
                  <VehicleShowcase
                    names={carNames}
                    batteryPercent={battery ?? 0}
                    rangeKm={range}
                    charging={data?.active_booking?.status === "in_progress"}
                  />
                </div>
              )}

              <div className={`mt-5 ${PANEL} p-5`}>
                {vehicleReady ? (
                  <>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className={`text-xs ${MUTED}`}>Current battery</p>
                        <p
                          className={`mt-1 font-display text-3xl font-bold ${HEADING}`}
                        >
                          {battery !== undefined ? `${battery}%` : "--"}
                        </p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.chip}`}
                        >
                          {tone.label}
                        </span>
                        <p className={`mt-2 text-sm font-medium ${MUTED}`}>
                          {range !== undefined ? `${range} km range` : "--"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-grid-700">
                      <div
                        className={`h-full rounded-full ${tone.bar} transition-all duration-500`}
                        style={{
                          width: `${battery !== undefined ? clampPercent(battery) : 0}%`,
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="py-2 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm dark:bg-grid-800 dark:text-volt-300">
                      <Car size={20} />
                    </div>
                    <p
                      className={`mt-3 text-sm font-semibold ${HEADING}`}
                    >
                      Set up your EV to unlock live charging intelligence
                    </p>
                    <p className={`mt-1 text-xs leading-5 ${MUTED}`}>
                      Add your battery, range and charger details so VoltGrid
                      can calculate real recommendations.
                    </p>
                    <Link
                      to="/my-ev"
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 dark:bg-volt-500 dark:text-grid-950 dark:hover:bg-volt-400"
                    >
                      Set up my EV
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <MiniStat
                  icon={Zap}
                  label="Energy used"
                  value={
                    vehicleReady && data?.energy_consumed_kwh !== undefined
                      ? `${data.energy_consumed_kwh} kWh`
                      : "--"
                  }
                />
                <MiniStat
                  icon={Leaf}
                  label="CO₂ saved"
                  value={
                    vehicleReady && data?.co2_saved_kg !== undefined
                      ? `${data.co2_saved_kg} kg`
                      : "--"
                  }
                />
              </div>
            </div>

            {/* upcoming session */}
            <div className={`${CARD} p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={EYEBROW}>Upcoming</p>
                  <h2
                    className={`mt-1 font-display text-lg font-bold ${HEADING}`}
                  >
                    Next charging session
                  </h2>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300">
                  <CalendarClock size={18} />
                </div>
              </div>

              {data?.active_booking ? (
                <div className={`mt-4 ${PANEL} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`truncate font-semibold ${HEADING}`}>
                        {data.active_booking.station_name}
                      </p>
                      <p className={`mt-1 text-sm ${MUTED}`}>
                        {formatStart(data.active_booking.start_time)}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold capitalize text-teal-700 dark:bg-teal-400/15 dark:text-teal-300">
                      {data.active_booking.status ?? "Confirmed"}
                    </span>
                  </div>

                  <Link
                    to="/bookings"
                    className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-sm font-semibold text-teal-700 dark:border-grid-700 dark:text-volt-300"
                  >
                    View booking
                    <ArrowRight size={15} />
                  </Link>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-grid-600 dark:bg-grid-900/40">
                  <p className={`text-sm font-semibold ${HEADING}`}>
                    No upcoming charging session
                  </p>
                  <p className={`mt-1 text-xs leading-5 ${MUTED}`}>
                    Find a suitable station and reserve your next session.
                  </p>
                  <Link
                    to="/map"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 dark:text-volt-300"
                  >
                    Find a station
                    <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =====================================================
            CHARGING ACTIVITY (charts)
        ===================================================== */}

        <ActivityCharts />

        {/* =====================================================
            QUICK ACTIONS
        ===================================================== */}

        <section>
          <p className={`mb-3 ${EYEBROW}`}>Quick actions</p>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <QuickAction
              to="/map"
              icon={MapPin}
              title="Find a charger"
              text="Search stations on the live map"
            />
            <QuickAction
              to="/bookings"
              icon={CalendarClock}
              title="My bookings"
              text="Manage your reserved sessions"
            />
            <QuickAction
              to="/predictions"
              icon={LineChart}
              title="AI predictions"
              text="Queue and wait-time forecasts"
            />
            <QuickAction
              to="/history"
              icon={History}
              title="Charging history"
              text="Review past sessions and costs"
            />
          </div>
        </section>

        {/* =====================================================
            AI EXPLANATION
        ===================================================== */}

        <section className="rounded-2xl border border-teal-100 bg-teal-50/60 p-5 dark:border-teal-400/15 dark:bg-teal-400/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300">
              <Gauge size={19} />
            </div>

            <div className="flex-1">
              <p className={`text-sm font-bold ${HEADING}`}>
                Why VoltGrid recommended this station
              </p>

              <p className={`mt-1 text-xs leading-5 ${MUTED}`}>
                The recommendation considers predicted queue length, estimated
                waiting time, charger speed, distance, battery range, station
                availability, charging cost and network conditions.
              </p>
            </div>

            <Link
              to="/predictions"
              className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-teal-700 dark:text-volt-300"
            >
              Explore AI
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

/* ============================================================
   COMPONENTS
============================================================ */

type Accent = "teal" | "blue" | "amber" | "purple";

const ACCENTS: Record<Accent, string> = {
  teal: "bg-teal-50 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  purple:
    "bg-violet-50 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
};

function Kpi({
  label,
  value,
  suffix,
  description,
  icon: Icon,
  accent,
  progress,
  progressClass = "bg-teal-500",
  badge,
  badgeClass = "",
  loading,
}: {
  label: string;
  value: string;
  suffix?: string;
  description: string;
  icon: ElementType;
  accent: Accent;
  progress?: number;
  progressClass?: string;
  badge?: string;
  badgeClass?: string;
  loading?: boolean;
}) {
  return (
    <div
      className={`${CARD} overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className={EYEBROW}>{label}</p>

          {loading ? (
            <Skeleton className="mt-3 h-8 w-24" />
          ) : (
            <p
              className={`mt-2 flex items-baseline gap-1 font-display text-3xl font-bold ${HEADING}`}
            >
              {value}
              {suffix && (
                <span className="text-sm font-medium text-slate-400 dark:text-grid-400">
                  {suffix}
                </span>
              )}
            </p>
          )}
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ACCENTS[accent]}`}
        >
          <Icon size={19} />
        </div>
      </div>

      {progress !== undefined && !loading && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-grid-700">
          <div
            className={`h-full rounded-full ${progressClass} transition-all duration-500`}
            style={{ width: `${clampPercent(progress)}%` }}
          />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className={`text-xs ${MUTED}`}>{description}</p>
        {badge && !loading && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

function AlertBanner({
  tone,
  icon: Icon,
  title,
  text,
  actionLabel,
  actionTo,
  onAction,
}: {
  tone: "red" | "amber";
  icon: ElementType;
  title: string;
  text: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}) {
  const styles =
    tone === "red"
      ? {
          box: "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10",
          icon: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300",
          title: "text-red-900 dark:text-red-200",
          text: "text-red-700 dark:text-red-300/80",
          action: "text-red-700 dark:text-red-300",
        }
      : {
          box: "border-amber-200 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-400/10",
          icon: "bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300",
          title: "text-amber-900 dark:text-amber-200",
          text: "text-amber-700 dark:text-amber-300/80",
          action: "text-amber-700 dark:text-amber-300",
        };

  const actionClass = `shrink-0 self-center text-sm font-semibold ${styles.action}`;

  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 ${styles.box}`}>
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}
      >
        <Icon size={17} />
      </div>

      <div className="flex-1">
        <p className={`text-sm font-semibold ${styles.title}`}>{title}</p>
        <p className={`mt-1 text-xs leading-5 ${styles.text}`}>{text}</p>
      </div>

      {actionLabel && actionTo && (
        <Link to={actionTo} className={actionClass}>
          {actionLabel}
        </Link>
      )}

      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className={actionClass}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function ScoreRing({ score }: { score?: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const percent = score === undefined ? 0 : clampPercent(score) / 100;

  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-white/10"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent)}
          className="text-teal-300 transition-all duration-700"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-display text-4xl font-bold text-teal-300">
          {score ?? "--"}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">match score</p>
      </div>
    </div>
  );
}

function DarkFact({
  icon: Icon,
  iconClass,
  label,
  value,
}: {
  icon: ElementType;
  iconClass: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        <Icon size={13} className={iconClass} />
        {label}
      </div>
      <p className="mt-1.5 truncate text-base font-bold text-white">{value}</p>
    </div>
  );
}

function Reason({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-slate-300">
      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-teal-400" />
      {text}
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className={`${PANEL} p-3`}>
      <div className={`flex items-center gap-1.5 ${EYEBROW}`}>
        <Icon size={12} />
        {label}
      </div>
      <p className={`mt-1 text-sm font-bold ${HEADING}`}>{value}</p>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  title,
  text,
}: {
  to: string;
  icon: ElementType;
  title: string;
  text: string;
}) {
  return (
    <Link
      to={to}
      className={`group ${CARD} flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md dark:hover:border-volt-500/40`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 transition group-hover:bg-teal-100 dark:bg-volt-500/15 dark:text-volt-300 dark:group-hover:bg-volt-500/25">
        <Icon size={20} />
      </div>

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold ${HEADING}`}>{title}</p>
        <p className={`mt-0.5 truncate text-xs ${MUTED}`}>{text}</p>
      </div>

      <ArrowRight
        size={16}
        className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-teal-600 dark:text-grid-600 dark:group-hover:text-volt-300"
      />
    </Link>
  );
}