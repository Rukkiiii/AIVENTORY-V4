import React, { useState, useEffect } from 'react';
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
  Snackbar,
  Stack,
  Card,
  CardContent,
  Grid,
  Chip,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Pagination,
  Rating,
  LinearProgress,
  Tabs,
  Tab,
  AppBar,
  Toolbar,
  Divider,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  TableRows as TableRowsIcon,
  GridView as GridViewIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  AccessTime as AccessTimeIcon,
  Star as StarIcon,
  Refresh as RefreshIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import SidebarLayout from '../components/SidebarLayout';
import axios from "axios";

export default function Suppliers() {
  const [apiError, setApiError] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');
  const itemsPerPage = 6;

  const [form, setForm] = useState({
    supplier_name: "",
    supplier_contactnum: "",
    supplier_email: "",
    supplier_address: "",
    supplier_category: "",
    lead_time: 0,
    supplier_rating: 0
  });
  const [snackbar, setSnackbar] = useState({ open: false, msg: "" });

  // Fetch suppliers
  const fetchSuppliers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/suppliers`);
      const data = Array.isArray(res.data) ? res.data : [];
      setSuppliers(data);
      setApiError(null);
    } catch (err) {
      setApiError("Error fetching suppliers. Please check backend.");
      console.error("Error fetching suppliers", err);
      setSuppliers([]);
    }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  // Filter suppliers based on search, category, and rating
  const filteredSuppliers = suppliers.filter((supplier) => {
    if (!supplier) return false;

    const name = (supplier.supplier_name || '').toString().toLowerCase();
    const email = (supplier.supplier_email || '').toString().toLowerCase();
    const category = (supplier.supplier_category || '').toString().toLowerCase();
    const query = search.toLowerCase();

    const matchesSearch =
      !query || name.includes(query) || email.includes(query) || category.includes(query);
    
    const matchesCategory = categoryFilter === 'All' || supplier.supplier_category === categoryFilter;
    
    const matchesRating = ratingFilter === 'All' || 
      (ratingFilter === '5' && supplier.supplier_rating == 5) ||
      (ratingFilter === '4' && supplier.supplier_rating >= 4 && supplier.supplier_rating < 5) ||
      (ratingFilter === '3' && supplier.supplier_rating >= 3 && supplier.supplier_rating < 4) ||
      (ratingFilter === '2' && supplier.supplier_rating >= 2 && supplier.supplier_rating < 3) ||
      (ratingFilter === '1' && supplier.supplier_rating >= 1 && supplier.supplier_rating < 2);
    
    return matchesSearch && matchesCategory && matchesRating;
  });

  // Pagination
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const paginatedSuppliers = filteredSuppliers.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Get unique categories for filter
  const uniqueCategories = [
    'All',
    ...new Set(
      suppliers
        .map((supplier) => (supplier?.supplier_category || '').toString())
        .filter((val) => val && val.trim().length > 0),
    ),
  ];

  const handleOpen = (supplier) => {
    if (supplier) {
      setEditSupplier(supplier.supplier_id);
      setForm(supplier);
    } else {
      setEditSupplier(null);
      setForm({
        supplier_name: "",
        supplier_contactnum: "",
        supplier_email: "",
        supplier_address: "",
        supplier_category: "",
        lead_time: 0,
        supplier_rating: 0
      });
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleRatingChange = (e, value) => setForm((prev) => ({ ...prev, supplier_rating: value }));

  const handleSubmit = async () => {
    try {
      if (editSupplier) {
        await axios.put(`${API_BASE}/api/suppliers/${editSupplier}`, form);
        setSnackbar({ open: true, msg: "Supplier updated!" });
      } else {
        await axios.post(`${API_BASE}/api/suppliers`, form);
        setSnackbar({ open: true, msg: "Supplier added!" });
      }
      fetchSuppliers();
      handleClose();
    } catch (err) {
      console.error("Error saving supplier", err);
      setSnackbar({ open: true, msg: "Error saving supplier" });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this supplier?")) {
      try {
        await axios.delete(`${API_BASE}/api/suppliers/${id}`);
        fetchSuppliers();
        setSnackbar({ open: true, msg: "Supplier deleted!" });
      } catch (err) {
        console.error("Error deleting supplier", err);
        setSnackbar({ open: true, msg: "Error deleting supplier" });
      }
    }
  };

  return (
    <SidebarLayout >
      <Box sx={{ minHeight: '100vh', background: '#f7f7f9', py: 3, px: 2 }}>
        {/* Header with enhanced actions */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#2E3A8C', mb: 0.5 }}>
              Supplier
            </Typography>
            <Typography color="text.secondary">
          
            </Typography>
          </Box>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              placeholder="Search suppliers..."
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
              onClick={() => handleOpen()}
              sx={{ 
                borderRadius: 2, 
                background: '#6c63ff', 
                fontWeight: 600, 
                textTransform: 'none',
                px: 3
              }}
            >
              Add New Supplier
            </Button>
          </Box>
        </Box>

        {/* Filters and View Options */}
        <Card sx={{ mb: 3, borderRadius: 3, border: '1px solid #e5e7eb' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Filter Suppliers
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
              <TextField
                select
                label="Category"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                size="small"
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="All">All Categories</MenuItem>
                {uniqueCategories.filter(cat => cat !== 'All').map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </TextField>
              
              <TextField
                select
                label="Rating"
                value={ratingFilter}
                onChange={(e) => {
                  setRatingFilter(e.target.value);
                  setPage(1);
                }}
                size="small"
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="All">All Ratings</MenuItem>
                <MenuItem value="5">5 Stars</MenuItem>
                <MenuItem value="4">4 Stars & Up</MenuItem>
                <MenuItem value="3">3 Stars & Up</MenuItem>
                <MenuItem value="2">2 Stars & Up</MenuItem>
                <MenuItem value="1">1 Star & Up</MenuItem>
              </TextField>
              
              <Button
                startIcon={<RefreshIcon />}
                onClick={() => {
                  setCategoryFilter('All');
                  setRatingFilter('All');
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
        <Grid container spacing={3} mb={3} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, border: '1px solid #e5e7eb', height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" variant="body2">Total Suppliers</Typography>
                    <Typography variant="h4" fontWeight={700}>{suppliers.length}</Typography>
                  </Box>
                  <Box sx={{ bgcolor: '#2E3A8C10', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BusinessIcon sx={{ color: '#2E3A8C' }} />
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
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, border: '1px solid #e5e7eb', height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" variant="body2">Avg. Rating</Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {suppliers.length > 0 
                        ? (suppliers.reduce((sum, s) => sum + (Number(s.supplier_rating) || 0), 0) / suppliers.length).toFixed(1)
                        : '0.0'}
                    </Typography>
                  </Box>
                  <Box sx={{ bgcolor: '#FFD16610', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <StarIcon sx={{ color: '#FFD166' }} />
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
                    <Typography color="text.secondary" variant="body2">Top Rated</Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {suppliers.filter(s => Number(s.supplier_rating) >= 4).length}
                    </Typography>
                  </Box>
                  <Box sx={{ bgcolor: '#06D6A010', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <StarIcon sx={{ color: '#06D6A0' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Error message */}
        {apiError && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {apiError}
          </Alert>
        )}

        {/* Suppliers Display */}
        {viewMode === 'table' ? (
          // Table View
          <Card sx={{ borderRadius: 3, border: '1px solid #e5e7eb' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f7ff' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Supplier</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Contact</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Lead Time</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Rating</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedSuppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <BusinessIcon sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
                          <Typography variant="h6" color="text.secondary">
                            No suppliers found
                          </Typography>
                          <Typography color="text.secondary" sx={{ mb: 2 }}>
                            Try adjusting your search or filter criteria
                          </Typography>
                          <Button 
                            variant="outlined" 
                            startIcon={<AddIcon />}
                            onClick={() => handleOpen()}
                          >
                            Add New Supplier
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSuppliers.map((supplier) => (
                      <TableRow 
                        key={supplier.supplier_id} 
                        sx={{ 
                          '&:hover': { bgcolor: '#f9f9ff' },
                          '&:last-child td, &:last-child th': { border: 0 }
                        }}
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
                              <BusinessIcon sx={{ color: '#2E3A8C' }} />
                            </Box>
                            <Box>
                              <Typography fontWeight={500}>{supplier.supplier_name}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {supplier.supplier_address}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" flexDirection="column" gap={0.5}>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <EmailIcon sx={{ fontSize: 16, color: '#6c63ff' }} />
                              <Typography variant="body2">{supplier.supplier_email}</Typography>
                            </Box>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <PhoneIcon sx={{ fontSize: 16, color: '#6c63ff' }} />
                              <Typography variant="body2">{supplier.supplier_contactnum}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={supplier.supplier_category || 'N/A'} 
                            size="small" 
                            sx={{ 
                              bgcolor: '#6c63ff10', 
                              color: '#6c63ff',
                              fontWeight: 500
                            }} 
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <AccessTimeIcon sx={{ fontSize: 16, color: '#FF6B6B' }} />
                            <Typography>{supplier.lead_time} days</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Rating value={Number(supplier.supplier_rating) || 0} readOnly size="small" />
                            <Typography variant="body2">
                              {Number(supplier.supplier_rating) || 0}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <IconButton 
                              color="primary" 
                              size="small"
                              onClick={() => handleOpen(supplier)}
                              sx={{ 
                                bgcolor: '#2E3A8C10',
                                '&:hover': { bgcolor: '#2E3A8C20' }
                              }}
                            >
                              <EditIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                            <IconButton 
                              color="error" 
                              size="small"
                              onClick={() => handleDelete(supplier.supplier_id)}
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
            {paginatedSuppliers.length === 0 ? (
              <Card sx={{ borderRadius: 3, border: '1px solid #e5e7eb', py: 8 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <BusinessIcon sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No suppliers found
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    Try adjusting your search or filter criteria
                  </Typography>
                  <Button 
                    variant="outlined" 
                    startIcon={<AddIcon />}
                    onClick={() => handleOpen()}
                  >
                    Add New Supplier
                  </Button>
                </Box>
              </Card>
            ) : (
              <Grid container spacing={3}>
                {paginatedSuppliers.map((supplier) => (
                  <Grid item xs={12} sm={6} md={4} key={supplier.supplier_id}>
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
                          boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                        }
                      }}
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
                            <BusinessIcon sx={{ color: '#2E3A8C' }} />
                          </Box>
                          <Chip 
                            label={supplier.supplier_category || 'N/A'} 
                            size="small" 
                            sx={{ 
                              bgcolor: '#6c63ff10', 
                              color: '#6c63ff',
                              fontWeight: 500
                            }} 
                          />
                        </Box>
                        
                        <Typography variant="h6" fontWeight={600} mb={1}>
                          {supplier.supplier_name}
                        </Typography>
                        
                        <Box display="flex" alignItems="center" mb={1}>
                          <LocationIcon sx={{ fontSize: 16, color: '#6c63ff', mr: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            {supplier.supplier_address || 'No address provided'}
                          </Typography>
                        </Box>
                        
                        <Box display="flex" gap={1} mb={2}>
                          <Box display="flex" alignItems="center" sx={{ flex: 1 }}>
                            <EmailIcon sx={{ fontSize: 16, color: '#6c63ff', mr: 1 }} />
                            <Typography variant="body2">
                              {supplier.supplier_email || 'N/A'}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" sx={{ flex: 1 }}>
                            <PhoneIcon sx={{ fontSize: 16, color: '#6c63ff', mr: 1 }} />
                            <Typography variant="body2">
                              {supplier.supplier_contactnum || 'N/A'}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Lead Time
                            </Typography>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <AccessTimeIcon sx={{ fontSize: 16, color: '#FF6B6B' }} />
                              <Typography fontWeight={600}>
                                {supplier.lead_time} days
                              </Typography>
                            </Box>
                          </Box>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Rating
                            </Typography>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <StarIcon sx={{ fontSize: 16, color: '#FFD166' }} />
                              <Typography fontWeight={600}>
                                {Number(supplier.supplier_rating) || 0}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        
                        <LinearProgress 
                          variant="determinate" 
                          value={(Number(supplier.supplier_rating) || 0) * 20}
                          sx={{ 
                            height: 8, 
                            borderRadius: 4, 
                            bgcolor: '#f1f3f9',
                            '& .MuiLinearProgress-bar': { 
                              bgcolor: Number(supplier.supplier_rating) >= 4 
                                ? '#06D6A0' 
                                : Number(supplier.supplier_rating) >= 3 
                                  ? '#FFD166' 
                                  : '#FF6B6B'
                            },
                            mb: 2
                          }} 
                        />
                      </CardContent>
                      
                      <Box sx={{ p: 2, pt: 0 }}>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => handleOpen(supplier)}
                            sx={{ 
                              flexGrow: 1,
                              textTransform: 'none',
                              bgcolor: '#2E3A8C10',
                              '&:hover': { bgcolor: '#2E3A8C20' }
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleDelete(supplier.supplier_id)}
                            sx={{ 
                              flexGrow: 1,
                              textTransform: 'none',
                              bgcolor: '#FF6B6B10',
                              '&:hover': { bgcolor: '#FF6B6B20' }
                            }}
                          >
                            Delete
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

        {/* Add/Edit Dialog */}
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editSupplier ? 'Edit Supplier' : 'Add New Supplier'}
            <IconButton onClick={handleClose} sx={{ position: 'absolute', right: 16, top: 16 }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              <Stack spacing={2} mt={1}>
                <TextField 
                  label="Supplier Name" 
                  name="supplier_name" 
                  value={form.supplier_name} 
                  onChange={handleChange} 
                  required 
                  fullWidth 
                  variant="outlined"
                />
                <TextField 
                  label="Contact Number" 
                  name="supplier_contactnum" 
                  value={form.supplier_contactnum} 
                  onChange={handleChange} 
                  fullWidth 
                  variant="outlined"
                />
                <TextField 
                  label="Email" 
                  name="supplier_email" 
                  value={form.supplier_email} 
                  onChange={handleChange} 
                  type="email"
                  fullWidth 
                  variant="outlined"
                />
                <TextField 
                  label="Address" 
                  name="supplier_address" 
                  value={form.supplier_address} 
                  onChange={handleChange} 
                  fullWidth 
                  variant="outlined"
                  multiline
                  rows={2}
                />
                <TextField 
                  label="Category" 
                  name="supplier_category" 
                  value={form.supplier_category} 
                  onChange={handleChange} 
                  fullWidth 
                  variant="outlined"
                />
                <TextField 
                  label="Lead Time (days)" 
                  name="lead_time" 
                  type="number" 
                  value={form.lead_time} 
                  onChange={handleChange} 
                  inputProps={{ min: 0 }} 
                  fullWidth 
                  variant="outlined"
                />
                <Box>
                  <Typography gutterBottom>Rating</Typography>
                  <Rating 
                    name="supplier_rating" 
                    value={form.supplier_rating} 
                    onChange={handleRatingChange} 
                    size="large"
                  />
                </Box>
              </Stack>
              <DialogActions sx={{ mt: 2 }}>
                <Button onClick={handleClose}>Cancel</Button>
                <Button type="submit" variant="contained" sx={{ bgcolor: '#6c63ff' }}>
                  {editSupplier ? 'Update Supplier' : 'Add Supplier'}
                </Button>
              </DialogActions>
            </Box>
          </DialogContent>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={2000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          message={snackbar.msg}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        />
      </Box>
    </SidebarLayout>
  );
}