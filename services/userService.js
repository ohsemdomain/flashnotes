// /js/services/userService.js
/**
 * User Service
 * 
 * Handles user authentication and profile management, including:
 * - Google sign-in and sign-out
 * - User profile information
 * - Authentication token management
 * - Auth state persistence
 * 
 * This service acts as an intermediary for all authentication-related
 * operations and provides a clean API for working with the current user.
 */
class UserService {
    constructor() {
        this.currentUser = null;
        this.authToken = null;
        this.isAuthenticated = false;
        this.authListeners = [];
        this.authPromise = null; // Track ongoing auth promise

        // Try to load saved auth state on initialization
        this.loadAuthState();
    }

    /**
     * Load saved authentication state from storage
     */
    async loadAuthState() {
        try {
            const authData = await new Promise(resolve => {
                chrome.storage.local.get('userAuthData', (result) => {
                    resolve(result.userAuthData || null);
                });
            });

            if (authData) {
                this.currentUser = authData.user;
                this.isAuthenticated = true;

                // We don't store the token in local storage for security reasons
                // Instead, we'll request a fresh one using the silent authentication
                await this.refreshAuthToken(false);

                // Notify listeners of authentication state change
                this.notifyAuthListeners();
            }
        } catch (error) {
            console.error('Error loading auth state:', error);
        }
    }

    /**
     * Save authentication state to storage
     */
    async saveAuthState() {
        try {
            // We only save the user profile, not the token
            await new Promise(resolve => {
                chrome.storage.local.set({
                    'userAuthData': {
                        user: this.currentUser
                    }
                }, resolve);
            });
        } catch (error) {
            console.error('Error saving auth state:', error);
        }
    }

    /**
     * Perform Google authentication
     * @param {boolean} interactive - Whether to show interactive login UI
     * @returns {Promise<boolean>} Authentication success status
     */
    async authenticate(interactive = true) {
        // If authentication is already in progress, return the existing promise
        if (this.authPromise) {
            console.log('Auth already in progress, returning existing promise');
            return this.authPromise;
        }

        // Create a new authentication promise
        this.authPromise = this._performAuthentication(interactive);

        try {
            // Wait for authentication to complete and return the result
            return await this.authPromise;
        } finally {
            // Clear the promise reference when done (whether successful or not)
            setTimeout(() => {
                this.authPromise = null;
            }, 500); // Small delay to prevent rapid sequential calls
        }
    }

    /**
     * Internal method to perform the actual authentication
     * @private
     * @param {boolean} interactive - Whether to show interactive login UI
     * @returns {Promise<boolean>} Authentication success status
     */
    async _performAuthentication(interactive) {
        try {
            // If already authenticated and we have a token, validate it or use it
            if (this.isAuthenticated && this.authToken) {
                // Optionally verify token validity here if needed
                console.log('Already authenticated with token');
                return true;
            }

            console.log(`Requesting auth token (interactive: ${interactive})`);

            // Get auth token from Chrome identity API
            const token = await new Promise((resolve, reject) => {
                chrome.identity.getAuthToken({ interactive }, (token) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    resolve(token);
                });
            });

            if (token) {
                console.log('Received valid auth token');
                this.authToken = token;
                this.isAuthenticated = true;

                // Fetch user profile
                await this.fetchUserProfile();

                // Save auth state
                await this.saveAuthState();

                // Notify listeners
                this.notifyAuthListeners();

                return true;
            }

            console.log('No auth token received');
            return false;
        } catch (error) {
            console.error('Authentication error:', error);
            return false;
        }
    }

    /**
     * Refresh the auth token
     * @param {boolean} interactive - Whether to show interactive login UI if token is expired
     * @returns {Promise<boolean>} Success status
     */
    async refreshAuthToken(interactive = false) {
        try {
            // Remove cached token first to ensure we get a fresh one
            if (this.authToken) {
                await new Promise((resolve) => {
                    chrome.identity.removeCachedAuthToken({ token: this.authToken }, resolve);
                });
                this.authToken = null;
            }

            // Get a new token
            return await this.authenticate(interactive);
        } catch (error) {
            console.error('Error refreshing token:', error);
            return false;
        }
    }

    /**
     * Sign out the current user
     * @returns {Promise<boolean>} Success status
     */
    async signOut() {
        if (!this.isAuthenticated) {
            return true;
        }

        try {
            // Revoke the token
            if (this.authToken) {
                await new Promise((resolve, reject) => {
                    chrome.identity.removeCachedAuthToken({ token: this.authToken }, () => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                            return;
                        }
                        resolve();
                    });
                });

                // Make a request to Google's revocation endpoint
                await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${this.authToken}`, {
                    method: 'GET'
                });
            }

            // Clear auth state
            this.currentUser = null;
            this.authToken = null;
            this.isAuthenticated = false;

            // Clear saved auth state
            await new Promise(resolve => {
                chrome.storage.local.remove('userAuthData', resolve);
            });

            // Notify listeners
            this.notifyAuthListeners();

            return true;
        } catch (error) {
            console.error('Sign out error:', error);

            // Even if there's an error, ensure we clear local state
            this.currentUser = null;
            this.authToken = null;
            this.isAuthenticated = false;
            await new Promise(resolve => {
                chrome.storage.local.remove('userAuthData', resolve);
            });
            this.notifyAuthListeners();

            return false;
        }
    }

    /**
     * Fetch the user's profile information
     * @returns {Promise<Object|null>} User profile or null if failed
     */
    async fetchUserProfile() {
        if (!this.authToken) {
            return null;
        }

        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch user profile: ${response.status}`);
            }

            const profileData = await response.json();

            this.currentUser = {
                id: profileData.id,
                email: profileData.email,
                name: profileData.name,
                picture: profileData.picture
            };

            return this.currentUser;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    }

    /**
     * Get the current auth token
     * @returns {string|null} The current auth token or null if not authenticated
     */
    getAuthToken() {
        return this.authToken;
    }

    /**
     * Get the current user's profile
     * @returns {Object|null} User profile or null if not authenticated
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Check if the user is authenticated
     * @returns {boolean} Authentication status
     */
    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    /**
     * Add a listener for authentication state changes
     * @param {Function} listener - Callback function
     */
    addAuthStateListener(listener) {
        if (typeof listener === 'function' && !this.authListeners.includes(listener)) {
            this.authListeners.push(listener);

            // Call the listener immediately if we're already authenticated
            if (this.isAuthenticated) {
                try {
                    listener({
                        isAuthenticated: this.isAuthenticated,
                        currentUser: this.currentUser
                    });
                } catch (error) {
                    console.error('Error in auth state listener:', error);
                }
            }
        }
    }

    /**
     * Remove an authentication state listener
     * @param {Function} listener - Callback function to remove
     */
    removeAuthStateListener(listener) {
        const index = this.authListeners.indexOf(listener);
        if (index !== -1) {
            this.authListeners.splice(index, 1);
        }
    }

    /**
     * Notify all listeners of authentication state change
     */
    notifyAuthListeners() {
        const authState = {
            isAuthenticated: this.isAuthenticated,
            currentUser: this.currentUser
        };

        this.authListeners.forEach(listener => {
            try {
                listener(authState);
            } catch (error) {
                console.error('Error in auth state listener:', error);
            }
        });
    }
}

// Export as a global to use in app.js and other files
window.UserService = UserService;