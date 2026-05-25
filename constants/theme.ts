
/** * BRAND COLORS
 * Based on the KsTU Blue and Slate palettes for a modern campus feel.
 */
const KUTU_BLUE = '#2563EB';      // Main Brand Color
const KUTU_NAVY = '#1E3A8A';      // Deep blue for headers
const ACCENT_AMBER = '#F59E0B';    // For notifications/alerts
const SUCCESS_EMERALD = '#10B981'; // For verified posts/directions

export const Colors = {
  light: {
    // Basic UI
    text: '#0F172A',
    subtext: '#64748B',
    background: '#F8FAFC',
    card: '#FFFFFF',
    border: '#E2E8F0',
    icon: '#64748B',
    
    // Brand & Semantic
    primary: KUTU_BLUE,
    secondary: KUTU_NAVY,
    accent: ACCENT_AMBER,
    success: SUCCESS_EMERALD,
    
    // Navigation Specifics
    tint: KUTU_BLUE,
    tabIconDefault: '#94A3B8',
    tabIconSelected: KUTU_BLUE,
    
    // Surface variations
    overlay: 'rgba(0, 0, 0, 0.4)',
    highlight: '#EFF6FF', // Light blue tint for active backgrounds
  },
  dark: {
    text: '#F8FAFC',
    subtext: '#94A3B8',
    background: '#0F172A',
    card: '#1E293B',
    border: '#334155',
    icon: '#94A3B8',
    primary: '#60A5FA', // Lighter blue for better contrast in dark mode
    secondary: '#3B82F6',
    accent: '#FBBF24',
    success: '#34D399',
    tint: '#60A5FA',
    tabIconDefault: '#475569',
    tabIconSelected: '#FFFFFF',
  },
};

export const Spacing = {
  xs: 4,   // Tight grouping (icon + text)
  s: 8,    // Small elements (avatar + name)
  m: 16,   // Standard gutter (padding inside cards)
  l: 24,   // Section spacing (between cards)
  xl: 32,  // Large breaks (header to content)
  xxl: 48, // Massive hero padding
};

export const Radius = {
  xs: 4,
  s: 8,    // Small buttons/tags
  m: 12,   // Main buttons
  l: 16,   // Cards
  xl: 24,  // Hero sections/Modals
  full: 9999,
};

export const Typography = {
  size: {
    tiny: 10,
    small: 12,
    body: 14,
    large: 16,
    h3: 18,
    h2: 24,
    h1: 32,
  },
  weight: {
    regular: '400',
    medium: '600',
    bold: '800',
  }
};