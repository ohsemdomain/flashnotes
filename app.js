// /js/app.js
/**
 * Flash Notes Extension
 * Main Application Script
 * 
 * This script initializes the Flash Notes application, creating instances of
 * the necessary services and UI components, and orchestrating their interactions.
 * It serves as the main entry point and controller for the application.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize database
    window.db = new NoteDatabase();

    // Check if we're in full window mode
    checkFullWindowMode();

    // Initialize services
    const noteService = new NoteService(window.db);
    const tagService = new TagService(window.db);

    // Callback for note changes
    const onNoteChanged = async () => {
        // This function will be called when a note is changed
        // It allows propagating changes to other components if needed
    };

    // Initialize UI components
    window.noteUI = new NoteUI(noteService, onNoteChanged);
    window.formatUI = new FormatUI();
    window.tagUI = new TagUI(tagService);

    // Register global callback for tag changes
    window.onTagsChanged = async function () {
        await window.noteUI.loadNotes();
    };

    // Initialize the application
    initApp();

    /**
     * Initialize the application
     */
    async function initApp() {
        // Register modals
        registerModals();

        // Initialize utility buttons
        initUtilityButtons();

        // Load notes
        await window.noteUI.loadNotes();

        // If there are no notes, create a default one
        const notes = await noteService.getAllNotes();
        if (notes.length === 0) {
            const newNote = await noteService.createNote();
            await window.noteUI.loadNotes();
            await window.noteUI.selectNote(newNote.id);
        } else {
            // Select the first note
            await window.noteUI.selectNote(notes[0].id);
        }
    }

    /**
     * Check if we're in full window mode and apply appropriate styling
     */
    function checkFullWindowMode() {
        const urlParams = new URLSearchParams(window.location.search);
        const isFullWindow = urlParams.get('fullwindow') === 'true';

        if (isFullWindow) {
            document.body.classList.add('full-window-mode');
        }
    }

    /**
     * Register modal dialogs with the modal manager
     */
    function registerModals() {
        modalManager.register('delete-confirm-modal');
        modalManager.register('create-tag-modal');
        modalManager.register('edit-tag-modal');
        modalManager.register('tags-manager-modal');
        modalManager.register('backup-manager-modal');
        modalManager.register('appearance-manager-modal');
    }

    /**
     * Initialize utility buttons in the sidebar
     */
    function initUtilityButtons() {
        // Tags manager button
        document.getElementById('tags-manager-button').addEventListener('click', () => {
            modalManager.open('tags-manager-modal');
            window.tagUI.loadTagsManager();
        });

        // Backup manager button
        document.getElementById('backup-manager-button').addEventListener('click', () => {
            modalManager.open('backup-manager-modal');
        });

        // Appearance manager button
        document.getElementById('appearance-manager-button').addEventListener('click', () => {
            modalManager.open('appearance-manager-modal');
        });

        // Open in browser button
        document.getElementById('open-extension-button').addEventListener('click', openExtensionInBrowser);

        // Add tag button inside Tags Manager modal
        document.getElementById('add-tag-manager-btn').addEventListener('click', () => {
            modalManager.closeActiveModal(); // Close tags manager modal
            window.tagUI.showCreateTagModal(); // Open create tag modal
        });
    }

    /**
     * Open extension in a separate browser window
     */
    function openExtensionInBrowser() {
        const extensionUrl = chrome.runtime.getURL('index.html?fullwindow=true');
        chrome.tabs.create({ url: extensionUrl });
    }
});