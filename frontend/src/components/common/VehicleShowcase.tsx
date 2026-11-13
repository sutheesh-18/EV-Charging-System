import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Battery, Gauge } from "lucide-react";

import Car3DStage from "./Car3DStage";
import VehicleImage from "./VehicleImage";
import { matchVehicleAny } from "../../lib/vehicles";

// Loaded on demand so three.js stays out of the main bundle
const EvCar3D = lazy(() => import("../EvCar3D"));

/**
 * "Your vehicle" picture for the dashboard.
 *
 * - Car recognised and its photo exists -> photo of the real model,
 *   plus a Photo / 3D model switch
 * - Anything else -> the interactive 3D car (exactly as before)
 */
export default function VehicleShowcase({
  names,
  batteryPercent,
  rangeKm,
  charging = false,
}: {
  names: (string | null | undefined)[];
  batteryPercent: number;
  rangeKm?: number | null;
  charging?: boolean;
}) {
  const key = names.join("|");

  const match = useMemo(
    () => matchVehicleAny(names),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  const [viewMode, setViewMode] = useState<"photo" | "3d">("photo");

  // null = not known yet, true = photo on screen, false = no photo
  const [photoFound, setPhotoFound] = useState<boolean | null>(null);

  useEffect(() => {
    setPhotoFound(null);
    setViewMode("photo");
  }, [match?.vehicle.id]);

  const car3D = (
    <Suspense
      fallback={
        <div className="h-[250px] w-full animate-pulse rounded-xl bg-slate-200/80 dark:bg-grid-700/60" />
      }
    >
          <EvCar3D
        embedded
        carName="Tata Punch EV"
        batteryPercent={batteryPercent}
        rangeKm={rangeKm}
        charging={charging}
      />
    </Suspense>
  );

  if (!match) return car3D;

  const showPhoto = viewMode === "photo";

  return (
    <div>
      {photoFound === true && (
        <div
          role="group"
          aria-label="Vehicle view"
          className="mb-3 flex justify-end"
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
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:focus-visible:ring-volt-400 ${
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
        <div className="relative flex min-h-[250px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-slate-50 to-slate-100 p-4 dark:from-grid-900 dark:to-grid-950">
          <Car3DStage active={photoFound === true} className="w-full">
            <VehicleImage
              names={names}
              fallback={car3D}
              onResolve={setPhotoFound}
              className="w-full"
            />
          </Car3DStage>

          {photoFound === true && (
            <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur dark:bg-grid-900/90 dark:text-grid-100">
                <Battery
                  size={12}
                  className="text-teal-700 dark:text-volt-400"
                />
                {Math.round(batteryPercent)}%
              </span>

              {rangeKm != null && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur dark:bg-grid-900/90 dark:text-grid-100">
                  <Gauge
                    size={12}
                    className="text-teal-700 dark:text-volt-400"
                  />
                  {Math.round(rangeKm)} km range
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        car3D
      )}
    </div>
  );
}