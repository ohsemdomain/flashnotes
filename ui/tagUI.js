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

        console.log("TagUI initializing with tagService:", !!tagService);

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
        console.log("Initializing tag UI components");

        try {
            // Create tag editor UI first
            this.tagEditorUI = new TagEditorUI(this.tagService, () => {
                // Tags changed callback
                this.handleTagsChanged();
            });

            console.log("TagEditorUI created");

            // Create tag manager UI (passing the tagEditorUI reference)
            this.tagManagerUI = new TagManagerUI(this.tagService, this.tagEditorUI, () => {
                // Tags changed callback
                this.handleTagsChanged();
            });

            console.log("TagManagerUI created");

            // Create tag display UI
            this.tagDisplayUI = new TagDisplayUI(this.tagService, (updatedNote) => {
                // Tag removed callback
                this.handleTagRemoved(updatedNote);
            });

            console.log("TagDisplayUI created");

            // Create tag dropdown UI
            this.tagDropdownUI = new TagDropdownUI(this.tagService, (updatedNote) => {
                // Tag toggled callback
                this.handleTagToggled(updatedNote);
            });

            console.log("TagDropdownUI created");

            // Make components globally accessible
            window.tagDropdownUI = this.tagDropdownUI;
            window.tagDisplayUI = this.tagDisplayUI;
            window.tagEditorUI = this.tagEditorUI;
            window.tagManagerUI = this.tagManagerUI;

            console.log("Tag UI components initialized and made globally accessible");
        } catch (error) {
            console.error("Error initializing tag UI components:", error);
        }
    }

    /**
     * Set the current note for all components
     * @param {Object} note - The current note
     */
    setCurrentNote(note) {
        this.currentNote = note;

        if (this.tagDropdownUI) {
            this.tagDropdownUI.setCurrentNote(note);
        }

        if (this.tagDisplayUI) {
            this.tagDisplayUI.setCurrentNote(note);
        }
    }

    /**
     * Handle when a tag is toggled in the dropdown
     * @param {Object} updatedNote - The updated note
     */
    handleTagToggled(updatedNote) {
        this.currentNote = updatedNote;

        if (this.tagDisplayUI) {
            this.tagDisplayUI.setCurrentNote(updatedNote);
        }

        this.notifyTagsChanged();
    }

    /**
     * Handle when a tag is removed from a note
     * @param {Object} updatedNote - The updated note
     */
    handleTagRemoved(updatedNote) {
        this.currentNote = updatedNote;

        if (this.tagDropdownUI) {
            this.tagDropdownUI.setCurrentNote(updatedNote);
        }

        this.notifyTagsChanged();
    }

    /**
     * Handle when tags are changed (created, updated, deleted)
     */
    handleTagsChanged() {
        console.log("Tags changed, refreshing UI components");

        // Refresh all tag-related UI components
        if (this.tagManagerUI) {
            this.tagManagerUI.loadTags();
        }

        if (this.tagDropdownUI && this.tagDropdownUI.tagDropdown &&
            this.tagDropdownUI.tagDropdown.classList.contains('active')) {
            this.tagDropdownUI.loadTags();
        }

        if (this.tagDisplayUI) {
            this.tagDisplayUI.renderTags();
        }

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

        if (this.tagManagerUI) {
            this.tagManagerUI.loadTags();
        }
    }

    /**
     * Show the create tag modal
     */
    showCreateTagModal() {
        if (this.tagEditorUI) {
            console.log("Delegating to tagEditorUI.showCreateTagModal()");
            this.tagEditorUI.showCreateTagModal();
        } else {
            console.error("tagEditorUI is not defined");
        }
    }

    /**
     * Load tags manager (for backward compatibility)
     */
    loadTagsManager() {
        if (this.tagManagerUI) {
            this.tagManagerUI.loadTags();
        } else {
            console.error("tagManagerUI is not defined");
        }
    }
}

// Export as a global to use in app.js
window.TagUI = TagUI;