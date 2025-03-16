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
    }

    /**
     * Set up event listeners
     */
    initEventListeners() {
        // Create tag button
        this.createTagButton.addEventListener('click', () => this.createTag());

        // Update tag button
        this.updateTagButton.addEventListener('click', () => this.updateTag());

        // Delete tag button
        this.deleteTagButton.addEventListener('click', () => this.deleteTag());

        // Color selection in create tag modal
        this.colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                TagHelper.selectColorOption(this.colorOptions, option.dataset.color);
                this.selectedTagColor = option.dataset.color;
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
        this.newTagName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.createTag();
            }
        });

        this.editTagName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.updateTag();
            }
        });
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
        // Store the current active modal before opening a new one
        modalManager.lastOpenedModal = 'tags-manager-modal';

        modalManager.open('create-tag-modal', {
            onOpen: () => {
                this.newTagName.value = '';
                this.newTagName.focus();
                this.selectedTagColor = '#e4e4e4';
                TagHelper.selectColorOption(this.colorOptions, this.selectedTagColor);
            }
        });
    }

    /**
     * Show the edit tag modal
     * @param {string} tagName - The tag name to edit
     */
    async showEditTagModal(tagName) {
        const tagColor = await this.tagService.getTagColor(tagName);
        console.log("Tag color from service:", tagColor);

        // Set data attribute for the observer to use
        document.getElementById('edit-tag-modal').setAttribute('data-current-color', tagColor);

        // Store the current active modal before opening a new one
        modalManager.lastOpenedModal = 'tags-manager-modal';

        // Set the values for tag name
        this.editTagName.value = tagName;
        this.editTagOriginalName.value = tagName;
        this.editingTagColor = tagColor;

        // Open the modal (the observer will handle color selection)
        modalManager.open('edit-tag-modal');
    }

    /**
     * Create a new tag
     */
    async createTag() {
        const tagName = this.newTagName.value.trim();
        if (!tagName) return;

        // Add to global tags
        await this.tagService.addTag(tagName, this.selectedTagColor);

        // Close the create tag modal
        modalManager.closeActiveModal();

        // Re-open the tags manager modal if it was active
        if (modalManager.lastOpenedModal) {
            modalManager.open(modalManager.lastOpenedModal);
        }

        // Notify parent component
        this.onTagsChanged();
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
            modalManager.open(modalManager.lastOpenedModal);
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
                modalManager.open(modalManager.lastOpenedModal);
            }

            // Notify parent component
            this.onTagsChanged();
        }
    }
}

// Export as a global to use in app.js
window.TagEditorUI = TagEditorUI;