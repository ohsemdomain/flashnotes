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

            // Process authentication and check for backup
            await handleUserAuthenticated();
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
                    .then(async (isAuthenticated) => {
                        if (isAuthenticated) {
                            // After authentication, check for backup first before loading UI
                            showApp();
                            await handleUserAuthenticated();
                        }
                    })
                    .catch(error => {
                        console.error('Authentication error:', error);
                    });
            });
        }

        // Try to silent authenticate on startup
        try {
            const isAuthenticated = await window.userService.authenticate(false);

            if (isAuthenticated) {
                // User is authenticated, show the app
                showApp();
                // No need to call handleUserAuthenticated() here since the auth state listener will trigger
            } else {
                // User is not authenticated, show welcome screen
                hideApp();
            }
        } catch (error) {
            console.error('Silent auth error:', error);
            hideApp();
        }

        // Initialize utility buttons
        initUtilityButtons();
    }

    /**
     * Handle all actions needed after successful authentication
     */
    async function handleUserAuthenticated() {
        try {
            console.log('Handling user authentication and checking for backup...');

            // Check for backup first before loading notes
            const hasBackup = await checkForBackup();

            if (hasBackup) {
                // If backup was restored, just load notes without creating default content
                console.log('Backup was restored, loading notes from local DB...');
                await window.noteUI.loadNotes();

                // Select the first note if available
                const notes = await noteService.getAllNotes();
                if (notes.length > 0) {
                    await window.noteUI.selectNote(notes[0].id);
                }
            } else {
                // No backup found, initialize app UI normally
                console.log('No backup was restored, initializing app UI...');
                await initializeAppUIFast();
            }

            // Schedule background tasks
            setTimeout(() => {
                performBackgroundTasks();
            }, 2000);
        } catch (error) {
            console.error('Error handling authenticated user:', error);
            // Fallback to normal initialization if there's an error
            await initializeAppUIFast();
        }
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
     * Fast initialization of the app UI - prioritizes local data loading
     */
    async function initializeAppUIFast() {
        // Load notes immediately from local storage
        await window.noteUI.loadNotes();

        // Get notes to check if we need to create a default note
        const notes = await noteService.getAllNotes();

        // If no notes exist, create a default one
        if (notes.length === 0) {
            console.log('No notes found, creating default welcome note...');
            const newNote = await noteService.createNote("Welcome to Flash Notes", "Start taking notes with Flash Notes! Your notes are saved automatically and backed up to Google Drive.");
            await window.noteUI.loadNotes();
            await window.noteUI.selectNote(newNote.id);
        } else {
            // Select the first note
            await window.noteUI.selectNote(notes[0].id);
        }
    }

    /**
     * Perform background tasks after UI is loaded
     */
    async function performBackgroundTasks() {
        // These tasks run in the background after the UI is loaded
        try {
            // Check if daily backup is needed
            await checkDailyBackup();
        } catch (error) {
            console.error('Error in background tasks:', error);
        }
    }

    /**
     * Initialize first time content after authentication
     */
    async function initializeFirstTimeContent() {
        // Create a default note for first-time users
        const notes = await noteService.getAllNotes();
        if (notes.length === 0) {
            console.log('Creating first-time welcome note...');
            await noteService.createNote("Welcome to Flash Notes", "Start taking notes with Flash Notes! Your notes are saved automatically and backed up to Google Drive.");
        }
    }

    /**
     * Check if there's a backup on Drive and restore it if needed
     * @returns {Promise<boolean>} True if backup was found and restored
     */
    async function checkForBackup() {
        try {
            // Check if Drive service is initialized
            if (!window.driveService) {
                console.error('Drive service not initialized');
                return false;
            }

            console.log('Checking for existing backup on Drive...');

            // Ensure Drive service is initialized
            const initResult = await window.driveService.initialize();
            if (!initResult) {
                console.error('Failed to initialize Drive service');
                return false;
            }

            // Check if we already have data locally
            const data = await window.db.getData();
            const hasLocalNotes = data && data.notes && data.notes.length > 0;

            // If it's not the first run and we already have local notes, don't overwrite with backup
            // unless explicitly requested by user (this prevents accidental data loss)
            if (hasLocalNotes && data.lastBackupTime) {
                console.log('Local notes already exist, skipping automatic backup restoration');
                return false;
            }

            const backupExists = await window.driveService.checkBackupExists();

            if (backupExists) {
                console.log('Backup found on Drive, restoring...');
                const success = await window.db.restoreFromDrive();

                if (success) {
                    console.log('Backup restored successfully');
                    return true;
                } else {
                    console.error('Failed to restore backup');
                    return false;
                }
            } else {
                console.log('No backup found on Drive');
                // Initialize with default content for first-time users
                await initializeFirstTimeContent();
                return false;
            }
        } catch (error) {
            console.error('Error checking for backup:', error);
            return false;
        }
    }

    /**
     * Check if we need to perform a daily backup
     * This runs in the background after UI is loaded
     */
    async function checkDailyBackup() {
        const lastBackupTime = await window.db.getLastBackupTime();

        if (!lastBackupTime) {
            // No backup yet, perform initial backup
            console.log('No previous backup found, creating initial backup...');
            await window.db.backupToDrive();
            return;
        }

        const lastBackupDate = new Date(lastBackupTime);
        const currentDate = new Date();

        // Check if the last backup was more than 24 hours ago
        if (currentDate.getTime() - lastBackupDate.getTime() > 24 * 60 * 60 * 1000) {
            // It's been more than a day, perform backup
            console.log('Daily backup needed, running in background...');
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
                } else {
                    // If not authenticated, try to authenticate
                    window.userService.authenticate(true);
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