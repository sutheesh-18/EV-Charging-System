import { useMemo, useState } from "react";
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
  ShieldCheck,
  Sparkles,
  Star,
  TrendingDown,
  Zap,
  type LucideIcon,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { api } from "../../api/client";

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
  predicted_wait_minutes?: number;
  chargers?: Charger[];
}

const demoStation: Station = {
  id: 1,
  name: "GreenVolt Hub — Velachery",
  address: "Velachery Main Road, Chennai",
  distance_km: 3.2,
  available_chargers: 5,
  total_chargers: 8,
  charging_cost_per_kwh: 10.5,
  rating: 4.8,
  predicted_wait_minutes: 4,
  chargers: [
    {
      id: 1,
      charger_code: "GV-DC-01",
      charger_type: "DC Fast",
      power_kw: 120,
      status: "available",
      connector_type: "CCS2",
    },
    {
      id: 2,
      charger_code: "GV-DC-02",
      charger_type: "DC Fast",
      power_kw: 120,
      status: "available",
      connector_type: "CCS2",
    },
    {
      id: 3,
      charger_code: "GV-AC-03",
      charger_type: "AC",
      power_kw: 22,
      status: "occupied",
      connector_type: "Type 2",
    },
    {
      id: 4,
      charger_code: "GV-DC-04",
      charger_type: "DC Fast",
      power_kw: 60,
      status: "available",
      connector_type: "CCS2",
    },
  ],
};

export default function StationDetails() {
  const { id } = useParams();
  const [selectedCharger, setSelectedCharger] =
    useState<number | null>(null);

  const {
    data: apiStation,
    isLoading,
    isError,
  } = useQuery<Station>({
    queryKey: ["station", id],

    queryFn: async () => {
      const response = await api.get(`/stations/${id}`);
      return response.data;
    },

    enabled: Boolean(id),
  });

  const station = apiStation ?? demoStation;

  const chargers = station.chargers ?? [];

  const availableChargers = chargers.filter(
    (charger) =>
      charger.status !== "occupied" &&
      charger.status !== "faulty",
  );

  const price =
    station.charging_cost_per_kwh ??
    station.price_per_kwh ??
    10.5;

  const waitTime =
    station.predicted_wait_minutes ?? 4;

  const availableCount =
    station.available_chargers ??
    availableChargers.length;

  const totalCount =
    station.total_chargers ??
    chargers.length;

  /*
   * Pick the fastest available charger.
   * This is used only for displaying station intelligence.
   */
  const fastestAvailableCharger = useMemo(() => {
    return [...availableChargers].sort(
      (a, b) =>
        (b.power_kw ?? 0) -
        (a.power_kw ?? 0),
    )[0];
  }, [availableChargers]);

  const fastestPower =
    fastestAvailableCharger?.power_kw ?? 0;

  /*
   * Simple recommendation score based on
   * actual station information.
   *
   * This avoids showing a completely hardcoded "92".
   */
  const recommendationScore = Math.min(
    98,
    Math.max(
      70,
      Math.round(
        70 +
          Math.min(
            10,
            Math.max(
              0,
              (availableCount / Math.max(totalCount, 1)) *
                10,
            ),
          ) +
          Math.min(
            10,
            Math.max(0, 10 - waitTime),
          ) +
          Math.min(
            8,
            (station.rating ?? 4) * 1.5,
          ),
      ),
    ),
  );

  const lowCongestion = waitTime <= 10;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">

        {/* =====================================================
            BACK
        ===================================================== */}

        <Link
          to="/map"
          className="inline-flex items-center gap-2 text-sm font-medium text-grid-300 transition hover:text-volt-300"
        >
          <ArrowLeft size={16} />
          Back to stations
        </Link>

        {/* =====================================================
            STATION HERO
        ===================================================== */}

        <section className="card overflow-hidden">

          <div className="relative overflow-hidden border-b border-grid-800 bg-gradient-to-br from-grid-900 via-grid-900 to-grid-850 p-6 sm:p-8">

            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-volt-400/10 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-8 lg:flex-row">

              {/* Station identity */}

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-2">

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-volt-400/20 bg-volt-400/10 px-3 py-1 text-xs font-semibold text-volt-300">
                    <Sparkles size={13} />
                    AI Recommended
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    <CheckCircle2 size={13} />
                    {availableCount > 0
                      ? "Available"
                      : "Currently busy"}
                  </span>

                </div>

                <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-grid-50 sm:text-4xl">
                  {station.name}
                </h1>

                <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-grid-300">

                  <MapPin
                    size={16}
                    className="mt-1 shrink-0 text-grid-400"
                  />

                  <span>
                    {station.address ??
                      "Charging station location"}
                  </span>

                </p>

                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm text-grid-400">

                  <span className="flex items-center gap-1.5">
                    <Navigation
                      size={15}
                      className="text-volt-400"
                    />

                    {station.distance_km ?? "--"} km away
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Star
                      size={15}
                      className="fill-amber-400 text-amber-400"
                    />

                    {station.rating ?? "--"}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Clock3
                      size={15}
                      className="text-amber-400"
                    />

                    {waitTime} min predicted wait
                  </span>

                </div>

              </div>

              {/* Actions */}

              <div className="flex flex-wrap items-end gap-3">

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    if (
                      station.latitude != null &&
                      station.longitude != null
                    ) {
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }
                  }}
                >
                  <Navigation size={16} />
                  Navigate
                </button>

                <Link
                  to={`/stations/${station.id}/book`}
                  className={`btn-primary ${
                    availableCount === 0
                      ? "pointer-events-none opacity-50"
                      : ""
                  }`}
                >
                  Book charger
                  <ArrowRight size={16} />
                </Link>

              </div>

            </div>

          </div>

          {/* =================================================
              METRICS
          ================================================= */}

          <div className="grid divide-y divide-grid-800 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">

            <Metric
              icon={Clock3}
              label="Predicted wait"
              value={`${waitTime} min`}
              detail={
                lowCongestion
                  ? "Low congestion"
                  : "Higher congestion"
              }
            />

            <Metric
              icon={Zap}
              label="Fastest power"
              value={
                fastestPower
                  ? `${fastestPower} kW`
                  : "--"
              }
              detail={
                fastestPower >= 100
                  ? "Fast charging"
                  : "Available power"
              }
            />

            <Metric
              icon={IndianRupee}
              label="Charging price"
              value={`₹${price}`}
              detail="per kWh"
            />

            <Metric
              icon={PlugZap}
              label="Chargers"
              value={`${availableCount}/${totalCount}`}
              detail="currently available"
            />

          </div>

        </section>

        {/* =====================================================
            MAIN CONTENT
        ===================================================== */}

        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">

          {/* ===================================================
              CHARGER SELECTION
          =================================================== */}

          <div className="card p-6">

            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">

              <div>

                <p className="label-eyebrow">
                  Live charger availability
                </p>

                <h2 className="mt-1 font-display text-xl font-bold text-grid-50">
                  Choose a charger
                </h2>

              </div>

              <p className="text-xs text-grid-400">
                {availableCount} available now
              </p>

            </div>

            {chargers.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-grid-800 bg-grid-950/40 p-8 text-center">

                <PlugZap
                  size={28}
                  className="mx-auto text-grid-400"
                />

                <p className="mt-3 font-medium text-grid-300">
                  Charger information unavailable
                </p>

                <p className="mt-1 text-sm text-grid-400">
                  Please check the station again shortly.
                </p>

              </div>
            ) : (
              <div className="mt-6 space-y-3">

                {chargers.map((charger) => {

                  const available =
                    charger.status !== "occupied" &&
                    charger.status !== "faulty";

                  const selected =
                    selectedCharger === charger.id;

                  return (
                    <button
                      key={charger.id}
                      type="button"
                      disabled={!available}
                      onClick={() => {
                        if (available) {
                          setSelectedCharger(
                            charger.id,
                          );
                        }
                      }}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-volt-400/50 bg-volt-400/5 shadow-[0_0_0_1px_rgba(34,224,140,0.08)]"
                          : available
                            ? "border-grid-800 bg-grid-950/40 hover:border-grid-700 hover:bg-grid-900/60"
                            : "cursor-not-allowed border-grid-800 bg-grid-950/20 opacity-50"
                      }`}
                    >

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

                        {/* Icon */}

                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            available
                              ? "bg-volt-400/10 text-volt-300"
                              : "bg-grid-800 text-grid-400"
                          }`}
                        >
                          <PlugZap size={20} />
                        </div>

                        {/* Info */}

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-wrap items-center gap-2">

                            <p className="font-display font-semibold text-grid-100">
                              {charger.charger_code ??
                                `Charger #${charger.id}`}
                            </p>

                            <span className="rounded-full bg-grid-800 px-2 py-0.5 text-[10px] font-medium uppercase text-grid-300">
                              {charger.connector_type ??
                                "CCS2"}
                            </span>

                          </div>

                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-grid-400">

                            <span>
                              {charger.charger_type ??
                                "Charging unit"}
                            </span>

                            <span>
                              {charger.power_kw ?? "--"} kW
                            </span>

                          </div>

                        </div>

                        {/* Status */}

                        <div className="flex items-center justify-between gap-4 sm:justify-end">

                          <span
                            className={`text-xs font-semibold ${
                              available
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {available
                              ? "Available now"
                              : charger.status ===
                                  "faulty"
                                ? "Unavailable"
                                : "Occupied"}
                          </span>

                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                              selected
                                ? "border-volt-400 bg-volt-400"
                                : "border-grid-600"
                            }`}
                          >
                            {selected && (
                              <CheckCircle2
                                size={14}
                                className="text-grid-950"
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
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-volt-400/20 bg-volt-400/5 p-4">

                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-volt-400"
                />

                <div>

                  <p className="text-sm font-semibold text-grid-200">
                    Charger selected
                  </p>

                  <p className="mt-1 text-xs leading-5 text-grid-300">
                    Continue to booking to choose your
                    arrival time and reserve this charger.
                  </p>

                </div>

              </div>
            )}

            <div className="mt-5 flex gap-3 rounded-xl border border-grid-800 bg-grid-950/40 p-4">

              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-emerald-400"
              />

              <p className="text-xs leading-5 text-grid-300">
                Charger status is based on the latest station
                data. Availability may change before arrival.
              </p>

            </div>

          </div>

          {/* ===================================================
              AI SIDEBAR
          =================================================== */}

          <div className="space-y-6">

            {/* AI insight */}

            <div className="relative overflow-hidden rounded-3xl border border-volt-400/20 bg-grid-900 p-6 shadow-glow">

              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-volt-400/10 blur-3xl" />

              <div className="relative">

                <div className="flex items-center gap-2">

                  <Sparkles
                    size={18}
                    className="text-volt-300"
                  />

                  <p className="text-xs font-bold uppercase tracking-widest text-volt-300">
                    AI Station Insight
                  </p>

                </div>

                <h3 className="mt-4 font-display text-xl font-bold text-grid-50">
                  {lowCongestion
                    ? "Good time to charge here"
                    : "Expect some congestion"}
                </h3>

                <p className="mt-2 text-sm leading-6 text-grid-300">
                  {lowCongestion
                    ? "Current predicted waiting time is relatively low, making this station a strong charging option."
                    : "Predicted congestion is elevated. Consider checking nearby stations before booking."}
                </p>

                <div className="mt-6 space-y-3">

                  <Insight
                    icon={TrendingDown}
                    title="Predicted queue"
                    value={`${waitTime} min`}
                  />

                  <Insight
                    icon={Zap}
                    title="Fastest charger"
                    value={
                      fastestPower
                        ? `${fastestPower} kW`
                        : "Unavailable"
                    }
                  />

                  <Insight
                    icon={BatteryCharging}
                    title="Chargers available"
                    value={`${availableCount}/${totalCount}`}
                  />

                </div>

              </div>

            </div>

            {/* Score */}

            <div className="card p-6">

              <div className="flex items-center justify-between">

                <div>

                  <p className="label-eyebrow">
                    Recommendation score
                  </p>

                  <p className="mt-1 text-xs text-grid-400">
                    Based on station intelligence
                  </p>

                </div>

                <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-volt-400/20">

                  <span className="font-display text-xl font-bold text-volt-300">
                    {recommendationScore}
                  </span>

                </div>

              </div>

              <div className="mt-5 space-y-3">

                <ScoreBar
                  label="Waiting time"
                  value={Math.max(
                    20,
                    Math.min(
                      100,
                      100 - waitTime * 5,
                    ),
                  )}
                />

                <ScoreBar
                  label="Charger availability"
                  value={
                    totalCount > 0
                      ? Math.round(
                          (availableCount /
                            totalCount) *
                            100,
                        )
                      : 0
                  }
                />

                <ScoreBar
                  label="Distance"
                  value={Math.max(
                    20,
                    Math.min(
                      100,
                      Math.round(
                        100 -
                          (station.distance_km ??
                            10) *
                            10,
                      ),
                    ),
                  )}
                />

                <ScoreBar
                  label="Station rating"
                  value={Math.round(
                    ((station.rating ?? 0) / 5) *
                      100,
                  )}
                />

              </div>

            </div>

          </div>

        </section>

        {/* =====================================================
            LOCATION
        ===================================================== */}

        <section className="card overflow-hidden">

          <div className="flex flex-col justify-between gap-3 border-b border-grid-800 p-5 sm:flex-row sm:items-center">

            <div>

              <p className="label-eyebrow">
                Location
              </p>

              <h3 className="mt-1 font-display text-lg font-semibold text-grid-50">
                Station location
              </h3>

            </div>

            <button
              type="button"
              className="btn-secondary !px-4 !py-2 text-sm"
              onClick={() => {
                if (
                  station.latitude != null &&
                  station.longitude != null
                ) {
                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`,
                    "_blank",
                    "noopener,noreferrer",
                  );
                }
              }}
            >
              <Navigation size={15} />
              Get directions
            </button>

          </div>

          <div className="relative h-64 overflow-hidden bg-[#101827]">

            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(148,163,184,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.12) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />

            <div className="absolute left-[48%] top-[42%]">

              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-volt-400/10">

                <div className="absolute h-20 w-20 animate-ping rounded-full bg-volt-400/10" />

                <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-volt-300 bg-grid-900 text-volt-300 shadow-lg">
                  <MapPin size={20} />
                </div>

              </div>

            </div>

            <div className="absolute bottom-5 left-5 rounded-xl border border-grid-700 bg-grid-900/90 px-4 py-3 backdrop-blur">

              <p className="text-xs font-semibold text-grid-200">
                {station.name}
              </p>

              <p className="mt-1 text-xs text-grid-300">
                {station.distance_km ?? "--"} km from your location
              </p>

            </div>

          </div>

        </section>

        {/* =====================================================
            FINAL CTA
        ===================================================== */}

        <section className="rounded-3xl border border-volt-400/20 bg-gradient-to-r from-volt-400/10 via-grid-900 to-grid-900 p-6">

          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

            <div className="flex gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-volt-400/10 text-volt-300">
                <Zap size={22} />
              </div>

              <div>

                <h3 className="font-display text-lg font-bold text-grid-50">
                  Ready to reserve your charging slot?
                </h3>

                <p className="mt-1 text-sm text-grid-300">
                  {selectedCharger !== null
                    ? "Your charger is selected. Continue to choose your arrival time."
                    : "Select an available charger and choose your arrival time."}
                </p>

              </div>

            </div>

            <Link
              to={`/stations/${station.id}/book`}
              className={`btn-primary ${
                availableCount === 0
                  ? "pointer-events-none opacity-50"
                  : ""
              }`}
            >
              Continue to booking
              <ArrowRight size={16} />
            </Link>

          </div>

        </section>

        {/* Loading */}

        {isLoading && (
          <div className="fixed bottom-5 right-5 rounded-xl border border-grid-700 bg-grid-900 px-4 py-3 text-xs text-grid-400 shadow-card">
            Loading station intelligence...
          </div>
        )}

        {/* API fallback information */}

        {isError && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs text-amber-300">
            Live station data could not be loaded. Showing the
            available station preview.
          </div>
        )}

      </div>
    </AppShell>
  );
}

/* ============================================================
   METRIC
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

      <div className="flex items-center gap-2 text-grid-300">

        <Icon size={15} />

        <span className="text-xs">
          {label}
        </span>

      </div>

      <p className="mt-2 font-display text-xl font-bold text-grid-100">
        {value}
      </p>

      <p className="mt-1 text-xs text-grid-400">
        {detail}
      </p>

    </div>
  );
}

/* ============================================================
   AI INSIGHT
============================================================ */

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
    <div className="flex items-center justify-between rounded-xl border border-grid-800 bg-grid-950/50 p-3">

      <div className="flex items-center gap-3">

        <Icon
          size={16}
          className="text-volt-300"
        />

        <span className="text-sm text-grid-300">
          {title}
        </span>

      </div>

      <span className="text-sm font-semibold text-grid-100">
        {value}
      </span>

    </div>
  );
}

/* ============================================================
   SCORE BAR
============================================================ */

function ScoreBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const safeValue = Math.max(
    0,
    Math.min(100, value),
  );

  return (
    <div>

      <div className="mb-1.5 flex justify-between text-xs">

        <span className="text-grid-300">
          {label}
        </span>

        <span className="font-medium text-grid-300">
          {safeValue}%
        </span>

      </div>

      <div className="h-1.5 rounded-full bg-grid-800">

        <div
          className="h-full rounded-full bg-volt-400 transition-all"
          style={{
            width: `${safeValue}%`,
          }}
        />

      </div>

    </div>
  );
}