//==============================================================================
/**
@file       MouseSimulatorAction.cpp

@brief      Per-button action — handles settings, playback, and recording.
**/
//==============================================================================

#include "action/MouseSimulatorAction.h"
#include "connection/SdConnectionManager.h"
#include "simulation/MouseSimulationEngine.h"
#include "recording/InputRecorder.h"
#include "logging/Logger.h"

#include <QCoreApplication>
#include <algorithm>

//==============================================================================
// Construction / Destruction
//==============================================================================

MouseSimulatorAction::MouseSimulatorAction(
    SdConnectionManager* connection,
    const QString& action,
    const QString& context,
    QObject* parent)
    : QObject(parent)
    , mConnection(connection)
    , mAction(action)
    , mContext(context)
{
}

MouseSimulatorAction::~MouseSimulatorAction()
{
    stopAll();
}

//==============================================================================
// Settings helpers
//==============================================================================

/// Parse a bool from json — handles both boolean and string "true"/"false"
static bool jsonGetBool(const json& obj, const std::string& key, bool defaultVal = false)
{
    auto it = obj.find(key);
    if (it == obj.end()) return defaultVal;
    if (it->is_boolean()) return it->get<bool>();
    if (it->is_string()) return it->get<std::string>() == "true";
    if (it->is_number()) return it->get<int>() != 0;
    return defaultVal;
}

/// Get a string value from json
static std::string jsonGetString(const json& obj, const std::string& key,
                                  const std::string& defaultVal = "")
{
    auto it = obj.find(key);
    if (it == obj.end()) return defaultVal;
    if (it->is_string()) return it->get<std::string>();
    return defaultVal;
}

/// Get an int value from json (handles string-encoded numbers)
static int jsonGetInt(const json& obj, const std::string& key, int defaultVal = 0)
{
    auto it = obj.find(key);
    if (it == obj.end()) return defaultVal;
    if (it->is_number_integer()) return it->get<int>();
    if (it->is_string()) {
        try { return std::stoi(it->get<std::string>()); }
        catch (...) { return defaultVal; }
    }
    return defaultVal;
}

void MouseSimulatorAction::applySettings(const json& payload)
{
    // The payload may have a "settings" wrapper (from didReceiveSettings)
    // or be the settings directly (from sendToPlugin)
    const json* settings = &payload;
    json settingsWrapper;
    auto it = payload.find(kSDPayloadSettings);
    if (it != payload.end() && it->is_object()) {
        settingsWrapper = *it;
        settings = &settingsWrapper;
    }

    mSettings.clipboardInput   = jsonGetString(*settings, "my_clipboard_input");
    mSettings.recordExeHelper  = jsonGetString(*settings, "my_record_exe_helper");
    mSettings.ignoreDelay      = jsonGetBool(*settings, "my_delay_status_helper");
    mSettings.warpEnabled      = jsonGetBool(*settings, "my_warp_status_helper");
    mSettings.softStartEnabled = jsonGetBool(*settings, "my_softstart_status_helper");
    mSettings.audioEnabled     = jsonGetBool(*settings, "my_audio_status_helper");
    mSettings.recordKey        = jsonGetString(*settings, "my_record_key", "F10");
    mSettings.loopCount        = jsonGetInt(*settings, "my_loop", 0);
    mSettings.typewriterDelay  = jsonGetInt(*settings, "my_typewriter", 10);

    Logger::instance()->log("[Action] Settings applied. warp:%d softStart:%d ignoreDelay:%d loop:%d (context: %s)",
        mSettings.warpEnabled, mSettings.softStartEnabled, mSettings.ignoreDelay,
        mSettings.loopCount, qPrintable(mContext));
}

//==============================================================================
// Event handlers
//==============================================================================

void MouseSimulatorAction::didReceiveSettings(const json& payload)
{
    Logger::instance()->log("[Action] didReceiveSettings (context: %s)", qPrintable(mContext));

    // Restore settings but do NOT act on transient commands
    // (my_record_exe_helper may be replayed from persistent storage)
    std::string savedCommand = mSettings.recordExeHelper; // preserve
    applySettings(payload);
    // After restore, do NOT re-execute transient commands
    // (sendToPlugin is the authoritative source for commands)
    Q_UNUSED(savedCommand);
}

void MouseSimulatorAction::keyDown(const json& payload)
{
    Logger::instance()->log("[Action] keyDown (context: %s)", qPrintable(mContext));

    // Check multi-action state
    bool isInMultiAction = payload.value(kSDPayloadIsInMultiAction, false);

    if (mIsPlaying) {
        // Second press = stop playback
        stopPlayback();
    } else {
        // Start playback
        startPlayback();
    }
}

void MouseSimulatorAction::keyUp(const json& payload)
{
    Q_UNUSED(payload);
    Logger::instance()->log("[Action] keyUp (context: %s)", qPrintable(mContext));
    // No-op: showOK is only called on natural playback completion (onPlaybackFinished).
    // Calling it on every keyUp was causing a misleading green checkmark on every release.
}

void MouseSimulatorAction::sendToPlugin(const json& payload)
{
    Logger::instance()->log("[Action] sendToPlugin (context: %s)", qPrintable(mContext));

    // Apply settings update from PI
    applySettings(payload);

    // Check for transient recording commands
    if (mSettings.recordExeHelper == "START_RECORD") {
        Logger::instance()->log("[Action] Received command: START_RECORD (context: %s)", qPrintable(mContext));
        startRecording();
    } else if (mSettings.recordExeHelper == "STOP_RECORD") {
        Logger::instance()->log("[Action] Received command: STOP_RECORD (context: %s)", qPrintable(mContext));
        stopRecording();
    }
}

void MouseSimulatorAction::willAppear(const json& payload)
{
    Logger::instance()->log("[Action] willAppear (context: %s)", qPrintable(mContext));

    // Restore settings that StreamDeck persisted
    applySettings(payload);
}

void MouseSimulatorAction::willDisappear(const json& payload)
{
    Q_UNUSED(payload);
    Logger::instance()->log("[Action] willDisappear (context: %s)", qPrintable(mContext));

    // Stop any running playback when button disappears
    stopPlayback();
}

void MouseSimulatorAction::propertyInspectorDidAppear(const json& payload)
{
    Q_UNUSED(payload);
    Logger::instance()->log("[Action] propertyInspectorDidAppear (context: %s)", qPrintable(mContext));

    // Send current settings to PI so it syncs its UI
    json settings;
    settings["my_audio_status_helper"]    = mSettings.audioEnabled ? "true" : "false";
    settings["my_delay_status_helper"]    = mSettings.ignoreDelay ? "true" : "false";
    settings["my_warp_status_helper"]     = mSettings.warpEnabled ? "true" : "false";
    settings["my_softstart_status_helper"] = mSettings.softStartEnabled ? "true" : "false";
    settings["my_record_exe_helper"]      = "";
    settings["my_record_key"]             = mSettings.recordKey;
    settings["my_loop"]                   = std::to_string(mSettings.loopCount);
    settings["my_typewriter"]             = std::to_string(mSettings.typewriterDelay);
    settings["my_clipboard_input"]        = mSettings.clipboardInput;

    sendToPropertyInspector(settings);
}

//==============================================================================
// Playback control
//==============================================================================

void MouseSimulatorAction::startPlayback()
{
    if (mIsPlaying) return;

    // Clean up any stale engine/thread from a previous run that hasn't been
    // deleted yet (deleteLater is deferred). Without this, the stale pointers
    // would be overwritten below and the old signal connections could fire
    // onPlaybackFinished during the new playback, resetting mIsPlaying early.
    if (mPlaybackThread) {
        mPlaybackThread->quit();
        mPlaybackThread->wait(1000);
        mEngine = nullptr;
        mPlaybackThread = nullptr;
    }

    if (mSettings.clipboardInput.empty()) {
        Logger::instance()->log("[WARN] [Action] No recorded stream to play (context: %s)", qPrintable(mContext));
        showAlert();
        return;
    }

    Logger::instance()->log("[Action] Starting playback — warp:%d softStart:%d ignoreDelay:%d loop:%d typewriter:%d (context: %s)",
        mSettings.warpEnabled, mSettings.softStartEnabled, mSettings.ignoreDelay,
        mSettings.loopCount, mSettings.typewriterDelay, qPrintable(mContext));

    // Set button state to "playing" (state 1)
    setState(1);
    mIsPlaying = true;

    // Create engine and thread
    mPlaybackThread = new QThread(this);
    mEngine = new MouseSimulationEngine();

    // Configure engine
    MouseSimulationEngine::SimulationConfig config;
    config.warpEnabled      = mSettings.warpEnabled;
    config.softStartEnabled = mSettings.softStartEnabled;
    config.ignoreDelay      = mSettings.ignoreDelay;
    // Scale slider value (0-100) to a wider delay range for extremes.
    // 5x factor: 0=instant, 10(default)→50ms, 100→500ms (2 keystrokes/sec)
    static const int kTypewriterScaleFactor = 5;
    config.typewriterDelay  = std::max(0, mSettings.typewriterDelay) * kTypewriterScaleFactor;
    config.loopCount        = mSettings.loopCount;
    config.audioEnabled     = mSettings.audioEnabled;
    // rawStream should be the decompressed instruction stream.
    // Without LZ-String, we check if it's already raw (starts with #START#)
    // or if it's Base64-encoded (LZ-String compressed — not supported yet).
    if (mSettings.clipboardInput.find("#START#") == 0) {
        config.rawStream = mSettings.clipboardInput;
    } else {
        // LZ-String compressed stream — not supported without LZ-String C++ port
        Logger::instance()->log("[WARN] [Action] LZ-String compressed stream detected — decompression not implemented (context: %s)", qPrintable(mContext));
        showAlert();
        mIsPlaying = false;
        setState(0);
        return;
    }

    mEngine->setConfig(config);
    mEngine->moveToThread(mPlaybackThread);

    // Wire signals
    connect(mPlaybackThread, &QThread::started,
            mEngine, &MouseSimulationEngine::run);
    connect(mEngine, &MouseSimulationEngine::finished,
            this, &MouseSimulatorAction::onPlaybackFinished);
    connect(mEngine, &MouseSimulationEngine::finished,
            mPlaybackThread, &QThread::quit);
    connect(mPlaybackThread, &QThread::finished,
            mEngine, &QObject::deleteLater);
    connect(mPlaybackThread, &QThread::finished,
            mPlaybackThread, &QObject::deleteLater);

    // Start
    mPlaybackThread->start();
}

void MouseSimulatorAction::stopPlayback()
{
    if (!mIsPlaying) return;

    Logger::instance()->log("[Action] Stopping playback (context: %s)", qPrintable(mContext));
    mIsPlaying = false;

    if (mEngine) {
        mEngine->requestStop();
    }

    // Wait for thread to finish (with timeout)
    if (mPlaybackThread && mPlaybackThread->isRunning()) {
        mPlaybackThread->quit();
        if (!mPlaybackThread->wait(3000)) {
            Logger::instance()->log("[WARN] [Action] Playback thread terminated due to timeout (context: %s)", qPrintable(mContext));
            mPlaybackThread->terminate();
            mPlaybackThread->wait(1000);
        }
    }

    mEngine = nullptr;
    mPlaybackThread = nullptr;

    // Reset button state
    setState(0);
}

void MouseSimulatorAction::onPlaybackFinished()
{
    Logger::instance()->log("[Action] Playback finished (context: %s)", qPrintable(mContext));
    mIsPlaying = false;
    mEngine = nullptr;
    mPlaybackThread = nullptr;
    setState(0);
}

//==============================================================================
// Recording
//==============================================================================

void MouseSimulatorAction::startRecording()
{
    if (mIsRecording) return;

    if (!mRecorder) {
        mRecorder = new InputRecorder(this);
        connect(mRecorder, &InputRecorder::recordingSaved,
                this, &MouseSimulatorAction::onRecordingSaved);
    }

    bool ok = mRecorder->startRecording(mSettings.recordKey);
    if (ok) {
        mIsRecording = true;
        setState(1); // Visual feedback on button
        Logger::instance()->log("[Action] Recording started — save key: %s (context: %s)",
            mSettings.recordKey.c_str(), qPrintable(mContext));
    } else {
        Logger::instance()->log("[ERROR] [Action] Failed to start recording (context: %s)", qPrintable(mContext));
        showAlert();
    }
}

void MouseSimulatorAction::stopRecording()
{
    if (!mIsRecording) return;

    Logger::instance()->log("[Action] Stopping recording (context: %s)", qPrintable(mContext));
    if (mRecorder) {
        mRecorder->stopRecording();
    }
    mIsRecording = false;
    setState(0);
}

void MouseSimulatorAction::onRecordingSaved(const std::string& recordStream)
{
    Logger::instance()->log("[Action] Recording saved — stream length: %zu (context: %s)",
        recordStream.size(), qPrintable(mContext));

    mIsRecording = false;
    setState(0);

    // Update settings with new stream
    mSettings.clipboardInput = recordStream;

    // Persist to StreamDeck
    json settings;
    settings["my_clipboard_input"] = recordStream;
    settings["my_record_exe_helper"] = "";
    setSettings(settings);

    // Notify PI to update its UI
    sendToPropertyInspector(settings);
}

//==============================================================================
// Stop all (called on shutdown)
//==============================================================================

void MouseSimulatorAction::stopAll()
{
    stopPlayback();
    stopRecording();
    if (mRecorder) {
        mRecorder->stopRecording();
    }
}

//==============================================================================
// Convenience wrappers for connection manager commands
//==============================================================================

void MouseSimulatorAction::setState(int state)
{
    if (mConnection) {
        mConnection->setState(state, mContext);
    }
}

void MouseSimulatorAction::setTitle(const QString& title,
                                    ESDSDKTarget target, int state)
{
    if (mConnection) {
        mConnection->setTitle(title, mContext, target, state);
    }
}

void MouseSimulatorAction::setImage(const QString& base64Image,
                                    ESDSDKTarget target, int state)
{
    if (mConnection) {
        mConnection->setImage(base64Image, mContext, target, state);
    }
}

void MouseSimulatorAction::showAlert()
{
    if (mConnection) {
        mConnection->showAlert(mContext);
    }
}

void MouseSimulatorAction::showOK()
{
    if (mConnection) {
        mConnection->showOK(mContext);
    }
}

void MouseSimulatorAction::setSettings(const json& settings)
{
    if (mConnection) {
        mConnection->setSettings(settings, mContext);
    }
}

void MouseSimulatorAction::sendToPropertyInspector(const json& payload)
{
    if (mConnection) {
        mConnection->sendToPropertyInspector(mAction, mContext, payload);
    }
}
