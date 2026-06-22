export type SkyTheme = {
  id: string;
  gradient: string;
  glow?: string;
  cloudOpacity: number;
  rain?: boolean;
  snow?: boolean;
  isDark: boolean;
  /** 제목, 소제목, 강조 텍스트 */
  text: string;
  /** 본문, 보조 정보 */
  muted: string;
  /** snippet 등 덜 중요한 텍스트 (still readable) */
  faint: string;
  sidebarBorder: string;
  icon: string;
};

const light: Omit<SkyTheme, "id" | "gradient" | "glow" | "cloudOpacity" | "rain" | "snow" | "isDark"> = {
  text: "text-slate-900",
  muted: "text-slate-700",
  faint: "text-slate-600",
  sidebarBorder: "border-slate-900/12",
  icon: "text-slate-800",
};

const dark: Omit<SkyTheme, "id" | "gradient" | "glow" | "cloudOpacity" | "rain" | "snow" | "isDark"> = {
  text: "text-white",
  muted: "text-white/90",
  faint: "text-white/80",
  sidebarBorder: "border-white/25",
  icon: "text-white",
};

const themes: Record<string, SkyTheme> = {
  sun: {
    id: "sun",
    gradient: "linear-gradient(165deg, #2563eb 0%, #38bdf8 35%, #7dd3fc 65%, #e0f2fe 100%)",
    glow: "radial-gradient(circle at 78% 18%, rgba(255,236,179,0.55) 0%, transparent 42%)",
    cloudOpacity: 0.35,
    isDark: false,
    ...light,
  },
  clear: {
    id: "clear",
    gradient: "linear-gradient(165deg, #2563eb 0%, #38bdf8 35%, #7dd3fc 65%, #e0f2fe 100%)",
    glow: "radial-gradient(circle at 78% 18%, rgba(255,236,179,0.55) 0%, transparent 42%)",
    cloudOpacity: 0.3,
    isDark: false,
    ...light,
  },
  "partly-cloudy": {
    id: "partly-cloudy",
    gradient: "linear-gradient(165deg, #3b6ea5 0%, #6ba3c7 40%, #a8cce8 75%, #dceaf5 100%)",
    glow: "radial-gradient(circle at 70% 22%, rgba(255,255,255,0.35) 0%, transparent 40%)",
    cloudOpacity: 0.55,
    isDark: false,
    ...light,
  },
  cloudy: {
    id: "cloudy",
    gradient: "linear-gradient(165deg, #5c6b7a 0%, #8fa3b5 45%, #b8c9d6 80%, #d9e4ec 100%)",
    cloudOpacity: 0.7,
    isDark: false,
    ...light,
  },
  rain: {
    id: "rain",
    gradient: "linear-gradient(165deg, #334155 0%, #475569 35%, #64748b 65%, #94a3b8 100%)",
    cloudOpacity: 0.85,
    rain: true,
    isDark: true,
    ...dark,
  },
  drizzle: {
    id: "drizzle",
    gradient: "linear-gradient(165deg, #3d4f63 0%, #52677a 40%, #708498 75%, #9fb0bf 100%)",
    cloudOpacity: 0.75,
    rain: true,
    isDark: true,
    ...dark,
  },
  snow: {
    id: "snow",
    gradient: "linear-gradient(165deg, #7c8fa6 0%, #a8bccc 40%, #cddae6 70%, #eef3f7 100%)",
    cloudOpacity: 0.6,
    snow: true,
    isDark: false,
    ...light,
  },
};

const defaultTheme = themes.sun;

export function getSkyTheme(icon?: string): SkyTheme {
  if (!icon) return defaultTheme;
  return themes[icon.toLowerCase()] ?? defaultTheme;
}
