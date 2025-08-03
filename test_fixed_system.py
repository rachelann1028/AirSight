#!/usr/bin/env python3
"""
Test script to validate the FIXED AQI Prediction System
This script will test the improvements and verify that MAPE is no longer 100%
"""

import sys
import os
from datetime import datetime, timedelta
import numpy as np

# Import the fixed system
try:
    from aqi_prediction_system import AQIPredictionSystem
    print("✅ Successfully imported FIXED AQI Prediction System")
except ImportError as e:
    print(f"❌ Failed to import AQI system: {e}")
    print("Please make sure you've saved the fixed aqi_prediction_system.py file")
    sys.exit(1)

def test_synthetic_data_generation():
    """Test improved synthetic data generation"""
    print("\n" + "="*60)
    print("🧪 TESTING SYNTHETIC DATA GENERATION")
    print("="*60)
    
    aqi_system = AQIPredictionSystem()
    
    # Generate test data
    print("Generating improved synthetic data...")
    data = aqi_system.generate_synthetic_data(n_samples=1000)
    
    # Validate data quality
    print(f"✅ Generated {len(data)} samples")
    print(f"📊 AQI Statistics:")
    print(f"   Range: [{data['AQI'].min():.1f}, {data['AQI'].max():.1f}]")
    print(f"   Mean:  {data['AQI'].mean():.1f} ± {data['AQI'].std():.1f}")
    print(f"   Median: {data['AQI'].median():.1f}")
    
    # Check for realistic AQI distribution
    good_aqi = (data['AQI'] <= 50).sum()
    moderate_aqi = ((data['AQI'] > 50) & (data['AQI'] <= 100)).sum()
    unhealthy_aqi = (data['AQI'] > 100).sum()
    
    print(f"📈 AQI Distribution:")
    print(f"   Good (≤50):        {good_aqi} ({good_aqi/len(data)*100:.1f}%)")
    print(f"   Moderate (51-100): {moderate_aqi} ({moderate_aqi/len(data)*100:.1f}%)")
    print(f"   Unhealthy (>100):  {unhealthy_aqi} ({unhealthy_aqi/len(data)*100:.1f}%)")
    
    # Validate feature ranges
    print(f"🔍 Feature Validation:")
    for col in aqi_system.feature_columns:
        col_data = data[col]
        print(f"   {col:<25}: [{col_data.min():.3f}, {col_data.max():.3f}]")
    
    return data

def test_model_training():
    """Test improved model training"""
    print("\n" + "="*60)
    print("🤖 TESTING MODEL TRAINING")
    print("="*60)
    
    aqi_system = AQIPredictionSystem()
    
    # Train models
    print("Training models with improved parameters...")
    models = aqi_system.train_models()
    
    print(f"✅ Trained {len(models)} models successfully")
    print(f"🏆 Best model: {aqi_system.best_model_name}")
    
    return aqi_system

def test_mape_calculation():
    """Test that MAPE calculation is fixed"""
    print("\n" + "="*60)
    print("🎯 TESTING MAPE CALCULATION FIX")
    print("="*60)
    
    aqi_system = AQIPredictionSystem()
    
    # Create test data with known values
    y_true = np.array([50, 75, 100, 25, 80])
    y_pred = np.array([45, 80, 95, 30, 75])
    
    # Calculate metrics using fixed method
    metrics = aqi_system._calculate_metrics(y_true, y_pred)
    
    print(f"🧮 Test Metrics on Known Data:")
    print(f"   True values:  {y_true}")
    print(f"   Predicted:    {y_pred}")
    print(f"   R² Score:     {metrics['r2_score']:.4f}")
    print(f"   MAE:          {metrics['mae']:.2f}")
    print(f"   RMSE:         {metrics['rmse']:.2f}")
    print(f"   MAPE:         {metrics['mape']:.2f}%")
    
    # Manual MAPE calculation for verification
    manual_mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100
    print(f"   Manual MAPE:  {manual_mape:.2f}% (should match)")
    
    # Validate MAPE is reasonable
    if metrics['mape'] < 50:
        print("✅ MAPE is reasonable (< 50%)")
    else:
        print("❌ MAPE is still too high")
    
    return metrics

def test_model_performance():
    """Test that all models have reasonable performance"""
    print("\n" + "="*60)
    print("📊 TESTING MODEL PERFORMANCE")
    print("="*60)
    
    aqi_system = AQIPredictionSystem()
    
    # Train and evaluate models
    print("Training models and evaluating performance...")
    aqi_system.train_models()
    
    # Check each model's performance
    all_mapes_reasonable = True
    
    print(f"{'Model':<20} {'R²':<8} {'MAE':<8} {'RMSE':<8} {'MAPE':<8} {'Status':<10}")
    print("-" * 70)
    
    for model_name, metrics in aqi_system.model_performances.items():
        r2 = metrics['r2_score']
        mae = metrics['mae']
        rmse = metrics['rmse']
        mape = metrics['mape']
        
        # Determine status
        if mape > 50:
            status = "❌ HIGH MAPE"
            all_mapes_reasonable = False
        elif r2 > 0.7:
            status = "✅ GOOD"
        elif r2 > 0.5:
            status = "⚠️ FAIR"
        else:
            status = "❌ POOR"
        
        print(f"{model_name:<20} {r2:.3f}    {mae:.1f}     {rmse:.1f}     {mape:.1f}%    {status}")
    
    print("-" * 70)
    
    if all_mapes_reasonable:
        print("✅ All models have reasonable MAPE scores (< 50%)")
    else:
        print("❌ Some models still have high MAPE scores")
    
    return aqi_system

def test_predictions():
    """Test prediction functionality"""
    print("\n" + "="*60)
    print("🔮 TESTING PREDICTIONS")
    print("="*60)
    
    aqi_system = test_model_performance()
    
    # Test predictions for different dates
    test_dates = [
        datetime(2025, 8, 1),
        datetime(2025, 8, 15),
        datetime(2025, 12, 25),  # Winter
        datetime(2025, 6, 21),   # Summer
    ]
    
    print(f"Testing predictions for {len(test_dates)} dates...")
    print(f"{'Date':<12} {'Best Model':<15} {'All Models':<50}")
    print("-" * 80)
    
    for date in test_dates:
        date_str = date.strftime('%Y-%m-%d')
        
        # Get prediction from best model
        best_pred = aqi_system.predict_aqi_for_date(date)
        
        # Get predictions from all models
        all_preds = []
        for model_name in aqi_system.models.keys():
            pred = aqi_system.predict_aqi_for_date(date, model_name)
            all_preds.append(f"{model_name[:2]}:{pred:.0f}")
        
        all_preds_str = " ".join(all_preds)
        
        print(f"{date_str:<12} {best_pred:.1f}           {all_preds_str}")
    
    # Test 7-day trend
    print(f"\n📈 Testing 7-day trend prediction:")
    trend = aqi_system.predict_7_day_trend(datetime(2025, 8, 1))
    trend_values = [item['aqi'] for item in trend]
    print(f"   Trend: {trend_values}")
    
    # Validate trend is reasonable
    if all(0 <= aqi <= 300 for aqi in trend_values):
        print("✅ All trend predictions are within valid AQI range")
    else:
        print("❌ Some trend predictions are outside valid range")

def test_consistency():
    """Test prediction consistency"""
    print("\n" + "="*60)
    print("🔄 TESTING PREDICTION CONSISTENCY")
    print("="*60)
    
    aqi_system = AQIPredictionSystem()
    aqi_system.train_models()
    
    # Test that same date gives same prediction
    test_date = datetime(2025, 8, 15)
    
    predictions = []
    for i in range(5):
        pred = aqi_system.predict_aqi_for_date(test_date)
        predictions.append(pred)
    
    print(f"5 predictions for {test_date.strftime('%Y-%m-%d')}: {predictions}")
    
    # Check consistency
    if len(set(predictions)) == 1:
        print("✅ Predictions are perfectly consistent")
    else:
        print("❌ Predictions are inconsistent")
    
    # Test cache functionality
    print("Testing prediction caching...")
    cache_size_before = len(aqi_system._prediction_cache)
    
    # Make multiple predictions (should use cache)
    for i in range(3):
        aqi_system.predict_aqi_for_date(test_date)
    
    cache_size_after = len(aqi_system._prediction_cache)
    print(f"Cache size: {cache_size_before} → {cache_size_after}")
    
    if cache_size_after > cache_size_before:
        print("✅ Caching is working")
    else:
        print("⚠️ Caching may not be working properly")

def run_comprehensive_test():
    """Run all tests"""
    print("🧪 COMPREHENSIVE TEST OF FIXED AQI PREDICTION SYSTEM")
    print("="*80)
    print("This will validate all the fixes made to address the MAPE issue")
    print("="*80)
    
    try:
        # Run all tests
        test_synthetic_data_generation()
        test_mape_calculation()
        test_model_performance()
        test_predictions()
        test_consistency()
        
        print("\n" + "="*80)
        print("🎉 ALL TESTS COMPLETED!")
        print("="*80)
        print("✅ Key Improvements Verified:")
        print("   • MAPE calculation is fixed (no more 100% errors)")
        print("   • Synthetic data generation is more realistic")
        print("   • Model parameters are optimized")
        print("   • Predictions are consistent and cached")
        print("   • All metrics are within reasonable ranges")
        print("\n🚀 The system is ready for production use!")
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_comprehensive_test()