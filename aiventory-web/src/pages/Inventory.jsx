// Inventory.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SidebarLayout from '../components/SidebarLayout';
import { API_BASE } from '../config/api';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Snackbar,
  Stack,
  Card,
  CardContent,
  Grid,
  Chip,
  Tabs,
  Tab,
  AppBar,
  Toolbar,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Pagination,
  Badge,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Insights as InsightsIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  TableRows as TableRowsIcon,
  GridView as GridViewIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  ErrorOutline as ErrorOutlineIcon,
  Category as CategoryIcon,
  AutoAwesome as AIAwesomeIcon,
  Remove as RemoveIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const statusColors = {
  'Good': '#06D6A0',
  'Warning': '#FFD166',
  'Critical': '#FF4D4F',
  'Active': '#4CAF50',
  'Inactive': '#9E9E9E',
};

const categories = ['Motorparts'];

export default function Inventory() {
  // Get user data from localStorage
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = userData.name || 'User';
  
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: '',
    stock: '',
    threshold: '',
    price: ''
  });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [fetchError, setFetchError] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;
  const navigate = useNavigate();
  const location = useLocation();
  const [zeroStockOnly, setZeroStockOnly] = useState(false);

  // Function to determine product status based on stock levels
  const getProductStatus = (stock, threshold) => {
    if (stock <= threshold) return 'Critical';
    if (stock <= threshold * 1.5) return 'Warning';
    return 'Good';
  };

  // Function to log audit trail
  const logAuditTrail = (action, productData, beforeData = null) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      product: productData,
      before: beforeData,
      user: userName // Use actual user name from localStorage
    };
    setAuditLog(prev => [logEntry, ...prev.slice(0, 49)]); // Keep last 50 entries
    console.log('Audit Log:', logEntry);
  };

  // Comprehensive function to fetch and sync products with database
  const fetchAndSyncProducts = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Fetching products from database...');
      const res = await axios.get(`${API_BASE}/api/products`);
      
      const formatted = res.data.map(p => ({
        id: p.Product_id,
        name: p.Product_name,
        sku: p.Product_sku,
        category: p.Product_category,
        stock: p.Product_stock,
        threshold: p.reorder_level,
        price: p.Product_price,
        status: getProductStatus(p.Product_stock, p.reorder_level),
        productStatus: p.Product_status || 'Active',
        created_at: p.created_at,
        updated_at: p.updated_at
      }));

      setInventory(formatted);
      setTotalItems(formatted.length);
      setFetchError(null);
      
      console.log(`✅ Successfully synced ${formatted.length} products from database`);
      logAuditTrail('SYNC', { totalProducts: formatted.length });
      
    } catch (err) {
      setFetchError("Error fetching products. Please check your backend connection.");
      console.error("❌ Error fetching products:", err);
      logAuditTrail('SYNC_ERROR', { error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch and periodic sync
  useEffect(() => {
    fetchAndSyncProducts();
    
    // Set up periodic sync every 30 seconds to ensure data consistency
    const syncInterval = setInterval(fetchAndSyncProducts, 30000);
    
    // Live updates via Server-Sent Events (SSE)
    let es;
    try {
      es = new EventSource(`${API_BASE}/api/events`);
      es.addEventListener('inventory_updated', () => {
        fetchAndSyncProducts();
      });
    } catch (e) {
      // SSE not critical; ignore if unavailable
    }
    
    return () => {
      clearInterval(syncInterval);
      try { es && es.close(); } catch (_) {}
    };
  }, []);

  // Handle navigation intents from other pages (e.g., Dashboard shortcuts)
  useEffect(() => {
    if (!location.state) return;

    const { focus, highlightSku } = location.state || {};
    let shouldClearState = false;

    if (focus === 'lowStock') {
      setStatusFilter('Critical');
      setZeroStockOnly(false);
      setPage(1);
      setSnackbarMsg('Showing items below the reorder threshold.');
      setSnackbarOpen(true);
      shouldClearState = true;
    } else if (focus === 'critical') {
      setStatusFilter('Critical');
      setZeroStockOnly(true);
      setPage(1);
      setSnackbarMsg('Showing critical items that are out of stock.');
      setSnackbarOpen(true);
      shouldClearState = true;
    }

    if (highlightSku) {
      setSearch(highlightSku);
      setStatusFilter('All');
      setZeroStockOnly(false);
      setPage(1);
      setSnackbarMsg(`Filtering by SKU: ${highlightSku}`);
      setSnackbarOpen(true);
      shouldClearState = true;
    }

    if (shouldClearState) {
      // Remove the navigation state so filters don't re-apply on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (statusFilter !== 'Critical' && zeroStockOnly) {
      setZeroStockOnly(false);
    }
  }, [statusFilter, zeroStockOnly]);

  // Filter inventory based on search, category, and status
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    
    const matchesZeroStock = !zeroStockOnly || Number(item.stock ?? 0) <= 0;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesZeroStock;
  });

  // Pagination
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const paginatedInventory = filteredInventory.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Get unique categories for filter
  const uniqueCategories = ['All', ...new Set(inventory.map(item => item.category))];

  // Get unique statuses for filter, always include key statuses
  const statusTemplate = ['Good', 'Warning', 'Critical'];
  const uniqueStatuses = ['All', ...new Set([...statusTemplate, ...inventory.map(item => item.status).filter(Boolean)])];

  const handleOpenModal = (item, idx) => {
    if (item) {
      setForm({
        name: item.name,
        sku: item.sku,
        category: item.category,
        stock: item.stock,
        threshold: item.threshold,
        price: item.price || ''
      });
      setEditIndex(idx);
    } else {
      setForm({ name: '', sku: '', category: '', stock: '', threshold: '', price: '' });
      setEditIndex(null);
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setForm({ name: '', sku: '', category: '', stock: '', threshold: '', price: '' });
    setEditIndex(null);
  };

  const handleFormChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.sku || !form.category || form.stock === '' || form.threshold === '') return;

    const newItem = {
      Product_name: form.name,
      Product_sku: form.sku,
      Product_price: Number(form.price) || 0,
      Product_category: form.category,
      reorder_level: Number(form.threshold),
      supplier_id: 1, // Set default supplier_id to avoid null constraint
      Product_stock: Number(form.stock),
      Product_status: 'Active' // Set default status
    };

    try {
      if (editIndex !== null) {
        const id = inventory[editIndex].id;
        await axios.put(`${API_BASE}/api/products/${id}`, newItem);
        const res = await axios.get(`${API_BASE}/api/products`);
        setInventory(res.data.map(p => ({
          id: p.Product_id,
          name: p.Product_name,
          sku: p.Product_sku,
          category: p.Product_category,
          stock: p.Product_stock,
          threshold: p.reorder_level,
          status: p.Product_status || 'Active'
        })));
        setSnackbarMsg("Item updated successfully!");
      } else {
        const res = await axios.post(`${API_BASE}/api/products`, newItem);
        const added = {
          id: res.data.Product_id || res.data.id,
          ...newItem
        };
        setInventory([...inventory, added]);
        setSnackbarMsg("Item added successfully!");
      }
    } catch (err) {
      if (err.response) {
        console.error('Axios error:', err.response.data);
        setSnackbarMsg(`Error saving item: ${err.response.data.error || 'Unknown error'}`);
      } else {
        console.error('Axios error:', err.message);
        setSnackbarMsg("Error saving item.");
      }
    }

    setSnackbarOpen(true);
    handleCloseModal();
  };

  const handleDelete = async (idx) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      const id = inventory[idx].id;
      try {
        await axios.delete(`${API_BASE}/api/products/${id}`);
        const res = await axios.get(`${API_BASE}/api/products`);
        setInventory(res.data.map(p => ({
          id: p.Product_id,
          name: p.Product_name,
          sku: p.Product_sku,
          category: p.Product_category,
          stock: p.Product_stock,
          threshold: p.reorder_level,
          status: p.Product_status || 'Active'
        })));
        setSnackbarMsg("Item deleted successfully!");
      } catch (err) {
        console.error(err);
        setSnackbarMsg("Error deleting item.");
      }
      setSnackbarOpen(true);
    }
  };

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState(''); // 'add' or 'remove'
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleAdjustmentOpen = (item, type) => {
    setSelectedItem(item);
    setAdjustmentType(type);
    setAdjustmentQuantity(1);
    setAdjustModalOpen(true);
  };

  const handleAdjustmentClose = () => {
    setAdjustModalOpen(false);
    setSelectedItem(null);
    setAdjustmentType('');
    setAdjustmentQuantity(1);
  };

  const handleAdjustmentSubmit = async () => {
    if (!selectedItem || (!adjustmentQuantity && adjustmentQuantity !== 0)) return;

    try {
      const currentStock = Number(selectedItem.stock);
      const adjustment = Number(adjustmentQuantity);
      
      let newStock;
      if (adjustmentType === 'add') {
        newStock = currentStock + adjustment;
      } else {
        newStock = Math.max(0, currentStock - adjustment);
      }

      console.log("Updating stock for item:", selectedItem.id, "New stock:", newStock);
      
      // Prepare the data with all required fields
      const updateData = {
        Product_name: selectedItem.name,
        Product_sku: selectedItem.sku,
        Product_category: selectedItem.category,
        Product_stock: newStock,
        Product_price: selectedItem.price,
        reorder_level: selectedItem.threshold,
        Product_status: selectedItem.productStatus || 'Active'
      };

      // Update in database
      const response = await axios.put(`${API_BASE}/api/products/${selectedItem.id}`, updateData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log("API Response:", response);

      if (response.status === 200) {
        // Update in local state
        const updatedInventory = inventory.map(item => 
          item.id === selectedItem.id ? {
            ...item,
            stock: newStock,
            status: getProductStatus(newStock, Number(item.threshold))
          } : item
        );
        setInventory(updatedInventory);

        setSnackbarMsg(`Successfully ${adjustmentType === 'add' ? 'added' : 'removed'} ${adjustment} item(s)!`);
        setSnackbarOpen(true);
        handleAdjustmentClose();
      
        // Refresh the data
        fetchAndSyncProducts();
      } else {
        throw new Error(`Failed to update stock. Status: ${response.status}`);
      }
    } catch (err) {
      console.error("Error adjusting stock:", err);
      console.error("Error details:", err.response?.data || err.message);
      
      // More specific error messages
      if (err.response) {
        // Server responded with error status
        setSnackbarMsg(`Server error: ${err.response.status} - ${err.response.data?.message || err.response.data || 'Failed to update stock'}`);
      } else if (err.request) {
        // Request was made but no response received
        setSnackbarMsg("Network error: Could not reach the server");
      } else {
        // Something else happened
        setSnackbarMsg(`Error: ${err.message}`);
      }
      
      setSnackbarOpen(true);
    }
  };

  return (
    <SidebarLayout>
      <Box sx={{ minHeight: '100vh', background: '#f7f7f9', py: 3, px: 2 }}>
        {/* Header with enhanced actions */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#2E3A8C', mb: 0.5 }}>
              Inventory
            </Typography>
            <Typography color="text.secondary">

            </Typography>
          </Box>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              placeholder="Search by name or SKU..."
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
                minWidth: 250
              }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenModal(null, null)}
              sx={{ 
                borderRadius: 2, 
                background: '#6c63ff', 
                fontWeight: 600, 
                textTransform: 'none',
                px: 3
              }}
            >
              Add New Item
            </Button>
          </Box>
        </Box>

        {/* Filters and View Options */}
        <Card sx={{ mb: 3, borderRadius: 3, border: '1px solid #e5e7eb' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Filter Inventory
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
                  <ToggleButton value="table" sx={{ borderRadius: 2, border: '1px solid #ccc' }}>
                    <TableRowsIcon />
                  </ToggleButton>
                  <ToggleButton value="grid" sx={{ borderRadius: 2, border: '1px solid #ccc' }}>
                    <GridViewIcon />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>
            
            <Box display="flex" gap={2} flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Category"
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  {uniqueCategories.map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  {uniqueStatuses.map(status => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Button
                startIcon={<RefreshIcon />}
                onClick={() => {
                  setCategoryFilter('All');
                  setStatusFilter('All');
                  setSearch('');
                  setPage(1);
                  setZeroStockOnly(false);
                }}
                variant="outlined"
                size="small"
                sx={{ height: 40 }}
              >
                Reset Filters
              </Button>
            </Box>
            {zeroStockOnly && (
              <Box mt={2}>
                <Chip
                  label="Only showing out-of-stock items"
                  color="error"
                  variant="outlined"
                  onDelete={() => setZeroStockOnly(false)}
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <Grid container spacing={3} mb={3} sx={{ display: 'flex', justifyContent: 'center' }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, border: '1px solid #e5e7eb', height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" variant="body2">Total Items</Typography>
                    <Typography variant="h4" fontWeight={700}>{inventory.length}</Typography>
                  </Box>
                  <Box sx={{ bgcolor: '#2E3A8C10', borderRadius: '100%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <InventoryIcon sx={{ color: '#2E3A8C' }} />
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
                    <Typography color="text.secondary" variant="body2">Warning Items</Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {inventory.filter(item => item.status === 'Warning').length}
                    </Typography>
                  </Box>
                  <Box sx={{ bgcolor: '#FFD16610', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <WarningIcon sx={{ color: '#FFD166' }} />
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
                    <Typography color="text.secondary" variant="body2">Critical Items</Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {inventory.filter(item => item.status === 'Critical').length}
                    </Typography>
                  </Box>
                  <Box sx={{ bgcolor: '#FF4D4F10', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ErrorOutlineIcon sx={{ color: '#FF4D4F' }} />
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
                    <Typography color="text.secondary" variant="body2">Categories</Typography>
                    <Typography variant="h4" fontWeight={700}>{uniqueCategories.length - 1}</Typography>
                  </Box>
                  <Box sx={{ bgcolor: '#6C63FF10', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CategoryIcon sx={{ color: '#6C63FF' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Inventory Display */}
        {fetchError ? (
          <Box sx={{ color: 'red', textAlign: 'center', mt: 8 }}>
            <Typography variant="h5">{fetchError}</Typography>
          </Box>
        ) : (
          <>
            {viewMode === 'table' ? (
              // Table View
              <Card sx={{ borderRadius: 3, border: '1px solid #e5e7eb' }}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f7ff' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Item Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Current Stock</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Threshold</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedInventory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <InventoryIcon sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
                              <Typography variant="h6" color="text.secondary">
                                No products found
                              </Typography>
                              <Typography color="text.secondary" sx={{ mb: 2 }}>
                                Try adjusting your search or filter criteria
                              </Typography>
                              <Button 
                                variant="outlined" 
                                startIcon={<AddIcon />}
                                onClick={() => handleOpenModal(null, null)}
                              >
                                Add New Item
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedInventory.map((item, idx) => (
                          <TableRow 
                            key={item.id} 
                            sx={{ 
                              '&:hover': { bgcolor: '#f9f9ff', cursor: 'pointer' },
                              '&:last-child td, &:last-child th': { border: 0 }
                            }}
                            onClick={() => handleAdjustmentOpen(item, 'view')}
                          >
                            <TableCell>
                              <Box display="flex" alignItems="center">
                                <Box 
                                  sx={{ 
                                    width: 40, 
                                    height: 40, 
                                    borderRadius: '50%', 
                                    bgcolor: '#f0f2f5', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    mr: 2
                                  }}
                                >
                                  <InventoryIcon sx={{ color: '#2E3A8C' }} />
                                </Box>
                                <Box>
                                  <Typography fontWeight={500}>{item.name}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {item.category}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={item.sku} 
                                size="small" 
                                sx={{ 
                                  bgcolor: '#6c63ff10', 
                                  color: '#6c63ff',
                                  fontWeight: 500
                                }} 
                              />
                            </TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>
                              <Typography fontWeight={500}>{item.stock}</Typography>
                            </TableCell>
                            <TableCell>{item.threshold}</TableCell>
                            <TableCell>
                              <Chip
                                label={item.status}
                                size="small"
                                sx={{
                                  backgroundColor: statusColors[item.status] 
                                    ? `${statusColors[item.status]}20` 
                                    : '#ccc20',
                                  color: statusColors[item.status] || '#ccc',
                                  fontWeight: 600,
                                  minWidth: 100
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5}>
                                <IconButton 
                                  color="info" 
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/prediction/${item.sku}`);
                                  }}
                                  title="View AI Prediction Details"
                                  sx={{ 
                                    bgcolor: '#6c63ff10',
                                    '&:hover': { bgcolor: '#6c63ff20' }
                                  }}
                                >
                                  <AIAwesomeIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                                {/* <IconButton 
                                  color="success" 
                                  size="small"
                                  title="Add Stock"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAdjustmentOpen(item, 'add');
                                  }}
                                  sx={{ 
                                    bgcolor: '#06D6A010',
                                    '&:hover': { bgcolor: '#06D6A020' }
                                  }}
                                >
                                  <AddIcon sx={{ fontSize: 18 }} />
                                </IconButton> */}
                                {/* <IconButton 
                                  color="warning" 
                                  size="small"
                                  title="Remove Stock"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAdjustmentOpen(item, 'remove');
                                  }}
                                  sx={{ 
                                    bgcolor: '#FF6B6B10',
                                    '&:hover': { bgcolor: '#FF6B6B20' }
                                  }}
                                >
                                  <RemoveIcon sx={{ fontSize: 18 }} />
                                </IconButton> */}
                                <IconButton 
                                  color="primary" 
                                  size="small"
                                  title="Edit Item Details"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenModal(item, (page - 1) * itemsPerPage + idx);
                                  }}
                                  sx={{ 
                                    bgcolor: '#2E3A8C10',
                                    '&:hover': { bgcolor: '#2E3A8C20' }
                                  }}
                                >
                                  <EditIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                                <IconButton 
                                  color="secondary" 
                                  size="small"
                                  title="View Analytics"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/analysis?sku=${item.sku || item.Product_sku}`);
                                  }}
                                  sx={{ 
                                    bgcolor: '#FFD16610',
                                    '&:hover': { bgcolor: '#FFD16620' }
                                  }}
                                >
                                  <InsightsIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                                <IconButton 
                                  color="error" 
                                  size="small"
                                  title="Delete Item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete((page - 1) * itemsPerPage + idx);
                                  }}
                                  sx={{ 
                                    bgcolor: '#FF6B6B10',
                                    '&:hover': { bgcolor: '#FF6B6B20' }
                                  }}
                                >
                                  <DeleteIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            ) : (
              // Grid View
              <Box>
                {paginatedInventory.length === 0 ? (
                  <Card sx={{ borderRadius: 3, border: '1px solid #e5e7eb', py: 8 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <InventoryIcon sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary">
                        No products found
                      </Typography>
                      <Typography color="text.secondary" sx={{ mb: 2 }}>
                        Try adjusting your search or filter criteria
                      </Typography>
                      <Button 
                        variant="outlined" 
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenModal(null, null)}
                      >
                        Add New Item
                      </Button>
                    </Box>
                  </Card>
                ) : (
                  <Grid container spacing={3}>
                    {paginatedInventory.map((item, idx) => (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                        <Card 
                          sx={{ 
                            borderRadius: 3, 
                            border: '1px solid #e5e7eb',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: '0.3s',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                              cursor: 'pointer'
                            }
                          }}
                          onClick={() => handleAdjustmentOpen(item, 'view')}
                        >
                          <CardContent sx={{ flexGrow: 1 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                              <Box 
                                sx={{ 
                                  width: 50, 
                                  height: 50, 
                                  borderRadius: '50%', 
                                  bgcolor: '#f0f2f5', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center'
                                }}
                              >
                                <InventoryIcon sx={{ color: '#2E3A8C' }} />
                              </Box>
                              <Chip
                                label={item.status}
                                size="small"
                                sx={{
                                  backgroundColor: statusColors[item.status] 
                                    ? `${statusColors[item.status]}20` 
                                    : '#ccc20',
                                  color: statusColors[item.status] || '#ccc',
                                  fontWeight: 600
                                }}
                              />
                            </Box>
                            
                            <Typography variant="h6" fontWeight={600} mb={0.5}>
                              {item.name}
                            </Typography>
                            
                            <Box display="flex" alignItems="center" mb={2}>
                              <Chip 
                                label={item.sku} 
                                size="small" 
                                sx={{ 
                                  bgcolor: '#6c63ff10', 
                                  color: '#6c63ff',
                                  fontWeight: 500,
                                  mr: 1
                                }} 
                              />
                              <Typography variant="body2" color="text.secondary">
                                {item.category}
                              </Typography>
                            </Box>
                            
                            <Box display="flex" justifyContent="space-between" mb={2}>
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  Current Stock
                                </Typography>
                                <Typography fontWeight={600}>
                                  {item.stock} units
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  Threshold
                                </Typography>
                                <Typography fontWeight={600}>
                                  {item.threshold}
                                </Typography>
                              </Box>
                            </Box>
                            
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.min(100, Math.max(0, (item.threshold ? (item.stock / item.threshold) * 100 : 0)))}
                              sx={{ 
                                height: 8, 
                                borderRadius: 4, 
                                bgcolor: '#f1f3f9',
                                '& .MuiLinearProgress-bar': { 
                                  bgcolor: statusColors[item.status] || '#2E3A8C' 
                                },
                                mb: 2
                              }} 
                            />
                          </CardContent>
                          
                          <Box sx={{ p: 2, pt: 0 }}>
                            <Stack direction="row" spacing={1}>
                              <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAdjustmentOpen(item, 'add');
                                }}
                                sx={{ 
                                  flexGrow: 1,
                                  textTransform: 'none',
                                  bgcolor: '#06D6A010',
                                  '&:hover': { bgcolor: '#06D6A020' }
                                }}
                              >
                                Add
                              </Button>
                              <Button
                                size="small"
                                startIcon={<RemoveIcon />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAdjustmentOpen(item, 'remove');
                                }}
                                sx={{ 
                                  flexGrow: 1,
                                  textTransform: 'none',
                                  bgcolor: '#FF6B6B10',
                                  '&:hover': { bgcolor: '#FF6B6B20' }
                                }}
                              >
                                Remove
                              </Button>
                            </Stack>
                          </Box>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={3}>
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
          </>
        )}

        {/* Adjustment Modal */}
        <Dialog open={adjustModalOpen} onClose={handleAdjustmentClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            {adjustmentType === 'add' 
              ? `Add Stock for ${selectedItem?.name}` 
              : adjustmentType === 'remove' 
                ? `Remove Stock for ${selectedItem?.name}` 
                : `Product Details: ${selectedItem?.name}`}
            <IconButton onClick={handleAdjustmentClose} sx={{ position: 'absolute', right: 16, top: 16 }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {adjustmentType === 'view' ? (
              // View Details
              <Box sx={{ mt: 2 }}>
                <Box display="flex" alignItems="center" mb={3}>
                  <Box 
                    sx={{ 
                      width: 60, 
                      height: 60, 
                      borderRadius: '50%', 
                      bgcolor: '#f0f2f5', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      mr: 2
                    }}
                  >
                    <InventoryIcon sx={{ color: '#2E3A8C', fontSize: 30 }} />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight={600}>{selectedItem?.name}</Typography>
                    <Chip 
                      label={selectedItem?.sku} 
                      sx={{ 
                        bgcolor: '#6c63ff10', 
                        color: '#6c63ff',
                        fontWeight: 500,
                        mt: 0.5
                      }} 
                    />
                  </Box>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography color="text.secondary" variant="body2">Category</Typography>
                    <Typography fontWeight={500}>{selectedItem?.category}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography color="text.secondary" variant="body2">Current Stock</Typography>
                    <Typography fontWeight={500}>{selectedItem?.stock} units</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography color="text.secondary" variant="body2">Threshold</Typography>
                    <Typography fontWeight={500}>{selectedItem?.threshold}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography color="text.secondary" variant="body2">Status</Typography>
                    <Chip
                      label={selectedItem?.status}
                      size="small"
                      sx={{
                        backgroundColor: statusColors[selectedItem?.status] 
                          ? `${statusColors[selectedItem?.status]}20` 
                          : '#ccc20',
                        color: statusColors[selectedItem?.status] || '#ccc',
                        fontWeight: 600
                      }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography color="text.secondary" variant="body2">Price</Typography>
                    <Typography fontWeight={500}>₱{selectedItem?.price}</Typography>
                  </Grid>
                </Grid>
                
                <Box mt={3}>
                  <Typography variant="h6" fontWeight={600} mb={2}>Actions</Typography>
                  <Stack direction="row" spacing={2}>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => {
                        handleAdjustmentClose();
                        handleAdjustmentOpen(selectedItem, 'add');
                      }}
                      sx={{ 
                        flexGrow: 1,
                        bgcolor: '#06D6A0',
                        '&:hover': { bgcolor: '#05c591' }
                      }}
                      variant="contained"
                    >
                      Add Stock
                    </Button>
                    <Button
                      startIcon={<RemoveIcon />}
                      onClick={() => {
                        handleAdjustmentClose();
                        handleAdjustmentOpen(selectedItem, 'remove');
                      }}
                      sx={{ 
                        flexGrow: 1,
                        bgcolor: '#FF6B6B',
                        '&:hover': { bgcolor: '#ff5a5a' }
                      }}
                      variant="contained"
                    >
                      Remove Stock
                    </Button>
                    <Button
                      startIcon={<EditIcon />}
                      onClick={() => {
                        handleAdjustmentClose();
                        handleOpenModal(selectedItem, inventory.findIndex(item => item.id === selectedItem.id));
                      }}
                      sx={{ 
                        flexGrow: 1,
                        bgcolor: '#2E3A8C',
                        '&:hover': { bgcolor: '#1a246e' }
                      }}
                      variant="contained"
                    >
                      Edit Item
                    </Button>
                  </Stack>
                </Box>
              </Box>
            ) : (
              // Add/Remove Stock Form
              <Box component="form" onSubmit={(e) => { e.preventDefault(); handleAdjustmentSubmit(); }}>
                <Stack spacing={3} mt={1}>
                  <Box>
                    <Typography color="text.secondary" variant="body2">Current Stock</Typography>
                    <Typography variant="h4" fontWeight={700}>{selectedItem?.stock} units</Typography>
                  </Box>
                  
                  <TextField
                    label={`${adjustmentType === 'add' ? 'Add' : 'Remove'} Quantity`}
                    type="number"
                    value={adjustmentQuantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      if (!isNaN(value) && value >= 0) {
                        setAdjustmentQuantity(value);
                      } else if (e.target.value === '') {
                        setAdjustmentQuantity('');
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '' || parseInt(e.target.value, 10) < 1) {
                        setAdjustmentQuantity(1);
                      }
                    }}
                    inputProps={{ min: 1, step: 1 }}
                    fullWidth
                    variant="outlined"
                  />
                  
                  <Box>
                    <Typography color="text.secondary" variant="body2">New Stock Level</Typography>
                    <Typography variant="h4" fontWeight={700} color={adjustmentType === 'add' ? '#06D6A0' : '#FF6B6B'}>
                      {selectedItem ? 
                        (adjustmentType === 'add' 
                          ? Number(selectedItem.stock) + Number(adjustmentQuantity) 
                          : Math.max(0, Number(selectedItem.stock) - Number(adjustmentQuantity))) 
                        : 0} units
                    </Typography>
                  </Box>
                </Stack>
                
                <DialogActions sx={{ mt: 3 }}>
                  <Button onClick={handleAdjustmentClose}>Cancel</Button>
                  <Button 
                    type="submit" 
                    variant="contained"
                    sx={{ 
                      bgcolor: adjustmentType === 'add' ? '#06D6A0' : '#FF6B6B',
                      '&:hover': { 
                        bgcolor: adjustmentType === 'add' ? '#05c591' : '#ff5a5a' 
                      }
                    }}
                  >
                    {adjustmentType === 'add' ? 'Add Stock' : 'Remove Stock'}
                  </Button>
                </DialogActions>
              </Box>
            )}
          </DialogContent>
        </Dialog>

        {/* Add/Edit Modal */}
        <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editIndex !== null ? 'Edit Inventory Item' : 'Add Inventory Item'}
            <IconButton onClick={handleCloseModal} sx={{ position: 'absolute', right: 16, top: 16 }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Box component="form" onSubmit={handleFormSubmit}>
              <Stack spacing={2} mt={1}>
                <TextField 
                  label="Item Name" 
                  name="name" 
                  value={form.name} 
                  onChange={handleFormChange} 
                  required 
                  fullWidth 
                  variant="outlined"
                />
                <TextField 
                  label="SKU" 
                  name="sku" 
                  value={form.sku} 
                  onChange={handleFormChange} 
                  required 
                  fullWidth 
                  variant="outlined"
                />
                <TextField 
                  label="Price" 
                  name="price" 
                  type="number" 
                  value={form.price} 
                  onChange={handleFormChange} 
                  required 
                  inputProps={{ min: 0, step: 0.01 }} 
                  fullWidth 
                  variant="outlined"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                  }}
                />
                <FormControl fullWidth required variant="outlined">
                  <InputLabel>Category</InputLabel>
                  <Select 
                    name="category" 
                    value={form.category} 
                    onChange={handleFormChange}
                    label="Category"
                  >
                    <MenuItem value=""><em>Select Category</em></MenuItem>
                    {categories.map(cat => (
                      <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField 
                  label="Current Stock" 
                  name="stock" 
                  type="number" 
                  value={form.stock} 
                  onChange={handleFormChange} 
                  required 
                  inputProps={{ min: 0 }} 
                  fullWidth 
                  variant="outlined"
                />
                <TextField 
                  label="Threshold" 
                  name="threshold" 
                  type="number" 
                  value={form.threshold} 
                  onChange={handleFormChange} 
                  required 
                  inputProps={{ min: 0 }} 
                  fullWidth 
                  variant="outlined"
                />
              </Stack>
              <DialogActions sx={{ mt: 2 }}>
                <Button onClick={handleCloseModal}>Cancel</Button>
                <Button type="submit" variant="contained" sx={{ bgcolor: '#6c63ff' }}>
                  {editIndex !== null ? 'Update Item' : 'Add Item'}
                </Button>
              </DialogActions>
            </Box>
          </DialogContent>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={2200}
          onClose={() => setSnackbarOpen(false)}
          message={snackbarMsg}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        />
      </Box>
    </SidebarLayout>
  );
}
