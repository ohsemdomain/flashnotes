# Flash Notes Extension

## Description

Flash Notes is a Chrome extension that allows you to create and manage multiple notes with tags, with automatic backup to Google Drive. It provides a simple and intuitive interface for quickly jotting down your thoughts and organizing them efficiently. All your notes are securely stored in your Google account.

## Features

*   **Google Drive integration:** Sign in required - all your notes are automatically backed up to your personal Google Drive
*   **Create and manage multiple notes:** Create as many notes as you need
*   **Tagging system:** Organize your notes with custom tags and colors
*   **Search notes:** Quickly find specific notes using the search bar
*   **Text formatting:** Format your notes with bold, italic, underline, and lists
*   **Automatic daily backup:** Your notes are automatically backed up to Google Drive daily
*   **Settings Modal:** Includes settings for managing tags and backup preferences
*   **Full window mode:** Open the extension in a browser tab for a larger workspace

## Installation

1.  Clone or download this repository
2.  Open Google Chrome and go to `chrome://extensions/`
3.  Enable "Developer mode" in the top right corner
4.  Click "Load unpacked"
5.  Select the directory where you cloned/downloaded the repository

## Usage

1.  Click the Flash Notes icon in your Chrome toolbar to open the extension
2.  Sign in with your Google account when prompted
3.  Click the "+" button to create a new note
4.  Enter a title and content for your note
5.  Click the tag button to add tags to your note. You can create new tags or select existing ones
6.  Use the formatting toolbar to style your notes
7.  Click the settings button (gear icon) to manage your tags
8.  Use the search bar to find notes by title, content, or tag
9.  Click on a note in the sidebar to view and edit it
10. Use the open in browser button to work in full window mode

## Google Integration

Flash Notes features secure Google integration:

1. **Sign in required:** You must sign in with your Google account to use Flash Notes
2. **Automatic backup:** Your notes are automatically backed up daily to your Google Drive
3. **Manual backup:** You can trigger a backup at any time from the account menu
4. **Privacy:** Your data is securely stored in your personal Google Drive account

## Project Structure

The codebase is organized in a modular structure for better maintainability:

```
/
app.js                  # Main application
flash-notes-icon.png    # Extension icon
index.html              # Main HTML file
manifest.json           # Chrome extension manifest
README.md               # Project documentation
style.css               # Stylesheet
/data
  database.js           # Database operations
/helper
  noteHelper.js         # Note helper functions
  tagHelper.js          # Tag helper functions
/services
  noteService.js        # Note-related business logic
  tagService.js         # Tag-related business logic
  userService.js        # User authentication and profile management
  driveService.js       # Google Drive integration
/ui
  formatUI.js           # Formatting toolbar
  modal.js              # Modal management
  noteUI.js             # Note UI components
  tagUI.js              # Tag UI components
  accountUI.js          # Account and backup UI management
```

### Core Components

- **Database (database.js)**: Handles data storage using Chrome's storage API
- **Services Layer**:
  - **noteService.js**: Manages note operations
  - **tagService.js**: Manages tag operations
  - **userService.js**: Handles user authentication and profile management
  - **driveService.js**: Manages Google Drive operations
- **UI Layer**:
  - **modal.js**: Handles modal dialogs
  - **noteUI.js**: Handles note list and editor UI
  - **tagUI.js**: Manages tag-related UI
  - **formatUI.js**: Manages formatting toolbar
  - **accountUI.js**: Manages account and backup UI
- **App (app.js)**: Initializes and coordinates the application

## Technologies Used

*   HTML
*   CSS
*   JavaScript
*   Chrome Extension API
*   Chrome Storage API
*   Google OAuth 2.0
*   Google Drive API

## Contributing

Feel free to fork the repository and submit pull requests. To ensure a smooth contribution process, please follow these guidelines:

*   Follow the coding standards used in the project
*   Use issue templates when reporting issues or requesting features
*   Ensure your code is well-documented and includes tests if applicable

## Extending the Application

To add new features:

1. For data-related features: Extend the appropriate service in the `/js/services` directory
2. For UI components: Add new UI handlers in the `/js/ui` directory
3. For new types of data: Consider creating a new service file
4. For global state changes: Update the event handlers in `app.js`

## License

This project is licensed under the MIT License.

## Author

Mohd Adnan