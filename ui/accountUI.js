// /js/ui/accountUI.js
/**
 * Account UI
 * 
 * Handles all account-related UI functionality, including:
 * - Login and logout UI
 * - User profile display
 * - Google Drive backup settings
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

        // Welcome screen sign-in button
        this.welcomeSignInButton = document.getElementById('welcome-signin-button');

        // Backup settings modal elements
        this.profileSection = document.getElementById('profile-section');
        this.profilePicture = document.getElementById('profile-picture');
        this.profileName = document.getElementById('profile-name');
        this.profileEmail = document.getElementById('profile-email');
        this.signOutButton = document.getElementById('sign-out-button');

        this.lastBackupTime = document.getElementById('last-backup-time');
        this.backupNowButton = document.getElementById('backup-now-button');
    }

    /**
     * Set up event listeners for account-related functionality
     */
    initEventListeners() {
        // Welcome screen login button
        if (this.welcomeSignInButton) {
            this.welcomeSignInButton.addEventListener('click', () => this.login());
        }

        // Sign out button
        if (this.signOutButton) {
            this.signOutButton.addEventListener('click', () => this.signOut());
        }

        // Backup now button
        if (this.backupNowButton) {
            this.backupNowButton.addEventListener('click', () => this.backupNow());
        }

        // Add listener for backup state changes
        if (this.db) {
            this.db.addBackupStateListener(this.handleBackupStateChanged.bind(this));
        }
    }

    /**
     * Handle backup state changes
     * @param {Object} backupState - Backup state object
     */
    async handleBackupStateChanged(backupState) {
        this.updateBackupInfo();
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
                // Extract username from email (everything before the @)
                const email = currentUser.email;
                const username = email.split('@')[0];

                // Show status dot and username
                this.accountIcon.innerHTML = `
                    <span class="login-status-dot logged-in" title="Logged in"></span>
                `;
                this.accountStatus.textContent = username;
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

        // Update profile section in backup settings modal
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

        // Update backup info
        await this.updateBackupInfo();
    }

    /**
     * Handle user login
     */
    async login() {
        try {
            // Show logging in state
            if (this.accountIcon) {
                this.accountIcon.innerHTML = `
                    <span class="login-status-dot logging-in" title="Logging in..."></span>
                `;
                this.accountStatus.textContent = 'Logging in...';
            }

            const token = await this.userService.authenticate(true);
            if (token) {
                console.log('Successfully logged in');
            }
        } catch (error) {
            console.error('Login error:', error);

            // Show error state
            if (this.accountIcon) {
                this.accountIcon.innerHTML = `
                    <span class="login-status-dot error" title="Login failed"></span>
                `;
                this.accountStatus.textContent = 'Sign In';
            }

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
     * Trigger a manual backup
     */
    async backupNow() {
        if (!this.userService.isUserAuthenticated()) {
            alert('Please sign in to backup to Google Drive.');
            return;
        }

        try {
            this.backupNowButton.disabled = true;
            this.backupNowButton.textContent = 'Backing up...';

            const success = await this.db.backupToDrive();

            this.backupNowButton.disabled = false;
            this.backupNowButton.textContent = 'Backup Now';

            if (success) {
                // Update backup status
                this.updateBackupInfo();
                alert('Backup successful!');
            } else {
                alert('Backup failed. Please try again.');
            }
        } catch (error) {
            console.error('Backup error:', error);
            this.backupNowButton.disabled = false;
            this.backupNowButton.textContent = 'Backup Now';
            alert('Backup failed. Please try again.');
        }
    }

    /**
     * Load backup settings into the UI
     */
    async loadBackupSettings() {
        // Update profile section
        this.updateUI();
    }

    /**
     * Update backup information in the UI
     */
    async updateBackupInfo() {
        // Update last backup time
        const lastBackupTime = await this.db.getLastBackupTime();
        if (this.lastBackupTime) {
            if (lastBackupTime) {
                const date = new Date(lastBackupTime);
                this.lastBackupTime.textContent = `Last backed up: ${date.toLocaleString()}`;
            } else {
                this.lastBackupTime.textContent = 'Not backed up yet';
            }
        }

        // Enable/disable backup now button based on auth state
        if (this.backupNowButton) {
            this.backupNowButton.disabled = !this.userService.isUserAuthenticated();
        }
    }
}

// Export as a global to use in app.js
window.AccountUI = AccountUI;