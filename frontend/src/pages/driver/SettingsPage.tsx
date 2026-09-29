import { useState } from "react";
import {
  Bell,
  ShieldCheck,
  Smartphone,
  Moon,
  MapPin,
  Zap,
  Save,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [bookingAlerts, setBookingAlerts] = useState(true);
  const [predictionAlerts, setPredictionAlerts] = useState(true);
  const [locationServices, setLocationServices] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    localStorage.setItem(
      "voltgrid_settings",
      JSON.stringify({
        notifications,
        bookingAlerts,
        predictionAlerts,
        locationServices,
        darkMode,
      }),
    );

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">

        {/* PAGE HEADER */}
        <section>
          <p className="label-eyebrow">
            Personal preferences
          </p>

          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-grid-50">
            Settings
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-grid-300">
            Manage your VoltGrid experience, notification preferences,
            location access and charging recommendations.
          </p>
        </section>

        {/* SETTINGS GRID */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* MAIN SETTINGS */}
          <div className="space-y-6 lg:col-span-2">

            {/* NOTIFICATIONS */}
            <section className="card overflow-hidden">

              <div className="border-b border-grid-800 p-6">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-volt-400/10 text-volt-400">
                    <Bell size={19} />
                  </div>

                  <div>
                    <h2 className="font-display text-base font-bold text-grid-50">
                      Notifications
                    </h2>

                    <p className="mt-1 text-xs text-grid-400">
                      Control when VoltGrid sends you updates.
                    </p>
                  </div>

                </div>

              </div>

              <div className="divide-y divide-grid-800">

                <SettingRow
                  title="Push notifications"
                  description="Receive important updates from VoltGrid."
                  enabled={notifications}
                  onChange={setNotifications}
                />

                <SettingRow
                  title="Booking alerts"
                  description="Get notified about upcoming and changed bookings."
                  enabled={bookingAlerts}
                  onChange={setBookingAlerts}
                  disabled={!notifications}
                />

                <SettingRow
                  title="AI prediction alerts"
                  description="Receive alerts when station congestion is expected to change."
                  enabled={predictionAlerts}
                  onChange={setPredictionAlerts}
                  disabled={!notifications}
                />

              </div>

            </section>

            {/* PRIVACY & LOCATION */}
            <section className="card overflow-hidden">

              <div className="border-b border-grid-800 p-6">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-400/10 text-blue-400">
                    <ShieldCheck size={19} />
                  </div>

                  <div>
                    <h2 className="font-display text-base font-bold text-grid-50">
                      Privacy & location
                    </h2>

                    <p className="mt-1 text-xs text-grid-400">
                      Manage permissions used for smarter recommendations.
                    </p>
                  </div>

                </div>

              </div>

              <div className="divide-y divide-grid-800">

                <SettingRow
                  title="Location services"
                  description="Allow VoltGrid to use your location for nearby station recommendations."
                  enabled={locationServices}
                  onChange={setLocationServices}
                  icon={MapPin}
                />

                <div className="flex items-center justify-between gap-5 p-5">

                  <div className="flex items-start gap-3">

                    <div className="mt-0.5 text-grid-300">
                      <Smartphone size={18} />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-grid-200">
                        Device information
                      </p>

                      <p className="mt-1 max-w-md text-xs leading-5 text-grid-400">
                        Basic device information may be used to improve
                        application performance and reliability.
                      </p>
                    </div>

                  </div>

                  <span className="shrink-0 rounded-full border border-volt-400/20 bg-volt-400/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-volt-300">
                    Protected
                  </span>

                </div>

              </div>

            </section>

            {/* APPEARANCE */}
            <section className="card overflow-hidden">

              <div className="border-b border-grid-800 p-6">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-400/10 text-purple-300">
                    <Moon size={19} />
                  </div>

                  <div>
                    <h2 className="font-display text-base font-bold text-grid-50">
                      Appearance
                    </h2>

                    <p className="mt-1 text-xs text-grid-400">
                      Customize how VoltGrid looks on your device.
                    </p>
                  </div>

                </div>

              </div>

              <div className="p-5">

                <div className="flex items-center justify-between gap-5">

                  <div>
                    <p className="text-sm font-medium text-grid-200">
                      Dark interface
                    </p>

                    <p className="mt-1 text-xs leading-5 text-grid-400">
                      Use VoltGrid's dark interface optimized for
                      dashboards and charging data.
                    </p>
                  </div>

                  <Toggle
                    enabled={darkMode}
                    onChange={setDarkMode}
                  />

                </div>

              </div>

            </section>

          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-6">

            {/* RECOMMENDATION */}
            <section className="relative overflow-hidden rounded-2xl border border-volt-400/20 bg-grid-900/90 p-6 shadow-lg shadow-grid-950/20 transition-colors hover:border-volt-400/30">

              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-volt-400/10 blur-3xl opacity-70" />

              <div className="relative">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-volt-400/10 text-volt-400">
                  <Zap size={20} />
                </div>

                <h3 className="mt-5 font-display text-lg font-bold text-grid-50">
                  Smart charging
                </h3>

                <p className="mt-2 text-sm leading-6 text-grid-300">
                  VoltGrid uses your preferences together with
                  station availability, queue predictions and
                  charging data to improve recommendations.
                </p>

                <div className="mt-5 flex items-center gap-2 text-xs font-medium text-volt-300">
                  <CheckCircle2 size={15} />
                  AI recommendations enabled
                </div>

              </div>

            </section>

            {/* ACCOUNT SETTINGS */}
            <section className="card p-5">

              <p className="label-eyebrow">
                Account
              </p>

              <div className="mt-4 divide-y divide-grid-800">

                <button className="flex w-full items-center justify-between py-3 text-left">

                  <div>
                    <p className="text-sm font-medium text-grid-200">
                      Profile
                    </p>

                    <p className="mt-1 text-xs text-grid-400">
                      Update your personal information.
                    </p>
                  </div>

                  <ChevronRight
                    size={16}
                    className="text-grid-400"
                  />

                </button>

                <button className="flex w-full items-center justify-between py-3 text-left">

                  <div>
                    <p className="text-sm font-medium text-grid-200">
                      Security
                    </p>

                    <p className="mt-1 text-xs text-grid-400">
                      Manage your account security.
                    </p>
                  </div>

                  <ChevronRight
                    size={16}
                    className="text-grid-400"
                  />

                </button>

              </div>

            </section>

            {/* SAVE */}
            <button
              type="button"
              onClick={handleSave}
              className="btn-primary w-full"
            >
              {saved ? (
                <>
                  <CheckCircle2 size={18} />
                  Settings saved
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save preferences
                </>
              )}
            </button>

          </div>

        </div>

        {/* FOOTER INFO */}
        <div className="flex flex-col gap-2 border-t border-grid-800 pt-5 text-xs text-grid-400 sm:flex-row sm:items-center sm:justify-between">

          <span>
            VoltGrid preferences are stored securely on this device.
          </span>

          <span className="font-mono">
            v1.0.0
          </span>

        </div>

      </div>
    </AppShell>
  );
}

/* ============================================================
   SETTING ROW
============================================================ */

function SettingRow({
  title,
  description,
  enabled,
  onChange,
  disabled = false,
  icon: Icon,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  icon?: typeof MapPin;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-5 p-5 transition ${
        disabled ? "opacity-40" : ""
      }`}
    >

      <div className="flex items-start gap-3">

        {Icon && (
          <div className="mt-0.5 text-grid-300">
            <Icon size={18} />
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-grid-200">
            {title}
          </p>

          <p className="mt-1 max-w-xl text-xs leading-5 text-grid-400">
            {description}
          </p>
        </div>

      </div>

      <Toggle
        enabled={enabled}
        onChange={onChange}
        disabled={disabled}
      />

    </div>
  );
}

/* ============================================================
   TOGGLE
============================================================ */

function Toggle({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      aria-label="Toggle setting"
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        enabled
          ? "bg-volt-500"
          : "bg-grid-700"
      } ${
        disabled
          ? "cursor-not-allowed"
          : "cursor-pointer"
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
          enabled
            ? "left-6"
            : "left-1"
        }`}
      />
    </button>
  );
}