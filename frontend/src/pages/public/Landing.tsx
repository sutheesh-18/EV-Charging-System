import { Link } from "react-router-dom";
import {
  Zap,
  BrainCircuit,
  Gauge,
  MapPinned,
  Leaf,
  ArrowRight,
  Activity,
  BatteryCharging,
  Clock3,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

const features = [
  {
    icon: BrainCircuit,
    title: "Predictive Queue AI",
    desc: "Predict charging queues before you arrive using intelligent demand and network analysis.",
  },
  {
    icon: Gauge,
    title: "Smart Station Scoring",
    desc: "Compare stations using waiting time, price, charger speed, congestion and reliability.",
  },
  {
    icon: MapPinned,
    title: "Battery-Safe Routing",
    desc: "Recommendations consider your available battery range and the distance to each station.",
  },
  {
    icon: Leaf,
    title: "Sustainability Intelligence",
    desc: "Track energy consumption, charging behavior and your environmental impact.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#070B14] text-slate-100">

      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute left-[5%] top-[10%] h-[400px] w-[400px] rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute right-[5%] top-[20%] h-[450px] w-[450px] rounded-full bg-teal-500/5 blur-[130px]" />
      </div>

      {/* HEADER */}
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
            <Zap size={21} />
          </div>

          <span className="font-display text-xl font-bold tracking-tight text-white">
            Volt<span className="text-cyan-400">Grid</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
          <a href="#platform" className="hover:text-white">
            Platform
          </a>

          <a href="#intelligence" className="hover:text-white">
            AI Intelligence
          </a>

          <a href="#network" className="hover:text-white">
            Network
          </a>

          <a href="#sustainability" className="hover:text-white">
            Sustainability
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Sign in
          </Link>

          <Link
            to="/register"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 px-4 py-2.5 text-sm font-bold text-slate-950"
          >
            Get started
            <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      {/* MAIN */}
      <main className="relative z-10">

        {/* HERO */}
        <section
          id="platform"
          className="mx-auto max-w-7xl px-6 pb-20 pt-14 lg:px-8 lg:pb-28 lg:pt-20"
        >
          <div className="grid items-center gap-16 lg:grid-cols-2">

            {/* Hero text */}
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                AI-powered EV intelligence
              </div>

              <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
                Charge smarter.
                <br />
                <span className="bg-gradient-to-r from-cyan-300 to-teal-400 bg-clip-text text-transparent">
                  Arrive faster.
                </span>
              </h1>

              <p className="mt-7 max-w-xl text-base leading-8 text-slate-400 sm:text-lg">
                VoltGrid uses AI to predict charging queues, waiting times and
                electricity demand — then recommends the charging station that
                makes the most sense for your journey.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  to="/register"
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 px-6 py-3.5 text-sm font-bold text-slate-950"
                >
                  Find my best charger
                  <ArrowRight size={17} />
                </Link>

                <Link
                  to="/login"
                  className="rounded-xl border border-slate-700 bg-slate-900/70 px-6 py-3.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                >
                  Explore VoltGrid
                </Link>
              </div>

              {/* Metrics */}
              <div className="mt-12 grid grid-cols-2 gap-6 border-t border-slate-800 pt-7 sm:grid-cols-4">
                <div>
                  <p className="font-display text-2xl font-bold text-white">
                    05
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">
                    ML models
                  </p>
                </div>

                <div>
                  <p className="font-display text-2xl font-bold text-white">
                    15+
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">
                    Factors
                  </p>
                </div>

                <div>
                  <p className="font-display text-2xl font-bold text-white">
                    24/7
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">
                    Intelligence
                  </p>
                </div>

                <div>
                  <p className="font-display text-2xl font-bold text-white">
                    AI
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">
                    Decisions
                  </p>
                </div>
              </div>
            </div>

            {/* AI Recommendation Card */}
            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -inset-5 rounded-[2rem] bg-cyan-400/5 blur-3xl" />

              <div className="relative rounded-[1.5rem] border border-slate-700 bg-[#0D1320] p-6 shadow-2xl sm:p-7">

                {/* Card header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                      <BrainCircuit size={17} />
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                        AI Recommendation
                      </p>

                      <p className="text-xs text-slate-500">
                        Updated just now
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    LIVE
                  </div>
                </div>

                {/* Station */}
                <div className="mt-7 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      Best match for your journey
                    </p>

                    <h2 className="mt-1 font-display text-2xl font-bold text-white">
                      GreenVolt Hub
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      Velachery · Chennai
                    </p>
                  </div>

                  <div className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/5">
                    <span className="font-display text-xl font-bold text-cyan-300">
                      86
                    </span>

                    <span className="text-[9px] uppercase tracking-wider text-slate-500">
                      Match
                    </span>
                  </div>
                </div>

                {/* Score */}
                <div className="mt-6">
                  <div className="mb-2 flex justify-between text-[11px]">
                    <span className="text-slate-500">
                      AI station score
                    </span>

                    <span className="font-mono text-cyan-300">
                      86/100
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full w-[86%] rounded-full bg-gradient-to-r from-cyan-500 to-teal-400" />
                  </div>
                </div>

                {/* Reasons */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <ShieldCheck size={17} className="text-emerald-300" />
                    Lowest predicted waiting time
                  </div>

                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <ShieldCheck size={17} className="text-emerald-300" />
                    Fast 120kW charger available
                  </div>

                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <ShieldCheck size={17} className="text-emerald-300" />
                    Reachable with current battery
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-7 grid grid-cols-3 divide-x divide-slate-800 border-t border-slate-800 pt-5">

                  <div className="text-center">
                    <Clock3 size={15} className="mx-auto mb-2 text-cyan-300" />
                    <p className="font-display text-lg font-bold text-white">
                      4 min
                    </p>
                    <p className="text-[10px] uppercase text-slate-500">
                      Wait
                    </p>
                  </div>

                  <div className="text-center">
                    <Zap size={15} className="mx-auto mb-2 text-cyan-300" />
                    <p className="font-display text-lg font-bold text-white">
                      120kW
                    </p>
                    <p className="text-[10px] uppercase text-slate-500">
                      Charger
                    </p>
                  </div>

                  <div className="text-center">
                    <MapPinned
                      size={15}
                      className="mx-auto mb-2 text-cyan-300"
                    />
                    <p className="font-display text-lg font-bold text-white">
                      3.2 km
                    </p>
                    <p className="text-[10px] uppercase text-slate-500">
                      Away
                    </p>
                  </div>

                </div>

                {/* AI explanation */}
                <div className="mt-6 flex items-center gap-2 rounded-xl border border-cyan-400/10 bg-cyan-400/5 px-3 py-3">
                  <BrainCircuit size={15} className="text-cyan-300" />

                  <p className="text-[11px] text-slate-400">
                    Calculated using{" "}
                    <span className="font-semibold text-slate-200">
                      15+ network factors
                    </span>
                  </p>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* NETWORK */}
        <section
          id="network"
          className="border-y border-slate-800/70 bg-[#0A101B]/70"
        >
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">

            <div className="grid items-center gap-14 lg:grid-cols-2">

              <div>
                <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-300">
                  <Activity size={15} />
                  Network Intelligence
                </div>

                <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
                  A charging network that thinks ahead.
                </h2>

                <p className="mt-5 max-w-xl leading-7 text-slate-400">
                  VoltGrid continuously evaluates station availability,
                  charging demand and network conditions to help drivers make
                  better charging decisions.
                </p>

                <div className="mt-8 grid grid-cols-2 gap-3">

                  <div className="rounded-2xl border border-slate-800 bg-[#0D1320] p-5">
                    <BatteryCharging
                      size={19}
                      className="text-cyan-300"
                    />

                    <p className="mt-5 font-display text-2xl font-bold text-white">
                      47
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Chargers available
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-[#0D1320] p-5">
                    <Activity
                      size={19}
                      className="text-emerald-300"
                    />

                    <p className="mt-5 font-display text-2xl font-bold text-white">
                      18
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Active sessions
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-[#0D1320] p-5">
                    <TrendingUp
                      size={19}
                      className="text-cyan-300"
                    />

                    <p className="mt-5 font-display text-2xl font-bold text-white">
                      86%
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Network availability
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-[#0D1320] p-5">
                    <Zap size={19} className="text-amber-300" />

                    <p className="mt-5 font-display text-2xl font-bold text-white">
                      120kW
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Fastest charger
                    </p>
                  </div>

                </div>
              </div>

              {/* Network visualization */}
              <div className="relative h-[380px] overflow-hidden rounded-[1.5rem] border border-slate-800 bg-[#0B111D]">

                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)",
                    backgroundSize: "35px 35px",
                  }}
                />

                <div className="absolute left-5 top-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                    Chennai Network
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Live station intelligence
                  </p>
                </div>

                {/* Center AI node */}
                <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10 text-cyan-300 shadow-[0_0_35px_rgba(34,211,238,0.2)]">
                    <BrainCircuit size={25} />
                  </div>

                  <span className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-cyan-300">
                    VoltGrid AI
                  </span>
                </div>

                {/* Station nodes */}
                <div className="absolute left-[18%] top-[25%]">
                  <MapPinned size={24} className="text-slate-400" />
                </div>

                <div className="absolute right-[18%] top-[30%]">
                  <MapPinned size={24} className="text-slate-400" />
                </div>

                <div className="absolute left-[25%] bottom-[25%]">
                  <MapPinned size={24} className="text-slate-400" />
                </div>

                <div className="absolute right-[20%] bottom-[20%]">
                  <MapPinned size={24} className="text-slate-400" />
                </div>

                <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-xl border border-slate-800 bg-[#0D1320]/95 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

                    <span className="text-xs text-slate-400">
                      Network operating normally
                    </span>
                  </div>

                  <span className="font-mono text-xs text-cyan-300">
                    REAL-TIME
                  </span>
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* AI INTELLIGENCE */}
        <section
          id="intelligence"
          className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28"
        >

          <div className="mx-auto max-w-2xl text-center">

            <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-300">
              <BrainCircuit size={15} />
              AI Intelligence
            </div>

            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
              More than a charging station finder.
            </h2>

            <p className="mt-4 leading-7 text-slate-400">
              Multiple prediction models and real-time network signals turn
              charging data into useful decisions.
            </p>

          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-slate-800 bg-[#0D1320] p-6 transition hover:-translate-y-1 hover:border-cyan-400/30"
              >

                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/5 text-cyan-300">
                  <Icon size={20} />
                </div>

                <h3 className="mt-6 font-display text-base font-semibold text-white">
                  {title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {desc}
                </p>

              </div>
            ))}

          </div>
        </section>

        {/* SUSTAINABILITY */}
        <section
          id="sustainability"
          className="mx-auto max-w-7xl px-6 pb-20 lg:px-8 lg:pb-28"
        >

          <div className="rounded-[2rem] border border-emerald-400/10 bg-gradient-to-br from-emerald-400/[0.07] via-[#0D1320] to-cyan-400/[0.04] p-8 sm:p-12">

            <div className="grid items-center gap-10 lg:grid-cols-2">

              <div>

                <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
                  <Leaf size={15} />
                  Sustainable mobility
                </div>

                <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
                  Better charging decisions.
                  <br />
                  Better network efficiency.
                </h2>

                <p className="mt-5 max-w-xl leading-7 text-slate-400">
                  Track energy consumption, charging behavior and environmental
                  impact from one intelligent platform.
                </p>

                <Link
                  to="/register"
                  className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-emerald-300"
                >
                  Start using VoltGrid
                  <ArrowRight size={16} />
                </Link>

              </div>

              <div className="grid grid-cols-2 gap-3">

                <div className="rounded-2xl border border-slate-800 bg-[#0A101B] p-5">
                  <Leaf size={19} className="text-emerald-300" />

                  <p className="mt-5 font-display text-2xl font-bold text-white">
                    CO₂
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Impact tracking
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#0A101B] p-5">
                  <Zap size={19} className="text-cyan-300" />

                  <p className="mt-5 font-display text-2xl font-bold text-white">
                    kWh
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Energy intelligence
                  </p>
                </div>

                <div className="col-span-2 rounded-2xl border border-slate-800 bg-[#0A101B] p-5">

                  <div className="flex items-center justify-between">

                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-500">
                        Network efficiency
                      </p>

                      <p className="mt-1 font-display text-2xl font-bold text-white">
                        Smarter utilization
                      </p>
                    </div>

                    <TrendingUp
                      size={26}
                      className="text-emerald-300"
                    />

                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* FINAL CTA */}
        <section className="mx-auto max-w-5xl px-6 pb-24 lg:px-8">

          <div className="rounded-[2rem] border border-cyan-400/10 bg-gradient-to-b from-cyan-400/[0.06] to-transparent px-6 py-16 text-center">

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
              <Zap size={22} />
            </div>

            <h2 className="mt-6 font-display text-3xl font-bold text-white sm:text-4xl">
              Stop searching for chargers.
              <br />
              <span className="text-cyan-300">
                Start making better decisions.
              </span>
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-500">
              Let VoltGrid's intelligent recommendations guide your next
              charging session.
            </p>

            <Link
              to="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 px-7 py-3.5 text-sm font-bold text-slate-950"
            >
              Get started with VoltGrid
              <ArrowRight size={17} />
            </Link>

          </div>

        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">

          <div className="flex items-center gap-2">
            <Zap size={15} className="text-cyan-400" />

            <span className="text-sm font-semibold text-slate-300">
              VoltGrid
            </span>
          </div>

          <p className="text-xs text-slate-600">
            AI-powered EV charging intelligence platform.
          </p>

        </div>
      </footer>

    </div>
  );
}