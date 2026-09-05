#include "HSDExamplePlugin.h"

#include "StreamDockCPPSDK/StreamDockSDK/NlohmannJSONUtils.h"
#include "StreamDockCPPSDK/StreamDockSDK/HSDLogger.h"

///
#define _WINSOCK_DEPRECATED_NO_WARNINGS
#include <winsock2.h>
#include <stdio.h>

#pragma comment(lib, "ws2_32.lib")

#define PORT 6666
#define BUFFER_SIZE 4096
#define PACKET_SIZE 15

static SOCKET serverSocket = INVALID_SOCKET;
static SOCKET clientSocket = INVALID_SOCKET;

int init_server()
{
    WSADATA wsaData;

    struct sockaddr_in serverAddr, clientAddr;
    int clientAddrLen = sizeof(clientAddr);

    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) return -1;

    serverSocket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (serverSocket == INVALID_SOCKET) return -2;

    BOOL opt = TRUE;
    if (setsockopt(serverSocket, SOL_SOCKET, SO_REUSEADDR, (const char*)&opt, sizeof(opt)) == SOCKET_ERROR)
    {
        HSDLogger::LogMessage("Warning: setsockopt(SO_REUSEADDR) failed with error " + WSAGetLastError());
    }

    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = inet_addr("127.0.0.1");
    serverAddr.sin_port = htons(PORT);

    if (bind(serverSocket, (SOCKADDR*)&serverAddr, sizeof(serverAddr)) == SOCKET_ERROR)
        return -3;

    if (listen(serverSocket, 1) == SOCKET_ERROR)
        return -4;

    HSDLogger::LogMessage("Server listening on port %d " + std::to_string(PORT));

    clientSocket = accept(serverSocket, (SOCKADDR*)&clientAddr, &clientAddrLen);
    if (clientSocket == INVALID_SOCKET)
        return -5;

    HSDLogger::LogMessage("Client connected!");
    return 0;
}

int recv_data(unsigned char* buffer, int bufsize)
{
    if (clientSocket == INVALID_SOCKET) return -1;
    int bytesRead = recv(clientSocket, (char*)buffer, bufsize, 0);
    if (bytesRead <= 0)
    {
        closesocket(clientSocket);
        clientSocket = INVALID_SOCKET;
        return -2;
    }
    return bytesRead;
}

#include <windows.h>
#include <tlhelp32.h>
#pragma comment(lib, "Kernel32.lib") 

inline bool isProcessRunning(const std::string& exeName) 
{
    HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (hSnapshot == INVALID_HANDLE_VALUE) return false;

    PROCESSENTRY32 pe;  
    pe.dwSize = sizeof(PROCESSENTRY32);

    if (Process32First(hSnapshot, &pe)) { 
        do {
            std::wstring wExe(pe.szExeFile);
            std::string currentExe(wExe.begin(), wExe.end());
            if (_stricmp(currentExe.c_str(), exeName.c_str()) == 0) {
                CloseHandle(hSnapshot);
                return true;
            }
        } while (Process32Next(hSnapshot, &pe));  
    }

    CloseHandle(hSnapshot);
    return false;
}

inline bool launchHiddenProcess(const std::string& relativePath) 
{
    char exePath[MAX_PATH];
    GetModuleFileNameA(NULL, exePath, MAX_PATH);
    std::string dirPath(exePath);
    dirPath = dirPath.substr(0, dirPath.find_last_of("\\/"));

    std::string fullPath = dirPath + "\\" + relativePath;
    std::string exeName = relativePath.substr(relativePath.find_last_of("\\/") + 1);

    if (isProcessRunning(exeName)) {
        return true;
    }

    STARTUPINFOA si;
    PROCESS_INFORMATION pi;
    ZeroMemory(&si, sizeof(si));
    ZeroMemory(&pi, sizeof(pi));
    si.cb = sizeof(si);
    si.dwFlags = STARTF_USESHOWWINDOW;
    si.wShowWindow = SW_HIDE;

    DWORD creationFlags = CREATE_NO_WINDOW | CREATE_SUSPENDED;

    if (!CreateProcessA(
        fullPath.c_str(),
        NULL,
        NULL,
        NULL,
        FALSE,
        creationFlags,
        NULL,
        dirPath.c_str(),
        &si,
        &pi))
    {
        HSDLogger::LogMessage("启动失败: " + fullPath + " 错误码 " + std::to_string(GetLastError()));
        return false;
    }

    // 4️⃣ 绑定 Job 对象，主程序退出时自动关闭子进程
    HANDLE hJob = CreateJobObject(NULL, NULL);
    if (hJob) {
        JOBOBJECT_EXTENDED_LIMIT_INFORMATION jeli = { 0 };
        jeli.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        SetInformationJobObject(hJob, JobObjectExtendedLimitInformation, &jeli, sizeof(jeli));
        AssignProcessToJobObject(hJob, pi.hProcess);
    }

    // 5️⃣ 启动进程
    ResumeThread(pi.hThread);

    CloseHandle(pi.hThread);
    CloseHandle(pi.hProcess);
    return true;
}

#include "StreamDockCppSDK/StreamDockSDK/HSDConnectionManager.h"
void HSDExamplePlugin::StartServerThread()
{
    if (running)
    {
        HSDLogger::LogMessage("Server thread already running");
        return;
    }

    running = true;

    serverThread = std::thread([this]() {
        if (init_server() != 0) {
            HSDLogger::LogMessage("init_server error - port: " + std::to_string(PORT));
            running = false;
            return;
        }

        unsigned char ringBuf[BUFFER_SIZE];
        int head = 0;
        int tail = 0;

        while (running)
        {
            int space = (tail > head)
                ? (tail - head - 1)
                : (BUFFER_SIZE - head + tail - 1);

            if (space == 0) {
                HSDLogger::LogMessage("缓冲区满，丢弃一个包");
                tail = (tail + PACKET_SIZE) % BUFFER_SIZE;
                continue;
            }

            int recvLen = recv_data(ringBuf + head,
                (tail > head) ? (tail - head - 1) : (BUFFER_SIZE - head));
            if (recvLen == -2)
            {
                HSDLogger::LogMessage("Client disconnected");
                break;
            }
            if (recvLen <= 0)
                continue;

            head = (head + recvLen) % BUFFER_SIZE;

            while (true)
            {
                int available = (head >= tail)
                    ? (head - tail)
                    : (BUFFER_SIZE - tail + head);

                if (available < PACKET_SIZE)
                    break;

                // 只取后面 4 个灯效（每个3字节RGB）
                std::vector<int> lampValues;
                for (int i = 1; i < 5; ++i)
                {
                    int idx = (tail + i * 3) % BUFFER_SIZE;
                    lampValues.push_back(ringBuf[idx + 0]);
                    lampValues.push_back(ringBuf[idx + 1]);
                    lampValues.push_back(ringBuf[idx + 2]);
                }

                bool allBlack = true;
                for (size_t i = 0; i < lampValues.size(); i += 3)
                {
                    if (lampValues[i] != 0 || lampValues[i + 1] != 0 || lampValues[i + 2] != 0)
                    {
                        allBlack = false;
                        break;
                    }
                }

                if (allBlack) std::fill(lampValues.begin(), lampValues.end(), 1);

                // 发送到所有设备
                for (const auto& dev : mConnectionManager->deviceList)
                {
                    mConnectionManager->sendToDevice(
                        dev.context,
                        dev.deviceID,
                        dev.deviceID,
                        lampValues,
                        true
                    );
                }

                // 打印灯效
                //std::string lampStr = "Sending lampValues: ";
                //for (int val : lampValues)
                //{
                //    char buf[4];
                //    sprintf(buf, "%02X ", val & 0xFF);
                //    lampStr += buf;
                //}
                //HSDLogger::LogMessage(lampStr);

                tail = (tail + PACKET_SIZE) % BUFFER_SIZE;
            }
        }

        closesocket(serverSocket);
        WSACleanup();
        HSDLogger::LogMessage("Server thread exited cleanly");
    });
}

void HSDExamplePlugin::StopServerThread()
{
    if (!running)
        return;

    running = false;
    shutdown(serverSocket, SD_BOTH); 
    closesocket(serverSocket);

    if (serverThread.joinable())
        serverThread.join();

    HSDLogger::LogMessage("Server thread stopped");
}

///

std::shared_ptr<HSDAction> HSDExamplePlugin::GetOrCreateAction(const std::string& action, const std::string& context)
{
    // 启动exe进程
    if (!launchHiddenProcess("net8.0\\ChromaControl.SDK.Synapse.Sample.exe"))
    {
        HSDLogger::LogMessage("launchHiddenProcess error");
    }

    static std::atomic<bool> firstCreated(false);
    if (!firstCreated.exchange(true))
    {
        StartServerThread();
    }

    auto it = mActions.find(context);
    if (it != mActions.end()) {
        return it->second;
    }

    if (action == "com.hotspot.stream.chroma") {
        auto impl = std::make_shared<HSDExampleAction>(
            mConnectionManager,
            action,
            context
            );
        impl->setExamplePlugin(this);
        mActions.emplace(context, impl);

      
        return impl;
    }

    HSDLogger::LogMessage("Asked to get or create unknown action: " + action);
    return nullptr;
}

void HSDExamplePlugin::DidReceiveGlobalSettings(const nlohmann::json& payload)
{
    HSDLogger::LogMessage("Received global settings");
    HSDLogger::LogMessage("Global settings: " + payload.dump());

    // Do plugin-wide stuff here, e.g. reconnect to application being
    // controlled

    for (const auto& action : mActions) {
        // ... then pass it on to each action, e.g.:
        // action->setApplicationConnection(myConnectionObject);
    }
}
