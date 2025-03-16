// ui/tagComponent/tagDisplayUI.js
/**
 * Tag Display UI
 * 
 * Handles the display of tags on the current note, including:
 * - Rendering tags with proper colors
 * - Tag removal from notes
 */
class TagDisplayUI {
    /**
     * Initialize the tag display UI
     * @param {TagService} tagService - The tag service instance
     * @param {Function} onTagRemoved - Callback for when a tag is removed
     */
    constructor(tagService, onTagRemoved) {
        this.tagService = tagService;
        this.onTagRemoved = onTagRemoved || function () { };
        this.currentNote = null;

        this.initElements();
    }

    /**
     * Initialize DOM elements
     */
    initElements() {
        this.tagsList = document.getElementById('tags-list');
    }

    /**
     * Set the current note and render its tags
     * @param {Object} note - The current note
     */
    setCurrentNote(note) {
        this.currentNote = note;
        this.renderTags();
    }

    /**
     * Render the tags for the current note
     */
    async renderTags() {
        // Clear existing tags first
        this.tagsList.innerHTML = '';

        if (!this.currentNote || !this.currentNote.tags || this.currentNote.tags.length === 0) return;

        // Deduplicate tags to avoid rendering duplicates
        const uniqueTags = [...new Set(this.currentNote.tags)];

        for (const tagName of uniqueTags) {
            // Get tag color from service
            const tagColor = await this.tagService.getTagColor(tagName);

            // Use helper to create tag element
            const tagElement = TagHelper.createTagElement(
                tagName,
                tagColor,
                () => this.removeTagFromNote(tagName)
            );

            this.tagsList.appendChild(tagElement);
        }
    }

    /**
     * Remove a tag from the current note
     * @param {string} tagName - The tag name to remove
     */
    async removeTagFromNote(tagName) {
        if (!this.currentNote) return;

        const updatedNote = await this.tagService.removeTagFromNote(this.currentNote.id, tagName);

        // Update current note reference
        this.currentNote = updatedNote;

        // Re-render tags
        this.renderTags();

        // Notify parent component
        this.onTagRemoved(updatedNote);
    }
}

// Export as a global to use in app.js
window.TagDisplayUI = TagDisplayUI;