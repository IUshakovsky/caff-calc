// User data object
let user = {
  ageGroup: 'adult',
  gender: 'Male',
  weight: 75,
  weightUnit: 'kg',
  isPregnant: false,
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
  const pregnantContainer = document.getElementById('pregnantContainer');

  maleBtn.classList.toggle('active', gender === 'Male');
  femaleBtn.classList.toggle('active', gender === 'Female');
  pregnantContainer.style.display = gender === 'Female' ? 'flex' : 'none';
  
  if (gender === 'Male') {
    document.getElementById('pregnantSwitch').checked = false;
    user.isPregnant = false;
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
    
    if (beverageDropdown.value && beverageDropdown.value !== 'custom' && !sizeDropdown.disabled) {
      // Get currently selected beverage
      const [category, type] = beverageDropdown.value.split('_');
      
      // Repopulate size dropdown with new unit
      populateSizeDropdown(category, type);
    }
  }

  document.querySelectorAll(`[data-unit="${prevUnit}"]`).forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll(`[data-unit="${unit}"]`).forEach(btn => btn.classList.add('active'));
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
  const pregnancyModifier = document.getElementById('pregnantSwitch').checked ? 0.5 : 1;
  user.isPregnant = document.getElementById('pregnantSwitch').checked;
  
  // Get base limit from age group
  let baseLimit = caffeineLimits[user.ageGroup];
  if (user.isPregnant) baseLimit = caffeineLimits.pregnant;
  
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
    const response = await fetch('caf_src.json');
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
    statusElement.innerHTML = `<strong>Warning:</strong> Infants should not consume any caffeine! Current intake: ${totalCaffeineConsumed} mg. <a href="health-advice.html" class="alert-link">See health advice</a> for more information.`;
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
    statusElement.innerHTML = `<strong>Caution:</strong> You've consumed ${Math.round(percentage)}% of your daily safe limit (${Math.round(adjustedLimit)} mg). <a href="caffeine-science.html" class="alert-link">Learn more</a> about caffeine metabolism.`;
  } else {
    statusElement.classList.add('alert-danger');
    statusElement.innerHTML = `<strong>Warning:</strong> You've exceeded your daily safe limit by ${Math.round(percentage - 100)}%! Your limit is ${Math.round(adjustedLimit)} mg. Check <a href="overdose-symptoms.html" class="alert-link">overdose symptoms</a> for health concerns.`;
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
    user.sensitivity = preferences.sensitivity || 3;
    user.volumeUnit = preferences.volumeUnit || 'ml';
    
    // Update UI to reflect loaded preferences
    setAgeGroup(user.ageGroup);
    updateGender(user.gender);
    
    // Set weight input value
    document.getElementById('weightInput').value = user.weight;
    document.getElementById('weightUnit').textContent = user.weightUnit;
    
    // Set pregnant switch if applicable
    if (user.gender === 'Female') {
      document.getElementById('pregnantContainer').style.display = 'flex';
      document.getElementById('pregnantSwitch').checked = user.isPregnant;
    }
    
    // Set sensitivity
    document.querySelectorAll('.sensitivity-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.value) === user.sensitivity);
    });
    
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

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initApp);

// Search functionality
function performSearch(event) {
  event.preventDefault();
  const searchTerm = document.getElementById('siteSearch').value.trim().toLowerCase();
  
  // Log the search term for debugging
  console.log('Searching for:', searchTerm);
  
  if (!searchTerm) return false;
  
  // Add search analytics if needed
  try {
    localStorage.setItem('lastSearch', searchTerm);
  } catch (error) {
    console.error('Could not save search term:', error);
  }
  
  // Define search content for each page with more comprehensive content
  const searchContent = {
    'index.html': {
      title: 'Caffeine Calculator',
      content: 'Calculate your safe caffeine intake based on personal factors like age, weight, gender, pregnancy status, and sensitivity. Track your consumption and avoid caffeine overdose. For pregnant women, the recommended limit is lower at 200mg. Children should have no caffeine, teens should have less than 100mg, adults can have up to 400mg, and seniors should limit to 300mg.'
    },
    'caffeine-science.html': {
      title: 'Caffeine Science',
      content: 'Learn about caffeine chemistry, absorption, metabolism, and how it affects your body. Information about caffeine sources, half-life, and sensitivity factors. Caffeine is absorbed quickly and peaks in 30-60 minutes. The half-life is 3-5 hours, meaning half the caffeine is eliminated in this time. Pregnant women metabolize caffeine more slowly, with a half-life of up to 9 hours. Factors affecting sensitivity include age, body mass, genetics, liver function, and medication use.'
    },
    'overdose-symptoms.html': {
      title: 'Caffeine Overdose Symptoms',
      content: 'Recognize the signs of caffeine overdose including anxiety, jitters, rapid heartbeat, insomnia, digestive issues, and when to seek medical help. Consuming less caffeine can help avoid these symptoms. Pregnant women, children, and those with certain health conditions are more sensitive to caffeine and should consume less. Symptoms can appear with as little as 200mg for sensitive individuals.'
    },
    'health-advice.html': {
      title: 'Caffeine Health Advice',
      content: 'Expert health advice on caffeine consumption. Safe limits, effects on health conditions, and smart ways to manage your caffeine intake. Pregnant women should limit caffeine to less than 200mg per day. People with anxiety, heart conditions, or sleep disorders should consume less caffeine. Balance each caffeinated beverage with water to stay hydrated. Timing your caffeine intake earlier in the day can help with sleep quality.'
    }
  };
  
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
    <h5>Search Results for "${searchTerm}"</h5>
    <button class="close-btn" onclick="closeSearchResults()"><i class="fas fa-times"></i></button>
  `;
  searchResults.appendChild(header);
  
  // Create body
  const body = document.createElement('div');
  body.className = 'search-results-body';
  
  // Filter results
  let resultsCount = 0;
  
  // Split search term into words for better matching
  const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 2);
  console.log('Search words:', searchWords);
  
  for (const [page, data] of Object.entries(searchContent)) {
    // Check for exact matches first
    const titleMatch = data.title.toLowerCase().includes(searchTerm);
    const contentMatch = data.content.toLowerCase().includes(searchTerm);
    
    // Check for individual word matches if no exact match
    let wordMatches = false;
    if (!titleMatch && !contentMatch && searchWords.length > 0) {
      wordMatches = searchWords.some(word => 
        data.title.toLowerCase().includes(word) || 
        data.content.toLowerCase().includes(word)
      );
    }
    
    if (titleMatch || contentMatch || wordMatches) {
      resultsCount++;
      const resultItem = document.createElement('div');
      resultItem.className = 'search-result-item';
      
      // Highlight the search term in content
      let highlightedContent = data.content;
      
      // Function to get context with highlighting
      const getHighlightedContext = (content, term) => {
        const lowerContent = content.toLowerCase();
        const startIndex = lowerContent.indexOf(term);
        if (startIndex === -1) return null;
        
        const endIndex = startIndex + term.length;
        const contextStart = Math.max(0, startIndex - 50);
        const contextEnd = Math.min(content.length, endIndex + 50);
        let context = content.substring(contextStart, contextEnd);
        
        if (contextStart > 0) context = '...' + context;
        if (contextEnd < content.length) context += '...';
        
        return context.replace(
          new RegExp(term, 'gi'),
          match => `<strong>${match}</strong>`
        );
      };
      
      if (contentMatch) {
        highlightedContent = getHighlightedContext(data.content, searchTerm);
      } else if (wordMatches) {
        // Find the first matching word and highlight it
        for (const word of searchWords) {
          if (data.content.toLowerCase().includes(word)) {
            const highlighted = getHighlightedContext(data.content, word);
            if (highlighted) {
              highlightedContent = highlighted;
              break;
            }
          }
        }
      }

      
      resultItem.innerHTML = `
        <a href="${page}">
          <div class="result-title">${data.title}</div>
          <p class="result-context">${highlightedContent}</p>
        </a>
      `;
      
      body.appendChild(resultItem);
    }
  }
  
  searchResults.appendChild(body);
  
  // Create footer
  const footer = document.createElement('div');
  footer.className = 'search-results-footer';
  footer.textContent = `${resultsCount} result${resultsCount !== 1 ? 's' : ''} found`;
  searchResults.appendChild(footer);
  
  // Show results
  searchResults.classList.add('show');
  
  return false;
}

// Close search results
function closeSearchResults() {
  const searchResults = document.getElementById('searchResults');
  if (searchResults) {
    searchResults.classList.remove('show');
  }
}