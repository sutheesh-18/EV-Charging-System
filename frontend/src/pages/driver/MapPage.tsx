import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
  power_kw?: number | null;
  status?: string;
}

interface Connector {
  type?: string | null;
  power_kw?: number | null;
  amps?: number | null;
  voltage?: number | null;
  level?: string | null;
  quantity?: number | null;
  status?: string | null;
}

interface Station {
  // VoltGrid stations have `id`; Open Charge Map stations have `external_id`.
  id?: number | null;
  external_id?: number | null;
  source?: string;

  name: string;
  address?: string | null;
  city?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  distance_km?: number | null;

  operator?: string | null;

  total_chargers?: number | null;
  available_chargers?: number | null;

  charger_power_kw?: number | null;

  charging_cost_per_kwh?: number | null;
  price_per_kwh?: number | null;

  predicted_wait_minutes?: number | null;

  average_rating?: number | null;
  rating?: number | null;

  reliability_score?: number | null;
  green_energy_percent?: number | null;

  status?: string | null;
  is_operational?: boolean | null;

  usage_type?: string | null;
  is_pay_at_location?: boolean | null;
  is_membership_required?: boolean | null;

  connectors?: Connector[];
  chargers?: Charger[];
}

type LocatedStation = Station & {
  latitude: number;
  longitude: number;
};

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

interface ScoredStation extends LocatedStation {
  station_key: string;
  calculated_distance_km: number | null;
  ai_score: number;
  reachable: boolean;
  calculated_wait_minutes: number | null;
  calculated_power_kw: number | null;
  calculated_price: number | null;
  calculated_available: number | null;
  calculated_total: number | null;
  calculated_rating: number | null;
  neutral_factors: string[];
  reasons: string[];
}

interface DisplayConnector {
  key: string;
  title: string;
  details: string[];
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

function isNum(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

/**
 * Score a value against the range of KNOWN values.
 * Unknown values always receive a neutral score (0.5),
 * so missing external data is never rewarded or punished.
 */
function scoreKnown(
  value: number | null,
  knownValues: number[],
  invert = false,
): number {
  if (value === null || !knownValues.length) {
    return 0.5;
  }

  return normalize(
    value,
    Math.min(...knownValues),
    Math.max(...knownValues),
    invert,
  );
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function hasCoordinates(
  station: Station,
): station is LocatedStation {
  return (
    isNum(station.latitude) &&
    isNum(station.longitude)
  );
}

/**
 * Stable identity for both VoltGrid and Open Charge Map
 * stations. Used for React keys and selected-station lookup.
 */
function getStationKey(station: Station): string {
  if (
    station.source === "openchargemap" &&
    isNum(station.external_id)
  ) {
    return `ocm-${station.external_id}`;
  }

  if (isNum(station.id)) {
    return `voltgrid-${station.id}`;
  }

  return `fallback-${station.name}-${
    station.latitude ?? "na"
  }-${station.longitude ?? "na"}`;
}

function getSourceLabel(station: Station): string {
  if (station.source === "openchargemap") {
    return "Open Charge Map";
  }

  if (station.source === "voltgrid") {
    return "VoltGrid";
  }

  return station.source ?? "Unknown source";
}

function getPower(station: Station): number | null {
  if (
    isNum(station.charger_power_kw) &&
    station.charger_power_kw > 0
  ) {
    return station.charger_power_kw;
  }

  // Existing VoltGrid charger data first.
  const chargerPowers = (station.chargers ?? [])
    .map((charger) => charger.power_kw)
    .filter(
      (value): value is number =>
        isNum(value) && value > 0,
    );

  if (chargerPowers.length) {
    return Math.max(...chargerPowers);
  }

  // Fallback: Open Charge Map connector power.
  const connectorPowers = (station.connectors ?? [])
    .map((connector) => connector.power_kw)
    .filter(
      (value): value is number =>
        isNum(value) && value > 0,
    );

  if (connectorPowers.length) {
    return Math.max(...connectorPowers);
  }

  return null;
}

/**
 * Live availability. Returns null when it is not really known,
 * so "0 / 0" is never presented as real data.
 */
function getAvailability(
  station: Station,
): { available: number; total: number } | null {
  if (
    isNum(station.available_chargers) &&
    isNum(station.total_chargers) &&
    station.total_chargers > 0
  ) {
    return {
      available: station.available_chargers,
      total: station.total_chargers,
    };
  }

  if (station.chargers?.length) {
    return {
      available: station.chargers.filter(
        (charger) =>
          charger.status?.toLowerCase() ===
          "available",
      ).length,
      total: station.chargers.length,
    };
  }

  return null;
}

/**
 * Number of connectors (physical quantity), NOT live availability.
 */
function getConnectorQuantity(
  station: Station,
): number | null {
  const quantities = (station.connectors ?? [])
    .map((connector) => connector.quantity)
    .filter(
      (value): value is number =>
        isNum(value) && value > 0,
    );

  if (!quantities.length) {
    return null;
  }

  return quantities.reduce(
    (sum, value) => sum + value,
    0,
  );
}

function getPrice(station: Station): number | null {
  if (isNum(station.charging_cost_per_kwh)) {
    return station.charging_cost_per_kwh;
  }

  if (isNum(station.price_per_kwh)) {
    return station.price_per_kwh;
  }

  return null;
}

function getRating(station: Station): number | null {
  const rating =
    station.average_rating ?? station.rating;

  return isNum(rating) && rating > 0
    ? rating
    : null;
}

function getReliability(
  station: Station,
): number | null {
  return isNum(station.reliability_score)
    ? station.reliability_score
    : null;
}

function getWait(station: Station): number | null {
  return isNum(station.predicted_wait_minutes)
    ? station.predicted_wait_minutes
    : null;
}

function getGreen(station: Station): number | null {
  return isNum(station.green_energy_percent)
    ? station.green_energy_percent
    : null;
}

function getStatusLabel(station: Station): string {
  if (station.status) {
    return station.status;
  }

  if (station.is_operational === true) {
    return "Operational";
  }

  if (station.is_operational === false) {
    return "Not operational";
  }

  return "Unknown";
}

function formatPower(power: number | null): string {
  return power !== null
    ? `${power} kW`
    : "Power unavailable";
}

function formatPrice(price: number | null): string {
  return price !== null
    ? `₹${price.toFixed(2)}/kWh`
    : "Price unavailable";
}

function formatAvailability(
  available: number | null,
  total: number | null,
): string {
  return available !== null && total !== null
    ? `${available} / ${total} available`
    : "Availability unavailable";
}

function formatRating(station: ScoredStation): string {
  if (station.calculated_rating !== null) {
    return station.calculated_rating.toFixed(1);
  }

  const reliability = getReliability(station);

  if (reliability !== null) {
    return `${Math.round(reliability)}% reliable`;
  }

  return "Rating unavailable";
}

function getDisplayConnectors(
  station: Station,
): DisplayConnector[] {
  if (station.connectors?.length) {
    return station.connectors.map(
      (connector, index) => {
        const details: string[] = [];

        if (
          isNum(connector.power_kw) &&
          connector.power_kw > 0
        ) {
          details.push(`${connector.power_kw} kW`);
        }

        if (
          isNum(connector.quantity) &&
          connector.quantity > 0
        ) {
          details.push(`× ${connector.quantity}`);
        }

        if (connector.level) {
          details.push(connector.level);
        }

        if (isNum(connector.voltage)) {
          details.push(`${connector.voltage} V`);
        }

        if (isNum(connector.amps)) {
          details.push(`${connector.amps} A`);
        }

        if (connector.status) {
          details.push(connector.status);
        }

        return {
          key: `connector-${index}`,
          title: connector.type || "Connector",
          details,
        };
      },
    );
  }

  if (station.chargers?.length) {
    return station.chargers.map((charger) => {
      const details: string[] = [];

      if (
        isNum(charger.power_kw) &&
        charger.power_kw > 0
      ) {
        details.push(`${charger.power_kw} kW`);
      }

      if (charger.status) {
        details.push(charger.status);
      }

      return {
        key: `charger-${charger.id}`,
        title:
          charger.charger_type ||
          charger.charger_code ||
          "Charger",
        details,
      };
    });
  }

  return [];
}

/* ============================================================
   SMALL UI PIECES
============================================================ */

function SourceBadge({
  station,
}: {
  station: Station;
}) {
  const isExternal =
    station.source === "openchargemap";

  return (
    <span
      className={`rounded-full px-2 py-1 text-[11px] ${
        isExternal
          ? "bg-purple-500/10 text-purple-300"
          : "bg-volt-500/10 text-volt-300"
      }`}
    >
      {getSourceLabel(station)}
    </span>
  );
}

function DetailTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-grid-950/60 p-2">
      <p className="text-grid-300">{label}</p>

      <p className="mt-1 break-words font-semibold text-grid-200">
        {value}
      </p>
    </div>
  );
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

  const [selectedStationKey, setSelectedStationKey] =
    useState<string | null>(null);

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

  // Debounced so typing in the "Maximum distance" input does not
  // fire one API request per keystroke.
  const [debouncedRadiusKm, setDebouncedRadiusKm] =
    useState(preferences.maxDistanceKm);

  const watchIdRef =
    useRef<number | null>(null);

  const lastStationsRef =
    useRef<Station[]>([]);

  /* ============================================================
     DEBOUNCE SEARCH RADIUS
  ============================================================ */

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedRadiusKm(
        Math.max(1, preferences.maxDistanceKm),
      );
    }, 500);

    return () => window.clearTimeout(timer);
  }, [preferences.maxDistanceKm]);

  /* ============================================================
     QUERY LOCATION
     Uses the user's location when available, otherwise the
     existing default map location. Coordinates are rounded to
     ~100 m so GPS jitter does not trigger a new request.
  ============================================================ */

  const queryLat = userLocation
    ? roundCoordinate(userLocation.latitude)
    : DEFAULT_LOCATION[0];

  const queryLon = userLocation
    ? roundCoordinate(userLocation.longitude)
    : DEFAULT_LOCATION[1];

  /* ============================================================
     LOAD STATIONS (VoltGrid + Open Charge Map)
  ============================================================ */

  const {
    data: nearbyData,
    isLoading: stationsLoading,
    isError: stationsError,
  } = useQuery<Station[]>({
    queryKey: [
      "stations-nearby",
      queryLat,
      queryLon,
      debouncedRadiusKm,
    ],
    queryFn: async () => {
      const response = await api.get<
        Station[] | { stations?: Station[] }
      >("/stations/nearby", {
        params: {
          lat: queryLat,
          lon: queryLon,
          radius_km: debouncedRadiusKm,
        },
      });

      if (Array.isArray(response.data)) {
        return response.data;
      }

      if (Array.isArray(response.data?.stations)) {
        return response.data.stations;
      }

      return [];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (nearbyData) {
      lastStationsRef.current = nearbyData;
    }
  }, [nearbyData]);

  // While a new area is loading, keep showing the previous real
  // API response (avoids flicker). Never keep it after an error.
  const apiStations: Station[] =
    nearbyData ??
    (stationsError ? [] : lastStationsRef.current);

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
     Keep only stations with coordinates and remove any
     accidental duplicate keys.
  ============================================================ */

  const stations = useMemo(() => {
    const byKey = new Map<string, LocatedStation>();

    for (const station of apiStations) {
      if (!hasCoordinates(station)) {
        continue;
      }

      const key = getStationKey(station);

      if (!byKey.has(key)) {
        byKey.set(key, station);
      }
    }

    return Array.from(byKey.values());
  }, [apiStations]);

  /* ============================================================
     SCORE STATIONS
     Unknown values (price, wait, power, rating, availability,
     green energy) are scored neutrally (0.5) and never treated
     as 0 / free / perfect.
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
        // Prefer the backend-provided distance.
        const distance: number | null =
          isNum(station.distance_km)
            ? station.distance_km
            : currentLat !== undefined &&
                currentLon !== undefined
              ? haversineKm(
                  currentLat,
                  currentLon,
                  station.latitude,
                  station.longitude,
                )
              : null;

        const availability =
          getAvailability(station);

        const reachable =
          distance === null
            ? true
            : distance <= maxReachableKm;

        return {
          station,
          distance,
          power: getPower(station),
          available:
            availability?.available ?? null,
          total: availability?.total ?? null,
          price: getPrice(station),
          wait: getWait(station),
          rating: getRating(station),
          reliability: getReliability(station),
          green: getGreen(station),
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

        // Unknown power is never treated as high power, so it
        // cannot satisfy an explicit minimum-power requirement.
        if (
          preferences.minPowerKw > 0 &&
          (candidate.power === null ||
            candidate.power <
              preferences.minPowerKw)
        ) {
          return false;
        }

        // Unknown price is NOT treated as ₹0 and is not removed
        // by the max-price filter.
        if (
          candidate.price !== null &&
          candidate.price >
            preferences.maxPricePerKwh
        ) {
          return false;
        }

        if (
          preferences.fastOnly &&
          (candidate.power === null ||
            candidate.power < 50)
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

    const waits = candidates
      .map((item) => item.wait)
      .filter(
        (value): value is number =>
          value !== null,
      );

    const prices = candidates
      .map((item) => item.price)
      .filter(
        (value): value is number =>
          value !== null,
      );

    const powers = candidates
      .map((item) => item.power)
      .filter(
        (value): value is number =>
          value !== null,
      );

    const availability = candidates
      .map((item) => item.available)
      .filter(
        (value): value is number =>
          value !== null,
      );

    const scored: ScoredStation[] =
      candidates.map((candidate) => {
        const distanceScore = scoreKnown(
          candidate.distance,
          distances,
          true,
        );

        const waitScore = scoreKnown(
          candidate.wait,
          waits,
          true,
        );

        const priceScore = scoreKnown(
          candidate.price,
          prices,
          true,
        );

        const powerScore = scoreKnown(
          candidate.power,
          powers,
        );

        const availabilityScore = scoreKnown(
          candidate.available,
          availability,
        );

        // Real rating first, then reliability, otherwise neutral.
        const ratingScore =
          candidate.rating !== null
            ? candidate.rating / 5
            : candidate.reliability !== null
              ? Math.max(
                  0,
                  Math.min(
                    1,
                    candidate.reliability / 100,
                  ),
                )
              : 0.5;

        const greenScore =
          candidate.green !== null
            ? Math.max(
                0,
                Math.min(
                  1,
                  candidate.green / 100,
                ),
              )
            : 0.5;

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
          candidate.green !== null &&
          greenScore > 0.5
        ) {
          score += 0.05;
        }

        if (
          preferences.preferLowWait &&
          candidate.wait !== null &&
          candidate.wait <= 5
        ) {
          score += 0.05;
        }

        if (!candidate.reachable) {
          score *= 0.4;
        }

        const reasons: string[] = [];

        if (
          candidate.reachable &&
          candidate.distance !== null
        ) {
          reasons.push(
            "Reachable with current battery",
          );
        }

        if (
          candidate.available !== null &&
          candidate.available > 0
        ) {
          reasons.push(
            `${candidate.available} charger(s) available`,
          );
        }

        if (
          candidate.power !== null &&
          candidate.power >= 100
        ) {
          reasons.push(
            "Fast charging available",
          );
        }

        if (
          candidate.wait !== null &&
          candidate.wait <= 5
        ) {
          reasons.push(
            "Low predicted waiting time",
          );
        }

        if (
          candidate.rating !== null &&
          candidate.rating >= 4.5
        ) {
          reasons.push(
            "Highly rated station",
          );
        }

        if (
          candidate.green !== null &&
          candidate.green >= 50
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

        // Explainability: which inputs were unknown and therefore
        // scored neutrally.
        const neutralFactors: string[] = [];

        if (candidate.price === null) {
          neutralFactors.push("price");
        }

        if (candidate.wait === null) {
          neutralFactors.push("wait time");
        }

        if (candidate.power === null) {
          neutralFactors.push("power");
        }

        if (candidate.available === null) {
          neutralFactors.push("availability");
        }

        if (
          candidate.rating === null &&
          candidate.reliability === null
        ) {
          neutralFactors.push("rating");
        }

        if (candidate.green === null) {
          neutralFactors.push("green energy");
        }

        return {
          ...candidate.station,

          station_key: getStationKey(
            candidate.station,
          ),

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

          calculated_total:
            candidate.total,

          calculated_rating:
            candidate.rating,

          neutral_factors: neutralFactors,

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
          .includes(query) ||
        station.operator
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
        station.station_key ===
        selectedStationKey,
    ) ?? filteredStations[0] ?? null;

  const selectedConnectors =
    selectedStation
      ? getDisplayConnectors(selectedStation)
      : [];

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
            selectedStation.latitude,
            selectedStation.longitude,
          ]
        : DEFAULT_LOCATION;

  const selectedPosition =
    selectedStation
      ? ([
          selectedStation.latitude,
          selectedStation.longitude,
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
                      station.latitude,
                      station.longitude,
                    ];

                    const isSelected =
                      station.station_key ===
                      selectedStation?.station_key;

                    return (
                      <CircleMarker
                        key={station.station_key}
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
                            setSelectedStationKey(
                              station.station_key,
                            ),
                        }}
                      >
                        <Popup>
                          <div className="min-w-[220px]">
                            <strong>
                              {station.name}
                            </strong>

                            <p>
                              {station.address ||
                                station.city ||
                                "Charging station"}
                            </p>

                            <p>
                              Source:{" "}
                              {getSourceLabel(
                                station,
                              )}
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
                              {formatPower(
                                station.calculated_power_kw,
                              )}
                            </p>

                            <p>
                              {formatAvailability(
                                station.calculated_available,
                                station.calculated_total,
                              )}
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
                    No charging stations found in
                    this area.
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
                  station.station_key ===
                  selectedStation?.station_key;

                const connectorQuantity =
                  getConnectorQuantity(station);

                const showStatusChip =
                  station.source !==
                    "voltgrid" ||
                  station.is_operational ===
                    false;

                return (
                  <button
                    key={station.station_key}
                    type="button"
                    onClick={() => {
                      setSelectedStationKey(
                        station.station_key,
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
                            {station.address ||
                              station.city ||
                              "EV charging station"}
                          </p>

                          {station.operator && (
                            <p className="mt-1 text-xs text-grid-400">
                              Operator:{" "}
                              {station.operator}
                            </p>
                          )}
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
                          {station.calculated_wait_minutes !==
                          null
                            ? `${station.calculated_wait_minutes} min`
                            : "Unavailable"}
                        </p>
                      </div>

                      <div className="rounded-lg bg-grid-950/60 p-2">
                        <p className="text-grid-300">
                          Power
                        </p>

                        <p className="mt-1 break-words font-semibold text-grid-200">
                          {formatPower(
                            station.calculated_power_kw,
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <SourceBadge
                        station={station}
                      />

                      {station.reachable && (
                        <span className="flex items-center gap-1 rounded-full bg-volt-500/10 px-2 py-1 text-[11px] text-volt-300">
                          <CheckCircle2
                            size={12}
                          />
                          Reachable
                        </span>
                      )}

                      {station.calculated_available !==
                        null &&
                        station.calculated_total !==
                          null && (
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] ${
                              station.calculated_available >
                              0
                                ? "bg-blue-500/10 text-blue-300"
                                : "bg-grid-800 text-grid-300"
                            }`}
                          >
                            {formatAvailability(
                              station.calculated_available,
                              station.calculated_total,
                            )}
                          </span>
                        )}

                      {connectorQuantity !==
                        null && (
                        <span className="rounded-full bg-grid-800 px-2 py-1 text-[11px] text-grid-300">
                          {connectorQuantity}{" "}
                          {connectorQuantity ===
                          1
                            ? "connector"
                            : "connectors"}
                        </span>
                      )}

                      {showStatusChip && (
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] ${
                            station.is_operational ===
                            false
                              ? "bg-red-500/10 text-red-300"
                              : "bg-grid-800 text-grid-300"
                          }`}
                        >
                          {getStatusLabel(
                            station,
                          )}
                        </span>
                      )}

                      <span className="rounded-full bg-grid-800 px-2 py-1 text-[11px] text-grid-300">
                        {formatPrice(
                          station.calculated_price,
                        )}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-grid-800 pt-3">
                      <span className="flex items-center gap-1 text-xs text-grid-400">
                        <Star
                          size={13}
                          className="text-yellow-400"
                        />
                        {formatRating(
                          station,
                        )}
                      </span>

                      <span className="flex items-center gap-1 text-xs text-grid-400">
                        <Clock3
                          size={13}
                        />
                        {station.calculated_wait_minutes !==
                        null
                          ? `${station.calculated_wait_minutes} min`
                          : "Wait time unavailable"}
                      </span>

                      <span className="flex items-center gap-1 text-xs text-grid-400">
                        <PlugZap
                          size={13}
                        />
                        {formatAvailability(
                          station.calculated_available,
                          station.calculated_total,
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

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h3 className="font-display text-xl font-bold text-grid-50">
                    {selectedStation.name}
                  </h3>

                  <SourceBadge
                    station={selectedStation}
                  />
                </div>

                <p className="mt-1 text-sm text-grid-400">
                  {selectedStation.address ||
                    selectedStation.city ||
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

                {/* STATION DETAILS */}
                <div className="mt-5 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                  <DetailTile
                    label="Source"
                    value={getSourceLabel(
                      selectedStation,
                    )}
                  />

                  <DetailTile
                    label="Distance"
                    value={
                      selectedStation.calculated_distance_km !==
                      null
                        ? `${selectedStation.calculated_distance_km.toFixed(
                            1,
                          )} km`
                        : "Distance unavailable"
                    }
                  />

                  {selectedStation.operator && (
                    <DetailTile
                      label="Operator"
                      value={
                        selectedStation.operator
                      }
                    />
                  )}

                  <DetailTile
                    label="Operational status"
                    value={getStatusLabel(
                      selectedStation,
                    )}
                  />

                  <DetailTile
                    label="Live availability"
                    value={formatAvailability(
                      selectedStation.calculated_available,
                      selectedStation.calculated_total,
                    )}
                  />

                  <DetailTile
                    label="Power"
                    value={formatPower(
                      selectedStation.calculated_power_kw,
                    )}
                  />

                  <DetailTile
                    label="Price"
                    value={formatPrice(
                      selectedStation.calculated_price,
                    )}
                  />

                  <DetailTile
                    label="Wait time"
                    value={
                      selectedStation.calculated_wait_minutes !==
                      null
                        ? `${selectedStation.calculated_wait_minutes} min`
                        : "Wait time unavailable"
                    }
                  />

                  <DetailTile
                    label="Rating"
                    value={
                      selectedStation.calculated_rating !==
                      null
                        ? `${selectedStation.calculated_rating.toFixed(
                            1,
                          )} / 5`
                        : "Rating unavailable"
                    }
                  />

                  {getReliability(
                    selectedStation,
                  ) !== null && (
                    <DetailTile
                      label="Reliability"
                      value={`${Math.round(
                        getReliability(
                          selectedStation,
                        ) as number,
                      )}%`}
                    />
                  )}

                  <DetailTile
                    label="Green energy"
                    value={
                      getGreen(selectedStation) !==
                      null
                        ? `${Math.round(
                            getGreen(
                              selectedStation,
                            ) as number,
                          )}%`
                        : "Green energy data unavailable"
                    }
                  />

                  {(selectedStation.usage_type ||
                    isBoolean(
                      selectedStation.is_pay_at_location,
                    ) ||
                    isBoolean(
                      selectedStation.is_membership_required,
                    )) && (
                    <DetailTile
                      label="Access"
                      value={[
                        selectedStation.usage_type,
                        selectedStation.is_pay_at_location ===
                        true
                          ? "Pay at location"
                          : null,
                        selectedStation.is_membership_required ===
                        true
                          ? "Membership required"
                          : selectedStation.is_membership_required ===
                              false
                            ? "No membership required"
                            : null,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    />
                  )}
                </div>

                {/* CONNECTORS */}
                {selectedConnectors.length >
                  0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-grid-400">
                      Connectors
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedConnectors.map(
                        (connector) => (
                          <span
                            key={connector.key}
                            className="flex items-center gap-1 rounded-full bg-grid-800 px-3 py-1.5 text-xs text-grid-200"
                          >
                            <PlugZap
                              size={13}
                              className="text-volt-400"
                            />

                            <span className="font-semibold">
                              {connector.title}
                            </span>

                            {connector.details
                              .length > 0 && (
                              <span className="text-grid-300">
                                {connector.details.join(
                                  " • ",
                                )}
                              </span>
                            )}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {selectedStation.neutral_factors
                  .length > 0 && (
                  <p className="mt-4 text-xs text-grid-300">
                    Data unavailable, scored
                    neutrally:{" "}
                    {selectedStation.neutral_factors.join(
                      ", ",
                    )}
                    .
                  </p>
                )}
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
                  {selectedStation.source === "voltgrid" &&
  selectedStation.id != null && (
    <Link
      to={`/booking/${selectedStation.id}`}
      className="mt-5 flex w-full min-w-[190px] items-center justify-center gap-2 rounded-xl bg-volt-500 px-5 py-3 text-sm font-semibold text-grid-950 transition hover:bg-volt-400"
    >
      <PlugZap size={17} />
      Book this charger
    </Link>
  )}

{selectedStation.source === "openchargemap" && (
  <div className="mt-5 w-full min-w-[190px] rounded-xl border border-grid-700 bg-grid-950/60 px-4 py-3 text-center">
    <p className="text-xs font-medium text-grid-300">
      External station
    </p>

    <p className="mt-1 text-[11px] text-grid-400">
      Booking is not available through VoltGrid
    </p>
  </div>
)}
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

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}