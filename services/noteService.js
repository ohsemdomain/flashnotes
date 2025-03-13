// /js/services/noteService.js
/**
 * Note Service
 * 
 * Handles all note-related data operations, including:
 * - CRUD operations for notes (create, read, update, delete)
 * - Searching and filtering notes
 * 
 * This service acts as an intermediary between UI components and the database layer,
 * providing a clean API for note operations.
 */
class NoteService {
    constructor(db) {
        this.db = db;
    }

    /**
     * Get all notes from the database
     * @returns {Promise<Array>} List of note objects
     */
    async getAllNotes() {
        return this.db.getAllNotes();
    }

    /**
     * Get a specific note by ID
     * @param {number} id - The note ID
     * @returns {Promise<Object|null>} The note object or null if not found
     */
    async getNoteById(id) {
        return this.db.getNoteById(id);
    }

    /**
     * Create a new note
     * @param {string} title - Note title (default: empty string)
     * @param {string} content - Note content (default: empty string)
     * @param {Array} tags - Array of tag names (default: empty array)
     * @returns {Promise<Object>} The created note
     */
    async createNote(title = '', content = '', tags = []) {
        return this.db.createNote(title, content, tags);
    }

    /**
     * Update an existing note
     * @param {number} id - The note ID
     * @param {Object} updates - Object with properties to update
     * @returns {Promise<Object|null>} The updated note or null if not found
     */
    async updateNote(id, updates) {
        return this.db.updateNote(id, updates);
    }

    /**
     * Delete a note
     * @param {number} id - The note ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteNote(id) {
        return this.db.deleteNote(id);
    }

    /**
     * Search notes by title, content, or tags
     * @param {string} query - Search query string
     * @returns {Promise<Array>} List of matched note objects
     */
    async searchNotes(query) {
        return this.db.searchNotes(query);
    }

    /**
     * Format a date for display in the note list
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date (DD.MM.YYYY)
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }

    /**
     * Extract a title from note content if title is empty
     * @param {string} content - Note content
     * @returns {string} Extracted title or "Untitled Note"
     */
    extractTitleFromContent(content) {
        if (!content) return 'Untitled Note';

        // Try to get the first line of content
        const firstLine = content.split('\n')[0].trim();

        // Remove HTML tags if present
        const textOnly = firstLine.replace(/<[^>]*>/g, '');

        if (textOnly.length > 0) {
            // Limit to 30 characters
            return textOnly.length > 30 ? textOnly.substring(0, 27) + '...' : textOnly;
        }

        return 'Untitled Note';
    }
}

// Export as a global to use in app.js and other files
window.NoteService = NoteService;