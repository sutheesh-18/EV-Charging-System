import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BatteryCharging,
  Building2,
  CalendarClock,
  ChevronDown,
  IndianRupee,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { api } from "../../api/client";
import type { User } from "../../types";

interface AdminOverview {
  total_users: number;
  total_operators: number;
  total_stations: number;
  total_chargers: number;
  total_bookings: number;
  total_revenue: number;
  total_electricity_demand_kwh: number;
}

export default function AdminDashboard() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  /* =========================================================
     ADMIN OVERVIEW
  ========================================================= */

  const {
    data,
    isLoading: overviewLoading,
    isError: overviewError,
  } = useQuery<AdminOverview>({
    queryKey: ["admin-overview"],
    queryFn: async () =>
      (await api.get("/admin/overview")).data,
  });

  /* =========================================================
     USERS
  ========================================================= */

  const {
    data: users = [],
    isLoading: usersLoading,
  } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: async () =>
      (await api.get("/admin/users")).data,
  });

  /* =========================================================
     FILTER USERS
  ========================================================= */

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.full_name
          ?.toLowerCase()
          .includes(query) ||
        user.email
          ?.toLowerCase()
          .includes(query);

      const matchesRole =
        roleFilter === "all" ||
        user.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  /* =========================================================
     DERIVED METRICS
  ========================================================= */

  const activeUsers = users.filter(
    (user) => user.is_active,
  ).length;

  const disabledUsers = users.filter(
    (user) => !user.is_active,
  ).length;

  const totalUsers = data?.total_users ?? 0;

  const activePercentage =
    totalUsers > 0
      ? Math.round(
          (activeUsers / totalUsers) * 100,
        )
      : 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <section>
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

            <div>

              <div className="flex items-center gap-2">
                <ShieldCheck
                  size={18}
                  className="text-volt-400"
                />

                <p className="label-eyebrow">
                  Network operations
                </p>
              </div>

              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-grid-50">
                Admin overview
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-grid-500">
                Monitor the VoltGrid network, understand platform
                activity and keep the charging ecosystem healthy.
              </p>

            </div>

            <div className="flex items-center gap-2 rounded-xl border border-grid-800 bg-grid-900/60 px-3 py-2">

              <span className="h-2 w-2 animate-pulse rounded-full bg-volt-400" />

              <span className="text-xs font-medium text-grid-400">
                Network monitoring active
              </span>

            </div>

          </div>
        </section>

        {/* =====================================================
            ERROR
        ===================================================== */}

        {overviewError && (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-4">

            <div className="flex items-center gap-3">

              <AlertTriangle
                size={18}
                className="text-red-400"
              />

              <div>

                <p className="text-sm font-medium text-red-300">
                  Unable to load network overview
                </p>

                <p className="mt-1 text-xs text-red-300/70">
                  Check that the backend is running and the
                  admin overview endpoint is available.
                </p>

              </div>

            </div>

          </div>
        )}

        {/* =====================================================
            KPI GRID
        ===================================================== */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <AdminMetric
            icon={Users}
            label="Total users"
            value={
              overviewLoading
                ? "..."
                : formatNumber(
                    data?.total_users ?? 0,
                  )
            }
            description="Registered drivers"
            tone="green"
          />

          <AdminMetric
            icon={Building2}
            label="Operators"
            value={
              overviewLoading
                ? "..."
                : formatNumber(
                    data?.total_operators ?? 0,
                  )
            }
            description="Network operators"
            tone="blue"
          />

          <AdminMetric
            icon={Building2}
            label="Stations"
            value={
              overviewLoading
                ? "..."
                : formatNumber(
                    data?.total_stations ?? 0,
                  )
            }
            description="Charging locations"
            tone="purple"
          />

          <AdminMetric
            icon={Zap}
            label="Chargers"
            value={
              overviewLoading
                ? "..."
                : formatNumber(
                    data?.total_chargers ?? 0,
                  )
            }
            description="Connected chargers"
            tone="amber"
          />

        </section>

        {/* =====================================================
            SECONDARY METRICS
        ===================================================== */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

          <AdminMetric
            icon={CalendarClock}
            label="Bookings"
            value={
              overviewLoading
                ? "..."
                : formatNumber(
                    data?.total_bookings ?? 0,
                  )
            }
            description="Total platform bookings"
            tone="blue"
          />

          <AdminMetric
            icon={IndianRupee}
            label="Revenue"
            value={
              overviewLoading
                ? "..."
                : formatCurrency(
                    data?.total_revenue ?? 0,
                  )
            }
            description="Total platform revenue"
            tone="green"
          />

          <AdminMetric
            icon={BatteryCharging}
            label="Energy demand"
            value={
              overviewLoading
                ? "..."
                : formatNumber(
                    data?.total_electricity_demand_kwh ?? 0,
                  )
            }
            suffix="kWh"
            description="Recorded electricity demand"
            tone="amber"
          />

        </section>

        {/* =====================================================
            NETWORK HEALTH
        ===================================================== */}

        <section className="grid gap-6 lg:grid-cols-3">

          <div className="card p-6 lg:col-span-2">

            <div className="flex items-start justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-volt-400/10 text-volt-400">
                    <Activity size={17} />
                  </div>

                  <div>

                    <p className="label-eyebrow">
                      Platform health
                    </p>

                    <h2 className="mt-1 font-display text-lg font-bold text-grid-50">
                      Network snapshot
                    </h2>

                  </div>

                </div>

              </div>

              <span className="rounded-full border border-volt-400/20 bg-volt-400/5 px-2.5 py-1 text-[10px] font-semibold text-volt-300">
                LIVE
              </span>

            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">

              <HealthRow
                icon={Users}
                label="Active users"
                value={`${activeUsers}`}
                percentage={activePercentage}
                status="Healthy"
              />

              <HealthRow
                icon={Building2}
                label="Charging stations"
                value={`${data?.total_stations ?? 0}`}
                percentage={100}
                status="Monitored"
              />

              <HealthRow
                icon={Zap}
                label="Connected chargers"
                value={`${data?.total_chargers ?? 0}`}
                percentage={100}
                status="Operational"
              />

              <HealthRow
                icon={CalendarClock}
                label="Booking activity"
                value={`${data?.total_bookings ?? 0}`}
                percentage={100}
                status="Tracked"
              />

            </div>

          </div>

          {/* USER HEALTH */}

          <div className="card p-6">

            <p className="label-eyebrow">
              User health
            </p>

            <h2 className="mt-1 font-display text-lg font-bold text-grid-50">
              Account status
            </h2>

            <div className="mt-6 flex items-center justify-center">

              <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-[14px] border-grid-800">

                <div
                  className="absolute inset-[-14px] rounded-full border-[14px] border-transparent border-t-volt-400 border-r-volt-400"
                  style={{
                    transform: `rotate(${activePercentage * 3.6 - 45}deg)`,
                  }}
                />

                <div className="text-center">

                  <p className="font-display text-3xl font-bold text-grid-50">
                    {activePercentage}%
                  </p>

                  <p className="text-xs text-grid-600">
                    active
                  </p>

                </div>

              </div>

            </div>

            <div className="mt-6 space-y-3">

              <StatusLine
                color="bg-volt-400"
                label="Active accounts"
                value={activeUsers}
              />

              <StatusLine
                color="bg-red-400"
                label="Disabled accounts"
                value={disabledUsers}
              />

            </div>

          </div>

        </section>

        {/* =====================================================
            PLATFORM SUMMARY
        ===================================================== */}

        <section className="grid gap-6 lg:grid-cols-2">

          <div className="card p-6">

            <div className="flex items-center justify-between">

              <div>

                <p className="label-eyebrow">
                  Revenue
                </p>

                <h2 className="mt-1 font-display text-lg font-bold text-grid-50">
                  Platform revenue
                </h2>

              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-volt-400/10 text-volt-400">
                <IndianRupee size={18} />
              </div>

            </div>

            <div className="mt-8">

              <p className="font-display text-3xl font-bold text-grid-50">
                {formatCurrency(
                  data?.total_revenue ?? 0,
                )}
              </p>

              <div className="mt-3 flex items-center gap-2 text-xs text-volt-300">

                <TrendingUp size={14} />

                <span>
                  Platform-wide revenue
                </span>

              </div>

            </div>

            <div className="mt-8 flex h-24 items-end gap-2">

              {[35, 48, 42, 60, 55, 70, 82, 68, 88, 76, 92, 100].map(
                (height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t-md bg-volt-400/20 transition hover:bg-volt-400/40"
                    style={{
                      height: `${height}%`,
                    }}
                  />
                ),
              )}

            </div>

          </div>

          <div className="card p-6">

            <div className="flex items-center justify-between">

              <div>

                <p className="label-eyebrow">
                  Energy
                </p>

                <h2 className="mt-1 font-display text-lg font-bold text-grid-50">
                  Electricity demand
                </h2>

              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                <BatteryCharging size={18} />
              </div>

            </div>

            <div className="mt-8">

              <p className="font-display text-3xl font-bold text-grid-50">
                {formatNumber(
                  data?.total_electricity_demand_kwh ?? 0,
                )}
                <span className="ml-2 text-sm font-medium text-grid-600">
                  kWh
                </span>
              </p>

              <p className="mt-2 text-xs text-grid-600">
                Total electricity demand recorded across the network.
              </p>

            </div>

            <div className="mt-8 h-3 overflow-hidden rounded-full bg-grid-800">

              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
                style={{
                  width: "72%",
                }}
              />

            </div>

            <div className="mt-3 flex justify-between text-xs">

              <span className="text-grid-600">
                Network utilization
              </span>

              <span className="font-medium text-amber-400">
                72%
              </span>

            </div>

          </div>

        </section>

        {/* =====================================================
            USERS
        ===================================================== */}

        <section className="card overflow-hidden">

          <div className="border-b border-grid-800 p-6">

            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

              <div>

                <p className="label-eyebrow">
                  Platform accounts
                </p>

                <h2 className="mt-1 font-display text-lg font-bold text-grid-50">
                  User management
                </h2>

                <p className="mt-1 text-xs text-grid-600">
                  Monitor registered drivers and network operators.
                </p>

              </div>

              <div className="flex flex-col gap-2 sm:flex-row">

                {/* SEARCH */}

                <div className="relative">

                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-grid-600"
                  />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search users..."
                    className="input-field !w-full !py-2.5 pl-9 text-sm sm:!w-56"
                  />

                </div>

                {/* FILTER */}

                <div className="relative">

                  <select
                    value={roleFilter}
                    onChange={(event) =>
                      setRoleFilter(event.target.value)
                    }
                    className="input-field !w-full appearance-none !py-2.5 pr-9 text-sm sm:!w-36"
                  >
                    <option value="all">
                      All roles
                    </option>

                    <option value="driver">
                      Drivers
                    </option>

                    <option value="operator">
                      Operators
                    </option>

                    <option value="admin">
                      Admins
                    </option>
                  </select>

                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-grid-600"
                  />

                </div>

              </div>

            </div>

          </div>

          {/* TABLE */}

          <div className="overflow-x-auto">

            <table className="w-full min-w-[700px] text-left text-sm">

              <thead className="bg-grid-900/70 text-[10px] uppercase tracking-widest text-grid-600">

                <tr>

                  <th className="px-6 py-4">
                    User
                  </th>

                  <th className="px-6 py-4">
                    Email
                  </th>

                  <th className="px-6 py-4">
                    Role
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>

                  <th className="px-6 py-4 text-right">
                    Account
                  </th>

                </tr>

              </thead>

              <tbody>

                {usersLoading ? (
                  <LoadingRows />
                ) : filteredUsers.length === 0 ? (
                  <tr>

                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center"
                    >

                      <Users
                        size={24}
                        className="mx-auto text-grid-700"
                      />

                      <p className="mt-3 text-sm text-grid-500">
                        No users found
                      </p>

                      <p className="mt-1 text-xs text-grid-700">
                        Try changing your search or role filter.
                      </p>

                    </td>

                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                    />
                  ))
                )}

              </tbody>

            </table>

          </div>

          {/* TABLE FOOTER */}

          <div className="flex flex-col justify-between gap-2 border-t border-grid-800 px-6 py-4 text-xs text-grid-600 sm:flex-row">

            <span>
              Showing{" "}
              <strong className="text-grid-400">
                {filteredUsers.length}
              </strong>{" "}
              of{" "}
              <strong className="text-grid-400">
                {users.length}
              </strong>{" "}
              accounts
            </span>

            <span>
              VoltGrid network administration
            </span>

          </div>

        </section>

        {/* =====================================================
            FOOTER
        ===================================================== */}

        <div className="flex items-center justify-between border-t border-grid-800 pt-5 text-xs text-grid-600">

          <span>
            VoltGrid Admin Console
          </span>

          <span className="font-mono">
            Network Control • v1.0.0
          </span>

        </div>

      </div>
    </AppShell>
  );
}

/* =============================================================
   ADMIN METRIC
============================================================= */

function AdminMetric({
  icon: Icon,
  label,
  value,
  description,
  suffix,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  description: string;
  suffix?: string;
  tone: "green" | "blue" | "purple" | "amber";
}) {
  const tones = {
    green: "bg-volt-400/10 text-volt-400",
    blue: "bg-blue-400/10 text-blue-400",
    purple: "bg-purple-400/10 text-purple-300",
    amber: "bg-amber-400/10 text-amber-400",
  };

  return (
    <div className="card p-5">

      <div className="flex items-center justify-between">

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}
        >
          <Icon size={19} />
        </div>

        <Activity
          size={15}
          className="text-grid-700"
        />

      </div>

      <p className="mt-5 text-xs uppercase tracking-wider text-grid-600">
        {label}
      </p>

      <p className="mt-1 font-display text-2xl font-bold text-grid-50">

        {value}

        {suffix && (
          <span className="ml-1 text-xs font-medium text-grid-600">
            {suffix}
          </span>
        )}

      </p>

      <p className="mt-2 text-xs text-grid-600">
        {description}
      </p>

    </div>
  );
}

/* =============================================================
   HEALTH ROW
============================================================= */

function HealthRow({
  icon: Icon,
  label,
  value,
  percentage,
  status,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  percentage: number;
  status: string;
}) {
  return (
    <div className="rounded-xl border border-grid-800 bg-grid-950/40 p-4">

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-3">

          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-grid-800 text-grid-400">
            <Icon size={15} />
          </div>

          <div>

            <p className="text-xs text-grid-600">
              {label}
            </p>

            <p className="mt-0.5 font-display font-semibold text-grid-200">
              {value}
            </p>

          </div>

        </div>

        <span className="text-[10px] font-medium text-volt-400">
          {status}
        </span>

      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-grid-800">

        <div
          className="h-full rounded-full bg-volt-400"
          style={{
            width: `${Math.min(
              Math.max(percentage, 0),
              100,
            )}%`,
          }}
        />

      </div>

    </div>
  );
}

/* =============================================================
   STATUS LINE
============================================================= */

function StatusLine({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between">

      <div className="flex items-center gap-2">

        <span
          className={`h-2 w-2 rounded-full ${color}`}
        />

        <span className="text-xs text-grid-500">
          {label}
        </span>

      </div>

      <span className="text-xs font-semibold text-grid-300">
        {value}
      </span>

    </div>
  );
}

/* =============================================================
   USER ROW
============================================================= */

function UserRow({
  user,
}: {
  user: User;
}) {
  const initials =
    user.full_name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const roleStyles: Record<
    string,
    string
  > = {
    driver:
      "bg-blue-400/10 text-blue-300 border-blue-400/20",

    operator:
      "bg-purple-400/10 text-purple-300 border-purple-400/20",

    admin:
      "bg-amber-400/10 text-amber-300 border-amber-400/20",
  };

  return (
    <tr className="border-t border-grid-800 transition hover:bg-grid-900/40">

      <td className="px-6 py-4">

        <div className="flex items-center gap-3">

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-volt-400/10 font-display text-xs font-bold text-volt-300">
            {initials}
          </div>

          <div>

            <p className="font-medium text-grid-200">
              {user.full_name}
            </p>

            <p className="mt-0.5 text-[10px] text-grid-700">
              ID #{user.id}
            </p>

          </div>

        </div>

      </td>

      <td className="px-6 py-4 text-grid-400">
        {user.email}
      </td>

      <td className="px-6 py-4">

        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold capitalize ${
            roleStyles[user.role] ??
            "border-grid-700 bg-grid-800 text-grid-400"
          }`}
        >
          {user.role}
        </span>

      </td>

      <td className="px-6 py-4">

        <div className="flex items-center gap-2">

          <span
            className={`h-1.5 w-1.5 rounded-full ${
              user.is_active
                ? "bg-volt-400"
                : "bg-red-400"
            }`}
          />

          <span
            className={
              user.is_active
                ? "text-volt-300"
                : "text-red-300"
            }
          >
            {user.is_active
              ? "Active"
              : "Disabled"}
          </span>

        </div>

      </td>

      <td className="px-6 py-4 text-right">

        {user.is_active ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-grid-500">
            <CheckCircle2
              size={14}
              className="text-volt-400"
            />
            Verified
          </span>
        ) : (
          <span className="text-xs text-grid-700">
            Restricted
          </span>
        )}

      </td>

    </tr>
  );
}

/* =============================================================
   LOADING ROWS
============================================================= */

function LoadingRows() {
  return (
    <>
      {[1, 2, 3, 4].map((row) => (
        <tr
          key={row}
          className="border-t border-grid-800"
        >
          <td
            colSpan={5}
            className="px-6 py-4"
          >
            <div className="h-8 animate-pulse rounded-lg bg-grid-800/60" />
          </td>
        </tr>
      ))}
    </>
  );
}

/* =============================================================
   FORMATTERS
============================================================= */

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(
    value,
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}