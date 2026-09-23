/** Design tokens from the Rincon Figma context: ink, paper, the two faces. */
import { Platform } from 'react-native'

export const INK = '#160906'
export const INK_50 = 'rgba(22, 9, 6, 0.5)'
export const INK_30 = 'rgba(22, 9, 6, 0.3)'
export const INK_10 = 'rgba(22, 9, 6, 0.1)'
export const INK_05 = 'rgba(22, 9, 6, 0.05)'
export const PAPER = '#FEF9F5'

/** The design uses STK Bureau Serif and CoFo Sona; they fall back to system faces here. */
export const SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: "'STK Bureau Serif', 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
})
export const SANS = Platform.select({
  ios: undefined,
  android: undefined,
  default: "'CoFo Sona', 'CoFo Sona VF', Inter, -apple-system, system-ui, sans-serif",
})

/** The screens are built at 1:1 from the file: 430 × 932. */
export const SCREEN_W = 430
export const SCREEN_H = 932
