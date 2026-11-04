import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Zap,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  BrainCircuit,
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
    <div className="relative min-h-screen overflow-hidden bg-grid-950">
      {/* =====================================================
          FULL-SCREEN BACKGROUND IMAGE
          Same image as the landing and login pages:
          public/images/voltgrid-hero.png
          The dark half of the photo sits behind the form,
          the car and charger stay visible on the right.
      ===================================================== */}
      <img
        src="/images/voltgrid-hero.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 h-full w-full object-cover object-[78%_bottom] lg:object-right"
      />

      {/* Shade behind the form column only */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-r from-grid-950/85 via-grid-950/40 to-transparent lg:from-grid-950/80 lg:via-grid-950/20 lg:to-transparent" />

      {/* Extra shade on small screens so the form is always readable */}
      <div className="pointer-events-none fixed inset-0 bg-grid-950/45 lg:hidden" />

      {/* =====================================================
          CONTENT
      ===================================================== */}
      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1500px] lg:grid-cols-[minmax(0,34rem)_1fr]">
        {/* ---------- LEFT: logo + register form ---------- */}
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
            <div className="relative w-full">
              {/* Glow behind the card */}
              <div className="absolute -inset-4 rounded-[2rem] bg-volt-400/10 blur-3xl" />

              {/* Register card (frosted glass) */}
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-grid-900/70 p-7 shadow-card-lg backdrop-blur-xl sm:p-9">
                {/* Top accent line */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt-400/70 to-transparent" />

                {/* Heading */}
                <div className="mb-7">
                  <p className="label-eyebrow">Get started</p>

                  <h2 className="mt-2 font-display text-3xl font-bold text-grid-50">
                    Create your account
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-grid-400">
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

                    <p className="mt-1.5 text-xs text-grid-500">
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
                <div className="mt-6 flex items-center gap-3 rounded-xl border border-white/10 bg-grid-950/50 px-4 py-3">
                  <ShieldCheck size={18} className="shrink-0 text-emerald-400" />

                  <p className="text-xs leading-5 text-grid-400">
                    Your account is protected with authenticated access and
                    secure API communication.
                  </p>
                </div>

                {/* Login */}
                <p className="mt-6 text-center text-sm text-grid-400">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-volt-400 transition hover:text-volt-300"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-grid-400 lg:text-left">
            By creating an account, you agree to use VoltGrid responsibly.
          </p>
        </div>

        {/* ---------- RIGHT: badge at the top, rest of the image stays clear ---------- */}
        <div className="hidden lg:sticky lg:top-0 lg:block lg:h-screen lg:px-10 lg:pt-8 xl:px-14">
          <div className="flex h-10 items-center justify-end">
            <div className="inline-flex items-center gap-2 rounded-full border border-volt-400/30 bg-volt-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-volt-300 backdrop-blur-md">
              <BrainCircuit size={14} />
              Intelligent EV charging
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}