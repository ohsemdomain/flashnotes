/**
 * Note Helper
 * 
 * A collection of helper functions for note-related operations
 * including date formatting, content manipulation, UI utilities, and more.
 */

const NoteHelper = {
    /**
     * Format a date for display in the note list
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date (DD.MM.YYYY)
     */
    formatDate: function (dateString) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    },

    /**
     * Extract a title from note content if title is empty
     * @param {string} content - Note content
     * @returns {string} Extracted title or "Untitled Note"
     */
    extractTitleFromContent: function (content) {
        if (!content) return 'Untitled Note';

        // Try to get the first line of content
        const firstLine = content.split('\n')[0].trim();

        // Remove HTML tags if present
        const textOnly = firstLine.replace(/<[^>]*>/g, '');

        if (textOnly.length > 0) {
            // Limit to 30 characters
            return textOnly.length > 30 ? textOnly.substring(0, 27) + '...' : textOnly;
        }

        return 'Untitled Note';
    },

    /**
     * Create a note list item element
     * @param {Object} note - The note data
     * @param {Function} onClick - Click handler for the note item
     * @param {boolean} isActive - Whether this note is currently active
     * @param {Array} tagColors - Array of tag colors to display
     * @returns {HTMLElement} The created note item element
     */
    createNoteListItem: function (note, onClick, isActive, tagColors) {
        const noteElement = document.createElement('div');
        noteElement.className = 'note-item';
        noteElement.dataset.id = note.id;

        if (isActive) {
            noteElement.classList.add('active');
        }

        // Get title from the first line of content or use "Untitled Note"
        const title = note.title || 'Untitled Note';

        // Format date for display
        const formattedDate = this.formatDate(note.updatedAt);

        // Create HTML for tag dots
        let tagsHTML = '';
        tagColors.forEach(color => {
            tagsHTML += `<span class="tag-dot" style="background-color: ${color}"></span>`;
        });

        noteElement.innerHTML = `
        <h3>${title}</h3>
        <div class="note-item-footer">
          <small class="note-date">${formattedDate}</small>
          <div class="note-tags-dots">${tagsHTML}</div>
        </div>
      `;

        noteElement.addEventListener('click', onClick);
        return noteElement;
    },

    /**
     * Update the save status indicator
     * @param {HTMLElement} statusElement - The status element to update
     * @param {string} status - Status type ('saving', 'saved', 'idle')
     */
    updateSaveStatus: function (statusElement, status) {
        // Remove any existing classes
        statusElement.classList.remove('saving', 'saved', 'idle');

        // Add the appropriate class
        statusElement.classList.add(status);

        // Update the text based on status
        switch (status) {
            case 'saving':
                statusElement.textContent = 'Saving...';
                break;
            case 'saved':
                statusElement.textContent = 'All changes saved';
                break;
            case 'idle':
                statusElement.textContent = 'All changes saved';
                break;
        }
    },

    /**
     * Handle keydown events in the title field
     * @param {Event} event - The keydown event
     * @param {HTMLElement} contentElement - The content element to focus
     */
    handleTitleKeydown: function (event, contentElement) {
        if (event.key === 'Enter') {
            event.preventDefault();
            contentElement.focus();
        }
    },

    /**
     * Show a confirmation dialog for note deletion
     * @param {string} message - The confirmation message
     * @returns {boolean} True if confirmed, false otherwise
     */
    confirmNoteDelete: function (message = "Are you sure you want to delete this note?") {
        return confirm(message);
    }
};

// Export the helper object
window.NoteHelper = NoteHelper;