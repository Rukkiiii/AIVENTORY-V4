import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  Platform,
  TextInput,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import api, { createInvoice as createInvoiceApi } from '@/services/api';

type InvoiceStatus = 'Pending' | 'Paid' | 'Overdue';

type BackendInvoiceItem = {
  description: string;
  quantity: number;
  unit_price: number;
};

type BackendInvoice = {
  invoice_id: number;
  invoice_number: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  invoice_date: string;
  due_date: string | null;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  items?: BackendInvoiceItem[];
};

type InvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

type Invoice = {
  invoiceId: number;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  items: InvoiceItem[];
};

const statusColors: Record<InvoiceStatus, string> = {
  Pending: '#f1c40f',
  Paid: '#2ecc71',
  Overdue: '#e74c3c',
};

const formatCurrency = (value: number) =>
  Number(value || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
  });

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const normalizeInvoices = (data: BackendInvoice[] = []): Invoice[] =>
  data.map((invoice) => ({
    invoiceId: invoice.invoice_id,
    invoiceNumber: invoice.invoice_number,
    customerName: invoice.customer_name,
    customerPhone: invoice.customer_phone,
    customerAddress: invoice.customer_address,
    date: formatDate(invoice.invoice_date),
    dueDate: formatDate(invoice.due_date),
    status: invoice.status || 'Pending',
    subtotal: Number(invoice.subtotal) || 0,
    tax: Number(invoice.tax) || 0,
    total: Number(invoice.total) || 0,
    notes: invoice.notes || '',
    items: Array.isArray(invoice.items)
      ? invoice.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unit_price) || 0,
        }))
      : [],
  }));

const calculateLineTotal = (item: InvoiceItem) => item.quantity * item.unitPrice;

const generateInvoiceNumber = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const timePart = String(now.getTime()).slice(-4);
  return `MOB-${datePart}-${timePart}`;
};

const formatDateForApi = (date: Date) => date.toISOString().slice(0, 10);

const createEmptyLineItem = () => ({
  productId: '',
  description: '',
  quantity: '1',
  unitPrice: '0',
});

const defaultCreateForm = () => ({
  invoiceNumber: generateInvoiceNumber(),
  invoiceDate: formatDateForApi(new Date()),
  dueDate: '',
  status: 'Pending' as InvoiceStatus,
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  notes: '',
  items: [createEmptyLineItem()],
});

export default function InvoicesScreen() {
  const cardBackground = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(defaultCreateForm());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'invoiceDate' | 'dueDate' | null>(null);
  const [tempDate, setTempDate] = useState(new Date());
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productPickerIndex, setProductPickerIndex] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState('');

  const fetchInvoices = useCallback(async (showSpinner = true) => {
    showSpinner ? setLoading(true) : setRefreshing(true);
    setError(null);
    try {
      const response = await api.get('/invoices');
      const raw: BackendInvoice[] = Array.isArray(response.data) ? response.data : [];
      const normalized = normalizeInvoices(raw);
      setInvoices(normalized);
      setSelectedInvoice((current) => {
        if (!normalized.length) return null;
        if (current) {
          const updated = normalized.find((inv) => inv.invoiceNumber === current.invoiceNumber);
          return updated || normalized[0];
        }
        return normalized[0];
      });
    } catch (err: any) {
      console.error('❌ Invoice fetch error:', err?.message || err);
      setInvoices([]);
      setSelectedInvoice(null);
      setError(err?.message || 'Unable to load invoices');
    } finally {
      showSpinner ? setLoading(false) : setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices(true);
  }, [fetchInvoices]);

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const response = await api.get('/items');
      const arr = Array.isArray(response.data) ? response.data : [];
      setProducts(
        arr.map((item: any) => ({
          id: (item.Product_id ?? item.id)?.toString(),
          name: item.Product_name ?? item.name ?? 'Unnamed',
          sku: item.Product_sku ?? item.sku ?? '',
          price: Number(item.Product_price ?? item.price ?? 0),
        })),
      );
    } catch (err: any) {
      console.error('❌ Product fetch error:', err?.message || err);
      setProductsError(err?.message || 'Unable to load products');
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const totals = useMemo(() => {
    if (!selectedInvoice) {
      return { subtotal: 0, tax: 0, total: 0 };
    }
    const subtotal =
      selectedInvoice.subtotal ??
      selectedInvoice.items.reduce((sum, item) => sum + calculateLineTotal(item), 0);
    const tax = selectedInvoice.tax ?? Number((subtotal * 0.05).toFixed(2));
    const total = selectedInvoice.total ?? subtotal + tax;
    return { subtotal, tax, total };
  }, [selectedInvoice]);

  const onRefresh = useCallback(() => {
    fetchInvoices(false);
  }, [fetchInvoices]);

  const handleInputChange = (
    field: keyof typeof createForm,
    value: string | InvoiceStatus | ReturnType<typeof createEmptyLineItem>[]
  ) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (
    index: number,
    field: 'description' | 'quantity' | 'unitPrice' | 'productId',
    value: string,
  ) => {
    setCreateForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const addLineItem = () => {
    setCreateForm((prev) => ({ ...prev, items: [...prev.items, createEmptyLineItem()] }));
  };

  const removeLineItem = (index: number) => {
    setCreateForm((prev) => {
      if (prev.items.length === 1) return prev;
      const items = prev.items.filter((_, i) => i !== index);
      return { ...prev, items };
    });
  };

  const handleOpenCreate = () => {
    setCreateForm(defaultCreateForm());
    setCreateError(null);
    setCreateVisible(true);
  };

  const handleCloseCreate = () => {
    setCreateVisible(false);
    setCreateError(null);
  };

  const parseDate = (value?: string) => {
    if (!value) return new Date();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  };

  const openDatePicker = (field: 'invoiceDate' | 'dueDate') => {
    const current = parseDate(createForm[field]);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        mode: 'date',
        value: current,
        onChange: (_event, selectedDate) => {
          if (selectedDate) {
            handleInputChange(field, formatDateForApi(selectedDate));
          }
        },
      });
      return;
    }
    setDatePickerField(field);
    setTempDate(current);
    setShowDatePicker(true);
  };

  const closeDatePicker = () => {
    setShowDatePicker(false);
    setDatePickerField(null);
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (!datePickerField || !selectedDate) return;
    setTempDate(selectedDate);
    handleInputChange(datePickerField, formatDateForApi(selectedDate));
  };

  const draftTotals = useMemo(() => {
    let subtotal = 0;
    createForm.items.forEach((item) => {
      const quantity = Number(item.quantity) || 0;
      const unit = Number(item.unitPrice) || 0;
      if (quantity > 0 && unit >= 0) {
        subtotal += quantity * unit;
      }
    });
    const tax = Number((subtotal * 0.05).toFixed(2));
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [createForm.items]);

  const handleSaveInvoice = async () => {
    setCreateError(null);
    const {
      invoiceNumber,
      invoiceDate,
      dueDate,
      status,
      customerName,
      customerPhone,
      customerAddress,
      notes,
      items,
    } = createForm;

    if (!customerName.trim()) {
      setCreateError('Customer name is required.');
      return;
    }
    if (!invoiceDate) {
      setCreateError('Invoice date is required.');
      return;
    }
    if (!items.length) {
      setCreateError('Add at least one line item.');
      return;
    }

    let subtotal = 0;
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (!item.productId) {
        setCreateError(`Select a product for line item ${i + 1}.`);
        return;
      }
      if (!item.description.trim()) {
        setCreateError(`Line item ${i + 1} needs a description.`);
        return;
      }
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        setCreateError(`Line item ${i + 1} must have quantity greater than zero.`);
        return;
      }
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        setCreateError(`Line item ${i + 1} must have unit price zero or greater.`);
        return;
      }
      subtotal += quantity * unitPrice;
    }

    const tax = Number((subtotal * 0.05).toFixed(2));
    const total = subtotal + tax;

    const payload = {
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: dueDate || null,
      status,
      customer_name: customerName.trim(),
      customer_phone: customerPhone?.trim() || null,
      customer_address: customerAddress?.trim() || null,
      notes: notes?.trim() || '',
      subtotal,
      tax,
      total,
      items: items.map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unit_price: Number(item.unitPrice),
        product_id: item.productId ? Number(item.productId) : null,
      })),
    };

    try {
      setSavingInvoice(true);
      await createInvoiceApi(payload);
      handleCloseCreate();
      await fetchInvoices(true);
      Alert.alert('Success', 'Invoice has been created.');
    } catch (err: any) {
      if (__DEV__) {
        console.error('Create invoice error:', err?.response?.data || err?.message);
      }
      setCreateError(err?.response?.data?.error || err?.message || 'Unable to create invoice.');
    } finally {
      setSavingInvoice(false);
    }
  };

  const renderInvoiceCard = ({ item }: { item: Invoice }) => {
    const lineColor = statusColors[item.status];
    return (
      <Pressable
        onPress={() => setSelectedInvoice(item)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: cardBackground,
            borderColor,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={[styles.cardAccent, { backgroundColor: lineColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardTitle}>Invoice {item.invoiceNumber}</ThemedText>
            <View style={[styles.badge, { backgroundColor: lineColor }]}>
              <ThemedText style={styles.badgeText}>{item.status}</ThemedText>
            </View>
          </View>
          <ThemedText style={styles.cardSubTitle}>{item.customerName}</ThemedText>
          <ThemedText style={[styles.cardMeta, { color: textSecondary }]}>
            Issued {item.date} • Due {item.dueDate}
          </ThemedText>
          <ThemedText style={styles.cardAmount}>{formatCurrency(item.total)}</ThemedText>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={textSecondary} />
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>
          Invoices
        </ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          Manage billing for your motorcycle parts orders.
        </ThemedText>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          { opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={handleOpenCreate}
      >
        <MaterialIcons name="add" size={20} color="#fff" />
        <ThemedText style={styles.primaryButtonText}>New Invoice</ThemedText>
      </Pressable>

      
      {error && (
        <View style={styles.errorBox}>
          <MaterialIcons name="error-outline" size={20} color="red" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#6c63ff" />
          <ThemedText style={styles.loadingText}>Loading invoices…</ThemedText>
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.invoiceNumber}
          renderItem={renderInvoiceCard}
          ListEmptyComponent={() => (
            <ThemedText style={styles.emptyText}>
              No invoices yet. Pull down to refresh.
            </ThemedText>
          )}
          contentContainerStyle={{ paddingBottom: 48 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6c63ff" />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={!!selectedInvoice}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedInvoice(null)}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView
            style={[styles.modalContent, { backgroundColor: cardBackground }]}
            contentContainerStyle={{ padding: 20 }}
          >
            {selectedInvoice && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <ThemedText type="subtitle" style={styles.modalTitle}>
                      Invoice {selectedInvoice.invoiceNumber}
                    </ThemedText>
                    <ThemedText style={[styles.modalMeta, { color: textSecondary }]}>
                      Issued {selectedInvoice.date} • Due {selectedInvoice.dueDate}
                    </ThemedText>
                  </View>
                  <Pressable onPress={() => setSelectedInvoice(null)} style={styles.closeButton}>
                    <MaterialIcons name="close" size={22} color={textSecondary} />
                  </Pressable>
                </View>

                <View style={styles.detailSection}>
                  <ThemedText style={styles.sectionTitle}>Bill To</ThemedText>
                  <ThemedText>{selectedInvoice.customerName}</ThemedText>
                  {selectedInvoice.customerPhone ? (
                    <ThemedText style={[styles.modalMeta, { color: textSecondary }]}>
                      {selectedInvoice.customerPhone}
                    </ThemedText>
                  ) : null}
                  {selectedInvoice.customerAddress ? (
                    <ThemedText style={[styles.modalMeta, { color: textSecondary }]}>
                      {selectedInvoice.customerAddress}
                    </ThemedText>
                  ) : null}
                </View>

                <View style={styles.detailSection}>
                  <ThemedText style={styles.sectionTitle}>Line Items</ThemedText>
                  {selectedInvoice.items.map((item, index) => (
                    <View key={`${item.description}-${index}`} style={styles.lineItem}>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.lineItemTitle}>{item.description}</ThemedText>
                        <ThemedText style={[styles.modalMeta, { color: textSecondary }]}>
                          Qty {item.quantity} × {formatCurrency(item.unitPrice)}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.lineItemAmount}>
                        {formatCurrency(calculateLineTotal(item))}
                      </ThemedText>
                    </View>
                  ))}
                </View>

                <View style={styles.totalsBox}>
                  <View style={styles.totalRow}>
                    <ThemedText style={[styles.modalMeta, { color: textSecondary }]}>Subtotal</ThemedText>
                    <ThemedText>{formatCurrency(totals.subtotal)}</ThemedText>
                  </View>
                  <View style={styles.totalRow}>
                    <ThemedText style={[styles.modalMeta, { color: textSecondary }]}>Tax</ThemedText>
                    <ThemedText>{formatCurrency(totals.tax)}</ThemedText>
                  </View>
                  <View style={[styles.totalRow, styles.totalRowHighlight]}>
                    <ThemedText style={styles.totalLabel}>Total</ThemedText>
                    <ThemedText style={styles.totalLabel}>
                      {formatCurrency(totals.total)}
                    </ThemedText>
                  </View>
                </View>

                {selectedInvoice.notes ? (
                  <ThemedText
                    style={[styles.modalMeta, { color: textSecondary, marginBottom: 16 }]}
                  >
                    {selectedInvoice.notes}
                  </ThemedText>
                ) : null}

                <Pressable
                  onPress={() => Alert.alert('Coming soon', 'PDF export will be available soon!')}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <MaterialIcons name="file-download" size={20} color="#2E3A8C" />
                  <ThemedText style={styles.secondaryButtonText}>Download PDF</ThemedText>
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
      <Modal
        visible={createVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCloseCreate}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView
            style={[styles.modalContent, { backgroundColor: cardBackground }]}
            contentContainerStyle={{ padding: 20 }}
          >
            <View style={styles.modalHeader}>
              <View>
                <ThemedText type="subtitle" style={styles.modalTitle}>
                  New Invoice
                </ThemedText>
                <ThemedText style={[styles.modalMeta, { color: textSecondary }]}>
                  {createForm.invoiceNumber}
                </ThemedText>
              </View>
              <Pressable onPress={handleCloseCreate} style={styles.closeButton}>
                <MaterialIcons name="close" size={22} color={textSecondary} />
              </Pressable>
            </View>
            {createError ? (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={20} color="red" />
                <ThemedText style={styles.errorText}>{createError}</ThemedText>
              </View>
            ) : null}
            <View style={styles.formSection}>
              <ThemedText style={styles.formLabel}>Invoice Date</ThemedText>
              <Pressable style={styles.dateInput} onPress={() => openDatePicker('invoiceDate')}>
                <MaterialIcons name="calendar-month" size={20} color="#6b7280" />
                <ThemedText style={styles.dateInputText}>
                  {createForm.invoiceDate || 'Select date'}
                </ThemedText>
              </Pressable>
            </View>
            <View style={styles.formSection}>
              <ThemedText style={styles.formLabel}>Due Date</ThemedText>
              <Pressable style={styles.dateInput} onPress={() => openDatePicker('dueDate')}>
                <MaterialIcons name="calendar-month" size={20} color="#6b7280" />
                <ThemedText style={styles.dateInputText}>
                  {createForm.dueDate || 'Select date'}
                </ThemedText>
              </Pressable>
            </View>
            <View style={styles.formSection}>
              <ThemedText style={styles.formLabel}>Status</ThemedText>
              <View style={styles.statusRow}>
                {(['Pending', 'Paid', 'Overdue'] as InvoiceStatus[]).map((option) => (
                  <Pressable
                    key={option}
                    style={[
                      styles.statusChip,
                      createForm.status === option && styles.statusChipActive,
                    ]}
                    onPress={() => handleInputChange('status', option)}
                  >
                    <ThemedText
                      style={[
                        styles.statusChipText,
                        createForm.status === option && styles.statusChipTextActive,
                      ]}
                    >
                      {option}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.formSection}>
              <ThemedText style={styles.sectionTitle}>Customer</ThemedText>
              <TextInput
                value={createForm.customerName}
                onChangeText={(text) => handleInputChange('customerName', text)}
                placeholder="Name"
                style={styles.input}
              />
              <TextInput
                value={createForm.customerPhone}
                onChangeText={(text) => handleInputChange('customerPhone', text)}
                placeholder="Phone"
                style={styles.input}
                keyboardType="phone-pad"
              />
              <TextInput
                value={createForm.customerAddress}
                onChangeText={(text) => handleInputChange('customerAddress', text)}
                placeholder="Address"
                style={[styles.input, { height: 80 }]}
                multiline
              />
            </View>
            <View style={styles.formSection}>
              <ThemedText style={styles.sectionTitle}>Line Item</ThemedText>
              {createForm.items.map((item, index) => (
                <View key={`line-item-${index}`} style={styles.lineItemEditor}>
                  <View style={styles.lineItemHeader}>
                    <ThemedText style={styles.lineItemTitle}>
                      Item #{index + 1}
                    </ThemedText>
                    {createForm.items.length > 1 && (
                      <Pressable onPress={() => removeLineItem(index)}>
                        <MaterialIcons name="delete-outline" size={20} color="#e74c3c" />
                      </Pressable>
                    )}
                  </View>
                  <Pressable
                    style={styles.productPicker}
                    onPress={() => setProductPickerIndex(index)}
                    disabled={productsLoading}
                  >
                    <MaterialIcons name="inventory-2" size={18} color="#6b7280" />
                    <ThemedText style={styles.productPickerText}>
                      {item.productId
                        ? products.find((p) => p.id === item.productId)?.name || 'Selected product'
                        : productsLoading
                        ? 'Loading products…'
                        : 'Choose product'}
                    </ThemedText>
                  </Pressable>
                  <TextInput
                    value={item.description}
                    onChangeText={(text) => handleItemChange(index, 'description', text)}
                    placeholder="Description"
                    style={styles.input}
                    multiline
                  />
                  <View style={styles.formRow}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.formLabel}>Quantity</ThemedText>
                      <TextInput
                        value={item.quantity}
                        onChangeText={(text) => handleItemChange(index, 'quantity', text)}
                        placeholder="Quantity"
                        style={styles.input}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.formLabel}>Unit Price</ThemedText>
                      <TextInput
                        value={item.unitPrice}
                        editable={false}
                        placeholder="Unit Price"
                        style={[styles.input, styles.readOnlyInput]}
                      />
                    </View>
                  </View>
                </View>
              ))}
              <Pressable style={styles.addItemButton} onPress={addLineItem}>
                <MaterialIcons name="add-circle-outline" size={20} color="#2E3A8C" />
                <ThemedText style={styles.addItemText}>Add Another Item</ThemedText>
              </Pressable>
            </View>
            <View style={styles.formSection}>
              <ThemedText style={styles.sectionTitle}>Draft Items Preview</ThemedText>
              {createForm.items.map((item, index) => {
                const qty = Number(item.quantity) || 0;
                const price = Number(item.unitPrice) || 0;
                return (
                  <View key={`preview-${index}`} style={styles.previewRow}>
                    <View>
                      <ThemedText style={styles.previewTitle}>
                        {item.description || `Item ${index + 1}`}
                      </ThemedText>
                      <ThemedText style={styles.previewSubtitle}>
                        {qty} × {formatCurrency(price)}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.previewAmount}>
                      {formatCurrency(qty * price)}
                    </ThemedText>
                  </View>
                );
              })}
              <View style={styles.previewTotals}>
                <View style={styles.previewRow}>
                  <ThemedText style={styles.previewLabel}>Subtotal</ThemedText>
                  <ThemedText style={styles.previewAmount}>
                    {formatCurrency(draftTotals.subtotal)}
                  </ThemedText>
                </View>
                <View style={styles.previewRow}>
                  <ThemedText style={styles.previewLabel}>Tax (5%)</ThemedText>
                  <ThemedText style={styles.previewAmount}>
                    {formatCurrency(draftTotals.tax)}
                  </ThemedText>
                </View>
                <View style={[styles.previewRow, styles.previewRowHighlight]}>
                  <ThemedText style={styles.previewTotalLabel}>Total</ThemedText>
                  <ThemedText style={styles.previewTotalLabel}>
                    {formatCurrency(draftTotals.total)}
                  </ThemedText>
                </View>
              </View>
            </View>
            <View style={styles.formSection}>
              <ThemedText style={styles.formLabel}>Notes</ThemedText>
              <TextInput
                value={createForm.notes}
                onChangeText={(text) => handleInputChange('notes', text)}
                placeholder="Add any remarks"
                style={[styles.input, { height: 80 }]}
                multiline
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.secondaryButton, { backgroundColor: 'rgba(0,0,0,0.05)' }]}
                onPress={handleCloseCreate}
                disabled={savingInvoice}
              >
                <ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.primaryButton,
                  { alignSelf: 'auto', opacity: savingInvoice ? 0.8 : 1 },
                ]}
                onPress={handleSaveInvoice}
                disabled={savingInvoice}
              >
                <MaterialIcons name="check" size={20} color="#fff" />
                <ThemedText style={styles.primaryButtonText}>
                  {savingInvoice ? 'Saving…' : 'Save Invoice'}
                </ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
      {showDatePicker && datePickerField && (
        <Modal transparent animationType="fade">
          <View style={styles.datePickerBackdrop}>
            <View style={[styles.datePickerCard, { backgroundColor: cardBackground }]}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                onChange={handleDateChange}
                style={{ alignSelf: 'stretch' }}
              />
              <Pressable style={styles.datePickerDoneBtn} onPress={closeDatePicker}>
                <ThemedText style={styles.datePickerDoneText}>
                  {Platform.OS === 'ios' ? 'Done' : 'Close'}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
      <Modal
        visible={productPickerIndex !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setProductPickerIndex(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.productModal, { backgroundColor: cardBackground }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Product</ThemedText>
              <Pressable onPress={() => setProductPickerIndex(null)} style={styles.closeButton}>
                <MaterialIcons name="close" size={22} color={textSecondary} />
              </Pressable>
            </View>
            <TextInput
              value={productSearch}
              onChangeText={setProductSearch}
              placeholder="Search product..."
              style={styles.input}
            />
            {productsError ? (
              <ThemedText style={styles.errorText}>{productsError}</ThemedText>
            ) : null}
            {productsLoading ? (
              <ActivityIndicator color="#6c63ff" style={{ marginTop: 12 }} />
            ) : (
              <FlatList
                data={products.filter((product) =>
                  (product.name + product.sku)
                    .toLowerCase()
                    .includes(productSearch.toLowerCase()),
                )}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.productRow}
                    onPress={() => {
                      if (productPickerIndex === null) return;
                      handleItemChange(productPickerIndex, 'productId', item.id);
                      handleItemChange(
                        productPickerIndex,
                        'description',
                        item.sku ? `${item.name} (${item.sku})` : item.name,
                      );
                      handleItemChange(
                        productPickerIndex,
                        'unitPrice',
                        item.price.toString(),
                      );
                      setProductPickerIndex(null);
                      setProductSearch('');
                    }}
                  >
                    <View>
                      <ThemedText style={styles.productName}>{item.name}</ThemedText>
                      <ThemedText style={styles.productMeta}>
                        {item.sku || 'No SKU'} • {formatCurrency(item.price)}
                      </ThemedText>
                    </View>
                  </Pressable>
                )}
                style={{ maxHeight: 300 }}
              />
            )}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#6c63ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
    gap: 6,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#c0392b',
    fontWeight: '600',
  },
  loadingBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  loadingText: {
    color: '#6c63ff',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6c757d',
    marginTop: 32,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  cardAccent: {
    width: 6,
    height: '100%',
    borderRadius: 999,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardMeta: {
    fontSize: 13,
    marginBottom: 6,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  detailSection: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 6,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  lineItemTitle: {
    fontWeight: '600',
  },
  lineItemAmount: {
    fontWeight: '700',
    fontSize: 14,
  },
  totalsBox: {
    gap: 6,
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRowHighlight: {
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(32, 43, 87, 0.08)',
  },
  secondaryButtonText: {
    color: '#2E3A8C',
    fontWeight: '600',
  },
  formSection: {
    marginBottom: 16,
  },
  formLabel: {
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe3f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 15,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 999,
    borderColor: '#d1d5db',
  },
  statusChipActive: {
    backgroundColor: '#2E3A8C',
    borderColor: '#2E3A8C',
  },
  statusChipText: {
    color: '#4b5563',
    fontWeight: '600',
  },
  statusChipTextActive: {
    color: '#fff',
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  lineItemEditor: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lineItemTitle: {
    fontWeight: '600',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  addItemText: {
    color: '#2E3A8C',
    fontWeight: '600',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#dfe3f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateInputText: {
    fontSize: 15,
    color: '#111827',
  },
  datePickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerCard: {
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  datePickerDoneBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: '#2E3A8C',
  },
  datePickerDoneText: {
    color: '#fff',
    fontWeight: '600',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  previewTitle: {
    fontWeight: '600',
  },
  previewSubtitle: {
    color: '#6b7280',
    fontSize: 13,
  },
  previewAmount: {
    fontWeight: '600',
  },
  previewLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  previewTotals: {
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 8,
    gap: 4,
  },
  previewRowHighlight: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 6,
  },
  previewTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  productPicker: {
    borderWidth: 1,
    borderColor: '#dfe3f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  productPickerText: {
    color: '#111827',
  },
  readOnlyInput: {
    backgroundColor: '#f5f5f5',
    color: '#111827',
  },
  productModal: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  productRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  productName: {
    fontWeight: '600',
  },
  productMeta: {
    color: '#6b7280',
    fontSize: 13,
  },
});

