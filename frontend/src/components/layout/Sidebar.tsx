import { NavLink } from "react-router-dom";
import {
  Home,
  MapPinned,
  BrainCircuit,
  CalendarClock,
  History,
  BarChart3,
  User,
  Settings,
  LogOut,
  Zap,
  Heart,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const menu = [
  {
    title: "MAIN",
    items: [
      { icon: Home, label: "Dashboard", path: "/dashboard" },
      { icon: MapPinned, label: "Find Charger", path: "/map" },
      { icon: BrainCircuit, label: "AI Recommendation", path: "/predictions" },
      { icon: Zap, label: "Charging", path: "/charging" },
      { icon: CalendarClock, label: "My Bookings", path: "/bookings" },
      { icon: History, label: "History", path: "/history" },
    ],
  },
  {
    title: "BUSINESS",
    items: [
      { icon: BarChart3, label: "Analytics", path: "/analytics" },
      { icon: Heart, label: "Favorites", path: "/favorites" },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { icon: User, label: "Profile", path: "/profile" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-grid-800 bg-grid-900">
      {/* Logo */}
      <div className="border-b border-grid-800 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-volt-500/15">
            <Zap className="text-volt-400" size={22} />
          </div>

          <div>
            <h1 className="font-display text-xl font-bold text-grid-50">
              VoltGrid
            </h1>

            <p className="text-xs text-grid-400">
              Smart EV Platform
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-5">

        {menu.map((group) => (
          <div key={group.title} className="mb-7">

            <p className="mb-3 px-3 text-xs font-semibold tracking-widest text-grid-500">
              {group.title}
            </p>

            <div className="space-y-1">

              {group.items.map((item) => {

                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-3 transition-all ${
                        isActive
                          ? "bg-volt-500 text-white shadow-lg"
                          : "text-grid-300 hover:bg-grid-800 hover:text-white"
                      }`
                    }
                  >
                    <Icon size={18} />

                    <span>{item.label}</span>
                  </NavLink>
                );

              })}

            </div>

          </div>
        ))}

      </div>

      {/* User */}
      <div className="border-t border-grid-800 p-5">

        <div className="mb-4">

          <h3 className="font-semibold text-grid-100">
            {user?.full_name}
          </h3>

          <p className="text-sm capitalize text-grid-400">
            {user?.role}
          </p>

        </div>

        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl border border-grid-700 px-4 py-3 text-grid-300 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={18} />

          Logout

        </button>

      </div>

    </aside>
  );
}