import { Moon, Sun } from "lucide-react";

import { useTheme } from "../../lib/theme";

/**
 * Light / dark switch. Drop it into the top bar of AppShell:
 *   <ThemeToggle />
 */
export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-teal-300 hover:text-teal-700 dark:border-grid-700 dark:bg-grid-850 dark:text-grid-200 dark:hover:border-volt-500/50 dark:hover:text-volt-300"
    >
      <Sun
        size={18}
        className={`absolute transition-all duration-300 ${
          isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        }`}
      />
      <Moon
        size={18}
        className={`absolute transition-all duration-300 ${
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        }`}
      />
    </button>
  );
}