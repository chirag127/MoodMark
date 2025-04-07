// MoodMark - Popup Settings Functions
// These functions handle the settings tab and data management

// Update settings view
function updateSettingsView() {
  if (currentTab !== 'settings') return;
  
  // Update checkboxes
  trackSentimentCheckbox.checked = currentSettings.trackSentiment;
  trackTypingBehaviorCheckbox.checked = currentSettings.trackTypingBehavior;
  trackURLContextCheckbox.checked = currentSettings.trackURLContext;
  
  // Update selects
  privacyModeSelect.value = currentSettings.privacyMode;
  dataRetentionDaysSelect.value = currentSettings.dataRetentionDays;
}

// Update a setting when changed
function updateSetting(event) {
  const target = event.target;
  let setting, value;
  
  if (target.type === 'checkbox') {
    setting = target.id;
    value = target.checked;
  } else if (target.type === 'select-one') {
    setting = target.id;
    value = target.value;
    
    // Convert numeric values
    if (setting === 'dataRetentionDays') {
      value = parseInt(value, 10);
    }
  }
  
  if (setting && value !== undefined) {
    const settingUpdate = {};
    settingUpdate[setting] = value;
    
    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      data: settingUpdate
    }, (response) => {
      if (response && response.success) {
        currentSettings = response.settings;
      } else {
        console.error('MoodMark: Error updating setting', response);
        // Revert UI to match current settings
        updateSettingsView();
      }
    });
  }
}

// Export data as JSON file
function exportData() {
  if (!moodData || moodData.length === 0) {
    alert('No data to export');
    return;
  }
  
  const exportData = {
    data: moodData,
    settings: currentSettings,
    exportDate: Date.now(),
    version: '1.0.0'
  };
  
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  
  const exportFileName = `moodmark_export_${new Date().toISOString().slice(0, 10)}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileName);
  linkElement.style.display = 'none';
  
  document.body.appendChild(linkElement);
  linkElement.click();
  document.body.removeChild(linkElement);
}

// Import data from JSON file
function importData() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.style.display = 'none';
  
  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        
        // Validate imported data
        if (!importedData.data || !Array.isArray(importedData.data)) {
          throw new Error('Invalid data format');
        }
        
        // Confirm import
        if (confirm(`Import ${importedData.data.length} mood entries? This will replace your current data.`)) {
          // Import data
          chrome.storage.local.set({
            'moodmark_data': importedData.data,
            'moodmark_settings': importedData.settings || currentSettings
          }, () => {
            alert('Data imported successfully. The extension will now reload.');
            
            // Reload extension
            chrome.runtime.reload();
          });
        }
      } catch (error) {
        console.error('MoodMark: Error importing data', error);
        alert('Error importing data: ' + error.message);
      }
    };
    
    reader.readAsText(file);
  });
  
  document.body.appendChild(fileInput);
  fileInput.click();
  document.body.removeChild(fileInput);
}

// Clear all data
function clearData() {
  if (confirm('Are you sure you want to clear all mood data? This cannot be undone.')) {
    chrome.storage.local.set({ 'moodmark_data': [] }, () => {
      moodData = [];
      alert('All mood data has been cleared.');
      updateUI();
    });
  }
}
