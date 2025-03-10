// app.js
document.addEventListener('DOMContentLoaded', () => {
    const db = new NoteDatabase();
    let currentNote = null;
    let saveTimeout;

    // DOM elements
    const notesList = document.getElementById('notes-list');
    const noteTitle = document.getElementById('note-title');
    const noteContent = document.getElementById('note-content');
    const searchInput = document.getElementById('search-notes');
    const saveStatus = document.getElementById('save-status');

    // Format buttons
    const formatBoldBtn = document.getElementById('format-bold');
    const formatItalicBtn = document.getElementById('format-italic');
    const formatUnderlineBtn = document.getElementById('format-underline');
    const formatListBtn = document.getElementById('format-list');

    // Action buttons
    const newNoteBtn = document.getElementById('new-note');
    const deleteNoteBtn = document.getElementById('delete-note-btn');
    const settingsButton = document.getElementById('settings-button');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    // Tab elements
    const tabButtons = document.querySelectorAll('.tab-button');

    // Initialize the tag manager
    tagManager = new TagManager(db);

    // Initialize the app
    initApp();

    // Define callback for tag changes
    window.onTagsChanged = async function () {
        await loadNotes();
    };

    async function initApp() {
        // Register modals
        modalManager.register('settings-modal');
        modalManager.register('delete-confirm-modal');
        modalManager.register('create-tag-modal');
        modalManager.register('edit-tag-modal');

        await loadNotes();

        // If there are no notes, create a default one
        const notes = await db.getAllNotes();
        if (notes.length === 0) {
            const newNote = await db.createNote();
            await loadNotes();
            await selectNote(newNote.id);
        } else {
            // Select the first note
            await selectNote(notes[0].id);
        }

        // Set up event listeners
        setupEventListeners();

        // Set initial save status
        updateSaveStatus('idle');
    }

    async function loadNotes() {
        const query = searchInput.value.trim();
        const notes = await db.searchNotes(query);

        notesList.innerHTML = '';

        for (const note of notes) {
            const noteElement = document.createElement('div');
            noteElement.className = 'note-item';
            noteElement.dataset.id = note.id;

            if (currentNote && currentNote.id === note.id) {
                noteElement.classList.add('active');
            }

            // Get title from the first line of content or use "Untitled Note"
            const title = note.title || 'Untitled Note';
            
            const updatedDate = new Date(note.updatedAt);
            const day = String(updatedDate.getDate()).padStart(2, '0');
            const month = String(updatedDate.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
            const year = updatedDate.getFullYear();
            const date = `${day}.${month}.${year}`;

            let tagsHTML = '';
            for (const tagName of note.tags) {
                const tagColor = await db.getTagColor(tagName);
                tagsHTML += `<span class="tag-dot" style="background-color: ${tagColor}"></span>`;
            }

            noteElement.innerHTML = `
  <h3>${title}</h3>
  <div class="note-item-footer">
    <small class="note-date">${date}</small>
    <div class="note-tags-dots">${tagsHTML}</div>
  </div>
`;

            noteElement.addEventListener('click', () => selectNote(note.id));
            notesList.appendChild(noteElement);
        }
    }

    async function selectNote(id) {
        const note = await db.getNoteById(id);
        if (!note) return;

        currentNote = note;

        // Update UI
        noteTitle.innerHTML = note.title || '';
        noteContent.innerHTML = note.content || '';

        // Handle empty content
        if (!note.title) {
            noteTitle.innerHTML = '';
        }

        if (!note.content) {
            noteContent.innerHTML = '';
        }

        // Highlight the selected note
        const noteItems = notesList.querySelectorAll('.note-item');
        noteItems.forEach(item => {
            if (parseInt(item.dataset.id) === id) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update tag manager with current note
        tagManager.setCurrentNote(note);

        // Update save status
        updateSaveStatus('idle');
    }

    async function saveCurrentNote() {
        if (!currentNote) return;

        // Set saving status
        updateSaveStatus('saving');

        const updatedNote = await db.updateNote(currentNote.id, {
            title: noteTitle.textContent.trim(),
            content: noteContent.innerHTML
        });

        currentNote = updatedNote;
        await loadNotes();

        // Show saved status
        updateSaveStatus('saved');

        // After 2 seconds, change to idle status
        setTimeout(() => {
            updateSaveStatus('idle');
        }, 2000);
    }

    // Apply format
    function applyFormat(command, value = null) {
        document.execCommand(command, false, value);
        // Focus back on the content area
        noteContent.focus();
    }

    // Update the save status indicator
    function updateSaveStatus(status) {
        // Remove any existing classes
        saveStatus.classList.remove('saving', 'saved', 'idle');

        // Add the appropriate class
        saveStatus.classList.add(status);

        // Update the text based on status
        switch (status) {
            case 'saving':
                saveStatus.textContent = 'Saving...';
                break;
            case 'saved':
                saveStatus.textContent = 'All changes saved';
                break;
            case 'idle':
                saveStatus.textContent = 'All changes saved';
                break;
        }
    }

    async function createNewNote() {
        const newNote = await db.createNote();
        await loadNotes();
        await selectNote(newNote.id);

        // Focus on the title area
        noteTitle.focus();
    }

    function showDeleteConfirmation() {
        if (!currentNote) return;
        modalManager.open('delete-confirm-modal');
    }

    async function deleteCurrentNote() {
        if (!currentNote) return;

        await db.deleteNote(currentNote.id);

        const notes = await db.getAllNotes();
        await loadNotes();

        if (notes.length > 0) {
            await selectNote(notes[0].id);
        } else {
            // Clear the editor if no notes left
            currentNote = null;
            noteTitle.innerHTML = '';
            noteContent.innerHTML = '';
            tagManager.setCurrentNote(null);
            updateSaveStatus('idle');
        }

        // Close the delete confirmation modal
        modalManager.closeActiveModal();
    }

    function showSettingsModal() {
        tagManager.showSettingsModal();
    }

    function setupEventListeners() {
        // Format buttons
        formatBoldBtn.addEventListener('click', () => applyFormat('bold'));
        formatItalicBtn.addEventListener('click', () => applyFormat('italic'));
        formatUnderlineBtn.addEventListener('click', () => applyFormat('underline'));
        formatListBtn.addEventListener('click', () => applyFormat('insertUnorderedList'));

        // Button clicks
        newNoteBtn.addEventListener('click', createNewNote);
        deleteNoteBtn.addEventListener('click', showDeleteConfirmation);
        confirmDeleteBtn.addEventListener('click', deleteCurrentNote);
        cancelDeleteBtn.addEventListener('click', () => modalManager.closeActiveModal());
        settingsButton.addEventListener('click', showSettingsModal);

        // Tab switching
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tagManager.switchTab(button.dataset.tab);
            });
        });

        // Content change events
        noteTitle.addEventListener('input', () => {
            // Show saving status immediately when typing begins
            updateSaveStatus('saving');

            // Clear any previous timeout
            clearTimeout(saveTimeout);

            // Set a new timeout
            saveTimeout = setTimeout(saveCurrentNote, 1000);
        });

        noteContent.addEventListener('input', () => {
            // Show saving status immediately when typing begins
            updateSaveStatus('saving');

            // Clear any previous timeout
            clearTimeout(saveTimeout);

            // Set a new timeout
            saveTimeout = setTimeout(saveCurrentNote, 1000);
        });

        // Handle Enter key in title to move to content
        noteTitle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                noteContent.focus();
            }
        });

        // Search functionality
        searchInput.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(loadNotes, 300);
        });

        // Format keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                applyFormat('bold');
                e.preventDefault();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
                applyFormat('italic');
                e.preventDefault();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
                applyFormat('underline');
                e.preventDefault();
            }
        });
    }
});