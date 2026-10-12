import type { Config } from "tailwindcss";
export default {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "text-label": "var(--text-label)",
        "accent-text": "var(--accent-text)",
        "on-accent": "var(--on-accent)",
        "accent-soft-text": "var(--accent-soft-text)",
        "success-border": "var(--success-border)",
        "warning-border": "var(--warning-border)",
        "danger-border": "var(--danger-border)",
        "info-border": "var(--info-border)",
        "overlay": "var(--overlay)",

        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        "text-subtle": "var(--text-subtle)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-soft": "var(--accent-soft)",
        success: "var(--success)",
        "success-soft": "var(--success-soft)",
        warning: "var(--warning)",
        "warning-soft": "var(--warning-soft)",
        danger: "var(--danger)",
        "danger-soft": "var(--danger-soft)",
        info: "var(--info)",
        "info-soft": "var(--info-soft)",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
} satisfies Config;
