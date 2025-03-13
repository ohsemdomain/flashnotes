// /js/ui/tagUI.js
/**
 * Tag UI
 * 
 * Handles all tag-related UI functionality, including:
 * - Tag dropdown interface
 * - Tag selection and deselection
 * - Tag creation, editing, and deletion UI
 * - Tag color management UI
 * - Tag visualization on notes
 * 
 * This component manages all user interactions with tags and communicates
 * with the TagService to perform data operations.
 */
class TagUI {
    /**
     * Initialize the tag UI manager
     * @param {TagService} tagService - The tag service instance
     */
    constructor(tagService) {
        this.tagService = tagService;
        this.selectedTagColor = '#e4e4e4'; // Default tag color
        this.editingTagColor = '#e4e4e4'; // For tag editing
        this.currentNote = null;

        this.initElements();
        this.initEventListeners();
    }

    /**
     * Initialize DOM elements
     */
    initElements() {
        // Buttons and interactive elements
        this.tagButton = document.getElementById('tag-button');
        this.tagDropdown = document.getElementById('tag-dropdown');
        this.tagsDropdownList = document.getElementById('tags-dropdown-list');
        this.tagsList = document.getElementById('tags-list');
        this.tagsManagerList = document.getElementById('tags-manager-list');
        this.manageTagsBtn = document.getElementById('manage-tags-btn');
        this.addTagManagerBtn = document.getElementById('add-tag-manager-btn');

        // Modal elements
        this.newTagName = document.getElementById('new-tag-name');
        this.createTagButton = document.getElementById('create-tag-button');
        this.editTagName = document.getElementById('edit-tag-name');
        this.editTagOriginalName = document.getElementById('edit-tag-original-name');
        this.updateTagButton = document.getElementById('update-tag-button');
        this.deleteTagButton = document.getElementById('delete-tag-button');

        // Color options
        this.colorOptions = document.querySelectorAll('.tag-colors .color-option');
        this.editColorOptions = document.querySelectorAll('#edit-tag-colors .color-option');
    }

    /**
     * Set up event listeners for tag-related functionality
     */
    initEventListeners() {
        // Tag dropdown toggle
        this.tagButton.addEventListener('click', () => this.toggleTagDropdown());

        // Manage tags button
        this.manageTagsBtn.addEventListener('click', () => {
            this.closeTagDropdown();
            modalManager.open('tags-manager-modal');
            this.loadTagsManager();
        });

        // Add tag from manager
        this.addTagManagerBtn.addEventListener('click', () => this.showCreateTagModal());

        // Create tag button
        this.createTagButton.addEventListener('click', () => this.createNewTag());

        // Update tag button
        this.updateTagButton.addEventListener('click', () => this.updateTag());

        // Delete tag button
        this.deleteTagButton.addEventListener('click', () => this.deleteTag());

        // Color selection in create tag modal
        this.colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Use helper to update color selection
                TagHelper.selectColorOption(this.colorOptions, option.dataset.color);
                this.selectedTagColor = option.dataset.color;
            });
        });

        // Color selection in edit tag modal
        this.editColorOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Use helper to update color selection
                TagHelper.selectColorOption(this.editColorOptions, option.dataset.color);
                this.editingTagColor = option.dataset.color;
            });
        });

        // Modal tag name enter key
        this.newTagName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.createNewTag();
            }
        });

        this.editTagName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.updateTag();
            }
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#tag-button') && !e.target.closest('#tag-dropdown')) {
                this.closeTagDropdown();
            }
        });

        // Handle window resize for dropdown positioning
        window.addEventListener('resize', () => {
            if (this.tagDropdown.classList.contains('active')) {
                this.positionTagDropdown();
            }
        });
    }

    /**
     * Set the current note for the tag manager
     * @param {Object} note - The current note object
     */
    setCurrentNote(note) {
        this.currentNote = note;
        this.renderNoteTags();
    }

    /**
     * Toggle the tag dropdown menu
     */
    toggleTagDropdown() {
        if (this.tagDropdown.classList.contains('active')) {
            this.closeTagDropdown();
        } else {
            this.openTagDropdown();
        }
    }

    /**
     * Open the tag dropdown menu and load tags
     */
    async openTagDropdown() {
        // Close any other open dropdowns
        document.querySelectorAll('.dropdown-menu').forEach(dropdown => {
            if (dropdown !== this.tagDropdown) {
                dropdown.classList.remove('active');
            }
        });

        // Load tags into dropdown
        await this.loadTagsDropdown();

        // Position the dropdown properly
        this.positionTagDropdown();

        // Show dropdown
        this.tagDropdown.classList.add('active');
    }

    /**
     * Calculate and set the correct position for the tag dropdown
     */
    positionTagDropdown() {
        // Use the helper function to position the dropdown
        TagHelper.positionDropdown(this.tagButton, this.tagDropdown);
    }

    /**
     * Close the tag dropdown menu
     */
    closeTagDropdown() {
        this.tagDropdown.classList.remove('active');
    }

    /**
     * Load tags into the dropdown menu
     */
    async loadTagsDropdown() {
        const tags = await this.tagService.getAllTagsWithColors();
        this.tagsDropdownList.innerHTML = '';

        if (tags.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-tags-message';
            emptyMessage.textContent = 'No tags created yet.';
            this.tagsDropdownList.appendChild(emptyMessage);
        } else {
            for (const tag of tags) {
                const tagElement = document.createElement('div');
                tagElement.className = 'tag-item';

                // Get text color based on background brightness using helper
                const textColor = TagHelper.getTextColorForBackground(tag.color);

                tagElement.innerHTML = `
                    <div class="tag-color-dot" style="background-color: ${tag.color}"></div>
                    <span>${tag.name}</span>
                `;

                // Check if tag is already applied to current note
                if (this.currentNote && this.currentNote.tags.includes(tag.name)) {
                    tagElement.style.backgroundColor = '#f0f8ff';
                    tagElement.style.fontWeight = 'bold';
                }

                tagElement.addEventListener('click', () => this.toggleTagOnNote(tag.name));
                this.tagsDropdownList.appendChild(tagElement);
            }
        }
    }

    /**
     * Toggle a tag on the current note (add if not present, remove if present)
     * @param {string} tagName - The tag name to toggle
     */
    async toggleTagOnNote(tagName) {
        if (!this.currentNote) return;

        const tagIndex = this.currentNote.tags.indexOf(tagName);

        if (tagIndex === -1) {
            // Add tag to note
            const updatedNote = await this.tagService.addTagToNote(this.currentNote.id, tagName);
            this.currentNote = updatedNote;
        } else {
            // Remove tag from note
            const updatedNote = await this.tagService.removeTagFromNote(this.currentNote.id, tagName);
            this.currentNote = updatedNote;
        }

        // Update UI
        this.renderNoteTags();
        this.loadTagsDropdown(); // Refresh the dropdown to show updated selections

        // Notify app.js that tags changed
        if (typeof window.onTagsChanged === 'function') {
            window.onTagsChanged();
        }
    }

    /**
     * Render the tags for the current note
     */
    async renderNoteTags() {
        this.tagsList.innerHTML = '';

        if (!this.currentNote) return;

        for (const tagName of this.currentNote.tags) {
            const tagColor = await this.tagService.getTagColor(tagName);

            // Use helper to create tag element
            const tagElement = TagHelper.createTagElement(
                tagName,
                tagColor,
                () => this.toggleTagOnNote(tagName)
            );

            this.tagsList.appendChild(tagElement);
        }
    }

    /**
     * Load tags into the tags manager
     */
    async loadTagsManager() {
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
                this.showEditTagModal(tagName);
            });

            this.tagsManagerList.appendChild(tagElement);
        }
    }

    /**
     * Show the create tag modal
     */
    showCreateTagModal() {
        // Store the current active modal (Tags Manager) before opening a new one
        modalManager.lastOpenedModal = 'tags-manager-modal';

        modalManager.open('create-tag-modal', {
            onOpen: () => {
                this.newTagName.value = '';
                this.newTagName.focus();
                this.selectedTagColor = '#e4e4e4';

                // Use helper to reset color selection
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

        // Store the current active modal (Tags Manager) before opening a new one
        modalManager.lastOpenedModal = 'tags-manager-modal';

        // Set the values before opening the modal
        this.editTagName.value = tagName;
        this.editTagOriginalName.value = tagName;
        this.editingTagColor = tagColor;

        // Now open the modal
        modalManager.open('edit-tag-modal', {
            onOpen: () => {
                // Set these values again inside the onOpen callback to ensure they're applied
                // after the modal is fully rendered
                setTimeout(() => {
                    this.editTagName.value = tagName;
                    this.editTagOriginalName.value = tagName;

                    // Use helper to select the correct color
                    TagHelper.selectColorOption(this.editColorOptions, tagColor);
                }, 50); // Small delay to ensure the modal is visible
            }
        });
    }

    /**
     * Create a new tag
     */
    async createNewTag() {
        const tagName = this.newTagName.value.trim();
        if (!tagName) return;

        // Add to global tags
        await this.tagService.addTag(tagName, this.selectedTagColor);

        // Close the create tag modal and return to tags manager
        modalManager.closeActiveModal();

        // Re-open the tags manager modal
        modalManager.open('tags-manager-modal');

        // Refresh the tags manager list
        this.loadTagsManager();

        // If dropdown was open, refresh it
        if (this.tagDropdown.classList.contains('active')) {
            this.loadTagsDropdown();
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

        // Update current note reference if needed
        if (this.currentNote && this.currentNote.tags.includes(originalName)) {
            // Get the updated note with the new tag
            const noteId = this.currentNote.id;
            this.currentNote = await window.db.getNoteById(noteId);
        }

        // Close the edit modal
        modalManager.closeActiveModal();

        // Re-open the tags manager modal
        modalManager.open('tags-manager-modal');

        // Refresh UI
        this.loadTagsManager();
        this.renderNoteTags();

        // If dropdown was open, refresh it
        if (this.tagDropdown.classList.contains('active')) {
            this.loadTagsDropdown();
        }

        // Notify app.js that tags changed
        if (typeof window.onTagsChanged === 'function') {
            window.onTagsChanged();
        }
    }

    /**
     * Delete a tag
     */
    async deleteTag() {
        const tagName = this.editTagOriginalName.value;

        // Use helper for confirmation dialog
        if (TagHelper.confirmAction(`Are you sure you want to delete the tag "${tagName}"? It will be removed from all notes.`)) {
            await this.tagService.removeTag(tagName);

            // Update current note reference if needed
            if (this.currentNote && this.currentNote.tags.includes(tagName)) {
                const noteId = this.currentNote.id;
                this.currentNote = await window.db.getNoteById(noteId);
            }

            // Close the edit modal
            modalManager.closeActiveModal();

            // Re-open the tags manager modal
            modalManager.open('tags-manager-modal');

            // Refresh UI
            this.loadTagsManager();
            this.renderNoteTags();

            // If dropdown was open, refresh it
            if (this.tagDropdown.classList.contains('active')) {
                this.loadTagsDropdown();
            }

            // Notify app.js that tags changed
            if (typeof window.onTagsChanged === 'function') {
                window.onTagsChanged();
            }
        }
    }
}

// Export as a global to use in app.js
window.TagUI = TagUI;