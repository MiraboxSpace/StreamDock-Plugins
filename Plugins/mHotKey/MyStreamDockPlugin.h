//==============================================================================
/**
@file       MyStreamDockPlugin.h

@brief      CPU plugin
**/
//==============================================================================

//#ifndef __INCLUDE__
//#define __INCLUDE__
//#include <Windows.h>
//#endif // !1
#pragma once
//#include <Windows.h>
#include "StreamDockCPPSDK/StreamDockSDK/HSDBasePlugin.h"

#include "StreamDockCPPSDK/StreamDockSDK/HSDConnectionManager.h"
#include "StreamDockCPPSDK/StreamDockSDK/HSDLogger.h"
#include <windows.h>
#include <mutex>

#include "../StreamDockCPPSDK/StreamDockSDK/NlohmannJSONUtils.h"
#include <cstdio>

using json = nlohmann::json;

class CallBackTimer;
class new_operator;


class MyStreamDockPlugin : public HSDBasePlugin
{
public:
	MyStreamDockPlugin();
	virtual ~MyStreamDockPlugin();

	void KeyDownForAction(const std::string& inAction, const std::string& inContext, const json& inPayload, const std::string& inDeviceID) override;
	void KeyUpForAction(const std::string& inAction, const std::string& inContext, const json& inPayload, const std::string& inDeviceID) override;

	void WillAppearForAction(const std::string& inAction, const std::string& inContext, const json& inPayload, const std::string& inDeviceID) override;
	void WillDisappearForAction(const std::string& inAction, const std::string& inContext, const json& inPayload, const std::string& inDeviceID) override;

	void DeviceDidConnect(const std::string& inDeviceID, const json& inDeviceInfo) override;
	void DeviceDidDisconnect(const std::string& inDeviceID) override;

	void SendToPlugin(const std::string& inAction, const std::string& inContext, const json& inPayload, const std::string& inDeviceID) override;

	void TitleParametersDidChange(const std::string& inAction, const std::string& inContext, const nlohmann::json& inPayload, const std::string& inDeviceID) override;

	void PropertyInspectorDidAppear(const std::string& inAction, const std::string& inContext, const nlohmann::json& inPayload, const std::string& inDeviceID) override;

	void PropertyInspectorDidDisappear(const std::string& inAction, const std::string& inContext, const nlohmann::json& inPayload, const std::string& inDeviceID) override;

	void DidReceiveSettings(
		const std::string& inAction,
		const std::string& inContext,
		const nlohmann::json& inPayload,
		const std::string& inDeviceID) override;

	static LRESULT CALLBACK LowLevelMouseProc(
		_In_ int nCode,		// 规定钩子如何处理消息，小于 0 则直接 CallNextHookEx
		_In_ WPARAM wParam,	// 消息类型
		_In_ LPARAM lParam	// 指向某个结构体的指针，这里是 KBDLLHOOKSTRUCT（低级鼠标输入事件）
	);

	static LRESULT CALLBACK LowLevelKeyboardProc(
		_In_ int nCode,		// 规定钩子如何处理消息，小于 0 则直接 CallNextHookEx
		_In_ WPARAM wParam,	// 消息类型
		_In_ LPARAM lParam	// 指向某个结构体的指针，这里是 KBDLLHOOKSTRUCT（低级键盘输入事件）
	);

	bool Is_Exit;

	bool Is_All_Stop_Record = true;
	bool Is_Hook_Stop_Thread_Running = false;

	int Last_KeyValue = 0;

	std::map<std::string, int>Key_Value_Map;

private:
	void UpdateTimer();
	
	//  代码重构过  Old 开头的函数 已被 New开头的 替代
	//  函数 作用  函数名就详细对应了

	void Old_SendInput_Event(new_operator*);
	void New_SendInput_Event(new_operator*);

	void Check_KeyDwon();
	void Delay_Close_Hook();

	void Restore_Log();

	void Old_Restore_Empty_Log(new_operator*);
	void New_Restore_Empty_Log(new_operator*);

	void Old_Get_Data_From_Local_Config(new_operator* This_Operator);
	void Old_Send_New_Config_List_To_PropertyInspector(new_operator* This_Operator);

	void New_Get_Data_From_Local_Config(new_operator* This_Operator);
	void New_Send_New_Config_List_To_PropertyInspector(new_operator* This_Operator);

	void Save_Data_To_Local_File(new_operator*);

	void Get_Config_Data_From_PropertyInspector_TextArea(new_operator*, std::string&);

	void Create_New_File(std::string File_Name_UTF8);

private:

	std::mutex mActionEventMutex;
	std::mutex mVisibleContextsMutex;
	//std::mutex ReplayMutex;

	std::list<new_operator*> mVisibleContexts;
	new_operator* Current_Operator;
	new_operator* Last_Operator;

	CallBackTimer* mTimer;
	//CallBackTimer* m_SendInput_Event_Timer;
	CallBackTimer* m_CloseHook;
};
#include "StreamDockCPPSDK/StreamDockSDK/HSDLogger.h"
class new_operator
{
public:
	new_operator() = default;
	new_operator(const std::string&, const std::string&);
	new_operator(const new_operator&);
	~new_operator();
	bool operator<(const new_operator NewOperator)const
	{
		return this->uuid < NewOperator.uuid;
	}
	bool operator=(const new_operator NewOperator)const
	{
		return this->uuid == NewOperator.uuid && this->context == NewOperator.context;
	}
	std::string uuid;
	std::string context;
	//std::map<std::string, int>map;
	bool start_recording = false;
	bool Set_RecordKey = false;
	int Last_KeyValue = 0;
	

	int Start_Record_KeyValue = -1;
	unsigned char Start_Record_status_changed = 0; //热键录制状态 是否改变过
	unsigned long Last_Key_Time;
	unsigned long Start_Time;

	std::vector<int>Key_Time_Log_Vector;
	std::vector<int>Key_Value_Log_Vector;
	std::vector<std::pair<int, int>>Key_Position_Vector;

	std::vector<unsigned int>Key_Press_Data_Vector;  //Press = true = 1  Release = false = 0

	int Vector_Size = -1;
	int Positon_Vector_Size = 0;

	//std::vector<int>::iterator* Key_Time_Log_Vector_Iterator;
	//std::vector<int>::iterator* Key_Value_Log_Vector_Iterator;
	//std::vector<std::pair<int, int>>::iterator* Key_Position_Vector_Iterator;

	bool Is_Down[256] = { false };
	bool Is_Down_Log[256] = { false };

	//std::string& Get_Name();
	inline static std::vector<std::string>Record_Config_Names_Vector;
	std::string Current_Name;

	bool Is_First_Time_Click = true;

	std::chrono::steady_clock::time_point StreamDock_Start_Time;
	std::chrono::steady_clock::time_point StreamDock_End_Time;
	std::chrono::milliseconds StreamDock_Duration_Time;

	bool Is_Delete_Delay = false;

	CallBackTimer* My_Recording_Change_Image = nullptr;
	CallBackTimer* m_SendInput_Event_Timer = nullptr;

	bool Is_Show_Still_Press = false;
	bool Is_Show_Mouse_track = false;

	bool Already_Record = false;

	bool Is_Action_New = false;

	bool Control_Thread_Quit;

	bool Is_Relative_coordinates = false;

	void print_fields() const {
		HSDLogger::LogMessage("uuid", uuid);
		HSDLogger::LogMessage("context", context);  // 假设 context 已经是 std::string 类型
		HSDLogger::LogMessage("start_recording", std::to_string(start_recording));
		HSDLogger::LogMessage("Set_RecordKey", std::to_string(Set_RecordKey));
		HSDLogger::LogMessage("Last_KeyValue", std::to_string(Last_KeyValue));
		HSDLogger::LogMessage("Start_Record_KeyValue", std::to_string(Start_Record_KeyValue));
		HSDLogger::LogMessage("Start_Record_status_changed", std::to_string((int)Start_Record_status_changed));
		HSDLogger::LogMessage("Last_Key_Time", std::to_string(Last_Key_Time));
		HSDLogger::LogMessage("Start_Time", std::to_string(Start_Time));

		HSDLogger::LogMessage("Key_Time_Log_Vector size", std::to_string(Key_Time_Log_Vector.size()));
		HSDLogger::LogMessage("Key_Value_Log_Vector size", std::to_string(Key_Value_Log_Vector.size()));
		HSDLogger::LogMessage("Key_Position_Vector size", std::to_string(Key_Position_Vector.size()));
		HSDLogger::LogMessage("Key_Press_Data_Vector size", std::to_string(Key_Press_Data_Vector.size()));

		HSDLogger::LogMessage("Vector_Size", std::to_string(Vector_Size));
		HSDLogger::LogMessage("Positon_Vector_Size", std::to_string(Positon_Vector_Size));

		HSDLogger::LogMessage("Is_First_Time_Click", std::to_string(Is_First_Time_Click));

		HSDLogger::LogMessage("StreamDock_Start_Time", std::to_string(StreamDock_Start_Time.time_since_epoch().count()));
		HSDLogger::LogMessage("StreamDock_End_Time", std::to_string(StreamDock_End_Time.time_since_epoch().count()));
		HSDLogger::LogMessage("StreamDock_Duration_Time", std::to_string(StreamDock_Duration_Time.count()));

		HSDLogger::LogMessage("Is_Delete_Delay", std::to_string(Is_Delete_Delay));

		HSDLogger::LogMessage("Is_Show_Still_Press", std::to_string(Is_Show_Still_Press));
		HSDLogger::LogMessage("Is_Show_Mouse_track", std::to_string(Is_Show_Mouse_track));

		HSDLogger::LogMessage("Already_Record", std::to_string(Already_Record));
		HSDLogger::LogMessage("Is_Action_New", std::to_string(Is_Action_New));

		HSDLogger::LogMessage("Control_Thread_Quit", std::to_string(Control_Thread_Quit));
		HSDLogger::LogMessage("Is_Relative_coordinates", std::to_string(Is_Relative_coordinates));
	}


private:

	//static std::vector<std::string>Record_Names;

};

//屏幕整体分辨率
void get_screen_Dpi(int* cx, int* cy);

//屏幕整体尺寸
void get_screen_size(int* cx, int* cy);



//#define WM_MOUSEMOVE               0x0200    260
//#define WM_LBUTTONDOWN             0x0201    261
//#define WM_LBUTTONUP               0x0202    262
//#define WM_LBUTTONDBLCLK           0x0203    263
//#define WM_RBUTTONDOWN             0x0204    264
//#define WM_RBUTTONUP               0x0205    265
//#define WM_RBUTTONDBLCLK           0x0206    266
//#define WM_MBUTTONDOWN             0x0207    267
//#define WM_MBUTTONUP               0x0208    268
//#define WM_MBUTTONDBLCLK           0x0209    269
//#define WM_MOUSEWHEEL              0x020A    270
//#define WM_XBUTTONDOWN             0x020B    271
//#define WM_XBUTTONUP               0x020C    272
//#define WM_XBUTTONDBLCLK           0x020D    273
//#define WM_MOUSEHWHEEL             0x020E    274

//LRESULT CALLBACK LowLevelKeyboardProc(
//	_In_ int nCode,		// 规定钩子如何处理消息，小于 0 则直接 CallNextHookEx
//	_In_ WPARAM wParam,	// 消息类型
//	_In_ LPARAM lParam	// 指向某个结构体的指针，这里是 KBDLLHOOKSTRUCT（低级键盘输入事件）
//);

