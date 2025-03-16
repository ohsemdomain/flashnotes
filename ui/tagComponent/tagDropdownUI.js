// ui/tagComponent/tagDropdownUI.js
/**
 * Tag Dropdown UI
 * 
 * Handles the tag dropdown interface including:
 * - Opening and closing the dropdown
 * - Loading tags into the dropdown
 * - Tag selection and application to notes
 */
class TagDropdownUI {
    /**
     * Initialize the tag dropdown UI
     * @param {TagService} tagService - The tag service instance
     * @param {Function} onTagToggled - Callback for when a tag is toggled
     */
    constructor(tagService, onTagToggled) {
        this.tagService = tagService;
        this.onTagToggled = onTagToggled || function () { };
        this.currentNote = null;

        this.initElements();
        this.initEventListeners();
    }

    /**
     * Initialize DOM elements
     */
    initElements() {
        this.tagButton = document.getElementById('tag-button');
        this.tagDropdown = document.getElementById('tag-dropdown');
        this.tagsDropdownList = document.getElementById('tags-dropdown-list');
        this.manageTagsBtn = document.getElementById('manage-tags-btn');
    }

    /**
     * Set up event listeners
     */
    initEventListeners() {
        // Tag dropdown toggle
        this.tagButton.addEventListener('click', () => this.toggleDropdown());

        // Manage tags button
        this.manageTagsBtn.addEventListener('click', () => {
            this.closeDropdown();
            modalManager.open('tags-manager-modal');
            window.tagManagerUI.loadTags();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#tag-button') && !e.target.closest('#tag-dropdown')) {
                this.closeDropdown();
            }
        });

        // Handle window resize for dropdown positioning
        window.addEventListener('resize', () => {
            if (this.tagDropdown.classList.contains('active')) {
                this.positionDropdown();
            }
        });
    }

    /**
     * Set the current note
     * @param {Object} note - The current note
     */
    setCurrentNote(note) {
        this.currentNote = note;
    }

    /**
     * Toggle the dropdown visibility
     */
    toggleDropdown() {
        if (this.tagDropdown.classList.contains('active')) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    /**
     * Open the dropdown and load tags
     */
    async openDropdown() {
        // Close any other open dropdowns
        document.querySelectorAll('.dropdown-menu').forEach(dropdown => {
            if (dropdown !== this.tagDropdown) {
                dropdown.classList.remove('active');
            }
        });

        // Load tags into dropdown
        await this.loadTags();

        // Position the dropdown properly
        this.positionDropdown();

        // Show dropdown
        this.tagDropdown.classList.add('active');
    }

    /**
     * Close the dropdown
     */
    closeDropdown() {
        this.tagDropdown.classList.remove('active');
    }

    /**
     * Position the dropdown correctly
     */
    positionDropdown() {
        TagHelper.positionDropdown(this.tagButton, this.tagDropdown);
    }

    /**
     * Load tags into the dropdown
     */
    async loadTags() {
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

                // Get text color based on background brightness
                const textColor = TagHelper.getTextColorForBackground(tag.color);

                tagElement.innerHTML = `
                    <div class="tag-color-dot" style="background-color: ${tag.color}"></div>
                    <span>${tag.name}</span>
                `;

                // Highlight if tag is applied to current note
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
     * Toggle a tag on the current note
     * @param {string} tagName - The tag name to toggle
     */
    async toggleTagOnNote(tagName) {
        if (!this.currentNote) return;

        const tagIndex = this.currentNote.tags.indexOf(tagName);
        let updatedNote;

        if (tagIndex === -1) {
            // Add tag to note
            updatedNote = await this.tagService.addTagToNote(this.currentNote.id, tagName);
        } else {
            // Remove tag from note
            updatedNote = await this.tagService.removeTagFromNote(this.currentNote.id, tagName);
        }

        // Update current note reference
        this.currentNote = updatedNote;

        // Refresh the dropdown
        await this.loadTags();

        // Notify parent component
        this.onTagToggled(updatedNote);
    }
}

// Export as a global to use in app.js
window.TagDropdownUI = TagDropdownUI;