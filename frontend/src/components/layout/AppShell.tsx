import { type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  MapPin,
  CalendarClock,
  LineChart,
  History,
  Settings,
  User as UserIcon,
  LogOut,
  Zap,
  ShieldCheck,
  Building2,
  Bell,
  Menu,
  X,
  ChevronRight,
  CircleHelp,
  Car,
} from "lucide-react";
import { useState } from "react";

import { useAuth } from "../../context/AuthContext";

const driverLinks = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/map",
    label: "Map & Recommend",
    icon: MapPin,
  },
  {
    to: "/my-ev",
    label: "My EV",
    icon: Car,
  },
  {
    to: "/predictions",
    label: "AI Predictions",
    icon: LineChart,
  },
  {
    to: "/bookings",
    label: "My Bookings",
    icon: CalendarClock,
  },
  {
    to: "/history",
    label: "Charging History",
    icon: History,
  },
  {
    to: "/analytics",
    label: "Sustainability",
    icon: Zap,
  },
];

const operatorLinks = [
  {
    to: "/operator",
    label: "Operator Dashboard",
    icon: Building2,
  },
];

const adminLinks = [
  {
    to: "/admin",
    label: "Admin Dashboard",
    icon: ShieldCheck,
  },
];

export default function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    ...driverLinks,
    ...(user?.role === "operator" ? operatorLinks : []),
    ...(user?.role === "admin" ? adminLinks : []),
  ];

  const firstName =
    user?.full_name?.split(" ")[0] ?? "Driver";

  const initials =
    user?.full_name
      ?.split(" ")
      .map((name) => name[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "U";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isActive = (to: string) => {
    if (to === "/dashboard") {
      return location.pathname === "/dashboard";
    }

    return location.pathname.startsWith(to);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* =====================================================
          MOBILE OVERLAY
      ===================================================== */}

      {mobileOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        {/* LOGO */}

        <div className="flex h-[82px] items-center justify-between border-b border-slate-100 px-6">

          <Link
            to="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3"
          >

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
              <Zap
                size={21}
                strokeWidth={2.5}
              />
            </div>

            <div>
              <div className="font-display text-xl font-bold tracking-tight text-slate-900">
                Volt<span className="text-teal-700">Grid</span>
              </div>

              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                EV Intelligence
              </p>
            </div>

          </Link>

          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <X size={19} />
          </button>

        </div>

        {/* NAVIGATION */}

        <div className="flex-1 overflow-y-auto px-4 py-6">

          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Workspace
          </p>

          <nav className="space-y-1">

            {links.map(
              ({
                to,
                label,
                icon: Icon,
              }) => {
                const active = isActive(to);

                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() =>
                      setMobileOpen(false)
                    }
                    className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 ${
                      active
                        ? "bg-teal-50 text-teal-700"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >

                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                        active
                          ? "bg-teal-100 text-teal-700"
                          : "bg-transparent text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-700"
                      }`}
                    >
                      <Icon size={18} />
                    </span>

                    <span className="flex-1">
                      {label}
                    </span>

                    {active && (
                      <ChevronRight
                        size={15}
                        className="text-teal-600"
                      />
                    )}

                  </Link>
                );
              },
            )}

          </nav>

          {/* ACCOUNT */}

          <div className="mt-8">

            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Account
            </p>

            <nav className="space-y-1">

              {/* PROFILE */}

              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  isActive("/profile")
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >

                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:text-slate-700">
                  <UserIcon size={18} />
                </span>

                Profile

              </Link>

              {/* SETTINGS */}

              <Link
                to="/settings"
                onClick={() => setMobileOpen(false)}
                className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  isActive("/settings")
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >

                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:text-slate-700">
                  <Settings size={18} />
                </span>

                Settings

              </Link>

            </nav>

          </div>

        </div>

        {/* SIDEBAR FOOTER */}

        <div className="border-t border-slate-100 p-4">

          <div className="mb-3 rounded-xl bg-slate-50 p-3">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                {initials}
              </div>

              <div className="min-w-0 flex-1">

                <p className="truncate text-sm font-semibold text-slate-800">
                  {user?.full_name ?? "User"}
                </p>

                <p className="truncate text-[11px] capitalize text-slate-400">
                  {user?.role ?? "driver"}
                </p>

              </div>

            </div>

          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={17} />
            Sign out
          </button>

        </div>

      </aside>

      {/* =====================================================
          MAIN AREA
      ===================================================== */}

      <div className="min-h-screen lg:pl-[270px]">

        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="sticky top-0 z-30 flex h-[82px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">

          <div className="flex items-center gap-3">

            {/* MOBILE MENU */}

            <button
              onClick={() =>
                setMobileOpen(true)
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
            >
              <Menu size={20} />
            </button>

            <div>

              <p className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700 sm:block">
                EV Charging Network
              </p>

              <h1 className="font-display text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                Welcome back, {firstName}
              </h1>

            </div>

          </div>

          <div className="flex items-center gap-3">

            {/* HELP */}

            <button
              title="Help"
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 sm:flex"
            >
              <CircleHelp size={18} />
            </button>

            {/* NOTIFICATIONS */}

            <button
              title="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
            >
              <Bell size={18} />

              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-white bg-teal-500" />
            </button>

            {/* PROFILE */}

            <Link
              to="/profile"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700 ring-1 ring-teal-100 transition hover:bg-teal-100"
            >
              {initials}
            </Link>

          </div>

        </header>

        {/* ===================================================
            CONTENT
        =================================================== */}

        <main className="min-h-[calc(100vh-82px)] bg-slate-50 p-4 sm:p-6 lg:p-8">

          <div className="mx-auto max-w-[1600px]">
            {children}
          </div>

        </main>

      </div>

    </div>
  );
}