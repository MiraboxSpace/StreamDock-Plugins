//==============================================================================
/**
@file       RecordStreamParser.h

@brief      Parser for the mouse simulator record stream format.
            All functions are inline to avoid cross-TU linking issues
            with enum class types on MSVC.

            Format: #START#;INSTRUCTION;...;INSTRUCTION;#STOP#

            Instruction types:
              -1421x671   Mouse coordinate (can be negative for multi-monitor)
              M1P / M1R   Mouse button 1 (left) press/release
              M2P / M2R   Mouse button 2 (right)
              M3P / M3R   Mouse button 3 (middle)
              M4P / M4R   Mouse button 4 (xbutton1)
              M5P / M5R   Mouse button 5 (xbutton2)
              W<N>        Mouse wheel delta (positive=up, negative=down)
              KP<N>       Key press by virtual key code
              KR<N>       Key release by virtual key code
              D<N>        Delay in milliseconds
**/
//==============================================================================

#pragma once

#include <string>
#include <vector>
#include <sstream>
#include <regex>
#include <cctype>
#include <cstdint>

/// One instruction from a record stream
struct RecordInstruction {
    enum class Type : int {
        MOUSE_MOVE,
        MOUSE_BUTTON_PRESS,
        MOUSE_BUTTON_RELEASE,
        MOUSE_WHEEL,
        KEY_PRESS,
        KEY_RELEASE,
        DELAY,
        UNKNOWN
    };

    Type type = Type::UNKNOWN;
    int x = 0, y = 0;       // For MOUSE_MOVE
    int button = 0;         // For MOUSE_BUTTON: 1-5
    int wheelDelta = 0;     // For MOUSE_WHEEL: positive=up, negative=down
    uint16_t vkCode = 0;    // For KEY_PRESS/KEY_RELEASE
    int delayMs = 0;        // For DELAY

    /// Human-readable representation for logging
    std::string toString() const;
};

// ── RecordInstruction::toString ───────────────────────────────

inline std::string RecordInstruction::toString() const
{
    switch (type) {
    case Type::MOUSE_MOVE:
        return "MOVE(" + std::to_string(x) + "," + std::to_string(y) + ")";
    case Type::MOUSE_BUTTON_PRESS:
        return "BTN" + std::to_string(button) + "_DOWN";
    case Type::MOUSE_BUTTON_RELEASE:
        return "BTN" + std::to_string(button) + "_UP";
    case Type::MOUSE_WHEEL:
        return "WHEEL(" + std::to_string(wheelDelta) + ")";
    case Type::KEY_PRESS:
        return "KEY_DOWN(vk=" + std::to_string(vkCode) + ")";
    case Type::KEY_RELEASE:
        return "KEY_UP(vk=" + std::to_string(vkCode) + ")";
    case Type::DELAY:
        return "DELAY(" + std::to_string(delayMs) + "ms)";
    default:
        return "UNKNOWN";
    }
}

// ── RecordStreamParser (inline namespace-style class) ─────────

class RecordStreamParser
{
public:
    /// Parse a raw stream string into parsed instructions.
    static inline std::vector<RecordInstruction> parse(const std::string& rawStream)
    {
        std::vector<RecordInstruction> instructions;

        auto startPos = rawStream.find("#START#");
        auto stopPos  = rawStream.find("#STOP#");
        if (startPos == std::string::npos || stopPos == std::string::npos) {
            return instructions;
        }

        std::string content = rawStream.substr(
            startPos + 7, stopPos - startPos - 7);

        if (!content.empty() && content[0] == ';') {
            content = content.substr(1);
        }

        std::stringstream ss(content);
        std::string token;
        while (std::getline(ss, token, ';')) {
            token.erase(0, token.find_first_not_of(" \t\r\n"));
            token.erase(token.find_last_not_of(" \t\r\n") + 1);
            if (!token.empty()) {
                auto inst = parseToken(token);
                if (inst.type != RecordInstruction::Type::UNKNOWN) {
                    instructions.push_back(inst);
                }
            }
        }
        return instructions;
    }

    /// Check if a stream looks like a valid record stream.
    static inline bool isValidStream(const std::string& rawStream)
    {
        return rawStream.find("#START#") != std::string::npos
            && rawStream.find("#STOP#") != std::string::npos;
    }

private:
    static inline RecordInstruction parseToken(const std::string& token)
    {
        RecordInstruction inst;
        if (token.empty()) return inst;

        // Coordinate: -NNNNxNNNN
        {
            std::regex coordRe(R"(^(-?\d+)x(-?\d+)$)");
            std::smatch match;
            if (std::regex_match(token, match, coordRe)) {
                inst.type = RecordInstruction::Type::MOUSE_MOVE;
                inst.x = std::stoi(match[1].str());
                inst.y = std::stoi(match[2].str());
                return inst;
            }
        }

        // Mouse button: M<N>P or M<N>R
        {
            std::regex btnRe(R"(^M([1-5])([PR])$)");
            std::smatch match;
            if (std::regex_match(token, match, btnRe)) {
                inst.button = std::stoi(match[1].str());
                inst.type = (match[2].str() == "P")
                    ? RecordInstruction::Type::MOUSE_BUTTON_PRESS
                    : RecordInstruction::Type::MOUSE_BUTTON_RELEASE;
                return inst;
            }
        }

        // Mouse wheel: W<+/-N>
        {
            std::regex wheelRe(R"(^W([+-]?\d+)$)");
            std::smatch match;
            if (std::regex_match(token, match, wheelRe)) {
                inst.type = RecordInstruction::Type::MOUSE_WHEEL;
                inst.wheelDelta = std::stoi(match[1].str());
                return inst;
            }
        }

        // Key press: KP<vkcode>
        {
            std::regex keyPressRe(R"(^KP(\d+)$)");
            std::smatch match;
            if (std::regex_match(token, match, keyPressRe)) {
                inst.type = RecordInstruction::Type::KEY_PRESS;
                inst.vkCode = static_cast<uint16_t>(std::stoi(match[1].str()));
                return inst;
            }
        }

        // Key release: KR<vkcode>
        {
            std::regex keyReleaseRe(R"(^KR(\d+)$)");
            std::smatch match;
            if (std::regex_match(token, match, keyReleaseRe)) {
                inst.type = RecordInstruction::Type::KEY_RELEASE;
                inst.vkCode = static_cast<uint16_t>(std::stoi(match[1].str()));
                return inst;
            }
        }

        // Delay: D<N>
        {
            std::regex delayRe(R"(^D(\d+)$)");
            std::smatch match;
            if (std::regex_match(token, match, delayRe)) {
                inst.type = RecordInstruction::Type::DELAY;
                inst.delayMs = std::stoi(match[1].str());
                return inst;
            }
        }

        return inst;
    }
};
