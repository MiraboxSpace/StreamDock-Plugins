//==============================================================================
/**
@file       MouseSimulatorAction.h

@brief      Per-button action handler.
            Manages settings, playback state, and recording for one button instance.

            Equivalent to HSDExampleAction in DEMO_CPPSDK.
**/
//==============================================================================

#pragma once

#include <QObject>
#include <QThread>
#include <QAtomicInt>
#include <nlohmann/json.hpp>

#include "protocol/SdProtocolDefines.h"
#include "state/PluginSettings.h"

using json = nlohmann::json;

class SdConnectionManager;
class MouseSimulationEngine;
class InputRecorder;

class MouseSimulatorAction : public QObject
{
    Q_OBJECT

public:
    MouseSimulatorAction(SdConnectionManager* connection,
                         const QString& action,
                         const QString& context,
                         QObject* parent = nullptr);
    ~MouseSimulatorAction();

    QString context() const { return mContext; }
    QString action()  const { return mAction; }

    //
    // Event handlers
    //

    void didReceiveSettings(const json& payload);
    void keyDown(const json& payload);
    void keyUp(const json& payload);
    void sendToPlugin(const json& payload);
    void willAppear(const json& payload);
    void willDisappear(const json& payload);
    void propertyInspectorDidAppear(const json& payload);

    /// Stop any running playback or recording (called on plugin shutdown)
    void stopAll();

    //
    // Convenience wrappers for connection manager commands
    //

    void setState(int state);
    void setTitle(const QString& title,
                  ESDSDKTarget target = kESDSDKTarget_HardwareAndSoftware,
                  int state = -1);
    void setImage(const QString& base64Image,
                  ESDSDKTarget target = kESDSDKTarget_HardwareAndSoftware,
                  int state = -1);
    void showAlert();
    void showOK();
    void setSettings(const json& settings);
    void sendToPropertyInspector(const json& payload);

private slots:
    void onPlaybackFinished();
    void onRecordingSaved(const std::string& recordStream);

private:
    void applySettings(const json& payload);
    void startPlayback();
    void stopPlayback();
    void startRecording();
    void stopRecording();

    SdConnectionManager* mConnection;
    QString mAction;
    QString mContext;
    PluginSettings mSettings;

    // Playback state
    QThread* mPlaybackThread = nullptr;
    MouseSimulationEngine* mEngine = nullptr;
    bool mIsPlaying = false;

    // Recording state
    InputRecorder* mRecorder = nullptr;
    bool mIsRecording = false;
};
