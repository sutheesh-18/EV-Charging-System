import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  AlertCircle,
  Battery,
  Car,
  CheckCircle2,
  Gauge,
  Minus,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Zap,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import Car3DStage from "../../components/common/Car3DStage";
import VehicleImage from "../../components/common/VehicleImage";
import { api } from "../../api/client";
import {
  matchVehicleAny,
  modelsForMake,
  vehicleMakes,
} from "../../lib/vehicles";

// Loaded on demand so three.js stays out of the main bundle
const EvCar3D = lazy(() => import("../../components/EvCar3D"));

/* ============================================================
   SHARED STYLES (light + dark) - same tokens as Dashboard
============================================================ */

const CARD =
  "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-grid-700/70 dark:bg-grid-850/90 dark:shadow-card";
const PANEL =
  "rounded-xl border border-slate-200 bg-slate-50 dark:border-grid-700/60 dark:bg-grid-900/60";
const DIVIDER = "border-slate-200 dark:border-grid-700";
const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-grid-400";
const HEADING = "text-slate-900 dark:text-grid-50";
const STRONG = "text-slate-800 dark:text-grid-100";
const BODY = "text-slate-600 dark:text-grid-300";
const MUTED = "text-slate-500 dark:text-grid-400";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-volt-400 dark:focus-visible:ring-offset-grid-950";

const INPUT =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-grid-700 dark:bg-grid-900 dark:text-grid-50 dark:placeholder:text-grid-500 dark:focus:border-volt-400 dark:focus:ring-volt-400/20";

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-volt-500 dark:text-grid-950 dark:hover:bg-volt-400";
const BTN_OUTLINE =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-grid-600 dark:bg-transparent dark:text-grid-200 dark:hover:border-volt-500/60 dark:hover:bg-volt-500/10 dark:hover:text-volt-300";

/* ============================================================
   TYPES
============================================================ */

type ChargerType = "CCS" | "CHAdeMO" | "AC_Type2";

type Vehicle = {
  id: number;
  owner_id: number;
  name: string;
  manufacturer: string;
  model: string;
  battery_capacity_kwh: number;
  remaining_battery_percent: number;
  charger_type: ChargerType;
  vehicle_range_km: number;
  charging_speed_kw: number;
  is_default: boolean;
  created_at?: string;
};

type VehicleForm = {
  name: string;
  manufacturer: string;
  model: string;
  battery_capacity_kwh: string;
  remaining_battery_percent: string;
  charger_type: ChargerType;
  vehicle_range_km: string;
  charging_speed_kw: string;
  is_default: boolean;
};

const emptyForm: VehicleForm = {
  name: "",
  manufacturer: "",
  model: "",
  battery_capacity_kwh: "",
  remaining_battery_percent: "",
  charger_type: "CCS",
  vehicle_range_km: "",
  charging_speed_kw: "",
  is_default: true,
};

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

function batteryBar(percent: number) {
  if (percent < 20) return "bg-red-500";
  if (percent < 50) return "bg-amber-500";
  return "bg-teal-500";
}

function Stat({
  label,
  value,
  unit,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  unit: string;
  icon: typeof Gauge;
}) {
  return (
    <div className={`${PANEL} p-4`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${BODY}`}>{label}</span>

        <Icon size={18} className="text-teal-700 dark:text-volt-400" />
      </div>

      <div className="mt-3">
        <span className={`font-display text-3xl font-bold ${HEADING}`}>
          {value}
        </span>

        <span className={`ml-1 text-sm font-medium ${MUTED}`}>{unit}</span>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={EYEBROW}>{label}</p>

      <p className={`mt-1 text-sm font-semibold ${STRONG}`}>{value}</p>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  className = "",
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={`mb-2 block text-sm font-semibold ${STRONG}`}
      >
        {label}
      </label>

      {children}

      {hint && <p className={`mt-1.5 text-xs font-medium ${MUTED}`}>{hint}</p>}
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wider text-teal-700 dark:text-volt-400">
        Vehicle
      </p>

      <h1
        className={`mt-1 font-display text-2xl font-bold tracking-tight ${HEADING}`}
      >
        My EV
      </h1>

      <p className={`mt-1 text-sm ${BODY}`}>
        Manage your vehicle details and current battery state.
      </p>
    </div>
  );
}

/* ============================================================
   PAGE
============================================================ */

export default function MyEV() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<VehicleForm>(emptyForm);

  const [batteryDraft, setBatteryDraft] = useState(0);

  const [batteryEditing, setBatteryEditing] = useState(false);

  const [batterySaved, setBatterySaved] = useState(false);

  const [formError, setFormError] = useState("");

  // "photo" = picture of the real model, "3d" = the interactive 3D car
  const [viewMode, setViewMode] = useState<"photo" | "3d">("photo");

  // null = not known yet, true = a photo is on screen, false = no photo
  const [photoFound, setPhotoFound] = useState<boolean | null>(null);

  /* ============================================================
     GET VEHICLES
  ============================================================ */

  const vehiclesQuery = useQuery<Vehicle[]>({
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

  const vehicles = vehiclesQuery.data ?? [];

  const vehicle = vehicles.find((item) => item.is_default) ?? vehicles[0];

  /* ============================================================
     WHICH CAR IS THIS? (manufacturer + model first, then nickname)
  ============================================================ */

  const carNames = useMemo(
    () =>
      vehicle
        ? [`${vehicle.manufacturer} ${vehicle.model}`, vehicle.name]
        : [],
    [vehicle],
  );

  const carMatch = useMemo(() => matchVehicleAny(carNames), [carNames]);

  // new car -> forget whether its photo was found
  useEffect(() => {
    setPhotoFound(null);
    setViewMode("photo");
  }, [carMatch?.vehicle.id]);

  // live preview while the setup form is being filled in
  const formNames = useMemo(
    () => [`${form.manufacturer} ${form.model}`.trim(), form.name],
    [form.manufacturer, form.model, form.name],
  );

  const formMatch = useMemo(() => matchVehicleAny(formNames), [formNames]);

  const formTyped = formNames.some((text) => text.trim().length > 0);

  const makeSuggestions = useMemo(() => vehicleMakes(), []);

  const modelSuggestions = useMemo(
    () => modelsForMake(form.manufacturer),
    [form.manufacturer],
  );

  /* ============================================================
     SYNC BATTERY
  ============================================================ */

  useEffect(() => {
    if (vehicle) {
      setBatteryDraft(Math.round(vehicle.remaining_battery_percent));
    }
  }, [vehicle]);

  /* ============================================================
     CREATE VEHICLE
  ============================================================ */

  const createMutation = useMutation({
    mutationFn: async () => {
      setFormError("");

      const payload = {
        name: form.name.trim(),
        manufacturer: form.manufacturer.trim(),
        model: form.model.trim(),
        battery_capacity_kwh: Number(form.battery_capacity_kwh),
        remaining_battery_percent: Number(form.remaining_battery_percent),
        charger_type: form.charger_type,
        vehicle_range_km: Number(form.vehicle_range_km),
        charging_speed_kw: Number(form.charging_speed_kw),
        is_default: form.is_default,
      };

      return api.post("/users/me/vehicles", payload);
    },

    onSuccess: () => {
      setForm(emptyForm);
      setFormError("");

      queryClient.invalidateQueries({
        queryKey: ["vehicles"],
      });

      queryClient.invalidateQueries({
        queryKey: ["dashboard-overview"],
      });
    },

    onError: (error: any) => {
      console.error("Vehicle creation error:", error);

      const message = error?.response?.data?.detail;

      if (Array.isArray(message)) {
        setFormError(
          message.map((item: any) => item?.msg ?? "Invalid input").join(", "),
        );
      } else if (typeof message === "string") {
        setFormError(message);
      } else {
        setFormError(
          "Unable to save your vehicle. Please check the backend connection.",
        );
      }
    },
  });

  /* ============================================================
     UPDATE BATTERY
  ============================================================ */

  const updateBatteryMutation = useMutation({
    mutationFn: async () => {
      if (!vehicle) {
        throw new Error("Vehicle not found");
      }

      return api.put(`/users/me/vehicles/${vehicle.id}`, {
        remaining_battery_percent: batteryDraft,
      });
    },

    onSuccess: () => {
      setBatteryEditing(false);
      setBatterySaved(true);

      queryClient.invalidateQueries({
        queryKey: ["vehicles"],
      });

      queryClient.invalidateQueries({
        queryKey: ["dashboard-overview"],
      });

      setTimeout(() => {
        setBatterySaved(false);
      }, 2500);
    },

    onError: (error) => {
      console.error("Battery update error:", error);
    },
  });

  /* ============================================================
     DELETE VEHICLE
  ============================================================ */

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!vehicle) {
        throw new Error("Vehicle not found");
      }

      return api.delete(`/users/me/vehicles/${vehicle.id}`);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["vehicles"],
      });

      queryClient.invalidateQueries({
        queryKey: ["dashboard-overview"],
      });
    },

    onError: (error) => {
      console.error("Vehicle delete error:", error);
    },
  });

  /* ============================================================
     CREATE FORM
  ============================================================ */

  function handleCreate(event: FormEvent) {
    event.preventDefault();

    setFormError("");

    const battery = Number(form.remaining_battery_percent);

    const capacity = Number(form.battery_capacity_kwh);

    const range = Number(form.vehicle_range_km);

    const chargingSpeed = Number(form.charging_speed_kw);

    if (!form.name.trim() || !form.manufacturer.trim() || !form.model.trim()) {
      setFormError("Please enter vehicle name, manufacturer and model.");
      return;
    }

    if (Number.isNaN(capacity) || capacity <= 0) {
      setFormError("Battery capacity must be greater than 0.");
      return;
    }

    if (Number.isNaN(battery) || battery < 0 || battery > 100) {
      setFormError("Current battery must be between 0% and 100%.");
      return;
    }

    if (Number.isNaN(range) || range <= 0) {
      setFormError("Vehicle range must be greater than 0.");
      return;
    }

    if (Number.isNaN(chargingSpeed) || chargingSpeed <= 0) {
      setFormError("Charging speed must be greater than 0.");
      return;
    }

    createMutation.mutate();
  }

  /* ============================================================
     BATTERY CONTROLS
  ============================================================ */

  function startBatteryEditing() {
    if (!vehicle) return;

    setBatteryDraft(Math.round(vehicle.remaining_battery_percent));

    setBatteryEditing(true);
    setBatterySaved(false);
  }

  function cancelBatteryEditing() {
    if (!vehicle) return;

    setBatteryDraft(Math.round(vehicle.remaining_battery_percent));

    setBatteryEditing(false);
  }

  function changeBattery(value: number) {
    setBatteryDraft(Math.min(100, Math.max(0, value)));
  }

  function saveBattery() {
    if (!vehicle) return;

    updateBatteryMutation.mutate();
  }

  /* ============================================================
     DELETE
  ============================================================ */

  function deleteVehicle() {
    if (!vehicle) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove this vehicle?",
    );

    if (!confirmed) return;

    deleteMutation.mutate();
  }

  /* ============================================================
     LOADING
  ============================================================ */

  if (vehiclesQuery.isLoading) {
    return (
      <AppShell>
        <div
          className="mx-auto max-w-4xl space-y-6"
          role="status"
          aria-label="Loading your EV"
        >
          <PageHeader />

          <div className={`${CARD} overflow-hidden`} aria-hidden="true">
            <div className={`flex items-center gap-4 border-b p-6 ${DIVIDER}`}>
              <Skeleton className="h-14 w-14 rounded-2xl" />

              <div className="space-y-2">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>

            <div className={`border-b p-6 ${DIVIDER}`}>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-3 h-10 w-24" />
              <Skeleton className="mt-4 h-3 w-full rounded-full" />
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </div>

          <span className="sr-only">Loading your EV...</span>
        </div>
      </AppShell>
    );
  }

  /* ============================================================
     ERROR
     (previously a failed request fell through to the setup form,
     which could lead to creating a duplicate vehicle)
  ============================================================ */

  if (vehiclesQuery.isError) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl space-y-6">
          <PageHeader />

          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-500/30 dark:bg-red-500/10"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300">
                <AlertCircle size={21} />
              </div>

              <div className="flex-1">
                <h2 className="font-display font-semibold text-red-900 dark:text-red-200">
                  Unable to load your EV
                </h2>

                <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-300/80">
                  We couldn't retrieve your vehicle details. Make sure the
                  backend is running and that you are signed in.
                </p>

                <button
                  type="button"
                  onClick={() => vehiclesQuery.refetch()}
                  disabled={vehiclesQuery.isFetching}
                  className={`mt-4 inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-500/40 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-500/10 ${FOCUS}`}
                >
                  <RefreshCw
                    size={15}
                    className={
                      vehiclesQuery.isFetching
                        ? "animate-spin motion-reduce:animate-none"
                        : ""
                    }
                  />
                  {vehiclesQuery.isFetching ? "Retrying" : "Try again"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const shownBattery = vehicle
    ? batteryEditing
      ? batteryDraft
      : Math.round(vehicle.remaining_battery_percent)
    : 0;

  const shownRange = vehicle ? (vehicle.vehicle_range_km * shownBattery) / 100 : 0;

  /* the interactive 3D car (also the fallback for cars without a photo) */
  const car3D = (
    <Suspense fallback={<Skeleton className="h-[330px] w-full rounded-xl" />}>
      <EvCar3D
    embedded
    carName="Tata Punch EV"
    batteryPercent={shownBattery}
    rangeKm={shownRange}
  />
    </Suspense>
  );

  const showPhoto = Boolean(carMatch) && viewMode === "photo";

  /* ============================================================
     PAGE
  ============================================================ */

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* PAGE HEADER */}

        <PageHeader />

        {/* ======================================================
            EXISTING VEHICLE
        ====================================================== */}

        {vehicle ? (
          <div className={`${CARD} overflow-hidden`}>
            {/* VEHICLE HEADER */}

            <div className={`border-b p-6 ${DIVIDER}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-volt-500/15 dark:text-volt-400">
                    <Car size={28} />
                  </div>

                  <div>
                    <h2
                      className={`font-display text-xl font-bold ${HEADING}`}
                    >
                      {vehicle.name}
                    </h2>

                    <p className={`text-sm font-medium ${BODY}`}>
                      {vehicle.manufacturer} {vehicle.model}
                    </p>
                  </div>
                </div>

                {vehicle.is_default && (
                  <span className="w-fit rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 dark:bg-volt-500/15 dark:text-volt-300">
                    Default vehicle
                  </span>
                )}
              </div>
            </div>

            {/* ==================================================
                YOUR CAR: photo of the real model, or the 3D car
            ================================================== */}

            <div className={`border-b p-6 ${DIVIDER}`}>
              {carMatch && photoFound === true && (
                <div
                  role="group"
                  aria-label="Vehicle view"
                  className="mb-4 flex justify-end"
                >
                  <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-grid-700 dark:bg-grid-900/60">
                    {(
                      [
                        ["photo", "Photo"],
                        ["3d", "3D model"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={viewMode === value}
                        onClick={() => setViewMode(value)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${FOCUS} ${
                          viewMode === value
                            ? "bg-teal-700 text-white dark:bg-volt-500 dark:text-grid-950"
                            : "text-slate-500 hover:text-slate-900 dark:text-grid-300 dark:hover:text-grid-50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showPhoto ? (
                <div className="relative flex min-h-[330px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-slate-50 to-slate-100 p-6 dark:from-grid-900 dark:to-grid-950">
                  <Car3DStage active={photoFound === true} className="w-full">
                    <VehicleImage
                      names={carNames}
                      size="lg"
                      fallback={car3D}
                      shadow={false}
                      onResolve={setPhotoFound}
                      className="w-full"
                    />
                  </Car3DStage>

                  {photoFound === true && (
                    <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur dark:bg-grid-900/90 dark:text-grid-100">
                        <Battery
                          size={13}
                          className="text-teal-700 dark:text-volt-400"
                        />
                        {shownBattery}%
                      </span>

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur dark:bg-grid-900/90 dark:text-grid-100">
                        <Gauge
                          size={13}
                          className="text-teal-700 dark:text-volt-400"
                        />
                        ~{Math.round(shownRange)} km range
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                car3D
              )}
            </div>

            {/* ==================================================
                BATTERY
            ================================================== */}

            <div className={`border-b p-6 ${DIVIDER}`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className={`text-sm font-medium ${BODY}`}>
                    Current battery
                  </p>

                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`font-display text-4xl font-bold ${HEADING}`}
                    >
                      {shownBattery}%
                    </span>

                    <Battery
                      size={23}
                      className="text-teal-700 dark:text-volt-400"
                    />
                  </div>
                </div>

                {!batteryEditing && (
                  <button
                    type="button"
                    onClick={startBatteryEditing}
                    className={`${BTN_OUTLINE} ${FOCUS}`}
                  >
                    Update battery
                  </button>
                )}
              </div>

              <div
                className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-grid-700"
                role="progressbar"
                aria-label="Current battery"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={shownBattery}
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${batteryBar(
                    shownBattery,
                  )}`}
                  style={{ width: `${shownBattery}%` }}
                />
              </div>

              {batterySaved && !batteryEditing && (
                <div
                  role="status"
                  className="mt-3 flex items-center gap-2 text-sm font-semibold text-teal-700 dark:text-volt-300"
                >
                  <CheckCircle2 size={17} />
                  Battery level updated successfully.
                </div>
              )}

              {/* BATTERY EDITOR */}

              {batteryEditing && (
                <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50/70 p-5 dark:border-volt-500/30 dark:bg-volt-500/10">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="battery-range"
                      className={`text-sm font-semibold ${STRONG}`}
                    >
                      Set current battery level
                    </label>

                    <span className="font-display text-lg font-bold text-teal-700 dark:text-volt-300">
                      {batteryDraft}%
                    </span>
                  </div>

                  {/* SLIDER */}

                  <input
                    id="battery-range"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={batteryDraft}
                    onChange={(event) =>
                      changeBattery(Number(event.target.value))
                    }
                    className="mt-5 h-2 w-full cursor-pointer accent-teal-700 dark:accent-volt-500"
                  />

                  <div
                    className={`mt-2 flex justify-between text-xs font-medium ${MUTED}`}
                  >
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>

                  {/* +/- */}

                  <div className="mt-5 flex items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => changeBattery(batteryDraft - 5)}
                      aria-label="Decrease battery by 5 percent"
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-teal-300 hover:text-teal-700 dark:border-grid-600 dark:bg-grid-900 dark:text-grid-200 dark:hover:border-volt-500/60 dark:hover:bg-volt-500/10 dark:hover:text-volt-300 ${FOCUS}`}
                    >
                      <Minus size={18} />
                    </button>

                    <div className="min-w-[100px] text-center">
                      <span
                        className={`font-display text-xl font-bold ${HEADING}`}
                      >
                        {batteryDraft}%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => changeBattery(batteryDraft + 5)}
                      aria-label="Increase battery by 5 percent"
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-teal-300 hover:text-teal-700 dark:border-grid-600 dark:bg-grid-900 dark:text-grid-200 dark:hover:border-volt-500/60 dark:hover:bg-volt-500/10 dark:hover:text-volt-300 ${FOCUS}`}
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {/* SAVE / CANCEL */}

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={saveBattery}
                      disabled={updateBatteryMutation.isPending}
                      className={`${BTN_PRIMARY} flex-1 ${FOCUS}`}
                    >
                      <Save size={17} />

                      {updateBatteryMutation.isPending
                        ? "Saving..."
                        : "Save battery"}
                    </button>

                    <button
                      type="button"
                      onClick={cancelBatteryEditing}
                      disabled={updateBatteryMutation.isPending}
                      className={`${BTN_OUTLINE} ${FOCUS}`}
                    >
                      Cancel
                    </button>
                  </div>

                  {/* ERROR */}

                  {updateBatteryMutation.isError && (
                    <p
                      role="alert"
                      className="mt-3 text-sm font-medium text-red-700 dark:text-red-300"
                    >
                      Unable to update the battery level. Check the backend
                      connection.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ==================================================
                VEHICLE STATS
            ================================================== */}

            <div className="grid gap-4 p-6 sm:grid-cols-3">
              <Stat
                label="Estimated range"
                value={vehicle.vehicle_range_km}
                unit="km"
                icon={Gauge}
              />

              <Stat
                label="Charging speed"
                value={vehicle.charging_speed_kw}
                unit="kW"
                icon={Zap}
              />

              <Stat
                label="Battery capacity"
                value={vehicle.battery_capacity_kwh}
                unit="kWh"
                icon={Battery}
              />
            </div>

            {/* ==================================================
                VEHICLE DETAILS
            ================================================== */}

            <div className={`grid gap-5 border-t p-6 sm:grid-cols-2 ${DIVIDER}`}>
              <Detail label="Manufacturer" value={vehicle.manufacturer} />

              <Detail label="Model" value={vehicle.model} />

              <Detail label="Charger type" value={vehicle.charger_type} />

              <Detail
                label="Vehicle range"
                value={`${vehicle.vehicle_range_km} km`}
              />
            </div>

            {/* DELETE */}

            <div
              className={`flex flex-col items-end gap-2 border-t p-4 ${DIVIDER}`}
            >
              {deleteMutation.isError && (
                <p
                  role="alert"
                  className="text-sm font-medium text-red-700 dark:text-red-300"
                >
                  We couldn't remove this vehicle. Please try again.
                </p>
              )}

              <button
                type="button"
                onClick={deleteVehicle}
                disabled={deleteMutation.isPending}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-500/10 dark:hover:text-red-200 ${FOCUS}`}
              >
                <Trash2 size={16} />

                {deleteMutation.isPending ? "Removing..." : "Remove vehicle"}
              </button>
            </div>
          </div>
        ) : (
          /* ==================================================
             NO VEHICLE / SETUP
          ================================================== */

          <div className={`${CARD} p-6`}>
            <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50/70 p-4 dark:border-volt-500/30 dark:bg-volt-500/10">
              <div className="flex gap-3">
                <AlertCircle
                  size={21}
                  className="mt-0.5 shrink-0 text-teal-700 dark:text-volt-300"
                />

                <div>
                  <h2 className={`font-semibold ${HEADING}`}>
                    Set up your EV
                  </h2>

                  <p className={`mt-1 text-sm leading-6 ${BODY}`}>
                    Add your vehicle details so VoltGrid can calculate your
                    range and recommend suitable charging stations.
                  </p>
                </div>
              </div>
            </div>

            {/* CREATE FORM */}

            <form
              onSubmit={handleCreate}
              className="grid gap-5 sm:grid-cols-2"
            >
              {/* ==============================================
                  LIVE PREVIEW OF THE CAR YOU TYPE
              ============================================== */}

              <div className="sm:col-span-2" aria-live="polite">
                <div
                  className={`${PANEL} flex min-h-[200px] flex-col items-center justify-center p-4 text-center`}
                >
                  {formTyped ? (
                    <>
                      <VehicleImage
                        names={formNames}
                        size="md"
                        className="w-full"
                      />

                      <p className={`mt-2 text-xs ${MUTED}`}>
                        {formMatch
                          ? "This is the car we'll show on your dashboard."
                          : "We don't have a photo for this model yet. A generic car will be shown."}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm dark:bg-grid-800 dark:text-volt-300">
                        <Car size={22} />
                      </div>

                      <p className={`mt-3 text-sm font-semibold ${STRONG}`}>
                        Your car appears here
                      </p>

                      <p className={`mt-1 text-xs ${MUTED}`}>
                        Type your manufacturer and model, for example Tata
                        Nexon EV or BYD Atto 3.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* VEHICLE NAME */}

              <Field id="ev-name" label="Vehicle name" className="sm:col-span-2">
                <input
                  id="ev-name"
                  className={INPUT}
                  placeholder="My EV"
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                    })
                  }
                  required
                />
              </Field>

              {/* MANUFACTURER */}

              <Field id="ev-manufacturer" label="Manufacturer">
                <input
                  id="ev-manufacturer"
                  className={INPUT}
                  placeholder="Tata"
                  list="ev-makes"
                  autoComplete="off"
                  value={form.manufacturer}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      manufacturer: event.target.value,
                    })
                  }
                  required
                />

                <datalist id="ev-makes">
                  {makeSuggestions.map((make) => (
                    <option key={make} value={make} />
                  ))}
                </datalist>
              </Field>

              {/* MODEL */}

              <Field id="ev-model" label="Model">
                <input
                  id="ev-model"
                  className={INPUT}
                  placeholder="Punch EV"
                  list="ev-models"
                  autoComplete="off"
                  value={form.model}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      model: event.target.value,
                    })
                  }
                  required
                />

                <datalist id="ev-models">
                  {modelSuggestions.map((model) => (
                    <option key={model} value={model} />
                  ))}
                </datalist>
              </Field>

              {/* BATTERY CAPACITY */}

              <Field
                id="ev-capacity"
                label="Battery capacity"
                hint="Battery capacity in kWh"
              >
                <input
                  id="ev-capacity"
                  type="number"
                  step="0.1"
                  min="0.1"
                  className={INPUT}
                  placeholder="40.5"
                  value={form.battery_capacity_kwh}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      battery_capacity_kwh: event.target.value,
                    })
                  }
                  required
                />
              </Field>

              {/* CURRENT BATTERY */}

              <Field
                id="ev-battery"
                label="Current battery"
                hint="Current charge level in %"
              >
                <input
                  id="ev-battery"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  className={INPUT}
                  placeholder="68"
                  value={form.remaining_battery_percent}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      remaining_battery_percent: event.target.value,
                    })
                  }
                  required
                />
              </Field>

              {/* RANGE */}

              <Field
                id="ev-range"
                label="Vehicle range"
                hint="Estimated range in km"
              >
                <input
                  id="ev-range"
                  type="number"
                  min="1"
                  step="1"
                  className={INPUT}
                  placeholder="300"
                  value={form.vehicle_range_km}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      vehicle_range_km: event.target.value,
                    })
                  }
                  required
                />
              </Field>

              {/* CHARGING SPEED */}

              <Field
                id="ev-speed"
                label="Charging speed"
                hint="Maximum charging speed in kW"
              >
                <input
                  id="ev-speed"
                  type="number"
                  min="0.1"
                  step="0.1"
                  className={INPUT}
                  placeholder="60"
                  value={form.charging_speed_kw}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      charging_speed_kw: event.target.value,
                    })
                  }
                  required
                />
              </Field>

              {/* CHARGER TYPE */}

              <Field
                id="ev-charger"
                label="Charger type"
                hint="Connector supported by your EV"
              >
                <select
                  id="ev-charger"
                  className={INPUT}
                  value={form.charger_type}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      charger_type: event.target.value as ChargerType,
                    })
                  }
                >
                  <option value="CCS">CCS</option>

                  <option value="CHAdeMO">CHAdeMO</option>

                  <option value="AC_Type2">AC Type 2</option>
                </select>
              </Field>

              {/* DEFAULT VEHICLE */}

              <div className="flex items-center gap-3 sm:col-span-2">
                <input
                  id="defaultVehicle"
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      is_default: event.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 accent-teal-700 dark:border-grid-600 dark:accent-volt-500"
                />

                <label
                  htmlFor="defaultVehicle"
                  className={`text-sm font-medium ${STRONG}`}
                >
                  Use this as my default EV
                </label>
              </div>

              {/* ERROR */}

              {formError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 sm:col-span-2"
                >
                  {formError}
                </div>
              )}

              {/* SUBMIT */}

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className={`${BTN_PRIMARY} w-full ${FOCUS}`}
                >
                  <Plus size={18} />

                  {createMutation.isPending ? "Saving..." : "Save my EV"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}