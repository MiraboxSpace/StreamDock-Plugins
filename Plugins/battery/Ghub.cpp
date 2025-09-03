#include "Ghub.h"
using json = nlohmann::json;
namespace fs = std::filesystem;
// 私有构造函数
GHubReader::GHubReader() {
    // 构建完整路径
    char* localAppData = nullptr;
    size_t len = 0;
    //_dupenv_s获取环境变量为"LOCALAPPDATA"的路径传入localAPPData中
    _dupenv_s(&localAppData, &len, "LOCALAPPDATA");
    ghubFullPath = (fs::path(localAppData ? localAppData : "") / fs::path(GHUB_SETTINGS_FILE)).string();
    free(localAppData);

    // 启动刷新线程
    refreshThread = std::thread([this]() {
        while (running) {
            refreshStats();
            std::this_thread::sleep_for(std::chrono::milliseconds(REFRESH_INTERVAL_MS));
        }
        });
}

// 从数据库读取设置
nlohmann::json GHubReader::readSettingsDB(const std::string& fileName) {
    sqlite3* db = nullptr;
    sqlite3_stmt* stmt = nullptr;
    json result = nullptr;

    try {
        // 打开数据库
        if (sqlite3_open(fileName.c_str(), &db) != SQLITE_OK) {
            throw std::runtime_error(sqlite3_errmsg(db));
        }

        // 准备查询
        const char* sql = "SELECT FILE FROM DATA ORDER BY _id DESC";
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
            throw std::runtime_error(sqlite3_errmsg(db));
        }

        // 执行查询
        if (sqlite3_step(stmt) == SQLITE_ROW) {
            const char* jsonStr = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0));
            if (jsonStr) {
                result = json::parse(jsonStr);
            }
        }

        // 清理
        sqlite3_finalize(stmt);
        sqlite3_close(db);
    }
    catch (...) {
        if (stmt) sqlite3_finalize(stmt);
        if (db) sqlite3_close(db);
    }

    return result;
}
#include "StreamDockCPPSDK/StreamDockSDK/HSDLogger.h"
// 刷新电池状态
void GHubReader::refreshStats() {
    try {
        batteryStats.clear();

        json jObject;
        {
            std::lock_guard<std::mutex> lock(statsMutex);
            // 检查文件是否存在
            if (!fs::exists(ghubFullPath)) {
                HSDLogger::LogMessage("not exists: " + ghubFullPath);
                running = false;
                return;
            }

            // 读取JSON数据
            jObject = readSettingsDB(ghubFullPath);
            if (jObject.is_null()) {
                HSDLogger::LogMessage("jObject is empty");
                return;
            }
        }
        //HSDLogger::LogMessage("============= json: " + jObject.dump());

        // 解析电池信息
        for (auto& [key, value] : jObject.items()) {
            if (key.find("battery") != std::string::npos) {
                //HSDLogger::LogMessage("=========== find battery key：" + key);
                std::vector<std::string> parts;
                size_t start = 0;
                size_t end = key.find('/');

                // 分割路径
                while (end != std::string::npos) {
                    parts.push_back(key.substr(start, end - start));
                    start = end + 1;
                    end = key.find('/', start);
                }
                parts.push_back(key.substr(start));

                // 验证格式并提取数据
                if (parts.size() == 3 && (parts[2] == "percentage" || parts[2] == "warning")) {
                    GHubBatteryStats stats;
                    // stats.isCharging = value["isCharging"];
                    // stats.millivolts = value["millivolts"];
                    stats.percentage = value["percentage"];
                    // 更新设备数据
                    if (batteryStats.find(parts[1]) == batteryStats.end() || parts[2] != "warning") {
                        batteryStats[parts[1]] = stats;
                    }
                }
            }
        }
    }
    catch (...) {
        running = false;
    }
}

// 析构函数
GHubReader::~GHubReader() {
    running = false;
    if (refreshThread.joinable()) {
        refreshThread.join();
    }
}
#include "StreamDockCPPSDK/StreamDockSDK/HSDLogger.h"
// 获取所有罗技设备
std::vector<DeviceInfo> GHubReader::GetAllDevices() {
    if (batteryStats.empty()) {    //为空，则进入刷新线程里面刷新设备 
        refreshStats();
    }

    std::vector<DeviceInfo> devices;
    for (const auto& [name, _] : batteryStats) {
        devices.push_back({ name });
    }
    return devices;
}

    // 获取设备电池状态
std::shared_ptr<GHubBatteryStats> GHubReader::GetBatteryStats(const std::string& deviceName) {
    auto it = batteryStats.find(deviceName);
    if (it == batteryStats.end()) {
        return nullptr;
    }
    return std::make_shared<GHubBatteryStats>(it->second);
}