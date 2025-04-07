// MoodMark - Popup Script
// Handles the popup UI and interactions

// State
let currentTab = "dashboard";
let currentSettings = {};
let moodData = [];
let currentPageInfo = {
    url: "",
    title: "",
    domain: "",
};
let selectedManualMood = null;

// DOM Elements
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");
const moodButtons = document.querySelectorAll(".mood-btn");
const saveMoodBtn = document.getElementById("saveMoodBtn");
const moodNote = document.getElementById("moodNote");
const aboutLink = document.getElementById("aboutLink");
const aboutModal = document.getElementById("aboutModal");
const closeModal = document.querySelector(".close-modal");
const exportDataBtn = document.getElementById("exportDataBtn");
const importDataBtn = document.getElementById("importDataBtn");
const clearDataBtn = document.getElementById("clearDataBtn");
const historyRange = document.getElementById("historyRange");
const historyDomain = document.getElementById("historyDomain");

// Settings elements
const trackSentimentCheckbox = document.getElementById("trackSentiment");
const trackTypingBehaviorCheckbox = document.getElementById(
    "trackTypingBehavior"
);
const trackURLContextCheckbox = document.getElementById("trackURLContext");
const privacyModeSelect = document.getElementById("privacyMode");
const dataRetentionDaysSelect = document.getElementById("dataRetentionDays");

// Mood icons mapping
const moodIcons = {
    happy: "😊",
    sad: "😢",
    angry: "😠",
    anxious: "😰",
    calm: "😌",
    neutral: "😐",
};

// Initialize popup
async function initializePopup() {
    console.log("MoodMark Popup: Initializing...");

    // Set up event listeners
    setupEventListeners();

    // Load current tab info
    await loadCurrentPageInfo();

    // Load settings
    await loadSettings();

    // Load mood data
    await loadMoodData();

    // Update UI
    updateUI();

    console.log("MoodMark Popup: Initialization complete");
}

// Set up event listeners
function setupEventListeners() {
    // Tab switching
    tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            switchTab(button.dataset.tab);
        });
    });

    // Mood selection
    moodButtons.forEach((button) => {
        button.addEventListener("click", () => {
            selectMood(button.dataset.mood);
        });
    });

    // Save mood button
    saveMoodBtn.addEventListener("click", saveManualMood);

    // About modal
    aboutLink.addEventListener("click", (e) => {
        e.preventDefault();
        aboutModal.style.display = "block";
    });

    closeModal.addEventListener("click", () => {
        aboutModal.style.display = "none";
    });

    window.addEventListener("click", (e) => {
        if (e.target === aboutModal) {
            aboutModal.style.display = "none";
        }
    });

    // Data management
    exportDataBtn.addEventListener("click", exportData);
    importDataBtn.addEventListener("click", importData);
    clearDataBtn.addEventListener("click", clearData);

    // History filters
    historyRange.addEventListener("change", updateHistoryView);
    historyDomain.addEventListener("change", updateHistoryView);

    // Settings changes
    trackSentimentCheckbox.addEventListener("change", updateSetting);
    trackTypingBehaviorCheckbox.addEventListener("change", updateSetting);
    trackURLContextCheckbox.addEventListener("change", updateSetting);
    privacyModeSelect.addEventListener("change", updateSetting);
    dataRetentionDaysSelect.addEventListener("change", updateSetting);
}

// Switch between tabs
function switchTab(tabId) {
    currentTab = tabId;

    // Update active tab button
    tabButtons.forEach((button) => {
        if (button.dataset.tab === tabId) {
            button.classList.add("active");
        } else {
            button.classList.remove("active");
        }
    });

    // Show active tab content
    tabContents.forEach((content) => {
        if (content.id === tabId) {
            content.classList.add("active");
        } else {
            content.classList.remove("active");
        }
    });

    // Perform tab-specific updates
    if (tabId === "dashboard") {
        updateDashboard();
    } else if (tabId === "current") {
        updateCurrentMoodView();
    } else if (tabId === "history") {
        updateHistoryView();
    } else if (tabId === "settings") {
        updateSettingsView();
    }
}

// Load current page information
async function loadCurrentPageInfo() {
    try {
        const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (tabs.length > 0) {
            const tab = tabs[0];
            currentPageInfo.url = tab.url;
            currentPageInfo.title = tab.title;

            try {
                const url = new URL(tab.url);
                currentPageInfo.domain = url.hostname;
            } catch (error) {
                console.error("MoodMark: Error parsing URL", error);
                currentPageInfo.domain = "";
            }

            // Update page info in UI
            document.getElementById("currentPageTitle").textContent =
                currentPageInfo.title;
            document.getElementById("currentPageUrl").textContent =
                currentPageInfo.url;
        }
    } catch (error) {
        console.error("MoodMark: Error loading current page info", error);
    }
}

// Load settings from background script
async function loadSettings() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "UPDATE_SETTINGS" }, (response) => {
            if (response && response.success) {
                currentSettings = response.settings;
                updateSettingsView();
                resolve(currentSettings);
            } else {
                console.error("MoodMark: Error loading settings", response);
                resolve({});
            }
        });
    });
}

// Load mood data from background script
async function loadMoodData() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "GET_MOOD_DATA" }, (response) => {
            if (response && response.success) {
                moodData = response.data;
                resolve(moodData);
            } else {
                console.error("MoodMark: Error loading mood data", response);
                moodData = [];
                resolve([]);
            }
        });
    });
}

// Update the entire UI
function updateUI() {
    updateDashboard();
    updateCurrentMoodView();
    updateHistoryView();
    updateSettingsView();
}

// Update dashboard tab
function updateDashboard() {
    if (currentTab !== "dashboard") return;

    // Get current mood
    const currentMood = getCurrentMood();

    // Update current mood display
    document.getElementById("currentMoodIcon").textContent =
        moodIcons[currentMood.mood] || moodIcons.neutral;
    document.getElementById("currentMoodLabel").textContent =
        capitalizeFirstLetter(currentMood.mood);

    // Update today's dominant mood
    const todayMood = getDominantMoodForPeriod(getStartOfDay(), Date.now());
    document.getElementById("todayDominantMood").textContent =
        capitalizeFirstLetter(todayMood.mood);

    // Update weekly trend
    const weeklyTrend = calculateMoodTrend(7);
    document.getElementById("weeklyTrend").textContent = weeklyTrend;

    // Create mood over time chart
    createMoodTimeChart();

    // Create emotional triggers chart
    createTriggerChart();
}

// Update current mood view
function updateCurrentMoodView() {
    if (currentTab !== "current") return;

    // Get current page mood
    const pageMood = getCurrentPageMood();

    // Update page mood display
    document.getElementById("pageMoodIcon").textContent =
        moodIcons[pageMood.mood] || moodIcons.neutral;
    document.getElementById("pageMoodLabel").textContent =
        capitalizeFirstLetter(pageMood.mood);

    // Update mood factors list
    updateMoodFactorsList(pageMood.factors);

    // Clear manual mood selection
    clearMoodSelection();
}

// Get current mood based on recent data
function getCurrentMood() {
    // Default to neutral if no data
    const defaultMood = { mood: "neutral", confidence: 0.5, source: "default" };

    if (!moodData || moodData.length === 0) {
        return defaultMood;
    }

    // Get most recent mood entries (last 30 minutes)
    const recentTime = Date.now() - 30 * 60 * 1000;
    const recentEntries = moodData.filter(
        (entry) => entry.data.timestamp >= recentTime
    );

    if (recentEntries.length === 0) {
        return defaultMood;
    }

    // Prioritize manual tags, then sentiment, then typing behavior
    const manualTags = recentEntries.filter(
        (entry) => entry.type === "manual_tag"
    );
    if (manualTags.length > 0) {
        const latestTag = manualTags.sort(
            (a, b) => b.data.timestamp - a.data.timestamp
        )[0];
        return {
            mood: latestTag.data.mood,
            confidence: 1.0,
            source: "manual",
        };
    }

    const sentimentEntries = recentEntries.filter(
        (entry) => entry.type === "sentiment"
    );
    if (sentimentEntries.length > 0) {
        const latestSentiment = sentimentEntries.sort(
            (a, b) => b.data.timestamp - a.data.timestamp
        )[0];
        return {
            mood: latestSentiment.data.sentiment.primaryMood,
            confidence: latestSentiment.data.sentiment.confidence,
            source: "sentiment",
        };
    }

    const typingEntries = recentEntries.filter(
        (entry) => entry.type === "typing_behavior"
    );
    if (typingEntries.length > 0) {
        const latestTyping = typingEntries.sort(
            (a, b) => b.data.timestamp - a.data.timestamp
        )[0];
        return {
            mood: latestTyping.data.analysis.primaryMood,
            confidence: latestTyping.data.analysis.confidence,
            source: "typing",
        };
    }

    return defaultMood;
}

// Get current page mood
function getCurrentPageMood() {
    // Default to neutral if no data
    const defaultMood = {
        mood: "neutral",
        confidence: 0.5,
        source: "default",
        factors: [
            { name: "No mood data available for this page", value: "neutral" },
        ],
    };

    if (!moodData || moodData.length === 0 || !currentPageInfo.domain) {
        return defaultMood;
    }

    // Get entries for current domain (last 2 hours)
    const recentTime = Date.now() - 2 * 60 * 60 * 1000;
    const domainEntries = moodData.filter(
        (entry) =>
            entry.data.timestamp >= recentTime &&
            entry.data.domain === currentPageInfo.domain
    );

    if (domainEntries.length === 0) {
        return defaultMood;
    }

    // Prioritize manual tags, then sentiment, then typing behavior
    const manualTags = domainEntries.filter(
        (entry) => entry.type === "manual_tag"
    );
    if (manualTags.length > 0) {
        const latestTag = manualTags.sort(
            (a, b) => b.data.timestamp - a.data.timestamp
        )[0];
        return {
            mood: latestTag.data.mood,
            confidence: 1.0,
            source: "manual",
            factors: [{ name: "Manually tagged", value: latestTag.data.mood }],
        };
    }

    const sentimentEntries = domainEntries.filter(
        (entry) => entry.type === "sentiment"
    );
    const typingEntries = domainEntries.filter(
        (entry) => entry.type === "typing_behavior"
    );

    // Combine sentiment and typing data to determine mood
    if (sentimentEntries.length > 0 || typingEntries.length > 0) {
        const moodCounts = {};
        const factors = [];

        // Process sentiment entries
        if (sentimentEntries.length > 0) {
            const latestSentiment = sentimentEntries.sort(
                (a, b) => b.data.timestamp - a.data.timestamp
            )[0];
            const mood = latestSentiment.data.sentiment.primaryMood;
            moodCounts[mood] =
                (moodCounts[mood] || 0) +
                latestSentiment.data.sentiment.confidence;

            factors.push({
                name: "Text sentiment",
                value: mood,
                confidence: latestSentiment.data.sentiment.confidence,
            });
        }

        // Process typing entries
        if (typingEntries.length > 0) {
            const latestTyping = typingEntries.sort(
                (a, b) => b.data.timestamp - a.data.timestamp
            )[0];
            const mood = latestTyping.data.analysis.primaryMood;
            moodCounts[mood] =
                (moodCounts[mood] || 0) + latestTyping.data.analysis.confidence;

            // Add typing factors
            if (latestTyping.data.analysis.factors) {
                for (const [key, factor] of Object.entries(
                    latestTyping.data.analysis.factors
                )) {
                    if (factor.mood !== "neutral") {
                        factors.push({
                            name: formatFactorName(key),
                            value: factor.mood,
                            detail: factor.value,
                        });
                    }
                }
            } else {
                factors.push({
                    name: "Typing behavior",
                    value: mood,
                    confidence: latestTyping.data.analysis.confidence,
                });
            }
        }

        // Determine primary mood
        let primaryMood = "neutral";
        let highestCount = 0;

        for (const [mood, count] of Object.entries(moodCounts)) {
            if (count > highestCount) {
                primaryMood = mood;
                highestCount = count;
            }
        }

        return {
            mood: primaryMood,
            confidence:
                highestCount /
                Object.values(moodCounts).reduce(
                    (sum, count) => sum + count,
                    0
                ),
            source: "combined",
            factors: factors,
        };
    }

    return defaultMood;
}

// Update mood factors list
function updateMoodFactorsList(factors) {
    const factorsList = document.getElementById("moodFactorsList");
    factorsList.innerHTML = "";

    if (!factors || factors.length === 0) {
        const li = document.createElement("li");
        li.className = "factor";
        li.textContent = "No mood factors available";
        factorsList.appendChild(li);
        return;
    }

    factors.forEach((factor) => {
        const li = document.createElement("li");
        li.className = "factor";

        const nameSpan = document.createElement("span");
        nameSpan.className = "factor-name";
        nameSpan.textContent = factor.name + ": ";

        const valueSpan = document.createElement("span");
        valueSpan.className = `mood-${factor.value}`;
        valueSpan.textContent = capitalizeFirstLetter(factor.value);

        li.appendChild(nameSpan);
        li.appendChild(valueSpan);

        if (factor.detail) {
            const detailSpan = document.createElement("span");
            detailSpan.className = "factor-detail";
            detailSpan.textContent = ` (${formatFactorDetail(
                factor.name,
                factor.detail
            )})`;
            li.appendChild(detailSpan);
        }

        factorsList.appendChild(li);
    });
}

// Format factor name for display
function formatFactorName(key) {
    // Convert camelCase to Title Case with spaces
    const formatted = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase());

    // Special cases
    switch (key) {
        case "typingSpeed":
            return "Typing Speed";
        case "pauseDuration":
            return "Pauses While Typing";
        case "deletionRate":
            return "Correction Rate";
        default:
            return formatted;
    }
}

// Format factor detail for display
function formatFactorDetail(name, value) {
    if (name === "Typing Speed") {
        return `${Math.round(value)} CPM`;
    } else if (name === "Pauses While Typing") {
        return `${(value / 1000).toFixed(1)}s avg`;
    } else if (name === "Correction Rate") {
        return `${(value * 100).toFixed(0)}%`;
    }
    return value;
}

// Select a mood manually
function selectMood(mood) {
    selectedManualMood = mood;

    // Update UI
    moodButtons.forEach((button) => {
        if (button.dataset.mood === mood) {
            button.classList.add("selected");
        } else {
            button.classList.remove("selected");
        }
    });
}

// Clear mood selection
function clearMoodSelection() {
    selectedManualMood = null;
    moodButtons.forEach((button) => button.classList.remove("selected"));
    moodNote.value = "";
}

// Save manual mood
async function saveManualMood() {
    if (!selectedManualMood) {
        alert("Please select a mood first");
        return;
    }

    const moodData = {
        mood: selectedManualMood,
        note: moodNote.value.trim(),
        url: currentPageInfo.url,
        title: currentPageInfo.title,
        domain: currentPageInfo.domain,
    };

    chrome.runtime.sendMessage(
        {
            type: "MANUAL_MOOD_TAG",
            data: moodData,
        },
        (response) => {
            if (response && response.success) {
                // Clear selection and reload data
                clearMoodSelection();
                loadMoodData().then(() => {
                    updateUI();
                });
            } else {
                console.error("MoodMark: Error saving manual mood", response);
                alert("Failed to save mood. Please try again.");
            }
        }
    );
}

// Get start of day timestamp
function getStartOfDay() {
    const now = new Date();
    const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );
    return startOfDay.getTime();
}

// Get dominant mood for a time period
function getDominantMoodForPeriod(startTime, endTime) {
    // Default to neutral if no data
    const defaultMood = { mood: "neutral", count: 0, total: 0 };

    if (!moodData || moodData.length === 0) {
        return defaultMood;
    }

    // Filter entries by time period
    const periodEntries = moodData.filter(
        (entry) =>
            entry.data.timestamp >= startTime && entry.data.timestamp <= endTime
    );

    if (periodEntries.length === 0) {
        return defaultMood;
    }

    // Count occurrences of each mood
    const moodCounts = {};

    periodEntries.forEach((entry) => {
        let mood;
        let confidence = 1.0;

        if (entry.type === "manual_tag") {
            mood = entry.data.mood;
        } else if (entry.type === "sentiment") {
            mood = entry.data.sentiment.primaryMood;
            confidence = entry.data.sentiment.confidence;
        } else if (entry.type === "typing_behavior") {
            mood = entry.data.analysis.primaryMood;
            confidence = entry.data.analysis.confidence;
        } else {
            return; // Skip other types
        }

        moodCounts[mood] = moodCounts[mood] || { count: 0, weight: 0 };
        moodCounts[mood].count++;
        moodCounts[mood].weight += confidence;
    });

    // Find the dominant mood
    let dominantMood = "neutral";
    let highestWeight = 0;

    for (const [mood, data] of Object.entries(moodCounts)) {
        if (data.weight > highestWeight) {
            dominantMood = mood;
            highestWeight = data.weight;
        }
    }

    return {
        mood: dominantMood,
        count: moodCounts[dominantMood]?.count || 0,
        total: periodEntries.length,
    };
}

// Calculate mood trend over days
function calculateMoodTrend(days) {
    if (!moodData || moodData.length === 0) {
        return "Not enough data";
    }

    // Get mood data for each day
    const dayMoods = [];
    const now = Date.now();

    for (let i = days - 1; i >= 0; i--) {
        const dayStart = now - (i + 1) * 24 * 60 * 60 * 1000;
        const dayEnd = now - i * 24 * 60 * 60 * 1000;
        const dayMood = getDominantMoodForPeriod(dayStart, dayEnd);
        dayMoods.push(dayMood.mood);
    }

    // Not enough data
    if (dayMoods.filter((mood) => mood !== "neutral").length < 2) {
        return "Not enough data";
    }

    // Count mood transitions
    const transitions = {
        improving: 0,
        worsening: 0,
        stable: 0,
    };

    const moodRanking = {
        happy: 5,
        calm: 4,
        neutral: 3,
        anxious: 2,
        sad: 1,
        angry: 0,
    };

    for (let i = 1; i < dayMoods.length; i++) {
        const prevMood = dayMoods[i - 1];
        const currMood = dayMoods[i];

        if (prevMood === "neutral" || currMood === "neutral") {
            continue; // Skip neutral transitions
        }

        const prevRank = moodRanking[prevMood];
        const currRank = moodRanking[currMood];

        if (currRank > prevRank) {
            transitions.improving++;
        } else if (currRank < prevRank) {
            transitions.worsening++;
        } else {
            transitions.stable++;
        }
    }

    // Determine trend
    if (transitions.improving > transitions.worsening) {
        return "Improving";
    } else if (transitions.worsening > transitions.improving) {
        return "Declining";
    } else if (
        transitions.stable > transitions.improving &&
        transitions.stable > transitions.worsening
    ) {
        return "Stable";
    } else {
        return "Mixed";
    }
}

// Create mood over time chart
function createMoodTimeChart() {
    const canvas = document.getElementById("moodTimeChart");

    // Clear any existing chart
    if (canvas.__chart__) {
        canvas.__chart__.destroy();
    }

    if (!moodData || moodData.length === 0) {
        // Draw empty chart with message
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = "14px Arial";
        ctx.fillStyle = "#9E9E9E";
        ctx.textAlign = "center";
        ctx.fillText(
            "No mood data available",
            canvas.width / 2,
            canvas.height / 2
        );
        return;
    }

    // Prepare data for the last 7 days
    const days = 7;
    const labels = [];
    const datasets = [
        { label: "Happy", data: [], backgroundColor: "#34A853" },
        { label: "Calm", data: [], backgroundColor: "#9C27B0" },
        { label: "Neutral", data: [], backgroundColor: "#9E9E9E" },
        { label: "Anxious", data: [], backgroundColor: "#FBBC05" },
        { label: "Sad", data: [], backgroundColor: "#4285F4" },
        { label: "Angry", data: [], backgroundColor: "#EA4335" },
    ];

    const now = Date.now();
    const moodIndices = {
        happy: 0,
        calm: 1,
        neutral: 2,
        anxious: 3,
        sad: 4,
        angry: 5,
    };

    // Initialize data arrays
    for (let i = 0; i < days; i++) {
        const date = new Date(now - (days - 1 - i) * 24 * 60 * 60 * 1000);
        labels.push(date.toLocaleDateString(undefined, { weekday: "short" }));

        datasets.forEach((dataset) => dataset.data.push(0));
    }

    // Count mood occurrences for each day
    moodData.forEach((entry) => {
        let mood;

        if (entry.type === "manual_tag") {
            mood = entry.data.mood;
        } else if (entry.type === "sentiment") {
            mood = entry.data.sentiment.primaryMood;
        } else if (entry.type === "typing_behavior") {
            mood = entry.data.analysis.primaryMood;
        } else {
            return; // Skip other types
        }

        const entryDate = new Date(entry.data.timestamp);
        const dayIndex = Math.floor(
            (entryDate.getTime() - (now - days * 24 * 60 * 60 * 1000)) /
                (24 * 60 * 60 * 1000)
        );

        if (dayIndex >= 0 && dayIndex < days && mood in moodIndices) {
            datasets[moodIndices[mood]].data[dayIndex]++;
        }
    });

    // Create stacked bar chart
    const ctx = canvas.getContext("2d");
    canvas.__chart__ = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: datasets,
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                    },
                },
            },
            plugins: {
                legend: {
                    position: "top",
                    labels: {
                        boxWidth: 12,
                        font: {
                            size: 10,
                        },
                    },
                },
                tooltip: {
                    mode: "index",
                    intersect: false,
                },
            },
        },
    });
}

// Create emotional triggers chart
function createTriggerChart() {
    const canvas = document.getElementById("triggerChart");

    // Clear any existing chart
    if (canvas.__chart__) {
        canvas.__chart__.destroy();
    }

    if (!moodData || moodData.length === 0) {
        // Draw empty chart with message
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = "14px Arial";
        ctx.fillStyle = "#9E9E9E";
        ctx.textAlign = "center";
        ctx.fillText(
            "No mood data available",
            canvas.width / 2,
            canvas.height / 2
        );
        return;
    }

    // Count mood occurrences by domain
    const domainMoods = {};

    moodData.forEach((entry) => {
        if (!entry.data.domain) return;

        let mood;

        if (entry.type === "manual_tag") {
            mood = entry.data.mood;
        } else if (entry.type === "sentiment") {
            mood = entry.data.sentiment.primaryMood;
        } else if (entry.type === "typing_behavior") {
            mood = entry.data.analysis.primaryMood;
        } else {
            return; // Skip other types
        }

        domainMoods[entry.data.domain] = domainMoods[entry.data.domain] || {
            happy: 0,
            calm: 0,
            neutral: 0,
            anxious: 0,
            sad: 0,
            angry: 0,
            total: 0,
        };

        domainMoods[entry.data.domain][mood]++;
        domainMoods[entry.data.domain].total++;
    });

    // Sort domains by total entries and take top 5
    const topDomains = Object.entries(domainMoods)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5);

    if (topDomains.length === 0) {
        // Draw empty chart with message
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = "14px Arial";
        ctx.fillStyle = "#9E9E9E";
        ctx.textAlign = "center";
        ctx.fillText(
            "No domain data available",
            canvas.width / 2,
            canvas.height / 2
        );
        return;
    }

    // Prepare data for chart
    const labels = topDomains.map(([domain]) => domain);
    const datasets = [
        { label: "Happy", data: [], backgroundColor: "#34A853" },
        { label: "Calm", data: [], backgroundColor: "#9C27B0" },
        { label: "Neutral", data: [], backgroundColor: "#9E9E9E" },
        { label: "Anxious", data: [], backgroundColor: "#FBBC05" },
        { label: "Sad", data: [], backgroundColor: "#4285F4" },
        { label: "Angry", data: [], backgroundColor: "#EA4335" },
    ];

    // Fill datasets
    topDomains.forEach(([_, moodCounts]) => {
        datasets[0].data.push(moodCounts.happy);
        datasets[1].data.push(moodCounts.calm);
        datasets[2].data.push(moodCounts.neutral);
        datasets[3].data.push(moodCounts.anxious);
        datasets[4].data.push(moodCounts.sad);
        datasets[5].data.push(moodCounts.angry);
    });

    // Create stacked bar chart
    const ctx = canvas.getContext("2d");
    canvas.__chart__ = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: datasets,
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                    },
                },
            },
            plugins: {
                legend: {
                    position: "top",
                    labels: {
                        boxWidth: 12,
                        font: {
                            size: 10,
                        },
                    },
                },
                tooltip: {
                    mode: "index",
                    intersect: false,
                },
            },
        },
    });
}

// Update history view
function updateHistoryView() {
    if (currentTab !== "history") return;

    // Get filter values
    const range = historyRange.value;
    const domain = historyDomain.value;

    // Calculate date range
    let startTime;
    const endTime = Date.now();

    switch (range) {
        case "day":
            startTime = getStartOfDay();
            break;
        case "week":
            startTime = endTime - 7 * 24 * 60 * 60 * 1000;
            break;
        case "month":
            startTime = endTime - 30 * 24 * 60 * 60 * 1000;
            break;
        case "all":
            startTime = 0;
            break;
    }

    // Filter data
    let filteredData = moodData.filter(
        (entry) => entry.data.timestamp >= startTime
    );

    if (domain !== "all") {
        filteredData = filteredData.filter(
            (entry) => entry.data.domain === domain
        );
    }

    // Update domain dropdown if needed
    if (historyDomain.options.length <= 1) {
        updateDomainDropdown();
    }

    // Create history chart
    createHistoryChart(filteredData, range);

    // Update entries list
    updateEntriesList(filteredData);
}

// Update domain dropdown
function updateDomainDropdown() {
    // Clear existing options except 'All Websites'
    while (historyDomain.options.length > 1) {
        historyDomain.remove(1);
    }

    // Get unique domains
    const domains = new Set();

    moodData.forEach((entry) => {
        if (entry.data.domain) {
            domains.add(entry.data.domain);
        }
    });

    // Add domain options
    domains.forEach((domain) => {
        const option = document.createElement("option");
        option.value = domain;
        option.textContent = domain;
        historyDomain.appendChild(option);
    });
}

// Create history chart
function createHistoryChart(data, range) {
    const canvas = document.getElementById("historyChart");

    // Clear any existing chart
    if (canvas.__chart__) {
        canvas.__chart__.destroy();
    }

    if (!data || data.length === 0) {
        // Draw empty chart with message
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = "14px Arial";
        ctx.fillStyle = "#9E9E9E";
        ctx.textAlign = "center";
        ctx.fillText(
            "No mood data available for selected filters",
            canvas.width / 2,
            canvas.height / 2
        );
        return;
    }

    // Prepare data based on range
    let chartType, labels, datasets;

    if (range === "day") {
        // Hourly breakdown for day view
        chartType = "line";
        labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);

        // Initialize datasets
        datasets = [
            {
                label: "Happy",
                data: Array(24).fill(0),
                borderColor: "#34A853",
                backgroundColor: "rgba(52, 168, 83, 0.2)",
            },
            {
                label: "Calm",
                data: Array(24).fill(0),
                borderColor: "#9C27B0",
                backgroundColor: "rgba(156, 39, 176, 0.2)",
            },
            {
                label: "Neutral",
                data: Array(24).fill(0),
                borderColor: "#9E9E9E",
                backgroundColor: "rgba(158, 158, 158, 0.2)",
            },
            {
                label: "Anxious",
                data: Array(24).fill(0),
                borderColor: "#FBBC05",
                backgroundColor: "rgba(251, 188, 5, 0.2)",
            },
            {
                label: "Sad",
                data: Array(24).fill(0),
                borderColor: "#4285F4",
                backgroundColor: "rgba(66, 133, 244, 0.2)",
            },
            {
                label: "Angry",
                data: Array(24).fill(0),
                borderColor: "#EA4335",
                backgroundColor: "rgba(234, 67, 53, 0.2)",
            },
        ];

        // Fill data
        const moodIndices = {
            happy: 0,
            calm: 1,
            neutral: 2,
            anxious: 3,
            sad: 4,
            angry: 5,
        };

        data.forEach((entry) => {
            let mood;

            if (entry.type === "manual_tag") {
                mood = entry.data.mood;
            } else if (entry.type === "sentiment") {
                mood = entry.data.sentiment.primaryMood;
            } else if (entry.type === "typing_behavior") {
                mood = entry.data.analysis.primaryMood;
            } else {
                return; // Skip other types
            }

            const hour = new Date(entry.data.timestamp).getHours();

            if (mood in moodIndices) {
                datasets[moodIndices[mood]].data[hour]++;
            }
        });
    } else {
        // Daily breakdown for week/month/all view
        chartType = "line";

        // Determine number of days to show
        let days;
        switch (range) {
            case "week":
                days = 7;
                break;
            case "month":
                days = 30;
                break;
            case "all":
                // Calculate days between oldest entry and now
                const oldestEntry = data.reduce(
                    (oldest, entry) =>
                        entry.data.timestamp < oldest
                            ? entry.data.timestamp
                            : oldest,
                    Date.now()
                );
                days =
                    Math.ceil(
                        (Date.now() - oldestEntry) / (24 * 60 * 60 * 1000)
                    ) + 1;
                days = Math.min(days, 90); // Cap at 90 days
                break;
        }

        // Generate labels
        labels = [];
        const now = Date.now();
        for (let i = 0; i < days; i++) {
            const date = new Date(now - (days - 1 - i) * 24 * 60 * 60 * 1000);
            labels.push(
                date.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                })
            );
        }

        // Initialize datasets
        datasets = [
            {
                label: "Happy",
                data: Array(days).fill(0),
                borderColor: "#34A853",
                backgroundColor: "rgba(52, 168, 83, 0.2)",
            },
            {
                label: "Calm",
                data: Array(days).fill(0),
                borderColor: "#9C27B0",
                backgroundColor: "rgba(156, 39, 176, 0.2)",
            },
            {
                label: "Neutral",
                data: Array(days).fill(0),
                borderColor: "#9E9E9E",
                backgroundColor: "rgba(158, 158, 158, 0.2)",
            },
            {
                label: "Anxious",
                data: Array(days).fill(0),
                borderColor: "#FBBC05",
                backgroundColor: "rgba(251, 188, 5, 0.2)",
            },
            {
                label: "Sad",
                data: Array(days).fill(0),
                borderColor: "#4285F4",
                backgroundColor: "rgba(66, 133, 244, 0.2)",
            },
            {
                label: "Angry",
                data: Array(days).fill(0),
                borderColor: "#EA4335",
                backgroundColor: "rgba(234, 67, 53, 0.2)",
            },
        ];

        // Fill data
        const moodIndices = {
            happy: 0,
            calm: 1,
            neutral: 2,
            anxious: 3,
            sad: 4,
            angry: 5,
        };

        data.forEach((entry) => {
            let mood;

            if (entry.type === "manual_tag") {
                mood = entry.data.mood;
            } else if (entry.type === "sentiment") {
                mood = entry.data.sentiment.primaryMood;
            } else if (entry.type === "typing_behavior") {
                mood = entry.data.analysis.primaryMood;
            } else {
                return; // Skip other types
            }

            const entryDate = new Date(entry.data.timestamp);
            const dayIndex = Math.floor(
                (entryDate.getTime() - (now - days * 24 * 60 * 60 * 1000)) /
                    (24 * 60 * 60 * 1000)
            );

            if (dayIndex >= 0 && dayIndex < days && mood in moodIndices) {
                datasets[moodIndices[mood]].data[dayIndex]++;
            }
        });
    }

    // Create chart
    const ctx = canvas.getContext("2d");
    canvas.__chart__ = new Chart(ctx, {
        type: chartType,
        data: {
            labels: labels,
            datasets: datasets,
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                    },
                },
            },
            plugins: {
                legend: {
                    position: "top",
                    labels: {
                        boxWidth: 12,
                        font: {
                            size: 10,
                        },
                    },
                },
                tooltip: {
                    mode: "index",
                    intersect: false,
                },
            },
        },
    });
}

// Update entries list
function updateEntriesList(data) {
    const entriesList = document.getElementById("entriesList");
    entriesList.innerHTML = "";

    if (!data || data.length === 0) {
        const placeholder = document.createElement("div");
        placeholder.className = "entry-placeholder";
        placeholder.textContent = "No entries found for selected filters";
        entriesList.appendChild(placeholder);
        return;
    }

    // Sort entries by timestamp (newest first)
    const sortedEntries = [...data].sort(
        (a, b) => b.data.timestamp - a.data.timestamp
    );

    // Display entries (limit to 20 for performance)
    const entriesToShow = sortedEntries.slice(0, 20);

    entriesToShow.forEach((entry) => {
        let mood, source, detail;

        if (entry.type === "manual_tag") {
            mood = entry.data.mood;
            source = "Manual tag";
            detail = entry.data.note;
        } else if (entry.type === "sentiment") {
            mood = entry.data.sentiment.primaryMood;
            source = "Text sentiment";
            detail =
                entry.data.text?.substring(0, 50) +
                (entry.data.text?.length > 50 ? "..." : "");
        } else if (entry.type === "typing_behavior") {
            mood = entry.data.analysis.primaryMood;
            source = "Typing behavior";
            detail = `Speed: ${Math.round(entry.data.typingSpeed)} CPM`;
        } else {
            return; // Skip other types
        }

        const entryElement = document.createElement("div");
        entryElement.className = "entry";

        const moodElement = document.createElement("div");
        moodElement.className = "entry-mood";
        moodElement.textContent = moodIcons[mood] || moodIcons.neutral;

        const detailsElement = document.createElement("div");
        detailsElement.className = "entry-details";

        const timeElement = document.createElement("div");
        timeElement.className = "entry-time";
        timeElement.textContent = new Date(
            entry.data.timestamp
        ).toLocaleString();

        const sourceElement = document.createElement("div");
        sourceElement.className = "entry-source";
        sourceElement.textContent = entry.data.domain
            ? `${source} on ${entry.data.domain}`
            : source;

        detailsElement.appendChild(timeElement);
        detailsElement.appendChild(sourceElement);

        if (detail) {
            const noteElement = document.createElement("div");
            noteElement.className = "entry-note";
            noteElement.textContent = detail;
            detailsElement.appendChild(noteElement);
        }

        entryElement.appendChild(moodElement);
        entryElement.appendChild(detailsElement);

        entriesList.appendChild(entryElement);
    });

    // Add 'show more' button if there are more entries
    if (sortedEntries.length > 20) {
        const showMoreElement = document.createElement("div");
        showMoreElement.className = "entry show-more";
        showMoreElement.textContent = `Show ${
            sortedEntries.length - 20
        } more entries...`;
        showMoreElement.addEventListener("click", () => {
            // Replace with all entries
            entriesList.innerHTML = "";
            sortedEntries.forEach((entry) => {
                // ... (same entry creation code as above)
            });
        });
        entriesList.appendChild(showMoreElement);
    }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Initialize the popup when the DOM is loaded
document.addEventListener("DOMContentLoaded", initializePopup);
