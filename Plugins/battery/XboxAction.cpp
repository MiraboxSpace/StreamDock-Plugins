#include "XboxAction.h"
#include "common.h"
#include "StreamDockCPPSDK/StreamDockSDK/NlohmannJSONUtils.h"
#include "StreamDockCPPSDK/StreamDockSDK/HSDLogger.h"

XboxAction::XboxAction(HSDConnectionManager* hsd_connection, const std::string& action, const std::string& context)
    : HSDAction(hsd_connection, action, context)
{
    //启动刷新线程
    refreshThread = std::thread([this]() {
        while (running) {
            ZeroMemory(&state, sizeof(XINPUT_STATE));
            result =  XInputGetState(mydevice, &state);
            if (result == ERROR_SUCCESS)  //成功获取控制器状态
            {
                if(XInputGetBatteryInformation(mydevice, BATTERY_DEVTYPE_GAMEPAD, &batteryInfo) == ERROR_SUCCESS) {
                    switch (batteryInfo.BatteryLevel) {
                        case BATTERY_LEVEL_FULL : {
                            std::string pngbase64 = EncodeFileToBase64("images\\battgreen.png");
                            SetImage(pngbase64, 2); break;
                        }
                        case BATTERY_LEVEL_MEDIUM : {
                            std::string pngbase64 = EncodeFileToBase64("images\\battyellow.png");
                            SetImage(pngbase64, 2); break;
                        }
                        case BATTERY_LEVEL_LOW: {
                            std::string pngbase64 = EncodeFileToBase64("images\\battred.png");
                            SetImage(pngbase64, 2); break;
                        }
                        case BATTERY_LEVEL_EMPTY: {
                            std::string pngbase64 = EncodeFileToBase64("images\\pluginAction.png");
                            SetImage(pngbase64, 2); break;
                        }
                    }
                }
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(10000));
        }
        });
}
XboxAction::~XboxAction() {
    running = false;
    if (refreshThread.joinable()) {
        refreshThread.join();
    }
}

void XboxAction::PropertyInspectorDidAppear(const nlohmann::json& payload)
{
    //HSDLogger::LogMessage("PropertyInspectorDidAppear: " + payload.dump());
}

void XboxAction::PropertyInspectorDidDisappear(const nlohmann::json& payload)
{
    //HSDLogger::LogMessage("PropertyInspectorDidDisappear: " + payload.dump());
}


void XboxAction::DidReceiveSettings(const nlohmann::json& payload) {
    HSDLogger::LogMessage("DidReceiveSettings");
}
//按键按下
void XboxAction::KeyDown(const nlohmann::json& payload) {
    HSDLogger::LogMessage("KeyDown");
}
//按键抬起
void XboxAction::KeyUp(const nlohmann::json& payload) {
    // Log in release and debug builds
    HSDLogger::LogMessage("KeyUp" + payload.dump());
 
}

void XboxAction::WillAppear(const nlohmann::json& payload) {
    HSDLogger::LogMessage("WillAppear:" + payload.dump());
}

void XboxAction::SendToPlugin(const nlohmann::json& payload) {
    HSDLogger::LogMessage("Received message from property inspector: " + payload.dump());
    if (!payload["mydevice"].empty())
    {
        HSDLogger::LogMessage("mydevice: " + payload["value"]);
        mydevice = payload["mydevice"];
    }
}


