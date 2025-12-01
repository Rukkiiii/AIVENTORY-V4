import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  Typography,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningIcon from '@mui/icons-material/Warning';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import InfoIcon from '@mui/icons-material/Info';

import SidebarLayout from '../components/SidebarLayout';
import { useNavigate } from 'react-router-dom';

import { API_BASE } from '../config/api';


const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
  });

const estimateDailyUsage = (stock, threshold) => {
  const baseline = Math.max(threshold || 1, stock || 1);
  return Math.max(0.25, baseline / 20);
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState({ lowStock: true }); // Add settings state
  const [alertDialog, setAlertDialog] = useState({ open: false, filter: 'low' });
  const [supplierReminder, setSupplierReminder] = useState('');
  const [supplierReminderSnackbar, setSupplierReminderSnackbar] = useState(false);

  // Load settings from localStorage and listen for changes
  useEffect(() => {
    const loadSettings = () => {
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        try {
          setSettings(JSON.parse(savedSettings));
        } catch (e) {
          console.error('Error parsing settings:', e);
        }
      }
    };

    // Load initial settings
    loadSettings();

    // Listen for storage changes (when settings are updated in other tabs/components)
    const handleStorageChange = (e) => {
      if (e.key === 'appSettings') {
        loadSettings();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup listener
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsRes, invoicesRes] = await Promise.all([
        fetch(`${API_BASE}/api/products`),
        fetch(`${API_BASE}/api/invoices`),
      ]);

      const productData = productsRes.ok ? await productsRes.json() : [];
      const invoiceData = invoicesRes.ok ? await invoicesRes.json() : [];

      setProducts(Array.isArray(productData) && productData.length ? productData : FALLBACK_PARTS);
      setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
    } catch (err) {
      console.error('❌ Dashboard fetch error:', err);
      setError('Showing demo data while we reconnect to the server.');
      setProducts(FALLBACK_PARTS);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const analytics = useMemo(() => {
    // Load settings to determine if we should calculate alerts
    const savedSettings = localStorage.getItem('appSettings');
    const settings = savedSettings ? JSON.parse(savedSettings) : { lowStock: true };
    const shouldShowAlerts = settings.lowStock;

    const now = Date.now();
    const usageMap = new Map();

    invoices
      .filter((invoice) => invoice && invoice.status === 'Paid')
      .forEach((invoice) => {
        const invoiceDate = new Date(invoice.invoice_date || invoice.invoiceDate || invoice.created_at || Date.now());
        const invoiceTime = invoiceDate.getTime();
        if (Number.isNaN(invoiceTime)) return;

        const daysAgo = (now - invoiceTime) / (1000 * 60 * 60 * 24);
        if (daysAgo > 90) return; // limit window to most recent 3 months

        const items = Array.isArray(invoice.items) ? invoice.items : [];
        items.forEach((item) => {
          const rawId = item.product_id ?? item.productId ?? item.Product_id ?? item.ProductID;
          if (rawId === undefined || rawId === null) return;
          const idKey = String(rawId);
          const quantity = Number(item.quantity ?? item.Quantity ?? 0);
          if (!quantity) return;

          if (!usageMap.has(idKey)) {
            usageMap.set(idKey, {
              totalQty: 0,
              minTime: invoiceTime,
              maxTime: invoiceTime,
            });
          }
          const record = usageMap.get(idKey);
          record.totalQty += quantity;
          record.minTime = Math.min(record.minTime, invoiceTime);
          record.maxTime = Math.max(record.maxTime, invoiceTime);
        });
      });

    usageMap.forEach((record) => {
      const windowMs = Math.max(1, record.maxTime - record.minTime);
      record.windowDays = Math.max(1, Math.round(windowMs / (1000 * 60 * 60 * 24)) + 1);
    });

    const totalItems = products.length;
    const lowStock = products.filter((item) => Number(item.Product_stock ?? 0) <= Number(item.reorder_level ?? 0));
    const critical = lowStock.filter((item) => Number(item.Product_stock ?? 0) <= 0);

    // Only calculate alerts if lowStock alerts are enabled
    const alerts = shouldShowAlerts ? products
      .map((item) => {
        const stock = Number(item.Product_stock ?? 0);
        const threshold = Number(item.reorder_level ?? 0);
        if (!threshold && stock > 0) return null;

        const idKey = String(item.Product_id ?? item.Product_sku ?? item.ProductId ?? `sku-${item.Product_sku}`);
        const usageRecord = usageMap.get(idKey);

        let dailyUsage;
        if (usageRecord && usageRecord.totalQty > 0) {
          const windowDays = Math.max(1, usageRecord.windowDays);
          dailyUsage = usageRecord.totalQty / windowDays;
          } else {
          dailyUsage = estimateDailyUsage(stock, threshold);
        }

        if (dailyUsage <= 0) dailyUsage = estimateDailyUsage(stock, threshold);

        const projectedDays = dailyUsage > 0 ? Math.max(1, Math.round(stock / dailyUsage)) : 999;

        const status = stock <= threshold ? 'critical' : stock <= threshold * 1.25 ? 'warning' : 'normal';
        if (status === 'normal') return null;

        return {
          id: idKey,
          name: item.Product_name,
          sku: item.Product_sku,
          status,
          stock,
          threshold,
          daysRemaining: projectedDays,
          dailyUsage: Number(dailyUsage.toFixed(2)),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.daysRemaining - b.daysRemaining) : [];

    return {
      totalItems,
      lowStockCount: lowStock.length,
      criticalCount: shouldShowAlerts ? alerts.filter((alert) => alert.status === 'critical').length || critical.length : 0,
      alerts: shouldShowAlerts ? alerts : [],
    };
  }, [products, invoices, settings]);

  const alertAccent = (status) => {
    if (status === 'critical') return '#FF6B6B';
    if (status === 'warning') return '#F4A261';
    return '#2E3A8C';
  };

  const filteredDialogAlerts = alertDialog.open
    ? (alertDialog.filter === 'critical'
        ? analytics.alerts.filter((alert) => alert.status === 'critical')
        : analytics.alerts.filter((alert) => alert.status !== 'normal'))
    : [];

  const handleCloseAlertDialog = () => {
    setAlertDialog((prev) => ({ ...prev, open: false }));
    setSupplierReminder('');
  };

  const handleReorderAll = async () => {
    try {
      const itemsToReorder = filteredDialogAlerts.map(alert => ({
        name: alert.name,
        sku: alert.sku,
        stock: alert.stock,
        threshold: alert.threshold,
        status: alert.status,
        daysRemaining: alert.daysRemaining,
        recommendedQty: alert.recommendedQty || null,
      }));

      const response = await fetch(`${API_BASE}/api/reorder/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: itemsToReorder,
          filter: alertDialog.filter,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const supplierCount = result.results?.total || 1;
        setSupplierReminder(`An email has been sent to ${supplierCount} supplier(s).`);
        setSupplierReminderSnackbar(true);
      } else {
        const errorMsg = result.message || result.error || 'Unknown error';
        console.error('Reorder request error:', result);
        // Only show error in snackbar, not in dialog
        setSupplierReminder(`Failed to process reorder request: ${errorMsg}`);
        setSupplierReminderSnackbar(true);
      }
    } catch (error) {
      console.error('Error processing reorder request:', error);
      // Only show error in snackbar, not in dialog
      setSupplierReminder('Failed to process reorder request. Please try again.');
      setSupplierReminderSnackbar(true);
    }
  };

const SummaryCard = ({ icon, title, value, helper, color = '#2E3A8C', onClick }) => {
  const isInteractive = Boolean(onClick);

  return (
    <Card
      elevation={0}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={(event) => {
        if (!isInteractive) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      sx={{
        borderRadius: 3,
        border: '1px solid #e7e9ef',
        background: '#fff',
        height: '100%',
        cursor: isInteractive ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': isInteractive
          ? {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 24px rgba(46, 58, 140, 0.15)',
            }
          : undefined,
        '&:focus-visible': isInteractive
          ? {
              outline: '2px solid #2E3A8C',
              outlineOffset: '2px',
            }
          : undefined,
      }}
    >
    <CardContent
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 1.5,
        py: 3,
      }}
    >
      <Avatar sx={{ bgcolor: `${color}1A`, color, width: 60, height: 60 }}>{icon}</Avatar>
      <Box>
        <Typography color="text.secondary" variant="body2" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
          {title}
        </Typography>
        <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.2 }}>
          {value}
        </Typography>
        {helper && (
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
            {helper}
          </Typography>
        )}
      </Box>
    </CardContent>
    </Card>
  );
};

const AlertCard = ({
  alert,
  accent,
}) => (
  <Box
    sx={{
      border: '1px solid #e7e9ef',
      borderRadius: 3,
      p: 2.5,
      display: 'flex',
      flexDirection: { xs: 'column', md: 'row' },
      gap: 2,
      alignItems: { xs: 'flex-start', md: 'center' },
      background: '#fff',
      height: '100%',
      width: '100%' // Ensure consistent height
    }}
  >
    <Avatar sx={{ bgcolor: `${accent}1F`, color: accent, width: 52, height: 52, flexShrink: 0 }}>
      <ErrorOutlineIcon />
    </Avatar>
    <Box sx={{ flex: 1, minWidth: 0 }}> {/* minWidth: 0 allows text truncation */}
      <Typography 
        variant="h6" 
        fontWeight={700}
        sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '100%'
        }}
      >
        {alert.name}
      </Typography>
      <Typography 
        variant="body2" 
        color="text.secondary"
        sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '100%'
        }}
      >
        {alert.sku}
      </Typography>
      <Typography sx={{ mt: 1 }} fontWeight={600} color={accent}>
        Predicted to run out in {alert.daysRemaining} day{alert.daysRemaining > 1 ? 's' : ''}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Stock: {alert.stock} | Threshold: {alert.threshold}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, Math.max(0, (alert.threshold ? (alert.stock / alert.threshold) * 100 : 0)))}
        sx={{ mt: 2, height: 6, borderRadius: 3, bgcolor: '#f1f3f9', '& .MuiLinearProgress-bar': { bgcolor: accent } }}
      />
    </Box>
    <Stack direction={{ xs: 'row', md: 'column' }} spacing={1} sx={{ flexShrink: 0 }}>
      <Button 
        variant="contained" 
        color="error" 
        disableElevation 
        sx={{ minWidth: 140 }}
        onClick={() => {
          // Navigate to inventory page to manage stock for this item
          navigate('/inventory', { state: { highlightSku: alert.sku, highlightId: alert.id } });
        }}
      >
        Reorder Now
      </Button>
      <Button 
        variant="outlined" 
        sx={{ minWidth: 140 }}
        onClick={() => {
          // Navigate to prediction page with product ID
          navigate(`/prediction/${alert.id}`);
        }}
      >
        View Details
      </Button>
    </Stack>
  </Box>
);

  return (
    <SidebarLayout>
      <Box sx={{ maxWidth: 1400, mx: 'auto', py: 3, px: { xs: 1, md: 2 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#2E3A8C', mb: 0.5 }}>
              Dashboard
            </Typography>
            <Typography color="text.secondary" variant="subtitle1">
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<RefreshIcon />} 
            onClick={fetchData} 
            disableElevation
            sx={{ 
              bgcolor: '#2E3A8C',
              '&:hover': { bgcolor: '#1a246e' },
              py: 1.5,
              px: 3,
              borderRadius: 2
            }}
          >
            Refresh Data
          </Button>
        </Stack>

        {error && (
          <Alert severity="warning" sx={{ mb: 4, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Stack alignItems="center" spacing={2} sx={{ py: 12 }}>
            <CircularProgress size={48} thickness={4} />
            <Typography color="text.secondary" variant="h6">Loading dashboard data...</Typography>
          </Stack>
        ) : (
          <Stack spacing={4}>
            {/* Key Metrics Section */}
            <Box>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 3, color: '#2E3A8C' }}>
                Inventory Overview
              </Typography>
              <Grid container spacing={3} justifyContent="center">
                <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
                  <SummaryCard
                    icon={<InventoryIcon />}
                    title="Total Items"
                    value={analytics.totalItems}
                    helper="Active products in inventory"
                    color="#2E3A8C"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
                  <SummaryCard
                    icon={<WarningIcon />}
                    title="Low-Stock Alerts"
                    value={settings.lowStock ? analytics.lowStockCount : 0}
                    helper="Items below reorder threshold"
                    color="#F4A261"
                    onClick={() =>
                      settings.lowStock &&
                      setAlertDialog({ open: true, filter: 'low' })
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
                  <SummaryCard
                    icon={<ErrorOutlineIcon />}
                    title="Critical Items"
                    value={settings.lowStock ? analytics.criticalCount : 0}
                    helper="Urgent restock required"
                    color="#FF6B6B"
                    onClick={() =>
                      settings.lowStock &&
                      setAlertDialog({ open: true, filter: 'critical' })
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
                  <SummaryCard
                    icon={<FiberManualRecordIcon />}
                    title="Active Alerts"
                    value={settings.lowStock ? analytics.alerts.length : 0}
                    helper="AI-powered notifications"
                    color="#6C63FF"
                  />
                </Grid>

              </Grid>
            </Box>

            {/* Alerts Section */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#2E3A8C' }}>
                  AI-Powered Alerts
                </Typography>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    bgcolor: '#2E3A8C10', 
                    px: 2, 
                    py: 0.5, 
                    borderRadius: 2,
                    color: '#2E3A8C',
                    fontWeight: 600
                  }}
                >
                  {analytics.alerts.length} Active Notifications
                </Typography>
              </Box>
              
              <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e5e7eb' }}>
                <CardContent>
                  {!settings.lowStock ? (
                    <Alert 
                      severity="info" 
                      icon={<InfoIcon />}
                      sx={{ mb: 3, borderRadius: 2 }}
                    >
                      <Typography variant="subtitle1" fontWeight={600}>
                        AI-Powered Alerts Disabled
                      </Typography>
                      <Typography variant="body2">
                        AI-Powered Alerts are currently disabled in your settings. 
                        Enable "Low Stock Alerts" in the Settings page to receive notifications about low inventory items.
                      </Typography>
                    </Alert>
                  ) : (
                    <>
                      {analytics.alerts.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                          <Avatar sx={{ 
                            bgcolor: '#06D6A010', 
                            color: '#06D6A0', 
                            width: 72, 
                            height: 72, 
                            mx: 'auto', 
                            mb: 2 
                          }}>
                            <InventoryIcon sx={{ fontSize: 36 }} />
                          </Avatar>
                          <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                            All Clear!
                          </Typography>
                          <Typography color="text.secondary">
                            Your inventory is in excellent condition. No immediate action required.
                          </Typography>
                        </Box>
                      ) : (
                        <Stack spacing={3}>
                          {analytics.alerts.map((alert) => (
                            <AlertCard key={alert.id} alert={alert} accent={alertAccent(alert.status)} />
                          ))}
                        </Stack>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </Box>

            
          </Stack>
        )}
      </Box>

      <Dialog
        open={alertDialog.open}
        onClose={handleCloseAlertDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pr: 5 }}>
          {alertDialog.filter === 'critical' ? 'Critical Items' : 'Low-Stock Alerts'}
        </DialogTitle>
        <DialogContent dividers>
          {!settings.lowStock ? (
            <Alert severity="info">
              Enable low-stock alerts in Settings to view recommendations here.
            </Alert>
          ) : filteredDialogAlerts.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Avatar
                sx={{
                  bgcolor: '#06D6A010',
                  color: '#06D6A0',
                  width: 72,
                  height: 72,
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <InventoryIcon sx={{ fontSize: 36 }} />
              </Avatar>
              <Typography variant="h6" fontWeight={600}>
                All clear!
              </Typography>
              <Typography color="text.secondary">
                No {alertDialog.filter === 'critical' ? 'critical' : 'low-stock'} items right now.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2.5}>
              {filteredDialogAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} accent={alertAccent(alert.status)} />
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="error"
            onClick={handleReorderAll}
            sx={{ mr: 'auto' }}
          >
            Reorder Them All
          </Button>
          <Button onClick={handleCloseAlertDialog}>Close</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={supplierReminderSnackbar}
        autoHideDuration={4000}
        onClose={() => setSupplierReminderSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSupplierReminderSnackbar(false)} sx={{ width: '100%' }}>
          An email has been sent to supplier.
        </Alert>
      </Snackbar>
    </SidebarLayout>
  );
};

export default Dashboard;

