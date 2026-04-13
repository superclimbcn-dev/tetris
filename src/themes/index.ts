export const themes = {
  neon: {
    name: "Neon",
    backgroundTop: "#020617",
    backgroundBottom: "#0f172a",
    board: "#081121",
    grid: "rgba(148,163,184,0.12)",
    accent: "#fb7185",
    glow: "rgba(251,113,133,0.18)",
  },
  matrix: {
    name: "Matrix",
    backgroundTop: "#010805",
    backgroundBottom: "#02140b",
    board: "#03140a",
    grid: "rgba(74,222,128,0.16)",
    accent: "#22c55e",
    glow: "rgba(34,197,94,0.24)",
  },
  pastel: {
    name: "Pastel",
    backgroundTop: "#fff1f6",
    backgroundBottom: "#fdf2f8",
    board: "#ffe4f1",
    grid: "rgba(190,24,93,0.12)",
    accent: "#f472b6",
    glow: "rgba(244,114,182,0.22)",
  },
  oled: {
    name: "OLED",
    backgroundTop: "#000000",
    backgroundBottom: "#050505",
    board: "#050505",
    grid: "rgba(255,255,255,0.12)",
    accent: "#f8fafc",
    glow: "rgba(255,255,255,0.18)",
  },
  retro: {
    name: "Retro",
    backgroundTop: "#1f2937",
    backgroundBottom: "#2d2d2d",
    board: "#262626",
    grid: "rgba(250,204,21,0.12)",
    accent: "#facc15",
    glow: "rgba(250,204,21,0.2)",
  },
} as const;

export type ThemeName = keyof typeof themes;

export function isThemeName(value: string): value is ThemeName {
  return value in themes;
}

export function getTheme(name: string) {
  return themes[isThemeName(name) ? name : "neon"];
}
