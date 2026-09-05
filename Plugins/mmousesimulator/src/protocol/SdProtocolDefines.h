//==============================================================================
/**
@file       SdProtocolDefines.h

@brief      JSON key constants for StreamDeck WebSocket communication protocol.
            Ported from DEMO_CPPSDK's HSDSDKDefines.h.

@copyright  Adapted from Corsair Memory, Inc. (MIT License)
**/
//==============================================================================

#pragma once

//
// Common JSON keys
//

#define kSDCommonAction     "action"
#define kSDCommonEvent      "event"
#define kSDCommonContext    "context"
#define kSDCommonPayload    "payload"
#define kSDCommonDevice     "device"
#define kSDCommonDeviceInfo "deviceInfo"

//
// Events (host → plugin)
//

#define kSDEventKeyDown                   "keyDown"
#define kSDEventKeyUp                     "keyUp"
#define kSDEventWillAppear                "willAppear"
#define kSDEventWillDisappear             "willDisappear"
#define kSDEventDeviceDidConnect          "deviceDidConnect"
#define kSDEventDeviceDidDisconnect       "deviceDidDisconnect"
#define kSDEventApplicationDidLaunch      "applicationDidLaunch"
#define kSDEventApplicationDidTerminate   "applicationDidTerminate"
#define kSDEventSystemDidWakeUp           "systemDidWakeUp"
#define kSDEventTitleParametersDidChange  "titleParametersDidChange"
#define kSDEventDidReceiveSettings        "didReceiveSettings"
#define kSDEventDidReceiveGlobalSettings  "didReceiveGlobalSettings"
#define kSDEventPropertyInspectorDidAppear    "propertyInspectorDidAppear"
#define kSDEventPropertyInspectorDidDisappear "propertyInspectorDidDisappear"
#define kSDEventDialRotate                "dialRotate"
#define kSDEventDialDown                  "dialDown"
#define kSDEventDialUp                    "dialUp"
#define kSDEventTouchTap                  "touchTap"
#define kSDEventSendToPlugin              "sendToPlugin"

//
// Commands (plugin → host)
//

#define kSDCommandSetTitle              "setTitle"
#define kSDCommandSetImage              "setImage"
#define kSDCommandShowAlert             "showAlert"
#define kSDCommandShowOk                "showOk"
#define kSDCommandGetSettings           "getSettings"
#define kSDCommandSetSettings           "setSettings"
#define kSDCommandGetGlobalSettings     "getGlobalSettings"
#define kSDCommandSetGlobalSettings     "setGlobalSettings"
#define kSDCommandSetState              "setState"
#define kSDCommandSwitchToProfile       "switchToProfile"
#define kSDCommandSendToPropertyInspector "sendToPropertyInspector"
#define kSDCommandOpenUrl               "openUrl"
#define kSDCommandLogMessage            "logMessage"
#define kSDCommandSetFeedback           "setFeedback"

//
// Payload keys
//

#define kSDPayloadSettings          "settings"
#define kSDPayloadCoordinates       "coordinates"
#define kSDPayloadState             "state"
#define kSDPayloadUserDesiredState  "userDesiredState"
#define kSDPayloadTitle             "title"
#define kSDPayloadTitleParameters   "titleParameters"
#define kSDPayloadImage             "image"
#define kSDPayloadUrl               "url"
#define kSDPayloadTarget            "target"
#define kSDPayloadProfile           "profile"
#define kSDPayloadApplication       "application"
#define kSDPayloadIsInMultiAction   "isInMultiAction"
#define kSDPayloadMessage           "message"

#define kSDPayloadCoordinatesColumn "column"
#define kSDPayloadCoordinatesRow    "row"

//
// Device Info keys
//

#define kSDDeviceInfoID      "id"
#define kSDDeviceInfoType    "type"
#define kSDDeviceInfoSize    "size"
#define kSDDeviceInfoName    "name"
#define kSDDeviceInfoSizeColumns "columns"
#define kSDDeviceInfoSizeRows    "rows"

//
// Title Parameters keys
//

#define kSDTitleParametersShowTitle      "showTitle"
#define kSDTitleParametersTitleColor     "titleColor"
#define kSDTitleParametersTitleAlignment "titleAlignment"
#define kSDTitleParametersFontFamily     "fontFamily"
#define kSDTitleParametersFontSize       "fontSize"
#define kSDTitleParametersCustomFontSize "customFontSize"
#define kSDTitleParametersFontStyle      "fontStyle"
#define kSDTitleParametersFontUnderline  "fontUnderline"

//
// Connection
//

#define kSDConnectSocketFunction    "connectElgatoStreamDeckSocket"
#define kSDRegisterPlugin           "registerPlugin"
#define kSDRegisterPropertyInspector "registerPropertyInspector"
#define kSDPortParameter            "-port"
#define kSDPluginUUIDParameter      "-pluginUUID"
#define kSDRegisterEventParameter   "-registerEvent"
#define kSDInfoParameter            "-info"
#define kSDRegisterUUID             "uuid"

#define kSDApplicationInfo          "application"
#define kSDPluginInfo               "plugin"
#define kSDDevicesInfo              "devices"
#define kSDColorsInfo               "colors"
#define kSDDevicePixelRatio         "devicePixelRatio"

#define kSDApplicationInfoVersion   "version"
#define kSDApplicationInfoLanguage  "language"
#define kSDApplicationInfoPlatform  "platform"

#define kSDApplicationInfoPlatformMac     "mac"
#define kSDApplicationInfoPlatformWindows "windows"

#define kSDColorsInfoHighlightColor              "highlightColor"
#define kSDColorsInfoMouseDownColor              "mouseDownColor"
#define kSDColorsInfoDisabledColor               "disabledColor"
#define kSDColorsInfoButtonPressedTextColor      "buttonPressedTextColor"
#define kSDColorsInfoButtonPressedBackgroundColor "buttonPressedBackgroundColor"
#define kSDColorsInfoButtonMouseOverBackgroundColor "buttonMouseOverBackgroundColor"
#define kSDColorsInfoButtonPressedBorderColor    "buttonPressedBorderColor"

//
// Enums
//

typedef int ESDSDKTarget;
enum {
    kESDSDKTarget_HardwareAndSoftware = 0,
    kESDSDKTarget_HardwareOnly        = 1,
    kESDSDKTarget_SoftwareOnly        = 2
};

typedef int ESDSDKDeviceType;
enum {
    kESDSDKDeviceType_StreamDeck      = 0,
    kESDSDKDeviceType_StreamDeckMini  = 1,
    kESDSDKDeviceType_StreamDeckXL    = 2,
    kESDSDKDeviceType_StreamDeckMobile = 3,
    kESDSDKDeviceType_CorsairGKeys    = 4,
    kESDSDKDeviceType_StreamDeckPedal = 5,
    kESDSDKDeviceType_CorsairVoyager  = 6,
    kESDSDKDeviceType_StreamDeckPlus  = 7
};
