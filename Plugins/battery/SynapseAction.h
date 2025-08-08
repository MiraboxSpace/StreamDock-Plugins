#pragma once

#include "StreamDockSDK/HSDAction.h"
#include "Synapse.h"
class SynapseAction : public HSDAction
{
public:
    using HSDAction::HSDAction;

    explicit SynapseAction(HSDConnectionManager* hsd_connection, const std::string& action, const std::string& context);
    ~SynapseAction();

    std::vector<DeviceInfo> devices;
    std::shared_ptr<SynapseBatteryStats>  batterystats;
    nlohmann::json message;
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
};

#pragma once
