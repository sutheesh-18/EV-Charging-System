import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  matchVehicleAny,
  vehicleImageSources,
  vehicleLabel,
} from "../../lib/vehicles";

/**
 * Shows the picture of the car the driver typed.
 *
 *   <VehicleImage names={[`${manufacturer} ${model}`, name]} />
 *
 * - "byd" / "tata nexon" / "nexon.ev" ... -> that car's image
 * - unknown car (or missing image) -> `fallback` (pass your 3D car here),
 *   otherwise a generic car shape
 * - `onResolve(true)` when a photo is on screen, `onResolve(false)` when not
 */
export default function VehicleImage({
  name,
  names,
  fallback,
  showLabel = true,
  angle,
  size = "md",
  shadow = true,
  onResolve,
  className = "",
}: {
  name?: string | null;
  names?: (string | null | undefined)[];
  fallback?: ReactNode;
  showLabel?: boolean;
  angle?: string;
  size?: "md" | "lg";
  /** soft drop shadow under the picture (turn off when Car3DStage draws its own) */
  shadow?: boolean;
  onResolve?: (found: boolean) => void;
  className?: string;
}) {
  const key = (names ?? [name]).join("|");

  const match = useMemo(
    () => matchVehicleAny(names ?? [name]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  const sources = useMemo(
    () => (match ? vehicleImageSources(match.vehicle, { angle }) : []),
    [match, angle],
  );

  // which source we are on; moves forward when an image fails to load
  const [attempt, setAttempt] = useState(0);
  useEffect(() => setAttempt(0), [sources]);

  const src = sources[attempt];
  const hasPhoto = Boolean(match && src);

  // tell the parent whether a photo is available
  useEffect(() => {
    if (!match || attempt >= sources.length) onResolve?.(false);
  }, [match, attempt, sources.length, onResolve]);

  if (!match || !src) {
    return (
      <div className={className}>
        {fallback ?? <GenericCar name={names ? names.find(Boolean) : name} />}
      </div>
    );
  }

  return (
    <figure className={`flex flex-col items-center ${className}`}>
      <img
        key={src}
        src={src}
        alt={vehicleLabel(match.vehicle)}
        onLoad={() => onResolve?.(hasPhoto)}
        onError={() => setAttempt((current) => current + 1)}
        className={`h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal ${
          shadow ? "drop-shadow-[0_18px_22px_rgba(15,23,42,0.35)]" : ""
        } ${
          size === "lg" ? "max-h-72" : "max-h-56"
        }`}
      />

      {showLabel && (
        <figcaption className="mt-2 text-xs font-semibold text-slate-500 dark:text-grid-300">
          {vehicleLabel(match.vehicle)}
        </figcaption>
      )}
    </figure>
  );
}

/** Simple car silhouette used when no photo is available */
function GenericCar({ name }: { name?: string | null }) {
  return (
    <div className="flex flex-col items-center py-4">
      <svg
        viewBox="0 0 240 100"
        className="h-28 w-full max-w-[260px] text-slate-300 dark:text-grid-600"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M18 70c0-9 5-14 14-16l28-6 24-24c4-4 9-6 15-6h52c9 0 16 3 22 9l20 21 29 5c9 2 14 8 14 17v4c0 4-3 7-7 7h-12a22 22 0 0 0-44 0H94a22 22 0 0 0-44 0H25c-4 0-7-3-7-7z" />
        <circle cx="72" cy="80" r="14" className="text-white dark:text-grid-900" fill="currentColor" />
        <circle cx="72" cy="80" r="7" />
        <circle cx="194" cy="80" r="14" className="text-white dark:text-grid-900" fill="currentColor" />
        <circle cx="194" cy="80" r="7" />
      </svg>

      {name ? (
        <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-grid-300">
          {name}
        </p>
      ) : null}
    </div>
  );
}