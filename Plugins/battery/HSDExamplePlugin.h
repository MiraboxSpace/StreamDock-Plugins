#pragma once

#include "StreamDockCPPSDK/StreamDockSDK/HSDPlugin.h"
#include "GhubAction.h"
#include "SynapseAction.h"
#include "XboxAction.h"
#include "StreamDockCPPSDK/StreamDockSDK/HSDAction.h"
#include <set>
#include <mutex>

class HSDExamplePlugin : public HSDPlugin
{
public:
    using HSDPlugin::HSDPlugin;

    virtual std::shared_ptr<HSDAction> GetOrCreateAction(const std::string& action, const std::string& context) override;

    // Overriding from ESDBasePlugin
    virtual void DidReceiveGlobalSettings(const nlohmann::json& payload) override;
    
private:
    std::mutex mVisibleContextsMutex;
    std::set<std::string> mVisibleContexts;
    std::map<std::string, std::shared_ptr<HSDAction>> mActions;//这里有点小问题要改一下,你试试看可不可以，这里要改成HSDExampleAction的父类，我这样改应该是可以的
};

