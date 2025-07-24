# OBS Studio WebSocket 连接设置

此文档提供 OBS Studio WebSocket 服务器的设置指南，以支持远程控制。

---

## 中文指南

### OBS Studio WebSocket 连接设置

本指南将教您如何在 OBS Studio 中设置 WebSocket 连接，以便进行远程控制。

#### 步骤一：启用 WebSocket 服务器

1.  打开 **OBS Studio** 应用程序。
2.  点击 OBS Studio 顶部菜单栏的 **`工具 (Tools)`**。
3.  在下拉菜单中，选择 **`WebSocket 服务器设置 (WebSocket Server Settings)`**。
4.  在弹出的“WebSocket 服务器设置”窗口中，进行以下配置：
    * **勾选 `启用 WebSocket 服务器 (Enable WebSocket server)`**。
    * **记住 `服务器端口 (Server Port)`**（默认端口是 `4455`）。在外部程序连接时将需要这个端口号。
    * **勾选 `启用身份验证 (Enable Authentication)`**，并设置一个**密码 (Server Password)**。请务必牢记此密码，因为它将用于外部程序的身份验证。
5.  点击 **`确定 (OK)`** 保存您的设置。

您的 OBS Studio 现在已配置完毕，可以接受来自支持 WebSocket 协议的外部程序的连接。

---

## English Guide

### OBS Studio WebSocket Connection Setup

This guide will walk you through setting up the WebSocket connection in OBS Studio for remote control.

#### Step One: Enable WebSocket Server

1.  Open your **OBS Studio** application.
2.  Click on **`Tools`** in the top menu bar of OBS Studio.
3.  From the dropdown menu, select **`WebSocket Server Settings`**.
4.  In the "WebSocket Server Settings" dialog box that appears, configure the following:
    * **Check the box for `Enable WebSocket server`**.
    * **Note down the `Server Port`** (the default port is `4455`). This port number will be needed when external applications connect.
    * **Check the box for `Enable Authentication`** and set a strong **`Server Password`**. Make sure to remember this password, as it will be used for authentication by external applications.
5.  Click **`OK`** to save your settings.

Your OBS Studio is now configured and ready to accept connections from external applications that support the WebSocket protocol.