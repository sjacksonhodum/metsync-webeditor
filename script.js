// Global State
let currentFile = {
    name: 'Untitled.bpm',
    events: []
};

let timelineState = {
    zoom: 1,
    cursorPosition: 0, // in measures
    cursorTarget: 0,
    currentBPM: 120,
    currentTimeSig: { beats: 4, unit: 4 },
    isStarted: false,
    isPlaying: false,
    cursorMode: 'click', // 'click' or 'follow'
    playbackStartTime: null,
    playbackStartPosition: 0,
    playbackBeatPosition: 0,
    lastAnimationTime: null,
    animationFrame: null,
    followAnimationFrame: null
};

let editingEvent = null;
let draggedEvent = null;
let dragOffset = 0;
let selectedEvents = new Set(); // For bulk edit mode
let clipboardEvents = []; // For copy/paste

const metronomeState = {
    enabled: true,
    volume: 0.7, // Volume control (0-1)
    audioContext: null,
    buffers: { high: null, low: null },
    loadingPromise: null,
    lastBeatIndex: -1,
    orbTimeout: null
};

// Undo/Redo system
const historyState = {
    past: [],
    future: [],
    maxHistory: 50
};

// Bookmarks system
const bookmarks = [];

// App settings
const appSettings = {
    theme: 'dark', // 'dark' or 'light'
    defaultBPM: 120,
    defaultTimeSig: { beats: 4, unit: 4 },
    showGridLines: true
};

let timeSigEvents = [];
let bpmEvents = [];
let tempoSegments = [];

// Constants
const MEASURE_WIDTH = 100; // pixels per measure at 100% zoom
const TRACK_LABEL_WIDTH = 180;
let TOTAL_MEASURES = 100; // dynamic timeline length that grows with events
const FILE_EXTENSION = '.bpm';

const METRONOME_SAMPLE_PATHS = {
    high: './high.wav',
    low: './low.wav'
};

// DOM Elements
const welcomeScreen = document.getElementById('welcomeScreen');
const editorScreen = document.getElementById('editorScreen');
const createNewBtn = document.getElementById('createNewBtn');
const openFileBtn = document.getElementById('openFileBtn');
const fileInput = document.getElementById('fileInput');
const closeBtn = document.getElementById('closeBtn');
const saveBtn = document.getElementById('saveBtn');
const downloadBtn = document.getElementById('downloadBtn');
const exportClickTrackBtn = document.getElementById('exportClickTrackBtn');
const fileName = document.getElementById('fileName');

const timelineRuler = document.getElementById('timelineRuler');
const timelineCursor = document.getElementById('timelineCursor');
const trackStartStop = document.getElementById('trackStartStop');
const trackBPM = document.getElementById('trackBPM');
const trackTimeSig = document.getElementById('trackTimeSig');

const addEventBtn = document.getElementById('addEventBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomLevel = document.getElementById('zoomLevel');

const eventPanel = document.getElementById('eventPanel');
const eventPanelTitle = document.getElementById('eventPanelTitle');
const closePanelBtn = document.getElementById('closePanelBtn');
const eventType = document.getElementById('eventType');
const eventMeasure = document.getElementById('eventMeasure');
const eventBeat = document.getElementById('eventBeat');
const saveEventBtn = document.getElementById('saveEventBtn');
const deleteEventBtn = document.getElementById('deleteEventBtn');
const cancelEventBtn = document.getElementById('cancelEventBtn');

const startStopOptions = document.getElementById('startStopOptions');
const bpmOptions = document.getElementById('bpmOptions');
const timeSigOptions = document.getElementById('timeSigOptions');
const startStopCommand = document.getElementById('startStopCommand');
const bpmChangeType = document.getElementById('bpmChangeType');
const bpmValue = document.getElementById('bpmValue');
const bpmDuration = document.getElementById('bpmDuration');
const gradualOptions = document.getElementById('gradualOptions');
const timeSigBeats = document.getElementById('timeSigBeats');
const timeSigUnit = document.getElementById('timeSigUnit');

// Preview elements
const previewStatus = document.getElementById('previewStatus');
const previewTime = document.getElementById('previewTime');
const previewBeat = document.getElementById('previewBeat');
const previewMeasure = document.getElementById('previewMeasure');
const previewBPM = document.getElementById('previewBPM');
const previewTimeSig = document.getElementById('previewTimeSig');
const previewDeltaBeats = document.getElementById('previewDeltaBeats');

// Transport controls
const playPauseBtn = document.getElementById('playPauseBtn');
const stopBtn = document.getElementById('stopBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const modeClick = document.getElementById('modeClick');
const modeFollow = document.getElementById('modeFollow');
const metronomeToggle = document.getElementById('metronomeToggle');
const metronomeOrb = document.getElementById('metronomeOrb');
const timelineStatusMarker = document.getElementById('timelineStatusMarker');
const markerValue = document.getElementById('markerValue');

if (metronomeToggle) {
    metronomeState.enabled = metronomeToggle.checked;
}

// Event Listeners
createNewBtn.addEventListener('click', createNewFile);
openFileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', openFile);
closeBtn.addEventListener('click', closeEditor);
saveBtn.addEventListener('click', saveFile);
downloadBtn.addEventListener('click', downloadFile);
exportClickTrackBtn.addEventListener('click', exportClickTrack);

addEventBtn.addEventListener('click', openAddEventPanel);
zoomInBtn.addEventListener('click', () => changeZoom(0.25));
zoomOutBtn.addEventListener('click', () => changeZoom(-0.25));

// Transport controls
playPauseBtn.addEventListener('click', togglePlayPause);
stopBtn.addEventListener('click', stopPlayback);
modeClick.addEventListener('click', () => setCursorMode('click'));
modeFollow.addEventListener('click', () => setCursorMode('follow'));
if (metronomeToggle) {
    metronomeToggle.addEventListener('change', handleMetronomeToggle);
}
eventMeasure.addEventListener('input', updateBeatInputConstraint);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    const isTyping = activeElementIsInput();
    
    // ESC to close event panel
    if (e.key === 'Escape') {
        if (eventPanel && eventPanel.style.display === 'flex') {
            closeEventPanel();
            e.preventDefault();
        }
        return;
    }
    
    // Don't process other shortcuts while typing
    if (isTyping) return;
    
    // Space bar for play/pause
    if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
        return;
    }
    
    // Arrow keys to move cursor
    if (e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 1 : 0.25; // Shift for whole measure, otherwise quarter beat
        moveCursor(step);
        return;
    }
    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const step = e.shiftKey ? 1 : 0.25;
        moveCursor(-step);
        return;
    }
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        changeZoom(0.25);
        return;
    }
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        changeZoom(-0.25);
        return;
    }
    
    // Delete key to remove selected event
    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedEvents.size > 0) {
            e.preventDefault();
            deleteSelectedEvents();
        }
        return;
    }
    
    // Number keys for quick event type selection
    if (e.key >= '1' && e.key <= '3') {
        e.preventDefault();
        const types = ['startstop', 'bpm', 'timesig'];
        const typeIndex = parseInt(e.key) - 1;
        if (eventPanel.style.display === 'flex') {
            eventType.value = types[typeIndex];
            updateEventForm();
        }
        return;
    }
    
    // Ctrl/Cmd shortcuts
    const modifier = e.ctrlKey || e.metaKey;
    
    if (modifier && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
    }
    
    if (modifier && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
    }
    
    if (modifier && e.key === 's') {
        e.preventDefault();
        saveFile();
        showNotification('File saved!', 'success');
        return;
    }
    
    if (modifier && e.key === 'c') {
        e.preventDefault();
        copySelectedEvents();
        return;
    }
    
    if (modifier && e.key === 'v') {
        e.preventDefault();
        pasteEvents();
        return;
    }
    
    // B key for bookmarks
    if (e.key === 'b' || e.key === 'B') {
        if (e.shiftKey) {
            e.preventDefault();
            addBookmark();
        } else if (modifier) {
            e.preventDefault();
            toggleBookmarksPanel();
        }
        return;
    }
    
    // Number keys with Ctrl for bookmark navigation
    if (modifier && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const bookmarkIndex = parseInt(e.key) - 1;
        jumpToBookmark(bookmarkIndex);
        return;
    }
    
    // T for theme toggle
    if (modifier && e.key === 't') {
        e.preventDefault();
        toggleTheme();
        return;
    }
});

function activeElementIsInput() {
    const activeElement = document.activeElement;
    return activeElement.tagName === 'INPUT' || 
           activeElement.tagName === 'TEXTAREA' || 
           activeElement.tagName === 'SELECT';
}

function beginFileNameEdit() {
    if (!fileName) return;

    const originalName = currentFile.name;
    const baseName = stripBpmExtension(originalName);

    fileName.classList.add('editing');
    fileName.innerHTML = '';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = baseName;
    input.setAttribute('aria-label', 'Rename file');
    input.setAttribute('maxlength', '80');
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.autocapitalize = 'none';

    fileName.appendChild(input);
    input.focus();
    input.select();

    let finished = false;

    const finish = (shouldCommit) => {
        if (finished) return;
        finished = true;

        let finalName = originalName;
        if (shouldCommit) {
            finalName = normalizeFileNameInput(input.value);
            currentFile.name = finalName;
        }

        fileName.classList.remove('editing');
        fileName.textContent = finalName;
    };

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            finish(true);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            finish(false);
        }
    });

    input.addEventListener('blur', () => finish(true));
}

function normalizeFileNameInput(value) {
    const cleaned = (value || '').trim().replace(/[\\/:*?"<>|]/g, '');
    const base = cleaned.length > 0 ? cleaned : 'Untitled';
    const hasExtension = base.toLowerCase().endsWith(FILE_EXTENSION);
    const stem = hasExtension ? base.slice(0, -FILE_EXTENSION.length) : base;
    return `${stem}${FILE_EXTENSION}`;
}

function stripBpmExtension(name) {
    if (typeof name !== 'string') return '';
    return name.toLowerCase().endsWith(FILE_EXTENSION)
        ? name.slice(0, -FILE_EXTENSION.length)
        : name;
}

closePanelBtn.addEventListener('click', closeEventPanel);
cancelEventBtn.addEventListener('click', closeEventPanel);
saveEventBtn.addEventListener('click', saveEvent);
deleteEventBtn.addEventListener('click', deleteEvent);

eventType.addEventListener('change', updateEventForm);
bpmChangeType.addEventListener('change', () => {
    gradualOptions.style.display = bpmChangeType.value === 'gradual' ? 'block' : 'none';
});

// Timeline interaction
const timelineWrapper = document.querySelector('.timeline-wrapper');
let isMouseOverTimeline = false;

if (timelineWrapper) {
    timelineWrapper.addEventListener('mouseenter', () => {
        isMouseOverTimeline = true;
    });

    timelineWrapper.addEventListener('mouseleave', () => {
        isMouseOverTimeline = false;
        if (!timelineState.isPlaying && timelineState.cursorMode === 'follow') {
            setCursorTarget(timelineState.cursorPosition, true);
        }
    });

    timelineWrapper.addEventListener('mousemove', (e) => {
        if (timelineState.cursorMode === 'follow' && !timelineState.isPlaying && isMouseOverTimeline) {
            const rect = timelineWrapper.getBoundingClientRect();
            const x = e.clientX - rect.left + timelineWrapper.scrollLeft;
            const measureWidth = MEASURE_WIDTH * timelineState.zoom;
            const measurePosition = Math.max(0, (x - TRACK_LABEL_WIDTH) / measureWidth);
            setCursorTarget(measurePosition);
        }
    });

    // Add right-click context menu for adding events
    timelineWrapper.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        
        // Calculate position from click
        const rect = timelineWrapper.getBoundingClientRect();
        const x = e.clientX - rect.left + timelineWrapper.scrollLeft;
        const measureWidth = MEASURE_WIDTH * timelineState.zoom;
        const measurePosition = Math.max(0, (x - TRACK_LABEL_WIDTH) / measureWidth);
        
        // Convert to measure and beat
        const measure = Math.floor(measurePosition) + 1;
        const measureFraction = measurePosition - (measure - 1);
        const timeSig = getTimeSignatureAt(measure, 1);
        const beatsInMeasure = timeSig.beats || 4;
        const beat = Math.max(1, Math.min(beatsInMeasure, Math.floor(measureFraction * beatsInMeasure) + 1));
        
        // Open add event panel with pre-filled position
        openAddEventPanel(measure, beat);
    });
    
    // Click on empty space to deselect all events
    timelineWrapper.addEventListener('click', (e) => {
        // Don't deselect if we just finished a drag selection
        if (selectionBoxState.didDrag) {
            return;
        }
        
        // Only deselect if clicking directly on timeline wrapper (not on events)
        if (e.target === timelineWrapper || e.target.classList.contains('track-content') || 
            e.target.classList.contains('track') || e.target.classList.contains('timeline-tracks')) {
            document.querySelectorAll('.timeline-event.selected').forEach(el => {
                el.classList.remove('selected');
            });
            selectedEvents.clear();
            showNotification('Selection cleared', 'info');
        }
    });
}

document.querySelectorAll('.track-content').forEach(track => {
    track.addEventListener('click', handleTrackClick);
});

if (fileName) {
    fileName.addEventListener('click', () => {
        if (!fileName.classList.contains('editing')) {
            beginFileNameEdit();
        }
    });
}

// Initialize
function createNewFile() {
    currentFile = {
        name: 'Untitled.bpm',
        events: []
    };
    timelineState = {
        zoom: 1,
        cursorPosition: 0,
        cursorTarget: 0,
        currentBPM: 120,
        currentTimeSig: { beats: 4, unit: 4 },
        isStarted: false,
        isPlaying: false,
        cursorMode: 'click',
        playbackStartTime: null,
        playbackStartPosition: 0,
        playbackBeatPosition: 0,
        lastAnimationTime: null,
        animationFrame: null,
        followAnimationFrame: null
    };
    metronomeState.lastBeatIndex = -1;
    showEditor();
}

function openFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            parseFileContent(content);
            currentFile.name = file.name;
            showEditor();
        } catch (error) {
            alert('Error parsing file: ' + error.message);
        }
    };
    reader.readAsText(file);
    fileInput.value = '';
}

function parseFileContent(content) {
    const lines = content.split('\n').filter(line => line.trim());
    currentFile.events = [];

    lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 3) return;

        const measure = parseInt(parts[0]);
        const beat = parseInt(parts[1]);
        const type = parts[2].toLowerCase();

        let event = { measure, beat, type };

        switch (type) {
            case 'start':
            case 'stop':
                event.type = 'startstop';
                event.command = type;
                break;
            case 'bpm':
                event.value = parseInt(parts[3]);
                break;
            case 'bpm_gradual':
                event.type = 'bpm';
                event.changeType = 'gradual';
                event.value = parseInt(parts[3]);
                event.duration = parseInt(parts[4]);
                break;
            case 'timesig':
                event.beats = parseInt(parts[3]);
                event.unit = parseInt(parts[4]);
                break;
        }

        currentFile.events.push(event);
    });
}

function showEditor() {
    welcomeScreen.style.display = 'none';
    editorScreen.style.display = 'flex';
    fileName.textContent = currentFile.name;
    metronomeState.lastBeatIndex = -1;
    timelineState.cursorTarget = timelineState.cursorPosition;
    timelineState.playbackBeatPosition = cursorPositionToBeatFloat(timelineState.cursorPosition);
    timelineState.lastAnimationTime = null;
    cancelFollowAnimation();
    renderTimeline();
    setupTrackDragHandlers();
    updatePreview();
}

function closeEditor() {
    if (confirm('Are you sure you want to close? Any unsaved changes will be lost.')) {
        // Stop playback if running
        if (timelineState.isPlaying) {
            pausePlayback();
        }
        welcomeScreen.style.display = 'flex';
        editorScreen.style.display = 'none';
    }
}

function renderTimeline() {
    // Calculate needed measures based on events
    const maxEventMeasure = currentFile.events.reduce((max, event) => {
        return Math.max(max, event.measure + (event.duration || 0));
    }, 0);
    
    // Ensure timeline is at least 100 measures, but extends if needed
    TOTAL_MEASURES = Math.max(100, maxEventMeasure + 20);

    timelineState.cursorTarget = Math.min(timelineState.cursorTarget, TOTAL_MEASURES);
    timelineState.cursorPosition = Math.min(timelineState.cursorPosition, TOTAL_MEASURES);

    const measureWidth = MEASURE_WIDTH * timelineState.zoom;
    const timelineWidth = TOTAL_MEASURES * measureWidth;

    if (timelineWrapper) {
        timelineWrapper.style.setProperty('--track-label-width', `${TRACK_LABEL_WIDTH}px`);
        timelineWrapper.style.setProperty('--timeline-width', `${timelineWidth}px`);
    }
    if (timelineRuler) {
        timelineRuler.style.width = `${TRACK_LABEL_WIDTH + timelineWidth}px`;
    }
    [trackStartStop, trackBPM, trackTimeSig].forEach(track => {
        if (track) {
            track.style.minWidth = `${timelineWidth}px`;
            track.style.width = `${timelineWidth}px`;
        }
    });
    
    // Clear tracks
    trackStartStop.innerHTML = '';
    trackBPM.innerHTML = '';
    trackTimeSig.innerHTML = '';

    // Render ruler
    renderRuler();
    rebuildTimelineCaches();
    updateTimelineGridSizing();

    // Render events
    currentFile.events.forEach((event, index) => {
        renderEvent(event, index);
    });

    updateCursor();
}

function renderRuler() {
    timelineRuler.innerHTML = '';
    const measureWidth = MEASURE_WIDTH * timelineState.zoom;

    for (let i = 0; i <= TOTAL_MEASURES; i++) {
        const mark = document.createElement('div');
        mark.className = 'ruler-mark' + (i % 4 === 0 ? ' major' : '');
        mark.style.left = (TRACK_LABEL_WIDTH + i * measureWidth) + 'px';
        mark.textContent = i % 4 === 0 ? i : '';
        timelineRuler.appendChild(mark);
    }
}

function renderEvent(event, index) {
    const eventEl = document.createElement('div');
    eventEl.className = 'timeline-event';
    eventEl.dataset.index = index;
    eventEl.draggable = true;

    const measureWidth = MEASURE_WIDTH * timelineState.zoom;
    const eventTimeSig = getTimeSignatureAt(event.measure, event.beat);
    const beatsPerMeasure = eventTimeSig.beats || timelineState.currentTimeSig.beats;
    const position = ((event.measure - 1) + (event.beat - 1) / beatsPerMeasure) * measureWidth;
    eventEl.style.left = position + 'px';
    
    // Calculate width for gradual BPM events
    let eventWidth = 'auto'; // Default width
    if (event.type === 'bpm' && event.changeType === 'gradual' && event.duration) {
        // Span the duration in measures
        const durationWidth = event.duration * measureWidth;
        eventWidth = Math.max(durationWidth - 4, 60) + 'px'; // Minimum 60px width, subtract 4px for padding
        eventEl.style.width = eventWidth;
        eventEl.classList.add('spans-duration');
    }

    let trackEl, mainText, detailText;

    switch (event.type) {
        case 'startstop':
            trackEl = trackStartStop;
            mainText = event.command.toUpperCase();
            detailText = '';
            eventEl.classList.add('event-startstop');
            if (event.command === 'stop') eventEl.classList.add('stop');
            break;
        case 'bpm':
            trackEl = trackBPM;
            mainText = `${event.value} BPM`;
            if (event.changeType === 'gradual') {
                detailText = `${event.duration}m gradual`;
                eventEl.classList.add('gradual');
            } else {
                detailText = 'Instant';
            }
            eventEl.classList.add('event-bpm');
            break;
        case 'timesig':
            trackEl = trackTimeSig;
            mainText = `${event.beats}/${event.unit}`;
            detailText = 'Time Sig';
            eventEl.classList.add('event-timesig');
            break;
    }

    const positionText = `M${event.measure}:${event.beat}`;

    eventEl.innerHTML = `
        <div class="event-header">
            <span class="event-position">${positionText}</span>
            <span class="event-type">${detailText}</span>
        </div>
        <div class="event-main">${mainText}</div>
    `;
    
    // Check if this event is selected
    if (selectedEvents.has(index)) {
        eventEl.classList.add('selected');
    }
    
    // Single click to select
    eventEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!draggedEvent) {
            // Toggle selection
            if (e.ctrlKey || e.metaKey) {
                // Multi-select with Ctrl/Cmd
                if (selectedEvents.has(index)) {
                    selectedEvents.delete(index);
                    eventEl.classList.remove('selected');
                } else {
                    selectedEvents.add(index);
                    eventEl.classList.add('selected');
                }
            } else {
                // Single select - clear others
                document.querySelectorAll('.timeline-event.selected').forEach(el => {
                    el.classList.remove('selected');
                });
                selectedEvents.clear();
                selectedEvents.add(index);
                eventEl.classList.add('selected');
            }
            updatePreview(); // Update to show selection
        }
    });
    
    // Double click to edit
    eventEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        editEvent(index);
    });
    
    // Right click to edit
    eventEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        editEvent(index);
    });
    
    // Drag and drop handlers
    eventEl.addEventListener('dragstart', (e) => {
        draggedEvent = { index, event: {...event} };
        const rect = eventEl.getBoundingClientRect();
        dragOffset = e.clientX - rect.left;
        eventEl.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
    });
    
    eventEl.addEventListener('dragend', (e) => {
        eventEl.style.opacity = '1';
        draggedEvent = null;
    });

    trackEl.appendChild(eventEl);
}

// Add drag over handlers to tracks
function setupTrackDragHandlers() {
    document.querySelectorAll('.track-content').forEach(track => {
        track.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        
        track.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!draggedEvent) return;
            
            const rect = track.getBoundingClientRect();
            const x = e.clientX - rect.left + track.scrollLeft - dragOffset;
            const measureWidth = MEASURE_WIDTH * timelineState.zoom;
            const measurePosition = x / measureWidth;
            
            const measure = Math.max(1, Math.floor(measurePosition) + 1);
            const measureFraction = measurePosition - Math.floor(measurePosition);
            const targetSig = getTimeSignatureAt(measure, 1);
            const beatsInMeasure = targetSig.beats || timelineState.currentTimeSig.beats;
            const beat = Math.max(1, Math.min(beatsInMeasure, Math.floor(measureFraction * beatsInMeasure) + 1));
            
            // Update event position
            currentFile.events[draggedEvent.index].measure = measure;
            if (draggedEvent.event.type === 'timesig') {
                currentFile.events[draggedEvent.index].beat = 1;
            } else {
                currentFile.events[draggedEvent.index].beat = beat;
            }
            
            // Re-sort events
            currentFile.events.sort(compareEventPositions);
            
            renderTimeline();
            updatePreview();
        });
    });
}

function handleTrackClick(e) {
    if (e.target.classList.contains('track-content') || e.target.classList.contains('timeline-wrapper')) {
        const rect = e.currentTarget.getBoundingClientRect();
        const rawX = e.clientX - rect.left + e.currentTarget.scrollLeft;
        const measureWidth = MEASURE_WIDTH * timelineState.zoom;
        const x = e.currentTarget.classList.contains('timeline-wrapper')
            ? Math.max(0, rawX - TRACK_LABEL_WIDTH)
            : rawX;
        const measurePosition = x / measureWidth;
        const immediate = timelineState.cursorMode === 'click' || timelineState.isPlaying;
        setCursorTarget(measurePosition, immediate);
    }
}

// Transport control functions
function cancelFollowAnimation() {
    if (timelineState.followAnimationFrame) {
        cancelAnimationFrame(timelineState.followAnimationFrame);
        timelineState.followAnimationFrame = null;
    }
}

function startFollowAnimation() {
    if (timelineState.followAnimationFrame || timelineState.cursorMode !== 'follow' || timelineState.isPlaying) return;

    const step = () => {
        const target = timelineState.cursorTarget;
        const current = timelineState.cursorPosition;
        const diff = target - current;

        if (Math.abs(diff) < 0.0005) {
            timelineState.cursorPosition = target;
            if (!timelineState.isPlaying) {
                timelineState.playbackBeatPosition = cursorPositionToBeatFloat(timelineState.cursorPosition);
            }
            updateCursor();
            updatePreview();
            timelineState.followAnimationFrame = null;
            return;
        }

        timelineState.cursorPosition = current + diff * 0.25;
        if (!timelineState.isPlaying) {
            timelineState.playbackBeatPosition = cursorPositionToBeatFloat(timelineState.cursorPosition);
        }
        updateCursor();
        updatePreview();
        timelineState.followAnimationFrame = requestAnimationFrame(step);
    };

    timelineState.followAnimationFrame = requestAnimationFrame(step);
}

function setCursorTarget(position, immediate = false) {
    const constrained = Math.min(Math.max(0, position), TOTAL_MEASURES);
    timelineState.cursorTarget = constrained;

    if (immediate || timelineState.cursorMode !== 'follow' || timelineState.isPlaying) {
        cancelFollowAnimation();
        timelineState.cursorPosition = constrained;
        if (!timelineState.isPlaying) {
            timelineState.playbackBeatPosition = cursorPositionToBeatFloat(timelineState.cursorPosition);
        }
        updateCursor();
        updatePreview();
        return;
    }

    startFollowAnimation();
}

function setCursorMode(mode) {
    timelineState.cursorMode = mode;
    modeClick.classList.toggle('active', mode === 'click');
    modeFollow.classList.toggle('active', mode === 'follow');

    if (mode === 'click') {
        cancelFollowAnimation();
        timelineState.cursorTarget = timelineState.cursorPosition;
    } else {
        setCursorTarget(timelineState.cursorPosition, true);
    }
}

function togglePlayPause() {
    // Provide immediate visual feedback
    playPauseBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        playPauseBtn.style.transform = '';
    }, 100);
    
    if (timelineState.isPlaying) {
        pausePlayback();
    } else {
        startPlayback();
    }
}

async function startPlayback() {
    // Show loading state
    if (metronomeState.enabled) {
        playPauseBtn.classList.add('audio-loading');
    }
    
    timelineState.isPlaying = true;
    cancelFollowAnimation();
    timelineState.cursorTarget = timelineState.cursorPosition;
    timelineState.playbackBeatPosition = cursorPositionToBeatFloat(timelineState.cursorPosition);
    timelineState.lastAnimationTime = performance.now();
    
    playPauseBtn.classList.add('playing');
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';

    // Ensure audio is ready before starting
    if (metronomeState.enabled) {
        try {
            await ensureMetronomeReady();
            if (metronomeState.audioContext && metronomeState.audioContext.state === 'suspended') {
                await metronomeState.audioContext.resume();
            }
        } catch (error) {
            console.warn('Audio setup failed, continuing without metronome audio:', error);
        } finally {
            // Remove loading state
            playPauseBtn.classList.remove('audio-loading');
        }
    }

    if (metronomeOrb) {
        metronomeOrb.classList.add('active');
    }

    const currentBeatFloat = cursorPositionToBeatFloat(timelineState.cursorPosition);
    const floorBeat = Math.floor(currentBeatFloat);
    const isOnBeat = Math.abs(currentBeatFloat - floorBeat) < 1e-4;
    metronomeState.lastBeatIndex = isOnBeat ? floorBeat - 1 : floorBeat;
    
    animatePlayback();
}

function pausePlayback() {
    timelineState.isPlaying = false;
    playPauseBtn.classList.remove('playing');
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
    timelineState.cursorTarget = timelineState.cursorPosition;
    timelineState.lastAnimationTime = null;
    if (metronomeOrb) {
        metronomeOrb.classList.remove('active', 'beat', 'downbeat');
    }
    if (metronomeState.orbTimeout) {
        clearTimeout(metronomeState.orbTimeout);
        metronomeState.orbTimeout = null;
    }
    const currentBeatFloat = cursorPositionToBeatFloat(timelineState.cursorPosition);
    metronomeState.lastBeatIndex = Math.floor(currentBeatFloat);
    
    if (timelineState.animationFrame) {
        cancelAnimationFrame(timelineState.animationFrame);
        timelineState.animationFrame = null;
    }
}

function stopPlayback() {
    pausePlayback();
    setCursorTarget(0, true);
    timelineState.playbackBeatPosition = 0;
    metronomeState.lastBeatIndex = -1;
}

function animatePlayback() {
    if (!timelineState.isPlaying) return;
    
    const now = performance.now();
    const lastTime = timelineState.lastAnimationTime ?? now;
    const deltaSeconds = Math.max(0, (now - lastTime) / 1000);
    timelineState.lastAnimationTime = now;

    const oldBeatPosition = timelineState.playbackBeatPosition;
    const newBeatPosition = advanceBeatPosition(timelineState.playbackBeatPosition, deltaSeconds);
    
    // Debug: Check if beat position is advancing
    if (Math.abs(newBeatPosition - oldBeatPosition) < 1e-9 && deltaSeconds > 0.001) {
        console.warn(`Beat position not advancing: ${oldBeatPosition} -> ${newBeatPosition}, deltaSeconds: ${deltaSeconds}`);
        const currentSegment = getTempoSegmentAtBeat(oldBeatPosition);
        console.warn('Current tempo segment:', currentSegment);
    }
    
    timelineState.playbackBeatPosition = newBeatPosition;

    const measureInfo = measurePositionFromBeatFloat(newBeatPosition);
    timelineState.cursorPosition = measureInfo.measurePosition;
    timelineState.cursorTarget = timelineState.cursorPosition;

    // Stop at end of timeline
    if (timelineState.cursorPosition >= TOTAL_MEASURES) {
        stopPlayback();
        return;
    }

    updateCursor();
    updatePreview();
    processMetronome(newBeatPosition);

    // Auto-scroll timeline to follow cursor
    const measureWidth = MEASURE_WIDTH * timelineState.zoom;
    const baseOffset = TRACK_LABEL_WIDTH;
    const cursorX = baseOffset + timelineState.cursorPosition * measureWidth;
    const viewportWidth = timelineWrapper.clientWidth;
    const scrollLeft = timelineWrapper.scrollLeft;

    if (cursorX > scrollLeft + viewportWidth * 0.75) {
        timelineWrapper.scrollLeft = cursorX - viewportWidth * 0.5;
    } else if (cursorX < scrollLeft + viewportWidth * 0.25) {
        timelineWrapper.scrollLeft = Math.max(0, cursorX - viewportWidth * 0.5);
    }

    timelineState.animationFrame = requestAnimationFrame(animatePlayback);
}

function updateCursor() {
    const measureWidth = MEASURE_WIDTH * timelineState.zoom;
    timelineCursor.style.left = (TRACK_LABEL_WIDTH + timelineState.cursorPosition * measureWidth) + 'px';
}

function updatePreview() {
    const currentBeatFloat = cursorPositionToBeatFloat(timelineState.cursorPosition);
    const measureInfo = measurePositionFromBeatFloat(currentBeatFloat);
    const measureIndex = measureInfo.measure;
    const beatsPerMeasureAtCursor = measureInfo.beatsInMeasure;
    const beatValue = measureInfo.beat;
    let beatNumber = Math.max(1, Math.floor(beatValue + 1e-6));
    if (beatNumber > beatsPerMeasureAtCursor) beatNumber = beatsPerMeasureAtCursor;

    // Find status at cursor position
    let status = 'STOPPED';
    let currentTimeSig = { beats: measureInfo.beatsInMeasure, unit: measureInfo.unit };
    let lastEvent = null;
    let lastEventBeatIndex = -Infinity;

    currentFile.events.forEach(event => {
        const eventBeatIndex = positionToBeatIndex(event.measure, event.beat);
        if (eventBeatIndex <= currentBeatFloat + 1e-6) {
            lastEvent = event;
            lastEventBeatIndex = eventBeatIndex;

            if (event.type === 'startstop') {
                status = event.command.toUpperCase();
            } else if (event.type === 'timesig') {
                currentTimeSig = { beats: event.beats, unit: event.unit };
            }
        }
    });

    // Get the actual current BPM from tempo segments (this handles gradual changes properly)
    const tempoInfo = getTempoInfoAtBeat(currentBeatFloat);
    const currentBPM = tempoInfo.bpm;
    const cursorTimeSig = getTimeSignatureAt(measureIndex, beatNumber);
    currentTimeSig = cursorTimeSig;

    timelineState.isStarted = (status === 'START');
    timelineState.currentBPM = currentBPM;
    timelineState.currentTimeSig = currentTimeSig;

    previewStatus.textContent = status;
    previewStatus.className = 'preview-value ' + (status === 'START' ? 'status-started' : 'status-stopped');
    previewMeasure.textContent = measureIndex;
    previewBeat.textContent = beatNumber;
    previewBPM.textContent = Number.isInteger(currentBPM) ? currentBPM : currentBPM.toFixed(1);
    previewTimeSig.textContent = `${currentTimeSig.beats}/${currentTimeSig.unit}`;

    const totalSeconds = timeFromBeatPosition(currentBeatFloat);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor((totalSeconds % 1) * 1000);
    previewTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;

    let deltaBeats = null;
    if (lastEvent && Number.isFinite(lastEventBeatIndex)) {
        deltaBeats = Math.max(0, currentBeatFloat - lastEventBeatIndex);
        previewDeltaBeats.textContent = formatBeatDelta(deltaBeats);
    } else {
        previewDeltaBeats.textContent = '—';
    }

    updateTimelineStatusMarker(deltaBeats);
    updateTimelineGridSizing();
}

function changeZoom(delta) {
    timelineState.zoom = Math.max(0.25, Math.min(4, timelineState.zoom + delta));
    zoomLevel.textContent = Math.round(timelineState.zoom * 100) + '%';
    renderTimeline();
    updateCursor();
}

// Event Panel Functions
function openAddEventPanel(targetMeasure = null, targetBeat = null) {
    editingEvent = null;
    eventPanelTitle.textContent = 'Add Event';
    deleteEventBtn.style.display = 'none';

    // Set position from right-click or use cursor position
    if (targetMeasure !== null && targetBeat !== null) {
        eventMeasure.value = targetMeasure;
        eventBeat.value = targetBeat;
    } else {
        const measure = Math.floor(timelineState.cursorPosition) + 1;
        const beat = Math.floor((timelineState.cursorPosition % 1) * timelineState.currentTimeSig.beats) + 1;
        eventMeasure.value = measure;
        eventBeat.value = beat;
    }
    
    eventType.value = 'startstop';
    updateEventForm();
    updateBeatInputConstraint();

    eventPanel.style.display = 'flex';
}

function editEvent(index) {
    editingEvent = index;
    const event = currentFile.events[index];
    eventPanelTitle.textContent = 'Edit Event';
    deleteEventBtn.style.display = 'block';

    eventMeasure.value = event.measure;
    eventBeat.value = event.beat;
    eventType.value = event.type;

    switch (event.type) {
        case 'startstop':
            startStopCommand.value = event.command;
            break;
        case 'bpm':
            bpmValue.value = event.value;
            bpmChangeType.value = event.changeType || 'static';
            if (event.changeType === 'gradual') {
                bpmDuration.value = event.duration;
            }
            break;
        case 'timesig':
            timeSigBeats.value = event.beats;
            timeSigUnit.value = event.unit;
            break;
    }

    updateEventForm();
    updateBeatInputConstraint();
    eventPanel.style.display = 'flex';
}

function updateEventForm() {
    const type = eventType.value;
    startStopOptions.style.display = type === 'startstop' ? 'block' : 'none';
    bpmOptions.style.display = type === 'bpm' ? 'block' : 'none';
    timeSigOptions.style.display = type === 'timesig' ? 'block' : 'none';

    if (type === 'bpm') {
        gradualOptions.style.display = bpmChangeType.value === 'gradual' ? 'block' : 'none';
    }

    updateBeatInputConstraint();
}

function closeEventPanel() {
    eventPanel.style.display = 'none';
    editingEvent = null;
}

function saveEvent() {
    const event = {
        measure: parseInt(eventMeasure.value),
        beat: parseInt(eventBeat.value),
        type: eventType.value
    };

    switch (event.type) {
        case 'startstop':
            event.command = startStopCommand.value;
            break;
        case 'bpm':
            const bpmVal = parseInt(bpmValue.value);
            if (!bpmVal || bpmVal <= 0 || bpmVal > 999) {
                alert('BPM must be a positive number between 1 and 999');
                return;
            }
            event.value = bpmVal;
            event.changeType = bpmChangeType.value;
            if (event.changeType === 'gradual') {
                const duration = parseInt(bpmDuration.value);
                if (!duration || duration <= 0) {
                    alert('Duration for gradual BPM change must be a positive number');
                    return;
                }
                event.duration = duration;
            }
            break;
        case 'timesig':
            event.beats = parseInt(timeSigBeats.value);
            event.unit = parseInt(timeSigUnit.value);
            break;
    }

    if (event.type !== 'timesig') {
        const maxBeatsForMeasure = getTimeSignatureAt(event.measure, 1).beats || 4;
        event.beat = Math.min(Math.max(1, event.beat), maxBeatsForMeasure);
    }

    // Save to history before making changes
    saveHistory();

    if (editingEvent !== null) {
        currentFile.events[editingEvent] = event;
    } else {
        currentFile.events.push(event);
    }

    // Sort events by position
    currentFile.events.sort(compareEventPositions);

    closeEventPanel();
    renderTimeline();
    updatePreview();
}

function deleteEvent() {
    if (editingEvent !== null && confirm('Delete this event?')) {
        saveHistory(); // Save to history before deletion
        currentFile.events.splice(editingEvent, 1);
        closeEventPanel();
        renderTimeline();
        updatePreview();
    }
}

function compareEventPositions(a, b) {
    if (a.measure !== b.measure) return a.measure - b.measure;
    return (a.beat || 1) - (b.beat || 1);
}

function rebuildTimelineCaches() {
    timeSigEvents = currentFile.events
        .filter(event => event.type === 'timesig')
        .sort(compareEventPositions);

    bpmEvents = currentFile.events
        .filter(event => event.type === 'bpm')
        .sort(compareEventPositions);

    rebuildTempoSegments();
}

function beatsForGradualEvent(event) {
    if (!event.duration || event.duration <= 0) return 0;
    let remainingMeasures = event.duration;
    let totalBeats = 0;
    let currentMeasure = event.measure;
    let currentBeat = event.beat;
    let firstMeasure = true;

    while (remainingMeasures > 0) {
        const sig = getTimeSignatureAt(currentMeasure, 1);
        const beatsInMeasure = sig.beats || 4;
        if (firstMeasure) {
            totalBeats += Math.max(0, beatsInMeasure - (currentBeat - 1));
            firstMeasure = false;
        } else {
            totalBeats += beatsInMeasure;
        }
        remainingMeasures -= 1;
        currentMeasure += 1;
        currentBeat = 1;
    }

    return totalBeats;
}

function rebuildTempoSegments() {
    tempoSegments = [];
    let currentBPMValue = 120;
    let lastBeatIndex = 0;

    // Validate and clean BPM events
    bpmEvents = bpmEvents.filter(event => {
        if (!event.value || event.value <= 0 || event.value > 999) {
            console.warn(`Removing invalid BPM event with value: ${event.value}`);
            return false;
        }
        return true;
    });

    // Ensure bpmEvents have a base event at (1,1) representing initial tempo if user adds later changes
    if (!bpmEvents.some(e => e.measure === 1 && e.beat === 1)) {
        bpmEvents.unshift({ measure: 1, beat: 1, type: 'bpm', value: currentBPMValue, changeType: 'static', __injected: true });
    }

    if (!bpmEvents.length) {
        tempoSegments.push({
            startBeat: 0,
            endBeat: Infinity,
            type: 'static',
            startBPM: currentBPMValue,
            endBPM: currentBPMValue
        });
        return;
    }

    bpmEvents.forEach(event => {
        const eventBeatIndex = positionToBeatIndex(event.measure, event.beat);

        if (eventBeatIndex > lastBeatIndex) {
            tempoSegments.push({
                startBeat: lastBeatIndex,
                endBeat: eventBeatIndex,
                type: 'static',
                startBPM: currentBPMValue,
                endBPM: currentBPMValue
            });
        }

        if (event.changeType === 'gradual' && event.duration && event.value && event.value > 0) {
            const rampBeats = beatsForGradualEvent(event);
            if (rampBeats > 0 && isFinite(rampBeats)) {
                const endBeatIndex = eventBeatIndex + rampBeats;
                tempoSegments.push({
                    startBeat: eventBeatIndex,
                    endBeat: endBeatIndex,
                    type: 'gradual',
                    startBPM: currentBPMValue,
                    endBPM: event.value
                });
                lastBeatIndex = endBeatIndex;
                currentBPMValue = event.value;
                return; // skip adding static segment starting at this event
            } else {
                console.warn(`Invalid gradual BPM ramp duration: ${rampBeats}`);
                // Fall back to instant change
            }
        }

        if (event.value && event.value > 0) {
            currentBPMValue = event.value;
        }
        lastBeatIndex = eventBeatIndex;
    });

    tempoSegments.push({
        startBeat: lastBeatIndex,
        endBeat: Infinity,
        type: 'static',
        startBPM: currentBPMValue,
        endBPM: currentBPMValue
    });
}

function getTimeSignatureAt(measure, beat = 1) {
    let signature = { beats: 4, unit: 4 };
    for (const event of timeSigEvents) {
        if (event.measure < measure || (event.measure === measure && (event.beat || 1) <= beat)) {
            signature = { beats: event.beats, unit: event.unit };
        } else {
            break;
        }
    }
    if (!signature.beats || signature.beats <= 0) {
        signature.beats = 4;
    }
    return signature;
}

function getBPMAt(measure, beat = 1) {
    const beatIndex = positionToBeatIndex(measure, beat);
    return getTempoInfoAtBeat(beatIndex).bpm;
}

function getTempoSegmentAtBeat(beat) {
    if (!tempoSegments.length) {
        return {
            startBeat: 0,
            endBeat: Infinity,
            type: 'static',
            startBPM: 120,
            endBPM: 120
        };
    }
    for (const segment of tempoSegments) {
        if (beat >= segment.startBeat && beat < segment.endBeat) {
            return segment;
        }
    }
    return tempoSegments[tempoSegments.length - 1];
}

function getTempoInfoAtBeat(beat) {
    const segment = getTempoSegmentAtBeat(beat);
    if (segment.type === 'gradual' && isFinite(segment.endBeat) && segment.endBeat > segment.startBeat) {
        const span = segment.endBeat - segment.startBeat;
        if (span <= 0) return { bpm: segment.startBPM, segment, progress: 0 };
        const clampedBeat = Math.min(Math.max(beat, segment.startBeat), segment.endBeat);
        const progressLinear = (clampedBeat - segment.startBeat) / span;
        // Exponential perception option (slight ease) to feel smoother; keep linear for math
        const progress = progressLinear; 
        const bpm = segment.startBPM + (segment.endBPM - segment.startBPM) * progress;
        return { bpm, segment, progress };
    }
    return { bpm: segment.startBPM, segment, progress: 0 };
}

function beatsUpToMeasure(measure) {
    let beats = 0;
    for (let m = 1; m < measure; m++) {
        const sig = getTimeSignatureAt(m, 1);
        beats += sig.beats || 4;
    }
    return beats;
}

function positionToBeatIndex(measure, beat) {
    const clampedBeat = Math.max(1, beat || 1);
    return beatsUpToMeasure(measure) + (clampedBeat - 1);
}

function cursorPositionToBeatFloat(position) {
    const safePosition = Math.max(0, position);
    const measureIndex = Math.floor(safePosition) + 1;
    const measureFraction = safePosition - (measureIndex - 1);
    const sig = getTimeSignatureAt(measureIndex, 1);
    return beatsUpToMeasure(measureIndex) + measureFraction * (sig.beats || 4);
}

function beatIndexToMeasureBeat(beatIndex) {
    let remaining = Math.max(0, beatIndex);
    let measure = 1;

    while (true) {
        const sig = getTimeSignatureAt(measure, 1);
        const beatsInMeasure = sig.beats || 4;
        if (remaining < beatsInMeasure) {
            return {
                measure,
                beat: remaining + 1,
                beatsInMeasure,
                unit: sig.unit
            };
        }
        remaining -= beatsInMeasure;
        measure += 1;
    }
}

function measurePositionFromBeatFloat(beatFloat) {
    let remaining = Math.max(0, beatFloat);
    let measure = 1;

    while (true) {
        const sig = getTimeSignatureAt(measure, 1);
        const beatsInMeasure = sig.beats || 4;
        if (remaining < beatsInMeasure) {
            const beatValue = remaining + 1;
            const measurePosition = (measure - 1) + (beatValue - 1) / beatsInMeasure;
            return {
                measure,
                beat: beatValue,
                beatsInMeasure,
                unit: sig.unit,
                measurePosition
            };
        }
        remaining -= beatsInMeasure;
        measure += 1;
    }
}

function advanceBeatPosition(startBeat, deltaSeconds) {
    let remainingTime = deltaSeconds;
    let currentBeat = startBeat;
    let safety = 0;
    const maxIterations = 1000;

    // Early return for edge cases
    if (!isFinite(startBeat) || !isFinite(deltaSeconds) || deltaSeconds <= 0) {
        return startBeat;
    }

    while (remainingTime > 1e-6 && safety < maxIterations) {
        const segment = getTempoSegmentAtBeat(currentBeat);
        
        // Validate segment
        if (!segment || !isFinite(segment.startBPM) || segment.startBPM <= 0) {
            console.warn('Invalid tempo segment, using fallback advancement');
            // Fallback: advance at 120 BPM
            const fallbackBeatsPerSecond = 120 / 60;
            return startBeat + (deltaSeconds * fallbackBeatsPerSecond);
        }
        
        const isGradual = segment.type === 'gradual' && 
                         isFinite(segment.endBeat) && 
                         segment.endBeat > segment.startBeat &&
                         isFinite(segment.endBPM) &&
                         segment.endBPM > 0;
        
        const segmentEndBeat = isGradual ? segment.endBeat : (segment.endBeat ?? Infinity);
        const remainingBeatsInSegment = isFinite(segmentEndBeat) ? Math.max(0, segmentEndBeat - currentBeat) : Infinity;

        if (!isGradual || remainingBeatsInSegment <= 1e-6 || Math.abs(segment.endBPM - segment.startBPM) < 1e-6) {
            // Static tempo or negligible tempo change
            const bpm = isGradual && segment.endBPM > 0 ? segment.endBPM : 
                       (segment.startBPM > 0 ? segment.startBPM : 120);
            
            const beatsPerSecond = bpm / 60;
            if (beatsPerSecond <= 0) {
                console.warn('Invalid BPM, using fallback');
                const fallbackBeatsPerSecond = 120 / 60;
                return startBeat + (deltaSeconds * fallbackBeatsPerSecond);
            }
            
            const beatsPossible = remainingTime * beatsPerSecond;
            
            if (!isFinite(remainingBeatsInSegment) || beatsPossible <= remainingBeatsInSegment) {
                currentBeat += beatsPossible;
                remainingTime = 0;
            } else {
                currentBeat += remainingBeatsInSegment;
                remainingTime -= remainingBeatsInSegment / beatsPerSecond;
            }
        } else {
            // Gradual tempo change
            const totalBeats = segment.endBeat - segment.startBeat;
            
            if (totalBeats <= 0) {
                console.warn('Invalid gradual segment duration, using instant change');
                const beatsPerSecond = segment.endBPM / 60;
                currentBeat += remainingTime * beatsPerSecond;
                remainingTime = 0;
                break;
            }
            
            const a = (segment.endBPM - segment.startBPM) / totalBeats;
            const x0 = currentBeat - segment.startBeat;
            const currentBPM = segment.startBPM + a * x0;
            
            if (currentBPM <= 0) {
                console.warn('BPM became negative during gradual change, using fallback');
                const fallbackBeatsPerSecond = 120 / 60;
                return startBeat + (deltaSeconds * fallbackBeatsPerSecond);
            }
            
            // Handle the case where a is very close to zero (essentially constant tempo)
            if (Math.abs(a) < 1e-9) {
                const beatsPerSecond = currentBPM / 60;
                const beatsPossible = remainingTime * beatsPerSecond;
                const beatsToEnd = segment.endBeat - currentBeat;
                
                if (beatsPossible <= beatsToEnd) {
                    currentBeat += beatsPossible;
                    remainingTime = 0;
                } else {
                    currentBeat = segment.endBeat;
                    remainingTime -= beatsToEnd / beatsPerSecond;
                }
            } else {
                try {
                    // Calculate time to reach segment end
                    const ratio = segment.endBPM / currentBPM;
                    if (ratio <= 0) {
                        throw new Error('Invalid BPM ratio');
                    }
                    
                    const timeToSegmentEnd = (60 / a) * Math.log(ratio);
                    
                    // Validate the logarithm result
                    if (!isFinite(timeToSegmentEnd) || timeToSegmentEnd < 0) {
                        throw new Error('Invalid time calculation');
                    }
                    
                    if (remainingTime < timeToSegmentEnd) {
                        // Stay within this segment
                        const exponent = Math.exp((a / 60) * remainingTime);
                        if (!isFinite(exponent)) {
                            throw new Error('Exponential overflow');
                        }
                        
                        const x1 = (currentBPM * exponent - segment.startBPM) / a;
                        currentBeat = segment.startBeat + Math.min(Math.max(x1, 0), totalBeats);
                        remainingTime = 0;
                    } else {
                        // Move to end of segment
                        currentBeat = segment.endBeat;
                        remainingTime -= timeToSegmentEnd;
                    }
                } catch (error) {
                    console.warn('Error in gradual BPM calculation, using linear approximation:', error.message);
                    // Linear approximation fallback
                    const averageBPM = (segment.startBPM + segment.endBPM) / 2;
                    const beatsPerSecond = averageBPM / 60;
                    const beatsPossible = remainingTime * beatsPerSecond;
                    const beatsToEnd = segment.endBeat - currentBeat;
                    
                    if (beatsPossible <= beatsToEnd) {
                        currentBeat += beatsPossible;
                        remainingTime = 0;
                    } else {
                        currentBeat = segment.endBeat;
                        remainingTime -= beatsToEnd / beatsPerSecond;
                    }
                }
            }
        }

        safety += 1;
        
        // Extra safety check for infinite loops
        if (safety >= maxIterations - 10) {
            console.warn(`Approaching max iterations in advanceBeatPosition (${safety}/${maxIterations})`);
        }
        
        // Ensure we're making progress
        if (safety > 10 && currentBeat <= startBeat) {
            console.warn('No progress being made, forcing advancement');
            const fallbackBeatsPerSecond = 120 / 60;
            return startBeat + (deltaSeconds * fallbackBeatsPerSecond);
        }
    }

    if (safety >= maxIterations) {
        console.error('Maximum iterations reached in advanceBeatPosition, using fallback');
        const fallbackBeatsPerSecond = 120 / 60;
        return startBeat + (deltaSeconds * fallbackBeatsPerSecond);
    }

    return currentBeat;
}

function timeFromBeatPosition(targetBeat) {
    let time = 0;
    for (const segment of tempoSegments) {
        if (targetBeat <= segment.startBeat) break;
        const upperBeat = Math.min(targetBeat, segment.endBeat);
        const beatsWithin = upperBeat - segment.startBeat;
        if (beatsWithin <= 0) continue;

        if (segment.type === 'gradual' && isFinite(segment.endBeat) && segment.endBeat > segment.startBeat && Math.abs(segment.endBPM - segment.startBPM) > 1e-6) {
            const totalBeats = segment.endBeat - segment.startBeat;
            const a = (segment.endBPM - segment.startBPM) / totalBeats;
            const b0 = segment.startBPM;
            const x1 = beatsWithin;
            if (a !== 0 && b0 > 0) {
                time += (60 / a) * Math.log((b0 + a * x1) / b0);
            } else {
                const bpm = b0 || segment.endBPM || 120;
                time += (beatsWithin * 60) / bpm;
            }
        } else {
            const bpm = segment.startBPM || segment.endBPM || 120;
            time += (beatsWithin * 60) / bpm;
        }

        if (targetBeat <= segment.endBeat) break;
    }
    return time;
}

function formatBeatDelta(delta) {
    if (delta === null || !isFinite(delta)) return '—';
    if (delta < 0.01) return '0';
    if (delta < 1) return delta.toFixed(2);
    if (delta < 10) return delta.toFixed(1);
    return Math.round(delta).toString();
}

function updateTimelineStatusMarker(deltaBeats) {
    if (!timelineStatusMarker || !markerValue) return;

    if (deltaBeats === null || !isFinite(deltaBeats)) {
        markerValue.textContent = '—';
        timelineStatusMarker.style.opacity = 0.4;
    } else {
        markerValue.textContent = formatBeatDelta(deltaBeats);
        timelineStatusMarker.style.opacity = 1;
    }

    const cursorLeft = parseFloat(timelineCursor.style.left) || TRACK_LABEL_WIDTH;
    const markerWidth = timelineStatusMarker.offsetWidth || 140;
    const measureWidth = MEASURE_WIDTH * timelineState.zoom;
    const totalTimelineWidth = TRACK_LABEL_WIDTH + (TOTAL_MEASURES * measureWidth);
    const minLeft = TRACK_LABEL_WIDTH + 12;
    const maxLeft = Math.max(minLeft, totalTimelineWidth - markerWidth - 12);
    const desiredLeft = Math.min(Math.max(minLeft, cursorLeft + 16), maxLeft);
    timelineStatusMarker.style.left = `${desiredLeft}px`;
}

function updateTimelineGridSizing() {
    if (!timelineWrapper) return;
    const measureWidth = MEASURE_WIDTH * timelineState.zoom;
    const beatsPerMeasure = timelineState.currentTimeSig.beats || 4;
    timelineWrapper.style.setProperty('--measure-width', `${measureWidth}px`);
    timelineWrapper.style.setProperty('--beat-width', `${measureWidth / beatsPerMeasure}px`);
    const timelineWidth = TOTAL_MEASURES * measureWidth;
    timelineWrapper.style.setProperty('--timeline-width', `${timelineWidth}px`);
    timelineWrapper.style.setProperty('--track-label-width', `${TRACK_LABEL_WIDTH}px`);
    if (timelineRuler) {
        timelineRuler.style.width = `${TRACK_LABEL_WIDTH + timelineWidth}px`;
    }
    [trackStartStop, trackBPM, trackTimeSig].forEach(track => {
        if (track) {
            track.style.minWidth = `${timelineWidth}px`;
            track.style.width = `${timelineWidth}px`;
        }
    });
}

function updateBeatInputConstraint() {
    const measureValue = parseInt(eventMeasure.value, 10);
    if (Number.isNaN(measureValue)) return;
    const sig = getTimeSignatureAt(measureValue, 1);
    eventBeat.max = sig.beats || 16;
}

function handleMetronomeToggle(event) {
    metronomeState.enabled = !!event.target.checked;
    
    if (metronomeState.enabled) {
        // Show loading feedback
        if (metronomeOrb) {
            metronomeOrb.classList.add('audio-loading');
        }
        
        ensureMetronomeReady()
            .then(() => {
                if (timelineState.isPlaying && metronomeOrb) {
                    metronomeOrb.classList.add('active');
                }
                console.log('Metronome audio ready');
            })
            .catch((error) => {
                console.warn('Failed to initialize metronome audio:', error);
                showAudioError('Metronome audio could not be loaded. Visual metronome will still work.');
            })
            .finally(() => {
                if (metronomeOrb) {
                    metronomeOrb.classList.remove('audio-loading');
                }
            });
    } else if (metronomeOrb) {
        metronomeOrb.classList.remove('downbeat', 'active', 'audio-loading');
    }
}

async function ensureMetronomeReady() {
    if (!metronomeState.enabled) return Promise.resolve();

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        console.warn('Web Audio API not supported');
        showAudioError('Your browser does not support Web Audio API. Metronome audio will not work.');
        return Promise.resolve();
    }

    try {
        if (!metronomeState.audioContext) {
            metronomeState.audioContext = new AudioContextClass();
        }

        // Resume audio context if suspended (required for autoplay policy)
        if (metronomeState.audioContext.state === 'suspended') {
            await metronomeState.audioContext.resume();
        }

        if (!metronomeState.loadingPromise) {
            const decode = (arrayBuffer) => {
                return metronomeState.audioContext.decodeAudioData(arrayBuffer);
            };

            const fetchAudio = async (url) => {
                try {
                    console.log(`Loading audio sample: ${url}`);
                    const response = await fetch(url, { 
                        cache: 'default',
                        mode: 'cors'
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    return await decode(arrayBuffer);
                } catch (error) {
                    console.error(`Failed to load ${url}:`, error);
                    throw error;
                }
            };

            metronomeState.loadingPromise = Promise.all([
                fetchAudio(METRONOME_SAMPLE_PATHS.high),
                fetchAudio(METRONOME_SAMPLE_PATHS.low)
            ]).then(([highBuffer, lowBuffer]) => {
                metronomeState.buffers.high = highBuffer;
                metronomeState.buffers.low = lowBuffer;
                console.log('Metronome samples loaded successfully');
                showAudioSuccess('Metronome audio ready!');
            }).catch(err => {
                console.error('Failed to load metronome samples:', err);
                metronomeState.loadingPromise = null;
                // Show user-friendly error
                showAudioError('Failed to load metronome sounds. Visual metronome will still work, but no audio.');
                throw err;
            });
        }

        return metronomeState.loadingPromise;
    } catch (error) {
        console.error('Error initializing audio context:', error);
        showAudioError('Audio initialization failed. Please try refreshing the page.');
        return Promise.reject(error);
    }
}

function playMetronomeSample(type) {
    if (!metronomeState.audioContext || metronomeState.audioContext.state !== 'running') {
        console.warn('Audio context not ready');
        return;
    }
    
    const buffer = metronomeState.buffers[type];
    if (!buffer) {
        console.warn(`Audio buffer for ${type} not loaded`);
        return;
    }
    
    try {
        const source = metronomeState.audioContext.createBufferSource();
        const gainNode = metronomeState.audioContext.createGain();
        
        source.buffer = buffer;
        gainNode.gain.value = 0.7; // Reduce volume slightly
        
        source.connect(gainNode);
        gainNode.connect(metronomeState.audioContext.destination);
        
        source.start();
    } catch (error) {
        console.error('Failed to play metronome sample:', error);
    }
}

function flashMetronomeOrb(isDownbeat) {
    if (!metronomeOrb) return;
    metronomeOrb.classList.add('active');
    metronomeOrb.classList.toggle('downbeat', isDownbeat);
    metronomeOrb.classList.remove('beat');
    void metronomeOrb.offsetWidth;
    metronomeOrb.classList.add('beat');

    if (metronomeState.orbTimeout) {
        clearTimeout(metronomeState.orbTimeout);
    }
    metronomeState.orbTimeout = setTimeout(() => {
        metronomeOrb.classList.remove('beat');
    }, 180);
}

function handleMetronomeBeat(beatIndex) {
    const { beat } = beatIndexToMeasureBeat(beatIndex);
    const isDownbeat = Math.round(beat) === 1;
    flashMetronomeOrb(isDownbeat);

    if (!metronomeState.enabled) return;
    ensureMetronomeReady();
    if (metronomeState.buffers.high && metronomeState.audioContext) {
        playMetronomeSampleWithVolume(isDownbeat ? 'high' : 'low');
    }
}

function processMetronome(currentBeatFloat) {
    if (!timelineState.isPlaying || !Number.isFinite(currentBeatFloat)) return;

    const beatIndex = Math.floor(currentBeatFloat);
    if (beatIndex > metronomeState.lastBeatIndex) {
        metronomeState.lastBeatIndex = beatIndex;
        handleMetronomeBeat(beatIndex);
    }
}

// File Operations
function generateFileContent() {
    let content = '';
    currentFile.events.forEach(event => {
        let line = `${event.measure} ${event.beat} `;

        switch (event.type) {
            case 'startstop':
                line += event.command;
                break;
            case 'bpm':
                if (event.changeType === 'gradual') {
                    line += `bpm_gradual ${event.value} ${event.duration}`;
                } else {
                    line += `bpm ${event.value}`;
                }
                break;
            case 'timesig':
                line += `timesig ${event.beats} ${event.unit}`;
                break;
        }

        content += line + '\n';
    });
    return content;
}

function saveFile() {
    const content = generateFileContent();
    // In a real application, this would save to localStorage or a backend
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.name;
    a.click();
    URL.revokeObjectURL(url);
}

function downloadFile() {
    const content = generateFileContent();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.name;
    a.click();
    URL.revokeObjectURL(url);
}

// Audio error handling
function showAudioError(message) {
    showNotification(message, 'error');
}

function showAudioSuccess(message) {
    showNotification(message, 'success');
}

function showNotification(message, type = 'error') {
    // Create or update notification
    let notificationDiv = document.getElementById('audioNotification');
    if (!notificationDiv) {
        notificationDiv = document.createElement('div');
        notificationDiv.id = 'audioNotification';
        document.body.appendChild(notificationDiv);
    }
    
    notificationDiv.className = `audio-notification ${type}`;
    notificationDiv.textContent = message;
    notificationDiv.style.display = 'block';
    
    // Auto-hide after appropriate duration
    const duration = type === 'success' ? 3000 : 5000;
    setTimeout(() => {
        if (notificationDiv) {
            notificationDiv.style.display = 'none';
        }
    }, duration);
}

// ============================================
// NEW FEATURES IMPLEMENTATION
// ============================================

// Cursor Movement
function moveCursor(stepInMeasures) {
    if (timelineState.isPlaying) return;
    const newPosition = Math.max(0, Math.min(TOTAL_MEASURES, timelineState.cursorPosition + stepInMeasures));
    setCursorTarget(newPosition, true);
    updatePreview();
}

// Undo/Redo System
function saveHistory() {
    const state = {
        events: JSON.parse(JSON.stringify(currentFile.events)),
        cursorPosition: timelineState.cursorPosition
    };
    
    historyState.past.push(state);
    if (historyState.past.length > historyState.maxHistory) {
        historyState.past.shift();
    }
    historyState.future = []; // Clear redo history on new action
}

function undo() {
    if (historyState.past.length === 0) {
        showNotification('Nothing to undo', 'error');
        return;
    }
    
    const currentState = {
        events: JSON.parse(JSON.stringify(currentFile.events)),
        cursorPosition: timelineState.cursorPosition
    };
    historyState.future.push(currentState);
    
    const previousState = historyState.past.pop();
    currentFile.events = previousState.events;
    timelineState.cursorPosition = previousState.cursorPosition;
    
    renderTimeline();
    updatePreview();
    showNotification('Undo successful', 'success');
}

function redo() {
    if (historyState.future.length === 0) {
        showNotification('Nothing to redo', 'error');
        return;
    }
    
    const currentState = {
        events: JSON.parse(JSON.stringify(currentFile.events)),
        cursorPosition: timelineState.cursorPosition
    };
    historyState.past.push(currentState);
    
    const nextState = historyState.future.pop();
    currentFile.events = nextState.events;
    timelineState.cursorPosition = nextState.cursorPosition;
    
    renderTimeline();
    updatePreview();
    showNotification('Redo successful', 'success');
}

// Copy/Paste Events
function copySelectedEvents() {
    if (selectedEvents.size === 0) {
        showNotification('No events selected', 'error');
        return;
    }
    
    clipboardEvents = Array.from(selectedEvents).map(index => {
        return JSON.parse(JSON.stringify(currentFile.events[index]));
    });
    showNotification(`Copied ${clipboardEvents.length} event(s)`, 'success');
}

function pasteEvents() {
    if (clipboardEvents.length === 0) {
        showNotification('Clipboard is empty', 'error');
        return;
    }
    
    saveHistory();
    
    const currentBeatFloat = cursorPositionToBeatFloat(timelineState.cursorPosition);
    const measureInfo = measurePositionFromBeatFloat(currentBeatFloat);
    const targetMeasure = measureInfo.measure;
    const targetBeat = Math.floor(measureInfo.beat);
    
    clipboardEvents.forEach(event => {
        const newEvent = JSON.parse(JSON.stringify(event));
        newEvent.measure = targetMeasure;
        newEvent.beat = targetBeat;
        currentFile.events.push(newEvent);
    });
    
    currentFile.events.sort(compareEventPositions);
    renderTimeline();
    showNotification(`Pasted ${clipboardEvents.length} event(s)`, 'success');
}

// Bulk Event Selection and Deletion
function deleteSelectedEvents() {
    if (selectedEvents.size === 0) return;
    
    if (!confirm(`Delete ${selectedEvents.size} selected event(s)?`)) return;
    
    saveHistory();
    
    const indicesToDelete = Array.from(selectedEvents).sort((a, b) => b - a);
    indicesToDelete.forEach(index => {
        currentFile.events.splice(index, 1);
    });
    
    selectedEvents.clear();
    renderTimeline();
    updatePreview();
    showNotification('Events deleted', 'success');
}

// Bookmarks System
function addBookmark() {
    const currentBeatFloat = cursorPositionToBeatFloat(timelineState.cursorPosition);
    const measureInfo = measurePositionFromBeatFloat(currentBeatFloat);
    
    const nickname = prompt('Enter bookmark name:', `M${measureInfo.measure}`);
    if (!nickname) return;
    
    bookmarks.push({
        nickname: nickname,
        measure: measureInfo.measure,
        beat: Math.floor(measureInfo.beat),
        position: timelineState.cursorPosition
    });
    
    updateBookmarksUI();
    showNotification(`Bookmark '${nickname}' added`, 'success');
}

function jumpToBookmark(index) {
    if (index >= bookmarks.length) {
        showNotification('Bookmark not found', 'error');
        return;
    }
    
    const bookmark = bookmarks[index];
    setCursorTarget(bookmark.position, true);
    updatePreview();
    showNotification(`Jumped to '${bookmark.nickname}'`, 'success');
}

function updateBookmarksUI() {
    let bookmarksPanel = document.getElementById('bookmarksPanel');
    if (!bookmarksPanel) {
        bookmarksPanel = document.createElement('div');
        bookmarksPanel.id = 'bookmarksPanel';
        bookmarksPanel.className = 'bookmarks-panel';
        bookmarksPanel.style.display = 'none';
        document.body.appendChild(bookmarksPanel);
    }
    
    bookmarksPanel.innerHTML = `
        <div class=\"bookmarks-header\">
            <h3>Bookmarks</h3>
            <button class=\"btn btn-icon\" onclick=\"toggleBookmarksPanel()\">×</button>
        </div>
        <div class=\"bookmarks-list\">
            ${bookmarks.length === 0 ? '<p class=\"empty-message\">No bookmarks yet. Press Shift+B to add one.</p>' : ''}
            ${bookmarks.map((bookmark, index) => `
                <div class=\"bookmark-item\" onclick=\"jumpToBookmark(${index})\">
                    <div class=\"bookmark-info\">
                        <span class=\"bookmark-name\">${bookmark.nickname}</span>
                        <span class=\"bookmark-position\">M${bookmark.measure}:${bookmark.beat}</span>
                    </div>
                    <button class=\"btn-delete\" onclick=\"event.stopPropagation(); deleteBookmark(${index})\">×</button>
                </div>
            `).join('')}
        </div>
        <div class=\"bookmarks-footer\">
            <small>Ctrl+B: Toggle | Shift+B: Add | Ctrl+1-9: Jump</small>
        </div>
    `;
}

function toggleBookmarksPanel() {
    let bookmarksPanel = document.getElementById('bookmarksPanel');
    if (!bookmarksPanel) {
        updateBookmarksUI();
        bookmarksPanel = document.getElementById('bookmarksPanel');
    }
    
    bookmarksPanel.style.display = bookmarksPanel.style.display === 'none' ? 'flex' : 'none';
}

function deleteBookmark(index) {
    if (confirm(`Delete bookmark '${bookmarks[index].nickname}'?`)) {
        bookmarks.splice(index, 1);
        updateBookmarksUI();
        showNotification('Bookmark deleted', 'success');
    }
}

// Theme Toggle
function toggleTheme() {
    appSettings.theme = appSettings.theme === 'dark' ? 'light' : 'dark';
    document.body.classList.toggle('light-theme', appSettings.theme === 'light');
    localStorage.setItem('appTheme', appSettings.theme);
    showNotification(`Switched to ${appSettings.theme} theme`, 'success');
}

// Volume Control
function setMetronomeVolume(volume) {
    metronomeState.volume = Math.max(0, Math.min(1, volume));
    showNotification(`Volume: ${Math.round(metronomeState.volume * 100)}%`, 'success');
}

// Update playMetronomeSample to use volume
function playMetronomeSampleWithVolume(type) {
    if (!metronomeState.audioContext || metronomeState.audioContext.state !== 'running') {
        console.warn('Audio context not ready');
        return;
    }
    
    const buffer = metronomeState.buffers[type];
    if (!buffer) {
        console.warn(`Audio buffer for ${type} not loaded`);
        return;
    }
    
    try {
        const source = metronomeState.audioContext.createBufferSource();
        const gainNode = metronomeState.audioContext.createGain();
        
        source.buffer = buffer;
        gainNode.gain.value = metronomeState.volume; // Use configured volume
        
        source.connect(gainNode);
        gainNode.connect(metronomeState.audioContext.destination);
        
        source.start();
    } catch (error) {
        console.error('Failed to play metronome sample:', error);
    }
}

// Export Click Track
async function exportClickTrack() {
    if (!bpmData.events || bpmData.events.length === 0) {
        showNotification('No events to export. Add some events first!', 'error');
        return;
    }
    
    showNotification('Generating click track... This may take a moment.', 'info');
    
    try {
        // Ensure audio context is ready
        await ensureMetronomeReady();
        
        // Calculate total duration needed
        let maxMeasure = 1;
        bpmData.events.forEach(event => {
            if (event.measure > maxMeasure) {
                maxMeasure = event.measure;
            }
            if (event.type === 'bpm' && event.gradual) {
                const endMeasure = event.measure + Math.ceil(event.duration / 4);
                if (endMeasure > maxMeasure) {
                    maxMeasure = endMeasure;
                }
            }
        });
        
        // Add extra measures for ending
        maxMeasure += 4;
        
        // Create offline audio context for rendering
        const sampleRate = 44100;
        const duration = calculateTotalDuration(maxMeasure);
        const offlineContext = new OfflineAudioContext(2, duration * sampleRate, sampleRate);
        
        // Generate click track beats
        let currentTime = 0;
        let currentMeasure = 1;
        let currentBeat = 1;
        let currentBPM = 120;
        let currentTimeSig = { upper: 4, lower: 4 };
        let isPlaying = false;
        
        while (currentMeasure <= maxMeasure) {
            // Check for events at this position
            const eventsAtPosition = bpmData.events.filter(e => 
                e.measure === currentMeasure && e.beat === currentBeat
            );
            
            eventsAtPosition.forEach(event => {
                if (event.type === 'startstop') {
                    isPlaying = event.command === 'start';
                } else if (event.type === 'bpm' && !event.gradual) {
                    currentBPM = event.value;
                } else if (event.type === 'timesig') {
                    currentTimeSig = { upper: event.upper, lower: event.lower };
                }
            });
            
            // Play click if we're in playing state
            if (isPlaying) {
                const isDownbeat = currentBeat === 1;
                await addClickToTrack(offlineContext, currentTime, isDownbeat);
            }
            
            // Calculate next beat time
            const beatDuration = 60 / currentBPM;
            currentTime += beatDuration;
            
            // Advance to next beat
            currentBeat++;
            if (currentBeat > currentTimeSig.upper) {
                currentBeat = 1;
                currentMeasure++;
            }
        }
        
        // Render the audio
        const renderedBuffer = await offlineContext.startRendering();
        
        // Convert to WAV
        const wavBlob = bufferToWave(renderedBuffer, renderedBuffer.length);
        
        // Download
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${bpmData.fileName.replace('.bpm', '')}_click_track.wav`;
        a.click();
        URL.revokeObjectURL(url);
        
        showNotification('Click track exported successfully! 🎵', 'success');
    } catch (error) {
        console.error('Error exporting click track:', error);
        showNotification('Failed to export click track. Check console for details.', 'error');
    }
}

// Helper function to add a click to the offline context
async function addClickToTrack(offlineContext, time, isDownbeat) {
    const buffer = metronomeState.buffers[isDownbeat ? 'high' : 'low'];
    if (!buffer) return;
    
    const source = offlineContext.createBufferSource();
    const gainNode = offlineContext.createGain();
    
    source.buffer = buffer;
    gainNode.gain.value = metronomeState.volume;
    
    source.connect(gainNode);
    gainNode.connect(offlineContext.destination);
    
    source.start(time);
}

// Helper function to calculate total duration
function calculateTotalDuration(maxMeasure) {
    let totalSeconds = 0;
    let currentMeasure = 1;
    let currentBPM = 120;
    let currentTimeSig = 4;
    
    while (currentMeasure <= maxMeasure) {
        const beatDuration = 60 / currentBPM;
        totalSeconds += beatDuration * currentTimeSig;
        currentMeasure++;
    }
    
    return totalSeconds;
}

// Helper function to convert AudioBuffer to WAV
function bufferToWave(abuffer, len) {
    const numOfChan = abuffer.numberOfChannels;
    const length = len * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let offset = 0;
    let pos = 0;
    
    // Write WAV header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit
    
    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length
    
    // Write interleaved data
    for (let i = 0; i < abuffer.numberOfChannels; i++) {
        channels.push(abuffer.getChannelData(i));
    }
    
    while (pos < len) {
        for (let i = 0; i < numOfChan; i++) {
            let sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
            view.setInt16(offset, sample, true); // write 16-bit sample
            offset += 2;
        }
        pos++;
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
    
    function setUint16(data) {
        view.setUint16(pos, data, true);
        pos += 2;
    }
    
    function setUint32(data) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
}

// Make function globally accessible
window.exportClickTrack = exportClickTrack;

// Box Selection for Events
let selectionBoxState = {
    isSelecting: false,
    startX: 0,
    startY: 0,
    boxElement: null,
    originalSelection: new Set(), // Track original selection before drag
    didDrag: false // Track if user actually dragged (not just clicked)
};

function initBoxSelection() {
    const timelineWrapper = document.querySelector('.timeline-wrapper');
    if (!timelineWrapper) return;
    
    timelineWrapper.addEventListener('mousedown', (e) => {
        // Only start box selection on empty space (not on events)
        if (e.target.classList.contains('timeline-event') || 
            e.target.closest('.timeline-event')) {
            return;
        }
        
        // Don't interfere with scrollbar
        if (e.offsetX > timelineWrapper.clientWidth || 
            e.offsetY > timelineWrapper.clientHeight) {
            return;
        }
        
        selectionBoxState.isSelecting = true;
        selectionBoxState.didDrag = false; // Reset drag flag
        const rect = timelineWrapper.getBoundingClientRect();
        selectionBoxState.startX = e.clientX - rect.left + timelineWrapper.scrollLeft;
        selectionBoxState.startY = e.clientY - rect.top + timelineWrapper.scrollTop;
        
        // Create selection box element
        selectionBoxState.boxElement = document.createElement('div');
        selectionBoxState.boxElement.className = 'selection-box';
        selectionBoxState.boxElement.style.left = selectionBoxState.startX + 'px';
        selectionBoxState.boxElement.style.top = selectionBoxState.startY + 'px';
        selectionBoxState.boxElement.style.width = '0px';
        selectionBoxState.boxElement.style.height = '0px';
        timelineWrapper.appendChild(selectionBoxState.boxElement);
        
        // Store original selection if Ctrl/Cmd is held
        if (e.ctrlKey || e.metaKey) {
            selectionBoxState.originalSelection = new Set(selectedEvents);
        } else {
            // Clear previous selection if not multi-selecting
            selectionBoxState.originalSelection.clear();
            document.querySelectorAll('.timeline-event.selected').forEach(el => {
                el.classList.remove('selected');
            });
            selectedEvents.clear();
        }
        
        e.preventDefault();
    });
    
    timelineWrapper.addEventListener('mousemove', (e) => {
        if (!selectionBoxState.isSelecting || !selectionBoxState.boxElement) return;
        
        const rect = timelineWrapper.getBoundingClientRect();
        const currentX = e.clientX - rect.left + timelineWrapper.scrollLeft;
        const currentY = e.clientY - rect.top + timelineWrapper.scrollTop;
        
        // Calculate box dimensions
        const left = Math.min(selectionBoxState.startX, currentX);
        const top = Math.min(selectionBoxState.startY, currentY);
        const width = Math.abs(currentX - selectionBoxState.startX);
        const height = Math.abs(currentY - selectionBoxState.startY);
        
        // Mark as dragged if moved more than a few pixels
        if (width > 5 || height > 5) {
            selectionBoxState.didDrag = true;
        }
        
        // Update box visual
        selectionBoxState.boxElement.style.left = left + 'px';
        selectionBoxState.boxElement.style.top = top + 'px';
        selectionBoxState.boxElement.style.width = width + 'px';
        selectionBoxState.boxElement.style.height = height + 'px';
        
        // Check which events intersect with selection box
        const selectionRect = {
            left: left,
            top: top,
            right: left + width,
            bottom: top + height
        };
        
        // Start with original selection (if Ctrl/Cmd held)
        const newSelection = new Set(selectionBoxState.originalSelection);
        
        document.querySelectorAll('.timeline-event').forEach((eventEl) => {
            const eventRect = {
                left: eventEl.offsetLeft,
                top: eventEl.offsetTop,
                right: eventEl.offsetLeft + eventEl.offsetWidth,
                bottom: eventEl.offsetTop + eventEl.offsetHeight
            };
            
            // Check intersection
            const intersects = !(
                selectionRect.right < eventRect.left ||
                selectionRect.left > eventRect.right ||
                selectionRect.bottom < eventRect.top ||
                selectionRect.top > eventRect.bottom
            );
            
            const eventIndex = parseInt(eventEl.dataset.index);
            
            if (intersects) {
                // Add intersecting events to selection
                newSelection.add(eventIndex);
                eventEl.classList.add('selected');
            } else {
                // Only remove if not in original selection
                if (!selectionBoxState.originalSelection.has(eventIndex)) {
                    newSelection.delete(eventIndex);
                    eventEl.classList.remove('selected');
                } else {
                    // Keep originally selected events
                    eventEl.classList.add('selected');
                }
            }
        });
        
        // Update the global selection set
        selectedEvents.clear();
        newSelection.forEach(idx => selectedEvents.add(idx));
    });
    
    const endSelection = () => {
        if (selectionBoxState.isSelecting) {
            const wasDragging = selectionBoxState.didDrag;
            
            selectionBoxState.isSelecting = false;
            // Don't reset didDrag here - let it persist to prevent click handler from clearing
            // It will be reset on the next mousedown
            
            if (selectionBoxState.boxElement) {
                selectionBoxState.boxElement.remove();
                selectionBoxState.boxElement = null;
            }
            
            if (wasDragging && selectedEvents.size > 0) {
                showNotification(`${selectedEvents.size} event(s) selected`, 'info');
            }
            
            // Reset didDrag after a short delay to allow click handler to check it
            setTimeout(() => {
                selectionBoxState.didDrag = false;
            }, 10);
        }
    };
    
    timelineWrapper.addEventListener('mouseup', endSelection);
    document.addEventListener('mouseup', endSelection);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('metsync web editor initialized');
    
    // Load saved theme
    const savedTheme = localStorage.getItem('appTheme') || 'dark';
    appSettings.theme = savedTheme;
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }
    
    // Initialize UI enhancements
    addVolumeControl();
    addGridLines();
    updateBookmarksUI();
    addKeyboardShortcutHints();
    initBoxSelection();
    
    // Pre-load audio when user first interacts
    const initAudio = () => {
        if (metronomeState.enabled) {
            ensureMetronomeReady().catch(console.error);
        }
        // Remove the listener after first interaction
        document.removeEventListener('click', initAudio);
        document.removeEventListener('keydown', initAudio);
    };
    
    document.addEventListener('click', initAudio);
    document.addEventListener('keydown', initAudio);
    
    // Show welcome hints
    setTimeout(() => {
        showNotification('💡 Right-click timeline to add events | Press Ctrl+B for bookmarks', 'success');
    }, 1000);
});

// Add Volume Control to UI
function addVolumeControl() {
    const volumeContainer = document.getElementById('volumeControlContainer');
    if (!volumeContainer) return;
    
    volumeContainer.className = 'volume-control';
    volumeContainer.innerHTML = `
        <label>Volume</label>
        <input type="range" id="volumeSlider" min="0" max="100" value="70" class="volume-slider">
        <span id="volumeValue">70%</span>
    `;
    
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    
    volumeSlider.addEventListener('input', (e) => {
        const volume = parseInt(e.target.value) / 100;
        setMetronomeVolume(volume);
        volumeValue.textContent = `${e.target.value}%`;
    });
}

// Add Grid Lines
function addGridLines() {
    if (!appSettings.showGridLines) return;
    
    const ruler = document.getElementById('timelineRuler');
    if (ruler) {
        ruler.classList.add('show-grid-lines');
    }
}

// Add Keyboard Shortcut Hints
function addKeyboardShortcutHints() {
    const hints = document.createElement('div');
    hints.className = 'shortcut-hint';
    hints.innerHTML = `
        <strong>Keyboard Shortcuts (Press ? or Cmd+/ to toggle):</strong><br>
        Space: Play/Pause | Arrows: Navigate | Delete: Remove<br>
        Click: Select | Drag: Box Select | Dbl-Click/Right-Click: Edit<br>
        Ctrl+Click: Multi-Select | Ctrl+Z/Y: Undo/Redo<br>
        Ctrl+S: Save | Ctrl+C/V: Copy/Paste | Ctrl+B: Bookmarks<br>
        Shift+B: Add Bookmark | Ctrl+T: Theme | ESC: Close | 1-3: Event Types
    `;
    document.body.appendChild(hints);
    
    // Show hints briefly on load, then hide
    setTimeout(() => hints.classList.add('show'), 500);
    setTimeout(() => hints.classList.remove('show'), 8000);
    
    // Show hints when ? key is pressed (Shift+/ or Cmd+/)
    document.addEventListener('keydown', (e) => {
        // Check for ? which is Shift+/ or Cmd+/
        if ((e.key === '?' || e.key === '/' && e.shiftKey || (e.metaKey && e.key === '/')) && !activeElementIsInput()) {
            e.preventDefault();
            hints.classList.toggle('show');
        }
    });
}

// Make functions globally accessible
window.toggleBookmarksPanel = toggleBookmarksPanel;
window.jumpToBookmark = jumpToBookmark;
window.deleteBookmark = deleteBookmark;
window.toggleTheme = toggleTheme;

