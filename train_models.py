from aqi_prediction_system import AQIPredictionSystem
import pandas as pd

print("Loading your prepared AQI data...")

# Load your saved data
try:
    data = pd.read_csv('prepared_aqi_data.csv', index_col=0, parse_dates=True)
    print(f"✅ Data loaded successfully!")
    print(f"Shape: {data.shape}")
    print(f"Date range: {data.index.min()} to {data.index.max()}")
    print(f"Columns: {data.columns.tolist()}")
    
    # Initialize the AQI system
    aqi_system = AQIPredictionSystem()
    
    print("\n🚀 Starting model training...")
    print("This will take a few minutes...")
    
    # Train all models with your real data
    aqi_system.train_all_models(data)
    
    # Save the trained models
    aqi_system.save_models('trained_aqi_models.pkl')
    
    print("\n🎉 SUCCESS! Models trained and saved!")
    print("Your AI models are ready to make predictions!")
    
except FileNotFoundError:
    print("❌ Could not find 'prepared_aqi_data.csv'")
    print("Make sure you ran the data preparation code first!")
    
except Exception as e:
    print(f"❌ Error: {e}")