// MoodMark - Content Script
// Monitors user interactions on web pages

// Configuration
const config = {
  // Minimum text length to analyze
  minTextLength: 20,
  
  // Debounce time for text analysis (ms)
  textAnalysisDebounce: 1000,
  
  // Minimum typing session duration to analyze (ms)
  minTypingSessionDuration: 5000,
  
  // Selector for text inputs to monitor
  textInputSelectors: 'textarea, input[type="text"], [contenteditable="true"], [role="textbox"]',
  
  // Ignore inputs with these attributes or classes
  ignoreSelectors: 'input[type="password"], input[type="email"], input[type="search"], .moodmark-ignore',
  
  // Maximum number of characters to send for analysis
  maxTextLength: 1000
};

// State variables
let typingSession = null;
let textAnalysisTimeout = null;
let observedElements = new Set();
let mutationObserver = null;

// Initialize content script
function initialize() {
  console.log('MoodMark: Content script initialized');
  
  // Set up mutation observer to detect dynamically added elements
  setupMutationObserver();
  
  // Find and monitor existing text inputs
  findAndMonitorTextInputs();
  
  // Listen for messages from background script
  setupMessageListeners();
}

// Set up mutation observer to detect dynamically added elements
function setupMutationObserver() {
  mutationObserver = new MutationObserver((mutations) => {
    let shouldScanForInputs = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        shouldScanForInputs = true;
        break;
      }
    }
    
    if (shouldScanForInputs) {
      findAndMonitorTextInputs();
    }
  });
  
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Find and monitor text input elements
function findAndMonitorTextInputs() {
  const textInputs = document.querySelectorAll(config.textInputSelectors);
  const ignoreInputs = document.querySelectorAll(config.ignoreSelectors);
  
  // Convert NodeList to Array for filtering
  const ignoreSet = new Set(Array.from(ignoreInputs));
  
  textInputs.forEach(element => {
    // Skip if element should be ignored or is already being monitored
    if (ignoreSet.has(element) || observedElements.has(element)) {
      return;
    }
    
    // Add event listeners
    element.addEventListener('focus', onInputFocus);
    element.addEventListener('blur', onInputBlur);
    element.addEventListener('input', onInputChange);
    
    // Mark as observed
    observedElements.add(element);
  });
}

// Handle input focus event
function onInputFocus(event) {
  // Start a new typing session
  typingSession = {
    element: event.target,
    startTime: Date.now(),
    keyPresses: 0,
    deletions: 0,
    pauses: [],
    lastTypingTime: Date.now(),
    initialText: getElementText(event.target)
  };
  
  // Add keydown listener to track individual key presses
  event.target.addEventListener('keydown', onKeyDown);
}

// Handle input blur event
function onInputBlur(event) {
  // Only process if we have an active typing session
  if (!typingSession || typingSession.element !== event.target) {
    return;
  }
  
  // Remove keydown listener
  event.target.removeEventListener('keydown', onKeyDown);
  
  // Analyze the typing session if it was long enough
  const sessionDuration = Date.now() - typingSession.startTime;
  if (sessionDuration >= config.minTypingSessionDuration) {
    analyzeTypingBehavior();
  }
  
  // Clear the typing session
  typingSession = null;
  
  // Clear any pending text analysis
  if (textAnalysisTimeout) {
    clearTimeout(textAnalysisTimeout);
    textAnalysisTimeout = null;
  }
}

// Handle input change event
function onInputChange(event) {
  // Only process if we have an active typing session
  if (!typingSession || typingSession.element !== event.target) {
    return;
  }
  
  // Update last typing time
  const now = Date.now();
  const timeSinceLastType = now - typingSession.lastTypingTime;
  
  // Record pause if it's significant (> 1 second)
  if (timeSinceLastType > 1000) {
    typingSession.pauses.push(timeSinceLastType);
  }
  
  typingSession.lastTypingTime = now;
  
  // Schedule text analysis with debounce
  if (textAnalysisTimeout) {
    clearTimeout(textAnalysisTimeout);
  }
  
  textAnalysisTimeout = setTimeout(() => {
    analyzeText(event.target);
  }, config.textAnalysisDebounce);
}

// Handle keydown event
function onKeyDown(event) {
  // Only process if we have an active typing session
  if (!typingSession || typingSession.element !== event.target) {
    return;
  }
  
  // Track key presses
  typingSession.keyPresses++;
  
  // Track deletions
  if (event.key === 'Backspace' || event.key === 'Delete') {
    typingSession.deletions++;
  }
}

// Get text from an element
function getElementText(element) {
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    return element.value;
  } else if (element.isContentEditable) {
    return element.textContent;
  }
  return '';
}

// Analyze text for sentiment
function analyzeText(element) {
  const text = getElementText(element);
  
  // Skip if text is too short
  if (text.length < config.minTextLength) {
    return;
  }
  
  // Truncate text if it's too long
  const truncatedText = text.length > config.maxTextLength 
    ? text.substring(0, config.maxTextLength) 
    : text;
  
  // Send text to background script for analysis
  chrome.runtime.sendMessage({
    type: 'TEXT_INPUT',
    data: {
      text: truncatedText,
      inputType: element.tagName.toLowerCase(),
      timestamp: Date.now()
    }
  }, (response) => {
    if (response && response.success) {
      console.log('MoodMark: Text analysis complete', response.sentiment);
    } else {
      console.error('MoodMark: Text analysis failed', response);
    }
  });
}

// Analyze typing behavior
function analyzeTypingBehavior() {
  if (!typingSession) return;
  
  const sessionDuration = Date.now() - typingSession.startTime;
  const textLength = getElementText(typingSession.element).length;
  const initialTextLength = typingSession.initialText.length;
  const netCharacters = textLength - initialTextLength;
  
  // Skip if no significant text was entered
  if (netCharacters < config.minTextLength) {
    return;
  }
  
  // Calculate metrics
  const typingSpeed = (typingSession.keyPresses / (sessionDuration / 1000 / 60)); // Characters per minute
  const deletionRate = typingSession.deletions / typingSession.keyPresses;
  const averagePauseDuration = typingSession.pauses.length > 0 
    ? typingSession.pauses.reduce((sum, pause) => sum + pause, 0) / typingSession.pauses.length 
    : 0;
  
  // Send data to background script
  chrome.runtime.sendMessage({
    type: 'TYPING_BEHAVIOR',
    data: {
      typingSpeed,
      deletionRate,
      pauseDuration: averagePauseDuration,
      sessionDuration,
      inputLength: textLength,
      timestamp: Date.now()
    }
  }, (response) => {
    if (response && response.success) {
      console.log('MoodMark: Typing behavior analysis complete', response.analysis);
    } else {
      console.error('MoodMark: Typing behavior analysis failed', response);
    }
  });
}

// Set up message listeners
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('MoodMark Content: Received message', message);
    
    switch (message.type) {
      case 'GET_PAGE_CONTENT':
        sendResponse({
          success: true,
          title: document.title,
          url: window.location.href
        });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  });
}

// Initialize when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
