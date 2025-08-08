#pragma once
#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <memory>
#include <mutex>
#include <chrono>
#include <thread>
#include <filesystem>
#include <sqlite3.h>
#include <nlohmann/json.hpp>
#include <windows.h>
#include <common.h>


// 电池状态结构体
struct GHubBatteryStats {
    //bool isCharging;     //是否在充电 
    //int millivolts;      //电压
    double percentage;   //电量
};

class GHubReader {
private:
    // 常量
    static constexpr const char* GHUB_SETTINGS_FILE = "LGHUB\\settings.db";
    static constexpr const char* GHUB_BATTERY_SECTION = "percentage";  //电量部分
    static constexpr int REFRESH_INTERVAL_MS = 10000;  //刷新时间间隔

    //成员变量
    std::string ghubFullPath;//db文件路径
    std::map<std::string, GHubBatteryStats> batteryStats;//电池状态容器
    std::mutex statsMutex; //状态锁
    bool running = true;
    std::thread refreshThread;  //刷新线程
    GHubReader();
    //读罗技生成的setting.db文件里面的内容.注:需要添加sqlite3的头文件;
    nlohmann::json readSettingsDB(const std::string& fileName);
    //刷新线程
    void refreshStats();
public:
    ~GHubReader();
    //获取唯一实例
    static GHubReader& GetInstance() {
        static GHubReader instance; 
        return instance;
    };
    //获取罗技设备
    std::vector<DeviceInfo> GetAllDevices();
    //获取电池状态
    std::shared_ptr<GHubBatteryStats> GetBatteryStats(const std::string& deviceName);
};
