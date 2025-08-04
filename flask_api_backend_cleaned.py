from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta
import json
import numpy as np
import random
import calendar
import hashlib
import logging

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
CORS(app)

# Globals for lazy loading
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

# Your existing endpoint functions here, but
# inside each, call ensure_aqi_system_initialized() before using aqi_system
# For example:

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

# Repeat the pattern in all other endpoints:
# before using aqi_system, call ensure_aqi_system_initialized()

# ... (include your other endpoints like /api/dashboard, /api/prediction, /api/pollutants, /api/recommendations)
# Be sure to call ensure_aqi_system_initialized() at start of each.

# Example for dashboard:
@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    ensure_aqi_system_initialized()
    # Then your existing logic with aqi_system safely used
    # ...

# Finally, your main app runner

if __name__ == '__main__':
    logging.info("Starting Flask app...")
    port = int(os.environ.get('PORT', 10000))
    logging.info(f"Binding on port: {port}")
    app.run(host='0.0.0.0', port=port)

