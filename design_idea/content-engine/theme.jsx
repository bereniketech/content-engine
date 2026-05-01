// Design tokens — Lumina AI / Content Studio light theme
const T = {
  // Backgrounds
  bg0: '#f5fbf5',        // page background (teal-tinted off-white)
  bg1: '#f8faf8',        // sidebar
  bg2: '#ffffff',         // cards / surfaces
  bg3: '#eff5ef',        // surface-container-low
  bg4: '#eaefea',        // surface-container
  bgHover: '#e4eae4',   // hover states

  // Foreground
  fg: '#171d1a',         // on-surface (warm dark)
  fg2: '#3d4943',        // on-surface-variant
  fg3: '#6d7a73',        // outline / muted
  fg4: '#bccac1',        // outline-variant / borders

  // Primary — Deep Teal
  primary: '#00694c',
  primaryContainer: '#008560',
  primaryHover: '#00513a',
  primaryMuted: 'rgba(0,105,76,0.08)',
  primaryLight: '#86f8c9',
  primaryDim: '#68dbae',
  onPrimary: '#ffffff',

  // Secondary — Confidence Blue
  secondary: '#0060a8',
  secondaryContainer: '#5da9fe',
  secondaryMuted: 'rgba(0,96,168,0.08)',
  secondaryLight: '#d2e4ff',
  onSecondary: '#ffffff',

  // Semantic
  success: '#00694c',
  successMuted: 'rgba(0,105,76,0.1)',
  warning: '#996300',
  warningMuted: 'rgba(153,99,0,0.1)',
  error: '#ba1a1a',
  errorMuted: 'rgba(186,26,26,0.08)',
  errorContainer: '#ffdad6',
  info: '#0060a8',
  infoMuted: 'rgba(0,96,168,0.08)',

  // Radii (tiered roundedness)
  r1: '8px',        // buttons, inputs
  r2: '12px',       // small cards
  r3: '16px',       // content cards
  r4: '24px',       // modals, AI prompt bar

  // Font
  font: "'Inter', -apple-system, system-ui, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', monospace",

  // Spacing
  s1: '4px', s2: '8px', s3: '12px', s4: '16px', s5: '20px', s6: '24px', s7: '32px', s8: '48px',

  // Shadows (teal-tinted, soft)
  shadow1: '0 1px 3px rgba(0,60,40,0.06)',
  shadow2: '0 4px 12px rgba(0,60,40,0.08)',
  shadow3: '0 8px 24px rgba(0,60,40,0.12)',

  // Transitions
  fast: '120ms ease',
  med: '200ms ease',
  slow: '350ms cubic-bezier(0.4,0,0.2,1)',
};

const patterns = {
  card: {
    background: T.bg2,
    borderRadius: T.r3,
    border: `1px solid ${T.fg4}40`,
    boxShadow: T.shadow2,
  },
  cardHover: {
    boxShadow: T.shadow3,
  },
  input: {
    background: T.bg2,
    border: `1px solid ${T.fg4}`,
    borderRadius: T.r1,
    color: T.fg,
    padding: '11px 16px',
    fontSize: '14px',
    fontFamily: T.font,
    outline: 'none',
    transition: `all ${T.fast}`,
    width: '100%',
    boxSizing: 'border-box',
  },
  inputFocus: {
    borderColor: T.secondary,
    boxShadow: `0 0 0 3px ${T.secondaryMuted}`,
  },
  btnPrimary: {
    background: T.primary,
    color: T.onPrimary,
    border: 'none',
    borderRadius: T.r1,
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: T.font,
    cursor: 'pointer',
    transition: `all ${T.fast}`,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 2px 8px rgba(0,105,76,0.2)',
  },
  btnSecondary: {
    background: T.bg2,
    color: T.fg,
    border: `1px solid ${T.fg4}`,
    borderRadius: T.r1,
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    fontFamily: T.font,
    cursor: 'pointer',
    transition: `all ${T.fast}`,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: '100px',
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: 1.4,
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: T.fg3,
    marginBottom: '8px',
    padding: '0 12px',
  },
  glass: {
    background: 'rgba(255,255,255,0.8)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
};

Object.assign(window, { T, patterns });
