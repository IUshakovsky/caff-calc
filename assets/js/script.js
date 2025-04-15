// User data object
let user = {
  ageGroup: 'adult',
  gender: 'Male',
  weight: 75,
  weightUnit: 'kg',
  isPregnant: false,
  isBreastfeeding: false,
  sensitivity: 3,
  volumeUnit: 'ml'
};

// Conversion factors
const weightConversion = {
  kg: { lbs: 2.20462 },
  lbs: { kg: 0.453592 }
};

// Age-based limits (mg)
const caffeineLimits = {
  child: 0,     // No caffeine for children (0-12)
  teen: 100,    // Limited for teens (13-17)
  adult: 400,   // Standard adult limit
  senior: 300,  // Reduced for seniors
  pregnant: 200 // Limited for pregnant women
};

// Weight-based adjustment factors
const weightAdjustment = {
  // For adults and seniors (mg per kg)
  adult: 6,    // ~6mg per kg is considered safe for adults
  senior: 4.5, // Reduced for seniors
  // For teens (mg per kg)
  teen: 2.5,   // Much lower for teens
  // No caffeine for children regardless of weight
  child: 0
};

// Initialize the calculator
function initCalculator() {
  setAgeGroup('adult');
  updateGender('Male');
  updateUnit('volume', 'ml');
  updateUnit('weight', 'kg');
  
  // Set medium sensitivity as default
  document.querySelector('[data-value="3"]').classList.add('active');
  
  // Update the limit display
  updateCalculation();
}

// Set age group
function setAgeGroup(group) {
  user.ageGroup = group;
  document.querySelectorAll('[data-age-group]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.ageGroup === group);
  });
  updateCalculation();
}

// Update gender
function updateGender(gender) {
  user.gender = gender;
  const maleBtn = document.getElementById('maleBtn');
  const femaleBtn = document.getElementById('femaleBtn');
  const femaleHealthPanel = document.getElementById('femaleHealthPanel');

  maleBtn.classList.toggle('active', gender === 'Male');
  femaleBtn.classList.toggle('active', gender === 'Female');
  
  // Show/hide female health panel based on gender
  if (gender === 'Female') {
    femaleHealthPanel.classList.remove('d-none');
  } else {
    femaleHealthPanel.classList.add('d-none');
    // Reset health switches when switching to male
    document.getElementById('pregnantSwitch').checked = false;
    document.getElementById('breastfeedingSwitch').checked = false;
    user.isPregnant = false;
    user.isBreastfeeding = false;
  }
  
  updateCalculation();
}

// Update unit (weight or volume)
// Make this function available globally for the onclick handlers in HTML
window.updateUnit = function(type, unit, savePrefs = true) {
  const prevUnit = user[type === 'weight' ? 'weightUnit' : 'volumeUnit'];
  user[type === 'weight' ? 'weightUnit' : 'volumeUnit'] = unit;

  if (type === 'weight') {
    const inputField = document.getElementById('weightInput');
    if (!inputField) {
      // We're not on the calculator page, just update the user object
      return;
    }
    const currentValue = parseFloat(inputField.value);
    
    if (!isNaN(currentValue)) {
      const convertedValue = convertWeight(currentValue, prevUnit, unit);
      inputField.value = convertedValue.toFixed(1);
      user.weight = convertedValue;
    }
    document.getElementById('weightUnit').textContent = unit;
  } else if (type === 'volume') {
    // If volume unit changed, update the size dropdown if a beverage is selected
    const beverageDropdown = document.getElementById('caffeineBeverage');
    const sizeDropdown = document.getElementById('caffeineSize');
    
    if (beverageDropdown && sizeDropdown && beverageDropdown.value && 
        beverageDropdown.value !== 'custom' && !sizeDropdown.disabled) {
      // Get currently selected beverage
      const [category, type] = beverageDropdown.value.split('_');
      
      // Repopulate size dropdown with new unit
      populateSizeDropdown(category, type);
    }
  }

  // Only update UI if elements exist (we might be on a different page)
  const unitButtons = document.querySelectorAll(`[data-unit]`);
  if (unitButtons.length > 0) {
    document.querySelectorAll(`[data-unit="${prevUnit}"]`).forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll(`[data-unit="${unit}"]`).forEach(btn => btn.classList.add('active'));
  }
  updateCalculation();
  
  // Save user preferences to local storage if needed
  if (savePrefs) {
    saveUserPreferences();
  }
}

// Convert weight between units
function convertWeight(value, fromUnit, toUnit) {
  return fromUnit === toUnit ? value : value * weightConversion[fromUnit][toUnit];
}

// Update calculation
function updateCalculation() {
  const pregnantSwitch = document.getElementById('pregnantSwitch');
  const breastfeedingSwitch = document.getElementById('breastfeedingSwitch');
  
  // Update user status based on switches (only if elements exist)
  if (pregnantSwitch) {
    user.isPregnant = pregnantSwitch.checked;
  }
  
  if (breastfeedingSwitch) {
    user.isBreastfeeding = breastfeedingSwitch.checked;
  }
  
  // Update switch container styles (only if elements exist)
  const femaleHealthPanel = document.getElementById('femaleHealthPanel');
  if (femaleHealthPanel) {
    femaleHealthPanel.classList.toggle('active', user.isPregnant || user.isBreastfeeding);
  }
  
  // Get base limit from age group
  let baseLimit = caffeineLimits[user.ageGroup];
  
  // Set limits based on pregnancy/breastfeeding status
  // Pregnant takes precedence if both are checked
  if (user.isPregnant) {
    baseLimit = caffeineLimits.pregnant; // 200mg for pregnant women
  } else if (user.isBreastfeeding) {
    baseLimit = 300; // 300mg for breastfeeding women
  }
  
  // Apply weight-based adjustment if applicable
  let weightBasedLimit = 0;
  if (user.weight > 0 && weightAdjustment[user.ageGroup]) {
    // Convert weight to kg if needed
    const weightInKg = user.weightUnit === 'kg' ? user.weight : user.weight * weightConversion.lbs.kg;
    weightBasedLimit = weightInKg * weightAdjustment[user.ageGroup];
    
    // Use weight-based limit if it's lower than the standard limit
    // or if it's the only limit available (for teens)
    if (weightBasedLimit < baseLimit || user.ageGroup === 'teen') {
      baseLimit = weightBasedLimit;
    }
  }
  
  // Apply sensitivity modifier (1-5 scale)
  // Higher sensitivity (5) means LOWER tolerance, so we invert the scale
  // 1 = Low sensitivity = Higher limit (1.3x)
  // 5 = Extreme sensitivity = Lower limit (0.7x)
  const sensitivityModifier = 1.3 - (user.sensitivity - 1) * 0.15;
  const adjustedLimit = baseLimit * sensitivityModifier;
  
  // Update the safe limit display
  const safeLimitValue = document.getElementById('safeLimitValue');
  if (safeLimitValue) {
    safeLimitValue.textContent = Math.round(adjustedLimit) + ' mg';
    
    // Change color based on the limit
    if (baseLimit === 0) {
      safeLimitValue.style.color = '#a52a2a'; // Red for children
    } else if (baseLimit <= 100) {
      safeLimitValue.style.color = '#d2691e'; // Orange for teens
    } else {
      safeLimitValue.style.color = '#6b8e23'; // Green for adults
    }
  }
  
  console.log('Adjusted safe caffeine limit:', Math.round(adjustedLimit), 'mg');
  console.log('Weight-based limit:', Math.round(weightBasedLimit), 'mg');
  
  return adjustedLimit;
}

// Event Listeners
document.getElementById('weightInput').addEventListener('input', function(e) {
  user.weight = parseFloat(e.target.value) || 0;
  updateCalculation();
});

document.getElementById('pregnantSwitch').addEventListener('change', function(e) {
  user.isPregnant = e.target.checked;
  updateCalculation();
});

document.getElementById('breastfeedingSwitch').addEventListener('change', function(e) {
  user.isBreastfeeding = e.target.checked;
  updateCalculation();
});

// Sensitivity buttons handler
document.querySelectorAll('.sensitivity-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.sensitivity-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    user.sensitivity = parseInt(this.dataset.value);
    updateCalculation();
  });
});

// Caffeine consumption tracker variables
let caffeineData = {};
let consumptionItems = [];
let totalCaffeineConsumed = 0;

// Load caffeine data and populate beverage dropdown
async function loadCaffeineData() {
  try {
    const response = await fetch('../assets/data/caf_src.json');
    caffeineData = await response.json();
    console.log('Caffeine data loaded successfully');
    
    // Populate beverage dropdown from JSON data
    populateBeverageDropdown();
  } catch (error) {
    console.error('Error loading caffeine data:', error);
  }
}

// Populate the beverage dropdown based on JSON data
function populateBeverageDropdown() {
  const optionsContainer = document.getElementById('caffeineOptions');
  optionsContainer.innerHTML = '';
  
  // Process each category
  Object.keys(caffeineData).forEach(category => {
    // Create a category header with icon
    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'custom-select-optgroup';
    
    // Add icon based on category
    let iconClass = '';
    if (category === 'coffee') {
      iconClass = 'fa-coffee';
    } else if (category === 'tea') {
      iconClass = 'fa-mug-hot';
    } else if (category === 'energyDrink') {
      iconClass = 'fa-bolt';
    }
    
    categoryHeader.innerHTML = `<i class="fas ${iconClass} me-2"></i>${formatDisplayName(category)}`;
    optionsContainer.appendChild(categoryHeader);
    
    // Add beverage types for this category
    Object.keys(caffeineData[category]).forEach(type => {
      const option = document.createElement('div');
      option.className = 'custom-select-option';
      option.dataset.value = `${category}_${type}`;
      option.textContent = formatDisplayName(type);
      
      // Add click event
      option.addEventListener('click', function() {
        selectBeverage(this.dataset.value, this.textContent);
      });
      
      optionsContainer.appendChild(option);
    });
  });
  
  // Add custom option at the end
  const option = document.createElement('div');
  option.className = 'custom-select-option';
  option.dataset.value = 'custom';
  option.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Custom Item';
  
  option.addEventListener('click', function() {
    selectBeverage('custom', 'Custom Item');
  });
  
  optionsContainer.appendChild(option);
  
  // Initialize dropdown toggle functionality
  initCustomDropdown();
}

// Helper function to format display names (camelCase to Title Case)
function formatDisplayName(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// Populate type dropdown based on selected category
function populateTypeDropdown(category) {
  const typeSelect = document.getElementById('caffeineType');
  typeSelect.innerHTML = '<option value="">Select type</option>';
  
  if (!category) {
    typeSelect.disabled = true;
    return;
  }
  
  const types = Object.keys(caffeineData[category]);
  
  types.forEach(type => {
    // Convert camelCase to Title Case for display
    const displayName = type
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
      
    const option = document.createElement('option');
    option.value = type;
    option.textContent = displayName;
    typeSelect.appendChild(option);
  });
  
  typeSelect.disabled = false;
}

// Populate size dropdown based on selected category and type
function populateSizeDropdown(category, type) {
  const sizeOptions = document.getElementById('caffeineSizeOptions');
  const sizeButton = document.getElementById('caffeineSizeButton');
  const sizeButtonText = document.getElementById('caffeineSizeButtonText');
  const sizeInput = document.getElementById('caffeineSize');
  
  // Clear previous options
  sizeOptions.innerHTML = '';
  sizeInput.value = '';
  sizeButtonText.textContent = 'Size';
  
  if (!category || !type) {
    sizeButton.disabled = true;
    return;
  }
  
  const sizes = Object.keys(caffeineData[category][type].sizes);
  const volumeUnit = user.volumeUnit; // Get current volume unit
  
  sizes.forEach(size => {
    const option = document.createElement('div');
    option.className = 'custom-select-option';
    option.dataset.value = size;
    
    // Format display text with volume unit when appropriate
    let displayText = size.charAt(0).toUpperCase() + size.slice(1);
    
    // For drinks, add volume unit if size is small/medium/large
    if (['small', 'medium', 'large'].includes(size)) {
      // Define approximate volumes for each size
      const volumeMap = {
        small: { ml: '250ml', oz: '8oz' },
        medium: { ml: '350ml', oz: '12oz' },
        large: { ml: '500ml', oz: '16oz' }
      };
      
      // Add volume to display text
      if (volumeMap[size]) {
        displayText += ` (${volumeMap[size][volumeUnit]})`;
      }
    }
    
    option.textContent = displayText;
    
    // Add click event
    option.addEventListener('click', function() {
      selectSize(this.dataset.value, this.textContent);
    });
    
    sizeOptions.appendChild(option);
  });
  
  sizeButton.disabled = false;
  document.getElementById('caffeineQuantity').disabled = false;
  initSizeDropdown();
}

// Get caffeine content based on selections
function getCaffeineContent(beverageValue, size, quantity) {
  if (beverageValue === 'custom') {
    // For custom items, get caffeine content from the input field
    const customCaffeine = parseFloat(document.getElementById('customCaffeine').value) || 0;
    return customCaffeine * quantity;
  }
  
  if (!beverageValue || !size) return 0;
  
  // Extract category and type from the beverage value
  const [category, type] = beverageValue.split('_');
  
  if (!category || !type) return 0;
  
  let caffeineAmount = 0;
  
  if (category === 'medicine') {
    const [medicine, dosageType] = size.split('|');
    caffeineAmount = caffeineData[category][type][medicine][dosageType];
  } else {
    caffeineAmount = caffeineData[category][type].sizes[size];
  }
  
  return caffeineAmount * quantity;
}

// Add item to consumption tracker
function addConsumptionItem() {
  const beverageValue = document.getElementById('caffeineBeverage').value;
  const quantity = parseInt(document.getElementById('caffeineQuantity').value) || 1;
  
  // Handle custom caffeine item
  if (beverageValue === 'custom') {
    const customCaffeine = parseFloat(document.getElementById('customCaffeine').value) || 0;
    if (customCaffeine <= 0) {
      alert('Please enter a valid caffeine amount');
      return;
    }
    
    // Create custom item
    const item = {
      id: Date.now(),
      beverageValue: 'custom',
      category: 'custom',
      type: 'custom',
      size: 'custom',
      typeName: 'Custom Item',
      sizeName: customCaffeine + ' mg',
      quantity,
      caffeinePerItem: customCaffeine,
      totalCaffeine: customCaffeine * quantity
    };
    
    // Add to items array
    consumptionItems.push(item);
    
    // Update table
    updateConsumptionTable();
    
    // Reset fields
    document.getElementById('caffeineBeverage').selectedIndex = 0;
    document.getElementById('customCaffeine').value = 0;
    document.getElementById('caffeineQuantity').value = 1;
    document.getElementById('customSize').value = '';
    
    // Don't hide custom fields right after adding a custom item
    // This will keep the fields visible if the user wants to add more custom items
    return;
  }
  
  const sizeValue = document.getElementById('caffeineSize').value;
  
  if (!beverageValue || !sizeValue) {
    alert('Please select all options');
    return;
  }
  
  // Extract category and type from the beverage value
  const [category, type] = beverageValue.split('_');
  
  // Format display names
  let typeName = type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  let sizeName = '';
  let caffeineAmount = 0;
  
  if (category === 'medicine') {
    const [medicine, dosageType] = sizeValue.split('|');
    sizeName = dosageType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    typeName = medicine.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    caffeineAmount = caffeineData[category][type][medicine][dosageType];
  } else {
    sizeName = sizeValue.charAt(0).toUpperCase() + sizeValue.slice(1);
    caffeineAmount = caffeineData[category][type].sizes[sizeValue];
  }
  
  // Check if this item already exists in the tracker
  const existingItemIndex = consumptionItems.findIndex(item => 
    item.beverageValue === beverageValue && 
    item.size === sizeValue
  );
  
  if (existingItemIndex !== -1) {
    // Update existing item
    const existingItem = consumptionItems[existingItemIndex];
    existingItem.quantity += quantity;
    existingItem.totalCaffeine = existingItem.caffeinePerItem * existingItem.quantity;
  } else {
    // Create new item object
    const totalCaffeine = caffeineAmount * quantity;
    const item = {
      id: Date.now(),
      beverageValue,
      category,
      type,
      size: sizeValue,
      typeName,
      sizeName,
      quantity,
      caffeinePerItem: caffeineAmount,
      totalCaffeine
    };
    
    // Add to items array
    consumptionItems.push(item);
  }
  
  // Update table
  updateConsumptionTable();
  
  // Reset all fields
  document.getElementById('caffeineBeverage').selectedIndex = 0;
  document.getElementById('caffeineSize').innerHTML = '<option value="">Size</option>';
  document.getElementById('caffeineSize').disabled = true;
  document.getElementById('caffeineQuantity').value = 1;
  document.getElementById('caffeineQuantity').disabled = true;
  document.getElementById('addCaffeineBtn').disabled = true;
}

// Update consumption table
function updateConsumptionTable() {
  const tbody = document.querySelector('#consumptionTable tbody');
  tbody.innerHTML = '';
  
  totalCaffeineConsumed = 0;
  
  consumptionItems.forEach(item => {
    const row = document.createElement('tr');
    
    const typeCell = document.createElement('td');
    typeCell.textContent = item.typeName;
    row.appendChild(typeCell);
    
    const sizeCell = document.createElement('td');
    sizeCell.textContent = item.sizeName;
    row.appendChild(sizeCell);
    
    const quantityCell = document.createElement('td');
    quantityCell.textContent = item.quantity;
    row.appendChild(quantityCell);
    
    const caffeineCell = document.createElement('td');
    caffeineCell.textContent = item.totalCaffeine + ' mg';
    row.appendChild(caffeineCell);
    
    const actionCell = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-delete';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.onclick = () => removeConsumptionItem(item.id);
    actionCell.appendChild(deleteBtn);
    row.appendChild(actionCell);
    
    tbody.appendChild(row);
    
    totalCaffeineConsumed += item.totalCaffeine;
  });
  
  // Update total
  document.getElementById('totalCaffeine').textContent = totalCaffeineConsumed + ' mg';
  
  // Update status
  updateCaffeineStatus();
  
  // Reset caffeine meter (hide it until calculate button is pressed)
  document.getElementById('caffeineMeter').classList.add('d-none');
}

// Remove item from consumption tracker
function removeConsumptionItem(id) {
  consumptionItems = consumptionItems.filter(item => item.id !== id);
  updateConsumptionTable();
}

// Update caffeine status message
function updateCaffeineStatus() {
  const statusElement = document.getElementById('caffeineStatus');
  
  // Only update if the Calculate button was clicked
  if (statusElement.classList.contains('d-none')) {
    return { percentage: 0, adjustedLimit: 0 };
  }
  
  // Get user's safe limit based on age, pregnancy, etc.
  let baseLimit = caffeineLimits[user.ageGroup];
  if (user.isPregnant) baseLimit = caffeineLimits.pregnant;
  else if (user.isBreastfeeding) baseLimit = 300;
  
  // Apply sensitivity modifier (1-5 scale)
  // Higher sensitivity (5) means LOWER tolerance, so we invert the scale
  // 1 = Low sensitivity = Higher limit (1.3x)
  // 5 = Extreme sensitivity = Lower limit (0.7x)
  const sensitivityModifier = 1.3 - (user.sensitivity - 1) * 0.15;
  const adjustedLimit = baseLimit * sensitivityModifier;
  
  // Special message for infants with zero limit
  if (baseLimit === 0 && totalCaffeineConsumed > 0) {
    statusElement.classList.remove('d-none', 'alert-success', 'alert-warning');
    statusElement.classList.add('alert-danger');
    statusElement.innerHTML = `<strong>Warning:</strong> Infants should not consume any caffeine! Current intake: ${totalCaffeineConsumed} mg. <a href="pages/health-advice.html" class="alert-link">See health advice</a> for more information.`;
    return { percentage: 100, adjustedLimit: 0 };
  }
  
  // Calculate percentage of limit
  const percentage = adjustedLimit > 0 ? (totalCaffeineConsumed / adjustedLimit) * 100 : 0;
  
  statusElement.classList.remove('d-none', 'alert-success', 'alert-warning', 'alert-danger');
  
  if (percentage <= 50) {
    statusElement.classList.add('alert-success');
    statusElement.innerHTML = `<strong>Safe:</strong> You've consumed ${Math.round(percentage)}% of your daily safe limit (${Math.round(adjustedLimit)} mg).`;
  } else if (percentage <= 100) {
    statusElement.classList.add('alert-warning');
    statusElement.innerHTML = `<strong>Caution:</strong> You've consumed ${Math.round(percentage)}% of your daily safe limit (${Math.round(adjustedLimit)} mg). <a href="pages/caffeine-science.html" class="alert-link">Learn more</a> about caffeine metabolism.`;
  } else {
    statusElement.classList.add('alert-danger');
    statusElement.innerHTML = `<strong>Warning:</strong> You've exceeded your daily safe limit by ${Math.round(percentage - 100)}%! Your limit is ${Math.round(adjustedLimit)} mg. Check <a href="pages/overdose-symptoms.html" class="alert-link">overdose symptoms</a> for health concerns.`;
  }
  
  return { percentage, adjustedLimit };
}

// Update caffeine meter visualization
function updateCaffeineMeter() {
  const meterElement = document.getElementById('caffeineMeter');
  const meterFill = document.querySelector('.caffeine-meter-fill');
  
  // Get the percentage and limit from status update
  const { percentage, adjustedLimit } = updateCaffeineStatus();
  
  // Show the meter
  meterElement.classList.remove('d-none');
  
  // Set the fill percentage (capped at 150% for visual purposes)
  const fillPercentage = Math.min(percentage, 150);
  meterFill.style.setProperty('--fill-percentage', `${fillPercentage}%`);
  
  // Reset animation to trigger it again
  meterFill.style.animation = 'none';
  setTimeout(() => {
    meterFill.style.animation = 'fillUp 1.5s ease-out forwards';
  }, 50);
  
  // Set color based on percentage
  if (percentage <= 50) {
    meterFill.style.background = 'linear-gradient(to right, #6b8e23, #6b8e23)';
  } else if (percentage <= 100) {
    meterFill.style.background = 'linear-gradient(to right, #6b8e23, #d2691e)';
  } else {
    meterFill.style.background = 'linear-gradient(to right, #d2691e, #a52a2a)';
  }
}

// Calculate caffeine intake and show results
function calculateCaffeineIntake() {
  // Hide meter first (for animation effect when showing again)
  document.getElementById('caffeineMeter').classList.add('d-none');
  
  // Only update if we have consumption items
  if (consumptionItems.length > 0) {
    // Short delay for visual effect
    setTimeout(() => {
      document.getElementById('caffeineMeter').classList.remove('d-none');
      document.getElementById('caffeineStatus').classList.remove('d-none');
      updateCaffeineMeter();
      // Call updateCaffeineStatus to update the message
      updateCaffeineStatus();
    }, 300);
  } else {
    showNotification('Warning', 'Please add at least one caffeine item to calculate your intake.', 'warning');
  }
}

// Clear tracker data
function clearTracker() {
  if (consumptionItems.length === 0) {
    // Don't show notification when tracker is already empty
    return;
  }
  
  consumptionItems = [];
  updateConsumptionTable();
  
  // Hide status and meter
  const statusElement = document.getElementById('caffeineStatus');
  const meterElement = document.getElementById('caffeineMeter');
  
  if (statusElement) {
    statusElement.classList.add('d-none');
  }
  if (meterElement) {
    meterElement.classList.add('d-none');
  }
  
  // Reset all form inputs
  document.getElementById('caffeineBeverage').value = '';
  document.getElementById('caffeineButtonText').textContent = 'Select beverage';
  document.getElementById('caffeineSize').innerHTML = '<option value="">Size</option>';
  document.getElementById('caffeineSize').disabled = true;
  document.getElementById('caffeineQuantity').value = '1';
  document.getElementById('caffeineQuantity').disabled = true;
  document.getElementById('addCaffeineBtn').disabled = true;
  
  // Reset custom field
  document.getElementById('customCaffeine').value = '';
  document.getElementById('customSize').value = '';
  
  // Reset classes
  document.querySelector('.custom-fields').classList.add('d-none');
  document.querySelector('.regular-fields').classList.remove('d-none');
}

// Show toast notification
function showNotification(title, message, type = 'info') {
  const toast = document.getElementById('notificationToast');
  const toastTitle = document.getElementById('toastTitle');
  const toastMessage = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');
  
  // Reset classes
  toast.classList.remove('error', 'warning', 'success', 'info');
  
  // Add appropriate class
  toast.classList.add(type);
  
  // Set icon based on type
  let iconClass = 'fa-info-circle';
  if (type === 'warning') iconClass = 'fa-exclamation-triangle';
  if (type === 'error') iconClass = 'fa-exclamation-circle';
  if (type === 'success') iconClass = 'fa-check-circle';
  
  toastIcon.className = `fas ${iconClass} me-2`;
  toastTitle.textContent = title;
  toastMessage.textContent = message;
  
  // Show toast
  if (window.notificationToast) {
    window.notificationToast.show();
  }
}

// Save user preferences to local storage
function saveUserPreferences() {
  const preferences = {
    ageGroup: user.ageGroup,
    gender: user.gender,
    weight: user.weight,
    weightUnit: user.weightUnit,
    isPregnant: user.isPregnant,
    isBreastfeeding: user.isBreastfeeding,
    sensitivity: user.sensitivity,
    volumeUnit: user.volumeUnit
  };
  
  try {
    localStorage.setItem('caffeineCalculatorPreferences', JSON.stringify(preferences));
    console.log('Preferences saved successfully:', preferences);
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }
}

// Load user preferences from local storage
function loadUserPreferences() {
  const savedPrefs = localStorage.getItem('caffeineCalculatorPreferences');
  if (!savedPrefs) return false;
  
  try {
    const preferences = JSON.parse(savedPrefs);
    
    // Update user object with saved preferences
    user.ageGroup = preferences.ageGroup || 'adult';
    user.gender = preferences.gender || 'Male';
    user.weight = preferences.weight || 70;
    user.weightUnit = preferences.weightUnit || 'kg';
    user.isPregnant = preferences.isPregnant || false;
    user.isBreastfeeding = preferences.isBreastfeeding || false;
    user.sensitivity = preferences.sensitivity || 3;
    user.volumeUnit = preferences.volumeUnit || 'ml';
    
    // Check if we're on the calculator page before updating UI elements
    const isCalculatorPage = document.getElementById('weightInput') !== null;
    
    if (isCalculatorPage) {
      // Update UI to reflect loaded preferences
      setAgeGroup(user.ageGroup);
      updateGender(user.gender);
      
      // Set weight input value
      const weightInput = document.getElementById('weightInput');
      const weightUnitElement = document.getElementById('weightUnit');
      if (weightInput) weightInput.value = user.weight;
      if (weightUnitElement) weightUnitElement.textContent = user.weightUnit;
      
      // Set female health panel if applicable
      const femaleHealthPanel = document.getElementById('femaleHealthPanel');
      const pregnantSwitch = document.getElementById('pregnantSwitch');
      const breastfeedingSwitch = document.getElementById('breastfeedingSwitch');
      
      if (user.gender === 'Female' && femaleHealthPanel) {
        femaleHealthPanel.classList.remove('d-none');
        
        if (pregnantSwitch) pregnantSwitch.checked = user.isPregnant;
        if (breastfeedingSwitch) breastfeedingSwitch.checked = user.isBreastfeeding;
      }
      
      // Set sensitivity
      const sensitivityBtns = document.querySelectorAll('.sensitivity-btn');
      if (sensitivityBtns.length > 0) {
        sensitivityBtns.forEach(btn => {
          btn.classList.toggle('active', parseInt(btn.dataset.value) === user.sensitivity);
        });
      }
    }
    
    // Set units
    updateUnit('weight', user.weightUnit, false); // Pass false to prevent saving during initial load
    updateUnit('volume', user.volumeUnit, false); // Pass false to prevent saving during initial load
    
    return true;
  } catch (error) {
    console.error('Failed to load preferences:', error);
    return false;
  }
}

// Initialize custom dropdown functionality
function initCustomDropdown() {
  const button = document.getElementById('caffeineButton');
  const dropdown = document.getElementById('caffeineDropdown');
  const searchInput = document.getElementById('caffeineSearch');
  
  // Toggle dropdown when button is clicked
  button.addEventListener('click', function() {
    dropdown.classList.toggle('show');
    if (dropdown.classList.contains('show')) {
      searchInput.focus();
    }
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', function(event) {
    if (!event.target.closest('.custom-select-container')) {
      dropdown.classList.remove('show');
    }
  });
  
  // Filter options when typing in search box
  searchInput.addEventListener('input', function() {
    const filter = this.value.toLowerCase();
    const options = document.querySelectorAll('.custom-select-option');
    
    options.forEach(option => {
      const text = option.textContent.toLowerCase();
      option.style.display = text.includes(filter) ? '' : 'none';
    });
    
    // Show/hide category headers based on visible options
    const categories = document.querySelectorAll('.custom-select-optgroup');
    categories.forEach(category => {
      const nextSibling = category.nextElementSibling;
      let hasVisibleOption = false;
      
      let current = nextSibling;
      while (current && !current.classList.contains('custom-select-optgroup')) {
        if (current.classList.contains('custom-select-option') && current.style.display !== 'none') {
          hasVisibleOption = true;
          break;
        }
        current = current.nextElementSibling;
      }
      
      category.style.display = hasVisibleOption ? '' : 'none';
    });
  });
}

// Initialize size dropdown functionality
function initSizeDropdown() {
  const button = document.getElementById('caffeineSizeButton');
  const dropdown = document.getElementById('caffeineSizeDropdown');
  
  if (!button || !dropdown) return;
  
  // Remove existing listeners to prevent duplicates
  const newButton = button.cloneNode(true);
  button.parentNode.replaceChild(newButton, button);
  
  // Toggle dropdown when button is clicked
  newButton.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.disabled) return;
    dropdown.classList.toggle('show');
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', function(event) {
    if (!event.target.closest('#caffeineSizeDropdown') && !event.target.closest('#caffeineSizeButton')) {
      dropdown.classList.remove('show');
    }
  });
}

// Handle size selection
window.selectSize = function(value, text) {
  const hiddenInput = document.getElementById('caffeineSize');
  hiddenInput.value = value;
  
  // Update button text
  document.getElementById('caffeineSizeButtonText').textContent = text;
  
  // Close dropdown
  document.getElementById('caffeineSizeDropdown').classList.remove('show');
  
  // Enable quantity and add button
  document.getElementById('caffeineQuantity').disabled = false;
  document.getElementById('addCaffeineBtn').disabled = false;
}

// Initialize the application
async function initApp() {
  // Hide status message and meter by default
  document.getElementById('caffeineStatus').classList.add('d-none');
  document.getElementById('caffeineMeter').classList.add('d-none');
  
  // Load caffeine data
  await loadCaffeineData();
  
  // Load user preferences or initialize with defaults
  if (!loadUserPreferences()) {
    initCalculator();
  }
  
  // Function to handle beverage selection with the custom dropdown
  window.selectBeverage = function(value, text) {
    const hiddenInput = document.getElementById('caffeineBeverage');
    hiddenInput.value = value;
    
    // Update button text
    document.getElementById('caffeineButtonText').textContent = text;
    
    // Close dropdown
    document.getElementById('caffeineDropdown').classList.remove('show');
    
    const customFields = document.querySelector('.custom-fields');
    const regularFields = document.querySelector('.regular-fields');
    
    if (value === 'custom') {
      // Show custom caffeine input fields
      customFields.classList.remove('d-none');
      regularFields.classList.add('d-none');
      document.getElementById('caffeineQuantity').disabled = false;
      document.getElementById('addCaffeineBtn').disabled = false;
    } else if (value) {
      // Hide custom fields and populate size dropdown
      customFields.classList.add('d-none');
      regularFields.classList.remove('d-none');
      
      // Extract category and type from the value (e.g., coffee_espresso -> coffee, espresso)
      const [category, type] = value.split('_');
      
      // Populate size dropdown directly
      populateSizeDropdown(category, type);
      document.getElementById('caffeineQuantity').disabled = true;
      document.getElementById('addCaffeineBtn').disabled = true;
    } else {
      // No selection
      customFields.classList.add('d-none');
      regularFields.classList.remove('d-none');
      document.getElementById('caffeineSize').innerHTML = '<option value="">Size</option>';
      document.getElementById('caffeineSize').disabled = true;
      document.getElementById('caffeineQuantity').disabled = true;
      document.getElementById('addCaffeineBtn').disabled = true;
    }
  };
  
  document.getElementById('caffeineSize').addEventListener('change', function() {
    document.getElementById('caffeineQuantity').disabled = false;
    document.getElementById('addCaffeineBtn').disabled = !this.value;
  });
  
  document.getElementById('addCaffeineBtn').addEventListener('click', addConsumptionItem);
  
  // Add event listener for calculate button
  document.getElementById('calculateBtn').addEventListener('click', calculateCaffeineIntake);
  
  // Add event listener for clear tracker button
  document.getElementById('clearTrackerBtn').addEventListener('click', clearTracker);
  
  // Initialize Bootstrap toast
  const toastElement = document.getElementById('notificationToast');
  if (typeof bootstrap !== 'undefined') {
    window.notificationToast = new bootstrap.Toast(toastElement, { delay: 4000 });
  }
}

// Initialize search scrolling behavior
function initSearchScrolling() {
  // Check for scroll target from search results
  checkForScrollTarget();
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
  initApp();
  initSearchScrolling();
});

// Search functionality
async function performSearch(event) {
  if (event) event.preventDefault();
  
  const searchInput = document.getElementById('siteSearch');
  if (!searchInput) {
    console.error('Search input element not found');
    return false;
  }
  
  const searchTerm = searchInput.value.trim();
  
  // Log the search term for debugging
  console.log('Searching for:', searchTerm);
  
  if (!searchTerm) return false;
  
  // Add search analytics if needed
  try {
    localStorage.setItem('lastSearch', searchTerm);
  } catch (error) {
    console.error('Could not save search term:', error);
  }
  
  // Create or get search results container
  let searchResults = document.getElementById('searchResults');
  if (!searchResults) {
    searchResults = document.createElement('div');
    searchResults.id = 'searchResults';
    searchResults.className = 'search-results';
    document.body.appendChild(searchResults);
  }
  
  // Clear previous results
  searchResults.innerHTML = '';
  
  // Create header
  const header = document.createElement('div');
  header.className = 'search-results-header';
  header.innerHTML = `
    <h5>Searching across all pages for "${searchTerm}"...</h5>
    <button class="close-btn" onclick="closeSearchResults()"><i class="fas fa-times"></i></button>
  `;
  searchResults.appendChild(header);
  
  // Create body
  const body = document.createElement('div');
  body.className = 'search-results-body';
  
  // Add loading message
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'loading-results';
  loadingDiv.textContent = 'Searching all pages...';
  body.appendChild(loadingDiv);
  
  searchResults.appendChild(body);
  
  // Show results container with loading state
  searchResults.classList.add('show');
  
  try {
    // Search through all page content asynchronously
    const results = await searchAllPages(searchTerm);
    const resultsCount = results.length;
    
    // Update header after search completes
    header.innerHTML = `
      <h5>Search Results for "${searchTerm}"</h5>
      <button class="close-btn" onclick="closeSearchResults()"><i class="fas fa-times"></i></button>
    `;
    
    // Clear loading message
    body.innerHTML = '';
    
    if (resultsCount > 0) {
      results.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        
        // Add page indicator for non-current page results
        const pageName = result.url.replace('.html', '').replace('pages/', '');
        const pageIndicator = result.url !== window.location.pathname ? 
          `<div class="result-page">Page: ${pageName}</div>` : '';
        
        resultItem.innerHTML = `
          <a href="${result.url}" data-target="${result.id}" onclick="scrollToElement(event, '${result.id}')">
            <div class="result-title">${result.title}</div>
            <p class="result-context">${result.content}</p>
            ${pageIndicator}
          </a>
        `;
        
        body.appendChild(resultItem);
      });
    } else {
      const noResults = document.createElement('div');
      noResults.className = 'no-results';
      noResults.textContent = 'No results found.';
      body.appendChild(noResults);
    }
    
    // Create footer
    const footer = document.createElement('div');
    footer.className = 'search-results-footer';
    footer.textContent = `${resultsCount} result${resultsCount !== 1 ? 's' : ''} found across all pages`;
    searchResults.appendChild(footer);
  } catch (error) {
    console.error('Search error:', error);
    body.innerHTML = '<div class="search-error">An error occurred while searching. Please try again.</div>';
    
    // Create error footer
    const footer = document.createElement('div');
    footer.className = 'search-results-footer';
    footer.textContent = 'Search failed';
    searchResults.appendChild(footer);
  }
  
  return false;
}

// Function to search across all pages
async function searchAllPages(searchTerm) {
  const results = [];
  const searchTermLower = searchTerm.toLowerCase();
  
  // Only search if term is at least 3 characters
  if (searchTermLower.length < 3) {
    return [];
  }

  // Get all page URLs
  const pages = [
    'index.html',
    'pages/caffeine-science.html',
    'pages/overdose-symptoms.html',
    'pages/health-advice.html'
  ];

  // First search current page
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const currentPageResults = await searchPageContent(searchTerm);
  results.push(...currentPageResults);

  // Then search other pages using Fetch API
  for (const page of pages) {
    // Skip current page as we've already searched it
    if (page === currentPath || (currentPath === '/' && page === 'index.html')) {
      continue;
    }

    try {
      // Check if we're in a subpage and need to adjust the path
      const isInPagesDir = window.location.pathname.includes('/pages/');
      const pagePath = isInPagesDir ? 
        (page === 'index.html' ? '../index.html' : 
         page.startsWith('pages/') ? page.replace('pages/', '') : 
         '../' + page) : page;
      
      const response = await fetch(pagePath);
      if (!response.ok) continue;
      
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Search in headings and paragraphs
      const searchableElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, td, th');
      
      // Skip elements that are part of search UI
      const skipElements = new Set();
      doc.querySelectorAll('#searchResults *, .search-form *').forEach(el => skipElements.add(el));
      
      searchableElements.forEach(element => {
        // Skip elements that are part of search UI
        if (skipElements.has(element) || element.closest('#searchResults') || element.closest('.search-form')) {
          return;
        }
        
        const text = element.textContent;
        const textLower = text.toLowerCase();
        
        // Check for match in current element
        const exactMatch = textLower.includes(searchTermLower);
        
        if (exactMatch) {
          // Get the context with highlighted text
          let highlightedText = getHighlightedContext(text, searchTermLower);
          
          // Get the nearest heading as the title
          let headingElement = element;
          let title = 'Result';
          
          // If the element itself is a heading, use it as title
          if (/^H[1-6]$/.test(element.tagName)) {
            title = element.textContent;
          } else {
            // Look for the nearest heading above this element
            let parent = element.parentElement;
            let found = false;
            
            // First try to find headings in the same parent
            while (headingElement.previousElementSibling) {
              headingElement = headingElement.previousElementSibling;
              if (/^H[1-6]$/.test(headingElement.tagName)) {
                title = headingElement.textContent;
                found = true;
                break;
              }
            }
            
            // If no heading found, try parent sections
            if (!found) {
              while (parent && parent.tagName !== 'BODY') {
                const heading = parent.querySelector('h1, h2, h3, h4, h5, h6');
                if (heading) {
                  title = heading.textContent;
                  break;
                }
                parent = parent.parentElement;
              }
            }
          }
          
          // Add to results with page URL
          results.push({
            id: 'search-target-' + Math.random().toString(36).substr(2, 9),
            title: title.trim(),
            content: highlightedText,
            url: page
          });
        }
      });
    } catch (error) {
      console.error(`Error searching ${page}:`, error);
    }
  }

  // Sort results by relevance (exact matches first) and then by page
  results.sort((a, b) => {
    const aExactMatch = a.content.toLowerCase().includes(searchTermLower);
    const bExactMatch = b.content.toLowerCase().includes(searchTermLower);
    
    // First sort by exact match
    if (aExactMatch && !bExactMatch) return -1;
    if (!aExactMatch && bExactMatch) return 1;
    
    // Then group by page URL
    if (a.url === currentPath && b.url !== currentPath) return -1;
    if (a.url !== currentPath && b.url === currentPath) return 1;
    
    return 0;
  });

  return results;
}

// Function to search through the content of the current page
function searchPageContent(searchTerm) {
  return new Promise((resolve) => {
    const results = [];
    const searchTermLower = searchTerm.toLowerCase();
    
    // Search in headings and paragraphs
    const searchableElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, td, th');
    
    // Skip the search box itself and search results
    const skipElements = new Set();
    document.querySelectorAll('#searchResults *, .search-form *').forEach(el => skipElements.add(el));
    
    searchableElements.forEach(element => {
      // Skip elements that are part of search UI
      if (skipElements.has(element) || element.closest('#searchResults') || element.closest('.search-form')) {
        return;
      }
      
      const text = element.textContent;
      const textLower = text.toLowerCase();
      
      // Check for match in current element
      const exactMatch = textLower.includes(searchTermLower);
      
      if (exactMatch) {
        // Generate unique ID for the element if it doesn't have one
        if (!element.id) {
          element.id = 'search-target-' + Math.random().toString(36).substr(2, 9);
        }
        
        // Get the context with highlighted text
        let highlightedText = getHighlightedContext(text, searchTermLower);
        
        // Get the nearest heading as the title
        let headingElement = element;
        let title = 'Result';
        
        // If the element itself is a heading, use it as title
        if (/^H[1-6]$/.test(element.tagName)) {
          title = element.textContent;
        } else {
          // Look for the nearest heading above this element
          let parent = element.parentElement;
          let found = false;
          
          // First try to find headings in the same parent
          while (headingElement.previousElementSibling) {
            headingElement = headingElement.previousElementSibling;
            if (/^H[1-6]$/.test(headingElement.tagName)) {
              title = headingElement.textContent;
              found = true;
              break;
            }
          }
          
          // If no heading found, try parent sections
          if (!found) {
            while (parent && parent.tagName !== 'BODY') {
              const heading = parent.querySelector('h1, h2, h3, h4, h5, h6');
              if (heading) {
                title = heading.textContent;
                break;
              }
              parent = parent.parentElement;
            }
          }
        }
        
        // Add to results with current page URL
        results.push({
          id: element.id,
          title: title.trim(),
          content: highlightedText,
          url: window.location.pathname
        });
      }
    });
    
    resolve(results);
  });
}

// Function to get context with highlighting
function getHighlightedContext(content, term) {
  if (!term) return content;
  
  const lowerContent = content.toLowerCase();
  const startIndex = lowerContent.indexOf(term);
  
  if (startIndex === -1) return content;
  
  const endIndex = startIndex + term.length;
  const contextStart = Math.max(0, startIndex - 30);
  const contextEnd = Math.min(content.length, endIndex + 30);
  let context = content.substring(contextStart, contextEnd);
  
  if (contextStart > 0) context = '...' + context;
  if (contextEnd < content.length) context += '...';
  
  return context.replace(
    new RegExp(term, 'gi'),
    match => `<strong>${match}</strong>`
  );
}

// Function to scroll to element when search result is clicked
function scrollToElement(event, elementId) {
  event.preventDefault();
  
  // Get the target URL from the clicked link
  const targetURL = event.currentTarget.getAttribute('href');
  
  // If we're already on the target page, just scroll
  if (window.location.pathname.endsWith(targetURL)) {
    const targetElement = document.getElementById(elementId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
      // Highlight the element briefly
      targetElement.classList.add('search-highlight');
      setTimeout(() => {
        targetElement.classList.remove('search-highlight');
      }, 3000);
      // Close search results
      closeSearchResults();
    }
  } else {
    // Store the target element ID in localStorage for retrieval after navigation
    localStorage.setItem('scrollToElementId', elementId);
    window.location.href = targetURL;
  }
}

// Function to check for scrollToElement after page load
function checkForScrollTarget() {
  const targetId = localStorage.getItem('scrollToElementId');
  if (targetId) {
    // Clear it immediately to prevent future unwanted scrolls
    localStorage.removeItem('scrollToElementId');
    
    // Wait for page to fully render
    setTimeout(() => {
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
        // Highlight the element briefly
        targetElement.classList.add('search-highlight');
        setTimeout(() => {
          targetElement.classList.remove('search-highlight');
        }, 3000);
      }
    }, 500);
  }
}

// Close search results
function closeSearchResults() {
  const searchResults = document.getElementById('searchResults');
  if (searchResults) {
    searchResults.classList.remove('show');
  }
}

// Initialize search functionality
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearchInput, 300));
  }

  // Initialize search form
  const searchForm = document.getElementById('searchForm');
  if (searchForm) {
    searchForm.addEventListener('submit', handleSearchSubmit);
  }

  // Initialize search results container
  const searchResults = document.getElementById('searchResults');
  if (searchResults) {
    searchResults.addEventListener('click', handleSearchResultsClick);
  }
});

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

// Handle search input
function handleSearchInput() {
  const searchTerm = document.getElementById('searchInput').value.trim();
  if (searchTerm) {
    performSearch();
  }
}

// Handle search submit
function handleSearchSubmit(event) {
  event.preventDefault();
  const searchTerm = document.getElementById('searchInput').value.trim();
  if (searchTerm) {
    performSearch();
  }
}

// Handle search results click
function handleSearchResultsClick(event) {
  if (event.target.classList.contains('close-btn')) {
    closeSearchResults();
  }
}