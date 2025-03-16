// ui/tagUI.js
/**
 * Tag UI
 * 
 * Main coordinator for tag UI components, handling:
 * - Component initialization
 * - Event coordination between components
 * - Note-related tag operations
 */
class TagUI {
    /**
     * Initialize the tag UI coordinator
     * @param {TagService} tagService - The tag service instance
     */
    constructor(tagService) {
        this.tagService = tagService;
        this.currentNote = null;

        // Wait for DOM to be ready before initializing components
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initComponents());
        } else {
            this.initComponents();
        }
    }

    /**
     * Initialize all tag UI components
     */
    initComponents() {
        // Create tag editor UI
        this.tagEditorUI = new TagEditorUI(this.tagService, () => {
            // Tags changed callback
            this.handleTagsChanged();
        });

        // Create tag manager UI
        this.tagManagerUI = new TagManagerUI(this.tagService, this.tagEditorUI, () => {
            // Tags changed callback
            this.handleTagsChanged();
        });

        // Create tag display UI
        this.tagDisplayUI = new TagDisplayUI(this.tagService, (updatedNote) => {
            // Tag removed callback
            this.handleTagRemoved(updatedNote);
        });

        // Create tag dropdown UI
        this.tagDropdownUI = new TagDropdownUI(this.tagService, (updatedNote) => {
            // Tag toggled callback
            this.handleTagToggled(updatedNote);
        });

        // Make components globally accessible
        window.tagDropdownUI = this.tagDropdownUI;
        window.tagDisplayUI = this.tagDisplayUI;
        window.tagEditorUI = this.tagEditorUI;
        window.tagManagerUI = this.tagManagerUI;
    }

    /**
     * Set the current note for all components
     * @param {Object} note - The current note
     */
    setCurrentNote(note) {
        this.currentNote = note;
        this.tagDropdownUI.setCurrentNote(note);
        this.tagDisplayUI.setCurrentNote(note);
    }

    /**
     * Handle when a tag is toggled in the dropdown
     * @param {Object} updatedNote - The updated note
     */
    handleTagToggled(updatedNote) {
        this.currentNote = updatedNote;
        this.tagDisplayUI.setCurrentNote(updatedNote);
        this.notifyTagsChanged();
    }

    /**
     * Handle when a tag is removed from a note
     * @param {Object} updatedNote - The updated note
     */
    handleTagRemoved(updatedNote) {
        this.currentNote = updatedNote;
        this.tagDropdownUI.setCurrentNote(updatedNote);
        this.notifyTagsChanged();
    }

    /**
     * Handle when tags are changed (created, updated, deleted)
     */
    handleTagsChanged() {
        // Refresh all tag-related UI components
        this.tagManagerUI.loadTags();

        if (this.tagDropdownUI.tagDropdown.classList.contains('active')) {
            this.tagDropdownUI.loadTags();
        }

        this.tagDisplayUI.renderTags();
        this.notifyTagsChanged();
    }

    /**
     * Notify app.js that tags have changed
     */
    notifyTagsChanged() {
        if (typeof window.onTagsChanged === 'function') {
            window.onTagsChanged();
        }
    }

    /**
     * Show the tag manager modal
     */
    showTagManager() {
        modalManager.open('tags-manager-modal');
        this.tagManagerUI.loadTags();
    }

    /**
 * Show the create tag modal
 */
    showCreateTagModal() {
        if (this.tagEditorUI) {
            this.tagEditorUI.showCreateTagModal();
        }
    }

    /**
     * Load tags manager (for backward compatibility)
     */
    loadTagsManager() {
        this.tagManagerUI.loadTags();
    }
}

// Export as a global to use in app.js
window.TagUI = TagUI;