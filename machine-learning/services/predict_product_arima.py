"""
ARIMA-based prediction for a single product
Called from backend API to get restock predictions
"""

import pandas as pd
import numpy as np
import sys
import json
from datetime import datetime
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller
import warnings
import os

warnings.filterwarnings('ignore')

def test_stationarity(timeseries):
    """Test if time series is stationary"""
    try:
        result = adfuller(timeseries.dropna())
        return result[1] <= 0.05
    except:
        return False

def make_stationary(ts):
    """Make time series stationary using differencing"""
    diff = ts.diff().dropna()
    if len(diff) > 0 and not diff.isna().all():
        return diff
    return ts

def fit_arima_model(ts, max_p=3, max_d=2, max_q=3):
    """Fit ARIMA model with auto parameter selection - optimized for all products"""
    if len(ts) < 6:  # Need at least 6 data points
        return None, None, None
    
    # Make stationary if needed
    original_ts = ts.copy()
    
    # Try to make stationary
    if not test_stationarity(ts):
        ts_diff = make_stationary(ts)
        if len(ts_diff) >= 3:  # Need at least 3 points after differencing
            ts = ts_diff
            d = 1
        else:
            d = 0  # Can't difference, use original
    else:
        d = 0
    
    best_aic = np.inf
    best_model = None
    best_params = None
    
    # Try simpler models first for products with less data
    if len(ts) < 12:
        # For products with less data, try simpler models first
        param_combinations = [
            (0, d, 0),  # Random walk
            (1, d, 0),  # AR(1)
            (0, d, 1),  # MA(1)
            (1, d, 1),  # ARMA(1,1)
            (2, d, 0),  # AR(2)
            (0, d, 2),  # MA(2)
        ]
    else:
        # For products with more data, try all combinations
        param_combinations = []
        for p in range(min(max_p + 1, 3)):  # Limit to 3 for speed
            for q in range(min(max_q + 1, 3)):
                param_combinations.append((p, d, q))
    
    # Try different ARIMA parameters
    for p, d_val, q in param_combinations:
        try:
            model = ARIMA(ts, order=(p, d_val, q))
            fitted_model = model.fit()
            if fitted_model.aic < best_aic:
                best_aic = fitted_model.aic
                best_model = fitted_model
                best_params = (p, d_val, q)
        except:
            continue
    
    return best_model, best_params, original_ts

def forecast_product_sales(product_id, csv_path='../notebooks/motorparts_clean.csv', days_ahead=30):
    """Forecast sales for a specific product using ARIMA with improved data handling"""
    try:
        # Read CSV
        df = pd.read_csv(csv_path)
        # Flexible parsing to support both legacy m/d/Y and ISO Y-m-d formats
        df['transaction_date'] = pd.to_datetime(df['transaction_date'], errors='coerce')
        df = df.dropna(subset=['transaction_date'])
        
        # Filter for this product
        product_data = df[df['product_id'] == int(product_id)].copy()
        
        if len(product_data) < 3:  # Lowered threshold from 6 to 3
            return None
        
        # Group by date to get daily sales
        daily_sales = product_data.groupby('transaction_date')['transaction_qty'].sum().sort_index()
        
        # Calculate statistics for better forecasting
        total_sales = daily_sales.sum()
        total_transactions = len(product_data)  # Total number of transactions
        total_days = (daily_sales.index.max() - daily_sales.index.min()).days + 1 if len(daily_sales) > 0 else 0
        avg_daily = daily_sales.mean() if len(daily_sales) > 0 else 0
        max_daily = daily_sales.max() if len(daily_sales) > 0 else 0
        
        # Fill missing dates with 0 for time series continuity
        if len(daily_sales) > 0:
            date_range = pd.date_range(start=daily_sales.index.min(), end=daily_sales.index.max(), freq='D')
            daily_sales = daily_sales.reindex(date_range, fill_value=0)
        else:
            return None
        
        # Try ARIMA for all products with at least 6 data points
        # Lowered threshold to maximize AI predictions
        if len(daily_sales) >= 6:  # Try ARIMA even with minimal data
            # Fit ARIMA model
            model, params, original_ts = fit_arima_model(daily_sales)
            
            if model is not None:
                # ARIMA model successfully fitted
                try:
                    # Generate forecast
                    forecast = model.forecast(steps=days_ahead)
                    forecast = [max(0, float(f)) for f in forecast]
                    
                    # Calculate average daily demand from forecast
                    avg_daily_demand = np.mean(forecast)
                    
                    # Calculate forecast variability for overstocking prevention
                    forecast_std = np.std(forecast) if len(forecast) > 1 else 0
                    
                    return {
                        'forecast_demand': forecast,
                        'method': 'ARIMA',
                        'params': params,
                        'avg_daily_demand': float(avg_daily_demand),
                        'max_daily_demand': float(max_daily),
                        'forecast_std': float(forecast_std),
                        'confidence_score': 85
                    }
                except Exception as e:
                    # ARIMA forecast failed, fall through to weighted average
                    pass
            
            # ARIMA model fitting failed or forecast failed, use weighted average
            if len(daily_sales) >= 7:
                # Use last 30 days if available, otherwise use all data
                recent_data = daily_sales.tail(min(30, len(daily_sales)))
                avg_daily = recent_data.mean()
                method = 'weighted_average'
                confidence = 70
            else:
                # Use all available data
                avg_daily = daily_sales.mean()
                method = 'moving_average'
                confidence = 68
            
            forecast = [max(0, avg_daily)] * days_ahead
            return {
                'forecast_demand': forecast,
                'method': method,
                'avg_daily_demand': float(avg_daily),
                'max_daily_demand': float(max_daily),
                'confidence_score': confidence
            }
        else:
            # Less than 6 data points - use intelligent average
            # Calculate average considering active days only for better accuracy
            active_days = (daily_sales > 0).sum()
            if active_days > 0:
                avg_daily = total_sales / active_days  # Average per active day
            else:
                avg_daily = daily_sales.mean() if len(daily_sales) > 0 else 0
            
            # If we have some transactions but spread over time, use transaction frequency
            if total_transactions > 0 and total_days > 0:
                # Estimate daily rate based on transaction frequency
                transaction_rate = total_transactions / total_days
                avg_per_transaction = total_sales / total_transactions if total_transactions > 0 else 0
                estimated_daily = transaction_rate * avg_per_transaction
                # Use the higher of the two estimates
                avg_daily = max(avg_daily, estimated_daily)
            
            forecast = [max(0, avg_daily)] * days_ahead
            return {
                'forecast_demand': forecast,
                'method': 'intelligent_average',
                'avg_daily_demand': float(avg_daily),
                'max_daily_demand': float(max_daily),
                'confidence_score': 65
            }
            
    except Exception as e:
        return None

def calculate_restock_suggestion(forecast_result, current_stock, reorder_level, lead_time_days=7, safety_days=14):
    """Calculate restock suggestion based on ARIMA forecast, avoiding overstocking and understocking"""
    if not forecast_result:
        return None
    
    avg_daily_demand = forecast_result.get('avg_daily_demand', 0)
    max_daily_demand = forecast_result.get('max_daily_demand', avg_daily_demand)
    forecast_std = forecast_result.get('forecast_std', 0)
    
    # Calculate days until depletion
    days_until_depletion = None
    if avg_daily_demand > 0:
        days_until_depletion = int(np.ceil(current_stock / avg_daily_demand)) if current_stock > 0 else 0
    
    # Calculate required stock for lead time + safety days
    # Use average demand for base calculation
    total_days = lead_time_days + safety_days
    base_required_stock = avg_daily_demand * total_days
    
    # Add buffer for demand variability (to prevent understocking)
    # Use standard deviation if available, otherwise use 20% of average
    if forecast_std > 0:
        variability_buffer = min(forecast_std * 1.5, avg_daily_demand * 0.3)  # Cap at 30% of average
    else:
        variability_buffer = avg_daily_demand * 0.2  # 20% buffer
    
    required_stock = base_required_stock + (variability_buffer * total_days)
    
    # Calculate maximum reasonable stock to prevent overstocking
    # Based on maximum historical demand + 2 months buffer
    max_reasonable_stock = max_daily_demand * (total_days + 60)  # 60 days extra buffer
    max_reasonable_stock = max(max_reasonable_stock, reorder_level * 5)  # At least 5x reorder level
    
    # Suggested restock quantity
    suggested_quantity = max(0, int(np.ceil(required_stock - current_stock)))
    
    # Prevent overstocking: cap at maximum reasonable stock
    max_restock = max_reasonable_stock - current_stock
    if suggested_quantity > max_restock:
        suggested_quantity = max(0, int(max_restock))
    
    # Ensure minimum restock quantity (prevent understocking)
    if suggested_quantity < reorder_level:
        suggested_quantity = reorder_level
    
    # Additional check: if current stock is already above required, suggest minimal restock
    if current_stock >= required_stock:
        # Only restock if we're very close to depletion
        if days_until_depletion and days_until_depletion <= (lead_time_days + 3):
            suggested_quantity = max(reorder_level, int(np.ceil(avg_daily_demand * (lead_time_days + 3))))
        else:
            suggested_quantity = 0  # No restock needed
    
    # Calculate optimal stock level (target after restocking)
    optimal_stock = current_stock + suggested_quantity
    
    return {
        'suggested_quantity': suggested_quantity,
        'days_until_stockout': days_until_depletion,
        'daily_demand': float(avg_daily_demand),
        'max_daily_demand': float(max_daily_demand),
        'reorder_point': int(np.ceil(avg_daily_demand * (lead_time_days + safety_days))),
        'safety_stock': int(np.ceil(avg_daily_demand * safety_days)),
        'optimal_stock': int(optimal_stock),
        'max_reasonable_stock': int(max_reasonable_stock),
        'current_stock': current_stock,
        'overstocking_risk': 'low' if optimal_stock <= max_reasonable_stock else 'medium',
        'understocking_risk': 'low' if days_until_depletion and days_until_depletion > (lead_time_days + safety_days) else 'high' if days_until_depletion and days_until_depletion <= lead_time_days else 'medium'
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Product ID required'}))
        sys.exit(1)
    
    product_id = sys.argv[1]
    current_stock = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    reorder_level = int(sys.argv[3]) if len(sys.argv) > 3 else 10
    
    # Get forecast
    forecast_result = forecast_product_sales(product_id, days_ahead=30)
    
    if forecast_result:
        # Calculate restock suggestion
        restock_data = calculate_restock_suggestion(
            forecast_result, 
            current_stock, 
            reorder_level
        )
        
        result = {
            'success': True,
            'product_id': product_id,
            'forecast': forecast_result,
            'restock': restock_data,
            'prediction_method': 'ARIMA'
        }
    else:
        result = {
            'success': False,
            'error': 'Insufficient data for ARIMA forecast',
            'product_id': product_id
        }
    
    print(json.dumps(result))

