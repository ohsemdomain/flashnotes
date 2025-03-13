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
      this.onNoteChanged = onNoteChanged || function() {};
      
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
        if (e.key === 'Enter') {
          e.preventDefault();
          this.noteContent.focus();
        }
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
      this.updateSaveStatus('saving');
      
      // Clear any previous timeout
      clearTimeout(this.saveTimeout);
      
      // Set a new timeout
      this.saveTimeout = setTimeout(() => this.saveCurrentNote(), 1000);
    }
    
    /**
     * Load notes into the sidebar list
     */
    async loadNotes() {
      const query = this.searchInput.value.trim();
      const notes = await this.noteService.searchNotes(query);
      
      this.notesList.innerHTML = '';
      
      for (const note of notes) {
        const noteElement = document.createElement('div');
        noteElement.className = 'note-item';
        noteElement.dataset.id = note.id;
        
        if (this.currentNote && this.currentNote.id === note.id) {
          noteElement.classList.add('active');
        }
        
        // Get title from the first line of content or use "Untitled Note"
        const title = note.title || 'Untitled Note';
        
        // Format date for display
        const formattedDate = this.noteService.formatDate(note.updatedAt);
        
        // Create HTML for tag dots
        let tagsHTML = '';
        for (const tagName of note.tags) {
          const tagColor = await window.db.getTagColor(tagName);
          tagsHTML += `<span class="tag-dot" style="background-color: ${tagColor}"></span>`;
        }
        
        noteElement.innerHTML = `
          <h3>${title}</h3>
          <div class="note-item-footer">
            <small class="note-date">${formattedDate}</small>
            <div class="note-tags-dots">${tagsHTML}</div>
          </div>
        `;
        
        noteElement.addEventListener('click', () => this.selectNote(note.id));
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
      this.updateSaveStatus('idle');
    }
    
    /**
     * Save the current note
     */
    async saveCurrentNote() {
      if (!this.currentNote) return;
      
      // Set saving status
      this.updateSaveStatus('saving');
      
      const updatedNote = await this.noteService.updateNote(this.currentNote.id, {
        title: this.noteTitle.textContent.trim(),
        content: this.noteContent.innerHTML
      });
      
      this.currentNote = updatedNote;
      await this.loadNotes();
      
      // Show saved status
      this.updateSaveStatus('saved');
      
      // After 2 seconds, change to idle status
      setTimeout(() => {
        this.updateSaveStatus('idle');
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
        
        this.updateSaveStatus('idle');
      }
      
      // Close the delete confirmation modal
      modalManager.closeActiveModal();
    }
    
    /**
     * Update the save status indicator
     * @param {string} status - The status to display ('saving', 'saved', 'idle')
     */
    updateSaveStatus(status) {
      // Remove any existing classes
      this.saveStatus.classList.remove('saving', 'saved', 'idle');
      
      // Add the appropriate class
      this.saveStatus.classList.add(status);
      
      // Update the text based on status
      switch (status) {
        case 'saving':
          this.saveStatus.textContent = 'Saving...';
          break;
        case 'saved':
          this.saveStatus.textContent = 'All changes saved';
          break;
        case 'idle':
          this.saveStatus.textContent = 'All changes saved';
          break;
      }
    }
  }
  
  // Export as a global to use in app.js
  window.NoteUI = NoteUI;