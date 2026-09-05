#pragma once

#include "StreamDockSDK/HSDAction.h"

class HSDExamplePlugin;
class HSDExampleAction : public HSDAction
{
    using HSDAction::HSDAction;

    virtual void DidReceiveSettings(const nlohmann::json& payload);
    virtual void KeyDown(const nlohmann::json& payload);
    virtual void KeyUp(const nlohmann::json& payload);
    virtual void SendToPlugin(const nlohmann::json& payload);
    virtual void WillAppear(const nlohmann::json& payload);
    virtual void WillDisAppear(const nlohmann::json& payload);
public:
    ~HSDExampleAction();
    void setExamplePlugin(HSDExamplePlugin *p);

private:
    HSDExamplePlugin* plugin_;
};

