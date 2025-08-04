from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta
import json
import numpy as np
import random
import calendar
import hashlib
import logging
import os

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
CORS(app)

# Globals
aqi_system = None
models_trained = False
HAS_AQI_SYSTEM = False

def try_initialize_aqi_system():
    global aqi_system, models_trained, HAS_AQI_SYSTEM
    if aqi_system is not None:
        return

    logging.info("Attempting to initialize AQI Prediction System...")
    try:
        from aqi_prediction_system import AQIPredictionSystem
        HAS_AQI_SYSTEM = True
    except ImportError:
        logging.warning("AQI System module not found.")
        HAS_AQI_SYSTEM = False
        return

    try:
        aqi_system = AQIPredictionSystem()
        try:
            aqi_system.load_models('trained_aqi_models.pkl')
            models_trained = True
            logging.info(f"Loaded trained models: {aqi_system.best_model_name}")
        except Exception as e:
            logging.warning(f"Could not load models: {e}")
            logging.info("Training new models...")
            aqi_system.train_models()
            aqi_system.save_models('trained_aqi_models.pkl')
            models_trained = True
            logging.info("New models trained and saved!")
    except Exception as e:
        logging.error(f"Failed to initialize AQI system: {e}")
        aqi_system = None
        models_trained = False

def ensure_aqi_system_initialized():
    if aqi_system is None:
        try_initialize_aqi_system()

@app.route('/')
def index():
    return jsonify({
        "message": "🎉 AQI Prediction API is live!",
        "try_endpoints": [
            "/api/health",
            "/api/dashboard",
            "/api/prediction?date=2025-08-04",
            "/api/pollutants?date=2025-08-04",
            "/api/recommendations?aqi=150"
        ]
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    ensure_aqi_system_initialized()
    return jsonify({
        'status': 'healthy',
        'models_trained': models_trained,
        'available_models': list(aqi_system.models.keys()) if models_trained and aqi_system else [],
        'best_model': aqi_system.best_model_name if models_trained and aqi_system else None,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    ensure_aqi_system_initialized()
    try:
        today = datetime.now().date()
        pollutants = ['PM2.5', 'PM10', 'NO2', 'SO2', 'O3']
        dashboard_data = []

        for i in range(7):
            day = today - timedelta(days=i)
            date_str = day.strftime('%Y-%m-%d')
            features = aqi_system.generate_synthetic_features(day)
            prediction = aqi_system.predict(day)
            
            dashboard_data.append({
                'date': date_str,
                'AQI': prediction,
                'pollutants': {
                    pollutant: features.get(pollutant, 0) for pollutant in pollutants
                }
            })

        return jsonify({'dashboard': dashboard_data[::-1]})
    except Exception as e:
        logging.error(f"Dashboard error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/prediction', methods=['GET'])
def predict_aqi():
    ensure_aqi_system_initialized()
    date_str = request.args.get('date')
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        prediction = aqi_system.predict(date_obj)
        return jsonify({'date': date_str, 'AQI_prediction': prediction})
    except Exception as e:
        logging.error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/pollutants', methods=['GET'])
def get_pollutants():
    ensure_aqi_system_initialized()
    date_str = request.args.get('date')
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        features = aqi_system.generate_synthetic_features(date_obj)
        return jsonify({'date': date_str, 'pollutants': features})
    except Exception as e:
        logging.error(f"Pollutants error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    try:
        aqi = int(request.args.get('aqi'))
        if aqi < 50:
            message = "Air quality is good. Enjoy your day!"
        elif aqi < 100:
            message = "Air quality is moderate. Sensitive individuals should limit prolonged outdoor exertion."
        elif aqi < 150:
            message = "Unhealthy for sensitive groups. Reduce outdoor activities."
        elif aqi < 200:
            message = "Unhealthy. Avoid prolonged outdoor exertion."
        elif aqi < 300:
            message = "Very Unhealthy. Stay indoors if possible."
        else:
            message = "Hazardous. Remain indoors and use air purifiers."
        return jsonify({'aqi': aqi, 'recommendation': message})
    except Exception as e:
        logging.error(f"Recommendations error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logging.info("Starting Flask app...")
    port = int(os.environ.get('PORT', 10000))
    logging.info(f"Binding on port: {port}")
    app.run(host='0.0.0.0', port=port)
