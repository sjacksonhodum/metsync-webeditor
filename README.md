# metsync web editor

A powerful web-based BPM file editor for metsync devices. Create, edit, and manage tempo maps with precision timing and visual feedback.

**Live App:** [sjacksonhodum.github.io/metsync-webeditor/index.html](https://sjacksonhodum.github.io/metsync-webeditor/index.html)

![metsync web editor](https://img.shields.io/badge/version-1.0.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

### Timeline Editing
- Visual timeline with measure and beat grid lines
- Three track types: Start/Stop, BPM Changes, and Time Signatures
- Drag-and-drop event positioning
- Right-click context menu for quick event creation
- Zoom controls for precise editing

### Event Types
- **Start/Stop Commands** - Control playback timing
- **BPM Changes** - Instant or gradual tempo transitions
- **Time Signatures** - Change between 2/4, 3/4, 4/4, 5/4, 6/8, 7/8, and more

### Playback & Metronome
- Real-time playback with audio metronome
- Visual beat pulse indicator
- Adjustable volume control (0-100%)
- Click/Follow cursor modes
- Delta beats display for event spacing

### Keyboard Shortcuts

#### Navigation
- **Space** - Play/Pause
- **Arrow Left/Right** - Move cursor by beat/measure
- **Arrow Up/Down** - Zoom in/out
- **?** - Show/hide keyboard shortcuts

#### Editing
- **1, 2, 3** - Quick select event type (Start/Stop, BPM, Time Sig)
- **Delete** - Remove selected events
- **Ctrl+Z** - Undo
- **Ctrl+Y** - Redo
- **Ctrl+S** - Save file
- **Ctrl+C** - Copy selected events
- **Ctrl+V** - Paste events

#### Bookmarks
- **Ctrl+B** - Toggle bookmarks panel
- **Shift+B** - Add bookmark at cursor
- **Ctrl+1-9** - Jump to bookmark 1-9

#### Appearance
- **Ctrl+T** - Toggle dark/light theme
- **ESC** - Close open panels

### Bookmarks
- Save important positions in your timeline
- Quick navigation with keyboard shortcuts
- Custom naming for each bookmark
- Visual bookmark panel with measure/beat display

### Themes
- **Dark Mode** - Easy on the eyes for long editing sessions
- **Light Mode** - Clean, bright interface
- Theme preference saved automatically

### File Management
- Create new BPM files from scratch
- Open and edit existing .bpm files
- Download/save your work
- Auto-save functionality (Ctrl+S)

### Undo/Redo
- Full history tracking (up to 50 states)
- Undo/redo with Ctrl+Z/Y
- Smart state management

### Real-time Preview
- Current playback status
- Time display (mm:ss.ms)
- Measure and beat position
- Current BPM
- Active time signature
- Delta beats between events

## Getting Started

Visit the live app at: **[sjacksonhodum.github.io/metsync-webeditor/index.html](https://sjacksonhodum.github.io/metsync-webeditor/index.html)**

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Support for Web Audio API
- JavaScript enabled
- Minimum screen resolution: 1280x720

## Usage Guide

### Creating a New File

1. Click **"Create New File"** on the welcome screen
2. The editor opens with a blank timeline
3. Start adding events using the "+ Add Event" button or right-click on the timeline

### Adding Events

**Method 1: Add Event Button**
1. Click "+ Add Event"
2. Select event type
3. Enter measure and beat position
4. Configure event settings
5. Click "Save"

**Method 2: Right-Click**
1. Right-click anywhere on the timeline
2. Select event type from context menu
3. Event is created at clicked position

**Method 3: Keyboard Shortcuts**
1. Position cursor with arrow keys
2. Press 1, 2, or 3 to select event type
3. Configure in the event panel

### Editing Events

- **Click** an event to edit
- **Drag** to reposition
- **Delete key** to remove
- Right-click for quick actions

### BPM Changes

**Instant Change:**
- Set BPM value
- Change occurs immediately at specified measure/beat

**Gradual Change:**
- Enable "Gradual Change"
- Set starting BPM, ending BPM, and duration
- Visual gradient shows tempo transition

### Working with Bookmarks

1. Position cursor at desired location
2. Press **Shift+B** to add bookmark
3. Enter a descriptive name
4. Press **Ctrl+1-9** to jump to bookmarks
5. Press **Ctrl+B** to view all bookmarks

### Exporting

**Save BPM File:**
- Click "Download" or press **Ctrl+S**
- File saved as .bpm format

**Export Click Track:**
- Click "Export Click Track" (coming soon)
- Generates WAV file with metronome audio

## Tips & Tricks

1. **Grid Lines** - Enable beat grid lines for precise alignment
2. **Zoom In** - Use zoom controls or arrow keys for detailed editing
3. **Copy/Paste** - Duplicate complex event patterns quickly
4. **Bookmarks** - Mark verse, chorus, bridge sections for quick navigation
5. **Delta Beats** - Check spacing between events in the preview panel
6. **Theme Toggle** - Switch themes based on lighting conditions
7. **Right-Click** - Fastest way to add events while playing back

## Project Structure

```
metsync-web-editor/
├── index.html          # Main HTML structure
├── styles.css          # All styling (dark/light themes)
├── script.js           # Application logic
├── high.wav            # High metronome sound (downbeat)
├── low.wav             # Low metronome sound (other beats)
└── README.md           # This file
```

## Technical Details

### Technologies Used
- Pure HTML5, CSS3, JavaScript (ES6+)
- Web Audio API for metronome playback
- Canvas API for timeline rendering
- LocalStorage for preferences
- CSS Custom Properties for theming

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Performance
- Optimized rendering for timelines up to 1000+ events
- Smooth 60fps playback and animation
- Efficient memory management
- Lazy rendering for off-screen events

## Known Issues

- Audio playback requires user interaction on first load (browser policy)
- Very large files (>2000 events) may experience slight lag
- Safari may require additional audio permissions

## Roadmap

- [ ] Click track export to WAV
- [ ] Event templates
- [ ] Timeline minimap
- [ ] Project settings panel
- [ ] Multi-select and bulk edit
- [ ] Import MIDI tempo maps
- [ ] Collaboration features
- [ ] Cloud save/sync

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Author

@sjacksonhodum

## Acknowledgments


- Web Audio API community
- All beta testers and contributors


## Screenshots

<img width="1363" height="881" alt="Screenshot 2025-10-04 at 6 48 03 PM" src="https://github.com/user-attachments/assets/ba555435-d29d-4a36-8779-9cba85b55a8f" />
<img width="1363" height="881" alt="Screenshot 2025-10-04 at 6 50 07 PM" src="https://github.com/user-attachments/assets/90be08f6-5fd4-4213-a54a-b53289fa0693" />

---

**Version:** 1.0.0  
**Last Updated:** October 2025  
**Status:** Active Development
