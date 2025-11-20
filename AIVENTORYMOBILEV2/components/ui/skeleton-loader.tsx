import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

export const SkeletonLoader = ({ style }: { style?: any }) => {
  const backgroundColor = useThemeColor({}, 'cardBackground');
  const shimmerColor = useThemeColor({}, 'border');

  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      <View style={[styles.shimmer, { backgroundColor: shimmerColor }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  shimmer: {
    height: '100%',
    width: '100%',
    opacity: 0.3,
  },
});