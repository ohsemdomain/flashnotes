// /js/data/database.js
/**
 * Note Database
 * 
 * Handles all data storage operations for the Flash Notes extension, including:
 * - Initialization of the database structure
 * - CRUD operations for notes and tags
 * - Data persistence using Chrome's storage API
 * - Google Drive sync functionality
 * - Conflict resolution for synced data
 * 
 * This class serves as the data layer of the application, providing a clean API
 * for accessing and manipulating notes and tags data.
 */
class NoteDatabase {
  constructor() {
    this.userService = null;
    this.driveService = null;
    this.syncEnabled = false;
    this.syncListeners = [];
    this.initialize();
  }

  /**
   * Set the user and drive service instances
   * @param {UserService} userService - The user service instance
   * @param {DriveService} driveService - The drive service instance
   */
  setServices(userService, driveService) {
    this.userService = userService;
    this.driveService = driveService;

    // Add auth state listener to handle sign-in/sign-out
    if (this.userService) {
      this.userService.addAuthStateListener(this.handleAuthStateChange.bind(this));
    }
  }

  /**
   * Handle authentication state changes
   * @param {Object} authState - Authentication state object
   */
  async handleAuthStateChange(authState) {
    if (authState.isAuthenticated) {
      // User just signed in, check if sync is enabled
      const data = await this.getData();
      this.syncEnabled = data && data.syncEnabled === true;

      if (this.syncEnabled) {
        // Try to sync data from Drive
        await this.syncFromDrive();
      }
    } else {
      // User signed out, disable sync
      this.syncEnabled = false;
      const data = await this.getData();
      if (data) {
        data.syncEnabled = false;
        await this.setData(data);
      }
    }

    // Notify sync state listeners
    this.notifySyncListeners();
  }

  async initialize() {
    // Check if database exists, if not create it
    const data = await this.getData();
    if (!data) {
      await this.setData({
        notes: [],
        tags: [],
        tagColors: {}, // Store tag colors
        lastId: 0,
        syncEnabled: false,
        lastSyncTime: null
      });
    } else if (!data.tagColors) {
      // Update schema for existing databases
      data.tagColors = {};
      await this.setData(data);
    } else if (data.syncEnabled === undefined) {
      // Add sync properties for existing databases
      data.syncEnabled = false;
      data.lastSyncTime = null;
      await this.setData(data);
    }
  }

  async getData() {
    return new Promise((resolve) => {
      chrome.storage.local.get('notepadData', (result) => {
        resolve(result.notepadData || null);
      });
    });
  }

  async setData(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ 'notepadData': data }, () => {
        resolve();
      });
    });
  }

  async getAllNotes() {
    const data = await this.getData();
    return data && data.notes ? data.notes : [];
  }

  async getAllTags() {
    const data = await this.getData();
    return data && data.tags ? data.tags : [];
  }

  async getTagColor(tagName) {
    const data = await this.getData();
    return data && data.tagColors && data.tagColors[tagName] ? data.tagColors[tagName] : '#e4e4e4'; // Default color
  }

  async getAllTagsWithColors() {
    const data = await this.getData();
    const result = [];

    if (!data || !data.tags) {
      return result;
    }

    for (const tag of data.tags) {
      result.push({
        name: tag,
        color: data.tagColors && data.tagColors[tag] ? data.tagColors[tag] : '#e4e4e4'
      });
    }

    return result;
  }

  async getNoteById(id) {
    const notes = await this.getAllNotes();
    return notes.find(note => note.id === id) || null;
  }

  async createNote(title = '', content = '', tags = []) {
    const data = await this.getData();

    if (!data) {
      await this.initialize();
      return this.createNote(title, content, tags);
    }

    const newId = data.lastId + 1;

    const newNote = {
      id: newId,
      title,
      content,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.notes.push(newNote);
    data.lastId = newId;

    await this.setData(data);

    // If sync is enabled, sync to Drive
    if (this.syncEnabled && this.driveService && this.userService && this.userService.isUserAuthenticated()) {
      await this.syncToDrive();
    }

    return newNote;
  }

  async updateNote(id, updates) {
    const data = await this.getData();

    if (!data || !data.notes) {
      return null;
    }

    const noteIndex = data.notes.findIndex(note => note.id === id);

    if (noteIndex === -1) return null;

    const updatedNote = {
      ...data.notes[noteIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    data.notes[noteIndex] = updatedNote;
    await this.setData(data);

    // If sync is enabled, sync to Drive
    if (this.syncEnabled && this.driveService && this.userService && this.userService.isUserAuthenticated()) {
      await this.syncToDrive();
    }

    return updatedNote;
  }

  async deleteNote(id) {
    const data = await this.getData();

    if (!data || !data.notes) {
      return false;
    }

    const noteIndex = data.notes.findIndex(note => note.id === id);

    if (noteIndex === -1) return false;

    data.notes.splice(noteIndex, 1);
    await this.setData(data);

    // If sync is enabled, sync to Drive
    if (this.syncEnabled && this.driveService && this.userService && this.userService.isUserAuthenticated()) {
      await this.syncToDrive();
    }

    return true;
  }

  async addTag(tagName, color = '#e4e4e4') {
    if (!tagName) return null;

    const data = await this.getData();

    if (!data) {
      await this.initialize();
      return this.addTag(tagName, color);
    }

    const tagExists = data.tags.includes(tagName);

    if (tagExists) {
      // Update color if tag exists
      data.tagColors[tagName] = color;
      await this.setData(data);

      // If sync is enabled, sync to Drive
      if (this.syncEnabled && this.driveService && this.userService && this.userService.isUserAuthenticated()) {
        await this.syncToDrive();
      }

      return tagName;
    }

    data.tags.push(tagName);
    data.tagColors[tagName] = color;
    await this.setData(data);

    // If sync is enabled, sync to Drive
    if (this.syncEnabled && this.driveService && this.userService && this.userService.isUserAuthenticated()) {
      await this.syncToDrive();
    }

    return tagName;
  }

  async updateTagColor(tagName, color) {
    const data = await this.getData();

    if (!data || !data.tags) {
      return false;
    }

    if (data.tags.includes(tagName)) {
      data.tagColors[tagName] = color;
      await this.setData(data);

      // If sync is enabled, sync to Drive
      if (this.syncEnabled && this.driveService && this.userService && this.userService.isUserAuthenticated()) {
        await this.syncToDrive();
      }

      return true;
    }
    return false;
  }

  async removeTag(tagName) {
    const data = await this.getData();

    if (!data || !data.tags) {
      return false;
    }

    const tagIndex = data.tags.indexOf(tagName);

    if (tagIndex === -1) return false;

    data.tags.splice(tagIndex, 1);

    // Also remove this tag from all notes
    if (data.notes) {
      data.notes.forEach(note => {
        const tagIdx = note.tags.indexOf(tagName);
        if (tagIdx !== -1) {
          note.tags.splice(tagIdx, 1);
        }
      });
    }

    // Remove color
    if (data.tagColors && data.tagColors[tagName]) {
      delete data.tagColors[tagName];
    }

    await this.setData(data);

    // If sync is enabled, sync to Drive
    if (this.syncEnabled && this.driveService && this.userService && this.userService.isUserAuthenticated()) {
      await this.syncToDrive();
    }

    return true;
  }

  async searchNotes(query) {
    const notes = await this.getAllNotes();

    if (!query) {
      return notes;
    }

    return notes.filter(note => {
      return note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.content.toLowerCase().includes(query.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
    });
  }

  /**
   * Enable or disable sync with Google Drive
   * @param {boolean} enabled - Whether sync should be enabled
   * @returns {Promise<boolean>} Success status
   */
  async setSyncEnabled(enabled) {
    // Check if user is authenticated
    if (enabled && (!this.userService || !this.userService.isUserAuthenticated())) {
      return false;
    }

    const data = await this.getData();
    if (!data) {
      return false;
    }

    // Update sync setting
    data.syncEnabled = enabled;

    if (enabled) {
      // If enabling sync, perform initial sync
      await this.setData(data);
      await this.syncToDrive();
    } else {
      // If disabling sync, just save the setting
      await this.setData(data);
    }

    this.syncEnabled = enabled;

    // Notify sync state listeners
    this.notifySyncListeners();

    return true;
  }

  /**
   * Check if sync is enabled
   * @returns {Promise<boolean>} Whether sync is enabled
   */
  async isSyncEnabled() {
    const data = await this.getData();
    return data && data.syncEnabled === true;
  }

  /**
   * Get the last sync time
   * @returns {Promise<string|null>} ISO timestamp of last sync or null
   */
  async getLastSyncTime() {
    const data = await this.getData();
    return data && data.lastSyncTime ? data.lastSyncTime : null;
  }

  /**
   * Sync data to Google Drive
   * @returns {Promise<boolean>} Success status
   */
  async syncToDrive() {
    if (!this.driveService || !this.userService || !this.userService.isUserAuthenticated()) {
      return false;
    }

    try {
      const data = await this.getData();
      if (!data) {
        return false;
      }

      // Create backup object
      const backupData = {
        notes: data.notes,
        tags: data.tags,
        tagColors: data.tagColors,
        lastId: data.lastId
      };

      // Send to Google Drive
      const success = await this.driveService.backupData(
        backupData.notes,
        backupData.tags,
        backupData.tagColors
      );

      if (success) {
        // Update last sync time
        data.lastSyncTime = new Date().toISOString();
        await this.setData(data);

        // Notify sync state listeners
        this.notifySyncListeners();

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error syncing to Drive:', error);
      return false;
    }
  }

  /**
   * Sync data from Google Drive
   * @returns {Promise<boolean>} Success status
   */
  async syncFromDrive() {
    if (!this.driveService || !this.userService || !this.userService.isUserAuthenticated()) {
      return false;
    }

    try {
      // Get data from Google Drive
      const driveData = await this.driveService.restoreData();
      if (!driveData) {
        // No backup found, just sync current data to Drive
        return await this.syncToDrive();
      }

      // Get current local data
      const localData = await this.getData();

      // Merge data (more complex merging logic could be implemented here)
      const mergedData = this.mergeData(localData, driveData);

      // Save merged data
      await this.setData(mergedData);

      // Update last sync time
      mergedData.lastSyncTime = new Date().toISOString();
      await this.setData(mergedData);

      // Notify sync state listeners
      this.notifySyncListeners();

      return true;
    } catch (error) {
      console.error('Error syncing from Drive:', error);
      return false;
    }
  }

  /**
   * Merge local and Drive data
   * @param {Object} localData - Data from local storage
   * @param {Object} driveData - Data from Google Drive
   * @returns {Object} Merged data
   */
  mergeData(localData, driveData) {
    // Create a map of note IDs to notes
    const notesMap = {};

    // Add all local notes to the map
    localData.notes.forEach(note => {
      notesMap[note.id] = note;
    });

    // Merge or add Drive notes based on updated time
    driveData.notes.forEach(driveNote => {
      const localNote = notesMap[driveNote.id];

      if (!localNote) {
        // Note doesn't exist locally, add it
        notesMap[driveNote.id] = driveNote;
      } else {
        // Note exists locally, keep the more recently updated one
        const driveUpdated = new Date(driveNote.updatedAt);
        const localUpdated = new Date(localNote.updatedAt);

        if (driveUpdated > localUpdated) {
          notesMap[driveNote.id] = driveNote;
        }
      }
    });

    // Convert the map back to an array
    const mergedNotes = Object.values(notesMap);

    // Merge tags (simple union of local and Drive tags)
    const mergedTags = Array.from(new Set([...localData.tags, ...driveData.tags]));

    // Merge tag colors (prefer Drive colors over local when there's a conflict)
    const mergedTagColors = {
      ...localData.tagColors,
      ...driveData.tagColors
    };

    // Determine the highest note ID
    const highestId = Math.max(
      localData.lastId,
      driveData.lastId,
      ...mergedNotes.map(note => note.id)
    );

    return {
      notes: mergedNotes,
      tags: mergedTags,
      tagColors: mergedTagColors,
      lastId: highestId,
      syncEnabled: localData.syncEnabled,
      lastSyncTime: localData.lastSyncTime
    };
  }

  /**
   * Force a sync with Google Drive
   * @returns {Promise<boolean>} Success status
   */
  async forceSync() {
    if (!this.syncEnabled || !this.userService || !this.userService.isUserAuthenticated()) {
      return false;
    }

    // First sync from Drive, then sync to Drive
    const fromDriveSuccess = await this.syncFromDrive();
    const toDriveSuccess = await this.syncToDrive();

    return fromDriveSuccess && toDriveSuccess;
  }

  /**
   * Add a listener for sync state changes
   * @param {Function} listener - Callback function
   */
  addSyncStateListener(listener) {
    if (typeof listener === 'function' && !this.syncListeners.includes(listener)) {
      this.syncListeners.push(listener);
    }
  }

  /**
   * Remove a sync state listener
   * @param {Function} listener - Callback function to remove
   */
  removeSyncStateListener(listener) {
    const index = this.syncListeners.indexOf(listener);
    if (index !== -1) {
      this.syncListeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of sync state change
   */
  notifySyncListeners() {
    const syncState = {
      syncEnabled: this.syncEnabled,
      lastSyncTime: this.getLastSyncTime()
    };

    this.syncListeners.forEach(listener => {
      try {
        listener(syncState);
      } catch (error) {
        console.error('Error in sync state listener:', error);
      }
    });
  }
}