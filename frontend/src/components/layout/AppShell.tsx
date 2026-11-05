import { useEffect, useState, type ElementType, type ReactNode } from "react";
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

import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../common/ThemeToggle";

/* ============================================================
   NAVIGATION
   `also` = extra URL prefixes that should keep the item highlighted
   (e.g. /booking/12 belongs to "My Bookings")
============================================================ */

type NavLinkItem = {
  to: string;
  label: string;
  icon: ElementType;
  also?: string[];
};

const driverLinks: NavLinkItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    to: "/map",
    label: "Map & Recommend",
    icon: MapPin,
    also: ["/stations"],
  },
  { to: "/my-ev", label: "My EV", icon: Car },
  { to: "/predictions", label: "AI Predictions", icon: LineChart },
  {
    to: "/bookings",
    label: "My Bookings",
    icon: CalendarClock,
    also: ["/booking"],
  },
  { to: "/history", label: "Charging History", icon: History },
  { to: "/analytics", label: "Sustainability", icon: Zap },
];

const operatorLinks: NavLinkItem[] = [
  { to: "/operator", label: "Operator Dashboard", icon: Building2 },
];

const adminLinks: NavLinkItem[] = [
  { to: "/admin", label: "Admin Dashboard", icon: ShieldCheck },
];

const accountLinks: NavLinkItem[] = [
  { to: "/profile", label: "Profile", icon: UserIcon },
  { to: "/settings", label: "Settings", icon: Settings },
];

/* Title shown in the top bar for each page */
function getPageTitle(pathname: string, firstName: string) {
  if (pathname === "/dashboard") return `Welcome back, ${firstName}`;
  if (pathname.startsWith("/map")) return "Map & Recommend";
  if (pathname.startsWith("/stations")) return "Station details";
  if (pathname.startsWith("/my-ev")) return "My EV";
  if (pathname.startsWith("/predictions")) return "AI Predictions";
  if (pathname.startsWith("/bookings")) return "My Bookings";
  if (pathname.startsWith("/booking")) return "Book a charger";
  if (pathname.startsWith("/history")) return "Charging History";
  if (pathname.startsWith("/analytics")) return "Sustainability";
  if (pathname.startsWith("/profile")) return "Profile";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/operator")) return "Operator Dashboard";
  if (pathname.startsWith("/admin")) return "Admin Dashboard";
  return "VoltGrid";
}

/* ============================================================
   SHELL
============================================================ */

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);

  const firstName = user?.full_name?.split(" ")[0] ?? "Driver";

  const initials =
    user?.full_name
      ?.split(" ")
      .map((name) => name[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "U";

  const roleLinks = [
    ...(user?.role === "operator" ? operatorLinks : []),
    ...(user?.role === "admin" ? adminLinks : []),
  ];

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isActive = ({ to, also }: NavLinkItem) => {
    const path = location.pathname;
    if (to === "/dashboard") return path === "/dashboard";
    return [to, ...(also ?? [])].some((prefix) => path.startsWith(prefix));
  };

  // close the mobile menu whenever the page changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // close with the Escape key
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-grid-950 dark:text-grid-100">
      {/* =====================================================
          MOBILE OVERLAY
      ===================================================== */}

      {mobileOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-slate-200 bg-white transition-transform duration-300 dark:border-grid-800 dark:bg-grid-900 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* LOGO */}

        <div className="flex h-[82px] items-center justify-between border-b border-slate-100 px-6 dark:border-grid-800">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm dark:bg-volt-500 dark:text-grid-950 dark:shadow-glow">
              <Zap size={21} strokeWidth={2.5} />
            </div>

            <div>
              <div className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Volt
                <span className="text-teal-700 dark:text-volt-400">Grid</span>
              </div>

              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-grid-400">
                EV Intelligence
              </p>
            </div>
          </Link>

          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-grid-800 dark:hover:text-grid-100 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        {/* NAVIGATION */}

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <SectionLabel>Workspace</SectionLabel>

          <nav className="space-y-1" aria-label="Workspace">
            {driverLinks.map((item) => (
              <NavItem key={item.to} item={item} active={isActive(item)} chevron />
            ))}
          </nav>

          {roleLinks.length > 0 && (
            <div className="mt-8">
              <SectionLabel>Management</SectionLabel>

              <nav className="space-y-1" aria-label="Management">
                {roleLinks.map((item) => (
                  <NavItem
                    key={item.to}
                    item={item}
                    active={isActive(item)}
                    chevron
                  />
                ))}
              </nav>
            </div>
          )}

          <div className="mt-8">
            <SectionLabel>Account</SectionLabel>

            <nav className="space-y-1" aria-label="Account">
              {accountLinks.map((item) => (
                <NavItem key={item.to} item={item} active={isActive(item)} />
              ))}
            </nav>
          </div>
        </div>

        {/* SIDEBAR FOOTER */}

        <div className="border-t border-slate-100 p-4 dark:border-grid-800">
          <div className="mb-3 rounded-xl bg-slate-50 p-3 dark:bg-grid-850">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-volt-500/20 dark:text-volt-300">
                {initials}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-grid-50">
                  {user?.full_name ?? "User"}
                </p>

                <p className="truncate text-[11px] capitalize text-slate-400 dark:text-grid-400">
                  {user?.role ?? "driver"}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-grid-300 dark:hover:bg-red-500/10 dark:hover:text-red-300"
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
        {/* HEADER */}

        <header className="sticky top-0 z-30 flex h-[82px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md dark:border-grid-800 dark:bg-grid-900/90 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {/* MOBILE MENU */}

            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-grid-700 dark:text-grid-200 dark:hover:bg-grid-850 lg:hidden"
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0">
              <p className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-volt-300 sm:block">
                EV Charging Network
              </p>

              <h1 className="truncate font-display text-lg font-bold tracking-tight text-slate-900 dark:text-grid-50 sm:text-xl">
                {getPageTitle(location.pathname, firstName)}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* THEME */}

            <ThemeToggle />

            {/* HELP */}

            <button
              title="Help"
              aria-label="Help"
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 dark:border-grid-700 dark:text-grid-300 dark:hover:border-volt-500/40 dark:hover:bg-grid-850 dark:hover:text-volt-300 sm:flex"
            >
              <CircleHelp size={18} />
            </button>

            {/* NOTIFICATIONS */}

            <button
              title="Notifications"
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 dark:border-grid-700 dark:text-grid-300 dark:hover:border-volt-500/40 dark:hover:bg-grid-850 dark:hover:text-volt-300"
            >
              <Bell size={18} />

              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-white bg-teal-500 dark:border-grid-900 dark:bg-volt-400" />
            </button>

            {/* PROFILE */}

            <Link
              to="/profile"
              aria-label="Profile"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700 ring-1 ring-teal-100 transition hover:bg-teal-100 dark:bg-volt-500/15 dark:text-volt-300 dark:ring-volt-500/30 dark:hover:bg-volt-500/25"
            >
              {initials}
            </Link>
          </div>
        </header>

        {/* CONTENT */}

        <main className="min-h-[calc(100vh-82px)] bg-slate-50 p-4 dark:bg-grid-950 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

/* ============================================================
   PIECES
============================================================ */

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-grid-500">
      {children}
    </p>
  );
}

function NavItem({
  item,
  active,
  chevron = false,
}: {
  item: NavLinkItem;
  active: boolean;
  chevron?: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 ${
        active
          ? "bg-teal-50 text-teal-700 dark:bg-volt-500/10 dark:text-volt-300"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-grid-300 dark:hover:bg-grid-850 dark:hover:text-grid-50"
      }`}
    >
      {/* active accent bar */}
      <span
        className={`absolute -left-4 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-teal-600 transition-opacity dark:bg-volt-400 ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />

      <span
        className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
          active
            ? "bg-teal-100 text-teal-700 dark:bg-volt-500/20 dark:text-volt-300"
            : "bg-transparent text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-700 dark:text-grid-400 dark:group-hover:bg-grid-800 dark:group-hover:text-grid-100"
        }`}
      >
        <Icon size={18} />
      </span>

      <span className="flex-1">{item.label}</span>

      {chevron && active && (
        <ChevronRight
          size={15}
          className="text-teal-600 dark:text-volt-400"
        />
      )}
    </Link>
  );
}