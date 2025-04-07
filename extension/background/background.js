// MoodMark - Background Script
// Handles data storage, communication, and extension lifecycle

// Constants
const BACKEND_URL = 'http://localhost:3000'; // Local development server
const MOOD_STORAGE_KEY = 'moodmark_data';
const SETTINGS_STORAGE_KEY = 'moodmark_settings';

// Default settings
const DEFAULT_SETTINGS = {
  trackSentiment: true,
  trackTypingBehavior: true,
  trackURLContext: true,
  privacyMode: 'local', // 'local' or 'server'
  dataRetentionDays: 30,
  notificationsEnabled: true
};

// Initialize extension
async function initializeExtension() {
  console.log('MoodMark: Initializing extension...');
  
  // Load or initialize settings
  const settings = await loadSettings();
  console.log('MoodMark: Settings loaded', settings);
  
  // Set up message listeners
  setupMessageListeners();
  
  // Set up browser action badge
  chrome.action.setBadgeBackgroundColor({ color: '#4285F4' });
  
  // Set up tab listeners
  setupTabListeners();
  
  console.log('MoodMark: Initialization complete');
}

// Load settings from storage or use defaults
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([SETTINGS_STORAGE_KEY], (result) => {
      if (result[SETTINGS_STORAGE_KEY]) {
        resolve(result[SETTINGS_STORAGE_KEY]);
      } else {
        // Initialize with default settings
        chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: DEFAULT_SETTINGS });
        resolve(DEFAULT_SETTINGS);
      }
    });
  });
}

// Set up message listeners for communication with content scripts and popup
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('MoodMark: Received message', message);
    
    switch (message.type) {
      case 'TEXT_INPUT':
        handleTextInput(message.data, sender.tab, sendResponse);
        return true; // Keep the message channel open for async response
        
      case 'TYPING_BEHAVIOR':
        handleTypingBehavior(message.data, sender.tab, sendResponse);
        return true;
        
      case 'GET_MOOD_DATA':
        getMoodData(message.data, sendResponse);
        return true;
        
      case 'UPDATE_SETTINGS':
        updateSettings(message.data, sendResponse);
        return true;
        
      case 'MANUAL_MOOD_TAG':
        handleManualMoodTag(message.data, sender.tab, sendResponse);
        return true;
        
      default:
        console.log('MoodMark: Unknown message type', message.type);
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  });
}

// Set up tab listeners to track URL context
function setupTabListeners() {
  // Track active tab changes
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      recordURLVisit(tab.url, tab.title);
    }
  });
  
  // Track URL changes
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
      recordURLVisit(changeInfo.url, tab.title);
    }
  });
}

// Record URL visit with current mood context
async function recordURLVisit(url, title) {
  try {
    const settings = await loadSettings();
    if (!settings.trackURLContext) return;
    
    const urlData = {
      url: url,
      title: title || '',
      timestamp: Date.now(),
      domain: new URL(url).hostname
    };
    
    // Store URL visit data
    storeMoodData({
      type: 'url_visit',
      data: urlData
    });
    
    console.log('MoodMark: Recorded URL visit', urlData);
  } catch (error) {
    console.error('MoodMark: Error recording URL visit', error);
  }
}

// Handle text input from content script
async function handleTextInput(textData, tab, sendResponse) {
  try {
    const settings = await loadSettings();
    if (!settings.trackSentiment) {
      sendResponse({ success: false, message: 'Sentiment tracking disabled' });
      return;
    }
    
    // Add URL context
    textData.url = tab.url;
    textData.title = tab.title;
    textData.domain = new URL(tab.url).hostname;
    
    // Analyze sentiment locally or send to backend
    let sentimentResult;
    if (settings.privacyMode === 'local') {
      sentimentResult = analyzeTextLocally(textData.text);
    } else {
      sentimentResult = await analyzeTextWithBackend(textData.text);
    }
    
    // Store the result
    const moodData = {
      type: 'sentiment',
      data: {
        ...textData,
        sentiment: sentimentResult,
        timestamp: Date.now()
      }
    };
    
    storeMoodData(moodData);
    
    // Update badge with current mood
    updateMoodBadge(sentimentResult.primaryMood);
    
    sendResponse({ success: true, sentiment: sentimentResult });
  } catch (error) {
    console.error('MoodMark: Error handling text input', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle typing behavior data from content script
async function handleTypingBehavior(behaviorData, tab, sendResponse) {
  try {
    const settings = await loadSettings();
    if (!settings.trackTypingBehavior) {
      sendResponse({ success: false, message: 'Typing behavior tracking disabled' });
      return;
    }
    
    // Add URL context
    behaviorData.url = tab.url;
    behaviorData.title = tab.title;
    behaviorData.domain = new URL(tab.url).hostname;
    
    // Analyze typing behavior
    const behaviorResult = analyzeTypingBehavior(behaviorData);
    
    // Store the result
    const moodData = {
      type: 'typing_behavior',
      data: {
        ...behaviorData,
        analysis: behaviorResult,
        timestamp: Date.now()
      }
    };
    
    storeMoodData(moodData);
    
    // Update badge with current mood if significant
    if (behaviorResult.confidence > 0.7) {
      updateMoodBadge(behaviorResult.primaryMood);
    }
    
    sendResponse({ success: true, analysis: behaviorResult });
  } catch (error) {
    console.error('MoodMark: Error handling typing behavior', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle manual mood tagging from popup
async function handleManualMoodTag(tagData, tab, sendResponse) {
  try {
    // Add URL context if not provided
    if (!tagData.url && tab) {
      tagData.url = tab.url;
      tagData.title = tab.title;
      tagData.domain = new URL(tab.url).hostname;
    }
    
    // Store the manual tag
    const moodData = {
      type: 'manual_tag',
      data: {
        ...tagData,
        timestamp: Date.now()
      }
    };
    
    storeMoodData(moodData);
    
    // Update badge with manual mood
    updateMoodBadge(tagData.mood);
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('MoodMark: Error handling manual mood tag', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Store mood data in local storage
async function storeMoodData(moodData) {
  try {
    // Get existing data
    const existingData = await getMoodDataFromStorage();
    
    // Add new data
    existingData.push(moodData);
    
    // Clean up old data
    const settings = await loadSettings();
    const cutoffTime = Date.now() - (settings.dataRetentionDays * 24 * 60 * 60 * 1000);
    const cleanedData = existingData.filter(item => item.data.timestamp >= cutoffTime);
    
    // Save back to storage
    chrome.storage.local.set({ [MOOD_STORAGE_KEY]: cleanedData });
    
    console.log('MoodMark: Stored mood data', moodData);
  } catch (error) {
    console.error('MoodMark: Error storing mood data', error);
  }
}

// Get mood data from storage
function getMoodDataFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get([MOOD_STORAGE_KEY], (result) => {
      resolve(result[MOOD_STORAGE_KEY] || []);
    });
  });
}

// Get mood data for popup or other components
async function getMoodData(request, sendResponse) {
  try {
    const data = await getMoodDataFromStorage();
    
    // Filter data based on request
    let filteredData = data;
    
    if (request) {
      // Filter by date range
      if (request.startDate && request.endDate) {
        filteredData = filteredData.filter(item => 
          item.data.timestamp >= request.startDate && 
          item.data.timestamp <= request.endDate
        );
      }
      
      // Filter by domain
      if (request.domain) {
        filteredData = filteredData.filter(item => 
          item.data.domain === request.domain
        );
      }
      
      // Filter by type
      if (request.type) {
        filteredData = filteredData.filter(item => 
          item.type === request.type
        );
      }
    }
    
    sendResponse({ success: true, data: filteredData });
  } catch (error) {
    console.error('MoodMark: Error getting mood data', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Update extension settings
async function updateSettings(newSettings, sendResponse) {
  try {
    const currentSettings = await loadSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    
    chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: updatedSettings });
    
    sendResponse({ success: true, settings: updatedSettings });
  } catch (error) {
    console.error('MoodMark: Error updating settings', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Update the browser action badge with current mood
function updateMoodBadge(mood) {
  const moodColors = {
    'happy': '#4CAF50', // Green
    'sad': '#2196F3',   // Blue
    'angry': '#F44336', // Red
    'anxious': '#FF9800', // Orange
    'calm': '#9C27B0',  // Purple
    'neutral': '#9E9E9E' // Gray
  };
  
  const color = moodColors[mood] || moodColors.neutral;
  const text = mood.substring(0, 1).toUpperCase();
  
  chrome.action.setBadgeBackgroundColor({ color: color });
  chrome.action.setBadgeText({ text: text });
}

// Simple local sentiment analysis (placeholder - would be more sophisticated in real implementation)
function analyzeTextLocally(text) {
  // This is a very simplified sentiment analysis
  // In a real implementation, this would use a more sophisticated algorithm or library
  
  const happyWords = ['happy', 'good', 'great', 'excellent', 'wonderful', 'love', 'like', 'enjoy'];
  const sadWords = ['sad', 'bad', 'terrible', 'awful', 'unhappy', 'disappointed', 'sorry'];
  const angryWords = ['angry', 'mad', 'furious', 'annoyed', 'irritated', 'hate', 'dislike'];
  const anxiousWords = ['anxious', 'worried', 'nervous', 'scared', 'afraid', 'stress', 'concern'];
  const calmWords = ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'quiet', 'gentle'];
  
  const words = text.toLowerCase().split(/\W+/);
  
  let scores = {
    happy: 0,
    sad: 0,
    angry: 0,
    anxious: 0,
    calm: 0,
    neutral: 1 // Start with a baseline for neutral
  };
  
  // Count occurrences of mood words
  words.forEach(word => {
    if (happyWords.includes(word)) scores.happy++;
    if (sadWords.includes(word)) scores.sad++;
    if (angryWords.includes(word)) scores.angry++;
    if (anxiousWords.includes(word)) scores.anxious++;
    if (calmWords.includes(word)) scores.calm++;
  });
  
  // Find the highest scoring mood
  let primaryMood = 'neutral';
  let highestScore = scores.neutral;
  
  for (const [mood, score] of Object.entries(scores)) {
    if (score > highestScore) {
      primaryMood = mood;
      highestScore = score;
    }
  }
  
  // Calculate confidence (simplified)
  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  const confidence = totalScore > 0 ? highestScore / totalScore : 0;
  
  return {
    primaryMood,
    scores,
    confidence
  };
}

// Analyze typing behavior (placeholder - would be more sophisticated in real implementation)
function analyzeTypingBehavior(behaviorData) {
  // This is a simplified analysis
  // In a real implementation, this would use more sophisticated algorithms
  
  const { typingSpeed, pauseDuration, deletionRate, inputLength } = behaviorData;
  
  // Skip analysis for very short inputs
  if (inputLength < 10) {
    return {
      primaryMood: 'neutral',
      confidence: 0.5,
      factors: {}
    };
  }
  
  // Analyze typing speed
  let speedMood = 'neutral';
  if (typingSpeed > 100) speedMood = 'anxious'; // Fast typing might indicate anxiety
  else if (typingSpeed < 40) speedMood = 'calm'; // Slow typing might indicate calmness
  
  // Analyze pauses
  let pauseMood = 'neutral';
  if (pauseDuration > 2000) pauseMood = 'sad'; // Long pauses might indicate sadness
  else if (pauseDuration < 500 && typingSpeed > 80) pauseMood = 'angry'; // Short pauses with fast typing might indicate anger
  
  // Analyze deletion rate
  let deletionMood = 'neutral';
  if (deletionRate > 0.3) deletionMood = 'anxious'; // High deletion rate might indicate anxiety
  
  // Combine factors
  const factors = {
    typingSpeed: { value: typingSpeed, mood: speedMood },
    pauseDuration: { value: pauseDuration, mood: pauseMood },
    deletionRate: { value: deletionRate, mood: deletionMood }
  };
  
  // Determine primary mood (simplified)
  const moodCounts = {};
  Object.values(factors).forEach(factor => {
    if (factor.mood !== 'neutral') {
      moodCounts[factor.mood] = (moodCounts[factor.mood] || 0) + 1;
    }
  });
  
  let primaryMood = 'neutral';
  let highestCount = 0;
  
  for (const [mood, count] of Object.entries(moodCounts)) {
    if (count > highestCount) {
      primaryMood = mood;
      highestCount = count;
    }
  }
  
  // Calculate confidence (simplified)
  const confidence = highestCount / Object.keys(factors).length;
  
  return {
    primaryMood,
    confidence,
    factors
  };
}

// Send text to backend for sentiment analysis
async function analyzeTextWithBackend(text) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/analyze/sentiment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('MoodMark: Error analyzing text with backend', error);
    // Fall back to local analysis
    return analyzeTextLocally(text);
  }
}

// Initialize the extension when loaded
initializeExtension();
