// /js/services/driveService.js
/**
 * Drive Service
 * 
 * Handles all Google Drive operations, including:
 * - Creation and management of app folders
 * - File operations (create, update, read)
 * - Backup functionality
 * 
 * This service requires a UserService instance to handle authentication.
 */
class DriveService {
    constructor(userService) {
        this.userService = userService;
        this.appFolderName = 'Flash Notes';
        this.appFolderId = null;
        this.initialized = false;
        this.backupFileName = 'flash_notes_backup.json';
        this.initializationPromise = null; // Track ongoing initialization
    }

    /**
     * Initialize the Drive service
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
        // If already initialized, return success
        if (this.initialized && this.appFolderId) {
            return true;
        }

        // If initialization is in progress, wait for it to complete
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        // Start initialization and store the promise
        this.initializationPromise = this._doInitialize();

        try {
            // Wait for initialization to complete
            const result = await this.initializationPromise;
            // Clear the promise reference
            this.initializationPromise = null;
            return result;
        } catch (error) {
            // Clear promise reference on error
            this.initializationPromise = null;
            throw error;
        }
    }

    /**
     * Perform the actual initialization work
     * @private
     * @returns {Promise<boolean>} Success status
     */
    async _doInitialize() {
        try {
            // Check if user is authenticated
            if (!this.userService.isUserAuthenticated()) {
                console.log('User not authenticated, cannot initialize Drive service');
                return false;
            }

            // Make sure we have a valid token
            const token = this.userService.getAuthToken();
            if (!token) {
                console.log('No valid auth token available');
                return false;
            }

            // Find or create app folder
            const folderId = await this.findOrCreateAppFolder();
            if (!folderId) {
                console.error('Failed to find or create app folder');
                return false;
            }

            this.appFolderId = folderId;
            this.initialized = true;
            console.log('Drive service initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing Drive service:', error);
            this.initialized = false;
            this.appFolderId = null;
            return false;
        }
    }

    /**
     * Find or create the app folder in Google Drive
     * @returns {Promise<string|null>} Folder ID or null if failed
     */
    async findOrCreateAppFolder() {
        try {
            // First try to find the folder
            const existingFolder = await this.findAppFolder();
            if (existingFolder) {
                return existingFolder;
            }

            // If not found, create a new one
            return await this.createAppFolder();
        } catch (error) {
            console.error('Error finding or creating app folder:', error);
            return null;
        }
    }

    /**
     * Find the app folder in Google Drive
     * @returns {Promise<string|null>} Folder ID or null if not found
     */
    async findAppFolder() {
        try {
            const token = this.userService.getAuthToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            const query = `name='${this.appFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to search for folder: ${response.status}`);
            }

            const data = await response.json();

            if (data.files && data.files.length > 0) {
                return data.files[0].id;
            }

            return null;
        } catch (error) {
            console.error('Error finding app folder:', error);
            return null;
        }
    }

    /**
     * Create a new app folder in Google Drive
     * @returns {Promise<string|null>} Folder ID or null if failed
     */
    async createAppFolder() {
        try {
            const token = this.userService.getAuthToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            console.log('Creating Flash Notes folder in Google Drive...');

            const response = await fetch(
                'https://www.googleapis.com/drive/v3/files',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: this.appFolderName,
                        mimeType: 'application/vnd.google-apps.folder'
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to create folder: ${response.status}`);
            }

            const data = await response.json();
            console.log('Flash Notes folder created successfully');
            return data.id;
        } catch (error) {
            console.error('Error creating app folder:', error);
            return null;
        }
    }

    /**
     * Create or update a file in Google Drive
     * @param {string} fileName - Name of the file
     * @param {Object|Array} content - Content to save (will be converted to JSON)
     * @param {string|null} existingFileId - ID of existing file to update (or null for new file)
     * @returns {Promise<string|null>} File ID or null if failed
     */
    async saveFile(fileName, content, existingFileId = null) {
        try {
            const initResult = await this.initialize();
            if (!initResult) {
                console.error('Failed to initialize Drive service');
                return null;
            }

            const token = this.userService.getAuthToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            // Convert content to JSON string
            const fileContent = JSON.stringify(content, null, 2);

            // Create a Blob with the JSON data
            const blob = new Blob([fileContent], { type: 'application/json' });

            // Create FormData for file upload
            const formData = new FormData();

            // Add metadata
            const metadata = {
                name: fileName,
                mimeType: 'application/json'
            };

            // If creating a new file, set the parent folder
            if (!existingFileId) {
                metadata.parents = [this.appFolderId];
            }

            formData.append(
                'metadata',
                new Blob([JSON.stringify(metadata)], { type: 'application/json' })
            );

            formData.append('file', blob);

            // Determine if this is a create or update operation
            const method = existingFileId ? 'PATCH' : 'POST';
            const url = existingFileId
                ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
                : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Failed to save file: ${response.status}`);
            }

            const data = await response.json();
            return data.id;
        } catch (error) {
            console.error('Error saving file:', error);
            return null;
        }
    }

    /**
     * Read a file from Google Drive
     * @param {string} fileId - ID of the file to read
     * @returns {Promise<Object|Array|null>} Parsed content or null if failed
     */
    async readFile(fileId) {
        try {
            const initResult = await this.initialize();
            if (!initResult) {
                console.error('Failed to initialize Drive service');
                return null;
            }

            const token = this.userService.getAuthToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to read file: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error reading file:', error);
            return null;
        }
    }

    /**
     * Find a file by name in the app folder
     * @param {string} fileName - Name of the file to find
     * @returns {Promise<Object|null>} File metadata or null if not found
     */
    async findFile(fileName) {
        try {
            const initResult = await this.initialize();
            if (!initResult) {
                console.error('Failed to initialize Drive service');
                return null;
            }

            const token = this.userService.getAuthToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            const query = `name='${fileName}' and '${this.appFolderId}' in parents and trashed=false`;
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to search for file: ${response.status}`);
            }

            const data = await response.json();

            if (data.files && data.files.length > 0) {
                return data.files[0];
            }

            return null;
        } catch (error) {
            console.error('Error finding file:', error);
            return null;
        }
    }

    /**
     * Check if a backup file exists in Drive
     * @returns {Promise<boolean>} Whether a backup exists
     */
    async checkBackupExists() {
        try {
            const initResult = await this.initialize();
            if (!initResult) {
                console.error('Failed to initialize Drive service');
                return false;
            }

            console.log('Checking if backup file exists in Drive...');
            const file = await this.findFile(this.backupFileName);

            if (file) {
                console.log('Backup file found in Drive:', file.id);
                return true;
            } else {
                console.log('No backup file found in Drive');
                return false;
            }
        } catch (error) {
            console.error('Error checking if backup exists:', error);
            return false;
        }
    }

    /**
     * Read backup data from Drive
     * @returns {Promise<Object|null>} Backup data or null if not found
     */
    async readBackupData() {
        try {
            const initResult = await this.initialize();
            if (!initResult) {
                console.error('Failed to initialize Drive service');
                return null;
            }

            console.log('Reading backup data from Drive...');

            // Find the backup file
            const file = await this.findFile(this.backupFileName);
            if (!file) {
                console.log('No backup file found');
                return null;
            }

            console.log('Reading backup file content...');

            // Read the backup data
            const backupData = await this.readFile(file.id);

            if (backupData) {
                console.log('Backup data read successfully');
                return backupData;
            } else {
                console.error('Failed to read backup data');
                return null;
            }
        } catch (error) {
            console.error('Error reading backup data:', error);
            return null;
        }
    }

    /**
     * Backup all notes and tags to Google Drive
     * @param {Array} notes - Array of notes
     * @param {Array} tags - Array of tags
     * @param {Object} tagColors - Object mapping tag names to colors
     * @returns {Promise<boolean>} Success status
     */
    async backupData(notes, tags, tagColors) {
        try {
            const initResult = await this.initialize();
            if (!initResult) {
                console.error('Failed to initialize Drive service');
                return false;
            }

            console.log('Starting backup to Google Drive...');

            // Create backup data object
            const backupData = {
                notes: notes,
                tags: tags,
                tagColors: tagColors,
                lastId: Math.max(0, ...notes.map(note => note.id)),
                backupDate: new Date().toISOString()
            };

            // Find existing backup file or create a new one
            const existingFile = await this.findFile(this.backupFileName);

            // Save the backup
            const fileId = await this.saveFile(
                this.backupFileName,
                backupData,
                existingFile ? existingFile.id : null
            );

            if (fileId) {
                console.log('Backup to Google Drive successful');
                return true;
            } else {
                console.error('Backup to Google Drive failed');
                return false;
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            return false;
        }
    }

    /**
     * List all backup files in the app folder
     * @returns {Promise<Array|null>} Array of file metadata or null if failed
     */
    async listBackups() {
        try {
            const initResult = await this.initialize();
            if (!initResult) {
                console.error('Failed to initialize Drive service');
                return null;
            }

            const token = this.userService.getAuthToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            const query = `'${this.appFolderId}' in parents and trashed=false`;
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime,size)`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to list backups: ${response.status}`);
            }

            const data = await response.json();
            return data.files || [];
        } catch (error) {
            console.error('Error listing backups:', error);
            return null;
        }
    }

    /**
     * Reset the initialization state (for testing or recovery)
     */
    resetInitialization() {
        this.initialized = false;
        this.appFolderId = null;
        this.initializationPromise = null;
        console.log('Drive service initialization reset');
    }
}

// Export as a global to use in app.js and other files
window.DriveService = DriveService;