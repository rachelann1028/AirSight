// Prediction page API integration with Custom Dropdown
let predictionPollutantChart = null;
let predictionTrendChart = null;
let predictionAccuracyChart = null;
let currentPredictionDate = new Date().toISOString().split("T")[0];

async function initPrediction() {
  try {
    const modelSelect = document.getElementById("model-select");
    const modelDescription = document.getElementById("model-description");

    // Add date picker for predictions
    addPredictionDatePicker();

    // Setup custom model dropdown (NEW)
    setupModelDropdown();

    // Update model options if using old dropdown (FALLBACK)
    if (modelSelect) {
      updateModelOptions();

      // Set up model change listener for old dropdown
      modelSelect.addEventListener("change", async () => {
        await updatePredictionData(modelSelect.value);
      });

      // Load initial data
      await updatePredictionData(modelSelect.value);
    } else {
      // Load initial data with new dropdown
      await updatePredictionData("gradient_boosting");
    }
  } catch (error) {
    console.error("❌ Error initializing prediction page:", error);
    showPredictionError(error.message);
  }
}

// NEW: Custom Model Dropdown Setup
function setupModelDropdown() {
  const dropdown = document.getElementById("modelDropdown");
  const selected = document.getElementById("modelDropdownSelected");
  const options = document.getElementById("modelDropdownOptions");
  const valueSpan = document.getElementById("modelDropdownValue");

  if (!dropdown || !selected || !options || !valueSpan) {
    console.log("⚠️ Model dropdown elements not found - using fallback");
    return;
  }

  console.log("🎨 Setting up model dropdown...");

  // Toggle dropdown
  selected.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = options.classList.contains("show");

    if (isOpen) {
      closeModelDropdown();
    } else {
      openModelDropdown();
    }
  });

  // Handle option selection
  options.addEventListener("click", (e) => {
    const option = e.target.closest(".dropdown-option");
    if (!option) return;

    const value = option.getAttribute("data-value");
    const name = option.querySelector(".option-name").textContent;

    // Add selection animation
    option.classList.add("selecting");
    setTimeout(() => option.classList.remove("selecting"), 300);

    // Update active option
    options.querySelectorAll(".dropdown-option").forEach((opt) => {
      opt.classList.remove("active");
    });
    option.classList.add("active");

    // Update selected value
    valueSpan.textContent = name;

    console.log("🔄 Model changed to:", value);

    // Close dropdown
    closeModelDropdown();

    // Update prediction data
    updatePredictionData(value);
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      closeModelDropdown();
    }
  });

  // Close on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModelDropdown();
    }
  });

  function openModelDropdown() {
    selected.classList.add("active");
    options.classList.add("show");

    // Focus management for accessibility
    const activeOption = options.querySelector(".dropdown-option.active");
    if (activeOption) {
      activeOption.scrollIntoView({ block: "nearest" });
    }
  }

  function closeModelDropdown() {
    selected.classList.remove("active");
    options.classList.remove("show");
  }

  console.log("✅ Model dropdown setup complete");
}

function updateModelOptions() {
  const modelSelect = document.getElementById("model-select");
  if (!modelSelect) return;

  // Update with your actual trained models
  modelSelect.innerHTML = `
    <option value="gradient_boosting">Gradient Boosting (Best: 74.9% accuracy)</option>
    <option value="xgboost">XGBoost (73.0% accuracy)</option>
    <option value="random_forest">Random Forest (70.1% accuracy)</option>
    <option value="lstm">LSTM Neural Network (40.3% accuracy)</option>
  `;
}

async function updatePredictionData(modelName) {
  try {
    showPredictionLoading();

    // Ensure we have a valid date
    if (!currentPredictionDate) {
      currentPredictionDate = new Date().toISOString().split("T")[0];
    }

    // Build API URL with parameters
    const apiUrl = `${API_BASE_URL}/prediction?model=${modelName}&date=${currentPredictionDate}`;
    console.log("🌐 Making API call to:", apiUrl);

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || `HTTP ${response.status}: Failed to fetch prediction data`
      );
    }

    console.log(
      "🔮 Prediction data received for date",
      currentPredictionDate,
      ":",
      data
    );

    // Update model description
    updateModelDescription(modelName, data);

    // Update overall AQI prediction
    updateOverallAQI(data);

    // Update charts with proper data handling
    if (data.trend_data) {
      updateTrendChart(data.trend_data);
    } else {
      console.warn("⚠️ No trend_data found in response");
    }

    if (data.pollutant_forecast) {
      updatePollutantChart(data.pollutant_forecast);
    } else {
      console.warn("⚠️ No pollutant_forecast found in response");
    }

    if (data.accuracy_comparison) {
      updateAccuracyChart(data.accuracy_comparison);
    } else {
      const fallbackAccuracy = {
        labels: ['Gradient Boosting', 'XGBoost', 'Random Forest', 'LSTM'],
        data: [75, 73, 70, 40]  // Real accuracy percentages
      };
      updateAccuracyChart(fallbackAccuracy);
    }

    // ✅ ADD THIS: Update dropdown with real model data
    if (data.model_performances) {
      updateModelDropdownWithRealData(data.model_performances);
      console.log("✅ Updated dropdown with real model performances");
    } else {
      console.warn("⚠️ No model_performances found in response");
    }

    hidePredictionLoading();
  } catch (error) {
    console.error("Error updating prediction data:", error);
    showPredictionError(error.message);
  }
}

function updateModelDescription(modelName, data) {
  const modelDescription = document.getElementById("model-description");
  if (!modelDescription) return;

  const descriptions = {
    gradient_boosting:
      "Gradient Boosting: An ensemble method that builds models sequentially to correct errors. Your BEST performing model with excellent accuracy on air quality data.",
    xgboost:
      "XGBoost: Extreme Gradient Boosting - a highly optimized algorithm. Shows strong performance with your air quality dataset.",
    random_forest:
      "Random Forest: An ensemble of decision trees that provides robust predictions. Reliable and interpretable for air quality forecasting.",
    lstm: "LSTM: Long Short-Term Memory neural network for time series. Captures temporal patterns but requires more data for optimal performance.",
  };

  // REPLACE this section with realistic performance metrics:
  const performance = data.model_performances[modelName];
  let performanceText = "Performance metrics loading...";

  if (performance) {
    performanceText = `
      R² Score: ${(performance.r2_score * 100).toFixed(1)}% (Higher is better)
      MAE: ${performance.mae.toFixed(2)} AQI points (Lower is better)
      RMSE: ${performance.rmse.toFixed(2)} AQI points (Lower is better)`;
  } else {
    // FALLBACK with realistic static values if data is missing:
    const staticPerformance = {
      gradient_boosting: { r2_score: 0.749, mae: 11.2, rmse: 15.3, mape: 16.9 },
      xgboost: { r2_score: 0.730, mae: 12.1, rmse: 16.8, mape: 18.5 },
      random_forest: { r2_score: 0.701, mae: 12.8, rmse: 17.2, mape: 19.2 },
      lstm: { r2_score: 0.403, mae: 15.5, rmse: 20.2, mape: 25.8 }
    };
    
    const fallbackMetrics = staticPerformance[modelName] || staticPerformance.gradient_boosting;
    performanceText = `
      R² Score: ${(fallbackMetrics.r2_score * 100).toFixed(1)}% (Higher is better)
      MAE: ${fallbackMetrics.mae.toFixed(2)} AQI points (Lower is better)
      RMSE: ${fallbackMetrics.rmse.toFixed(2)} AQI points (Lower is better)`;
  }

  modelDescription.innerHTML = `
    <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; border-left: 4px solid #57d9a3;">
      <strong>${
        descriptions[modelName] || "Model description not available"
      }</strong>
      <br><br>
      <strong>Performance Metrics:</strong>
      <pre style="font-family: 'Courier New', monospace; white-space: pre-line; margin-top: 8px; font-size: 13px;">${performanceText}</pre>
    </div>
  `;
}

function updateOverallAQI(data) {
  const overallAQI = document.getElementById("overall-aqi");
  const aqiGrade = document.getElementById("aqi-grade");

  if (overallAQI) {
    overallAQI.textContent = data.overall_aqi;
  }

  if (aqiGrade) {
    aqiGrade.textContent = `${data.aqi_category} (Next 24h)`;

    // Update color based on category
    if (data.overall_aqi <= 50) {
      aqiGrade.style.color = "#22c55e";
    } else if (data.overall_aqi <= 100) {
      aqiGrade.style.color = "#facc15";
    } else if (data.overall_aqi <= 150) {
      aqiGrade.style.color = "#f97316";
    } else {
      aqiGrade.style.color = "#ef4444";
    }
  }
}

function updatePollutantChart(pollutantData) {
  const ctx = document.getElementById("pollutant-chart")?.getContext("2d");
  if (!ctx) return;

  if (predictionPollutantChart) {
    predictionPollutantChart.destroy();
  }

  predictionPollutantChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: pollutantData.labels,
      datasets: [
        {
          label: "Predicted Concentration",
          data: pollutantData.data,
          backgroundColor: pollutantData.data.map((value) =>
            getBarColor(value)
          ),
          borderRadius: 8,
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "🌫️ Pollutant Concentration Forecast",
          font: { size: 14, weight: "bold" },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#111", padding: 10 },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#111", padding: 10 },
          grid: {
            color: "rgba(0,0,0,0.05)",
            borderDash: [3, 4],
            drawBorder: false,
            tickLength: 0,
          },
          border: { display: false },
        },
      },
    },
  });
}
function validateSelectedDate() {
  const datePicker = document.getElementById("prediction-date-picker");
  if (!datePicker) return true;

  const selectedDate = new Date(datePicker.value);
  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 30); // Allow predictions up to 30 days ahead

  if (selectedDate < today) {
    alert("Please select a date from today onwards");
    datePicker.value = today.toISOString().split("T")[0];
    return false;
  }

  if (selectedDate > maxDate) {
    alert("Predictions are only available up to 30 days ahead");
    datePicker.value = maxDate.toISOString().split("T")[0];
    return false;
  }

  return true;
}

function updateTrendChart(trendData) {
  const ctx = document.getElementById("aqi-trend-chart")?.getContext("2d");
  if (!ctx) return;

  if (predictionTrendChart) {
    predictionTrendChart.destroy();
  }

  // Transform the data format from API response to Chart.js format
  let labels = [];
  let data = [];

  if (Array.isArray(trendData)) {
    // If trendData is an array of objects with 'date' and 'aqi' properties
    labels = trendData.map((item) => item.date);
    data = trendData.map((item) => item.aqi);
  } else if (trendData && trendData.labels && trendData.data) {
    // If trendData already has the expected format
    labels = trendData.labels;
    data = trendData.data;
  } else {
    console.error("Invalid trend data format:", trendData);
    return;
  }

  console.log("Processed trend data - Labels:", labels, "Data:", data);

  predictionTrendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Predicted AQI",
          data: data,
          borderColor: "#50cd89",
          backgroundColor: "rgba(80, 205, 137, 0.1)",
          fill: true,
          tension: 0.3,
          pointRadius: 6,
          pointBackgroundColor: "#50cd89",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "7-Day AQI Trend Forecast",
          font: { size: 14, weight: "bold" },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#111", padding: 10 },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#111", padding: 10 },
          grid: {
            display: false
          },
          border: { display: false },
        },
      },
    },
  });
}

function updateModelDropdownWithRealData(modelPerformances) {
  console.log("🔄 Updating dropdown with real model data:", modelPerformances);
  
  // Update each dropdown option with real performance data
  const dropdownOptions = document.querySelectorAll('#modelDropdownOptions .dropdown-option');
  
  dropdownOptions.forEach(option => {
    const modelValue = option.getAttribute('data-value');
    const descSpan = option.querySelector('.option-desc');
    
    if (descSpan && modelPerformances[modelValue]) {
      const r2Score = modelPerformances[modelValue].r2_score;
      const percentage = (r2Score * 100).toFixed(1);
      
      // Update with real model performance
      if (modelValue === 'gradient_boosting') {
        descSpan.textContent = `Best: ${percentage}% accuracy`;
      } else {
        descSpan.textContent = `${percentage}% accuracy`;
      }
      
      console.log(`✅ Updated ${modelValue}: ${percentage}%`);
    }
  });
}

function updateAccuracyChart(accuracyData) {
  const ctx = document
    .getElementById("accuracy-comparison-chart")
    ?.getContext("2d");
  if (!ctx) return;

  if (predictionAccuracyChart) {
    predictionAccuracyChart.destroy();
  }
  
  const decimalData = accuracyData.data.map(percentage => percentage / 100);

  // Calculate dynamic range for better visualization
  const minValue = Math.min(...decimalData);
  const maxValue = Math.max(...decimalData);
  const range = maxValue - minValue;

  // Add padding above and below for better visualization
  const padding = Math.max(range * 0.3, 0.05); // At least 5% padding
  const yMin = Math.max(0, minValue - padding);
  const yMax = Math.min(1, maxValue + padding);

  const themeColors = [
    "#22c55e", // Green - Best performer (Gradient Boosting)
    "#3b82f6", // Blue - Second best (XGBoost)  
    "#8b5cf6", // Purple - Third (Random Forest)
    "#f59e0b"  // Amber - Fourth (LSTM)
  ];

  predictionAccuracyChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: accuracyData.labels,
      datasets: [
        {
          label: "R² Score",
          data: decimalData,
          backgroundColor: themeColors,
          borderColor: themeColors.map(color => color + "CC"),
          borderRadius: 8,
          borderWidth: 2,
          borderRadius: 12,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1200,
        easing: 'easeInOutQuart'
      },
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Model Performance Comparison (R² Score - Higher is Better)",
          font: { size: 16, weight: "bold" },
          color: '#166534',
          padding: 20,
          align: 'center'
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#22c55e',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: function(context) {
              return `${context[0].label} Model`;
            },
            label: function(context) {
              const percentage = (context.parsed.y * 100).toFixed(2);
              return [
                `R² Score: ${percentage}%`,
                `Performance: Explains ${percentage}% of air quality patterns`,
                `Quality: ${getPerformanceRating(context.parsed.y)}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#166534", padding: 10, font: { size: 12, weight: "600" } },
          border: { display: false },
        },
        y: {
          min: yMin,
          max: yMax,
          ticks: {
            color: "#166534",
            padding: 10,
            font: { size: 12, weight: "500" },
            callback: function (value) {
              return value.toFixed(3);
            },
            stepSize: Math.max(range / 5, 0.001)
          },
          grid: {
            display: false
          },
          border: { display: false },
        },
      },
      onHover: (event, elements) => {
        event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
      },
    },
  });
}

//HELPER FUNCTION: Performance rating for tooltips
function getPerformanceRating(r2Score) {
  if (r2Score >= 0.95) return "Outstanding";
  else if (r2Score >= 0.85) return "Excellent"; 
  else if (r2Score >= 0.70) return "Very Good";
  else if (r2Score >= 0.50) return "Good";
  else if (r2Score >= 0.30) return "Fair";
  else return "Needs Improvement";
}

function getBarColor(value) {
  // Color based on concentration level
  if (value < 25) return "#22c55e"; // Green - Good
  else if (value < 50) return "#facc15"; // Yellow - Moderate
  else if (value < 75) return "#f97316"; // Orange - Unhealthy for sensitive
  else return "#ef4444"; // Red - Unhealthy
}

// Enhanced date picker functionality
function addPredictionDatePicker() {
  const predictionContainer = document.querySelector(".prediction-container");
  if (
    predictionContainer &&
    !document.getElementById("prediction-date-picker")
  ) {
    const datePickerHTML = `
      <section style="margin-bottom: 1rem;">
        <div class="flex-row">
          
          <!-- Compact Calendar Dropdown -->
          <div class="custom-dropdown calendar-dropdown" id="calendarPicker" style="margin-right: 16px;">
            <div class="dropdown-selected" id="calendarSelected">
              <span class="dropdown-label">Prediction Date:</span>
              <span class="dropdown-value" id="calendarValue">Today</span>
              <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="6,9 12,15 18,9"></polyline>
              </svg>
            </div>

            <div class="dropdown-options calendar-options" id="calendarOptions">
              <!-- Calendar will be generated here -->
            </div>
          </div>
          
          <!-- Update Button -->
          <button 
            id="update-prediction-btn"
            onclick="updatePredictionFromCalendar()" 
            style="
              padding: 8px 16px; 
              background: #e1fddc; 
              border: none; 
              border-radius: 5px; 
              cursor: pointer;
              font-weight: 500;
              transition: all 0.3s ease;
            "
          >
            Update Prediction
          </button>
        </div>
      </section>

      <!-- COMPACT CALENDAR CSS WITH SIDEBAR THEME -->
      <style>
        .calendar-dropdown {
          width: 320px;
          z-index: 150;
        }

        .calendar-dropdown .dropdown-options {
          max-height: 400px;
          z-index: 1500;
          padding: 16px;
          /* Match sidebar background */
          background: #e1fddc;
          border: 2px solid #cbf0c4;
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding: 0 4px;
        }

        .month-nav {
          background: none;
          border: none;
          font-size: 18px;
          color: #000000ff;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .month-nav:hover {
          background: #cbf0c4;
          transform: scale(1.1);
        }

        .month-title {
          font-weight: 600;
          color: #000000ff;
          font-size: 16px;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }

        .day-header {
          text-align: center;
          font-size: 11px;
          font-weight: 600;
          color: #000000ff;
          padding: 6px 2px;
          background: transparent;
        }

        .calendar-day {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 32px;
          
          /* Normal state - match nav items */
          background: #e1fddc;
          color: #000000ff;
          border: 1px solid transparent;
        }

        .calendar-day:not(.disabled):hover {
          /* Hover state - match nav hover (#cbf0c4) */
          background: #cbf0c4 !important;
          transform: scale(1.05);
          border-color: #f3f4f6;
        }

        .calendar-day.active {
          /* Active state - match nav active */
          background: #cbf0c4 !important;
          border-color: #cbf0c4 ;
          font-weight: 700;
          box-shadow: 0 0 0 2px rgba(22, 101, 52, 0.3);
        }

        .calendar-day.today {
          /* Today gets special green border */
          border: 2px solid #cbf0c4;
          font-weight: 600;
        }

        .calendar-day.disabled {
          background: #f3f4f6;
          color: #000307ff;
          cursor: not-allowed;
          border-color: transparent;
        }

        .calendar-day.disabled:hover {
          background: #f3f4f6 !important;
          transform: none;
          border-color: transparent;
        }

        .calendar-day.other-month {
          color: #9ca3af;
          background: #f8f9fa;
        }

        .calendar-day.other-month:hover {
          background: #e9ecef !important;
        }

        /* Make the dropdown match sidebar style */
        .calendar-dropdown .dropdown-selected {
          background: #f8f9faff;
          border-color: #dde9f4ff;
        }

        .calendar-dropdown .dropdown-selected:hover {
          border-color: #cbf0c4;
          background: #f8f9fa;
        }

        .calendar-dropdown .dropdown-selected.active {
          border-color: #cbf0c4;
          background: #e1fddc;
        }
      </style>
    `;

    predictionContainer.insertAdjacentHTML("afterbegin", datePickerHTML);

    // Setup the compact calendar
    setupCompactCalendar();
  }
}

// Generate compact calendar with navigation
function generateCompactCalendar(year, month) {
  // Get calendar data
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDay = firstDay.getDay(); // 0 = Sunday
  
  // Get previous month's last few days
  const prevMonth = new Date(year, month - 1, 0);
  const daysInPrevMonth = prevMonth.getDate();
  
  const dates = [];
  
  // Add previous month's trailing days
  for (let i = startDay - 1; i >= 0; i--) {
    dates.push({
      day: daysInPrevMonth - i,
      date: new Date(year, month - 1, daysInPrevMonth - i).toISOString().split('T')[0],
      isOtherMonth: true,
      disabled: false
    });
  }
  
  // Add current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateString = date.toISOString().split('T')[0];
    const today = new Date();
    const isToday = (day === today.getDate() && month === today.getMonth() && year === today.getFullYear());
    
    dates.push({
      day: day,
      date: dateString,
      isToday: isToday,
      isOtherMonth: false,
      disabled: false
    });
  }
  
  // Add next month's leading days to fill the grid (6 weeks = 42 days)
  const totalCells = 42;
  const remainingCells = totalCells - dates.length;
  for (let day = 1; day <= remainingCells; day++) {
    dates.push({
      day: day,
      date: new Date(year, month + 1, day).toISOString().split('T')[0],
      isOtherMonth: true,
      disabled: false
    });
  }
  
  return {
    dates: dates,
    monthName: firstDay.toLocaleDateString('en-US', { month: 'long' }),
    year: year
  };
}

// Setup compact calendar functionality
function setupCompactCalendar() {
  const dropdown = document.getElementById("calendarPicker");
  const selected = document.getElementById("calendarSelected");
  const options = document.getElementById("calendarOptions");
  const valueSpan = document.getElementById("calendarValue");

  if (!dropdown || !selected || !options || !valueSpan) {
    console.log("Calendar elements not found");
    return;
  }

  console.log("Setting up compact calendar...");

  // Current date state
  let currentDate = new Date();
  let viewYear = currentDate.getFullYear();
  let viewMonth = currentDate.getMonth();

  function renderCalendar() {
    const { dates, monthName, year } = generateCompactCalendar(viewYear, viewMonth);
    
    let calendarHTML = `
      <div class="calendar-header">
        <button class="month-nav" onclick="changeMonth(-1)">‹</button>
        <div class="month-title">${monthName} ${year}</div>
        <button class="month-nav" onclick="changeMonth(1)">›</button>
      </div>
      
      <div class="calendar-grid">
        <!-- Day headers -->
        <div class="day-header">Su</div>
        <div class="day-header">Mo</div>
        <div class="day-header">Tu</div>
        <div class="day-header">We</div>
        <div class="day-header">Th</div>
        <div class="day-header">Fr</div>
        <div class="day-header">Sa</div>
        
        <!-- Calendar days -->
    `;
    
    dates.forEach(dateInfo => {
      const classes = ['calendar-day'];
      
      if (dateInfo.isToday) classes.push('today', 'active');
      if (dateInfo.isOtherMonth) classes.push('other-month');
      if (dateInfo.disabled) classes.push('disabled');
      
      calendarHTML += `
        <div class="${classes.join(' ')}" data-date="${dateInfo.date}">
          ${dateInfo.day}
        </div>
      `;
    });
    
    calendarHTML += `</div>`;
    options.innerHTML = calendarHTML;
  }

  // Month navigation
  window.changeMonth = function(direction) {
    viewMonth += direction;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear++;
    } else if (viewMonth < 0) {
      viewMonth = 11;
      viewYear--;
    }
    renderCalendar();
  };

  // Initial render
  renderCalendar();

  // Set initial value to today
  valueSpan.textContent = "Today";
  currentPredictionDate = currentDate.toISOString().split('T')[0];

  // Toggle dropdown
  selected.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = options.classList.contains("show");

    if (isOpen) {
      closeCalendar();
    } else {
      openCalendar();
    }
  });

  // Handle day selection
  options.addEventListener("click", (e) => {
    const dayElement = e.target.closest(".calendar-day");
    if (!dayElement || dayElement.classList.contains("disabled")) return;

    const selectedDate = dayElement.getAttribute("data-date");
    
    // Update active state
    options.querySelectorAll(".calendar-day").forEach(day => {
      day.classList.remove("active");
    });
    dayElement.classList.add("active");

    // Update displayed value
    const date = new Date(selectedDate + 'T00:00:00');
    const today = new Date().toISOString().split('T')[0];
    
    if (selectedDate === today) {
      valueSpan.textContent = "Today";
    } else {
      valueSpan.textContent = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }

    // Update global variable
    currentPredictionDate = selectedDate;
    console.log("Date selected:", currentPredictionDate);

    closeCalendar();
  });

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      closeCalendar();
    }
  });

  function openCalendar() {
    selected.classList.add("active");
    options.classList.add("show");
  }

  function closeCalendar() {
    selected.classList.remove("active");
    options.classList.remove("show");
  }

  console.log("Compact calendar setup complete");
}

// Update prediction from calendar
async function updatePredictionFromCalendar() {
  const updateBtn = document.getElementById("update-prediction-btn");

  if (!currentPredictionDate) {
    alert("Please select a date first");
    return;
  }

  console.log("Updating prediction for:", currentPredictionDate);

  if (updateBtn) {
    updateBtn.disabled = true;
    updateBtn.innerHTML = "Updating...";
  }

  try {
    let currentModel = getCurrentSelectedModel();
    await updatePredictionData(currentModel);

    if (updateBtn) {
      updateBtn.innerHTML = "Updated!";
      updateBtn.style.background = "#22c55e";
      updateBtn.style.color = "white";

      setTimeout(() => {
        updateBtn.innerHTML = "Update Prediction";
        updateBtn.style.background = "#e1fddc";
        updateBtn.style.color = "inherit";
      }, 2000);
    }

  } catch (error) {
    console.error("Error updating prediction:", error);

    if (updateBtn) {
      updateBtn.innerHTML = "Error";
      updateBtn.style.background = "#ef4444";
      updateBtn.style.color = "white";

      setTimeout(() => {
        updateBtn.innerHTML = "Update Prediction";
        updateBtn.style.background = "#e1fddc";
        updateBtn.style.color = "inherit";
      }, 3000);
    }
  } finally {
    if (updateBtn) {
      updateBtn.disabled = false;
    }
  }
}

// Generate calendar dates
function generateCalendarDates() {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Get first day of month and number of days
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDay = firstDay.getDay(); // 0 = Sunday

  const dates = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startDay; i++) {
    dates.push({ day: '', disabled: true });
  }
  
  // Add days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dateString = date.toISOString().split('T')[0];
    const isToday = day === today.getDate();
    
    dates.push({
      day: day,
      date: dateString,
      isToday: isToday,
      disabled: false
    });
  }
  
  return {
    dates: dates,
    monthName: firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  };
}

// Setup simple calendar functionality
function setupSimpleCalendar() {
  const dropdown = document.getElementById("calendarPicker");
  const selected = document.getElementById("calendarSelected");
  const options = document.getElementById("calendarOptions");
  const valueSpan = document.getElementById("calendarValue");

  if (!dropdown || !selected || !options || !valueSpan) {
    console.log("Calendar elements not found");
    return;
  }

  console.log("Setting up simple calendar...");

  // Generate calendar content
  const { dates, monthName } = generateCalendarDates();
  
  let calendarHTML = `
    <div class="calendar-header">${monthName}</div>
    
    <div class="calendar-grid">
      <!-- Day headers -->
      <div class="day-header">Su</div>
      <div class="day-header">Mo</div>
      <div class="day-header">Tu</div>
      <div class="day-header">We</div>
      <div class="day-header">Th</div>
      <div class="day-header">Fr</div>
      <div class="day-header">Sa</div>
      
      <!-- Calendar days -->
  `;
  
  dates.forEach(dateInfo => {
    if (dateInfo.disabled) {
      calendarHTML += `<div class="calendar-day disabled"></div>`;
    } else {
      const todayClass = dateInfo.isToday ? 'today active' : '';
      calendarHTML += `
        <div class="calendar-day ${todayClass}" data-date="${dateInfo.date}">
          ${dateInfo.day}
        </div>
      `;
    }
  });
  
  calendarHTML += `</div>`;
  options.innerHTML = calendarHTML;

  // Set initial value to today
  const today = new Date();
  valueSpan.textContent = "Today";
  currentPredictionDate = today.toISOString().split('T')[0];

  // Toggle dropdown
  selected.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = options.classList.contains("show");

    if (isOpen) {
      closeCalendar();
    } else {
      openCalendar();
    }
  });

  // Handle day selection
  options.addEventListener("click", (e) => {
    const dayElement = e.target.closest(".calendar-day");
    if (!dayElement || dayElement.classList.contains("disabled")) return;

    const selectedDate = dayElement.getAttribute("data-date");
    
    // Update active state
    options.querySelectorAll(".calendar-day").forEach(day => {
      day.classList.remove("active");
    });
    dayElement.classList.add("active");

    // Update displayed value
    const date = new Date(selectedDate + 'T00:00:00');
    const isToday = selectedDate === new Date().toISOString().split('T')[0];
    
    if (isToday) {
      valueSpan.textContent = "Today";
    } else {
      valueSpan.textContent = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }

    // Update global variable
    currentPredictionDate = selectedDate;
    console.log("Date selected:", currentPredictionDate);

    closeCalendar();
  });

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      closeCalendar();
    }
  });

  function openCalendar() {
    selected.classList.add("active");
    options.classList.add("show");
  }

  function closeCalendar() {
    selected.classList.remove("active");
    options.classList.remove("show");
  }

  console.log("Simple calendar setup complete");
}

// Update prediction from calendar
async function updatePredictionFromCalendar() {
  const updateBtn = document.getElementById("update-prediction-btn");

  if (!currentPredictionDate) {
    alert("Please select a date first");
    return;
  }

  console.log("Updating prediction for:", currentPredictionDate);

  if (updateBtn) {
    updateBtn.disabled = true;
    updateBtn.innerHTML = "Updating...";
  }

  try {
    let currentModel = getCurrentSelectedModel();
    await updatePredictionData(currentModel);

    if (updateBtn) {
      updateBtn.innerHTML = "Updated!";
      updateBtn.style.background = "#22c55e";
      updateBtn.style.color = "white";

      setTimeout(() => {
        updateBtn.innerHTML = "Update Prediction";
        updateBtn.style.background = "#e1fddc";
        updateBtn.style.color = "inherit";
      }, 2000);
    }

  } catch (error) {
    console.error("Error updating prediction:", error);

    if (updateBtn) {
      updateBtn.innerHTML = "Error";
      updateBtn.style.background = "#ef4444";
      updateBtn.style.color = "white";

      setTimeout(() => {
        updateBtn.innerHTML = "Update Prediction";
        updateBtn.style.background = "#e1fddc";
        updateBtn.style.color = "inherit";
      }, 3000);
    }
  } finally {
    if (updateBtn) {
      updateBtn.disabled = false;
    }
  }
}

// HELPER FUNCTIONS to prediction.js

function getPreviousDate(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function getNextDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function formatDateForDisplay(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  const options = { 
    month: 'short', 
    day: 'numeric' 
  };
  return date.toLocaleDateString('en-US', options);
}

//MODERN DATE PICKER FUNCTIONALITY
function setupModernDatePicker() {
  const dropdown = document.getElementById("datePicker");
  const selected = document.getElementById("datePickerSelected");
  const options = document.getElementById("datePickerOptions");
  const valueSpan = document.getElementById("datePickerValue");
  const hiddenInput = document.getElementById("hidden-date-input");

  if (!dropdown || !selected || !options || !valueSpan) {
    console.log("Date picker elements not found");
    return;
  }

  console.log("Setting up modern date picker...");

  // Toggle dropdown
  selected.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = options.classList.contains("show");

    if (isOpen) {
      closeDateDropdown();
    } else {
      openDateDropdown();
    }
  });

  // Handle option selection
  options.addEventListener("click", async (e) => {
    const option = e.target.closest(".dropdown-option");
    if (!option) return;

    e.stopPropagation();

    const value = option.getAttribute("data-value");
    console.log("Date option selected:", value);

    let selectedDate;
    let displayText;

    switch (value) {
      case "today":
        selectedDate = new Date().toISOString().split('T')[0];
        displayText = "Today";
        break;
      
      case "tomorrow":
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        selectedDate = tomorrow.toISOString().split('T')[0];
        displayText = "Tomorrow";
        break;
      
      case "week":
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        selectedDate = nextWeek.toISOString().split('T')[0];
        displayText = "Next Week";
        break;
      
      case "custom":
        // Show native date picker for custom selection
        hiddenInput.style.display = "block";
        hiddenInput.focus();
        hiddenInput.click();
        
        hiddenInput.addEventListener("change", function() {
          if (this.value) {
            selectedDate = this.value;
            displayText = "Custom Date";
            updateDateSelection(selectedDate, displayText, option);
          }
          this.style.display = "none";
        }, { once: true });
        
        closeDateDropdown();
        return;
      
      default:
        selectedDate = value;
        displayText = option.querySelector('.option-name').textContent;
        break;
    }

    updateDateSelection(selectedDate, displayText, option);
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      closeDateDropdown();
    }
  });

  function openDateDropdown() {
    selected.classList.add("active");
    options.classList.add("show");
  }

  function closeDateDropdown() {
    selected.classList.remove("active");
    options.classList.remove("show");
  }

  function updateDateSelection(selectedDate, displayText, option) {
    // Update active option
    options.querySelectorAll(".dropdown-option").forEach((opt) => {
      opt.classList.remove("active");
    });
    option.classList.add("active");

    // Update displayed value
    valueSpan.textContent = displayText;

    // Update global variable
    currentPredictionDate = selectedDate;
    console.log("Date updated to:", currentPredictionDate);

    closeDateDropdown();
  }
}

// UPDATE FUNCTION
async function updatePredictionFromDropdown() {
  const updateBtn = document.getElementById("update-prediction-btn");

  if (!currentPredictionDate) {
    alert("Please select a date first");
    return;
  }

  console.log("🔮 Updating prediction for:", currentPredictionDate);

  if (updateBtn) {
    updateBtn.disabled = true;
    updateBtn.innerHTML = "⏳ Updating...";
    updateBtn.classList.add("date-updating");
  }

  try {
    let currentModel = getCurrentSelectedModel();
    await updatePredictionData(currentModel);

    if (updateBtn) {
      updateBtn.innerHTML = "Updated!";
      updateBtn.style.background = "#22c55e";
      updateBtn.style.color = "white";

      setTimeout(() => {
        updateBtn.innerHTML = "Update Prediction";
        updateBtn.style.background = "#e1fddc";
        updateBtn.style.color = "inherit";
      }, 2000);
    }

  } catch (error) {
    console.error("Error updating prediction:", error);

    if (updateBtn) {
      updateBtn.innerHTML = "Error";
      updateBtn.style.background = "#ef4444";
      updateBtn.style.color = "white";

      setTimeout(() => {
        updateBtn.innerHTML = "Update Prediction";
        updateBtn.style.background = "#e1fddc";
        updateBtn.style.color = "inherit";
      }, 3000);
    }
  } finally {
    if (updateBtn) {
      updateBtn.disabled = false;
      updateBtn.classList.remove("date-updating");
    }
  }
}

function getCurrentSelectedModel() {
  const modelSelect = document.getElementById("model-select");
  const modelDropdownValue = document.getElementById("modelDropdownValue");

  let currentModel = "gradient_boosting"; // default

  if (modelSelect && modelSelect.value) {
    currentModel = modelSelect.value;
  } else if (modelDropdownValue && modelDropdownValue.textContent) {
    // Map display name back to API value
    const modelMap = {
      "Gradient Boosting": "gradient_boosting",
      XGBoost: "xgboost",
      "Random Forest": "random_forest",
      "LSTM Neural Network": "lstm",
    };
    currentModel =
      modelMap[modelDropdownValue.textContent.trim()] || "gradient_boosting";
  }

  console.log("🤖 Current selected model:", currentModel);
  return currentModel;
}

async function updatePredictionDate() {
  const datePicker = document.getElementById("prediction-date-picker");
  const updateBtn = document.getElementById("update-prediction-btn");

  if (!datePicker) {
    console.error("Date picker not found");
    return;
  }

  const selectedDate = datePicker.value;

  if (!selectedDate) {
    alert("Please select a valid date");
    return;
  }

  // Update the global current date
  currentPredictionDate = selectedDate;
  console.log("Updating prediction for date:", currentPredictionDate);

  // Add loading state to button
  if (updateBtn) {
    updateBtn.disabled = true;
    updateBtn.innerHTML = "Updating...";
    updateBtn.style.opacity = "0.6";
  }

  try {
    // Get current model from either dropdown
    let currentModel = getCurrentSelectedModel();

    // Make the API call with new date
    await updatePredictionData(currentModel);

    // Success feedback
    if (updateBtn) {
      updateBtn.innerHTML = "Updated!";
      updateBtn.style.background = "#22c55e";
      updateBtn.style.color = "white";

      setTimeout(() => {
        updateBtn.innerHTML = "Update Prediction";
        updateBtn.style.background = "#e1fddc";
        updateBtn.style.color = "inherit";
      }, 2000);
    }
  } catch (error) {
    console.error("Error updating prediction:", error);

    // Error feedback
    if (updateBtn) {
      updateBtn.innerHTML = "Error";
      updateBtn.style.background = "#ef4444";
      updateBtn.style.color = "white";

      setTimeout(() => {
        updateBtn.innerHTML = "Update Prediction";
        updateBtn.style.background = "#e1fddc";
        updateBtn.style.color = "inherit";
      }, 3000);
    }
  } finally {
    // Reset button state
    if (updateBtn) {
      updateBtn.disabled = false;
      updateBtn.style.opacity = "1";
    }
  }
}

function showPredictionLoading() {
  const container = document.querySelector(".prediction-container");
  if (container) {
    container.style.opacity = "0.7";
    container.style.pointerEvents = "none";
  }
}

function hidePredictionLoading() {
  const container = document.querySelector(".prediction-container");
  if (container) {
    container.style.opacity = "1";
    container.style.pointerEvents = "auto";
  }
}

function showPredictionError(message) {
  hidePredictionLoading();

  const container = document.querySelector(".prediction-container");
  if (container) {
    const errorHTML = `
      <div class="error-state" style="
        text-align: center; 
        padding: 40px; 
        background: white; 
        border-radius: 12px; 
        margin: 20px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
      ">
        <h2 style="color: #ef4444; margin-bottom: 10px;">Error Loading Predictions</h2>
        <p style="color: #666; margin-bottom: 20px;">${message}</p>
        <button onclick="initPrediction()" style="
          padding: 10px 20px; 
          background: #e1fddc; 
          border: none; 
          border-radius: 5px; 
          cursor: pointer;
          font-weight: 500;
        ">
          Retry
        </button>
      </div>
    `;

    container.innerHTML = errorHTML;
  }
}

// Initialize prediction page when it loads
document.addEventListener("DOMContentLoaded", function () {
  // Check if we're on the prediction page
  if (document.querySelector(".prediction-container")) {
    initPrediction();
  }
});

// Export functions for global access
window.updatePredictionDate = updatePredictionDate;
window.getCurrentSelectedModel = getCurrentSelectedModel;
window.updatePredictionFromDropdown = updatePredictionFromDropdown;
window.updatePredictionFromCalendar = updatePredictionFromCalendar;