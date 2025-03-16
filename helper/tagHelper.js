/**
 * Tag Helper
 * 
 * A collection of helper functions for tag-related operations
 * including color handling, DOM utilities, and other tag-specific helpers.
 */

const TagHelper = {
  /**
   * Calculate the brightness of a color
   * @param {string} hexColor - Hex color code (e.g. "#e4e4e4")
   * @returns {number} Brightness value (0-255)
   */
  getBrightness: function (hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);

    // Calculate perceived brightness using a common formula
    // (0.299*R + 0.587*G + 0.114*B)
    return (r * 299 + g * 587 + b * 114) / 1000;
  },

  /**
   * Get appropriate text color based on background brightness
   * @param {string} backgroundColor - Hex color code
   * @returns {string} Text color (#333 or #fff)
   */
  getTextColorForBackground: function (backgroundColor) {
    const brightness = this.getBrightness(backgroundColor);
    return brightness > 160 ? '#333' : '#fff';
  },

  /**
   * Position a dropdown element relative to a button
   * @param {HTMLElement} button - The button element that triggered the dropdown
   * @param {HTMLElement} dropdown - The dropdown element to position
   */
  positionDropdown: function (button, dropdown) {
    // Get button position
    const buttonRect = button.getBoundingClientRect();

    // Calculate initial position (below the button)
    let top = buttonRect.bottom + 5;
    let right = window.innerWidth - buttonRect.right;

    // Check if dropdown would go off the bottom of the screen
    const dropdownHeight = 300; // Max height of dropdown
    if (top + dropdownHeight > window.innerHeight) {
      // Position above the button if it would go off screen
      top = buttonRect.top - dropdownHeight - 5;
    }

    // Set the position
    dropdown.style.top = `${top}px`;
    dropdown.style.right = `${right}px`;

    // Ensure the dropdown is within the viewport
    dropdown.style.maxHeight = `${Math.min(400, window.innerHeight - top - 20)}px`;
  },

  /**
   * Select a color option in a color picker
   * @param {NodeList} colorOptions - Collection of color option elements
   * @param {string} selectedColor - The color to select (hex code)
   */
  selectColorOption: function (colorOptions, selectedColor) {
    // First clear all selections
    colorOptions.forEach(option => option.classList.remove('selected'));

    // Then set the selected color
    let found = false;
    colorOptions.forEach(option => {
      if (option.dataset.color === selectedColor) {
        option.classList.add('selected');
        found = true;
      }
    });

    // If no match found, select the first option as default
    if (!found && colorOptions.length > 0) {
      colorOptions[0].classList.add('selected');
    }
  },

  /**
   * Creates a tag element with appropriate styling
   * @param {string} tagName - The name of the tag
   * @param {string} tagColor - The color of the tag (hex code)
   * @param {Function} onRemoveClick - Callback for when the remove button is clicked
   * @returns {HTMLElement} The created tag element
   */
  createTagElement: function (tagName, tagColor, onRemoveClick) {
    const tagElement = document.createElement('div');
    tagElement.className = 'tag';
    tagElement.style.backgroundColor = tagColor;

    // Determine text color based on background brightness
    const textColor = this.getTextColorForBackground(tagColor);
    tagElement.style.color = textColor;

    tagElement.innerHTML = `<span>${tagName}</span><span class="remove-tag">×</span>`;

    if (onRemoveClick) {
      tagElement.querySelector('.remove-tag').addEventListener('click', onRemoveClick);
    }

    return tagElement;
  },

  /**
   * Safely show a confirmation dialog with a message
   * @param {string} message - The confirmation message
   * @returns {boolean} True if confirmed, false otherwise
   */
  confirmAction: function (message) {
    return window.confirm(message);
  }
};

// Export the helper object
window.TagHelper = TagHelper;