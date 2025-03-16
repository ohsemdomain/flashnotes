// /js/app.js
/**
 * Flash Notes Extension
 * Main Application Script
 * 
 * This script initializes the Flash Notes application, creating instances of
 * the necessary services and UI components, and orchestrating their interactions.
 * It serves as the main entry point and controller for the application.
 */

document.addEventListener('DOMContentLoaded', async () => {
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
    window.accountUI = new AccountUI(window.userService, window.db);

    // Register global callback for tag changes
    window.onTagsChanged = async function () {
        await window.noteUI.loadNotes();
    };

    // Register modals
    registerModals();

    // Set up event listeners
    setupEventListeners();

    // Make a fast initial UI decision based on local auth data
    // This avoids the flashing by showing the right screen first
    const hasLocalAuth = await checkLocalAuthData();

    // First show the appropriate screen based on local data
    if (hasLocalAuth) {
        // User was previously authenticated - show app first
        showApp();
    } else {
        // No previous auth - show welcome screen first
        showWelcomeScreen();
    }

    // Initialize app with silent authentication as needed
    try {
        // Now check actual authentication status with the server
        const isAuthenticated = await window.userService.authenticate(false);

        if (isAuthenticated) {
            // If authentication succeeds, ensure app is shown and initialize it
            showApp();
            await initializeAuthenticatedApp();
        } else {
            // If authentication fails, ensure welcome screen is shown
            showWelcomeScreen();
        }
    } catch (error) {
        console.error('Authentication error:', error);
        // Show welcome screen on error
        showWelcomeScreen();
    }
});

/**
 * Check if local authentication data exists
 * @returns {Promise<boolean>} Whether local auth data exists
 */
async function checkLocalAuthData() {
    return new Promise(resolve => {
        chrome.storage.local.get('userAuthData', (result) => {
            resolve(!!result.userAuthData);
        });
    });
}

/**
 * Set up all event listeners for the application
 */
function setupEventListeners() {
    // Set up welcome screen sign-in button
    const welcomeSignInButton = document.getElementById('welcome-signin-button');
    if (welcomeSignInButton) {
        welcomeSignInButton.addEventListener('click', async () => {
            try {
                // Temporarily disable the button to prevent multiple clicks
                welcomeSignInButton.disabled = true;
                welcomeSignInButton.textContent = 'Signing in...';

                // Authenticate with interactive mode
                const isAuthenticated = await window.userService.authenticate(true);

                if (isAuthenticated) {
                    // If authentication succeeds, show app and initialize
                    showApp();
                    await initializeAuthenticatedApp();
                } else {
                    // If authentication fails, keep welcome screen shown
                    welcomeSignInButton.disabled = false;
                    welcomeSignInButton.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="18" height="18"> Sign in with Google';
                }
            } catch (error) {
                console.error('Error during authentication:', error);
                welcomeSignInButton.disabled = false;
                welcomeSignInButton.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="18" height="18"> Sign in with Google';
            }
        });
    }

    // Add auth state listener
    window.userService.addAuthStateListener(async (authState) => {
        if (authState.isAuthenticated) {
            // User is authenticated
            showApp();

            // Only initialize app if we're coming from the welcome screen
            // to avoid duplicate initialization
            if (document.getElementById('welcome-screen').style.display !== 'none') {
                await initializeAuthenticatedApp();
            }
        } else {
            // User is signed out
            showWelcomeScreen();
        }

        // Update account UI
        if (window.accountUI) {
            window.accountUI.updateUI();
        }
    });

    // Initialize utility buttons
    initUtilityButtons();
}

/**
 * Initialize the app after successful authentication
 */
async function initializeAuthenticatedApp() {
    try {
        console.log('Initializing authenticated app...');

        // Check for backup from Drive
        const backupRestored = await checkAndRestoreBackup();
        console.log('Backup check complete, restored:', backupRestored);

        // Load notes from local database
        await window.noteUI.loadNotes();

        // Select first note or create default
        await selectFirstNoteOrCreateDefault();

        // Schedule background tasks
        setTimeout(performBackgroundTasks, 2000);
    } catch (error) {
        console.error('Error initializing authenticated app:', error);
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
function showWelcomeScreen() {
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
 * Check for backup and restore if needed
 * @returns {Promise<boolean>} Whether backup was restored
 */
async function checkAndRestoreBackup() {
    try {
        // Check if Drive service is initialized
        if (!window.driveService) {
            console.error('Drive service not initialized');
            return false;
        }

        // Check if we already have data locally
        const data = await window.db.getData();
        const hasLocalNotes = data && data.notes && data.notes.length > 0;

        // If we already have local notes and backup info, don't restore automatically
        if (hasLocalNotes && data.lastBackupTime) {
            console.log('Local notes already exist, skipping automatic backup restoration');
            return false;
        }

        // Ensure Drive service is initialized
        const initResult = await window.driveService.initialize();
        if (!initResult) {
            console.error('Failed to initialize Drive service');
            return false;
        }

        console.log('Checking for existing backup on Drive...');
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
            return false;
        }
    } catch (error) {
        console.error('Error checking for backup:', error);
        return false;
    }
}

/**
 * Select the first note or create a default one if none exists
 */
async function selectFirstNoteOrCreateDefault() {
    // Get notes to check if we need to create a default note
    const notes = await window.noteUI.noteService.getAllNotes();

    // If no notes exist, create a default one
    if (notes.length === 0) {
        console.log('No notes found, creating default welcome note...');
        const newNote = await window.noteUI.noteService.createNote(
            "Welcome to Flash Notes",
            "Start taking notes with Flash Notes! Your notes are saved automatically and backed up to Google Drive."
        );
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
    try {
        // Check if daily backup is needed
        await checkDailyBackup();
    } catch (error) {
        console.error('Error in background tasks:', error);
    }
}

/**
 * Check if we need to perform a daily backup
 */
async function checkDailyBackup() {
    try {
        // Skip if not authenticated
        if (!window.userService.isUserAuthenticated()) {
            return;
        }

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
    } catch (error) {
        console.error('Error checking daily backup:', error);
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
        accountButton.addEventListener('click', async () => {
            if (window.userService.isUserAuthenticated()) {
                modalManager.open('backup-settings-modal');
                if (window.accountUI) {
                    await window.accountUI.loadBackupSettings();
                }
            } else {
                // If not authenticated, try to authenticate
                try {
                    // Temporarily disable button to avoid multiple clicks
                    accountButton.disabled = true;

                    const isAuthenticated = await window.userService.authenticate(true);

                    accountButton.disabled = false;

                    if (!isAuthenticated) {
                        showWelcomeScreen();
                    }
                } catch (error) {
                    console.error('Authentication error:', error);
                    accountButton.disabled = false;
                    showWelcomeScreen();
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