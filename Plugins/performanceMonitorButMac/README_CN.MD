# 性能监视器 StreamDock 插件

[English](README.md) |  [中文](README_CN.md)

一个用于 StreamDock 设备的性能监控插件，可实时显示系统性能指标，包括 CPU、内存、磁盘、GPU 使用率以及网络速度和温度。

## 功能特性

- **CPU 占用率监控** - 实时显示 CPU 使用百分比
- **内存使用率监控** - 显示当前内存使用情况
- **硬盘使用率监控** - 监控磁盘空间使用情况
- **GPU 使用率监控** - 显示 GPU 使用百分比
- **网络速度监控** - 显示上传和下载速度（KB/s）
- **CPU 温度监控** - 显示 CPU 当前温度
- **GPU 温度监控** - 显示 GPU 当前温度
- **多语言支持** - 支持中文、英文、德文、日文、葡萄牙文和俄文
- **阈值设置** - 可自定义低阈值和高阈值，用于颜色变化提示

## 系统要求

- **操作系统**: macOS 10.11 或更高版本
- **StreamDock 软件**: 版本 2.9 或更高版本
- **开发环境**: CMake 3.10 或更高版本，C++17

## 安装说明

1. 下载插件包 `com.mirabox.performancemonitor.mac.sdPlugin.zip`
2. 在 StreamDock 软件中导入插件
3. 重启 StreamDock 软件
4. 在操作面板中找到"性能监视器"类别

## 构建说明

如果您想从源代码构建此插件，请按照以下步骤操作：

### 前提条件

- CMake 3.10 或更高版本
- C++17 兼容的编译器
- macOS 开发环境（Xcode 命令行工具）

### 构建步骤

1. 克隆仓库

   ```bash
   git clone <repository-url>
   cd performanceMonitorButMac
   ```

2. 创建构建目录

   ```bash
   mkdir build
   cd build
   ```

3. 运行 CMake

   ```bash
   cmake ..
   ```

4. 构建项目

   ```bash
   make
   ```

构建完成后，您将在 build 目录中找到 `performanceMonitor` 可执行文件。

## 项目结构

```
performanceMonitorButMac/
├── CMakeLists.txt                    # CMake 构建配置
├── main.cpp                         # 主程序入口
├── performanceHelper.h/.cpp         # 性能数据获取助手类
├── cpuUsageRateAction.h/.cpp        # CPU 使用率动作类
├── imageHelper.h/.cpp              # 图像处理助手类
├── HSDExamplePlugin.h/.cpp         # 插件主类
├── com.mirabox.performancemonitor.mac.sdPlugin/  # 插件包目录
│   ├── manifest.json               # 插件清单文件
│   ├── [language].json             # 多语言支持文件
│   ├── images/                     # 图标资源
│   └── PropertyInspector/          # 属性检查器文件
└── StreamDockCPPSDK/               # StreamDock C++ SDK
```

## 使用说明

1. 将性能监视器操作拖放到 StreamDock 设备的按键上
2. 点击按键右上角的设置图标打开属性检查器
3. 根据需要设置低阈值和高阈值
   - 低阈值：当性能指标低于此值时显示正常颜色
   - 高阈值：当性能指标高于此值时显示警告颜色
4. 保存设置

## 多语言支持

插件支持以下语言：

- 中文 (zh_CN)
- 英文 (en)
- 德文 (de)
- 日文 (ja)
- 葡萄牙文 (pt)
- 俄文 (ru)

语言会根据 StreamDock 软件的语言设置自动切换。

## 技术实现

### 性能数据获取

插件使用系统 API 获取性能数据：

- **CPU 使用率**: 通过 `host_statistics` 获取 CPU 负载信息
- **内存使用率**: 通过 `host_statistics64` 获取虚拟内存统计信息
- **磁盘使用率**: 通过 `statfs` 获取文件系统统计信息
- **网络速度**: 通过 `sysctl` 获取网络接口统计信息
- **GPU 使用率和温度**: 使用 IOKit 框架获取（简化实现）

### 缓存机制

为了减少系统调用开销，插件实现了缓存机制：

- CPU、内存、磁盘数据每 500ms 更新一次
- 网络数据每 2 秒更新一次
- GPU 和温度数据每 3 秒更新一次

### 插件架构

插件基于 StreamDock C++ SDK 开发，主要组件包括：

- `HSDExamplePlugin`: 插件主类，管理所有动作实例
- `cpuUsageRateAction`: 动作基类，处理按键事件和设置
- `performanceHelper`: 性能数据获取助手类
- `imageHelper`: 图像处理助手类

## 开发者

- **作者**: icloudwar (JKWTCN)
- **邮箱**: <jkwtcn@icloud.com>

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 贡献

欢迎提交问题和拉取请求。如果您想为项目做贡献，请遵循以下步骤：

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个拉取请求

## 更新日志

### v1.0 (2025-09-10)

- 初始版本发布
- 支持 CPU、内存、磁盘、GPU 使用率监控
- 支持网络速度监控
- 支持 CPU 和 GPU 温度监控
- 支持多语言
- 支持阈值设置
