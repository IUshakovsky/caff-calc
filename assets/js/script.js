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
  saveUserPreferences();
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
  saveUserPreferences();
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
      // Repopulate size dropdown with new unit
      populateSizeDropdown(beverageDropdown.value);
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



// Event Listeners

document.addEventListener('DOMContentLoaded', function() {
  const weightInput = document.getElementById('weightInput');
  if (weightInput) {
    weightInput.addEventListener('input', function(e) {
      user.weight = parseFloat(e.target.value) || 0;
      updateCalculation();
      saveUserPreferences();
    });
  }

  const pregnantSwitch = document.getElementById('pregnantSwitch');
  if (pregnantSwitch) {
    pregnantSwitch.addEventListener('change', function(e) {
      user.isPregnant = e.target.checked;
      updateCalculation();
      saveUserPreferences();
    });
  }

  const breastfeedingSwitch = document.getElementById('breastfeedingSwitch');
  if (breastfeedingSwitch) {
    breastfeedingSwitch.addEventListener('change', function(e) {
      user.isBreastfeeding = e.target.checked;
      updateCalculation();
      saveUserPreferences();
    });
  }

  document.querySelectorAll('.sensitivity-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.sensitivity-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      user.sensitivity = parseInt(this.dataset.value);
      updateCalculation();
      saveUserPreferences();
    });
  });
});

// Caffeine consumption tracker variables
let caffeineData = {}; // beverage slug -> entry from _data/beverages.yml
let consumptionItems = [];
let totalCaffeineConsumed = 0;

// Dropdown groups, in display order. Keys match `category` in _data/beverages.yml.
const beverageCategories = [
  { id: 'coffee', label: 'Coffee', icon: 'coffee' },
  { id: 'tea', label: 'Tea', icon: 'leaf' },
  { id: 'energy-drink', label: 'Energy Drinks', icon: 'zap' },
  { id: 'energy-shot', label: 'Energy Shots', icon: 'zap' },
  { id: 'soda', label: 'Soda', icon: 'cup-soda' },
  { id: 'other', label: 'Other Drinks', icon: 'glass-water' },
  { id: 'chocolate', label: 'Chocolate', icon: 'candy' },
  { id: 'supplement', label: 'Caffeine Tablets & Pre-workout', icon: 'pill' },
  { id: 'medicine', label: 'Medicines', icon: 'pill' }
];

// Analytics hooks (docs/analytics-events.md). No-ops until analytics-events.js
// has loaded, and it no-ops in turn when gtag is unavailable.
function trackEvent(name, params) {
  if (typeof window.caffTrack === 'function') window.caffTrack(name, params);
}

function trackTrackerSave() {
  if (typeof window.caffTrackerSave === 'function') window.caffTrackerSave();
}

// Servings across all tracked rows (a row with Qty 3 counts as 3)
function trackedBeverageCount() {
  return consumptionItems.reduce((sum, item) => sum + item.quantity, 0);
}

// Load caffeine data and populate beverage dropdown. Only the calculator page
// has the tracker, so other pages skip the download.
async function loadCaffeineData() {
  if (!document.getElementById('caffeineOptions')) return;
  try {
    const baseurl = window.SITE_BASEURL || '';
    const response = await fetch(`${baseurl}/assets/data/beverages.json`);
    const beverages = await response.json();
    caffeineData = {};
    beverages.forEach(bev => { caffeineData[bev.slug] = bev; });

    // Populate beverage dropdown from JSON data
    populateBeverageDropdown();
  } catch (error) {
    console.error('Error loading caffeine data:', error);
  }
}

// Where a source publishes a range, count the top of it: this is a safety tool,
// so it should not under-report.
function servingCaffeine(serving) {
  return serving.caffeine_mg != null ? serving.caffeine_mg : serving.caffeine_mg_high;
}

function servingCaffeineText(serving) {
  return serving.caffeine_mg != null
    ? `${serving.caffeine_mg} mg`
    : `${serving.caffeine_mg_low}-${serving.caffeine_mg_high} mg`;
}

// "Grande (16 fl oz)" / "Grande (473 ml)" / "1 oz" / "1 tablet"
function servingSizeText(serving) {
  let size = '';
  if (serving.size_oz) {
    size = user.volumeUnit === 'oz' ? `${serving.size_oz} fl oz` : `${serving.size_ml} ml`;
  }
  if (serving.label && size) return `${serving.label} (${size})`;
  return serving.label || size;
}

// Grouped beverage options (category headers with icons). Shared by the tracker
// and the half-life calculator; onSelect receives the beverage entry.
function renderBeverageOptions(optionsContainer, beverages, onSelect) {
  const byName = (a, b) => a.product.localeCompare(b.product);

  beverageCategories.forEach(category => {
    const inCategory = beverages.filter(bev => bev.category === category.id).sort(byName);
    if (!inCategory.length) return;

    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'custom-select-optgroup';
    categoryHeader.innerHTML = `<i data-lucide="${category.icon}" class="me-2" aria-hidden="true"></i>${category.label}`;
    optionsContainer.appendChild(categoryHeader);

    inCategory.forEach(bev => {
      const option = document.createElement('div');
      option.className = 'custom-select-option';
      option.dataset.value = bev.slug;
      option.textContent = bev.product;
      option.addEventListener('click', () => onSelect(bev));
      optionsContainer.appendChild(option);
    });
  });
}

// Size options for one beverage; option values are indexes into its servings.
// Shared by the tracker and the half-life calculator.
function renderSizeOptions(optionsContainer, bev, onSelect) {
  bev.servings.forEach((serving, index) => {
    const option = document.createElement('div');
    option.className = 'custom-select-option';
    option.dataset.value = String(index);
    option.textContent = `${servingSizeText(serving)} · ${servingCaffeineText(serving)}`;
    option.addEventListener('click', () => onSelect(index, option.textContent));
    optionsContainer.appendChild(option);
  });
}

// Populate the beverage dropdown, grouped by category
function populateBeverageDropdown() {
  const optionsContainer = document.getElementById('caffeineOptions');
  if (!optionsContainer) return; // Exit if element doesn't exist
  optionsContainer.innerHTML = '';

  renderBeverageOptions(optionsContainer, Object.values(caffeineData), bev => selectBeverage(bev.slug, bev.product));

  // Add custom option at the end
  const option = document.createElement('div');
  option.className = 'custom-select-option';
  option.dataset.value = 'custom';
  option.innerHTML = '<i data-lucide="circle-plus" class="me-2" aria-hidden="true"></i>Custom Item';

  option.addEventListener('click', function() {
    selectBeverage('custom', 'Custom Item');
  });

  optionsContainer.appendChild(option);

  // Render the freshly injected Lucide icons
  if (window.renderIcons) window.renderIcons();

  // Initialize dropdown toggle functionality
  initSelectDropdown(optionsContainer.closest('.custom-select-container'));
}

// Populate size dropdown for the selected beverage. Option values are indexes
// into the beverage's servings list.
function populateSizeDropdown(slug) {
  // Get DOM elements
  const sizeButton = document.getElementById('caffeineSizeButton');
  const sizeButtonText = document.getElementById('caffeineSizeButtonText');
  const sizeOptions = document.getElementById('caffeineSizeOptions');
  const sizeInput = document.getElementById('caffeineSize');

  // Clear previous options
  sizeOptions.innerHTML = '';
  sizeInput.value = '';
  sizeButtonText.textContent = 'Size';

  const bev = caffeineData[slug];
  if (!bev) {
    sizeButton.disabled = true;
    return;
  }

  renderSizeOptions(sizeOptions, bev, (index, text) => selectSize(String(index), text));

  // Enable the buttons
  sizeButton.disabled = false;
  document.getElementById('caffeineQuantity').disabled = false;
  initSelectDropdown(sizeOptions.closest('.custom-select-container'));
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
    
    trackEvent('beverage_add', { beverage_name: 'custom', caffeine_mg: Math.round(item.totalCaffeine), source: 'custom' });
    trackTrackerSave();

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
  
  const bev = caffeineData[beverageValue];
  const serving = bev && bev.servings[Number(sizeValue)];
  if (!serving) {
    alert('Please select all options');
    return;
  }

  const typeName = bev.product;
  const sizeName = servingSizeText(serving);
  const caffeineAmount = servingCaffeine(serving);
  const isRange = serving.caffeine_mg == null;
  
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
      category: bev.category,
      type: bev.slug,
      size: sizeValue,
      typeName,
      sizeName,
      quantity,
      caffeinePerItem: caffeineAmount,
      totalCaffeine,
      isRange
    };
    
    // Add to items array
    consumptionItems.push(item);
  }
  
  // Update table
  updateConsumptionTable();
  
  trackEvent('beverage_add', { beverage_name: bev.slug, caffeine_mg: Math.round(caffeineAmount * quantity), source: 'preset' });
  trackTrackerSave();

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
    // Ranged sources count the top of the range, so say so
    caffeineCell.textContent = (item.isRange ? 'up to ' : '') + item.totalCaffeine + ' mg';
    row.appendChild(caffeineCell);
    
    const actionCell = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-delete';
    deleteBtn.innerHTML = '<i data-lucide="trash-2" aria-hidden="true"></i>';
    deleteBtn.onclick = () => removeConsumptionItem(item.id);
    actionCell.appendChild(deleteBtn);
    row.appendChild(actionCell);
    
    tbody.appendChild(row);
    
    totalCaffeineConsumed += item.totalCaffeine;
  });
  
  // Render freshly injected row icons (delete buttons)
  if (window.renderIcons) window.renderIcons();

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

// Calculate the user's caffeine limit consistently
function calculateCaffeineLimit() {
  // For children (age 0-12), always enforce a zero limit regardless of other factors
  if (user.ageGroup === 'child') {
    return 0;
  }
  
  // Get base limit from age group
  let baseLimit = caffeineLimits[user.ageGroup];
  
  // Set limits based on pregnancy/breastfeeding status (only for non-children)
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
  const sensitivityModifier = 1.3 - (user.sensitivity - 1) * 0.15;
  return baseLimit * sensitivityModifier;
}

// Update calculation
function updateCalculation() {
  const pregnantSwitch = document.getElementById('pregnantSwitch');
  const breastfeedingSwitch = document.getElementById('breastfeedingSwitch');
  
  // Update user status based on switches (only if elements exist)
  let prefsChanged = false;
  
  if (pregnantSwitch && user.isPregnant !== pregnantSwitch.checked) {
    user.isPregnant = pregnantSwitch.checked;
    prefsChanged = true;
  }
  
  if (breastfeedingSwitch && user.isBreastfeeding !== breastfeedingSwitch.checked) {
    user.isBreastfeeding = breastfeedingSwitch.checked;
    prefsChanged = true;
  }
  
  // Save preferences if they were changed in this function
  if (prefsChanged) {
    saveUserPreferences();
  }
  
  // Update switch container styles (only if elements exist)
  const femaleHealthPanel = document.getElementById('femaleHealthPanel');
  if (femaleHealthPanel) {
    femaleHealthPanel.classList.toggle('active', user.isPregnant || user.isBreastfeeding);
  }
  
  // Get the adjusted limit using the shared calculation function
  const adjustedLimit = calculateCaffeineLimit();
  
  // Update the safe limit display
  const safeLimitValue = document.getElementById('safeLimitValue');
  if (safeLimitValue) {
    safeLimitValue.textContent = Math.round(adjustedLimit) + ' mg';
    
    // Change color based on the limit
    if (user.ageGroup === 'child') {
      safeLimitValue.style.color = '#a52a2a'; // Red for children
    } else if (adjustedLimit <= 100) {
      safeLimitValue.style.color = '#d2691e'; // Orange for teens/low limits
    } else {
      safeLimitValue.style.color = '#6b8e23'; // Green for adults
    }
  }
  
  console.log('Adjusted safe caffeine limit:', Math.round(adjustedLimit), 'mg');
  
  return adjustedLimit;
}

// Update caffeine status message
function updateCaffeineStatus() {
  const statusElement = document.getElementById('caffeineStatus');
  
  // Only update if the Calculate button was clicked
  if (statusElement.classList.contains('d-none')) {
    return { percentage: 0, adjustedLimit: 0 };
  }
  
  // Use the shared calculation function for consistency
  const adjustedLimit = calculateCaffeineLimit();
  
  // Special message for infants with zero limit
  if (user.ageGroup === 'child' && totalCaffeineConsumed > 0) {
    statusElement.classList.remove('d-none', 'alert-success', 'alert-warning');
    statusElement.classList.add('alert-danger');
    statusElement.innerHTML = `<strong>Warning:</strong> Infants should not consume any caffeine! Current intake: ${totalCaffeineConsumed} mg. <a href="${window.SITE_BASEURL || ''}/pages/health-advice" class="alert-link">See health advice</a> for more information.`;
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
    statusElement.innerHTML = `<strong>Caution:</strong> You've consumed ${Math.round(percentage)}% of your daily safe limit (${Math.round(adjustedLimit)} mg). <a href="${window.SITE_BASEURL || ''}/pages/caffeine-science" class="alert-link">Learn more</a> about caffeine metabolism.`;
  } else {
    statusElement.classList.add('alert-danger');
    statusElement.innerHTML = `<strong>Warning:</strong> You've exceeded your daily safe limit by ${Math.round(percentage - 100)}%! Your limit is ${Math.round(adjustedLimit)} mg. Check <a href="${window.SITE_BASEURL || ''}/pages/overdose-symptoms" class="alert-link">overdose symptoms</a> for health concerns.`;
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

      const limit = calculateCaffeineLimit();
      trackEvent('calc_complete', {
        total_mg: Math.round(totalCaffeineConsumed),
        limit_status: totalCaffeineConsumed > limit ? 'over' : (limit > 0 && totalCaffeineConsumed >= limit * 0.9) ? 'near' : 'under',
        beverage_count: trackedBeverageCount()
      });
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
  
  trackEvent('calc_reset', { beverage_count: trackedBeverageCount() });

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
  document.getElementById('caffeineSize').value = '';
  document.getElementById('caffeineSizeButtonText').textContent = 'Size';
  document.getElementById('caffeineSizeButton').disabled = true;
  document.getElementById('caffeineQuantity').value = '1';
  document.getElementById('caffeineQuantity').disabled = true;
  document.getElementById('addCaffeineBtn').disabled = true;
  
  // Reset custom field
  document.getElementById('customCaffeine').value = '';
  
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
  let iconName = 'info';
  if (type === 'warning') iconName = 'triangle-alert';
  if (type === 'error') iconName = 'circle-alert';
  if (type === 'success') iconName = 'circle-check';

  // toastIcon may already be an <svg> from a previous render, so swap the
  // whole element for a fresh Lucide placeholder and re-render.
  if (toastIcon) {
    const fresh = document.createElement('i');
    fresh.id = 'toastIcon';
    fresh.setAttribute('data-lucide', iconName);
    fresh.className = 'me-2';
    fresh.setAttribute('aria-hidden', 'true');
    toastIcon.replaceWith(fresh);
    if (window.renderIcons) window.renderIcons();
  }
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

// Searchable dropdown shared by the tracker and the half-life calculator.
// `container` is a .custom-select-container holding a .custom-select-button and
// a .custom-select-dropdown, optionally with a .custom-select-search input.
// Safe to call again after repopulating the options.
function initSelectDropdown(container) {
  if (!container || container.dataset.dropdownReady) return;
  container.dataset.dropdownReady = 'true';

  const button = container.querySelector('.custom-select-button');
  const dropdown = container.querySelector('.custom-select-dropdown');
  const searchInput = container.querySelector('.custom-select-search input');

  const setOpen = open => {
    dropdown.classList.toggle('show', open);
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  button.setAttribute('aria-expanded', 'false');

  // Toggle dropdown when button is clicked
  button.addEventListener('click', function(e) {
    e.preventDefault();
    if (this.disabled) return;
    setOpen(!dropdown.classList.contains('show'));
    if (searchInput && dropdown.classList.contains('show')) {
      searchInput.focus();
    }
  });

  // Close when clicking anywhere outside this dropdown, including another one
  document.addEventListener('click', function(event) {
    if (!container.contains(event.target)) setOpen(false);
  });

  // Choosing an option closes the dropdown
  dropdown.addEventListener('click', function(event) {
    if (event.target.closest('.custom-select-option')) setOpen(false);
  });

  // Keyboard: arrows move through the visible options, Enter or Space picks one,
  // Escape closes and returns focus to the button
  const visibleOptions = () => [...dropdown.querySelectorAll('.custom-select-option')]
    .filter(option => option.style.display !== 'none');
  const focusOption = index => {
    const options = visibleOptions();
    if (!options.length) return;
    const option = options[Math.max(0, Math.min(options.length - 1, index))];
    option.tabIndex = -1;
    option.focus();
  };
  const choose = option => {
    option.click();
    button.focus();
  };

  button.addEventListener('keydown', function(e) {
    if (e.key !== 'ArrowDown' || this.disabled) return;
    e.preventDefault();
    setOpen(true);
    if (searchInput) searchInput.focus(); else focusOption(0);
  });

  dropdown.addEventListener('keydown', function(e) {
    const options = visibleOptions();
    const current = options.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusOption(current + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (current <= 0 && searchInput) searchInput.focus(); else focusOption(current - 1);
    } else if ((e.key === 'Enter' || e.key === ' ') && current >= 0) {
      e.preventDefault();
      choose(options[current]);
    } else if (e.key === 'Enter' && document.activeElement === searchInput && options.length) {
      // Enter in the search box picks the first match
      e.preventDefault();
      choose(options[0]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      button.focus();
    }
  });

  if (!searchInput) return;

  // Filter options when typing in search box
  // Accent-insensitive, so "caffe latte" finds "Caffè Latte"
  const fold = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  searchInput.addEventListener('input', function() {
    const filter = fold(this.value);
    const options = dropdown.querySelectorAll('.custom-select-option');

    options.forEach(option => {
      const text = fold(option.textContent);
      option.style.display = text.includes(filter) ? '' : 'none';
    });

    // Show/hide category headers based on visible options
    const categories = dropdown.querySelectorAll('.custom-select-optgroup');
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
  // Hide status message and meter by default (only on pages that have them)
  const statusElement = document.getElementById('caffeineStatus');
  const meterElement = document.getElementById('caffeineMeter');
  
  if (statusElement) {
    statusElement.classList.add('d-none');
  }
  if (meterElement) {
    meterElement.classList.add('d-none');
  }
  
  // Load caffeine data
  await loadCaffeineData();
  
  // Load user preferences or initialize with defaults (only the calculator page
  // has the form that initCalculator() fills in)
  if (!loadUserPreferences() && document.getElementById('weightInput')) {
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
      
      // Populate size dropdown directly
      populateSizeDropdown(value);
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
  
  // A "caffeine in X" page links here as /?drink=<slug>: preselect that drink at
  // its default size so adding it is one tap
  const linkedDrink = caffeineData[new URLSearchParams(window.location.search).get('drink')];
  if (linkedDrink) {
    selectBeverage(linkedDrink.slug, linkedDrink.product);
    const sizeIndex = Math.max(0, linkedDrink.servings.findIndex(s => s.default));
    const sizeOption = document.querySelectorAll('#caffeineSizeOptions .custom-select-option')[sizeIndex];
    if (sizeOption) selectSize(sizeOption.dataset.value, sizeOption.textContent);
    document.getElementById('caffeineButton').scrollIntoView({ block: 'center' });
  }

  const caffeineSizeElement = document.getElementById('caffeineSize');
  const addCaffeineBtnElement = document.getElementById('addCaffeineBtn');
  const calculateBtnElement = document.getElementById('calculateBtn');
  const clearTrackerBtnElement = document.getElementById('clearTrackerBtn');
  
  if (caffeineSizeElement) {
    caffeineSizeElement.addEventListener('change', function() {
      document.getElementById('caffeineQuantity').disabled = false;
      document.getElementById('addCaffeineBtn').disabled = !this.value;
    });
  }
  
  if (addCaffeineBtnElement) {
    addCaffeineBtnElement.addEventListener('click', addConsumptionItem);
  }
  
  // Add event listener for calculate button
  if (calculateBtnElement) {
    calculateBtnElement.addEventListener('click', calculateCaffeineIntake);
  }
  
  // Add event listener for clear tracker button
  if (clearTrackerBtnElement) {
    clearTrackerBtnElement.addEventListener('click', clearTracker);
  }
  
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
    <button class="close-btn" onclick="closeSearchResults()" aria-label="Close"><i data-lucide="x" aria-hidden="true"></i></button>
  `;
  searchResults.appendChild(header);
  if (window.renderIcons) window.renderIcons();

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
      <button class="close-btn" onclick="closeSearchResults()" aria-label="Close"><i data-lucide="x" aria-hidden="true"></i></button>
    `;
    if (window.renderIcons) window.renderIcons();

    // Clear loading message
    body.innerHTML = '';
    
    if (resultsCount > 0) {
      // Filter out duplicate results from the same page
      // Create a map to track seen result IDs with their URLs
      const seenResults = new Map();
      const filteredResults = results.filter(result => {
        // Get normalized URL to identify duplicates even with different path formats
        const normalizedUrl = result.url.split('/').pop();
        const resultKey = `${result.title}-${normalizedUrl}`;
        
        // If this key already exists and current result is not from current page, skip it
        if (seenResults.has(resultKey)) {
          // Prefer results from current page
          const existingResult = seenResults.get(resultKey);
          if (result.isCurrentPage && !existingResult.isCurrentPage) {
            // Replace the existing one with the current page version
            seenResults.set(resultKey, result);
            return true;
          }
          return false; // Skip duplicate
        }
        
        // This is a new result, add it to seen map
        seenResults.set(resultKey, result);
        return true;
      });
      
      // Display the filtered results
      filteredResults.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        
        // Add page indicator only for non-current page results
        let pageIndicator = '';
        if (!result.isCurrentPage) {
          let pageName = result.url.replace('.html', '').replace('pages/', '');
          
          // Format blog post URLs nicely (e.g., /2025/09/29/coffee-vs-tea-caffeine-content/)
          if (pageName.includes('/20')) {
            const parts = pageName.split('/').filter(p => p);
            if (parts.length >= 4) {
              // Extract the post title from the URL
              pageName = parts[3].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              pageIndicator = `<div class="result-page">Blog Post: ${pageName}</div>`;
            } else {
              pageIndicator = `<div class="result-page">Blog Post</div>`;
            }
          } else if (pageName === 'blog') {
            pageIndicator = `<div class="result-page">Blog</div>`;
          } else {
            pageIndicator = `<div class="result-page">Page: ${pageName}</div>`;
          }
        }
        
        // Fix URL path resolution to prevent '/pages/pages' issue
        let correctUrl = result.url;
        // Check if we're in a subpage and need to adjust the path
        const isInPagesDir = window.location.pathname.includes('/pages/');
        const isBlogPost = result.url.includes('/20'); // Blog posts have year in URL
        
        // Blog posts and /blog/ always use absolute paths from root
        if (isBlogPost || result.url === '/blog/' || result.url.startsWith('/blog')) {
          correctUrl = result.url;
        } else if (isInPagesDir && result.url.startsWith('pages/')) {
          // If we're in /pages/ and the result URL also starts with pages/, use just the filename
          correctUrl = result.url.replace('pages/', '');
        } else if (!isInPagesDir && result.url !== 'index.html' && !result.url.startsWith('pages/') && !result.url.startsWith('/')) {
          // If we're in root and result URL doesn't have proper path, add 'pages/' prefix
          correctUrl = 'pages/' + result.url;
        }
        
        resultItem.innerHTML = `
          <a href="${correctUrl}" data-target="${result.id}" onclick="scrollToElement(event, '${result.id}')">
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

  // Get all page URLs - use absolute paths from root
  const baseurl = window.SITE_BASEURL || '';
  const pages = [
    `${baseurl}/index.html`,
    `${baseurl}/pages/caffeine-science`,
    `${baseurl}/pages/overdose-symptoms`,
    `${baseurl}/pages/health-advice`,
    `${baseurl}/blog/`
  ];
  
  // Dynamically fetch blog posts from the blog page
  try {
    const blogResponse = await fetch(`${baseurl}/blog/`);
    if (blogResponse.ok) {
      const blogHtml = await blogResponse.text();
      const blogParser = new DOMParser();
      const blogDoc = blogParser.parseFromString(blogHtml, 'text/html');
      
      // Extract blog post URLs from the blog index page
      const blogLinks = blogDoc.querySelectorAll('a[href*="/2025/"], a[href*="/2024/"], a[href*="/2026/"]');
      blogLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && !pages.includes(href)) {
          pages.push(href);
        }
      });
    }
  } catch (error) {
    console.warn('Could not fetch blog posts list:', error);
  }

  // First search current page
  const currentPath = window.location.pathname;
  const currentPageResults = await searchPageContent(searchTerm);
  
  // Add results with current page flag to prevent duplicates
  currentPageResults.forEach(result => {
    result.isCurrentPage = true;
  });
  
  results.push(...currentPageResults);

  // Then search other pages using Fetch API
  for (const page of pages) {
    // Skip current page as we've already searched it
    if (currentPath === page || currentPath === page + '/' || currentPath.includes(page)) {
      continue;
    }

    try {
      // Use absolute path from root
      const pagePath = page;
      
      const response = await fetch(pagePath);
      if (!response.ok) continue;
      
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Search in headings, paragraphs, and specific content elements
      const searchableElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, td, th, .panel-title, div[data-title], .section-divider');
      
      // Skip elements that are part of search UI
      const skipElements = new Set();
      doc.querySelectorAll('#searchResults *, .search-form *').forEach(el => skipElements.add(el));
      
      searchableElements.forEach(element => {
        // Helper function to check if an element is a menu item
        const isMenuElement = (el) => {
          // Check if element is within navigation or footer
          if (
            el.closest('.navbar') ||
            el.closest('.navbar-nav') ||
            el.closest('nav') ||
            el.closest('.footer') ||
            el.closest('footer') ||
            el.closest('.footer-links') ||
            el.closest('.nav-item')
          ) {
            return true;
          }
          
          // Check if element itself is a navigation link
          if (el.tagName === 'A' && (
            el.classList.contains('nav-link') ||
            el.classList.contains('navbar-brand') ||
            el.closest('footer') ||
            (el.parentElement && el.parentElement.classList.contains('footer-links'))
          )) {
            return true;
          }
          
          // Check for exact menu item matches, but only if they're in menu context
          // This allows section titles with same names to be found
          const menuTexts = ['Caffeine Science', 'Overdose Symptoms', 'Health Advice', 'Calculator'];
          if (menuTexts.includes(el.textContent.trim())) {
            const isInNavOrFooter = el.closest('nav') || el.closest('footer') || 
                                   el.closest('.navbar-nav') || el.closest('.footer-links');
            if (isInNavOrFooter) {
              return true;
            }
          }
          
          return false;
        };
        
        // Skip elements that are part of search UI or navigation/footer menus
        if (skipElements.has(element) || 
            element.closest('#searchResults') || 
            element.closest('.search-form') ||
            isMenuElement(element)
        ) {
          return;
        }
        
        const text = extractTextFromElement(element);
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
    
    // Search in headings, paragraphs, and specific content elements
    const searchableElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, td, th, .panel-title, div[data-title], .section-divider');
    
    // Skip the search box itself and search results
    const skipElements = new Set();
    document.querySelectorAll('#searchResults *, .search-form *').forEach(el => skipElements.add(el));
    
    searchableElements.forEach(element => {
      // Helper function to check if an element is a menu item
      const isMenuElement = (el) => {
        // Check if element is within navigation or footer
        if (
          el.closest('.navbar') ||
          el.closest('.navbar-nav') ||
          el.closest('nav') ||
          el.closest('.footer') ||
          el.closest('footer') ||
          el.closest('.footer-links') ||
          el.closest('.nav-item')
        ) {
          return true;
        }
        
        // Check if element itself is a navigation link
        if (el.tagName === 'A' && (
          el.classList.contains('nav-link') ||
          el.classList.contains('navbar-brand') ||
          el.closest('footer') ||
          (el.parentElement && el.parentElement.classList.contains('footer-links'))
        )) {
          return true;
        }
        
        // Check for exact menu item matches, but only if they're in menu context
        // This allows section titles with same names to be found
        const menuTexts = ['Caffeine Science', 'Overdose Symptoms', 'Health Advice', 'Calculator'];
        if (menuTexts.includes(el.textContent.trim())) {
          const isInNavOrFooter = el.closest('nav') || el.closest('footer') || 
                                 el.closest('.navbar-nav') || el.closest('.footer-links');
          if (isInNavOrFooter) {
            return true;
          }
        }
        
        return false;
      };
      
      // Skip elements that are part of search UI or navigation/footer menus
      if (skipElements.has(element) || 
          element.closest('#searchResults') || 
          element.closest('.search-form') ||
          isMenuElement(element)
      ) {
        return;
      }
      
      const text = extractTextFromElement(element);
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

// Extract text content from section names and data attributes to improve search
function extractTextFromElement(element) {
  let text = element.textContent || '';
  
  // For section dividers with data-title attributes
  if (element.hasAttribute('data-title')) {
    text += ' ' + element.getAttribute('data-title');
  }
  
  // For elements that might have titles in attributes
  if (element.hasAttribute('aria-label')) {
    text += ' ' + element.getAttribute('aria-label');
  }
  
  // For panel titles and sections that might use special classes
  if (element.classList.contains('panel-title') || element.parentElement?.classList.contains('panel-title')) {
    // Make sure panel titles get higher search priority
    text = text.trim(); // Ensure clean text
  }
  
  return text;
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
  
  // Normalize current path and target URL for comparison
  const currentPath = window.location.pathname;
  const currentPathClean = currentPath.split('/').pop() || 'index.html'; // Get filename
  const targetURLClean = targetURL.split('/').pop(); // Get filename without path
  
  // Log for debugging
  console.log('Current path:', currentPathClean, 'Target:', targetURLClean);
  
  // If we're already on the target page, just scroll
  if (currentPathClean === targetURLClean) {
    console.log('Same page, scrolling to element:', elementId);
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
    } else {
      console.warn('Target element not found:', elementId);
      // Element not found on current page, try searching page content
      searchPageContent(document.getElementById('siteSearch').value.trim());
    }
  } else {
    // Store the target element ID in localStorage for retrieval after navigation
    console.log('Navigating to:', targetURL, 'with target ID:', elementId);
    localStorage.setItem('scrollToElementId', elementId);
    window.location.href = targetURL;
  }
}

// Function to check for scrollToElement after page load
function checkForScrollTarget() {
  const targetId = localStorage.getItem('scrollToElementId');
  if (targetId) {
    console.log('Found scroll target in localStorage:', targetId);
    // Clear it immediately to prevent future unwanted scrolls
    localStorage.removeItem('scrollToElementId');
    
    // Try once immediately (some elements might already be available)
    let targetElement = document.getElementById(targetId);
    if (targetElement) {
      console.log('Target element found immediately');
      scrollToAndHighlight(targetElement);
      return;
    }
    
    console.log('Target element not found immediately, waiting for full page load...');
    
    // Wait for page to fully render and make multiple attempts
    let attempts = 0;
    const maxAttempts = 5;
    const attemptInterval = 300; // ms
    
    const findAndScrollToElement = () => {
      targetElement = document.getElementById(targetId);
      attempts++;
      
      if (targetElement) {
        console.log(`Found element on attempt ${attempts}`);
        scrollToAndHighlight(targetElement);
      } else if (attempts < maxAttempts) {
        console.log(`Element not found, attempt ${attempts}/${maxAttempts}`);
        setTimeout(findAndScrollToElement, attemptInterval);
      } else {
        console.warn(`Failed to find element with ID ${targetId} after ${maxAttempts} attempts`);
        // Try using a different strategy - perhaps the ID is in a data attribute somewhere
        const elements = document.querySelectorAll('[data-target="' + targetId + '"]');
        if (elements.length > 0) {
          console.log('Found element by data-target attribute');
          scrollToAndHighlight(elements[0]);
        }
      }
    };
    
    // Start the attempt sequence
    setTimeout(findAndScrollToElement, 300);
  }
}

// Helper function to scroll to and highlight an element
function scrollToAndHighlight(element) {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // Highlight the element briefly
  element.classList.add('search-highlight');
  setTimeout(() => {
    element.classList.remove('search-highlight');
  }, 3000);
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