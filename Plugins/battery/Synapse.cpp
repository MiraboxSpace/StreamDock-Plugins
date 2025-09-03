#include "Synapse.h"

//构造函数
SynapseReader::SynapseReader() {
    char* UserProfile = nullptr;
    size_t len = 0;
    _dupenv_s(&UserProfile, &len, "USERPROFILE");
    if (!UserProfile) {
        return;
    }

    fs::path synapse3Path = fs::path(UserProfile) / "AppData" / "Local" / "Razer" / "Synapse3";
    fs::path synapse4Path = fs::path(UserProfile) / "AppData" / "Local" / "Razer" / "RazerAppEngine";
    free(UserProfile);
    if (fs::exists(synapse3Path)) {
        synapseVersion = 3;
    }
    if (fs::exists(synapse4Path)) {
        synapseVersion = 4;
    }

    if (synapseVersion == -1) {
        return;
    }

    refreshThread = std::thread([this]() {
        while (running) {
            RefreshStats();
            std::this_thread::sleep_for(std::chrono::milliseconds(REFRESH_TIMEOUT_MS));
        }
        });
}

//析构函数
SynapseReader::~SynapseReader() {
    running = false;
    if (refreshThread.joinable()) {
        refreshThread.join();
    }
}

//获取所有雷蛇设备
std::vector<DeviceInfo> SynapseReader::GetAllDevices() {
    std::lock_guard<std::mutex> lock(statsMutex);
    if (batteryStats.empty()) {
        RefreshStats();
    }

    std::vector<DeviceInfo> devices;
    for (const auto& [name, stats] : batteryStats) {
        devices.push_back({ name });
    }
    return devices;
}

//获取电池状态
std::shared_ptr<SynapseBatteryStats> SynapseReader::GetBatteryStats(const std::string& deviceName) {
    auto it = batteryStats.find(deviceName);
    if (it == batteryStats.end()) {
        return nullptr;
    }
    return std::make_shared<SynapseBatteryStats>(it->second);
}

#include "StreamDockCPPSDK/StreamDockSDK/HSDLogger.h"
//刷新线程
void SynapseReader::RefreshStats() {
    char* UserProfile = nullptr;
    size_t len = 0;
    _dupenv_s(&UserProfile, &len, "USERPROFILE");
    if (!UserProfile) {
        return;
    }

    fs::path logFilePath;
    if (synapseVersion == 3) {
        logFilePath = fs::path(UserProfile) / "AppData" / "Local" / "Razer" / "Synapse3" / "Log" / "Razer Synapse 3.log";
    }
    else {
        fs::path logDir = fs::path(UserProfile) / "AppData" / "Local" / "Razer" / "RazerAppEngine" / "User Data" / "Logs";
        std::regex reg("background-manager.log");
        //std::regex reg1("background-manager\\d*\\.log");

        std::vector<fs::path> logFiles;
        for (const auto& entry : fs::directory_iterator(logDir)) {
            if (std::regex_match(entry.path().filename().string(), reg)) {
                logFiles.push_back(entry.path());
            }
            //else if(std::regex_match(entry.path().filename().string(), reg1)) {
            //    logFiles.push_back(entry.path());
            //}
        }

       /* if (logFiles.empty()) {
            return;
        }

        std::sort(logFiles.begin(), logFiles.end(), [](const fs::path& a, const fs::path& b) {
            return a.filename().string() > b.filename().string();
            });*/

        logFilePath = logFiles.front();
    }
    free(UserProfile);

    

    if (!fs::exists(logFilePath)) {
        return;
    }

    std::ifstream file(logFilePath, std::ios::ate);
    if (!file.is_open()) {
        return;
    }

    auto fileSize = file.tellg();
    if (fileSize == lastMaxOffset) {
        return;
    }
    if (fileSize < lastMaxOffset) {
       lastMaxOffset = 0;
    }
    if (lastMaxOffset < 0) {
        lastMaxOffset = 0; 
    }

    file.seekg(lastMaxOffset);
    std::string line;

    HSDLogger::LogMessage("=================== logFilePath" + logFilePath.string() + 
                          "version: " + std::to_string(synapseVersion) +
                          "file size: " + std::to_string(lastMaxOffset) + " / " + std::to_string(fileSize));
    while (std::getline(file, line)) { 
        if (synapseVersion == 3) {
            if (line.find("INFO 1 Battery Get By Device Handle") != std::string::npos) {
                auto updateDate = ParseDateTime(line.substr(0, 24));
                std::string deviceName = line.substr(line.rfind(':') + 2);

                SynapseBatteryStats stats;
                stats.DeviceName = deviceName;
                stats.UpdateDate = updateDate;

                bool complete = false;
                while (!complete && std::getline(file, line)) {
                    if (line.find("Battery Percentage:") != std::string::npos) {
                        stats.percentage = std::stoi(line.substr(line.rfind(':') + 2));
                    }
                    else if (line.find("Battery State:") != std::string::npos) {
                        stats.ChargingState = line.substr(line.rfind(':') + 2);
                        complete = true;

                    }
                }

                batteryStats[deviceName] = stats;
            }
        }
        else if (synapseVersion == 4) {
            if (line.find("info: call function handleOpenUITab") != std::string::npos) {
                try {
                    auto updateDate = ParseDateTime(line.substr(1, 23));
                    auto jsonStart = line.find('{');
                    if (jsonStart != std::string::npos) {
                        auto allJson = json::parse(line.substr(jsonStart));
                        if (allJson.contains("newValue")) {
                            auto newValueStr = allJson["newValue"].get<std::string>();
                            auto j = nlohmann::json::parse(newValueStr);

                            if (j.contains("hasBattery") && j["hasBattery"].get<bool>() &&
                                j.contains("powerStatus") && !j["powerStatus"].is_null()) {
                                SynapseBatteryStats stats;
                                stats.DeviceName = j["name"]["en"].get<std::string>();
                                stats.UpdateDate = updateDate;
                                stats.percentage = j["powerStatus"]["level"].get<int>();
                                stats.ChargingState = j["powerStatus"]["chargingStatus"].get<std::string>();

                                // 转换时间
                                std::time_t tt = std::chrono::system_clock::to_time_t(stats.UpdateDate);
                                char timeBuf[32];
                                std::strftime(timeBuf, sizeof(timeBuf), "%Y-%m-%d %H:%M:%S", std::localtime(&tt));
                                HSDLogger::LogMessage(
                                    "DeviceName=" + stats.DeviceName +
                                    ", Percentage=" + std::to_string(stats.percentage) +
                                    ", ChargingState=" + stats.ChargingState +
                                    ", UpdateDate=" + std::string(timeBuf)
                                );

                                batteryStats[stats.DeviceName] = stats;
                            }
                        }
                    }
                }
                catch (...) {
                }
            }
        }
    }

    lastMaxOffset = file.tellg();
}

//格式化最后获取时间
std::chrono::system_clock::time_point SynapseReader::ParseDateTime(const std::string& dateStr) {
    std::tm tm = {};
    std::istringstream ss(dateStr);
    ss >> std::get_time(&tm, "%Y-%m-%d %H:%M:%S,%f");
    return std::chrono::system_clock::from_time_t(std::mktime(&tm));
}
