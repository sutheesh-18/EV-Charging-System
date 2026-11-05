import { useEffect, useRef, type ReactNode } from "react";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  );
}

/**
 * Gives a flat car photo a 3D feel:
 *  - tilts toward the pointer (and sways gently on its own)
 *  - the car floats slightly above its soft floor shadow
 *
 *   <Car3DStage active={photoFound === true}> <VehicleImage .../> </Car3DStage>
 *
 * `active=false` shows the children untouched (e.g. while the photo loads or
 * when the 3D car is shown instead).
 */
export default function Car3DStage({
  children,
  active = true,
  className = "",
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const tilt = tiltRef.current;
    const floor = floorRef.current;

    if (!stage || !tilt) return;

    const reset = () => {
      tilt.style.transform = "";
      if (floor) floor.style.transform = "";
    };

    if (!active || reducedMotion()) {
      reset();
      return;
    }

    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let hovering = false;
    let raf = 0;

    const onMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      tx = (event.clientX - rect.left) / rect.width - 0.5;
      ty = (event.clientY - rect.top) / rect.height - 0.5;
      hovering = true;
    };

    const onLeave = () => {
      hovering = false;
    };

    const loop = (time: number) => {
      if (!hovering) {
        // slow idle sway so the car always feels alive
        tx = Math.sin(time / 2400) * 0.3;
        ty = Math.cos(time / 3200) * 0.12;
      }

      cx = lerp(cx, tx, 0.08);
      cy = lerp(cy, ty, 0.08);

      const bob = Math.sin(time / 1300) * 3;

      tilt.style.transform = `rotateY(${(cx * 26).toFixed(2)}deg) rotateX(${(-cy * 14).toFixed(2)}deg) translateY(${bob.toFixed(2)}px)`;

      if (floor) {
        floor.style.transform = `translateX(${(-cx * 40).toFixed(1)}px) scaleX(${(1 - Math.abs(cx) * 0.25).toFixed(3)})`;
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      reset();
    };
  }, [active]);

  return (
    <div
      ref={stageRef}
      className={`relative ${className}`}
      style={{ perspective: "1000px", touchAction: "pan-y" }}
    >
      {active && (
        <div
          ref={floorRef}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-7 left-1/2 h-5 w-3/5 -translate-x-1/2 rounded-[50%] bg-slate-900/30 blur-xl dark:bg-black/70"
        />
      )}

      <div
        ref={tiltRef}
        className="relative will-change-transform"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div style={{ transform: active ? "translateZ(36px)" : undefined }}>
          {children}
        </div>
      </div>
    </div>
  );
}