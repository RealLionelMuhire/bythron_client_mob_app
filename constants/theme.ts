export type DialogType = "success" | "error" | "warning" | "info";

export const DIALOG_COLORS: Record<
  DialogType,
  { bg: string; icon: string; btn: string }
> = {
  success: { bg: "#ECFDF5", icon: "#10B981", btn: "#10B981" },
  error: { bg: "#FEF2F2", icon: "#EF4444", btn: "#EF4444" },
  warning: { bg: "#FFFBEB", icon: "#F59E0B", btn: "#F59E0B" },
  info: { bg: "#EFF6FF", icon: "#5BB8E8", btn: "#5BB8E8" },
};

/** Light theme - high contrast for readability */
export const theme = {
  accent: {
    50: "#F5FBFF",
    100: "#EAF4FF",
    200: "#A8D8F0",
    300: "#9DD6F0",
    400: "#5BB8E8",
    500: "#0286FF",
  },
  surface: {
    light: "#F7FAFF",
    card: "#FFFFFF",
    border: "#D9EAF7",
  },
  text: {
    primary: "#0f172a",
    secondary: "#334155",
    muted: "#64748b",
  },
  status: {
    success: "#10B981",
    error: "#EF4444",
    warning: "#F59E0B",
    muted: "#94A3B8",
  },
} as const;

/** Dark theme - matches History/Tracking contrast (slate-900 bg, slate-800 cards, slate-200 text) */
export const themeDark = {
  accent: {
    50: "#0f172a",
    100: "#1e293b",
    200: "#334155",
    300: "#5BB8E8",
    400: "#5BB8E8",
    500: "#7DD3FC",
  },
  surface: {
    light: "#0f172a",
    card: "#1e293b",
    border: "#334155",
  },
  text: {
    primary: "#e2e8f0",
    secondary: "#cbd5e1",
    muted: "#94a3b8",
  },
  status: {
    success: "#34D399",
    error: "#F87171",
    warning: "#FBBF24",
    muted: "#94A3B8",
  },
} as const;

export type ColorScheme = "light" | "dark";

export function getThemeColors(scheme: ColorScheme) {
  return scheme === "dark" ? themeDark : theme;
}
