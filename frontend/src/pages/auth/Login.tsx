import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Zap,
  LogIn,
  ArrowRight,
  ShieldCheck,
  BrainCircuit,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

/* Background image for this page.
   Uses the same file as the landing page. To use another photo,
   save it in public/images/ and change this path. */
const BACKGROUND_IMAGE = "/images/voltgrid-hero.png";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("driver@evcharge.ai");
  const [password, setPassword] = useState("Password@123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);

      if (user.role === "admin") {
        navigate("/admin");
      } else if (user.role === "operator") {
        navigate("/operator");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to sign in. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-grid-950">
      {/* =====================================================
          FULL-SCREEN BACKGROUND IMAGE
      ===================================================== */}
      <img
        src={BACKGROUND_IMAGE}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[78%_bottom] lg:object-right"
      />

      {/* Shade behind the form column only */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-grid-950/85 via-grid-950/40 to-transparent lg:from-grid-950/80 lg:via-grid-950/20 lg:to-transparent" />

      {/* Extra shade on small screens */}
      <div className="pointer-events-none absolute inset-0 bg-grid-950/45 lg:hidden" />

      {/* Bottom fade for the caption */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-60 bg-gradient-to-t from-grid-950/95 via-grid-950/50 to-transparent lg:block" />

      {/* =====================================================
          CONTENT
      ===================================================== */}
      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1500px] lg:grid-cols-[minmax(0,34rem)_1fr]">
        {/* ---------- LEFT: logo + sign-in form ---------- */}
        <div className="flex flex-col px-6 py-8 sm:px-10 xl:pl-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 self-start">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-volt-400/30 bg-volt-400/10 text-volt-300 backdrop-blur-md">
              <Zap size={21} strokeWidth={2.5} />
            </div>

            <span className="font-display text-xl font-bold text-white">
              Volt<span className="text-volt-400">Grid</span>
            </span>
          </Link>

          <div className="flex flex-1 items-center py-8">
            <div className="w-full">
              {/* Login card (frosted glass) */}
              <div className="relative">
                <div className="absolute -inset-4 rounded-[2rem] bg-volt-400/10 blur-3xl" />

                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-grid-900/70 p-7 shadow-card-lg backdrop-blur-xl sm:p-9">
                  {/* Top accent line */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt-400/70 to-transparent" />

                  {/* Heading */}
                  <div className="mb-8">
                    <p className="label-eyebrow">Welcome back</p>

                    <h2 className="mt-2 font-display text-3xl font-bold text-grid-50">
                      Sign in to VoltGrid
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-grid-400">
                      Access your charging intelligence dashboard.
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Email */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-grid-300">
                        Email address
                      </label>

                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-field"
                        placeholder="you@example.com"
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="block text-sm font-medium text-grid-300">
                          Password
                        </label>

                        <button
                          type="button"
                          className="text-xs font-medium text-volt-400 transition hover:text-volt-300"
                        >
                          Forgot password?
                        </button>
                      </div>

                      <input
                        type="password"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-field"
                        placeholder="••••••••"
                      />
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
                        {error}
                      </div>
                    )}

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <LogIn size={17} />

                      {loading ? "Signing in..." : "Sign in"}

                      {!loading && <ArrowRight size={16} />}
                    </button>
                  </form>

                  {/* Divider */}
                  <div className="my-7 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10" />

                    <span className="text-[10px] uppercase tracking-widest text-grid-500">
                      Secure access
                    </span>

                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  {/* Security information */}
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-grid-950/50 px-4 py-3">
                    <ShieldCheck
                      size={18}
                      className="shrink-0 text-emerald-400"
                    />

                    <p className="text-xs leading-5 text-grid-400">
                      Your account and charging data are protected by
                      authenticated access.
                    </p>
                  </div>

                  {/* Register */}
                  <p className="mt-7 text-center text-sm text-grid-400">
                    Don't have an account?{" "}
                    <Link
                      to="/register"
                      className="font-semibold text-volt-400 transition hover:text-volt-300"
                    >
                      Create your account
                    </Link>
                  </p>
                </div>
              </div>

              {/* Demo account */}
              <div className="mt-4 rounded-2xl border border-white/10 bg-grid-900/60 p-4 backdrop-blur-xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-grid-500">
                  Demo environment
                </p>

                <p className="mt-2 text-xs text-grid-400">
                  Driver:
                  <span className="ml-1 text-grid-200">driver@evcharge.ai</span>
                </p>

                <p className="mt-1 text-xs text-grid-400">
                  Password:
                  <span className="ml-1 font-mono text-grid-200">
                    Password@123
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- RIGHT: badge at the top, headline + stats at the bottom ---------- */}
        <div className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:px-10 lg:pb-10 lg:pt-8 xl:px-14 xl:pb-12">
          {/* Top: aligned with the logo row */}
          <div className="flex h-10 items-center justify-end">
            <div className="inline-flex items-center gap-2 rounded-full border border-volt-400/30 bg-volt-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-volt-300 backdrop-blur-md">
              <BrainCircuit size={14} />
              EV charging
            </div>
          </div>

          {/* Bottom */}
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl font-bold leading-tight text-white xl:text-5xl">
              Your next charge,{" "}
              <span className="text-volt-300">intelligently planned.</span>
            </h1>

            <div className="mt-5 flex flex-wrap gap-2">
              <div className="flex items-baseline gap-2 rounded-full border border-white/10 bg-grid-950/60 px-4 py-2 backdrop-blur-md">
                <span className="font-display text-lg font-bold text-white">
                  15+
                </span>
                <span className="text-xs text-grid-300">decision factors</span>
              </div>

              <div className="flex items-baseline gap-2 rounded-full border border-white/10 bg-grid-950/60 px-4 py-2 backdrop-blur-md">
                <span className="font-display text-lg font-bold text-white">
                  AI
                </span>
                <span className="text-xs text-grid-300">
                  predictive intelligence
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}