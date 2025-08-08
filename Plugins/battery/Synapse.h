#pragma once
#include <iostream>
#include <fstream>
#include <filesystem>
#include <string>
#include <vector>
#include <map>
#include <mutex>
#include <chrono>
#include <regex>
#include <nlohmann/json.hpp>
#include <common.h>
using json = nlohmann::json;
namespace fs = std::filesystem;
//设备电池信息
struct SynapseBatteryStats {
    std::string DeviceName;
    int percentage = 0;
    std::string ChargingState;
    std::chrono::system_clock::time_point UpdateDate;//最后更新时间
};

class SynapseReader {
private:
    std::mutex statsMutex; //状态锁
    //设备状态
    std::map<std::string, SynapseBatteryStats> batteryStats;
    //设备版本
    int synapseVersion = -1;
    const int REFRESH_TIMEOUT_MS = 10000;  //10s
    //查看文件的指针的偏移位置
    long long lastMaxOffset = 0;   
    bool running = true;
    //刷新线程
    std::thread refreshThread;

    SynapseReader();

public:
    ~SynapseReader();
    //获取唯一实例
    static SynapseReader& GetInstance()
    {
        static SynapseReader instance;
        return instance;
    }
    //获取所有雷蛇设备
    std::vector<DeviceInfo> GetAllDevices();
    //获取电量状态
    std::shared_ptr<SynapseBatteryStats> GetBatteryStats(const std::string& deviceName);

private:
    //刷新状态
    void RefreshStats();
    std::chrono::system_clock::time_point ParseDateTime(const std::string& dateStr);
};

