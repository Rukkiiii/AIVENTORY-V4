import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Modal, TextInput, Alert, RefreshControl, FlatList } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { useEffect, useState } from 'react';
import { useThemeColor } from '@/hooks/use-theme-color';
import api, { getProductPrediction } from '@/services/api';

const windowWidth = Dimensions.get('window').width;

export default function PredictionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const productId = params.id as string;

  // State management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [item, setItem] = useState<any>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any>(null);

  // Modal states
  const [isAddStockModalVisible, setIsAddStockModalVisible] = useState(false);
  const [isRemoveStockModalVisible, setIsRemoveStockModalVisible] = useState(false);
  const [stockQuantity, setStockQuantity] = useState('1');
  const [stockReason, setStockReason] = useState('');

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const primaryColor = useThemeColor({}, 'primary');
  const successColor = useThemeColor({}, 'success');
  const dangerColor = useThemeColor({}, 'danger');
  const warningColor = useThemeColor({}, 'warning');

  // Fetch product details
  const fetchProductDetails = async () => {
    if (!productId) {
      if (__DEV__) {
        console.warn('No product ID provided');
      }
      Alert.alert('Error', 'Product ID is missing');
      router.back();
      return;
    }
    
    try {
      const response = await api.get(`/products/${productId}`);
      if (response?.data) {
        setItem(response.data);
      } else {
        if (__DEV__) {
          console.error('Product not found in response:', productId);
        }
        Alert.alert('Error', 'Product not found');
        router.back();
      }
    } catch (error: any) {
      if (__DEV__) {
        console.error('Error fetching product:', error?.response?.status, error?.response?.data || error?.message);
      }
      
      // Handle 404 specifically
      if (error?.response?.status === 404) {
        Alert.alert('Product Not Found', `Product with ID ${productId} does not exist. It may have been deleted.`, [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', 'Failed to load product details');
      }
    }
  };

  // Fetch AI predictions using LSTM service
  const fetchPredictions = async () => {
    if (!productId) return;
    
    try {
      const response = await getProductPrediction(productId);
      if (response?.data?.success && response?.data?.prediction) {
        // Map LSTM response to mobile app format
        const predData = response.data;
        const depletion = predData.depletion_prediction || {};
        const reorder = predData.reorder_suggestion || {};
        
        setPrediction({
          days_until_depletion: depletion.depletion_days || null,
          suggested_reorder_quantity: reorder.suggested_quantity || 50,
          predicted_depletion_date: depletion.depletion_date || null,
          status: predData.prediction?.status || (item?.Product_stock <= item?.reorder_level ? 'At Risk' : 'Good'),
          confidence: depletion.confidence || 85,
          model_type: 'LSTM'
        });
      } else {
        // Fallback if prediction not available
        setPrediction({
          days_until_depletion: 7,
          suggested_reorder_quantity: 50,
          predicted_depletion_date: null,
          status: item?.Product_stock <= item?.reorder_level ? 'At Risk' : 'Good'
        });
      }
    } catch (error: any) {
      if (__DEV__) {
        // Only log non-404 errors (404 is expected if product doesn't exist)
        if (error?.response?.status !== 404) {
          console.error('Error fetching predictions:', error?.response?.status, error?.response?.data || error?.message);
        }
      }
      setPrediction({
        days_until_depletion: 7,
        suggested_reorder_quantity: 50,
        predicted_depletion_date: null,
        status: item?.Product_stock <= item?.reorder_level ? 'At Risk' : 'Good'
      });
    }
  };

  // Fetch stock history
  const fetchHistory = async () => {
    if (!productId) return;
    
    try {
      const response = await api.get(`/products/${productId}/history`);
      const historyData = Array.isArray(response?.data) ? response.data : [];
      setHistory(historyData);
      
      // Generate chart data from history
      if (historyData.length > 0) {
        generateChartData(historyData);
      }
    } catch (error: any) {
      if (__DEV__) {
        // Only log non-404 errors (404 is expected if product doesn't exist or no history)
        if (error?.response?.status !== 404) {
          console.error('Error fetching history:', error?.response?.status, error?.response?.data || error?.message);
        }
      }
      setHistory([]);
    }
  };

  // Generate chart data from history
  const generateChartData = (historyData: any[]) => {
    // Reverse to get chronological order
    const sorted = [...historyData].reverse();
    const labels = sorted.slice(-12).map((_, i) => {
      const date = new Date(sorted[i]?.sm_date || Date.now());
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    // Calculate stock levels over time
    let runningStock = item?.Product_stock || 0;
    const stockLevels = sorted.slice(-12).reverse().map((entry) => {
      if (entry.stock_movement_type === 'in') {
        runningStock -= entry.stock_movement_quantity;
      } else {
        runningStock += entry.stock_movement_quantity;
      }
      return runningStock;
    });
    
    const threshold = item?.reorder_level || 10;
    const predictedData = stockLevels.length > 0 ? 
      Array.from({ length: Math.min(7, stockLevels.length) }, (_, i) => {
        const lastStock = stockLevels[stockLevels.length - 1];
        const avgDailyChange = stockLevels.length > 1 ? 
          (stockLevels[0] - stockLevels[stockLevels.length - 1]) / stockLevels.length : 2;
        return Math.max(0, lastStock - (avgDailyChange * (i + 1)));
      }) : [];

    setChartData({
      labels: labels.length > 0 ? labels : ['Historical'],
      datasets: [
        {
          data: stockLevels.length > 0 ? stockLevels : [item?.Product_stock || 0],
          color: (opacity = 1) => `rgba(46, 58, 140, ${opacity})`,
          strokeWidth: 2
        },
        ...(predictedData.length > 0 ? [{
          data: [...Array(stockLevels.length).fill(null), ...predictedData],
          color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
          strokeWidth: 2,
          dashedLine: [5, 5]
        }] : []),
        {
          data: Array(labels.length || 1).fill(threshold),
          color: (opacity = 1) => `rgba(6, 214, 160, ${opacity})`,
          strokeWidth: 1,
          dashedLine: [3, 3]
        }
      ],
      legend: ['Historical Stock', 'AI Prediction', 'Reorder Threshold']
    });
  };

  // Load all data
  const loadData = async () => {
    setLoading(true);
    await fetchProductDetails();
    await Promise.all([fetchPredictions(), fetchHistory()]);
    setLoading(false);
  };

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, [productId]);

  // Update chart when item changes
  useEffect(() => {
    if (item && history.length > 0) {
      generateChartData(history);
    }
  }, [item]);

  // Handle add stock
  const handleAddStock = async () => {
    const quantity = parseInt(stockQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    try {
      const response = await api.patch(`/products/${productId}/stock`, {
        quantity,
        action: 'add',
        reason: stockReason,
        staff_id: 1,
        user_name: 'Admin'
      });

      Alert.alert(
        'Success', 
        `✅ Stock updated successfully — Current stock: ${response.data.new_stock} units.`,
        [{ text: 'OK', onPress: () => {
          setIsAddStockModalVisible(false);
          setStockQuantity('1');
          setStockReason('');
          loadData();
        }}]
      );
    } catch (error: any) {
      if (__DEV__) {
        console.error('Error adding stock:', error);
      }
      Alert.alert('Error', error.response?.data?.error || 'Failed to add stock');
    }
  };

  // Handle remove stock
  const handleRemoveStock = async () => {
    const quantity = parseInt(stockQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (quantity > (item?.Product_stock || 0)) {
      Alert.alert('Error', `Cannot remove more than available stock (${item?.Product_stock || 0})`);
      return;
    }

    try {
      const response = await api.patch(`/products/${productId}/stock`, {
        quantity,
        action: 'remove',
        reason: stockReason,
        staff_id: 1,
        user_name: 'Admin'
      });

      Alert.alert(
        'Success', 
        `✅ Stock updated successfully — Current stock: ${response.data.new_stock} units.`,
        [{ text: 'OK', onPress: () => {
          setIsRemoveStockModalVisible(false);
          setStockQuantity('1');
          setStockReason('');
          loadData();
        }}]
      );
    } catch (error: any) {
      if (__DEV__) {
        console.error('Error removing stock:', error);
      }
      Alert.alert('Error', error.response?.data?.error || 'Failed to remove stock');
    }
  };

  // Get status style
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Good': return { backgroundColor: 'rgba(6, 214, 160, 0.1)', borderColor: '#06D6A0' };
      case 'Warning': return { backgroundColor: 'rgba(255, 209, 102, 0.1)', borderColor: '#FFD166' };
      case 'At Risk': return { backgroundColor: 'rgba(255, 107, 107, 0.1)', borderColor: '#FF6B6B' };
      default: return { backgroundColor: 'rgba(108, 117, 125, 0.1)', borderColor: '#6C757D' };
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading && !item) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#2E3A8C" />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>Item Details</ThemedText>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <ThemedText style={[styles.loadingText, { color: textSecondaryColor }]}>Loading item details...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!item) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#2E3A8C" />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>Item Details</ThemedText>
        </View>
        <View style={styles.loadingContainer}>
          <ThemedText style={[styles.loadingText, { color: textSecondaryColor }]}>Product not found</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const itemStatus = item.Product_stock <= item.reorder_level ? 'At Risk' : 
                     item.Product_stock <= item.reorder_level * 1.5 ? 'Warning' : 'Good';

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(46, 58, 140, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: '4', strokeWidth: '2', stroke: '#2E3A8C' }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#2E3A8C" />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>Item Details</ThemedText>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Item Overview Section */}
        <Card style={[styles.itemCard, { backgroundColor: cardBackgroundColor }]}>
          <View style={styles.itemHeader}>
            <ThemedText type="defaultSemiBold" style={[styles.itemName, { color: textColor }]}>
              {item.Product_name}
            </ThemedText>
            <View style={[styles.statusBadge, getStatusStyle(itemStatus)]}>
              <Text style={[styles.statusText, { color: getStatusStyle(itemStatus).borderColor }]}>
                {itemStatus}
              </Text>
            </View>
          </View>
          
          <View style={styles.itemDetails}>
            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: textSecondaryColor }]}>SKU / Barcode:</ThemedText>
              <ThemedText style={[styles.detailValue, { color: textColor }]}>{item.Product_sku}</ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: textSecondaryColor }]}>Category:</ThemedText>
              <ThemedText style={[styles.detailValue, { color: textColor }]}>{item.Product_category || 'Unknown'}</ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: textSecondaryColor }]}>Current Stock:</ThemedText>
              <ThemedText style={[styles.detailValue, { color: textColor, fontWeight: '700' }]}>
                {item.Product_stock || 0} units
              </ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: textSecondaryColor }]}>Reorder Threshold:</ThemedText>
              <ThemedText style={[styles.detailValue, { color: textColor }]}>{item.reorder_level || 10} units</ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: textSecondaryColor }]}>Unit Price:</ThemedText>
              <ThemedText style={[styles.detailValue, { color: textColor }]}>₱{parseFloat(item.Product_price || 0).toFixed(2)}</ThemedText>
            </View>
            {item.supplier_name && (
              <View style={styles.detailRow}>
                <ThemedText style={[styles.detailLabel, { color: textSecondaryColor }]}>Supplier:</ThemedText>
                <ThemedText style={[styles.detailValue, { color: textColor }]}>{item.supplier_name}</ThemedText>
              </View>
            )}
            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: textSecondaryColor }]}>Last Updated:</ThemedText>
              <ThemedText style={[styles.detailValue, { color: textColor }]}>
                {item.updated_at ? formatDate(item.updated_at) : 'N/A'}
              </ThemedText>
            </View>
          </View>
        </Card>

        {/* AI Prediction Section */}
        {prediction && (
          <Card style={[styles.predictionCard, { backgroundColor: cardBackgroundColor, borderLeftColor: itemStatus === 'At Risk' ? dangerColor : itemStatus === 'Warning' ? warningColor : successColor }]}>
            <View style={styles.predictionHeader}>
              <MaterialIcons 
                name={itemStatus === 'At Risk' ? 'warning' : 'insights'} 
                size={20} 
                color={itemStatus === 'At Risk' ? dangerColor : itemStatus === 'Warning' ? warningColor : successColor} 
              />
              <ThemedText type="subtitle" style={[styles.predictionTitle, { color: textColor }]}>AI Prediction & Insights</ThemedText>
            </View>
            
            <View style={styles.predictionBody}>
              <ThemedText style={[styles.predictionText, { color: textColor }]}>
                Item predicted to run out in <Text style={styles.boldText}>{prediction.days_until_depletion || 0} days</Text>.
              </ThemedText>
              
              <View style={styles.predictionDetails}>
                <View style={styles.detailItem}>
                  <ThemedText style={[styles.detailLabel, { color: textSecondaryColor }]}>Depletion Date:</ThemedText>
                  <ThemedText style={[styles.detailValue, { color: textColor }]}>
                    {prediction.predicted_depletion_date ? formatDate(prediction.predicted_depletion_date) : 'N/A'}
                  </ThemedText>
                </View>
                <View style={styles.detailItem}>
                  <ThemedText style={[styles.detailLabel, { color: textSecondaryColor }]}>Suggested Reorder:</ThemedText>
                  <ThemedText style={[styles.detailValue, { color: textColor }]}>{prediction.suggested_reorder_quantity || 50} units</ThemedText>
                </View>
              </View>
            </View>
          </Card>
        )}

        {/* Chart */}
        {chartData && (
          <Card style={[styles.chartCard, { backgroundColor: cardBackgroundColor }]}>
            <ThemedText type="subtitle" style={[styles.chartTitle, { color: textColor }]}>
              Stock Level History & Prediction
            </ThemedText>
            <LineChart
              data={chartData}
              width={windowWidth - 64}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: successColor }]} 
            onPress={() => setIsAddStockModalVisible(true)}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <ThemedText style={styles.actionButtonText}>Add Stock</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: dangerColor }]} 
            onPress={() => setIsRemoveStockModalVisible(true)}
          >
            <MaterialIcons name="remove" size={20} color="#fff" />
            <ThemedText style={styles.actionButtonText}>Remove Stock</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Stock Movement History */}
        <Card style={[styles.historyCard, { backgroundColor: cardBackgroundColor }]}>
          <ThemedText type="subtitle" style={[styles.historyTitle, { color: textColor }]}>
            Stock Movement History
          </ThemedText>
          
          {history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <MaterialIcons name="history" size={32} color={textSecondaryColor} />
              <ThemedText style={[styles.emptyHistoryText, { color: textSecondaryColor }]}>
                No stock movements recorded yet
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item.stock_movement_id.toString()}
              scrollEnabled={false}
              renderItem={({ item: historyItem }) => (
                <View style={[styles.historyRow, { borderBottomColor: backgroundColor }]}>
                  <View style={styles.historyRowLeft}>
                    <View style={[
                      styles.historyTypeBadge,
                      { backgroundColor: historyItem.stock_movement_type === 'in' ? 
                        'rgba(6, 214, 160, 0.1)' : 'rgba(255, 107, 107, 0.1)' }
                    ]}>
                      <MaterialIcons 
                        name={historyItem.stock_movement_type === 'in' ? 'add' : 'remove'} 
                        size={16} 
                        color={historyItem.stock_movement_type === 'in' ? successColor : dangerColor} 
                      />
                    </View>
                    <View style={styles.historyRowInfo}>
                      <ThemedText style={[styles.historyAction, { color: textColor }]}>
                        {historyItem.action}
                      </ThemedText>
                      <ThemedText style={[styles.historyDate, { color: textSecondaryColor }]}>
                        {formatDate(historyItem.sm_date)} • {historyItem.user_name || 'System'}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={[
                    styles.historyQuantity,
                    { color: historyItem.stock_movement_type === 'in' ? successColor : dangerColor }
                  ]}>
                    {historyItem.quantity_display}
                  </ThemedText>
                </View>
              )}
            />
          )}
        </Card>
      </ScrollView>

      {/* Add Stock Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddStockModalVisible}
        onRequestClose={() => setIsAddStockModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBackgroundColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={[styles.modalTitle, { color: textColor }]}>Add Stock</ThemedText>
              <TouchableOpacity onPress={() => setIsAddStockModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={textSecondaryColor} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <ThemedText style={[styles.formLabel, { color: textSecondaryColor }]}>Quantity</ThemedText>
                <TextInput
                  style={[styles.formInput, { backgroundColor: backgroundColor, borderColor: textSecondaryColor, color: textColor }]}
                  value={stockQuantity}
                  onChangeText={setStockQuantity}
                  placeholder="Enter quantity"
                  keyboardType="numeric"
                  autoFocus
                />
              </View>
              
              <View style={styles.formGroup}>
                <ThemedText style={[styles.formLabel, { color: textSecondaryColor }]}>Reason (Optional)</ThemedText>
                <TextInput
                  style={[styles.formInput, { backgroundColor: backgroundColor, borderColor: textSecondaryColor, color: textColor }]}
                  value={stockReason}
                  onChangeText={setStockReason}
                  placeholder="e.g., Purchase order #123"
                  multiline
                />
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel, { borderColor: textSecondaryColor }]} 
                onPress={() => setIsAddStockModalVisible(false)}
              >
                <ThemedText style={[styles.modalButtonText, { color: textSecondaryColor }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: successColor }]} 
                onPress={handleAddStock}
              >
                <ThemedText style={styles.modalButtonTextWhite}>Add Stock</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Remove Stock Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isRemoveStockModalVisible}
        onRequestClose={() => setIsRemoveStockModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBackgroundColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={[styles.modalTitle, { color: textColor }]}>Remove Stock</ThemedText>
              <TouchableOpacity onPress={() => setIsRemoveStockModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={textSecondaryColor} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <ThemedText style={[styles.formLabel, { color: textSecondaryColor }]}>Quantity</ThemedText>
                <TextInput
                  style={[styles.formInput, { backgroundColor: backgroundColor, borderColor: textSecondaryColor, color: textColor }]}
                  value={stockQuantity}
                  onChangeText={setStockQuantity}
                  placeholder="Enter quantity"
                  keyboardType="numeric"
                  autoFocus
                />
              </View>
              
              <View style={styles.formGroup}>
                <ThemedText style={[styles.formLabel, { color: textSecondaryColor }]}>Reason (Optional)</ThemedText>
                <TextInput
                  style={[styles.formInput, { backgroundColor: backgroundColor, borderColor: textSecondaryColor, color: textColor }]}
                  value={stockReason}
                  onChangeText={setStockReason}
                  placeholder="e.g., Sale #123, Damaged items"
                  multiline
                />
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel, { borderColor: textSecondaryColor }]} 
                onPress={() => setIsRemoveStockModalVisible(false)}
              >
                <ThemedText style={[styles.modalButtonText, { color: textSecondaryColor }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: dangerColor }]} 
                onPress={handleRemoveStock}
              >
                <ThemedText style={styles.modalButtonTextWhite}>Remove Stock</ThemedText>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    flex: 1,
    color: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  itemCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemName: {
    flex: 1,
    fontSize: 20,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  predictionCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderLeftWidth: 4,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictionTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  predictionBody: {
    marginBottom: 8,
  },
  predictionText: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '700',
  },
  predictionDetails: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chartTitle: {
    marginBottom: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  chart: {
    borderRadius: 8,
    marginVertical: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  historyCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  historyTitle: {
    marginBottom: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyHistory: {
    alignItems: 'center',
    padding: 32,
  },
  emptyHistoryText: {
    marginTop: 12,
    fontSize: 14,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  historyRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyTypeBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyRowInfo: {
    flex: 1,
  },
  historyAction: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
  },
  historyQuantity: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  modalButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  modalButtonTextWhite: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
});
