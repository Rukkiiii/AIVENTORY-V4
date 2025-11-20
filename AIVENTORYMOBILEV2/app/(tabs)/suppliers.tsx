import { StyleSheet, View, FlatList, TouchableOpacity, Modal, TextInput, Alert, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState, useEffect } from 'react';
import { useThemeColor } from '@/hooks/use-theme-color';
import api from '@/services/api'; // Import the API service

export default function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    address: '', // Add address field
    rating: ''
  });
  const [addForm, setAddForm] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '+63',
    address: '', // Add address field
    rating: ''
  });
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

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

  // Fetch suppliers from API
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/suppliers');
      const suppliers = Array.isArray(response?.data) ? response.data : [];
      const formattedSuppliers = suppliers.map(supplier => ({
        id: supplier.supplier_id?.toString() || supplier.id?.toString() || Date.now().toString(),
        name: supplier.supplier_name || supplier.name || '',
        contact: supplier.supplier_contactnum || supplier.contact || '',
        email: supplier.supplier_email || supplier.email || '',
        phone: supplier.supplier_contactnum || supplier.phone || '',
        address: supplier.supplier_address || supplier.address || '', // Add address field
        rating: parseFloat(supplier.supplier_rating) || parseFloat(supplier.rating) || 0
      }));
      setSuppliers(formattedSuppliers);
      setFilteredSuppliers(formattedSuppliers);
    } catch (error) {
      if (__DEV__) {
        console.error('Error fetching suppliers:', error);
      }
      Alert.alert('Error', 'Failed to fetch suppliers. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Filter suppliers based on search query
  useEffect(() => {
    if (!Array.isArray(suppliers)) {
      setFilteredSuppliers([]);
      return;
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filtered = suppliers.filter(supplier => {
        if (!supplier) return false;
        const name = (supplier.name || '').toLowerCase();
        const contact = (supplier.contact || '').toLowerCase();
        const email = (supplier.email || '').toLowerCase();
        const phone = (supplier.phone || '').toLowerCase();
        return name.includes(query) || contact.includes(query) || email.includes(query) || phone.includes(query);
      });
      setFilteredSuppliers(filtered);
    } else {
      setFilteredSuppliers(suppliers);
    }
  }, [searchQuery, suppliers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSuppliers();
    setRefreshing(false);
  };

  const renderRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<MaterialIcons key={`full-${i}`} name="star" size={16} color="#FFD700" />);
    }
    
    if (hasHalfStar) {
      stars.push(<MaterialIcons key="half" name="star-half" size={16} color="#FFD700" />);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<MaterialIcons key={`empty-${i}`} name="star-border" size={16} color="#FFD700" />);
    }
    
    return <View style={styles.ratingContainer}>{stars}</View>;
  };

  const openEditModal = (supplier) => {
    setSelectedSupplier(supplier);
    setEditForm({
      name: supplier.name,
      contact: supplier.contact,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address || '', // Add address field
      rating: supplier.rating.toString()
    });
    setIsEditModalVisible(true);
  };

  const closeEditModal = () => {
    setIsEditModalVisible(false);
    setSelectedSupplier(null);
  };

  const openAddModal = () => {
    setAddForm({
      name: '',
      contact: '',
      email: '',
      phone: '+63',
      address: '', // Add address field
      rating: ''
    });
    setIsAddModalVisible(true);
  };

  const closeAddModal = () => {
    setIsAddModalVisible(false);
  };

  const handleEditSave = async () => {
    if (!editForm.name || !editForm.contact || !editForm.email || !editForm.phone || !editForm.rating) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate Philippine phone number format (+63 followed by 10 digits)
    const phoneRegex = /^\+63\d{10}$/;
    if (!phoneRegex.test(editForm.phone)) {
      Alert.alert('Error', 'Please enter a valid Philippine phone number (10 digits after +63)');
      return;
    }

    // Validate universal email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editForm.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    const updatedRating = parseFloat(editForm.rating);
    if (isNaN(updatedRating) || updatedRating < 0 || updatedRating > 5) {
      Alert.alert('Error', 'Please enter a valid rating between 0 and 5');
      return;
    }

    try {
      // Update supplier in database
      const supplierData = {
        supplier_name: editForm.name,
        supplier_contactnum: editForm.contact,
        supplier_email: editForm.email,
        supplier_contactnum: editForm.phone,
        supplier_address: editForm.address, // Add address field
        supplier_rating: updatedRating
      };

      await api.put(`/suppliers/${selectedSupplier.id}`, supplierData);

      // Update local state
      const updatedSuppliers = Array.isArray(suppliers) ? suppliers.map(supplier => {
        if (!supplier) return supplier;
        return supplier.id === selectedSupplier.id 
          ? { 
              ...supplier, 
              name: editForm.name,
              contact: editForm.contact,
              email: editForm.email,
              phone: editForm.phone,
              address: editForm.address, // Add address field
              rating: updatedRating
            } 
          : supplier;
      }) : [];
      
      setSuppliers(updatedSuppliers);
      setFilteredSuppliers(updatedSuppliers);
      Alert.alert('Success', 'Supplier updated successfully');
      closeEditModal();
    } catch (error) {
      if (__DEV__) {
        console.error('Error updating supplier:', error);
      }
      Alert.alert('Error', 'Failed to update supplier. Please try again.');
    }
  };

  const handleAddSave = async () => {
    if (!addForm.name || !addForm.contact || !addForm.email || !addForm.phone || !addForm.rating) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate Philippine phone number format (+63 followed by 10 digits)
    const phoneRegex = /^\+63\d{10}$/;
    if (!phoneRegex.test(addForm.phone)) {
      Alert.alert('Error', 'Please enter a valid Philippine phone number (10 digits after +63)');
      return;
    }

    // Validate universal email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(addForm.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    const newRating = parseFloat(addForm.rating);
    if (isNaN(newRating) || newRating < 0 || newRating > 5) {
      Alert.alert('Error', 'Please enter a valid rating between 0 and 5');
      return;
    }

    try {
      // Add supplier to database
      const supplierData = {
        supplier_name: addForm.name,
        supplier_contactnum: addForm.contact,
        supplier_email: addForm.email,
        supplier_contactnum: addForm.phone,
        supplier_address: addForm.address, // Add address field
        supplier_rating: newRating
      };

      const response = await api.post('/suppliers', supplierData);
      
      // Add to local state
      const newSupplier = {
        id: response.data.supplier_id?.toString() || Date.now().toString(),
        name: addForm.name,
        contact: addForm.contact,
        email: addForm.email,
        phone: addForm.phone,
        address: addForm.address, // Add address field
        rating: newRating
      };

      const updatedSuppliers = [...suppliers, newSupplier];
      setSuppliers(updatedSuppliers);
      setFilteredSuppliers(updatedSuppliers);
      Alert.alert('Success', 'Supplier added successfully');
      closeAddModal();
    } catch (error) {
      if (__DEV__) {
        console.error('Error adding supplier:', error);
      }
      Alert.alert('Error', 'Failed to add supplier. Please try again.');
    }
  };

  const handleDelete = async (supplier) => {
    Alert.alert(
      'Delete Supplier',
      `Are you sure you want to delete "${supplier.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from database
              await api.delete(`/suppliers/${supplier.id}`);
              
              // Update local state
              const updatedSuppliers = Array.isArray(suppliers) ? suppliers.filter(s => s && s.id !== supplier.id) : [];
              setSuppliers(updatedSuppliers);
              setFilteredSuppliers(updatedSuppliers);
              Alert.alert('Success', 'Supplier deleted successfully');
            } catch (error) {
              if (__DEV__) {
                console.error('Error deleting supplier:', error);
              }
              Alert.alert('Error', 'Failed to delete supplier. Please try again.');
            }
          }
        }
      ]
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: backgroundColor }]}>
      <ThemedText type="title" style={[styles.title, { color: textColor }]}>Suppliers</ThemedText>
      
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: cardBackgroundColor, borderColor: borderColor }]}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color={textTertiaryColor} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Search suppliers..."
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
      
      {/* Add Supplier Button */}
      <TouchableOpacity 
        style={[styles.addButton, { backgroundColor: primaryColor }]} 
        onPress={openAddModal}
      >
        <MaterialIcons name="add" size={20} color="#ffffff" />
        <ThemedText style={[styles.addButtonText, { color: '#ffffff' }]}>Add Supplier</ThemedText>
      </TouchableOpacity>
      
      {/* Results count */}
      <ThemedText style={[styles.resultsCount, { color: textSecondaryColor }]}>
        Showing {filteredSuppliers.length} of {suppliers.length} suppliers
      </ThemedText>
      
      <FlatList
        data={filteredSuppliers}
        keyExtractor={(item, index) => String(item?.id ?? item?.email ?? index)}
        contentContainerStyle={{ gap: 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <ThemedView style={styles.emptyContainer}>
            {loading ? (
              <ThemedText style={[styles.emptyText, { color: textSecondaryColor }]}>
                Loading suppliers...
              </ThemedText>
            ) : (
              <>
                <MaterialIcons name="inventory" size={48} color={textTertiaryColor} />
                <ThemedText style={[styles.emptyText, { color: textSecondaryColor }]}>
                  No suppliers found
                </ThemedText>
              </>
            )}
          </ThemedView>
        }
        renderItem={({ item }) => (
          <Card style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
            <View style={styles.header}>
              <ThemedText type="defaultSemiBold" style={[styles.name, { color: textColor }]}>{item.name}</ThemedText>
              <View style={styles.rating}>
                {renderRating(item.rating)}
                <ThemedText style={[styles.ratingText, { color: textSecondaryColor }]}>{item.rating}</ThemedText>
              </View>
            </View>
            
            <View style={styles.contactInfo}>
              <View style={styles.infoRow}>
                <MaterialIcons name="person" size={16} color={textTertiaryColor} />
                <ThemedText style={[styles.infoText, { color: textSecondaryColor }]}>Contact: {item.contact}</ThemedText>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialIcons name="email" size={16} color={textTertiaryColor} />
                <ThemedText style={[styles.infoText, { color: textSecondaryColor }]}>{item.email}</ThemedText>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialIcons name="phone" size={16} color={textTertiaryColor} />
                <ThemedText style={[styles.infoText, { color: textSecondaryColor }]}>{item.phone}</ThemedText>
              </View>
              
              {item.address ? (
                <View style={styles.infoRow}>
                  <MaterialIcons name="location-on" size={16} color={textTertiaryColor} />
                  <ThemedText style={[styles.infoText, { color: textSecondaryColor }]}>{item.address}</ThemedText>
                </View>
              ) : null}
            </View>
            
            <View style={[styles.actions, { borderTopColor: borderColor }]}>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: cardBackgroundColor }]} onPress={() => openEditModal(item)}>
                <MaterialIcons name="edit" size={16} color={primaryColor} />
                <ThemedText style={[styles.actionText, { color: primaryColor }]}>Edit</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: cardBackgroundColor }]} onPress={() => handleDelete(item)}>
                <MaterialIcons name="delete" size={16} color={dangerColor} />
                <ThemedText style={[styles.actionText, { color: dangerColor }]}>Delete</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: cardBackgroundColor }]}>
                <MaterialIcons name="phone" size={16} color={successColor} />
                <ThemedText style={[styles.actionText, { color: successColor }]}>Call</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: cardBackgroundColor }]}>
                <MaterialIcons name="email" size={16} color={primaryColor} />
                <ThemedText style={[styles.actionText, { color: primaryColor }]}>Email</ThemedText>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
      
      {/* Add Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddModalVisible}
        onRequestClose={closeAddModal}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: cardBackgroundColor }]}>
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <ThemedText type="title" style={[styles.modalTitle, { color: textColor }]}>Add New Supplier</ThemedText>
              <TouchableOpacity onPress={closeAddModal}>
                <MaterialIcons name="close" size={24} color={textTertiaryColor} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Supplier Business Name</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                value={addForm.name}
                onChangeText={(text) => setAddForm({...addForm, name: text})}
                placeholder="Enter supplier business name"
                placeholderTextColor={textTertiaryColor}
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Contact Person Name</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                value={addForm.contact}
                onChangeText={(text) => setAddForm({...addForm, contact: text})}
                placeholder="Enter contact person name"
                placeholderTextColor={textTertiaryColor}
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Email</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                value={addForm.email}
                onChangeText={(text) => setAddForm({...addForm, email: text})}
                placeholder="Enter email address"
                placeholderTextColor={textTertiaryColor}
                keyboardType="email-address"
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Phone</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                value={addForm.phone}
                onChangeText={(text) => {
                  // Ensure +63 is always at the beginning
                  if (text.startsWith('+63')) {
                    setAddForm({...addForm, phone: text});
                  } else if (text === '') {
                    setAddForm({...addForm, phone: '+63'});
                  } else {
                    // If user tries to remove +63, keep it
                    setAddForm({...addForm, phone: '+63' + text.replace('+63', '')});
                  }
                }}
                placeholder="9123456789"
                placeholderTextColor={textTertiaryColor}
                keyboardType="phone-pad"
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Address</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                value={addForm.address}
                onChangeText={(text) => setAddForm({...addForm, address: text})}
                placeholder="Enter supplier address"
                placeholderTextColor={textTertiaryColor}
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Rating (0-5)</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                value={addForm.rating}
                onChangeText={(text) => setAddForm({...addForm, rating: text})}
                placeholder="Enter rating"
                placeholderTextColor={textTertiaryColor}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.cancelButton, { backgroundColor: borderColor }]} 
                onPress={closeAddModal}
              >
                <ThemedText style={[styles.cancelButtonText, { color: textSecondaryColor }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: primaryColor }]} 
                onPress={handleAddSave}
              >
                <ThemedText style={[styles.saveButtonText, { color: '#ffffff' }]}>Add Supplier</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEditModalVisible}
        onRequestClose={closeEditModal}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: cardBackgroundColor }]}>
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <ThemedText type="title" style={[styles.modalTitle, { color: textColor }]}>Edit Supplier</ThemedText>
              <TouchableOpacity onPress={closeEditModal}>
                <MaterialIcons name="close" size={24} color={textTertiaryColor} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Supplier Business Name</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                value={editForm.name}
                onChangeText={(text) => setEditForm({...editForm, name: text})}
                placeholder="Enter supplier business name"
                placeholderTextColor={textTertiaryColor}
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Contact Person Name</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                value={editForm.contact}
                onChangeText={(text) => setEditForm({...editForm, contact: text})}
                placeholder="Enter contact person name"
                placeholderTextColor={textTertiaryColor}
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Email</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                value={editForm.email}
                onChangeText={(text) => setEditForm({...editForm, email: text})}
                placeholder="Enter email address"
                placeholderTextColor={textTertiaryColor}
                keyboardType="email-address"
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Phone</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                value={editForm.phone}
                onChangeText={(text) => {
                  // Ensure +63 is always at the beginning
                  if (text.startsWith('+63')) {
                    setEditForm({...editForm, phone: text});
                  } else if (text === '') {
                    setEditForm({...editForm, phone: '+63'});
                  } else {
                    // If user tries to remove +63, keep it
                    setEditForm({...editForm, phone: '+63' + text.replace('+63', '')});
                  }
                }}
                placeholder="9123456789"
                placeholderTextColor={textTertiaryColor}
                keyboardType="phone-pad"
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Address</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                value={editForm.address}
                onChangeText={(text) => setEditForm({...editForm, address: text})}
                placeholder="Enter supplier address"
                placeholderTextColor={textTertiaryColor}
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Rating (0-5)</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: cardBackgroundColor, borderColor: borderColor, color: textColor }]}
                value={editForm.rating}
                onChangeText={(text) => setEditForm({...editForm, rating: text})}
                placeholder="Enter rating"
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
                <ThemedText style={[styles.saveButtonText, { color: '#ffffff' }]}>Save</ThemedText>
              </TouchableOpacity>
            </View>
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
    padding: 16,
    gap: 16,
  },
  title: {
    marginBottom: 8,
  },
  searchContainer: {
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  addButtonText: {
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  resultsCount: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation:2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    flex: 1,
    marginRight: 12,
  },
  rating: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontWeight: '600',
  },
  contactInfo: {
    gap: 8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
});
