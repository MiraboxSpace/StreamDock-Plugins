//==============================================================================
/**
@file       PluginSettings.h

@brief      Data structure holding all persisted plugin settings (9 fields).
            Mirrors the hidden <input> elements in setup.html.
**/
//==============================================================================

#pragma once

#include <string>

struct PluginSettings {
    // Record stream (Base64 compressed — ignored for now without LZ-String)
    std::string clipboardInput;          // my_clipboard_input

    // Transient command from PI (START_RECORD / STOP_RECORD / "")
    std::string recordExeHelper;         // my_record_exe_helper

    // Playback options
    bool ignoreDelay    = false;         // my_delay_status_helper
    bool warpEnabled    = false;         // my_warp_status_helper
    bool softStartEnabled = false;       // my_softstart_status_helper
    bool audioEnabled   = false;         // my_audio_status_helper

    // Recording save key (default: F10)
    std::string recordKey = "F10";       // my_record_key

    // Loop count (0 = no repeat, -1 = infinite)
    int loopCount       = 0;            // my_loop

    // Typewriter delay in ms (0-100, step 5, default 10)
    int typewriterDelay = 10;           // my_typewriter

    /// Parse a boolean from a settings value.
    /// The PI stores booleans as strings "true"/"false" in hidden <input> elements.
    static bool parseBool(const std::string& val) {
        return val == "true";
    }

    /// Parse an integer from a settings value (could be string or number).
    static int parseInt(const std::string& val, int defaultVal = 0) {
        try {
            return std::stoi(val);
        } catch (...) {
            return defaultVal;
        }
    }
};
