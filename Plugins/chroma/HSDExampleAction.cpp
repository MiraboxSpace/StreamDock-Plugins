#include "HSDExampleAction.h"

#include "StreamDockCPPSDK/StreamDockSDK/NlohmannJSONUtils.h"
#include "StreamDockCPPSDK/StreamDockSDK/HSDLogger.h"

#include "HSDExamplePlugin.h"
void HSDExampleAction::setExamplePlugin(HSDExamplePlugin* p)
{
    plugin_ = p;
}

HSDExampleAction::~HSDExampleAction()
{
    plugin_->StopServerThread();
}

void HSDExampleAction::DidReceiveSettings(const nlohmann::json& payload) {
    HSDLogger::LogMessage("DidReceiveSettings");
}

void HSDExampleAction::KeyDown(const nlohmann::json& payload) {
    HSDLogger::LogMessage("KeyDown");
    //// 第一次按下开启，第二次关闭，默认开启？？
    //plugin_->StartServerThread();
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
    HSDLogger::LogMessage("WillAppear::" + payload.dump());
}

void HSDExampleAction::WillDisAppear(const nlohmann::json& payload) {
    HSDLogger::LogMessage("WillAppear");
}

void HSDExampleAction::SendToPlugin(const nlohmann::json& payload) {
    HSDLogger::LogMessage("Received message from property inspector: " + payload.dump());
}