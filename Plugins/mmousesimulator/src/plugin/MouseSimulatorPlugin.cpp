//==============================================================================
/**
@file       MouseSimulatorPlugin.cpp

@brief      Implementation — dispatches events to MouseSimulatorAction instances.
**/
//==============================================================================

#include "plugin/MouseSimulatorPlugin.h"
#include "connection/SdConnectionManager.h"
#include "action/MouseSimulatorAction.h"
#include "logging/Logger.h"

MouseSimulatorPlugin::MouseSimulatorPlugin(QObject* parent)
    : QObject(parent)
{
}

MouseSimulatorPlugin::~MouseSimulatorPlugin()
{
    // Stop all actions
    QMutexLocker lock(&mActionsMutex);
    for (auto* action : mActions) {
        action->stopAll();
    }
    qDeleteAll(mActions);
    mActions.clear();
}

void MouseSimulatorPlugin::setConnectionManager(SdConnectionManager* mgr)
{
    mConnectionMgr = mgr;
}

MouseSimulatorAction* MouseSimulatorPlugin::getOrCreateAction(
    const QString& action, const QString& context)
{
    QMutexLocker lock(&mActionsMutex);

    auto it = mActions.find(context);
    if (it != mActions.end()) {
        return it.value();
    }

    // Only create for our action UUID
    if (action == "com.hotspot.streamdock.mousesimulator.action") {
        auto* impl = new MouseSimulatorAction(
            mConnectionMgr, action, context, this);
        mActions.insert(context, impl);
        return impl;
    }

    Logger::instance()->log("[WARN] [Plugin] Unknown action: %s", qPrintable(action));
    return nullptr;
}

// ── Event dispatchers ─────────────────────────────────────────

void MouseSimulatorPlugin::keyDownForAction(
    const QString& action, const QString& context,
    const json& payload, const QString& deviceId)
{
    Q_UNUSED(deviceId);
    Logger::instance()->log("[Plugin] keyDown (context: %s)", qPrintable(context));

    auto* act = getOrCreateAction(action, context);
    if (act) act->keyDown(payload);
}

void MouseSimulatorPlugin::keyUpForAction(
    const QString& action, const QString& context,
    const json& payload, const QString& deviceId)
{
    Q_UNUSED(deviceId);
    auto* act = getOrCreateAction(action, context);
    if (act) act->keyUp(payload);
}

void MouseSimulatorPlugin::willAppearForAction(
    const QString& action, const QString& context,
    const json& payload, const QString& deviceId)
{
    Q_UNUSED(deviceId);
    Logger::instance()->log("[Plugin] willAppear (context: %s)", qPrintable(context));

    {
        QMutexLocker lock(&mVisibleMutex);
        mVisibleContexts.insert(context);
    }

    auto* act = getOrCreateAction(action, context);
    if (act) act->willAppear(payload);
}

void MouseSimulatorPlugin::willDisappearForAction(
    const QString& action, const QString& context,
    const json& payload, const QString& deviceId)
{
    Q_UNUSED(deviceId);
    Logger::instance()->log("[Plugin] willDisappear (context: %s)", qPrintable(context));

    {
        QMutexLocker lock(&mVisibleMutex);
        mVisibleContexts.remove(context);
    }

    auto* act = getOrCreateAction(action, context);
    if (act) act->willDisappear(payload);
}

void MouseSimulatorPlugin::didReceiveSettings(
    const QString& action, const QString& context,
    const json& payload, const QString& deviceId)
{
    Q_UNUSED(deviceId);
    auto* act = getOrCreateAction(action, context);
    if (act) act->didReceiveSettings(payload);
}

void MouseSimulatorPlugin::didReceiveGlobalSettings(const json& payload)
{
    Q_UNUSED(payload);
    Logger::instance()->log("[Plugin] didReceiveGlobalSettings");

    // Propagate to all actions
    QMutexLocker lock(&mActionsMutex);
    for (auto* act : mActions) {
        act->didReceiveSettings(payload);
    }
}

void MouseSimulatorPlugin::sendToPlugin(
    const QString& action, const QString& context,
    const json& payload, const QString& deviceId)
{
    Q_UNUSED(deviceId);
    auto* act = getOrCreateAction(action, context);
    if (act) act->sendToPlugin(payload);
}

void MouseSimulatorPlugin::deviceDidConnect(
    const QString& deviceId, const json& deviceInfo)
{
    Q_UNUSED(deviceInfo);
    Logger::instance()->log("[Plugin] Device connected: %s", qPrintable(deviceId));
}

void MouseSimulatorPlugin::deviceDidDisconnect(const QString& deviceId)
{
    Logger::instance()->log("[Plugin] Device disconnected: %s", qPrintable(deviceId));
}

void MouseSimulatorPlugin::systemDidWakeUp()
{
    Logger::instance()->log("[Plugin] System woke up");
}

void MouseSimulatorPlugin::propertyInspectorDidAppear(
    const QString& action, const QString& context,
    const json& payload, const QString& deviceId)
{
    Q_UNUSED(deviceId);
    auto* act = getOrCreateAction(action, context);
    if (act) act->propertyInspectorDidAppear(payload);
}

// ── Dial events (not used by this plugin, but part of protocol) ──

void MouseSimulatorPlugin::dialDownForAction(
    const QString& action, const QString& context,
    const json& payload, const QString& deviceId)
{
    Q_UNUSED(action); Q_UNUSED(context);
    Q_UNUSED(payload); Q_UNUSED(deviceId);
}

void MouseSimulatorPlugin::dialUpForAction(
    const QString& action, const QString& context,
    const json& payload, const QString& deviceId)
{
    Q_UNUSED(action); Q_UNUSED(context);
    Q_UNUSED(payload); Q_UNUSED(deviceId);
}

void MouseSimulatorPlugin::dialRotateForAction(
    const QString& action, const QString& context,
    const json& payload, const QString& deviceId)
{
    Q_UNUSED(action); Q_UNUSED(context);
    Q_UNUSED(payload); Q_UNUSED(deviceId);
}
