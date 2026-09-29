import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Mail, Phone, UserCircle } from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saved, setSaved] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async () => api.put("/users/me", { full_name: fullName, phone }),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setTimeout(() => setSaved(false), 2500);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    updateMutation.mutate();
  }

  const initials = user?.full_name?.trim()?.[0]?.toUpperCase() ?? "U";

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-volt-400">Account</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-grid-50">Profile</h1>
          <p className="mt-1 text-sm text-grid-300">Manage your personal information and contact details.</p>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-grid-700/70 bg-grid-900/40 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-volt-400/20 bg-volt-500/15 font-display text-2xl font-bold text-volt-300 shadow-[0_0_28px_rgba(45,212,191,0.08)]">
                {initials}
              </div>
              <div className="min-w-0">
                <h2 className="truncate font-display text-xl font-bold text-grid-50">
                  {user?.full_name || "Your profile"}
                </h2>
                <p className="mt-1 text-sm capitalize text-grid-300">{user?.role ?? "driver"}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-grid-200">Full name</label>
              <input
                className="input-field"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-grid-200">
                <Mail size={15} className="text-grid-400" /> Email
              </label>
              <input
                className="input-field cursor-not-allowed opacity-60"
                value={user?.email ?? ""}
                disabled
              />
              <p className="mt-1.5 text-xs text-grid-400">Email is linked to your account and cannot be edited here.</p>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-grid-200">
                <Phone size={15} className="text-grid-400" /> Phone
              </label>
              <input
                className="input-field"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                type="tel"
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-grid-700/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-h-5">
                {saved && (
                  <p className="flex items-center gap-2 text-sm font-medium text-volt-300">
                    <Check size={16} /> Profile updated successfully.
                  </p>
                )}
                {updateMutation.isError && (
                  <p className="text-sm font-medium text-red-300">Unable to update your profile. Please try again.</p>
                )}
              </div>

              <button type="submit" className="btn-primary w-full sm:w-auto" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <UserCircle size={18} />}
                {updateMutation.isPending ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
