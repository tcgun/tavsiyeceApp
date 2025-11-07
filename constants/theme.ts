/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#f8fafc', // COLORS.textLight - Beyaz metin
    background: '#1C1424', // COLORS.backgroundLight - Koyu mor tema rengi (her zaman)
    tint: tintColorDark,
    icon: '#9ca3af', // COLORS.mutedLight
    tabIconDefault: '#9ca3af', // COLORS.mutedLight
    tabIconSelected: tintColorDark,
  },
  dark: {
    text: '#f8fafc', // COLORS.textDark
    background: '#1C1424', // COLORS.backgroundDark - Koyu mor tema rengi
    tint: tintColorDark,
    icon: '#9ca3af', // COLORS.mutedDark
    tabIconDefault: '#9ca3af', // COLORS.mutedDark
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// --- MERKEZİ RENK PALETİ ---
// Tüm dosyalarda kullanılacak ortak renk tanımları
export const COLORS = {
  // Primary renkler (sayfalara göre farklı olabilir, ama merkezi bir yerden yönetilebilir)
  primary: '#BA68C8', // Ana primary renk (mor tema - beğeni rengiyle uyumlu)
  
  // Background renkler
  backgroundLight: '#1C1424', // Koyu mor tema rengi (her zaman)
  backgroundDark: '#1C1424', // Koyu mor tema rengi
  
  // Text renkler
  textLight: '#f8fafc', // Beyaz metin (koyu arka plan için)
  textDark: '#f8fafc',
  
  // Muted renkler
  mutedLight: '#9ca3af', // Açık gri (koyu arka plan için)
  mutedDark: '#9ca3af',
  
  // Card renkler
  cardLight: '#2a1f3d', // Koyu mor arka plan için daha açık ton
  cardDark: '#2a1f3d', // Koyu mor arka plan için daha açık ton
  
  // Border renkler
  borderLight: 'rgba(255, 255, 255, 0.1)', // Koyu arka plan için şeffaf beyaz
  borderDark: 'rgba(255, 255, 255, 0.1)',
  
  // Button renkler
  buttonBgLight: '#ebf8ff',
  buttonBgDark: '#1e3a8a',
  buttonTextLight: '#3b82f6',
  buttonTextDark: '#bfdbfe',
  
  // Error renk
  error: '#ef4444',
  
  // Accent renkler
  accent: '#4A90E2',
  separatorLight: 'rgba(255, 255, 255, 0.1)', // Koyu arka plan için şeffaf beyaz
  separatorDark: 'rgba(255, 255, 255, 0.1)',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
};
