//==============================================================================
/**
@file       MouseSimulatorPlugin.h

@brief      Plugin root class — receives events from SdConnectionManager
            and dispatches them to MouseSimulatorAction instances.

            Equivalent to HSDExamplePlugin in DEMO_CPPSDK.
**/
//==============================================================================

#pragma once

#include <QObject>
#include <QMap>
#include <QSet>
#include <QMutex>
#include <memory>
#include <nlohmann/json.hpp>

#include "protocol/SdProtocolDefines.h"

using json = nlohmann::json;

class SdConnectionManager;
class MouseSimulatorAction;

class MouseSimulatorPlugin : public QObject
{
    Q_OBJECT

public:
    explicit MouseSimulatorPlugin(QObject* parent = nullptr);
    ~MouseSimulatorPlugin();

    void setConnectionManager(SdConnectionManager* mgr);

    //
    // Event handlers — called by SdConnectionManager::dispatchMessage()
    //

    void keyDownForAction(const QString& action, const QString& context,
                          const json& payload, const QString& deviceId);
    void keyUpForAction(const QString& action, const QString& context,
                        const json& payload, const QString& deviceId);
    void willAppearForAction(const QString& action, const QString& context,
                             const json& payload, const QString& deviceId);
    void willDisappearForAction(const QString& action, const QString& context,
                                const json& payload, const QString& deviceId);
    void didReceiveSettings(const QString& action, const QString& context,
                            const json& payload, const QString& deviceId);
    void didReceiveGlobalSettings(const json& payload);
    void sendToPlugin(const QString& action, const QString& context,
                      const json& payload, const QString& deviceId);
    void deviceDidConnect(const QString& deviceId, const json& deviceInfo);
    void deviceDidDisconnect(const QString& deviceId);
    void systemDidWakeUp();
    void propertyInspectorDidAppear(const QString& action,
                                    const QString& context,
                                    const json& payload,
                                    const QString& deviceId);

    // Dial events (StreamDeck+)
    void dialDownForAction(const QString& action, const QString& context,
                           const json& payload, const QString& deviceId);
    void dialUpForAction(const QString& action, const QString& context,
                         const json& payload, const QString& deviceId);
    void dialRotateForAction(const QString& action, const QString& context,
                             const json& payload, const QString& deviceId);

    /// Access the connection manager (for actions to send commands)
    SdConnectionManager* connectionManager() const { return mConnectionMgr; }

private:
    MouseSimulatorAction* getOrCreateAction(const QString& action,
                                             const QString& context);

    SdConnectionManager* mConnectionMgr = nullptr;
    QMap<QString, MouseSimulatorAction*> mActions;  // keyed by context
    QMutex mActionsMutex;
    QSet<QString> mVisibleContexts;
    QMutex mVisibleMutex;
};
