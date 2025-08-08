#pragma once
#include "StreamDockSDK/HSDAction.h"
#include <thread>
#include <windows.h>
#include <XInput.h>

#pragma comment(lib, "XInput.lib")
class XboxAction : public HSDAction
{
    //_XINPUT_GAMEPAD
public:
    using HSDAction::HSDAction;

    explicit XboxAction(HSDConnectionManager* hsd_connection, const std::string& action, const std::string& context);
    ~XboxAction();
    std::thread refreshThread;  //刷新线程
    //DWORD devices[4];
    XINPUT_BATTERY_INFORMATION batteryInfo = {};
    DWORD result= -1;
    DWORD mydevice = -1;
    XINPUT_STATE state;
    bool running = true;
    virtual void DidReceiveSettings(const nlohmann::json& payload) override;
    virtual void KeyDown(const nlohmann::json& payload) override;
    virtual void KeyUp(const nlohmann::json& payload) override;
    virtual void SendToPlugin(const nlohmann::json& payload) override;
    virtual void WillAppear(const nlohmann::json& payload) override;
    virtual void PropertyInspectorDidDisappear(const nlohmann::json& payload) override;
    virtual void PropertyInspectorDidAppear(const nlohmann::json& payload) override;
};

