import { useEffect, useRef, type MouseEvent, type RefObject } from "react";
import { Link } from "react-router-dom";
import Lenis from "lenis";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}
import {
  Zap,
  BrainCircuit,
  Gauge,
  MapPinned,
  Leaf,
  ArrowRight,
  Activity,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

const features = [
  {
    icon: BrainCircuit,
    title: "Predictive Queue Intelligence",
    desc: "Estimate charging queues and waiting times before reaching a station.",
  },
  {
    icon: Gauge,
    title: "Smart Station Scoring",
    desc: "Compare stations using distance, charging speed, price and availability.",
  },
  {
    icon: MapPinned,
    title: "Battery-Aware Recommendations",
    desc: "Find charging options that consider your vehicle's available range.",
  },
  {
    icon: Leaf,
    title: "Sustainability Intelligence",
    desc: "Understand energy consumption, charging behavior and environmental impact.",
  },
];

/* =========================================================
   SMOOTHNESS HELPERS
   - Lenis: inertia ("buttery") page scrolling
   - Scroll progress bar + gentle hero parallax
   - Reveal-on-scroll for key blocks ([data-reveal])
   - Floating 3D network card that tilts toward the pointer
========================================================= */

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Smooth in-page navigation (works with Lenis, falls back to native)
function goTo(e: MouseEvent<HTMLAnchorElement>, id: string) {
  e.preventDefault();
  const el = document.getElementById(id);
  if (!el) return;
  if (window.__lenis) {
    window.__lenis.scrollTo(el, { offset: -8, duration: 1.4 });
  } else {
    el.scrollIntoView({ behavior: "smooth" });
  }
}

function useSmoothScroll({
  heroImgRef,
  barRef,
}: {
  heroImgRef: RefObject<HTMLImageElement | null>;
  barRef: RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    window.__lenis = lenis;

    lenis.on("scroll", ({ scroll, limit }: { scroll: number; limit: number }) => {
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${limit ? scroll / limit : 0})`;
      }
      if (heroImgRef.current) {
        const shift = Math.min(scroll, 800) * 0.07;
        heroImgRef.current.style.transform = `translate3d(0, ${shift}px, 0) scale(1.12)`;
      }
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      delete window.__lenis;
    };
  }, [heroImgRef, barRef]);
}

function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll("[data-reveal]"));
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.setAttribute("data-in", "1"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.setAttribute("data-in", "1");
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

const SMOOTH_CSS = `
html.lenis, html.lenis body { height: auto; }
.lenis.lenis-smooth { scroll-behavior: auto !important; }
.lenis.lenis-stopped { overflow: hidden; }

[data-reveal] {
  opacity: 0;
  transform: translate3d(0, 56px, 0) scale(0.9);
  filter: blur(6px);
  transition:
    opacity .7s ease-out,
    filter .7s ease-out,
    transform .95s cubic-bezier(.34, 1.45, .5, 1); /* soft overshoot = "pop" */
}
[data-reveal="left"]  { transform: translate3d(-70px, 0, 0) scale(0.94); }
[data-reveal="right"] { transform: translate3d(70px, 0, 0) scale(0.94); }
[data-reveal][data-in] { opacity: 1; transform: none; filter: none; }

@keyframes vg-float {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50%      { transform: translate3d(0, -14px, 0); }
}
@keyframes vg-bob {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50%      { transform: translate3d(0, -8px, 0); }
}
.vg-float { perspective: 1200px; animation: vg-float 6s ease-in-out infinite; }
.vg-bob   { animation: vg-bob 4s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  [data-reveal] { opacity: 1; transform: none; filter: none; transition: none; }
  .vg-float, .vg-bob { animation: none; }
}
`;

/* Floating, tilting 3D "Charging network" card */
function NetworkVisual() {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || prefersReducedMotion()) return;

    let tx = 0, ty = 0, cx = 0, cy = 0;
    let hovering = false;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      hovering = true;
    };
    const onLeave = () => {
      hovering = false;
    };

    const loop = (t: number) => {
      if (!hovering) {
        // idle sway so the card always feels alive
        tx = Math.sin(t / 2300) * 0.28;
        ty = Math.cos(t / 3100) * 0.16;
      }
      cx = lerp(cx, tx, 0.07);
      cy = lerp(cy, ty, 0.07);

      if (cardRef.current) {
        cardRef.current.style.transform = `rotateY(${cx * 24}deg) rotateX(${-cy * 18}deg)`;
      }
      if (glareRef.current) {
        glareRef.current.style.background = `radial-gradient(circle at ${(cx + 0.5) * 100}% ${(cy + 0.5) * 100}%, rgba(255,255,255,0.16), transparent 55%)`;
      }
      if (floorRef.current) {
        floorRef.current.style.transform = `translateX(${-cx * 60}px) scaleX(${1 - Math.abs(cx) * 0.25})`;
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
    };
  }, []);

  // pin positions (percent of the card) + depth + bob delay
  const pins = [
    { left: 18, top: 25, z: 55, color: "text-cyan-300", delay: "0s" },
    { left: 82, top: 30, z: 70, color: "text-teal-300", delay: "-1.2s" },
    { left: 25, top: 75, z: 45, color: "text-teal-300", delay: "-2.4s" },
    { left: 80, top: 80, z: 65, color: "text-cyan-300", delay: "-3.4s" },
  ];

  return (
    <div ref={stageRef} className="relative py-6 sm:py-8">
      <div className="vg-float">
        <div
          ref={cardRef}
          className="relative h-[380px] will-change-transform"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* BASE PANEL */}
          <div className="absolute inset-0 overflow-hidden rounded-[1.5rem] border border-cyan-300/20 bg-[#0B111D]/95 shadow-[0_30px_80px_-20px_rgba(34,211,238,0.25)]">
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)",
                backgroundSize: "35px 35px",
              }}
            />
            {/* glossy highlight that follows the tilt */}
            <div ref={glareRef} className="absolute inset-0" />
          </div>

          {/* ORBIT RINGS + CONNECTION LINES (slightly above the panel) */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ transform: "translateZ(18px)" }}
          >
            <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/15" />
            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-cyan-300/10" />
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {pins.map((p) => (
                <line
                  key={`${p.left}-${p.top}`}
                  x1="50"
                  y1="50"
                  x2={p.left}
                  y2={p.top}
                  stroke="rgba(103,232,249,0.22)"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          </div>

          {/* TITLE */}
          <div
            className="absolute left-5 top-5"
            style={{ transform: "translateZ(40px)" }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
              Charging network
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Station discovery and intelligence
            </p>
          </div>

          {/* CENTRAL NODE */}
          <div
            className="absolute left-1/2 top-1/2"
            style={{ transform: "translate3d(-50%, -50%, 90px)" }}
          >
            <div className="vg-bob flex flex-col items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-400/10 text-cyan-300 shadow-[0_0_45px_rgba(34,211,238,0.35)] backdrop-blur-sm">
                <BrainCircuit size={30} />
              </div>
              <span className="mt-3 text-xs font-bold uppercase tracking-widest text-cyan-300">
                VoltGrid
              </span>
            </div>
          </div>

          {/* STATION PINS (each floats at its own depth) */}
          {pins.map((p) => (
            <div
              key={`pin-${p.left}-${p.top}`}
              className="absolute"
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                transform: `translate3d(-50%, -50%, ${p.z}px)`,
              }}
            >
              <div className="vg-bob" style={{ animationDelay: p.delay }}>
                <MapPinned
                  size={26}
                  className={`${p.color} drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]`}
                />
              </div>
            </div>
          ))}

          {/* STATUS BAR */}
          <div
            className="absolute bottom-5 left-5 right-5"
            style={{ transform: "translateZ(45px)" }}
          >
            <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-[#0D1320]/95 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-xs text-slate-300">
                  Station network overview
                </span>
              </div>
              <span className="font-mono text-[10px] text-cyan-300">
                VOLTGRID
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FLOOR GLOW (reflection on the "ground" under the floating card) */}
      <div
        ref={floorRef}
        aria-hidden="true"
        className="mx-auto mt-8 h-5 w-3/5 rounded-[50%] bg-cyan-400/30 blur-2xl"
      />
    </div>
  );
}

export default function Landing() {
  const heroImgRef = useRef<HTMLImageElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useSmoothScroll({ heroImgRef, barRef });
  useReveal();

  return (
    <div className="min-h-screen overflow-hidden bg-[#070B14] text-slate-100">
      <style>{SMOOTH_CSS}</style>

      {/* SCROLL PROGRESS */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-0.5">
        <div
          ref={barRef}
          className="h-full origin-left bg-gradient-to-r from-cyan-400 to-emerald-300"
          style={{ transform: "scaleX(0)" }}
        />
      </div>

      {/* BACKGROUND GLOWS (visible on the sections below the hero) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-[450px] w-[450px] rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="absolute -right-40 top-60 h-[450px] w-[450px] rounded-full bg-teal-500/10 blur-[140px]" />
      </div>

      <main className="relative z-10">
        {/* ============ FULL-SCREEN HERO ============ */}
        <section
          id="platform"
          className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#050A18]"
        >
          {/* FULL-BLEED IMAGE
              Save your image as: public/images/voltgrid-hero.png
              object-right keeps the car + charger in view on every screen size */}
          <img
            ref={heroImgRef}
            src="/images/voltgrid-hero.png"
            alt="Electric car charging at a neon-lit VoltGrid station at night"
            className="absolute inset-0 h-full w-full object-cover object-[78%_bottom] will-change-transform lg:object-right"
            style={{ transform: "scale(1.12)" }}
          />

          {/* LEFT-ONLY SHADE: keeps the text readable and never touches the car */}
          <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-[#050A18]/70 via-[#050A18]/25 to-transparent lg:w-[55%]" />

          {/* TOP SHADE for the header */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#050A18]/80 to-transparent" />

          {/* BOTTOM FADE into the next section */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#070B14] to-transparent" />

          {/* HEADER (sits on top of the image) */}
          <header className="relative z-20">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
              <Link to="/" className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 backdrop-blur-md">
                  <Zap size={23} strokeWidth={2.5} />
                </div>

                <span className="font-display text-xl font-bold text-white">
                  Volt<span className="text-cyan-400">Grid</span>
                </span>
              </Link>

              <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
                <a href="#platform" onClick={(e) => goTo(e, "platform")} className="transition hover:text-cyan-300">
                  Platform
                </a>
                <a href="#intelligence" onClick={(e) => goTo(e, "intelligence")} className="transition hover:text-cyan-300">
                  AI Intelligence
                </a>
                <a href="#network" onClick={(e) => goTo(e, "network")} className="transition hover:text-cyan-300">
                  Network
                </a>
                <a href="#sustainability" onClick={(e) => goTo(e, "sustainability")} className="transition hover:text-cyan-300">
                  Sustainability
                </a>
              </nav>

              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  to="/login"
                  className="rounded-xl border border-white/15 bg-slate-900/60 px-4 py-2.5 text-sm font-semibold text-slate-100 backdrop-blur-md transition hover:border-cyan-400/40 hover:text-white"
                >
                  Sign in
                </Link>

                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/20"
                >
                  <span className="hidden sm:inline">Get started</span>
                  <span className="sm:hidden">Join</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </header>

          {/* HERO CONTENT: confined to the left side, away from the car */}
          <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-start px-6 pb-16 pt-10 lg:items-center lg:px-8 lg:pb-24 lg:pt-0">
            <div className="max-w-xl lg:max-w-[30rem] xl:max-w-xl">
              <div data-reveal style={{ transitionDelay: "100ms" }} className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-300 backdrop-blur-md">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                Intelligent EV charging platform
              </div>

              <h1 data-reveal style={{ transitionDelay: "220ms" }} className="font-display text-5xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl xl:text-7xl">
                Charge smarter.
                <span className="block bg-gradient-to-r from-cyan-300 via-teal-300 to-emerald-300 bg-clip-text text-transparent">
                  Arrive faster.
                </span>
              </h1>

              <p data-reveal style={{ transitionDelay: "360ms" }} className="mt-7 max-w-md text-base leading-8 text-slate-200 sm:text-lg">
                VoltGrid helps electric vehicle drivers discover nearby
                charging stations, compare charger availability, estimate
                waiting times and make smarter charging decisions.
              </p>

              <div data-reveal style={{ transitionDelay: "480ms" }} className="mt-9 flex flex-wrap gap-4">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-6 py-4 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/10 transition hover:-translate-y-1 hover:shadow-cyan-500/25"
                >
                  Find my best charger
                  <ArrowRight size={18} />
                </Link>

                <Link
                  to="/map"
                  className="inline-flex items-center gap-3 rounded-xl border border-white/15 bg-slate-900/60 px-6 py-4 text-sm font-semibold text-white backdrop-blur-md transition hover:border-cyan-400/40 hover:bg-slate-800/80"
                >
                  Explore charging network
                </Link>
              </div>

              {/* METRICS */}
              <div data-reveal style={{ transitionDelay: "600ms" }} className="mt-12 grid grid-cols-2 gap-6 border-t border-white/10 pt-8 sm:grid-cols-4">
                {[
                  ["AI", "Intelligence"],
                  ["Live", "Station data"],
                  ["Smart", "Recommendations"],
                  ["EV", "Network"],
                ].map(([big, small]) => (
                  <div key={big}>
                    <p className="font-display text-2xl font-bold text-white">
                      {big}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">
                      {small}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* NETWORK */}
        <section
          id="network"
          className="border-y border-slate-800/80 bg-[#0A101B]/80"
        >
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
            <div className="grid items-center gap-14 lg:grid-cols-2">
              <div data-reveal="left">
                <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-300">
                  <Activity size={16} />
                  Network intelligence
                </div>

                <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
                  A smarter way to discover charging stations.
                </h2>

                <p className="mt-5 max-w-xl leading-7 text-slate-400">
                  VoltGrid brings charging station information together
                  in one platform, helping EV drivers compare locations
                  and make informed charging decisions.
                </p>

                <Link
                  to="/map"
                  className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
                >
                  Explore the network
                  <ArrowRight size={16} />
                </Link>
              </div>

              {/* NETWORK VISUAL: floating 3D card */}
              <div data-reveal="right" style={{ transitionDelay: "150ms" }}>
                <NetworkVisual />
              </div>
            </div>
          </div>
        </section>

        {/* AI INTELLIGENCE */}
        <section
          id="intelligence"
          className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28"
        >
          <div data-reveal className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-300">
              <BrainCircuit size={16} />
              AI intelligence
            </div>

            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
              More than a charging station finder.
            </h2>

            <p className="mt-4 leading-7 text-slate-400">
              Turn charging station information into useful insights
              with VoltGrid's intelligent recommendation capabilities.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                data-reveal
                style={{ transitionDelay: `${i * 90}ms` }}
              >
              <div
                className="group h-full rounded-2xl border border-slate-800 bg-[#0D1320] p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-xl hover:shadow-cyan-500/5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 transition group-hover:bg-cyan-400/20">
                  <Icon size={21} />
                </div>

                <h3 className="mt-6 font-display text-base font-semibold text-white">
                  {title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">{desc}</p>
              </div>
              </div>
            ))}
          </div>
        </section>

        {/* SUSTAINABILITY */}
        <section
          id="sustainability"
          className="mx-auto max-w-7xl px-6 pb-20 lg:px-8 lg:pb-28"
        >
          <div data-reveal className="rounded-[2rem] border border-emerald-400/15 bg-gradient-to-br from-emerald-400/[0.08] via-[#0D1320] to-cyan-400/[0.06] p-8 sm:p-12">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div data-reveal="left" style={{ transitionDelay: "120ms" }}>
                <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
                  <Leaf size={16} />
                  Sustainable mobility
                </div>

                <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
                  Better charging decisions.
                  <br />
                  <span className="text-emerald-300">
                    Better energy efficiency.
                  </span>
                </h2>

                <p className="mt-5 max-w-xl leading-7 text-slate-400">
                  Monitor charging activity, understand energy usage
                  and build more efficient electric vehicle journeys.
                </p>

                <Link
                  to="/register"
                  className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-emerald-300 transition hover:text-emerald-200"
                >
                  Start using VoltGrid
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div data-reveal style={{ transitionDelay: "200ms" }} className="rounded-2xl border border-slate-700 bg-[#0A101B] p-5">
                  <Leaf size={20} className="text-emerald-300" />
                  <p className="mt-5 font-display text-2xl font-bold text-white">
                    CO₂
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Environmental impact
                  </p>
                </div>

                <div data-reveal style={{ transitionDelay: "320ms" }} className="rounded-2xl border border-slate-700 bg-[#0A101B] p-5">
                  <Zap size={20} className="text-cyan-300" />
                  <p className="mt-5 font-display text-2xl font-bold text-white">
                    kWh
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Energy consumption
                  </p>
                </div>

                <div data-reveal style={{ transitionDelay: "440ms" }} className="col-span-2 rounded-2xl border border-slate-700 bg-[#0A101B] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-400">
                        Network efficiency
                      </p>
                      <p className="mt-2 font-display text-xl font-bold text-white">
                        Smarter utilization
                      </p>
                    </div>

                    <TrendingUp size={28} className="text-emerald-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="mx-auto max-w-5xl px-6 pb-24 lg:px-8">
          <div data-reveal className="rounded-[2rem] border border-cyan-400/20 bg-gradient-to-b from-cyan-400/[0.09] to-transparent px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
              <Zap size={25} />
            </div>

            <h2 data-reveal style={{ transitionDelay: "150ms" }} className="mt-6 font-display text-3xl font-bold text-white sm:text-4xl">
              Make every charging stop smarter.
              <span className="mt-2 block text-cyan-300">
                Start your journey with VoltGrid.
              </span>
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-400">
              Discover stations, compare charging options and
              plan your next EV journey with confidence.
            </p>

            <Link
              to="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-7 py-4 text-sm font-bold text-slate-950 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-500/20"
            >
              Get started with VoltGrid
              <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-[#070B14] px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Link to="/" className="flex items-center gap-2">
            <Zap size={17} className="text-cyan-400" />
            <span className="font-display text-sm font-bold text-white">
              Volt<span className="text-cyan-400">Grid</span>
            </span>
          </Link>

          <p className="text-center text-xs text-slate-500">
            Intelligent electric vehicle charging platform.
          </p>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck size={14} className="text-emerald-400" />
            Smarter mobility
          </div>
        </div>
      </footer>
    </div>
  );
}