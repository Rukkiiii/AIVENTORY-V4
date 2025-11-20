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
  const [selectedMonth, setSelectedMonth] = useState(null); // Selected month (1-12) or null for all months
  const [selectedDate, setSelectedDate] = useState(''); // Selected date from calendar
  const [selectedProduct, setSelectedProduct] = useState('all'); // 'all' or specific product ID
  const [productSearch, setProductSearch] = useState(''); // Search term for products
  const [searchAnchorEl, setSearchAnchorEl] = useState(null); // Anchor for search dropdown
  const searchOpen = Boolean(searchAnchorEl);
  const [restockPredictions, setRestockPredictions] = useState([]); // AI-based restock predictions
  const [aiPredictions, setAiPredictions] = useState({}); // AI predictions by product ID
  const [aiPredictionsLoading, setAiPredictionsLoading] = useState(false);

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

  // Fetch AI predictions for products
  const fetchAiPredictions = async () => {
    if (!products.length) return;
    
    setAiPredictionsLoading(true);
    try {
      const predictionsMap = {};
      const productIds = selectedProduct !== 'all' 
        ? [selectedProduct] 
        : products.slice(0, 10).map(p => p.Product_id || p.Product_sku); // Limit to first 10 for "all products"
      
      // Fetch predictions for each product
      const predictionPromises = productIds.map(async (productId) => {
        try {
          const response = await fetch(`http://127.0.0.1:5001/api/predictions/products/${productId}`);
          if (!response.ok) return null;
          
          const result = await response.json();
          if (result?.success && result?.forecast) {
            return { productId, prediction: result };
          }
          return null;
        } catch (error) {
          console.error(`Failed to fetch AI prediction for product ${productId}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(predictionPromises);
      results.forEach(result => {
        if (result) {
          predictionsMap[result.productId] = result.prediction;
        }
      });
      
      setAiPredictions(predictionsMap);
    } catch (error) {
      console.error('Failed to fetch AI predictions:', error);
    } finally {
      setAiPredictionsLoading(false);
    }
  };

  // Generate restock predictions based on AI sales trends
  const generateRestockPredictions = useMemo(() => {
    if (!products.length || !invoices.length) return [];

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const restockData = [];
    
    // Get product sales data for the selected product or all products
    const targetProductId = selectedProduct !== 'all' ? selectedProduct : null;
    
    // Get AI prediction for selected product
    const aiPrediction = targetProductId ? aiPredictions[targetProductId] : null;
    const forecastDemand = aiPrediction?.forecast?.forecast_demand || [];
    const avgDailyDemand = aiPrediction?.forecast?.avg_daily_demand || 
                          aiPrediction?.reorder_suggestion?.predicted_daily_demand || null;
    
    // Analyze sales trends for upcoming 2 years (24 months)
    for (let yearOffset = 0; yearOffset < 2; yearOffset++) {
      const targetYear = currentYear + yearOffset;
      
      for (let month = 0; month < 12; month++) {
        const monthDate = new Date(targetYear, month, 1);
        const isPast = monthDate < new Date(currentYear, currentMonth, 1);
        if (isPast && yearOffset === 0) continue; // Skip past months in current year
        
        // Calculate month index in forecast (days from now)
        const monthsFromNow = (yearOffset * 12) + month - currentMonth;
        const daysFromNow = Math.max(0, monthsFromNow * 30);
        const daysInMonth = new Date(targetYear, month + 1, 0).getDate();
        
        let predictedSales = 0;
        let usingAi = false;
        
        // Use AI forecast if available
        if (forecastDemand.length > 0 && monthsFromNow >= 0 && monthsFromNow < 12) {
          const startDay = Math.floor(daysFromNow);
          const endDay = Math.min(startDay + daysInMonth, forecastDemand.length);
          const monthlyDemand = forecastDemand.slice(startDay, endDay).reduce((sum, val) => sum + (Number(val) || 0), 0);
          predictedSales = Math.round(monthlyDemand);
          usingAi = true;
        } else if (avgDailyDemand && avgDailyDemand > 0 && monthsFromNow >= 0) {
          // Use average daily demand from AI
          predictedSales = Math.round(avgDailyDemand * daysInMonth);
          usingAi = true;
        } else {
          // Fallback to historical analysis
          if (targetProductId) {
            // Calculate for specific product
            const historicalSales = invoices.filter(invoice => {
              if (!Array.isArray(invoice.items)) return false;
              const invoiceDate = new Date(invoice.invoice_date || invoice.invoiceDate);
              const invoiceMonth = invoiceDate.getMonth();
              const invoiceYear = invoiceDate.getFullYear();
              
              // Use same month from previous year as baseline
              return invoiceMonth === month && invoiceYear < targetYear && invoiceYear >= currentYear - 2;
            }).reduce((total, invoice) => {
              const item = invoice.items.find(item => 
                String(item.product_id || item.productId || item.Product_id) === String(targetProductId)
              );
              return total + (Number(item?.quantity || item?.Quantity || 0) || 0);
            }, 0);
            
            // Use average of last 2 years for same month
            const historicalYears = Math.max(1, targetYear - (currentYear - 2));
            predictedSales = Math.round(historicalSales / historicalYears);
          } else {
            // Calculate for all products
            const historicalSales = invoices.filter(invoice => {
              const invoiceDate = new Date(invoice.invoice_date || invoice.invoiceDate);
              const invoiceMonth = invoiceDate.getMonth();
              const invoiceYear = invoiceDate.getFullYear();
              return invoiceMonth === month && invoiceYear < targetYear && invoiceYear >= currentYear - 2;
            }).reduce((total, invoice) => {
              if (!Array.isArray(invoice.items)) return total;
              return total + invoice.items.reduce((sum, item) => 
                sum + (Number(item.quantity || item.Quantity || 0) || 0), 0
              );
            }, 0);
            
            const historicalYears = Math.max(1, targetYear - (currentYear - 2));
            predictedSales = Math.round(historicalSales / historicalYears);
          }
        }
        
        // Use ML predictions if available for next 6 months (backup)
        if (!usingAi && mlPredictions.length > 0 && yearOffset === 0 && month < 6) {
          const mlPrediction = mlPredictions[month];
          if (mlPrediction && mlPrediction.value) {
            predictedSales = mlPrediction.value;
            usingAi = true;
          }
        }
        
        // Calculate average sales for restock threshold
        const allMonths = restockData.map(d => d.predictedSales);
        if (allMonths.length > 0) {
          const avgSales = allMonths.reduce((sum, val) => sum + val, 0) / allMonths.length;
          const isRestockMonth = predictedSales > avgSales * 1.5 || 
                                (predictedSales > avgSales && month === 11); // December or peak months
          
          restockData.push({
            period: `${months[month]} ${targetYear}`,
            month: months[month],
            year: targetYear,
            predictedSales: Math.max(0, Math.round(predictedSales)),
            restockRecommended: isRestockMonth,
            priority: isRestockMonth ? (predictedSales > avgSales * 2 ? 'high' : 'medium') : 'low',
            isPredicted: true,
            usingAi: usingAi
          });
        } else {
          // First month - use simple threshold
          const isRestockMonth = predictedSales > 100; // Initial threshold
          restockData.push({
            period: `${months[month]} ${targetYear}`,
            month: months[month],
            year: targetYear,
            predictedSales: Math.max(0, Math.round(predictedSales)),
            restockRecommended: isRestockMonth,
            priority: isRestockMonth ? (predictedSales > 200 ? 'high' : 'medium') : 'low',
            isPredicted: true,
            usingAi: usingAi
          });
        }
      }
    }
    
    // Recalculate restock recommendations with full data
    if (restockData.length > 0) {
      const avgSales = restockData.reduce((sum, d) => sum + d.predictedSales, 0) / restockData.length;
      restockData.forEach(item => {
        item.restockRecommended = item.predictedSales > avgSales * 1.5 || 
                                  (item.predictedSales > avgSales && item.month === 'Dec');
        item.priority = item.restockRecommended 
          ? (item.predictedSales > avgSales * 2 ? 'high' : 'medium') 
          : 'low';
      });
    }
    
    return restockData;
  }, [products, invoices, selectedProduct, mlPredictions, aiPredictions]);

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

  // Fetch AI predictions when product selection changes
  useEffect(() => {
    if (products.length > 0) {
      fetchAiPredictions();
    }
  }, [products.length, selectedProduct]);

  // Update restock predictions when data changes
  useEffect(() => {
    setRestockPredictions(generateRestockPredictions);
  }, [generateRestockPredictions]);

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

    // Get selected product details
    const selectedProductData = selectedProduct !== 'all' 
      ? filteredProducts.find(p => 
          String(p.Product_id || p.Product_sku || p.id) === String(selectedProduct)
        )
      : null;
    
    const selectedProductStock = selectedProductData 
      ? Number(selectedProductData.Product_stock ?? 0) 
      : null;
    
    const selectedProductReorderLevel = selectedProductData 
      ? Number(selectedProductData.reorder_level ?? selectedProductData.reorderLevel ?? 10) 
      : null;
    
    const selectedProductStatus = selectedProductData && selectedProductReorderLevel !== null
      ? selectedProductStock <= 0
        ? 'Out of Stock'
        : selectedProductStock <= selectedProductReorderLevel
        ? 'Low Stock'
        : 'In Stock'
      : null;
    
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
    
    // Create product price map from database (CSV prices) - needed for revenue calculations
    const productPriceMap = new Map();
    products.forEach(product => {
      const productId = String(product.Product_id || product.product_id || product.id);
      const productPrice = Number(product.Product_price || product.product_price || product.price || 0);
      if (productPrice > 0) {
        productPriceMap.set(productId, productPrice);
      }
    });
    
    // Get selected year and month for filtering (used for totalProductSales calculation)
    const selectedYearForSales = parseInt(salesFilter) || new Date().getFullYear();
    
    // Calculate total product sales from invoice items (quantity * unit_price)
    // Filter by selected year and month, use Product_price from database
    const totalProductSales = paidInvoices.reduce((sum, invoice) => {
      // Filter by selected year and month
      if (invoice.invoice_date) {
        let invoiceDate;
        if (typeof invoice.invoice_date === 'string') {
          if (invoice.invoice_date.includes('-')) {
            invoiceDate = new Date(invoice.invoice_date);
          } else if (invoice.invoice_date.includes('/')) {
            const [month, day, year] = invoice.invoice_date.split('/');
            invoiceDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            invoiceDate = new Date(invoice.invoice_date);
          }
        } else {
          invoiceDate = new Date(invoice.invoice_date);
        }
        
        if (!isNaN(invoiceDate.getTime())) {
          const invoiceYear = invoiceDate.getFullYear();
          const invoiceMonth = invoiceDate.getMonth() + 1; // Month is 1-12
          // Only include invoices from the selected year
          if (invoiceYear !== selectedYearForSales) {
            return sum;
          }
          // If month is selected, filter by month too
          if (selectedMonth !== null && invoiceMonth !== selectedMonth) {
            return sum;
          }
        }
      }
      
      if (!Array.isArray(invoice.items)) return sum;
      const invoiceSales = invoice.items.reduce((itemSum, item) => {
        const quantity = Number(item.quantity ?? 0);
        const productId = String(item.product_id || item.productId || item.Product_id || '');
        // Use Product_price from database (CSV prices) instead of item.unit_price
        const unitPrice = productPriceMap.get(productId) || Number(item.unit_price ?? item.unitPrice ?? item.price ?? item.Price ?? 0);
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

    // Get selected year and month for filtering
    const selectedYear = parseInt(salesFilter) || new Date().getFullYear();
    
    // Calculate top 5 selling products (filtered by selected year and month)
    // Note: productPriceMap is already created above for totalProductSales
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
        
        // Check if date is valid and matches selected year and month
        if (!isNaN(invoiceDate.getTime())) {
          const invoiceYear = invoiceDate.getFullYear();
          const invoiceMonth = invoiceDate.getMonth() + 1; // Month is 1-12
          
          // Only include invoices from the selected year
          if (invoiceYear === selectedYear) {
            // If month is selected, filter by month too
            if (selectedMonth === null || invoiceMonth === selectedMonth) {
              if (Array.isArray(invoice.items)) {
                invoice.items.forEach(item => {
                  const productId = String(item.product_id || item.productId || item.Product_id || '');
                  const productName = item.product_name || item.Product_name || 'Unknown Product';
                  const quantity = Number(item.quantity || item.Quantity || 0);
                  // Use Product_price from database (CSV prices) instead of item.price
                  const price = productPriceMap.get(productId) || Number(item.price || item.Price || 0);
                  
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
                    productSales[productId].totalRevenue += quantity * price;
                  }
                });
              }
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
            // If month is selected, only include that month
            if (selectedMonth === null || invoiceMonth === selectedMonth) {
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
        
        // Check if date is valid and matches selected year and month
        if (!isNaN(invoiceDate.getTime())) {
          const invoiceYear = invoiceDate.getFullYear();
          const invoiceMonth = invoiceDate.getMonth() + 1; // Month is 1-12
          
          // Only include invoices from the selected year
          if (invoiceYear === selectedYear) {
            // If month is selected, filter by month too
            if (selectedMonth === null || invoiceMonth === selectedMonth) {
              if (Array.isArray(invoice.items)) {
                invoice.items.forEach(item => {
                  const productId = String(item.product_id || item.productId || item.Product_id || '');
                  const productName = item.product_name || item.Product_name || `Product ${productId}`;
                  const quantity = Number(item.quantity || item.Quantity || 0);
                  // Use Product_price from database (CSV prices) instead of item.price
                  // Fallback to item.price if Product_price not available
                  const price = productPriceMap.get(productId) || Number(item.price || item.Price || 0);
                  
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
    
    // Convert to array and sort alphabetically by product name
    let availableProducts = Array.from(allProductsMap.values());
    
    // Sort alphabetically by product name
    availableProducts.sort((a, b) => {
      const nameA = (a.name || `Product ${a.id}`).toLowerCase();
      const nameB = (b.name || `Product ${b.id}`).toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
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
    selectedProductStock,
    selectedProductStatus,
    selectedProductReorderLevel,
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
}, [products, invoices, mlStatus, mlPredictions, salesFilter, selectedMonth, selectedProduct, productSearch]);

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
                      {selectedProduct === 'all' ? 'Low Stock Items' : 'Stock Status'}
                    </Typography>
                    <Typography 
                      variant="h4" 
                      fontWeight={700} 
                      sx={{ 
                        color: selectedProduct !== 'all' && metrics.selectedProductStatus
                          ? metrics.selectedProductStatus === 'Out of Stock'
                            ? '#DC2626'
                            : metrics.selectedProductStatus === 'Low Stock'
                            ? '#FFD166'
                            : '#06D6A0'
                          : '#FFD166'
                      }}
                    >
                      {selectedProduct === 'all' 
                        ? metrics.lowStockCount 
                        : metrics.selectedProductStatus || 'OK'}
                    </Typography>
                  </Box>
                  <Box 
                    sx={{ 
                      bgcolor: selectedProduct !== 'all' && metrics.selectedProductStatus
                        ? metrics.selectedProductStatus === 'Out of Stock'
                          ? '#DC262610'
                          : metrics.selectedProductStatus === 'Low Stock'
                          ? '#FFD16610'
                          : '#06D6A010'
                        : '#FFD16610',
                      borderRadius: '50%', 
                      width: 48, 
                      height: 48, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}
                  >
                    {selectedProduct !== 'all' && metrics.selectedProductStatus === 'Out of Stock' ? (
                      <ErrorIcon sx={{ color: '#DC2626' }} />
                    ) : selectedProduct !== 'all' && metrics.selectedProductStatus === 'Low Stock' ? (
                      <WarningIcon sx={{ color: '#FFD166' }} />
                    ) : selectedProduct !== 'all' && metrics.selectedProductStatus === 'In Stock' ? (
                      <CheckCircleIcon sx={{ color: '#06D6A0' }} />
                    ) : (
                      <WarningIcon sx={{ color: '#FFD166' }} />
                    )}
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
                  <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Year</InputLabel>
                      <Select
                        value={salesFilter}
                        label="Year"
                        onChange={(e) => {
                          const year = e.target.value;
                          setSalesFilter(year);
                          // Clear month and date when year changes
                          setSelectedMonth(null);
                          setSelectedDate('');
                        }}
                      >
                        <MenuItem value="2022">2022</MenuItem>
                        <MenuItem value="2023">2023</MenuItem>
                        <MenuItem value="2024">2024</MenuItem>
                        <MenuItem value="2025">2025</MenuItem>
                      </Select>
                    </FormControl>
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
                          setSelectedMonth(date.getMonth() + 1); // Month is 1-12
                        } else {
                          setSelectedMonth(null); // Clear month filter when date is cleared
                        }
                      }}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      sx={{ minWidth: 180 }}
                    />
                  </Box>
                </Box>
                
                {/* Sales Trend Chart */}
                <Box sx={{ width: '100%', height: 300, mt: 2, mb: 4 }}>
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>
                    {selectedProduct === 'all' 
                      ? selectedMonth 
                        ? `Monthly Sales Trend (${new Date(parseInt(salesFilter), selectedMonth - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`
                        : `Monthly Sales Trend (${salesFilter})`
                      : `${metrics?.availableProducts?.find(p => String(p.id) === String(selectedProduct))?.name || 'Product'} - Monthly Sales Trend (${selectedMonth ? new Date(parseInt(salesFilter), selectedMonth - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : salesFilter})`
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

          {/* Sales Trend Analysis with AI Restock Predictions */}
          <Grid item xs={12} width="100%">
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e5e7eb' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TrendingUpIcon sx={{ color: '#2E3A8C', fontSize: 32 }} />
                    <Box>
                      <Typography variant="h5" fontWeight={700} sx={{ color: '#2E3A8C' }}>
                        Sales Trend Analysis
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        AI-Powered Restock Predictions for Upcoming Years
                      </Typography>
                    </Box>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {aiPredictionsLoading && (
                      <CircularProgress size={20} sx={{ color: '#2E3A8C' }} />
                    )}
                    <Chip
                      label={
                        Object.keys(aiPredictions).length > 0 
                          ? "AI-Powered" 
                          : mlStatus.connected 
                            ? "AI Available" 
                            : "Historical Analysis"
                      }
                      size="medium"
                      sx={{
                        fontWeight: 600,
                        backgroundColor: Object.keys(aiPredictions).length > 0 
                          ? '#e8f5e9' 
                          : mlStatus.connected 
                            ? '#e3f2fd' 
                            : '#fff3e0',
                        color: Object.keys(aiPredictions).length > 0 
                          ? '#2e7d32' 
                          : mlStatus.connected 
                            ? '#1976d2' 
                            : '#e65100',
                        border: `1px solid ${
                          Object.keys(aiPredictions).length > 0 
                            ? '#4caf50' 
                            : mlStatus.connected 
                              ? '#2196f3' 
                              : '#ff9800'
                        }`
                      }}
                    />
                  </Stack>
                </Stack>

                {restockPredictions.length > 0 ? (
                  <>
                    {/* Sales Trend Chart with Restock Indicators */}
                    <Box sx={{ width: '100%', height: 400, mb: 4 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={restockPredictions}
                          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="period"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            tick={{ fontSize: 11 }}
                            interval={0}
                          />
                          <YAxis
                            label={{
                              value: 'Predicted Sales (Units)',
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
                            formatter={(value, name, props) => {
                              if (name === 'predictedSales') {
                                const restock = props.payload.restockRecommended;
                                const aiPowered = props.payload.usingAi ? ' (AI-Powered)' : ' (Historical)';
                                return [
                                  `${value} units${aiPowered}${restock ? ' - Restock Recommended' : ''}`,
                                  'Predicted Sales'
                                ];
                              }
                              return [value, name];
                            }}
                            labelStyle={{ fontWeight: 600 }}
                          />
                          <Legend
                            wrapperStyle={{ paddingTop: 10 }}
                            formatter={(value) => {
                              if (value === 'predictedSales') return 'Predicted Sales';
                              if (value === 'restockIndicator') return 'Restock Recommended';
                              return value;
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="predictedSales"
                            stroke="#2E3A8C"
                            strokeWidth={2.5}
                            dot={(props) => {
                              const { payload } = props;
                              return (
                                <circle
                                  cx={props.cx}
                                  cy={props.cy}
                                  r={payload.restockRecommended ? 6 : 4}
                                  fill={payload.restockRecommended ? '#FF6B6B' : '#2E3A8C'}
                                  stroke={payload.restockRecommended ? '#fff' : '#2E3A8C'}
                                  strokeWidth={payload.restockRecommended ? 2 : 1}
                                />
                              );
                            }}
                            activeDot={{ r: 7 }}
                            name="predictedSales"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>

                    {/* Restock Recommendations Table */}
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="h6" fontWeight={600} mb={2}>
                      Recommended Restock Months
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#f5f7ff' }}>
                            <TableCell>Period</TableCell>
                            <TableCell>Month</TableCell>
                            <TableCell align="right">Predicted Sales</TableCell>
                            <TableCell align="center">AI-Powered</TableCell>
                            <TableCell align="center">Priority</TableCell>
                            <TableCell align="center">Restock Recommended</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {restockPredictions
                            .filter(p => p.restockRecommended)
                            .sort((a, b) => {
                              const priorityOrder = { high: 3, medium: 2, low: 1 };
                              return priorityOrder[b.priority] - priorityOrder[a.priority];
                            })
                            .map((prediction, index) => (
                              <TableRow
                                key={`${prediction.period}-${index}`}
                                sx={{
                                  '&:last-child td, &:last-child th': { border: 0 },
                                  bgcolor: prediction.priority === 'high' ? '#fff7f7' : '#fff8f0'
                                }}
                              >
                                <TableCell>
                                  <Typography fontWeight={500}>
                                    {prediction.period}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography color="text.secondary">
                                    {prediction.month} {prediction.year}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography fontWeight={600} sx={{ color: '#2E3A8C' }}>
                                    {prediction.predictedSales.toLocaleString()} units
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  {prediction.usingAi ? (
                                    <Chip
                                      icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                                      label="AI"
                                      size="small"
                                      sx={{
                                        bgcolor: '#e8f5e9',
                                        color: '#2e7d32',
                                        fontWeight: 600
                                      }}
                                    />
                                  ) : (
                                    <Chip
                                      label="Hist"
                                      size="small"
                                      sx={{
                                        bgcolor: '#fff3e0',
                                        color: '#e65100',
                                        fontWeight: 600
                                      }}
                                    />
                                  )}
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={prediction.priority.toUpperCase()}
                                    size="small"
                                    sx={{
                                      bgcolor:
                                        prediction.priority === 'high'
                                          ? '#FF6B6B'
                                          : prediction.priority === 'medium'
                                          ? '#FFD166'
                                          : '#06D6A0',
                                      color: '#fff',
                                      fontWeight: 600
                                    }}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    icon={<InventoryIcon sx={{ fontSize: 16 }} />}
                                    label="Restock"
                                    size="small"
                                    color="error"
                                    sx={{ fontWeight: 600 }}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          {restockPredictions.filter(p => p.restockRecommended).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                <Typography color="text.secondary">
                                  No restock recommendations based on current predictions
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Summary Stats */}
                    <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f7ff', borderRadius: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={3}>
                          <Typography variant="body2" color="text.secondary">
                            Total Restock Months (2 Years)
                          </Typography>
                          <Typography variant="h6" fontWeight={700} sx={{ color: '#2E3A8C' }}>
                            {restockPredictions.filter(p => p.restockRecommended).length}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Typography variant="body2" color="text.secondary">
                            High Priority Months
                          </Typography>
                          <Typography variant="h6" fontWeight={700} sx={{ color: '#FF6B6B' }}>
                            {restockPredictions.filter(p => p.restockRecommended && p.priority === 'high').length}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Typography variant="body2" color="text.secondary">
                            AI-Powered Predictions
                          </Typography>
                          <Typography variant="h6" fontWeight={700} sx={{ color: '#4caf50' }}>
                            {restockPredictions.filter(p => p.usingAi).length} / {restockPredictions.length}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Typography variant="body2" color="text.secondary">
                            Average Predicted Sales
                          </Typography>
                          <Typography variant="h6" fontWeight={700} sx={{ color: '#06D6A0' }}>
                            {Math.round(
                              restockPredictions.reduce((sum, p) => sum + p.predictedSales, 0) /
                                restockPredictions.length
                            ).toLocaleString()}{' '}
                            units
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </>
                ) : (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <TrendingUpIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
                    <Typography color="text.secondary">
                      {loading ? 'Loading predictions...' : 'No prediction data available'}
                    </Typography>
                  </Box>
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