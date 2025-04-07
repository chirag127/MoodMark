# MoodMark – Emotional Web Journal

MoodMark is a browser extension that passively tracks and visualizes a user's emotional state while browsing the web. It uses contextual data like browsing activity, typing behavior, and sentiment analysis of text inputs to generate an emotional map of the user's browsing journey.

## Features

-   🔍 **Sentiment Tracking**: Analyze user-generated text (comments, messages, form inputs) for emotional sentiment.
-   ⏱️ **Typing Behavior Monitor**: Track typing speed, pauses, and rhythm to infer mood.
-   🌍 **URL Context**: Log visited URLs with mood snapshots.
-   📊 **Mood Dashboard**: Show charts of mood over time, top emotional triggers (websites/pages), and mood tags.
-   🧠 **Local-first Storage**: All data stored locally with export/import options.
-   🔐 **Privacy-First**: No tracking, no external data sharing. Fully transparent and opt-in.

## Project Structure

```
project-root/
├── extension/       # Frontend (browser extension)
│   ├── manifest.json
│   ├── popup/       # Extension popup UI
│   ├── background/  # Background scripts
│   ├── content/     # Content scripts
│   ├── lib/         # Shared libraries
│   └── assets/      # Images, icons, etc.
├── backend/         # Backend (Node.js API server)
│   ├── server.js
│   ├── routes/      # API routes
│   ├── models/      # Data models
│   ├── services/    # Business logic
│   └── config/      # Configuration files
└── README.md
```

## Installation

### Browser Extension

1. Clone this repository:

    ```
    git clone https://github.com/chirag127/MoodMark.git
    cd MoodMark
    ```

2. Load the extension in Chrome:
    - Open Chrome and navigate to `chrome://extensions/`
    - Enable "Developer mode" in the top-right corner
    - Click "Load unpacked" and select the `extension` folder from this repository

### Backend Server (Optional)

The extension works in local-only mode by default, but for better sentiment analysis, you can set up the backend server:

1. Navigate to the backend directory:

    ```
    cd backend
    ```

2. Install dependencies:

    ```
    npm install
    ```

3. Create a `.env` file with your MongoDB connection string:

    ```
    PORT=3000
    MONGODB_URI=mongodb://localhost:27017/moodmark
    ```

4. Start the server:
    ```
    npm start
    ```

## Usage

1. After installing the extension, you'll see the MoodMark icon in your browser toolbar.
2. Click the icon to open the dashboard and see your mood data.
3. Browse the web as usual - MoodMark will passively track your emotional state.
4. You can manually tag your mood at any time by clicking the extension icon and using the "Current Mood" tab.
5. View your mood history and trends in the "History" tab.
6. Adjust settings in the "Settings" tab.

## Privacy

MoodMark respects your privacy:

-   By default, all data is stored locally in your browser.
-   You can choose to use the backend server for better sentiment analysis.
-   No data is shared with third parties.
-   You can export, import, or clear your data at any time.

## Development

### Extension Development

1. Make changes to the extension code in the `extension` directory.
2. Reload the extension in Chrome by clicking the refresh icon on the extensions page.

### Backend Development

1. Make changes to the backend code in the `backend` directory.
2. Restart the server with `npm start` or use `npm run dev` for automatic reloading.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
