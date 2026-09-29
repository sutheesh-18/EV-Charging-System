import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap, UserPlus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Register() {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "", role: "driver" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(form);
      await login(form.email, form.password);
      navigate(form.role === "operator" ? "/operator" : "/dashboard");
    } catch (err: any) {
  console.error("Registration Page Error:", err);

  if (err.response) {
    console.error("Status:", err.response.status);
    console.error("Response:", err.response.data);
  }

  setError(err?.response?.data?.detail || "Registration failed");
} finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-grid-950 bg-grid-lines bg-grid px-6 py-10">
      <div className="card w-full max-w-md p-8">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-volt-500/15 text-volt-400">
            <Zap size={20} strokeWidth={2.5} />
          </div>
          <span className="font-display text-lg font-bold text-grid-50">
            Volt<span className="text-volt-400">Grid</span>
          </span>
        </Link>

        <h1 className="text-center font-display text-2xl font-bold text-grid-50">Create your account</h1>
        <p className="mt-1 text-center text-sm text-grid-400">Join the smart charging network</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-grid-300">Full name</label>
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input-field" placeholder="Asha Driver" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-grid-300">Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="you@example.com" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-grid-300">Phone (optional)</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="+91 98765 43210" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-grid-300">Password</label>
            <input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" placeholder="At least 8 characters" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-grid-300">I am a...</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field">
              <option value="driver">EV Driver</option>
              <option value="operator">Charging Station Operator</option>
            </select>
          </div>
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            <UserPlus size={18} /> {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-grid-400">
          Already have an account? <Link to="/login" className="font-medium text-volt-400 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
