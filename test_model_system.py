# Test if our AQI system loads properly
from aqi_prediction_system import AQIPredictionSystem
import pandas as pd
from datetime import datetime

print("Testing AQI Prediction System...")

# Initialize the system
aqi_system = AQIPredictionSystem()
print("✅ AQI system initialized")

# Test basic functions
test_date = datetime(2025, 7, 24)
main_pollutant = aqi_system.get_main_pollutant_for_date(test_date)
print(f"✅ Main pollutant for {test_date.date()}: {main_pollutant}")

# Test monthly calendar (without trained models)
monthly_data = aqi_system.predict_monthly_calendar(2025, 7)
print(f"✅ July 2025 prediction for day 1: AQI {monthly_data[1]['aqi']}")

print("\n🎉 AQI Prediction System works perfectly!")
print("Ready to load your real data and train models!")