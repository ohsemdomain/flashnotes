// /js/ui/formatUI.js
/**
 * Format UI
 * 
 * Handles the text formatting toolbar functionality, including:
 * - Bold, italic, underline formatting
 * - List creation
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
      // Focus back on the content area
      this.noteContent.focus();
      // Update button states
      this.updateFormatButtons();
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
      
      // Update button classes
      this.toggleButtonActiveState(this.formatBoldBtn, isBold);
      this.toggleButtonActiveState(this.formatItalicBtn, isItalic);
      this.toggleButtonActiveState(this.formatUnderlineBtn, isUnderline);
      this.toggleButtonActiveState(this.formatListBtn, isList);
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