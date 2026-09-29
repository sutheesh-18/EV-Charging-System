import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BatteryCharging,
  CheckCircle2,
  Clock3,
  LocateFixed,
  LocateOff,
  MapPin,
  Navigation,
  PlugZap,
  Search,
  Star,
  Trash2,
  Zap,
} from "lucide-react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import AppShell from "../../components/layout/AppShell";
import { api } from "../../api/client";

/* ============================================================
   TYPES
============================================================ */

interface Charger {
  id: number;
  charger_code?: string;
  charger_type?: string;
  power_kw?: number;
  status?: string;
}

interface Station {
  id: number;
  name: string;
  address?: string;
  city?: string;

  latitude?: number;
  longitude?: number;

  distance_km?: number;

  total_chargers?: number;
  available_chargers?: number;

  charger_power_kw?: number;

  charging_cost_per_kwh?: number;
  price_per_kwh?: number;

  predicted_wait_minutes?: number;

  average_rating?: number;
  rating?: number;

  reliability_score?: number;
  green_energy_percent?: number;

  chargers?: Charger[];
}

interface Vehicle {
  id: number;
  name?: string;
  manufacturer?: string;
  model?: string;

  battery_capacity_kwh?: number;
  remaining_battery_percent?: number;
  vehicle_range_km?: number;
  charging_speed_kw?: number;

  charger_type?: string;
}

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface Preferences {
  maxDistanceKm: number;
  minPowerKw: number;
  maxPricePerKwh: number;
  fastOnly: boolean;
  preferGreen: boolean;
  preferLowWait: boolean;
}

interface ScoredStation extends Station {
  calculated_distance_km: number | null;
  ai_score: number;
  reachable: boolean;
  calculated_wait_minutes: number;
  calculated_power_kw: number;
  calculated_price: number;
  calculated_available: number;
  reasons: string[];
}

/* ============================================================
   DEFAULTS
============================================================ */

const DEFAULT_LOCATION: [number, number] = [
  11.0168,
  76.9558,
];

const DEFAULT_PREFERENCES: Preferences = {
  maxDistanceKm: 50,
  minPowerKw: 0,
  maxPricePerKwh: 100,
  fastOnly: false,
  preferGreen: true,
  preferLowWait: true,
};

/* ============================================================
   HELPERS
============================================================ */

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

function normalize(
  value: number,
  min: number,
  max: number,
  invert = false,
): number {
  if (max - min < 0.000001) {
    return 0.5;
  }

  const normalized = Math.max(
    0,
    Math.min(1, (value - min) / (max - min)),
  );

  return invert ? 1 - normalized : normalized;
}

function getPower(station: Station): number {
  if (typeof station.charger_power_kw === "number") {
    return station.charger_power_kw;
  }

  if (station.chargers?.length) {
    return Math.max(
      ...station.chargers.map(
        (charger) => charger.power_kw ?? 0,
      ),
    );
  }

  return 0;
}

function getAvailableChargers(station: Station): number {
  if (typeof station.available_chargers === "number") {
    return station.available_chargers;
  }

  if (station.chargers?.length) {
    return station.chargers.filter(
      (charger) =>
        charger.status?.toLowerCase() === "available",
    ).length;
  }

  return 0;
}

function getTotalChargers(station: Station): number {
  if (typeof station.total_chargers === "number") {
    return station.total_chargers;
  }

  return station.chargers?.length ?? 0;
}

function getPrice(station: Station): number {
  return (
    station.charging_cost_per_kwh ??
    station.price_per_kwh ??
    0
  );
}

function getRating(station: Station): number {
  return (
    station.average_rating ??
    station.rating ??
    4
  );
}

function getWait(station: Station): number {
  return station.predicted_wait_minutes ?? 10;
}

/* ============================================================
   MAP CONTROLLER
============================================================ */

function MapController({
  location,
}: {
  location: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!location) {
      return;
    }

    map.flyTo(location, 14, {
      duration: 1.2,
    });
  }, [location, map]);

  return null;
}

/* ============================================================
   MAP PAGE
============================================================ */

export default function MapPage() {
  const [search, setSearch] = useState("");

  const [battery, setBattery] =
    useState<number | null>(null);

  const [tracking, setTracking] =
    useState(false);

  const [userLocation, setUserLocation] =
    useState<UserLocation | null>(null);

  const [locationHistory, setLocationHistory] =
    useState<UserLocation[]>([]);

  const [selectedStationId, setSelectedStationId] =
    useState<number | null>(null);

  const [showPreferences, setShowPreferences] =
    useState(false);

  const [preferences, setPreferences] =
    useState<Preferences>(() => {
      try {
        const saved = localStorage.getItem(
          "voltgrid-location-preferences",
        );

        return saved
          ? {
              ...DEFAULT_PREFERENCES,
              ...JSON.parse(saved),
            }
          : DEFAULT_PREFERENCES;
      } catch {
        return DEFAULT_PREFERENCES;
      }
    });

  const watchIdRef =
    useRef<number | null>(null);

  /* ============================================================
     LOAD STATIONS
  ============================================================ */

  const {
    data: apiStations = [],
    isLoading: stationsLoading,
    isError: stationsError,
  } = useQuery<Station[]>({
    queryKey: ["stations"],
    queryFn: async () => {
      const response = await api.get("/stations");

      if (Array.isArray(response.data)) {
        return response.data;
      }

      if (Array.isArray(response.data?.stations)) {
        return response.data.stations;
      }

      return [];
    },
  });

  /* ============================================================
     LOAD VEHICLES
  ============================================================ */

  const { data: vehicles = [] } =
    useQuery<Vehicle[]>({
      queryKey: ["vehicles"],
      queryFn: async () => {
        const response = await api.get("/vehicles/me");

        if (Array.isArray(response.data)) {
          return response.data;
        }

        if (Array.isArray(response.data?.vehicles)) {
          return response.data.vehicles;
        }

        return [];
      },
    });

  const defaultVehicle = vehicles[0];

  /* ============================================================
     USE VEHICLE BATTERY
  ============================================================ */

  useEffect(() => {
    if (
      typeof defaultVehicle?.remaining_battery_percent ===
      "number"
    ) {
      setBattery(
        defaultVehicle.remaining_battery_percent,
      );
    }
  }, [defaultVehicle]);

  /* ============================================================
     LOAD LOCATION HISTORY
  ============================================================ */

  useEffect(() => {
    try {
      const saved = localStorage.getItem(
        "voltgrid-location-history",
      );

      if (saved) {
        setLocationHistory(
          JSON.parse(saved),
        );
      }
    } catch {
      setLocationHistory([]);
    }
  }, []);

  /* ============================================================
     SAVE PREFERENCES
  ============================================================ */

  useEffect(() => {
    localStorage.setItem(
      "voltgrid-location-preferences",
      JSON.stringify(preferences),
    );
  }, [preferences]);

  /* ============================================================
     SAVE LOCATION HISTORY
  ============================================================ */

  useEffect(() => {
    localStorage.setItem(
      "voltgrid-location-history",
      JSON.stringify(
        locationHistory.slice(-100),
      ),
    );
  }, [locationHistory]);

  /* ============================================================
     LOCATION SUCCESS
  ============================================================ */

  const handleLocationSuccess = (
    position: GeolocationPosition,
  ) => {
    const location: UserLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: Date.now(),
    };

    setUserLocation(location);

    setLocationHistory((previous) => {
      const last =
        previous[previous.length - 1];

      if (last) {
        const distance = haversineKm(
          last.latitude,
          last.longitude,
          location.latitude,
          location.longitude,
        );

        // Save only after moving approximately 100m.
        if (distance < 0.1) {
          return previous;
        }
      }

      return [
        ...previous,
        location,
      ].slice(-100);
    });
  };

  /* ============================================================
     LOCATION ERROR
  ============================================================ */

  const handleLocationError = (
    error: GeolocationPositionError,
  ) => {
    console.error(
      "Geolocation error:",
      error.message,
    );

    setTracking(false);

    alert(
      "Unable to access your location. Please allow location permission in your browser.",
    );
  };

  /* ============================================================
     STOP TRACKING
  ============================================================ */

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(
        watchIdRef.current,
      );

      watchIdRef.current = null;
    }

    setTracking(false);
  };

  /* ============================================================
     START TRACKING
  ============================================================ */

  const startTracking = () => {
    if (!navigator.geolocation) {
      alert(
        "Geolocation is not supported by this browser.",
      );
      return;
    }

    if (tracking) {
      stopTracking();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      handleLocationSuccess,
      handleLocationError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );

    const watchId =
      navigator.geolocation.watchPosition(
        handleLocationSuccess,
        handleLocationError,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
        },
      );

    watchIdRef.current = watchId;
    setTracking(true);
  };

  /* ============================================================
     CLEANUP TRACKING
  ============================================================ */

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(
          watchIdRef.current,
        );
      }
    };
  }, []);

  /* ============================================================
     CLEAR HISTORY
  ============================================================ */

  const clearLocationHistory = () => {
    setLocationHistory([]);

    localStorage.removeItem(
      "voltgrid-location-history",
    );
  };

  /* ============================================================
     NORMALIZE STATIONS
  ============================================================ */

  const stations = useMemo(() => {
    return apiStations.filter(
      (station) =>
        typeof station.latitude === "number" &&
        typeof station.longitude === "number",
    );
  }, [apiStations]);

  /* ============================================================
     SCORE STATIONS
  ============================================================ */

  const scoredStations = useMemo(() => {
    const currentLat =
      userLocation?.latitude;

    const currentLon =
      userLocation?.longitude;

    const maxReachableKm =
      defaultVehicle?.vehicle_range_km
        ? defaultVehicle.vehicle_range_km *
          ((battery ?? 0) / 100) *
          0.9
        : Infinity;

    const candidates = stations
      .map((station) => {
        const distance =
          currentLat !== undefined &&
          currentLon !== undefined
            ? haversineKm(
                currentLat,
                currentLon,
                station.latitude!,
                station.longitude!,
              )
            : station.distance_km ?? null;

        const power = getPower(station);
        const available =
          getAvailableChargers(station);

        const total =
          getTotalChargers(station);

        const price =
          getPrice(station);

        const wait =
          getWait(station);

        const reachable =
          distance === null
            ? true
            : distance <= maxReachableKm;

        return {
          station,
          distance,
          power,
          available,
          total,
          price,
          wait,
          reachable,
        };
      })
      .filter((candidate) => {
        if (
          candidate.distance !== null &&
          candidate.distance >
            preferences.maxDistanceKm
        ) {
          return false;
        }

        if (
          candidate.power <
          preferences.minPowerKw
        ) {
          return false;
        }

        if (
          candidate.price >
          preferences.maxPricePerKwh
        ) {
          return false;
        }

        if (
          preferences.fastOnly &&
          candidate.power < 50
        ) {
          return false;
        }

        return true;
      });

    if (!candidates.length) {
      return [];
    }

    const distances = candidates
      .map((item) => item.distance)
      .filter(
        (value): value is number =>
          value !== null,
      );

    const waits = candidates.map(
      (item) => item.wait,
    );

    const prices = candidates.map(
      (item) => item.price,
    );

    const powers = candidates.map(
      (item) => item.power,
    );

    const availability = candidates.map(
      (item) => item.available,
    );

    const scored: ScoredStation[] =
      candidates.map((candidate) => {
        const distanceScore =
          candidate.distance === null
            ? 0.5
            : normalize(
                candidate.distance,
                Math.min(...distances),
                Math.max(...distances),
                true,
              );

        const waitScore =
          normalize(
            candidate.wait,
            Math.min(...waits),
            Math.max(...waits),
            true,
          );

        const priceScore =
          normalize(
            candidate.price,
            Math.min(...prices),
            Math.max(...prices),
            true,
          );

        const powerScore =
          normalize(
            candidate.power,
            Math.min(...powers),
            Math.max(...powers),
          );

        const availabilityScore =
          normalize(
            candidate.available,
            Math.min(...availability),
            Math.max(...availability),
          );

        const ratingScore =
          getRating(candidate.station) / 5;

        const greenScore =
          (candidate.station
            .green_energy_percent ?? 30) / 100;

        let score =
          distanceScore * 0.25 +
          waitScore * 0.2 +
          availabilityScore * 0.15 +
          powerScore * 0.15 +
          priceScore * 0.1 +
          ratingScore * 0.08 +
          greenScore * 0.07;

        if (
          preferences.preferGreen &&
          greenScore > 0.5
        ) {
          score += 0.05;
        }

        if (
          preferences.preferLowWait &&
          candidate.wait <= 5
        ) {
          score += 0.05;
        }

        if (!candidate.reachable) {
          score *= 0.4;
        }

        const reasons: string[] = [];

        if (candidate.reachable) {
          reasons.push(
            "Reachable with current battery",
          );
        }

        if (candidate.available > 0) {
          reasons.push(
            `${candidate.available} charger(s) available`,
          );
        }

        if (candidate.power >= 100) {
          reasons.push(
            "Fast charging available",
          );
        }

        if (candidate.wait <= 5) {
          reasons.push(
            "Low predicted waiting time",
          );
        }

        if (getRating(candidate.station) >= 4.5) {
          reasons.push(
            "Highly rated station",
          );
        }

        if (
          (candidate.station
            .green_energy_percent ?? 0) >= 50
        ) {
          reasons.push(
            "High green-energy usage",
          );
        }

        if (!reasons.length) {
          reasons.push(
            "Good overall charging option",
          );
        }

        return {
          ...candidate.station,

          calculated_distance_km:
            candidate.distance,

          ai_score: Math.round(
            score * 100,
          ),

          reachable:
            candidate.reachable,

          calculated_wait_minutes:
            candidate.wait,

          calculated_power_kw:
            candidate.power,

          calculated_price:
            candidate.price,

          calculated_available:
            candidate.available,

          reasons,
        };
      });

    return scored.sort(
      (a, b) =>
        b.ai_score - a.ai_score,
    );
  }, [
    stations,
    userLocation,
    defaultVehicle,
    battery,
    preferences,
  ]);

  /* ============================================================
     SEARCH
  ============================================================ */

  const filteredStations = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return scoredStations;
    }

    return scoredStations.filter(
      (station) =>
        station.name
          .toLowerCase()
          .includes(query) ||
        station.address
          ?.toLowerCase()
          .includes(query) ||
        station.city
          ?.toLowerCase()
          .includes(query),
    );
  }, [scoredStations, search]);

  /* ============================================================
     SELECTED STATION
  ============================================================ */

  const selectedStation =
    scoredStations.find(
      (station) =>
        station.id === selectedStationId,
    ) ?? filteredStations[0] ?? null;

  /* ============================================================
     MAP CENTER
  ============================================================ */

  const mapCenter: [number, number] =
    userLocation
      ? [
          userLocation.latitude,
          userLocation.longitude,
        ]
      : selectedStation
        ? [
            selectedStation.latitude!,
            selectedStation.longitude!,
          ]
        : DEFAULT_LOCATION;

  const selectedPosition =
    selectedStation
      ? ([
          selectedStation.latitude!,
          selectedStation.longitude!,
        ] as [number, number])
      : null;

  /* ============================================================
     LOCATION HISTORY POLYLINE
  ============================================================ */

  const historyPath: [
    number,
    number,
  ][] = locationHistory.map(
    (location) => [
      location.latitude,
      location.longitude,
    ],
  );

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <AppShell>
      <div className="space-y-6">
        {/* PAGE HEADER */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <MapPin
                size={20}
                className="text-volt-400"
              />

              <span className="label-eyebrow">
                Smart Location
              </span>
            </div>

            <h2 className="font-display text-2xl font-bold text-grid-50">
              Map & Recommend
            </h2>

            <p className="mt-1 text-sm text-grid-400">
              Find the best charging station based
              on your location, battery and
              preferences.
            </p>
          </div>

          {/* TRACK LOCATION */}
          <button
            type="button"
            onClick={startTracking}
            className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${
              tracking
                ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/30"
                : "bg-volt-500 text-grid-950 hover:bg-volt-400"
            }`}
          >
            {tracking ? (
              <>
                <LocateOff size={18} />
                Stop tracking
              </>
            ) : (
              <>
                <LocateFixed size={18} />
                Use my location
              </>
            )}
          </button>
        </div>

        {/* SEARCH + PREFERENCES */}
        <div className="card p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-grid-300"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search station, address or city..."
                className="w-full rounded-xl border border-grid-700 bg-grid-900 px-10 py-3 text-sm text-grid-50 outline-none transition focus:border-volt-400"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                setShowPreferences(
                  (value) => !value,
                )
              }
              className="rounded-xl border border-grid-700 px-5 py-3 text-sm font-medium text-grid-200 transition hover:border-volt-400 hover:text-volt-300"
            >
              Preferences
            </button>
          </div>

          {showPreferences && (
            <div className="mt-4 grid gap-4 border-t border-grid-800 pt-4 md:grid-cols-2 lg:grid-cols-4">
              {/* MAX DISTANCE */}
              <label className="space-y-2">
                <span className="text-xs font-medium text-grid-400">
                  Maximum distance
                </span>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={
                      preferences.maxDistanceKm
                    }
                    onChange={(event) =>
                      setPreferences(
                        (previous) => ({
                          ...previous,
                          maxDistanceKm:
                            Number(
                              event.target.value,
                            ) || 1,
                        }),
                      )
                    }
                    className="w-full rounded-lg border border-grid-700 bg-grid-900 px-3 py-2 text-sm text-grid-50"
                  />

                  <span className="text-xs text-grid-300">
                    km
                  </span>
                </div>
              </label>

              {/* MIN POWER */}
              <label className="space-y-2">
                <span className="text-xs font-medium text-grid-400">
                  Minimum charger power
                </span>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={
                      preferences.minPowerKw
                    }
                    onChange={(event) =>
                      setPreferences(
                        (previous) => ({
                          ...previous,
                          minPowerKw:
                            Number(
                              event.target.value,
                            ) || 0,
                        }),
                      )
                    }
                    className="w-full rounded-lg border border-grid-700 bg-grid-900 px-3 py-2 text-sm text-grid-50"
                  />

                  <span className="text-xs text-grid-300">
                    kW
                  </span>
                </div>
              </label>

              {/* MAX PRICE */}
              <label className="space-y-2">
                <span className="text-xs font-medium text-grid-400">
                  Maximum price
                </span>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={
                      preferences.maxPricePerKwh
                    }
                    onChange={(event) =>
                      setPreferences(
                        (previous) => ({
                          ...previous,
                          maxPricePerKwh:
                            Number(
                              event.target.value,
                            ) || 0,
                        }),
                      )
                    }
                    className="w-full rounded-lg border border-grid-700 bg-grid-900 px-3 py-2 text-sm text-grid-50"
                  />

                  <span className="text-xs text-grid-300">
                    ₹/kWh
                  </span>
                </div>
              </label>

              {/* BATTERY */}
              <label className="space-y-2">
                <span className="text-xs font-medium text-grid-400">
                  Current battery
                </span>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={battery ?? ""}
                    onChange={(event) =>
                      setBattery(
                        Math.min(
                          100,
                          Math.max(
                            1,
                            Number(
                              event.target.value,
                            ) || 1,
                          ),
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-grid-700 bg-grid-900 px-3 py-2 text-sm text-grid-50"
                  />

                  <span className="text-xs text-grid-300">
                    %
                  </span>
                </div>
              </label>

              {/* CHECKBOXES */}
              <div className="flex flex-wrap gap-4 md:col-span-2 lg:col-span-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-grid-300">
                  <input
                    type="checkbox"
                    checked={
                      preferences.fastOnly
                    }
                    onChange={(event) =>
                      setPreferences(
                        (previous) => ({
                          ...previous,
                          fastOnly:
                            event.target.checked,
                        }),
                      )
                    }
                  />
                  Fast chargers only
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-sm text-grid-300">
                  <input
                    type="checkbox"
                    checked={
                      preferences.preferGreen
                    }
                    onChange={(event) =>
                      setPreferences(
                        (previous) => ({
                          ...previous,
                          preferGreen:
                            event.target.checked,
                        }),
                      )
                    }
                  />
                  Prefer green energy
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-sm text-grid-300">
                  <input
                    type="checkbox"
                    checked={
                      preferences.preferLowWait
                    }
                    onChange={(event) =>
                      setPreferences(
                        (previous) => ({
                          ...previous,
                          preferLowWait:
                            event.target.checked,
                        }),
                      )
                    }
                  />
                  Prefer low waiting time
                </label>
              </div>
            </div>
          )}
        </div>

        {/* LOCATION STATUS */}
        <div
          className={`rounded-xl border px-4 py-3 ${
            tracking
              ? "border-volt-500/30 bg-volt-500/10"
              : "border-grid-800 bg-grid-900/60"
          }`}
        >
          <div className="flex items-center gap-3">
            {tracking ? (
              <Navigation
                size={18}
                className="text-volt-400"
              />
            ) : (
              <LocateFixed
                size={18}
                className="text-grid-400"
              />
            )}

            <div>
              <p className="text-sm font-semibold text-grid-100">
                {tracking
                  ? "Live location tracking active"
                  : userLocation
                    ? "Location available"
                    : "Location not enabled"}
              </p>

              <p className="text-xs text-grid-300">
                {userLocation
                  ? `${userLocation.latitude.toFixed(
                      5,
                    )}, ${userLocation.longitude.toFixed(
                      5,
                    )} • ±${Math.round(
                      userLocation.accuracy,
                    )} m`
                  : "Use the button above to detect your current location."}
              </p>
            </div>
          </div>
        </div>

        {/* MAP + STATIONS */}
        <div className="grid gap-6 xl:grid-cols-[1.7fr_0.9fr]">
          {/* MAP */}
          <div className="overflow-hidden rounded-2xl border border-grid-800 bg-grid-900 shadow-xl">
            <div className="h-[620px]">
              <MapContainer
                center={mapCenter}
                zoom={13}
                scrollWheelZoom
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapController
                  location={
                    userLocation
                      ? [
                          userLocation.latitude,
                          userLocation.longitude,
                        ]
                      : selectedPosition
                  }
                />

                {/* USER LOCATION */}
                {userLocation && (
                  <>
                    <CircleMarker
                      center={[
                        userLocation.latitude,
                        userLocation.longitude,
                      ]}
                      radius={9}
                      pathOptions={{
                        color: "#06b6d4",
                        fillColor: "#06b6d4",
                        fillOpacity: 0.9,
                      }}
                    >
                      <Popup>
                        <strong>
                          Your current location
                        </strong>
                        <br />
                        Accuracy:{" "}
                        {Math.round(
                          userLocation.accuracy,
                        )}{" "}
                        m
                      </Popup>
                    </CircleMarker>

                    <Circle
                      center={[
                        userLocation.latitude,
                        userLocation.longitude,
                      ]}
                      radius={
                        Math.max(
                          userLocation.accuracy,
                          50,
                        )
                      }
                      pathOptions={{
                        color: "#06b6d4",
                        fillOpacity: 0.08,
                      }}
                    />
                  </>
                )}

                {/* LOCATION HISTORY */}
                {historyPath.length > 1 && (
                  <Polyline
                    positions={historyPath}
                    pathOptions={{
                      color: "#06b6d4",
                      weight: 4,
                      opacity: 0.7,
                    }}
                  />
                )}

                {/* STATIONS */}
                {filteredStations.map(
                  (station) => {
                    const position: [
                      number,
                      number,
                    ] = [
                      station.latitude!,
                      station.longitude!,
                    ];

                    const isSelected =
                      station.id ===
                      selectedStationId;

                    return (
                      <CircleMarker
                        key={station.id}
                        center={position}
                        radius={
                          isSelected
                            ? 12
                            : 8
                        }
                        pathOptions={{
                          color:
                            isSelected
                              ? "#0ea5e9"
                              : "#10b981",
                          fillColor:
                            isSelected
                              ? "#0ea5e9"
                              : "#10b981",
                          fillOpacity: 0.9,
                          weight: 3,
                        }}
                        eventHandlers={{
                          click: () =>
                            setSelectedStationId(
                              station.id,
                            ),
                        }}
                      >
                        <Popup>
                          <div className="min-w-[220px]">
                            <strong>
                              {station.name}
                            </strong>

                            <p>
                              {station.address ??
                                station.city ??
                                "Charging station"}
                            </p>

                            <p>
                              Score:{" "}
                              {
                                station.ai_score
                              }
                              /100
                            </p>

                            <p>
                              Power:{" "}
                              {
                                station.calculated_power_kw
                              }{" "}
                              kW
                            </p>

                            <p>
                              Available:{" "}
                              {
                                station.calculated_available
                              }
                            </p>
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  },
                )}

                {/* ROUTE TO SELECTED STATION */}
                {userLocation &&
                  selectedPosition && (
                    <Polyline
                      positions={[
                        [
                          userLocation.latitude,
                          userLocation.longitude,
                        ],
                        selectedPosition,
                      ]}
                      pathOptions={{
                        color: "#8b5cf6",
                        weight: 4,
                        dashArray: "10 8",
                      }}
                    />
                  )}
              </MapContainer>
            </div>
          </div>

          {/* STATION LIST */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold text-grid-50">
                  Recommended stations
                </h3>

                <p className="text-xs text-grid-300">
                  {filteredStations.length}{" "}
                  station(s) found
                </p>
              </div>

              {locationHistory.length >
                0 && (
                <button
                  type="button"
                  onClick={
                    clearLocationHistory
                  }
                  className="flex items-center gap-1 text-xs text-grid-300 hover:text-red-400"
                >
                  <Trash2 size={14} />
                  Clear history
                </button>
              )}
            </div>

            {stationsLoading && (
              <div className="card p-6 text-center text-sm text-grid-400">
                Loading charging stations...
              </div>
            )}

            {stationsError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">
                <p className="font-semibold text-red-400">
                  Unable to load stations
                </p>

                <p className="mt-1 text-xs text-red-300">
                  Please check your backend
                  connection.
                </p>
              </div>
            )}

            {!stationsLoading &&
              !stationsError &&
              filteredStations.length ===
                0 && (
                <div className="card p-6 text-center">
                  <MapPin
                    size={28}
                    className="mx-auto text-grid-300"
                  />

                  <p className="mt-3 text-sm font-semibold text-grid-200">
                    No stations found
                  </p>

                  <p className="mt-1 text-xs text-grid-300">
                    Try changing your search or
                    preferences.
                  </p>
                </div>
              )}

            {filteredStations
              .slice(0, 8)
              .map((station, index) => {
                const selected =
                  station.id ===
                  selectedStationId;

                return (
                  <button
                    key={station.id}
                    type="button"
                    onClick={() => {
                      setSelectedStationId(
                        station.id,
                      );
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selected
                        ? "border-volt-400/50 bg-volt-500/10"
                        : "border-grid-800 bg-grid-900/70 hover:border-grid-600"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-volt-500/10 text-volt-400">
                          {index === 0 ? (
                            <Star
                              size={18}
                            />
                          ) : (
                            <Zap
                              size={18}
                            />
                          )}
                        </div>

                        <div>
                          <h4 className="font-semibold text-grid-50">
                            {station.name}
                          </h4>

                          <p className="mt-1 text-xs text-grid-300">
                            {station.address ??
                              station.city ??
                              "EV charging station"}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-volt-500/10 px-2 py-1 text-xs font-semibold text-volt-300">
                        {station.ai_score}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-grid-950/60 p-2">
                        <p className="text-grid-300">
                          Distance
                        </p>

                        <p className="mt-1 font-semibold text-grid-200">
                          {station.calculated_distance_km !==
                          null
                            ? `${station.calculated_distance_km.toFixed(
                                1,
                              )} km`
                            : "--"}
                        </p>
                      </div>

                      <div className="rounded-lg bg-grid-950/60 p-2">
                        <p className="text-grid-300">
                          Wait
                        </p>

                        <p className="mt-1 font-semibold text-grid-200">
                          {
                            station.calculated_wait_minutes
                          }{" "}
                          min
                        </p>
                      </div>

                      <div className="rounded-lg bg-grid-950/60 p-2">
                        <p className="text-grid-300">
                          Power
                        </p>

                        <p className="mt-1 font-semibold text-grid-200">
                          {
                            station.calculated_power_kw
                          }{" "}
                          kW
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {station.reachable && (
                        <span className="flex items-center gap-1 rounded-full bg-volt-500/10 px-2 py-1 text-[11px] text-volt-300">
                          <CheckCircle2
                            size={12}
                          />
                          Reachable
                        </span>
                      )}

                      {station.calculated_available >
                        0 && (
                        <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[11px] text-blue-300">
                          {
                            station.calculated_available
                          }{" "}
                          available
                        </span>
                      )}

                      <span className="rounded-full bg-grid-800 px-2 py-1 text-[11px] text-grid-300">
                        ₹
                        {station.calculated_price.toFixed(
                          2,
                        )}
                        /kWh
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-grid-800 pt-3">
                      <span className="flex items-center gap-1 text-xs text-grid-400">
                        <Star
                          size={13}
                          className="text-yellow-400"
                        />
                        {getRating(
                          station,
                        ).toFixed(1)}
                      </span>

                      <span className="flex items-center gap-1 text-xs text-grid-400">
                        <Clock3
                          size={13}
                        />
                        {
                          station.calculated_wait_minutes
                        }{" "}
                        min
                      </span>

                      <span className="flex items-center gap-1 text-xs text-grid-400">
                        <PlugZap
                          size={13}
                        />
                        {
                          station.calculated_available
                        }
                        /
                        {getTotalChargers(
                          station,
                        )}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* SELECTED STATION */}
        {selectedStation && (
          <div className="overflow-hidden rounded-2xl border border-grid-800 bg-grid-900">
            <div className="grid lg:grid-cols-[1fr_auto]">
              <div className="p-6">
                <div className="flex items-center gap-2 text-volt-400">
                  <Zap size={18} />

                  <span className="label-eyebrow">
                    AI Recommendation
                  </span>
                </div>

                <h3 className="mt-2 font-display text-xl font-bold text-grid-50">
                  {selectedStation.name}
                </h3>

                <p className="mt-1 text-sm text-grid-400">
                  {selectedStation.address ??
                    selectedStation.city ??
                    "Charging station"}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {selectedStation.reasons.map(
                    (reason) => (
                      <span
                        key={reason}
                        className="flex items-center gap-1 rounded-full bg-volt-500/10 px-3 py-1.5 text-xs text-volt-300"
                      >
                        <CheckCircle2
                          size={13}
                        />
                        {reason}
                      </span>
                    ),
                  )}
                </div>
              </div>

              <div className="flex items-center border-t border-grid-800 p-6 lg:border-l lg:border-t-0">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest text-grid-300">
                    AI Match
                  </p>

                  <p className="mt-1 font-display text-4xl font-bold text-volt-400">
                    {selectedStation.ai_score}
                  </p>

                  <p className="text-xs text-grid-300">
                    / 100
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VEHICLE INFORMATION */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-volt-500/10 p-3 text-volt-400">
                <BatteryCharging
                  size={20}
                />
              </div>

              <div>
                <p className="text-xs text-grid-300">
                  Current battery
                </p>

                <p className="font-display text-xl font-bold text-grid-50">
                  {battery !== null ? `${Math.round(battery)}%` : "--"}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                <Navigation
                  size={20}
                />
              </div>

              <div>
                <p className="text-xs text-grid-300">
                  Estimated safe range
                </p>

                <p className="font-display text-xl font-bold text-grid-50">
                  {defaultVehicle?.vehicle_range_km
                    ? Math.round(
                        defaultVehicle.vehicle_range_km *
                          ((battery ?? 0) / 100) *
                          0.9,
                      )
                    : "--"}{" "}
                  km
                </p>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-500/10 p-3 text-purple-400">
                <PlugZap size={20} />
              </div>

              <div>
                <p className="text-xs text-grid-300">
                  Preferred charger
                </p>

                <p className="font-display text-xl font-bold text-grid-50">
                  {defaultVehicle?.charger_type ??
                    "Any"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* LOCATION HISTORY */}
        {locationHistory.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold text-grid-50">
                  Location tracking
                </h3>

                <p className="mt-1 text-xs text-grid-300">
                  {locationHistory.length} location
                  point(s) stored locally on this
                  device.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  clearLocationHistory
                }
                className="flex items-center gap-2 rounded-lg border border-grid-700 px-3 py-2 text-xs text-grid-400 hover:border-red-500/40 hover:text-red-400"
              >
                <Trash2 size={14} />
                Clear
              </button>
            </div>
          </div>
        )}

        {/* FOOTNOTE */}
        <div className="flex items-start gap-3 rounded-xl border border-grid-800 bg-grid-900/50 p-4">
          <LocateFixed
            size={18}
            className="mt-0.5 shrink-0 text-grid-300"
          />

          <p className="text-xs leading-5 text-grid-300">
            Location tracking uses your browser's
            Geolocation API. Your location history
            in this page is stored locally in your
            browser and is not automatically sent to
            the backend.
          </p>
        </div>
      </div>
    </AppShell>
  );
}