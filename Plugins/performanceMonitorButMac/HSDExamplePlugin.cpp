#include "cpuUsageRateAction.h"
#include "StreamDockCPPSDK/StreamDockSDK/NlohmannJSONUtils.h"
#include "StreamDockCPPSDK/StreamDockSDK/HSDLogger.h"
#include "HSDExamplePlugin.h"

std::shared_ptr<HSDAction> HSDExamplePlugin::GetOrCreateAction(const std::string &action, const std::string &context)
{
    auto it = mActions.find(context);
    if (it != mActions.end())
    {
        return it->second;
    }

    if (action == "com.mirabox.performancemonitor.action1" || action == "com.mirabox.performancemonitor.action2" || action == "com.mirabox.performancemonitor.action3" || action == "com.mirabox.performancemonitor.action4" || action == "com.mirabox.performancemonitor.action5" ||
        action == "com.mirabox.performancemonitor.action6" || action == "com.mirabox.performancemonitor.action7")
    {
        auto impl = std::make_shared<cpuUsageRateAction>(
            mConnectionManager,
            action,
            context);
        mActions.emplace(context, impl);
        return impl;
    }
    HSDLogger::LogMessage("Asked to get or create unknown action: " + action);
    return nullptr;
}

void HSDExamplePlugin::DidReceiveGlobalSettings(const nlohmann::json &payload)
{
    HSDLogger::LogMessage("Received global settings");
    HSDLogger::LogMessage("Global settings: " + payload.dump());

    // Do plugin-wide stuff here, e.g. reconnect to application being
    // controlled

    for (const auto &action : mActions)
    {
        // ... then pass it on to each action, e.g.:
        // action->setApplicationConnection(myConnectionObject);
    }
}
