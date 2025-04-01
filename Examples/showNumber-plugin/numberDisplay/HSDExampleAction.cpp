#include "HSDExampleAction.h"

#include "StreamDockCPPSDK/StreamDockSDK/NlohmannJSONUtils.h"
#include "StreamDockCPPSDK/StreamDockSDK/HSDLogger.h"

void HSDExampleAction::DidReceiveSettings(const nlohmann::json& payload) {
    HSDLogger::LogMessage("DidReceiveSettings");
}

void HSDExampleAction::KeyDown(const nlohmann::json& payload) {
    HSDLogger::LogMessage("KeyDown");
}

void HSDExampleAction::KeyUp(const nlohmann::json& payload) {
    // Log in release and debug builds
    HSDLogger::LogMessage("KeyUp");
    ShowOK();
    // Only log in debug builds (C++20-style format strings):
    nlohmann::json settings = payload["settings"];
    HSDLogger::LogMessage("Settings: " + settings.dump());
}

void HSDExampleAction::WillAppear(const nlohmann::json& payload) {
    //HSDLogger::LogMessage("WillAppear:" + payload.dump());
    nlohmann::json settings = payload["settings"];
    if (settings.contains("number")) {
        SetTitle(settings["number"]);
    }
}

void HSDExampleAction::SendToPlugin(const nlohmann::json& payload) {
    //HSDLogger::LogMessage("Received message from property inspector: " + payload.dump());
    SetTitle(payload["number"]);
    SetSettings(payload);
}