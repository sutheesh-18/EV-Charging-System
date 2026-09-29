import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import {
  BrainCircuit,
  TrendingUp,
  Clock3,
  Zap,
  Activity,
  AlertCircle,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { api } from "../../api/client";

import type {
  Station,
  QueuePrediction,
  DemandForecast,
} from "../../types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,

  plugins: {
    legend: {
      labels: {
        color: "#98A8C4",
      },
    },
  },

  scales: {
    x: {
      ticks: {
        color: "#6B7FA0",
      },
      grid: {
        color: "rgba(255,255,255,0.04)",
      },
    },

    y: {
      ticks: {
        color: "#6B7FA0",
      },
      grid: {
        color: "rgba(255,255,255,0.04)",
      },
    },
  },
};

export default function PredictionsPage() {
  const [stationId, setStationId] = useState<number | null>(null);

  /* ---------------------------------------------
     LOAD STATIONS
  --------------------------------------------- */

  const {
    data: stations = [],
    isLoading: stationsLoading,
    isError: stationsError,
  } = useQuery<Station[]>({
    queryKey: ["stations"],
    queryFn: async () => {
      const response = await api.get("/stations");
      return response.data;
    },
  });

  const activeStationId = stationId ?? stations[0]?.id;

  /* ---------------------------------------------
     DEMAND PREDICTION
  --------------------------------------------- */

  const {
    data: demand,
    isLoading: demandLoading,
    isError: demandError,
  } = useQuery<DemandForecast>({
    queryKey: ["demand", activeStationId],

    queryFn: async () => {
      const response = await api.get(
        `/predictions/demand/${activeStationId}?horizon_hours=24`,
      );

      return response.data;
    },

    enabled: Boolean(activeStationId),
  });

  /* ---------------------------------------------
     QUEUE PREDICTION
  --------------------------------------------- */

  const {
    data: queue,
    isLoading: queueLoading,
    isError: queueError,
  } = useQuery<QueuePrediction>({
    queryKey: ["queue", activeStationId],

    queryFn: async () => {
      const response = await api.get(
        `/predictions/queue/${activeStationId}`,
      );

      return response.data;
    },

    enabled: Boolean(activeStationId),
  });

  /* ---------------------------------------------
     DEMAND CHART
  --------------------------------------------- */

  const demandChart = demand
    ? {
        labels: demand.timestamps.map(
          (timestamp: string) =>
            `${new Date(timestamp).getHours()}:00`,
        ),

        datasets: [
          {
            label: "Predicted demand (kWh)",

            data: demand.forecast,

            borderColor: "#0ec978",

            backgroundColor: "rgba(14, 201, 120, 0.15)",

            fill: true,

            tension: 0.35,

            pointRadius: 3,

            pointHoverRadius: 6,
          },
        ],
      }
    : null;

  /* ---------------------------------------------
     QUEUE CHART
  --------------------------------------------- */

  const queueChart = queue
    ? {
        labels: [
          "Now",
          "15 min",
          "30 min",
          "1 hr",
          "2 hr",
          "Peak",
        ],

        datasets: [
          {
            label: "Predicted queue length",

            data: [
              queue.current_queue,
              queue.queue_15min,
              queue.queue_30min,
              queue.queue_1hr,
              queue.queue_2hr,
              queue.peak_hour_queue,
            ],

            borderColor: "#FF9F1C",

            backgroundColor: "rgba(255, 159, 28, 0.15)",

            fill: true,

            tension: 0.35,

            pointRadius: 3,

            pointHoverRadius: 6,
          },
        ],
      }
    : null;

  /* ---------------------------------------------
     LOADING STATE
  --------------------------------------------- */

  if (stationsLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <BrainCircuit
              size={36}
              className="mx-auto animate-pulse text-volt-400"
            />

            <p className="mt-4 text-sm text-grid-300">
              Loading AI prediction data...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  /* ---------------------------------------------
     ERROR STATE
  --------------------------------------------- */

  if (stationsError) {
    return (
      <AppShell>
        <div className="card mx-auto max-w-xl p-8 text-center">
          <AlertCircle
            size={40}
            className="mx-auto text-red-400"
          />

          <h2 className="mt-4 font-display text-xl font-bold text-grid-50">
            Unable to load stations
          </h2>

          <p className="mt-2 text-sm text-grid-300">
            We could not retrieve charging station information.
            Please try again later.
          </p>
        </div>
      </AppShell>
    );
  }

  /* ---------------------------------------------
     NO STATIONS
  --------------------------------------------- */

  if (!stations.length) {
    return (
      <AppShell>
        <div className="card mx-auto max-w-xl p-8 text-center">
          <Zap
            size={40}
            className="mx-auto text-volt-400"
          />

          <h2 className="mt-4 font-display text-xl font-bold text-grid-50">
            No charging stations available
          </h2>

          <p className="mt-2 text-sm text-grid-300">
            AI predictions will appear once charging stations
            are available.
          </p>
        </div>
      </AppShell>
    );
  }

  /* ---------------------------------------------
     MAIN PAGE
  --------------------------------------------- */

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">

        {/* -----------------------------------------
            PAGE HEADER
        ----------------------------------------- */}

        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-volt-400/10 text-volt-400">
                <BrainCircuit size={23} />
              </div>

              <div>
                <p className="label-eyebrow">
                  Intelligence Center
                </p>

                <h1 className="mt-1 font-display text-2xl font-bold text-grid-50">
                  AI Predictions
                </h1>
              </div>

            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-grid-300">
              Predictive insights for charging demand, queue
              congestion, and station activity.
            </p>
          </div>

          {/* Station selector */}

          <div className="min-w-[240px]">

            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-grid-400">
              Charging station
            </label>

            <select
              className="input-field"
              value={activeStationId ?? ""}
              onChange={(event) => {
                const value = Number(event.target.value);

                setStationId(
                  Number.isFinite(value) ? value : null,
                );
              }}
            >
              {stations.map((station) => (
                <option
                  key={station.id}
                  value={station.id}
                >
                  {station.name}
                </option>
              ))}
            </select>

          </div>

        </div>

        {/* -----------------------------------------
            SUMMARY CARDS
        ----------------------------------------- */}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="card p-5">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-grid-400">
                  Current queue
                </p>

                <p className="mt-2 font-display text-2xl font-bold text-grid-50">
                  {queue?.current_queue ?? "--"}
                </p>

                <p className="mt-1 text-xs text-grid-400">
                  Vehicles waiting
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-400/10 text-orange-400">
                <Clock3 size={19} />
              </div>

            </div>

          </div>

          <div className="card p-5">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-grid-400">
                  15 min queue
                </p>

                <p className="mt-2 font-display text-2xl font-bold text-grid-50">
                  {queue?.queue_15min ?? "--"}
                </p>

                <p className="mt-1 text-xs text-grid-400">
                  Predicted vehicles
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-400/10 text-blue-400">
                <Activity size={19} />
              </div>

            </div>

          </div>

          <div className="card p-5">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-grid-400">
                  Peak queue
                </p>

                <p className="mt-2 font-display text-2xl font-bold text-grid-50">
                  {queue?.peak_hour_queue ?? "--"}
                </p>

                <p className="mt-1 text-xs text-grid-400">
                  Expected peak
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-400/10 text-red-400">
                <TrendingUp size={19} />
              </div>

            </div>

          </div>

          <div className="card p-5">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-grid-400">
                  Prediction horizon
                </p>

                <p className="mt-2 font-display text-2xl font-bold text-grid-50">
                  24h
                </p>

                <p className="mt-1 text-xs text-grid-400">
                  AI forecast window
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-volt-400/10 text-volt-400">
                <Zap size={19} />
              </div>

            </div>

          </div>

        </div>

        {/* -----------------------------------------
            CHARTS
        ----------------------------------------- */}

        <div className="grid gap-6 lg:grid-cols-2">

          {/* Demand */}

          <div className="card p-6">

            <div className="flex items-start justify-between">

              <div>

                <p className="label-eyebrow">
                  Energy intelligence
                </p>

                <h2 className="mt-1 font-display text-lg font-bold text-grid-50">
                  Electricity demand forecast
                </h2>

                <p className="mt-1 text-xs text-grid-400">
                  Next 24 hours
                </p>

              </div>

              <div className="rounded-lg bg-volt-400/10 p-2 text-volt-400">
                <TrendingUp size={18} />
              </div>

            </div>

            <div className="mt-6 h-[320px]">

              {demandLoading ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-grid-400">
                    Generating demand forecast...
                  </p>
                </div>
              ) : demandError ? (
                <div className="flex h-full items-center justify-center text-center">
                  <div>
                    <AlertCircle
                      size={30}
                      className="mx-auto text-red-400"
                    />

                    <p className="mt-3 text-sm text-grid-300">
                      Demand prediction unavailable.
                    </p>
                  </div>
                </div>
              ) : demandChart ? (
                <Line
                  data={demandChart}
                  options={chartOptions}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-grid-400">
                    No demand data available.
                  </p>
                </div>
              )}

            </div>

          </div>

          {/* Queue */}

          <div className="card p-6">

            <div className="flex items-start justify-between">

              <div>

                <p className="label-eyebrow">
                  Traffic intelligence
                </p>

                <h2 className="mt-1 font-display text-lg font-bold text-grid-50">
                  Queue length forecast
                </h2>

                <p className="mt-1 text-xs text-grid-400">
                  Short-term congestion prediction
                </p>

              </div>

              <div className="rounded-lg bg-orange-400/10 p-2 text-orange-400">
                <Clock3 size={18} />
              </div>

            </div>

            <div className="mt-6 h-[320px]">

              {queueLoading ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-grid-400">
                    Calculating queue forecast...
                  </p>
                </div>
              ) : queueError ? (
                <div className="flex h-full items-center justify-center text-center">
                  <div>
                    <AlertCircle
                      size={30}
                      className="mx-auto text-red-400"
                    />

                    <p className="mt-3 text-sm text-grid-300">
                      Queue prediction unavailable.
                    </p>
                  </div>
                </div>
              ) : queueChart ? (
                <Line
                  data={queueChart}
                  options={chartOptions}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-grid-400">
                    No queue data available.
                  </p>
                </div>
              )}

            </div>

          </div>

        </div>

        {/* -----------------------------------------
            AI INFORMATION
        ----------------------------------------- */}

        <div className="card mt-6 overflow-hidden">

          <div className="border-b border-grid-800 bg-grid-900/40 p-6">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-volt-400/10 text-volt-400">
                <BrainCircuit size={20} />
              </div>

              <div>

                <p className="label-eyebrow">
                  AI engine
                </p>

                <h2 className="mt-1 font-display text-lg font-bold text-grid-50">
                  How predictions work
                </h2>

              </div>

            </div>

          </div>

          <div className="grid gap-0 md:grid-cols-2 lg:grid-cols-4">

            <div className="border-b border-grid-800 p-6 md:border-r lg:border-b-0">

              <p className="text-sm font-semibold text-grid-100">
                Queue prediction
              </p>

              <p className="mt-2 text-sm leading-6 text-grid-400">
                Uses historical demand, time-of-day,
                day-of-week, holidays, active chargers,
                and booking activity.
              </p>

              <span className="mt-4 inline-flex rounded-full border border-orange-400/20 bg-orange-400/5 px-3 py-1 text-xs font-medium text-orange-400">
                XGBoost
              </span>

            </div>

            <div className="border-b border-grid-800 p-6 md:border-r lg:border-b-0">

              <p className="text-sm font-semibold text-grid-100">
                Waiting time
              </p>

              <p className="mt-2 text-sm leading-6 text-grid-400">
                Estimates charging delays using live
                queue length and charger throughput.
              </p>

              <span className="mt-4 inline-flex rounded-full border border-blue-400/20 bg-blue-400/5 px-3 py-1 text-xs font-medium text-blue-400">
                Random Forest
              </span>

            </div>

            <div className="border-b border-grid-800 p-6 md:border-r lg:border-b-0">

              <p className="text-sm font-semibold text-grid-100">
                Energy demand
              </p>

              <p className="mt-2 text-sm leading-6 text-grid-400">
                Forecasts electricity consumption using
                historical charging patterns and rolling
                time windows.
              </p>

              <span className="mt-4 inline-flex rounded-full border border-volt-400/20 bg-volt-400/5 px-3 py-1 text-xs font-medium text-volt-400">
                LSTM
              </span>

            </div>

            <div className="p-6">

              <p className="text-sm font-semibold text-grid-100">
                Charger risk
              </p>

              <p className="mt-2 text-sm leading-6 text-grid-400">
                Identifies potential charger failures using
                usage history, charger age, and previous
                fault information.
              </p>

              <span className="mt-4 inline-flex rounded-full border border-purple-400/20 bg-purple-400/5 px-3 py-1 text-xs font-medium text-purple-400">
                LightGBM
              </span>

            </div>

          </div>

        </div>

      </div>
    </AppShell>
  );
}