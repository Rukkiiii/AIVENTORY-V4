import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedText } from '@/components/themed-text';

export const NotificationCenter = ({
  notifications,
  onClearAll,
  onNotificationPress,
}: {
  notifications: any[];
  onClearAll: () => void;
  onNotificationPress?: (n: any) => void;
}) => {
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const dangerColor = useThemeColor({}, 'danger');
  const warningColor = useThemeColor({}, 'warning');
  const successColor = useThemeColor({}, 'success');

  const getNotificationColor = (type) => {
    switch (type) {
      case 'error': return dangerColor;
      case 'warning': return warningColor;
      case 'success': return successColor;
      default: return textSecondaryColor;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'success': return 'check-circle';
      default: return 'info';
    }
  };

  const formatRelativeTime = (timestamp?: number, fallback?: string) => {
    if (!timestamp || !Number.isFinite(timestamp)) return fallback || '—';
    const now = Date.now();
    const diff = Math.max(0, now - timestamp);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 60000);
    
    // Show "Just now" only for less than 60 seconds
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(days / 365);
    return `${years}y ago`;
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: textColor }]}>Notifications</ThemedText>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={onClearAll}>
            <ThemedText style={[styles.clearAll, { color: dangerColor }]}>Clear All</ThemedText>
          </TouchableOpacity>
        )}
      </View>
      
      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="notifications" size={48} color={textSecondaryColor} />
          <ThemedText style={[styles.emptyText, { color: textSecondaryColor }]}>
            No notifications
          </ThemedText>
        </View>
      ) : (
        <ScrollView style={styles.notificationsList}>
          {notifications.map((notification, index) => (
            <TouchableOpacity
              key={`${notification?.id ?? notification?.timestamp ?? 'n'}-${index}`}
              activeOpacity={0.7}
              onPress={() => onNotificationPress && onNotificationPress(notification)}
              style={[styles.notificationItem, { backgroundColor: cardBackgroundColor, borderColor }]}
            >
              <View style={styles.notificationHeader}>
                <MaterialIcons 
                  name={getNotificationIcon(notification.type)} 
                  size={20} 
                  color={getNotificationColor(notification.type)} 
                />
                <ThemedText style={[styles.notificationTitle, { color: textColor }]}>
                  {notification.title}
                </ThemedText>
              </View>
              <ThemedText style={[styles.notificationMessage, { color: textSecondaryColor }]}>
                {notification.message}
              </ThemedText>
              <ThemedText style={[styles.notificationTime, { color: textSecondaryColor }]}>
                {formatRelativeTime(
                  notification.timestamp || (notification.relativeTime ? Date.now() - (5 * 60000) : undefined),
                  notification.relativeTime || notification.time
                )}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  clearAll: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
  },
});