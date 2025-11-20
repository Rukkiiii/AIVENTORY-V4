import { PropsWithChildren } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

type BadgeProps = PropsWithChildren<{
  tone?: BadgeTone;
  style?: ViewStyle | ViewStyle[];
}>;

export function Badge({ children, tone = 'neutral', style }: BadgeProps) {
  const toneStyle =
    tone === 'success'
      ? styles.success
      : tone === 'warning'
      ? styles.warning
      : tone === 'danger'
      ? styles.danger
      : styles.neutral;
  return (
    <ThemedView style={[styles.badge, toneStyle, style as any]}> 
      <ThemedText type="defaultSemiBold">{children}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  success: {
    backgroundColor: 'rgba(6,214,160,0.20)',
  },
  warning: {
    backgroundColor: 'rgba(255,209,102,0.35)',
  },
  danger: {
    backgroundColor: 'rgba(255,107,107,0.30)',
  },
  neutral: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
});




