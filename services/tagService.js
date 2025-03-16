// /js/services/tagService.js
/**
 * Tag Service
 * 
 * Handles all tag-related data operations, including:
 * - Tag management (create, update, delete)
 * - Tag associations with notes
 * - Tag color management
 * - Tag color caching
 * 
 * This service acts as an intermediary between UI components and the database layer,
 * providing a clean API for tag operations.
 */
class TagService {
    constructor(db) {
        this.db = db;
        this.colorCache = {}; // Cache for tag colors
        this.initCache();
    }

    /**
     * Initialize the color cache
     */
    async initCache() {
        try {
            const tags = await this.getAllTagsWithColors();
            tags.forEach(tag => {
                this.colorCache[tag.name] = tag.color;
            });
        } catch (error) {
            console.error('Error initializing tag color cache:', error);
        }
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
        // Check if color is in cache
        if (this.colorCache[tagName]) {
            return this.colorCache[tagName];
        }

        // If not in cache, get from database and cache it
        const color = await this.db.getTagColor(tagName);
        this.colorCache[tagName] = color;
        return color;
    }

    /**
     * Add a new tag to the database
     * @param {string} tagName - The tag name
     * @param {string} color - Hex color code
     * @returns {Promise<string>} The added tag name
     */
    async addTag(tagName, color = '#e4e4e4') {
        const result = await this.db.addTag(tagName, color);
        // Update cache
        this.colorCache[tagName] = color;
        return result;
    }

    /**
     * Update a tag's color
     * @param {string} tagName - The tag name
     * @param {string} color - New hex color code
     * @returns {Promise<boolean>} Success status
     */
    async updateTagColor(tagName, color) {
        const result = await this.db.updateTagColor(tagName, color);
        // Update cache if successful
        if (result) {
            this.colorCache[tagName] = color;
        }
        return result;
    }

    /**
     * Remove a tag from the database and all notes
     * @param {string} tagName - The tag name to remove
     * @returns {Promise<boolean>} Success status
     */
    async removeTag(tagName) {
        const result = await this.db.removeTag(tagName);
        // Remove from cache if successful
        if (result) {
            delete this.colorCache[tagName];
        }
        return result;
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

        // Remove the old tag (which will also update the cache)
        return this.db.removeTag(originalName);
    }

    /**
     * Clear the color cache
     */
    clearCache() {
        this.colorCache = {};
    }

    /**
     * Refresh the color cache with latest data from database
     */
    async refreshCache() {
        this.clearCache();
        await this.initCache();
    }
}

// Export as a global to use in app.js and other files
window.TagService = TagService;