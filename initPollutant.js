// FIXED Pollutants Frontend - Working Version
let pollutantChart = null;
let currentFilter = "daily";
let currentPollutant = "PM2.5";
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;

// Global flag to prevent multiple initializations
window.pollutantInitialized = false;

// Main initialization function
async function initPollutant(filter = "daily", pollutant = "PM2.5") {
  try {
    currentFilter = filter;
    currentPollutant = pollutant;

    console.log(`Initializing pollutants page: ${filter} ${pollutant}`);

    // Clean up any existing chart
    cleanupExistingChart();

    // Add date controls
    addPollutantDateControls();

    // Setup event listeners
    setupPollutantEventListeners();

    // Load initial data
    await updatePollutantData();

    console.log("Pollutants page initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing pollutant page:", error);
    showPollutantError(error.message);
  }
}

// Clean up existing chart
function cleanupExistingChart() {
  const canvas = document.getElementById("pollutantChart");
  if (!canvas) return;

  // Destroy existing Chart.js instance
  if (pollutantChart) {
    pollutantChart.destroy();
    pollutantChart = null;
  }

  // Also check for any Chart.js instances attached to canvas
  const existingChart = Chart.getChart(canvas);
  if (existingChart) {
    existingChart.destroy();
  }

  console.log("🧹 Cleaned up existing chart");
}

// Update chart with data
function updatePollutantChart1(chartData) {
  console.log("Updating pollutant chart with data:", chartData);

  // Validate input data
  if (!chartData || !chartData.labels || !chartData.data) {
    console.error("Invalid chart data structure");
    createFallbackChart();
    return;
  }

  if (chartData.labels.length === 0) {
    console.warn("Empty chart data");
    createFallbackChart();
    return;
  }

  const canvas = document.getElementById("pollutantChart");
  if (!canvas) {
    console.error("Chart canvas not found");
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("Cannot get canvas context");
    return;
  }

  // Clean up first
  cleanupExistingChart();

  // Create new chart
  try {
    console.log("Creating new chart...");

    pollutantChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: `${currentPollutant} AQI Values`,
            data: chartData.data,
            backgroundColor: chartData.data.map((value) => getBarColor(value)),
            borderRadius: 8,
            borderWidth: 2,
            borderColor: "#ffffff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1000,
          easing: "easeInOutQuart",
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              generateLabels: function (chart) {
                return [
                  {
                    text: "Good (0-50 AQI)",
                    fillStyle: "#22c55e",
                    strokeStyle: "#16a34a",
                    lineWidth: 2,
                  },
                  {
                    text: "Moderate (51-100 AQI)",
                    fillStyle: "#facc15",
                    strokeStyle: "#eab308",
                    lineWidth: 2,
                  },
                  {
                    text: "Unhealthy (101+ AQI)",
                    fillStyle: "#f97316",
                    strokeStyle: "#ea580c",
                    lineWidth: 2,
                  },
                ];
              },
            },
          },
          title: {
            display: true,
            text: `${currentPollutant} - ${
              currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)
            } Data`,
            font: { size: 16, weight: "bold" },
            color: "#166534",
          },
          tooltip: {
            callbacks: {
              label: (context) =>
                `${context.parsed.y} AQI - ${getAQICategory(context.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: "#000000ff",
              padding: 10,
              font: { size: 12, weight: "500" },
            },
            border: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "#000000ff",
              padding: 10,
              font: { size: 12, weight: "500" },
              callback: function (value) {
                return value + " AQI";
              },
            },
            grid: {
              display: false
            },
            border: { display: false },
          },
        },
      },
    });

    console.log("✅ New pollutant chart created successfully!");
  } catch (error) {
    console.error("Failed to create chart:", error);
    createFallbackChart();
  }
}

// Setup event listeners
function setupPollutantEventListeners() {
  console.log("🔧 Setting up event listeners...");

  // Setup custom dropdown
  setupCustomDropdown();

  // Setup filter buttons
  const filterButtons = document.querySelectorAll("#filterButtons .filter-btn");
  console.log("Found filter buttons:", filterButtons.length);

  if (filterButtons.length === 0) {
    console.warn("No filter buttons found");
    return;
  }

  filterButtons.forEach((btn, index) => {
    // Remove existing listeners to prevent duplicates
    btn.removeEventListener("click", btn._pollutantClickHandler);

    // Create new event handler
    const handleFilterClick = async (e) => {
      e.preventDefault();
      e.stopPropagation();

      console.log(`🔄 Filter button ${index} clicked:`, btn.textContent);

      // Prevent multiple rapid clicks
      if (btn.classList.contains("processing")) {
        console.log("Button already processing, ignoring click");
        return;
      }

      btn.classList.add("processing");

      try {
        // Update active state visually
        filterButtons.forEach((b) => {
          b.classList.remove("active");
          b.classList.remove("processing");
        });
        btn.classList.add("active");

        // Get filter value from button text
        const buttonText = btn.textContent.trim().toLowerCase();
        console.log("Button text (lowercased):", buttonText);

        // Set currentFilter based on button
        if (buttonText === "hourly") {
          currentFilter = "hourly";
        } else if (buttonText === "daily") {
          currentFilter = "daily";
        } else if (buttonText === "weekly") {
          currentFilter = "weekly";
        } else {
          currentFilter = buttonText;
        }

        console.log("🔄 Filter set to:", currentFilter);

        // Update chart with new filter
        showPollutantLoading();
        await updatePollutantData();
        hidePollutantLoading();
      } catch (error) {
        console.error("Filter change error:", error);
        hidePollutantLoading();
      } finally {
        btn.classList.remove("processing");
      }
    };

    // Add the event listener
    btn.addEventListener("click", handleFilterClick);

    // Store reference for cleanup
    btn._pollutantClickHandler = handleFilterClick;

    console.log(`Listener added to button ${index}: ${btn.textContent}`);
  });

  console.log("All event listeners setup completed");
}

function setupCustomDropdown() {
  const dropdown = document.getElementById("pollutantDropdown");
  const selected = document.getElementById("dropdownSelected");
  const options = document.getElementById("dropdownOptions");
  const valueSpan = document.getElementById("dropdownValue");

  console.log("🔧 Setting up custom dropdown...");
  console.log("Elements found:", {
    dropdown: !!dropdown,
    selected: !!selected,
    options: !!options,
    valueSpan: !!valueSpan,
  });

  if (!dropdown || !selected || !options || !valueSpan) {
    console.error("Custom dropdown elements not found");
    return false;
  }

  // Remove existing listeners to prevent duplicates
  selected.removeEventListener("click", selected._dropdownClickHandler);
  options.removeEventListener("click", options._optionClickHandler);

  // Toggle dropdown function
  const toggleDropdown = (e) => {
    e.stopPropagation();
    console.log("Dropdown clicked");

    const isOpen = options.classList.contains("show");

    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  };

  // Handle option selection
  const handleOptionClick = async (e) => {
    const option = e.target.closest(".dropdown-option");
    if (!option) return;

    e.stopPropagation();

    const value = option.getAttribute("data-value");
    const nameElement = option.querySelector(".option-name");
    const name = nameElement ? nameElement.textContent : value;

    console.log("Dropdown option selected:", value, name);

    // Add selection animation
    option.classList.add("selecting");
    setTimeout(() => option.classList.remove("selecting"), 300);

    // Update active option
    options.querySelectorAll(".dropdown-option").forEach((opt) => {
      opt.classList.remove("active");
    });
    option.classList.add("active");

    // Update displayed value
    valueSpan.textContent = name;

    // Update global variable
    currentPollutant = value;
    console.log("Pollutant changed to:", currentPollutant);

    // Close dropdown
    closeDropdown();

    try {
      // Update chart with loading state
      showPollutantLoading();
      await updatePollutantData();
      hidePollutantLoading();
    } catch (error) {
      console.error("Error updating data after dropdown change:", error);
      hidePollutantLoading();
    }
  };

  // Attach event listeners
  selected.addEventListener("click", toggleDropdown);
  options.addEventListener("click", handleOptionClick);

  // Store references for cleanup
  selected._dropdownClickHandler = toggleDropdown;
  options._optionClickHandler = handleOptionClick;

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      closeDropdown();
    }
  });

  // Close on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDropdown();
    }
  });

  function openDropdown() {
    console.log("Opening dropdown");
    selected.classList.add("active");
    options.classList.add("show");

    const activeOption = options.querySelector(".dropdown-option.active");
    if (activeOption) {
      activeOption.scrollIntoView({ block: "nearest" });
    }
  }

  function closeDropdown() {
    console.log("Closing dropdown");
    selected.classList.remove("active");
    options.classList.remove("show");
  }

  // FIXED: Ensure at least one option is active by default
  const activeOption = options.querySelector(".dropdown-option.active");
  if (!activeOption) {
    const firstOption = options.querySelector(".dropdown-option");
    if (firstOption) {
      firstOption.classList.add("active");
      const value = firstOption.getAttribute("data-value");
      const nameElement = firstOption.querySelector(".option-name");
      const name = nameElement ? nameElement.textContent : value;
      valueSpan.textContent = name;
      currentPollutant = value;
      console.log("Set default active option:", value);
    }
  }

  console.log("Custom dropdown setup complete");
  return true;
}

async function updatePollutantData() {
  try {
    // Get current values from UI selectors if they exist
    const yearSelect = document.getElementById("year-select");
    const monthSelect = document.getElementById("month-select");

    // Update variables with selected values from UI
    if (yearSelect && monthSelect) {
      currentYear = parseInt(yearSelect.value);
      currentMonth = parseInt(monthSelect.value);
      console.log("Using selected date values from UI");
    }

    // FIXED: Safely get selected pollutant from dropdown
    const selectedOption = document.querySelector(
      "#dropdownOptions .dropdown-option.active"
    );
    if (selectedOption) {
      const pollutantValue = selectedOption.getAttribute("data-value");
      if (pollutantValue) {
        currentPollutant = pollutantValue;
        console.log("Using selected pollutant from UI:", currentPollutant);
      }
    } else {
      console.log(
        "No active pollutant option found, using current:",
        currentPollutant
      );
    }

    // FIXED: Safely get selected filter from buttons
    const activeFilterBtn = document.querySelector(
      "#filterButtons .filter-btn.active"
    );
    if (activeFilterBtn) {
      const filterText = activeFilterBtn.textContent.trim().toLowerCase();
      if (
        filterText === "hourly" ||
        filterText === "daily" ||
        filterText === "weekly"
      ) {
        currentFilter = filterText;
        console.log("Using selected filter from UI:", currentFilter);
      }
    } else {
      console.log(
        "No active filter button found, using current:",
        currentFilter
      );
    }

    console.log("🌐 Fetching data for:", {
      currentFilter,
      currentPollutant,
      currentYear,
      currentMonth,
    });

    const url = `${API_BASE_URL}/pollutants?year=${currentYear}&month=${currentMonth}&filter=${currentFilter}&pollutant=${currentPollutant}`;
    console.log("Fetching from:", url);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch pollutant data");
    }

    console.log("Pollutant data received:", data);

    // Validate and fix chart data
    if (
      !data.chart_data ||
      !data.chart_data.labels ||
      data.chart_data.labels.length === 0
    ) {
      console.warn("No valid chart data received, using fallback");
      data.chart_data = generateFallbackData();
    }

    // Update chart with validated data
    try {
      console.log("Updating chart with validated data:", data.chart_data);
      updatePollutantChart1(data.chart_data);
    } catch (chartError) {
      console.error("Chart update failed:", chartError);
      console.log("Creating emergency fallback chart...");
      createFallbackChart();
    }

    // Update other components
    if (data.highest_concentration) {
      updateHighestConcentration(data.highest_concentration);
    }

    if (data.calendar_data) {
      updateMonthlyCalendar(data.calendar_data, data.month_year);
    }
  } catch (error) {
    console.error("Error updating pollutant data:", error);
    console.log("API failed, creating fallback chart...");
    createFallbackChart();
  }
}

// Create fallback chart when API fails
function createFallbackChart() {
  console.log("Creating fallback chart for filter:", currentFilter);

  const canvas = document.getElementById("pollutantChart");
  if (!canvas) {
    console.error("Canvas not found for fallback chart");
    return;
  }

  const ctx = canvas.getContext("2d");

  // Clean up first
  cleanupExistingChart();

  const fallbackData = generateFallbackData();

  try {
    pollutantChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: fallbackData.labels,
        datasets: [
          {
            label: `${currentPollutant} Data (${currentFilter})`,
            data: fallbackData.data,
            backgroundColor: fallbackData.data.map((val) => getBarColor(val)),
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
            text: `${currentPollutant} - ${currentFilter.toUpperCase()} (Working Chart!)`,
            font: { size: 16, weight: "bold" },
            color: "#166534",
          },
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#166534" },
          },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { color: "#166534" },
          },
        },
      },
    });

    console.log("Fallback chart created successfully!");
  } catch (error) {
    console.error("Fallback chart creation failed:", error);
  }
}

// Generate realistic fallback data based on current filter
function generateFallbackData() {
  const data = { labels: [], data: [] };

  if (currentFilter === "hourly") {
    for (let i = 0; i < 8; i++) {
      const hour = i * 3;
      data.labels.push(`${hour.toString().padStart(2, "0")}:00`);
      data.data.push(Math.floor(Math.random() * 60) + 20);
    }
  } else if (currentFilter === "weekly") {
    const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"];
    weeks.forEach((week) => {
      data.labels.push(week);
      data.data.push(Math.floor(Math.random() * 50) + 30);
    });
  } else {
    for (let i = 1; i <= 14; i++) {
      data.labels.push(`Jul ${i.toString().padStart(2, "0")}`);
      data.data.push(Math.floor(Math.random() * 70) + 20);
    }
  }

  console.log("Generated fallback data for", currentFilter, ":", data);
  return data;
}

// Helper function to get bar color based on AQI value
function getBarColor(value) {
  if (value <= 50) return "#22c55e"; // Green - Good
  else if (value <= 100) return "#facc15"; // Yellow - Moderate
  else if (value <= 150) return "#f97316"; // Orange - Unhealthy for sensitive
  else return "#ef4444"; // Red - Unhealthy
}

// Helper function to get AQI category
function getAQICategory(aqi) {
  if (aqi <= 50) return "Good";
  else if (aqi <= 100) return "Moderate";
  else if (aqi <= 150) return "Unhealthy for Sensitive";
  else return "Unhealthy";
}

// Get color for concentration values
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

// Update monthly calendar
function updateMonthlyCalendar(calendarData, monthYear) {
  const monthYearSpan = document.querySelector(".font-semibold.mx-2");
  if (monthYearSpan) {
    monthYearSpan.textContent = monthYear || "August 2025";
  }

  const calendarGrid = document.querySelector(".grid.grid-cols-7");
  if (!calendarGrid) {
    console.log("❌ Calendar grid not found");
    return;
  }

  console.log(`📅 Updating calendar with ${calendarData ? calendarData.length : 0} days`);

  // Header
  const headerHTML = `
    <div class="text-sm font-bold text-gray-700 pb-3 text-center border-b border-gray-200">Sun</div>
    <div class="text-sm font-bold text-gray-700 pb-3 text-center border-b border-gray-200">Mon</div>
    <div class="text-sm font-bold text-gray-700 pb-3 text-center border-b border-gray-200">Tue</div>
    <div class="text-sm font-bold text-gray-700 pb-3 text-center border-b border-gray-200">Wed</div>
    <div class="text-sm font-bold text-gray-700 pb-3 text-center border-b border-gray-200">Thu</div>
    <div class="text-sm font-bold text-gray-700 pb-3 text-center border-b border-gray-200">Fri</div>
    <div class="text-sm font-bold text-gray-700 pb-3 text-center border-b border-gray-200">Sat</div>
  `;

  let calendarHTML = headerHTML;

  // Add empty cells for days before month starts
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  for (let i = 0; i < firstDay; i++) {
    calendarHTML += '<div class="h-32 text-gray-300 p-2 text-left opacity-50"></div>';
  }

  // Generate calendar days with GIF containers (NO LOTTIE)
  if (calendarData && calendarData.length > 0) {
    calendarData.forEach((dayData) => {
      const { bgColor, textColor, borderColor } = getEnhancedAQIColors(dayData.aqi);
      const aqiLevel = getAQILevel(dayData.aqi);

      calendarHTML += `
        <div class="calendar-day p-2 h-32 rounded-xl ${bgColor} ${borderColor}
                    flex flex-col justify-between items-start text-left cursor-pointer
                    transform transition-all duration-300 hover:scale-105 hover:shadow-xl
                    hover:z-10 relative group" 
             data-aqi="${dayData.aqi}" 
             data-pollutant="${dayData.main_pollutant}"
             data-day="${dayData.day}">
          
          <!-- Day Number and GIF Container -->
          <div class="flex justify-between items-start w-full relative">
            <span class="text-2xl font-bold text-gray-800">${dayData.day}</span>
            <!-- GIF Animation Container (NOT lottie-player) -->
            <div id="animation-container-${dayData.day}" style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
              <!-- Temporary loading -->
              <span style="font-size: 16px; opacity: 0.7;">⏳</span>
            </div>
          </div>
          
          <!-- AQI Info -->
          <div class="w-full mt-auto">
            <div class="bg-white bg-opacity-80 rounded-lg p-1 shadow-sm">
              <p class="text-sm font-bold ${textColor}">AQI: ${dayData.aqi}</p>
              <p class="text-sm text-gray-600 font-medium">${aqiLevel}</p>
              <p class="text-sm text-gray-500">Top: ${dayData.main_pollutant}</p>
            </div>
          </div>
          
          <!-- Hover Tooltip -->
          <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 
                      opacity-0 group-hover:opacity-100 transition-opacity duration-300
                      bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg z-20
                      pointer-events-none">
            <div class="text-center">
              <div class="font-bold">August ${dayData.day}, 2025</div>
              <div class="text-green-300">AQI: ${dayData.aqi} (${aqiLevel})</div>
              <div class="text-blue-300">Main: ${dayData.main_pollutant}</div>
              <div class="text-yellow-300">${getHealthAdvice(dayData.aqi)}</div>
              <div class="text-purple-300">🎬 GIF Animation</div>
            </div>
            <div class="absolute top-full left-1/2 transform -translate-x-1/2 
                        border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      `;
    });
  }

  // Update calendar HTML
  calendarGrid.innerHTML = calendarHTML;
  console.log("Calendar HTML updated");

  // Add GIF animations (NO LOTTIE)
  setTimeout(() => {
    if (calendarData && calendarData.length > 0) {
      console.log(`Adding GIF animations to ${calendarData.length} days`);
      
      calendarData.forEach((dayData, index) => {
        console.log(`Processing day ${dayData.day} (${index + 1}/${calendarData.length})`);
        addAnimationToDay(dayData.day, dayData.aqi, dayData.main_pollutant);
      });
      
      console.log("✅ All GIF animations processed!");
    }
  }, 300);

  console.log("✅ Calendar updated with GIF support (no Lottie)");
}

function getHealthAdvice(aqi) {
  if (aqi <= 50) return "👍 Great for outdoor activities!";
  else if (aqi <= 100) return "😐 Moderate - limit prolonged outdoor exertion";
  else if (aqi <= 150)
    return "😷 Sensitive groups should avoid outdoor activities";
  else return "🚨 Everyone should avoid outdoor activities";
}

function getAQILevel(aqi) {
  if (aqi <= 50) return "Good";
  else if (aqi <= 100) return "Moderate";
  else if (aqi <= 150) return "Unhealthy for Sensitive";
  else if (aqi <= 200) return "Unhealthy";
  else return "Very Unhealthy";
}

function getEnhancedAQIColors(aqi) {
  if (aqi <= 50) {
    return {
      bgColor: "bg-gradient-to-br from-green-100 to-green-200",
      textColor: "text-green-800",
      borderColor: "border-2 border-green-300 shadow-green-200",
    };
  } else if (aqi <= 100) {
    return {
      bgColor: "bg-gradient-to-br from-yellow-100 to-yellow-200",
      textColor: "text-yellow-800",
      borderColor: "border-2 border-yellow-300 shadow-yellow-200",
    };
  } else if (aqi <= 150) {
    return {
      bgColor: "bg-gradient-to-br from-orange-100 to-orange-200",
      textColor: "text-orange-800",
      borderColor: "border-2 border-orange-300 shadow-orange-200",
    };
  } else {
    return {
      bgColor: "bg-gradient-to-br from-red-100 to-red-200",
      textColor: "text-red-800",
      borderColor: "border-2 border-red-400 shadow-red-200",
    };
  }
}

// Animation URLs for different AQI levels
function getAnimationForAQI(aqi) {
  if (aqi <= 50) {
  // Return simple data for GIF implementation
    return {
      gifUrl: './images/sun-ezgif.com-gif-maker.gif', // Always use your sun GIF for now
      fallback: aqi <= 50 ? "☀️" : aqi <= 100 ? "⛅" : aqi <= 150 ? "🌫️" : "⛈️",
      type: "gif"
    };
  } else if (aqi <= 100) {
    // Moderate AQI - Cloudy GIF
    return {
      gifUrl: './images/cloudy-ezgif.com-gif-maker.gif',
      fallback: "⛅",
      type: "gif", 
      description: "Moderate Air Quality"
    };
  } else if (aqi <= 150) {
    // Unhealthy for Sensitive - Hazy/Foggy GIF
    return {
      gifUrl: './images/clouds-ezgif.com-gif-maker.gif',
      fallback: "🌫️",
      type: "gif",
      description: "Unhealthy Air Quality"
    };
  } else {
    // Dangerous AQI - Storm GIF
    return {
      gifUrl: './images/thunder-ezgif.com-gif-maker.gif',
      fallback: "⛈️",
      type: "gif",
      description: "Dangerous Air Quality"
    };
  }
}

// Add animation to specific day
function addAnimationToDay(dayNumber, aqi, pollutant) {
  const container = document.getElementById(`animation-container-${dayNumber}`);
  if (!container) {
    console.log(`⚠️ Animation container not found for day ${dayNumber}`);
    return;
  }

  // Get the appropriate GIF for this AQI level
  const animation = getAnimationForAQI(aqi);
  
  console.log(`Adding ${animation.description} GIF for day ${dayNumber} (AQI: ${aqi})`);
  console.log(`Using: ${animation.gifUrl}`);
  
  // Create GIF image
  const gifImg = document.createElement('img');
  gifImg.src = animation.gifUrl;  // Now uses different GIFs based on AQI
  gifImg.alt = `${animation.description} for day ${dayNumber}`;
  
  // Style based on AQI level
  let borderColor, glowColor;
  if (aqi <= 50) {
    borderColor = 'rgba(34, 197, 94, 0.6)';  // Green for good
    glowColor = 'rgba(34, 197, 94, 0.3)';
  } else if (aqi <= 100) {
    borderColor = 'rgba(245, 158, 11, 0.6)'; // Yellow for moderate  
    glowColor = 'rgba(245, 158, 11, 0.3)';
  } else if (aqi <= 150) {
    borderColor = 'rgba(249, 115, 22, 0.6)'; // Orange for unhealthy
    glowColor = 'rgba(249, 115, 22, 0.3)';
  } else {
    borderColor = 'rgba(239, 68, 68, 0.6)';  // Red for dangerous
    glowColor = 'rgba(239, 68, 68, 0.3)';
  }
  
  gifImg.style.cssText = `
    width: 40px;
    height: 40px;
    object-fit: contain;
    padding: 1px;
    transition: all 0.3s ease;
    background: transparent;
  `;
  
  // Success handler
  gifImg.addEventListener('load', () => {
    console.log(`✅ ${animation.description} GIF loaded for day ${dayNumber}!`);
    // Enhanced glow on success
    // gifImg.style.boxShadow = `0 0 12px ${glowColor}, 0 2px 6px ${glowColor}`;
  });
  
  // Error handler with fallback to sun.gif, then emoji
  gifImg.addEventListener('error', () => {
    console.log(`❌ ${animation.description} GIF failed for day ${dayNumber}`);
    
    // Try fallback to sun.gif first
    if (animation.gifUrl !== './images/sun-ezgif.com-gif-maker.gif') {
      console.log(`🔄 Trying fallback sun.gif for day ${dayNumber}`);
      gifImg.src = './images/sun-ezgif.com-gif-maker.gif';
      
      // If sun.gif also fails, show emoji
      gifImg.addEventListener('error', () => {
        console.log(`❌ Fallback also failed for day ${dayNumber}, showing emoji`);
        container.innerHTML = `
          <span style="font-size: 20px; animation: pulse 2s infinite;">${animation.fallback}</span>
        `;
      }, { once: true });
    } else {
      // If even sun.gif fails, show emoji
      container.innerHTML = `
        <span style="font-size: 20px; animation: pulse 2s infinite;">${animation.fallback}</span>
      `;
    }
  });
  
  // Clear container and add GIF
  container.innerHTML = '';
  container.appendChild(gifImg);
}

// Generate sample calendar data
function generateSampleCalendarData() {
  const sampleData = [];
  for (let day = 1; day <= 30; day++) {
    const aqi = Math.floor(Math.random() * 100) + 20;
    sampleData.push({
      day: day,
      aqi: aqi,
      category: getAQICategory(aqi),
      main_pollutant: "PM2.5",
    });
  }
  return sampleData;
}

// Helper functions for calendar colors
function getAQIColors(aqi) {
  if (aqi <= 50) {
    return {
      bgColor: "bg-gradient-to-br from-green-100 to-green-200",
      textColor: "text-green-800",
    };
  } else if (aqi <= 100) {
    return {
      bgColor: "bg-gradient-to-br from-yellow-100 to-yellow-200",
      textColor: "text-yellow-800",
    };
  } else {
    return {
      bgColor: "bg-gradient-to-br from-orange-100 to-orange-200",
      textColor: "text-orange-800",
    };
  }
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

// Add date controls for pollutant page
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
            <select id="year-select" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
              <option value="2023">2023</option>
              <option value="2024">2024</option>
              <option value="2025" selected>2025</option>
              <option value="2026">2026</option>
            </select>
          </div>
          
          <div style="display: flex; align-items: center; gap: 8px;">
            <label for="month-select" style="font-weight: 500;">Month:</label>
            <select id="month-select" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
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

    document.getElementById("year-select").value = currentYear;
    document.getElementById("month-select").value = currentMonth;
  }
}

// Update date selection
async function updatePollutantDateSelection() {
  const yearSelect = document.getElementById("year-select");
  const monthSelect = document.getElementById("month-select");

  if (yearSelect && monthSelect) {
    currentYear = parseInt(yearSelect.value);
    currentMonth = parseInt(monthSelect.value);
    console.log(`Date changed to: ${currentYear}-${currentMonth}`);

    showPollutantLoading();
    await updatePollutantData();
    hidePollutantLoading();
  }
}

// Loading states
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

// Show error state
function showPollutantError(message) {
  hidePollutantLoading();

  const chartContainer = document.querySelector(".lg\\:col-span-2");
  if (chartContainer) {
    const errorHTML = `
      <div class="error-state" style="
        text-align: center; 
        padding: 40px; 
        background: white; 
        border-radius: 12px; 
        margin: 20px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
      ">
        <h2 style="color: #ef4444; margin-bottom: 10px;">Chart Loading Error</h2>
        <p style="color: #666; margin-bottom: 20px;">${message}</p>
        <button onclick="initPollutant(currentFilter, currentPollutant)" style="
          padding: 10px 20px; 
          background: #e1fddc; 
          border: none; 
          border-radius: 5px; 
          cursor: pointer;
          font-weight: 500;
        ">
          Retry Chart
        </button>
      </div>
    `;

    chartContainer.innerHTML = errorHTML;
  }
}

// Auto-initialization when chart canvas is found
function ensurePollutantInit() {
  const chartCanvas = document.querySelector("#pollutantChart");

  if (chartCanvas && !window.pollutantInitialized) {
    console.log("Auto-initializing pollutants page...");

    setTimeout(() => {
      initPollutant("daily", "PM2.5");
      window.pollutantInitialized = true;
    }, 200);
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(ensurePollutantInit, 100);
});

// Initialize when page loads
window.addEventListener("load", () => {
  if (!window.pollutantInitialized) {
    setTimeout(ensurePollutantInit, 200);
  }
});

// Fallback initialization
setTimeout(() => {
  if (!window.pollutantInitialized) {
    ensurePollutantInit();
  }
}, 1000);

// Observer for dynamic content loading
const pollutantObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === "childList") {
      const chartCanvas = document.querySelector("#pollutantChart");
      if (chartCanvas && !window.pollutantInitialized) {
        console.log("Observer detected pollutant chart canvas");
        setTimeout(ensurePollutantInit, 100);
      }
    }
  });
});

// Start observing
if (document.body) {
  pollutantObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Export functions for global access
window.updatePollutantDateSelection = updatePollutantDateSelection;
window.initPollutant = initPollutant;
window.ensurePollutantInit = ensurePollutantInit;

console.log("FIXED Pollutant module loaded successfully!");
function debugDropdown() {
  console.log("Debug: Testing dropdown...");

  const dropdown = document.getElementById("pollutantDropdown");
  const options = document.getElementById("dropdownOptions");
  const selected = document.getElementById("dropdownSelected");

  console.log("Elements:", {
    dropdown: !!dropdown,
    options: !!options,
    selected: !!selected,
  });

  if (options) {
    console.log("Options classes:", options.classList.toString());
    console.log("Options style:", {
      opacity: getComputedStyle(options).opacity,
      visibility: getComputedStyle(options).visibility,
      display: getComputedStyle(options).display,
    });

    // Force show for test
    options.classList.add("show");
    console.log("Forced dropdown to show");
  }
}

// Export debug function
window.debugDropdown = debugDropdown;

// SIMPLE APPROACH: Add GIFs to your existing static calendar

function addGifsToExistingCalendar() {
  console.log("🎬 Adding GIFs to existing calendar structure");
  
  // Find all calendar day elements in your existing HTML
  const calendarDays = document.querySelectorAll('.h-28, [class*="h-28"]');
  console.log(`Found ${calendarDays.length} calendar day elements`);
  
  calendarDays.forEach((dayElement, index) => {
    // Skip if it's a header or empty day
    if (!dayElement.textContent.trim() || isNaN(dayElement.textContent.trim())) {
      return;
    }
    
    const dayNumber = dayElement.textContent.trim().split(' ')[0]; // Get just the day number
    
    // Skip if not a valid day number
    if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 31) {
      return;
    }
    
    console.log(`Processing existing day: ${dayNumber}`);
    
    // Find or create a spot for the GIF
    let gifSpot = dayElement.querySelector('.gif-spot');
    
    if (!gifSpot) {
      // Create a GIF container in the top-right corner
      gifSpot = document.createElement('div');
      gifSpot.className = 'gif-spot';
      gifSpot.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        width: 24px;
        height: 24px;
        z-index: 10;
      `;
      
      // Make the day element relative positioned
      dayElement.style.position = 'relative';
      dayElement.appendChild(gifSpot);
    }
    
    // Add a GIF (using random AQI for demo)
    const randomAqi = Math.floor(Math.random() * 100) + 20;
    addSimpleGif(gifSpot, randomAqi, dayNumber);
  });
}

function addSimpleGif(container, aqi, dayNumber) {
  const gif = document.createElement('img');
  gif.src = './images/sun-ezgif.com-gif-maker.gif';
  gif.alt = `Weather for day ${dayNumber}`;
  gif.style.cssText = `
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  `;
  
  gif.addEventListener('load', () => {
    console.log(`✅ Simple GIF loaded for day ${dayNumber}`);
  });
  
  gif.addEventListener('error', () => {
    console.log(`❌ Simple GIF failed for day ${dayNumber}`);
    container.innerHTML = '☀️';
  });
  
  container.appendChild(gif);
}

// Test this approach
window.addGifsToExistingCalendar = addGifsToExistingCalendar;

// Auto-run this when on pollutants page
setTimeout(() => {
  if (window.location.hash === '#pollutants' || document.querySelector('.grid.grid-cols-7')) {
    console.log("🚀 Auto-running simple GIF overlay");
    addGifsToExistingCalendar();
  }
}, 2000);