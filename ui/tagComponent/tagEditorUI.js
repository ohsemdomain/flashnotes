// ui/tagComponent/tagEditorUI.js
/**
 * Tag Editor UI
 * 
 * Handles the creation and editing of tags, including:
 * - Tag creation modal
 * - Tag editing modal
 * - Color selection
 */
class TagEditorUI {
    /**
     * Initialize the tag editor UI
     * @param {TagService} tagService - The tag service instance
     * @param {Function} onTagsChanged - Callback for when tags are changed
     */
    constructor(tagService, onTagsChanged) {
        this.tagService = tagService;
        this.onTagsChanged = onTagsChanged || function () { };
        this.selectedTagColor = '#e4e4e4'; // Default tag color
        this.editingTagColor = '#e4e4e4'; // For tag editing

        this.initElements();
        this.initEventListeners();
        this.setupColorSelectionObserver();

        console.log("TagEditorUI initialized");
    }

    /**
     * Initialize DOM elements
     */
    initElements() {
        // Create tag modal elements
        this.newTagName = document.getElementById('new-tag-name');
        this.createTagButton = document.getElementById('create-tag-button');
        this.colorOptions = document.querySelectorAll('.tag-colors .color-option');

        // Edit tag modal elements
        this.editTagName = document.getElementById('edit-tag-name');
        this.editTagOriginalName = document.getElementById('edit-tag-original-name');
        this.updateTagButton = document.getElementById('update-tag-button');
        this.deleteTagButton = document.getElementById('delete-tag-button');
        this.editColorOptions = document.querySelectorAll('#edit-tag-colors .color-option');

        // Debug checks
        if (!this.newTagName) console.error("New tag name input not found");
        if (!this.createTagButton) console.error("Create Tag button not found in the DOM");
        if (this.colorOptions.length === 0) console.error("Color options not found");
    }

    /**
     * Set up event listeners
     */
    initEventListeners() {
        // Create tag button
        if (this.createTagButton) {
            this.createTagButton.addEventListener('click', () => {
                console.log("Create Tag button clicked");
                this.createTag();
            });
        }

        // Update tag button
        if (this.updateTagButton) {
            this.updateTagButton.addEventListener('click', () => this.updateTag());
        }

        // Delete tag button
        if (this.deleteTagButton) {
            this.deleteTagButton.addEventListener('click', () => this.deleteTag());
        }

        // Color selection in create tag modal
        this.colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                TagHelper.selectColorOption(this.colorOptions, option.dataset.color);
                this.selectedTagColor = option.dataset.color;
                console.log("Selected color:", this.selectedTagColor);
            });
        });

        // Color selection in edit tag modal
        this.editColorOptions.forEach(option => {
            option.addEventListener('click', () => {
                TagHelper.selectColorOption(this.editColorOptions, option.dataset.color);
                this.editingTagColor = option.dataset.color;
            });
        });

        // Modal tag name enter key
        if (this.newTagName) {
            this.newTagName.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    console.log("Enter key pressed in new tag name field");
                    this.createTag();
                }
            });
        }

        if (this.editTagName) {
            this.editTagName.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.updateTag();
                }
            });
        }
    }

    /**
     * Set up MutationObserver for color selection in the edit modal
     */
    setupColorSelectionObserver() {
        // Create an observer to handle tag color selection when modal opens
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.target.id === 'edit-tag-modal' &&
                    mutation.target.classList.contains('active')) {

                    const tagColor = mutation.target.getAttribute('data-current-color');
                    if (tagColor) {
                        setTimeout(() => {
                            const colorOptions = document.querySelectorAll('#edit-tag-colors .color-option');
                            colorOptions.forEach(option => {
                                option.classList.remove('selected');
                                if (option.dataset.color === tagColor) {
                                    option.classList.add('selected');
                                }
                            });
                        }, 50);
                    }
                }
            });
        });

        // Start observing the modal
        const modalElement = document.getElementById('edit-tag-modal');
        if (modalElement) {
            observer.observe(modalElement, {
                attributes: true,
                attributeFilter: ['class']
            });
        } else {
            console.error("Edit tag modal element not found");
        }

        // Store observer reference for cleanup
        this.colorObserver = observer;
    }

    /**
     * Clean up observers when component is destroyed
     */
    cleanup() {
        if (this.colorObserver) {
            this.colorObserver.disconnect();
        }
    }

    /**
     * Show the create tag modal
     */
    showCreateTagModal() {
        console.log("Showing create tag modal");

        modalManager.open('create-tag-modal', {
            onOpen: () => {
                console.log("Create tag modal opened");

                // Always reset the form completely when opening
                if (this.newTagName) {
                    this.newTagName.value = '';
                    this.newTagName.focus();
                }

                // Reset color selection to default by completely clearing previous selection
                this.selectedTagColor = '#e4e4e4'; // Default color

                // Deselect all color options first
                if (this.colorOptions) {
                    this.colorOptions.forEach(option => {
                        option.classList.remove('selected');
                    });

                    // Find and select the default color option
                    this.colorOptions.forEach(option => {
                        if (option.dataset.color === this.selectedTagColor) {
                            option.classList.add('selected');
                        }
                    });
                }
            }
        });
    }

    /**
     * Show the edit tag modal
     * @param {string} tagName - The tag name to edit
     */
    async showEditTagModal(tagName) {
        const tagColor = await this.tagService.getTagColor(tagName);
        console.log("Showing edit tag modal for:", tagName, "Color:", tagColor);

        // Set data attribute for the observer to use
        const editModal = document.getElementById('edit-tag-modal');
        if (editModal) {
            editModal.setAttribute('data-current-color', tagColor);
        }

        // Store the current active modal before opening a new one
        if (modalManager.activeModal === 'tags-manager-modal') {
            modalManager.lastOpenedModal = 'tags-manager-modal';
        }

        // Set the values for tag name
        if (this.editTagName) this.editTagName.value = tagName;
        if (this.editTagOriginalName) this.editTagOriginalName.value = tagName;
        this.editingTagColor = tagColor;

        // Open the modal (the observer will handle color selection)
        modalManager.open('edit-tag-modal');
    }

    /**
     * Create a new tag
     */
    async createTag() {
        if (!this.newTagName) {
            console.error("New tag name input not found");
            return;
        }

        const tagName = this.newTagName.value.trim();
        if (!tagName) {
            console.log("Tag name is empty, not creating");
            return;
        }

        console.log("Creating tag:", tagName, "Color:", this.selectedTagColor);

        try {
            // Add to global tags
            await this.tagService.addTag(tagName, this.selectedTagColor);
            console.log("Tag created successfully");

            // Close create tag modal
            modalManager.closeActiveModal();

            // Ensure we're opening tags-manager-modal specifically after creating a tag
            setTimeout(() => {
                // Open tags manager modal and refresh the list
                modalManager.open('tags-manager-modal');

                // Make sure tags list is refreshed
                if (window.tagManagerUI) {
                    window.tagManagerUI.loadTags();
                }

                // Notify parent component
                if (this.onTagsChanged) {
                    this.onTagsChanged();
                }
            }, 50);
        } catch (error) {
            console.error("Error creating tag:", error);
        }
    }

    /**
     * Update an existing tag
     */
    async updateTag() {
        const newName = this.editTagName.value.trim();
        const originalName = this.editTagOriginalName.value;

        if (!newName) return;

        // Update the tag
        await this.tagService.updateTag(originalName, newName, this.editingTagColor);

        // Close the edit modal
        modalManager.closeActiveModal();

        // Re-open the tags manager modal if it was active
        if (modalManager.lastOpenedModal) {
            setTimeout(() => {
                modalManager.open(modalManager.lastOpenedModal);
            }, 100);
        }

        // Notify parent component
        this.onTagsChanged();
    }

    /**
     * Delete a tag
     */
    async deleteTag() {
        const tagName = this.editTagOriginalName.value;

        // Use helper for confirmation dialog
        if (TagHelper.confirmAction(`Are you sure you want to delete the tag "${tagName}"? It will be removed from all notes.`)) {
            await this.tagService.removeTag(tagName);

            // Close the edit modal
            modalManager.closeActiveModal();

            // Re-open the tags manager modal if it was active
            if (modalManager.lastOpenedModal) {
                setTimeout(() => {
                    modalManager.open(modalManager.lastOpenedModal);
                }, 100);
            }

            // Notify parent component
            this.onTagsChanged();
        }
    }
}

// Export as a global to use in app.js
window.TagEditorUI = TagEditorUI;