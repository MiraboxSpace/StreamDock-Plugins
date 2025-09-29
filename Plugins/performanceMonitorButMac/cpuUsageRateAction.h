#pragma once
#include "StreamDockSDK/HSDAction.h"

class cpuUsageRateAction : public HSDAction
{
    using HSDAction::HSDAction;

    virtual void DidReceiveSettings(const nlohmann::json &payload);
    virtual void KeyDown(const nlohmann::json &payload);
    virtual void KeyUp(const nlohmann::json &payload);
    virtual void SendToPlugin(const nlohmann::json &payload);
    virtual void WillAppear(const nlohmann::json &payload);
    virtual void WillDisappear(const nlohmann::json &payload);

private:
};
