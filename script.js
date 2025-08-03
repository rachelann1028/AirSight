// FIXED main script with improved pollutants page handling
const API_BASE_URL = "http://127.0.0.1:5000/api";

const pages = document.querySelectorAll(".page");
const pageLoader = document.getElementById("page-loader");
const aqiMessage = document.getElementById("aqi-message");

const pageTitles = {
  home: "Dashboard",
  prediction: "Prediction Forecast",
  pollutants: "Pollutants Analysis",
  about: "About AirSight",
  feedback: "Contact/Feedback",
  settings: "System Settings",
};

const pageContents = {
  home: "Real-time air quality data and predictions powered by machine learning",
  prediction: "Advanced AI models for accurate air quality forecasting",
  pollutants:
    "Detailed pollutant analysis with historical trends and predictions",
  about: "Information about the AirSight system and team.",
  feedback: "Contact us for questions, suggestions, or feedback",
  settings: "Customize your application preferences and system options",
};

// API health check and initialization
async function checkAPIHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();

    if (data.status === "healthy") {
      console.log("API is healthy. Models trained:", data.models_trained);
      console.log("Best model:", data.best_model);

      if (!data.models_trained) {
        console.warn(
          "⚠️ Models not trained yet. Some features may not work correctly."
        );
        showModelWarning();
      } else {
        showModelSuccess(data.best_model);
      }

      return true;
    }
  } catch (error) {
    console.error("API health check failed:", error);
    showAPIError();
    return false;
  }
}

function showModelSuccess(bestModel) {
  const successHTML = `
    <div id="model-success" style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #d1fae5;
      border: 1px solid #a7f3d0;
      border-radius: 8px;
      padding: 12px 16px;
      max-width: 300px;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    ">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: #065f46;">🎉</span>
        <div>
          <strong style="color: #065f46;">AI Models Ready!</strong>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #065f46;">
            Best model: ${bestModel} • All predictions are live!
          </p>
        </div>
        <button onclick="document.getElementById('model-success').remove()" style="
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #065f46;
        ">×</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", successHTML);

  setTimeout(() => {
    const success = document.getElementById("model-success");
    if (success) success.remove();
  }, 5000);
}

function showModelWarning() {
  const warningHTML = `
    <div id="model-warning" style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 8px;
      padding: 12px 16px;
      max-width: 300px;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    ">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: #856404;">⚠️</span>
        <div>
          <strong style="color: #856404;">Models Initializing</strong>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #856404;">
            Some predictions may show placeholder values until models are fully trained.
          </p>
        </div>
        <button onclick="document.getElementById('model-warning').remove()" style="
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #856404;
        ">×</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", warningHTML);

  setTimeout(() => {
    const warning = document.getElementById("model-warning");
    if (warning) warning.remove();
  }, 10000);
}

function showAPIError() {
  const errorHTML = `
    <div id="api-error" style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 8px;
      padding: 12px 16px;
      max-width: 300px;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    ">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: #721c24;">❌</span>
        <div>
          <strong style="color: #721c24;">API Connection Failed</strong>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #721c24;">
            Please ensure the backend server is running on port 5000.
          </p>
        </div>
        <button onclick="document.getElementById('api-error').remove()" style="
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #721c24;
        ">×</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", errorHTML);
}

document.addEventListener("DOMContentLoaded", function () {
  checkAPIHealth();
  showPage("home");
});

function setActiveNav(activeId) {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
  });
  const activeNavItem = document.querySelector(`[data-page="${activeId}"]`);
  if (activeNavItem) {
    activeNavItem.classList.add("active");
  }
}

// SOLUTION: Enhanced showPage function with proper pollutants handling
function showPage(targetPageId) {
  const currentActive = document.querySelector(".nav-item.active");
  const container = document.getElementById("page-container");

  if (
    currentActive &&
    currentActive.dataset.page === targetPageId &&
    container.innerHTML.trim() !== ""
  )
    return;

  const fullscreenLoader = document.getElementById("fullscreen-loader");
  const pageTitle = document.getElementById("page-title");
  const pageContent = document.getElementById("page-content");

  if (pageTitle) pageTitle.textContent = pageTitles[targetPageId] || "AirSight";
  if (pageContent) pageContent.textContent = pageContents[targetPageId] || "";

  fullscreenLoader?.classList.remove("hidden");

  // SOLUTION: Clear any existing pollutant state when leaving pollutants page
  if (
    currentActive &&
    currentActive.dataset.page === "pollutants" &&
    targetPageId !== "pollutants"
  ) {
    console.log("Cleaning up pollutants page state...");
    window.pollutantInitialized = false;

    // Clear any pollutant-related timers
    if (window.pollutantInitTimer) {
      clearTimeout(window.pollutantInitTimer);
    }
  }

  setTimeout(() => {
    document
      .querySelectorAll(".nav-item")
      .forEach((link) => link.classList.remove("active"));
    document
      .querySelector(`.nav-item[data-page="${targetPageId}"]`)
      ?.classList.add("active");

    fetch(`${targetPageId}.html`)
      .then((res) => {
        if (!res.ok) throw new Error("Page not found");
        return res.text();
      })
      .then((data) => {
        container.innerHTML = data;

        const dateElement = container.querySelector("#date");
        if (dateElement) {
          dateElement.innerText = new Date().toDateString();
        }

        if (targetPageId === "settings") {
          const toggle = container.querySelector("#theme-toggle");
          if (toggle) {
            if (localStorage.getItem("theme") === "dark") {
              document.documentElement.classList.add("dark");
              toggle.checked = true;
            }

            toggle.addEventListener("change", function () {
              if (this.checked) {
                document.documentElement.classList.add("dark");
                localStorage.setItem("theme", "dark");
              } else {
                document.documentElement.classList.remove("dark");
                localStorage.setItem("theme", "light");
              }
            });
          }
        }

        // SOLUTION: Enhanced page-specific initialization
        if (targetPageId === "home") {
          if (typeof initDashboard === "function") {
            initDashboard();
          }
        } else if (targetPageId === "pollutants") {
          // SOLUTION: Robust pollutants page initialization
          console.log("Loading pollutants page...");

          // Reset initialization flag
          window.pollutantInitialized = false;

          // Multiple initialization attempts with increasing delays
          const initAttempts = [
            { delay: 200, description: "immediate" },
            { delay: 500, description: "quick retry" },
            { delay: 1000, description: "delayed retry" },
            { delay: 2000, description: "final attempt" },
          ];

          initAttempts.forEach((attempt, index) => {
            setTimeout(() => {
              const canvas = document.getElementById("pollutantChart");

              if (canvas && !window.pollutantInitialized) {
                console.log(
                  `Attempt ${index + 1} (${
                    attempt.description
                  }): Initializing pollutants...`
                );

                try {
                  if (typeof initPollutant === "function") {
                    initPollutant("daily", "PM2.5");
                    window.pollutantInitialized = true;
                    console.log(
                      `Pollutants initialized on attempt ${index + 1}`
                    );
                  } else if (typeof ensurePollutantInit === "function") {
                    ensurePollutantInit();
                  } else {
                    // Fallback: create chart directly
                    createEmergencyChart();
                  }
                } catch (error) {
                  console.error(`Attempt ${index + 1} failed:`, error);

                  if (index === initAttempts.length - 1) {
                    console.log(
                      "All attempts failed, creating emergency chart..."
                    );
                    createEmergencyChart();
                  }
                }
              }
            }, attempt.delay);
          });
        } else if (targetPageId === "prediction") {
          if (typeof initPrediction === "function") {
            initPrediction();
          }
        }
      })
      .catch((err) => {
        container.innerHTML = `
          <div class="error-state" style="
            text-align: center; 
            padding: 40px; 
            background: white; 
            border-radius: 12px; 
            margin: 20px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
          ">
            <h1 style="color: #ef4444; margin-bottom: 10px;">Error</h1>
            <p style="color: #666; margin-bottom: 20px;">${err.message}</p>
            <button onclick="showPage('${targetPageId}')" style="
              padding: 10px 20px; 
              background: #e1fddc; 
              border: none; 
              border-radius: 5px; 
              cursor: pointer;
            ">
              Retry
            </button>
          </div>
        `;
      })
      .finally(() => {
        setTimeout(() => {
          fullscreenLoader?.classList.add("hidden");
        }, 400);
      });
  }, 500);
}

// SOLUTION: Emergency chart creation function
function createEmergencyChart() {
  console.log("Creating emergency chart...");

  const canvas = document.getElementById("pollutantChart");
  if (!canvas) {
    console.error("Canvas not found for emergency chart");
    return;
  }

  const ctx = canvas.getContext("2d");

  // Destroy any existing chart
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();

  // Create basic chart with static data
  try {
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Jul 20", "Jul 21", "Jul 22", "Jul 23", "Jul 24"],
        datasets: [
          {
            label: "AQI Data (Emergency Mode)",
            data: [45, 52, 38, 61, 49],
            backgroundColor: [
              "#22c55e",
              "#facc15",
              "#22c55e",
              "#facc15",
              "#22c55e",
            ],
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
          title: {
            display: true,
            text: "Air Quality Data (Emergency Mode - Chart Working!)",
            font: { size: 16, weight: "bold" },
            color: "#ef4444",
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, max: 100 },
        },
      },
    });

    console.log("✅ Emergency chart created successfully!");

    // Try to fetch real data after emergency chart is created
    setTimeout(() => {
      fetch(`${API_BASE_URL}/pollutants?filter=daily&pollutant=PM2.5`)
        .then((response) => response.json())
        .then((data) => {
          if (data.chart_data && data.chart_data.labels) {
            console.log("Got real data, updating emergency chart...");
            updateEmergencyChart(data.chart_data);
          }
        })
        .catch((error) => console.log("Failed to fetch real data:", error));
    }, 1000);
  } catch (error) {
    console.error("Emergency chart creation failed:", error);
  }
}

function updateEmergencyChart(chartData) {
  const canvas = document.getElementById("pollutantChart");
  if (!canvas) return;

  const chart = Chart.getChart(canvas);
  if (!chart) return;

  try {
    chart.data.labels = chartData.labels;
    chart.data.datasets[0].data = chartData.data;
    chart.data.datasets[0].backgroundColor = chartData.data.map((val) =>
      val < 50 ? "#22c55e" : val < 100 ? "#facc15" : "#f97316"
    );
    chart.options.plugins.title.text = "Air Quality Data (Live Data!)";
    chart.options.plugins.title.color = "#166534";
    chart.update();

    console.log("Emergency chart updated with real data!");
  } catch (error) {
    console.error("Failed to update emergency chart:", error);
  }
}

// Sidebar toggle logic
const menuToggle = document.getElementById("menu-toggle");
const sidebar = document.querySelector(".sidebar");
const overlay = document.getElementById("overlay");

menuToggle?.addEventListener("click", () => {
  sidebar?.classList.toggle("open");
  overlay?.classList.toggle("hidden");
});

overlay?.addEventListener("click", () => {
  sidebar?.classList.remove("open");
  overlay?.classList.add("hidden");
});

const navLinks = document.querySelectorAll(".nav-item");
navLinks.forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    const page = this.dataset.page;
    showPage(page);
    if (window.innerWidth < 1024) {
      sidebar?.classList.remove("open");
      overlay?.classList.add("hidden");
    }
  });
});

// Utility functions for API interaction
async function makeAPIRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return data;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
}

// SOLUTION: Additional helper functions for missing functionality

// Keep all existing helper functions from your original initPollutant.js
function updateHighestConcentration(highestData) {
  const container = document.querySelector(".grid.grid-cols-5");
  if (!container || !highestData) {
    console.log("No container or data for highest concentration");
    return;
  }

  let html = "";
  console.log("highestData", highestData);
  highestData.forEach((item) => {
    html += `
      <div class="space-y-1">
        <p class="text-sm text-gray-500">
          <span class="text-2xl font-bold text-gray-900">${item.day}</span> ${
      item.month_name
    }
        </p>
        <p class="font-semibold text-gray-800">${item.pollutant}</p>
        <p class="text-lg font-bold ${getConcentrationColor(
          item.pollutant,
          item.concentration
        )}">
          ${item.concentration} ${item.unit}
        </p>
      </div>
    `;
  });

  container.innerHTML = html;
  console.log("Updated highest concentration display");
}

function getConcentrationColor(pollutant, concentration) {
  const thresholds = {
    "PM2.5": { moderate: 35, unhealthy: 55 },
    PM10: { moderate: 155, unhealthy: 255 },
    O3: { moderate: 70, unhealthy: 85 },
    NO2: { moderate: 54, unhealthy: 100 },
    SO2: { moderate: 36, unhealthy: 75 },
    CO: { moderate: 9, unhealthy: 15 },
  };

  const threshold = thresholds[pollutant];
  if (!threshold) return "text-gray-600";

  if (concentration <= threshold.moderate) return "text-green-500";
  else if (concentration <= threshold.unhealthy) return "text-yellow-500";
  else return "text-red-500";
}


// Helper functions for enhanced calendar
function getEnhancedAQIColors(aqi) {
  if (aqi <= 50) {
    return {
      bgColor: "bg-gradient-to-br from-green-100 to-green-200",
      textColor: "text-green-800",
      borderColor: "border-2 border-green-300 shadow-green-200",
      pulseClass: "",
    };
  } else if (aqi <= 100) {
    return {
      bgColor: "bg-gradient-to-br from-yellow-100 to-yellow-200",
      textColor: "text-yellow-800",
      borderColor: "border-2 border-yellow-300 shadow-yellow-200",
      pulseClass: "",
    };
  } else if (aqi <= 150) {
    return {
      bgColor: "bg-gradient-to-br from-orange-100 to-orange-200",
      textColor: "text-orange-800",
      borderColor: "border-2 border-orange-300 shadow-orange-200",
      pulseClass: "animate-pulse-slow",
    };
  } else {
    return {
      bgColor: "bg-gradient-to-br from-red-100 to-red-200",
      textColor: "text-red-800",
      borderColor: "border-2 border-red-400 shadow-red-200",
      pulseClass: "animate-pulse",
    };
  }
}

function getAQILevel(aqi) {
  if (aqi <= 50) return "Good";
  else if (aqi <= 100) return "Moderate";
  else if (aqi <= 150) return "Unhealthy for Sensitive";
  else if (aqi <= 200) return "Unhealthy";
  else return "Very Unhealthy";
}

function getPollutantIcon(pollutant) {
  const icons = {
    "PM2.5": "🌫️",
    PM10: "💨",
    O3: "☀️",
    NO2: "🚗",
    SO2: "🏭",
    CO: "🔥",
  };
  return icons[pollutant] || "🌪️";
}

function getHealthAdvice(aqi) {
  if (aqi <= 50) return "👍 Great for outdoor activities!";
  else if (aqi <= 100) return "😐 Moderate - limit prolonged outdoor exertion";
  else if (aqi <= 150)
    return "😷 Sensitive groups should avoid outdoor activities";
  else return "🚨 Everyone should avoid outdoor activities";
}

function addPollutantDateControls() {
  const mainElement = document.querySelector("main.flex-1");
  if (mainElement && !document.getElementById("pollutant-date-controls")) {
    const dateControlsHTML = `
      <div id="pollutant-date-controls" style="
        background: white; 
        padding: 16px; 
        border-radius: 12px; 
        margin-bottom: 16px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
      ">
        <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <label for="year-select" style="font-weight: 500;">Year:</label>
            <select id="year-select" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;width: 80px;"">
              <option value="2023">2023</option>
              <option value="2024">2024</option>
              <option value="2025" selected>2025</option>
              <option value="2026">2026</option>
            </select>
          </div>
          
          <div style="display: flex; align-items: center; gap: 8px;">
            <label for="month-select" style="font-weight: 500;">Month:</label>
            <select id="month-select" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;width: 150px;">
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7" selected>July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>
          
          <button onclick="updatePollutantDateSelection()" style="
            padding: 8px 16px; 
            background: #e1fddc; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer;
            font-weight: 500;
          ">
            Predict Month
          </button>
        </div>
      </div>
    `;

    mainElement.insertAdjacentHTML("afterbegin", dateControlsHTML);

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    document.getElementById("year-select").value = currentYear;
    document.getElementById("month-select").value = currentMonth;
  }
}

async function updatePollutantDateSelection() {
  const yearSelect = document.getElementById("year-select");
  const monthSelect = document.getElementById("month-select");

  if (yearSelect && monthSelect) {
    // Update global variables if they exist
    if (typeof window.currentYear !== "undefined") {
      window.currentYear = parseInt(yearSelect.value);
      window.currentMonth = parseInt(monthSelect.value);
    }

    console.log(`Date changed to: ${yearSelect.value}-${monthSelect.value}`);

    // Update data if function exists
    if (typeof window.updatePollutantData === "function") {
      await window.updatePollutantData();
    }
  }
}

function showPollutantLoading() {
  const mainElement = document.querySelector("main.flex-1");
  if (mainElement) {
    mainElement.style.opacity = "0.7";
    mainElement.style.pointerEvents = "none";
  }
}

function hidePollutantLoading() {
  const mainElement = document.querySelector("main.flex-1");
  if (mainElement) {
    mainElement.style.opacity = "1";
    mainElement.style.pointerEvents = "auto";
  }
}

// SOLUTION: Enhanced Chart.js monitoring and auto-recovery
let chartMonitorInterval = null;

function startChartMonitoring() {
  // Clear any existing monitoring
  if (chartMonitorInterval) {
    clearInterval(chartMonitorInterval);
  }

  // Monitor chart health every 3 seconds
  chartMonitorInterval = setInterval(() => {
    const canvas = document.getElementById("pollutantChart");
    const currentPage =
      document.querySelector(".nav-item.active")?.dataset.page;

    if (
      currentPage === "pollutants" &&
      canvas &&
      canvas.offsetParent !== null
    ) {
      const chart = Chart.getChart(canvas);

      if (!chart && !window.pollutantInitialized) {
        console.log("🔧 Chart monitor: Attempting recovery...");

        try {
          if (typeof ensurePollutantInit === "function") {
            ensurePollutantInit();
          } else {
            createEmergencyChart();
          }
        } catch (error) {
          console.error("Chart recovery failed:", error);
        }
      }
    }
  }, 3000);
}

function stopChartMonitoring() {
  if (chartMonitorInterval) {
    clearInterval(chartMonitorInterval);
    chartMonitorInterval = null;
  }
}

// Start monitoring when document is ready
document.addEventListener("DOMContentLoaded", () => {
  startChartMonitoring();
});

// Stop monitoring when page unloads
window.addEventListener("beforeunload", () => {
  stopChartMonitoring();
});

// Global utility functions
window.makeAPIRequest = makeAPIRequest;
window.API_BASE_URL = API_BASE_URL;
window.updatePollutantDateSelection = updatePollutantDateSelection;
window.createEmergencyChart = createEmergencyChart;
window.updateEmergencyChart = updateEmergencyChart;
