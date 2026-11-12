import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Mail, Phone, User, UserCircle } from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

/* ============================================================
   SHARED STYLES (light + dark) - same tokens as the other pages
============================================================ */

const CARD =
  "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-grid-700/70 dark:bg-grid-850/90 dark:shadow-card";
const DIVIDER = "border-slate-200 dark:border-grid-700/70";
const HEADING = "text-slate-900 dark:text-grid-50";
const BODY = "text-slate-600 dark:text-grid-300";
const MUTED = "text-slate-500 dark:text-grid-400";
const LABEL =
  "mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-grid-200";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-volt-400 dark:focus-visible:ring-offset-grid-950";

const INPUT =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-grid-700 dark:bg-grid-900 dark:text-grid-50 dark:placeholder:text-grid-500 dark:focus:border-volt-400 dark:focus:ring-volt-400/20 dark:disabled:bg-grid-900/50 dark:disabled:text-grid-400";

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-volt-500 dark:text-grid-950 dark:hover:bg-volt-400";

/* ============================================================
   HELPERS
============================================================ */

/** Empty is allowed. Otherwise 7 to 15 digits, with + ( ) - and spaces. */
function validatePhone(value: string): string | null {
  const text = value.trim();

  if (!text) return null;

  if (!/^[+()\-\s\d]+$/.test(text)) {
    return "Use only digits, spaces and + ( ) -.";
  }

  const digits = text.replace(/\D/g, "");

  if (digits.length < 7 || digits.length > 15) {
    return "Enter a phone number with 7 to 15 digits.";
  }

  return null;
}

/** Prefer the backend's message (FastAPI `detail`) over a generic one. */
function errorMessage(error: unknown) {
  const detail = (error as { response?: { data?: { detail?: unknown } } })
    ?.response?.data?.detail;

  if (typeof detail === "string" && detail) return detail;

  return "Unable to update your profile. Please try again.";
}

/* ============================================================
   PAGE
============================================================ */

export default function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saved, setSaved] = useState(false);
  const [touched, setTouched] = useState(false);

  const timerRef = useRef<number | null>(null);

  // The user can load after the first render (page refresh), so keep the
  // form in step with the account data.
  useEffect(() => {
    setFullName(user?.full_name ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.full_name, user?.phone]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const nameError = fullName.trim() ? null : "Enter your full name.";
  const phoneError = validatePhone(phone);

  const unchanged =
    fullName.trim() === (user?.full_name ?? "").trim() &&
    phone.trim() === (user?.phone ?? "").trim();

  const updateMutation = useMutation({
    mutationFn: async () =>
      api.put("/users/me", {
        full_name: fullName.trim(),
        phone: phone.trim(),
      }),

    onSuccess: () => {
      setSaved(true);
      setTouched(false);

      queryClient.invalidateQueries({ queryKey: ["me"] });

      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setSaved(false), 2500);
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setTouched(true);
    setSaved(false);

    if (nameError || phoneError) return;

    updateMutation.mutate();
  }

  const initials = user?.full_name?.trim()?.[0]?.toUpperCase() ?? "U";

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-volt-300">
            Account
          </p>

          <h1 className={`mt-1 font-display text-2xl font-bold ${HEADING}`}>
            Profile
          </h1>

          <p className={`mt-1 text-sm ${BODY}`}>
            Manage your personal information and contact details.
          </p>
        </div>

        <div className={`${CARD} overflow-hidden`}>
          {/* IDENTITY */}

          <div
            className={`border-b bg-slate-50 p-6 dark:bg-grid-900/40 ${DIVIDER}`}
          >
            <div className="flex items-center gap-4">
              <div
                aria-hidden="true"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-teal-200 bg-teal-50 font-display text-2xl font-bold text-teal-700 dark:border-volt-400/20 dark:bg-volt-500/15 dark:text-volt-300"
              >
                {initials}
              </div>

              <div className="min-w-0">
                <h2
                  className={`truncate font-display text-xl font-bold ${HEADING}`}
                >
                  {user?.full_name || "Your profile"}
                </h2>

                <p className={`mt-1 text-sm capitalize ${BODY}`}>
                  {user?.role ?? "driver"}
                </p>
              </div>
            </div>
          </div>

          {/* FORM */}

          <form onSubmit={handleSubmit} noValidate className="space-y-5 p-6">
            <div>
              <label htmlFor="profile-name" className={LABEL}>
                <User size={15} className={MUTED} /> Full name
              </label>

              <input
                id="profile-name"
                className={INPUT}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
                aria-invalid={touched && Boolean(nameError)}
                aria-describedby={
                  touched && nameError ? "profile-name-error" : undefined
                }
              />

              {touched && nameError && (
                <p
                  id="profile-name-error"
                  className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-300"
                >
                  {nameError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="profile-email" className={LABEL}>
                <Mail size={15} className={MUTED} /> Email
              </label>

              <input
                id="profile-email"
                className={INPUT}
                value={user?.email ?? ""}
                disabled
                readOnly
                aria-describedby="profile-email-hint"
              />

              <p id="profile-email-hint" className={`mt-1.5 text-xs ${MUTED}`}>
                Your email is linked to your account and can't be changed here.
              </p>
            </div>

            <div>
              <label htmlFor="profile-phone" className={LABEL}>
                <Phone size={15} className={MUTED} /> Phone
              </label>

              <input
                id="profile-phone"
                className={INPUT}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Enter your phone number"
                type="tel"
                autoComplete="tel"
                aria-invalid={touched && Boolean(phoneError)}
                aria-describedby={
                  touched && phoneError ? "profile-phone-error" : undefined
                }
              />

              {touched && phoneError && (
                <p
                  id="profile-phone-error"
                  className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-300"
                >
                  {phoneError}
                </p>
              )}
            </div>

            <div
              className={`flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between ${DIVIDER}`}
            >
              <div className="min-h-5" aria-live="polite">
                {saved && (
                  <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-volt-300">
                    <Check size={16} /> Profile updated.
                  </p>
                )}

                {updateMutation.isError && (
                  <p
                    role="alert"
                    className="text-sm font-medium text-red-600 dark:text-red-300"
                  >
                    {errorMessage(updateMutation.error)}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className={`${BTN_PRIMARY} w-full sm:w-auto ${FOCUS}`}
                disabled={updateMutation.isPending || unchanged}
              >
                {updateMutation.isPending ? (
                  <Loader2
                    size={18}
                    className="animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <UserCircle size={18} />
                )}
                {updateMutation.isPending ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}