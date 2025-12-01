import { StyleSheet, View, ScrollView, TouchableOpacity, RefreshControl, useWindowDimensions, Alert, Modal, FlatList } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import api, { getDashboardMetrics, getLowStockItems, getProductPrediction, sendReorderEmail } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const estimateDailyUsage = (stock: number, threshold: number) => {
  const baseline = Math.max(threshold || 1, stock || 1);
  return Math.max(0.5, baseline / 14);
};

const buildAiAlert = (product: any, index: number) => {
  if (!product) return null;

  const stock = Number(product.Product_stock ?? product.stock ?? 0);
  const threshold = Number(product.reorder_level ?? product.threshold ?? 0);

  if (stock <= 0 && threshold <= 0) return null;

  const status = stock <= threshold ? 'critical' : stock <= threshold * 1.25 ? 'warning' : 'normal';
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

export default function DashboardScreen() {
  const primaryColor = useThemeColor({}, 'primary');
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');
  const dangerColor = useThemeColor({}, 'danger');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const { width: windowWidth } = useWindowDimensions();
  const isCompact = windowWidth < 400;
  const contentPadding = isCompact ? 12 : 16;
  const sectionGap = isCompact ? 12 : 16;
  const summaryCardFlex = isCompact ? '48%' : undefined;

  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [criticalItemsCount, setCriticalItemsCount] = useState(0);
  const [suppliersCount, setSuppliersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [aiAlerts, setAiAlerts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertFilter, setAlertFilter] = useState<'low' | 'critical'>('low');

  // Fetch dashboard data from API
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load existing notifications first to preserve them
      let existingNotifications: any[] = [];
      try {
        const stored = await AsyncStorage.getItem('notifications');
        if (stored) {
          existingNotifications = JSON.parse(stored);
        }
      } catch (e) {
        // Ignore errors
      }

      // Fetch dashboard metrics
      const metricsResponse = await getDashboardMetrics();
      setTotalItems(metricsResponse?.data?.total_items || 0);
      
      // Fetch low stock items
      const lowStockResponse = await getLowStockItems();
      const lowStockData = Array.isArray(lowStockResponse?.data) ? lowStockResponse.data : [];
      setLowStockCount(lowStockData.length);
      
      // Calculate critical items (out of stock or at critical level)
      const criticalItems = lowStockData.filter(item => item && (item.Product_stock || 0) <= 0);
      setCriticalItemsCount(criticalItems.length);

      const productsResponse = await api.get('/products');
      const productsData = Array.isArray(productsResponse?.data) ? productsResponse.data : [];

      // Build alerts and fetch AI predictions for products that need restocking
      const alerts = productsData
        .map((product: any, index: number) => buildAiAlert(product, index))
        .filter((alert): alert is NonNullable<typeof alert> => Boolean(alert));

      // Fetch AI predictions for each alert
      const alertsWithPredictions = await Promise.all(
        alerts.map(async (alert) => {
          try {
            const predictionResponse = await getProductPrediction(alert.productId);
            if (predictionResponse?.data?.success) {
              const prediction = predictionResponse.data;
              const recommendedQty = prediction.reorder_suggestion?.suggested_quantity;
              const depletionDays = prediction.depletion_prediction?.depletion_days;
              
              return {
                ...alert,
                recommendedQty: recommendedQty || null,
                aiDepletionDays: depletionDays || alert.daysRemaining,
                aiMethod: prediction.prediction?.prediction_method || 'calculated'
              };
            }
          } catch (error) {
            // Silently fail - use default alert data
            if (__DEV__) {
              console.warn('Failed to fetch AI prediction for product', alert.productId);
            }
          }
          return alert;
        })
      );

      const sortedAlerts = alertsWithPredictions.sort((a, b) => {
        const priority = { critical: 0, warning: 1, normal: 2 } as const;
        if (priority[a.status] !== priority[b.status]) {
          return priority[a.status] - priority[b.status];
        }
        return (a.aiDepletionDays || a.daysRemaining) - (b.aiDepletionDays || b.daysRemaining);
      });

      setAiAlerts(sortedAlerts);
      
      // Update critical items count from AI alerts (more accurate than lowStockData)
      const criticalAlertsCount = sortedAlerts.filter(alert => alert.status === 'critical').length;
      setCriticalItemsCount(criticalAlertsCount);
      
      // Create a map of existing notifications by ID AND message to preserve timestamps
      // Use both ID and a unique key (product ID + message) to better match existing notifications
      const existingMap = new Map<string, any>();
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
      
      // Update notifications with AI predictions plus low stock warnings
      if (lowStockData.length > 0 || sortedAlerts.length > 0) {
        const currentTime = Date.now();
        
        const formatRelativeTime = (timestamp: number) => {
          const now = Date.now();
          const diff = Math.max(0, now - timestamp);
          const seconds = Math.floor(diff / 1000);
          const minutes = Math.floor(diff / 60000);
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

        const lowStockNotifications = lowStockData.slice(0, 5).map((item: any, index: number) => {
          const id = item.Product_id || `low-${index}`;
          const productId = item.Product_id ? String(item.Product_id) : undefined;
          
          // Try multiple ways to find existing notification
          let existing = existingMap.get(String(id)) || 
                        (productId ? existingMap.get(`product-${productId}`) : null) ||
                        (productId ? existingMap.get(`Low Stock Alert-${productId}`) : null);
          
          // Preserve existing timestamp if notification already exists AND it's the same message
          // Only use current time if this is truly a new notification
          const isNewNotification = !existing || 
            existing.message !== `${item.Product_name || 'Product'} (${item.Product_sku || 'N/A'}) is low - ${item.Product_stock || 0} units remaining`;
          
          const timestamp = (existing && !isNewNotification) ? existing.timestamp : currentTime;
          
          return {
            id,
            title: 'Low Stock Alert',
            message: `${item.Product_name || 'Product'} (${item.Product_sku || 'N/A'}) is low - ${item.Product_stock || 0} units remaining`,
            timestamp,
            formattedTime: new Date(timestamp).toLocaleString(),
            relativeTime: formatRelativeTime(timestamp),
            type: (item.Product_stock || 0) <= 0 ? 'error' : 'warning' as const,
            productId
          };
        });

        const aiNotifications = sortedAlerts.slice(0, 3).map((alert, idx) => {
          const id = `ai-${alert.id}-${idx}`;
          const productId = alert.productId ? String(alert.productId) : undefined;
          const title = alert.status === 'critical' ? 'Critical AI Alert' : 'AI Prediction Alert';
          const depletionDays = alert.aiDepletionDays || alert.daysRemaining;
          const recommendedQty = alert.recommendedQty;
          let message = `${alert.name} predicted to run out ${depletionDays <= 1 ? 'in 1 day' : `in ${depletionDays} days`}`;
          if (recommendedQty) {
            message += `. AI recommends restocking ${recommendedQty} units`;
          }
          
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
            type: alert.status === 'critical' ? 'error' : 'warning',
            productId,
            recommendedQty: recommendedQty || null,
          };
        });

        const combinedNotifications = [...aiNotifications, ...lowStockNotifications];
        setNotifications(combinedNotifications);
        try {
          await AsyncStorage.setItem('notifications', JSON.stringify(combinedNotifications));
        } catch (storageError) {
          if (__DEV__) {
            console.error('Failed to persist notifications:', storageError);
          }
        }
      } else {
        // Don't clear notifications if they exist, just keep existing ones
        if (existingNotifications.length > 0) {
          // Recalculate relative time for existing notifications
          const formatRelativeTime = (timestamp: number) => {
            const now = Date.now();
            const diff = Math.max(0, now - timestamp);
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(diff / 60000);
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
          
          const updatedExisting = existingNotifications.map(n => ({
            ...n,
            relativeTime: formatRelativeTime(n.timestamp || Date.now()),
            formattedTime: new Date(n.timestamp || Date.now()).toLocaleString(),
          }));
          setNotifications(updatedExisting);
          try {
            await AsyncStorage.setItem('notifications', JSON.stringify(updatedExisting));
          } catch (storageError) {
            if (__DEV__) {
              console.error('Failed to persist notifications:', storageError);
            }
          }
        } else {
          setNotifications([]);
          try {
            await AsyncStorage.setItem('notifications', JSON.stringify([]));
          } catch (storageError) {
            if (__DEV__) {
              console.error('Failed to persist notifications:', storageError);
            }
          }
        }
      }
      
      // Fetch suppliers
      const suppliersResponse = await api.get('/suppliers');
      const suppliersData = Array.isArray(suppliersResponse?.data) ? suppliersResponse.data : [];
      setSuppliersCount(suppliersData.length);
      
    } catch (error: any) {
      // Only log errors in development mode
      if (__DEV__) {
        if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network')) {
          console.error('❌ Network error - Backend may not be running or not accessible');
        } else if (error?.response?.status === 500) {
          const errorMsg = error?.response?.data?.message || error?.response?.data?.error || 'Server error';
          console.error('❌ Server Error (500):', errorMsg);
        } else if (error?.response) {
          console.error('❌ API Error:', error.response.status);
        }
      }
      // Don't show alert on every poll, just log it
      // Set defaults to prevent undefined errors
      setTotalItems(0);
      setLowStockCount(0);
      setCriticalItemsCount(0);
      setSuppliersCount(0);
      setAiAlerts([]);
      // Preserve existing notifications on error, don't clear them
      try {
        const stored = await AsyncStorage.getItem('notifications');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length) {
            setNotifications(parsed);
          }
        }
      } catch (storageError) {
        // Ignore errors
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
    // Lightweight polling to simulate live updates on mobile
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('notifications');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length) {
            setNotifications(parsed);
          }
        }
      } catch (storageError) {
        if (__DEV__) {
          console.error('Unable to load stored notifications:', storageError);
        }
      }
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const formatValue = (value) => (loading ? '--' : (value ?? 0));

  const lowStockTrend = lowStockCount > 0
    ? {
        label: lowStockCount === 1 ? '1 item needs attention' : `${lowStockCount} items need attention`,
        color: warningColor,
        background: `${warningColor}20`,
      }
    : {
        label: 'All items healthy',
        color: successColor,
        background: `${successColor}20`,
      };

  const criticalTrend = criticalItemsCount > 0
    ? {
        label: 'Immediate action required',
        color: dangerColor,
        background: `${dangerColor}20`,
      }
    : {
        label: 'No urgent alerts',
        color: successColor,
        background: `${successColor}20`,
      };

  const suppliersTrend = suppliersCount > 0
    ? {
        label: `${suppliersCount === 1 ? '1 partner onboard' : `${suppliersCount} partners active`}`,
        color: successColor,
        background: `${successColor}20`,
      }
    : {
        label: 'Add your first supplier',
        color: warningColor,
        background: `${warningColor}20`,
      };

  const criticalAlert = aiAlerts.find((alert) => alert.status === 'critical') || aiAlerts[0] || null;
  const warningAlert = aiAlerts
    .filter((alert) => !criticalAlert || alert.id !== criticalAlert.id)
    .find((alert) => alert.status === 'warning') || null;

  const resolvePredictionLabel = (daysRemaining?: number) => {
    if (!Number.isFinite(daysRemaining)) {
      return 'Prediction unavailable';
    }
    if (!daysRemaining || daysRemaining <= 0) {
      return 'Predicted to run out today';
    }
    if (daysRemaining === 1) {
      return 'Predicted to run out in 1 day';
    }
    return `Predicted to run out in ${daysRemaining} days`;
  };

  const handleAlertPress = (alert: any) => {
    if (!alert?.productId) return;
    router.push({
      pathname: '/(tabs)/prediction',
      params: { id: String(alert.productId) }
    });
  };

  const handleReorderAll = async () => {
    try {
      const itemsToReorder = filteredAlerts.map(alert => ({
        name: alert.name,
        sku: alert.sku,
        stock: alert.stock,
        threshold: alert.threshold,
        status: alert.status,
        daysRemaining: alert.daysRemaining || alert.aiDepletionDays,
        recommendedQty: alert.recommendedQty || null,
      }));

      const response = await sendReorderEmail(itemsToReorder, alertFilter);
      
      if (response.data?.success) {
        const supplierCount = response.data.results?.total || 1;
        Alert.alert(
          'Reorder Request',
          `An email has been sent to ${supplierCount} supplier(s).`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          response.data?.error || response.data?.message || 'Failed to process reorder request. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error sending reorder email:', error);
      Alert.alert(
        'Error',
        'Failed to send email. Please check your email configuration.',
        [{ text: 'OK' }]
      );
    }
  };

  const openAlertModal = (filter: 'low' | 'critical') => {
    setAlertFilter(filter);
    setAlertModalVisible(true);
  };

  const closeAlertModal = () => {
    setAlertModalVisible(false);
  };

  const filteredAlerts = alertFilter === 'critical'
    ? aiAlerts.filter((alert) => alert.status === 'critical')
    : aiAlerts.filter((alert) => alert.status !== 'normal');

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      
      <ScrollView 
        contentContainerStyle={[
          styles.contentContainer,
          {
            padding: contentPadding,
            paddingBottom: contentPadding + 8,
            gap: sectionGap,
          },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <ThemedText
            type="title"
            style={[
              styles.title,
              { color: textColor, fontSize: isCompact ? 26 : 28, marginBottom: isCompact ? 6 : 8 },
            ]}
          >
            Dashboard
          </ThemedText>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => router.push('/notifications')}
            >
              <MaterialIcons name="notifications" size={24} color={textColor} />
              {notifications.length > 0 && (
                <View style={styles.notificationBadge}>
                  <ThemedText style={styles.notificationBadgeText}>
                    {notifications.length}
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Stock Overview Cards */}
        <View style={[styles.statsRow, { gap: sectionGap }]}>
          <Card
            style={[
              styles.statCard,
              isCompact && { flexBasis: summaryCardFlex, maxWidth: '48%' },
              {
                backgroundColor: cardBackgroundColor,
                borderColor,
                minHeight: isCompact ? 150 : undefined,
              },
            ]}
          >
            <View style={styles.statHeader}>
              <MaterialIcons name="inventory" size={24} color={primaryColor} />
              <ThemedText
                type="subtitle"
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={[styles.statTitle, { color: textColor }]}
              >
                Total Items
              </ThemedText>
            </View> 
            <ThemedText style={[styles.statValue, { color: textColor, fontSize: isCompact ? 24 : 28 }]}>
              {formatValue(totalItems)}
            </ThemedText>
            <ThemedText
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.88}
              style={[
                styles.statDescription,
                { color: textSecondaryColor, fontSize: isCompact ? 13 : 14 },
              ]}
            >
              Motorcycle parts inventory
            </ThemedText>
            <View style={[styles.trendIndicator, { backgroundColor: successColor + '20' }]}>
              <MaterialIcons name="trending-up" size={16} color={successColor} />
              <ThemedText style={[styles.trendText, { color: successColor, fontSize: isCompact ? 11 : 12 }]}>5% increase</ThemedText>
            </View>
          </Card>
          
          <TouchableOpacity
            onPress={() => openAlertModal('low')}
            activeOpacity={0.7}
          >
            <Card
              style={[
                styles.statCard,
                isCompact && { flexBasis: summaryCardFlex, maxWidth: '48%' },
                {
                  backgroundColor: warningColor + '15',
                  borderColor: warningColor,
                  borderWidth: 2,
                  minHeight: isCompact ? 150 : undefined,
                },
              ]}
            >
              <View style={styles.statHeader}>
                <MaterialIcons name="warning" size={24} color={warningColor} />
                <ThemedText
                  type="subtitle"
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  style={[styles.statTitle, { color: textColor }]}
                >
                  Low-Stock Alerts
                </ThemedText>
              </View>
              <ThemedText style={[styles.statValue, { color: textColor, fontSize: isCompact ? 24 : 28 }]}>
                {formatValue(lowStockCount)}
              </ThemedText>
              <ThemedText
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.88}
                style={[
                  styles.statDescription,
                  { color: textSecondaryColor, fontSize: isCompact ? 13 : 14 },
                ]}
              >
                Items below threshold
              </ThemedText>
              <View style={[styles.trendIndicator, { backgroundColor: lowStockTrend.background }]}>
                <MaterialIcons name="warning" size={16} color={lowStockTrend.color} />
                <ThemedText style={[styles.trendText, { color: lowStockTrend.color, fontSize: isCompact ? 11 : 12 }]}>
                  {lowStockTrend.label}
                </ThemedText>
              </View>
            </Card>
          </TouchableOpacity>
        </View>

        <View style={[styles.statsRow, { gap: sectionGap }]}>
          <TouchableOpacity
            onPress={() => openAlertModal('critical')}
            activeOpacity={0.7}
          >
            <Card
              style={[
                styles.statCard,
                isCompact && { flexBasis: summaryCardFlex, maxWidth: '48%' },
                {
                  backgroundColor: dangerColor + '15',
                  borderColor: dangerColor,
                  borderWidth: 2,
                  minHeight: isCompact ? 150 : undefined,
                },
              ]}
            >
              <View style={styles.statHeader}>
                <MaterialIcons name="error" size={24} color={dangerColor} />
                <ThemedText
                  type="subtitle"
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  style={[styles.statTitle, { color: textColor }]}
                >
                  Critical Items
                </ThemedText>
              </View>
              <ThemedText style={[styles.statValue, { color: textColor, fontSize: isCompact ? 24 : 28 }]}>
                {formatValue(criticalItemsCount)}
              </ThemedText>
              <ThemedText
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.88}
                style={[
                  styles.statDescription,
                  { color: textSecondaryColor, fontSize: isCompact ? 13 : 14 },
                ]}
              >
                Urgent reorder needed
              </ThemedText>
              <View style={[styles.trendIndicator, { backgroundColor: criticalTrend.background }]}>
                <MaterialIcons name="notification-important" size={16} color={criticalTrend.color} />
                <ThemedText style={[styles.trendText, { color: criticalTrend.color, fontSize: isCompact ? 11 : 12 }]}>
                  {criticalTrend.label}
                </ThemedText>
              </View>
            </Card>
          </TouchableOpacity>
          
          <Card
            style={[
              styles.statCard,
              isCompact && { flexBasis: summaryCardFlex, maxWidth: '48%' },
              {
                backgroundColor: cardBackgroundColor,
                borderColor,
                minHeight: isCompact ? 150 : undefined,
              },
            ]}
          >
            <View style={styles.statHeader}>
              <MaterialIcons name="business" size={24} color={successColor} />
              <ThemedText
                type="subtitle"
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={[styles.statTitle, { color: textColor }]}
              >
                Suppliers
              </ThemedText>
            </View>
            <ThemedText style={[styles.statValue, { color: textColor, fontSize: isCompact ? 24 : 28 }]}>
              {formatValue(suppliersCount)}
            </ThemedText>
            <ThemedText
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.88}
              style={[
                styles.statDescription,
                { color: textSecondaryColor, fontSize: isCompact ? 13 : 14 },
              ]}
            >
              Active partnerships
            </ThemedText>
            <View style={[styles.trendIndicator, { backgroundColor: suppliersTrend.background }]}>
              <MaterialIcons name="groups" size={16} color={suppliersTrend.color} />
              <ThemedText style={[styles.trendText, { color: suppliersTrend.color, fontSize: isCompact ? 11 : 12 }]}>
                {suppliersTrend.label}
              </ThemedText>
            </View>
          </Card>
        </View>

        {/* AI-Powered Alerts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={[styles.sectionTitle, { color: textColor }]}>AI-Powered Alerts</ThemedText>
            <TouchableOpacity>
              <ThemedText style={[styles.viewAll, { color: primaryColor }]}>View All</ThemedText>
            </TouchableOpacity>
          </View>
          
          {criticalAlert ? (
            <View
              style={[
                styles.alertCardDanger,
                isCompact && styles.alertCardStacked,
                { backgroundColor: cardBackgroundColor, borderLeftColor: dangerColor },
              ]}
            >
              <View
                style={[
                  styles.alertBadgeDanger,
                  { backgroundColor: dangerColor },
                  isCompact && styles.alertBadgeStacked,
                ]}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <ThemedText style={[styles.alertTitleDanger, { color: dangerColor }]}>{criticalAlert?.name || 'Unknown Item'}</ThemedText>
                <ThemedText style={[styles.alertMeta, { color: textSecondaryColor }]}>
                  {criticalAlert?.sku || 'N/A'}
                </ThemedText>
                <ThemedText style={[styles.alertMessageDanger, { color: dangerColor }]}>
                  {resolvePredictionLabel(criticalAlert?.aiDepletionDays || criticalAlert?.daysRemaining)}
                </ThemedText>
                {criticalAlert?.recommendedQty && (
                  <ThemedText style={[styles.alertMessageDanger, { color: dangerColor, marginTop: 4, fontSize: 12 }]}>
                    AI recommends restocking {criticalAlert.recommendedQty} units
                  </ThemedText>
                )}
                <View style={styles.alertStats}>
                  <View style={styles.statItem}>
                    <MaterialIcons name="inventory" size={16} color={textSecondaryColor} />
                    <ThemedText style={[styles.statText, { color: textSecondaryColor }]}>{criticalAlert?.stock ?? 0} units</ThemedText>
                  </View>
                  <View style={styles.statItem}>
                    <MaterialIcons name="flag" size={16} color={textSecondaryColor} />
                    <ThemedText style={[styles.statText, { color: textSecondaryColor }]}>{criticalAlert?.threshold ?? 0} threshold</ThemedText>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.btnDanger,
                  { backgroundColor: dangerColor },
                  isCompact && styles.btnFullWidth,
                ]}
                onPress={() => handleAlertPress(criticalAlert)}
              >
                <ThemedText style={styles.btnTextStrong}>REORDER</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={[
                styles.alertCardDanger,
                isCompact && styles.alertCardStacked,
                { backgroundColor: cardBackgroundColor, borderLeftColor: dangerColor },
              ]}
            >
              <View
                style={[
                  styles.alertBadgeDanger,
                  { backgroundColor: dangerColor },
                  isCompact && styles.alertBadgeStacked,
                ]}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <ThemedText style={[styles.alertTitleDanger, { color: dangerColor }]}>No Critical Alerts</ThemedText>
                <ThemedText style={[styles.alertMeta, { color: textSecondaryColor }]}>All inventory levels are healthy</ThemedText>
                <ThemedText style={[styles.alertMessageDanger, { color: dangerColor }]}>No immediate action required</ThemedText>
              </View>
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.btnDanger,
                  { backgroundColor: dangerColor },
                  isCompact && styles.btnFullWidth,
                ]}
              >
                <ThemedText style={styles.btnTextStrong}>VIEW</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {warningAlert ? (
            <View
              style={[
                styles.alertCardWarn,
                isCompact && styles.alertCardStacked,
                { backgroundColor: cardBackgroundColor, borderLeftColor: warningColor },
              ]}
            >
              <View
                style={[
                  styles.alertBadgeWarn,
                  { backgroundColor: warningColor },
                  isCompact && styles.alertBadgeStacked,
                ]}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <ThemedText style={[styles.alertTitleWarn, { color: warningColor }]}>{warningAlert?.name || 'Unknown Item'}</ThemedText>
                <ThemedText style={[styles.alertMeta, { color: textSecondaryColor }]}>
                  {warningAlert?.sku || 'N/A'}
                </ThemedText>
                <ThemedText style={[styles.alertMessageWarn, { color: warningColor }]}>
                  {resolvePredictionLabel(warningAlert?.aiDepletionDays || warningAlert?.daysRemaining)}
                </ThemedText>
                {warningAlert?.recommendedQty && (
                  <ThemedText style={[styles.alertMessageWarn, { color: warningColor, marginTop: 4, fontSize: 12 }]}>
                    AI recommends restocking {warningAlert.recommendedQty} units
                  </ThemedText>
                )}
                <View style={styles.alertStats}>
                  <View style={styles.statItem}>
                    <MaterialIcons name="inventory" size={16} color={textSecondaryColor} />
                    <ThemedText style={[styles.statText, { color: textSecondaryColor }]}>{warningAlert?.stock ?? 0} units</ThemedText>
                  </View>
                  <View style={styles.statItem}>
                    <MaterialIcons name="flag" size={16} color={textSecondaryColor} />
                    <ThemedText style={[styles.statText, { color: textSecondaryColor }]}>{warningAlert?.threshold ?? 0} threshold</ThemedText>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.btnWarn,
                  { backgroundColor: warningColor },
                  isCompact && styles.btnFullWidth,
                ]}
                onPress={() => handleAlertPress(warningAlert)}
              >
                <ThemedText style={styles.btnTextStrongDark}>VIEW</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={[
                styles.alertCardWarn,
                isCompact && styles.alertCardStacked,
                { backgroundColor: cardBackgroundColor, borderLeftColor: warningColor },
              ]}
            >
              <View
                style={[
                  styles.alertBadgeWarn,
                  { backgroundColor: warningColor },
                  isCompact && styles.alertBadgeStacked,
                ]}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <ThemedText style={[styles.alertTitleWarn, { color: warningColor }]}>No Warning Alerts</ThemedText>
                <ThemedText style={[styles.alertMeta, { color: textSecondaryColor }]}>All inventory levels are stable</ThemedText>
                <ThemedText style={[styles.alertMessageWarn, { color: warningColor }]}>No items approaching threshold</ThemedText>
              </View>
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.btnWarn,
                  { backgroundColor: warningColor },
                  isCompact && styles.btnFullWidth,
                ]}
              >
                <ThemedText style={styles.btnTextStrongDark}>VIEW</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {/* Reorder Them All Button */}
          {(criticalAlert || warningAlert || aiAlerts.length > 0) && (
            <TouchableOpacity
              style={[
                styles.reorderAllButton,
                { backgroundColor: dangerColor },
              ]}
              onPress={handleReorderAll}
            >
              <MaterialIcons name="email" size={20} color="#ffffff" />
              <ThemedText style={styles.reorderAllButtonText}>
                Reorder Them All
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Alert Modal */}
      <Modal
        visible={alertModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeAlertModal}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: cardBackgroundColor }]}>
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <ThemedText type="title" style={[styles.modalTitle, { color: textColor }]}>
                {alertFilter === 'critical' ? 'Critical Items' : 'Low-Stock Alerts'}
              </ThemedText>
              <TouchableOpacity onPress={closeAlertModal}>
                <MaterialIcons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            {filteredAlerts.length === 0 ? (
              <View style={styles.emptyModalContainer}>
                <MaterialIcons name="inventory" size={48} color={textSecondaryColor} />
                <ThemedText style={[styles.emptyModalText, { color: textSecondaryColor }]}>
                  No {alertFilter === 'critical' ? 'critical' : 'low-stock'} items right now.
                </ThemedText>
              </View>
            ) : (
              <FlatList
                data={filteredAlerts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const alertColor = alertFilter === 'critical' ? dangerColor : warningColor;
                  return (
                    <View
                      style={[
                        styles.modalAlertCard,
                        {
                          backgroundColor: cardBackgroundColor,
                          borderLeftColor: alertColor,
                        },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 4 }}>
                        <ThemedText
                          style={[
                            styles.modalAlertTitle,
                            { color: alertColor },
                          ]}
                        >
                          {item.name || 'Unknown Item'}
                        </ThemedText>
                        <ThemedText style={[styles.modalAlertMeta, { color: textSecondaryColor }]}>
                          {item.sku || 'N/A'}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.modalAlertMessage,
                            { color: alertColor },
                          ]}
                        >
                          {resolvePredictionLabel(item.aiDepletionDays || item.daysRemaining)}
                        </ThemedText>
                        {item.recommendedQty && (
                          <ThemedText
                            style={[
                              styles.modalAlertMessage,
                              {
                                color: alertColor,
                                marginTop: 4,
                                fontSize: 12,
                              },
                            ]}
                          >
                            AI recommends restocking {item.recommendedQty} units
                          </ThemedText>
                        )}
                      <View style={styles.modalAlertStats}>
                        <View style={styles.statItem}>
                          <MaterialIcons name="inventory" size={16} color={textSecondaryColor} />
                          <ThemedText style={[styles.statText, { color: textSecondaryColor }]}>
                            {item.stock ?? 0} units
                          </ThemedText>
                        </View>
                        <View style={styles.statItem}>
                          <MaterialIcons name="flag" size={16} color={textSecondaryColor} />
                          <ThemedText style={[styles.statText, { color: textSecondaryColor }]}>
                            {item.threshold ?? 0} threshold
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  </View>
                  );
                }}
                style={styles.modalList}
                contentContainerStyle={styles.modalListContent}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.reorderAllButton,
                  { backgroundColor: dangerColor, marginTop: 12 },
                ]}
                onPress={async () => {
                  await handleReorderAll();
                  closeAlertModal();
                }}
              >
                <MaterialIcons name="email" size={20} color="#ffffff" />
                <ThemedText style={styles.reorderAllButtonText}>
                  Reorder Them All
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCloseButton, { backgroundColor: borderColor }]}
                onPress={closeAlertModal}
              >
                <ThemedText style={[styles.modalCloseButtonText, { color: textColor }]}>
                  Close
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  notificationButton: {
    position: 'relative',
  },
  
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    minWidth: 160,
    alignItems: 'flex-start',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    marginVertical: 4,
  },
  statDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 18,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: 'stretch',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  alertCardDanger: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    gap: 12,
  },
  alertCardWarn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    gap: 12,
  },
  alertCardStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  alertBadgeDanger: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
    marginTop: 6,
  },
  alertBadgeWarn: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
    marginTop: 6,
  },
  alertBadgeStacked: {
    marginRight: 0,
    marginBottom: 8,
  },
  alertTitleDanger: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  alertTitleWarn: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  alertMeta: {
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'left',
  },
  alertMessageDanger: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 8,
  },
  alertMessageWarn: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 8,
  },
  alertStats: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 12,
    alignSelf: 'flex-start',
  },
  btnFullWidth: {
    marginLeft: 0,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  btnDanger: {
    backgroundColor: '#d32f2f',
  },
  btnWarn: {
    backgroundColor: '#FFD166',
  },
  btnTextStrong: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  btnTextStrongDark: {
    color: '#333333',
    fontWeight: '800',
    fontSize: 12,
  },
  reorderAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  reorderAllButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalList: {
    maxHeight: 400,
  },
  modalListContent: {
    gap: 12,
    paddingVertical: 8,
  },
  modalAlertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  modalAlertTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  modalAlertMeta: {
    fontSize: 12,
    marginBottom: 4,
  },
  modalAlertMessage: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 8,
  },
  modalAlertStats: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  emptyModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyModalText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  modalActions: {
    marginTop: 16,
    gap: 12,
  },
  modalCloseButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
