import React, { useEffect, useState, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ClickAwayListener,
  Popper,
  MenuList,
  MenuItem as MuiMenuItem
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Inventory as InventoryIcon,
  Receipt as ReceiptIcon,
  Close as CloseIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { Select, MenuItem, FormControl, InputLabel, Autocomplete, TextField } from '@mui/material';

import SidebarLayout from '../components/SidebarLayout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { API_BASE } from '../config/api';

const ML_SERVICE_BASE = import.meta.env.VITE_ML_SERVICE_BASE || 'http://localhost:5202'; // LSTM Forecasting Service

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
  });

const formatStockValue = (value) => {
  const amount = Number(value || 0);
  return `${amount.toLocaleString('en-PH')} stock${amount === 1 ? '' : 's'}`;
};

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

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [mlStatus, setMlStatus] = useState({ connected: false, checked: false, trainedModels: 0 });
  const [mlPredictions, setMlPredictions] = useState([]);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [salesFilter, setSalesFilter] = useState('2025'); // '2023', '2024', or '2025'
  const [selectedDate, setSelectedDate] = useState(''); // Selected date from calendar
  const [selectedProduct, setSelectedProduct] = useState('all'); // 'all' or specific product ID
  const [productSearch, setProductSearch] = useState(''); // Search term for products
  const [searchAnchorEl, setSearchAnchorEl] = useState(null); // Anchor for search dropdown
  const searchOpen = Boolean(searchAnchorEl);

  const checkMlService = async () => {
    try {
      // Check LSTM service health via backend (more reliable)
      const healthResponse = await fetch(`${API_BASE}/api/ml/health`, { 
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        const isConnected = healthData.status === 'healthy' || healthData.status === 'available';
        setMlStatus({ 
          connected: isConnected, 
          checked: true,
          trainedModels: healthData.trained_models || 0
        });
      
      if (isConnected) {
        fetchMlPredictions();
        }
      } else {
        setMlStatus({ connected: false, checked: true });
      }
    } catch (err) {
      // Fallback: try direct LSTM service connection
      try {
        const healthResponse = await fetch(`${ML_SERVICE_BASE}/api/health`, { 
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          setMlStatus({ 
            connected: true, 
            checked: true,
            trainedModels: healthData.trained_models || 0
          });
          fetchMlPredictions();
        } else {
          setMlStatus({ connected: false, checked: true });
        }
      } catch (pingErr) {
        console.log('LSTM Service not accessible:', pingErr);
        setMlStatus({ connected: false, checked: true });
      }
    }
  };

  const fetchMlPredictions = async () => {
    if (!mlStatus.connected || products.length === 0) return;
    
    setPredictionsLoading(true);
    try {
      // Get forecasts for multiple products from LSTM service via backend
      const forecastsResponse = await fetch(`${API_BASE}/api/predictions/products/${products[0]?.Product_id || products[0]?.Product_sku}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
      });
      
      if (forecastsResponse.ok) {
        const predictionData = await forecastsResponse.json();
        
        if (predictionData.success && predictionData.forecast) {
          // Use LSTM forecast data
          const forecast = predictionData.forecast;
          const forecastDemand = forecast.forecast_demand || [];
          
        // Format prediction data for display (next 6 months)
        const currentDate = new Date();
        const formattedPredictions = [];
        
          // Aggregate daily forecasts into monthly predictions
          let monthlyTotals = {};
          forecastDemand.forEach((dailyDemand, index) => {
            const futureDate = new Date(currentDate);
            futureDate.setDate(currentDate.getDate() + index);
            const monthKey = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
            monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + dailyDemand;
          });
          
          // Create 6 months of predictions
        for (let i = 1; i <= 6; i++) {
          const futureDate = new Date(currentDate);
          futureDate.setMonth(currentDate.getMonth() + i);
          const monthKey = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
          
          formattedPredictions.push({
            date: futureDate.toISOString(),
              value: Math.round(monthlyTotals[monthKey] || 100 * (1 + Math.random() * 0.2)),
              type: 'prediction',
              confidence: forecast.confidence_score || 85
          });
        }
        
        setMlPredictions(formattedPredictions);
      } else {
          // Fallback to sample predictions
          generateSamplePredictions();
        }
      } else {
        generateSamplePredictions();
      }
    } catch (err) {
      console.error('Failed to fetch LSTM predictions:', err);
      generateSamplePredictions();
    } finally {
      setPredictionsLoading(false);
    }
  };
  
  const generateSamplePredictions = () => {
      const currentDate = new Date();
      const samplePredictions = [];
      
      for (let i = 1; i <= 6; i++) {
        const futureDate = new Date(currentDate);
        futureDate.setMonth(currentDate.getMonth() + i);
        
        samplePredictions.push({
          date: futureDate.toISOString(),
        value: Math.max(100, 500 * (1 + (Math.random() * 0.3))),
          type: 'prediction'
        });
      }
      
      setMlPredictions(samplePredictions);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsRes, invoicesRes] = await Promise.all([
        fetch(`${API_BASE}/api/products`),
        fetch(`${API_BASE}/api/invoices`),
      ]);

      if (!productsRes.ok) {
        throw new Error('Unable to load products');
      }
      if (!invoicesRes.ok) {
        throw new Error('Unable to load invoices');
      }

      const productData = await productsRes.json();
      const invoiceData = await invoicesRes.json();

      setProducts(Array.isArray(productData) ? productData : []);
      setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('❌ Reports fetch error:', err);
      setError(err?.message || 'Failed to load analytics data');
      setProducts([]);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    checkMlService();
  }, []);
  
  // Re-check ML service when products are loaded
  useEffect(() => {
    if (products.length > 0 && mlStatus.checked && mlStatus.connected) {
      fetchMlPredictions();
    }
  }, [products.length, mlStatus.connected]);

  const metrics = useMemo(() => {
    // Filter products if a specific product is selected
    let filteredProducts = products;
    if (selectedProduct !== 'all') {
      filteredProducts = products.filter(p => 
        String(p.Product_id) === String(selectedProduct) || 
        String(p.Product_sku) === String(selectedProduct)
      );
    }
    
    const totalProducts = filteredProducts.length;
    const lowStockProducts = filteredProducts.filter((p) =>
      Number(p.Product_stock ?? 0) <= Number(p.reorder_level ?? 0)
    );
    const outOfStockProducts = filteredProducts.filter((p) =>
      Number(p.Product_stock ?? 0) <= 0
    );
    const totalStock = filteredProducts.reduce(
      (sum, p) => sum + Number(p.Product_stock ?? 0),
      0
    );
    
    // Filter invoices if a specific product is selected
    let filteredInvoices = invoices;
    if (selectedProduct !== 'all') {
      filteredInvoices = invoices.filter(invoice => {
        if (!Array.isArray(invoice.items)) return false;
        return invoice.items.some(item => {
          const itemProductId = item.product_id || item.productId || item.Product_id;
          return String(itemProductId) === String(selectedProduct);
        });
      });
    }
    
    const pendingInvoices = filteredInvoices.filter((invoice) => invoice.status === 'Pending');
    const paidInvoices = filteredInvoices.filter((invoice) => invoice.status === 'Paid');
    const totalInvoiceValue = filteredInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.total ?? 0),
      0
    );
    const paidInvoiceValue = paidInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.total ?? 0),
      0
    );
    
    // Calculate total product sales from invoice items (quantity * unit_price)
    const totalProductSales = paidInvoices.reduce((sum, invoice) => {
      if (!Array.isArray(invoice.items)) return sum;
      const invoiceSales = invoice.items.reduce((itemSum, item) => {
        const quantity = Number(item.quantity ?? 0);
        const unitPrice = Number(item.unit_price ?? item.unitPrice ?? 0);
        return itemSum + (quantity * unitPrice);
      }, 0);
      return sum + invoiceSales;
    }, 0);

    // Calculate monthly stock movement (units sold based on paid invoices)
    const monthlyStockMovement = {};
    invoices.forEach(invoice => {
      if (invoice.status === 'Paid' && invoice.invoice_date) {
        const date = new Date(invoice.invoice_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthQuantity = Array.isArray(invoice.items)
          ? invoice.items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0)
          : 0;
        if (monthQuantity > 0) {
          monthlyStockMovement[monthKey] = (monthlyStockMovement[monthKey] || 0) + monthQuantity;
        }
      }
    });

    // Get last 6 months
    const last6Months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      last6Months.push({
        month: date.toLocaleString('default', { month: 'short' }),
        year: date.getFullYear(),
        value: monthlyStockMovement[monthKey] || 0
      });
    }

    const maxMonthlyStockMovement = Math.max(...last6Months.map(m => m.value), 1);
  
    // Build historical chart data (last 6 months only)
    const chartData = last6Months.map(month => ({
      label: month.month,
      value: month.value,
      type: 'historical',
      fill: '#2E3A8C'
    }));
    
    // Add LSTM predictions to chart if available (as separate data points)
    if (mlStatus.connected && mlPredictions.length > 0) {
      mlPredictions.forEach(pred => {
        const date = new Date(pred.date);
        const monthLabel = date.toLocaleString('default', { month: 'short' });
        chartData.push({
          label: monthLabel,
          value: pred.value,
          type: 'prediction',
          confidence: pred.confidence,
          fill: '#06D6A0'
        });
      });
    }
  
    // Find the maximum value for scaling
    const maxValue = Math.max(...chartData.map(d => d.value), 1);

    // Get selected year for filtering
    const selectedYear = parseInt(salesFilter) || new Date().getFullYear();
    
    // Calculate top 5 selling products (filtered by selected year)
    const productSales = {};
    
    paidInvoices.forEach(invoice => {
      if (invoice.invoice_date) {
        // Parse invoice date - handle different formats
        let invoiceDate;
        if (typeof invoice.invoice_date === 'string') {
          // Handle YYYY-MM-DD format from database
          if (invoice.invoice_date.includes('-')) {
            invoiceDate = new Date(invoice.invoice_date);
          } 
          // Handle M/D/YYYY format from CSV
          else if (invoice.invoice_date.includes('/')) {
            const [month, day, year] = invoice.invoice_date.split('/');
            invoiceDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } 
          else {
            invoiceDate = new Date(invoice.invoice_date);
          }
        } else {
          invoiceDate = new Date(invoice.invoice_date);
        }
        
        // Check if date is valid and matches selected year
        if (!isNaN(invoiceDate.getTime())) {
          const invoiceYear = invoiceDate.getFullYear();
          
          // Only include invoices from the selected year
          if (invoiceYear === selectedYear) {
            if (Array.isArray(invoice.items)) {
              invoice.items.forEach(item => {
                const productId = item.product_id || item.productId || item.Product_id;
                const productName = item.product_name || item.Product_name || 'Unknown Product';
                const quantity = Number(item.quantity || item.Quantity || 0);
                
                if (productId && quantity > 0) {
                  if (!productSales[productId]) {
                    productSales[productId] = {
                      id: productId,
                      name: productName,
                      totalQuantity: 0,
                      totalRevenue: 0
                    };
                  }
                  productSales[productId].totalQuantity += quantity;
                  productSales[productId].totalRevenue += quantity * Number(item.price || item.Price || 0);
                }
              });
            }
          }
        }
      }
    });

    // Create a map of all products from database with their names (if not already created)
    const productNameMapForTop5 = new Map();
    products.forEach(product => {
      const productId = String(product.Product_id || product.product_id || product.id);
      const productName = product.Product_name || product.product_name || product.name || product.ProductName || '';
      if (productName) {
        productNameMapForTop5.set(productId, productName);
      }
    });
    
    // Update productSales with actual product names from inventory
    Object.values(productSales).forEach(product => {
      const productId = String(product.id);
      const actualName = productNameMapForTop5.get(productId);
      if (actualName) {
        product.name = actualName;
      }
    });
    
    // Get top 5 by quantity sold
    const top5Products = Object.values(productSales)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 5);

    // Product trends analysis - yearly sales (filtered by selected product)
    let productTrendsData = [];
    
    // Helper function to get quantity for a specific product or all products
    const getItemQuantity = (item) => {
      if (selectedProduct === 'all') {
        return Number(item.quantity || item.Quantity || 0);
      }
      const itemProductId = item.product_id || item.productId || item.Product_id;
      if (String(itemProductId) === String(selectedProduct)) {
        return Number(item.quantity || item.Quantity || 0);
      }
      return 0;
    };
    
    // Yearly sales - monthly breakdown for selected year
    const yearlyProductSales = {};
    
    // Initialize all 12 months (January to December) for the selected year
    for (let month = 1; month <= 12; month++) {
      const monthKey = `${selectedYear}-${String(month).padStart(2, '0')}`;
      yearlyProductSales[monthKey] = 0;
    }

    paidInvoices.forEach(invoice => {
      if (invoice.invoice_date) {
        // Parse invoice date - handle different formats
        let invoiceDate;
        if (typeof invoice.invoice_date === 'string') {
          // Handle YYYY-MM-DD format from database
          if (invoice.invoice_date.includes('-')) {
            invoiceDate = new Date(invoice.invoice_date);
          } 
          // Handle M/D/YYYY format from CSV
          else if (invoice.invoice_date.includes('/')) {
            const [month, day, year] = invoice.invoice_date.split('/');
            invoiceDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } 
          else {
            invoiceDate = new Date(invoice.invoice_date);
          }
        } else {
          invoiceDate = new Date(invoice.invoice_date);
        }
        
        // Check if date is valid
        if (!isNaN(invoiceDate.getTime())) {
          const invoiceYear = invoiceDate.getFullYear();
          const invoiceMonth = invoiceDate.getMonth() + 1; // getMonth() returns 0-11
          
          // Only include invoices from the selected year
          if (invoiceYear === selectedYear) {
            const monthKey = `${invoiceYear}-${String(invoiceMonth).padStart(2, '0')}`;
            if (yearlyProductSales.hasOwnProperty(monthKey)) {
              const totalQty = Array.isArray(invoice.items)
                ? invoice.items.reduce((sum, item) => sum + getItemQuantity(item), 0)
                : 0;
              yearlyProductSales[monthKey] += totalQty;
            }
          }
        }
      }
    });

    // Sort by month (January to December)
    productTrendsData = Object.entries(yearlyProductSales)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, value]) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return {
          date: date.toLocaleDateString('en-US', { month: 'short' }),
          sales: value
        };
      });
    
    // Product sales details - breakdown by product (filtered by selected year)
    const productSalesDetails = {};
    paidInvoices.forEach(invoice => {
      if (invoice.invoice_date) {
        // Parse invoice date - handle different formats (same logic as above)
        let invoiceDate;
        if (typeof invoice.invoice_date === 'string') {
          // Handle YYYY-MM-DD format from database
          if (invoice.invoice_date.includes('-')) {
            invoiceDate = new Date(invoice.invoice_date);
          } 
          // Handle M/D/YYYY format from CSV
          else if (invoice.invoice_date.includes('/')) {
            const [month, day, year] = invoice.invoice_date.split('/');
            invoiceDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } 
          else {
            invoiceDate = new Date(invoice.invoice_date);
          }
        } else {
          invoiceDate = new Date(invoice.invoice_date);
        }
        
        // Check if date is valid and matches selected year
        if (!isNaN(invoiceDate.getTime())) {
          const invoiceYear = invoiceDate.getFullYear();
          
          // Only include invoices from the selected year
          if (invoiceYear === selectedYear) {
            if (Array.isArray(invoice.items)) {
              invoice.items.forEach(item => {
                const productId = item.product_id || item.productId || item.Product_id;
                const productName = item.product_name || item.Product_name || `Product ${productId}`;
                const quantity = Number(item.quantity || item.Quantity || 0);
                const price = Number(item.price || item.Price || 0);
                
                if (productId && quantity > 0) {
                  if (!productSalesDetails[productId]) {
                    productSalesDetails[productId] = {
                      id: productId,
                      name: productName,
                      totalQuantity: 0,
                      totalRevenue: 0,
                      orderCount: 0
                    };
                  }
                  productSalesDetails[productId].totalQuantity += quantity;
                  productSalesDetails[productId].totalRevenue += quantity * price;
                  productSalesDetails[productId].orderCount += 1;
                }
              });
            }
          }
        }
      }
    });
    
    // Create a map of all products from database with their names
    const productNameMap = new Map();
    products.forEach(product => {
      const productId = String(product.Product_id || product.product_id || product.id);
      const productName = product.Product_name || product.product_name || product.name || product.ProductName || '';
      if (productName) {
        productNameMap.set(productId, productName);
      }
    });
    
    // Update productSalesDetails with actual product names from inventory
    Object.values(productSalesDetails).forEach(product => {
      const productId = String(product.id);
      const actualName = productNameMap.get(productId);
      if (actualName) {
        product.name = actualName;
      }
    });
    
    // Filter product details by selected product if not 'all'
    let productDetailsList = Object.values(productSalesDetails)
      .sort((a, b) => b.totalQuantity - a.totalQuantity);
    
    if (selectedProduct !== 'all') {
      productDetailsList = productDetailsList.filter(p => String(p.id) === String(selectedProduct));
    } else {
      productDetailsList = productDetailsList.slice(0, 20); // Top 20 products when showing all
    }
    
    // Get list of all products for the dropdown (include all products, not just those with sales)
    const productsWithSales = Object.values(productSalesDetails);
    const salesProductIds = new Set(productsWithSales.map(p => String(p.id)));
    
    // Add all products from the database, prioritizing those with sales
    const allProductsMap = new Map();
    
    // First, add products with sales (sorted by sales) - use actual product names from database
    productsWithSales
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .forEach(p => {
        const productId = String(p.id);
        const productName = productNameMap.get(productId) || p.name || `Product ${productId}`;
        allProductsMap.set(productId, { id: productId, name: productName });
      });
    
    // Then, add all other products from the database
    products.forEach(product => {
      const productId = String(product.Product_id || product.product_id || product.id);
      if (!allProductsMap.has(productId)) {
        const productName = product.Product_name || product.product_name || product.name || product.ProductName || `Product ${productId}`;
        allProductsMap.set(productId, { id: productId, name: productName });
      }
    });
    
    // Convert to array, maintaining order (products with sales first, then others)
    let availableProducts = Array.from(allProductsMap.values());
    
    // Apply search filter if productSearch is set
    if (productSearch && productSearch.trim()) {
      const searchLower = productSearch.toLowerCase().trim();
      availableProducts = availableProducts.filter(product => 
        product.name?.toLowerCase().includes(searchLower) ||
        String(product.id).includes(searchLower)
      );
    }

  return {
    totalProducts,
    totalStock,
    lowStockCount: lowStockProducts.length,
    outOfStockCount: outOfStockProducts.length,
    lowStockProducts,
    outOfStockProducts,
    pendingCount: pendingInvoices.length,
    totalInvoiceValue,
    paidInvoiceValue,
    totalProductSales,
    invoiceCount: invoices.length,
    paidInvoiceCount: paidInvoices.length,
    monthlyStockMovement: last6Months,
    maxMonthlyStockMovement,
    chartData,
    chartMaxValue: maxValue,
    hasPredictions: mlStatus.connected && mlPredictions.length > 0,
    top5Products,
    productTrendsData,
    productDetailsList,
    availableProducts
  };
}, [products, invoices, mlStatus, mlPredictions, salesFilter, selectedProduct, productSearch]);

  const recentInvoices = useMemo(() => {
    const sorted = [...invoices].sort((a, b) => {
      const dateA = new Date(a.invoice_date || a.invoiceDate || 0).getTime();
      const dateB = new Date(b.invoice_date || b.invoiceDate || 0).getTime();
      return dateB - dateA;
    });
    return sorted.slice(0, 5);
  }, [invoices]);


  const renderContent = () => {
    if (loading) {
      return (
        <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
          <CircularProgress />
          <Typography color="text.secondary">Loading analytics…</Typography>
        </Stack>
      );
    }

    // Safety check for metrics
    if (!metrics) {
    return (
        <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
          <CircularProgress />
          <Typography color="text.secondary">Loading metrics…</Typography>
            </Stack>
      );
    }

    return (
      <Stack spacing={4}>
        {/* Product Selector */}
        <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e5e7eb' }}>
          <CardContent>
              <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                <Typography variant="h6" fontWeight={600}>
                  {selectedProduct === 'all' ? 'All Products Overview' : `Product: ${metrics?.availableProducts?.find(p => String(p.id) === String(selectedProduct))?.name || 'Selected Product'}`}
                </Typography>
                <Box display="flex" gap={2} alignItems="center" flexWrap="wrap" position="relative">
                  <Box sx={{ position: 'relative', minWidth: 300 }}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Search products by name or ID..."
                      value={productSearch}
                      onChange={(e) => {
                        const value = e.target.value;
                        setProductSearch(value);
                        if (value.trim()) {
                          setSearchAnchorEl(e.currentTarget);
                        } else {
                          setSearchAnchorEl(null);
                          setSelectedProduct('all');
                        }
                      }}
                      onFocus={(e) => {
                        if (productSearch.trim() && metrics?.availableProducts && metrics.availableProducts.length > 0) {
                          setSearchAnchorEl(e.currentTarget);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const searchValue = productSearch.toLowerCase().trim();
                          if (searchValue && metrics?.availableProducts) {
                            const filtered = metrics.availableProducts.filter(p => 
                              p.name?.toLowerCase().includes(searchValue) ||
                              String(p.id).includes(searchValue)
                            );
                            
                            if (filtered.length > 0) {
                              setSelectedProduct(String(filtered[0].id));
                              setProductSearch(filtered[0].name || '');
                              setSearchAnchorEl(null);
                            }
                          }
                        }
                      }}
                      InputProps={{
                        startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                      }}
                    />
                    <Popper
                      open={searchOpen}
                      anchorEl={searchAnchorEl}
                      placement="bottom-start"
                      style={{ zIndex: 1300, width: searchAnchorEl?.offsetWidth }}
                    >
                      <Paper sx={{ maxHeight: 300, overflow: 'auto', width: '100%' }}>
                        <ClickAwayListener onClickAway={() => setSearchAnchorEl(null)}>
                          <MenuList>
                            <MuiMenuItem
                              onClick={() => {
                                setSelectedProduct('all');
                                setProductSearch('');
                                setSearchAnchorEl(null);
                              }}
                              selected={selectedProduct === 'all'}
                            >
                              <strong>All Products</strong>
                            </MuiMenuItem>
                            {(metrics?.availableProducts || []).slice(0, 20).map((product) => (
                              <MuiMenuItem
                                key={product.id}
                                onClick={() => {
                                  setSelectedProduct(String(product.id));
                                  setProductSearch(product.name || '');
                                  setSearchAnchorEl(null);
                                }}
                                selected={String(selectedProduct) === String(product.id)}
                              >
                                <Box>
                                  <Typography variant="body2" fontWeight={500}>
                                    {product.name || `Product ${product.id}`}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    ID: {product.id}
                                  </Typography>
                                </Box>
                              </MuiMenuItem>
                            ))}
                            {metrics?.availableProducts && metrics.availableProducts.length > 20 && (
                              <MuiMenuItem disabled>
                                <Typography variant="caption" color="text.secondary">
                                  ... and {metrics.availableProducts.length - 20} more (use dropdown to see all)
                                </Typography>
                              </MuiMenuItem>
                            )}
                            {(!metrics?.availableProducts || metrics.availableProducts.length === 0) && (
                              <MuiMenuItem disabled>
                                <Typography variant="body2" color="text.secondary">
                                  No products found
                                </Typography>
                              </MuiMenuItem>
                            )}
                          </MenuList>
                        </ClickAwayListener>
                      </Paper>
                    </Popper>
                  </Box>
                  <FormControl size="small" sx={{ minWidth: 250 }}>
                    <InputLabel>Select Product</InputLabel>
                    <Select
                      value={selectedProduct}
                      label="Select Product"
                      onChange={(e) => {
                        setSelectedProduct(e.target.value);
                        if (e.target.value !== 'all') {
                          const product = metrics?.availableProducts?.find(p => String(p.id) === String(e.target.value));
                          if (product) {
                            setProductSearch(product.name || '');
                          }
                        } else {
                          setProductSearch('');
                        }
                        setSearchAnchorEl(null);
                      }}
                    >
                      <MenuItem value="all">All Products</MenuItem>
                      {(metrics?.availableProducts || []).map((product) => (
                        <MenuItem key={product.id} value={product.id}>
                          {product.name || `Product ${product.id}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>
              {productSearch && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {metrics?.availableProducts?.length || 0} product{metrics?.availableProducts?.length !== 1 ? 's' : ''} found
                    {metrics?.availableProducts?.length > 0 && metrics.availableProducts.length <= 5 && (
                      <span> - {metrics.availableProducts.map(p => p.name).join(', ')}</span>
                    )}
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Grid container spacing={3} width="100%" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e5e7eb', height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      {selectedProduct === 'all' ? 'Total Products' : 'Product Stock'}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ color: '#2E3A8C' }}>
                      {selectedProduct === 'all' ? metrics.totalProducts : metrics.totalStock}
                    </Typography>
                  </Box>
                  <Box sx={{ bgcolor: '#2E3A8C10', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <InventoryIcon sx={{ color: '#2E3A8C' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e5e7eb', height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      {selectedProduct === 'all' ? 'Items in Stock' : 'Current Stock'}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ color: '#06D6A0' }}>
                      {metrics.totalStock}
                    </Typography>
                  </Box>
                  <Box sx={{ bgcolor: '#06D6A010', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <InventoryIcon sx={{ color: '#06D6A0' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e5e7eb', height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      {selectedProduct === 'all' ? 'Low Stock Items' : 'Stock Status'}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ color: '#FFD166' }}>
                      {selectedProduct === 'all' ? metrics.lowStockCount : (metrics.lowStockCount > 0 ? 'Low' : 'OK')}
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
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e5e7eb', height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      {selectedProduct === 'all' ? 'Product Total Sales' : 'Product Revenue'}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ color: '#6C63FF' }}>
                      {formatCurrency(metrics.totalProductSales ?? 0)}
                    </Typography>
                  </Box>
                  <Box sx={{ bgcolor: '#6C63FF10', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ReceiptIcon sx={{ color: '#6C63FF' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts and Detailed Analytics */}
        <Grid container spacing={3}>
          {/* Product Sales Details & Trends */}
          <Grid item xs={12} width="100%">
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e5e7eb', height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                  <Typography variant="h6" fontWeight={600}>
                    Product Sales Details
                  </Typography>
                  <TextField
                    type="date"
                    label="Select Date"
                    size="small"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      if (e.target.value) {
                        const date = new Date(e.target.value);
                        setSalesFilter(String(date.getFullYear()));
                      }
                    }}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    sx={{ minWidth: 180 }}
                  />
                </Box>
                
                {/* Sales Trend Chart */}
                <Box sx={{ width: '100%', height: 300, mt: 2, mb: 4 }}>
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>
                    {selectedProduct === 'all' 
                      ? `Monthly Sales Trend (${salesFilter})`
                      : `${metrics?.availableProducts?.find(p => String(p.id) === String(selectedProduct))?.name || 'Product'} - Monthly Sales Trend (${salesFilter})`
                    }
                  </Typography>
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={metrics?.productTrendsData || []} 
                        margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                        dataKey="date" 
                          angle={-45} 
                          textAnchor="end" 
                          height={80}
                        tick={{ fontSize: 11 }}
                        interval="preserveStartEnd"
                        />
                        <YAxis 
                          label={{ 
                            value: 'Units Sold', 
                            angle: -90, 
                            position: 'insideLeft',
                            fontWeight: 600
                          }} 
                          tick={{ fontSize: 12 }}
                        />
                        <RechartsTooltip 
                          contentStyle={{ 
                            borderRadius: 8, 
                            border: '1px solid #e0e0e0',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                          formatter={(value) => [formatStockValue(value), 'Units Sold']}
                          labelStyle={{ fontWeight: 600 }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: 10 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#2E3A8C" 
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        name="Monthly Sales"
                      />
                    </LineChart>
                    </ResponsiveContainer>
                  </Box>

                {/* Product Sales Details Table */}
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Product Sales Breakdown
                </Typography>
                {(!metrics?.productDetailsList || metrics.productDetailsList.length === 0) ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <InventoryIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
                    <Typography color="text.secondary">
                      No sales data available
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f7ff' }}>
                          <TableCell>Product Name</TableCell>
                          <TableCell>Product ID</TableCell>
                          <TableCell align="right">Units Sold</TableCell>
                          <TableCell align="right">Total Revenue</TableCell>
                          <TableCell align="right">Orders</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(metrics?.productDetailsList || []).map((product) => (
                          <TableRow 
                            key={product.id}
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                          >
                            <TableCell>
                              <Typography fontWeight={500}>
                                {product.name || `Product ${product.id}`}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={product.id} 
                                size="small" 
                                sx={{ bgcolor: '#6c63ff10', color: '#6c63ff' }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography fontWeight={600} sx={{ color: '#2E3A8C' }}>
                                {product.totalQuantity.toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography fontWeight={600} sx={{ color: '#06D6A0' }}>
                                {formatCurrency(product.totalRevenue)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography color="text.secondary">
                                {product.orderCount}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          {/* Top 5 Selling Products */}
          <Grid item xs={12} md={4} width="100%">
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e5e7eb', height: '100%' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6" fontWeight={600}>
                    Top 5 Selling Products
                  </Typography>
                  <Chip 
                    label="Best Sellers" 
                    size="small" 
                    color="success" 
                    sx={{ minWidth: 80 }}
                  />
                </Stack>

                {(!metrics?.top5Products || metrics.top5Products.length === 0) ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <InventoryIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
                    <Typography color="text.secondary">
                      No sales data available
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f7ff' }}>
                          <TableCell>Rank</TableCell>
                          <TableCell>Product</TableCell>
                          <TableCell align="right">Units Sold</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(metrics?.top5Products || []).map((product, index) => (
                          <TableRow 
                            key={product.id}
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                          >
                            <TableCell>
                              <Chip
                                label={`#${index + 1}`}
                                size="small"
                                sx={{ 
                                  bgcolor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#6c63ff10',
                                  color: index < 3 ? '#fff' : '#6c63ff',
                                  fontWeight: 600
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography fontWeight={500} sx={{ fontSize: '0.875rem' }}>
                                {product.name || `Product ${product.id}`}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography fontWeight={600} sx={{ color: '#2E3A8C' }}>
                                {product.totalQuantity.toLocaleString()}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    );
  };

  return (
    <SidebarLayout>
      <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 1, md: 2 }, py: 3 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
          sx={{ mb: 4 }}
        >
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#2E3A8C', mb: 0.5 }}>
              Reports & Analytics
            </Typography>
            <Typography color="text.secondary">
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            {lastUpdated && (
              <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                Updated {formatDate(lastUpdated)}
              </Typography>
            )}
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={fetchData}
              sx={{ 
                borderRadius: 2, 
                background: '#6c63ff', 
                fontWeight: 600,
                px: 3,
                '&:hover': { bgcolor: '#5a52e0' }
              }}
            >
              Refresh Data
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {renderContent()}
      </Box>
    </SidebarLayout>
  );
};

export default Reports;