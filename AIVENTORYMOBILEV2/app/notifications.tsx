import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { NotificationCenter } from '@/components/ui/notification-center';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { getLowStockItems } from '@/services/api';

type AppNotification = {
  id: string | number;
  title: string;
  message: string;
  timestamp: number;
  formattedTime?: string;
  relativeTime?: string;
  type?: 'warning' | 'success' | 'error' | 'info';
  productId?: string | number;
};

const estimateDailyUsage = (stock: number, threshold: number) => {
  const baseline = Math.max(threshold || 1, stock || 1);
  return Math.max(0.5, baseline / 14);
};

const buildAiAlert = (product: any, index: number) => {
  if (!product) return null;

  const stock = Number(product.Product_stock ?? product.stock ?? 0);
  const threshold = Number(product.reorder_level ?? product.threshold ?? 0);

  if (stock <= 0 && threshold <= 0) return null;

  const status: 'critical' | 'warning' | 'normal' =
    stock <= threshold ? 'critical' : stock <= threshold * 1.25 ? 'warning' : 'normal';
  if (status === 'normal') return null;

  const dailyUsage = estimateDailyUsage(stock, threshold || 1);
  const projectedDays = dailyUsage > 0 ? Math.max(1, Math.round(stock / dailyUsage)) : 999;
  const productId = product.Product_id ?? product.product_id ?? product.id ?? product.Product_sku ?? index + 1;
  const sku = product.Product_sku || product.sku || `SKU-${index + 1}`;
  const name = product.Product_name || product.name || 'Inventory Item';

  return {
    id: String(productId),
    productId: String(productId),
    name,
    sku,
    stock,
    threshold,
    daysRemaining: projectedDays,
    dailyUsage: Number(dailyUsage.toFixed(2)),
    status,
  };
};

const formatRelativeTime = (timestamp: number) => {
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
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

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const cache = await AsyncStorage.getItem('notifications_cache');
        if (cache) {
          const cachedNotifications: AppNotification[] = JSON.parse(cache);
          // Recalculate relative time for cached notifications
          setNotifications(
            cachedNotifications.map((n) => {
              const timestamp = n.timestamp ?? Date.now();
              return {
                ...n,
                timestamp,
                formattedTime: new Date(timestamp).toLocaleString(),
                relativeTime: formatRelativeTime(timestamp),
              };
            }),
          );
          return;
        }

        const stored = await AsyncStorage.getItem('notifications');
        if (stored) {
          const parsed: AppNotification[] = JSON.parse(stored);
          setNotifications(
            parsed.map((n) => {
              const timestamp = n.timestamp ?? Date.now();
              // Always recalculate relative time to reflect current time
              return {
                ...n,
                timestamp,
                formattedTime: new Date(timestamp).toLocaleString(),
                relativeTime: formatRelativeTime(timestamp),
              };
            }),
          );
        } else {
          const sample: AppNotification[] = [
            {
              id: 1,
              title: 'Low Stock Alert',
              message: 'Brake Pads (SKU BP-1001) is low',
              timestamp: Date.now() - 2 * 60 * 60 * 1000,
              formattedTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleString(),
              relativeTime: formatRelativeTime(Date.now() - 2 * 60 * 60 * 1000),
              type: 'warning',
              productId: '1',
            },
            {
              id: 2,
              title: 'Supplier Update',
              message: 'Supplier A updated lead time',
              timestamp: Date.now() - 5 * 60 * 60 * 1000,
              formattedTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toLocaleString(),
              relativeTime: formatRelativeTime(Date.now() - 5 * 60 * 60 * 1000),
              type: 'info',
            },
          ];
          setNotifications(sample);
          await AsyncStorage.setItem('notifications', JSON.stringify(sample));
        }
      } catch (e) {
        // ignore load error
      }
    };

    loadNotifications();
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const [lowStockResponse, productsResponse] = await Promise.all([
        getLowStockItems(),
        api.get('/products'),
      ]);

      const lowStockData = Array.isArray(lowStockResponse?.data) ? lowStockResponse.data : [];
      const productsData = Array.isArray(productsResponse?.data) ? productsResponse.data : [];

      const alerts = productsData
        .map((product: any, index: number) => buildAiAlert(product, index))
        .filter((alert): alert is NonNullable<typeof alert> => Boolean(alert));

      const sortedAlerts = alerts.sort((a, b) => {
        const priority: Record<'critical' | 'warning' | 'normal', number> = { critical: 0, warning: 1, normal: 2 };
        if (priority[a.status] !== priority[b.status]) {
          return priority[a.status] - priority[b.status];
        }
        return a.daysRemaining - b.daysRemaining;
      });

      // Load existing notifications to preserve timestamps
      let existingNotifications: AppNotification[] = [];
      try {
        const stored = await AsyncStorage.getItem('notifications');
        if (stored) {
          existingNotifications = JSON.parse(stored);
        }
      } catch (e) {
        // Ignore errors
      }

      // Create a map of existing notifications by ID AND message to preserve timestamps
      // Use both ID and a unique key (product ID + message) to better match existing notifications
      const existingMap = new Map<string, AppNotification>();
      existingNotifications.forEach(n => {
        if (n.id) {
          // Store by ID
          existingMap.set(String(n.id), n);
          // Also store by productId if available for better matching
          if (n.productId) {
            existingMap.set(`product-${n.productId}`, n);
          }
          // Store by a combination of title and productId for even better matching
          if (n.productId && n.title) {
            existingMap.set(`${n.title}-${n.productId}`, n);
          }
        }
      });

      let updatedNotifications: AppNotification[] = [];
      const currentTime = Date.now();

      if (lowStockData.length > 0 || sortedAlerts.length > 0) {
        const lowStockNotifications = lowStockData.slice(0, 5).map((item: any, index: number) => {
          const id = item.Product_id || `low-${index}`;
          const productId = item.Product_id ? String(item.Product_id) : undefined;
          const message = `${item.Product_name || 'Product'} (${item.Product_sku || 'N/A'}) is low - ${item.Product_stock || 0} units remaining`;
          
          // Try multiple ways to find existing notification
          let existing = existingMap.get(String(id)) || 
                        (productId ? existingMap.get(`product-${productId}`) : null) ||
                        (productId ? existingMap.get(`Low Stock Alert-${productId}`) : null);
          
          // Preserve existing timestamp if notification already exists AND it's the same message
          const isNewNotification = !existing || existing.message !== message;
          const timestamp = (existing && !isNewNotification) ? existing.timestamp : currentTime;
          
          return {
            id,
            title: 'Low Stock Alert',
            message,
            timestamp,
            formattedTime: new Date(timestamp).toLocaleString(),
            relativeTime: formatRelativeTime(timestamp),
            type: ((item.Product_stock || 0) <= 0 ? 'error' : 'warning') as 'error' | 'warning',
            productId,
          };
        });

        const aiNotifications = sortedAlerts.slice(0, 3).map((alert, idx) => {
          const id = `ai-${alert.id}-${idx}`;
          const productId = alert.productId ? String(alert.productId) : undefined;
          const title = alert.status === 'critical' ? 'Critical AI Alert' : 'AI Prediction Alert';
          const message = `${alert.name} predicted to run out ${alert.daysRemaining <= 1 ? 'in 1 day' : `in ${alert.daysRemaining} days`}`;
          
          // Try multiple ways to find existing notification
          let existing = existingMap.get(id) || 
                        (productId ? existingMap.get(`product-${productId}`) : null) ||
                        (productId && title ? existingMap.get(`${title}-${productId}`) : null);
          
          // Preserve existing timestamp if notification already exists AND it's the same message
          const isNewNotification = !existing || existing.message !== message;
          const timestamp = (existing && !isNewNotification) ? existing.timestamp : currentTime;
          
          return {
            id,
            title,
            message,
            timestamp,
            formattedTime: new Date(timestamp).toLocaleString(),
            relativeTime: formatRelativeTime(timestamp),
            type: (alert.status === 'critical' ? 'error' : 'warning') as 'error' | 'warning',
            productId,
          };
        });

        updatedNotifications = [...aiNotifications, ...lowStockNotifications];
      }

      setNotifications(updatedNotifications);
      await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
      await AsyncStorage.setItem('notifications_cache', JSON.stringify(updatedNotifications));
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to refresh notifications:', error);
      }
    } finally {
      // no-op
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Only refresh notifications, don't reset them
      // Load existing notifications first to preserve them
      const loadAndRefresh = async () => {
        try {
          const stored = await AsyncStorage.getItem('notifications');
          if (stored) {
            const parsed: AppNotification[] = JSON.parse(stored);
            // Recalculate relative time for existing notifications
            setNotifications(
              parsed.map((n) => {
                const timestamp = n.timestamp ?? Date.now();
                return {
                  ...n,
                  timestamp,
                  formattedTime: new Date(timestamp).toLocaleString(),
                  relativeTime: formatRelativeTime(timestamp),
                };
              }),
            );
          }
          // Then refresh to update with new data if any
          refreshNotifications();
        } catch (e) {
          // Ignore errors
          refreshNotifications();
        }
      };
      loadAndRefresh();
    }, [refreshNotifications]),
  );

  useEffect(() => {
    (async () => {
      try {
        // Recalculate relative time when saving to ensure it's up to date
        const notificationsToSave = notifications.map((n) => ({
          ...n,
          relativeTime: formatRelativeTime(n.timestamp),
          formattedTime: new Date(n.timestamp).toLocaleString(),
        }));
        await AsyncStorage.setItem('notifications', JSON.stringify(notificationsToSave));
        await AsyncStorage.setItem('notifications_cache', JSON.stringify(notificationsToSave));
      } catch (e) {
        // ignore save error
      }
    })();
  }, [notifications]);

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleNotificationPress = async (n: AppNotification) => {
    try {
      if (n.productId) {
        const productIdStr = String(n.productId);
        
        // Validate product ID
        if (!productIdStr || productIdStr === 'undefined' || productIdStr === 'null') {
          Alert.alert('Error', 'Invalid product ID');
          return;
        }
        
        // Navigate to prediction screen with product ID
        router.push({
          pathname: '/(tabs)/prediction',
          params: { id: productIdStr }
        });
        return;
      }
      Alert.alert('Notification', n.message);
    } catch (error: any) {
      if (__DEV__) {
        console.error('Error navigating to product:', error?.message || error);
      }
      Alert.alert('Error', 'Failed to open product. It may have been deleted.');
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <NotificationCenter
        notifications={notifications}
        onClearAll={handleClearAll}
        onNotificationPress={handleNotificationPress}
      />
    </ThemedView>
  );
}


