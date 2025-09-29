/*
 * @Author: JKWTCN jkwtcn@icloud.com
 * @Date: 2025-09-09 10:53:22
 * @LastEditors: JKWTCN jkwtcn@icloud.com
 * @LastEditTime: 2025-09-11 20:35:09
 * @FilePath: \performanceMonitorButMac\performanceHelper.cpp
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
#include "performanceHelper.h"
#include <chrono>
#include <algorithm>

#ifdef __APPLE__
#include <mach/mach_host.h>
#include <mach/processor_info.h>
#include <mach/mach.h>
#include <mach/vm_statistics.h>
#include <sys/sysctl.h>
#include <sys/statvfs.h>
#include <sys/mount.h>
#include <unistd.h>
#include <IOKit/IOKitLib.h>
#include <IOKit/graphics/IOGraphicsLib.h>
#include <IOKit/hid/IOHIDLib.h>
#include <CoreFoundation/CoreFoundation.h>
#include <net/route.h>
#include <net/if.h>
#include <sys/time.h>
#endif

#ifdef _WIN32
#include <windows.h>
#include <iostream>
#include <psapi.h>
#include <pdh.h>
#include <pdhmsg.h>
#include <iphlpapi.h>
#include <tlhelp32.h>
#include <winternl.h>
#include <netioapi.h>
#pragma comment(lib, "pdh.lib")
#pragma comment(lib, "iphlpapi.lib")
#endif

performanceHelper::~performanceHelper()
{
}

// 缓存结构和时间戳
namespace
{
    struct CacheData
    {
        int cpuUsage = 0;
        int memoryUsage = 0;
        int diskUsage = 0;
        int gpuUsage = 0;
        double cpuTemp = 0.0;
        double gpuTemp = 0.0;
        std::array<double, 2> networkRates = {0.0, 0.0};
        std::chrono::steady_clock::time_point lastUpdate;
        bool initialized = false;

        // CPU usage smoothing
        std::array<int, 5> cpuUsageHistory = {0, 0, 0, 0, 0};
        int cpuUsageIndex = 0;
        int cpuUsageSamples = 0;
    };

    static CacheData s_cache;
    static const std::chrono::milliseconds CACHE_DURATION(1000); // 缓存1000毫秒，与任务管理器更新频率更匹配
}

/// @brief Check if cache is expired
/// @return true if cache is expired, false otherwise
bool isCacheExpired()
{
    auto now = std::chrono::steady_clock::now();
    auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(now - s_cache.lastUpdate);
    return elapsed >= CACHE_DURATION || !s_cache.initialized;
}

/// @brief Update all cached performance data
void updateCache()
{
    if (!isCacheExpired())
    {
        return;
    }

#ifdef __APPLE__
    // Update CPU usage
    host_cpu_load_info_data_t cpuinfo;
    mach_msg_type_number_t count = HOST_CPU_LOAD_INFO_COUNT;
    kern_return_t kr = host_statistics(mach_host_self(), HOST_CPU_LOAD_INFO, (host_info_t)&cpuinfo, &count);
    if (kr == KERN_SUCCESS)
    {
        unsigned long long totalTicks = 0;
        for (int i = 0; i < CPU_STATE_MAX; i++)
        {
            totalTicks += cpuinfo.cpu_ticks[i];
        }
        unsigned long long idleTicks = cpuinfo.cpu_ticks[CPU_STATE_IDLE];

        static unsigned long long prevTotalTicks = 0;
        static unsigned long long prevIdleTicks = 0;

        unsigned long long totalTicksSinceLast = totalTicks - prevTotalTicks;
        unsigned long long idleTicksSinceLast = idleTicks - prevIdleTicks;

        prevTotalTicks = totalTicks;
        prevIdleTicks = idleTicks;

        if (totalTicksSinceLast > 0)
        {
            double usage = (double)(totalTicksSinceLast - idleTicksSinceLast) / totalTicksSinceLast * 100.0;
            s_cache.cpuUsage = (int)(usage + 0.5);
        }
    }

    // Update memory usage
    vm_size_t page_size;
    mach_port_t mach_port = mach_host_self();
    vm_statistics64_data_t vm_stats;
    mach_msg_type_number_t vm_count = sizeof(vm_stats) / sizeof(natural_t);

    if (host_page_size(mach_port, &page_size) == KERN_SUCCESS &&
        host_statistics64(mach_port, HOST_VM_INFO64, (host_info64_t)&vm_stats, &vm_count) == KERN_SUCCESS)
    {
        natural_t total_memory = vm_stats.wire_count + vm_stats.active_count +
                                 vm_stats.inactive_count + vm_stats.free_count;
        natural_t used_memory = vm_stats.wire_count + vm_stats.active_count + vm_stats.inactive_count;

        if (total_memory > 0)
        {
            double usage = (double)used_memory / total_memory * 100.0;
            s_cache.memoryUsage = (int)(usage + 0.5);
        }
    }

    // Update disk usage
    struct statfs fs;
    if (statfs("/", &fs) == 0)
    {
        unsigned long long total_space = (unsigned long long)fs.f_blocks * fs.f_bsize;
        unsigned long long free_space = (unsigned long long)fs.f_bfree * fs.f_bsize;
        unsigned long long used_space = total_space - free_space;

        if (total_space > 0)
        {
            double usage = (double)used_space / total_space * 100.0;
            s_cache.diskUsage = (int)(usage + 0.5);
        }
    }

    // Update network rates (less frequently due to high overhead)
    static std::chrono::steady_clock::time_point lastNetworkUpdate;
    auto now = std::chrono::steady_clock::now();
    auto networkElapsed = std::chrono::duration_cast<std::chrono::milliseconds>(now - lastNetworkUpdate);

    if (networkElapsed >= std::chrono::milliseconds(2000) || !s_cache.initialized)
    { // Update every 2 seconds
        static unsigned long long prev_bytes_in = 0;
        static unsigned long long prev_bytes_out = 0;
        static unsigned long long prev_time = 0;

        struct timeval current_time;
        gettimeofday(&current_time, NULL);
        unsigned long long current_time_us = (unsigned long long)current_time.tv_sec * 1000000 + current_time.tv_usec;

        if (prev_time == 0)
        {
            prev_time = current_time_us;
            // Initialize network statistics
            int mib[] = {CTL_NET, PF_ROUTE, 0, 0, NET_RT_IFLIST2, 0};
            size_t len;

            if (sysctl(mib, 6, NULL, &len, NULL, 0) >= 0)
            {
                char *buf = new char[len];
                if (sysctl(mib, 6, buf, &len, NULL, 0) >= 0)
                {
                    char *lim = buf + len;
                    char *next = NULL;
                    for (next = buf; next < lim;)
                    {
                        struct if_msghdr *ifm = (struct if_msghdr *)next;
                        next += ifm->ifm_msglen;

                        if (ifm->ifm_type == RTM_IFINFO2)
                        {
                            struct if_msghdr2 *ifm2 = (struct if_msghdr2 *)ifm;
                            prev_bytes_in = ifm2->ifm_data.ifi_ibytes;
                            prev_bytes_out = ifm2->ifm_data.ifi_obytes;
                            break;
                        }
                    }
                }
                delete[] buf;
            }
        }
        else
        {
            double time_diff = (current_time_us - prev_time) / 1000000.0;
            unsigned long long curr_bytes_in = 0;
            unsigned long long curr_bytes_out = 0;

            int mib[] = {CTL_NET, PF_ROUTE, 0, 0, NET_RT_IFLIST2, 0};
            size_t len;

            if (sysctl(mib, 6, NULL, &len, NULL, 0) >= 0)
            {
                char *buf = new char[len];
                if (sysctl(mib, 6, buf, &len, NULL, 0) >= 0)
                {
                    char *lim = buf + len;
                    char *next = NULL;
                    for (next = buf; next < lim;)
                    {
                        struct if_msghdr *ifm = (struct if_msghdr *)next;
                        next += ifm->ifm_msglen;

                        if (ifm->ifm_type == RTM_IFINFO2)
                        {
                            struct if_msghdr2 *ifm2 = (struct if_msghdr2 *)ifm;
                            curr_bytes_in += ifm2->ifm_data.ifi_ibytes;
                            curr_bytes_out += ifm2->ifm_data.ifi_obytes;
                        }
                    }
                }
                delete[] buf;

                unsigned long long bytes_in_diff = curr_bytes_in - prev_bytes_in;
                unsigned long long bytes_out_diff = curr_bytes_out - prev_bytes_out;

                if (time_diff > 0)
                {
                    double rate_in = bytes_in_diff / time_diff;
                    double rate_out = bytes_out_diff / time_diff;
                    s_cache.networkRates[0] = rate_out / 1024.0; // KB/s
                    s_cache.networkRates[1] = rate_in / 1024.0;  // KB/s
                }

                prev_bytes_in = curr_bytes_in;
                prev_bytes_out = curr_bytes_out;
            }
        }

        prev_time = current_time_us;
        lastNetworkUpdate = now;
    }
#elif defined(_WIN32)
    // Windows implementation
    static PDH_HQUERY cpuQuery = NULL;
    static PDH_HCOUNTER cpuTotal = NULL;
    static PDH_HQUERY memQuery = NULL;
    static PDH_HCOUNTER memUsed = NULL;
    static PDH_HCOUNTER memTotal = NULL;
    static PDH_HQUERY diskQuery = NULL;
    static PDH_HCOUNTER diskUsed = NULL;
    static PDH_HCOUNTER diskTotal = NULL;
    static bool pdhInitialized = false;
    static std::chrono::steady_clock::time_point lastCpuSampleTime;
    static bool firstCpuSample = true;

    // Alternative CPU usage calculation using system times
    static ULONGLONG lastIdleTime = 0;
    static ULONGLONG lastKernelTime = 0;
    static ULONGLONG lastUserTime = 0;
    static bool cpuTimesInitialized = false;

    // Initialize PDH counters on first run
    if (!pdhInitialized)
    {
        PdhOpenQuery(NULL, 0, &cpuQuery);
        PdhAddCounterW(cpuQuery, L"\\Processor(_Total)\\% Processor Time", 0, &cpuTotal);
        PdhCollectQueryData(cpuQuery);

        PdhOpenQuery(NULL, 0, &memQuery);
        PdhAddCounterW(memQuery, L"\\Memory\\Available MBytes", 0, &memUsed);
        PdhAddCounterW(memQuery, L"\\Memory\\Committed Bytes", 0, &memTotal);
        PdhCollectQueryData(memQuery);

        PdhOpenQuery(NULL, 0, &diskQuery);
        PdhAddCounterW(diskQuery, L"\\PhysicalDisk(_Total)\\% Disk Time", 0, &diskUsed);
        PdhAddCounterW(diskQuery, L"\\PhysicalDisk(_Total)\\Disk Read Bytes/sec", 0, &diskTotal);
        PdhCollectQueryData(diskQuery);

        pdhInitialized = true;
        lastCpuSampleTime = std::chrono::steady_clock::now();
    }

    // Update CPU usage with multiple methods for better accuracy
    auto nowTime = std::chrono::steady_clock::now();
    auto cpuElapsed = std::chrono::duration_cast<std::chrono::milliseconds>(nowTime - lastCpuSampleTime);

    // Only update CPU usage every 1000ms for accurate measurement
    if (cpuElapsed >= std::chrono::milliseconds(1000) || firstCpuSample)
    {
        // Method 1: PDH counter (original method)
        PDH_FMT_COUNTERVALUE counterVal;
        PDH_STATUS status = PdhCollectQueryData(cpuQuery);
        int pdhCpuUsage = 0;

        if (status == ERROR_SUCCESS)
        {
            // Wait a bit after first sample for accurate measurement
            if (firstCpuSample)
            {
                std::this_thread::sleep_for(std::chrono::milliseconds(100));
                PdhCollectQueryData(cpuQuery);
                firstCpuSample = false;
            }

            status = PdhGetFormattedCounterValue(cpuTotal, PDH_FMT_LONG, NULL, &counterVal);
            if (status == ERROR_SUCCESS)
            {
                pdhCpuUsage = (int)counterVal.longValue;
            }
        }

        // Method 2: System times (more accurate, matches Task Manager)
        FILETIME idleTime, kernelTime, userTime;
        if (GetSystemTimes(&idleTime, &kernelTime, &userTime))
        {
            ULONGLONG idleTime64 = ((ULONGLONG)idleTime.dwHighDateTime << 32) | idleTime.dwLowDateTime;
            ULONGLONG kernelTime64 = ((ULONGLONG)kernelTime.dwHighDateTime << 32) | kernelTime.dwLowDateTime;
            ULONGLONG userTime64 = ((ULONGLONG)userTime.dwHighDateTime << 32) | userTime.dwLowDateTime;

            if (cpuTimesInitialized)
            {
                ULONGLONG idleDiff = idleTime64 - lastIdleTime;
                ULONGLONG kernelDiff = kernelTime64 - lastKernelTime;
                ULONGLONG userDiff = userTime64 - lastUserTime;
                ULONGLONG totalDiff = kernelDiff + userDiff;

                if (totalDiff > 0)
                {
                    // Calculate CPU usage as percentage of non-idle time
                    // This matches Task Manager's calculation method
                    int systemTimesCpuUsage = (int)((double)(totalDiff - idleDiff) / totalDiff * 100.0);

                    // Apply smoothing to CPU usage for more stable readings
                    int rawCpuUsage = 0;
                    if (systemTimesCpuUsage >= 0 && systemTimesCpuUsage <= 100)
                    {
                        rawCpuUsage = systemTimesCpuUsage;
                    }
                    else if (pdhCpuUsage >= 0 && pdhCpuUsage <= 100)
                    {
                        rawCpuUsage = pdhCpuUsage;
                    }

                    // Add to history buffer
                    s_cache.cpuUsageHistory[s_cache.cpuUsageIndex] = rawCpuUsage;
                    s_cache.cpuUsageIndex = (s_cache.cpuUsageIndex + 1) % 5;
                    s_cache.cpuUsageSamples++;

                    // Calculate smoothed average
                    int sum = 0;
                    int samplesToUse = (std::min)(s_cache.cpuUsageSamples, 5);
                    for (int i = 0; i < samplesToUse; i++)
                    {
                        sum += s_cache.cpuUsageHistory[i];
                    }
                    s_cache.cpuUsage = sum / samplesToUse;
                }
            }
            else
            {
                cpuTimesInitialized = true;
                // Use PDH value for first sample
                if (pdhCpuUsage >= 0 && pdhCpuUsage <= 100)
                {
                    s_cache.cpuUsage = pdhCpuUsage;
                }
            }

            lastIdleTime = idleTime64;
            lastKernelTime = kernelTime64;
            lastUserTime = userTime64;
        }
        else if (pdhCpuUsage >= 0 && pdhCpuUsage <= 100)
        {
            // Fallback to PDH if GetSystemTimes fails
            s_cache.cpuUsage = pdhCpuUsage;
        }

        lastCpuSampleTime = nowTime;
    }

    // Update memory usage
    MEMORYSTATUSEX memInfo;
    memInfo.dwLength = sizeof(MEMORYSTATUSEX);
    GlobalMemoryStatusEx(&memInfo);
    double totalPhysMem = memInfo.ullTotalPhys;
    double usedPhysMem = totalPhysMem - memInfo.ullAvailPhys;
    s_cache.memoryUsage = (int)((usedPhysMem / totalPhysMem) * 100.0);

    // Update disk usage
    ULARGE_INTEGER freeBytesAvailable, totalBytes, totalFreeBytes;
    if (GetDiskFreeSpaceExA("C:\\", &freeBytesAvailable, &totalBytes, &totalFreeBytes))
    {
        double usedDisk = totalBytes.QuadPart - totalFreeBytes.QuadPart;
        s_cache.diskUsage = (int)((usedDisk / totalBytes.QuadPart) * 100.0);
    }

    // Update network rates
    static std::chrono::steady_clock::time_point lastNetworkUpdate;
    static ULONGLONG prevBytesIn = 0;
    static ULONGLONG prevBytesOut = 0;
    nowTime = std::chrono::steady_clock::now();
    auto networkElapsed = std::chrono::duration_cast<std::chrono::milliseconds>(nowTime - lastNetworkUpdate);

    if (networkElapsed >= std::chrono::milliseconds(2000) || !s_cache.initialized)
    {
        // Use GetIfTable instead of GetIfTable2 for better compatibility
        PMIB_IFTABLE pIfTable;
        DWORD dwSize = 0;
        DWORD dwRetVal = GetIfTable(NULL, &dwSize, FALSE);

        if (dwRetVal == ERROR_INSUFFICIENT_BUFFER)
        {
            pIfTable = (PMIB_IFTABLE)malloc(dwSize);
            if (pIfTable)
            {
                dwRetVal = GetIfTable(pIfTable, &dwSize, FALSE);
                if (dwRetVal == NO_ERROR)
                {
                    ULONGLONG currBytesIn = 0;
                    ULONGLONG currBytesOut = 0;

                    for (DWORD i = 0; i < pIfTable->dwNumEntries; i++)
                    {
                        MIB_IFROW row = pIfTable->table[i];
                        // Skip loopback and non-operational interfaces
                        if (row.dwType != MIB_IF_TYPE_LOOPBACK && row.dwOperStatus == IF_OPER_STATUS_OPERATIONAL)
                        {
                            currBytesIn += row.dwInOctets;
                            currBytesOut += row.dwOutOctets;
                        }
                    }

                    if (prevBytesIn > 0 && prevBytesOut > 0)
                    {
                        double timeDiff = networkElapsed.count() / 1000.0;
                        if (timeDiff > 0)
                        {
                            s_cache.networkRates[0] = (currBytesOut - prevBytesOut) / timeDiff / 1024.0; // Upload KB/s
                            s_cache.networkRates[1] = (currBytesIn - prevBytesIn) / timeDiff / 1024.0;   // Download KB/s
                        }
                    }

                    prevBytesIn = currBytesIn;
                    prevBytesOut = currBytesOut;
                }
                free(pIfTable);
            }
        }

        lastNetworkUpdate = nowTime;
    }
#endif

    // Update GPU usage and temperature (less frequently due to high overhead)
    static std::chrono::steady_clock::time_point lastGpuUpdate;
    auto gpuElapsed = std::chrono::duration_cast<std::chrono::milliseconds>(nowTime - lastGpuUpdate);

    if (gpuElapsed >= std::chrono::milliseconds(3000) || !s_cache.initialized)
    { // Update every 3 seconds
        // Simplified GPU usage - in a real implementation you'd use Metal or other APIs
        s_cache.gpuUsage = (s_cache.gpuUsage + 1) % 100; // Placeholder

        // Simplified GPU temperature
        s_cache.gpuTemp = 45.0 + (s_cache.gpuUsage * 0.3); // Placeholder
        lastGpuUpdate = nowTime;
    }

    // Update CPU temperature (less frequently due to high overhead)
    static std::chrono::steady_clock::time_point lastCpuTempUpdate;
    auto cpuTempElapsed = std::chrono::duration_cast<std::chrono::milliseconds>(nowTime - lastCpuTempUpdate);

    if (cpuTempElapsed >= std::chrono::milliseconds(3000) || !s_cache.initialized)
    { // Update every 3 seconds
        // Simplified CPU temperature
        s_cache.cpuTemp = 40.0 + (s_cache.cpuUsage * 0.4); // Placeholder
        lastCpuTempUpdate = nowTime;
    }

    s_cache.lastUpdate = nowTime;
    s_cache.initialized = true;
}

/// @brief Get the current CPU usage rate.
/// @return The CPU usage rate as a percentage.
int performanceHelper::getCPUUsageRate()
{
    // 使用缓存机制减少系统调用
    updateCache();
    return s_cache.cpuUsage;
}

/// @brief Get the current memory usage rate.
/// @return The memory usage rate as a percentage.
int performanceHelper::getMemoryUsageRate()
{
    // 使用缓存机制减少系统调用
    updateCache();
    return s_cache.memoryUsage;
}

/// @brief Get the current disk usage rate.
/// @return The disk usage rate as a percentage.
int performanceHelper::getDiskUsageRate()
{
    // 使用缓存机制减少系统调用
    updateCache();
    return s_cache.diskUsage;
}

/// @brief Get the current network data rate.
/// @return An array where index 0 is upload speed (KB/s) and index 1 is download speed (KB/s).
std::array<double, 2> performanceHelper::getNetworkDataRate()
{
    // 使用缓存机制减少系统调用
    updateCache();
    return s_cache.networkRates;
}

/// @brief Get the current GPU usage rate.
/// @return The GPU usage rate as a percentage.
int performanceHelper::getGPUUsageRate()
{
    // 使用缓存机制减少系统调用
    updateCache();
    return s_cache.gpuUsage;
}

/// @brief Get the current CPU temperature.
/// @return The CPU temperature in degrees Celsius.
double performanceHelper::getCPUTemperature()
{
    // 使用缓存机制减少系统调用
    updateCache();
    return s_cache.cpuTemp;
}

/// @brief Get the current GPU temperature.
/// @return The GPU temperature in degrees Celsius.
double performanceHelper::getGPUTemperature()
{
    // 使用缓存机制减少系统调用
    updateCache();
    return s_cache.gpuTemp;
}
