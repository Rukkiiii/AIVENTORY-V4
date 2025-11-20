import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, TextInput, TouchableOpacity, View, RefreshControl } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import api from '@/services/api';

type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  threshold: number;
  price: number;
  status: string;
};

export default function InventoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const getParamValue = (v: unknown): string | undefined => {
    if (typeof v === 'string') return v;
    if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
    return undefined;
  };
  
  // State management
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [filteredData, setFilteredData] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isRemoveModalVisible, setIsRemoveModalVisible] = useState(false);
  const [quantityToRemove, setQuantityToRemove] = useState('1');
  const [editForm, setEditForm] = useState({
    name: '',
    sku: '',
    category: '',
    stock: '',
    threshold: '',
    price: '0'
  });
  const categoryOptions = useMemo(() => {
    const base = Array.isArray(inventoryData)
      ? [...new Set(inventoryData.map(item => item?.category).filter(Boolean))]
      : [];
    const defaults = ['Brakes', 'Battery', 'Lubricants', 'Engine', 'Electrical', 'Transmission'];
    const merged = [...base];
    defaults.forEach((item) => {
      if (!merged.includes(item)) merged.push(item);
    });
    return merged;
  }, [inventoryData]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [quantityToAdd, setQuantityToAdd] = useState('1');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  
  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const textTertiaryColor = useThemeColor({}, 'textTertiary');
  const primaryColor = useThemeColor({}, 'primary');
  const successColor = useThemeColor({}, 'success');
  const dangerColor = useThemeColor({}, 'danger');
  const warningColor = useThemeColor({}, 'warning');
  
  // Fetch inventory data from API
  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/items');
      const products = Array.isArray(response?.data) ? response.data : [];
      const formattedData = products.map((product: any) => {
        const id = (product.Product_id ?? product.id)?.toString();
        const name = product.Product_name ?? product.name ?? 'Unknown';
        const sku = product.Product_sku ?? product.sku ?? '';
        const category = product.Product_category ?? product.category ?? 'Unknown';
        const stock = Number(product.Product_stock ?? product.stock ?? 0);
        const threshold = Number(product.reorder_level ?? product.threshold ?? 10);
        const price = parseFloat(String(product.Product_price ?? product.price ?? 0));
        return {
          id,
          name,
          sku,
          category,
          stock,
          threshold,
          price,
          status: getProductStatus(stock, threshold)
        };
      });
      setInventoryData(formattedData);
      setFilteredData(formattedData);
    } catch (error) {
      if (__DEV__) {
        console.error('Error fetching inventory data:', (error as any)?.response?.data?.error || (error as any)?.message);
      }
      Alert.alert('Error', 'Failed to fetch inventory data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };
  
  // Refresh inventory data
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInventoryData();
    setRefreshing(false);
  };
  
  // Function to determine product status based on stock levels
  const getProductStatus = (stock: number, threshold: number) => {
    if (stock <= 0) return 'Out of Stock';
    if (stock <= threshold) return 'At Risk';
    if (stock <= threshold + 5) return 'Warning';
    return 'Good';
  };
  
  // Initial fetch
  useEffect(() => {
    fetchInventoryData();
  }, []);
  
  // Get unique categories for filter dropdown
  const categories = useMemo(() => ['All', ...new Set(Array.isArray(inventoryData) ? inventoryData.map(item => item?.category).filter(Boolean) : [])], [inventoryData]);
  
  // Filter data based on search and filters
  useEffect(() => {
    if (!Array.isArray(inventoryData)) {
      setFilteredData([]);
      return;
    }
    
    let result = [...inventoryData];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => {
        if (!item) return false;
        const name = (item.name || '').toLowerCase();
        const sku = (item.sku || '').toLowerCase();
        const category = (item.category || '').toLowerCase();
        return name.includes(query) || sku.includes(query) || category.includes(query);
      });
    }
    
    // Apply status filter
    if (filterStatus !== 'All') {
      result = result.filter(item => item && item.status === filterStatus);
    }
    
    // Apply category filter
    if (filterCategory !== 'All') {
      result = result.filter(item => item && item.category === filterCategory);
    }
    
    setFilteredData(result);
  }, [searchQuery, filterStatus, filterCategory, inventoryData]);
  
  // Handle barcode scanning parameters
  useEffect(() => {
    const action = getParamValue((params as any).action);
    if (action === 'add') handleScannedItemAddition();
    if (action === 'remove') handleScannedItemRemoval();
  }, [params]);
  
  // Handle adding scanned items
  const handleScannedItemAddition = async () => {
    const scannedBarcode = getParamValue((params as any).scannedBarcode);
    const itemName = getParamValue((params as any).itemName);
    const action = getParamValue((params as any).action);
    const qtyParam = getParamValue((params as any).quantity);
    const itemPrice = getParamValue((params as any).itemPrice);
    if (scannedBarcode && itemName && action === 'add') {
      try {
        const existingItemIndex = inventoryData.findIndex(item => item.sku === scannedBarcode);
        
        if (existingItemIndex !== -1) {
          // Item exists, increase stock
          const existingItem = inventoryData[existingItemIndex];
          const quantity = Number(qtyParam || 1);
          const updatedStock = existingItem.stock + quantity;
          
          // Use stock movement endpoint to add quantity
          await api.patch(`/items/${existingItem.id}/stock`, {
            quantity,
            action: 'add',
            reason: 'scanned_add',
            staff_id: 1,
            user_name: 'System'
          });
          
          // Update local state
          const updatedData = [...inventoryData];
          updatedData[existingItemIndex] = {
            ...existingItem,
            stock: updatedStock,
            status: getProductStatus(updatedStock, existingItem.threshold || 10)
          };
          
          setInventoryData(updatedData);
          Alert.alert('Success', `Stock for ${existingItem.name} increased to ${updatedStock}`);
        } else {
          // Create new item in database - include all required fields with proper formatting
          const createData = {
            Product_name: itemName.trim() || `Scanned Product ${scannedBarcode}`,
            Product_sku: scannedBarcode,
            Product_category: 'Scanned Item',
            Product_stock: Number(qtyParam || 1),
            reorder_level: 5,
            Product_price: parseFloat(itemPrice || '0') || 0,
            supplier_id: 1,
            Product_status: 'Active'
          };
          
          // Log the data being sent for debugging
          if (__DEV__) {
            console.log('Creating product with data:', createData);
          }
          
          const response = await api.post('/items', createData);
          
          // Add to local state
          const addedItem: InventoryItem = {
            id: response.data.Product_id.toString(),
            name: itemName,
            sku: scannedBarcode,
            category: 'Scanned Item',
            stock: Number(qtyParam || 1),
            threshold: 10,
            price: parseFloat(itemPrice || '0') || 0,
            status: 'Good'
          };
          
          setInventoryData(prevData => [...prevData, addedItem]);
          Alert.alert('Success', `${itemName} has been added to inventory`);
        }
      } catch (error: any) {
        if (__DEV__) {
          console.error('Error adding scanned item:', error?.response?.data?.error || error?.message);
        }
        // Show specific error message
        let errorMessage = 'Failed to add scanned item. Please check all fields are filled correctly.';
        if (error?.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error?.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error?.userMessage) {
          errorMessage = error.userMessage;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        Alert.alert('Error', errorMessage);
      }
      
      // Clear params
      router.setParams({ scannedBarcode: undefined, itemName: undefined, action: undefined });
    }
  };
  
  // Handle removing scanned items
  const handleScannedItemRemoval = async () => {
    const scannedBarcode = getParamValue((params as any).scannedBarcode);
    const action = getParamValue((params as any).action);
    const qtyRemove = getParamValue((params as any).quantityToRemove);
    if (scannedBarcode && qtyRemove && action === 'remove') {
      try {
        const existingItemIndex = inventoryData.findIndex(item => item.sku === scannedBarcode);
        
        if (existingItemIndex !== -1) {
          const existingItem = inventoryData[existingItemIndex];
          const quantity = parseInt(qtyRemove);
          
          if (quantity > existingItem.stock) {
            Alert.alert('Error', `Cannot remove more than available stock (${existingItem.stock})`);
          } else {
            // Use stock movement endpoint to remove specified quantity
            await api.patch(`/items/${existingItem.id}/stock`, {
              quantity,
              action: 'remove',
              reason: 'scanned_remove',
              staff_id: 1,
              user_name: 'System'
            });
            
            // Update local state
            const updatedData = [...inventoryData];
            const newStock = existingItem.stock - quantity;
            updatedData[existingItemIndex] = {
              ...existingItem,
              stock: newStock,
              status: getProductStatus(newStock, existingItem.threshold)
            };
            
            setInventoryData(updatedData);
            
            // Generate invoice
            const invoice = {
              id: `INV-${Date.now()}`,
              date: new Date().toLocaleDateString(),
              customer: 'Walk-in Customer',
              items: [{
                name: existingItem.name,
                quantity: quantity,
                price: existingItem.price || 0
              }],
              subtotal: (existingItem.price || 0) * quantity,
              tax: 0,
              total: (existingItem.price || 0) * quantity,
              status: 'Paid',
              paymentMethod: 'Cash'
            };
            
            Alert.alert(
              'Invoice Generated', 
              `Invoice ID: ${invoice.id}\n` +
              `Date: ${invoice.date}\n` +
              `Item: ${existingItem.name}\n` +
              `Quantity: ${quantity}\n` +
              `Total: $${invoice.total.toFixed(2)}\n` +
              `Status: ${invoice.status}`,
              [{ text: 'OK' }]
            );
            // Single alert only (avoid duplicate)
          }
        } else {
          Alert.alert('Not Found', 'Item with this barcode does not exist in inventory');
        }
      } catch (error: any) {
        if (__DEV__) {
          console.error('Error removing scanned item:', error?.response?.data?.error || error?.message);
        }
        Alert.alert('Error', 'Failed to remove scanned item. Please try again.');
      }
      
      // Clear params
      router.setParams({ scannedBarcode: undefined, quantityToRemove: undefined, action: undefined });
    }
  };
  
  // Status color helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Good': return successColor;
      case 'Warning': return warningColor;
      case 'At Risk': 
      case 'Out of Stock': return dangerColor;
      default: return '#6C757D';
    }
  };
  
  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'Good': return `rgba(${parseInt(successColor.slice(1, 3), 16)}, ${parseInt(successColor.slice(3, 5), 16)}, ${parseInt(successColor.slice(5, 7), 16)}, 0.1)`;
      case 'Warning': return `rgba(${parseInt(warningColor.slice(1, 3), 16)}, ${parseInt(warningColor.slice(3, 5), 16)}, ${parseInt(warningColor.slice(5, 7), 16)}, 0.1)`;
      case 'At Risk': 
      case 'Out of Stock': return `rgba(${parseInt(dangerColor.slice(1, 3), 16)}, ${parseInt(dangerColor.slice(3, 5), 16)}, ${parseInt(dangerColor.slice(5, 7), 16)}, 0.1)`;
      default: return 'rgba(108, 117, 125, 0.1)';
    }
  };
  
  // Modal handlers
  const openEditModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setEditForm({
      name: item.name,
      sku: item.sku,
      category: item.category,
      stock: item.stock.toString(),
      threshold: item.threshold.toString(),
      price: item.price ? item.price.toString() : '0'
    });
    setIsEditModalVisible(true);
  };
  
 
  
  const closeEditModal = () => {
    setIsEditModalVisible(false);
    setSelectedItem(null);
    setEditForm({
      name: '',
      sku: '',
      category: '',
      stock: '',
      threshold: '',
      price: '0'
    });
  };

  const openCreateModal = () => {
    setSelectedItem(null);
    setEditForm({
      name: '',
      sku: '',
      category: '',
      stock: '0',
      threshold: '10',
      price: '0'
    });
    setIsEditModalVisible(true);
  };
  
  const closeRemoveModal = () => {
    setIsRemoveModalVisible(false);
    setSelectedItem(null);
    setQuantityToRemove('1');
  };
  
  const closeAddModal = () => {
    setIsAddModalVisible(false);
    setSelectedItem(null);
    setQuantityToAdd('1');
  };

  const handleAddSave = async () => {
    const quantity = parseInt(quantityToAdd);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }
    if (!selectedItem) {
      Alert.alert('Error', 'No item selected');
      return;
    }
    try {
      const updatedStock = (selectedItem as InventoryItem).stock + quantity;
      await api.patch(`/items/${(selectedItem as InventoryItem).id}/stock`, {
        quantity,
        action: 'add',
        reason: 'manual_add',
        staff_id: 1,
        user_name: 'System'
      });

      const updatedData = [...inventoryData];
      const index = updatedData.findIndex(i => i.id === (selectedItem as InventoryItem).id);
      if (index !== -1) {
        updatedData[index] = {
          ...updatedData[index],
          stock: updatedStock,
          status: getProductStatus(updatedStock, (selectedItem as InventoryItem).threshold)
        } as InventoryItem;
        setInventoryData(updatedData);
      }

      Alert.alert('Stock Updated', `${quantity} unit(s) added to ${(selectedItem as InventoryItem).name}. New stock: ${updatedStock}`);
      closeAddModal();
    } catch (error: any) {
      if (__DEV__) {
        console.error('Error adding stock:', error?.response?.data?.error || error?.message);
      }
      Alert.alert('Error', 'Failed to update stock.');
    }
  };
  
  const openDetailsModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsDetailsModalVisible(true);
  };
  
  // Save handlers
  const handleEditSave = async () => {
    if (!editForm.name || !editForm.sku || !editForm.category || !editForm.stock || !editForm.threshold) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    const parsedStock = Number(editForm.stock);
    const parsedThreshold = Number(editForm.threshold);
    const parsedPrice = parseFloat(editForm.price ?? '0');
    if (Number.isNaN(parsedStock) || Number.isNaN(parsedThreshold) || Number.isNaN(parsedPrice)) {
      Alert.alert('Error', 'Stock, threshold, and price must be valid numbers');
      return;
    }
    
    try {
      const updatedProduct = {
        Product_name: editForm.name,
        Product_sku: editForm.sku,
        Product_category: editForm.category,
        Product_stock: parsedStock,
        reorder_level: parsedThreshold,
        Product_price: parsedPrice || 0,
        supplier_id: 1,
        Product_status: 'Active'
      };
      
      if (selectedItem) {
        // Update existing product
        await api.put(`/items/${selectedItem.id}`, updatedProduct);
        Alert.alert('Success', 'Product updated successfully');
      } else {
        // Create new product
        await api.post('/items', updatedProduct);
        Alert.alert('Success', 'Product created successfully');
      }
      
      closeEditModal();
      fetchInventoryData(); // Refresh data
    } catch (error: any) {
      if (__DEV__) {
        console.error('Error saving product:', error?.response?.data || error?.message || error);
      }
      
      // Show specific error message
      let errorMessage = 'Failed to save product. Please try again.';
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.userMessage) {
        errorMessage = error.userMessage;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    }
  };
  
  const handleRemoveSave = async () => {
    const quantity = parseInt(quantityToRemove);
    
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }
    
    if (selectedItem && quantity > selectedItem.stock) {
      Alert.alert('Error', `Cannot remove more than available stock (${selectedItem.stock})`);
      return;
    }
    
    if (!selectedItem) {
      Alert.alert('Error', 'No item selected');
      return;
    }
    try {
      // Update stock in database
      const updatedStock = (selectedItem as InventoryItem).stock - quantity;
      await api.patch(`/items/${(selectedItem as InventoryItem).id}/stock`, {
        quantity,
        action: 'remove',
        reason: 'manual_remove',
        staff_id: 1,
        user_name: 'System'
      });
      
      // Update local state
      const updatedData = [...inventoryData];
      const itemIndex = updatedData.findIndex(item => item.id === (selectedItem as InventoryItem).id);
      
      if (itemIndex !== -1) {
        updatedData[itemIndex] = {
          ...updatedData[itemIndex],
          stock: updatedStock,
          status: getProductStatus(updatedStock, (selectedItem as InventoryItem).threshold)
        };
        
        setInventoryData(updatedData);
      }
      
      const newStatus = getProductStatus(updatedStock, (selectedItem as InventoryItem).threshold);
      Alert.alert('Stock Updated', `${quantity} unit(s) removed from ${(selectedItem as InventoryItem).name}. New stock: ${updatedStock} (${newStatus}).`);
      
      // Generate invoice
      const total = ((selectedItem as InventoryItem).price || 0) * quantity;
      const invoice = {
        id: `INV-${Date.now()}`,
        date: new Date().toLocaleDateString(),
        customer: 'Walk-in Customer',
        items: [{
          name: (selectedItem as InventoryItem).name,
          quantity: quantity,
          price: (selectedItem as InventoryItem).price || 0
        }],
        subtotal: total,
        tax: 0,
        total: total,
        status: 'Paid',
        paymentMethod: 'Cash'
      };
      
      Alert.alert(
        'Invoice Generated', 
        `Invoice ID: ${invoice.id}\n` +
        `Date: ${invoice.date}\n` +
        `Item: ${(selectedItem as InventoryItem).name}\n` +
        `Quantity: ${quantity}\n` +
        `Total: $${invoice.total.toFixed(2)}\n` +
        `Status: ${invoice.status}`,
        [{ text: 'OK' }]
      );
      // Single alert only (avoid duplicate)
      
      closeRemoveModal();
    } catch (error: any) {
      if (__DEV__) {
        console.error('Error removing product:', error?.response?.data?.error || error?.message);
      }
      Alert.alert('Error', 'Failed to remove product. Please try again.');
    }
  };
  
  const handleDelete = async (item: InventoryItem) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/items/${item.id}`);
              Alert.alert('Success', 'Product deleted successfully');
              fetchInventoryData(); // Refresh data
            } catch (error) {
              if (__DEV__) {
                console.error('Error deleting product:', error);
              }
              Alert.alert('Error', 'Failed to delete product. Please try again.');
            }
          }
        }
      ]
    );
  };
  
  // Navigation
  const handleCardPress = (item: InventoryItem) => {
    openDetailsModal(item);
  };
  
  // Filter helpers
  const clearFilters = () => {
    setSearchQuery('');
    setFilterStatus('All');
    setFilterCategory('All');
  };
  
  // Render item
  const renderItem = ({ item }: { item: InventoryItem }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBackgroundColor }]}
      onPress={() => handleCardPress(item)}
    >
      <View style={styles.itemHeader}>
        <ThemedText type="defaultSemiBold" style={[styles.itemName, { color: textColor }]}>
          {item.name}
        </ThemedText>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusBgColor(item.status), borderColor: getStatusColor(item.status) },
          ]}
        >
          <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </ThemedText>
        </View>
      </View>
      <View style={styles.metaRow}>
        <ThemedText style={[styles.skuText, { color: textSecondaryColor }]}>{item.sku}</ThemedText>
        <View style={styles.inlineRow}>
          <MaterialIcons name="category" size={16} color={textTertiaryColor} />
          <ThemedText style={[styles.metaText, { color: textTertiaryColor }]}>
            {item.category}
          </ThemedText>
        </View>
      </View>
      <View style={styles.stockRow}>
        <View style={styles.stockItem}>
          <MaterialIcons name="inventory" size={16} color={primaryColor} />
          <ThemedText style={[styles.stockText, { color: textSecondaryColor }]}>
            {item.stock}
          </ThemedText>
        </View>
        <View style={styles.stockItem}>
          <MaterialIcons name="flag" size={16} color={primaryColor} />
          <ThemedText style={[styles.stockText, { color: textSecondaryColor }]}>
            {item.threshold}
          </ThemedText>
        </View>
        {item.price && item.price > 0 ? (
          <View style={styles.stockItem}>
            <FontAwesome6 name="peso-sign" size={14} color={successColor} />
            <ThemedText style={[styles.stockText, { color: textSecondaryColor }]}>
              {Number(item.price).toFixed(2)}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <View style={[styles.actionRow, { borderTopColor: borderColor }]}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: cardBackgroundColor }]}
          onPress={() => openEditModal(item)}
        >
          <MaterialIcons name="edit" size={16} color={primaryColor} />
          <ThemedText style={[styles.actionText, { color: primaryColor }]}>Edit</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: cardBackgroundColor }]}
          onPress={() => handleDelete(item)}
        >
          <MaterialIcons name="delete" size={16} color={dangerColor} />
          <ThemedText style={[styles.actionText, { color: dangerColor }]}>Delete</ThemedText>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ThemedText type="title" style={[styles.title, { color: textColor }]}>Inventory</ThemedText>
      
      {/* Search and Filters */}
      <View style={[styles.searchContainer, { backgroundColor: cardBackgroundColor, borderColor }]}>
        <View style={styles.searchRow}>
          <View style={[styles.searchInputContainer, { backgroundColor: cardBackgroundColor, borderColor }]}>
            <MaterialIcons name="search" size={20} color={textTertiaryColor} />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Search items..."
              placeholderTextColor={textTertiaryColor}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color={textTertiaryColor} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        
        <View style={styles.filterRow}>
          <TouchableOpacity 
            style={[styles.filterButton, { backgroundColor: successColor }]}
            onPress={openCreateModal}
          >
            <MaterialIcons name="add" size={16} color="#ffffff" />
            <ThemedText style={styles.filterButtonText}>New</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterButton, { backgroundColor: primaryColor }]}
            onPress={() => router.push('/scan?mode=add')}
          >
            <MaterialIcons name="qr-code-scanner" size={16} color="#ffffff" />
            <ThemedText style={styles.filterButtonText}>Scan</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, { backgroundColor: cardBackgroundColor, borderColor }]}
            onPress={() => setFilterStatus(filterStatus === 'All' ? 'At Risk' : filterStatus === 'At Risk' ? 'Warning' : filterStatus === 'Warning' ? 'Good' : 'All')}
          >
            <MaterialIcons name="warning" size={16} color={filterStatus === 'All' ? textTertiaryColor : filterStatus === 'At Risk' ? dangerColor : filterStatus === 'Warning' ? warningColor : successColor} />
            <ThemedText style={[styles.filterButtonText, { color: filterStatus === 'All' ? textTertiaryColor : filterStatus === 'At Risk' ? dangerColor : filterStatus === 'Warning' ? warningColor : successColor }]}>
              {filterStatus}
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, { backgroundColor: cardBackgroundColor, borderColor }]}
            onPress={() => {
              const currentIndex = categories.indexOf(filterCategory);
              const nextIndex = (currentIndex + 1) % categories.length;
              setFilterCategory(categories[nextIndex]);
            }}
          >
            <MaterialIcons name="category" size={16} color={filterCategory === 'All' ? textTertiaryColor : primaryColor} />
            <ThemedText style={[styles.filterButtonText, { color: filterCategory === 'All' ? textTertiaryColor : primaryColor }]}>
              {filterCategory}
            </ThemedText>
          </TouchableOpacity>
          
          {(searchQuery || filterStatus !== 'All' || filterCategory !== 'All') && (
            <TouchableOpacity 
              style={[styles.clearButton, { backgroundColor: cardBackgroundColor, borderColor }]}
              onPress={clearFilters}
            >
              <MaterialIcons name="clear" size={16} color={textTertiaryColor} />
              <ThemedText style={[styles.clearButtonText, { color: textTertiaryColor }]}>Clear</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Results count */}
      <ThemedText style={[styles.resultsCount, { color: textSecondaryColor }]}>
        Showing {filteredData.length} of {inventoryData.length} items
      </ThemedText>
      
      <FlatList
        data={filteredData}
        keyExtractor={(item, index) => String(item?.id ?? item?.sku ?? index)}
        contentContainerStyle={styles.listContainer}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <ThemedView style={styles.emptyContainer}>
            <MaterialIcons name="inventory" size={48} color={textTertiaryColor} />
            <ThemedText style={[styles.emptyText, { color: textSecondaryColor }]}>
              {loading ? 'Loading inventory...' : 'No products found'}
            </ThemedText>
          </ThemedView>
        }
      />
      
      {/* Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEditModalVisible}
        onRequestClose={closeEditModal}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: cardBackgroundColor }]}>
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <ThemedText type="title" style={[styles.modalTitle, { color: textColor }]}>
                {selectedItem ? 'Edit Item' : 'Add New Item'}
              </ThemedText>
              <TouchableOpacity onPress={closeEditModal}>
                <MaterialIcons name="close" size={24} color={textTertiaryColor} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Item Name</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                value={editForm.name}
                onChangeText={(text) => setEditForm({...editForm, name: text})}
                placeholder="Enter item name"
                placeholderTextColor={textTertiaryColor}
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>SKU</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                value={editForm.sku}
                onChangeText={(text) => setEditForm({...editForm, sku: text})}
                placeholder="Enter SKU"
                placeholderTextColor={textTertiaryColor}
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Category</ThemedText>
              <View style={[styles.pickerWrapper, { borderColor }]}>
                <Picker
                  selectedValue={editForm.category}
                  onValueChange={(value) => setEditForm({ ...editForm, category: value })}
                  style={[styles.picker, { color: textColor }]}
                  dropdownIconColor={textColor}
                >
                  {categoryOptions.map((category) => (
                    <Picker.Item key={category} label={category} value={category} color={textColor} />
                  ))}
                </Picker>
              </View>
            </View>
            
            <View style={styles.formRow}>
              <View style={styles.halfFormGroup}>
                <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Stock</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                  value={editForm.stock}
                  onChangeText={(text) => setEditForm({...editForm, stock: text})}
                  placeholder="Enter stock"
                  placeholderTextColor={textTertiaryColor}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.halfFormGroup}>
                <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Threshold</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                  value={editForm.threshold}
                  onChangeText={(text) => setEditForm({...editForm, threshold: text})}
                  placeholder="Enter threshold"
                  placeholderTextColor={textTertiaryColor}
                  keyboardType="numeric"
                />
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Price</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                value={editForm.price}
                onChangeText={(text) => setEditForm({...editForm, price: text})}
                placeholder="Enter price"
                placeholderTextColor={textTertiaryColor}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.cancelButton, { backgroundColor: borderColor }]} 
                onPress={closeEditModal}
              >
                <ThemedText style={[styles.cancelButtonText, { color: textSecondaryColor }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: primaryColor }]} 
                onPress={handleEditSave}
              >
                <ThemedText style={[styles.saveButtonText, { color: '#ffffff' }]}>
                  {selectedItem ? 'Update' : 'Create'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isDetailsModalVisible}
        onRequestClose={() => setIsDetailsModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: cardBackgroundColor }]}>
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <ThemedText type="title" style={[styles.modalTitle, { color: textColor }]}>Item Details</ThemedText>
              <TouchableOpacity onPress={() => setIsDetailsModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={textTertiaryColor} />
              </TouchableOpacity>
            </View>
            {selectedItem && (
              <>
                <View style={styles.formGroup}>
                  <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Name</ThemedText>
                  <View style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}>
                    <ThemedText style={{ color: textColor }}>{(selectedItem as InventoryItem).name}</ThemedText>
                  </View>
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={[styles.label, { color: textSecondaryColor }]}>SKU</ThemedText>
                  <View style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}>
                    <ThemedText style={{ color: textColor }}>{(selectedItem as InventoryItem).sku}</ThemedText>
                  </View>
                </View>
                <View style={styles.formRow}>
                  <View style={styles.halfFormGroup}>
                    <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Stock</ThemedText>
                    <View style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}>
                      <ThemedText style={{ color: textColor }}>{(selectedItem as InventoryItem).stock}</ThemedText>
                    </View>
                  </View>
                  <View style={styles.halfFormGroup}>
                    <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Threshold</ThemedText>
                    <View style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}>
                      <ThemedText style={{ color: textColor }}>{(selectedItem as InventoryItem).threshold}</ThemedText>
                    </View>
                  </View>
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Status</ThemedText>
                  <View style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}>
                    <ThemedText style={{ color: textColor }}>{(selectedItem as InventoryItem).status}</ThemedText>
                  </View>
                </View>
                <View style={[styles.actionRow, { borderTopColor: borderColor }]}>                
                  <TouchableOpacity style={[styles.actionButton, { backgroundColor: cardBackgroundColor }]} onPress={() => { setIsDetailsModalVisible(false); setIsAddModalVisible(true); }}>
                    <MaterialIcons name="add" size={16} color={successColor} />
                    <ThemedText style={[styles.actionText, { color: successColor }]}>Add Stock</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionButton, { backgroundColor: cardBackgroundColor }]} onPress={() => { setIsDetailsModalVisible(false); setIsRemoveModalVisible(true); }}>
                    <MaterialIcons name="remove" size={16} color={dangerColor} />
                    <ThemedText style={[styles.actionText, { color: dangerColor }]}>Remove Stock</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: cardBackgroundColor }]} 
                    onPress={() => { 
                      setIsDetailsModalVisible(false); 
                      handleDelete(selectedItem as InventoryItem);
                    }}
                  >
                    <MaterialIcons name="delete" size={16} color={dangerColor} />
                    <ThemedText style={[styles.actionText, { color: dangerColor }]}>Delete</ThemedText>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Add Stock Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddModalVisible}
        onRequestClose={closeAddModal}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: cardBackgroundColor }]}>
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <ThemedText type="title" style={[styles.modalTitle, { color: textColor }]}>Add to Inventory</ThemedText>
              <TouchableOpacity onPress={closeAddModal}>
                <MaterialIcons name="close" size={24} color={textTertiaryColor} />
              </TouchableOpacity>
            </View>
            {selectedItem && (
              <>
                <View style={styles.formGroup}>
                  <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Item Name</ThemedText>
                  <View style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}>
                    <ThemedText style={{ color: textColor }}>{(selectedItem as InventoryItem).name}</ThemedText>
                  </View>
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Quantity to Add</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                    value={quantityToAdd}
                    onChangeText={setQuantityToAdd}
                    placeholder="Enter quantity"
                    placeholderTextColor={textTertiaryColor}
                    keyboardType="numeric"
                    autoFocus
                  />
                </View>
                <ThemedText style={[styles.infoText, { color: textSecondaryColor }]}>Enter the number of units you want to add to inventory</ThemedText>
              </>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.cancelButton, { backgroundColor: borderColor }]} 
                onPress={closeAddModal}
              >
                <ThemedText style={[styles.cancelButtonText, { color: textSecondaryColor }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: successColor }]} 
                onPress={handleAddSave}
              >
                <ThemedText style={[styles.saveButtonText, { color: '#ffffff' }]}>Add</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Remove Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isRemoveModalVisible}
        onRequestClose={closeRemoveModal}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: cardBackgroundColor }]}>
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <ThemedText type="title" style={[styles.modalTitle, { color: textColor }]}>Remove from Inventory</ThemedText>
              <TouchableOpacity onPress={closeRemoveModal}>
                <MaterialIcons name="close" size={24} color={textTertiaryColor} />
              </TouchableOpacity>
            </View>
            
            {selectedItem && (
              <>
                <View style={styles.formGroup}>
                  <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Item Name</ThemedText>
                  <View style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}>
                    <ThemedText style={{ color: textColor }}>{selectedItem.name}</ThemedText>
                  </View>
                </View>
                
                <View style={styles.formGroup}>
                  <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Current Stock</ThemedText>
                  <View style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}>
                    <ThemedText style={{ color: textColor }}>{selectedItem.stock}</ThemedText>
                  </View>
                </View>
                
                <View style={styles.formGroup}>
                  <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Quantity to Remove</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                    value={quantityToRemove}
                    onChangeText={setQuantityToRemove}
                    placeholder="Enter quantity"
                    placeholderTextColor={textTertiaryColor}
                    keyboardType="numeric"
                    autoFocus
                  />
                </View>
                
                <ThemedText style={[styles.infoText, { color: textSecondaryColor }]}>
                  Enter the number of units you want to remove from inventory
                </ThemedText>
              </>
            )}
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.cancelButton, { backgroundColor: borderColor }]} 
                onPress={closeRemoveModal}
              >
                <ThemedText style={[styles.cancelButtonText, { color: textSecondaryColor }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: dangerColor }]} 
                onPress={handleRemoveSave}
              >
                <ThemedText style={[styles.saveButtonText, { color: '#ffffff' }]}>Remove</ThemedText>
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
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
  searchContainer: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchRow: {
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultsCount: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  listContainer: {
    gap: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemName: {
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  skuText: {
    fontWeight: '700',
    fontSize: 16,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockText: {
    fontWeight: '600',
    fontSize: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionText: {
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 10,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 16,
  },
  halfFormGroup: {
    flex: 1,
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  label: {
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
  },
  infoText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  cancelButtonText: {
    fontWeight: '600',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  saveButtonText: {
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
});