from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta
import numpy as np
import random
import hashlib
import calendar
import os

# Optional: Import the AQI system if it's available
try:
    from aqi_prediction_system import AQIPredictionSystem
    HAS_AQI_SYSTEM = True
except ImportError:
    print("AQI System not found. Please run the first code to create it.")
    HAS_AQI_SYSTEM = False

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS

# Default home route
@app.route("/")
def home():
    return "API is live"

# Initialize model system
if HAS_AQI_SYSTEM:
    aqi_system = AQIPredictionSystem()

    try:
        aqi_system.load_models('trained_aqi_models.pkl')
        models_trained = True
        print("✅ Loaded trained models")
        print(f"Best model: {aqi_system.best_model_name}")
    except Exception as e:
        print(f"⚠️ Could not load models: {e}")
        print("Training new models...")
        aqi_system.train_models()
        aqi_system.save_models('trained_aqi_models.pkl')
        models_trained = True
        print("✅ Models trained and saved!")
else:
    models_trained = False
    aqi_system = None

# --- ROUTES ---

# HEALTH
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'models_trained': models_trained,
        'available_models': list(aqi_system.models.keys()) if models_trained else [],
        'best_model': aqi_system.best_model_name if models_trained else None,
        'timestamp': datetime.now().isoformat()
    })

# Include all your other route definitions here (from your long code):
# - /api/dashboard
# - /api/prediction
# - /api/pollutants
# - /api/recommendations
# Make sure they are defined **after** app is initialized and NOT after another `app = Flask(...)` is written.

# FIX: get_fallback_calendar_data must accept parameters
def get_fallback_calendar_data(year, month):
    """Fallback calendar data"""
    calendar_data = {}
    for day in range(1, calendar.monthrange(year, month)[1] + 1):
        aqi = random.randint(20, 120)
        calendar_data[day] = {
            'aqi': aqi,
            'aqi_category': get_aqi_category(aqi),
            'main_pollutant': 'PM2.5 - Local Conditions'
        }
    return calendar_data

# AQI category helper
def get_aqi_category(aqi):
    if aqi <= 50:
        return 'Good'
    elif aqi <= 100:
        return 'Moderate'
    elif aqi <= 150:
        return 'Unhealthy for Sensitive Groups'
    elif aqi <= 200:
        return 'Unhealthy'
    elif aqi <= 300:
        return 'Very Unhealthy'
    else:
        return 'Hazardous'

# --- SERVER RUN ---
if __name__ == '__main__':
    print("Starting FIXED AQI Prediction API Server...")
    print("Model Status:", "Trained" if models_trained else "Fallback Mode")

    if models_trained and aqi_system:
        print("Model Performance Summary:")
        for model_name, metrics in aqi_system.model_performances.items():
            print(f"  {model_name}: R² = {metrics['r2_score']:.3f}")

    print("\nAvailable endpoints:")
    print("  GET  /            - Home")
    print("  GET  /api/health  - Health check")
    print("  GET  /api/dashboard")
    print("  GET  /api/prediction")
    print("  GET  /api/pollutants")
    print("  GET  /api/recommendations")

    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
