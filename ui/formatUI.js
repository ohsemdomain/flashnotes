// /js/ui/formatUI.js
/**
 * Format UI
 * 
 * Handles the text formatting toolbar functionality, including:
 * - Bold, italic, underline formatting
 * - List creation (bulleted and numbered)
 * - Text case conversion (uppercase, lowercase, title case, sentence case)
 * - Keyboard shortcuts for formatting
 * 
 * This component manages all user interactions with the formatting toolbar
 * and applies the appropriate formatting to the note content.
 */
class FormatUI {
  /**
   * Initialize the formatting toolbar
   */
  constructor() {
    this.initElements();
    this.initEventListeners();
  }

  /**
   * Initialize DOM elements
   */
  initElements() {
    // Format buttons
    this.formatBoldBtn = document.getElementById('format-bold');
    this.formatItalicBtn = document.getElementById('format-italic');
    this.formatUnderlineBtn = document.getElementById('format-underline');
    this.formatListBtn = document.getElementById('format-list');
    this.formatNumberedListBtn = document.getElementById('format-numbered-list');

    // Text case conversion buttons
    this.formatUppercaseBtn = document.getElementById('format-uppercase');
    this.formatLowercaseBtn = document.getElementById('format-lowercase');
    this.formatTitlecaseBtn = document.getElementById('format-titlecase');
    this.formatSentencecaseBtn = document.getElementById('format-sentencecase');

    // Note content area
    this.noteContent = document.getElementById('note-content');
  }

  /**
   * Set up event listeners for formatting actions
   */
  initEventListeners() {
    // Button click events
    this.formatBoldBtn.addEventListener('click', () => this.applyFormat('bold'));
    this.formatItalicBtn.addEventListener('click', () => this.applyFormat('italic'));
    this.formatUnderlineBtn.addEventListener('click', () => this.applyFormat('underline'));
    this.formatListBtn.addEventListener('click', () => this.applyFormat('insertUnorderedList'));
    this.formatNumberedListBtn.addEventListener('click', () => this.applyFormat('insertOrderedList'));

    // Text case conversion button events
    this.formatUppercaseBtn.addEventListener('click', () => this.convertCase('uppercase'));
    this.formatLowercaseBtn.addEventListener('click', () => this.convertCase('lowercase'));
    this.formatTitlecaseBtn.addEventListener('click', () => this.convertCase('titlecase'));
    this.formatSentencecaseBtn.addEventListener('click', () => this.convertCase('sentencecase'));

    // Format keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Skip if the target is not the note content area
      if (e.target !== this.noteContent) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        this.applyFormat('bold');
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        this.applyFormat('italic');
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        this.applyFormat('underline');
        e.preventDefault();
      }
      // Add keyboard shortcut for numbered list (Ctrl+Shift+7)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '7') {
        this.applyFormat('insertOrderedList');
        e.preventDefault();
      }

      // Add keyboard shortcuts for text case conversion
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'U') {
        this.convertCase('uppercase');
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
        this.convertCase('lowercase');
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        this.convertCase('titlecase');
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        this.convertCase('sentencecase');
        e.preventDefault();
      }
    });

    // Add active state to buttons when corresponding format is active
    this.noteContent.addEventListener('mouseup', () => this.updateFormatButtons());
    this.noteContent.addEventListener('keyup', () => this.updateFormatButtons());
  }

  /**
   * Apply formatting to the selected text
   * @param {string} command - The execCommand to apply
   * @param {string|null} value - Optional value for the command
   */
  applyFormat(command, value = null) {
    document.execCommand(command, false, value);

    // Apply additional styling for lists to ensure proper display
    if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
      const lists = this.noteContent.querySelectorAll('ul, ol');
      lists.forEach(list => {
        // Ensure the list has proper styling
        if (!list.style.paddingLeft) {
          list.style.paddingLeft = '25px';
        }
      });
    }

    // Focus back on the content area
    this.noteContent.focus();
    // Update button states
    this.updateFormatButtons();
  }

  /**
   * Convert text case based on the specified type
   * @param {string} caseType - The case type to convert to ('uppercase', 'lowercase', 'titlecase', 'sentencecase')
   */
  convertCase(caseType) {
    // Get selected text
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    if (range.collapsed) return; // No text selected

    // Get the selected text content
    const selectedText = range.toString();
    if (!selectedText) return;

    // Convert the text based on case type
    let convertedText;
    switch (caseType) {
      case 'uppercase':
        convertedText = selectedText.toUpperCase();
        break;
      case 'lowercase':
        convertedText = selectedText.toLowerCase();
        break;
      case 'titlecase':
        convertedText = this.toTitleCase(selectedText);
        break;
      case 'sentencecase':
        convertedText = this.toSentenceCase(selectedText);
        break;
      default:
        return;
    }

    // Replace the selected text with the converted text
    // First, delete the selected text
    range.deleteContents();

    // Then insert the converted text
    const textNode = document.createTextNode(convertedText);
    range.insertNode(textNode);

    // Update the selection to the new text
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    // Focus back on the content area
    this.noteContent.focus();

    // Trigger note saving
    const changeEvent = new Event('input', { bubbles: true });
    this.noteContent.dispatchEvent(changeEvent);
  }

  /**
   * Convert text to Title Case (capitalize each word)
   * @param {string} text - The text to convert
   * @returns {string} The text in Title Case
   */
  toTitleCase(text) {
    return text.replace(/\w\S*/g, (word) => {
      return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
    });
  }

  /**
   * Convert text to Sentence case (capitalize first letter of each sentence)
   * @param {string} text - The text to convert
   * @returns {string} The text in Sentence case
   */
  toSentenceCase(text) {
    // First lowercase everything
    text = text.toLowerCase();

    // Then capitalize the first letter of each sentence
    return text.replace(/(^\s*|[.!?]\s+)([a-z])/g, (match, p1, p2) => {
      return p1 + p2.toUpperCase();
    });
  }

  /**
   * Update format buttons to show active state when text is formatted
   */
  updateFormatButtons() {
    // Check if buttons exist (in case they're not loaded yet)
    if (!this.formatBoldBtn || !this.formatItalicBtn || !this.formatUnderlineBtn) {
      return;
    }

    // Check if corresponding format is active
    const isBold = document.queryCommandState('bold');
    const isItalic = document.queryCommandState('italic');
    const isUnderline = document.queryCommandState('underline');
    const isList = document.queryCommandState('insertUnorderedList');
    const isNumberedList = document.queryCommandState('insertOrderedList');

    // Update button classes
    this.toggleButtonActiveState(this.formatBoldBtn, isBold);
    this.toggleButtonActiveState(this.formatItalicBtn, isItalic);
    this.toggleButtonActiveState(this.formatUnderlineBtn, isUnderline);
    this.toggleButtonActiveState(this.formatListBtn, isList);
    this.toggleButtonActiveState(this.formatNumberedListBtn, isNumberedList);
  }

  /**
   * Toggle active class on format buttons
   * @param {HTMLElement} button - The button element
   * @param {boolean} isActive - Whether to add or remove active class
   */
  toggleButtonActiveState(button, isActive) {
    if (isActive) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  }
}

// Export as a global to use in app.js
window.FormatUI = FormatUI;