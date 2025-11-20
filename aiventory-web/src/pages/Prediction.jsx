//Prediction.jsx - Enhanced with ML Integration
import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  Button,
  Paper,
  Stack,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NotificationImportantIcon from '@mui/icons-material/NotificationImportant';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import SidebarLayout from '../components/SidebarLayout';

export default function Prediction() {
  const { productId } = useParams();
  const [predictionData, setPredictionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  
  // Fetch prediction data from shared ML integration service
  useEffect(() => {
    const fetchPredictionData = async () => {
      try {
        setLoading(true);

        const targetProductId = productId || 'BRK-PAD-004';
        const response = await fetch(`http://127.0.0.1:5001/api/predictions/products/${targetProductId}`);

        if (!response.ok) {
          throw new Error(`Prediction API responded with ${response.status}`);
        }

        const result = await response.json();

        if (!result?.success) {
          throw new Error(result?.error || 'Prediction service unavailable');
        }

        const actualStock = Number(result.current_stock ?? 0);
        const actualThreshold = Number(result.threshold ?? 0);
        const productName = result.product_name || `Product ${targetProductId}`;
        const category = result.product_category || 'Unknown';

        const depletionInfo = result.depletion_prediction || {};
        const reorderInfo = result.reorder_suggestion || {};
        const forecastInfo = result.forecast || {};
        const predictionInfo = result.prediction || {};

        const mappedStatus = (() => {
          if (actualStock <= 0) return 'out_of_stock';
          if (predictionInfo.status === 'At Risk' || actualStock <= actualThreshold) return 'critical';
          if (predictionInfo.status === 'Warning') return 'warning';
          if (predictionInfo.status === 'Good') return 'normal';
          return 'normal';
        })();

        const depletionDays = Number.isFinite(depletionInfo.depletion_days)
          ? depletionInfo.depletion_days
          : null;

        const depletionDate = (() => {
          if (depletionInfo.depletion_date) {
            return new Date(depletionInfo.depletion_date).toLocaleDateString();
          }
          if (depletionDays) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + depletionDays);
            return futureDate.toLocaleDateString();
          }
          return null;
        })();

        const recommendedQty = reorderInfo.suggested_quantity || Math.max(20, actualThreshold * 2);
        const shouldShowAlert = ['critical', 'warning', 'out_of_stock'].includes(mappedStatus);

        const forecastDemand = Array.isArray(forecastInfo.forecast_demand)
          ? forecastInfo.forecast_demand
          : [];
        const cumulativeDemand = Array.isArray(forecastInfo.cumulative_demand)
          ? forecastInfo.cumulative_demand
          : [];
        
        const transformedData = {
          product_id: result.product_sku || targetProductId,
          product_name: productName,
          current_stock: actualStock,
          threshold: actualThreshold,
          category,
          depletion_days: shouldShowAlert ? depletionDays : null,
          depletion_date: shouldShowAlert ? depletionDate : null,
          recommended_reorder_qty: recommendedQty,
          status: mappedStatus,
          forecast_demand: forecastDemand,
          cumulative_demand: cumulativeDemand,
          prediction_method: depletionInfo.prediction_method || predictionInfo.prediction_method || 'calculated',
          using_ai: result.using_ai || false,
          last_updated: result.last_updated || new Date().toISOString()
        };

        setPredictionData(transformedData);

        // Generate chart data combining historical simulation and ML forecast
        const chartDataPoints = [];
        const historicalMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
        const startStock = Math.min(actualStock * 1.5, 150);

        historicalMonths.forEach((month, index) => {
          const decline = (startStock - actualStock) / historicalMonths.length;
          const stockLevel = Math.max(actualStock, startStock - (index * decline));
          chartDataPoints.push({
            month,
            stock: Math.round(stockLevel),
            prediction: null,
            threshold: actualThreshold
          });
        });

        chartDataPoints.push({
          month: 'Dec',
          stock: actualStock,
          prediction: null,
          threshold: actualThreshold
        });

        if (forecastDemand.length > 0) {
          const futureMonths = ['Jan+', 'Feb+', 'Mar+', 'Apr+', 'May+', 'Jun+'];
          futureMonths.forEach((month, index) => {
            const cumulativeValue = cumulativeDemand[index] ??
              forecastDemand.slice(0, index + 1).reduce((acc, value) => acc + (Number(value) || 0), 0);
            const predictedStock = Math.max(0, actualStock - cumulativeValue);
            chartDataPoints.push({
              month,
              stock: null,
              prediction: Math.round(predictedStock),
              threshold: actualThreshold
            });
          });
        } else if (shouldShowAlert && depletionDays) {
          const avgDailyUsage = reorderInfo.predicted_daily_demand || Math.max(1, Math.ceil(actualStock / 30));
          const futureMonths = ['Jan+', 'Feb+', 'Mar+', 'Apr+', 'May+', 'Jun+'];
          futureMonths.forEach((month, index) => {
            const daysAhead = (index + 1) * 30;
            if (daysAhead <= depletionDays) {
              const predictedStock = Math.max(0, actualStock - (avgDailyUsage * daysAhead));
              chartDataPoints.push({
                month,
                stock: null,
                prediction: Math.round(predictedStock),
                threshold: actualThreshold
              });
            }
          });
        }

        setChartData(chartDataPoints);
      } catch (error) {
        console.error('Error fetching prediction data:', error);

        const errorData = {
          product_id: productId || 'P0008',
          product_name: 'Product (API Error)',
          current_stock: 0,
          threshold: 10,
          category: 'Unknown',
          depletion_days: null,
          depletion_date: 'Unable to predict',
          recommended_reorder_qty: 50,
          status: 'error',
          forecast_demand: [],
          cumulative_demand: [],
          last_updated: new Date().toISOString()
        };

        setPredictionData(errorData);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPredictionData();
  }, [productId]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return '#FF6B6B';
      case 'urgent': return '#FF6B6B';
      case 'warning': return '#FFD166';
      case 'normal': return '#06D6A0';
      case 'out_of_stock': return '#DC2626';
      case 'error': return '#9CA3AF';
      default: return '#06D6A0';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'critical':
      case 'urgent':
      case 'out_of_stock':
        return <ErrorIcon sx={{ fontSize: 32 }} />;
      case 'warning':
        return <WarningIcon sx={{ fontSize: 32 }} />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: 32 }} />;
      default:
        return <NotificationImportantIcon sx={{ fontSize: 32 }} />;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Typography>Loading AI predictions...</Typography>
        </Box>
      );
    }

    if (!predictionData) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Typography>No prediction data available</Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
            <Typography variant="h4" fontWeight={700} sx={{ color: '#2E3A8C' }}>
              AI-Powered Prediction
            </Typography>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              component={Link}
              to="/inventory"
              sx={{ 
                borderRadius: 2, 
                fontWeight: 600,
                borderColor: '#2E3A8C',
                color: '#2E3A8C',
                '&:hover': {
                  borderColor: '#1a246e',
                  backgroundColor: 'rgba(46, 58, 140, 0.05)'
                }
              }}
            >
              Back to Inventory
            </Button>
          </Box>

          {/* Item Details */}
          <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 3, border: '1px solid #e7e9ef' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h5" fontWeight={700} sx={{ color: '#2E3A8C' }}>
                {predictionData.product_name} (SKU: {predictionData.product_id})
              </Typography>
              <Chip
                label={predictionData.status.toUpperCase()}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: '#fff',
                  background: getStatusColor(predictionData.status),
                  borderRadius: 2,
                }}
              />
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4}>
              <Box>
                <Typography fontWeight={600} color="#2E3A8C">Current Stock:</Typography>
                <Typography variant="h6" fontWeight={700}>{predictionData.current_stock} units</Typography>
              </Box>
              <Box>
                <Typography fontWeight={600} color="#2E3A8C">Reorder Threshold:</Typography>
                <Typography variant="h6" fontWeight={700}>{predictionData.threshold} units</Typography>
              </Box>
              <Box>
                <Typography fontWeight={600} color="#2E3A8C">Category:</Typography>
                <Typography variant="h6" fontWeight={700}>{predictionData.category}</Typography>
              </Box>
            </Stack>
          </Paper>

          {/* AI Prediction Alert */}
          <Paper elevation={0} sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 3, 
            borderLeft: `6px solid ${getStatusColor(predictionData.status)}`,
            background: predictionData.status === 'normal' ? '#f0fdf4' : 
                        (predictionData.status === 'critical' || predictionData.status === 'out_of_stock' ? '#fff7f7' : '#fff8f0'),
            border: '1px solid #e7e9ef'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ bgcolor: getStatusColor(predictionData.status), width: 48, height: 48, mr: 2 }}>
                {getStatusIcon(predictionData.status)}
              </Avatar>
              <Typography variant="h6" fontWeight={800} sx={{ color: getStatusColor(predictionData.status) }}>
                AI Model Prediction Alert
              </Typography>
            </Box>
            
            <Typography sx={{ mb: 3, fontSize: '1.1rem' }}>
              {predictionData.status === 'out_of_stock' ? (
                <>This item is currently <strong>out of stock</strong> and needs immediate restocking.</>
              ) : predictionData.status === 'error' ? (
                <>Unable to generate prediction due to insufficient data or an AI service error.</>
              ) : predictionData.status === 'critical' || predictionData.status === 'warning' ? (
                predictionData.depletion_days ? (
                  <>Based on AI analysis of recent demand, this item is predicted to run out of stock in{' '}
                  <strong>{predictionData.depletion_days} days</strong>.</>
                ) : (
                  <>This item is <strong>{predictionData.status === 'critical' ? 'below' : 'near'} the reorder threshold</strong> and may need restocking soon.</>
                )
              ) : (
                <>Our AI model indicates <strong>sufficient stock levels</strong> ({predictionData.current_stock} units, threshold: {predictionData.threshold}) and no immediate reorder is needed.</>
              )}
            </Typography>

            {predictionData.depletion_date && (
              <Box sx={{ mb: 3 }}>
                <Typography fontWeight={600} color="#2E3A8C" sx={{ mb: 1 }}>Predicted Depletion Date:</Typography>
                <Typography variant="h6" fontWeight={700}>{predictionData.depletion_date}</Typography>
              </Box>
            )}

            {predictionData.last_updated && (
              <Typography sx={{ fontSize: '0.9rem', color: '#6C757D', mb: 2 }}>
                Last updated: {new Date(predictionData.last_updated).toLocaleString()}
              </Typography>
            )}

          </Paper>
      </Box>
    );
  };

  return (
    <SidebarLayout>
      {renderContent()}
    </SidebarLayout>
  );
}