// /js/ui/accountUI.js
/**
 * Account UI
 * 
 * Handles all account-related UI functionality, including:
 * - Login and logout UI
 * - User profile display
 * - Google Drive sync settings
 * - Google Drive backup and restore UI
 * 
 * This component manages all user interactions with Google account features
 * and communicates with the UserService and database for account operations.
 */
class AccountUI {
    /**
     * Initialize the account UI manager
     * @param {UserService} userService - The user service instance
     * @param {NoteDatabase} db - The database instance
     */
    constructor(userService, db) {
        this.userService = userService;
        this.db = db;

        this.initElements();
        this.initEventListeners();
        this.updateUI();
    }

    /**
     * Initialize DOM elements
     */
    initElements() {
        // Sidebar account elements
        this.accountButton = document.getElementById('account-button');
        this.accountIcon = document.getElementById('account-icon');
        this.accountStatus = document.getElementById('account-status');

        // Login modal elements
        this.loginButton = document.getElementById('login-button');

        // Sync settings modal elements
        this.profileSection = document.getElementById('profile-section');
        this.profilePicture = document.getElementById('profile-picture');
        this.profileName = document.getElementById('profile-name');
        this.profileEmail = document.getElementById('profile-email');
        this.signOutButton = document.getElementById('sign-out-button');

        this.syncToggle = document.getElementById('sync-toggle');
        this.lastSyncTime = document.getElementById('last-sync-time');
        this.syncNowButton = document.getElementById('sync-now-button');

        // Google Drive backup elements (now in sync settings modal)
        this.backupGoogleDrive = document.getElementById('backup-google-drive');
        this.restoreGoogleDrive = document.getElementById('restore-google-drive');
    }

    /**
     * Set up event listeners for account-related functionality
     */
    initEventListeners() {
        // Login modal
        if (this.loginButton) {
            this.loginButton.addEventListener('click', () => this.login());
        }

        // Sign out button
        if (this.signOutButton) {
            this.signOutButton.addEventListener('click', () => this.signOut());
        }

        // Sync toggle
        if (this.syncToggle) {
            this.syncToggle.addEventListener('change', () => this.toggleSync());
        }

        // Sync now button
        if (this.syncNowButton) {
            this.syncNowButton.addEventListener('click', () => this.syncNow());
        }

        // Backup to Google Drive
        if (this.backupGoogleDrive) {
            this.backupGoogleDrive.addEventListener('click', () => this.backupToDrive());
        }

        // Restore from Google Drive
        if (this.restoreGoogleDrive) {
            this.restoreGoogleDrive.addEventListener('click', () => this.restoreFromDrive());
        }
    }

    /**
     * Update the UI based on current authentication state
     */
    async updateUI() {
        const isAuthenticated = this.userService.isUserAuthenticated();
        const currentUser = this.userService.getCurrentUser();

        // Update account button in sidebar
        if (this.accountButton) {
            if (isAuthenticated && currentUser) {
                // Show user picture
                this.accountIcon.innerHTML = `
                    <img src="${currentUser.picture}" alt="${currentUser.name}" class="user-picture">
                `;
                this.accountStatus.textContent = 'Account';
            } else {
                // Show login icon
                this.accountIcon.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                `;
                this.accountStatus.textContent = 'Sign In';
            }
        }

        // Update profile section in sync settings modal
        if (this.profileSection) {
            if (isAuthenticated && currentUser) {
                // Show user profile
                this.profilePicture.src = currentUser.picture;
                this.profileName.textContent = currentUser.name;
                this.profileEmail.textContent = currentUser.email;
                this.profileSection.style.display = 'block';
            } else {
                this.profileSection.style.display = 'none';
            }
        }

        // Update backup options in sync settings modal
        await this.loadBackupOptions();
    }

    /**
     * Handle user login
     */
    async login() {
        try {
            const token = await this.userService.authenticate(true);
            if (token) {
                console.log('Successfully logged in');
                modalManager.closeActiveModal();

                // Open sync settings modal after successful login
                modalManager.open('sync-settings-modal');
                this.loadSyncSettings();
            }
        } catch (error) {
            console.error('Login error:', error);
            // Show error message to user
            alert('Failed to sign in. Please try again.');
        }
    }

    /**
     * Handle user sign out
     */
    async signOut() {
        try {
            await this.userService.signOut();
            console.log('Successfully signed out');
            modalManager.closeActiveModal();

            // Update UI
            this.updateUI();
        } catch (error) {
            console.error('Sign out error:', error);
            alert('Failed to sign out. Please try again.');
        }
    }

    /**
     * Toggle Google Drive sync
     */
    async toggleSync() {
        const enabled = this.syncToggle.checked;

        try {
            // If enabling sync and not authenticated, try to authenticate
            if (enabled && !this.userService.isUserAuthenticated()) {
                const token = await this.userService.authenticate(true);
                if (!token) {
                    this.syncToggle.checked = false;
                    return;
                }
            }

            // Update sync setting
            await this.db.setSyncEnabled(enabled);

            // Update UI
            this.loadSyncSettings();

            // If enabling, do initial sync
            if (enabled) {
                await this.syncNow();
            }
        } catch (error) {
            console.error('Error toggling sync:', error);
            // Revert toggle state
            this.syncToggle.checked = !enabled;
            alert('Failed to update sync settings. Please try again.');
        }
    }

    /**
     * Trigger a manual sync
     */
    async syncNow() {
        if (!this.userService.isUserAuthenticated()) {
            alert('Please sign in to sync with Google Drive.');
            return;
        }

        try {
            this.syncNowButton.disabled = true;
            this.syncNowButton.textContent = 'Syncing...';

            const success = await this.db.forceSync();

            this.syncNowButton.disabled = false;
            this.syncNowButton.textContent = 'Sync Now';

            if (success) {
                // Update sync status
                this.loadSyncSettings();

                // Reload notes to reflect changes
                if (window.noteUI) {
                    await window.noteUI.loadNotes();
                }
            } else {
                alert('Sync failed. Please try again.');
            }
        } catch (error) {
            console.error('Sync error:', error);
            this.syncNowButton.disabled = false;
            this.syncNowButton.textContent = 'Sync Now';
            alert('Sync failed. Please try again.');
        }
    }

    /**
     * Load sync settings into the UI
     */
    async loadSyncSettings() {
        // Update profile section
        this.updateUI();

        // Check if sync is enabled
        const syncEnabled = await this.db.isSyncEnabled();
        if (this.syncToggle) {
            this.syncToggle.checked = syncEnabled;
        }

        // Update last sync time
        const lastSyncTime = await this.db.getLastSyncTime();
        if (this.lastSyncTime) {
            if (lastSyncTime) {
                const date = new Date(lastSyncTime);
                this.lastSyncTime.textContent = `Last synced: ${date.toLocaleString()}`;
            } else {
                this.lastSyncTime.textContent = 'Not synced yet';
            }
        }

        // Enable/disable sync now button based on auth state
        if (this.syncNowButton) {
            this.syncNowButton.disabled = !this.userService.isUserAuthenticated() || !syncEnabled;
        }

        // Enable/disable backup buttons based on auth state
        this.loadBackupOptions();
    }

    /**
     * Load backup options into the sync settings UI
     */
    async loadBackupOptions() {
        const isAuthenticated = this.userService.isUserAuthenticated();

        // Enable/disable Google Drive backup options based on auth state
        if (this.backupGoogleDrive) {
            this.backupGoogleDrive.disabled = !isAuthenticated;
        }

        if (this.restoreGoogleDrive) {
            this.restoreGoogleDrive.disabled = !isAuthenticated;
        }
    }

    /**
     * Backup notes to Google Drive
     */
    async backupToDrive() {
        if (!this.userService.isUserAuthenticated()) {
            alert('Please sign in to backup to Google Drive.');
            return;
        }

        try {
            this.backupGoogleDrive.disabled = true;
            this.backupGoogleDrive.textContent = 'Backing up...';

            // Get all data
            const notes = await this.db.getAllNotes();
            const tags = await this.db.getAllTags();
            const tagColors = {};

            // Get tag colors
            for (const tag of tags) {
                tagColors[tag] = await this.db.getTagColor(tag);
            }

            // Send to Google Drive
            const driveService = window.driveService;
            const success = await driveService.backupData(notes, tags, tagColors);

            this.backupGoogleDrive.disabled = false;
            this.backupGoogleDrive.textContent = 'Backup to Google Drive';

            if (success) {
                alert('Backup successful!');
            } else {
                alert('Backup failed. Please try again.');
            }
        } catch (error) {
            console.error('Backup error:', error);
            this.backupGoogleDrive.disabled = false;
            this.backupGoogleDrive.textContent = 'Backup to Google Drive';
            alert('Backup failed. Please try again.');
        }
    }

    /**
     * Restore notes from Google Drive
     */
    async restoreFromDrive() {
        if (!this.userService.isUserAuthenticated()) {
            alert('Please sign in to restore from Google Drive.');
            return;
        }

        if (!confirm('This will replace your current notes with the ones from Google Drive. Continue?')) {
            return;
        }

        try {
            this.restoreGoogleDrive.disabled = true;
            this.restoreGoogleDrive.textContent = 'Restoring...';

            // Get data from Google Drive
            const driveService = window.driveService;
            const backupData = await driveService.restoreData();

            if (!backupData) {
                alert('No backup found on Google Drive.');
                this.restoreGoogleDrive.disabled = false;
                this.restoreGoogleDrive.textContent = 'Restore from Google Drive';
                return;
            }

            // Get current data
            const currentData = await this.db.getData();

            // Create merged data
            const mergedData = {
                notes: backupData.notes || [],
                tags: backupData.tags || [],
                tagColors: backupData.tagColors || {},
                lastId: Math.max(currentData.lastId, ...backupData.notes.map(n => n.id)),
                syncEnabled: currentData.syncEnabled,
                lastSyncTime: new Date().toISOString()
            };

            // Save to database
            await this.db.setData(mergedData);

            this.restoreGoogleDrive.disabled = false;
            this.restoreGoogleDrive.textContent = 'Restore from Google Drive';

            // Reload notes
            if (window.noteUI) {
                await window.noteUI.loadNotes();
            }

            alert('Restore successful!');
        } catch (error) {
            console.error('Restore error:', error);
            this.restoreGoogleDrive.disabled = false;
            this.restoreGoogleDrive.textContent = 'Restore from Google Drive';
            alert('Restore failed. Please try again.');
        }
    }
}

// Export as a global to use in app.js
window.AccountUI = AccountUI;