"""
Batch process AI predictions for all 130 products
"""

import pandas as pd
import json
import sys
import os
from predict_product_arima import forecast_product_sales, calculate_restock_suggestion

def predict_all_products():
    """Generate AI predictions for all products"""
    csv_path = '../notebooks/motorparts_clean.csv'
    
    # Read CSV to get all unique products
    df = pd.read_csv(csv_path)
    df['transaction_date'] = pd.to_datetime(df['transaction_date'], format='%m/%d/%Y', errors='coerce')
    df = df.dropna(subset=['transaction_date'])
    
    unique_products = sorted(df['product_id'].unique())
    
    print("="*80)
    print("AI PREDICTION BATCH PROCESSING FOR ALL PRODUCTS")
    print("="*80)
    print(f"Total products to process: {len(unique_products)}")
    print("="*80)
    print()
    
    results = []
    successful = 0
    failed = 0
    
    # Default values (can be customized)
    default_current_stock = 0
    default_reorder_level = 10
    
    for idx, product_id in enumerate(unique_products, 1):
        try:
            # Get product info
            product_data = df[df['product_id'] == product_id]
            product_name = product_data['product_name'].iloc[0] if len(product_data) > 0 else f"Product {product_id}"
            
            # Get forecast
            forecast_result = forecast_product_sales(product_id, csv_path, days_ahead=30)
            
            if forecast_result:
                # Calculate restock suggestion
                restock_data = calculate_restock_suggestion(
                    forecast_result,
                    default_current_stock,
                    default_reorder_level
                )
                
                if restock_data:
                    result = {
                        'success': True,
                        'product_id': product_id,
                        'product_name': product_name,
                        'forecast': forecast_result,
                        'restock': restock_data,
                        'prediction_method': 'ARIMA' if forecast_result.get('method') == 'ARIMA' else 'AI-Enhanced'
                    }
                    results.append(result)
                    successful += 1
                    
                    method = forecast_result.get('method', 'unknown')
                    suggested_qty = restock_data.get('suggested_quantity', 0)
                    avg_daily = forecast_result.get('avg_daily_demand', 0)
                    
                    print(f"[{idx:3d}/{len(unique_products)}] ✅ Product {product_id:3d}: {product_name[:40]:<40} | "
                          f"Method: {method:<15} | Restock: {suggested_qty:3d} units | Daily: {avg_daily:.2f}")
                else:
                    failed += 1
                    print(f"[{idx:3d}/{len(unique_products)}] ❌ Product {product_id:3d}: {product_name[:40]:<40} | "
                          f"Failed to calculate restock")
            else:
                failed += 1
                print(f"[{idx:3d}/{len(unique_products)}] ⚠️  Product {product_id:3d}: {product_name[:40]:<40} | "
                      f"Insufficient data for prediction")
                
        except Exception as e:
            failed += 1
            print(f"[{idx:3d}/{len(unique_products)}] ❌ Product {product_id:3d}: Error - {str(e)[:50]}")
            continue
    
    # Summary
    print()
    print("="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Total products processed: {len(unique_products)}")
    print(f"✅ Successful predictions: {successful} ({successful/len(unique_products)*100:.1f}%)")
    print(f"❌ Failed/Insufficient data: {failed} ({failed/len(unique_products)*100:.1f}%)")
    
    # Method breakdown
    if results:
        print()
        print("="*80)
        print("PREDICTION METHODS USED")
        print("="*80)
        method_counts = {}
        for r in results:
            method = r['forecast'].get('method', 'unknown')
            method_counts[method] = method_counts.get(method, 0) + 1
        
        for method, count in sorted(method_counts.items(), key=lambda x: x[1], reverse=True):
            print(f"{method}: {count} products ({count/len(results)*100:.1f}%)")
    
    # Save results to JSON file
    output_file = 'all_products_predictions.json'
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print()
    print(f"✅ Results saved to: {output_file}")
    print(f"   Total predictions: {len(results)}")
    
    return results

if __name__ == "__main__":
    results = predict_all_products()

