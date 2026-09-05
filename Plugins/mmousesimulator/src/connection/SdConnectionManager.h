//==============================================================================
/**
@file       SdConnectionManager.h

@brief      WebSocket connection manager for StreamDeck communication.
            Uses Qt's QWebSocket instead of asio+websocketpp.

            Connects to ws://127.0.0.1:<port>, registers the plugin,
            then routes incoming JSON events to MouseSimulatorPlugin callbacks.
**/
//==============================================================================

#pragma once

#include <QObject>
#include <QWebSocket>
#include <QUrl>
#include <nlohmann/json.hpp>

#include "protocol/SdProtocolDefines.h"

using json = nlohmann::json;

class MouseSimulatorPlugin;

class SdConnectionManager : public QObject
{
    Q_OBJECT

public:
    SdConnectionManager(
        int port,
        const QString& pluginUUID,
        const QString& registerEvent,
        const QString& info,
        MouseSimulatorPlugin* plugin,
        QObject* parent = nullptr);

    ~SdConnectionManager();

    /// Start the WebSocket connection
    void connectToHost();

    /// Disconnect
    void disconnectFromHost();

    //
    // Outgoing commands to StreamDeck host
    //

    void setTitle(const QString& title, const QString& context,
                  ESDSDKTarget target = kESDSDKTarget_HardwareAndSoftware,
                  int state = -1);
    void setImage(const QString& base64Image, const QString& context,
                  ESDSDKTarget target = kESDSDKTarget_HardwareAndSoftware,
                  int state = -1);
    void showAlert(const QString& context);
    void showOK(const QString& context);
    void setSettings(const json& settings, const QString& context);
    void getGlobalSettings();
    void setGlobalSettings(const json& settings);
    void setState(int state, const QString& context);
    void sendToPropertyInspector(const QString& action, const QString& context,
                                 const json& payload);
    void switchToProfile(const QString& deviceId, const QString& profileName);
    void logMessage(const QString& message);

private slots:
    void onConnected();
    void onDisconnected();
    void onTextMessageReceived(const QString& message);
    void onError(QAbstractSocket::SocketError error);

private:
    void dispatchMessage(const json& obj);
    void sendJson(const json& obj);

    QWebSocket mWebSocket;
    int mPort;
    QString mPluginUUID;
    QString mRegisterEvent;
    QString mInfo;
    MouseSimulatorPlugin* mPlugin = nullptr;
};
