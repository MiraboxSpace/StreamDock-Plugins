# Performance Monitor StreamDock Plugin

[English](README.md) |  [中文](README_CN.md)

A performance monitoring plugin for StreamDock devices that displays real-time system performance metrics, including CPU, memory, disk, GPU usage rates, as well as network speed and temperature.

## Features

- **CPU Usage Rate Monitoring** - Real-time display of CPU usage percentage
- **Memory Usage Rate Monitoring** - Display current memory usage
- **Disk Usage Rate Monitoring** - Monitor disk space usage
- **GPU Usage Rate Monitoring** - Display GPU usage percentage
- **Network Speed Monitoring** - Display upload and download speeds (KB/s)
- **CPU Temperature Monitoring** - Display current CPU temperature
- **GPU Temperature Monitoring** - Display current GPU temperature
- **Multi-language Support** - Supports Chinese, English, German, Japanese, Portuguese, and Russian
- **Threshold Settings** - Customizable low and high thresholds for color change indicators

## System Requirements

- **Operating System**: macOS 10.11 or higher
- **StreamDock Software**: Version 2.9 or higher
- **Development Environment**: CMake 3.10 or higher, C++17

## Installation Instructions

1. Download the plugin package `com.mirabox.performancemonitor.mac.sdPlugin.zip`
2. Import the plugin in StreamDock software
3. Restart StreamDock software
4. Find the "Performance Monitor" category in the action panel

## Build Instructions

If you want to build this plugin from source code, please follow these steps:

### Prerequisites

- CMake 3.10 or higher
- C++17 compatible compiler
- macOS development environment (Xcode command line tools)

### Build Steps

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd performanceMonitorButMac
   ```

2. Create build directory
   ```bash
   mkdir build
   cd build
   ```

3. Run CMake
   ```bash
   cmake ..
   ```

4. Build the project
   ```bash
   make
   ```

After building, you will find the `performanceMonitor` executable in the build directory.

## Project Structure

```
performanceMonitorButMac/
├── CMakeLists.txt                    # CMake build configuration
├── main.cpp                         # Main program entry
├── performanceHelper.h/.cpp         # Performance data acquisition helper class
├── cpuUsageRateAction.h/.cpp        # CPU usage rate action class
├── imageHelper.h/.cpp              # Image processing helper class
├── HSDExamplePlugin.h/.cpp         # Plugin main class
├── com.mirabox.performancemonitor.mac.sdPlugin/  # Plugin package directory
│   ├── manifest.json               # Plugin manifest file
│   ├── [language].json             # Multi-language support files
│   ├── images/                     # Icon resources
│   └── PropertyInspector/          # Property inspector files
└── StreamDockCPPSDK/               # StreamDock C++ SDK
```

## Usage Instructions

1. Drag the performance monitor action to a key on your StreamDock device
2. Click the settings icon in the upper right corner of the key to open the property inspector
3. Set low and high thresholds as needed
   - Low threshold: Normal color is displayed when performance指标 is below this value
   - High threshold: Warning color is displayed when performance指标 is above this value
4. Save settings

## Multi-language Support

The plugin supports the following languages:

- Chinese (zh_CN)
- English (en)
- German (de)
- Japanese (ja)
- Portuguese (pt)
- Russian (ru)

The language will automatically switch according to the StreamDock software language setting.

## Technical Implementation

### Performance Data Acquisition

The plugin uses system APIs to obtain performance data:

- **CPU Usage**: Obtains CPU load information through `host_statistics`
- **Memory Usage**: Obtains virtual memory statistics through `host_statistics64`
- **Disk Usage**: Obtains file system statistics through `statfs`
- **Network Speed**: Obtains network interface statistics through `sysctl`
- **GPU Usage and Temperature**: Obtained using IOKit framework (simplified implementation)

### Caching Mechanism

To reduce system call overhead, the plugin implements a caching mechanism:

- CPU, memory, and disk data are updated every 500ms
- Network data is updated every 2 seconds
- GPU and temperature data are updated every 3 seconds

### Plugin Architecture

The plugin is developed based on the StreamDock C++ SDK, with main components including:

- `HSDExamplePlugin`: Plugin main class that manages all action instances
- `cpuUsageRateAction`: Action base class that handles key events and settings
- `performanceHelper`: Performance data acquisition helper class
- `imageHelper`: Image processing helper class

## Developer

- **Author**: icloudwar (JKWTCN)
- **Email**: jkwtcn@icloud.com

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Welcome to submit issues and pull requests. If you want to contribute to the project, please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request

## Changelog

### v1.0 (2025-09-10)
- Initial release
- Support for CPU, memory, disk, GPU usage rate monitoring
- Support for network speed monitoring
- Support for CPU and GPU temperature monitoring
- Multi-language support
- Threshold settings support