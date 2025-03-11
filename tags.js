// tags.js - Centralizes all tag-related functionality

class TagManager {
    constructor(db) {
        this.db = db;
        this.selectedTagColor = '#e4e4e4'; // Default tag color
        this.editingTagColor = '#e4e4e4'; // For tag editing
        this.currentNote = null;

        this.initElements();
        this.initEventListeners();
    }

    // Initialize DOM elements
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

    // Set up event listeners for tag-related functionality
    initEventListeners() {
        // Tag dropdown toggle
        this.tagButton.addEventListener('click', () => this.toggleTagDropdown());

        // Manage tags button
        this.manageTagsBtn.addEventListener('click', () => {
            this.closeTagDropdown();
            this.showSettingsModal('tags');
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
                // Remove selected class from all options
                this.colorOptions.forEach(opt => opt.classList.remove('selected'));

                // Add selected class to clicked option
                option.classList.add('selected');

                // Update selected color
                this.selectedTagColor = option.dataset.color;
            });
        });

        // Color selection in edit tag modal
        this.editColorOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove selected class from all options
                this.editColorOptions.forEach(opt => opt.classList.remove('selected'));

                // Add selected class to clicked option
                option.classList.add('selected');

                // Update editing color
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

    // Set the current note for the tag manager
    setCurrentNote(note) {
        this.currentNote = note;
        this.renderNoteTags();
    }

    // Toggle the tag dropdown menu
    toggleTagDropdown() {
        if (this.tagDropdown.classList.contains('active')) {
            this.closeTagDropdown();
        } else {
            this.openTagDropdown();
        }
    }

    // Open the tag dropdown menu and load tags
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

    // Calculate and set the correct position for the tag dropdown
    positionTagDropdown() {
        const button = this.tagButton;
        const dropdown = this.tagDropdown;

        // Get button position
        const buttonRect = button.getBoundingClientRect();

        // Calculate initial position (below the button)
        let top = buttonRect.bottom + 5;
        let right = window.innerWidth - buttonRect.right;

        // Check if dropdown would go off the bottom of the screen
        const dropdownHeight = 300; // Max height of dropdown
        if (top + dropdownHeight > window.innerHeight) {
            // Position above the button if it would go off screen
            top = buttonRect.top - dropdownHeight - 5;
        }

        // Set the position
        dropdown.style.top = `${top}px`;
        dropdown.style.right = `${right}px`;

        // Ensure the dropdown is within the viewport
        dropdown.style.maxHeight = `${Math.min(400, window.innerHeight - top - 20)}px`;
    }

    // Close the tag dropdown menu
    closeTagDropdown() {
        this.tagDropdown.classList.remove('active');
    }

    // Load tags into the dropdown menu
    async loadTagsDropdown() {
        const tags = await this.db.getAllTagsWithColors();
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

                // Get text color based on background brightness
                const textColor = this.getTextColorForBackground(tag.color);

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

    // Toggle a tag on the current note (add if not present, remove if present)
    async toggleTagOnNote(tagName) {
        if (!this.currentNote) return;

        const tagIndex = this.currentNote.tags.indexOf(tagName);

        if (tagIndex === -1) {
            // Add tag to note
            const updatedTags = [...this.currentNote.tags, tagName];
            const updatedNote = await this.db.updateNote(this.currentNote.id, { tags: updatedTags });
            this.currentNote = updatedNote;
        } else {
            // Remove tag from note
            const updatedTags = [...this.currentNote.tags];
            updatedTags.splice(tagIndex, 1);
            const updatedNote = await this.db.updateNote(this.currentNote.id, { tags: updatedTags });
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

    // Add a specific tag to the current note
    async addTagToNote(tagName) {
        if (!this.currentNote || this.currentNote.tags.includes(tagName)) return;

        const updatedTags = [...this.currentNote.tags, tagName];
        const updatedNote = await this.db.updateNote(this.currentNote.id, { tags: updatedTags });
        this.currentNote = updatedNote;

        // Update UI
        this.renderNoteTags();

        // Notify app.js that tags changed
        if (typeof window.onTagsChanged === 'function') {
            window.onTagsChanged();
        }
    }

    // Remove a tag from the current note
    async removeTagFromNote(tagName) {
        if (!this.currentNote) return;

        const tagIndex = this.currentNote.tags.indexOf(tagName);
        if (tagIndex === -1) return;

        const updatedTags = [...this.currentNote.tags];
        updatedTags.splice(tagIndex, 1);

        const updatedNote = await this.db.updateNote(this.currentNote.id, { tags: updatedTags });
        this.currentNote = updatedNote;

        // Update UI
        this.renderNoteTags();

        // Notify app.js that tags changed
        if (typeof window.onTagsChanged === 'function') {
            window.onTagsChanged();
        }
    }

    // Render the tags for the current note
    async renderNoteTags() {
        this.tagsList.innerHTML = '';

        if (!this.currentNote) return;

        for (const tagName of this.currentNote.tags) {
            const tagColor = await this.db.getTagColor(tagName);

            const tagElement = document.createElement('div');
            tagElement.className = 'tag';
            tagElement.style.backgroundColor = tagColor;

            // Determine text color based on background brightness
            const textColor = this.getTextColorForBackground(tagColor);
            tagElement.style.color = textColor;

            tagElement.innerHTML = `<span>${tagName}</span><span class="remove-tag">×</span>`;

            tagElement.querySelector('.remove-tag').addEventListener('click', () => this.removeTagFromNote(tagName));
            this.tagsList.appendChild(tagElement);
        }
    }

    // Load tags into the tags manager
    async loadTagsManager() {
        const tags = await this.db.getAllTagsWithColors();
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

    // Show the create tag modal
    showCreateTagModal() {
        modalManager.open('create-tag-modal', {
            onOpen: () => {
                this.newTagName.value = '';
                this.newTagName.focus();
                this.selectedTagColor = '#e4e4e4';

                // Reset selected color
                this.colorOptions.forEach(option => {
                    if (option.dataset.color === this.selectedTagColor) {
                        option.classList.add('selected');
                    } else {
                        option.classList.remove('selected');
                    }
                });
            }
        });
    }

    // Show the edit tag modal
    async showEditTagModal(tagName) {
        const tagColor = await this.db.getTagColor(tagName);

        modalManager.open('edit-tag-modal', {
            onOpen: () => {
                this.editTagName.value = tagName;
                this.editTagOriginalName.value = tagName;
                this.editingTagColor = tagColor;

                // Set selected color
                this.editColorOptions.forEach(option => {
                    if (option.dataset.color === tagColor) {
                        option.classList.add('selected');
                    } else {
                        option.classList.remove('selected');
                    }
                });
            }
        });
    }

    // Show the settings modal with a specific tab active
    showSettingsModal(tabName = 'tags') {
        modalManager.open('settings-modal');
        this.loadTagsManager();
        this.switchTab(tabName);
    }

    // Switch to a different tab in the settings modal
    switchTab(tabName) {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanes = document.querySelectorAll('.tab-pane');

        // Update tab buttons
        tabButtons.forEach(button => {
            if (button.dataset.tab === tabName) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        // Update tab panes
        tabPanes.forEach(pane => {
            if (pane.id === `${tabName}-tab`) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });
    }

    // Create a new tag
    async createNewTag() {
        const tagName = this.newTagName.value.trim();
        if (!tagName) return;

        // Add to global tags
        await this.db.addTag(tagName, this.selectedTagColor);

        // Close modal
        modalManager.closeActiveModal();

        // Refresh tag lists
        this.loadTagsManager();

        // If dropdown was open, refresh it
        if (this.tagDropdown.classList.contains('active')) {
            this.loadTagsDropdown();
        }
    }

    // Update an existing tag
    async updateTag() {
        const newName = this.editTagName.value.trim();
        const originalName = this.editTagOriginalName.value;

        if (!newName) return;

        // Check if we're renaming
        if (newName !== originalName) {
            // Create new tag with the new name
            await this.db.addTag(newName, this.editingTagColor);

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
            await this.db.removeTag(originalName);

            // Update current note reference if needed
            if (this.currentNote && this.currentNote.tags.includes(originalName)) {
                const updatedNote = await this.db.getNoteById(this.currentNote.id);
                this.currentNote = updatedNote;
            }
        } else {
            // Just update the color
            await this.db.updateTagColor(originalName, this.editingTagColor);
        }

        // Close modal
        modalManager.closeActiveModal();

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

    // Delete a tag
    async deleteTag() {
        const tagName = this.editTagOriginalName.value;

        if (confirm(`Are you sure you want to delete the tag "${tagName}"? It will be removed from all notes.`)) {
            await this.db.removeTag(tagName);

            // Update current note reference if needed
            if (this.currentNote && this.currentNote.tags.includes(tagName)) {
                const updatedNote = await this.db.getNoteById(this.currentNote.id);
                this.currentNote = updatedNote;
            }

            // Close modal
            modalManager.closeActiveModal();

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

    // Calculate the brightness of a color to determine text color
    getBrightness(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);

        // Calculate brightness (perceived luminance)
        return (r * 299 + g * 587 + b * 114) / 1000;
    }

    // Get appropriate text color based on background color
    getTextColorForBackground(backgroundColor) {
        const brightness = this.getBrightness(backgroundColor);
        return brightness > 160 ? '#333' : '#fff';
    }
}

// This will be initialized in app.js
let tagManager;