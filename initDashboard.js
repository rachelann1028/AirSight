// Global variables
let currentDate = new Date().toISOString().split('T')[0];
let dashboardChart = null;

async function initDashboard() {
  try {
    // Show loading state
    showLoadingState();
    
    // Fetch dashboard data from API
    const response = await fetch(`${API_BASE_URL}/dashboard?date=${currentDate}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch dashboard data');
    }
    
    console.log('Dashboard data received:', data);
    
    // Update dashboard with real data
    updateDashboardCards(data);
    updateAQIBanner(data);
    updateSensorData(data);
    updateAirQualityChart(data.chart_aqi);
    
    // Get and update recommendations
    await updateRecommendations();
    
    hideLoadingState();
    
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    showErrorState(error.message);
  }
}

function updateDashboardCards(data) {
  // Update AQI card
  const aqiCard = document.querySelector('.card.green');
  if (aqiCard) {
    aqiCard.querySelector('.card-value').textContent = data.current_aqi;
    aqiCard.querySelector('.card-label').textContent = data.current_category;
    
    // Update card color based on AQI level
    updateCardColor(aqiCard, data.current_aqi);
  }
  
  // Update main pollutant card
  const pollutantCard = document.querySelector('.card.blue');
  if (pollutantCard) {
    const shortName = getShortPollutantName(data.main_pollutant);
    pollutantCard.querySelector('.card-value').innerHTML = shortName;
  }
  
  // Update prediction card
  const predictionCards = document.querySelectorAll('.card');
  const predictionCard = predictionCards[2]; // Third card
  if (predictionCard) {
    predictionCard.querySelector('.card-value').textContent = data.next_day_aqi;
    predictionCard.querySelector('.card-label').textContent = data.next_day_category;
    
    // Update card color based on predicted AQI
    updateCardColor(predictionCard, data.next_day_aqi);
  }
}

function updateCardColor(card, aqi) {
  // Remove existing color classes
  card.classList.remove('green', 'blue', 'yellow', 'orange', 'red');
  
  // Add appropriate color class based on AQI
  if (aqi <= 50) {
    card.classList.add('green');
  } else if (aqi <= 100) {
    card.classList.add('yellow');
  } else if (aqi <= 150) {
    card.classList.add('orange');
  } else {
    card.classList.add('red');
  }
}

function getShortPollutantName(pollutant) {
  const mapping = {
    'PM2.5 - Local Conditions': 'PM<sub>2.5</sub>',
    'PM10 Total 0-10um STP': 'PM<sub>10</sub>',
    'Ozone': 'O<sub>3</sub>',
    'Nitrogen dioxide (NO2)': 'NO<sub>2</sub>',
    'Carbon monoxide': 'CO',
    'Sulfur dioxide': 'SO<sub>2</sub>'
  };
  return mapping[pollutant] || pollutant;
}

function updateAQIBanner(data) {
  const aqiMessage = document.getElementById("aqi-message");
  if (!aqiMessage) return;
  
  const aqi = data.current_aqi;
  let icon, headline, description, bannerClass;
  
  if (aqi <= 50) {
    // Good AQI - Happy GIF with forced size
    icon = '<img src="./images/happy-ezgif.com-gif-maker.gif" alt="Good AQI" class="aqi-icon" style="width: 50px !important; height: 50px !important; min-width: 50px; min-height: 50px; max-width: 50px; max-height: 50px; object-fit: contain; display: inline-block;" />';
    headline = "Great News! The air quality is good.";
    description = "It's a perfect day to be outside. Enjoy the fresh air!";
    bannerClass = "good";
  } else if (aqi <= 100) {
    // Moderate AQI - Neutral GIF with forced size
    icon = '<img src="./images/neutral-ezgif.com-gif-maker.gif" alt="Moderate AQI" class="aqi-icon" style="width: 50px !important; height: 50px !important; min-width: 50px; min-height: 50px; max-width: 50px; max-height: 50px; object-fit: contain; display: inline-block;" />';
    headline = "Air Quality is Moderate.";
    description = "Consider limiting prolonged outdoor exertion if sensitive.";
    bannerClass = "moderate";
  } else if (aqi <= 150) {
    // Unhealthy for Sensitive - Sad GIF with forced size
    icon = '<img src="./images/sad-ezgif.com-gif-maker.gif" alt="Unhealthy AQI" class="aqi-icon" style="width: 50px !important; height: 50px !important; min-width: 50px; min-height: 50px; max-width: 50px; max-height: 50px; object-fit: contain; display: inline-block;" />';
    headline = "Unhealthy for Sensitive Groups!";
    description = "Sensitive individuals should avoid outdoor activities.";
    bannerClass = "unhealthy";
  } else {
    // Dangerous AQI - Mask GIF with forced size
    icon = '<img src="./images/mask-ezgif.com-gif-maker.gif" alt="Dangerous AQI" class="aqi-icon" style="width: 50px !important; height: 50px !important; min-width: 50px; min-height: 50px; max-width: 50px; max-height: 50px; object-fit: contain; display: inline-block;" />';
    headline = "Unhealthy Air Quality!";
    description = "Avoid outdoor activities. Use air purifiers indoors.";
    bannerClass = "unhealthy";
  }
  
  aqiMessage.className = `aqi-banner ${bannerClass}`;
  aqiMessage.innerHTML = `
    <div class="icon">${icon}</div>
    <div class="text">
      <div class="headline">${headline}</div>
      <div class="description">${description}</div>
    </div>
  `;
  
  // FORCE size after DOM update
  setTimeout(() => {
    const gifElement = aqiMessage.querySelector('.aqi-icon');
    if (gifElement) {
      // Force the size using multiple methods
      gifElement.style.width = '40px';
      gifElement.style.height = '40px';
      gifElement.style.minWidth = '40px';
      gifElement.style.minHeight = '40px';
      gifElement.style.maxWidth = '40px';
      gifElement.style.maxHeight = '40px';
      gifElement.setAttribute('width', '50');
      gifElement.setAttribute('height', '50');
      
      console.log('🔧 Forced GIF size to 50x50px');
      
      gifElement.addEventListener('load', () => {
        console.log(`✅ AQI Banner GIF loaded: ${gifElement.src}`);
        console.log(`📏 Final size: ${gifElement.offsetWidth}x${gifElement.offsetHeight}px`);
      });
      
      gifElement.addEventListener('error', () => {
        console.log(`❌ AQI Banner GIF failed to load: ${gifElement.src}`);
      });
    }
  }, 100);
}

// OPTIONAL: Add this function to test different GIF sizes
function testBannerGifSizes() {
  const testData = [
    { current_aqi: 35, description: "Good" },
    { current_aqi: 75, description: "Moderate" },
    { current_aqi: 125, description: "Unhealthy" },
    { current_aqi: 175, description: "Dangerous" }
  ];
  
  let currentTest = 0;
  
  function runNextTest() {
    if (currentTest < testData.length) {
      console.log(`🧪 Testing ${testData[currentTest].description} AQI: ${testData[currentTest].current_aqi}`);
      updateAQIBanner(testData[currentTest]);
      currentTest++;
      setTimeout(runNextTest, 3000); // Switch every 3 seconds
    } else {
      console.log("✅ Banner GIF size tests completed!");
    }
  }
  
  runNextTest();
}

function updateSensorData(data) {
  const sensorBoxes = document.querySelectorAll('.sensor-box');
  
  // Update first sensor box (main sensor data)
  if (sensorBoxes[0]) {
    sensorBoxes[0].innerHTML = `
      <h3>Live Sensor Data</h3>
      <p><strong>PM<sub>2.5</sub></strong>: ${data.sensor_data.pm25} µg/m³</p>
      <p><strong>O₃</strong>: ${data.sensor_data.o3} ppb</p>
      <p><strong>NO₂</strong>: ${data.sensor_data.no2} ppb</p>
    `;
  }
  
  // Update second sensor box (pollutant concentration)
  if (sensorBoxes[1]) {
    sensorBoxes[1].innerHTML = `
      <h3>Pollutant Concentration</h3>
      <p>${data.pollutant_concentrations.pm25}</p>
      <p>${data.pollutant_concentrations.co}</p>
      <p>${data.pollutant_concentrations.o3}</p>
    `;
  }
}

function updateAirQualityChart(chartData) {
  const ctx = document.getElementById("airQualityChart")?.getContext("2d");
  if (!ctx) return;
  
  // Destroy existing chart
  if (dashboardChart) {
    dashboardChart.destroy();
  }
  
  dashboardChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ],
      datasets: [
        {
          label: "Predicted AQI",
          data: chartData,
          borderColor: "#50cd89",
          backgroundColor: "rgba(80, 205, 137, 0.06)",
          borderWidth: 2.5,
          tension: 0.5,
          pointRadius: 3,
          pointBackgroundColor: "#50cd89",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { 
        legend: { display: false },
        title: {
          display: true,
          text: 'AI-Predicted Air Quality Index - 12 Month Trend',
          font: { size: 14, weight: 'bold' }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#111", padding: 10 },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: Math.max(...chartData) + 20,
          ticks: { stepSize: 20, color: "#111", padding: 10 },
          grid: {
            display: false
          },
          border: { display: false },
        },
      },
      layout: { padding: { top: 10, bottom: 10 } },
    },
  });
}

async function updateRecommendations() {
  try {
    const response = await fetch(`${API_BASE_URL}/recommendations?date=${currentDate}`);
    const data = await response.json();
    
    const recommendationList = document.getElementById("recommendation-list");
    if (!recommendationList) return;
    
    let recommendationsHTML = "";
    
    data.recommendations.forEach(rec => {
      recommendationsHTML += `
        <div class="recommendation-item">
          <i class="${rec.icon} fa-fade" style="color: #adf79f;"></i>
          <div>
            <p class="title">${rec.title}</p>
            <p class="desc">${rec.description}</p>
          </div>
        </div>
      `;
    });
    
    recommendationList.innerHTML = recommendationsHTML;
    
  } catch (error) {
    console.error('❌ Error updating recommendations:', error);
  }
}

function showLoadingState() {
  const container = document.querySelector('.dashboard-content');
  if (container) {
    container.style.opacity = '0.7';
    container.style.pointerEvents = 'none';
  }
}

function hideLoadingState() {
  const container = document.querySelector('.dashboard-content');
  if (container) {
    container.style.opacity = '1';
    container.style.pointerEvents = 'auto';
  }
}

function showErrorState(message) {
  const container = document.querySelector('.dashboard-content');
  if (container) {
    container.innerHTML = `
      <div class="error-state" style="text-align: center; padding: 40px;">
        <h2 style="color: #ef4444;">⚠️ Error Loading Dashboard</h2>
        <p style="color: #666; margin: 16px 0;">${message}</p>
        <button onclick="initDashboard()" style="
          padding: 10px 20px; 
          background: #e1fddc; 
          border: none; 
          border-radius: 5px; 
          cursor: pointer;
          font-weight: 500;
        ">
          🔄 Retry
        </button>
      </div>
    `;
  }
}

// Date picker functionality for dashboard
function addDatePicker() {
  const topbar = document.querySelector('.topbar');
  if (topbar && !document.getElementById('dashboard-date-picker')) {
    const datePickerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <label for="dashboard-date-picker" style="font-weight: 500;">Select Date:</label>
        <input 
          type="date" 
          id="dashboard-date-picker" 
          value="${currentDate}"
          style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"
        />
        <button 
          onclick="updateDashboardDate()" 
          style="
            padding: 8px 16px; 
            background: #e1fddc; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer;
            font-weight: 500;
          "
        >
          🔮 Predict
        </button>
      </div>
    `;
    
    topbar.insertAdjacentHTML('beforeend', datePickerHTML);
  }
}

async function updateDashboardDate() {
  const datePicker = document.getElementById('dashboard-date-picker');
  if (datePicker) {
    currentDate = datePicker.value;
    console.log('🗓️ Updating dashboard for date:', currentDate);
    await initDashboard();
  }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
  if (document.querySelector('.dashboard-content')) {
    addDatePicker();
    initDashboard();
  }
});

// Add CSS for new card colors
const style = document.createElement('style');
style.textContent = `
  .card.yellow {
    background: #fffbe6;
    border-left: 4px solid #fbbf24;
  }
  
  .card.orange {
    background: #fff7ed;
    border-left: 4px solid #f97316;
  }
  
  .card.red {
    background: #fef2f2;
    border-left: 4px solid #ef4444;
  }
  
  .error-state {
    background: white;
    border-radius: 12px;
    margin: 20px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  }
`;
document.head.appendChild(style);

// Export for global access
window.updateDashboardDate = updateDashboardDate;
window.testBannerGifSizes = testBannerGifSizes;