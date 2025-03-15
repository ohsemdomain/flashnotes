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

            // Show the app and hide the welcome screen
            showApp();

            // Initialize the application UI
            await initializeAppUI();
        } else {
            console.log('User signed out');

            // Show the welcome screen and hide the app
            hideApp();
        }

        // Update account UI
        if (window.accountUI) {
            window.accountUI.updateUI();
        }
    };

    // Add auth state listener
    window.userService.addAuthStateListener(window.onAuthStateChanged);

    // Initialize the authentication flow
    initAuthFlow();

    /**
     * Initialize the authentication flow
     */
    async function initAuthFlow() {
        // Register modals
        registerModals();

        // Add welcome screen sign-in button listener
        const welcomeSignInButton = document.getElementById('welcome-signin-button');
        if (welcomeSignInButton) {
            welcomeSignInButton.addEventListener('click', () => {
                window.userService.authenticate(true)
                    .catch(error => {
                        console.error('Authentication error:', error);
                    });
            });
        }

        // Try to silent authenticate on startup
        const isAuthenticated = await window.userService.authenticate(false);

        if (isAuthenticated) {
            // User is authenticated, show the app
            showApp();
            await initializeAppUI();
        } else {
            // User is not authenticated, show welcome screen
            hideApp();
        }

        // Initialize utility buttons
        initUtilityButtons();
    }

    /**
     * Show the main app and hide the welcome screen
     */
    function showApp() {
        const welcomeScreen = document.getElementById('welcome-screen');
        const appContainer = document.getElementById('app-container');

        if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
        }

        if (appContainer) {
            appContainer.style.display = 'flex';
        }
    }

    /**
     * Hide the main app and show the welcome screen
     */
    function hideApp() {
        const welcomeScreen = document.getElementById('welcome-screen');
        const appContainer = document.getElementById('app-container');

        if (welcomeScreen) {
            welcomeScreen.style.display = 'flex';
        }

        if (appContainer) {
            appContainer.style.display = 'none';
        }
    }

    /**
     * Initialize the app UI once authenticated
     */
    async function initializeAppUI() {
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

        // Check if we need to perform a daily backup
        await checkDailyBackup();
    }

    /**
     * Check if we need to perform a daily backup
     */
    async function checkDailyBackup() {
        const lastBackupTime = await window.db.getLastBackupTime();

        if (!lastBackupTime) {
            // No backup yet, perform initial backup
            await window.db.backupToDrive();
            return;
        }

        const lastBackupDate = new Date(lastBackupTime);
        const currentDate = new Date();

        // Check if the last backup was more than 24 hours ago
        if (currentDate.getTime() - lastBackupDate.getTime() > 24 * 60 * 60 * 1000) {
            // It's been more than a day, perform backup
            await window.db.backupToDrive();
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

        // Register backup modal
        modalManager.register('backup-settings-modal');
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
                    modalManager.open('backup-settings-modal');
                    if (window.accountUI) {
                        window.accountUI.loadBackupSettings();
                    }
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