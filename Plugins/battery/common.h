#pragma once
// 设备信息结构体
#include <string>
#include <iostream>
#include <fstream>  // 主要头文件，提供 ifstream 类
#include <ios> 
#include <vector>
struct DeviceInfo {
    std::string name;    //设备名称
};
std::string EncodeFileToBase64(const std::string& filePath);
std::vector<unsigned char> read_file_binary(const std::string& path);
std::string base64_encode(const std::vector<unsigned char>& bytes_to_encode);
