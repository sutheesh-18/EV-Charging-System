import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BatteryCharging,
  CheckCircle2,
  Clock3,
  LocateFixed,
  LocateOff,
  MapPin,
  Navigation,
  PlugZap,
  RefreshCw,
  Search,
  SlidersHorizontal,
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
import { useTheme } from "../../lib/theme";

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

  // External station links
  booking_url?: string | null;
  operator_website_url?: string | null;
  station_info_url?: string | null;
  openchargemap_url?: string | null;

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
  is_default?: boolean;
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

const DEFAULT_LOCATION: [number, number] = [11.0168, 76.9558];

const DEFAULT_PREFERENCES: Preferences = {
  maxDistanceKm: 50,
  minPowerKw: 0,
  maxPricePerKwh: 100,
  fastOnly: false,
  preferGreen: true,
  preferLowWait: true,
};

/* ============================================================
   SHARED STYLES (light + dark) - same tokens as the Dashboard
============================================================ */

const CARD =
  "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-grid-700/70 dark:bg-grid-850/90 dark:shadow-card";
const TILE = "rounded-lg bg-slate-50 dark:bg-grid-900/60";
const DIVIDER = "border-slate-200 dark:border-grid-700/70";
const HEADING = "text-slate-900 dark:text-grid-50";
const STRONG = "text-slate-800 dark:text-grid-100";
const BODY = "text-slate-600 dark:text-grid-300";
const MUTED = "text-slate-500 dark:text-grid-400";
const ACCENT_TILE =
  "bg-teal-50 text-teal-700 dark:bg-volt-500/15 dark:text-volt-300";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-volt-400 dark:focus-visible:ring-offset-grid-950";

const INPUT =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-grid-700 dark:bg-grid-900 dark:text-grid-50 dark:placeholder:text-grid-500 dark:focus:border-volt-400 dark:focus:ring-volt-400/20";

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 dark:bg-volt-500 dark:text-grid-950 dark:hover:bg-volt-400";
const BTN_OUTLINE =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700 dark:border-grid-600 dark:bg-transparent dark:text-grid-200 dark:hover:border-volt-500/60 dark:hover:bg-volt-500/10 dark:hover:text-volt-300";

/* ============================================================
   HELPERS (scoring and station data: unchanged behaviour)
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

  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));

  return invert ? 1 - normalized : normalized;
}

function isNum(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
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

function hasCoordinates(station: Station): station is LocatedStation {
  return isNum(station.latitude) && isNum(station.longitude);
}

/**
 * Stable identity for both VoltGrid and Open Charge Map
 * stations. Used for React keys and selected-station lookup.
 */
function getStationKey(station: Station): string {
  if (station.source === "openchargemap" && isNum(station.external_id)) {
    return `ocm-${station.external_id}`;
  }

  if (isNum(station.id)) {
    return `voltgrid-${station.id}`;
  }

  return `fallback-${station.name}-${station.latitude ?? "na"}-${
    station.longitude ?? "na"
  }`;
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
  if (isNum(station.charger_power_kw) && station.charger_power_kw > 0) {
    return station.charger_power_kw;
  }

  // Existing VoltGrid charger data first.
  const chargerPowers = (station.chargers ?? [])
    .map((charger) => charger.power_kw)
    .filter((value): value is number => isNum(value) && value > 0);

  if (chargerPowers.length) {
    return Math.max(...chargerPowers);
  }

  // Fallback: Open Charge Map connector power.
  const connectorPowers = (station.connectors ?? [])
    .map((connector) => connector.power_kw)
    .filter((value): value is number => isNum(value) && value > 0);

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
        (charger) => charger.status?.toLowerCase() === "available",
      ).length,
      total: station.chargers.length,
    };
  }

  return null;
}

/**
 * Number of connectors (physical quantity), NOT live availability.
 */
function getConnectorQuantity(station: Station): number | null {
  const quantities = (station.connectors ?? [])
    .map((connector) => connector.quantity)
    .filter((value): value is number => isNum(value) && value > 0);

  if (!quantities.length) {
    return null;
  }

  return quantities.reduce((sum, value) => sum + value, 0);
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
  const rating = station.average_rating ?? station.rating;

  return isNum(rating) && rating > 0 ? rating : null;
}

function getReliability(station: Station): number | null {
  return isNum(station.reliability_score) ? station.reliability_score : null;
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
  return power !== null ? `${power} kW` : "Power unavailable";
}

function formatPrice(price: number | null): string {
  return price !== null ? `₹${price.toFixed(2)}/kWh` : "Price unavailable";
}

function formatAvailability(
  available: number | null,
  total: number | null,
): string {
  return available !== null && total !== null
    ? `${available} / ${total} available`
    : "Availability unavailable";
}

function getSafeExternalUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const url = new URL(value.trim());

    if (!["https:", "http:"].includes(url.protocol) || !url.hostname) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
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

function getDisplayConnectors(station: Station): DisplayConnector[] {
  if (station.connectors?.length) {
    return station.connectors.map((connector, index) => {
      const details: string[] = [];

      if (isNum(connector.power_kw) && connector.power_kw > 0) {
        details.push(`${connector.power_kw} kW`);
      }

      if (isNum(connector.quantity) && connector.quantity > 0) {
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
    });
  }

  if (station.chargers?.length) {
    return station.chargers.map((charger) => {
      const details: string[] = [];

      if (isNum(charger.power_kw) && charger.power_kw > 0) {
        details.push(`${charger.power_kw} kW`);
      }

      if (charger.status) {
        details.push(charger.status);
      }

      return {
        key: `charger-${charger.id}`,
        title: charger.charger_type || charger.charger_code || "Charger",
        details,
      };
    });
  }

  return [];
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the page still works */
  }
}

/* ============================================================
   SMALL UI PIECES
============================================================ */

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/80 motion-reduce:animate-none dark:bg-grid-700/60 ${className}`}
    />
  );
}

function SourceBadge({ station }: { station: Station }) {
  const isExternal = station.source === "openchargemap";

  return (
    <span
      className={`rounded-full px-2 py-1 text-[11px] font-medium ${
        isExternal
          ? "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300"
          : "bg-teal-50 text-teal-700 dark:bg-volt-500/10 dark:text-volt-300"
      }`}
    >
      {getSourceLabel(station)}
    </span>
  );
}

function Chip({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "good" | "info" | "bad";
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-slate-100 text-slate-600 dark:bg-grid-800 dark:text-grid-300",
    good: "bg-emerald-50 text-emerald-700 dark:bg-volt-500/10 dark:text-volt-300",
    info: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    bad: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${TILE} p-3`}>
      <p className={MUTED}>{label}</p>

      <p className={`mt-1 break-words font-semibold ${STRONG}`}>{value}</p>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ElementType;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className={`${CARD} p-5`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-3 ${tone}`}>
          <Icon size={20} />
        </div>

        <div>
          <p className={`text-xs ${MUTED}`}>{label}</p>

          <p className={`font-display text-xl font-bold ${HEADING}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 text-sm ${BODY}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 accent-teal-700 dark:border-grid-600 dark:accent-volt-500"
      />
      {label}
    </label>
  );
}

function NumberField({
  label,
  unit,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  unit: string;
  value: number | "";
  min: number;
  max: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className={`text-xs font-medium ${MUTED}`}>{label}</span>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={INPUT}
        />

        <span className={`text-xs ${MUTED}`}>{unit}</span>
      </div>
    </label>
  );
}

/* ============================================================
   MAP CONTROLLER
============================================================ */

function MapController({ location }: { location: [number, number] | null }) {
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
  const { theme } = useTheme();

  const [search, setSearch] = useState("");

  const [battery, setBattery] = useState<number | null>(null);

  const [tracking, setTracking] = useState(false);

  const [locationError, setLocationError] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const [locationHistory, setLocationHistory] = useState<UserLocation[]>(() =>
    readStored<UserLocation[]>("voltgrid-location-history", []),
  );

  const [selectedStationKey, setSelectedStationKey] = useState<string | null>(
    null,
  );

  const [showPreferences, setShowPreferences] = useState(false);

  const [preferences, setPreferences] = useState<Preferences>(() => ({
    ...DEFAULT_PREFERENCES,
    ...readStored<Partial<Preferences>>("voltgrid-location-preferences", {}),
  }));

  // Debounced so typing in the "Maximum distance" input does not
  // fire one API request per keystroke.
  const [debouncedRadiusKm, setDebouncedRadiusKm] = useState(
    preferences.maxDistanceKm,
  );

  const watchIdRef = useRef<number | null>(null);

  const lastStationsRef = useRef<Station[]>([]);

  /* ---------- debounce search radius ---------- */

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedRadiusKm(Math.max(1, preferences.maxDistanceKm));
    }, 500);

    return () => window.clearTimeout(timer);
  }, [preferences.maxDistanceKm]);

  /* ---------- query location (rounded to ~100 m) ---------- */

  const queryLat = userLocation
    ? roundCoordinate(userLocation.latitude)
    : DEFAULT_LOCATION[0];

  const queryLon = userLocation
    ? roundCoordinate(userLocation.longitude)
    : DEFAULT_LOCATION[1];

  /* ---------- load stations (VoltGrid + Open Charge Map) ---------- */

  const {
    data: nearbyData,
    isLoading: stationsLoading,
    isError: stationsError,
    isFetching: stationsFetching,
    refetch: refetchStations,
  } = useQuery<Station[]>({
    queryKey: ["stations-nearby", queryLat, queryLon, debouncedRadiusKm],
    queryFn: async () => {
      const response = await api.get<Station[] | { stations?: Station[] }>(
        "/stations/nearby",
        {
          params: {
            lat: queryLat,
            lon: queryLon,
            radius_km: debouncedRadiusKm,
          },
        },
      );

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
    nearbyData ?? (stationsError ? [] : lastStationsRef.current);

  /* ---------- load vehicles (same endpoint as My EV and Dashboard) ---------- */

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const response = await api.get("/users/me/vehicles");

      if (Array.isArray(response.data)) {
        return response.data;
      }

      if (Array.isArray(response.data?.vehicles)) {
        return response.data.vehicles;
      }

      return [];
    },
  });

  const defaultVehicle =
    vehicles.find((vehicle) => vehicle.is_default) ?? vehicles[0];

  /* ---------- use vehicle battery ---------- */

  useEffect(() => {
    if (typeof defaultVehicle?.remaining_battery_percent === "number") {
      setBattery(defaultVehicle.remaining_battery_percent);
    }
  }, [defaultVehicle]);

  /* ---------- save preferences and history ---------- */

  useEffect(() => {
    writeStored("voltgrid-location-preferences", preferences);
  }, [preferences]);

  useEffect(() => {
    writeStored("voltgrid-location-history", locationHistory.slice(-100));
  }, [locationHistory]);

  /* ---------- location ---------- */

  const handleLocationSuccess = (position: GeolocationPosition) => {
    const location: UserLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: Date.now(),
    };

    setLocationError(null);
    setUserLocation(location);

    setLocationHistory((previous) => {
      const last = previous[previous.length - 1];

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

      return [...previous, location].slice(-100);
    });
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);

      watchIdRef.current = null;
    }

    setTracking(false);
  };

  const handleLocationError = (error: GeolocationPositionError) => {
    console.error("Geolocation error:", error.message);

    // also stops the watcher, so nothing keeps running after a denial
    stopTracking();

    setLocationError(
      "We couldn't access your location. Allow location permission in your browser and try again.",
    );
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    if (tracking) {
      stopTracking();
      return;
    }

    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      handleLocationSuccess,
      handleLocationError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );

    const watchId = navigator.geolocation.watchPosition(
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

  // stop watching when the page is left
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const clearLocationHistory = () => {
    setLocationHistory([]);

    try {
      localStorage.removeItem("voltgrid-location-history");
    } catch {
      /* ignore */
    }
  };

  /* ---------- normalize stations ---------- */

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

  /* ---------- score stations ----------
     Unknown values (price, wait, power, rating, availability,
     green energy) are scored neutrally (0.5) and never treated
     as 0 / free / perfect. */

  const scoredStations = useMemo(() => {
    const currentLat = userLocation?.latitude;

    const currentLon = userLocation?.longitude;

    const maxReachableKm = defaultVehicle?.vehicle_range_km
      ? defaultVehicle.vehicle_range_km * ((battery ?? 0) / 100) * 0.9
      : Infinity;

    const candidates = stations
      .map((station) => {
        // Prefer the backend-provided distance.
        const distance: number | null = isNum(station.distance_km)
          ? station.distance_km
          : currentLat !== undefined && currentLon !== undefined
            ? haversineKm(
                currentLat,
                currentLon,
                station.latitude,
                station.longitude,
              )
            : null;

        const availability = getAvailability(station);

        const reachable = distance === null ? true : distance <= maxReachableKm;

        return {
          station,
          distance,
          power: getPower(station),
          available: availability?.available ?? null,
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
          candidate.distance > preferences.maxDistanceKm
        ) {
          return false;
        }

        // Unknown power is never treated as high power, so it
        // cannot satisfy an explicit minimum-power requirement.
        if (
          preferences.minPowerKw > 0 &&
          (candidate.power === null || candidate.power < preferences.minPowerKw)
        ) {
          return false;
        }

        // Unknown price is NOT treated as ₹0 and is not removed
        // by the max-price filter.
        if (
          candidate.price !== null &&
          candidate.price > preferences.maxPricePerKwh
        ) {
          return false;
        }

        if (
          preferences.fastOnly &&
          (candidate.power === null || candidate.power < 50)
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
      .filter((value): value is number => value !== null);

    const waits = candidates
      .map((item) => item.wait)
      .filter((value): value is number => value !== null);

    const prices = candidates
      .map((item) => item.price)
      .filter((value): value is number => value !== null);

    const powers = candidates
      .map((item) => item.power)
      .filter((value): value is number => value !== null);

    const availability = candidates
      .map((item) => item.available)
      .filter((value): value is number => value !== null);

    const scored: ScoredStation[] = candidates.map((candidate) => {
      const distanceScore = scoreKnown(candidate.distance, distances, true);

      const waitScore = scoreKnown(candidate.wait, waits, true);

      const priceScore = scoreKnown(candidate.price, prices, true);

      const powerScore = scoreKnown(candidate.power, powers);

      const availabilityScore = scoreKnown(candidate.available, availability);

      // Real rating first, then reliability, otherwise neutral.
      const ratingScore =
        candidate.rating !== null
          ? candidate.rating / 5
          : candidate.reliability !== null
            ? Math.max(0, Math.min(1, candidate.reliability / 100))
            : 0.5;

      const greenScore =
        candidate.green !== null
          ? Math.max(0, Math.min(1, candidate.green / 100))
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

      if (candidate.reachable && candidate.distance !== null) {
        reasons.push("Reachable with current battery");
      }

      if (candidate.available !== null && candidate.available > 0) {
        reasons.push(`${candidate.available} charger(s) available`);
      }

      if (candidate.power !== null && candidate.power >= 100) {
        reasons.push("Fast charging available");
      }

      if (candidate.wait !== null && candidate.wait <= 5) {
        reasons.push("Low predicted waiting time");
      }

      if (candidate.rating !== null && candidate.rating >= 4.5) {
        reasons.push("Highly rated station");
      }

      if (candidate.green !== null && candidate.green >= 50) {
        reasons.push("High green-energy usage");
      }

      if (!reasons.length) {
        reasons.push("Good overall charging option");
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

      if (candidate.rating === null && candidate.reliability === null) {
        neutralFactors.push("rating");
      }

      if (candidate.green === null) {
        neutralFactors.push("green energy");
      }

      return {
        ...candidate.station,

        station_key: getStationKey(candidate.station),

        calculated_distance_km: candidate.distance,

        ai_score: Math.round(score * 100),

        reachable: candidate.reachable,

        calculated_wait_minutes: candidate.wait,

        calculated_power_kw: candidate.power,

        calculated_price: candidate.price,

        calculated_available: candidate.available,

        calculated_total: candidate.total,

        calculated_rating: candidate.rating,

        neutral_factors: neutralFactors,

        reasons,
      };
    });

    return scored.sort((a, b) => b.ai_score - a.ai_score);
  }, [stations, userLocation, defaultVehicle, battery, preferences]);

  /* ---------- search ---------- */

  const filteredStations = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return scoredStations;
    }

    return scoredStations.filter(
      (station) =>
        station.name.toLowerCase().includes(query) ||
        station.address?.toLowerCase().includes(query) ||
        station.city?.toLowerCase().includes(query) ||
        station.operator?.toLowerCase().includes(query),
    );
  }, [scoredStations, search]);

  /* ---------- selected station ---------- */

  const selectedStation =
    scoredStations.find(
      (station) => station.station_key === selectedStationKey,
    ) ??
    filteredStations[0] ??
    null;

  const externalBookingUrl = selectedStation
    ? getSafeExternalUrl(selectedStation.booking_url)
    : null;

  const externalWebsiteUrl = selectedStation
    ? getSafeExternalUrl(selectedStation.operator_website_url)
    : null;

  const externalStationInfoUrl = selectedStation
    ? (getSafeExternalUrl(selectedStation.station_info_url) ??
      getSafeExternalUrl(selectedStation.openchargemap_url))
    : null;

  const selectedConnectors = selectedStation
    ? getDisplayConnectors(selectedStation)
    : [];

  /* ---------- map ---------- */

  const mapCenter: [number, number] = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : selectedStation
      ? [selectedStation.latitude, selectedStation.longitude]
      : DEFAULT_LOCATION;

  const selectedPosition = selectedStation
    ? ([selectedStation.latitude, selectedStation.longitude] as [number, number])
    : null;

  const historyPath: [number, number][] = locationHistory.map((location) => [
    location.latitude,
    location.longitude,
  ]);

  const dark = theme === "dark";

  const safeRangeKm = defaultVehicle?.vehicle_range_km
    ? Math.round(
        defaultVehicle.vehicle_range_km * ((battery ?? 0) / 100) * 0.9,
      )
    : null;

  const resetFilters = () => {
    setSearch("");
    setPreferences(DEFAULT_PREFERENCES);
  };

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* PAGE HEADER */}

        <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <MapPin size={20} className="text-teal-700 dark:text-volt-400" />

              <span className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-volt-300">
                Smart location
              </span>
            </div>

            <h2
              className={`font-display text-3xl font-bold tracking-tight ${HEADING}`}
            >
              Map & Recommend
            </h2>

            <p className={`mt-1 text-sm ${BODY}`}>
              Find the best charging station based on your location, battery
              and preferences.
            </p>
          </div>

          {/* TRACK LOCATION */}

          <button
            type="button"
            onClick={startTracking}
            aria-pressed={tracking}
            className={`${
              tracking
                ? "inline-flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                : BTN_PRIMARY
            } ${FOCUS}`}
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
        </section>

        {/* LOCATION ERROR */}

        {locationError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/30 dark:bg-amber-400/10"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300">
              <AlertTriangle size={17} />
            </div>

            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Location unavailable
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-300/80">
                {locationError}
              </p>
            </div>
          </div>
        )}

        {/* SEARCH + PREFERENCES */}

        <section className={`${CARD} p-4`}>
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-grid-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search station, address or city..."
                aria-label="Search stations"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-grid-700 dark:bg-grid-900 dark:text-grid-50 dark:placeholder:text-grid-500 dark:focus:border-volt-400 dark:focus:ring-volt-400/20"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowPreferences((value) => !value)}
              aria-expanded={showPreferences}
              className={`${BTN_OUTLINE} py-3 ${FOCUS}`}
            >
              <SlidersHorizontal size={16} />
              Preferences
            </button>
          </div>

          {showPreferences && (
            <div
              className={`mt-4 grid gap-4 border-t pt-4 md:grid-cols-2 lg:grid-cols-4 ${DIVIDER}`}
            >
              <NumberField
                label="Maximum distance"
                unit="km"
                min={1}
                max={500}
                value={preferences.maxDistanceKm}
                onChange={(value) =>
                  setPreferences((previous) => ({
                    ...previous,
                    maxDistanceKm: Number(value) || 1,
                  }))
                }
              />

              <NumberField
                label="Minimum charger power"
                unit="kW"
                min={0}
                max={500}
                value={preferences.minPowerKw}
                onChange={(value) =>
                  setPreferences((previous) => ({
                    ...previous,
                    minPowerKw: Number(value) || 0,
                  }))
                }
              />

              <NumberField
                label="Maximum price"
                unit="₹/kWh"
                min={0}
                max={500}
                value={preferences.maxPricePerKwh}
                onChange={(value) =>
                  setPreferences((previous) => ({
                    ...previous,
                    maxPricePerKwh: Number(value) || 0,
                  }))
                }
              />

              <NumberField
                label="Current battery"
                unit="%"
                min={1}
                max={100}
                value={battery ?? ""}
                onChange={(value) =>
                  setBattery(Math.min(100, Math.max(1, Number(value) || 1)))
                }
              />

              <div className="flex flex-wrap gap-4 md:col-span-2 lg:col-span-4">
                <Toggle
                  label="Fast chargers only"
                  checked={preferences.fastOnly}
                  onChange={(value) =>
                    setPreferences((previous) => ({
                      ...previous,
                      fastOnly: value,
                    }))
                  }
                />

                <Toggle
                  label="Prefer green energy"
                  checked={preferences.preferGreen}
                  onChange={(value) =>
                    setPreferences((previous) => ({
                      ...previous,
                      preferGreen: value,
                    }))
                  }
                />

                <Toggle
                  label="Prefer low waiting time"
                  checked={preferences.preferLowWait}
                  onChange={(value) =>
                    setPreferences((previous) => ({
                      ...previous,
                      preferLowWait: value,
                    }))
                  }
                />
              </div>
            </div>
          )}
        </section>

        {/* LOCATION STATUS */}

        <section
          className={`rounded-xl border px-4 py-3 ${
            tracking
              ? "border-teal-200 bg-teal-50 dark:border-volt-500/30 dark:bg-volt-500/10"
              : "border-slate-200 bg-white dark:border-grid-700/70 dark:bg-grid-900/60"
          }`}
        >
          <div className="flex items-center gap-3">
            {tracking ? (
              <Navigation
                size={18}
                className="text-teal-700 dark:text-volt-400"
              />
            ) : (
              <LocateFixed size={18} className={MUTED} />
            )}

            <div>
              <p className={`text-sm font-semibold ${STRONG}`}>
                {tracking
                  ? "Live location tracking active"
                  : userLocation
                    ? "Location available"
                    : "Location not enabled"}
              </p>

              <p className={`text-xs ${BODY}`}>
                {userLocation
                  ? `${userLocation.latitude.toFixed(
                      5,
                    )}, ${userLocation.longitude.toFixed(
                      5,
                    )} • ±${Math.round(userLocation.accuracy)} m`
                  : "Use the button above to detect your current location."}
              </p>
            </div>
          </div>
        </section>

        {/* MAP + STATIONS */}

        <section className="grid gap-6 xl:grid-cols-[1.7fr_0.9fr]">
          {/* MAP (isolate keeps the map's own layers under the header) */}

          <div
            className={`isolate overflow-hidden ${CARD}`}
            aria-label="Map of charging stations"
          >
            <div className="h-[420px] lg:h-[620px]">
              <MapContainer
                center={mapCenter}
                zoom={13}
                scrollWheelZoom
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

                <MapController
                  location={
                    userLocation
                      ? [userLocation.latitude, userLocation.longitude]
                      : selectedPosition
                  }
                />

                {/* USER LOCATION */}
                {userLocation && (
                  <>
                    <CircleMarker
                      center={[userLocation.latitude, userLocation.longitude]}
                      radius={9}
                      pathOptions={{
                        color: "#06b6d4",
                        fillColor: "#06b6d4",
                        fillOpacity: 0.9,
                      }}
                    >
                      <Popup>
                        <strong>Your current location</strong>
                        <br />
                        Accuracy: {Math.round(userLocation.accuracy)} m
                      </Popup>
                    </CircleMarker>

                    <Circle
                      center={[userLocation.latitude, userLocation.longitude]}
                      radius={Math.max(userLocation.accuracy, 50)}
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
                {filteredStations.map((station) => {
                  const position: [number, number] = [
                    station.latitude,
                    station.longitude,
                  ];

                  const isSelected =
                    station.station_key === selectedStation?.station_key;

                  return (
                    <CircleMarker
                      key={station.station_key}
                      center={position}
                      radius={isSelected ? 12 : 8}
                      pathOptions={{
                        color: isSelected ? "#0ea5e9" : "#10b981",
                        fillColor: isSelected ? "#0ea5e9" : "#10b981",
                        fillOpacity: 0.9,
                        weight: 3,
                      }}
                      eventHandlers={{
                        click: () => setSelectedStationKey(station.station_key),
                      }}
                    >
                      <Popup>
                        <div className="min-w-[220px]">
                          <strong>{station.name}</strong>

                          <p>
                            {station.address ||
                              station.city ||
                              "Charging station"}
                          </p>

                          <p>Source: {getSourceLabel(station)}</p>

                          <p>Score: {station.ai_score}/100</p>

                          <p>
                            Power: {formatPower(station.calculated_power_kw)}
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
                })}

                {/* ROUTE TO SELECTED STATION */}
                {userLocation && selectedPosition && (
                  <Polyline
                    positions={[
                      [userLocation.latitude, userLocation.longitude],
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
                <h3
                  className={`font-display text-lg font-semibold ${HEADING}`}
                >
                  Recommended stations
                </h3>

                <p className={`text-xs ${BODY}`}>
                  {filteredStations.length} station(s) found
                  {stationsFetching && !stationsLoading && " · updating…"}
                </p>
              </div>

              {locationHistory.length > 0 && (
                <button
                  type="button"
                  onClick={clearLocationHistory}
                  className={`flex items-center gap-1 rounded text-xs hover:text-red-600 dark:hover:text-red-400 ${MUTED} ${FOCUS}`}
                >
                  <Trash2 size={14} />
                  Clear history
                </button>
              )}
            </div>

            {stationsLoading && (
              <div
                className="space-y-3"
                role="status"
                aria-label="Loading charging stations"
              >
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`${CARD} p-4`} aria-hidden="true">
                    <div className="flex gap-3">
                      <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <Skeleton className="h-12" />
                      <Skeleton className="h-12" />
                      <Skeleton className="h-12" />
                    </div>
                  </div>
                ))}
                <span className="sr-only">Loading charging stations...</span>
              </div>
            )}

            {stationsError && (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-500/30 dark:bg-red-500/10"
              >
                <p className="font-semibold text-red-900 dark:text-red-200">
                  Unable to load stations
                </p>

                <p className="mt-1 text-xs text-red-700 dark:text-red-300/80">
                  Please check your backend connection.
                </p>

                <button
                  type="button"
                  onClick={() => refetchStations()}
                  disabled={stationsFetching}
                  className={`mt-3 inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-500/40 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-500/10 ${FOCUS}`}
                >
                  <RefreshCw
                    size={15}
                    className={
                      stationsFetching
                        ? "animate-spin motion-reduce:animate-none"
                        : ""
                    }
                  />
                  {stationsFetching ? "Retrying" : "Try again"}
                </button>
              </div>
            )}

            {!stationsLoading &&
              !stationsError &&
              filteredStations.length === 0 && (
                <div className={`${CARD} p-6 text-center`}>
                  <MapPin size={28} className={`mx-auto ${MUTED}`} />

                  <p className={`mt-3 text-sm font-semibold ${STRONG}`}>
                    No charging stations found in this area.
                  </p>

                  <p className={`mt-1 text-xs ${BODY}`}>
                    Try changing your search or preferences.
                  </p>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className={`${BTN_OUTLINE} mt-4 ${FOCUS}`}
                  >
                    Reset search and preferences
                  </button>
                </div>
              )}

            {filteredStations.slice(0, 8).map((station, index) => {
              const selected =
                station.station_key === selectedStation?.station_key;

              const connectorQuantity = getConnectorQuantity(station);

              const showStatusChip =
                station.source !== "voltgrid" ||
                station.is_operational === false;

              return (
                <button
                  key={station.station_key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setSelectedStationKey(station.station_key);
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition ${FOCUS} ${
                    selected
                      ? "border-teal-400 bg-teal-50/70 dark:border-volt-400/50 dark:bg-volt-500/10"
                      : "border-slate-200 bg-white hover:border-teal-300 dark:border-grid-700/70 dark:bg-grid-850/70 dark:hover:border-grid-600"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ACCENT_TILE}`}
                      >
                        {index === 0 ? <Star size={18} /> : <Zap size={18} />}
                      </div>

                      <div>
                        <h4 className={`font-semibold ${HEADING}`}>
                          {station.name}
                        </h4>

                        <p className={`mt-1 text-xs ${BODY}`}>
                          {station.address ||
                            station.city ||
                            "EV charging station"}
                        </p>

                        {station.operator && (
                          <p className={`mt-1 text-xs ${MUTED}`}>
                            Operator: {station.operator}
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${ACCENT_TILE}`}
                      title="AI match score"
                    >
                      {station.ai_score}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div className={`${TILE} p-2`}>
                      <p className={BODY}>Distance</p>

                      <p className={`mt-1 font-semibold ${STRONG}`}>
                        {station.calculated_distance_km !== null
                          ? `${station.calculated_distance_km.toFixed(1)} km`
                          : "--"}
                      </p>
                    </div>

                    <div className={`${TILE} p-2`}>
                      <p className={BODY}>Wait</p>

                      <p className={`mt-1 font-semibold ${STRONG}`}>
                        {station.calculated_wait_minutes !== null
                          ? `${station.calculated_wait_minutes} min`
                          : "Unavailable"}
                      </p>
                    </div>

                    <div className={`${TILE} p-2`}>
                      <p className={BODY}>Power</p>

                      <p
                        className={`mt-1 break-words font-semibold ${STRONG}`}
                      >
                        {formatPower(station.calculated_power_kw)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <SourceBadge station={station} />

                    {station.reachable && (
                      <Chip tone="good">
                        <CheckCircle2 size={12} />
                        Reachable
                      </Chip>
                    )}

                    {station.calculated_available !== null &&
                      station.calculated_total !== null && (
                        <Chip
                          tone={
                            station.calculated_available > 0
                              ? "info"
                              : "neutral"
                          }
                        >
                          {formatAvailability(
                            station.calculated_available,
                            station.calculated_total,
                          )}
                        </Chip>
                      )}

                    {connectorQuantity !== null && (
                      <Chip>
                        {connectorQuantity}{" "}
                        {connectorQuantity === 1 ? "connector" : "connectors"}
                      </Chip>
                    )}

                    {showStatusChip && (
                      <Chip
                        tone={
                          station.is_operational === false ? "bad" : "neutral"
                        }
                      >
                        {getStatusLabel(station)}
                      </Chip>
                    )}

                    <Chip>{formatPrice(station.calculated_price)}</Chip>
                  </div>

                  <div
                    className={`mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t pt-3 ${DIVIDER}`}
                  >
                    <span className={`flex items-center gap-1 text-xs ${MUTED}`}>
                      <Star size={13} className="text-yellow-500" />
                      {formatRating(station)}
                    </span>

                    <span className={`flex items-center gap-1 text-xs ${MUTED}`}>
                      <Clock3 size={13} />
                      {station.calculated_wait_minutes !== null
                        ? `${station.calculated_wait_minutes} min`
                        : "Wait time unavailable"}
                    </span>

                    <span className={`flex items-center gap-1 text-xs ${MUTED}`}>
                      <PlugZap size={13} />
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
        </section>

        {/* SELECTED STATION */}

        {selectedStation && (
          <section className={`${CARD} overflow-hidden`}>
            <div className="grid lg:grid-cols-[1fr_auto]">
              <div className="p-6">
                <div className="flex items-center gap-2 text-teal-700 dark:text-volt-400">
                  <Zap size={18} />

                  <span className="text-xs font-bold uppercase tracking-[0.18em]">
                    AI recommendation
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h3
                    className={`font-display text-xl font-bold ${HEADING}`}
                  >
                    {selectedStation.name}
                  </h3>

                  <SourceBadge station={selectedStation} />
                </div>

                <p className={`mt-1 text-sm ${BODY}`}>
                  {selectedStation.address ||
                    selectedStation.city ||
                    "Charging station"}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {selectedStation.reasons.map((reason) => (
                    <span
                      key={reason}
                      className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 dark:bg-volt-500/10 dark:text-volt-300"
                    >
                      <CheckCircle2 size={13} />
                      {reason}
                    </span>
                  ))}
                </div>

                {/* STATION DETAILS */}
                <div className="mt-5 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                  <DetailTile
                    label="Source"
                    value={getSourceLabel(selectedStation)}
                  />

                  <DetailTile
                    label="Distance"
                    value={
                      selectedStation.calculated_distance_km !== null
                        ? `${selectedStation.calculated_distance_km.toFixed(1)} km`
                        : "Distance unavailable"
                    }
                  />

                  {selectedStation.operator && (
                    <DetailTile
                      label="Operator"
                      value={selectedStation.operator}
                    />
                  )}

                  <DetailTile
                    label="Operational status"
                    value={getStatusLabel(selectedStation)}
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
                    value={formatPower(selectedStation.calculated_power_kw)}
                  />

                  <DetailTile
                    label="Price"
                    value={formatPrice(selectedStation.calculated_price)}
                  />

                  <DetailTile
                    label="Wait time"
                    value={
                      selectedStation.calculated_wait_minutes !== null
                        ? `${selectedStation.calculated_wait_minutes} min`
                        : "Wait time unavailable"
                    }
                  />

                  <DetailTile
                    label="Rating"
                    value={
                      selectedStation.calculated_rating !== null
                        ? `${selectedStation.calculated_rating.toFixed(1)} / 5`
                        : "Rating unavailable"
                    }
                  />

                  {getReliability(selectedStation) !== null && (
                    <DetailTile
                      label="Reliability"
                      value={`${Math.round(
                        getReliability(selectedStation) as number,
                      )}%`}
                    />
                  )}

                  <DetailTile
                    label="Green energy"
                    value={
                      getGreen(selectedStation) !== null
                        ? `${Math.round(getGreen(selectedStation) as number)}%`
                        : "Green energy data unavailable"
                    }
                  />

                  {(selectedStation.usage_type ||
                    isBoolean(selectedStation.is_pay_at_location) ||
                    isBoolean(selectedStation.is_membership_required)) && (
                    <DetailTile
                      label="Access"
                      value={[
                        selectedStation.usage_type,
                        selectedStation.is_pay_at_location === true
                          ? "Pay at location"
                          : null,
                        selectedStation.is_membership_required === true
                          ? "Membership required"
                          : selectedStation.is_membership_required === false
                            ? "No membership required"
                            : null,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    />
                  )}
                </div>

                {/* CONNECTORS */}
                {selectedConnectors.length > 0 && (
                  <div className="mt-4">
                    <p className={`text-xs font-medium ${MUTED}`}>
                      Connectors
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedConnectors.map((connector) => (
                        <span
                          key={connector.key}
                          className={`flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs dark:bg-grid-800 ${STRONG}`}
                        >
                          <PlugZap
                            size={13}
                            className="text-teal-600 dark:text-volt-400"
                          />

                          <span className="font-semibold">
                            {connector.title}
                          </span>

                          {connector.details.length > 0 && (
                            <span className={BODY}>
                              {connector.details.join(" • ")}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedStation.neutral_factors.length > 0 && (
                  <p className={`mt-4 text-xs ${BODY}`}>
                    Data unavailable, scored neutrally:{" "}
                    {selectedStation.neutral_factors.join(", ")}.
                  </p>
                )}
              </div>

              <div
                className={`flex items-center border-t p-6 lg:border-l lg:border-t-0 ${DIVIDER}`}
              >
                <div className="w-full text-center">
                  <p
                    className={`text-xs uppercase tracking-widest ${BODY}`}
                  >
                    AI match
                  </p>

                  <p className="mt-1 font-display text-4xl font-bold text-teal-700 dark:text-volt-400">
                    {selectedStation.ai_score}
                  </p>

                  <p className={`text-xs ${BODY}`}>/ 100</p>

                  {selectedStation.source === "voltgrid" &&
                    selectedStation.id != null && (
                      <Link
                        to={`/booking/${selectedStation.id}`}
                        className={`${BTN_PRIMARY} mt-5 w-full min-w-[190px] ${FOCUS}`}
                      >
                        <PlugZap size={17} />
                        Book this charger
                      </Link>
                    )}

                  {selectedStation.source === "openchargemap" && (
                    <div
                      className={`mt-5 w-full min-w-[190px] rounded-xl border p-4 text-center ${DIVIDER} bg-slate-50 dark:bg-grid-950/60`}
                    >
                      <p className={`text-xs font-medium ${BODY}`}>
                        External station
                      </p>

                      {externalBookingUrl ? (
                        <>
                          <a
                            href={externalBookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${BTN_PRIMARY} mt-3 w-full px-4 ${FOCUS}`}
                          >
                            <PlugZap size={17} />
                            Book at operator
                          </a>

                          <p className={`mt-2 text-[11px] ${MUTED}`}>
                            Complete your reservation on the operator's
                            website.
                          </p>
                        </>
                      ) : externalWebsiteUrl ? (
                        <>
                          <a
                            href={externalWebsiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${BTN_OUTLINE} mt-3 w-full px-4 py-3 ${FOCUS}`}
                          >
                            <Navigation size={17} />
                            Visit operator website
                          </a>

                          <p className={`mt-2 text-[11px] ${MUTED}`}>
                            Check the operator website for booking options.
                            VoltGrid cannot confirm an external reservation.
                          </p>
                        </>
                      ) : externalStationInfoUrl ? (
                        <>
                          <a
                            href={externalStationInfoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${BTN_OUTLINE} mt-3 w-full px-4 py-3 ${FOCUS}`}
                          >
                            <MapPin size={17} />
                            View station information
                          </a>

                          <p className={`mt-2 text-[11px] ${MUTED}`}>
                            No direct operator booking link was provided.
                          </p>
                        </>
                      ) : (
                        <p className={`mt-2 text-[11px] ${MUTED}`}>
                          External booking link unavailable.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* VEHICLE INFORMATION */}

        <section className="grid gap-4 md:grid-cols-3">
          <InfoTile
            icon={BatteryCharging}
            label="Current battery"
            value={battery !== null ? `${Math.round(battery)}%` : "--"}
            tone="bg-teal-50 text-teal-700 dark:bg-volt-500/10 dark:text-volt-400"
          />

          <InfoTile
            icon={Navigation}
            label="Estimated safe range"
            value={safeRangeKm !== null ? `${safeRangeKm} km` : "-- km"}
            tone="bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
          />

          <InfoTile
            icon={PlugZap}
            label="Preferred charger"
            value={defaultVehicle?.charger_type ?? "Any"}
            tone="bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400"
          />
        </section>

        {/* LOCATION HISTORY */}

        {locationHistory.length > 0 && (
          <section className={`${CARD} p-6`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3
                  className={`font-display text-base font-semibold ${HEADING}`}
                >
                  Location tracking
                </h3>

                <p className={`mt-1 text-xs ${BODY}`}>
                  {locationHistory.length} location point(s) stored locally on
                  this device.
                </p>
              </div>

              <button
                type="button"
                onClick={clearLocationHistory}
                className={`${BTN_OUTLINE} px-3 py-2 text-xs hover:border-red-300 hover:text-red-600 dark:hover:border-red-500/40 dark:hover:bg-transparent dark:hover:text-red-400 ${FOCUS}`}
              >
                <Trash2 size={14} />
                Clear
              </button>
            </div>
          </section>
        )}

        {/* FOOTNOTE */}

        <div
          className={`flex items-start gap-3 rounded-xl border p-4 ${DIVIDER} bg-slate-50 dark:bg-grid-900/50`}
        >
          <LocateFixed size={18} className={`mt-0.5 shrink-0 ${MUTED}`} />

          <p className={`text-xs leading-5 ${BODY}`}>
            Location tracking uses your browser's Geolocation API. Your
            location history in this page is stored locally in your browser and
            is not automatically sent to the backend.
          </p>
        </div>
      </div>
    </AppShell>
  );
}