# Flash Notes Extension

## Description

Flash Notes is a Chrome extension that allows you to create and manage multiple notes with tags. It provides a simple and intuitive interface for quickly jotting down your thoughts and organizing them efficiently.

## Features

*   **Create and manage multiple notes:** Create as many notes as you need.
*   **Tagging system:** Organize your notes with custom tags and colors.
*   **Search notes:** Quickly find specific notes using the search bar.
*   **Text formatting:** Format your notes with bold, italic, underline, and lists.
*   **Edit notes:** Edit note titles and content.
*   **Settings Modal:** Includes a settings modal for managing tags.
*   **Data persistence:** Your notes are saved locally and persist across browser sessions.
*   **Full window mode:** Open the extension in a browser tab for a larger workspace.

## Installation

1.  Clone or download this repository.
2.  Open Google Chrome and go to `chrome://extensions`.
3.  Enable "Developer mode" in the top right corner.
4.  Click "Load unpacked".
5.  Select the directory where you cloned/downloaded the repository.

## Usage

1.  Click the Flash Notes icon in your Chrome toolbar to open the extension.
2.  Click the "+" button to create a new note.
3.  Enter a title and content for your note.
4.  Click the tag button to add tags to your note. You can create new tags or select existing ones.
5.  Use the formatting toolbar to style your notes.
6.  Click the settings button (gear icon) to manage your tags (create, edit, delete).
7.  Use the search bar to find notes by title, content, or tag.
8.  Click on a note in the sidebar to view and edit it.
9.  Use the open in browser button to work in full window mode.

## Project Structure

The codebase is organized in a modular structure for better maintainability:

/
  - app.js                  # Main application
  /data
    - database.js           # Database operations
  /services
    - noteService.js        # Note-related business logic
    - tagService.js         # Tag-related business logic
  /ui
    - noteUI.js             # Note UI components
    - tagUI.js              # Tag UI components
    - formatUI.js           # Formatting toolbar
    - modal.js              # Modal management

### Core Components

- **Database (database.js)**: Handles data storage using Chrome's storage API
- **Services Layer**:
  - **noteService.js**: Manages note operations
  - **tagService.js**: Manages tag operations
- **UI Layer**:
  - **modal.js**: Handles modal dialogs
  - **noteUI.js**: Handles note list and editor UI
  - **tagUI.js**: Manages tag-related UI
  - **formatUI.js**: Manages formatting toolbar
- **App (app.js)**: Initializes and coordinates the application

## Technologies Used

*   HTML
*   CSS
*   JavaScript
*   Chrome Extension API
*   Chrome Storage API

## Contributing

Feel free to fork the repository and submit pull requests. To ensure a smooth contribution process, please follow these guidelines:

*   Follow the coding standards used in the project.
*   Use issue templates when reporting issues or requesting features.
*   Ensure your code is well-documented and includes tests if applicable.

## Extending the Application

To add new features:

1. For data-related features: Extend the appropriate service in the `/js/services` directory.
2. For UI components: Add new UI handlers in the `/js/ui` directory.
3. For new types of data: Consider creating a new service file.
4. For global state changes: Update the event handlers in `app.js`.

## Reporting Issues or Requesting Features

If you encounter any issues or have feature requests, please use the [issue tracker](https://github.com/ohsemdomain/flashnotes/issues) on GitHub. When reporting issues, please provide detailed information about the problem, including steps to reproduce it. For feature requests, describe the feature you would like to see and explain why it would be beneficial.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Mohd Adnan