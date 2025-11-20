/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useAppTheme } from './use-app-theme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light,
) {
  const { currentTheme } = useAppTheme();
  const themeKey = currentTheme === 'dark' ? 'dark' : 'light';
  const colorFromProps = props[themeKey];

  if (colorFromProps) {
    return colorFromProps;
  }

  return Colors[themeKey][colorName];
}