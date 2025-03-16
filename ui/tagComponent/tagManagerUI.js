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
    }

    /**
     * Initialize DOM elements
     */
    initElements() {
        this.tagsManagerList = document.getElementById('tags-manager-list');
        this.addTagManagerBtn = document.getElementById('add-tag-manager-btn');
    }

    /**
     * Set up event listeners
     */
    initEventListeners() {
        // Add tag button
        this.addTagManagerBtn.addEventListener('click', () => {
            this.tagEditorUI.showCreateTagModal();
        });
    }

    /**
     * Load all tags into the manager
     */
    async loadTags() {
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
                this.tagEditorUI.showEditTagModal(tagName);
            });

            this.tagsManagerList.appendChild(tagElement);
        }
    }
}

// Export as a global to use in app.js
window.TagManagerUI = TagManagerUI;