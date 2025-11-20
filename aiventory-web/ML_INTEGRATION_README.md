# AI-Powered Inventory Prediction Integration

This document describes the integration of the ARIMA machine learning model from the Jupyter notebook into the AIVENTORY web application.

## Overview

The ML integration provides AI-powered inventory predictions for motorcycle parts using ARIMA time series forecasting, matching the design shown in the dashboard image.

## Components

### 1. ML Backend Service (`machine-learning/services/motorcycle_inventory_forecasting_service.py`)

**Features:**
- ARIMA time series model for inventory forecasting
- Motorcycle parts-specific data (batteries, oil, brake pads, etc.)
- Stock depletion prediction with clear depletion-day estimates
- API endpoints for frontend integration

**API Endpoints:**
- `GET /api/predictions` - Get all product predictions
- `GET /api/predictions/<product_id>` - Get specific product prediction
- `GET /api/dashboard` - Get dashboard summary statistics

### 2. Enhanced Prediction Page (`src/pages/Prediction.jsx`)

**Features:**
- Dashboard-style layout matching the provided image
- ARIMA model visualization with historical and predicted data
- Confidence metrics and reorder recommendations
- Status-based color coding (critical, urgent, warning, normal)
- Interactive charts showing stock depletion over time

### 3. Dashboard Integration (`src/pages/Dashboard.jsx`)

**Updates:**
- "VIEW DETAILS" buttons now link to specific product predictions
- Maintains the exact design from the provided image
- Surfaces motorcycle parts alerts with ML-generated depletion timing

## ML Model Details

**Based on Jupyter Notebook Analysis:**
- **Model Type:** ARIMA (AutoRegressive Integrated Moving Average)
- **Performance:** 37.76% MAPE vs 79% baseline
- **Order:** (1,1,1) with automatic stationarity detection
- **Forecasting:** 30-day ahead predictions
- **Confidence:** Based on model residuals and fit quality

**Motorcycle Parts Covered:**
- BAT-YTX-001: Motorcycle Batteries
- OIL-10W40-002: Engine Oil (10W-40)
- BRK-PAD-004: Brake Pads
- FIL-AIR-003: Air Filter
- SPK-NGK-005: Spark Plugs

## Setup Instructions

### 1. Install ML Dependencies

```bash
cd ../machine-learning/services
pip install -r requirements.txt
```

### 2. Run ML Service

```bash
cd ../machine-learning/services
python run_ml_service.py
```

The service will start on `http://127.0.0.1:5200`

### 3. Frontend Integration

The prediction page is accessible via:
- Direct URL: `/prediction/<product_id>`
- Dashboard links: "VIEW DETAILS" buttons on alert cards

> **Note:** Both the web and mobile apps call the Node backend (`/api/predictions/products/:id`), which forwards requests to the shared ML service running on port 5200.

## Design Matching

The implementation exactly matches the dashboard design shown in the image:

✅ **Sidebar Navigation:** Identical layout with AIVENTORY branding
✅ **Alert Cards:** Same styling, colors, and layout as shown
✅ **Status Indicators:** Red for critical, yellow for warnings
✅ **Prediction Badges:** Alerts highlight depletion timing pulled from the ML service
✅ **Action Buttons:** "REORDER NOW" and "VIEW DETAILS" buttons
✅ **User Profile:** Admin user section at bottom of sidebar
✅ **Color Scheme:** Blue (#2E3A8C), Yellow (#FFD166), Red (#FF6B6B)

## Usage

1. **Dashboard View:** Shows summary statistics and top 3 urgent alerts
2. **Prediction Details:** Click "VIEW DETAILS" to see full ARIMA analysis
3. **ML Visualization:** Interactive charts showing historical vs predicted stock levels
4. **Action Items:** Direct reorder buttons with ML-recommended quantities

## Technical Features

- **Real-time Predictions:** ML model generates fresh predictions on each request
- **Prediction Scoring:** Depletion timing estimates derived from ARIMA forecasts
- **Status Classification:** Automatic categorization (critical/urgent/warning/normal)
- **Responsive Design:** Works on desktop and mobile devices
- **Error Handling:** Graceful fallbacks for ML service failures

This integration successfully combines the ARIMA forecasting model from the Jupyter notebook with the exact dashboard design from the provided image, creating a comprehensive AI-powered inventory management system for motorcycle parts.
