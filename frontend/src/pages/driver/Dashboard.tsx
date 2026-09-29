import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  BatteryCharging,
  BrainCircuit,
  Car,
  CheckCircle2,
  Clock3,
  MapPin,
  Navigation,
  PlugZap,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

import AppShell from "../../components/layout/AppShell";
import { api } from "../../api/client";

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

export default function Dashboard() {
  /* ============================================================
     BROWSER LOCATION
  ============================================================ */

  const [location, setLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  const [locationError, setLocationError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError(
        "Location services are not supported by this browser.",
      );
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

  /* ============================================================
     DASHBOARD API
  ============================================================ */

  const { data, isLoading, isError } =
    useQuery<DashboardOverview>({
      queryKey: [
        "dashboard-overview",
        location?.lat,
        location?.lon,
      ],

      queryFn: async () => {
        const params =
          location !== null
            ? {
                lat: location.lat,
                lon: location.lon,
              }
            : undefined;

        return (
          await api.get("/dashboard/overview", {
            params,
          })
        ).data;
      },

      refetchInterval: 30000,
    });

  const recommendation = data?.recommendation ?? null;

  const battery = data?.battery_percentage;
  const range = data?.range_km;

  const hasRecommendation =
    recommendation?.station_name !== undefined;

  const canBook =
    recommendation?.station_id !== undefined;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-7">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-teal-100/70 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">

            <div>

              <div className="flex items-center gap-2">

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <Zap size={19} />
                </div>

                <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
                  Driver workspace
                </p>

              </div>

              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900">
                Your charging command center
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                VoltGrid combines live station data and AI predictions
                to help you choose the best place to charge.
              </p>

            </div>

            <Link
              to="/map"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
            >
              <MapPin size={17} />
              Find a charger
              <ArrowRight size={16} />
            </Link>

          </div>

        </section>

        {/* =====================================================
            LOCATION STATUS
        ===================================================== */}

        {locationError && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <MapPin size={17} />
            </div>

            <div>
              <p className="text-sm font-semibold text-amber-900">
                Location required for AI recommendations
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-700">
                Allow location access in your browser so VoltGrid
                can calculate the best charging station near you.
              </p>
            </div>

          </div>
        )}

        {/* =====================================================
            API ERROR
        ===================================================== */}

        {isError && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <Activity size={17} />
            </div>

            <div>
              <p className="text-sm font-semibold text-red-900">
                Unable to load live charging data
              </p>

              <p className="mt-1 text-xs leading-5 text-red-700">
                Please check that the VoltGrid backend is running
                and that you are signed in.
              </p>
            </div>

          </div>
        )}

        {/* =====================================================
            PRIMARY KPI
        ===================================================== */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <DashboardMetric
            label="Battery"
            value={
              battery !== undefined
                ? `${battery}%`
                : "--"
            }
            description={
              range !== undefined
                ? `Estimated range ${range} km`
                : "Vehicle range unavailable"
            }
            icon={BatteryCharging}
            tone="teal"
            progress={battery}
          />

          <DashboardMetric
            label="AI match score"
            value={
              recommendation?.score !== undefined
                ? `${recommendation.score}`
                : "--"
            }
            description={
              hasRecommendation
                ? "Best station for your trip"
                : "Waiting for recommendation"
            }
            icon={Sparkles}
            tone="blue"
          />

          <DashboardMetric
            label="Predicted wait"
            value={
              recommendation?.wait_minutes !== undefined
                ? `${recommendation.wait_minutes} min`
                : "--"
            }
            description="Expected queue time"
            icon={Clock3}
            tone="amber"
          />

          <DashboardMetric
            label="Fast charging"
            value={
              recommendation?.charger_power_kw !== undefined
                ? `${recommendation.charger_power_kw} kW`
                : "--"
            }
            description="Recommended charger speed"
            icon={PlugZap}
            tone="purple"
          />

        </section>

        {/* =====================================================
            AI RECOMMENDATION + VEHICLE
        ===================================================== */}

        <section className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">

          {/* =================================================
              AI RECOMMENDATION
          ================================================= */}

          <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 shadow-xl sm:p-8">

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
                  {hasRecommendation
                    ? "Live decision"
                    : "Waiting for data"}
                </span>

              </div>

              {/* =================================================
                  RECOMMENDATION AVAILABLE
              ================================================= */}

              {hasRecommendation ? (

                <div className="mt-8">

                  <div className="grid gap-8 lg:grid-cols-[1fr_auto]">

                    <div>

                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Recommended station
                      </p>

                      <h2 className="mt-2 truncate font-display text-2xl font-bold text-white sm:text-3xl">
                        {recommendation?.station_name}
                      </h2>

                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-400">

                        <span className="flex items-center gap-1.5">
                          <Navigation
                            size={15}
                            className="text-teal-400"
                          />
                          {recommendation?.distance_km ?? "--"} km
                        </span>

                        <span className="flex items-center gap-1.5">
                          <Clock3
                            size={15}
                            className="text-amber-400"
                          />
                          {recommendation?.wait_minutes ?? "--"} min wait
                        </span>

                        <span className="flex items-center gap-1.5">
                          <Zap
                            size={15}
                            className="text-blue-400"
                          />
                          {recommendation?.charger_power_kw ?? "--"} kW
                        </span>

                        <span className="flex items-center gap-1.5">
                          ₹{recommendation?.price_per_kwh ?? "--"}/kWh
                        </span>

                      </div>

                      {/* AI REASONS */}

                      <div className="mt-7 space-y-3">

                        {recommendation?.reasons &&
                        recommendation.reasons.length > 0 ? (

                          recommendation.reasons
                            .slice(0, 5)
                            .map((reason) => (
                              <Reason
                                key={reason}
                                text={reason}
                              />
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

                    {/* SCORE */}

                    <div className="flex items-center justify-center">

                      <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-[5px] border-teal-400/20">

                        <div className="absolute inset-2 rounded-full border border-teal-400/10" />

                        <div className="text-center">

                          <p className="font-display text-4xl font-bold text-teal-300">
                            {recommendation?.score ?? "--"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            match score
                          </p>

                        </div>

                      </div>

                    </div>

                  </div>

                  {/* =================================================
                      BOOKING ACTIONS
                  ================================================= */}

                  <div className="mt-8 grid gap-3 sm:grid-cols-2">

                    {canBook ? (
                      <Link
                        to={`/booking/${recommendation.station_id}`}
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

                </div>

              ) : (

                /* =================================================
                   NO RECOMMENDATION
                ================================================= */

                <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-7 text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-400/10 text-teal-300">
                    <BrainCircuit size={25} />
                  </div>

                  <h2 className="mt-4 text-lg font-semibold text-white">
                    No charging recommendation yet
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                    {data?.vehicle_configured
                      ? "VoltGrid needs your current location to calculate the best charging station."
                      : "Set up your EV first, then VoltGrid can combine your vehicle data with live station conditions."}
                  </p>

                  <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">

                    <Link
                      to={data?.vehicle_configured ? "/map" : "/my-ev"}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-400"
                    >
                      {data?.vehicle_configured ? <MapPin size={16} /> : <Car size={16} />}
                      {data?.vehicle_configured ? "Find a charger" : "Set up your EV"}
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

              {/* BOTTOM STATUS */}

              {hasRecommendation && (
                <div className="mt-8 flex flex-col justify-between gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center">

                  <div className="flex items-center gap-2 text-sm text-slate-400">

                    <ShieldCheck
                      size={16}
                      className="text-emerald-400"
                    />

                    {recommendation?.reachable === false
                      ? "Battery range may be insufficient"
                      : "Battery-safe recommendation"}

                  </div>

                  <Link
                    to="/map"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-teal-300 transition hover:text-teal-200"
                  >
                    View station
                    <ArrowRight size={15} />
                  </Link>

                </div>
              )}

            </div>

          </div>

          {/* =================================================
              VEHICLE
          ================================================= */}

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Your vehicle
                </p>

                <h2 className="mt-1 font-display text-lg font-bold text-slate-900">
                  {data?.vehicle_configured ? data?.vehicle_name : "No EV configured"}
                </h2>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Car size={21} />
              </div>

            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">

              {data?.vehicle_configured ? (
                <>
                  <div className="flex items-end justify-between">

                    <div>

                      <p className="text-xs text-slate-500">
                        Current battery
                      </p>

                      <p className="mt-1 font-display text-3xl font-bold text-slate-900">
                        {battery !== undefined
                          ? `${battery}%`
                          : "--"}
                      </p>

                    </div>

                    <p className="text-sm font-medium text-slate-500">
                      {range !== undefined
                        ? `${range} km range`
                        : "--"}
                    </p>

                  </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">

                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-700 to-teal-400 transition-all duration-500"
                  style={{
                    width: `${
                      battery !== undefined
                        ? Math.min(
                            Math.max(battery, 0),
                            100,
                          )
                        : 0
                    }%`,
                  }}
                />

              </div>
                </>
              ) : (
                <div className="py-2 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm">
                    <Car size={20} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-800">
                    Set up your EV to unlock live charging intelligence
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Add your battery, range and charger details so VoltGrid can calculate real recommendations.
                  </p>
                  <Link
                    to="/my-ev"
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
                  >
                    Set up my EV
                    <ArrowRight size={15} />
                  </Link>
                </div>
              )}

            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">

              <VehicleStat
                label="Energy used"
                value={data?.vehicle_configured && data?.energy_consumed_kwh !== undefined ? `${data.energy_consumed_kwh} kWh` : "--"}
              />

              <VehicleStat
                label="CO₂ saved"
                value={data?.vehicle_configured && data?.co2_saved_kg !== undefined ? `${data.co2_saved_kg} kg` : "--"}
              />

            </div>

          </div>

        </section>

        {/* =====================================================
            ACTIVE BOOKING
        ===================================================== */}

        <section className="grid gap-6 lg:grid-cols-2">

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Upcoming
                </p>

                <h2 className="mt-1 font-display text-lg font-bold text-slate-900">
                  Next charging session
                </h2>

              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <Clock3 size={18} />
              </div>

            </div>

            {data?.active_booking ? (

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">

                <div className="flex items-start justify-between gap-4">

                  <div>

                    <p className="font-semibold text-slate-900">
                      {data.active_booking.station_name}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {data.active_booking.start_time ??
                        "Scheduled session"}
                    </p>

                  </div>

                  <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold capitalize text-teal-700">
                    {data.active_booking.status ??
                      "Confirmed"}
                  </span>

                </div>

                <Link
                  to="/bookings"
                  className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 text-sm font-semibold text-teal-700"
                >
                  View booking
                  <ArrowRight size={15} />
                </Link>

              </div>

            ) : (

              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                  <Clock3 size={20} />
                </div>

                <p className="mt-4 text-sm font-semibold text-slate-700">
                  No upcoming charging session
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Find a suitable station and reserve your next
                  charging session.
                </p>

                <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">

                  <Link
                    to="/map"
                    className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-teal-700"
                  >
                    Find a station
                    <ArrowRight size={14} />
                  </Link>

                  <Link
                    to="/bookings"
                    className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-slate-500"
                  >
                    My bookings
                    <ArrowRight size={14} />
                  </Link>

                </div>

              </div>

            )}

          </div>

          {/* =================================================
              RECOMMENDATION SNAPSHOT
          ================================================= */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Network intelligence
                </p>

                <h2 className="mt-1 font-display text-lg font-bold text-slate-900">
                  Recommendation snapshot
                </h2>

              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Zap size={18} />
              </div>

            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">

              <NetworkStat
                label="Recommended charger"
                value={
                  recommendation?.charger_power_kw !== undefined
                    ? `${recommendation.charger_power_kw}`
                    : "--"
                }
                suffix="kW"
              />

              <NetworkStat
                label="Predicted wait"
                value={
                  recommendation?.wait_minutes !== undefined
                    ? `${recommendation.wait_minutes}`
                    : "--"
                }
                suffix="min"
              />

              <NetworkStat
                label="Charging cost"
                value={
                  recommendation?.price_per_kwh !== undefined
                    ? `₹${recommendation.price_per_kwh}`
                    : "--"
                }
                suffix="/kWh"
              />

              <NetworkStat
                label="Station score"
                value={
                  recommendation?.score !== undefined
                    ? `${recommendation.score}`
                    : "--"
                }
                suffix="/100"
              />

            </div>

            <Link
              to="/map"
              className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-teal-200 hover:text-teal-700"
            >
              Explore live network
              <ArrowRight size={15} />
            </Link>

          </div>

        </section>

        {/* =====================================================
            AI EXPLANATION
        ===================================================== */}

        <section className="rounded-2xl border border-teal-100 bg-teal-50/60 p-5">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
              <BrainCircuit size={19} />
            </div>

            <div className="flex-1">

              <p className="text-sm font-bold text-slate-800">
                Why VoltGrid recommended this station
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                The recommendation considers predicted queue length,
                estimated waiting time, charger speed, distance,
                battery range, station availability, charging cost
                and network conditions.
              </p>

            </div>

            <Link
              to="/predictions"
              className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-teal-700"
            >
              Explore AI
              <ArrowRight size={14} />
            </Link>

          </div>

        </section>

        {/* =====================================================
            LOADING
        ===================================================== */}

        {isLoading && (
          <div className="fixed bottom-5 right-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-500 shadow-lg">

            <span className="h-2 w-2 animate-pulse rounded-full bg-teal-500" />

            Updating charging intelligence...

          </div>
        )}

      </div>
    </AppShell>
  );
}

/* ============================================================
   DASHBOARD METRIC
============================================================ */

function DashboardMetric({
  label,
  value,
  description,
  icon: Icon,
  tone,
  progress,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ElementType;
  tone: "teal" | "blue" | "amber" | "purple";
  progress?: number;
}) {
  const styles = {
    teal: {
      icon: "bg-teal-50 text-teal-700",
      bar: "bg-teal-600",
    },
    blue: {
      icon: "bg-blue-50 text-blue-700",
      bar: "bg-blue-600",
    },
    amber: {
      icon: "bg-amber-50 text-amber-700",
      bar: "bg-amber-500",
    },
    purple: {
      icon: "bg-violet-50 text-violet-700",
      bar: "bg-violet-600",
    },
  };

  const style = styles[tone];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {label}
          </p>

          <p className="mt-2 font-display text-3xl font-bold text-slate-900">
            {value}
          </p>

        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.icon}`}
        >
          <Icon size={19} />
        </div>

      </div>

      {progress !== undefined && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">

          <div
            className={`h-full rounded-full ${style.bar} transition-all duration-500`}
            style={{
              width: `${Math.min(
                Math.max(progress, 0),
                100,
              )}%`,
            }}
          />

        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
        {description}
      </p>

    </div>
  );
}

/* ============================================================
   REASON
============================================================ */

function Reason({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-300">

      <CheckCircle2
        size={15}
        className="shrink-0 text-teal-400"
      />

      {text}

    </div>
  );
}

/* ============================================================
   VEHICLE STAT
============================================================ */

function VehicleStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">

      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-800">
        {value}
      </p>

    </div>
  );
}

/* ============================================================
   NETWORK STAT
============================================================ */

function NetworkStat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

      <p className="text-xs text-slate-500">
        {label}
      </p>

      <div className="mt-2 flex items-end gap-1.5">

        <span className="font-display text-2xl font-bold text-slate-900">
          {value}
        </span>

        <span className="pb-0.5 text-xs text-slate-400">
          {suffix}
        </span>

      </div>

    </div>
  );
}