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

    // Initialize authentication and Drive services
    window.userService = new UserService();
    window.driveService = new DriveService(window.userService);

    // Connect database with auth and drive services
    window.db.setServices(window.userService, window.driveService);

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

    // Initialize the account UI component
    window.accountUI = new AccountUI(window.userService, window.db);

    // Register global callback for tag changes
    window.onTagsChanged = async function () {
        await window.noteUI.loadNotes();
    };

    // Register global callback for authentication state changes
    window.onAuthStateChanged = async function (authState) {
        if (authState.isAuthenticated) {
            console.log('User signed in:', authState.currentUser.email);

            // Check if we need to sync data
            const syncEnabled = await window.db.isSyncEnabled();
            if (syncEnabled) {
                // Sync data from Drive on sign-in
                await window.db.syncFromDrive();
                // Reload notes list to reflect any changes
                await window.noteUI.loadNotes();
            }
        } else {
            console.log('User signed out');
        }

        // Update account UI
        if (window.accountUI) {
            window.accountUI.updateUI();
        }
    };

    // Add auth state listener
    window.userService.addAuthStateListener(window.onAuthStateChanged);

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

        // Try to silent authenticate on startup
        await window.userService.authenticate(false);

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
        modalManager.register('appearance-manager-modal');

        // Register modals for Google integration
        modalManager.register('login-modal');
        modalManager.register('sync-settings-modal');
    }

    /**
     * Initialize utility buttons in the sidebar
     */
    function initUtilityButtons() {
        // Tags manager button
        const tagsManagerButton = document.getElementById('tags-manager-button');
        if (tagsManagerButton) {
            tagsManagerButton.addEventListener('click', () => {
                modalManager.open('tags-manager-modal');
                window.tagUI.loadTagsManager();
            });
        }

        // Open in browser button
        const openExtensionButton = document.getElementById('open-extension-button');
        if (openExtensionButton) {
            openExtensionButton.addEventListener('click', openExtensionInBrowser);
        }

        // Add tag button inside Tags Manager modal
        const addTagManagerBtn = document.getElementById('add-tag-manager-btn');
        if (addTagManagerBtn) {
            addTagManagerBtn.addEventListener('click', () => {
                modalManager.closeActiveModal(); // Close tags manager modal
                window.tagUI.showCreateTagModal(); // Open create tag modal
            });
        }

        // Account button
        const accountButton = document.getElementById('account-button');
        if (accountButton) {
            accountButton.addEventListener('click', () => {
                if (window.userService.isUserAuthenticated()) {
                    modalManager.open('sync-settings-modal');
                    if (window.accountUI) {
                        window.accountUI.loadSyncSettings();
                    }
                } else {
                    modalManager.open('login-modal');
                }
            });
        }
    }

    /**
     * Open extension in a separate browser window
     */
    function openExtensionInBrowser() {
        const extensionUrl = chrome.runtime.getURL('index.html?fullwindow=true');
        chrome.tabs.create({ url: extensionUrl });
    }
});