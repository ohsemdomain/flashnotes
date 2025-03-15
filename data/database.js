// /js/data/database.js
/**
 * Note Database
 * 
 * Handles all data storage operations for the Flash Notes extension, including:
 * - Initialization of the database structure
 * - CRUD operations for notes and tags
 * - Data persistence using Chrome's storage API
 * - Google Drive backup functionality
 * 
 * This class serves as the data layer of the application, providing a clean API
 * for accessing and manipulating notes and tags data.
 */
class NoteDatabase {
  constructor() {
    this.userService = null;
    this.driveService = null;
    this.backupListeners = [];
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
    // Notify backup state listeners
    this.notifyBackupListeners();
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
        lastBackupTime: null
      });
    } else if (!data.tagColors) {
      // Update schema for existing databases
      data.tagColors = {};
      await this.setData(data);
    } else if (data.syncEnabled !== undefined || data.lastSyncTime !== undefined) {
      // Convert from old sync schema to new backup schema
      data.lastBackupTime = data.lastSyncTime || null;
      delete data.syncEnabled;
      delete data.lastSyncTime;
      await this.setData(data);
    } else if (data.lastBackupTime === undefined) {
      // Add backup properties for existing databases
      data.lastBackupTime = null;
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

      return tagName;
    }

    data.tags.push(tagName);
    data.tagColors[tagName] = color;
    await this.setData(data);

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
   * Get the last backup time
   * @returns {Promise<string|null>} ISO timestamp of last backup or null
   */
  async getLastBackupTime() {
    const data = await this.getData();
    return data && data.lastBackupTime ? data.lastBackupTime : null;
  }

  /**
   * Backup data to Google Drive
   * @returns {Promise<boolean>} Success status
   */
  async backupToDrive() {
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
        // Update last backup time
        data.lastBackupTime = new Date().toISOString();
        await this.setData(data);

        // Notify backup state listeners
        this.notifyBackupListeners();

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error backing up to Drive:', error);
      return false;
    }
  }

  /**
   * Restore data from Google Drive backup
   * @returns {Promise<boolean>} Success status
   */
  async restoreFromDrive() {
    if (!this.driveService || !this.userService || !this.userService.isUserAuthenticated()) {
      return false;
    }

    try {
      // Get backup data from Drive
      const backupData = await this.driveService.readBackupData();
      if (!backupData || !backupData.notes) {
        console.log('No valid backup data found');
        return false;
      }

      // Create a new data object
      const newData = {
        notes: backupData.notes || [],
        tags: backupData.tags || [],
        tagColors: backupData.tagColors || {},
        lastId: backupData.lastId || 0,
        lastBackupTime: new Date().toISOString() // Set current time as last backup time
      };

      // Save to local storage
      await this.setData(newData);

      // Notify backup state listeners
      this.notifyBackupListeners();

      console.log('Backup restored successfully:', backupData.notes.length, 'notes');
      return true;
    } catch (error) {
      console.error('Error restoring from Drive:', error);
      return false;
    }
  }

  /**
   * Add a listener for backup state changes
   * @param {Function} listener - Callback function
   */
  addBackupStateListener(listener) {
    if (typeof listener === 'function' && !this.backupListeners.includes(listener)) {
      this.backupListeners.push(listener);
    }
  }

  /**
   * Remove a backup state listener
   * @param {Function} listener - Callback function to remove
   */
  removeBackupStateListener(listener) {
    const index = this.backupListeners.indexOf(listener);
    if (index !== -1) {
      this.backupListeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of backup state change
   */
  notifyBackupListeners() {
    const backupState = {
      lastBackupTime: this.getLastBackupTime()
    };

    this.backupListeners.forEach(listener => {
      try {
        listener(backupState);
      } catch (error) {
        console.error('Error in backup state listener:', error);
      }
    });
  }
}