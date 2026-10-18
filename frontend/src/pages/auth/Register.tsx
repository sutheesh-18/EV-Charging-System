import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Zap,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  BrainCircuit,
  CheckCircle2,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("driver");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);
    setLoading(true);

    try {
      await register({
        full_name: fullName,
        email,
        password,
        phone,
        role,
      });

      navigate("/login");
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-grid-950">

      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-volt-400/5 blur-[130px]" />
        <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-teal-400/5 blur-[130px]" />
      </div>

      {/* =====================================================
          LEFT PRODUCT SECTION
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

          {/* Product message */}
          <div className="max-w-lg">

            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-volt-400/20 bg-volt-400/5 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-volt-300">
              <BrainCircuit size={14} />
              Intelligent EV charging
            </div>

            <h1 className="font-display text-5xl font-bold leading-tight text-white xl:text-6xl">
              Stop searching.
              <br />

              <span className="text-volt-300">
                Start charging smarter.
              </span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-7 text-grid-400">
              Create your VoltGrid account and get personalized charging
              recommendations based on battery range, station availability,
              predicted queues and charging cost.
            </p>

            {/* Benefits */}
            <div className="mt-8 space-y-4">

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-400">
                  <CheckCircle2 size={17} />
                </div>

                <span className="text-sm text-grid-300">
                  AI-powered station recommendations
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-400">
                  <CheckCircle2 size={17} />
                </div>

                <span className="text-sm text-grid-300">
                  Real-time charging availability
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-400">
                  <CheckCircle2 size={17} />
                </div>

                <span className="text-sm text-grid-300">
                  Predictive queue and waiting-time intelligence
                </span>
              </div>

            </div>
          </div>

          <p className="text-xs text-grid-600">
            Intelligent EV charging infrastructure
          </p>
        </div>
      </div>

      {/* =====================================================
          REGISTER SECTION
      ===================================================== */}

      <div className="relative flex w-full items-center justify-center border-l border-grid-800 bg-grid-950/80 px-6 py-10 lg:max-w-xl xl:max-w-2xl">

        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <Link
            to="/"
            className="mb-8 flex items-center justify-center gap-3 lg:hidden"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-volt-400/20 bg-volt-400/10 text-volt-300">
              <Zap size={21} strokeWidth={2.5} />
            </div>

            <span className="font-display text-xl font-bold text-white">
              Volt<span className="text-volt-400">Grid</span>
            </span>
          </Link>

          {/* Register card */}
          <div className="rounded-3xl border border-grid-800 bg-grid-900/90 p-7 shadow-card-lg sm:p-9">

            {/* Heading */}
            <div className="mb-7">
              <p className="label-eyebrow">
                Get started
              </p>

              <h2 className="mt-2 font-display text-3xl font-bold text-grid-50">
                Create your account
              </h2>

              <p className="mt-2 text-sm leading-6 text-grid-500">
                Join VoltGrid and make every charging decision smarter.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Full name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-grid-300">
                  Full name
                </label>

                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field"
                  placeholder="Enter your full name"
                />
              </div>

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

              {/* Phone */}
              <div>
                <label className="mb-2 block text-sm font-medium text-grid-300">
                  Phone number
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field"
                  placeholder="+91 98765 43210"
                />
              </div>

              {/* Role */}
              <div>
                <label className="mb-2 block text-sm font-medium text-grid-300">
                  Account type
                </label>

                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="input-field"
                >
                  <option value="driver">EV Driver</option>
                  <option value="operator">Station Operator</option>
                </select>
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-sm font-medium text-grid-300">
                  Password
                </label>

                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="Create a strong password"
                />

                <p className="mt-1.5 text-xs text-grid-600">
                  Use at least 8 characters.
                </p>
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
                className="btn-primary mt-2 w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <UserPlus size={17} />

                {loading ? "Creating account..." : "Create account"}

                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            {/* Security */}
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-grid-800 bg-grid-950/60 px-4 py-3">
              <ShieldCheck
                size={18}
                className="shrink-0 text-emerald-400"
              />

              <p className="text-xs leading-5 text-grid-500">
                Your account is protected with authenticated access and
                secure API communication.
              </p>
            </div>

            {/* Login */}
            <p className="mt-6 text-center text-sm text-grid-500">
              Already have an account?{" "}

              <Link
                to="/login"
                className="font-semibold text-volt-400 transition hover:text-volt-300"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Footer */}
          <p className="mt-4 text-center text-xs text-grid-600">
            By creating an account, you agree to use VoltGrid responsibly.
          </p>

        </div>
      </div>
    </div>
  );
}