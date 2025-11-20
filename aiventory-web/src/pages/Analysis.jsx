import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';
import {
  Alert,
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  CircularProgress,
  Chip,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import InfoIcon from '@mui/icons-material/Info';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

const tabLabels = ['Daily Stock Demand', 'Monthly Demand', 'Yearly Demand', 'Restock History'];

import { API_BASE } from '../config/api';
const ML_SERVICE_BASE = 'http://localhost:5200';

// Helper function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper function to generate stock demand data using ML predictions
const generateMLStockDemandData = async (product, days = 7) => {
  try {
    // Fetch ML predictions
    const response = await fetch(`${ML_SERVICE_BASE}/api/predictions/${product.Product_id}`);
    if (response.ok) {
      const predictionData = await response.json();
      
      // Process predictions for daily data
      const data = [];
      const currentDate = new Date();
      const currentStock = product.Product_stock || 0;
      const threshold = product.reorder_level || Math.floor(currentStock * 0.2);
      
      for (let i = 0; i < days; i++) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() + i);
        
        // Get predicted demand from ML service
        const dateString = date.toISOString().split('T')[0];
        const predictedDemand = predictionData.predictions?.[dateString] || 0;
        
        // Calculate predicted stock level
        const predictedStock = Math.max(0, currentStock - (predictedDemand * i));
        
        data.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullDate: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          predictedStock: Math.round(predictedStock),
          predictedDemand: Math.round(predictedDemand),
          status: predictedStock <= threshold ? 'Low Stock' : 'Adequate',
          daysUntilRestock: predictedStock <= threshold ? Math.max(0, Math.floor(predictedStock / (predictedDemand || 1))) : null
        });
      }
      
      return data;
    } else {
      throw new Error('ML service not available');
    }
  } catch (error) {
    console.error('Error fetching ML predictions:', error);
    // Fallback to simulated data
    return generateSimulatedStockDemandData(product, days);
  }
};

// Helper function to generate simulated stock demand data when ML is not available
const generateSimulatedStockDemandData = (product, days = 7) => {
  const data = [];
  const currentDate = new Date();
  const currentStock = product.Product_stock || 0;
  const threshold = product.reorder_level || Math.floor(currentStock * 0.2);
  
  // Calculate average daily usage based on historical data or current stock
  const avgDailyUsage = Math.max(1, Math.ceil(currentStock / 30));
  
  for (let i = 0; i < days; i++) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + i);
    
    // Add some variation to simulate real demand
    const predictedDemand = Math.max(0, Math.floor(avgDailyUsage * (0.7 + Math.random() * 0.6)));
    
    // Calculate predicted stock level
    const predictedStock = Math.max(0, currentStock - (predictedDemand * i));
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      predictedStock: Math.round(predictedStock),
      predictedDemand: Math.round(predictedDemand),
      status: predictedStock <= threshold ? 'Low Stock' : 'Adequate',
      daysUntilRestock: predictedStock <= threshold ? Math.max(0, Math.floor(predictedStock / (predictedDemand || 1))) : null
    });
  }
  
  return data;
};

// Generate monthly stock demand data using ML
const generateMonthlyStockData = async (product) => {
  try {
    // Fetch ML predictions
    const response = await fetch(`${ML_SERVICE_BASE}/api/predictions/${product.Product_id}`);
    if (response.ok) {
      const predictionData = await response.json();
      
      // Generate next 6 months starting from current month
      const months = [];
      const currentDate = new Date();
      for (let i = 0; i < 6; i++) {
        const date = new Date(currentDate);
        date.setMonth(date.getMonth() + i);
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        months.push(monthName);
      }
      
      const currentStock = product.Product_stock || 0;
      const threshold = product.reorder_level || Math.floor(currentStock * 0.2);
      
      return months.map((month, index) => {
        // Parse month and year from the string
        const parts = month.split(' ');
        const monthName = parts[0];
        const year = parts[1];
        const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(monthName);
        
        // Aggregate monthly demand from daily predictions
        let monthlyDemand = 0;
        const date = new Date(parseInt(year), monthIndex, 1);
        const daysInMonth = new Date(parseInt(year), monthIndex + 1, 0).getDate();
        
        for (let i = 0; i < daysInMonth; i++) {
          const day = new Date(date);
          day.setDate(day.getDate() + i);
          const dateString = day.toISOString().split('T')[0];
          monthlyDemand += predictionData.predictions?.[dateString] || 0;
        }
        
        const predictedStock = Math.max(0, currentStock - monthlyDemand);
        const isCurrentMonth = index === 0;
        return { 
          month: isCurrentMonth ? `${month} (MTD)` : month,
          demand: Math.round(monthlyDemand),
          predictedStock: Math.round(predictedStock),
          status: predictedStock <= threshold ? 'Low Stock' : 'Adequate'
        };
      });
    } else {
      throw new Error('ML service not available');
    }
  } catch (error) {
    console.error('Error fetching ML predictions:', error);
    // Fallback to simulated data
    return generateSimulatedMonthlyStockData(product);
  }
};

// Generate simulated monthly stock data
const generateSimulatedMonthlyStockData = (product) => {
  // Generate next 6 months starting from current month
  const months = [];
  const currentDate = new Date();
  for (let i = 0; i < 6; i++) {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() + i);
    const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    months.push(monthName);
  }
  
  const currentStock = product.Product_stock || 0;
  const avgMonthlyUsage = Math.max(10, Math.floor(currentStock * 1.5));
  const threshold = product.reorder_level || Math.floor(currentStock * 0.2);
  
  return months.map((month, index) => {
    // Predicted demand increases each month
    const demand = Math.max(20, Math.floor(avgMonthlyUsage * (1 + (index * 0.1))));
    const predictedStock = Math.max(0, currentStock - (demand * index));
    const isCurrentMonth = index === 0;
    return { 
      month: isCurrentMonth ? `${month} (MTD)` : month,
      demand,
      predictedStock,
      status: predictedStock <= threshold ? 'Low Stock' : 'Adequate'
    };
  });
};

// Generate yearly stock demand data using ML
const generateYearlyStockData = async (product) => {
  try {
    // Fetch ML predictions
    const response = await fetch(`${ML_SERVICE_BASE}/api/predictions/${product.Product_id}`);
    if (response.ok) {
      const predictionData = await response.json();
      
      // Generate next 5 years starting from current year
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let i = 0; i < 5; i++) {
        years.push(currentYear + i);
      }
      
      const currentStock = product.Product_stock || 0;
      const threshold = product.reorder_level || Math.floor(currentStock * 0.2);
      
      return years.map((year, index) => {
        const isCurrentYear = year === currentYear;
        
        // Aggregate yearly demand from daily predictions
        let yearlyDemand = 0;
        const startDate = new Date(year, 0, 1);
        const endDate = isCurrentYear ? new Date() : new Date(year, 11, 31);
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateString = d.toISOString().split('T')[0];
          yearlyDemand += predictionData.predictions?.[dateString] || 0;
        }
        
        const predictedStock = Math.max(0, currentStock - yearlyDemand);
        return { 
          year: isCurrentYear ? `${year} (YTD)` : year, 
          demand: Math.round(yearlyDemand),
          predictedStock: Math.round(predictedStock),
          status: predictedStock <= threshold ? 'Low Stock' : 'Adequate'
        };
      });
    } else {
      throw new Error('ML service not available');
    }
  } catch (error) {
    console.error('Error fetching ML predictions:', error);
    // Fallback to simulated data
    return generateSimulatedYearlyStockData(product);
  }
};

// Generate simulated yearly stock data
const generateSimulatedYearlyStockData = (product) => {
  // Generate next 5 years starting from current year
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < 5; i++) {
    years.push(currentYear + i);
  }
  
  const currentStock = product.Product_stock || 0;
  const baseYearlyDemand = Math.max(200, Math.floor(currentStock * 12));
  const threshold = product.reorder_level || Math.floor(currentStock * 0.2);
  
  return years.map((year, index) => {
    const isCurrentYear = year === currentYear;
    const demand = isCurrentYear 
      ? Math.floor(baseYearlyDemand * (new Date().getMonth() + 1) / 12)
      : Math.max(400, Math.floor(baseYearlyDemand * (1 + (index * 0.15))));
      
    const predictedStock = Math.max(0, currentStock - (demand * index * 0.1));
    return { 
      year: isCurrentYear ? `${year} (YTD)` : year, 
      demand,
      predictedStock,
      status: predictedStock <= threshold ? 'Low Stock' : 'Adequate'
    };
  });
};

const formatInvoiceDate = (value) => {
  if (!value) return { display: '—', date: null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { display: value, date: null };
  }
  return {
    display: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    date,
  };
};

export default function Analysis() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sku = searchParams.get('sku');
  
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [tab, setTab] = useState(0);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [invoiceRecords, setInvoiceRecords] = useState([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState(null);
  const [mlStatus, setMlStatus] = useState({ connected: false, checked: false });
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  
  // Check ML service status
  useEffect(() => {
    const checkMlService = async () => {
      try {
        const response = await fetch(`${ML_SERVICE_BASE}/api/health`);
        setMlStatus({ connected: response.ok, checked: true });
      } catch (error) {
        setMlStatus({ connected: false, checked: true });
      }
    };
    
    checkMlService();
  }, []);
  
  // Fetch product data from database
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/api/products`);
        const products = await response.json();
        
        const foundProduct = products.find(p => 
          p.Product_sku === sku || p.Product_id === sku
        );
        
        if (foundProduct) {
          setProduct(foundProduct);
        } else {
          console.error('Product not found');
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (sku) {
      fetchProduct();
    } else {
      setLoading(false);
    }
  }, [sku]);

  useEffect(() => {
    if (!product) {
      setInvoiceRecords([]);
      return;
    }

    let isMounted = true;

    const fetchInvoices = async () => {
      try {
        setInvoiceLoading(true);
        setInvoiceError(null);
        const response = await fetch(`${API_BASE}/api/invoices`);
        if (!response.ok) {
          throw new Error(`Unable to load invoices (status ${response.status})`);
        }
        const raw = await response.json();
        const list = Array.isArray(raw) ? raw : [];
        const productId = String(product.Product_id ?? product.ProductID ?? '');
        const productSku = String(product.Product_sku ?? '').toLowerCase();
        const productName = String(product.Product_name ?? '').toLowerCase();

        const normalized = list
          .map((invoice) => {
            const invoiceId = String(invoice.invoice_id ?? invoice.invoiceId ?? invoice.invoice_number ?? '');
            const invoiceNumber = invoice.invoice_number || invoice.invoiceNumber || invoiceId || `INV-${invoiceId || '0000'}`;
            const { display: dateDisplay, date: dateObj } = formatInvoiceDate(invoice.invoice_date || invoice.invoiceDate || invoice.created_at);
            const items = Array.isArray(invoice.items) ? invoice.items : [];
            const units = items.reduce(
              (sum, item) => sum + Number(item.quantity ?? item.Quantity ?? 0),
              0
            );
            const total = Number(
              invoice.total ??
                invoice.subtotal ??
                items.reduce(
                  (sum, item) =>
                    sum +
                    (Number(item.quantity ?? item.Quantity ?? 0) *
                      Number(item.unit_price ?? item.unitPrice ?? 0)),
                  0
                )
            );
            return {
              invoiceId: invoiceId || invoiceNumber,
              invoiceNumber,
              dateDisplay,
              dateObj,
              customer: invoice.customer_name || invoice.customerName || 'Customer',
              units,
              totalDisplay: formatCurrency(total),
              status: invoice.status || 'Paid',
              items,
              canNavigate: true,
            };
          })
          .filter((entry) => {
            if (!entry.items || entry.items.length === 0) return false;
            return entry.items.some((item) => {
              const itemId = item.product_id ?? item.productId ?? item.Product_id ?? null;
              if (itemId && productId && String(itemId) === productId) return true;
              const description = String(item.description ?? item.Description ?? '').toLowerCase();
              return (
                (!!productSku && description.includes(productSku)) ||
                (!!productName && description.includes(productName))
              );
            });
          });

        const matchingInvoices = normalized.filter((entry) => {
          if (!entry.items || entry.items.length === 0) return false;
          return entry.items.some((item) => {
            const itemId = item.product_id ?? item.productId ?? item.Product_id ?? null;
            if (itemId && productId && String(itemId) === productId) return true;
            const description = String(item.description ?? item.Description ?? '').toLowerCase();
            return (
              (!!productSku && description.includes(productSku)) ||
              (!!productName && description.includes(productName))
            );
          });
        });

        if (isMounted) {
          setInvoiceRecords(
            matchingInvoices.map(({ items, ...rest }) => rest)
          );
        }
      } catch (error) {
        console.error('Error fetching invoices:', error);
        if (isMounted) {
          setInvoiceRecords([]);
          setInvoiceError(error?.message || 'Unable to load invoice history for this product.');
        }
      } finally {
        if (isMounted) {
          setInvoiceLoading(false);
        }
      }
    };

    fetchInvoices();

    return () => {
      isMounted = false;
    };
  }, [product]);
  
  // Calculate summary stats based on product for stock predictions
  const calculateSummaryStats = () => {
    if (!product) return null;
    
    const currentStock = product.Product_stock || 0;
    const threshold = product.reorder_level || Math.floor(currentStock * 0.2);
    const avgDailyUsage = Math.max(1, Math.ceil(currentStock / 30));
    const daysUntilRestock = currentStock > threshold ? Math.floor((currentStock - threshold) / avgDailyUsage) : 0;
    const monthlyDemand = Math.floor(avgDailyUsage * 30);
    const yearlyDemand = Math.floor(avgDailyUsage * 365);
    
    return [
      { 
        label: 'Current Stock', 
        value: currentStock,
        description: ''
      },
      { 
        label: 'Days Until Restock', 
        value: daysUntilRestock, 
        color: daysUntilRestock <= 7 ? '#FF6B6B' : '#2E3A8C',
        description: ''
      },
      { 
        label: 'Monthly Demand', 
        value: monthlyDemand,
        description: ''
      },
      { 
        label: 'Yearly Demand', 
        value: yearlyDemand,
        description: ''
      },
    ];
  };
  
  if (loading) {
    return (
      <SidebarLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </SidebarLayout>
    );
  }
  
  if (!product) {
    return (
      <SidebarLayout>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" color="error">
            Product not found. Please select a product from the Inventory page.
          </Typography>
          <Button onClick={() => navigate('/inventory')} sx={{ mt: 2 }}>
            
          </Button>
        </Box>
      </SidebarLayout>
    );
  }
  
  const summaryStats = calculateSummaryStats();
  
  // Generate chart data based on ML availability
  const generateChartData = () => {
    // For now, we'll use simulated data since we can't use async functions directly in the render
    const dailyData = generateSimulatedStockDemandData(product, 7);
    const monthlyData = generateSimulatedMonthlyStockData(product);
    const yearlyData = generateSimulatedYearlyStockData(product);
    
    return { dailyData, monthlyData, yearlyData };
  };
  
  // Generate chart data
  const chartData = generateChartData();
  
  // Generate daily table from stock demand data
  const dailyTable = (dailyData) => dailyData.map((item, index) => [
    item.fullDate,
    item.predictedStock,
    item.predictedDemand,
    item.status,
    item.daysUntilRestock !== null ? `${item.daysUntilRestock} days` : '—'
  ]);
  
  // Generate monthly table for stock predictions
  const monthlyTable = (monthlyData) => monthlyData.map((item, index) => {
    return [
      item.month,
      item.predictedStock,
      item.demand,
      item.status,
      item.predictedStock <= (product.reorder_level || 10) ? '⚠️ Restock Needed' : '✅ Adequate'
    ];
  });
  
  // Generate yearly table for stock predictions
  const yearlyTable = (yearlyData) => yearlyData.map((item, index) => {
    return [
      item.year,
      item.predictedStock,
      item.demand,
      item.status,
      item.predictedStock <= (product.reorder_level || 10) ? '⚠️ Restock Needed' : '✅ Adequate'
    ];
  });
  
  // Filter invoices to only show those related to this product
  const filteredInvoiceRows = invoiceRecords
    .filter((row) => {
      if (!invoiceSearch) return true;
      const term = invoiceSearch.toLowerCase();
      return (
        (row.invoiceNumber && row.invoiceNumber.toLowerCase().includes(term)) ||
        (row.customer && row.customer.toLowerCase().includes(term))
      );
    })
    .filter((row) => {
      if (!dateRange.start && !dateRange.end) return true;
      if (!row.dateObj) return !dateRange.start && !dateRange.end;
      const start = dateRange.start ? new Date(dateRange.start) : null;
      const end = dateRange.end ? new Date(dateRange.end) : null;
      if (start && row.dateObj < start) return false;
      if (end) {
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        if (row.dateObj > endOfDay) return false;
      }
      return true;
    });

  const handleInvoiceView = (row) => {
    if (!row?.canNavigate) return;
    const highlightId = row.invoiceId || row.invoiceNumber;
    try {
      sessionStorage.setItem('highlightInvoiceId', String(highlightId));
    } catch (error) {
      console.warn('Unable to persist invoice highlight:', error);
    }
    navigate('/invoices', { state: { highlightInvoiceId: String(highlightId) } });
  };

  return (
    <SidebarLayout>
      <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 3, mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h5" fontWeight={800} color="#2E3A8C">
              Stock Demand Analysis: {product.Product_name} (SKU: {product.Product_sku || product.Product_id})
            </Typography>
            <Chip 
              label={mlStatus.connected ? "AI-Powered" : "Simulated"} 
              color={mlStatus.connected ? "success" : "warning"} 
              size="small"
              icon={mlStatus.connected ? <InfoIcon /> : null}
              onClick={() => setInfoDialogOpen(true)}
            />
          </Box>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/inventory')}
            sx={{
              borderRadius: 3,
              fontWeight: 700,
              fontSize: 10,
              color: '#2E3A8C !important',
              borderColor: '#2E3A8C !important',
              px: 2.5,
              py: 1,
              boxShadow: 'none',
              ':hover': {
                background: '#e0e7ff',
                borderColor: '#2E3A8C !important',
                color: '#2E3A8C !important',
              },
            }}
          >
            
          </Button>
        </Box>

        {/* Analysis Summary */}
        <Paper elevation={3} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', mb: 4, p: 3, borderRadius: 3, background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e7f1 100%)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#2E3A8C' }}>
              Stock Demand Prediction Summary
            </Typography>
            {!mlStatus.connected && mlStatus.checked && (
              <Tooltip title="ML service not connected. Using simulated data.">
                <IconButton size="small" sx={{ color: '#FF6B6B' }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Grid container spacing={4}>
            {summaryStats && summaryStats.map((stat, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Paper 
                  elevation={1} 
                  sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    textAlign: 'center', 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    background: 'white'
                  }}
                >
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    sx={{
                      color: stat.color || '#2E3A8C',
                      mb: 0.5,
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography color="#555" fontWeight={600} fontSize={14} sx={{ mb: 0.5 }}>
                    {stat.label}
                  </Typography>
                  <Typography color="#888" variant="caption">
                    {stat.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Tabs */}
        <Tabs 
          value={tab} 
          onChange={(_, v) => setTab(v)} 
          sx={{ mb: 3 }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabLabels.map((label, i) => (
            <Tab 
              key={i} 
              label={label} 
              sx={{ 
                fontWeight: 600,
                textTransform: 'none',
                minWidth: 120
              }}
            />
          ))}
        </Tabs>

        {/* Tab Panels */}
        {tab === 0 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#2E3A8C' }}>
                Daily Stock Demand Prediction
              </Typography>
              <Chip 
                label={mlStatus.connected ? "AI-Powered" : "Simulated"} 
                size="small" 
                sx={{ ml: 2, fontWeight: 600 }}
                color={mlStatus.connected ? "success" : "warning"}
              />
            </Box>
            <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 3, background: 'white' }}>
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.dailyData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      angle={-45} 
                      textAnchor="end" 
                      height={60}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      label={{ 
                        value: 'Units', 
                        angle: -90, 
                        position: 'insideLeft',
                        fontWeight: 600
                      }} 
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        borderRadius: 8, 
                        border: '1px solid #e0e0e0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value, name) => {
                        if (name === 'predictedStock') return [value, 'Predicted Stock'];
                        if (name === 'predictedDemand') return [value, 'Demand Forecast'];
                        return [value, name];
                      }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: 10 }}
                      formatter={(value) => {
                        if (value === 'predictedStock') return 'Predicted Stock';
                        if (value === 'predictedDemand') return 'Demand Forecast';
                        return value;
                      }}
                    />
                    <Bar 
                      dataKey="predictedStock" 
                      name="predictedStock" 
                      fill="#2E3A8C" 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="predictedDemand" 
                      name="predictedDemand" 
                      fill="#FF6B6B" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
            <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3, background: 'white' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: '#f5f7ff' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Predicted Stock</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Demand Forecast</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Time Until Restock</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dailyTable(chartData.dailyData).map((row, i) => (
                    <TableRow 
                      key={i} 
                      sx={{ 
                        '&:nth-of-type(odd)': { background: '#fafbff' },
                        '&:hover': { background: '#f0f2ff' }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>{row[0]}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box 
                            sx={{ 
                              width: 12, 
                              height: 12, 
                              borderRadius: '50%', 
                              background: '#2E3A8C' 
                            }} 
                          />
                          <Typography fontWeight={600}>{row[1]}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box 
                            sx={{ 
                              width: 12, 
                              height: 12, 
                              borderRadius: '50%', 
                              background: '#FF6B6B' 
                            }} 
                          />
                          <Typography fontWeight={600}>{row[2]}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row[3]}
                          size="small"
                          sx={{ 
                            fontWeight: 700,
                            background: row[3] === 'Low Stock' ? '#FF6B6B' : '#06D6A0',
                            color: 'white'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={500}>{row[4]}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
        {tab === 1 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#2E3A8C' }}>
                Monthly Stock Demand Trends
              </Typography>
              <Chip 
                label={mlStatus.connected ? "AI-Powered" : "Simulated"} 
                size="small" 
                sx={{ ml: 2, fontWeight: 600 }}
                color={mlStatus.connected ? "success" : "warning"}
              />
            </Box>
            <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 3, background: 'white' }}>
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="month" 
                      angle={-45} 
                      textAnchor="end" 
                      height={60}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      label={{ 
                        value: 'Units', 
                        angle: -90, 
                        position: 'insideLeft',
                        fontWeight: 600
                      }} 
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        borderRadius: 8, 
                        border: '1px solid #e0e0e0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value, name) => {
                        if (name === 'demand') return [value, 'Demand Forecast'];
                        if (name === 'predictedStock') return [value, 'Predicted Stock'];
                        return [value, name];
                      }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: 10 }}
                      formatter={(value) => {
                        if (value === 'demand') return 'Demand Forecast';
                        if (value === 'predictedStock') return 'Predicted Stock';
                        return value;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="demand" 
                      name="demand" 
                      stroke="#FF6B6B" 
                      strokeWidth={3} 
                      dot={{ r: 6, fill: '#FF6B6B' }} 
                      activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="predictedStock" 
                      name="predictedStock" 
                      stroke="#2E3A8C" 
                      strokeWidth={3} 
                      dot={{ r: 6, fill: '#2E3A8C' }} 
                      activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
            <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3, background: 'white' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: '#f5f7ff' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Month</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Predicted Stock</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Demand Forecast</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {monthlyTable(chartData.monthlyData).map((row, i) => (
                    <TableRow 
                      key={i} 
                      sx={{ 
                        '&:nth-of-type(odd)': { background: '#fafbff' },
                        '&:hover': { background: '#f0f2ff' }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>{row[0]}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box 
                            sx={{ 
                              width: 12, 
                              height: 12, 
                              borderRadius: '50%', 
                              background: '#2E3A8C' 
                            }} 
                          />
                          <Typography fontWeight={600}>{row[1]}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box 
                            sx={{ 
                              width: 12, 
                              height: 12, 
                              borderRadius: '50%', 
                              background: '#FF6B6B' 
                            }} 
                          />
                          <Typography fontWeight={600}>{row[2]}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row[3]}
                          size="small"
                          sx={{ 
                            fontWeight: 700,
                            background: row[3] === 'Low Stock' ? '#FF6B6B' : '#06D6A0',
                            color: 'white'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography 
                          fontWeight={600} 
                          sx={{ 
                            color: row[4].includes('Restock') ? '#FF6B6B' : '#06D6A0' 
                          }}
                        >
                          {row[4]}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
        {tab === 2 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#2E3A8C' }}>
                Yearly Stock Demand Performance
              </Typography>
              <Chip 
                label={mlStatus.connected ? "AI-Powered" : "Simulated"} 
                size="small" 
                sx={{ ml: 2, fontWeight: 600 }}
                color={mlStatus.connected ? "success" : "warning"}
              />
            </Box>
            <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 3, background: 'white' }}>
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.yearlyData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="year" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      label={{ 
                        value: 'Units', 
                        angle: -90, 
                        position: 'insideLeft',
                        fontWeight: 600
                      }} 
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        borderRadius: 8, 
                        border: '1px solid #e0e0e0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value, name) => {
                        if (name === 'demand') return [value, 'Demand Forecast'];
                        if (name === 'predictedStock') return [value, 'Predicted Stock'];
                        return [value, name];
                      }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: 10 }}
                      formatter={(value) => {
                        if (value === 'demand') return 'Demand Forecast';
                        if (value === 'predictedStock') return 'Predicted Stock';
                        return value;
                      }}
                    />
                    <Bar 
                      dataKey="demand" 
                      name="demand" 
                      fill="#FF6B6B" 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="predictedStock" 
                      name="predictedStock" 
                      fill="#2E3A8C" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
            <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3, background: 'white' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: '#f5f7ff' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Year</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Predicted Stock</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Demand Forecast</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {yearlyTable(chartData.yearlyData).map((row, i) => (
                    <TableRow 
                      key={i} 
                      sx={{ 
                        '&:nth-of-type(odd)': { background: '#fafbff' },
                        '&:hover': { background: '#f0f2ff' }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>{row[0]}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box 
                            sx={{ 
                              width: 12, 
                              height: 12, 
                              borderRadius: '50%', 
                              background: '#2E3A8C' 
                            }} 
                          />
                          <Typography fontWeight={600}>{row[1]}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box 
                            sx={{ 
                              width: 12, 
                              height: 12, 
                              borderRadius: '50%', 
                              background: '#FF6B6B' 
                            }} 
                          />
                          <Typography fontWeight={600}>{row[2]}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row[3]}
                          size="small"
                          sx={{ 
                            fontWeight: 700,
                            background: row[3] === 'Low Stock' ? '#FF6B6B' : '#06D6A0',
                            color: 'white'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography 
                          fontWeight={600} 
                          sx={{ 
                            color: row[4].includes('Restock') ? '#FF6B6B' : '#06D6A0' 
                          }}
                        >
                          {row[4]}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
        {tab === 3 && (
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 2, color: '#2E3A8C' }}>
              Restock History
            </Typography>
            <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 3, background: 'white' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                <TextField
                  variant="outlined"
                  size="small"
                  placeholder="Search restock records..."
                  value={invoiceSearch}
                  onChange={e => setInvoiceSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ minWidth: 220 }}
                />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography>Date Range:</Typography>
                  <TextField
                    type="date"
                    size="small"
                    value={dateRange.start}
                    onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                  />
                  <TextField
                    type="date"
                    size="small"
                    value={dateRange.end}
                    onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                  />
                  <Button 
                    variant="contained" 
                    size="small" 
                    sx={{ 
                      borderRadius: 2, 
                      fontWeight: 600,
                      background: '#2E3A8C',
                      '&:hover': { background: '#1a246e' }
                    }}
                  >
                    Apply
                  </Button>
                </Stack>
              </Stack>
            </Paper>
            <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3, background: 'white' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: '#f5f7ff' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Invoice ID</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Units</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Total</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#2E3A8C' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoiceLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                          <CircularProgress size={20} />
                          <Typography variant="body2">Loading restock history…</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : filteredInvoiceRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary">
                          {invoiceRecords.length > 0
                            ? 'No restock records match the current filters.'
                            : 'No restock history available for this product yet.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoiceRows.map((row) => {
                      const statusKey = String(row.status || '').toLowerCase();
                      const statusBackground =
                        statusKey === 'pending'
                          ? '#F4A261'
                          : statusKey === 'overdue'
                          ? '#FF6B6B'
                          : '#06D6A0';
                      return (
                        <TableRow 
                          key={row.invoiceId}
                          sx={{ 
                            '&:nth-of-type(odd)': { background: '#fafbff' },
                            '&:hover': { background: '#f0f2ff' }
                          }}
                        >
                          <TableCell sx={{ fontWeight: 500 }}>{row.invoiceNumber}</TableCell>
                          <TableCell>{row.dateDisplay}</TableCell>
                          <TableCell>{row.customer}</TableCell>
                          <TableCell>
                            <Typography fontWeight={600}>{row.units}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight={600}>{row.totalDisplay}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={row.status || 'Paid'}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                background: statusBackground,
                                color: 'white',
                                textTransform: 'uppercase'
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="text"
                              size="small"
                              sx={{ 
                                color: '#2E3A8C', 
                                fontWeight: 700,
                                '&:hover': { background: 'rgba(46, 58, 140, 0.1)' }
                              }}
                              onClick={() => handleInvoiceView(row)}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {invoiceError && (
              <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                {invoiceError}
              </Alert>
            )}
          </Box>
        )}
      </Box>
      
      {/* ML Service Info Dialog */}
      <Dialog open={infoDialogOpen} onClose={() => setInfoDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700, color: '#2E3A8C' }}>
          AI/ML Service Status
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {mlStatus.connected 
              ? "✅ AI/ML Service is connected and providing real-time stock demand predictions." 
              : "⚠️ AI/ML Service is not connected. The system is using simulated data based on historical patterns."}
          </Typography>
          <Typography>
            {mlStatus.connected
              ? "Predictions are generated using ARIMA models trained on historical sales data."
              : "To enable AI-powered predictions, please start the ML service by running 'python run_ml_service.py' in the machine-learning/services directory."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setInfoDialogOpen(false)}
            sx={{ 
              fontWeight: 600,
              color: '#2E3A8C'
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </SidebarLayout>
  );
}