/*
 * @Author: JKWTCN jkwtcn@icloud.com
 * @Date: 2025-09-08 09:39:08
 * @LastEditors: JKWTCN jkwtcn@icloud.com
 * @LastEditTime: 2025-09-10 08:54:17
 * @FilePath: \performanceMonitorButMac\cpuUsageRateAction.cpp
 * @Description: CPU Usage Rate Action
 */
#include "cpuUsageRateAction.h"
#include <vector>
#include <string>
#include <iostream>
#include <atomic>
#include "StreamDockCPPSDK/StreamDockSDK/NlohmannJSONUtils.h"
#include "StreamDockCPPSDK/StreamDockSDK/HSDLogger.h"
#include "imageHelper.h"
#include "performanceHelper.h"
#include <thread>
#include <chrono>
using namespace std;

std::map<std::pair<int, int>, ProcessState> processStates;

// 图像缓存结构
namespace
{
    struct ImageCache
    {
        std::string lastImageBase64;
        int lastValue = -1;
        std::string lastUnit;
        int lastColor = 0;
        std::array<double, 2> lastDataRates = {-1.0, -1.0};
        std::chrono::steady_clock::time_point lastUpdateTime;
    };

    std::map<std::pair<int, int>, ImageCache> imageCaches;
}

void cpuUsageRateAction::DidReceiveSettings(const nlohmann::json &payload)
{
    auto settings = payload.value("settings", nlohmann::json::object());
    HSDLogger::LogMessage("DidReceiveSettings" + payload.dump());
    auto coordinates = payload.value("coordinates", nlohmann::json::object());
    int column = coordinates.value("column", 0);
    int row = coordinates.value("row", 0);

    // 读取设置
    int lowThreshold = settings.value("lowThresholdItem", 5);
    int lowColor = settings.value("colorLowThreshold", 0xffff00);
    int highThreshold = settings.value("highThresholdItem", 95);
    int highColor = settings.value("colorHighThreshold", 0xff0000);

    auto key = std::make_pair(column, row);
    auto &state = processStates[key];
    state.lowThresholdItem.store(lowThreshold);
    state.colorLowThreshold.store(lowColor);
    state.highThresholdItem.store(highThreshold);
    state.colorHighThreshold.store(highColor);
}

void cpuUsageRateAction::KeyDown(const nlohmann::json &payload)
{
    HSDLogger::LogMessage("KeyDown" + payload.dump());
    auto settings = payload.value("settings", nlohmann::json::object());
    auto coordinates = payload.value("coordinates", nlohmann::json::object());
    int column = coordinates.value("column", 0);
    int row = coordinates.value("row", 0);
}

void cpuUsageRateAction::KeyUp(const nlohmann::json &payload)
{
    HSDLogger::LogMessage("KeyUp: " + payload.dump());
}

void cpuUsageRateAction::WillAppear(const nlohmann::json &payload)
{
    HSDLogger::LogMessage("WillAppear" + payload.dump());
    auto settings = payload.value("settings", nlohmann::json::object());
    auto coordinates = payload.value("coordinates", nlohmann::json::object());
    int column = coordinates.value("column", 0);
    int row = coordinates.value("row", 0);
    auto key = std::make_pair(column, row);
    int action = settings.value("monitorType", 0);

    // 初始化
    int lowThreshold = settings.value("lowThresholdItem", 5);
    int lowColor = settings.value("colorLowThreshold", 0xffff00);
    int highThreshold = settings.value("highThresholdItem", 95);
    int highColor = settings.value("colorHighThreshold", 0xff0000);
    auto &state = processStates[key];
    if (!state.isRunning)
    {
        state.isRunning = true;
        state.lowThresholdItem.store(lowThreshold);
        state.colorLowThreshold.store(lowColor);
        state.highThresholdItem.store(highThreshold);
        state.colorHighThreshold.store(highColor);
        if (action == 0)
        {
            state.monitorType = MonitorType::CPU_USAGE;
        }
        else if (action == 1)
        {
            state.monitorType = MonitorType::MEMORY_USAGE;
        }
        else if (action == 2)
        {
            state.monitorType = MonitorType::DISK_USAGE;
        }
        else if (action == 3)
        {
            state.monitorType = MonitorType::GPU_USAGE;
        }
        else if (action == 4)
        {
            state.monitorType = MonitorType::DATA_RATE;
        }
        else if (action == 5)
        {
            state.monitorType = MonitorType::CPU_TEMPERATURE;
        }
        else if (action == 6)
        {
            state.monitorType = MonitorType::GPU_TEMPERATURE;
        }
        else
        {
            // 默认设置为CPU使用率监控
            state.monitorType = MonitorType::CPU_USAGE;
        }
        state.monitorUpdateThread = std::make_unique<std::thread>([this, key]()
                                                                  {
        auto &state = processStates[key];
        auto &cache = imageCaches[key]; // 获取图像缓存
        int rate, color = 0x00ff00;
        std::array<double, 2> dataRates;
        
        // 设置最小更新间隔，减少不必要的图像生成
        const auto minUpdateInterval = std::chrono::milliseconds(500);
        auto lastUpdateTime = std::chrono::steady_clock::now() - minUpdateInterval;
        
        while (state.isRunning)
        {
            auto now = std::chrono::steady_clock::now();
            auto timeSinceLastUpdate = std::chrono::duration_cast<std::chrono::milliseconds>(now - lastUpdateTime);
            
            // 只有当超过最小更新间隔时才更新图像
            if (timeSinceLastUpdate >= minUpdateInterval)
            {
                switch (state.monitorType)
                {
                case MonitorType::CPU_USAGE:
                    // 监控 CPU 使用率
                    rate = performanceHelper::getCPUUsageRate();
                    if (rate > state.highThresholdItem.load())
                        color = state.colorHighThreshold.load();
                    else if (rate < state.lowThresholdItem.load())
                        color = state.colorLowThreshold.load();
                    else
                        color = 0x00ff00;
                    
                    // 只有当值或颜色变化时才重新生成图像
                    if (rate != cache.lastValue || color != cache.lastColor || cache.lastUnit != "%")
                    {
                        cache.lastImageBase64 = imageHelper::getButtonImageBase64(rate, "%", color);
                        cache.lastValue = rate;
                        cache.lastColor = color;
                        cache.lastUnit = "%";
                        SetImage(cache.lastImageBase64);
                    }
                    break;
                    
                case MonitorType::MEMORY_USAGE:
                    // 监控内存使用率
                    rate = performanceHelper::getMemoryUsageRate();
                    if (rate > state.highThresholdItem.load())
                        color = state.colorHighThreshold.load();
                    else if (rate < state.lowThresholdItem.load())
                        color = state.colorLowThreshold.load();
                    else
                        color = 0x00ff00;
                    
                    // 只有当值或颜色变化时才重新生成图像
                    if (rate != cache.lastValue || color != cache.lastColor || cache.lastUnit != "%")
                    {
                        cache.lastImageBase64 = imageHelper::getButtonImageBase64(rate, "%", color);
                        cache.lastValue = rate;
                        cache.lastColor = color;
                        cache.lastUnit = "%";
                        SetImage(cache.lastImageBase64);
                    }
                    break;
                    
                case MonitorType::DISK_USAGE:
                    // 监控磁盘使用率
                    rate = performanceHelper::getDiskUsageRate();
                    if (rate > state.highThresholdItem.load())
                        color = state.colorHighThreshold.load();
                    else if (rate < state.lowThresholdItem.load())
                        color = state.colorLowThreshold.load();
                    else
                        color = 0x00ff00;
                    
                    // 只有当值或颜色变化时才重新生成图像
                    if (rate != cache.lastValue || color != cache.lastColor || cache.lastUnit != "%")
                    {
                        cache.lastImageBase64 = imageHelper::getButtonImageBase64(rate, "%", color);
                        cache.lastValue = rate;
                        cache.lastColor = color;
                        cache.lastUnit = "%";
                        SetImage(cache.lastImageBase64);
                    }
                    break;
                    
                case MonitorType::GPU_USAGE:
                    // 监控 GPU 使用率
                    rate = performanceHelper::getGPUUsageRate();
                    if (rate > state.highThresholdItem.load())
                        color = state.colorHighThreshold.load();
                    else if (rate < state.lowThresholdItem.load())
                        color = state.colorLowThreshold.load();
                    else
                        color = 0x00ff00;
                    
                    // 只有当值或颜色变化时才重新生成图像
                    if (rate != cache.lastValue || color != cache.lastColor || cache.lastUnit != "%")
                    {
                        cache.lastImageBase64 = imageHelper::getButtonImageBase64(rate, "%", color);
                        cache.lastValue = rate;
                        cache.lastColor = color;
                        cache.lastUnit = "%";
                        SetImage(cache.lastImageBase64);
                    }
                    break;
                    
                case MonitorType::DATA_RATE:
                    // 监控网速
                    dataRates = performanceHelper::getNetworkDataRate();
                    
                    // 只有当网速值变化时才重新生成图像
                    if (dataRates[0] != cache.lastDataRates[0] || dataRates[1] != cache.lastDataRates[1])
                    {
                        cache.lastImageBase64 = imageHelper::getDataRateImageBase64(dataRates[0], dataRates[1]);
                        cache.lastDataRates[0] = dataRates[0];
                        cache.lastDataRates[1] = dataRates[1];
                        SetImage(cache.lastImageBase64);
                    }
                    break;
                    
                case MonitorType::CPU_TEMPERATURE:
                    // 监控CPU温度
                    rate = performanceHelper::getCPUTemperature();
                    if (rate > state.highThresholdItem.load())
                        color = state.colorHighThreshold.load();
                    else if (rate < state.lowThresholdItem.load())
                        color = state.colorLowThreshold.load();
                    else
                        color = 0x00ff00;
                    
                    // 只有当值或颜色变化时才重新生成图像
                    if (rate != cache.lastValue || color != cache.lastColor || cache.lastUnit != "C")
                    {
                        cache.lastImageBase64 = imageHelper::getButtonImageBase64(rate, "C", color);
                        cache.lastValue = rate;
                        cache.lastColor = color;
                        cache.lastUnit = "C";
                        SetImage(cache.lastImageBase64);
                    }
                    break;
                    
                case MonitorType::GPU_TEMPERATURE:
                    // 监控GPU温度
                    rate = performanceHelper::getGPUTemperature();
                    if (rate > state.highThresholdItem.load())
                        color = state.colorHighThreshold.load();
                    else if (rate < state.lowThresholdItem.load())
                        color = state.colorLowThreshold.load();
                    else
                        color = 0x00ff00;
                    
                    // 只有当值或颜色变化时才重新生成图像
                    if (rate != cache.lastValue || color != cache.lastColor || cache.lastUnit != "C")
                    {
                        cache.lastImageBase64 = imageHelper::getButtonImageBase64(rate, "C", color);
                        cache.lastValue = rate;
                        cache.lastColor = color;
                        cache.lastUnit = "C";
                        SetImage(cache.lastImageBase64);
                    }
                    break;
                }
                
                lastUpdateTime = now;
            }
            
            // 使用较短的睡眠时间，但通过时间检查控制更新频率
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        } });
        state.monitorUpdateThread->detach();
    }
}

void cpuUsageRateAction::SendToPlugin(const nlohmann::json &payload)
{
    HSDLogger::LogMessage("Received message from property inspector: " + payload.dump());
    auto settings = payload.value("settings", nlohmann::json::object());
    auto coordinates = payload.value("coordinates", nlohmann::json::object());
    int column = coordinates.value("column", 0);
    int row = coordinates.value("row", 0);
}

void cpuUsageRateAction::WillDisappear(const nlohmann::json &payload)
{
    HSDLogger::LogMessage("WillDisappear: " + payload.dump());
    auto coordinates = payload.value("coordinates", nlohmann::json::object());
    int column = coordinates.value("column", 0);
    int row = coordinates.value("row", 0);
    // 停止全部线程释放资源
    auto key = std::make_pair(column, row);
    auto &state = processStates[key];
    state.isRunning = false;
    if (state.monitorUpdateThread && state.monitorUpdateThread->joinable())
    {
        state.monitorUpdateThread->join();
    }
}
