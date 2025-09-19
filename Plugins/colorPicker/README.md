# SDPlugins

[English](README.md) |  [中文](README_CN.md)

A plugin for Stream Dock, developed in C++ using the Stream Dock SDK.

## Building

This project uses CMake for building. Ensure you have CMake installed.

### Prerequisites

- CMake 3.10 or higher
- C++ compiler (GCC on macOS)
- Stream Dock SDK dependencies

### Compatibility

This program can only be compiled and run on macOS (minimum version 10.11).

### Build Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/LiangJianJi/SDPlugins.git
   cd SDPlugins
   ```

2. Switch to the desired branch:

   ```bash
   git checkout colorPicker  
   ```

3. Create a build directory:

   ```bash
   mkdir build
   cd build
   ```

4. Configure with CMake:

   ```bash
   cmake ..
   ```

5. Build the project:

   ```bash
   make  # or cmake --build . on Windows
   ```

## Usage

1. Open Stream Dock software.
2. Add a new action from the plugin.
3. Configure the action as needed.

For specific usage instructions, refer to the plugin's documentation in its respective branch.

## Contributing

- Create a new branch for each plugin.
- Push updates to the corresponding branch.
- Follow the existing code style and structure.

## Author

icloudwar
