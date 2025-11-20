import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Card,
  CardContent,
  InputAdornment,
  Pagination,
  ToggleButton,
  ToggleButtonGroup,
  Tabs,
  Tab
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  TableRows as TableRowsIcon,
  GridView as GridViewIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Error as ErrorIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';

import SidebarLayout from '../components/SidebarLayout';

import { API_BASE } from '../config/api';

const statusColor = {
  Paid: 'success',
  Pending: 'warning',
  Overdue: 'error',
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
  });

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const normalizeInvoices = (data = []) =>
  data.map((invoice) => ({
    invoiceId: String(
      invoice.invoice_id ?? invoice.invoiceId ?? invoice.invoice_number ?? ''
    ),
    invoiceNumber: invoice.invoice_number,
    customer: {
      name: invoice.customer_name,
      phone: invoice.customer_phone,
      address: invoice.customer_address,
    },
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
          unitPrice: Number(item.unit_price ?? item.unitPrice ?? 0) || 0,
          productId: item.product_id || item.productId || null,
        }))
      : [],
  }));

const calculateLineTotal = (item) =>
  item.quantity * item.unitPrice;

const generateInvoiceNumber = () => {
  const now = new Date();
  return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}-${now.getTime().toString().slice(-4)}`;
};

export default function Invoices() {
  const location = useLocation();
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState(null);
  const createEmptyItem = () => ({
    productId: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
  });

  const [createForm, setCreateForm] = useState({
    invoiceNumber: generateInvoiceNumber(),
    invoiceDate: '',
    dueDate: '',
    status: 'Pending',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    notes: '',
    items: [createEmptyItem()],
  });
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const highlightRef = useRef(null);
  if (highlightRef.current === null) {
    const highlightFromState = location.state?.highlightInvoiceId;
    if (highlightFromState) {
      highlightRef.current = String(highlightFromState);
      try {
        sessionStorage.setItem('highlightInvoiceId', String(highlightFromState));
      } catch (err) {
        console.warn('Unable to persist invoice highlight across navigation:', err);
      }
    } else {
      try {
        const storedHighlight = sessionStorage.getItem('highlightInvoiceId');
        if (storedHighlight) {
          highlightRef.current = storedHighlight;
        }
      } catch (err) {
        console.warn('Unable to restore invoice highlight from session storage:', err);
      }
    }
  }

  // Filter invoices based on search and status
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const matchesSearch = 
        invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        invoice.customer.name.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || invoice.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/invoices`);
      if (!response.ok) {
        throw new Error(`Unable to load invoices (status ${response.status})`);
      }
      const raw = await response.json();
      const normalized = normalizeInvoices(Array.isArray(raw) ? raw : []);
      setInvoices(normalized);
      const highlight = highlightRef.current;
      if (highlight) {
        const match = normalized.find(
          (inv) =>
            String(inv.invoiceId ?? inv.invoiceNumber ?? '') === String(highlight) ||
            String(inv.invoiceNumber ?? '') === String(highlight)
        );
        if (match) {
          setSelectedInvoice(match);
          highlightRef.current = null;
          try {
            sessionStorage.removeItem('highlightInvoiceId');
          } catch (err) {
            console.warn('Unable to clear invoice highlight from session storage:', err);
          }
        } else {
          setSelectedInvoice(normalized[0] || null);
        }
      } else {
        setSelectedInvoice(normalized[0] || null);
      }
    } catch (err) {
      console.error('❌ Invoice fetch error:', err);
      setError(err?.message || 'Unable to load invoices');
      setInvoices([]);
      setSelectedInvoice(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const response = await fetch(`${API_BASE}/api/products`);
      if (!response.ok) {
        throw new Error(`Unable to load products (status ${response.status})`);
      }
      const raw = await response.json();
      const arr = Array.isArray(raw) ? raw : [];
      setProducts(arr);
    } catch (err) {
      console.error('❌ Product fetch error:', err);
      setProducts([]);
      setProductsError(err?.message || 'Unable to load products');
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
    fetchProducts();
  }, [fetchInvoices, fetchProducts]);

  useEffect(() => {
    return () => {
      try {
        sessionStorage.removeItem('highlightInvoiceId');
      } catch (err) {
        // ignore clean-up errors
      }
    };
  }, []);

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

  const handleCreateInput = (field) => (event) => {
    const value = event.target.value;
    setCreateForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleItemChange = (index, field) => (event) => {
    const value =
      field === 'quantity' || field === 'unitPrice' ? Number(event.target.value) : event.target.value;
    setCreateForm((prev) => {
      const items = [...prev.items];
      items[index] = {
        ...items[index],
        [field]: field === 'quantity' ? Math.max(1, value) : field === 'unitPrice' ? Math.max(0, value) : value,
      };
      return { ...prev, items };
    });
  };

  const handleProductSelect = (index) => (event) => {
    const productId = event.target.value;
    const product = products.find(
      (p) => String(p.Product_id ?? p.product_id ?? '') === String(productId)
    );
    setCreateForm((prev) => {
      const items = [...prev.items];
      items[index] = {
        ...items[index],
        productId,
        description: product
          ? `${product.Product_name || product.product_name || 'Product'}${
              product.Product_sku || product.product_sku ? ` (${product.Product_sku || product.product_sku})` : ''
            }`
          : '',
        unitPrice: product ? Number(product.Product_price || product.product_price || 0) : 0,
      };
      return { ...prev, items };
    });
  };

  const addLineItem = () => {
    setCreateForm((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyItem()],
    }));
  };

  const removeLineItem = (index) => {
    setCreateForm((prev) => {
      if (prev.items.length === 1) return prev;
      const items = prev.items.filter((_, i) => i !== index);
      return { ...prev, items };
    });
  };

  const resetCreateForm = () => {
    setCreateForm({
    invoiceNumber: generateInvoiceNumber(),
      invoiceDate: '',
      dueDate: '',
      status: 'Pending',
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      notes: '',
      items: [createEmptyItem()],
    });
    setCreateError(null);
  };

const handleCreateClose = () => {
    setCreateOpen(false);
    resetCreateForm();
  };

const handleCreateOpen = () => {
  setCreateForm((prev) => ({
    ...prev,
    invoiceNumber: generateInvoiceNumber(),
  }));
  setCreateError(null);
  setCreateOpen(true);
};

  const handleCreateSubmit = async () => {
    setCreateError(null);
    if (!createForm.invoiceNumber.trim()) {
      setCreateError('Please enter an invoice number.');
      return;
    }
    if (!createForm.invoiceDate) {
      setCreateError('Please select an invoice date.');
      return;
    }
    if (!createForm.customerName.trim()) {
      setCreateError('Please enter the customer name.');
      return;
    }
    if (!createForm.items.length) {
      setCreateError('Add at least one line item.');
      return;
    }

    for (let i = 0; i < createForm.items.length; i += 1) {
      const item = createForm.items[i];
      if (!item.productId) {
        setCreateError(`Please select a product for line item ${i + 1}.`);
        return;
      }
      if (!item.description.trim()) {
        setCreateError(`Description missing for line item ${i + 1}. Please reselect the product.`);
        return;
      }
      if (Number(item.quantity) <= 0 || Number.isNaN(item.quantity)) {
        setCreateError(`Quantity must be greater than zero for line item ${i + 1}.`);
        return;
      }
      if (Number(item.unitPrice) < 0 || Number.isNaN(item.unitPrice)) {
        setCreateError(`Unit price must be zero or greater for line item ${i + 1}.`);
        return;
      }
    }

    const payload = {
      invoice_number: createForm.invoiceNumber,
      invoice_date: createForm.invoiceDate,
      due_date: createForm.dueDate || null,
      status: createForm.status,
      customer_name: createForm.customerName,
      customer_phone: createForm.customerPhone || null,
      customer_address: createForm.customerAddress || null,
      notes: createForm.notes || '',
      items: createForm.items.map((item) => ({
        description: item.description,
        quantity: Math.max(1, Number(item.quantity) || 1),
        unit_price: Math.max(0, Number(item.unitPrice) || 0),
        product_id: item.productId ? Number(item.productId) : null,
      })),
    };

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody?.error || `Unable to create invoice (status ${response.status})`);
      }

      const created = await response.json();
      const normalized = normalizeInvoices(created ? [created] : []);
      const newInvoice = normalized[0];
      await fetchInvoices();
      if (newInvoice) {
        setSelectedInvoice(newInvoice);
      }
      handleCreateClose();
    } catch (err) {
      console.error('❌ Create invoice error:', err);
      setCreateError(err?.message || 'Unable to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintInvoice = () => {
    const printContent = document.querySelector('.invoice-receipt');
    if (!printContent) {
      alert('No invoice selected to print');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${selectedInvoice.invoiceNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .section {
            margin-bottom: 20px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .items-table th,
          .items-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          .items-table th {
            background-color: #f2f2f2;
          }
          .totals {
            margin-left: auto;
            width: 300px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .divider {
            border-top: 1px solid #000;
            margin: 10px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            }
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadInvoice = () => {
    alert('Download functionality would be implemented here');
  };

  return (
    <SidebarLayout>
      <Box sx={{ maxWidth: 1400, margin: '0 auto', px: { xs: 1, md: 2 } }}>
        {/* Header with search and actions */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#2E3A8C', mb: 0.5 }}>
              Invoice Management
            </Typography>
            <Typography color="text.secondary">
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <TextField
              placeholder="Search invoices..."
              size="small"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ 
                background: '#fff', 
                borderRadius: 2,
                minWidth: 200
              }}
            />
            <IconButton 
              color="primary" 
              onClick={fetchInvoices} 
              title="Refresh invoices"
              sx={{ 
                bgcolor: '#2E3A8C10',
                '&:hover': { bgcolor: '#2E3A8C20' }
              }}
            >
              <RefreshIcon />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateOpen}
              sx={{ 
                borderRadius: 2, 
                background: '#6c63ff', 
                fontWeight: 600, 
                textTransform: 'none',
                px: 3
              }}
            >
              New Invoice
            </Button>
          </Stack>
        </Stack>

        {/* Filters */}
        <Card sx={{ mb: 3, borderRadius: 3, border: '1px solid #e5e7eb' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Filter Invoices
                </Typography>
              </Box>
              <Box display="flex" gap={2} flexWrap="wrap">
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(e, newMode) => newMode && setViewMode(newMode)}
                  size="small"
                  sx={{ height: 40 }}
                >
                  <ToggleButton value="list" sx={{ borderRadius: 2, border: '1px solid #ccc' }}>
                    <TableRowsIcon />
                  </ToggleButton>
                  <ToggleButton value="grid" sx={{ borderRadius: 2, border: '1px solid #ccc' }}>
                    <GridViewIcon />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>
            
            <Box display="flex" gap={2} flexWrap="wrap">
              <TextField
                select
                label="Status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                size="small"
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="All">All Statuses</MenuItem>
                <MenuItem value="Paid">Paid</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Overdue">Overdue</MenuItem>
              </TextField>
              
              <Button
                startIcon={<RefreshIcon />}
                onClick={() => {
                  setStatusFilter('All');
                  setSearch('');
                  setPage(1);
                }}
                variant="outlined"
                size="small"
                sx={{ height: 40 }}
              >
                Reset Filters
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <Grid container spacing={3} mb={3} width="100%" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, border: '1px solid #e5e7eb', height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" variant="body2">Total Invoices</Typography>
                    <Typography variant="h4" fontWeight={700}>{invoices.length}</Typography>
                  </Box>
                  <Box sx={{ bgcolor: '#2E3A8C10', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ReceiptIcon sx={{ color: '#2E3A8C' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, border: '1px solid #e5e7eb', height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" variant="body2">Paid</Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {invoices.filter(inv => inv.status === 'Paid').length}
                    </Typography>
                  </Box>
                  <Box sx={{ bgcolor: '#06D6A010', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircleIcon sx={{ color: '#06D6A0' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, border: '1px solid #e5e7eb', height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" variant="body2">Pending</Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {invoices.filter(inv => inv.status === 'Pending').length}
                    </Typography>
                  </Box>
                  <Box sx={{ bgcolor: '#FFD16610', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PendingIcon sx={{ color: '#FFD166' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, border: '1px solid #e5e7eb', height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" variant="body2">Overdue</Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {invoices.filter(inv => inv.status === 'Overdue').length}
                    </Typography>
                  </Box>
                  <Box sx={{ bgcolor: '#FF6B6B10', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ErrorIcon sx={{ color: '#FF6B6B' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3} width="100%" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Grid item xs={12} md={viewMode === 'list' ? 9 : 12} width="100%">
            <Paper elevation={2} sx={{ p: 2, height: '100%', borderRadius: 3, border: '1px solid #e5e7eb' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                <Typography variant="h6" fontWeight={700}>
                  Invoice List
                </Typography>
                {loading && <CircularProgress size={24} />}
              </Stack>
              {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}
              {!loading && filteredInvoices.length === 0 && !error ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <ReceiptIcon sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
                  <Typography color="text.secondary" variant="h6">
                    No invoices found
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    Try adjusting your search or filter criteria
                  </Typography>
                  <Button 
                    variant="outlined" 
                    startIcon={<AddIcon />}
                    onClick={handleCreateOpen}
                  >
                    Create New Invoice
                  </Button>
                </Box>
              ) : viewMode === 'list' ? (
                // List View
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f7ff' }}>
                      <TableCell>Invoice #</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell align="right">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedInvoices.map((invoice) => {
                      const isActive = selectedInvoice?.invoiceNumber === invoice.invoiceNumber;
                      return (
                        <TableRow
                          key={invoice.invoiceNumber}
                          hover
                          selected={isActive}
                          onClick={() => setSelectedInvoice(invoice)}
                          sx={{ cursor: 'pointer', '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                          <TableCell>
                            <Typography fontWeight={500}>{invoice.invoiceNumber}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight={500}>{invoice.customer.name}</Typography>
                          </TableCell>
                          <TableCell>{invoice.date}</TableCell>
                          <TableCell align="right">
                            <Typography fontWeight={600}>{formatCurrency(invoice.total)}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              size="small"
                              label={invoice.status}
                              color={statusColor[invoice.status] || 'default'}
                              sx={{ minWidth: 80 }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                // Grid View
                <Grid container spacing={2}>
                  {paginatedInvoices.map((invoice) => {
                    const isActive = selectedInvoice?.invoiceNumber === invoice.invoiceNumber;
                    return (
                      <Grid item xs={12} sm={6} md={4} key={invoice.invoiceNumber}>
                        <Card 
                          sx={{ 
                            borderRadius: 2, 
                            border: isActive ? '2px solid #6c63ff' : '1px solid #e5e7eb',
                            height: '100%',
                            transition: '0.3s',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                              cursor: 'pointer'
                            }
                          }}
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                              <Box>
                                <Typography variant="h6" fontWeight={600}>
                                  {invoice.invoiceNumber}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {invoice.date}
                                </Typography>
                              </Box>
                              <Chip
                                size="small"
                                label={invoice.status}
                                color={statusColor[invoice.status] || 'default'}
                              />
                            </Box>
                            
                            <Box mb={2}>
                              <Typography fontWeight={500}>{invoice.customer.name}</Typography>
                            </Box>
                            
                            <Divider sx={{ my: 1 }} />
                            
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography color="text.secondary">Total</Typography>
                              <Typography variant="h6" fontWeight={700}>
                                {formatCurrency(invoice.total)}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={2}>
                  <Pagination 
                    count={totalPages} 
                    page={page} 
                    onChange={(e, value) => setPage(value)}
                    color="primary"
                    siblingCount={1}
                    boundaryCount={1}
                  />
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6} width="100%">
            <Paper elevation={2} sx={{ p: 3, height: '100%', borderRadius: 3, border: '1px solid #e5e7eb' }}>
              {selectedInvoice ? (
                <Box className="invoice-receipt">
                  {/* Receipt Header */}
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Typography variant="h5" fontWeight={800} sx={{ color: '#2E3A8C', mb: 1 }}>
                      AIVENTORY RECEIPT
                    </Typography>
                    <Typography color="text.secondary">
                      Motorcycle Parts & Accessories
                    </Typography>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                      Quezon City, Philippines
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                  </Box>
                  
                  {/* Invoice Info */}
                  <Grid container spacing={2} sx={{ mb: 4 }} width="100%" justifyContent="center" alignItems="center">
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        BILL TO
                      </Typography>
                      <Typography fontWeight={600}>{selectedInvoice.customer.name}</Typography>
                      {selectedInvoice.customer.phone && (
                        <Typography variant="body2">{selectedInvoice.customer.phone}</Typography>
                      )}
                      {selectedInvoice.customer.address && (
                        <Typography variant="body2">{selectedInvoice.customer.address}</Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                          INVOICE DETAILS
                        </Typography>
                        <Typography>
                          <strong>Invoice #:</strong> {selectedInvoice.invoiceNumber}
                        </Typography>
                        <Typography>
                          <strong>Date:</strong> {selectedInvoice.date}
                        </Typography>
                        <Typography>
                          <strong>Due Date:</strong> {selectedInvoice.dueDate}
                        </Typography>
                        <Chip
                          label={selectedInvoice.status}
                          color={statusColor[selectedInvoice.status] || 'default'}
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                  
                  {/* Items Table */}
                  <Table size="small" sx={{ mb: 3 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f7ff' }}>
                        <TableCell><strong>Item</strong></TableCell>
                        <TableCell align="right"><strong>Qty</strong></TableCell>
                        <TableCell align="right"><strong>Price</strong></TableCell>
                        <TableCell align="right"><strong>Total</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedInvoice.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography fontWeight={500}>{item.description}</Typography>
                          </TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell align="right">{formatCurrency(calculateLineTotal(item))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Totals */}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                    <Box sx={{ width: 250 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography>Subtotal</Typography>
                        <Typography>{formatCurrency(totals.subtotal)}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography>Tax (5%)</Typography>
                        <Typography>{formatCurrency(totals.tax)}</Typography>
                      </Stack>
                      <Divider sx={{ my: 1 }} />
                      <Stack direction="row" justifyContent="space-between" fontWeight={700} sx={{ mb: 1 }}>
                        <Typography variant="h6">TOTAL</Typography>
                        <Typography variant="h6">{formatCurrency(totals.total)}</Typography>
                      </Stack>
                    </Box>
                  </Box>
                  
                  {/* Notes */}
                  {selectedInvoice.notes && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        NOTES
                      </Typography>
                      <Typography variant="body2">{selectedInvoice.notes}</Typography>
                    </Box>
                  )}
                  
                  {/* Actions */}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
                    <Button
                      variant="contained"
                      startIcon={<PrintIcon />}
                      onClick={handlePrintInvoice}
                      sx={{ 
                        borderRadius: 2, 
                        background: '#2E3A8C', 
                        fontWeight: 600,
                        px: 3
                      }}
                    >
                      Print Receipt
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={handleDownloadInvoice}
                      sx={{ 
                        borderRadius: 2, 
                        fontWeight: 600,
                        px: 3
                      }}
                    >
                      Download PDF
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <ReceiptIcon sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
                  <Typography color="text.secondary" variant="h6">
                    Select an invoice to view details
                  </Typography>
                  <Typography color="text.secondary">
                    Choose an invoice from the list to see its receipt format
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Dialog open={createOpen} onClose={handleCreateClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Create New Invoice
          <IconButton onClick={handleCreateClose} sx={{ position: 'absolute', right: 16, top: 16 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {createError && (
              <Alert severity="error" onClose={() => setCreateError(null)} sx={{ borderRadius: 2 }}>
                {createError}
              </Alert>
            )}

            <TextField
              label="Invoice Number"
              value={createForm.invoiceNumber}
              InputProps={{ readOnly: true }}
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Invoice Date"
                type="date"
                value={createForm.invoiceDate}
                onChange={handleCreateInput('invoiceDate')}
                InputLabelProps={{ shrink: true }}
                required
                fullWidth
              />
              <TextField
                label="Due Date"
                type="date"
                value={createForm.dueDate}
                onChange={handleCreateInput('dueDate')}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
            <TextField
              label="Status"
              select
              value={createForm.status}
              onChange={handleCreateInput('status')}
              fullWidth
            >
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Paid">Paid</MenuItem>
              <MenuItem value="Overdue">Overdue</MenuItem>
            </TextField>

            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2">Customer Details</Typography>
            <TextField
              label="Customer Name"
              value={createForm.customerName}
              onChange={handleCreateInput('customerName')}
              required
              fullWidth
            />
            <TextField
              label="Customer Phone"
              value={createForm.customerPhone}
              onChange={handleCreateInput('customerPhone')}
              fullWidth
            />
            <TextField
              label="Customer Address"
              value={createForm.customerAddress}
              onChange={handleCreateInput('customerAddress')}
              multiline
              minRows={2}
              fullWidth
            />

            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2">Line Items</Typography>
            {productsError && (
              <Alert severity="warning" onClose={() => setProductsError(null)} sx={{ borderRadius: 2 }}>
                {productsError}
              </Alert>
            )}

            {createForm.items.map((item, index) => (
              <Box key={index} sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 2, mb: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2">Product #{index + 1}</Typography>
                  {createForm.items.length > 1 && (
                    <Button size="small" color="error" onClick={() => removeLineItem(index)}>
                      Remove
                    </Button>
                  )}
                </Stack>
                <Stack spacing={2}>
                  <TextField
                    label="Product"
                    select
                    value={item.productId}
                    onChange={handleProductSelect(index)}
                    required
                    helperText={
                      productsLoading
                        ? 'Loading products…'
                        : products.length === 0
                        ? 'No products available. Add products first.'
                        : 'Select a product to autofill description and price.'
                    }
                    disabled={productsLoading || products.length === 0}
                    fullWidth
                  >
                    {productsLoading ? (
                      <MenuItem value="" disabled>
                        Loading…
                      </MenuItem>
                    ) : products.length > 0 ? (
                      products.map((product) => (
                        <MenuItem key={product.Product_id} value={product.Product_id}>
                          {product.Product_name}
                          {product.Product_sku ? ` (${product.Product_sku})` : ''} — {formatCurrency(product.Product_price)}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem value="" disabled>
                        No products available
                      </MenuItem>
                    )}
                  </TextField>
                  <TextField
                    label="Description"
                    value={item.description}
                    InputProps={{ readOnly: true }}
                    multiline
                    minRows={2}
                    fullWidth
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Quantity"
                      type="number"
                      value={item.quantity}
                      onChange={handleItemChange(index, 'quantity')}
                      inputProps={{ min: 1 }}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Unit Price"
                      type="number"
                      value={item.unitPrice}
                      inputProps={{ min: 0, step: '0.01' }}
                      required
                      InputProps={{ readOnly: true }}
                      fullWidth
                    />
                  </Stack>
                </Stack>
              </Box>
            ))}

            <Button variant="outlined" onClick={addLineItem} disabled={productsLoading || products.length === 0}>
              Add Another Product
            </Button>

            <TextField
              label="Notes"
              value={createForm.notes}
              onChange={handleCreateInput('notes')}
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={saving || productsLoading || products.length === 0}
            sx={{ bgcolor: '#6c63ff' }}
          >
            {saving ? 'Saving…' : 'Create Invoice'}
          </Button>
        </DialogActions>
      </Dialog>
    </SidebarLayout>
  );
}