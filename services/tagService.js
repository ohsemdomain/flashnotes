// /js/services/tagService.js
/**
 * Tag Service
 * 
 * Handles all tag-related data operations, including:
 * - Tag management (create, update, delete)
 * - Tag associations with notes
 * - Tag color management
 * 
 * This service acts as an intermediary between UI components and the database layer,
 * providing a clean API for tag operations.
 */
class TagService {
    constructor(db) {
        this.db = db;
    }

    /**
     * Get all tags from the database
     * @returns {Promise<Array>} List of tag names
     */
    async getAllTags() {
        return this.db.getAllTags();
    }

    /**
     * Get all tags with their colors
     * @returns {Promise<Array>} List of tag objects with name and color properties
     */
    async getAllTagsWithColors() {
        return this.db.getAllTagsWithColors();
    }

    /**
     * Get color for a specific tag
     * @param {string} tagName - The tag name
     * @returns {Promise<string>} Hex color code
     */
    async getTagColor(tagName) {
        return this.db.getTagColor(tagName);
    }

    /**
     * Add a new tag to the database
     * @param {string} tagName - The tag name
     * @param {string} color - Hex color code
     * @returns {Promise<string>} The added tag name
     */
    async addTag(tagName, color = '#e4e4e4') {
        return this.db.addTag(tagName, color);
    }

    /**
     * Update a tag's color
     * @param {string} tagName - The tag name
     * @param {string} color - New hex color code
     * @returns {Promise<boolean>} Success status
     */
    async updateTagColor(tagName, color) {
        return this.db.updateTagColor(tagName, color);
    }

    /**
     * Remove a tag from the database and all notes
     * @param {string} tagName - The tag name to remove
     * @returns {Promise<boolean>} Success status
     */
    async removeTag(tagName) {
        return this.db.removeTag(tagName);
    }

    /**
     * Add a tag to a note
     * @param {number} noteId - The note ID
     * @param {string} tagName - The tag name
     * @returns {Promise<Object>} The updated note
     */
    async addTagToNote(noteId, tagName) {
        const note = await this.db.getNoteById(noteId);
        if (!note || note.tags.includes(tagName)) return note;

        const updatedTags = [...note.tags, tagName];
        return this.db.updateNote(noteId, { tags: updatedTags });
    }

    /**
     * Remove a tag from a note
     * @param {number} noteId - The note ID
     * @param {string} tagName - The tag name
     * @returns {Promise<Object>} The updated note
     */
    async removeTagFromNote(noteId, tagName) {
        const note = await this.db.getNoteById(noteId);
        if (!note) return note;

        const tagIndex = note.tags.indexOf(tagName);
        if (tagIndex === -1) return note;

        const updatedTags = [...note.tags];
        updatedTags.splice(tagIndex, 1);
        return this.db.updateNote(noteId, { tags: updatedTags });
    }

    /**
     * Update a tag's name and color
     * @param {string} originalName - The original tag name
     * @param {string} newName - The new tag name
     * @param {string} color - The new color
     * @returns {Promise<boolean>} Success status
     */
    async updateTag(originalName, newName, color) {
        // If name hasn't changed, just update the color
        if (originalName === newName) {
            return this.updateTagColor(originalName, color);
        }

        // Create new tag with the new name and color
        await this.addTag(newName, color);

        // Update all notes that had the old tag
        const notes = await this.db.getAllNotes();
        for (const note of notes) {
            if (note.tags.includes(originalName)) {
                const updatedTags = [...note.tags];
                const tagIndex = updatedTags.indexOf(originalName);
                updatedTags[tagIndex] = newName;
                await this.db.updateNote(note.id, { tags: updatedTags });
            }
        }

        // Remove the old tag
        return this.db.removeTag(originalName);
    }

    /**
     * Calculate the brightness of a color
     * @param {string} hexColor - Hex color code
     * @returns {number} Brightness value (0-255)
     */
    getBrightness(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);

        // Calculate brightness (perceived luminance)
        return (r * 299 + g * 587 + b * 114) / 1000;
    }

    /**
     * Get appropriate text color based on background color
     * @param {string} backgroundColor - Hex color code
     * @returns {string} Text color (#333 or #fff)
     */
    getTextColorForBackground(backgroundColor) {
        const brightness = this.getBrightness(backgroundColor);
        return brightness > 160 ? '#333' : '#fff';
    }
}

// Export as a global to use in app.js and other files
window.TagService = TagService;