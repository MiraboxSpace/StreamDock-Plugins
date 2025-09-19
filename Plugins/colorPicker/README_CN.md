# SDPlugins

为 Stream Deck 开发的插件，使用 C++ 和 Stream Deck SDK。

## 构建

此项目使用 CMake 进行构建。请确保已安装 CMake。

### 先决条件

- CMake 3.10 或更高版本
- C++ 编译器（macOS 上的 GCC）
- Stream Deck SDK 依赖项

### 兼容性

此程序只能在 macOS 上编译和运行（最低版本 10.11）。

### 构建步骤

1. 克隆仓库：

   ```bash
   git clone https://github.com/LiangJianJi/SDPlugins.git
   cd SDPlugins
   ```
2. 切换到所需分支：

   ```bash
   git checkout colorPicker 
   ```
3. 创建构建目录：

   ```bash
   mkdir build
   cd build
   ```
4. 使用 CMake 配置：

   ```bash
   cmake ..
   ```
5. 构建项目：

   ```bash
   make  # 或在 Windows 上使用 cmake --build .
   ```

## 使用

1. 打开 Stream Deck 软件。
2. 从插件添加新操作。
3. 根据需要配置操作。

有关具体使用说明，请参考相应分支中的插件文档。

## 贡献

- 为每个插件创建新分支。
- 将更新推送到相应分支。
- 遵循现有的代码风格和结构。

## 作者

icloudwar
