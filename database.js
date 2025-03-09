// database.js
class NoteDatabase {
  constructor() {
    this.initialize();
  }

  async initialize() {
    // Check if database exists, if not create it
    const data = await this.getData();
    if (!data) {
      await this.setData({
        notes: [],
        tags: [],
        tagColors: {}, // Store tag colors
        lastId: 0
      });
    } else if (!data.tagColors) {
      // Update schema for existing databases
      data.tagColors = {};
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
    return data.notes || [];
  }

  async getAllTags() {
    const data = await this.getData();
    return data.tags || [];
  }

  async getTagColor(tagName) {
    const data = await this.getData();
    return data.tagColors[tagName] || '#e4e4e4'; // Default color
  }

  async getAllTagsWithColors() {
    const data = await this.getData();
    const result = [];

    for (const tag of data.tags) {
      result.push({
        name: tag,
        color: data.tagColors[tag] || '#e4e4e4'
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
    const noteIndex = data.notes.findIndex(note => note.id === id);

    if (noteIndex === -1) return false;

    data.notes.splice(noteIndex, 1);
    await this.setData(data);

    return true;
  }

  async addTag(tagName, color = '#e4e4e4') {
    if (!tagName) return null;

    const data = await this.getData();
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
    if (data.tags.includes(tagName)) {
      data.tagColors[tagName] = color;
      await this.setData(data);
      return true;
    }
    return false;
  }

  async removeTag(tagName) {
    const data = await this.getData();
    const tagIndex = data.tags.indexOf(tagName);

    if (tagIndex === -1) return false;

    data.tags.splice(tagIndex, 1);

    // Also remove this tag from all notes
    data.notes.forEach(note => {
      const tagIdx = note.tags.indexOf(tagName);
      if (tagIdx !== -1) {
        note.tags.splice(tagIdx, 1);
      }
    });

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
}