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
    <div className="relative flex min-h-screen overflow-hidden bg-grid-950">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-volt-400/5 blur-[120px]" />

        <div className="absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-teal-400/5 blur-[120px]" />
      </div>

      {/* =====================================================
          LEFT BRANDING SECTION
      ===================================================== */}

      <div className="relative hidden flex-1 lg:flex">
        <div className="flex w-full flex-col justify-between p-10 xl:p-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-volt-400/20 bg-volt-400/10 text-volt-300">
              <Zap size={21} strokeWidth={2.5} />
            </div>

            <span className="font-display text-xl font-bold text-white">
              Volt<span className="text-volt-400">Grid</span>
            </span>
          </Link>

          {/* Main message */}
          <div className="max-w-lg">

            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-volt-400/20 bg-volt-400/5 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-volt-300">
              <BrainCircuit size={14} />
              EV charging
            </div>

            <h1 className="font-display text-5xl font-bold leading-tight text-white xl:text-6xl">
              Your next charge,
              <br />

              <span className="text-volt-300">
                intelligently planned.
              </span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-7 text-grid-400">
              VoltGrid combines real-time station data with AI predictions
              to help EV drivers choose better charging locations.
            </p>

            {/* Stats */}
            <div className="mt-8 grid max-w-md grid-cols-2 gap-3">

              <div className="rounded-2xl border border-grid-800 bg-grid-900/80 p-4">
                <p className="font-display text-2xl font-bold text-white">
                  15+
                </p>

                <p className="mt-1 text-xs text-grid-500">
                  decision factors
                </p>
              </div>

              <div className="rounded-2xl border border-grid-800 bg-grid-900/80 p-4">
                <p className="font-display text-2xl font-bold text-white">
                  AI
                </p>

                <p className="mt-1 text-xs text-grid-500">
                  predictive intelligence
                </p>
              </div>

            </div>
          </div>

          <p className="text-xs text-grid-600">
            Intelligent EV charging infrastructure
          </p>
        </div>
      </div>

      {/* =====================================================
          LOGIN SECTION
      ===================================================== */}

      <div className="relative flex w-full items-center justify-center border-l border-grid-800 bg-grid-950/80 px-6 py-10 lg:max-w-xl xl:max-w-2xl">

        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <Link
            to="/"
            className="mb-10 flex items-center justify-center gap-3 lg:hidden"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-volt-400/20 bg-volt-400/10 text-volt-300">
              <Zap size={21} strokeWidth={2.5} />
            </div>

            <span className="font-display text-xl font-bold text-white">
              Volt<span className="text-volt-400">Grid</span>
            </span>
          </Link>

          {/* Login card */}
          <div className="rounded-3xl border border-grid-800 bg-grid-900/90 p-7 shadow-card-lg sm:p-9">

            {/* Heading */}
            <div className="mb-8">
              <p className="label-eyebrow">
                Welcome back
              </p>

              <h2 className="mt-2 font-display text-3xl font-bold text-grid-50">
                Sign in to VoltGrid
              </h2>

              <p className="mt-2 text-sm leading-6 text-grid-500">
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
              <div className="h-px flex-1 bg-grid-800" />

              <span className="text-[10px] uppercase tracking-widest text-grid-600">
                Secure access
              </span>

              <div className="h-px flex-1 bg-grid-800" />
            </div>

            {/* Security information */}
            <div className="flex items-center gap-3 rounded-xl border border-grid-800 bg-grid-950/60 px-4 py-3">
              <ShieldCheck
                size={18}
                className="shrink-0 text-emerald-400"
              />

              <p className="text-xs leading-5 text-grid-500">
                Your account and charging data are protected by
                authenticated access.
              </p>
            </div>

            {/* Register */}
            <p className="mt-7 text-center text-sm text-grid-500">
              Don't have an account?{" "}

              <Link
                to="/register"
                className="font-semibold text-volt-400 transition hover:text-volt-300"
              >
                Create your account
              </Link>
            </p>
          </div>

          {/* Demo account */}
          <div className="mt-4 rounded-2xl border border-grid-800/80 bg-grid-900/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-grid-600">
              Demo environment
            </p>

            <p className="mt-2 text-xs text-grid-500">
              Driver:
              <span className="ml-1 text-grid-300">
                driver@evcharge.ai
              </span>
            </p>

            <p className="mt-1 text-xs text-grid-500">
              Password:
              <span className="ml-1 font-mono text-grid-300">
                Password@123
              </span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}