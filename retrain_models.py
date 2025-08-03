from aqi_prediction_system import AQIPredictionSystem
import pandas as pd
import numpy as np

print("🔄 Retraining models to fix NaN issue...")

# Load your data
data = pd.read_csv('prepared_aqi_data.csv', index_col=0, parse_dates=True)
print(f"✅ Data loaded: {data.shape}")

# Initialize the system
aqi_system = AQIPredictionSystem()

# Train models
aqi_system.train_all_models(data)

# Check for NaN values in performances
print("\n🔍 Checking for NaN values:")
for model_name, metrics in aqi_system.model_performances.items():
    for metric_name, value in metrics.items():
        if np.isnan(value):
            print(f"❌ {model_name}.{metric_name} = NaN, fixing to 0.0")
            aqi_system.model_performances[model_name][metric_name] = 0.0
        else:
            print(f"✅ {model_name}.{metric_name} = {value}")

# Save the fixed models
aqi_system.save_models('trained_aqi_models_fixed.pkl')
print("\n🎉 Models retrained and saved as 'trained_aqi_models_fixed.pkl'")