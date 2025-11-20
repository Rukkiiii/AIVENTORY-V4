import { StyleSheet, View, TouchableOpacity, Modal, TextInput, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState, useEffect, useRef } from 'react';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useRouter } from 'expo-router';
// Add these imports for camera functionality
import { CameraView, Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import api from '@/services/api';

export default function ScanScreen() {
  const router = useRouter();
  const [isManualEntryVisible, setIsManualEntryVisible] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [recentScans, setRecentScans] = useState([]);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [isActionModalVisible, setIsActionModalVisible] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemPrice, setItemPrice] = useState('0'); // Add price state
  const [quantityToRemove, setQuantityToRemove] = useState('1');
  const [actionType, setActionType] = useState('add'); // 'add' or 'remove'
  const cameraRef = useRef(null);
  const [matchingProduct, setMatchingProduct] = useState(null);
  const [lookupMessage, setLookupMessage] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const textTertiaryColor = useThemeColor({}, 'textTertiary');
  const primaryColor = useThemeColor({}, 'primary');
  const dangerColor = useThemeColor({}, 'danger');
  const successColor = useThemeColor({}, 'success');

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    setIsCameraActive(false);
    
    // Set the scanned barcode and show the action modal
    setScannedBarcode(data);
    setItemName(`Scanned Product ${data}`); // Default until lookup completes
    setItemCategory('Scanned Item'); // Default category
    setItemPrice('0');
    setMatchingProduct(null);
    setLookupMessage('Searching inventory for matches…');
    lookupProductInInventory(data);
    
    // Show action modal
    setIsActionModalVisible(true);
    
    // Add to recent scans
    const newScan = {
      id: Date.now().toString(),
      barcode: data,
      timestamp: new Date().toLocaleTimeString(),
      name: `Scanned Product ${data}`,
      status: 'Scanned'
    };
    
    setRecentScans(prevScans => [newScan, ...prevScans]);
  };

  const handleAddToInventory = () => {
    if (!itemName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }
    
    // Validate price
    const price = parseFloat(itemPrice);
    if (isNaN(price) || price < 0) {
      Alert.alert('Error', 'Please enter a valid price (0 or greater)');
      return;
    }
    
    // Navigate to inventory screen with the scanned barcode, item name, and price
    router.push({
      pathname: '/(tabs)/inventory', // Updated path to match tab structure
      params: { 
        scannedBarcode: scannedBarcode,
        itemName: itemName,
        itemPrice: price.toString(), // Pass the price as a parameter
        action: 'add'
      }
    });
    
    // Close the modal
    setIsActionModalVisible(false);
    setItemName(''); // Reset item name
    setItemPrice('0'); // Reset item price
    setScannedBarcode(''); // Reset scanned barcode
  };

  const handleManualEntrySubmit = () => {
    if (!manualBarcode.trim()) {
      Alert.alert('Error', 'Please enter a barcode');
      return;
    }
    
    // Simulate barcode scanning and add to recent scans
    const newScan = {
      id: Date.now().toString(),
      barcode: manualBarcode,
      timestamp: new Date().toLocaleTimeString(),
      name: `Manually Entered Product ${manualBarcode}`,
      status: 'Scanned'
    };
    
    setRecentScans(prevScans => [newScan, ...prevScans]);
    if (__DEV__) {
      console.log('Manual barcode entry:', manualBarcode);
    }
    
    // Set the scanned barcode and show the action modal
    setScannedBarcode(manualBarcode);
    setItemName(`Manually Entered Product ${manualBarcode}`); // default until lookup
    setItemCategory('Scanned Item'); // Default category
    setItemPrice('0');
    setMatchingProduct(null);
    setLookupMessage('Searching inventory for matches…');
    lookupProductInInventory(manualBarcode);
    
    // Show action modal
    setIsActionModalVisible(true);
    
    setManualBarcode('');
    setIsManualEntryVisible(false);
  };

  const handleCameraScan = () => {
    if (hasPermission === false) {
      Alert.alert('Permission required', 'Camera permission is needed to scan barcodes');
      return;
    }
    
    setIsCameraActive(true);
    setScanned(false);
  };

  const closeCamera = () => {
    setIsCameraActive(false);
  };

  const selectActionType = (type) => {
    setActionType(type);
  };

  const lookupProductInInventory = async (barcode, retry = false) => {
    const trimmedBarcode = String(barcode || '').trim();
    if (!trimmedBarcode) {
      setLookupMessage('Invalid barcode');
      return;
    }

    setLookupLoading(true);
    try {
      const response = await api.get('/items');
      const products = Array.isArray(response?.data) ? response.data : [];
      const match = products.find((product) => {
        const sku = String(product?.Product_sku ?? product?.sku ?? '').trim();
        return sku.toLowerCase() === trimmedBarcode.toLowerCase();
      });

      if (match) {
        const formattedMatch = {
          id: (match.Product_id ?? match.id)?.toString(),
          name: match.Product_name ?? match.name ?? `Inventory Item ${trimmedBarcode}`,
          sku: match.Product_sku ?? match.sku ?? trimmedBarcode,
          category: match.Product_category ?? match.category ?? 'Inventory Item',
          price: Number(match.Product_price ?? match.price ?? 0),
          stock: Number(match.Product_stock ?? match.stock ?? 0),
          threshold: Number(match.reorder_level ?? match.threshold ?? 0),
          status: match.Product_status ?? match.status ?? 'Active',
        };
        setMatchingProduct(formattedMatch);
        setItemName(formattedMatch.name);
        setItemCategory(formattedMatch.category);
        setItemPrice(formattedMatch.price.toString());
        setLookupMessage('Item found in inventory');
      } else {
        setMatchingProduct(null);
        setLookupMessage('No matching item found in inventory. You can create it.');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Barcode lookup failed:', error?.response?.data?.error || error?.message);
      }
      setMatchingProduct(null);
      setLookupMessage('Unable to search inventory. Check your connection.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleViewInInventory = () => {
    if (matchingProduct?.sku) {
      router.push({
        pathname: '/(tabs)/inventory',
        params: {
          highlightSku: matchingProduct.sku,
        },
      });
      setIsActionModalVisible(false);
    }
  };

  if (isCameraActive) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: backgroundColor }]}>
        <View style={styles.cameraHeader}>
          <TouchableOpacity onPress={closeCamera} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText type="title" style={[styles.cameraTitle, { color: '#fff' }]}>Scan Barcode</ThemedText>
        </View>
        
        <CameraView
          ref={cameraRef}
          style={styles.cameraView}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["ean8", "ean13", "code39", "code128"]
          }}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.scanFrame}>
              <MaterialIcons name="crop-free" size={200} color="#fff" />
            </View>
            <ThemedText style={[styles.cameraInstruction, { color: '#fff' }]}>
              Align barcode within frame to scan
            </ThemedText>
          </View>
        </CameraView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        style={[styles.scrollView, { backgroundColor }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText type="title" style={[styles.title, { color: textColor }]}>
          Barcode Scanner
        </ThemedText>
        
        <Card style={[styles.scannerCard, { backgroundColor: cardBackgroundColor }]}>
          <View style={styles.scannerHeader}>
            <MaterialIcons name="qr-code-scanner" size={24} color={primaryColor} />
            <ThemedText type="subtitle" style={[styles.sectionTitle, { color: textColor }]}>Scan Items</ThemedText>
          </View>
          
          <View style={[styles.scannerPlaceholder, { borderColor: borderColor }]}>
            <MaterialIcons name="qr-code" size={64} color={primaryColor} />
            <ThemedText style={[styles.placeholderText, { color: textSecondaryColor }]}>Point camera at barcode to scan</ThemedText>
            <ThemedText style={[styles.placeholderSubText, { color: textTertiaryColor }]}>Supports EAN-8, EAN-13, Code 39, and Code 128</ThemedText>
          </View>
          
          <View style={styles.scannerActions}>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: primaryColor }]} onPress={handleCameraScan}>
              <MaterialIcons name="camera" size={24} color="#fff" />
              <ThemedText style={[styles.primaryButtonText, { color: '#ffffff' }]}>Scan with Camera</ThemedText>
            </TouchableOpacity>
            
            <View style={styles.buttonSeparator}>
              <View style={[styles.separatorLine, { backgroundColor: borderColor }]} />
              <ThemedText style={[styles.separatorText, { color: textTertiaryColor }]}>OR</ThemedText>
              <View style={[styles.separatorLine, { backgroundColor: borderColor }]} />
            </View>
            
            <TouchableOpacity 
              style={[styles.secondaryButton, { backgroundColor: cardBackgroundColor, borderColor: primaryColor }]}
              onPress={() => setIsManualEntryVisible(true)}
            >
              <MaterialIcons name="keyboard" size={20} color={primaryColor} />
              <ThemedText style={[styles.secondaryButtonText, { color: primaryColor }]}>Enter Barcode Manually</ThemedText>
            </TouchableOpacity>
          </View>
        </Card>
        
        <Card style={[styles.resultsCard, { backgroundColor: cardBackgroundColor }]}>
          <View style={styles.resultsHeader}>
            <ThemedText type="subtitle" style={[styles.sectionTitle, { color: textColor }]}>Recent Scans</ThemedText>
            <ThemedText style={[styles.countText, { color: textTertiaryColor }]}>{recentScans.length} items</ThemedText>
          </View>
          
          {recentScans.length > 0 ? (
            <ScrollView style={styles.scansList} nestedScrollEnabled={true}>
              {recentScans.map((scan, index) => (
                <View key={String(scan?.id ?? scan?.barcode ?? index)} style={[styles.scanItem, { borderBottomColor: borderColor }]}>
                  <View style={styles.scanItemHeader}>
                    <ThemedText style={[styles.scanItemName, { color: textColor }]}>{scan.name}</ThemedText>
                    <ThemedText style={[styles.scanItemStatus, { color: successColor }]}>{scan.status}</ThemedText>
                  </View>
                  <View style={styles.scanItemDetails}>
                    <ThemedText style={[styles.scanItemBarcode, { color: textSecondaryColor }]}>Barcode: {scan.barcode}</ThemedText>
                    <ThemedText style={[styles.scanItemTime, { color: textTertiaryColor }]}>{scan.timestamp}</ThemedText>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="inventory" size={48} color={textTertiaryColor} />
              <ThemedText style={[styles.emptyText, { color: textTertiaryColor }]}>No items scanned yet</ThemedText>
            </View>
          )}
        </Card>
      </ScrollView>
      
      {/* Manual Entry Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isManualEntryVisible}
        onRequestClose={() => setIsManualEntryVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalSheet, { backgroundColor: cardBackgroundColor }]}>
            <ScrollView
              contentContainerStyle={styles.modalContentScroll}
              keyboardShouldPersistTaps="handled"
            >
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <ThemedText type="title" style={[styles.modalTitle, { color: textColor }]}>Manual Barcode Entry</ThemedText>
              <TouchableOpacity onPress={() => setIsManualEntryVisible(false)}>
                <MaterialIcons name="close" size={24} color={textTertiaryColor} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Enter Barcode</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                value={manualBarcode}
                onChangeText={setManualBarcode}
                placeholder="Enter barcode number"
                placeholderTextColor={textTertiaryColor}
                keyboardType="numeric"
                autoFocus
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.cancelButton, { backgroundColor: borderColor }]} 
                onPress={() => setIsManualEntryVisible(false)}
              >
                <ThemedText style={[styles.cancelButtonText, { color: textSecondaryColor }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: primaryColor }]} 
                onPress={handleManualEntrySubmit}
              >
                <ThemedText style={[styles.submitButtonText, { color: '#ffffff' }]}>Submit</ThemedText>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Action Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isActionModalVisible}
        onRequestClose={() => setIsActionModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalSheet, { backgroundColor: cardBackgroundColor }]}>
            <ScrollView
              contentContainerStyle={styles.modalContentScroll}
              keyboardShouldPersistTaps="handled"
            >
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <ThemedText type="title" style={[styles.modalTitle, { color: textColor }]}>Select Action</ThemedText>
              <TouchableOpacity onPress={() => setIsActionModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={textTertiaryColor} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Scanned Barcode</ThemedText>
              <View style={[styles.barcodeDisplay, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}>
                <ThemedText style={[styles.barcodeText, { color: textColor }]}>{scannedBarcode}</ThemedText>
              </View>
            </View>

            <View style={styles.lookupStatusRow}>
              {lookupLoading ? (
                <>
                  <ActivityIndicator size="small" color={primaryColor} />
                  <ThemedText style={[styles.lookupText, { color: textSecondaryColor }]}>
                    {lookupMessage || 'Searching inventory…'}
                  </ThemedText>
                </>
              ) : (
                <MaterialIcons
                  name={matchingProduct ? 'check-circle' : 'info-outline'}
                  size={18}
                  color={matchingProduct ? successColor : textSecondaryColor}
                />
              )}
              {!lookupLoading && (
                <ThemedText
                  style={[
                    styles.lookupText,
                    { color: matchingProduct ? successColor : textSecondaryColor },
                  ]}
                >
                  {lookupMessage}
                </ThemedText>
              )}
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Item Name</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                value={itemName}
                onChangeText={setItemName}
                placeholder="Enter item name"
                placeholderTextColor={textTertiaryColor}
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Category</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                value={itemCategory}
                onChangeText={setItemCategory}
                placeholder="Enter item category"
                placeholderTextColor={textTertiaryColor}
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Price</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                value={itemPrice}
                onChangeText={setItemPrice}
                placeholder="Enter item price"
                placeholderTextColor={textTertiaryColor}
                keyboardType="decimal-pad"
              />
            </View>
            
            <ThemedText style={[styles.infoText, { color: textSecondaryColor }]}>
              {matchingProduct
                ? 'This barcode matches an existing inventory item. You can adjust stock or view it.'
                : 'No matching item was found. Provide details to create a new product.'}
            </ThemedText>

            {matchingProduct && (
              <TouchableOpacity
                style={[styles.quickActionButton, { borderColor: primaryColor }]}
                onPress={handleViewInInventory}
              >
                <MaterialIcons name="inventory" size={18} color={primaryColor} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.quickActionText, { color: primaryColor }]}>
                    View {matchingProduct.name} in Inventory
                  </ThemedText>
                  <ThemedText style={[styles.quickActionSubText, { color: textSecondaryColor }]}>
                    Current stock: {matchingProduct.stock}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            )}
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.cancelButton, { backgroundColor: borderColor }]} 
                onPress={() => setIsActionModalVisible(false)}
              >
                <ThemedText style={[styles.cancelButtonText, { color: textSecondaryColor }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: primaryColor }]} 
                onPress={handleAddToInventory}
              >
                <ThemedText style={[styles.submitButtonText, { color: '#ffffff' }]}>Add to Inventory</ThemedText>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

// Helper function to convert hex to rgb
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  title: {
    marginBottom: 8,
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    marginRight: 16,
  },
  cameraTitle: {
    flex: 1,
    textAlign: 'center',
  },
  flashButton: {
    marginLeft: 16,
  },
  cameraView: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    opacity: 0.5,
  },
  cameraInstruction: {
    marginTop: 32,
    fontSize: 16,
    textAlign: 'center',
  },
  flashIndicator: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 20,
    gap: 5,
  },
  sectionTitle: {
  },
  scannerCard: {
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  scannerPlaceholder: {
    height: 280,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 20,
  },
  placeholderText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholderSubText: {
    textAlign: 'center',
    fontSize: 14,
  },
  scannerActions: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 12,
  },
  primaryButtonText: {
    fontWeight: '700',
    fontSize: 18,
  },
  buttonSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 8,
  },
  separatorLine: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 5,
    borderWidth: 1,
    gap: 8,
  },
  secondaryButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  resultsCard: {
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  countText: {
  },
  scansList: {
    maxHeight: 300,
  },
  scanItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  scanItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scanItemName: {
    fontWeight: '600',
  },
  scanItemStatus: {
    fontWeight: '600',
    fontSize: 12,
  },
  scanItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scanItemBarcode: {
    fontSize: 14,
  },
  scanItemTime: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  emptyText: {
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignSelf: 'center',
  },
  modalContentScroll: {
    paddingBottom: 24,
    gap: 16,
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
    marginBottom: 20,
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
  barcodeDisplay: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
  },
  barcodeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  lookupStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: -8,
  },
  lookupText: {
    fontSize: 14,
    flexShrink: 1,
  },
  infoText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 16,
  },
  quickActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  quickActionSubText: {
    fontSize: 12,
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
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  submitButtonText: {
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  actionButtonLarge: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  actionButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
