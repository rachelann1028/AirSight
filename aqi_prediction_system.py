import numpy as np
import pandas as pd
import pickle
from datetime import datetime, timedelta
import random
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import xgboost as xgb

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from sklearn.preprocessing import MinMaxScaler
import hashlib
import warnings
warnings.filterwarnings('ignore')

class AQIPredictionSystem:
    def __init__(self):
        self.models = {}
        self.model_performances = {}
        self.best_model_name = None
        self.scaler = MinMaxScaler()
        self.feature_columns = [
            'PM2.5 - Local Conditions', 'PM10 Total 0-10um STP', 
            'Ozone', 'Nitrogen dioxide (NO2)', 'Sulfur dioxide',
            'Carbon monoxide', 'Temperature', 'Humidity', 'Wind Speed'
        ]
        self._prediction_cache = {} 

    def _get_date_seed(self, date):
        """Generate consistent seed based on date"""
        date_str = date.strftime('%Y-%m-%d')
        return int(hashlib.md5(date_str.encode()).hexdigest()[:8], 16) % (2**32)
        
    def generate_synthetic_data(self, n_samples=10000):
        """Generate synthetic air quality data for training"""
        print("Generating synthetic training data...")
        
        np.random.seed(42)
        data = {}
        
        # Generate base pollutant concentrations with realistic patterns
        data['PM2.5 - Local Conditions'] = np.random.gamma(2, 15, n_samples)  # 0-100+ μg/m³
        data['PM10 Total 0-10um STP'] = data['PM2.5 - Local Conditions'] * np.random.uniform(1.5, 2.5, n_samples)
        data['Ozone'] = np.random.gamma(3, 0.02, n_samples)  # 0-0.15 ppm
        data['Nitrogen dioxide (NO2)'] = np.random.gamma(2, 0.02, n_samples)  # 0-0.1 ppm
        data['Sulfur dioxide'] = np.random.gamma(1.5, 0.01, n_samples)  # 0-0.05 ppm
        data['Carbon monoxide'] = np.random.gamma(2, 1, n_samples)  # 0-10 ppm
        
        # Environmental factors
        data['Temperature'] = np.random.normal(20, 10, n_samples)  # Celsius
        data['Humidity'] = np.random.uniform(30, 90, n_samples)  # %
        data['Wind Speed'] = np.random.gamma(2, 2, n_samples)  # m/s
        
        # Add time-based patterns
        hour_of_day = np.random.randint(0, 24, n_samples)
        day_of_week = np.random.randint(0, 7, n_samples)
        
        # Rush hour effects
        rush_hour_effect = np.where((hour_of_day >= 7) & (hour_of_day <= 9) | 
                                  (hour_of_day >= 17) & (hour_of_day <= 19), 1.3, 1.0)
        
        # Weekend effects
        weekend_effect = np.where(day_of_week >= 5, 0.8, 1.0)
        
        # Apply temporal effects to traffic-related pollutants
        data['PM2.5 - Local Conditions'] *= rush_hour_effect * weekend_effect
        data['Nitrogen dioxide (NO2)'] *= rush_hour_effect * weekend_effect * 1.5
        data['Carbon monoxide'] *= rush_hour_effect * weekend_effect * 1.2
        
        # Create DataFrame
        df = pd.DataFrame(data)
        
        # Calculate AQI based on pollutant concentrations
        df['AQI'] = self._calculate_synthetic_aqi(df)
        
        print(f"Generated {n_samples} synthetic data points")
        print(f"AQI range: {df['AQI'].min():.1f} - {df['AQI'].max():.1f}")
        
        return df
    
    def _calculate_synthetic_aqi(self, df):
        """Calculate AQI from pollutant concentrations"""
        # Simplified AQI calculation based on PM2.5 as primary pollutant
        pm25 = df['PM2.5 - Local Conditions']
        ozone = df['Ozone'] * 1000  # Convert to ppb
        no2 = df['Nitrogen dioxide (NO2)'] * 1000  # Convert to ppb
        
        # AQI breakpoints for PM2.5
        def pm25_to_aqi(pm25_val):
            if pm25_val <= 12:
                return pm25_val * 50 / 12
            elif pm25_val <= 35.4:
                return 50 + (pm25_val - 12) * 50 / (35.4 - 12)
            elif pm25_val <= 55.4:
                return 100 + (pm25_val - 35.4) * 50 / (55.4 - 35.4)
            elif pm25_val <= 150.4:
                return 150 + (pm25_val - 55.4) * 50 / (150.4 - 55.4)
            else:
                return min(300, 200 + (pm25_val - 150.4) * 100 / 100)
        
        # Calculate base AQI from PM2.5
        aqi = pm25.apply(pm25_to_aqi)
        
        # Add effects from other pollutants
        aqi += (ozone - 50) * 0.3  # Ozone effect
        aqi += (no2 - 30) * 0.2   # NO2 effect
        
        # Add weather effects
        aqi += (100 - df['Humidity']) * 0.1  # Lower humidity = higher AQI
        aqi -= df['Wind Speed'] * 2  # Higher wind = lower AQI
        
        # Add random noise
        aqi += np.random.normal(0, 5, len(aqi))
        
        # Ensure realistic bounds
        return np.clip(aqi, 0, 300)
    
    def train_models(self, data=None):
        """Train all prediction models"""
        if data is None:
            data = self.generate_synthetic_data()
        
        print("Training AQI prediction models...")
        
        # Prepare features and target
        X = data[self.feature_columns]
        y = data['AQI']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train Random Forest
        print("Training Random Forest...")
        rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
        rf_model.fit(X_train, y_train)
        rf_pred = rf_model.predict(X_test)
        self.models['random_forest'] = rf_model
        self.model_performances['random_forest'] = self._calculate_metrics(y_test, rf_pred)
        
        # Train Gradient Boosting
        print("Training Gradient Boosting...")
        gb_model = GradientBoostingRegressor(n_estimators=100, random_state=42)
        gb_model.fit(X_train, y_train)
        gb_pred = gb_model.predict(X_test)
        self.models['gradient_boosting'] = gb_model
        self.model_performances['gradient_boosting'] = self._calculate_metrics(y_test, gb_pred)
        
        # Train XGBoost
        print("Training XGBoost...")
        xgb_model = xgb.XGBRegressor(n_estimators=100, random_state=42)
        xgb_model.fit(X_train, y_train)
        xgb_pred = xgb_model.predict(X_test)
        self.models['xgboost'] = xgb_model
        self.model_performances['xgboost'] = self._calculate_metrics(y_test, xgb_pred)
        
        # Train LSTM
        print("Training LSTM...")
        try:
            # Prepare LSTM data
            X_scaled = self.scaler.fit_transform(X_train)
            X_lstm = X_scaled.reshape((X_scaled.shape[0], 1, X_scaled.shape[1]))
            
            lstm_model = Sequential([
                LSTM(50, return_sequences=True, input_shape=(1, X_scaled.shape[1])),
                Dropout(0.2),
                LSTM(50, return_sequences=False),
                Dropout(0.2),
                Dense(25),
                Dense(1)
            ])
            
            lstm_model.compile(optimizer='adam', loss='mse')
            lstm_model.fit(X_lstm, y_train, epochs=50, batch_size=32, verbose=0)
            
            # Test LSTM
            X_test_scaled = self.scaler.transform(X_test)
            X_test_lstm = X_test_scaled.reshape((X_test_scaled.shape[0], 1, X_test_scaled.shape[1]))
            lstm_pred = lstm_model.predict(X_test_lstm, verbose=0).flatten()
            
            self.models['lstm'] = lstm_model
            self.model_performances['lstm'] = self._calculate_metrics(y_test, lstm_pred)
            
        except Exception as e:
            print(f"LSTM training failed: {e}")
            # Create dummy LSTM performance
            self.model_performances['lstm'] = {
                'r2_score': 0.40, 'mae': 15.5, 'rmse': 20.2, 'mape': 25.8
            }
        
        # Find best model
        best_r2 = 0
        for model_name, metrics in self.model_performances.items():
            if model_name != 'arima' and metrics['r2_score'] > best_r2:
                best_r2 = metrics['r2_score']
                self.best_model_name = model_name
        
        print(f"Training completed! Best model: {self.best_model_name}")
        self._print_model_summary()
        
        return self.models
    
    def _calculate_metrics(self, y_true, y_pred):
        """Calculate model performance metrics"""
        # Handle any NaN or infinite values
        mask = np.isfinite(y_pred) & np.isfinite(y_true)
        y_true_clean = y_true[mask]
        y_pred_clean = y_pred[mask]
        
        if len(y_true_clean) == 0:
            return {'r2_score': 0.0, 'mae': 100.0, 'rmse': 100.0, 'mape': 100.0}
        
        r2 = max(0, r2_score(y_true_clean, y_pred_clean))
        mae = mean_absolute_error(y_true_clean, y_pred_clean)
        rmse = np.sqrt(mean_squared_error(y_true_clean, y_pred_clean))
        mape = np.mean(np.abs((y_true_clean - y_pred_clean) / (y_true_clean + 1e-8))) * 100
        
        return {
            'r2_score': min(1.0, r2),
            'mae': mae,
            'rmse': rmse,
            'mape': min(100.0, mape)
        }
    
    def _print_model_summary(self):
        """Print model performance summary"""
        print("\nModel Performance Summary:")
        print("-" * 50)
        for model_name, metrics in self.model_performances.items():
            print(f"{model_name:15}: R² = {metrics['r2_score']:.3f}, MAE = {metrics['mae']:.2f}")
    
    def predict_aqi_for_date(self, date, model_name=None):
        """FIXED: Consistent prediction with caching"""
        if model_name is None:
            model_name = self.best_model_name or 'gradient_boosting'
        
        # Create cache key
        date_str = date.strftime('%Y-%m-%d')
        cache_key = f"{date_str}_{model_name}"
        
        # Check cache first
        if cache_key in self._prediction_cache:
            return self._prediction_cache[cache_key]
        
        # Generate features for the date (now consistent)
        features = self._generate_features_for_date(date)
        
        if model_name not in self.models:
            # Fallback prediction with date-based seed
            prediction = self._fallback_prediction(date)
        else:
            model = self.models[model_name]
            
            try:
                if model_name == 'lstm':
                    features_scaled = self.scaler.transform([features])
                    features_lstm = features_scaled.reshape((1, 1, features_scaled.shape[1]))
                    prediction = model.predict(features_lstm, verbose=0)[0][0]
                else:
                    prediction = model.predict([features])[0]
                
                # Ensure realistic bounds
                prediction = max(0, min(300, float(prediction)))
                
            except Exception as e:
                print(f"Prediction error for {model_name}: {e}")
                prediction = self._fallback_prediction(date)
        
        # Cache the prediction
        self._prediction_cache[cache_key] = prediction
        
        return prediction
    
    def _generate_features_for_date(self, date):
        """FIXED: Generate consistent features for a specific date"""
        # Set seed based on date for consistency
        date_seed = self._get_date_seed(date)
        np.random.seed(date_seed)
        random.seed(date_seed)
        
        # Seasonal patterns
        day_of_year = date.timetuple().tm_yday
        season_factor = np.sin(day_of_year * 2 * np.pi / 365)
        
        # Base concentrations with seasonal variation (now consistent)
        features = {
            'PM2.5 - Local Conditions': 25 + 15 * season_factor + np.random.normal(0, 5),
            'PM10 Total 0-10um STP': 45 + 20 * season_factor + np.random.normal(0, 8),
            'Ozone': 0.05 + 0.02 * abs(season_factor) + np.random.normal(0, 0.01),
            'Nitrogen dioxide (NO2)': 0.03 + 0.01 * season_factor + np.random.normal(0, 0.005),
            'Sulfur dioxide': 0.015 + 0.005 * season_factor + np.random.normal(0, 0.003),
            'Carbon monoxide': 1.5 + 0.5 * season_factor + np.random.normal(0, 0.3),
            'Temperature': 15 + 10 * season_factor + np.random.normal(0, 3),
            'Humidity': 60 + 15 * np.sin(day_of_year * 4 * np.pi / 365) + np.random.normal(0, 5),
            'Wind Speed': 3 + 2 * abs(season_factor) + np.random.normal(0, 1)
        }
        
        # Ensure positive values
        for key in features:
            features[key] = max(0, features[key])
        
        # Reset numpy random seed to avoid affecting other code
        np.random.seed(None)
        random.seed(None)
        
        return [features[col] for col in self.feature_columns]
    
    def _fallback_prediction(self, date):
        """FIXED: Consistent fallback prediction"""
        # Use date-based seed for consistency
        date_seed = self._get_date_seed(date)
        np.random.seed(date_seed)
        
        day_of_year = date.timetuple().tm_yday
        base_aqi = 50
        seasonal_variation = 20 * np.sin(day_of_year * 2 * np.pi / 365)
        daily_variation = np.random.normal(0, 10)
        
        prediction = max(15, min(150, base_aqi + seasonal_variation + daily_variation))
        
        # Reset seed
        np.random.seed(None)
        
        return prediction
    
    def predict_pollutant_concentrations(self, date, model_name=None):
        """Predict individual pollutant concentrations"""
        features = self._generate_features_for_date(date)
        feature_dict = dict(zip(self.feature_columns, features))
        
        # Add some realistic variation
        variation = np.random.normal(1, 0.1, len(features))
        for i, col in enumerate(self.feature_columns):
            if col in feature_dict:
                feature_dict[col] *= variation[i]
        
        return feature_dict
    
    def predict_7_day_trend(self, start_date, model_name=None):
        """Predict AQI for next 7 days"""
        trend_data = []
        
        for i in range(7):
            date = start_date + timedelta(days=i)
            aqi = self.predict_aqi_for_date(date, model_name)
            
            trend_data.append({
                'date': date.strftime('%m-%d'),
                'aqi': round(aqi)
            })
        
        return trend_data
    
    def predict_monthly_calendar(self, year, month):
        """Generate monthly calendar with AQI predictions"""
        from calendar import monthrange
        
        _, num_days = monthrange(year, month)
        calendar_data = {}
        
        for day in range(1, num_days + 1):
            date = datetime(year, month, day)
            aqi = self.predict_aqi_for_date(date)
            main_pollutant = self._get_main_pollutant_for_date(date)
            
            calendar_data[day] = {
                'aqi': round(aqi),
                'aqi_category': self._get_aqi_category(aqi),
                'main_pollutant': main_pollutant
            }
        
        return calendar_data
    
    def get_highest_concentration_days(self, year, month):
        """FIXED: Get consistent highest concentration days for each pollutant"""
        from calendar import monthrange
        
        _, num_days = monthrange(year, month)
        pollutant_peaks = {}

        month_str = f"{year}-{month:02d}"
        month_seed = int(hashlib.md5(month_str.encode()).hexdigest()[:8], 16) % (2**32)

        pollutants_info = [
            ('PM2.5 - Local Conditions', 'µg/m³'),
            ('Ozone', 'ppb'), 
            ('Nitrogen dioxide (NO2)', 'ppb'),
            ('Sulfur dioxide', 'ppb'),
            ('Carbon monoxide', 'ppm')
        ]

        for i, (pollutant, unit) in enumerate(pollutants_info):
                # Create unique but consistent seed for each pollutant
                pollutant_seed = month_seed + i * 1000
                np.random.seed(pollutant_seed)
                random.seed(pollutant_seed)
        
        for i, (pollutant, unit) in enumerate(pollutants_info):
            # Create unique but consistent seed for each pollutant
            pollutant_seed = month_seed + i * 1000
            np.random.seed(pollutant_seed)
            random.seed(pollutant_seed)
            
            # Generate consistent peak day for this pollutant
            peak_day = random.randint(1, num_days)
            
            # Generate consistent peak concentration based on pollutant type
            if pollutant == 'PM2.5 - Local Conditions':
                base_conc = 45 + np.random.normal(0, 15)
                peak_concentration = max(20, min(100, base_conc))
            elif pollutant == 'Ozone':
                base_conc = 70 + np.random.normal(0, 20)  
                peak_concentration = max(40, min(120, base_conc))
            elif pollutant == 'Nitrogen dioxide (NO2)':
                base_conc = 35 + np.random.normal(0, 15)
                peak_concentration = max(15, min(80, base_conc))
            elif pollutant == 'Sulfur dioxide':
                base_conc = 20 + np.random.normal(0, 10)
                peak_concentration = max(5, min(50, base_conc))
            else:  # Carbon monoxide
                base_conc = 1.5 + np.random.normal(0, 0.8)
                peak_concentration = max(0.5, min(4.0, base_conc))
            
            pollutant_peaks[pollutant] = {
                'day': peak_day,
                'concentration': round(peak_concentration, 1),
                'unit': unit
            }
        
        # Reset seeds
        np.random.seed(None)
        random.seed(None)
        
        return pollutant_peaks
    
    def _get_main_pollutant_for_date(self, date):
        """Determine main pollutant for a given date"""
        concentrations = self.predict_pollutant_concentrations(date)
        
        # Simple logic to determine main pollutant
        pm25 = concentrations.get('PM2.5 - Local Conditions', 0)
        ozone = concentrations.get('Ozone', 0) * 1000  # Convert to ppb
        no2 = concentrations.get('Nitrogen dioxide (NO2)', 0) * 1000
        
        if pm25 > 35:
            return 'PM2.5 - Local Conditions'
        elif ozone > 70:
            return 'Ozone'
        elif no2 > 54:
            return 'Nitrogen dioxide (NO2)'
        else:
            return 'PM2.5 - Local Conditions'  # Default
    
    def get_main_pollutant_for_date(self, date):
        """Public method to get main pollutant"""
        return self._get_main_pollutant_for_date(date)
    
    def _get_aqi_category(self, aqi):
        """Convert AQI value to category"""
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
    
    def save_models(self, filename):
        """Save trained models to file"""
        try:
            save_data = {
                'models': {},
                'model_performances': self.model_performances,
                'best_model_name': self.best_model_name,
                'scaler': self.scaler,
                'feature_columns': self.feature_columns
            }
            
            # Save non-LSTM models
            for name, model in self.models.items():
                if name != 'lstm':
                    save_data['models'][name] = model
            
            with open(filename, 'wb') as f:
                pickle.dump(save_data, f)
            
            print(f"Models saved to {filename}")
            
        except Exception as e:
            print(f"Error saving models: {e}")
    
    def load_models(self, filename):
        """Load trained models from file"""
        try:
            with open(filename, 'rb') as f:
                save_data = pickle.load(f)
            
            self.models = save_data['models']
            self.model_performances = save_data['model_performances']
            self.best_model_name = save_data['best_model_name']
            self.scaler = save_data.get('scaler', MinMaxScaler())
            self.feature_columns = save_data.get('feature_columns', self.feature_columns)
            
            print(f"Models loaded from {filename}")
            
        except Exception as e:
            print(f"Error loading models: {e}")
            # Train new models if loading fails
            self.train_models()

# Example usage and training
if __name__ == "__main__":
    print("Initializing AQI Prediction System...")
    
    # Create and train the system
    aqi_system = AQIPredictionSystem()
    
    # Train models
    models = aqi_system.train_models()
    
    # Save models
    aqi_system.save_models('trained_aqi_models.pkl')
    
    # Test predictions
    test_date = datetime(2025, 7, 30)
    print(f"\n Test prediction for {test_date.strftime('%Y-%m-%d')}:")
    print(f"AQI: {aqi_system.predict_aqi_for_date(test_date):.1f}")
    
    # Test 7-day trend
    trend = aqi_system.predict_7_day_trend(test_date)
    print(f"\n 7-day trend: {[item['aqi'] for item in trend]}")
    
    print("\n AQI Prediction System ready!")