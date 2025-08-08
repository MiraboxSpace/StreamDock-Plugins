#include "common.h"


const std::string base64_chars =
"ABCDEFGHIJKLMNOPQRSTUVWXYZ"
"abcdefghijklmnopqrstuvwxyz"
"0123456789+/";
std::string EncodeFileToBase64(const std::string& filePath)
{
	auto data = read_file_binary(filePath);
	return base64_encode(data);
}

std::vector<unsigned char> read_file_binary(const std::string& path)
{
	std::ifstream file(path, std::ios::binary);
	if (!file) {
		throw std::runtime_error("can not open: " + path);
	}
	return std::vector<unsigned char>(std::istreambuf_iterator<char>(file), {});
}

std::string base64_encode(const std::vector<unsigned char>& bytes_to_encode)
{
	std::string ret;
	int i = 0;
	unsigned char char_array_3[3], char_array_4[4];
	auto bytes = bytes_to_encode.data();
	size_t in_len = bytes_to_encode.size();
	while (in_len--) {
		char_array_3[i++] = *(bytes++);
		if (i == 3) {
			char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
			char_array_4[1] = ((char_array_3[0] & 0x03) << 4) +
				((char_array_3[1] & 0xf0) >> 4);
			char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) +
				((char_array_3[2] & 0xc0) >> 6);
			char_array_4[3] = char_array_3[2] & 0x3f;
			for (i = 0; i < 4; i++)
				ret += base64_chars[char_array_4[i]];
			i = 0;
		}
	}
	if (i) {
		for (int j = i; j < 3; j++)
			char_array_3[j] = '\0';
		char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
		char_array_4[1] = ((char_array_3[0] & 0x03) << 4) +
			((char_array_3[1] & 0xf0) >> 4);
		char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) +
			((char_array_3[2] & 0xc0) >> 6);
		char_array_4[3] = char_array_3[2] & 0x3f;
		for (int j = 0; j < i + 1; j++)
			ret += base64_chars[char_array_4[j]];

		while (i++ < 3)
			ret += '=';
	}
	return ret;
}