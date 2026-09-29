import type { LucideIcon } from "lucide-react";

export default function StatCard({
  label, value, icon: Icon, accent = "volt", suffix,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "volt" | "amber";
  suffix?: string;
}) {
  const accentClasses = accent === "amber" ? "bg-amber-500/15 text-amber-400" : "bg-volt-500/15 text-volt-400";
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="label-eyebrow">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentClasses}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="stat-value mt-3">
        {value} {suffix && <span className="text-base font-medium text-grid-400">{suffix}</span>}
      </p>
    </div>
  );
}
