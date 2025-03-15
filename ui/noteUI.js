// /js/ui/noteUI.js
/**
 * Note UI
 * 
 * Handles all note-related UI functionality, including:
 * - Note list rendering
 * - Note selection
 * - Note content editing
 * - Note creation and deletion
 * - Save status indication
 * - Search functionality
 * 
 * This component manages all user interactions with notes and communicates
 * with the NoteService to perform data operations.
 */
class NoteUI {
  /**
   * Initialize the note UI manager
   * @param {NoteService} noteService - The note service instance
   * @param {Function} onNoteChanged - Callback for note change events
   */
  constructor(noteService, onNoteChanged) {
    this.noteService = noteService;
    this.currentNote = null;
    this.saveTimeout = null;
    this.onNoteChanged = onNoteChanged || function () { };
    this.cachedTagColors = {}; // Add cache for tag colors to reduce lookups

    this.initElements();
    this.initEventListeners();
  }

  /**
   * Initialize DOM elements
   */
  initElements() {
    this.notesList = document.getElementById('notes-list');
    this.noteTitle = document.getElementById('note-title');
    this.noteContent = document.getElementById('note-content');
    this.saveStatus = document.getElementById('save-status');
    this.searchInput = document.getElementById('search-notes');
    this.newNoteBtn = document.getElementById('new-note');
    this.deleteNoteBtn = document.getElementById('delete-note-btn');
    this.confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    this.cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  }

  /**
   * Set up event listeners for note-related functionality
   */
  initEventListeners() {
    // New and delete note buttons
    this.newNoteBtn.addEventListener('click', () => this.createNewNote());
    this.deleteNoteBtn.addEventListener('click', () => this.showDeleteConfirmation());
    this.confirmDeleteBtn.addEventListener('click', () => this.deleteCurrentNote());
    this.cancelDeleteBtn.addEventListener('click', () => modalManager.closeActiveModal());

    // Content change events with autosave
    this.noteTitle.addEventListener('input', () => this.onContentChanged());
    this.noteContent.addEventListener('input', () => this.onContentChanged());

    // Handle Enter key in title to move to content
    this.noteTitle.addEventListener('keydown', (e) => {
      NoteHelper.handleTitleKeydown(e, this.noteContent);
    });

    // Search functionality
    this.searchInput.addEventListener('input', () => {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => this.loadNotes(), 300);
    });
  }

  /**
   * Handle content changes and trigger autosave
   */
  onContentChanged() {
    // Show saving status immediately when typing begins
    NoteHelper.updateSaveStatus(this.saveStatus, 'saving');

    // Clear any previous timeout
    clearTimeout(this.saveTimeout);

    // Set a new timeout
    this.saveTimeout = setTimeout(() => this.saveCurrentNote(), 1000);
  }

  /**
   * Pre-cache all tag colors for faster rendering
   * This avoids multiple async calls when rendering notes
   */
  async cacheAllTagColors() {
    try {
      const allTags = await window.db.getAllTagsWithColors();
      allTags.forEach(tag => {
        this.cachedTagColors[tag.name] = tag.color;
      });
    } catch (error) {
      console.error('Error caching tag colors:', error);
    }
  }

  /**
   * Get tag color from cache or database
   * @param {string} tagName - The tag name
   * @returns {Promise<string>} - The color hex code
   */
  async getTagColor(tagName) {
    // Check if color is in cache
    if (this.cachedTagColors[tagName]) {
      return this.cachedTagColors[tagName];
    }
    
    // If not in cache, get from database and cache it
    const color = await window.db.getTagColor(tagName);
    this.cachedTagColors[tagName] = color;
    return color;
  }

  /**
   * Load notes into the sidebar list
   */
  async loadNotes() {
    // First ensure tag colors are cached for performance
    await this.cacheAllTagColors();
    
    const query = this.searchInput.value.trim();
    const notes = await this.noteService.searchNotes(query);

    this.notesList.innerHTML = '';

    for (const note of notes) {
      // Get tag colors for this note using the cache
      const tagColors = [];
      for (const tagName of note.tags) {
        const tagColor = await this.getTagColor(tagName);
        tagColors.push(tagColor);
      }

      // Create note list item with helper
      const noteElement = NoteHelper.createNoteListItem(
        note,
        () => this.selectNote(note.id),
        this.currentNote && this.currentNote.id === note.id,
        tagColors
      );

      this.notesList.appendChild(noteElement);
    }
  }

  /**
   * Select a note and load it into the editor
   * @param {number} id - The note ID to select
   */
  async selectNote(id) {
    const note = await this.noteService.getNoteById(id);
    if (!note) return;

    this.currentNote = note;

    // Update UI
    this.noteTitle.innerHTML = note.title || '';
    this.noteContent.innerHTML = note.content || '';

    // Highlight the selected note
    const noteItems = this.notesList.querySelectorAll('.note-item');
    noteItems.forEach(item => {
      if (parseInt(item.dataset.id) === id) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update tag UI with current note
    if (window.tagUI) {
      window.tagUI.setCurrentNote(note);
    }

    // Update save status
    NoteHelper.updateSaveStatus(this.saveStatus, 'idle');
  }

  /**
   * Save the current note
   */
  async saveCurrentNote() {
    if (!this.currentNote) return;

    // Set saving status
    NoteHelper.updateSaveStatus(this.saveStatus, 'saving');

    const updatedNote = await this.noteService.updateNote(this.currentNote.id, {
      title: this.noteTitle.textContent.trim(),
      content: this.noteContent.innerHTML
    });

    this.currentNote = updatedNote;
    await this.loadNotes();

    // Show saved status
    NoteHelper.updateSaveStatus(this.saveStatus, 'saved');

    // After 2 seconds, change to idle status
    setTimeout(() => {
      NoteHelper.updateSaveStatus(this.saveStatus, 'idle');
    }, 2000);

    // Notify the app if needed
    if (this.onNoteChanged) {
      this.onNoteChanged();
    }
  }

  /**
   * Create a new note
   */
  async createNewNote() {
    const newNote = await this.noteService.createNote();
    await this.loadNotes();
    await this.selectNote(newNote.id);

    // Focus on the title area
    this.noteTitle.focus();
  }

  /**
   * Show the delete confirmation modal
   */
  showDeleteConfirmation() {
    if (!this.currentNote) return;
    modalManager.open('delete-confirm-modal');
  }

  /**
   * Delete the current note
   */
  async deleteCurrentNote() {
    if (!this.currentNote) return;

    await this.noteService.deleteNote(this.currentNote.id);

    const notes = await this.noteService.getAllNotes();
    await this.loadNotes();

    if (notes.length > 0) {
      await this.selectNote(notes[0].id);
    } else {
      // Clear the editor if no notes left
      this.currentNote = null;
      this.noteTitle.innerHTML = '';
      this.noteContent.innerHTML = '';

      if (window.tagUI) {
        window.tagUI.setCurrentNote(null);
      }

      NoteHelper.updateSaveStatus(this.saveStatus, 'idle');
    }

    // Close the delete confirmation modal
    modalManager.closeActiveModal();
  }
}

// Export as a global to use in app.js
window.NoteUI = NoteUI;