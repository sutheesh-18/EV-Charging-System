import { useEffect, useState, type FormEvent } from "react";
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
  Save,
  Trash2,
  Zap,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { api } from "../../api/client";

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

export default function MyEV() {
  const queryClient = useQueryClient();

  const [form, setForm] =
    useState<VehicleForm>(emptyForm);

  const [batteryDraft, setBatteryDraft] =
    useState(0);

  const [batteryEditing, setBatteryEditing] =
    useState(false);

  const [batterySaved, setBatterySaved] =
    useState(false);

  const [formError, setFormError] =
    useState("");

  /* ============================================================
     GET VEHICLES
  ============================================================ */

  const vehiclesQuery = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],

    queryFn: async () => {
      const response = await api.get(
        "/users/me/vehicles",
      );

      if (Array.isArray(response.data)) {
        return response.data;
      }

      if (
        Array.isArray(
          response.data?.vehicles,
        )
      ) {
        return response.data.vehicles;
      }

      return [];
    },
  });

  const vehicles = vehiclesQuery.data ?? [];

  const vehicle =
    vehicles.find(
      (item) => item.is_default,
    ) ?? vehicles[0];

  /* ============================================================
     SYNC BATTERY
  ============================================================ */

  useEffect(() => {
    if (vehicle) {
      setBatteryDraft(
        Math.round(
          vehicle.remaining_battery_percent,
        ),
      );
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
        manufacturer:
          form.manufacturer.trim(),
        model: form.model.trim(),
        battery_capacity_kwh: Number(
          form.battery_capacity_kwh,
        ),
        remaining_battery_percent: Number(
          form.remaining_battery_percent,
        ),
        charger_type: form.charger_type,
        vehicle_range_km: Number(
          form.vehicle_range_km,
        ),
        charging_speed_kw: Number(
          form.charging_speed_kw,
        ),
        is_default: form.is_default,
      };

      return api.post(
        "/users/me/vehicles",
        payload,
      );
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
      console.error(
        "Vehicle creation error:",
        error,
      );

      const message =
        error?.response?.data?.detail;

      if (Array.isArray(message)) {
        setFormError(
          message
            .map(
              (item: any) =>
                item?.msg ?? "Invalid input",
            )
            .join(", "),
        );
      } else if (
        typeof message === "string"
      ) {
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

  const updateBatteryMutation =
    useMutation({
      mutationFn: async () => {
        if (!vehicle) {
          throw new Error(
            "Vehicle not found",
          );
        }

        return api.put(
          `/users/me/vehicles/${vehicle.id}`,
          {
            remaining_battery_percent:
              batteryDraft,
          },
        );
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
        console.error(
          "Battery update error:",
          error,
        );
      },
    });

  /* ============================================================
     DELETE VEHICLE
  ============================================================ */

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!vehicle) {
        throw new Error(
          "Vehicle not found",
        );
      }

      return api.delete(
        `/users/me/vehicles/${vehicle.id}`,
      );
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
      console.error(
        "Vehicle delete error:",
        error,
      );
    },
  });

  /* ============================================================
     CREATE FORM
  ============================================================ */

  function handleCreate(
    event: FormEvent,
  ) {
    event.preventDefault();

    setFormError("");

    const battery = Number(
      form.remaining_battery_percent,
    );

    const capacity = Number(
      form.battery_capacity_kwh,
    );

    const range = Number(
      form.vehicle_range_km,
    );

    const chargingSpeed = Number(
      form.charging_speed_kw,
    );

    if (
      !form.name.trim() ||
      !form.manufacturer.trim() ||
      !form.model.trim()
    ) {
      setFormError(
        "Please enter vehicle name, manufacturer and model.",
      );
      return;
    }

    if (
      Number.isNaN(capacity) ||
      capacity <= 0
    ) {
      setFormError(
        "Battery capacity must be greater than 0.",
      );
      return;
    }

    if (
      Number.isNaN(battery) ||
      battery < 0 ||
      battery > 100
    ) {
      setFormError(
        "Current battery must be between 0% and 100%.",
      );
      return;
    }

    if (
      Number.isNaN(range) ||
      range <= 0
    ) {
      setFormError(
        "Vehicle range must be greater than 0.",
      );
      return;
    }

    if (
      Number.isNaN(chargingSpeed) ||
      chargingSpeed <= 0
    ) {
      setFormError(
        "Charging speed must be greater than 0.",
      );
      return;
    }

    createMutation.mutate();
  }

  /* ============================================================
     BATTERY CONTROLS
  ============================================================ */

  function startBatteryEditing() {
    if (!vehicle) return;

    setBatteryDraft(
      Math.round(
        vehicle.remaining_battery_percent,
      ),
    );

    setBatteryEditing(true);
    setBatterySaved(false);
  }

  function cancelBatteryEditing() {
    if (!vehicle) return;

    setBatteryDraft(
      Math.round(
        vehicle.remaining_battery_percent,
      ),
    );

    setBatteryEditing(false);
  }

  function changeBattery(
    value: number,
  ) {
    setBatteryDraft(
      Math.min(
        100,
        Math.max(0, value),
      ),
    );
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

    const confirmed =
      window.confirm(
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
        <div className="mx-auto max-w-4xl">
          <div className="card p-8 text-center text-grid-300">
            Loading your EV...
          </div>
        </div>
      </AppShell>
    );
  }

  /* ============================================================
     PAGE
  ============================================================ */

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">

        {/* PAGE HEADER */}

        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-volt-400">
            Vehicle
          </p>

          <h1 className="mt-1 font-display text-2xl font-bold text-grid-50">
            My EV
          </h1>

          <p className="mt-1 text-sm text-grid-300">
            Manage your vehicle details and current battery state.
          </p>
        </div>

        {/* ======================================================
            EXISTING VEHICLE
        ====================================================== */}

        {vehicle ? (
          <div className="card overflow-hidden">

            {/* VEHICLE HEADER */}

            <div className="border-b border-grid-700 p-6">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center gap-4">

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-volt-500/15 text-volt-400">
                    <Car size={28} />
                  </div>

                  <div>

                    <h2 className="font-display text-xl font-bold text-grid-50">
                      {vehicle.name}
                    </h2>

                    <p className="text-sm font-medium text-grid-300">
                      {vehicle.manufacturer}{" "}
                      {vehicle.model}
                    </p>

                  </div>

                </div>

                {vehicle.is_default && (
                  <span className="w-fit rounded-full bg-volt-500/15 px-3 py-1 text-xs font-semibold text-volt-300">
                    Default vehicle
                  </span>
                )}

              </div>

            </div>

            {/* ==================================================
                BATTERY
            ================================================== */}

            <div className="border-b border-grid-700 p-6">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-sm font-medium text-grid-300">
                    Current battery
                  </p>

                  <div className="mt-1 flex items-center gap-2">

                    <span className="font-display text-4xl font-bold text-grid-50">
                      {batteryEditing
                        ? batteryDraft
                        : Math.round(
                            vehicle.remaining_battery_percent,
                          )}
                      %
                    </span>

                    <Battery
                      size={23}
                      className="text-volt-400"
                    />

                  </div>

                </div>

                {!batteryEditing && (
                  <button
                    type="button"
                    onClick={
                      startBatteryEditing
                    }
                    className="rounded-lg border border-grid-600 px-4 py-2 text-sm font-semibold text-grid-200 transition hover:border-volt-500/60 hover:bg-volt-500/10 hover:text-volt-300"
                  >
                    Update battery
                  </button>
                )}

              </div>

              {/* BATTERY EDITOR */}

              {batteryEditing && (
                <div className="mt-6 rounded-2xl border border-volt-500/30 bg-volt-500/10 p-5">

                  <div className="flex items-center justify-between">

                    <span className="text-sm font-semibold text-grid-200">
                      Set current battery level
                    </span>

                    <span className="font-display text-lg font-bold text-volt-300">
                      {batteryDraft}%
                    </span>

                  </div>

                  {/* SLIDER */}

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={batteryDraft}
                    onChange={(event) =>
                      changeBattery(
                        Number(
                          event.target.value,
                        ),
                      )
                    }
                    className="mt-5 h-2 w-full cursor-pointer accent-cyan-400"
                  />

                  <div className="mt-2 flex justify-between text-xs font-medium text-grid-400">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>

                  {/* +/- */}

                  <div className="mt-5 flex items-center justify-center gap-4">

                    <button
                      type="button"
                      onClick={() =>
                        changeBattery(
                          batteryDraft - 5,
                        )
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-grid-600 bg-grid-900 text-grid-200 transition hover:border-volt-500/60 hover:bg-volt-500/10 hover:text-volt-300"
                    >
                      <Minus size={18} />
                    </button>

                    <div className="min-w-[100px] text-center">

                      <span className="font-display text-xl font-bold text-grid-50">
                        {batteryDraft}%
                      </span>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        changeBattery(
                          batteryDraft + 5,
                        )
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-grid-600 bg-grid-900 text-grid-200 transition hover:border-volt-500/60 hover:bg-volt-500/10 hover:text-volt-300"
                    >
                      <Plus size={18} />
                    </button>

                  </div>

                  {/* SAVE / CANCEL */}

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">

                    <button
                      type="button"
                      onClick={saveBattery}
                      disabled={
                        updateBatteryMutation.isPending
                      }
                      className="btn-primary flex-1"
                    >
                      <Save size={17} />

                      {updateBatteryMutation.isPending
                        ? "Saving..."
                        : "Save battery"}
                    </button>

                    <button
                      type="button"
                      onClick={
                        cancelBatteryEditing
                      }
                      disabled={
                        updateBatteryMutation.isPending
                      }
                      className="rounded-lg border border-grid-600 px-5 py-2 text-sm font-semibold text-grid-200 transition hover:bg-grid-800"
                    >
                      Cancel
                    </button>

                  </div>

                  {/* ERROR */}

                  {updateBatteryMutation.isError && (
                    <p className="mt-3 text-sm font-medium text-red-300">
                      Unable to update the battery level. Check the backend connection.
                    </p>
                  )}

                  {/* SUCCESS */}

                  {batterySaved && (
                    <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-volt-300">

                      <CheckCircle2
                        size={17}
                      />

                      Battery level updated successfully.

                    </div>
                  )}

                </div>
              )}

            </div>

            {/* ==================================================
                VEHICLE STATS
            ================================================== */}

            <div className="grid gap-4 p-6 sm:grid-cols-3">

              {/* RANGE */}

              <div className="rounded-xl border border-grid-700 bg-grid-900/60 p-4">

                <div className="flex items-center justify-between">

                  <span className="text-sm font-medium text-grid-300">
                    Estimated range
                  </span>

                  <Gauge
                    size={18}
                    className="text-volt-400"
                  />

                </div>

                <div className="mt-3">

                  <span className="font-display text-3xl font-bold text-grid-50">
                    {vehicle.vehicle_range_km}
                  </span>

                  <span className="ml-1 text-sm font-medium text-grid-400">
                    km
                  </span>

                </div>

              </div>

              {/* CHARGING SPEED */}

              <div className="rounded-xl border border-grid-700 bg-grid-900/60 p-4">

                <div className="flex items-center justify-between">

                  <span className="text-sm font-medium text-grid-300">
                    Charging speed
                  </span>

                  <Zap
                    size={18}
                    className="text-volt-400"
                  />

                </div>

                <div className="mt-3">

                  <span className="font-display text-3xl font-bold text-grid-50">
                    {vehicle.charging_speed_kw}
                  </span>

                  <span className="ml-1 text-sm font-medium text-grid-400">
                    kW
                  </span>

                </div>

              </div>

              {/* BATTERY CAPACITY */}

              <div className="rounded-xl border border-grid-700 bg-grid-900/60 p-4">

                <div className="flex items-center justify-between">

                  <span className="text-sm font-medium text-grid-300">
                    Battery capacity
                  </span>

                  <Battery
                    size={18}
                    className="text-volt-400"
                  />

                </div>

                <div className="mt-3">

                  <span className="font-display text-3xl font-bold text-grid-50">
                    {vehicle.battery_capacity_kwh}
                  </span>

                  <span className="ml-1 text-sm font-medium text-grid-400">
                    kWh
                  </span>

                </div>

              </div>

            </div>

            {/* ==================================================
                VEHICLE DETAILS
            ================================================== */}

            <div className="grid gap-5 border-t border-grid-700 p-6 sm:grid-cols-2">

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-grid-400">
                  Manufacturer
                </p>

                <p className="mt-1 text-sm font-semibold text-grid-100">
                  {vehicle.manufacturer}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-grid-400">
                  Model
                </p>

                <p className="mt-1 text-sm font-semibold text-grid-100">
                  {vehicle.model}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-grid-400">
                  Charger type
                </p>

                <p className="mt-1 text-sm font-semibold text-grid-100">
                  {vehicle.charger_type}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-grid-400">
                  Vehicle range
                </p>

                <p className="mt-1 text-sm font-semibold text-grid-100">
                  {vehicle.vehicle_range_km} km
                </p>
              </div>

            </div>

            {/* DELETE */}

            <div className="flex justify-end border-t border-grid-700 p-4">

              <button
                type="button"
                onClick={deleteVehicle}
                disabled={
                  deleteMutation.isPending
                }
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
              >

                <Trash2 size={16} />

                {deleteMutation.isPending
                  ? "Removing..."
                  : "Remove vehicle"}

              </button>

            </div>

          </div>
        ) : (

          /* ==================================================
             NO VEHICLE / SETUP
          ================================================== */

          <div className="card p-6">

            <div className="mb-6 rounded-xl border border-volt-500/30 bg-volt-500/10 p-4">

              <div className="flex gap-3">

                <AlertCircle
                  size={21}
                  className="mt-0.5 shrink-0 text-volt-300"
                />

                <div>

                  <h3 className="font-semibold text-grid-50">
                    Set up your EV
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-grid-300">
                    Add your vehicle details so VoltGrid can calculate your range and recommend suitable charging stations.
                  </p>

                </div>

              </div>

            </div>

            {/* CREATE FORM */}

            <form
              onSubmit={handleCreate}
              className="grid gap-5 sm:grid-cols-2"
            >

              {/* VEHICLE NAME */}

              <div className="sm:col-span-2">

                <label className="mb-2 block text-sm font-semibold text-grid-100">
                  Vehicle name
                </label>

                <input
                  className="input-field text-grid-50 placeholder:text-grid-300"
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

              </div>

              {/* MANUFACTURER */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-grid-100">
                  Manufacturer
                </label>

                <input
                  className="input-field text-grid-50 placeholder:text-grid-300"
                  placeholder="Tata"
                  value={form.manufacturer}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      manufacturer:
                        event.target.value,
                    })
                  }
                  required
                />

              </div>

              {/* MODEL */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-grid-100">
                  Model
                </label>

                <input
                  className="input-field text-grid-50 placeholder:text-grid-300"
                  placeholder="Punch EV"
                  value={form.model}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      model:
                        event.target.value,
                    })
                  }
                  required
                />

              </div>

              {/* BATTERY CAPACITY */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-grid-100">
                  Battery capacity
                </label>

                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="input-field text-grid-50 placeholder:text-grid-300"
                  placeholder="40.5"
                  value={
                    form.battery_capacity_kwh
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      battery_capacity_kwh:
                        event.target.value,
                    })
                  }
                  required
                />

                <p className="mt-1.5 text-xs font-medium text-grid-400">
                  Battery capacity in kWh
                </p>

              </div>

              {/* CURRENT BATTERY */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-grid-100">
                  Current battery
                </label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  className="input-field text-grid-50 placeholder:text-grid-300"
                  placeholder="68"
                  value={
                    form.remaining_battery_percent
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      remaining_battery_percent:
                        event.target.value,
                    })
                  }
                  required
                />

                <p className="mt-1.5 text-xs font-medium text-grid-400">
                  Current charge level in %
                </p>

              </div>

              {/* RANGE */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-grid-100">
                  Vehicle range
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  className="input-field text-grid-50 placeholder:text-grid-300"
                  placeholder="300"
                  value={
                    form.vehicle_range_km
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      vehicle_range_km:
                        event.target.value,
                    })
                  }
                  required
                />

                <p className="mt-1.5 text-xs font-medium text-grid-400">
                  Estimated range in km
                </p>

              </div>

              {/* CHARGING SPEED */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-grid-100">
                  Charging speed
                </label>

                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  className="input-field text-grid-50 placeholder:text-grid-300"
                  placeholder="60"
                  value={
                    form.charging_speed_kw
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      charging_speed_kw:
                        event.target.value,
                    })
                  }
                  required
                />

                <p className="mt-1.5 text-xs font-medium text-grid-400">
                  Maximum charging speed in kW
                </p>

              </div>

              {/* CHARGER TYPE */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-grid-100">
                  Charger type
                </label>

                <select
                  className="input-field text-grid-50"
                  value={
                    form.charger_type
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      charger_type:
                        event.target
                          .value as ChargerType,
                    })
                  }
                >

                  <option value="CCS">
                    CCS
                  </option>

                  <option value="CHAdeMO">
                    CHAdeMO
                  </option>

                  <option value="AC_Type2">
                    AC Type 2
                  </option>

                </select>

                <p className="mt-1.5 text-xs font-medium text-grid-400">
                  Connector supported by your EV
                </p>

              </div>

              {/* DEFAULT VEHICLE */}

              <div className="flex items-center gap-3 sm:col-span-2">

                <input
                  id="defaultVehicle"
                  type="checkbox"
                  checked={
                    form.is_default
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      is_default:
                        event.target
                          .checked,
                    })
                  }
                  className="h-4 w-4 rounded border-grid-600 bg-grid-900 accent-cyan-500"
                />

                <label
                  htmlFor="defaultVehicle"
                  className="text-sm font-medium text-grid-200"
                >
                  Use this as my default EV
                </label>

              </div>

              {/* ERROR */}

              {formError && (
                <div className="sm:col-span-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
                  {formError}
                </div>
              )}

              {/* SUBMIT */}

              <div className="sm:col-span-2">

                <button
                  type="submit"
                  disabled={
                    createMutation.isPending
                  }
                  className="btn-primary w-full"
                >

                  <Plus size={18} />

                  {createMutation.isPending
                    ? "Saving..."
                    : "Save my EV"}

                </button>

              </div>

            </form>

          </div>
        )}

      </div>
    </AppShell>
  );
}