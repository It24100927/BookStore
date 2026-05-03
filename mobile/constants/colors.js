/**
 * BookWorm — Premium Light Theme
 *
 * Design philosophy: Warm parchment light mode with deep navy/indigo primary.
 * Inspired by premium editorial apps — clean, readable, professional.
 * Primary: Royal Indigo  |  Accent: Warm Amber  |  Surface: Warm White/Cream
 */
const COLORS = {
  // ── Brand / Primary ──────────────────────────────────────────
  primary:       "#4F46E5",   // indigo-600 — deep, confident
  primaryLight:  "#6366F1",   // indigo-500
  primaryLighter:"#A5B4FC",   // indigo-300
  primaryDark:   "#3730A3",   // indigo-700
  primaryGlow:   "rgba(79,70,229,0.10)",
  primaryBorder: "rgba(79,70,229,0.25)",

  // ── Accent / Amber Gold ───────────────────────────────────────
  accent:        "#D97706",   // amber-600 — rich, warm
  accentLight:   "#F59E0B",   // amber-500
  accentLighter: "#FCD34D",   // amber-300
  accentDark:    "#B45309",   // amber-700
  accentGlow:    "rgba(217,119,6,0.12)",

  // ── Secondary Accents ─────────────────────────────────────────
  rose:          "#E11D48",   // rose-600
  roseGlow:      "rgba(225,29,72,0.10)",
  teal:          "#0F766E",   // teal-700
  tealGlow:      "rgba(15,118,110,0.10)",

  // ── Text ──────────────────────────────────────────────────────
  textPrimary:   "#1E293B",   // slate-800  — main body text
  textSecondary: "#475569",   // slate-600  — secondary text
  textDark:      "#0F172A",   // slate-900  — headings
  textMuted:     "#94A3B8",   // slate-400  — hints
  placeholderText:"#CBD5E1",  // slate-300

  // ── Backgrounds — warm light surfaces ─────────────────────────
  background:    "#F8F7F4",   // warm white/cream — parchment feel  
  cardBackground:"#FFFFFF",   // pure white cards
  cardAlt:       "#F1F0ED",   // very subtle warm grey for hover
  inputBackground:"#F1F5F9",  // slate-100 for inputs
  overlay:       "rgba(15,23,42,0.55)",

  // ── Borders ────────────────────────────────────────────────────
  border:        "#E2E8F0",   // slate-200
  borderLight:   "#F1F5F9",   // slate-100
  borderGlow:    "rgba(79,70,229,0.20)",

  // ── Semantic Status ────────────────────────────────────────────
  success:       "#059669",   // emerald-600
  successLight:  "#34D399",
  successGlow:   "rgba(5,150,105,0.12)",
  successBg:     "rgba(5,150,105,0.08)",

  warning:       "#D97706",   // amber-600
  warningLight:  "#FCD34D",
  warningGlow:   "rgba(217,119,6,0.12)",
  warningBg:     "rgba(217,119,6,0.08)",

  danger:        "#DC2626",   // red-600
  dangerLight:   "#F87171",
  dangerGlow:    "rgba(220,38,38,0.12)",
  dangerBg:      "rgba(220,38,38,0.08)",

  info:          "#2563EB",   // blue-600
  infoLight:     "#60A5FA",
  infoGlow:      "rgba(37,99,235,0.12)",
  infoBg:        "rgba(37,99,235,0.08)",

  // ── Basic ──────────────────────────────────────────────────────
  white:  "#FFFFFF",
  black:  "#000000",

  // ── Stars / Ratings ────────────────────────────────────────────
  star:      "#D97706",   // warm amber-600
  starEmpty: "#E2E8F0",   // slate-200

  // ── Shadows (for elevated cards) ──────────────────────────────
  shadow:    "#64748B",   // used in shadowColor
};

export default COLORS;
