#include "GhubAction.h"
#include "common.h"
#include "StreamDockCPPSDK/StreamDockSDK/NlohmannJSONUtils.h"
#include "StreamDockCPPSDK/StreamDockSDK/HSDLogger.h"

void GhubAction::Getrefreshdevice()
{
    nlohmann::json data;
    data["mydevice"] = json::array();
    devices.clear();
    devices = GHubReader::GetInstance().GetAllDevices();
    if (devices.size() != 0)
    {
        for (int i = 0; i < devices.size(); i++)
        {
            data["mydevice"].push_back({ {"name",devices[i].name},{"value",devices[i].name} });
        }
        data["select"] = devices[0].name;
        SetSettings(data);
    }
}

GhubAction::GhubAction(HSDConnectionManager* hsd_connection, const std::string& action, const std::string& context)
    : HSDAction(hsd_connection, action, context)
{
    Getrefreshdevice();
    if(devices.size() != 0)
        mydevice = devices[0].name;
     //启动刷新线程
    refreshThread = std::thread([this]() {
        while (true) {
            batterystats = GHubReader::GetInstance().GetBatteryStats(mydevice);
            if(batterystats == NULL ){
                std::string pngbase64 = EncodeFileToBase64("images\\pluginAction.png");
                SetImage(pngbase64, 0);
            } else{
                if (batterystats->percentage >= 75.0){
                    std::string pngbase64 = EncodeFileToBase64("images\\battgreen.png");
                    SetImage(pngbase64, 0);
                }else if (batterystats->percentage >= 25.0){
                    std::string pngbase64 = EncodeFileToBase64("images\\battyellow.png");
                    SetImage(pngbase64, 0);
                }else{
                    std::string pngbase64 = EncodeFileToBase64("images\\battred.png");
                    SetImage(pngbase64, 0);
                }
                SetTitle(std::to_string(static_cast<int>(batterystats->percentage)),0);
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(10000));
        }
        });
}

GhubAction::~GhubAction() {
    //running = false;
    //if (refreshThread.joinable()) {
    //    refreshThread.join();
    //}
}

void GhubAction::DidReceiveSettings(const nlohmann::json& payload) {
    HSDLogger::LogMessage("DidReceiveSettings");
}
//按键按下
void GhubAction::KeyDown(const nlohmann::json& payload) {
    HSDLogger::LogMessage("KeyDown");
}
//按键抬起
void GhubAction::KeyUp(const nlohmann::json& payload) {
    HSDLogger::LogMessage("KeyUp" + payload.dump());
    Getrefreshdevice();
}

void GhubAction::WillAppear(const nlohmann::json& payload) {
    HSDLogger::LogMessage("WillAppear: " + payload.dump());
    Getrefreshdevice();
}

void GhubAction::PropertyInspectorDidAppear(const nlohmann::json& payload)
{
    HSDLogger::LogMessage("PropertyInspectorDidAppear: " + payload.dump());
    Getrefreshdevice();
}

void GhubAction::PropertyInspectorDidDisappear(const nlohmann::json& payload)
{
    //HSDLogger::LogMessage("PropertyInspectorDidDisappear: " + payload.dump());
}

void GhubAction::SendToPlugin(const nlohmann::json& payload) {
    HSDLogger::LogMessage("Received message from property inspector: " + payload.dump());
    if (!payload["mydevice"].empty())
    {
        mydevice = payload["mydevice"];
    }
}
