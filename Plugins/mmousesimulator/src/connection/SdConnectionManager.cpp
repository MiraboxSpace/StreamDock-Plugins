//==============================================================================
/**
@file       SdConnectionManager.cpp

@brief      Implementation of WebSocket communication with StreamDeck host.
            Ported from DEMO_CPPSDK's HSDConnectionManager.cpp,
            using QWebSocket instead of asio+websocketpp.
**/
//==============================================================================

#include "connection/SdConnectionManager.h"
#include "plugin/MouseSimulatorPlugin.h"
#include "logging/Logger.h"

#include <QJsonDocument>
#include <QJsonObject>

//==============================================================================
// Construction / Destruction
//==============================================================================

SdConnectionManager::SdConnectionManager(
    int port,
    const QString& pluginUUID,
    const QString& registerEvent,
    const QString& info,
    MouseSimulatorPlugin* plugin,
    QObject* parent)
    : QObject(parent)
    , mPort(port)
    , mPluginUUID(pluginUUID)
    , mRegisterEvent(registerEvent)
    , mInfo(info)
    , mPlugin(plugin)
{
    // Wire up QWebSocket signals
    connect(&mWebSocket, &QWebSocket::connected,
            this, &SdConnectionManager::onConnected);
    connect(&mWebSocket, &QWebSocket::disconnected,
            this, &SdConnectionManager::onDisconnected);
    connect(&mWebSocket, &QWebSocket::textMessageReceived,
            this, &SdConnectionManager::onTextMessageReceived);

    // Qt 5.15 uses QOverload for the error signal (it's overloaded in Qt5)
    connect(&mWebSocket,
            QOverload<QAbstractSocket::SocketError>::of(&QWebSocket::error),
            this, &SdConnectionManager::onError);

    // Give the plugin a reference to this connection manager
    if (mPlugin) {
        mPlugin->setConnectionManager(this);
    }
}

SdConnectionManager::~SdConnectionManager()
{
    mWebSocket.close();
}

//==============================================================================
// Connection lifecycle
//==============================================================================

void SdConnectionManager::connectToHost()
{
    QString url = QString("ws://127.0.0.1:%1").arg(mPort);
    Logger::instance()->log("[SdConnection] Connecting to: %s", qPrintable(url));
    mWebSocket.open(QUrl(url));
}

void SdConnectionManager::disconnectFromHost()
{
    mWebSocket.close();
}

//==============================================================================
// Slots
//==============================================================================

void SdConnectionManager::onConnected()
{
    Logger::instance()->log("[SdConnection] WebSocket connected, registering plugin (UUID: %s)", qPrintable(mPluginUUID));

    // Register with StreamDeck host (identical to DEMO_CPPSDK OnOpen)
    json registerMsg;
    registerMsg[kSDCommonEvent] = mRegisterEvent.toStdString();
    registerMsg[kSDRegisterUUID] = mPluginUUID.toStdString();
    sendJson(registerMsg);
}

void SdConnectionManager::onDisconnected()
{
    Logger::instance()->log("[SdConnection] WebSocket disconnected");
}

void SdConnectionManager::onTextMessageReceived(const QString& message)
{
    try {
        json receivedJson = json::parse(message.toStdString());
        std::string eventType = receivedJson.value(kSDCommonEvent, "");
        Logger::instance()->log("[SdConnection] RX event: %s", eventType.c_str());
        dispatchMessage(receivedJson);
    }
    catch (const json::parse_error& e) {
        Logger::instance()->log("[WARN] [SdConnection] JSON parse error: %s", e.what());
    }
}

void SdConnectionManager::onError(QAbstractSocket::SocketError error)
{
    Q_UNUSED(error);
    Logger::instance()->log("[WARN] [SdConnection] WebSocket error: %s", qPrintable(mWebSocket.errorString()));
}

//==============================================================================
// Message dispatch — routes incoming events to plugin callbacks
//==============================================================================

void SdConnectionManager::dispatchMessage(const json& obj)
{
    std::string event   = obj.value(kSDCommonEvent, "");
    std::string context = obj.value(kSDCommonContext, "");
    std::string action  = obj.value(kSDCommonAction, "");
    std::string deviceID = obj.value(kSDCommonDevice, "");

    json payload;
    auto payloadIt = obj.find(kSDCommonPayload);
    if (payloadIt != obj.end() && payloadIt->is_object()) {
        payload = *payloadIt;
    }

    if (!mPlugin) return;

    if (event == kSDEventKeyDown) {
        mPlugin->keyDownForAction(
            QString::fromStdString(action),
            QString::fromStdString(context),
            payload,
            QString::fromStdString(deviceID));
    }
    else if (event == kSDEventKeyUp) {
        mPlugin->keyUpForAction(
            QString::fromStdString(action),
            QString::fromStdString(context),
            payload,
            QString::fromStdString(deviceID));
    }
    else if (event == kSDEventWillAppear) {
        mPlugin->willAppearForAction(
            QString::fromStdString(action),
            QString::fromStdString(context),
            payload,
            QString::fromStdString(deviceID));
    }
    else if (event == kSDEventWillDisappear) {
        mPlugin->willDisappearForAction(
            QString::fromStdString(action),
            QString::fromStdString(context),
            payload,
            QString::fromStdString(deviceID));
    }
    else if (event == kSDEventDidReceiveSettings) {
        mPlugin->didReceiveSettings(
            QString::fromStdString(action),
            QString::fromStdString(context),
            payload,
            QString::fromStdString(deviceID));
    }
    else if (event == kSDEventDidReceiveGlobalSettings) {
        mPlugin->didReceiveGlobalSettings(payload);
    }
    else if (event == kSDEventDeviceDidConnect) {
        json deviceInfo;
        auto it = obj.find(kSDCommonDeviceInfo);
        if (it != obj.end() && it->is_object()) {
            deviceInfo = *it;
        }
        mPlugin->deviceDidConnect(
            QString::fromStdString(deviceID), deviceInfo);
    }
    else if (event == kSDEventDeviceDidDisconnect) {
        mPlugin->deviceDidDisconnect(QString::fromStdString(deviceID));
    }
    else if (event == kSDEventSendToPlugin) {
        mPlugin->sendToPlugin(
            QString::fromStdString(action),
            QString::fromStdString(context),
            payload,
            QString::fromStdString(deviceID));
    }
    else if (event == kSDEventSystemDidWakeUp) {
        mPlugin->systemDidWakeUp();
    }
    else if (event == kSDEventDialDown) {
        mPlugin->dialDownForAction(
            QString::fromStdString(action),
            QString::fromStdString(context),
            payload,
            QString::fromStdString(deviceID));
    }
    else if (event == kSDEventDialUp) {
        mPlugin->dialUpForAction(
            QString::fromStdString(action),
            QString::fromStdString(context),
            payload,
            QString::fromStdString(deviceID));
    }
    else if (event == kSDEventDialRotate) {
        mPlugin->dialRotateForAction(
            QString::fromStdString(action),
            QString::fromStdString(context),
            payload,
            QString::fromStdString(deviceID));
    }
    else if (event == kSDEventPropertyInspectorDidAppear) {
        mPlugin->propertyInspectorDidAppear(
            QString::fromStdString(action),
            QString::fromStdString(context),
            payload,
            QString::fromStdString(deviceID));
    }
    else {
        Logger::instance()->log("[SdConnection] Unknown event: %s", event.c_str());
    }
}

//==============================================================================
// Outgoing commands to StreamDeck host
//==============================================================================

void SdConnectionManager::sendJson(const json& obj)
{
    QString str = QString::fromStdString(obj.dump());
    // Verbose TX logging — uncomment for debugging
    // Logger::instance()->log("[SdConnection] TX: %s", qPrintable(str.left(200)));
    mWebSocket.sendTextMessage(str);
}

void SdConnectionManager::setTitle(const QString& title, const QString& context,
                                   ESDSDKTarget target, int state)
{
    json obj;
    obj[kSDCommonEvent]   = kSDCommandSetTitle;
    obj[kSDCommonContext] = context.toStdString();

    json payload;
    payload[kSDPayloadTarget] = target;
    payload[kSDPayloadTitle]  = title.toStdString();
    if (state >= 0) {
        payload[kSDPayloadState] = state;
    }
    obj[kSDCommonPayload] = payload;

    sendJson(obj);
}

void SdConnectionManager::setImage(const QString& base64Image,
                                   const QString& context,
                                   ESDSDKTarget target, int state)
{
    json obj;
    obj[kSDCommonEvent]   = kSDCommandSetImage;
    obj[kSDCommonContext] = context.toStdString();

    json payload;
    payload[kSDPayloadTarget] = target;

    // Prepend data URI prefix if not present
    std::string imgStr = base64Image.toStdString();
    if (!imgStr.empty() && imgStr.find("data:image/") != 0) {
        imgStr = "data:image/png;base64," + imgStr;
    }
    payload[kSDPayloadImage] = imgStr;

    if (state >= 0) {
        payload[kSDPayloadState] = state;
    }
    obj[kSDCommonPayload] = payload;

    sendJson(obj);
}

void SdConnectionManager::showAlert(const QString& context)
{
    json obj;
    obj[kSDCommonEvent]   = kSDCommandShowAlert;
    obj[kSDCommonContext] = context.toStdString();
    sendJson(obj);
}

void SdConnectionManager::showOK(const QString& context)
{
    json obj;
    obj[kSDCommonEvent]   = kSDCommandShowOk;
    obj[kSDCommonContext] = context.toStdString();
    sendJson(obj);
}

void SdConnectionManager::setSettings(const json& settings,
                                      const QString& context)
{
    json obj;
    obj[kSDCommonEvent]   = kSDCommandSetSettings;
    obj[kSDCommonContext] = context.toStdString();
    obj[kSDCommonPayload] = settings;
    sendJson(obj);
}

void SdConnectionManager::getGlobalSettings()
{
    json obj;
    obj[kSDCommonEvent]   = kSDCommandGetGlobalSettings;
    obj[kSDCommonContext] = mPluginUUID.toStdString();
    sendJson(obj);
}

void SdConnectionManager::setGlobalSettings(const json& settings)
{
    json obj;
    obj[kSDCommonEvent]   = kSDCommandSetGlobalSettings;
    obj[kSDCommonContext] = mPluginUUID.toStdString();
    obj[kSDCommonPayload] = settings;
    sendJson(obj);
}

void SdConnectionManager::setState(int state, const QString& context)
{
    json obj;
    obj[kSDCommonEvent]   = kSDCommandSetState;
    obj[kSDCommonContext] = context.toStdString();

    json payload;
    payload[kSDPayloadState] = state;
    obj[kSDCommonPayload] = payload;

    sendJson(obj);
}

void SdConnectionManager::sendToPropertyInspector(
    const QString& action, const QString& context, const json& payload)
{
    json obj;
    obj[kSDCommonEvent]   = kSDCommandSendToPropertyInspector;
    obj[kSDCommonAction]  = action.toStdString();
    obj[kSDCommonContext] = context.toStdString();
    obj[kSDCommonPayload] = payload;

    sendJson(obj);
}

void SdConnectionManager::switchToProfile(const QString& deviceId,
                                          const QString& profileName)
{
    if (deviceId.isEmpty()) return;

    json obj;
    obj[kSDCommonEvent]   = kSDCommandSwitchToProfile;
    obj[kSDCommonContext] = mPluginUUID.toStdString();
    obj[kSDCommonDevice]  = deviceId.toStdString();

    if (!profileName.isEmpty()) {
        json payload;
        payload[kSDPayloadProfile] = profileName.toStdString();
        obj[kSDCommonPayload] = payload;
    }

    sendJson(obj);
}

void SdConnectionManager::logMessage(const QString& message)
{
    if (message.isEmpty()) return;

    json obj;
    obj[kSDCommonEvent] = kSDCommandLogMessage;

    json payload;
    payload[kSDPayloadMessage] = message.toStdString();
    obj[kSDCommonPayload] = payload;

    sendJson(obj);
}
