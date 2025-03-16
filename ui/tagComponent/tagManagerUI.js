// ui/tagComponent/tagManagerUI.js
/**
 * Tag Manager UI
 * 
 * Handles the management of all tags in the tag manager modal, including:
 * - Listing all tags
 * - Tag editing interface
 */
class TagManagerUI {
    /**
     * Initialize the tag manager UI
     * @param {TagService} tagService - The tag service instance
     * @param {TagEditorUI} tagEditorUI - The tag editor UI instance
     * @param {Function} onTagsChanged - Callback for when tags are changed
     */
    constructor(tagService, tagEditorUI, onTagsChanged) {
        this.tagService = tagService;
        this.tagEditorUI = tagEditorUI;
        this.onTagsChanged = onTagsChanged || function () { };

        this.initElements();
        this.initEventListeners();

        console.log("TagManagerUI initialized with tagEditorUI:", !!this.tagEditorUI);
    }

    /**
     * Initialize DOM elements
     */
    initElements() {
        this.tagsManagerList = document.getElementById('tags-manager-list');
        this.addTagManagerBtn = document.getElementById('add-tag-manager-btn');

        // Debug check
        if (!this.tagsManagerList) console.error("Tags manager list not found");
        if (!this.addTagManagerBtn) console.error("Add Tag button not found in the DOM");
    }

    /**
     * Set up event listeners
     */
    initEventListeners() {
        // Add tag button
        if (this.addTagManagerBtn) {
            this.addTagManagerBtn.addEventListener('click', () => {
                console.log("Add Tag button clicked in TagManagerUI");

                // Check if tagEditorUI is available
                if (!this.tagEditorUI) {
                    console.error("tagEditorUI is not defined");
                    return;
                }

                // Instead of closing the current modal first, store its ID
                const currentModalId = 'tags-manager-modal';

                // Set last opened modal directly in the modal manager
                modalManager.lastOpenedModal = currentModalId;

                // Hide the current modal without fully closing it
                const modalElement = document.getElementById(currentModalId);
                if (modalElement) {
                    modalElement.classList.remove('active');

                    // Also hide the backdrop if we're hiding the modal
                    const backdrop = document.getElementById('modal-backdrop');
                    if (backdrop) backdrop.classList.remove('active');
                }

                // Directly open the create tag modal
                this.tagEditorUI.showCreateTagModal();
            });
        } else {
            console.error("Add Tag button not found in the DOM");
        }
    }

    /**
     * Load all tags into the manager
     */
    async loadTags() {
        if (!this.tagsManagerList) {
            console.error("Tags manager list not found when trying to load tags");
            return;
        }

        console.log("Loading tags into manager");
        const tags = await this.tagService.getAllTagsWithColors();
        this.tagsManagerList.innerHTML = '';

        if (tags.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-tags-message';
            emptyMessage.textContent = 'No tags created yet.';
            this.tagsManagerList.appendChild(emptyMessage);
            return;
        }

        for (const tag of tags) {
            const tagElement = document.createElement('div');
            tagElement.className = 'tag-manager-item';

            tagElement.innerHTML = `
                <div class="tag-info">
                    <div class="tag-color-preview" style="background-color: ${tag.color}"></div>
                    <span>${tag.name}</span>
                </div>
                <button class="tag-edit-button" data-tag="${tag.name}">Edit</button>
            `;

            tagElement.querySelector('.tag-edit-button').addEventListener('click', (e) => {
                const tagName = e.target.dataset.tag;
                if (this.tagEditorUI) {
                    this.tagEditorUI.showEditTagModal(tagName);
                } else {
                    console.error("tagEditorUI is not defined when trying to edit tag");
                }
            });

            this.tagsManagerList.appendChild(tagElement);
        }

        console.log("Tags loaded:", tags.length);
    }
}

// Export as a global to use in app.js
window.TagManagerUI = TagManagerUI;