// Quilt colours per language (GitHub's linguist colours where they read well).
const COLOURS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#e8c32a",
  Python: "#3572a5",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Go: "#00add8",
  Rust: "#c2410c",
  Ruby: "#a91e22",
  PHP: "#4f5d95",
  Kotlin: "#a97bff",
  Swift: "#f05138",
  Dart: "#00b4ab",
  HTML: "#e34c26",
  CSS: "#663399",
  Shell: "#4c9a2a",
  Haskell: "#5e5086",
  Lua: "#000080",
  Scala: "#c22d40",
};

export function languageColour(lang: string): string {
  if (COLOURS[lang]) return COLOURS[lang];
  // Stable fallback so unknown languages still get their own patch colour
  let h = 0;
  for (const ch of lang) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 55% 45%)`;
}

// Pick black or white text for a hex background
export function textOn(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#1b1712" : "#fff";
}
