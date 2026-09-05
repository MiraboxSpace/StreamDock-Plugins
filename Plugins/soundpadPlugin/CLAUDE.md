# Soundpad Plugin for StreamDock

A StreamDock plugin that integrates with [Soundpad](https://leppsoft.com/soundpad/) (a Windows soundboard app) via named pipes, allowing you to play, stop, pause, record, and manage sounds directly from a StreamDock device without configuring hotkeys.

## Tech Stack

- **C++17** with **Qt 5.15.2** (MSVC 2019, 64-bit)
- **qmake** build system (`.pro` files)
- **Qt modules**: Core, GUI, Widgets, XML, WebSockets, Network
- **PropertyInspector UI**: Vanilla HTML/CSS/JS — no framework, uses Bootstrap Icons CSS
- **IPC**: Windows named pipes (`\\.\pipe\sp_remote_control`) to communicate with `Soundpad.exe`

## Build

Open `qmake/StreamDockQtPlugin/SoundpadPlugin.pro` in Qt Creator, or build from command line:

```bash
cd qmake/StreamDockQtPlugin
qmake SoundpadPlugin.pro
make          # or nmake on Windows
```

The build output (`SoundpadPlugin.exe`) is placed into `com.hotspot.soundpad.sdPlugin/`.

**Build requirements**: Qt 5.15.2 with MSVC 2019 64-bit compiler, Windows SDK.

## Running

Copy the `com.hotspot.soundpad.sdPlugin/` directory into the StreamDock plugins folder. The StreamDock software launches `SoundpadPlugin.exe` and communicates via WebSocket on `ws://127.0.0.1:<port>`.

## Code Organization

```
SDK/                          # StreamDock plugin SDK (provided by vendor)
├── BasePlugin.h/cpp           #   Abstract base for all plugins
├── Plugin.h/cpp               #   Mid-layer — action routing & lifecycle
├── Action.h/cpp               #   Base action class — event stubs & send helpers
├── ConnectionManager.h/cpp    #   WebSocket client ↔ StreamDock software
├── CustomMain.h/cpp           #   CLI arg parsing, plugin init, event loop
├── Logger.h/cpp               #   Static logger (LogToServer, LogToFile)
├── Localizer.h/cpp            #   i18n support
├── SDKDefines.h               #   String constants for SDK events/payloads
└── SDK.pri                    #   qmake include file for the SDK

qmake/StreamDockQtPlugin/      # Plugin source
├── SoundpadPlugin.pro     #   qmake project file
├── main.cpp                   #   Entry point — QCoreApplication + SoundpadPlugin
├── SoundpadPlugin.h/cpp        #   Plugin subclass — action factory & lifecycle
└── SoundpadAction.h/cpp        #   Action subclass — Soundpad pipe commands

com.hotspot.soundpad.sdPlugin/ # Plugin distribution package
├── manifest.json              #   Plugin manifest — actions, metadata, OS targets
├── en.json / zh_CN.json       #   Localization strings
├── SoundpadPlugin.exe     #   Built plugin binary
├── PropertyInspector/         #   One subfolder per action UUID
│   ├── SoundpadPlay/          #     index.html + index.js
│   ├── SoundpadPlayRandom/
│   ├── soundpadpause/
│   ├── soundpadremove/
│   ├── soundpadstop/
│   ├── soundpadrecordptt/
│   ├── soundpadloadsoundlist/
│   └── utils/
│       ├── common.js          #     DOM helpers, EventPlus, throttle/debounce
│       └── action.js          #     WebSocket ↔ StreamDock glue ($websocket, $settings)
├── Images/                    #   Icons & button images (@1x + @2x PNGs)
├── static/css/                #   Shared CSS (sdpi.css, bootstrap)
└── translations/              #   Qt .qm translation files
```

## Architecture

### Class Hierarchy

```
BasePlugin                   (SDK — abstract, receives all StreamDock events)
  └── Plugin                 (SDK — routes events to Action instances by context)
        └── SoundpadPlugin    (your code — owns Action map, factory, cleanup)

Action                       (SDK — virtual event handlers, send helpers)
  └── SoundpadAction          (your code — named-pipe IPC with Soundpad.exe)
```

### Lifecycle

1. StreamDock software launches `SoundpadPlugin.exe` with CLI args (`-port`, `-pluginUUID`, `-registerEvent`, `-info`)
2. `main.cpp` creates a `QCoreApplication`, instantiates `SoundpadPlugin`, calls `CustomMain()`
3. `CustomMain` parses args, creates `ConnectionManager` (WebSocket client), connects to StreamDock
4. StreamDock sends `willAppear` → Plugin calls `GetOrCreateAction(action, context)` → creates `SoundpadAction`
5. User presses key → `KeyDown`/`KeyUp` dispatched to the matching `SoundpadAction` instance
6. `SoundpadAction` opens `\\.\pipe\sp_remote_control`, sends text commands, parses XML responses

### Adding a New Action

1. **manifest.json**: Add a new entry under `"Actions"` with a unique `UUID`, point `PropertyInspectorPath` at a new HTML file
2. **SoundpadPlugin.cpp**: Add the UUID string to both the `GetOrCreateAction` and `RemoveAction` whitelists
3. **SoundpadAction.cpp**: Add an `else if` branch in `KeyDown()` (and `KeyUp()` if needed) for the new action
4. **PropertyInspector/**: Create a new folder with `index.html` + `index.js` for the action's settings UI

### Named Pipe Protocol

Soundpad.exe listens on `\\.\pipe\sp_remote_control`. Commands are plain text strings sent via `WriteFile`, responses are XML read via `ReadFile` and parsed with `QDomDocument`.

Example commands:
- `DoPlaySound(0)` — play sound at index 0
- `DoStopSound()` — stop playback
- `DoTogglePause()` — pause/unpause
- `DoStartRecording()` / `DoStopRecording()` — PTT recording
- `GetCategories(true, false)` — returns XML with categories and sounds
- `DoAddSound(url, categoryId, index)` — add a sound to Soundpad
- `DoRemoveSelectedEntries(false)` — remove selected entry

The pipe connection loop in `FindAndConnectPipe()` retries on `ERROR_PIPE_BUSY` and also verifies `Soundpad.exe` is running via `EnumProcesses`.

### PropertyInspector JS Patterns

Each action's `index.html` includes three scripts in order:
1. `utils/common.js` — `EventPlus` class, `$()` DOM selector, `throttle`/`debounce`
2. `utils/action.js` — `connectElgatoStreamDeckSocket()`, `$websocket`, `$settings` Proxy, `setImage`/`sendToPlugin` helpers
3. `index.js` — action-specific logic

Settings are persisted via a `$settings` Proxy that auto-saves on assignment. Incoming events are dispatched through a `$propEvent` object: `$propEvent.didReceiveSettings(data)`, `$propEvent.sendToPropertyInspector(data)`, etc.

## Conventions

- **C++ naming**: PascalCase classes, camelCase methods/variables. Member variables prefixed with `m` in SDK classes; plugin code is less consistent (e.g., plain `action` in `SoundpadAction`).
- **JS naming**: camelCase functions/variables. `$` prefix for global references (`$websocket`, `$settings`, `$dom`). `$propEvent` object dispatches incoming events from StreamDock.
- **Logging**: Use `Logger::LogToServer()` for debug messages — they appear in the StreamDock console.
- **Thread safety**: `SoundpadPlugin` uses `QMutex` + `QMutexLocker` to guard the `mActions` map.
- **Action UUIDs**: Reverse-domain style (`com.hotspot.soundpadplay`, `com.hotspot.soundpadstop`, etc.)
- **Image assets**: Provide both `@1x` and `@2x` PNGs (e.g., `sound.png` + `sound@2x.png`)
