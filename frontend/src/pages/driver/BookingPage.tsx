import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Activity,
  ArrowRight,
  BatteryCharging,
  Check,
  CheckCircle2,
  Clock3,
  IndianRupee,
  MapPin,
  PlugZap,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { api } from "../../api/client";
import type { Station, Vehicle } from "../../types";

interface Charger {
  id: number;
  charger_code?: string;
  charger_type?: string;
  power_kw?: number;
  status?: string;
  connector_type?: string;
}

interface QueueInfo {
  total_chargers: number;
  available_chargers: number;
  occupied_chargers: number;
  faulty_chargers: number;
  active_sessions: number;
  upcoming_bookings: number;
  current_queue: number;
}

interface BookingResponse {
  id: number;
  status: string;
  qr_code?: string;
  slot_start?: string;
  slot_end?: string;
  predicted_wait_minutes?: number;
}

export default function BookingPage() {
  const { id: stationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedCharger, setSelectedCharger] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [confirmedBooking, setConfirmedBooking] =
    useState<BookingResponse | null>(null);

  const {
    data: station,
    isLoading: stationLoading,
    isError: stationError,
  } = useQuery<Station>({
    queryKey: ["station", stationId],
    queryFn: async () => {
      const response = await api.get(`/stations/${stationId}`);
      return response.data;
    },
    enabled: Boolean(stationId),
  });

  const {
    data: queue,
    isLoading: queueLoading,
    isError: queueError,
  } = useQuery<QueueInfo>({
    queryKey: ["station-queue", stationId],
    queryFn: async () => {
      const response = await api.get(`/stations/${stationId}/queue`);
      return response.data;
    },
    enabled: Boolean(stationId),
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const { data: vehicles = [], isLoading: vehiclesLoading } =
    useQuery<Vehicle[]>({
      queryKey: ["vehicles"],
      queryFn: async () => {
        const response = await api.get("/vehicles/me");
        return response.data;
      },
    });

  const chargers: Charger[] =
    (station as (Station & { chargers?: Charger[] }) | undefined)?.chargers ??
    [];

  const availableChargers = chargers.filter(
    (charger) => charger.status === "available",
  );

  /*
   * AI RECOMMENDED CHARGER
   *
   * For the current MVP, the best available charger is selected
   * primarily by charging power.
   *
   * Higher kW = faster charging.
   *
   * This does NOT remove manual charger selection.
   * The user can still select another available charger.
   */
  const recommendedCharger =
    availableChargers.length > 0
      ? [...availableChargers].sort(
          (a, b) =>
            (b.power_kw ?? 0) - (a.power_kw ?? 0) ||
            a.id - b.id,
        )[0]
      : null;

  /*
   * Automatically select the recommended charger when:
   * - no charger is selected yet
   * - selected charger became unavailable
   *
   * If the user manually selects another available charger,
   * their selection is preserved.
   */
  useEffect(() => {
    if (availableChargers.length === 0) {
      if (selectedCharger !== null) {
        setSelectedCharger(null);
      }
      return;
    }

    const selectedStillAvailable = availableChargers.some(
      (charger) => charger.id === selectedCharger,
    );

    if (selectedStillAvailable) {
      return;
    }

    if (recommendedCharger) {
      setSelectedCharger(recommendedCharger.id);
    }
  }, [
    availableChargers,
    recommendedCharger,
    selectedCharger,
  ]);

  const defaultVehicle =
    vehicles.find((vehicle) => vehicle.is_default) ?? vehicles[0];

  const selectedChargerData = chargers.find(
    (charger) => charger.id === selectedCharger,
  );

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!station) {
        throw new Error("Station information is unavailable.");
      }

      if (!selectedCharger) {
        throw new Error("Please select a charger.");
      }

      if (!defaultVehicle?.id) {
        throw new Error("Please configure a vehicle first.");
      }

      if (!selectedTime) {
        throw new Error("Please select an arrival time.");
      }

      const startDate = new Date(selectedTime);

      if (Number.isNaN(startDate.getTime())) {
        throw new Error("Invalid booking time.");
      }

      if (startDate.getTime() <= Date.now()) {
        throw new Error("Please choose a future arrival time.");
      }

      const endDate = new Date(
        startDate.getTime() + 30 * 60 * 1000,
      );

      const response = await api.post("/bookings", {
        station_id: station.id,
        charger_id: selectedCharger,
        vehicle_id: defaultVehicle.id,
        slot_start: startDate.toISOString(),
        slot_end: endDate.toISOString(),
        estimated_arrival: startDate.toISOString(),
      });

      return response.data as BookingResponse;
    },

    onSuccess: (booking) => {
      setConfirmedBooking(booking);

      queryClient.invalidateQueries({
        queryKey: ["station-queue", stationId],
      });

      queryClient.invalidateQueries({
        queryKey: ["bookings"],
      });
    },
  });

  const predictedWaitMinutes = queue
    ? Math.max(0, queue.current_queue * 5)
    : null;

  const canBook =
    Boolean(station) &&
    Boolean(defaultVehicle?.id) &&
    Boolean(selectedCharger) &&
    Boolean(selectedTime) &&
    !bookingMutation.isPending;

  /*
   * LOADING
   */
  if (stationLoading || vehiclesLoading) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-grid-700 border-t-volt-300" />

            <p className="mt-4 text-sm text-grid-500">
              Loading charging station...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  /*
   * STATION ERROR
   */
  if (stationError || !station) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl py-20 text-center">
          <MapPin size={40} className="mx-auto text-red-400" />

          <h1 className="mt-4 font-display text-2xl font-bold text-grid-50">
            Charging station unavailable
          </h1>

          <p className="mt-2 text-sm text-grid-500">
            We could not load the selected charging station.
          </p>

          <button
            type="button"
            onClick={() => navigate("/map")}
            className="btn-primary mt-6 inline-flex"
          >
            Back to map
            <ArrowRight size={16} />
          </button>
        </div>
      </AppShell>
    );
  }

  /*
   * NO VEHICLE
   */
  if (!defaultVehicle) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl py-20 text-center">
          <BatteryCharging
            size={40}
            className="mx-auto text-volt-300"
          />

          <h1 className="mt-4 font-display text-2xl font-bold text-grid-50">
            Add your EV before booking
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-grid-500">
            VoltGrid needs your vehicle details to select the correct
            charging option.
          </p>

          <Link
            to="/profile"
            className="btn-primary mt-6 inline-flex"
          >
            Configure vehicle
            <ArrowRight size={16} />
          </Link>
        </div>
      </AppShell>
    );
  }

  /*
   * BOOKING CONFIRMED
   */
  if (confirmedBooking) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
          <div className="card w-full p-8 text-center sm:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-volt-400/10 text-volt-300">
              <CheckCircle2 size={42} />
            </div>

            <p className="label-eyebrow mt-6">
              Booking confirmed
            </p>

            <h1 className="mt-2 font-display text-3xl font-bold text-grid-50">
              You're all set.
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-grid-500">
              Your charging slot has been reserved. Arrive close to
              your selected time to avoid losing the reservation.
            </p>

            <div className="mt-8 rounded-2xl border border-grid-800 bg-grid-950/50 p-5 text-left">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-grid-500">
                  Station
                </span>

                <span className="text-right font-medium text-grid-100">
                  {station.name}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <span className="text-sm text-grid-500">
                  Charger
                </span>

                <span className="font-medium text-grid-100">
                  {selectedChargerData?.charger_code ??
                    "Selected charger"}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <span className="text-sm text-grid-500">
                  Arrival
                </span>

                <span className="text-right font-medium text-grid-100">
                  {confirmedBooking.slot_start
                    ? new Date(
                        confirmedBooking.slot_start,
                      ).toLocaleString()
                    : selectedTime
                      ? new Date(
                          selectedTime,
                        ).toLocaleString()
                      : "Selected time"}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <span className="text-sm text-grid-500">
                  Status
                </span>

                <span className="font-medium capitalize text-emerald-400">
                  {confirmedBooking.status}
                </span>
              </div>
            </div>

            {confirmedBooking.qr_code && (
              <div className="mt-6">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-grid-500">
                  Charging pass
                </p>

                <img
                  src={confirmedBooking.qr_code}
                  alt="Booking QR code"
                  className="mx-auto h-40 w-40 rounded-xl bg-white p-2"
                />
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/bookings"
                className="btn-primary flex-1"
              >
                View my bookings
                <ArrowRight size={16} />
              </Link>

              <Link
                to="/map"
                className="btn-secondary flex-1"
              >
                Back to map
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const minDateTime = new Date(
    Date.now() + 5 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 16);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        {/* BACK */}
        <div className="mb-6">
          <Link
            to={`/stations/${station.id}`}
            className="inline-flex items-center gap-2 text-sm text-grid-500 transition hover:text-volt-300"
          >
            <ArrowLeft size={16} />
            Back to station
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.7fr]">
          <div className="space-y-6">
            {/* PAGE HEADER */}
            <div>
              <p className="label-eyebrow">
                Reserve charging
              </p>

              <h1 className="mt-2 font-display text-3xl font-bold text-grid-50">
                Book your charging slot
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-grid-500">
                Pick the charger and arrival time that work best for
                your journey. VoltGrid checks availability before
                creating the reservation.
              </p>
            </div>

            {/* STATION */}
            <div className="card p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-volt-400/10 text-volt-300">
                  <MapPin size={21} />
                </div>

                <div className="min-w-0">
                  <p className="font-display font-semibold text-grid-100">
                    {station.name}
                  </p>

                  <p className="mt-1 text-sm text-grid-500">
                    {station.address ??
                      "Charging station location"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-grid-600">
                    {station.city && (
                      <span>{station.city}</span>
                    )}

                    {station.is_24_7 && (
                      <span>24/7</span>
                    )}

                    {station.average_rating !== undefined && (
                      <span>
                        ★{" "}
                        {station.average_rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* VEHICLE */}
            <div className="card p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="label-eyebrow">
                    Your vehicle
                  </p>

                  <p className="mt-1 font-display font-semibold text-grid-100">
                    {defaultVehicle.name}
                  </p>

                  <p className="mt-1 text-sm text-grid-500">
                    {defaultVehicle.manufacturer}{" "}
                    {defaultVehicle.model}
                  </p>
                </div>

                <div className="rounded-xl bg-volt-400/10 p-3 text-volt-300">
                  <BatteryCharging size={21} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-grid-800 bg-grid-950/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-grid-600">
                    Battery
                  </p>

                  <p className="mt-1 text-sm font-bold text-grid-100">
                    {defaultVehicle.remaining_battery_percent}%
                  </p>
                </div>

                <div className="rounded-xl border border-grid-800 bg-grid-950/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-grid-600">
                    Connector
                  </p>

                  <p className="mt-1 text-sm font-bold text-grid-100">
                    {defaultVehicle.charger_type}
                  </p>
                </div>
              </div>
            </div>

            {/* LIVE STATION STATUS */}
            <div className="card overflow-hidden">
              <div className="border-b border-grid-800 bg-grid-900/60 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="label-eyebrow">
                      Live station status
                    </p>

                    <h2 className="mt-1 font-display text-lg font-bold text-grid-50">
                      Charger availability
                    </h2>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-volt-400/10 text-volt-300">
                    <Activity size={19} />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <LiveStat
                    label="Available"
                    value={
                      queueLoading
                        ? "--"
                        : String(
                            queue?.available_chargers ??
                              availableChargers.length,
                          )
                    }
                  />

                  <LiveStat
                    label="Occupied"
                    value={
                      queueLoading
                        ? "--"
                        : String(
                            queue?.occupied_chargers ?? 0,
                          )
                    }
                  />

                  <LiveStat
                    label="Faulty"
                    value={
                      queueLoading
                        ? "--"
                        : String(
                            queue?.faulty_chargers ?? 0,
                          )
                    }
                  />

                  <LiveStat
                    label="Queue"
                    value={
                      queueLoading
                        ? "--"
                        : String(
                            queue?.current_queue ?? 0,
                          )
                    }
                  />
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl border border-grid-800 bg-grid-950/40 px-4 py-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-grid-600">
                      Estimated waiting
                    </p>

                    <p className="mt-1 text-sm font-semibold text-grid-100">
                      {queueLoading
                        ? "Checking live queue..."
                        : queueError
                          ? "Live data unavailable"
                          : `${predictedWaitMinutes ?? 0} min`}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      queueError
                        ? "bg-amber-400/10 text-amber-300"
                        : "bg-emerald-400/10 text-emerald-400"
                    }`}
                  >
                    {queueError ? "Offline" : "Live"}
                  </span>
                </div>

                <p className="mt-3 text-[11px] leading-5 text-grid-600">
                  Queue updates automatically every 30 seconds.
                  Estimated wait uses the current queue length for
                  the MVP.
                </p>
              </div>

              {/* CHARGER SELECTION */}
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="label-eyebrow">
                      Step 1
                    </p>

                    <h2 className="mt-1 font-display text-lg font-bold text-grid-50">
                      Select a charger
                    </h2>
                  </div>

                  <PlugZap
                    size={20}
                    className="text-volt-300"
                  />
                </div>

                {chargers.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-grid-700 p-6 text-center">
                    <PlugZap
                      size={28}
                      className="mx-auto text-grid-600"
                    />

                    <p className="mt-3 text-sm font-semibold text-grid-300">
                      No chargers found
                    </p>

                    <p className="mt-1 text-xs text-grid-600">
                      This station currently has no charger
                      data.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {chargers.map((charger) => {
                      const available =
                        charger.status === "available";

                      const selected =
                        selectedCharger === charger.id;

                      const isRecommended =
                        recommendedCharger?.id ===
                          charger.id && available;

                      const statusText = available
                        ? "Available now"
                        : charger.status === "occupied"
                          ? "Currently occupied"
                          : charger.status === "faulty"
                            ? "Faulty"
                            : charger.status ===
                                "maintenance"
                              ? "Under maintenance"
                              : charger.status ===
                                  "offline"
                                ? "Offline"
                                : "Unavailable";

                      return (
                        <button
                          key={charger.id}
                          type="button"
                          disabled={!available}
                          onClick={() =>
                            available &&
                            setSelectedCharger(
                              charger.id,
                            )
                          }
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            selected
                              ? "border-volt-400/50 bg-volt-400/5"
                              : available
                                ? "border-grid-800 hover:border-grid-700"
                                : "cursor-not-allowed border-grid-800 opacity-40"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                                available
                                  ? "bg-volt-400/10 text-volt-300"
                                  : "bg-grid-800 text-grid-600"
                              }`}
                            >
                              <Zap size={19} />
                            </div>

                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-display font-semibold text-grid-100">
                                  {charger.charger_code ??
                                    `Charger #${charger.id}`}
                                </p>

                                {isRecommended && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-volt-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-volt-300">
                                    <Sparkles size={10} />
                                    AI Recommended
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 flex flex-wrap gap-3 text-xs text-grid-600">
                                <span>
                                  {charger.charger_type ??
                                    "Charger"}
                                </span>

                                <span>
                                  {charger.power_kw ?? "--"}{" "}
                                  kW
                                </span>

                                {charger.connector_type && (
                                  <span>
                                    {
                                      charger.connector_type
                                    }
                                  </span>
                                )}
                              </div>
                            </div>

                            <div
                              className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                                selected
                                  ? "border-volt-400 bg-volt-400 text-grid-950"
                                  : "border-grid-600"
                              }`}
                            >
                              {selected && (
                                <Check size={14} />
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <span
                              className={`text-xs font-semibold ${
                                available
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              {statusText}
                            </span>

                            {isRecommended && (
                              <span className="text-[10px] font-medium text-grid-500">
                                Best available power
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {availableChargers.length === 0 &&
                  chargers.length > 0 && (
                    <p className="mt-4 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-300">
                      There are currently no available
                      chargers at this station.
                    </p>
                  )}
              </div>
            </div>

            {/* ARRIVAL TIME */}
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="label-eyebrow">
                    Step 2
                  </p>

                  <h2 className="mt-1 font-display text-lg font-bold text-grid-50">
                    Choose arrival time
                  </h2>
                </div>

                <Clock3
                  size={20}
                  className="text-volt-300"
                />
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-grid-300">
                  When will you arrive?
                </label>

                <input
                  type="datetime-local"
                  value={selectedTime}
                  onChange={(event) =>
                    setSelectedTime(
                      event.target.value,
                    )
                  }
                  min={minDateTime}
                  className="input-field"
                />

                <p className="mt-2 text-xs text-grid-600">
                  Your reservation covers a 30-minute
                  charging slot starting at the selected
                  time.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <aside className="space-y-6">
            <div className="card sticky top-6 overflow-hidden">
              <div className="border-b border-grid-800 bg-grid-900/60 p-6">
                <div className="flex items-center gap-2">
                  <Sparkles
                    size={17}
                    className="text-volt-300"
                  />

                  <p className="text-xs font-bold uppercase tracking-widest text-volt-300">
                    Booking summary
                  </p>
                </div>

                <h2 className="mt-3 font-display text-xl font-bold text-grid-50">
                  Smart reservation
                </h2>

                <p className="mt-1 text-sm text-grid-500">
                  Review your real station and charger
                  details.
                </p>
              </div>

              <div className="p-6">
                <SummaryRow
                  icon={Clock3}
                  label="Predicted waiting"
                  value={
                    queueLoading
                      ? "Checking..."
                      : queueError
                        ? "Unavailable"
                        : `${predictedWaitMinutes ?? 0} min`
                  }
                />

                <SummaryRow
                  icon={Activity}
                  label="Live queue"
                  value={
                    queueLoading
                      ? "--"
                      : `${queue?.current_queue ?? 0} waiting`
                  }
                />

                <SummaryRow
                  icon={Zap}
                  label="Selected power"
                  value={
                    selectedChargerData?.power_kw !==
                    undefined
                      ? `${selectedChargerData.power_kw} kW`
                      : "--"
                  }
                />

                <SummaryRow
                  icon={IndianRupee}
                  label="Charging price"
                  value={
                    station.charging_cost_per_kwh !==
                    undefined
                      ? `₹${station.charging_cost_per_kwh} / kWh`
                      : "--"
                  }
                />

                <SummaryRow
                  icon={BatteryCharging}
                  label="Vehicle battery"
                  value={`${defaultVehicle.remaining_battery_percent}%`}
                />

                <div className="my-5 border-t border-grid-800" />

                {/* AI INFORMATION */}
                {recommendedCharger && (
                  <div className="mb-4 rounded-xl border border-volt-400/20 bg-volt-400/5 p-4">
                    <div className="flex gap-3">
                      <Sparkles
                        size={18}
                        className="mt-0.5 shrink-0 text-volt-300"
                      />

                      <div>
                        <p className="text-sm font-semibold text-grid-100">
                          AI charger recommendation
                        </p>

                        <p className="mt-1 text-xs leading-5 text-grid-600">
                          {recommendedCharger.charger_code ??
                            `Charger #${recommendedCharger.id}`}{" "}
                          is pre-selected because it has the
                          highest available charging power.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* PROTECTED RESERVATION */}
                <div className="rounded-xl border border-volt-400/20 bg-volt-400/5 p-4">
                  <div className="flex gap-3">
                    <ShieldCheck
                      size={18}
                      className="mt-0.5 shrink-0 text-volt-300"
                    />

                    <div>
                      <p className="text-sm font-semibold text-grid-100">
                        Protected reservation
                      </p>

                      <p className="mt-1 text-xs leading-5 text-grid-600">
                        VoltGrid validates the selected charger
                        and booking details before creating the
                        reservation.
                      </p>
                    </div>
                  </div>
                </div>

                {/* CONFIRM */}
                <button
                  type="button"
                  disabled={!canBook}
                  onClick={() =>
                    bookingMutation.mutate()
                  }
                  className="btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {bookingMutation.isPending
                    ? "Confirming..."
                    : "Confirm booking"}

                  {!bookingMutation.isPending && (
                    <ArrowRight size={17} />
                  )}
                </button>

                {/* ERROR */}
                {bookingMutation.isError && (
                  <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs leading-5 text-red-400">
                    {bookingMutation.error instanceof
                    Error
                      ? bookingMutation.error.message
                      : "Unable to create the booking. Please check the selected charger and arrival time."}
                  </p>
                )}

                {!selectedCharger && (
                  <p className="mt-3 text-center text-xs text-grid-600">
                    Select a charger to continue.
                  </p>
                )}

                {selectedCharger && !selectedTime && (
                  <p className="mt-3 text-center text-xs text-grid-600">
                    Choose your arrival time to continue.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

/* ============================================================
   SUMMARY ROW
============================================================ */

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3">
        <Icon
          size={16}
          className="text-grid-500"
        />

        <span className="text-sm text-grid-500">
          {label}
        </span>
      </div>

      <span className="text-right text-sm font-semibold text-grid-100">
        {value}
      </span>
    </div>
  );
}

/* ============================================================
   LIVE STAT
============================================================ */

function LiveStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-grid-800 bg-grid-950/50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-grid-600">
        {label}
      </p>

      <p className="mt-1 font-display text-lg font-bold text-grid-100">
        {value}
      </p>
    </div>
  );
}