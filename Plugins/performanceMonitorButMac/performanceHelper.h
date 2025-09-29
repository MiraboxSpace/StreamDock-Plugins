/*
 * @Author: JKWTCN jkwtcn@icloud.com
 * @Date: 2025-09-08 09:32:12
 * @LastEditors: JKWTCN jkwtcn@icloud.com
 * @LastEditTime: 2025-09-09 19:42:33
 * @FilePath: \performanceMonitorButMac\performanceHelper.h
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
#include <thread>
#include <atomic>
#include <array>
class performanceHelper
{
public:
    performanceHelper();
    ~performanceHelper();

    static int getCPUUsageRate();
    static int getMemoryUsageRate();
    static int getDiskUsageRate();
    static std::array<double, 2> getNetworkDataRate();
    static int getGPUUsageRate();
    static double getCPUTemperature();
    static double getGPUTemperature();
};

enum class MonitorType
{
    CPU_USAGE,
    MEMORY_USAGE,
    DISK_USAGE,
    GPU_USAGE,
    DATA_RATE,
    CPU_TEMPERATURE,
    GPU_TEMPERATURE
};

struct ProcessState
{
    std::atomic<int> colorLowThreshold = 0xffff00;
    std::atomic<int> lowThresholdItem = 5;
    std::atomic<int> colorHighThreshold = 0xff0000;
    std::atomic<int> highThresholdItem = 95;
    std::atomic<MonitorType> monitorType = MonitorType::CPU_USAGE;
    std::unique_ptr<std::thread> monitorUpdateThread;
    bool isRunning = false;
};