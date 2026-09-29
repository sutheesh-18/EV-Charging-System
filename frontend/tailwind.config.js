/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        /* =====================================================
           VOLTGRID PRIMARY
        ===================================================== */
        volt: {
          50: "#eafff4",
          100: "#c9ffe3",
          200: "#93ffc9",
          300: "#54f7a8",
          400: "#22e08c",
          500: "#0ec978",
          600: "#08a262",
          700: "#0a7d4f",
          800: "#0c6241",
          900: "#0c5137",
        },

        /* =====================================================
           VOLTGRID GRAPHITE / GRID
           
           The original 500/600 values were too dark for
           secondary text on dark cards.
        ===================================================== */
        grid: {
          50: "#F8FAFF",
          100: "#EDF2FA",
          200: "#D8E1F0",
          300: "#B5C3D9",
          400: "#91A4C2",
          500: "#7187A8",
          600: "#526A8C",
          700: "#344A6B",
          800: "#223552",
          850: "#17243A",
          900: "#0D1728",
          950: "#060B14",
        },

        /* =====================================================
           STATUS / ACCENT
        ===================================================== */
        amber: {
          400: "#FFB648",
          500: "#FF9F1C",
        },
      },

      /* =======================================================
         FONTS
      ======================================================= */
      fontFamily: {
        display: [
          "'Space Grotesk'",
          "sans-serif",
        ],

        body: [
          "'Inter'",
          "sans-serif",
        ],

        mono: [
          "'JetBrains Mono'",
          "monospace",
        ],
      },

      /* =======================================================
         SHADOWS
      ======================================================= */
      boxShadow: {
        glow:
          "0 0 40px -8px rgba(14, 201, 120, 0.45)",

        card:
          "0 8px 30px -12px rgba(0,0,0,0.5)",
      },

      /* =======================================================
         BACKGROUND GRID
      ======================================================= */
      backgroundImage: {
        "grid-lines":
          "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
      },

      backgroundSize: {
        grid: "36px 36px",
      },

      /* =======================================================
         ANIMATION
      ======================================================= */
      keyframes: {
        pulseGlow: {
          "0%, 100%": {
            opacity: "1",
          },

          "50%": {
            opacity: "0.5",
          },
        },
      },

      animation: {
        pulseGlow:
          "pulseGlow 2s ease-in-out infinite",
      },
    },
  },

  plugins: [],
};