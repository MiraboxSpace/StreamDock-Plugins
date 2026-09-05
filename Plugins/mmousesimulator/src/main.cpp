//==============================================================================
/**
@file       main.cpp

@brief      Entry point — parses StreamDeck CLI arguments, creates
            QCoreApplication, SdConnectionManager, MouseSimulatorPlugin,
            and enters the Qt event loop.

            StreamDeck invocation:
            mousesimulator_plugin.exe -port <N> -pluginUUID <uuid>
                                       -registerEvent registerPlugin -info <json>
**/
//==============================================================================

#include <QCoreApplication>
#include <cstdlib>
#include <string>

#ifdef PLATFORM_WINDOWS
#include <windows.h>
#endif

#include "connection/SdConnectionManager.h"
#include "plugin/MouseSimulatorPlugin.h"
#include "protocol/SdProtocolDefines.h"
#include "logging/Logger.h"

int main(int argc, char** argv)
{
#ifdef PLATFORM_WINDOWS
    // Match GetSystemMetrics coordinate space with MSLLHOOKSTRUCT::pt.
    // Without this, a non-DPI-aware process gets virtualized dimensions
    // from GetSystemMetrics while the low-level mouse hook records
    // physical pixels — causing playback clicks to miss the target.
    SetProcessDPIAware();
#endif

    QCoreApplication app(argc, argv);

    // ── Initialize logger (available before any code that logs) ──
    Logger::initialize(&app);
    Logger::instance()->log("[Main] Logger initialized, log dir: %s", qPrintable(QCoreApplication::applicationDirPath()));

    // ── Parse CLI arguments ────────────────────────────────────
    // StreamDeck always passes 8 args (4 key-value pairs) after the exe name
    if (argc < 9) {
        Logger::instance()->log("[ERROR] [Main] Invalid parameter count: expected 8, got %d", argc - 1);
        return 1;
    }

    int port = 0;
    QString pluginUUID;
    QString registerEvent;
    QString info;

    for (int i = 0; i < 4; ++i) {
        QString param  = QString::fromLocal8Bit(argv[1 + 2 * i]);
        QString value  = QString::fromLocal8Bit(argv[1 + 2 * i + 1]);

        if (param == kSDPortParameter) {
            port = value.toInt();
        } else if (param == kSDPluginUUIDParameter) {
            pluginUUID = value;
        } else if (param == kSDRegisterEventParameter) {
            registerEvent = value;
        } else if (param == kSDInfoParameter) {
            info = value;
        }
    }

    // Validate
    if (port == 0) {
        Logger::instance()->log("[ERROR] [Main] Invalid port number");
        return 1;
    }
    if (pluginUUID.isEmpty()) {
        Logger::instance()->log("[ERROR] [Main] Invalid plugin UUID");
        return 1;
    }
    if (registerEvent.isEmpty()) {
        Logger::instance()->log("[ERROR] [Main] Invalid registerEvent");
        return 1;
    }
    if (info.isEmpty()) {
        Logger::instance()->log("[ERROR] [Main] Invalid info");
        return 1;
    }

    Logger::instance()->log("[Main] Port: %d", port);
    Logger::instance()->log("[Main] Plugin UUID: %s", qPrintable(pluginUUID));
    Logger::instance()->log("[Main] Register Event: %s", qPrintable(registerEvent));

    // ── Create plugin and connection manager ──────────────────
    auto* plugin = new MouseSimulatorPlugin(&app);
    auto* connMgr = new SdConnectionManager(
        port, pluginUUID, registerEvent, info, plugin, &app);

    Logger::instance()->log("[Main] Plugin starting — port: %d, UUID: %s", port, qPrintable(pluginUUID));

    // Connect to StreamDeck host
    connMgr->connectToHost();

    // ── Enter Qt event loop ───────────────────────────────────
    return app.exec();
}
