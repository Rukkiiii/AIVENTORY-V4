"""
Advanced ARIMA-Based Restock Prediction System
Forecasts monthly sales and provides restock recommendations
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller
import warnings
import os
from dotenv import load_dotenv

warnings.filterwarnings('ignore')

def test_stationarity(timeseries):
    """Test if time series is stationary using Augmented Dickey-Fuller test"""
    try:
        result = adfuller(timeseries.dropna())
        return result[1] <= 0.05  # p-value <= 0.05 means stationary
    except:
        return False

def make_stationary(ts):
    """Make time series stationary using differencing"""
    diff = ts.diff().dropna()
    if len(diff) > 0 and not diff.isna().all():
        return diff
    return ts

def fit_arima_model(ts, max_p=3, max_d=2, max_q=3):
    """Fit ARIMA model with auto parameter selection"""
    if len(ts) < 12:  # Need at least 12 data points
        return None, None
    
    # Make stationary if needed
    if not test_stationarity(ts):
        ts = make_stationary(ts)
        d = 1
    else:
        d = 0
    
    best_aic = np.inf
    best_model = None
    best_params = None
    
    # Try different ARIMA parameters
    for p in range(max_p + 1):
        for q in range(max_q + 1):
            try:
                model = ARIMA(ts, order=(p, d, q))
                fitted_model = model.fit()
                if fitted_model.aic < best_aic:
                    best_aic = fitted_model.aic
                    best_model = fitted_model
                    best_params = (p, d, q)
            except:
                continue
    
    return best_model, best_params

def forecast_product(product_id, product_name, monthly_sales, months_ahead=12):
    """Forecast sales for a specific product"""
    if len(monthly_sales) < 6:  # Need minimum data
        return None
    
    try:
        # Fit ARIMA model
        model, params = fit_arima_model(monthly_sales)
        
        if model is None:
            # Fallback: use simple moving average
            forecast = [monthly_sales.mean()] * months_ahead
            return {
                'forecast': forecast,
                'method': 'moving_average',
                'params': None
            }
        
        # Generate forecast
        forecast = model.forecast(steps=months_ahead)
        forecast = [max(0, f) for f in forecast]  # Ensure non-negative
        
        return {
            'forecast': forecast,
            'method': 'ARIMA',
            'params': params,
            'model_aic': model.aic
        }
    except Exception as e:
        # Fallback: use average
        avg_sales = monthly_sales.mean()
        return {
            'forecast': [avg_sales] * months_ahead,
            'method': 'average',
            'params': None,
            'error': str(e)
        }

def calculate_restock_quantity(forecast, current_stock, reorder_level, lead_time_days=7, safety_days=14):
    """Calculate recommended restock quantity"""
    # Average daily demand from forecast
    avg_monthly_demand = np.mean(forecast)
    avg_daily_demand = avg_monthly_demand / 30
    
    # Calculate days of supply needed
    total_days = lead_time_days + safety_days
    required_stock = avg_daily_demand * total_days
    
    # Recommended restock quantity
    restock_qty = max(0, required_stock - current_stock)
    
    # Round up to nearest integer
    return int(np.ceil(restock_qty))

def analyze_restock_predictions():
    """Main analysis function"""
    
    print("=" * 80)
    print("ARIMA-BASED ADVANCED RESTOCK PREDICTION SYSTEM")
    print("=" * 80)
    
    # Load data - adjust path for new location
    csv_path = '../notebooks/motorparts_clean.csv'
    print(f"\n📖 Loading sales data from: {csv_path}")
    
    try:
        df = pd.read_csv(csv_path)
        print(f"✅ Loaded {len(df):,} transactions")
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        return
    
    # Convert dates
    df['transaction_date'] = pd.to_datetime(df['transaction_date'], format='%m/%d/%Y', errors='coerce')
    df = df.dropna(subset=['transaction_date'])
    
    # Create year-month column
    df['year_month'] = df['transaction_date'].dt.to_period('M')
    
    # Get all products by revenue (all 130 products)
    product_revenue = df.groupby(['product_id', 'product_name']).apply(
        lambda x: (x['transaction_qty'] * x['unit_price']).sum()
    ).sort_values(ascending=False)
    
    all_products = product_revenue  # Process all products
    print(f"\n📊 Analyzing all {len(all_products)} products...")
    
    # Get all unique months in the data
    all_months = pd.period_range(
        start=df['year_month'].min(),
        end=df['year_month'].max(),
        freq='M'
    )
    
    # Forecast next 12 months
    forecast_start = df['year_month'].max() + 1
    forecast_months = pd.period_range(
        start=forecast_start,
        periods=12,
        freq='M'
    )
    
    print(f"\n📅 Historical data: {df['year_month'].min()} to {df['year_month'].max()}")
    print(f"🔮 Forecasting: {forecast_months[0]} to {forecast_months[-1]}")
    
    # Store all predictions
    all_predictions = {}
    restock_plan = {}
    
    print(f"\n🔄 Generating ARIMA forecasts for all {len(all_products)} products...")
    print("   " + "-" * 70)
    
    for idx, ((product_id, product_name), total_revenue) in enumerate(all_products.items(), 1):
        # Get monthly sales for this product
        product_data = df[df['product_id'] == product_id].copy()
        monthly_sales = product_data.groupby('year_month')['transaction_qty'].sum()
        
        # Fill missing months with 0
        monthly_sales = monthly_sales.reindex(all_months, fill_value=0)
        
        # Forecast
        forecast_result = forecast_product(product_id, product_name, monthly_sales, months_ahead=12)
        
        if forecast_result:
            all_predictions[product_id] = {
                'product_name': product_name,
                'forecast': forecast_result['forecast'],
                'method': forecast_result['method'],
                'params': forecast_result.get('params'),
                'historical_avg': monthly_sales.mean(),
                'total_revenue': total_revenue
            }
            
            # Calculate restock quantities for each month
            monthly_restock = []
            for month_idx, forecast_qty in enumerate(forecast_result['forecast']):
                # Assume current stock is at reorder_level (10) for calculation
                reorder_level = 10
                restock_qty = calculate_restock_quantity(
                    [forecast_qty], 
                    reorder_level, 
                    reorder_level,
                    lead_time_days=7,
                    safety_days=14
                )
                monthly_restock.append({
                    'month': forecast_months[month_idx],
                    'forecasted_sales': forecast_qty,
                    'restock_qty': restock_qty
                })
            
            restock_plan[product_id] = {
                'product_name': product_name,
                'monthly_plan': monthly_restock,
                'total_revenue': total_revenue
            }
            
            print(f"   {idx:>2}. {product_name[:40]:<40} | Method: {forecast_result['method']:<12} | Avg: {monthly_sales.mean():>6.1f}")
    
    # ========== GENERATE MONTHLY RESTOCK PLAN ==========
    print("\n" + "=" * 80)
    print("MONTHLY RESTOCK PLAN (Next 12 Months)")
    print("=" * 80)
    
    # Aggregate by month
    monthly_summary = {}
    for month in forecast_months:
        monthly_summary[month] = {
            'total_forecasted_sales': 0,
            'total_restock_qty': 0,
            'products': []
        }
    
    for product_id, plan in restock_plan.items():
        for month_plan in plan['monthly_plan']:
            month = month_plan['month']
            monthly_summary[month]['total_forecasted_sales'] += month_plan['forecasted_sales']
            monthly_summary[month]['total_restock_qty'] += month_plan['restock_qty']
            monthly_summary[month]['products'].append({
                'product_id': product_id,
                'product_name': plan['product_name'],
                'forecast': month_plan['forecasted_sales'],
                'restock': month_plan['restock_qty']
            })
    
    # Identify spikes and dips
    avg_monthly_sales = np.mean([m['total_forecasted_sales'] for m in monthly_summary.values()])
    spike_threshold = avg_monthly_sales * 1.2  # 20% above average
    dip_threshold = avg_monthly_sales * 0.8   # 20% below average
    
    print("\n📊 Monthly Forecast Summary:")
    print("   " + "-" * 70)
    print(f"   {'Month':<12} | {'Forecasted Sales':>18} | {'Restock Qty':>15} | {'Status':<15}")
    print("   " + "-" * 70)
    
    spike_months = []
    dip_months = []
    
    for month in forecast_months:
        summary = monthly_summary[month]
        forecasted = summary['total_forecasted_sales']
        restock = summary['total_restock_qty']
        
        if forecasted >= spike_threshold:
            status = "🔺 SPIKE"
            spike_months.append(month)
        elif forecasted <= dip_threshold:
            status = "🔻 DIP"
            dip_months.append(month)
        else:
            status = "➡️ NORMAL"
        
        print(f"   {str(month):<12} | {forecasted:>18.1f} | {restock:>15.0f} | {status:<15}")
    
    # ========== DETAILED PRODUCT RESTOCK PLAN ==========
    print("\n" + "=" * 80)
    print(f"DETAILED PRODUCT RESTOCK PLAN (All {len(restock_plan)} Products)")
    print("=" * 80)
    
    # Show top 20 by revenue for detailed view, but process all
    sorted_restock_plan = sorted(restock_plan.items(), key=lambda x: x[1]['total_revenue'], reverse=True)
    for idx, (product_id, plan) in enumerate(sorted_restock_plan[:20], 1):  # Show top 20 for readability
        print(f"\n{idx}. {plan['product_name']} (Product ID: {product_id})")
        print(f"   Total Revenue: ₱{plan['total_revenue']:,.2f}")
        print(f"   {'Month':<12} | {'Forecasted':>12} | {'Restock Qty':>12}")
        print("   " + "-" * 40)
        
        for month_plan in plan['monthly_plan']:
            print(f"   {str(month_plan['month']):<12} | {month_plan['forecasted_sales']:>12.1f} | {month_plan['restock_qty']:>12.0f}")
    
    # ========== ACTIONABLE RECOMMENDATIONS ==========
    print("\n" + "=" * 80)
    print("ACTIONABLE RESTOCK RECOMMENDATIONS")
    print("=" * 80)
    
    print("\n1. 🔺 SALES SPIKE MONTHS - Early Restocking Required:")
    print("   " + "-" * 70)
    if spike_months:
        for month in spike_months:
            summary = monthly_summary[month]
            print(f"   📅 {month}:")
            print(f"      - Forecasted Sales: {summary['total_forecasted_sales']:.1f} units")
            print(f"      - Recommended Restock: {summary['total_restock_qty']:.0f} units")
            print(f"      - Action: Restock 2-3 weeks BEFORE this month")
            print(f"      - Top Products to Prioritize:")
            top_products = sorted(summary['products'], key=lambda x: x['forecast'], reverse=True)[:5]
            for p in top_products:
                print(f"        • {p['product_name'][:35]:<35} | Forecast: {p['forecast']:.1f} | Restock: {p['restock']:.0f}")
    else:
        print("   No significant spikes detected in forecast period.")
    
    print("\n2. 🔻 SALES DIP MONTHS - Reduce Restocking:")
    print("   " + "-" * 70)
    if dip_months:
        for month in dip_months:
            summary = monthly_summary[month]
            print(f"   📅 {month}:")
            print(f"      - Forecasted Sales: {summary['total_forecasted_sales']:.1f} units")
            print(f"      - Recommended Restock: {summary['total_restock_qty']:.0f} units")
            print(f"      - Action: Reduce restocking by 20-30% to avoid overstocking")
    else:
        print("   No significant dips detected in forecast period.")
    
    print(f"\n3. 📦 ALL {len(all_predictions)} PRODUCTS RESTOCK PRIORITY (Top 30 shown):")
    print("   " + "-" * 70)
    print(f"   {'Rank':<5} | {'Product Name':<40} | {'Avg Monthly Forecast':>20} | {'Priority':<10}")
    print("   " + "-" * 70)
    
    product_priorities = []
    for product_id, pred in all_predictions.items():
        avg_forecast = np.mean(pred['forecast'])
        product_priorities.append({
            'product_id': product_id,
            'product_name': pred['product_name'],
            'avg_forecast': avg_forecast,
            'revenue': pred['total_revenue']
        })
    
    product_priorities.sort(key=lambda x: x['avg_forecast'], reverse=True)
    
    # Show top 30 for readability, but all products are processed
    for idx, p in enumerate(product_priorities[:30], 1):
        if p['avg_forecast'] >= 30:
            priority = "HIGH"
        elif p['avg_forecast'] >= 15:
            priority = "MEDIUM"
        else:
            priority = "LOW"
        
        print(f"   {idx:>4} | {p['product_name'][:40]:<40} | {p['avg_forecast']:>20.1f} | {priority:<10}")
    
    print("\n4. 🎯 OPTIMIZATION STRATEGIES:")
    print("   " + "-" * 70)
    print("   a) Seasonal Preparation:")
    print("      - Prepare for spikes 2-3 weeks in advance")
    print("      - Increase safety stock during high-demand months")
    print("      - Reduce orders during low-demand months")
    
    print("\n   b) Product Focus:")
    print(f"      - All {len(all_predictions)} products have been analyzed with AI predictions")
    print("      - Prioritize restocking for high-forecast products")
    print("      - Maintain higher safety stock for consistently selling products")
    print("      - Monitor high-demand products daily during spike months")
    
    print("\n   c) Inventory Management:")
    print("      - Use ARIMA forecasts to set dynamic reorder points")
    print("      - Adjust lead times based on forecasted demand")
    print("      - Implement just-in-time restocking for high-velocity items")
    
    print("\n   d) Risk Mitigation:")
    print("      - Maintain buffer stock for top 10 products")
    print("      - Diversify suppliers for critical items")
    print("      - Review forecasts monthly and adjust as needed")
    
    # ========== EXPORT RECOMMENDATIONS ==========
    print("\n" + "=" * 80)
    print("SUMMARY STATISTICS")
    print("=" * 80)
    
    total_forecasted = sum([m['total_forecasted_sales'] for m in monthly_summary.values()])
    total_restock = sum([m['total_restock_qty'] for m in monthly_summary.values()])
    
    print(f"\n   Total Forecasted Sales (12 months): {total_forecasted:,.1f} units")
    print(f"   Total Recommended Restock (12 months): {total_restock:,.0f} units")
    print(f"   Average Monthly Forecast: {total_forecasted / 12:,.1f} units")
    print(f"   Average Monthly Restock: {total_restock / 12:,.0f} units")
    print(f"   Spike Months Identified: {len(spike_months)}")
    print(f"   Dip Months Identified: {len(dip_months)}")
    
    print("\n" + "=" * 80)
    print("✅ ARIMA RESTOCK PREDICTION ANALYSIS COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    try:
        analyze_restock_predictions()
    except Exception as e:
        print(f"\n❌ Error during analysis: {e}")
        import traceback
        traceback.print_exc()

