#pragma once

#include "StreamDockSDK/HSDAction.h"
#include "Ghub.h"
class GhubAction : public HSDAction
{
public:
    using HSDAction::HSDAction;
   
    explicit GhubAction(HSDConnectionManager* hsd_connection, const std::string& action, const std::string& context);
    ~GhubAction();
    std::vector<DeviceInfo> devices;
    std::shared_ptr<GHubBatteryStats> batterystats;
    std::string mydevice = "";
    std::thread refreshThread;  //刷新线程
    bool running = true;
    void Getrefreshdevice();
    virtual void DidReceiveSettings(const nlohmann::json& payload) override;
    virtual void KeyDown(const nlohmann::json& payload) override;
    virtual void KeyUp(const nlohmann::json& payload) override;
    virtual void SendToPlugin(const nlohmann::json& payload) override;
    virtual void WillAppear(const nlohmann::json& payload) override;
    virtual void PropertyInspectorDidAppear(const nlohmann::json& payload) override;
    virtual void PropertyInspectorDidDisappear(const nlohmann::json& payload) override;
private:
    std::shared_ptr<nlohmann::json> _settings = nullptr;
};

