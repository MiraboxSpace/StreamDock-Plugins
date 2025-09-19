#include "HSDExampleAction.h"
#include <vector>
#include <string>
#include <iostream>
#include <atomic>
#include "StreamDockCPPSDK/StreamDockSDK/NlohmannJSONUtils.h"
#include "StreamDockCPPSDK/StreamDockSDK/HSDLogger.h"
#include "tools.h"
#include <thread>
#include <CoreFoundation/CoreFoundation.h>
#include <map>
using namespace std;

std::map<std::pair<int, int>, ProcessState> processStates;

void HSDExampleAction::DidReceiveSettings(const nlohmann::json &payload)
{
    auto settings = payload.value("settings", nlohmann::json::object());
    HSDLogger::LogMessage("DidReceiveSettings" + payload.dump());
    auto coordinates = payload.value("coordinates", nlohmann::json::object());
    int column = coordinates.value("column", 0);
    int row = coordinates.value("row", 0);
    auto key = std::make_pair(column, row);
    auto &state = processStates[key];

    if (settings.contains("DisplayFormatType"))
    {
        state.displayFormat.store(settings["DisplayFormatType"]);
        HSDLogger::LogMessage("Selected format: " + std::to_string(state.displayFormat.load()));
    }
    else
    {
        settings["DisplayFormatType"] = state.displayFormat.load();
        SetSettings(settings);
        HSDLogger::LogMessage("No DisplayFormatType setting found, defaulting to COLOR_NAME");
    }

    if (settings.contains("SelectType"))
    {
        state.selectType.store(settings["SelectType"]);
        HSDLogger::LogMessage("Selected type: " + std::to_string(state.selectType.load()));
    }
    else
    {
        settings["SelectType"] = state.selectType.load();
        SetSettings(settings);
        HSDLogger::LogMessage("No SelectType setting found, defaulting to DYNAMIC");
    }

    if (settings.contains("pointX") && settings.contains("pointY"))
    {
        state.pointX.store(settings["pointX"]);
        state.pointY.store(settings["pointY"]);
        HSDLogger::LogMessage("Loaded fixed point: (" + std::to_string(state.pointX.load()) + "," + std::to_string(state.pointY.load()) + ")");
    }

    if (settings.contains("copyToClipboard"))
    {
        state.copyToClipboard.store(settings["copyToClipboard"]);
        HSDLogger::LogMessage("Loaded copyToClipboard: " + std::to_string(state.copyToClipboard.load()));
    }

    if (KEY_PRESS == state.selectType.load())
        state.isKeyPress.store(true);
    else
    {
        state.isKeyPress.store(false);
        // 启动一个线程每隔100ms获取一次鼠标位置并更新颜色
        if (!state.isRunning)
        {
            state.isRunning = true;
            state.colorUpdateThread = std::make_unique<std::thread>([this, key]()
                                                                    {
                auto &state = processStates[key];
                while (state.isRunning)
                {
                    if (!state.isKeyPress.load())
                    {
                        CGEventRef event = CGEventCreate(NULL);
                        CGPoint point = CGEventGetLocation(event);
                        CFRelease(event);
                        if (FIXED == state.selectType.load())
                        {
                            point.x = state.pointX.load();
                            point.y = state.pointY.load();
                        }
                        CGColorRef color = getPixelColorAtLocation(point);
                        if (color != NULL)
                        {
                            SetImage(returnBase64ImgFromColor(color, (DisplayFormatType)state.displayFormat.load()));
                            if (!CGColorEqualToColor(state.preColor.load(), color) && state.selectType.load() == FIXED)
                            {
                                state.preColor.store(color);
                                if (state.copyToClipboard.load())
                                    saveColorToClipboard(color, (DisplayFormatType)state.displayFormat.load());
                            }
                        }
                    }
                    std::this_thread::sleep_for(std::chrono::milliseconds(100));
                } });
            state.colorUpdateThread->detach();
        }
    }
}

void HSDExampleAction::KeyDown(const nlohmann::json &payload)
{
    HSDLogger::LogMessage("KeyDown" + payload.dump());
    auto settings = payload.value("settings", nlohmann::json::object());
    auto coordinates = payload.value("coordinates", nlohmann::json::object());
    int column = coordinates.value("column", 0);
    int row = coordinates.value("row", 0);
    auto key = std::make_pair(column, row);
    auto &state = processStates[key];

    if (settings.contains("DisplayFormatType"))
    {
        state.displayFormat.store(settings["DisplayFormatType"]);
        HSDLogger::LogMessage("Selected format: " + std::to_string(state.displayFormat.load()));
    }

    if (settings.contains("SelectType"))
    {
        state.selectType.store(settings["SelectType"]);
        HSDLogger::LogMessage("Selected type: " + std::to_string(state.selectType.load()));
    }

    if (KEY_PRESS == state.selectType.load() || DYNAMIC == state.selectType.load())
    {
        // get current mouse position
        CGEventRef event = CGEventCreate(NULL);
        CGPoint point = CGEventGetLocation(event);
        CFRelease(event);

        // Get the color at the mouse position
        CGColorRef color = getPixelColorAtLocation(point);
        if (color != NULL)
        {
            SetImage(returnBase64ImgFromColor(color, (DisplayFormatType)state.displayFormat.load()));
            if (settings.contains("copyToClipboard") && settings["copyToClipboard"] == true)
                saveColorToClipboard(color, (DisplayFormatType)state.displayFormat.load());
        }
    }
    else
    {
        CGEventRef event = CGEventCreate(NULL);
        CGPoint point = CGEventGetLocation(event);
        CFRelease(event);
        settings["pointX"] = point.x;
        settings["pointY"] = point.y;
        state.pointX.store(point.x);
        state.pointY.store(point.y);
        SetSettings(settings);
        HSDLogger::LogMessage("change the fixed point to: (" + std::to_string(point.x) + "," + std::to_string(point.y) + ")");
        // Get the color at the mouse position
        CGColorRef color = getPixelColorAtLocation(point);
        if (color != NULL)
        {
            SetImage(returnBase64ImgFromColor(color, (DisplayFormatType)state.displayFormat.load()));
            if (settings.contains("copyToClipboard") && settings["copyToClipboard"] == true)
                saveColorToClipboard(color, (DisplayFormatType)state.displayFormat.load());
        }
    }
}

void HSDExampleAction::KeyUp(const nlohmann::json &payload)
{
    HSDLogger::LogMessage("KeyUp: " + payload.dump());
}

void HSDExampleAction::WillAppear(const nlohmann::json &payload)
{
    HSDLogger::LogMessage("WillAppear" + payload.dump());
    auto settings = payload.value("settings", nlohmann::json::object());
    auto coordinates = payload.value("coordinates", nlohmann::json::object());
    int column = coordinates.value("column", 0);
    int row = coordinates.value("row", 0);
    auto key = std::make_pair(column, row);
    auto &state = processStates[key];

    if (settings.contains("DisplayFormatType"))
    {
        state.displayFormat.store(settings["DisplayFormatType"]);
        HSDLogger::LogMessage("Selected format: " + std::to_string(state.displayFormat.load()));
    }
    else
    {
        state.displayFormat.store(COLOR_NAME);
        settings["DisplayFormatType"] = state.displayFormat.load();
        SetSettings(settings);
        HSDLogger::LogMessage("No DisplayFormatType setting found, defaulting to COLOR_NAME");
    }

    if (settings.contains("SelectType"))
    {
        state.selectType.store(settings["SelectType"]);
        HSDLogger::LogMessage("Selected type: " + std::to_string(state.selectType.load()));
    }
    else
    {
        state.selectType.store(DYNAMIC);
        settings["SelectType"] = state.selectType.load();
        SetSettings(settings);
        HSDLogger::LogMessage("No SelectType setting found, defaulting to DYNAMIC");
    }

    if (settings.contains("pointX") && settings.contains("pointY"))
    {
        state.pointX.store(settings["pointX"]);
        state.pointY.store(settings["pointY"]);
        HSDLogger::LogMessage("Loaded fixed point: (" + std::to_string(state.pointX.load()) + "," + std::to_string(state.pointY.load()) + ")");
    }

    if (settings.contains("copyToClipboard"))
    {
        state.copyToClipboard.store(settings["copyToClipboard"]);
        HSDLogger::LogMessage("Loaded copyToClipboard: " + std::to_string(state.copyToClipboard.load()));
    }
    else
    {
        state.copyToClipboard.store(false);
        settings["copyToClipboard"] = false;
        SetSettings(settings);
        HSDLogger::LogMessage("No copyToClipboard setting found, defaulting to false");
    }

    if (KEY_PRESS != state.selectType.load() && !state.isRunning)
    {
        state.isKeyPress.store(false);
        // 启动一个线程每隔100ms获取一次鼠标位置并更新颜色
        state.isRunning = true;
        HSDLogger::LogMessage("Starting background thread for color updates");
        state.colorUpdateThread = std::make_unique<std::thread>([this, key]()
                                                                {
            auto &state = processStates[key];
            while (state.isRunning)
            {
                if (!state.isKeyPress.load())
                {
                    CGEventRef event = CGEventCreate(NULL);
                    CGPoint point = CGEventGetLocation(event);
                    CFRelease(event);
                    if (FIXED == state.selectType.load())
                    {
                        point.x = state.pointX.load();
                        point.y = state.pointY.load();
                    }
                    CGColorRef color = getPixelColorAtLocation(point);
                    if (color != NULL)
                    {
                        SetImage(returnBase64ImgFromColor(color, (DisplayFormatType)state.displayFormat.load()));
                        if (!CGColorEqualToColor(state.preColor.load(), color) && state.selectType.load() == FIXED)
                        {
                            state.preColor.store(color);
                            if (state.copyToClipboard.load())
                                saveColorToClipboard(color, (DisplayFormatType)state.displayFormat.load());
                        }
                    }
                }
                std::this_thread::sleep_for(std::chrono::milliseconds(100));
            } });
        state.colorUpdateThread->detach();
    }
    else
        state.isKeyPress.store(true);
}

void HSDExampleAction::SendToPlugin(const nlohmann::json &payload)
{
    HSDLogger::LogMessage("Received message from property inspector: " + payload.dump());
    auto settings = payload.value("settings", nlohmann::json::object());
    auto coordinates = payload.value("coordinates", nlohmann::json::object());
    int column = coordinates.value("column", 0);
    int row = coordinates.value("row", 0);
    auto key = std::make_pair(column, row);
    auto &state = processStates[key];

    bool modeChanged = false;
    int oldSelectType = state.selectType.load();

    if (settings.contains("DisplayFormatType"))
    {
        state.displayFormat.store(settings["DisplayFormatType"]);
        HSDLogger::LogMessage("Selected format: " + std::to_string(state.displayFormat.load()));
    }
    else
    {
        settings["DisplayFormatType"] = state.displayFormat.load();
        SetSettings(settings);
        HSDLogger::LogMessage("No DisplayFormatType setting found, defaulting to COLOR_NAME");
    }

    if (settings.contains("SelectType"))
    {
        state.selectType.store(settings["SelectType"]);
        HSDLogger::LogMessage("Selected type: " + std::to_string(state.selectType.load()));
        if (oldSelectType != state.selectType.load())
        {
            modeChanged = true;
        }
    }
    else
    {
        settings["SelectType"] = state.selectType.load();
        SetSettings(settings);
        HSDLogger::LogMessage("No SelectType setting found, defaulting to DYNAMIC");
    }

    if (settings.contains("copyToClipboard"))
    {
        state.copyToClipboard.store(settings["copyToClipboard"]);
        HSDLogger::LogMessage("Loaded copyToClipboard: " + std::to_string(state.copyToClipboard.load()));
    }

    // 处理模式切换
    if (KEY_PRESS == state.selectType.load())
    {
        state.isKeyPress.store(true);
        // 如果之前是动态或固定模式，需要停止线程
        if (modeChanged && (oldSelectType == DYNAMIC || oldSelectType == FIXED))
        {
            state.isRunning = false;
            HSDLogger::LogMessage("Stopping background thread for KEY_PRESS mode");
        }
    }
    else
    {
        state.isKeyPress.store(false);
        // 如果是从按下模式切换到动态/固定模式，需要启动线程
        if (modeChanged && oldSelectType == KEY_PRESS && !state.isRunning)
        {
            state.isRunning = true;
            state.colorUpdateThread = std::make_unique<std::thread>([this, key]()
                                                                    {
                auto &state = processStates[key];
                while (state.isRunning)
                {
                    if (!state.isKeyPress.load())
                    {
                        CGEventRef event = CGEventCreate(NULL);
                        CGPoint point = CGEventGetLocation(event);
                        CFRelease(event);
                        if (FIXED == state.selectType.load())
                        {
                            point.x = state.pointX.load();
                            point.y = state.pointY.load();
                        }
                        CGColorRef color = getPixelColorAtLocation(point);
                        if (color != NULL)
                        {
                            SetImage(returnBase64ImgFromColor(color, (DisplayFormatType)state.displayFormat.load()));
                            if (!CGColorEqualToColor(state.preColor.load(), color) && state.selectType.load() == FIXED)
                            {
                                state.preColor.store(color);
                                if (state.copyToClipboard.load())
                                    saveColorToClipboard(color, (DisplayFormatType)state.displayFormat.load());
                            }
                        }
                    }
                    std::this_thread::sleep_for(std::chrono::milliseconds(100));
                } });
            state.colorUpdateThread->detach();
            HSDLogger::LogMessage("Started background thread for DYNAMIC/FIXED mode");
        }
    }
}

void HSDExampleAction::WillDisappear(const nlohmann::json &payload)
{
    HSDLogger::LogMessage("WillDisappear: " + payload.dump());
    auto coordinates = payload.value("coordinates", nlohmann::json::object());
    int column = coordinates.value("column", 0);
    int row = coordinates.value("row", 0);
    auto key = std::make_pair(column, row);
    auto &state = processStates[key];
    state.isRunning = false;
    if (state.colorUpdateThread && state.colorUpdateThread->joinable())
    {
        state.colorUpdateThread->join();
    }
}
