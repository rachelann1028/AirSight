import requests
import json
from datetime import datetime

# API base URL
API_BASE = 'http://127.0.0.1:5000/api'

print("🧪 Testing AQI Prediction API...")

# Test 1: Health check
print("\n1️⃣ Testing health endpoint...")
try:
    response = requests.get(f'{API_BASE}/health')
    data = response.json()
    print(f"✅ Health check: {data['status']}")
    print(f"✅ Models trained: {data['models_trained']}")
    print(f"✅ Best model: {data['best_model']}")
except Exception as e:
    print(f"❌ Health check failed: {e}")

# Test 2: Dashboard data
print("\n2️⃣ Testing dashboard endpoint...")
try:
    response = requests.get(f'{API_BASE}/dashboard?date=2025-07-24')
    data = response.json()
    print(f"✅ Current AQI: {data['current_aqi']}")
    print(f"✅ Main pollutant: {data['main_pollutant']}")
    print(f"✅ Next day AQI: {data['next_day_aqi']}")
except Exception as e:
    print(f"❌ Dashboard test failed: {e}")

# Test 3: Prediction data
print("\n3️⃣ Testing prediction endpoint...")
try:
    response = requests.get(f'{API_BASE}/prediction?model=gradient_boosting&date=2025-07-24')
    data = response.json()
    print(f"✅ Prediction AQI: {data['overall_aqi']}")
    print(f"✅ Selected model: {data['selected_model']}")
    print(f"✅ 7-day trend: {len(data['trend_data']['data'])} days")
except Exception as e:
    print(f"❌ Prediction test failed: {e}")

# Test 4: Pollutants data
print("\n4️⃣ Testing pollutants endpoint...")
try:
    response = requests.get(f'{API_BASE}/pollutants?year=2025&month=7')
    data = response.json()
    print(f"✅ Calendar data: {len(data['calendar_data'])} days")
    print(f"✅ Highest concentrations: {len(data['highest_concentration'])} pollutants")
except Exception as e:
    print(f"❌ Pollutants test failed: {e}")

print("\n🎉 API testing complete!")