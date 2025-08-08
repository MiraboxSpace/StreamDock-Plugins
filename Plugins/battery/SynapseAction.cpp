#include "SynapseAction.h"
#include "common.h"
#include "StreamDockCPPSDK/StreamDockSDK/NlohmannJSONUtils.h"
#include "StreamDockCPPSDK/StreamDockSDK/HSDLogger.h"

void SynapseAction::Getrefreshdevice()
{
    nlohmann::json data;
    data["mydevice"] = json::array();
    devices.clear();
    devices = SynapseReader::GetInstance().GetAllDevices();
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

SynapseAction::SynapseAction(HSDConnectionManager* hsd_connection, const std::string& action, const std::string& context)
    : HSDAction(hsd_connection, action, context)
{
    Getrefreshdevice();
    if (devices.size() != 0)
        mydevice = devices[0].name;
    //启动刷新线程
    refreshThread = std::thread([this]() {
        while (running) {
            batterystats = SynapseReader::GetInstance().GetBatteryStats(mydevice);
            if (batterystats == NULL) {
                std::string pngbase64 = EncodeFileToBase64("images\\pluginAction.png");
                SetImage(pngbase64, 0);
            } else {
                if (batterystats->percentage >= 75) {
                    std::string pngbase64 = EncodeFileToBase64("images\\battgreen.png");
                    SetImage(pngbase64, 0);
                }else if (batterystats->percentage >= 25) {
                    std::string pngbase64 = EncodeFileToBase64("images\\battyellow.png");
                    SetImage(pngbase64, 0);
                }else {
                    std::string pngbase64 = EncodeFileToBase64("images\\battred.png");
                    SetImage(pngbase64, 0);
                }
                SetTitle(std::to_string(static_cast<int>(batterystats->percentage)),0);
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(10000));
        }
        });
}

SynapseAction::~SynapseAction() {
    running = false;
    if (refreshThread.joinable()) {
        refreshThread.join();
    }
}

void SynapseAction::DidReceiveSettings(const nlohmann::json& payload) {
    HSDLogger::LogMessage("DidReceiveSettings");
}
//按键按下
void SynapseAction::KeyDown(const nlohmann::json& payload) {
    HSDLogger::LogMessage("KeyDown");
}
//按键抬起
void SynapseAction::KeyUp(const nlohmann::json& payload) {
    HSDLogger::LogMessage("KeyUp" + payload.dump());
    Getrefreshdevice();
}

void SynapseAction::WillAppear(const nlohmann::json& payload) {
    HSDLogger::LogMessage("WillAppear:" + payload.dump());
    Getrefreshdevice();
}

void SynapseAction::PropertyInspectorDidAppear(const nlohmann::json& payload)
{
    HSDLogger::LogMessage("PropertyInspectorDidAppear: " + payload.dump());
    Getrefreshdevice();
}

void SynapseAction::PropertyInspectorDidDisappear(const nlohmann::json& payload)
{
    //HSDLogger::LogMessage("PropertyInspectorDidDisappear: " + payload.dump());
}

void SynapseAction::SendToPlugin(const nlohmann::json& payload) {
    HSDLogger::LogMessage("Received message from property inspector: " + payload.dump());
    if (!payload["mydevice"].empty())
    {
        mydevice = payload["mydevice"];
    }
}
