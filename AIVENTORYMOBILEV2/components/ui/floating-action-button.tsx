import { TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useThemeColor } from '@/hooks/use-theme-color';

type FloatingActionButtonProps = {
  onPress: () => void;
  icon: string;
  label?: string;
};

export function FloatingActionButton({ onPress, icon, label }: FloatingActionButtonProps) {
  const primaryColor = useThemeColor({}, 'primary');
  const textColor = useThemeColor({}, 'text');

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <ThemedView style={[styles.button, { backgroundColor: primaryColor }]}>
        <MaterialIcons name={icon as any} size={24} color="#ffffff" />
      </ThemedView>
      {label && (
        <ThemedText style={[styles.label, { color: textColor }]}>{label}</ThemedText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
});