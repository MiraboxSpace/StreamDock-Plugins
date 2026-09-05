//==============================================================================
/**
@file       MyStreamDockPlugin.cpp

@brief      System Monitor plugin
**/
//==============================================================================
#pragma once

#include "MyStreamDockPlugin.h"
#include <atomic>
#include <stdlib.h>

#ifdef __APPLE__
//#include <macOS/CpuUsageHelper.h>
#else
//#include <Windows/CpuUsageHelper.h>


//#include <Windows.h>
//#include <tchar.h>
//#include <Psapi.h>
//#include <TlHelp32.h>
#include <fstream>
#include <iostream>

HHOOK keyboardHook = 0;		// 钩子句柄
HHOOK mouseHook = 0;

using namespace std;

MyStreamDockPlugin* Global_MyStreamDockPlugin;

class CallBackTimer;
#endif

//std::vector<int>Global_Vector;
//bool Is_Click[600];

void UTF8ToGBK(const char* cUtf8, char* cGbk);
void GBKTOUTF8(string& strGBK);//转码 GBK编码转成UTF8编码
std::string base64_encode(const char* bytes_to_encode, unsigned int in_len);

class CallBackTimer
{
public:
	CallBackTimer() :_execute(false) { }

	~CallBackTimer()
	{
		if (_execute.load(std::memory_order_acquire))
		{
			stop();
		};
	}

	void stop()
	{
		_execute.store(false, std::memory_order_release);
		if (_thd.joinable())
			_thd.join();
	}

	void start(int interval, std::function<void(void)> func)
	{
		if (_execute.load(std::memory_order_acquire))
		{
			stop();
		};
		_execute.store(true, std::memory_order_release);
		_thd = std::thread([this, interval, func]()
			{
				while (_execute.load(std::memory_order_acquire))
				{
					func();
					std::this_thread::sleep_for(std::chrono::milliseconds(interval));
				}
			});
	}

	void start(std::function<void(void)> func)
	{
		//if (_execute.load(std::memory_order_acquire))
		//{
		//	stop();
		//};
		stop();
		_execute.store(true, std::memory_order_release);
		_thd = std::thread([this, func]()
			{
				while (_execute.load(std::memory_order_acquire))
				{

					func();
					_execute.store(false, std::memory_order_relaxed);
				}
			});
	}

	void start(std::function<void(void)> func, int interval)
	{
		//if (_execute.load(std::memory_order_acquire))
		//{
		//	stop();
		//};
		stop();
		_execute.store(true, std::memory_order_release);
		_thd = std::thread([this, func, interval]()
			{
				while (_execute.load(std::memory_order_relaxed))
				{
					std::this_thread::sleep_for(std::chrono::milliseconds(interval));
					func();
					_execute.store(false, std::memory_order_relaxed);
				}
			});
	}

	bool is_running() const noexcept
	{
		return (_execute.load(std::memory_order_relaxed) && _thd.joinable());
	}

private:
	std::atomic<bool> _execute;
	std::thread _thd;
};


LRESULT CALLBACK MyStreamDockPlugin::LowLevelMouseProc(
	_In_ int nCode,		// 规定钩子如何处理消息，小于 0 则直接 CallNextHookEx
	_In_ WPARAM wParam,	// 消息类型
	_In_ LPARAM lParam	// 指向某个结构体的指针，这里是 KBDLLHOOKSTRUCT（低级键盘输入事件）
) {
	// 鼠标事件值
	//WM_MOUSEMOVE;
	MSLLHOOKSTRUCT* mouse = (MSLLHOOKSTRUCT*)lParam;

	if (Global_MyStreamDockPlugin->Current_Operator != nullptr && Global_MyStreamDockPlugin->Current_Operator->uuid == "com.hotspot.stream.Set_HotKey")
	{
		json Mouse_Event_Json;
		Mouse_Event_Json["Mouse_Current_Value"] = wParam;
		Mouse_Event_Json["Mouse_Current_Position"][0] = mouse->pt.x;
		Mouse_Event_Json["Mouse_Current_Position"][1] = mouse->pt.y;
		Global_MyStreamDockPlugin->mConnectionManager->SendToPropertyInspector(
			Global_MyStreamDockPlugin->Current_Operator->uuid,
			Global_MyStreamDockPlugin->Current_Operator->context,
			Mouse_Event_Json
		);
		return CallNextHookEx(NULL, nCode, wParam, lParam);
	}

	////_itoa_s(int,char,16);
	//char Value_16_x[6];
	//char Value_16_y[6];
	//itoa(mouse->pt.x, Value_16_x, 16);
	//itoa(mouse->pt.y, Value_16_y, 16);
	//json Key_Value;
	//Key_Value["Value"] = /*"鼠标事件:" +*/ std::to_string(wParam);
		//+"/x坐标:\n" + (std::string)Value_16_x 
		//+"/y坐标:\n" + (std::string)Value_16_y;

	json Key_Value;
	//Key_Value["MouseValue"] =std::to_string(wParam) + "/" + std::to_string(mouse->pt.x) + "/" + std::to_string(mouse->pt.y) + "/" + std::to_string(mouse->time);

	//Global_MyStreamDockPlugin->mActionEventMutex.lock(/*memory_order_acquire*/);

	//if (/*wParam != WM_MOUSEMOVE &&*/ wParam != 522) //512
	//{
	if (wParam != WM_MOUSEMOVE && wParam != WM_MOUSEWHEEL)
	{


		//Global_Vector.push_back(wParam);

		HSDLogger::LogMessage("MouseCode:", std::to_string(wParam) +
			"/" + std::to_string(mouse->pt.x) +
			"/" + std::to_string(mouse->pt.y) +
			"/" + std::to_string(mouse->time));

		// 1修改
		for (auto p : Global_MyStreamDockPlugin->mVisibleContexts)
		{
			if (
				p->start_recording
				//&& Global_MyStreamDockPlugin->Current_Operator != nullptr
				//&& Global_MyStreamDockPlugin->Current_Operator->Last_KeyValue != wParam
				&& (Global_MyStreamDockPlugin->Last_KeyValue != wParam || p->Is_Show_Still_Press)
				)
			{

				//if (p->uuid == "com.hotspot.stream.Record_Replay" && p->Key_Time_Log_Vector.empty())
				//{
				//	p->StreamDock_End_Time = std::chrono::steady_clock::now();
				//	p->StreamDock_Duration_Time = chrono::duration_cast<chrono::milliseconds>(p->StreamDock_End_Time - p->StreamDock_Start_Time);
				//	p->Key_Time_Log_Vector.push_back(p->StreamDock_Duration_Time.count());
				//}
				//else
				//	p->Key_Time_Log_Vector.push_back(ks->time - p->Last_Key_Time);
				//p->Last_Key_Time = ks->time;

				p->Key_Value_Log_Vector.push_back(wParam);
				if (p->uuid == "com.hotspot.stream.Record_Replay" /*&& p->Key_Time_Log_Vector.empty()*/ || p->uuid == "com.hotspot.stream.Record")
				{
					p->StreamDock_End_Time = std::chrono::steady_clock::now();
					p->StreamDock_Duration_Time = chrono::duration_cast<chrono::milliseconds>(p->StreamDock_End_Time - p->StreamDock_Start_Time);
					//p->Key_Time_Log_Vector.push_back(p->StreamDock_Duration_Time.count());
					//Key_Value["MouseValue"] =std::to_string(wParam) + "/" + std::to_string(mouse->pt.x) + "/" + std::to_string(mouse->pt.y) + "/" + "0" 
					//	+ "/" + std::to_string(p->Key_Time_Log_Vector[0]);

					if (wParam == 523 || wParam == 524)
					{
						p->Key_Press_Data_Vector.push_back(mouse->mouseData);
					}
					if (p->Key_Time_Log_Vector.size() == 0)
					{
						p->Key_Time_Log_Vector.push_back(p->StreamDock_Duration_Time.count());
						Key_Value["MouseValue"] = std::to_string(wParam) + "/" + std::to_string(mouse->pt.x) + "/" + std::to_string(mouse->pt.y)
							+ "/" + std::to_string(mouse->time)
							+ "/" + std::to_string(p->Key_Time_Log_Vector[0]);

					}

					else if (p->Key_Time_Log_Vector.size() != 0)
					{
						p->Key_Time_Log_Vector.push_back(mouse->time - p->Last_Key_Time);
						if (p->Is_Show_Still_Press)
							Key_Value["MouseValue"] = std::to_string(wParam) + "/" + std::to_string(mouse->pt.x) + "/" + std::to_string(mouse->pt.y)
							+ "/" + std::to_string(mouse->time) + "/" + std::to_string(11);
						else if (!p->Is_Show_Still_Press)
							Key_Value["MouseValue"] = std::to_string(wParam) + "/" + std::to_string(mouse->pt.x) + "/" + std::to_string(mouse->pt.y)
							+ "/" + std::to_string(mouse->time) + "/" + std::to_string(10);
					}


				}
				else
				{
					p->Key_Time_Log_Vector.push_back(mouse->time - p->Last_Key_Time);
					Key_Value["MouseValue"] = std::to_string(wParam) + "/" + std::to_string(mouse->pt.x) + "/" + std::to_string(mouse->pt.y) + "/" + std::to_string(mouse->time);

				}
				p->Last_Key_Time = mouse->time;
				std::pair<int, int>Mouse_Position(mouse->pt.x, mouse->pt.y);
				p->Key_Position_Vector.push_back(Mouse_Position);


			}
		}

		if (
			Global_MyStreamDockPlugin->Current_Operator != nullptr
			&& Global_MyStreamDockPlugin->Current_Operator->start_recording
			//&& Global_MyStreamDockPlugin->Current_Operator->Last_KeyValue != wParam
			&& (Global_MyStreamDockPlugin->Last_KeyValue != wParam || Global_MyStreamDockPlugin->Current_Operator->Is_Show_Still_Press)
			)
		{
			Global_MyStreamDockPlugin->mConnectionManager->SendToPropertyInspector(
				Global_MyStreamDockPlugin->Current_Operator->uuid,
				Global_MyStreamDockPlugin->Current_Operator->context,
				Key_Value);
		}
		//Sleep(30);

		if (
			//Global_MyStreamDockPlugin->Current_Operator != nullptr &&
			//wParam == Global_MyStreamDockPlugin->Current_Operator->Last_KeyValue + 1
			wParam == Global_MyStreamDockPlugin->Last_KeyValue + 1
			)
			//Global_MyStreamDockPlugin->Current_Operator->Last_KeyValue = 0;
			Global_MyStreamDockPlugin->Last_KeyValue = 0;
		else if (
			//Global_MyStreamDockPlugin->Current_Operator != nullptr &&
			//Global_MyStreamDockPlugin->Current_Operator->Last_KeyValue != wParam
			Global_MyStreamDockPlugin->Last_KeyValue != wParam
			)
			//Global_MyStreamDockPlugin->Current_Operator->Last_KeyValue = wParam;
			Global_MyStreamDockPlugin->Last_KeyValue = wParam;

	}
	else if (wParam == WM_MOUSEMOVE)
	{


		//Global_Vector.push_back(wParam);

		//HSDLogger::LogMessage("MouseCode:", std::to_string(wParam) +
		//	"/" + std::to_string(mouse->pt.x) +
		//	"/" + std::to_string(mouse->pt.y) +
		//	"/" + std::to_string(mouse->time));

		// 1修改
		for (auto p : Global_MyStreamDockPlugin->mVisibleContexts)
		{
			if (p->Is_Show_Mouse_track)
			{


				if (
					p->start_recording
					//&& Global_MyStreamDockPlugin->Current_Operator != nullptr
					//&& Global_MyStreamDockPlugin->Current_Operator->Last_KeyValue != wParam
					&& (Global_MyStreamDockPlugin->Last_KeyValue != wParam || p->Is_Show_Still_Press)
					)
				{

					//if (p->uuid == "com.hotspot.stream.Record_Replay" && p->Key_Time_Log_Vector.empty())
					//{
					//	p->StreamDock_End_Time = std::chrono::steady_clock::now();
					//	p->StreamDock_Duration_Time = chrono::duration_cast<chrono::milliseconds>(p->StreamDock_End_Time - p->StreamDock_Start_Time);
					//	p->Key_Time_Log_Vector.push_back(p->StreamDock_Duration_Time.count());
					//}
					//else
					//	p->Key_Time_Log_Vector.push_back(ks->time - p->Last_Key_Time);
					//p->Last_Key_Time = ks->time;


					p->Key_Value_Log_Vector.push_back(wParam);
					if (p->uuid == "com.hotspot.stream.Record_Replay" /*&& p->Key_Time_Log_Vector.empty()*/ || p->uuid == "com.hotspot.stream.Record")
					{
						p->StreamDock_End_Time = std::chrono::steady_clock::now();
						p->StreamDock_Duration_Time = chrono::duration_cast<chrono::milliseconds>(p->StreamDock_End_Time - p->StreamDock_Start_Time);
						//p->Key_Time_Log_Vector.push_back(p->StreamDock_Duration_Time.count());
						//Key_Value["MouseValue"] =std::to_string(wParam) + "/" + std::to_string(mouse->pt.x) + "/" + std::to_string(mouse->pt.y) + "/" + "0" 
						//	+ "/" + std::to_string(p->Key_Time_Log_Vector[0]);
						if (p->Key_Time_Log_Vector.size() == 0)
						{
							p->Key_Time_Log_Vector.push_back(p->StreamDock_Duration_Time.count());
							Key_Value["MouseValue"] = std::to_string(wParam) + "/" + std::to_string(mouse->pt.x) + "/" + std::to_string(mouse->pt.y)
								+ "/" + std::to_string(mouse->time)
								+ "/" + std::to_string(p->Key_Time_Log_Vector[0]);

						}

						else if (p->Key_Time_Log_Vector.size() != 0)
						{
							p->Key_Time_Log_Vector.push_back(mouse->time - p->Last_Key_Time);
							if (p->Is_Show_Still_Press)
								Key_Value["MouseValue"] = std::to_string(wParam) + "/" + std::to_string(mouse->pt.x) + "/" + std::to_string(mouse->pt.y)
								+ "/" + std::to_string(mouse->time) + "/" + std::to_string(11);
							else if (!p->Is_Show_Still_Press)
								Key_Value["MouseValue"] = std::to_string(wParam) + "/" + std::to_string(mouse->pt.x) + "/" + std::to_string(mouse->pt.y)
								+ "/" + std::to_string(mouse->time) + "/" + std::to_string(10);
						}


					}
					else
					{
						p->Key_Time_Log_Vector.push_back(mouse->time - p->Last_Key_Time);
						Key_Value["MouseValue"] = std::to_string(wParam) + "/" + std::to_string(mouse->pt.x) + "/" + std::to_string(mouse->pt.y) + "/" + std::to_string(mouse->time);

					}
					p->Last_Key_Time = mouse->time;
					std::pair<int, int>Mouse_Position(mouse->pt.x, mouse->pt.y);
					p->Key_Position_Vector.push_back(Mouse_Position);


				}

			}
			else
			{
				//return CallNextHookEx(NULL, nCode, wParam, lParam);
				continue;
			}

		}

		if (
			Global_MyStreamDockPlugin->Current_Operator != nullptr
			&& Global_MyStreamDockPlugin->Current_Operator->start_recording
			//&& Global_MyStreamDockPlugin->Current_Operator->Last_KeyValue != wParam
			&& (Global_MyStreamDockPlugin->Last_KeyValue != wParam || Global_MyStreamDockPlugin->Current_Operator->Is_Show_Still_Press)
			)
		{
			Global_MyStreamDockPlugin->mConnectionManager->SendToPropertyInspector(
				Global_MyStreamDockPlugin->Current_Operator->uuid,
				Global_MyStreamDockPlugin->Current_Operator->context,
				Key_Value);
		}
		//Sleep(30);

		return CallNextHookEx(NULL, nCode, wParam, lParam);

		//在此内情况下  以下语句疑似无效
		if (
			//Global_MyStreamDockPlugin->Current_Operator != nullptr &&
			//wParam == Global_MyStreamDockPlugin->Current_Operator->Last_KeyValue + 1
			wParam == Global_MyStreamDockPlugin->Last_KeyValue + 1
			)
			//Global_MyStreamDockPlugin->Current_Operator->Last_KeyValue = 0;
			Global_MyStreamDockPlugin->Last_KeyValue = 0;
		else if (
			//Global_MyStreamDockPlugin->Current_Operator != nullptr &&
			//Global_MyStreamDockPlugin->Current_Operator->Last_KeyValue != wParam
			Global_MyStreamDockPlugin->Last_KeyValue != wParam
			)
			//Global_MyStreamDockPlugin->Current_Operator->Last_KeyValue = wParam;
			Global_MyStreamDockPlugin->Last_KeyValue = wParam;

	}
	else if (wParam == WM_MOUSEWHEEL)
	{
		// 1修改
		for (auto p : Global_MyStreamDockPlugin->mVisibleContexts)
		{
			if (
				p->start_recording
				//&& Global_MyStreamDockPlugin->Current_Operator != nullptr
				//&& Global_MyStreamDockPlugin->Current_Operator->Last_KeyValue != wParam
				//&& (Global_MyStreamDockPlugin->Last_KeyValue != wParam || p->Is_Show_Still_Press)
				)
			{
				//7864320  向前滚动 0x78 0000    //4287102976  向后滚动 0xFF88 0000
				p->Key_Value_Log_Vector.push_back(wParam);
				if (p->uuid == "com.hotspot.stream.Record_Replay" /*&& p->Key_Time_Log_Vector.empty()*/ || p->uuid == "com.hotspot.stream.Record")
				{
					p->StreamDock_End_Time = std::chrono::steady_clock::now();
					p->StreamDock_Duration_Time = chrono::duration_cast<chrono::milliseconds>(p->StreamDock_End_Time - p->StreamDock_Start_Time);
					if (p->Key_Time_Log_Vector.size() == 0)
					{
						p->Key_Time_Log_Vector.push_back(p->StreamDock_Duration_Time.count());
						Key_Value["MouseValue"] = std::to_string(wParam) + "/" + std::to_string(mouse->pt.x) + "/" + std::to_string(mouse->pt.y)
							+ "/" + std::to_string(mouse->time)
							+ "/" + std::to_string(p->Key_Time_Log_Vector[0]);
					}
					else if (p->Key_Time_Log_Vector.size() != 0)
					{
						p->Key_Time_Log_Vector.push_back(mouse->time - p->Last_Key_Time);
						if (p->Is_Show_Still_Press)
							Key_Value["MouseValue"] = std::to_string(wParam) + "/" + std::to_string(mouse->pt.x) + "/" + std::to_string(mouse->pt.y)
							+ "/" + std::to_string(mouse->time) + "/" + std::to_string(11);
						else if (!p->Is_Show_Still_Press)
							Key_Value["MouseValue"] = std::to_string(wParam) + "/" + std::to_string(mouse->pt.x) + "/" + std::to_string(mouse->pt.y)
							+ "/" + std::to_string(mouse->time) + "/" + std::to_string(10);
					}

					if (mouse->mouseData == 0x780000)
						p->Key_Press_Data_Vector.push_back(0x780000);
					else if (mouse->mouseData == 0xFF880000)
						p->Key_Press_Data_Vector.push_back(0xFF880000);

				}
				else
				{
					p->Key_Time_Log_Vector.push_back(mouse->time - p->Last_Key_Time);
					Key_Value["MouseValue"] = std::to_string(wParam) + "/" + std::to_string(mouse->pt.x) + "/" + std::to_string(mouse->pt.y) + "/" + std::to_string(mouse->time);

				}
				p->Last_Key_Time = mouse->time;
				std::pair<int, int>Mouse_Position(mouse->pt.x, mouse->pt.y);
				p->Key_Position_Vector.push_back(Mouse_Position);

			}

		}

		if (
			Global_MyStreamDockPlugin->Current_Operator != nullptr
			&& Global_MyStreamDockPlugin->Current_Operator->start_recording
			//&& Global_MyStreamDockPlugin->Current_Operator->Last_KeyValue != wParam
			//&& (Global_MyStreamDockPlugin->Last_KeyValue != wParam || Global_MyStreamDockPlugin->Current_Operator->Is_Show_Still_Press)
			)
		{
			Global_MyStreamDockPlugin->mConnectionManager->SendToPropertyInspector(
				Global_MyStreamDockPlugin->Current_Operator->uuid,
				Global_MyStreamDockPlugin->Current_Operator->context,
				Key_Value);
		}
		//Global_MyStreamDockPlugin->Last_KeyValue = wParam;
		return CallNextHookEx(NULL, nCode, wParam, lParam);

	}

	//}
	//Global_MyStreamDockPlugin->mActionEventMutex.unlock();

	//return  1;
	// 将消息传递给钩子链中的下一个钩子
	return CallNextHookEx(NULL, nCode, wParam, lParam);

}

LRESULT CALLBACK MyStreamDockPlugin::LowLevelKeyboardProc(
	_In_ int nCode,		// 规定钩子如何处理消息，小于 0 则直接 CallNextHookEx
	_In_ WPARAM wParam,	// 消息类型
	_In_ LPARAM lParam	// 指向某个结构体的指针，这里是 KBDLLHOOKSTRUCT（低级键盘输入事件）
) {

	KBDLLHOOKSTRUCT* ks = (KBDLLHOOKSTRUCT*)lParam;		// 包含低级键盘输入事件信息
	/*
	typedef struct tagKBDLLHOOKSTRUCT {
		DWORD     vkCode;		// 按键代号
		DWORD     scanCode;		// 硬件扫描代号，同 vkCode 也可以作为按键的代号。
		DWORD     flags;		// 事件类型，一般按键按下为 0 抬起为 128。
		DWORD     time;			// 消息时间戳
		ULONG_PTR dwExtraInfo;	// 消息附加信息，一般为 0。
	}KBDLLHOOKSTRUCT,*LPKBDLLHOOKSTRUCT,*PKBDLLHOOKSTRUCT;
	*/
	HSDLogger::LogMessage("flags:", std::to_string(ks->flags));
	HSDLogger::LogMessage("vkCode:", std::to_string(ks->vkCode));
	HSDLogger::LogMessage("time:", std::to_string(ks->time));


	if (
		Global_MyStreamDockPlugin->Current_Operator != nullptr &&
		Global_MyStreamDockPlugin->Current_Operator->Set_RecordKey
		//&& Global_MyStreamDockPlugin->Current_Operator->uuid == "com.hotspot.stream.HotKey"
		)
	{

		if (ks->flags == 128 || ks->flags == 129 || ks->flags == 144)
		{
			Global_MyStreamDockPlugin->Current_Operator->Set_RecordKey = false;
			return 1;
		}
		json RecordKeyValue;
		RecordKeyValue["RecordKeyValue"] = std::to_string(ks->vkCode);
		//RecordKeyValue["RecordKeyValue"] = std::to_string(ks->flags) + "/" + std::to_string(ks->vkCode);

		Global_MyStreamDockPlugin->Current_Operator->Start_Record_KeyValue = ks->vkCode;
		Global_MyStreamDockPlugin->mConnectionManager->SendToPropertyInspector(
			Global_MyStreamDockPlugin->Current_Operator->uuid,
			Global_MyStreamDockPlugin->Current_Operator->context,
			RecordKeyValue);

		return 1;
	}

	//for (auto p : Global_MyStreamDockPlugin->mVisibleContexts)
	//{
	//	//嵌套

	//	if(p->start_recording && p->Start_Record_KeyValue == ks->vkCode)


	//}
	HSDLogger::LogMessage("KeyBoard_Event:", "1");

	if (Global_MyStreamDockPlugin->Current_Operator != nullptr)
		HSDLogger::LogMessage("Start_Record_status_changed:", std::to_string(Global_MyStreamDockPlugin->Current_Operator->Start_Record_status_changed));

	//明天得改 暂停部分
	if (
		Global_MyStreamDockPlugin->Current_Operator != nullptr &&
		Global_MyStreamDockPlugin->Current_Operator->Start_Record_KeyValue == ks->vkCode
		&& (ks->flags == 0 || ks->flags == 1 || ks->flags == 16)
		)
	{
		if (
			//Global_MyStreamDockPlugin->Current_Operator->Last_KeyValue != ks->vkCode
			//&& (Global_MyStreamDockPlugin->Last_KeyValue != wParam || Global_MyStreamDockPlugin->Current_Operator->Is_Show_Still_Press)
			(Global_MyStreamDockPlugin->Last_KeyValue != ks->vkCode || Global_MyStreamDockPlugin->Current_Operator->Is_Show_Still_Press)
			&& ++Global_MyStreamDockPlugin->Current_Operator->Start_Record_status_changed % 4 == 1
			&& !Global_MyStreamDockPlugin->Current_Operator->start_recording

			)
		{
			Global_MyStreamDockPlugin->Current_Operator->start_recording = true;
			Global_MyStreamDockPlugin->Current_Operator->Last_Key_Time = ks->time;
			Global_MyStreamDockPlugin->Current_Operator->Key_Position_Vector.clear();
			Global_MyStreamDockPlugin->Current_Operator->Key_Time_Log_Vector.clear();
			Global_MyStreamDockPlugin->Current_Operator->Key_Value_Log_Vector.clear();
			Global_MyStreamDockPlugin->Current_Operator->Key_Press_Data_Vector.clear();
			Global_MyStreamDockPlugin->Current_Operator->Start_Time = ks->time;

			Global_MyStreamDockPlugin->Current_Operator->Vector_Size = -1;

			for (int i = 0; i < 256; i++)
			{
				Global_MyStreamDockPlugin->Current_Operator->Is_Down[i] = false;
				Global_MyStreamDockPlugin->Current_Operator->Is_Down_Log[i] = false;
			}


			//if (Global_MyStreamDockPlugin->m_CloseHook->is_running())
			//	Global_MyStreamDockPlugin->m_CloseHook->stop();
		}
	}

	HSDLogger::LogMessage("KeyBoard_Event:", "2");
	//修改2
	for (auto p : Global_MyStreamDockPlugin->mVisibleContexts)
	{
		if (
			//Global_MyStreamDockPlugin->Current_Operator != nullptr &&
			p->start_recording
			&& p->Start_Record_KeyValue != ks->vkCode
			//&& ( ks->flags == 128 || ks->flags == 129 || Global_MyStreamDockPlugin->Current_Operator->Last_KeyValue != ks->vkCode )
			&& (ks->flags == 128 || ks->flags == 129 || ks->flags == 144 || Global_MyStreamDockPlugin->Last_KeyValue != ks->vkCode || p->Is_Show_Still_Press)
			)
		{
			//测试L-Alt失效  按下、弹起状态值 L-Alt 按下居然是 标志值 32  无大语了
			if ((ks->flags == 0 || ks->flags == 1 || ks->flags == 16 || ks->flags == 32) /*&& p->Is_Show_Still_Press*/)
				p->Key_Press_Data_Vector.push_back(1);
			//if ((ks->flags != 128 && ks->flags != 129 && ks->flags != 144) /*&& p->Is_Show_Still_Press*/)
			//	p->Key_Press_Data_Vector.push_back(ks->flags);
			else if ((ks->flags == 128 || ks->flags == 129 || ks->flags == 144 || ks->flags == 160) /*&& p->Is_Show_Still_Press*/)
			{
				p->Key_Press_Data_Vector.push_back(0);
				//p->Key_Press_Data_Vector.push_back(ks->flags);
			}
			else if (ks->flags < 128)
				p->Key_Press_Data_Vector.push_back(1);
			else if (ks->flags >= 128)
				p->Key_Press_Data_Vector.push_back(0);

			p->Key_Value_Log_Vector.push_back(ks->vkCode);
			if ((p->uuid == "com.hotspot.stream.Record_Replay" || p->uuid == "com.hotspot.stream.Record") && p->Key_Time_Log_Vector.empty())
			{
				p->StreamDock_End_Time = std::chrono::steady_clock::now();
				p->StreamDock_Duration_Time = chrono::duration_cast<chrono::milliseconds>(p->StreamDock_End_Time - p->StreamDock_Start_Time);
				p->Key_Time_Log_Vector.push_back(p->StreamDock_Duration_Time.count());
			}
			else
				p->Key_Time_Log_Vector.push_back(ks->time - p->Last_Key_Time);
			p->Last_Key_Time = ks->time;
			//Global_MyStreamDockPlugin->Current_Operator->Start_Time = ks->time;
			//if (p->Key_Value_Log_Vector.size() == 1)
			//{
			//	p->Start_Time = ks->time;
			//}
		}
		if (
			(Global_MyStreamDockPlugin->Current_Operator == nullptr || (Global_MyStreamDockPlugin->Current_Operator != nullptr && p->context != Global_MyStreamDockPlugin->Current_Operator->context))
			&& p->Start_Record_KeyValue == ks->vkCode
			&& (ks->flags == 0 || ks->flags == 1 || ks->flags == 16)
			&& p->start_recording
			&& Global_MyStreamDockPlugin->Last_KeyValue != ks->vkCode
			)
			p->Start_Record_status_changed++;

		HSDLogger::LogMessage("Start_Record_status_changed:", std::to_string(p->Start_Record_status_changed));
		if (
			(Global_MyStreamDockPlugin->Current_Operator == nullptr || (Global_MyStreamDockPlugin->Current_Operator != nullptr && p->context != Global_MyStreamDockPlugin->Current_Operator->context))
			&& p->Start_Record_KeyValue == ks->vkCode
			//&& ++p->Start_Record_status_changed % 4 == 0
			&& (ks->flags == 128 || ks->flags == 129 || ks->flags == 144)
			&& ++p->Start_Record_status_changed % 4 == 0
			&& p->start_recording

			//&& ++p->Start_Record_status_changed %4 == 0

			)
		{
			HSDLogger::LogMessage("KeyBoard_Event:", "21");
			p->start_recording = false;
			//p->Start_Record_status_changed = 0;
		}
	}


	//测试
	for (auto p : Global_MyStreamDockPlugin->mVisibleContexts)
	{
		static int count1 = 0;
		if (p->start_recording)
		{
			HSDLogger::LogMessage("start_recording:", std::to_string(1));
		}
		else if (!p->start_recording)
		{
			HSDLogger::LogMessage("start_recording" + std::to_string(count1), std::to_string(0));
		}
		count1++;
	}


	if (
		Global_MyStreamDockPlugin->Current_Operator != nullptr &&
		Global_MyStreamDockPlugin->Current_Operator->start_recording
		//&& (ks->flags == 128 || ks->flags == 129 || Global_MyStreamDockPlugin->Current_Operator->Last_KeyValue != ks->vkCode)
		&& (ks->flags == 128 || ks->flags == 129 || ks->flags == 144 || Global_MyStreamDockPlugin->Last_KeyValue != ks->vkCode || Global_MyStreamDockPlugin->Current_Operator->Is_Show_Still_Press)
		)
	{

		json Key_Value;
		if (Global_MyStreamDockPlugin->Current_Operator->uuid == "com.hotspot.stream.HotKey")
		{

			Key_Value["KeyBoardValue"] = std::to_string(ks->flags) + "/" + std::to_string(ks->vkCode) + "/" + std::to_string(ks->time);
		}
		else if (Global_MyStreamDockPlugin->Current_Operator->uuid == "com.hotspot.stream.Record_Replay" || Global_MyStreamDockPlugin->Current_Operator->uuid == "com.hotspot.stream.Record")
		{

			Key_Value["KeyBoardValue"] = std::to_string(ks->flags) + "/" + std::to_string(ks->vkCode) + "/" + std::to_string(ks->time);
			if (Global_MyStreamDockPlugin->Current_Operator->Key_Time_Log_Vector.size() == 1)
				Key_Value["KeyBoardValue"] = std::to_string(ks->flags) + "/" + std::to_string(ks->vkCode) + "/" + std::to_string(ks->time) +
				"/" + std::to_string(Global_MyStreamDockPlugin->Current_Operator->Key_Time_Log_Vector[0]);

		}


		Global_MyStreamDockPlugin->mConnectionManager->SendToPropertyInspector(
			Global_MyStreamDockPlugin->Current_Operator->uuid,
			Global_MyStreamDockPlugin->Current_Operator->context,
			Key_Value);

	}


	//测试
	for (auto p : Global_MyStreamDockPlugin->mVisibleContexts)
	{
		static int count2 = 0;
		if (p->start_recording)
		{
			HSDLogger::LogMessage("start_recording:", std::to_string(1));
		}
		else if (!p->start_recording)
		{
			HSDLogger::LogMessage("start_recording" + std::to_string(count2), std::to_string(0));
		}
		count2++;
	}


	for (auto p : Global_MyStreamDockPlugin->mVisibleContexts)
	{

		if (
			Global_MyStreamDockPlugin->Current_Operator != nullptr &&
			p->context == Global_MyStreamDockPlugin->Current_Operator->context
			&& p->Start_Record_KeyValue == ks->vkCode
			&& (ks->flags == 128 || ks->flags == 129 || ks->flags == 144)
			//&& p->start_recording
			)
		{
			if (
				++p->Start_Record_status_changed % 4 == 0
				&& p->start_recording
				)
			{
				p->start_recording = false;
			}

		}

		if (
			Global_MyStreamDockPlugin->Current_Operator != nullptr &&
			Global_MyStreamDockPlugin->Current_Operator->uuid == "com.hotspot.stream.HotKey")
		{



			if (p->start_recording)
				Global_MyStreamDockPlugin->Is_All_Stop_Record = false;

			if (p == Global_MyStreamDockPlugin->mVisibleContexts.back())
			{
				if (Global_MyStreamDockPlugin->Is_All_Stop_Record)
					HSDLogger::LogMessage("Is_All_Stop_Record1:", "1");
				else
					HSDLogger::LogMessage("Is_All_Stop_Record1:", "2");
				if (Global_MyStreamDockPlugin->Is_Hook_Stop_Thread_Running)
					HSDLogger::LogMessage("Is_Hook_Stop_Thread_Running1:", "1");
				else
					HSDLogger::LogMessage("Is_Hook_Stop_Thread_Running1:", "2");
			}

			if (
				p == Global_MyStreamDockPlugin->mVisibleContexts.back()
				&& Global_MyStreamDockPlugin->Is_All_Stop_Record
				&& !Global_MyStreamDockPlugin->Is_Hook_Stop_Thread_Running
				)
			{
				//休眠钩子
				Global_MyStreamDockPlugin->Is_Hook_Stop_Thread_Running = true;

				Global_MyStreamDockPlugin->m_CloseHook->start([=]()mutable
					{
						//Global_MyStreamDockPlugin->Is_Hook_Stop_Thread_Running = true;
						Global_MyStreamDockPlugin->Delay_Close_Hook();
						Global_MyStreamDockPlugin->Is_Hook_Stop_Thread_Running = false;
					}
				, 10000);
				HSDLogger::LogMessage("Ready_Close_Hook:", "Ready_Close_Hook:");

			}

			if (p == Global_MyStreamDockPlugin->mVisibleContexts.back())
			{
				if (Global_MyStreamDockPlugin->Is_All_Stop_Record)
					HSDLogger::LogMessage("Is_All_Stop_Record2:", "1");
				else
					HSDLogger::LogMessage("Is_All_Stop_Record2:", "2");
				if (Global_MyStreamDockPlugin->Is_Hook_Stop_Thread_Running)
					HSDLogger::LogMessage("Is_Hook_Stop_Thread_Running2:", "1");
				else
					HSDLogger::LogMessage("Is_Hook_Stop_Thread_Running2:", "2");
				Global_MyStreamDockPlugin->Is_All_Stop_Record = true;
			}

			//if (
			//	Global_MyStreamDockPlugin->Current_Operator->Start_Record_KeyValue == ks->vkCode
			//	&& (ks->flags == 128 || ks->flags == 129)
			//	)
			//{
			//	if (
			//		++Global_MyStreamDockPlugin->Current_Operator->Start_Record_status_changed % 4 == 0
			//		&& Global_MyStreamDockPlugin->Current_Operator->start_recording
			//		)
			//		Global_MyStreamDockPlugin->Current_Operator->start_recording = false;
			//}
		}
	}




	//3修改

	if (

		//Global_MyStreamDockPlugin->Current_Operator != nullptr &&
		ks->flags == 128 || ks->flags == 129 || ks->flags == 144
		)
		//Global_MyStreamDockPlugin->Current_Operator->Last_KeyValue = 0;
		Global_MyStreamDockPlugin->Last_KeyValue = 0;
	else if (
		//Global_MyStreamDockPlugin->Current_Operator != nullptr &&
		//Global_MyStreamDockPlugin->Current_Operator->Last_KeyValue != ks->vkCode && (ks->flags == 0 || ks->flags == 1)
		Global_MyStreamDockPlugin->Last_KeyValue != ks->vkCode && (ks->flags == 0 || ks->flags == 1 || ks->flags == 16)
		)
		//Global_MyStreamDockPlugin->Current_Operator->Last_KeyValue = ks->vkCode;
		Global_MyStreamDockPlugin->Last_KeyValue = ks->vkCode;

	//测试
	for (auto p : Global_MyStreamDockPlugin->mVisibleContexts)
	{
		static int count3 = 0;
		if (p->start_recording)
		{
			HSDLogger::LogMessage("start_recording:", std::to_string(1));
		}
		else if (!p->start_recording)
		{
			HSDLogger::LogMessage("start_recording" + std::to_string(count3), std::to_string(0));
		}
		count3++;
	}

	//if (Global_MyStreamDockPlugin->Current_Operator->start_recording)
	//{
	//	return 1;
	//}

	if (
		Global_MyStreamDockPlugin->Current_Operator != nullptr &&
		Global_MyStreamDockPlugin->Current_Operator->Start_Record_KeyValue == ks->vkCode
		)
	{
		return 1;
	}

	// 将消息传递给钩子链中的下一个钩子
	return CallNextHookEx(NULL, nCode, wParam, lParam);

}

void MyStreamDockPlugin::Delay_Close_Hook()
{
	for (auto p : mVisibleContexts)
	{
		if (p->start_recording)
			break;
		if (p == mVisibleContexts.back())
		{
			Is_Exit = true;
			HSDLogger::LogMessage("Close_Hook:", "Close_Hook:");

			json Close_Hook;
			Close_Hook["Close_Hook"] = "Close_Hook";
			if (Current_Operator != nullptr)
				mConnectionManager->SendToPropertyInspector(Current_Operator->uuid, Current_Operator->context, Close_Hook);

		}


	}
}

void MyStreamDockPlugin::Restore_Log()
{
	if (Current_Operator == nullptr)
		return;
	if (Current_Operator->Vector_Size != Current_Operator->Key_Value_Log_Vector.size() /*- 1*/ && Current_Operator->Vector_Size != -1)
	{

		HSDLogger::LogMessage("PropertyInspectorDidAppear:", "test1");
		int count = 0;
		int this_vector_order = Current_Operator->Vector_Size;
		int this_position_vector_order = Current_Operator->Positon_Vector_Size;
		int position_count = 0;
		int Mouse_Event_Count = 0;
		for (auto p = Current_Operator->Key_Value_Log_Vector.begin(); p != Current_Operator->Key_Value_Log_Vector.end(); p++)
		{
			if (count++ < Current_Operator->Vector_Size)
			{
				continue;
			}
			if (*p < 256)
			{
				//if (Current_Operator->Key_Value_Log_Vector.empty())
				//{

				//}
				//else
				//{
				unsigned long This_Time = Current_Operator->Start_Time;
				int count2 = 0;
				for (auto p2 = Current_Operator->Key_Time_Log_Vector.begin(); p2 != Current_Operator->Key_Time_Log_Vector.end(); p2++)
				{

					This_Time += *p2;
					if (count2 == this_vector_order - 1)
					{

						json The_Last_Time;
						//The_Last_Time["Last_Time"] = std::to_string(Current_Operator->Key_Time_Log_Vector[Current_Operator->Vector_Size - 1]);
						The_Last_Time["Last_Time"] = std::to_string(This_Time);
						mConnectionManager->SendToPropertyInspector(Current_Operator->uuid, Current_Operator->context, The_Last_Time);
						HSDLogger::LogMessage("Last_Time:", std::to_string(This_Time));

					}
					if (count2++ == this_vector_order)
					{

						break;
					}


				}
				this_vector_order++;
				HSDLogger::LogMessage("PropertyInspectorDidAppear:", "test2");
				json Restore_Click_Log;

				if (/*Current_Operator->Is_Show_Still_Press || */!Current_Operator->Key_Press_Data_Vector.empty())
				{
					if (Current_Operator->Key_Press_Data_Vector[Mouse_Event_Count])
					{
						Restore_Click_Log["KeyBoardValue"] = std::to_string(0) + "/" + std::to_string(*p) + "/" + std::to_string(This_Time);
					}
					else if (!Current_Operator->Key_Press_Data_Vector[Mouse_Event_Count])
					{
						Restore_Click_Log["KeyBoardValue"] = std::to_string(128) + "/" + std::to_string(*p) + "/" + std::to_string(This_Time);
					}
					Mouse_Event_Count++;
				}
				else if (/*!Current_Operator->Is_Show_Still_Press && */Current_Operator->Key_Press_Data_Vector.empty())
				{
					if (Current_Operator->Is_Down_Log[*p] == false)
					{
						Restore_Click_Log["KeyBoardValue"] = std::to_string(0) + "/" + std::to_string(*p) + "/" + std::to_string(This_Time);
						Current_Operator->Is_Down_Log[*p] = true;
					}
					else if (Current_Operator->Is_Down_Log[*p] == true)
					{
						Restore_Click_Log["KeyBoardValue"] = std::to_string(128) + "/" + std::to_string(*p) + "/" + std::to_string(This_Time);
						Current_Operator->Is_Down_Log[*p] = false;
					}
				}

				HSDLogger::LogMessage("PropertyInspectorDidAppear:", "test3");
				mConnectionManager->SendToPropertyInspector(Current_Operator->uuid, Current_Operator->context, Restore_Click_Log);

				//}

			}
			else if (*p >= 256)
			{

				unsigned long This_Time = Current_Operator->Start_Time;
				int count2 = 0;
				for (auto p2 = Current_Operator->Key_Time_Log_Vector.begin(); p2 != Current_Operator->Key_Time_Log_Vector.end(); p2++)
				{

					This_Time += *p2;
					if (count2 == this_vector_order - 1)
					{

						json The_Last_Time;
						//The_Last_Time["Last_Time"] = std::to_string(Current_Operator->Key_Time_Log_Vector[Current_Operator->Vector_Size - 1]);
						The_Last_Time["Last_Time"] = std::to_string(This_Time);
						mConnectionManager->SendToPropertyInspector(Current_Operator->uuid, Current_Operator->context, The_Last_Time);
						HSDLogger::LogMessage("Last_Time:", std::to_string(This_Time));

					}
					if (count2++ == this_vector_order)
						break;

				}
				this_vector_order++;
				HSDLogger::LogMessage("PropertyInspectorDidAppear:", "test2");
				json Restore_Click_Log;
				Restore_Click_Log["MouseValue"] =
					std::to_string(*p) +
					"/" + std::to_string(Current_Operator->Key_Position_Vector[Current_Operator->Positon_Vector_Size + position_count].first) +
					"/" + std::to_string(Current_Operator->Key_Position_Vector[Current_Operator->Positon_Vector_Size + position_count].second) +
					"/" + std::to_string(This_Time);
				position_count++;
				HSDLogger::LogMessage("PropertyInspectorDidAppear:", "test3");
				mConnectionManager->SendToPropertyInspector(Current_Operator->uuid, Current_Operator->context, Restore_Click_Log);

			}

			Sleep(20);
		}
		Current_Operator->Vector_Size = -1;
	}
}



MyStreamDockPlugin::MyStreamDockPlugin() :
	Is_Exit(false),
	Last_Operator(new new_operator("", ""))
{
	Global_MyStreamDockPlugin = this;

	mTimer = new CallBackTimer();
	m_CloseHook = new CallBackTimer();



	std::fstream Get_Key_Value_File("Key_Value.ini", std::ios::in | std::ios::out);
	std::string Key_Value_Data = "";

	std::string Key_Num_Value_Str = "";
	std::string Key_Data_Str = "";
	int Key_Num_Value = 0;

	while (getline(Get_Key_Value_File, Key_Value_Data))
	{
		Key_Num_Value_Str = Key_Value_Data.substr(0, Key_Value_Data.find_first_of(":"));
		Key_Num_Value = std::stoi(Key_Num_Value_Str, nullptr, 16);

		Key_Data_Str = Key_Value_Data.substr(Key_Value_Data.find_first_of("'") + 1);
		Key_Data_Str = Key_Data_Str.substr(0, Key_Data_Str.find_last_of("'"));

		Key_Value_Map[Key_Data_Str] = Key_Num_Value;
		//Key_Value_Map.insert(std::pair<std::string, int>(Key_Data_Str, Key_Num_Value));
	}

	//for (auto p : Key_Value_Map)
	//{
	//	std::cout << p.first << "  " << p.second << std::endl;
	//}
	//std::cout << Key_Value_Map.size() << std::endl;
	//std::cout << Key_Value_Map["H"] << std::endl;

}

MyStreamDockPlugin::~MyStreamDockPlugin()
{
	//PostQuitMessage(0);
	//Is_Exit = true;
	if (mTimer != nullptr)
	{
		mTimer->stop();

		delete mTimer;
		mTimer = nullptr;
	}
	if (m_CloseHook != nullptr)
	{
		m_CloseHook->stop();

		delete m_CloseHook;
		m_CloseHook = nullptr;
	}

}

void MyStreamDockPlugin::UpdateTimer()
{

	// 安装钩子
	keyboardHook = SetWindowsHookEx(
		WH_KEYBOARD_LL,			// 钩子类型，WH_KEYBOARD_LL 为键盘钩子
		LowLevelKeyboardProc,	// 指向钩子函数的指针
		GetModuleHandleA(NULL),	// Dll 句柄
		NULL                    //std::this_thread::get_id()  //NULL  //GetCurrentThreadId()
	);
	if (keyboardHook == 0)
	{
		HSDLogger::LogMessage("KeyBoard failed", "failed");
		cout << "挂钩键盘失败\n" << endl;
	}
	HSDLogger::LogMessage("test3", "test3");

	mouseHook = SetWindowsHookEx(
		WH_MOUSE_LL,
		LowLevelMouseProc,
		GetModuleHandleA(NULL),
		NULL
	);
	if (mouseHook == 0)
	{
		HSDLogger::LogMessage("Mouse failed", "failed");
		cout << "挂钩鼠标失败\n" << endl;
	}
	HSDLogger::LogMessage("test4", "test4");

	//不可漏掉消息处理，不然程序会卡死
	MSG msg;
	while (1)
	{
		if (Is_Exit)
		{
			Is_Exit = false;
			break;

		}
		// 如果消息队列中有消息
		if (PeekMessageA(
			&msg,		// MSG 接收这个消息
			NULL,		// 检测消息的窗口句柄，NULL：检索当前线程所有窗口消息
			NULL,		// 检查消息范围中第一个消息的值，NULL：检查所有消息（必须和下面的同时为NULL） 
			NULL,		// 检查消息范围中最后一个消息的值，NULL：检查所有消息（必须和上面的同时为NULL）
			PM_REMOVE	// 处理消息的方式，PM_REMOVE：处理后将消息从队列中删除
		)) {

			if (msg.message == WM_QUIT)
				break;

			// 把按键消息传递给字符消息
			TranslateMessage(&msg);

			// 将消息分派给窗口程序
			DispatchMessageW(&msg);

		}
		else
			Sleep(0);    //避免CPU全负载运行
	}
	HSDLogger::LogMessage("test5", "test5");
	// 删除钩子
	UnhookWindowsHookEx(keyboardHook);
	UnhookWindowsHookEx(mouseHook);
	HSDLogger::LogMessage("test7", "test7");
}

void MyStreamDockPlugin::Old_SendInput_Event(new_operator* This_Operator)
{


	//std::this_thread::sleep_for(std::chrono::milliseconds(3000));

	int Vector_Size = This_Operator->Key_Value_Log_Vector.size();
	INPUT* inputs = new INPUT[Vector_Size];
	ZeroMemory(inputs, sizeof(INPUT) * Vector_Size);
	//delete []inputs;
	int Operation_Num = 0;
	int KeyBoard_Operator_Num = 0;
	int Mouse_Operation_Num = 0;
	for (auto KeyValue : This_Operator->Key_Value_Log_Vector)
	{
		if (KeyValue < 256)
		{
			if (This_Operator->Key_Press_Data_Vector.empty())
			{
				if (/*KeyValue < 256 && */This_Operator->Is_Down[KeyValue] == false)
				{
					inputs[Operation_Num].type = INPUT_KEYBOARD;
					inputs[Operation_Num].ki.wVk = KeyValue;
					//inputs[i].ki.dwFlags = KEYEVENTF_KEYDOWN;
					This_Operator->Is_Down[KeyValue] = true;
				}
				else if (/*KeyValue < 256 && */This_Operator->Is_Down[KeyValue] == true)
				{
					inputs[Operation_Num].type = INPUT_KEYBOARD;
					inputs[Operation_Num].ki.wVk = KeyValue;
					inputs[Operation_Num].ki.dwFlags = KEYEVENTF_KEYUP;
					This_Operator->Is_Down[KeyValue] = false;
				}
			}
			else if (!This_Operator->Key_Press_Data_Vector.empty())
			{
				if (This_Operator->Key_Press_Data_Vector[KeyBoard_Operator_Num] == 1)
				{
					inputs[Operation_Num].type = INPUT_KEYBOARD;
					inputs[Operation_Num].ki.wVk = KeyValue;
					//inputs[i].ki.dwFlags = KEYEVENTF_KEYDOWN;
				}
				else if (This_Operator->Key_Press_Data_Vector[KeyBoard_Operator_Num] == 0)
				{
					inputs[Operation_Num].type = INPUT_KEYBOARD;
					inputs[Operation_Num].ki.wVk = KeyValue;
					inputs[Operation_Num].ki.dwFlags = KEYEVENTF_KEYUP;
				}
			}
			KeyBoard_Operator_Num++;
		}
		else if (KeyValue > 256)
		{
			if (KeyValue == 512 && !This_Operator->Is_Show_Mouse_track)
				continue;

			//获取屏幕分辨率
			int screen_x_Dpi = 0, screen_y_Dpi = 0;
			get_screen_Dpi(&screen_x_Dpi, &screen_y_Dpi);

			//获取屏幕实际尺寸
			int screen_real_size_x;
			int screen_real_size_y;
			get_screen_size(&screen_real_size_x, &screen_real_size_y);
			float Screen_x_Times = (float)screen_real_size_x / screen_x_Dpi;
			float Screen_y_Times = (float)screen_real_size_y / screen_y_Dpi;

			//SetCursorPos(This_Operator->Key_Position_Vector[Mouse_Operation_Num].first * Screen_x_Times,
			//	This_Operator->Key_Position_Vector[Mouse_Operation_Num].second * Screen_y_Times);
			inputs[Operation_Num].type = INPUT_MOUSE;
			inputs[Operation_Num].mi.dx = (This_Operator->Key_Position_Vector[Mouse_Operation_Num].first * Screen_x_Times / screen_real_size_x) * 65536;
			inputs[Operation_Num].mi.dy = (This_Operator->Key_Position_Vector[Mouse_Operation_Num].second * Screen_y_Times / screen_real_size_y) * 65536;
			inputs[Operation_Num].mi.mouseData = 0;
			switch (KeyValue)
			{
			case 512:
				inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE;
				break;
			case 513:
				inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_LEFTDOWN;
				break;
			case 514:
				inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_LEFTUP;
				break;
			case 516:
				inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_RIGHTDOWN;
				break;
			case 517:
				inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_RIGHTUP;
				break;
			case 519:
				inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_MIDDLEDOWN;
				break;
			case 520:
				inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_MIDDLEUP;
				break;
			case 522:
				inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_WHEEL;
				break;
			case 523:
				inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_XDOWN;
				break;
			case 524:
				inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_XUP;
				break;
			case 526:
				inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_HWHEEL;
				break;
			default:
				inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE;
				break;
			}
			Mouse_Operation_Num++;
		}

		Operation_Num++;
	}
	void* origin_pointer_address = (void*)inputs;
	//SendInput(Vector_Size, inputs, sizeof(INPUT));
	for (int i = 0; i < Vector_Size; i++)
	{
		SendInput(1, inputs++, sizeof(INPUT));
		if (This_Operator->Is_Delete_Delay == false)
			std::this_thread::sleep_for(std::chrono::milliseconds(This_Operator->Key_Time_Log_Vector[i]));
	}

	inputs = (decltype(inputs))origin_pointer_address;

	delete[]inputs;
	inputs = nullptr;
	//WM_MOUSEMOVE;

}


void MyStreamDockPlugin::New_SendInput_Event(new_operator* This_Operator)
{

	int Vector_Size = 0;
	//for (auto p : This_Operator->Key_Time_Log_Vector)
	//{
	//	if (p >= 0)
	//		Vector_Size++;
	//	if (p < 0)
	//		Vector_Size += (-p) * 2;
	//}
	for (int i = 0; i < This_Operator->Key_Value_Log_Vector.size(); i++)
	{
		if (This_Operator->Key_Value_Log_Vector[i] < 0)
			continue;
		if (This_Operator->Key_Time_Log_Vector[i] >= 0)
			Vector_Size++;
		else if (This_Operator->Key_Time_Log_Vector[i] < 0)
			Vector_Size += (-This_Operator->Key_Time_Log_Vector[i]) * 2;

	}


	INPUT* inputs = new INPUT[Vector_Size];
	ZeroMemory(inputs, sizeof(INPUT) * Vector_Size);
	//delete []inputs;
	int Operation_Num = 0;
	int KeyData_Operator_Num = 0;
	int Mouse_Operation_Num = 0;

	int inputs_Num = 0;

	//int count = 0;
	
	// 打印Key_Value_Log_Vector 查找值，与SimulatedKeyboardEvent输出
	for (auto KeyValue : This_Operator->Key_Value_Log_Vector)
	{
		HSDLogger::LogMessage("这是一个测试所有字段：", std::to_string(KeyValue));
	}

	for (auto KeyValue : This_Operator->Key_Value_Log_Vector)
	{
		if (KeyValue >= 0 && KeyValue < 256)
		{
			//HSDLogger::LogMessage("New_SendInput_Event", std::to_string(0));
			if (/*This_Operator->Key_Press_Release_Vector.empty()*/0)
			{
				//HSDLogger::LogMessage("New_SendInput_Event", std::to_string(1));
				if (/*KeyValue < 256 && */This_Operator->Is_Down[KeyValue] == false)
				{
					inputs[Operation_Num].type = INPUT_KEYBOARD;
					inputs[Operation_Num].ki.wVk = KeyValue;
					//inputs[i].ki.dwFlags = KEYEVENTF_KEYDOWN;
					This_Operator->Is_Down[KeyValue] = true;
				}
				else if (/*KeyValue < 256 && */This_Operator->Is_Down[KeyValue] == true)
				{
					inputs[Operation_Num].type = INPUT_KEYBOARD;
					inputs[Operation_Num].ki.wVk = KeyValue;
					inputs[Operation_Num].ki.dwFlags = KEYEVENTF_KEYUP;
					This_Operator->Is_Down[KeyValue] = false;
				}
			}
			else if (/*!This_Operator->Key_Press_Release_Vector.empty()      &&*/ This_Operator->Key_Time_Log_Vector[Operation_Num] >= 0)
			{
				//HSDLogger::LogMessage("New_SendInput_Event", std::to_string(2));
				if (This_Operator->Key_Press_Data_Vector[KeyData_Operator_Num] == 1)
				{
					inputs[inputs_Num].type = INPUT_KEYBOARD;
					inputs[inputs_Num].ki.wVk = KeyValue;
					//inputs[i].ki.dwFlags = KEYEVENTF_KEYDOWN;
				}
				else if (This_Operator->Key_Press_Data_Vector[KeyData_Operator_Num] == 0)
				{
					inputs[inputs_Num].type = INPUT_KEYBOARD;
					inputs[inputs_Num].ki.wVk = KeyValue;
					inputs[inputs_Num].ki.dwFlags = KEYEVENTF_KEYUP;
				}
				KeyData_Operator_Num++;
				inputs_Num++;
			}


			else if (This_Operator->Key_Time_Log_Vector[Operation_Num] < 0)
			{
				//HSDLogger::LogMessage("New_SendInput_Event", std::to_string(This_Operator->Key_Time_Log_Vector[Operation_Num]));
				for (int i = 0; i < (-This_Operator->Key_Time_Log_Vector[Operation_Num]) /** 2*/; i++)
				{
					inputs[inputs_Num].type = INPUT_KEYBOARD;
					inputs[inputs_Num].ki.wVk = KeyValue;
					//inputs[i].ki.dwFlags = KEYEVENTF_KEYDOWN;

					inputs_Num++;

					inputs[inputs_Num].type = INPUT_KEYBOARD;
					inputs[inputs_Num].ki.wVk = KeyValue;
					inputs[inputs_Num].ki.dwFlags = KEYEVENTF_KEYUP;

					inputs_Num++;

					//HSDLogger::LogMessage("New_SendInput_Event:count", std::to_string(count));
					//count++;

				}

			}

			//KeyBoard_Operator_Num++;
		}
		else if (KeyValue >= 256)
		{
			if (KeyValue == 512 && !This_Operator->Is_Show_Mouse_track)
				continue;

			//获取屏幕分辨率
			int screen_x_Dpi = 0, screen_y_Dpi = 0;
			get_screen_Dpi(&screen_x_Dpi, &screen_y_Dpi);

			//获取屏幕实际尺寸
			int screen_real_size_x;
			int screen_real_size_y;
			get_screen_size(&screen_real_size_x, &screen_real_size_y);
			float Screen_x_Times = (float)screen_real_size_x / screen_x_Dpi;
			float Screen_y_Times = (float)screen_real_size_y / screen_y_Dpi;

			if (This_Operator->Key_Time_Log_Vector[Operation_Num] >= 0)
			{

				//SetCursorPos(This_Operator->Key_Position_Vector[Mouse_Operation_Num].first * Screen_x_Times,
				//	This_Operator->Key_Position_Vector[Mouse_Operation_Num].second * Screen_y_Times);
				inputs[inputs_Num].type = INPUT_MOUSE;
				inputs[inputs_Num].mi.dx = (This_Operator->Key_Position_Vector[Mouse_Operation_Num].first * Screen_x_Times / screen_real_size_x) * 65536;
				inputs[inputs_Num].mi.dy = (This_Operator->Key_Position_Vector[Mouse_Operation_Num].second * Screen_y_Times / screen_real_size_y) * 65536;
				inputs[inputs_Num].mi.mouseData = 0;
				switch (KeyValue)
				{
				case 512:
					inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE;
					break;
				case 513:
					inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_LEFTDOWN;
					break;
				case 514:
					inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_LEFTUP;
					break;
				case 516:
					inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_RIGHTDOWN;
					break;
				case 517:
					inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_RIGHTUP;
					break;
				case 519:
					inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_MIDDLEDOWN;
					break;
				case 520:
					inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_MIDDLEUP;
					break;
				case 522:
					//7864320  向前滚动 0x78 0000    //4287102976  向后滚动 0xFF88 0000
					inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_WHEEL;
					if (This_Operator->Key_Press_Data_Vector[KeyData_Operator_Num] == 0x780000)
					{
						inputs[inputs_Num].mi.mouseData = 0x780000;
						KeyData_Operator_Num++;
					}
					else if (This_Operator->Key_Press_Data_Vector[KeyData_Operator_Num] == 0xFF880000)
					{
						inputs[inputs_Num].mi.mouseData = 0xFF880000;
						KeyData_Operator_Num++;
					}

					break;
				case 523:
					inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_XDOWN;
					inputs[inputs_Num].mi.mouseData = This_Operator->Key_Press_Data_Vector[KeyData_Operator_Num];
					KeyData_Operator_Num++;
					break;
				case 524:
					inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_XUP;
					inputs[inputs_Num].mi.mouseData = This_Operator->Key_Press_Data_Vector[KeyData_Operator_Num];
					KeyData_Operator_Num++;
					break;
				case 526:
					inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_HWHEEL;
					break;
				default:
					inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE;
					break;
				}
				Mouse_Operation_Num++;
				inputs_Num++;
			}
			else if (This_Operator->Key_Time_Log_Vector[Operation_Num] < 0)
			{
				bool Is_Click_Not_Release = true;
				for (int i = 0; i < (-This_Operator->Key_Time_Log_Vector[Operation_Num]) * 2; i++)
				{
					inputs[inputs_Num].type = INPUT_MOUSE;
					inputs[inputs_Num].mi.dx = (This_Operator->Key_Position_Vector[Mouse_Operation_Num].first * Screen_x_Times / screen_real_size_x) * 65536;
					inputs[inputs_Num].mi.dy = (This_Operator->Key_Position_Vector[Mouse_Operation_Num].second * Screen_y_Times / screen_real_size_y) * 65536;
					inputs[inputs_Num].mi.mouseData = 0;
					if (!Is_Click_Not_Release && KeyValue != 522)
						KeyValue++;
					switch (KeyValue)
					{
					case 512:
						inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE;
						break;
					case 513:
						inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_LEFTDOWN;
						break;
					case 514:
						inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_LEFTUP;
						break;
					case 516:
						inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_RIGHTDOWN;
						break;
					case 517:
						inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_RIGHTUP;
						break;
					case 519:
						inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_MIDDLEDOWN;
						break;
					case 520:
						inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_MIDDLEUP;
						break;
					case 522:
						inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_WHEEL;
						inputs[inputs_Num].mi.mouseData = This_Operator->Key_Press_Data_Vector[KeyData_Operator_Num];

						i++;
						break;
					case 523:
						inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_XDOWN;
						inputs[inputs_Num].mi.mouseData = This_Operator->Key_Press_Data_Vector[KeyData_Operator_Num];

						break;
					case 524:
						inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_XUP;
						inputs[inputs_Num].mi.mouseData = This_Operator->Key_Press_Data_Vector[KeyData_Operator_Num];

						break;
					case 526:
						inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_HWHEEL;
						break;
					default:
						inputs[inputs_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE;
						break;
					}

					if (Is_Click_Not_Release && KeyValue != 522)
					{
						Is_Click_Not_Release = false;
					}
					else if (!Is_Click_Not_Release && KeyValue != 522)
					{
						KeyValue--;
						Is_Click_Not_Release = true;
					}

					inputs_Num++;

				}


				Mouse_Operation_Num++;

				if (KeyValue == 522 || KeyValue == 523 || KeyValue == 524)
					KeyData_Operator_Num++;

			}



		}
		else if (KeyValue < 0)
		{
			;
		}

		Operation_Num++;
	}

	//for (int i = 0; i < Vector_Size; i++)
	//{
	//	if(inputs[i].type == INPUT_MOUSE)
	//		HSDLogger::LogMessage("SendInput:mouseData", std::to_string(inputs[i].mi.mouseData));
	//}

	void* origin_pointer_address = (void*)inputs;
	//SendInput(Vector_Size, inputs, sizeof(INPUT));
	for (int i = 0; i < /*Vector_Size*/This_Operator->Key_Value_Log_Vector.size(); i++)
	{
		//SendInput(1, inputs++, sizeof(INPUT));
		if (This_Operator->Is_Delete_Delay == false)
		{
			if (This_Operator->Key_Value_Log_Vector[i] >= 0)
			{
				if (This_Operator->Key_Time_Log_Vector[i] >= 0)
				{
					std::this_thread::sleep_for(std::chrono::milliseconds(This_Operator->Key_Time_Log_Vector[i]));
					SendInput(1, inputs++, sizeof(INPUT));
				}
				else if (This_Operator->Key_Time_Log_Vector[i] < 0)
				{

					int Circle_Size = (-This_Operator->Key_Time_Log_Vector[i]) * 2;
					for (int j = 0; j < Circle_Size; j++)
					{
						if (This_Operator->Key_Value_Log_Vector[i] == 522)
							j++;
						SendInput(1, inputs++, sizeof(INPUT));
					}
				}

			}
			else if (This_Operator->Key_Value_Log_Vector[i] < 0)  //-1
			{
				std::this_thread::sleep_for(std::chrono::milliseconds(This_Operator->Key_Time_Log_Vector[i]));
				continue;
			}
		}
		//SendInput(1, inputs++, sizeof(INPUT));

	}

	inputs = (decltype(inputs))origin_pointer_address;

	delete[]inputs;
	inputs = nullptr;
	origin_pointer_address = nullptr;
	//WM_MOUSEMOVE;

}

void MyStreamDockPlugin::KeyDownForAction(const std::string& inAction, const std::string& inContext, const json& inPayload, const std::string& inDeviceID)
{
	//#ifdef WIN32
	//
	//#endif
	std::string payload = inPayload.dump();
	HSDLogger::LogMessage("Payload", payload);
	std::string content;

	//std::string Key_Time_Log_Save = NlohmannJSONUtils::GetStringByName(inPayload, "Key_Time_Log_Save");
	//std::string Key_Value_Log_Save = NlohmannJSONUtils::GetStringByName(inPayload, "Key_Value_Log_Save");
	//HSDLogger::LogMessage("Key_Time_Log_Save", Key_Time_Log_Save);
	//HSDLogger::LogMessage("Key_Value_Log_Save", Key_Value_Log_Save);
	if (inAction == "com.hotspot.stream.HotKey")
	{

		new_operator* This_Operator;
		for (auto p : mVisibleContexts)
		{
			if (p->uuid == inAction && p->context == inContext)
			{
				This_Operator = p;
				break;
			}
		}

		for (auto p : This_Operator->Key_Value_Log_Vector)
		{
			HSDLogger::LogMessage("This_Operator", std::to_string(p));
		}

		if (This_Operator->m_SendInput_Event_Timer == nullptr)
			This_Operator->m_SendInput_Event_Timer = new CallBackTimer;
		else if (This_Operator->m_SendInput_Event_Timer != nullptr)
		{
			This_Operator->m_SendInput_Event_Timer->stop();
			delete This_Operator->m_SendInput_Event_Timer;
			This_Operator->m_SendInput_Event_Timer = nullptr;
			This_Operator->m_SendInput_Event_Timer = new CallBackTimer;
		}
		This_Operator->m_SendInput_Event_Timer->start([=]()
			{
				New_SendInput_Event(This_Operator);
			});

		//int Vector_Size = This_Operator->Key_Value_Log_Vector.size();
		//INPUT* inputs = new INPUT[Vector_Size];
		//ZeroMemory(inputs, sizeof(INPUT) * Vector_Size);
		////delete []inputs;
		//int Operation_Num = 0;
		//int Mouse_Operation_Num = 0;
		//for (auto KeyValue : This_Operator->Key_Value_Log_Vector)
		//{

		//	if (KeyValue < 256 && This_Operator->Is_Down[KeyValue] == false)
		//	{
		//		inputs[Operation_Num].type = INPUT_KEYBOARD;
		//		inputs[Operation_Num].ki.wVk = KeyValue;
		//		//inputs[i].ki.dwFlags = KEYEVENTF_KEYDOWN;
		//		This_Operator->Is_Down[KeyValue] = true;
		//	}
		//	else if(KeyValue < 256 && This_Operator->Is_Down[KeyValue] == true)
		//	{
		//		inputs[Operation_Num].type = INPUT_KEYBOARD;
		//		inputs[Operation_Num].ki.wVk = KeyValue;
		//		inputs[Operation_Num].ki.dwFlags = KEYEVENTF_KEYUP;
		//		This_Operator->Is_Down[KeyValue] = false;
		//	}
		//	else if (KeyValue > 256)
		//	{

		//		//获取屏幕分辨率
		//		int screen_x_Dpi = 0, screen_y_Dpi = 0;
		//		get_screen_Dpi(&screen_x_Dpi, &screen_y_Dpi);

		//		//获取屏幕实际尺寸
		//		int screen_real_size_x;
		//		int screen_real_size_y;
		//		get_screen_size(&screen_real_size_x, &screen_real_size_y);
		//		float Screen_x_Times = (float)screen_real_size_x / screen_x_Dpi;
		//		float Screen_y_Times = (float)screen_real_size_y / screen_y_Dpi;

		//		//SetCursorPos(This_Operator->Key_Position_Vector[Mouse_Operation_Num].first * Screen_x_Times,
		//		//	This_Operator->Key_Position_Vector[Mouse_Operation_Num].second * Screen_y_Times);
		//		inputs[Operation_Num].type = INPUT_MOUSE;
		//		inputs[Operation_Num].mi.dx = (This_Operator->Key_Position_Vector[Mouse_Operation_Num].first * Screen_x_Times / screen_real_size_x ) * 65536;
		//		inputs[Operation_Num].mi.dy = (This_Operator->Key_Position_Vector[Mouse_Operation_Num].second * Screen_y_Times / screen_real_size_y ) * 65536;
		//		inputs[Operation_Num].mi.mouseData = 0;
		//		switch (KeyValue)
		//		{
		//		case 512 :
		//			inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE;
		//			break;
		//		case 513:
		//			inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_LEFTDOWN;
		//			break;
		//		case 514:
		//			inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_LEFTUP;
		//			break;
		//		case 516:
		//			inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_RIGHTDOWN;
		//			break;
		//		case 517:
		//			inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_RIGHTUP;
		//			break;
		//		case 519:
		//			inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_MIDDLEDOWN;
		//			break;
		//		case 520:
		//			inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_MIDDLEUP;
		//			break;
		//		case 522:
		//			inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_WHEEL;
		//			break;
		//		case 523:
		//			inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_XDOWN;
		//			break;
		//		case 524:
		//			inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_XUP;
		//			break;
		//		case 526:
		//			inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_HWHEEL;
		//			break;
		//		default:
		//			inputs[Operation_Num].mi.dwFlags = MOUSEEVENTF_ABSOLUTE ;
		//			break;
		//		}
		//		Mouse_Operation_Num++;
		//	}

		//	Operation_Num++;
		//}

		//SendInput(Vector_Size, inputs, sizeof(INPUT));

		//delete []inputs;
		////WM_MOUSEMOVE;
	}
	else if (inAction == "com.hotspot.stream.Record_Replay")
	{
		new_operator* This_Operator;
		for (auto p : mVisibleContexts)
		{
			if (p->uuid == inAction && p->context == inContext)
			{
				This_Operator = p;
				break;
			}
		}

		if (This_Operator->Is_First_Time_Click)
		{
			This_Operator->Is_First_Time_Click = false;
			This_Operator->start_recording = true;

			This_Operator->Key_Value_Log_Vector.clear();
			This_Operator->Key_Time_Log_Vector.clear();
			This_Operator->Key_Position_Vector.clear();
			This_Operator->Key_Press_Data_Vector.clear();

			if (Is_Exit == false)
				Is_Exit = true;
			Sleep(50);
			HSDLogger::LogMessage("inAction:", "HotKey");
			mTimer->start([this]()
				{
					Is_Exit = false;
					HSDLogger::LogMessage("test1", "test1");
					this->UpdateTimer();
				});
			HSDLogger::LogMessage("test2", "test2");

			json Json_Value;
			Json_Value["Recording_Status"] = "Start";

			mConnectionManager->SendToPropertyInspector(This_Operator->uuid, This_Operator->context, Json_Value);

			if (This_Operator->My_Recording_Change_Image == nullptr)
				This_Operator->My_Recording_Change_Image = new CallBackTimer;
			else if (This_Operator->My_Recording_Change_Image != nullptr)
			{
				This_Operator->My_Recording_Change_Image->stop();
				delete This_Operator->My_Recording_Change_Image;
				This_Operator->My_Recording_Change_Image = nullptr;
				This_Operator->My_Recording_Change_Image = new CallBackTimer;
			}
			This_Operator->My_Recording_Change_Image->start([=]()
				{

					std::string imgBase64_Start = "";
					if (imgBase64_Start == "")
					{
						//获取图片base64编码
						std::fstream f;
						std::string Image_Path = "images\\HotKey\\动态图PNG\\回放1.png";
						char GBK_Image_Path[200] = { 0 };
						UTF8ToGBK(Image_Path.c_str(), GBK_Image_Path);
						f.open(GBK_Image_Path, std::ios::in | std::ios::binary);
						f.seekg(0, std::ios_base::end);     //设置偏移量至文件结尾
						std::streampos sp = f.tellg();      //获取文件大小
						int size = sp;
						size += 1;
						char* buffer = (char*)malloc(sizeof(char) * size);
						f.seekg(0, std::ios_base::beg);     //设置偏移量至文件开头
						f.read(buffer, size);                //将文件内容读入buffer
						std::string imgBase64 = base64_encode(buffer, size);
						imgBase64_Start = "data:image/png;base64," + imgBase64;
					}

					std::string imgBase64_1 = "";
					if (imgBase64_1 == "")
					{
						//获取图片base64编码
						std::fstream f;
						std::string Image_Path = "images\\HotKey\\录制中1.png";
						char GBK_Image_Path[200] = { 0 };
						UTF8ToGBK(Image_Path.c_str(), GBK_Image_Path);
						f.open(GBK_Image_Path, std::ios::in | std::ios::binary);
						f.seekg(0, std::ios_base::end);     //设置偏移量至文件结尾
						std::streampos sp = f.tellg();      //获取文件大小
						int size = sp;
						size += 1;
						char* buffer = (char*)malloc(sizeof(char) * size);
						f.seekg(0, std::ios_base::beg);     //设置偏移量至文件开头
						f.read(buffer, size);                //将文件内容读入buffer
						std::string imgBase64 = base64_encode(buffer, size);
						imgBase64_1 = "data:image/png;base64," + imgBase64;
					}
					std::string imgBase64_2 = "";
					if (imgBase64_2 == "")
					{
						//获取图片base64编码
						std::fstream f;
						std::string Image_Path = "images\\HotKey\\录制中2.png";
						char GBK_Image_Path[200] = { 0 };
						UTF8ToGBK(Image_Path.c_str(), GBK_Image_Path);
						f.open(GBK_Image_Path, std::ios::in | std::ios::binary);
						f.seekg(0, std::ios_base::end);     //设置偏移量至文件结尾
						std::streampos sp = f.tellg();      //获取文件大小
						int size = sp;
						size += 1;
						char* buffer = (char*)malloc(sizeof(char) * size);
						f.seekg(0, std::ios_base::beg);     //设置偏移量至文件开头
						f.read(buffer, size);                //将文件内容读入buffer
						std::string imgBase64 = base64_encode(buffer, size);
						imgBase64_2 = "data:image/png;base64," + imgBase64;
					}

					int count = 0;

					while (This_Operator->start_recording)
					{
						if (count % 2 == 0)
							mConnectionManager->SetImage(imgBase64_1, This_Operator->context, kESDSDKTarget_HardwareAndSoftware);
						else if (count % 2 == 1)
							mConnectionManager->SetImage(imgBase64_2, This_Operator->context, kESDSDKTarget_HardwareAndSoftware);
						count++;
						std::this_thread::sleep_for(std::chrono::milliseconds(500));
					}
					mConnectionManager->SetImage(imgBase64_Start, This_Operator->context, kESDSDKTarget_HardwareAndSoftware);

				});


			This_Operator->StreamDock_Start_Time = std::chrono::steady_clock::now();


		}
		else if (!This_Operator->Is_First_Time_Click && This_Operator->start_recording)
		{
			This_Operator->start_recording = false;
			if (mVisibleContexts.empty())
			{
				Is_Exit = true;
			}
			else if (!mVisibleContexts.empty())
			{
				for (auto p : mVisibleContexts)
				{
					if (p->start_recording)
						break;
					else if (p == mVisibleContexts.back())
						Is_Exit = true;
				}
			}

			json Json_Value;
			Json_Value["Recording_Status"] = "Stop";

			mConnectionManager->SendToPropertyInspector(This_Operator->uuid, This_Operator->context, Json_Value);

			Save_Data_To_Local_File(This_Operator);

			for (auto p : mVisibleContexts)
			{
				if (p->Current_Name == This_Operator->Current_Name && p->context != This_Operator->context)
					New_Get_Data_From_Local_Config(p);
			}

			json Already_Record;
			Already_Record["Already_Record"] = true;
			mConnectionManager->SendToPropertyInspector(This_Operator->uuid, This_Operator->context, Already_Record);

		}
		else if (!This_Operator->Is_First_Time_Click && !This_Operator->start_recording)
		{
			//for (auto p : This_Operator->Key_Value_Log_Vector)
			//	HSDLogger::LogMessage("Key_Value_Log_Vector", std::to_string(p));
			//for (auto p : This_Operator->Key_Time_Log_Vector)
			//	HSDLogger::LogMessage("Key_Time_Log_Vector", std::to_string(p));

			This_Operator->Control_Thread_Quit = false;

			if (This_Operator->My_Recording_Change_Image == nullptr)
				This_Operator->My_Recording_Change_Image = new CallBackTimer;
			else if (This_Operator->My_Recording_Change_Image != nullptr)
			{
				This_Operator->My_Recording_Change_Image->stop();
				delete This_Operator->My_Recording_Change_Image;
				This_Operator->My_Recording_Change_Image = nullptr;
				This_Operator->My_Recording_Change_Image = new CallBackTimer;
			}
			This_Operator->My_Recording_Change_Image->start([=]()
				{

					std::string imgBase64_Start = "";
					if (imgBase64_Start == "")
					{
						//获取图片base64编码
						std::fstream f;
						std::string Image_Path = "images\\HotKey\\动态图PNG\\回放1.png";
						char GBK_Image_Path[200] = { 0 };
						UTF8ToGBK(Image_Path.c_str(), GBK_Image_Path);
						f.open(GBK_Image_Path, std::ios::in | std::ios::binary);
						f.seekg(0, std::ios_base::end);     //设置偏移量至文件结尾
						std::streampos sp = f.tellg();      //获取文件大小
						int size = sp;
						size += 1;
						char* buffer = (char*)malloc(sizeof(char) * size);
						f.seekg(0, std::ios_base::beg);     //设置偏移量至文件开头
						f.read(buffer, size);                //将文件内容读入buffer
						std::string imgBase64 = base64_encode(buffer, size);
						imgBase64_Start = "data:image/png;base64," + imgBase64;
					}

					std::string imgBase64_1 = "";
					if (imgBase64_1 == "")
					{
						//获取图片base64编码
						std::fstream f;
						std::string Image_Path = "images\\HotKey\\动态图PNG\\回放1.png";
						char GBK_Image_Path[200] = { 0 };
						UTF8ToGBK(Image_Path.c_str(), GBK_Image_Path);
						f.open(GBK_Image_Path, std::ios::in | std::ios::binary);
						f.seekg(0, std::ios_base::end);     //设置偏移量至文件结尾
						std::streampos sp = f.tellg();      //获取文件大小
						int size = sp;
						size += 1;
						char* buffer = (char*)malloc(sizeof(char) * size);
						f.seekg(0, std::ios_base::beg);     //设置偏移量至文件开头
						f.read(buffer, size);                //将文件内容读入buffer
						std::string imgBase64 = base64_encode(buffer, size);
						imgBase64_1 = "data:image/png;base64," + imgBase64;
					}
					std::string imgBase64_2 = "";
					if (imgBase64_2 == "")
					{
						//获取图片base64编码
						std::fstream f;
						std::string Image_Path = "images\\HotKey\\动态图PNG\\回放2.png";
						char GBK_Image_Path[200] = { 0 };
						UTF8ToGBK(Image_Path.c_str(), GBK_Image_Path);
						f.open(GBK_Image_Path, std::ios::in | std::ios::binary);
						f.seekg(0, std::ios_base::end);     //设置偏移量至文件结尾
						std::streampos sp = f.tellg();      //获取文件大小
						int size = sp;
						size += 1;
						char* buffer = (char*)malloc(sizeof(char) * size);
						f.seekg(0, std::ios_base::beg);     //设置偏移量至文件开头
						f.read(buffer, size);                //将文件内容读入buffer
						std::string imgBase64 = base64_encode(buffer, size);
						imgBase64_2 = "data:image/png;base64," + imgBase64;
					}

					int count = 0;

					while (!This_Operator->Control_Thread_Quit)
					{
						HSDLogger::LogMessage("My_Recording_Change_Image", std::to_string(count));
						if (count % 2 == 0)
							mConnectionManager->SetImage(imgBase64_1, This_Operator->context, kESDSDKTarget_HardwareAndSoftware);
						else if (count % 2 == 1)
							mConnectionManager->SetImage(imgBase64_2, This_Operator->context, kESDSDKTarget_HardwareAndSoftware);
						count++;
						std::this_thread::sleep_for(std::chrono::milliseconds(500));
					}
					mConnectionManager->SetImage(imgBase64_Start, This_Operator->context, kESDSDKTarget_HardwareAndSoftware);

				});

			if (This_Operator->m_SendInput_Event_Timer == nullptr)
				This_Operator->m_SendInput_Event_Timer = new CallBackTimer;
			else if (This_Operator->m_SendInput_Event_Timer != nullptr)
			{
				This_Operator->m_SendInput_Event_Timer->stop();
				delete This_Operator->m_SendInput_Event_Timer;
				This_Operator->m_SendInput_Event_Timer = nullptr;
				This_Operator->m_SendInput_Event_Timer = new CallBackTimer;
			}
			This_Operator->m_SendInput_Event_Timer->start([=]()
				{
					New_SendInput_Event(This_Operator);
					This_Operator->Control_Thread_Quit = true;
				});



		}




	}
	else if (inAction == "com.hotspot.stream.Record")
	{
		new_operator* This_Operator;
		for (auto p : mVisibleContexts)
		{
			if (p->uuid == inAction && p->context == inContext)
			{
				This_Operator = p;
				break;
			}
		}

		if (!This_Operator->start_recording)
		{
			This_Operator->start_recording = true;

			This_Operator->Key_Value_Log_Vector.clear();
			This_Operator->Key_Time_Log_Vector.clear();
			This_Operator->Key_Position_Vector.clear();
			This_Operator->Key_Press_Data_Vector.clear();

			if (Is_Exit == false)
				Is_Exit = true;
			Sleep(50);
			HSDLogger::LogMessage("inAction:", "HotKey");
			mTimer->start([this]()
				{
					Is_Exit = false;
					HSDLogger::LogMessage("test1", "test1");
					this->UpdateTimer();
				});
			HSDLogger::LogMessage("test2", "test2");

			json Json_Value;
			Json_Value["Recording_Status"] = "Start";

			mConnectionManager->SendToPropertyInspector(This_Operator->uuid, This_Operator->context, Json_Value);

			if (This_Operator->My_Recording_Change_Image == nullptr)
				This_Operator->My_Recording_Change_Image = new CallBackTimer;
			else if (This_Operator->My_Recording_Change_Image != nullptr)
			{
				This_Operator->My_Recording_Change_Image->stop();
				delete This_Operator->My_Recording_Change_Image;
				This_Operator->My_Recording_Change_Image = nullptr;
				This_Operator->My_Recording_Change_Image = new CallBackTimer;
			}

			This_Operator->My_Recording_Change_Image->start([=]()
				{
					std::string imgBase64_Start = "";
					if (imgBase64_Start == "")
					{
						//获取图片base64编码
						std::fstream f;
						std::string Image_Path = "images\\HotKey\\循环录制.png";
						char GBK_Image_Path[200] = { 0 };
						UTF8ToGBK(Image_Path.c_str(), GBK_Image_Path);
						f.open(GBK_Image_Path, std::ios::in | std::ios::binary);
						f.seekg(0, std::ios_base::end);     //设置偏移量至文件结尾
						std::streampos sp = f.tellg();      //获取文件大小
						int size = sp;
						size += 1;
						char* buffer = (char*)malloc(sizeof(char) * size);
						f.seekg(0, std::ios_base::beg);     //设置偏移量至文件开头
						f.read(buffer, size);                //将文件内容读入buffer
						std::string imgBase64 = base64_encode(buffer, size);
						imgBase64_Start = "data:image/png;base64," + imgBase64;
					}

					std::string imgBase64_1 = "";
					if (imgBase64_1 == "")
					{
						//获取图片base64编码
						std::fstream f;
						std::string Image_Path = "images\\HotKey\\动态图PNG\\循环录制1REC.png";
						char GBK_Image_Path[200] = { 0 };
						UTF8ToGBK(Image_Path.c_str(), GBK_Image_Path);
						f.open(GBK_Image_Path, std::ios::in | std::ios::binary);
						f.seekg(0, std::ios_base::end);     //设置偏移量至文件结尾
						std::streampos sp = f.tellg();      //获取文件大小
						int size = sp;
						size += 1;
						char* buffer = (char*)malloc(sizeof(char) * size);
						f.seekg(0, std::ios_base::beg);     //设置偏移量至文件开头
						f.read(buffer, size);                //将文件内容读入buffer
						std::string imgBase64 = base64_encode(buffer, size);
						imgBase64_1 = "data:image/png;base64," + imgBase64;
					}
					std::string imgBase64_2 = "";
					if (imgBase64_2 == "")
					{
						//获取图片base64编码
						std::fstream f;
						std::string Image_Path = "images\\HotKey\\动态图PNG\\循环录制2REC.png";
						char GBK_Image_Path[200] = { 0 };
						UTF8ToGBK(Image_Path.c_str(), GBK_Image_Path);
						f.open(GBK_Image_Path, std::ios::in | std::ios::binary);
						f.seekg(0, std::ios_base::end);     //设置偏移量至文件结尾
						std::streampos sp = f.tellg();      //获取文件大小
						int size = sp;
						size += 1;
						char* buffer = (char*)malloc(sizeof(char) * size);
						f.seekg(0, std::ios_base::beg);     //设置偏移量至文件开头
						f.read(buffer, size);                //将文件内容读入buffer
						std::string imgBase64 = base64_encode(buffer, size);
						imgBase64_2 = "data:image/png;base64," + imgBase64;
					}

					int count = 0;

					while (This_Operator->start_recording)
					{
						if (count % 2 == 0)
							mConnectionManager->SetImage(imgBase64_1, This_Operator->context, kESDSDKTarget_HardwareAndSoftware);
						else if (count % 2 == 1)
							mConnectionManager->SetImage(imgBase64_2, This_Operator->context, kESDSDKTarget_HardwareAndSoftware);
						count++;
						std::this_thread::sleep_for(std::chrono::milliseconds(500));
					}
					mConnectionManager->SetImage(imgBase64_Start, This_Operator->context, kESDSDKTarget_HardwareAndSoftware);

				});

			This_Operator->StreamDock_Start_Time = std::chrono::steady_clock::now();

		}
		else if (This_Operator->start_recording)
		{
			This_Operator->start_recording = false;
			if (mVisibleContexts.empty())
			{
				Is_Exit = true;
			}
			else if (!mVisibleContexts.empty())
			{
				for (auto p : mVisibleContexts)
				{
					if (p->start_recording)
						break;
					else if (p == mVisibleContexts.back())
						Is_Exit = true;
				}
			}

			json Json_Value;
			Json_Value["Recording_Status"] = "Stop";

			mConnectionManager->SendToPropertyInspector(This_Operator->uuid, This_Operator->context, Json_Value);

			Save_Data_To_Local_File(This_Operator);

			for (auto p : mVisibleContexts)
			{
				if (p->Current_Name == This_Operator->Current_Name && p->context != This_Operator->context)
					New_Get_Data_From_Local_Config(p);
			}

		}
	}
	else if (inAction == "com.hotspot.stream.Replay")
	{
		new_operator* This_Operator;
		for (auto p : mVisibleContexts)
		{
			if (p->uuid == inAction && p->context == inContext)
			{
				This_Operator = p;
				break;

			}
		}
		//for (auto p : This_Operator->Key_Value_Log_Vector)
		//	HSDLogger::LogMessage("Key_Value_Log_Vector", std::to_string(p));
		//for (auto p : This_Operator->Key_Time_Log_Vector)
		//	HSDLogger::LogMessage("Key_Time_Log_Vector", std::to_string(p));

		if (This_Operator->My_Recording_Change_Image == nullptr)
			This_Operator->My_Recording_Change_Image = new CallBackTimer;
		else if (This_Operator->My_Recording_Change_Image != nullptr)
		{
			This_Operator->My_Recording_Change_Image->stop();
			delete This_Operator->My_Recording_Change_Image;
			This_Operator->My_Recording_Change_Image = nullptr;
			This_Operator->My_Recording_Change_Image = new CallBackTimer;
		}
		This_Operator->Control_Thread_Quit = false;

		This_Operator->My_Recording_Change_Image->start([=]()
			{
				std::string imgBase64_Start = "";
				if (imgBase64_Start == "")
				{
					//获取图片base64编码
					std::fstream f;
					std::string Image_Path = "images\\HotKey\\动态图PNG\\循环回放1.png";
					char GBK_Image_Path[200] = { 0 };
					UTF8ToGBK(Image_Path.c_str(), GBK_Image_Path);
					f.open(GBK_Image_Path, std::ios::in | std::ios::binary);
					f.seekg(0, std::ios_base::end);     //设置偏移量至文件结尾
					std::streampos sp = f.tellg();      //获取文件大小
					int size = sp;
					size += 1;
					char* buffer = (char*)malloc(sizeof(char) * size);
					f.seekg(0, std::ios_base::beg);     //设置偏移量至文件开头
					f.read(buffer, size);                //将文件内容读入buffer
					std::string imgBase64 = base64_encode(buffer, size);
					imgBase64_Start = "data:image/png;base64," + imgBase64;
				}

				std::string imgBase64_1 = "";
				if (imgBase64_1 == "")
				{
					//获取图片base64编码
					std::fstream f;
					std::string Image_Path = "images\\HotKey\\动态图PNG\\循环回放1.png";
					char GBK_Image_Path[200] = { 0 };
					UTF8ToGBK(Image_Path.c_str(), GBK_Image_Path);
					f.open(GBK_Image_Path, std::ios::in | std::ios::binary);
					f.seekg(0, std::ios_base::end);     //设置偏移量至文件结尾
					std::streampos sp = f.tellg();      //获取文件大小
					int size = sp;
					size += 1;
					char* buffer = (char*)malloc(sizeof(char) * size);
					f.seekg(0, std::ios_base::beg);     //设置偏移量至文件开头
					f.read(buffer, size);                //将文件内容读入buffer
					std::string imgBase64 = base64_encode(buffer, size);
					imgBase64_1 = "data:image/png;base64," + imgBase64;
				}
				std::string imgBase64_2 = "";
				if (imgBase64_2 == "")
				{
					//获取图片base64编码
					std::fstream f;
					std::string Image_Path = "images\\HotKey\\动态图PNG\\循环回放2.png";
					char GBK_Image_Path[200] = { 0 };
					UTF8ToGBK(Image_Path.c_str(), GBK_Image_Path);
					f.open(GBK_Image_Path, std::ios::in | std::ios::binary);
					f.seekg(0, std::ios_base::end);     //设置偏移量至文件结尾
					std::streampos sp = f.tellg();      //获取文件大小
					int size = sp;
					size += 1;
					char* buffer = (char*)malloc(sizeof(char) * size);
					f.seekg(0, std::ios_base::beg);     //设置偏移量至文件开头
					f.read(buffer, size);                //将文件内容读入buffer
					std::string imgBase64 = base64_encode(buffer, size);
					imgBase64_2 = "data:image/png;base64," + imgBase64;
				}

				int count = 0;

				while (!This_Operator->Control_Thread_Quit)
				{
					if (count % 2 == 0)
						mConnectionManager->SetImage(imgBase64_1, This_Operator->context, kESDSDKTarget_HardwareAndSoftware);
					else if (count % 2 == 1)
						mConnectionManager->SetImage(imgBase64_2, This_Operator->context, kESDSDKTarget_HardwareAndSoftware);
					count++;
					std::this_thread::sleep_for(std::chrono::milliseconds(500));
				}
				mConnectionManager->SetImage(imgBase64_Start, This_Operator->context, kESDSDKTarget_HardwareAndSoftware);

			});


		if (This_Operator->m_SendInput_Event_Timer == nullptr)
			This_Operator->m_SendInput_Event_Timer = new CallBackTimer;
		else if (This_Operator->m_SendInput_Event_Timer != nullptr)
		{
			This_Operator->m_SendInput_Event_Timer->stop();
			delete This_Operator->m_SendInput_Event_Timer;
			This_Operator->m_SendInput_Event_Timer = nullptr;
			This_Operator->m_SendInput_Event_Timer = new CallBackTimer;
		}
		This_Operator->m_SendInput_Event_Timer->start([=]()
			{
				New_SendInput_Event(This_Operator);
				This_Operator->Control_Thread_Quit = true;
			});

	}

	else if (inAction == "com.hotspot.stream.Set_HotKey")
	{
		new_operator* This_Operator;
		for (auto p : mVisibleContexts)
		{
			if (p->uuid == inAction && p->context == inContext)
			{
				This_Operator = p;
				break;
			}
		}

		if (This_Operator->m_SendInput_Event_Timer == nullptr)
			This_Operator->m_SendInput_Event_Timer = new CallBackTimer;
		else if (This_Operator->m_SendInput_Event_Timer != nullptr)
		{
			This_Operator->m_SendInput_Event_Timer->stop();
			delete This_Operator->m_SendInput_Event_Timer;
			This_Operator->m_SendInput_Event_Timer = nullptr;
			This_Operator->m_SendInput_Event_Timer = new CallBackTimer;
		}
		int replayNum = NlohmannJSONUtils::GetIntByName(inPayload, "circle_input");
		This_Operator->m_SendInput_Event_Timer->start([=]() {
			int tmpReplayNum = replayNum;
			while (tmpReplayNum > 0) {
				New_SendInput_Event(This_Operator);
				tmpReplayNum--;
			}
			});



		//for (auto p : This_Operator->Key_Value_Log_Vector)
		//	HSDLogger::LogMessage("KeyDownForAction:Key_Value_Log_Vector", std::to_string(p));
		//for (auto p : This_Operator->Key_Time_Log_Vector)
		//	HSDLogger::LogMessage("KeyDownForAction:Key_Time_Log_Vector", std::to_string(p));
		//for (auto p : This_Operator->Key_Position_Vector)
		//	HSDLogger::LogMessage("KeyDownForAction:Key_Position_Vector", std::to_string(p.first) + "," + std::to_string(p.second));

	}





}

void MyStreamDockPlugin::KeyUpForAction(const std::string& inAction, const std::string& inContext, const json& inPayload, const std::string& inDeviceID)
{
	// Nothing to do
}

void MyStreamDockPlugin::Check_KeyDwon()
{

}

void MyStreamDockPlugin::WillAppearForAction(const std::string& inAction, const std::string& inContext, const json& inPayload, const std::string& inDeviceID)
{
	//HSDLogger::LogMessage("WillAppearForAction:", "test1");
	// Remember the context
	mVisibleContextsMutex.lock();

	if (inAction == Last_Operator->uuid && inContext == Last_Operator->context)
	{
		mVisibleContexts.push_back(new new_operator(*Last_Operator));
		//mVisibleContextsMutex.unlock();
		//return;
	}
	else
	{
		mVisibleContexts.push_back(new new_operator(inAction, inContext));
	}
	//mVisibleContexts.push_back(new new_operator(inAction, inContext));

	mVisibleContextsMutex.unlock();


	std::string payload = inPayload.dump();
	HSDLogger::LogMessage("WillAppearForAction:", payload);


	if (inAction == "com.hotspot.stream.HotKey")
	{

		//new_operator* This_Operator = mVisibleContexts.back();
		new_operator* This_Operator;
		for (auto p : mVisibleContexts)
		{
			if (p->uuid == inAction && p->context == inContext)
			{
				This_Operator = p;
				break;
			}
		}

		if (payload.find("HotKey") != std::string::npos && payload.find("结束录制") == std::string::npos)
		{
			json Reset_Record_Status;
			Reset_Record_Status["Reset_Record_Status"] = "Reset_Record_Status";
			mConnectionManager->SendToPropertyInspector(inAction, inContext, Reset_Record_Status);
		}

		if (payload.find("RecordKeyValue_Save") != std::string::npos)
		{
			std::string RecordKeyValue_Save = payload.substr(payload.find("RecordKeyValue_Save"));
			RecordKeyValue_Save = RecordKeyValue_Save.substr(RecordKeyValue_Save.find_first_of("1234567890"));
			int num = std::stoi(RecordKeyValue_Save.substr(RecordKeyValue_Save.find_first_of("1234657890"),
				RecordKeyValue_Save.find_first_not_of("1234567890")));

			This_Operator->Start_Record_KeyValue = num;

		}
		else
			return;

		if (payload.find("Cursor_Position_Save") != std::string::npos)
		{
			std::string Cursor_Position_Save = payload.substr(payload.find("Cursor_Position_Save"));
			if (Cursor_Position_Save.find_first_of("]") < Cursor_Position_Save.find_first_of("1234567890"))
			{
				This_Operator->Key_Position_Vector.clear();
			}
			else
			{
				int first = 0;
				int second = 0;

				std::string Cursor_Position_Save = payload.substr(payload.find("Cursor_Position_Save"));
				Cursor_Position_Save = Cursor_Position_Save.substr(Cursor_Position_Save.find_first_of("1234567890"),
					Cursor_Position_Save.find_first_of("]") - Cursor_Position_Save.find_first_of("1234567890") + 1
				);

				while (1)
				{

					first = std::stoi(Cursor_Position_Save.substr(0, Cursor_Position_Save.find_first_not_of("1234567890")));
					Cursor_Position_Save = Cursor_Position_Save.substr(Cursor_Position_Save.find_first_not_of("1234567890"));
					Cursor_Position_Save = Cursor_Position_Save.substr(Cursor_Position_Save.find_first_of("1234567890"));
					second = std::stoi(Cursor_Position_Save.substr(0, Cursor_Position_Save.find_first_not_of("1234567890")));
					This_Operator->Key_Position_Vector.push_back(std::pair<int, int>(first, second));

					Cursor_Position_Save = Cursor_Position_Save.substr(Cursor_Position_Save.find_first_not_of("1234567890"));
					if (Cursor_Position_Save.find_first_of("1234567890") == std::string::npos)
						break;
					Cursor_Position_Save = Cursor_Position_Save.substr(Cursor_Position_Save.find_first_of("1234567890"));

				}


			}
		}

		for (auto p : This_Operator->Key_Position_Vector)
		{
			HSDLogger::LogMessage("This_Operator->Key_Position_Vector:", std::to_string(p.first) + "/" + std::to_string(p.second));
		}

		if (payload.find("Key_Time_Log_Save") != std::string::npos)
		{
			std::string Key_Time_Log_Save = payload.substr(payload.find("Key_Time_Log_Save"));
			Key_Time_Log_Save = Key_Time_Log_Save.substr(Key_Time_Log_Save.find_first_of("1234567890"),
				Key_Time_Log_Save.find_first_of("]") - Key_Time_Log_Save.find_first_of("1234567890") + 1
			);
			int num = 0;

			while (1)
			{
				num = std::stoi(Key_Time_Log_Save.substr(0, Key_Time_Log_Save.find_first_not_of("1234567890")));
				This_Operator->Key_Time_Log_Vector.push_back(num);

				Key_Time_Log_Save = Key_Time_Log_Save.substr(Key_Time_Log_Save.find_first_not_of("1234567890"));
				if (Key_Time_Log_Save.find_first_of("1234567890") == std::string::npos)
					break;
				Key_Time_Log_Save = Key_Time_Log_Save.substr(Key_Time_Log_Save.find_first_of("1234567890"));
			}


		}

		if (payload.find("Key_Value_Log_Save") != std::string::npos)
		{
			std::string Key_Value_Log_Save = payload.substr(payload.find("Key_Value_Log_Save"));
			Key_Value_Log_Save = Key_Value_Log_Save.substr(Key_Value_Log_Save.find_first_of("1234567890"),
				Key_Value_Log_Save.find_first_of("]") - Key_Value_Log_Save.find_first_of("1234567890") + 1
			);
			int num = 0;

			while (1)
			{
				num = std::stoi(Key_Value_Log_Save.substr(0, Key_Value_Log_Save.find_first_not_of("1234567890")));
				This_Operator->Key_Value_Log_Vector.push_back(num);

				Key_Value_Log_Save = Key_Value_Log_Save.substr(Key_Value_Log_Save.find_first_not_of("1234567890"));
				if (Key_Value_Log_Save.find_first_of("1234567890") == std::string::npos)
					break;
				Key_Value_Log_Save = Key_Value_Log_Save.substr(Key_Value_Log_Save.find_first_of("1234567890"));
			}


		}

		//This_Operator->Key_Position_Vector_Iterator = &(This_Operator->Key_Position_Vector.end() - 1);
		//This_Operator->Key_Time_Log_Vector_Iterator = &(This_Operator->Key_Time_Log_Vector.end() - 1);
		//This_Operator->Key_Value_Log_Vector_Iterator = &(This_Operator->Key_Value_Log_Vector.end() - 1);
		This_Operator->Vector_Size = This_Operator->Key_Value_Log_Vector.size();
		This_Operator->Positon_Vector_Size = This_Operator->Key_Position_Vector.size();


		This_Operator->start_recording = false;


		//for (auto p : mVisibleContexts)
		//{
		//	if (p->uuid == inAction && p->context == inContext)
		//	{

		//		if (payload.find("HotKey") != std::string::npos && payload.find("结束录制") == std::string::npos)
		//		{
		//			json Reset_Record_Status;
		//			Reset_Record_Status["Reset_Record_Status"] = "Reset_Record_Status";
		//			mConnectionManager->SendToPropertyInspector(inAction, inContext, Reset_Record_Status);
		//		}

		//		if (payload.find("RecordKeyValue_Save") != std::string::npos)
		//		{
		//			std::string RecordKeyValue_Save = payload.substr(payload.find("RecordKeyValue_Save"));
		//			RecordKeyValue_Save = RecordKeyValue_Save.substr(RecordKeyValue_Save.find_first_of("1234567890"));
		//			int num = std::stoi ( RecordKeyValue_Save.substr(RecordKeyValue_Save.find_first_of("1234657890"),
		//				RecordKeyValue_Save.find_first_not_of("1234567890") ) );

		//			p->Start_Record_KeyValue = num;

		//		}

		//		if ( payload.find("Cursor_Position_Save") != std::string::npos)
		//		{
		//			std::string Cursor_Position_Save = payload.substr(payload.find("Cursor_Position_Save"));
		//			if (Cursor_Position_Save.find_first_of("]") < Cursor_Position_Save.find_first_of("1234567890"))
		//			{
		//				p->Key_Position_Vector.clear();
		//			}
		//		}



		//	}

		//}

	}
	else if (inAction == "com.hotspot.stream.Record_Replay" || inAction == "com.hotspot.stream.Record" || inAction == "com.hotspot.stream.Replay"
		|| inAction == "com.hotspot.stream.Set_HotKey")
	{
		new_operator* This_Operator;
		for (auto p : mVisibleContexts)
		{
			if (p->uuid == inAction && p->context == inContext)
			{
				This_Operator = p;
				break;
			}
		}// 问题可能在这里，切换后点击会出现relog重复
		std::string Record_Current_Value = "";
		if (payload.find("Record_Current_Value") != std::string::npos)
		{
			/*std::string */Record_Current_Value = payload.substr(payload.find("Record_Current_Value"));
			Record_Current_Value = Record_Current_Value.substr(Record_Current_Value.find_first_of(":"),
				Record_Current_Value.find_first_of(",") - Record_Current_Value.find_first_of(":"));
			Record_Current_Value = Record_Current_Value.substr(2, Record_Current_Value.size() - 2 - 1);
			This_Operator->Current_Name = Record_Current_Value;
			HSDLogger::LogMessage("Record_Current_Value", Record_Current_Value);
			HSDLogger::LogMessage("Current_Name", This_Operator->Current_Name);

			HSDLogger::LogMessage("=================tetsttstst11", Record_Current_Value);
			New_Get_Data_From_Local_Config(This_Operator);
		}
		HSDLogger::LogMessage("Is_First_Time_Click:WillAppear", "1");

		if (payload.find("Has_Recorded") != std::string::npos)
		{
			HSDLogger::LogMessage("Is_First_Time_Click:WillAppear", "2");
			std::string Has_Recorded = payload.substr(payload.find("Has_Recorded"));
			HSDLogger::LogMessage("Is_First_Time_Click:WillAppear", Has_Recorded);
			Has_Recorded = Has_Recorded.substr(Has_Recorded.find_first_of("1234567890"), 1);
			HSDLogger::LogMessage("Is_First_Time_Click:WillAppear", Has_Recorded);
			int Has_Recorded_Num = std::stoi(Has_Recorded);
			HSDLogger::LogMessage("Is_First_Time_Click:WillAppear", std::to_string(Has_Recorded_Num));
			if (Has_Recorded_Num == 1)
			{
				This_Operator->Is_First_Time_Click = false;
				HSDLogger::LogMessage("Is_First_Time_Click:WillAppear", "false");
				if (This_Operator->uuid == "com.hotspot.stream.Record_Replay")
				{
					std::string imgBase64_All = "";
					//获取图片base64编码
					std::fstream f;
					std::string Image_Path = "images\\HotKey\\动态图PNG\\回放1.png";
					char GBK_Image_Path[200] = { 0 };
					UTF8ToGBK(Image_Path.c_str(), GBK_Image_Path);
					f.open(GBK_Image_Path, std::ios::in | std::ios::binary);
					f.seekg(0, std::ios_base::end);     //设置偏移量至文件结尾
					std::streampos sp = f.tellg();      //获取文件大小
					int size = sp;
					size += 1;
					char* buffer = (char*)malloc(sizeof(char) * size);
					f.seekg(0, std::ios_base::beg);     //设置偏移量至文件开头
					f.read(buffer, size);                //将文件内容读入buffer
					std::string imgBase64 = base64_encode(buffer, size);
					imgBase64_All = "data:image/png;base64," + imgBase64;

					mConnectionManager->SetImage(imgBase64_All, This_Operator->context, kESDSDKTarget_HardwareAndSoftware);
				}
			}

		}
		if (payload.find("Mouse_track") != std::string::npos)
		{
			std::string Mouse_track = payload.substr(payload.find("Mouse_track"), 20);
			Mouse_track = Mouse_track.substr(Mouse_track.find_first_of(":"));
			Mouse_track = Mouse_track.substr(1, Mouse_track.find_first_of(",") - 1);
			HSDLogger::LogMessage("WillAppearForAction:Mouse_track", Mouse_track);

			if (Mouse_track == "true")
			{
				This_Operator->Is_Show_Mouse_track = true;
			}
			else if (Mouse_track == "false")
			{
				This_Operator->Is_Show_Mouse_track = false;
			}
		}//Delete_Delay

		if (payload.find("Relative_coordinates") != std::string::npos)
		{
			std::string Relative_coordinates = payload.substr(payload.find("Relative_coordinates"), 36);
			Relative_coordinates = Relative_coordinates.substr(Relative_coordinates.find_first_of(":"));
			Relative_coordinates = Relative_coordinates.substr(1, Relative_coordinates.find_first_of(",") - 1);
			HSDLogger::LogMessage("WillAppearForAction:Relative_coordinates", Relative_coordinates);

			if (Relative_coordinates == "true")
			{
				This_Operator->Is_Relative_coordinates = true;
			}
			else if (Relative_coordinates == "false")
			{
				This_Operator->Is_Relative_coordinates = false;
			}
		}//Delete_Delay

		if (payload.find("Delete_Delay") != std::string::npos)
		{
			std::string Delete_Delay = payload.substr(payload.find("Delete_Delay"), 20);
			Delete_Delay = Delete_Delay.substr(Delete_Delay.find_first_of(":"));
			Delete_Delay = Delete_Delay.substr(1, Delete_Delay.find_first_of(",") - 1);


			if (Delete_Delay == "true")
			{
				This_Operator->Is_Delete_Delay = true;
			}
			else if (Delete_Delay == "false")
			{
				This_Operator->Is_Delete_Delay = false;
			}
		}//Delete_Delay

		if (payload.find("Already_Record") != std::string::npos)
		{
			std::string Already_Record = payload.substr(payload.find("Already_Record"), 20);
			Already_Record = Already_Record.substr(Already_Record.find_first_of(":"));
			Already_Record = Already_Record.substr(1, Already_Record.find_first_of(",") - 1);


			if (Already_Record == "true")
			{
				This_Operator->Already_Record = true;
			}
			else if (Already_Record == "false")
			{
				This_Operator->Already_Record = false;
			}
		}//Already_Record


		HSDLogger::LogMessage("Last_Operator:uuid", Last_Operator->uuid);
		HSDLogger::LogMessage("Last_Operator:context", Last_Operator->context);
		HSDLogger::LogMessage("This_Operator:uuid", This_Operator->uuid);
		HSDLogger::LogMessage("This_Operator:context", This_Operator->context);

		if (
			(Last_Operator->uuid == "" && Last_Operator->context == "")
			|| (This_Operator->uuid != Last_Operator->uuid || This_Operator->context != Last_Operator->context)
			)
		{
			HSDLogger::LogMessage("WillappearForAction:", "test1");
			HSDLogger::LogMessage("Record_Current_Value:", Record_Current_Value);
			HSDLogger::LogMessage("WillappearForAction:Current_Name1", This_Operator->Current_Name);

			if (This_Operator->Current_Name == "" && Record_Current_Value != "")
				This_Operator->Current_Name = Record_Current_Value;
			HSDLogger::LogMessage("WillappearForAction:Current_Name2", This_Operator->Current_Name);
			New_Send_New_Config_List_To_PropertyInspector(This_Operator);
			HSDLogger::LogMessage("WillappearForAction:", "test2");
			New_Get_Data_From_Local_Config(This_Operator);
			HSDLogger::LogMessage("WillappearForAction:", "test3");
		}


		if (
			inAction == "com.hotspot.stream.Record_Replay" || inAction == "com.hotspot.stream.Record"
			)
		{

			//bool Is_Action_New = false;

			std::string Payload_Content = "";
			Payload_Content = payload.substr(payload.find("settings"));
			Payload_Content = Payload_Content.substr(Payload_Content.find_first_of("{"));
			if (Payload_Content[1] == '}')
				This_Operator->Is_Action_New = true;

			//if (This_Operator->Is_Action_New)
			//{
			//	HSDLogger::LogMessage("WillappearForAction:Is_Action_New", "true");
			//	HSDLogger::LogMessage("WillappearForAction:Last_uuid", Last_Operator->uuid);
			//	HSDLogger::LogMessage("WillappearForAction:Last_context", Last_Operator->context);
			//}


			if (
				This_Operator->Is_Action_New
				&&
				( /*This_Operator->uuid != Last_Operator->uuid &&*/ This_Operator->context != Last_Operator->context)
				)
			{
				//HSDLogger::LogMessage("WillappearForAction:Create_New_File", "test1");
				bool Is_File_Name_Exist = true;
				int count = 1;
				std::string New_File_Name = "";
				//do
				//{
					//New_File_Name = "宏录制" + std::to_string(count);
				int i = 0;
				while (Is_File_Name_Exist)
				{
					New_File_Name = "宏录制" + std::to_string(count);
					if (new_operator::Record_Config_Names_Vector.empty())
						break;
					for (auto p : new_operator::Record_Config_Names_Vector)
					{
						//HSDLogger::LogMessage("WillappearForAction:Record_Config_Names_Vector", p);
						//New_File_Name = "宏录制" + std::to_string(count);
						if (p.find("宏录制") == std::string::npos && p != new_operator::Record_Config_Names_Vector.back())
							continue;
						if (New_File_Name == p)
						{
							//Is_File_Name_Exist = true;
							count++;
							break;
							//continue;
						}
						if (p == new_operator::Record_Config_Names_Vector.back())
						{
							Is_File_Name_Exist = false;
							//break;
						}

						//if (New_File_Name != p)
						//{
						//	//Is_File_Name_Exist = false;
						//	//New_File_Name = "config/" + New_File_Name;
						//	//New_File_Name += ".ini";
						//	//std::fstream Create_File(New_File_Name, std::ios::out);
						//	Create_New_File(New_File_Name);
						//	This_Operator->Current_Name = New_File_Name;
						//	HSDLogger::LogMessage("WillappearForAction:Current_Name", This_Operator->Current_Name);
						//	break;
						//}

					}
					//HSDLogger::LogMessage("WillappearForAction:New_File_Name", New_File_Name);
					//i++;
					//if( i == 5)
					//	break;
					//if (!Is_File_Name_Exist)
					//	break;

				}
				Create_New_File(New_File_Name);
				This_Operator->Current_Name = New_File_Name;
				HSDLogger::LogMessage("WillappearForAction:Current_Name", This_Operator->Current_Name);

				New_Send_New_Config_List_To_PropertyInspector(This_Operator);

				//json Change_Record_Selected;
				//Change_Record_Selected["Change_Record_Selected"] = This_Operator->Current_Name;
				//mConnectionManager->SendToPropertyInspector(This_Operator->uuid,This_Operator->context, Change_Record_Selected);

				//This_Operator->Is_Action_New = false;

				New_Get_Data_From_Local_Config(This_Operator);
				//} while (Is_File_Name_Exist);

			}

		}






	}

}

void MyStreamDockPlugin::WillDisappearForAction(const std::string& inAction, const std::string& inContext, const json& inPayload, const std::string& inDeviceID)
{
	// Remove the context
	mVisibleContextsMutex.lock();

	for (std::list<new_operator*>::iterator get_operator = mVisibleContexts.begin(); get_operator != mVisibleContexts.end(); get_operator++)
	{
		if ((**get_operator).uuid == inAction && (**get_operator).context == inContext)
		{
			if (Last_Operator->uuid != inAction && Last_Operator->context != inContext)
			{
				delete Last_Operator;
				Last_Operator = *get_operator;
			}
			//Last_Operator = nullptr;
			//Last_Operator = new new_operator(**get_operator);
			mVisibleContexts.erase(get_operator);
			//delete* get_operator;
			break;
		}
	}

	mVisibleContextsMutex.unlock();

	std::string WillDisappearForAction = inPayload.dump();
	HSDLogger::LogMessage("WillDisappearForAction:", WillDisappearForAction);

	if (inAction == "com.hotspot.stream.HotKey")
	{
		if (inContext == /*Current_Operator*/Last_Operator->context)
		{
			//Is_Exit = true;
			HSDLogger::LogMessage("test8", "test8");

			Last_Operator->start_recording = false;

			for (auto p : mVisibleContexts)
			{

				if (p->start_recording)
					break;
				else if (p == mVisibleContexts.back())
				{
					Is_Exit = true;
				}
			}
			if (mVisibleContexts.empty())
			{
				Is_Exit = true;
			}

		}


	}

}


void MyStreamDockPlugin::TitleParametersDidChange(const std::string& inAction, const std::string& inContext, const nlohmann::json& inPayload, const std::string& inDeviceID)
{

}

void MyStreamDockPlugin::DidReceiveSettings(
	const std::string& inAction,
	const std::string& inContext,
	const nlohmann::json& inPayload,
	const std::string& inDeviceID)
{

	//std::string payload = inPayload.dump();
	//HSDLogger::LogMessage("DidReceiveSettings", payload);

	//if (inAction == "com.hotspot.stream.HotKey")
	//{

	//	if (!Current_Operator->start_recording && (payload.find("HotKey") != std::string::npos && payload.find("结束录制") == std::string::npos))
	//	{
	//		if (payload.find("结束录制") > -1 )
	//			return;
	//		json Reset_Record_Status;
	//		Reset_Record_Status["Reset_Record_Status"] = "Reset_Record_Status";
	//		mConnectionManager->SendToPropertyInspector(inAction, inContext, Reset_Record_Status);
	//		HSDLogger::LogMessage("test", "Reset_Record_Status");

	//	}

	//}


}


void MyStreamDockPlugin::PropertyInspectorDidAppear(const std::string& inAction, const std::string& inContext, const nlohmann::json& inPayload, const std::string& inDeviceID)
{
	std::string PropertyInspectorDidAppear = inPayload.dump();
	HSDLogger::LogMessage("PropertyInspectorDidAppear:", PropertyInspectorDidAppear);

	if (inAction == "com.hotspot.stream.HotKey")
	{
		//ReplayMutex.lock();

		for (auto p : mVisibleContexts)
		{

			//if (p->uuid == Last_Operator->uuid && p->context == Last_Operator->context)
			//{
			//	*p = *Last_Operator;
			//}

			if (p->uuid == inAction && p->context == inContext)
			{
				Current_Operator = p;
				break;
			}

		}
		HSDLogger::LogMessage("PropertyInspectorDidAppear:", "test0");

		Restore_Log();


		for (auto p : Current_Operator->Key_Value_Log_Vector)
		{
			HSDLogger::LogMessage("PropertyInspectorDidAppear---Key_Value_Log_Vector:", std::to_string(p));
		}
		for (auto p : Current_Operator->Key_Time_Log_Vector)
		{
			HSDLogger::LogMessage("PropertyInspectorDidAppear---Key_Time_Log_Vector:", std::to_string(p));
		}

		//  不能使用迭代器的地址
		//if (
		//	*Current_Operator->Key_Position_Vector_Iterator != Current_Operator->Key_Position_Vector.end() -1
		//	|| *Current_Operator->Key_Time_Log_Vector_Iterator != Current_Operator->Key_Time_Log_Vector.end() -1
		//	|| *Current_Operator->Key_Value_Log_Vector_Iterator != Current_Operator->Key_Value_Log_Vector.end() -1
		//	)
		//{
		//	HSDLogger::LogMessage("PropertyInspectorDidAppear:", "test1");
		//	for (auto p = *Current_Operator->Key_Value_Log_Vector_Iterator; p != Current_Operator->Key_Value_Log_Vector.end(); p++)
		//	{
		//		if (*p < 256)
		//		{
		//			unsigned long This_Time = Current_Operator->Start_Time;

		//			for (auto p2 = Current_Operator->Key_Time_Log_Vector.begin(); p2 != Current_Operator->Key_Time_Log_Vector_Iterator + 1; p2++)
		//			{
		//				This_Time += *p2;
		//			}

		//			HSDLogger::LogMessage("PropertyInspectorDidAppear:", "test2");
		//			json Restore_Click_Log;
		//			if (Current_Operator->Is_Down_Log[*p] == false)
		//			{
		//				Restore_Click_Log["KeyBoardValue"] = std::to_string(0) + "/" + std::to_string(*p) + "/" + std::to_string(This_Time);
		//				Current_Operator->Is_Down_Log[*p] = true;
		//			}
		//			else if (Current_Operator->Is_Down_Log[*p] == true)
		//			{
		//				Restore_Click_Log["KeyBoardValue"] = std::to_string(128) + "/" + std::to_string(*p) + "/" + std::to_string(This_Time);
		//				Current_Operator->Is_Down_Log[*p] = false;
		//			}
		//			HSDLogger::LogMessage("PropertyInspectorDidAppear:", "test3");
		//			mConnectionManager->SendToPropertyInspector(Current_Operator->uuid, Current_Operator->context, Restore_Click_Log);
		//		}
		//	}
		//}

		//注册钩子
		if (Is_Exit == false)
			Is_Exit = true;
		Sleep(50);
		HSDLogger::LogMessage("inAction:", "HotKey");
		mTimer->start([this]()
			{
				Is_Exit = false;
				HSDLogger::LogMessage("test1", "test1");
				this->UpdateTimer();
			});
		HSDLogger::LogMessage("test2", "test2");

		if (!Current_Operator->start_recording)
		{
			json Reset_Record_Status;
			Reset_Record_Status["Reset_Record_Status"] = "Reset_Record_Status";
			mConnectionManager->SendToPropertyInspector(inAction, inContext, Reset_Record_Status);
			HSDLogger::LogMessage("test", "Reset_Record_Status");
		}
		//ReplayMutex.unlock();

	}
	else if (inAction == "com.hotspot.stream.Record_Replay" || inAction == "com.hotspot.stream.Record" || inAction == "com.hotspot.stream.Replay"
		|| inAction == "com.hotspot.stream.Set_HotKey"
		)
	{
		new_operator* This_Operator;
		for (auto p : mVisibleContexts)
		{
			if (p->uuid == inAction && p->context == inContext)
			{
				This_Operator = p;
				Current_Operator = p;
				break;
			}

		}
		//for (auto p : This_Operator->Key_Press_Release_Vector)
		//{
		//	if(p)
		//		HSDLogger::LogMessage("PropertyInspectorDidAppear:Key_Press_Release_Vector", "true1");
		//	else if(!p)
		//		HSDLogger::LogMessage("PropertyInspectorDidAppear:Key_Press_Release_Vector", "false0");
		//}

		json Current_Name;
		Current_Name["Current_Name"] = This_Operator->Current_Name;
		mConnectionManager->SendToPropertyInspector(This_Operator->uuid, This_Operator->context, Current_Name);

		New_Send_New_Config_List_To_PropertyInspector(This_Operator);
		New_Get_Data_From_Local_Config(This_Operator);

		//Restore_Log();
		//if (This_Operator->Is_Delete_Delay == false)
		//	HSDLogger::LogMessage("SendInput_Event:Is_Delete_Delay", "false");
		//else if (This_Operator->Is_Delete_Delay == true)
		//	HSDLogger::LogMessage("SendInput_Event:Is_Delete_Delay", "true");

		if (inAction == "com.hotspot.stream.Set_HotKey")
		{
			//注册钩子
			if (Is_Exit == false)
				Is_Exit = true;
			Sleep(50);
			HSDLogger::LogMessage("inAction:", "HotKey");
			mTimer->start([this]()
				{
					Is_Exit = false;
					HSDLogger::LogMessage("test1", "test1");
					std::this_thread::sleep_for(std::chrono::milliseconds(1000));
					this->UpdateTimer();
				});
			HSDLogger::LogMessage("test2", "test2");
		}

		if (inAction == "com.hotspot.stream.Record_Replay" || inAction == "com.hotspot.stream.Record")
		{
			if (This_Operator->Is_Action_New)
			{
				json Change_Record_Selected;
				Change_Record_Selected["Change_Record_Selected"] = This_Operator->Current_Name;
				mConnectionManager->SendToPropertyInspector(This_Operator->uuid, This_Operator->context, Change_Record_Selected);

				This_Operator->Is_Action_New = false;

			}
		}


	}

}

void MyStreamDockPlugin::PropertyInspectorDidDisappear(const std::string& inAction, const std::string& inContext, const nlohmann::json& inPayload, const std::string& inDeviceID)
{
	std::string PropertyInspectorDidDisappear = inPayload.dump();
	HSDLogger::LogMessage("PropertyInspectorDidDisappear:", PropertyInspectorDidDisappear);

	if (inAction == "com.hotspot.stream.HotKey")
	{
		//PostQuitMessage(0);
		//Is_Exit = true;
		HSDLogger::LogMessage("test6", "test6");
		//mTimer->stop();

		bool Is_Quit = true;

		//new_operator* This_Operator = nullptr;

		for (auto p : mVisibleContexts)
		{
			//if (p->uuid == inAction && p->context == inContext)
			//{
			//	This_Operator = p;
			//}

			if (p->start_recording)
			{
				HSDLogger::LogMessage("Is_Exit", "false");
				Is_Quit = false;
				break;
			}



			//else if (p == mVisibleContexts.back() /*&& Is_Quit*/)
			//{
			//	Is_Exit = true;
			//	return;
			//}
		}
		if (Is_Quit)
			Is_Exit = true;
		HSDLogger::LogMessage("test90", "test90");


		for (auto p : mVisibleContexts)
		{
			if (p->start_recording && p->uuid == inAction && p->context == inContext)
			{
				//p->Vector_Size = p->Key_Value_Log_Vector.size() - 1;
				p->Vector_Size = p->Key_Value_Log_Vector.size();
				if (p->Key_Value_Log_Vector[p->Vector_Size] > 256)
					//if(!p->Key_Position_Vector.empty())
					//p->Positon_Vector_Size = p->Key_Position_Vector.size() - 1;
					p->Positon_Vector_Size = p->Key_Position_Vector.size();
				else
					//p->Positon_Vector_Size = p->Key_Position_Vector.size();
					p->Positon_Vector_Size = p->Key_Position_Vector.size();
				for (int i = 0; i < 256; i++)
				{
					p->Is_Down_Log[i] = p->Is_Down[i];
				}

			}

		}

		for (auto p : Current_Operator->Key_Value_Log_Vector)
		{
			HSDLogger::LogMessage("PropertyInspectorDidAppear---Key_Value_Log_Vector:", std::to_string(p));
		}
		for (auto p : Current_Operator->Key_Time_Log_Vector)
		{
			HSDLogger::LogMessage("PropertyInspectorDidAppear---Key_Time_Log_Vector:", std::to_string(p));
		}


		//int add = (int) & (This_Operator->Key_Position_Vector.end() - 1);

		//This_Operator->Key_Position_Vector_Iterator = &(This_Operator->Key_Position_Vector.end() - 1);
		//This_Operator->Key_Time_Log_Vector_Iterator = &(This_Operator->Key_Time_Log_Vector.end() - 1);
		//This_Operator->Key_Value_Log_Vector_Iterator = &(This_Operator->Key_Value_Log_Vector.end() - 1);

		// 容器使用序号的
		//This_Operator->Vector_Size = This_Operator->Key_Value_Log_Vector.size();
		//This_Operator->Positon_Vector_Size = This_Operator->Key_Position_Vector.size();

		//for (int i = 0; i < 256; i++)
		//{
		//	This_Operator->Is_Down_Log[i] = This_Operator->Is_Down[i];
		//}


		//if (This_Operator->start_recording)
		//{
		//	This_Operator->Key_Position_Vector_Iterator = This_Operator->Key_Position_Vector.end() -1;
		//	This_Operator->Key_Time_Log_Vector_Iterator = This_Operator->Key_Time_Log_Vector.end() -1;
		//	This_Operator->Key_Value_Log_Vector_Iterator = This_Operator->Key_Value_Log_Vector.end() -1;
		//	for (int i = 0; i < 256; i++)
		//	{
		//		This_Operator->Is_Down_Log[i] = This_Operator->Is_Down[i];
		//	}
		//}
		HSDLogger::LogMessage("test91", "test91");

		Current_Operator = nullptr;

	}
	else if (inAction == "com.hotspot.stream.Record_Replay" || inAction == "com.hotspot.stream.Record" /*|| inAction == "com.hotspot.stream.Replay"*/)
	{

		for (auto p : mVisibleContexts)
		{
			if (p->start_recording && p->uuid == inAction && p->context == inContext)
			{
				//p->Vector_Size = p->Key_Value_Log_Vector.size() - 1;
				p->Vector_Size = p->Key_Value_Log_Vector.size();
				if (p->Key_Value_Log_Vector[p->Vector_Size] > 256)
					//if(!p->Key_Position_Vector.empty())
					//p->Positon_Vector_Size = p->Key_Position_Vector.size() - 1;
					p->Positon_Vector_Size = p->Key_Position_Vector.size();
				else
					//p->Positon_Vector_Size = p->Key_Position_Vector.size();
					p->Positon_Vector_Size = p->Key_Position_Vector.size();
				for (int i = 0; i < 256; i++)
				{
					p->Is_Down_Log[i] = p->Is_Down[i];
				}

			}

		}

		//for (auto p : mVisibleContexts)
		//{
		//	if (p->start_recording && p->uuid == inAction && p->context == inContext)
		//	{
		//		p->Vector_Size = p->Key_Value_Log_Vector.size() - 1;
		//		if (p->Key_Value_Log_Vector[p->Vector_Size] > 256)
		//			//if(!p->Key_Position_Vector.empty())
		//			p->Positon_Vector_Size = p->Key_Position_Vector.size() - 1;
		//		else
		//			p->Positon_Vector_Size = p->Key_Position_Vector.size();

		//		for (int i = 0; i < 256; i++)
		//		{
		//			p->Is_Down_Log[i] = p->Is_Down[i];
		//		}
		//	}
		//}

		Current_Operator = nullptr;
	}
	else if (inAction == "com.hotspot.stream.Set_HotKey")
	{

		new_operator* This_Operator;
		for (auto p : mVisibleContexts)
		{
			if (p->uuid == inAction && p->context == inContext)
			{
				This_Operator = p;
				break;
			}
		}

		This_Operator->start_recording = false;

		bool Is_Quit = true;

		//new_operator* This_Operator = nullptr;

		for (auto p : mVisibleContexts)
		{

			if (p->start_recording)
			{
				HSDLogger::LogMessage("Is_Exit", "false");
				Is_Quit = false;
				break;
			}

		}
		if (Is_Quit)
			Is_Exit = true;

	}

}


void MyStreamDockPlugin::DeviceDidConnect(const std::string& inDeviceID, const json& inDeviceInfo)
{
	// Nothing to do
}

void MyStreamDockPlugin::DeviceDidDisconnect(const std::string& inDeviceID)
{
	// Nothing to do
}

void MyStreamDockPlugin::SendToPlugin(const std::string& inAction, const std::string& inContext, const json& inPayload, const std::string& inDeviceID)
{
	std::string payload = inPayload.dump();
	HSDLogger::LogMessage("SendToPlugin", payload);

	std::string title;
	title = payload.substr(payload.find_first_of("{"));
	title = title.substr(2, title.find_first_of(":") - 2 - 2 + 1);

	std::string content;
	content = payload.substr(payload.find_first_of("{"));
	content = content.substr(content.find_first_of(":"));
	content = content.substr(2, content.find_last_of("}") - 2 - 2 + 1);

	HSDLogger::LogMessage("SendToPlugin_title", title);
	HSDLogger::LogMessage("SendToPlugin_content", content);

	if (inAction == "com.hotspot.stream.HotKey")
	{
		if (payload.find("Set_RecordKey") != std::string::npos && Current_Operator != nullptr)
			Current_Operator->Set_RecordKey = true;

		if (payload.find("Restore_Hook") != std::string::npos)
		{
			if (Is_Exit == false)
				Is_Exit = true;
			Sleep(50);
			HSDLogger::LogMessage("Restore_Hook", "1");
			mTimer->start([this]()
				{
					Is_Exit = false;
					HSDLogger::LogMessage("Restore_Hook", "2");
					this->UpdateTimer();
				});
			HSDLogger::LogMessage("Restore_Hook", "3");
		}
	}
	else if (inAction == "com.hotspot.stream.Record_Replay" || inAction == "com.hotspot.stream.Record" || inAction == "com.hotspot.stream.Replay"
		|| inAction == "com.hotspot.stream.Set_HotKey"
		)
	{
		if (payload.find("宏录制") != std::string::npos)
		{
			HSDLogger::LogMessage("Record_Replay", "find_text!");
		}

		if (title == "Add_Config")
		{

			for (auto p : new_operator::Record_Config_Names_Vector)
			{
				if (content == p)
				{
					char GBK_Content[200];
					char GBK_Title[200];
					UTF8ToGBK("已有该命名的宏录制，请更换名字后重试!", GBK_Content);
					UTF8ToGBK("错误提示", GBK_Title);
					MessageBoxA(NULL, GBK_Content, GBK_Title, MB_OK);
					return;
				}
			}

			new_operator* This_Operator;
			for (auto p : mVisibleContexts)
			{
				if (p->uuid == inAction && p->context == inContext)
				{
					This_Operator = p;
					break;
				}
			}

			HSDLogger::LogMessage("title", "Add_Config!");

			Create_New_File(content);
			//std::string File_Name_Str = "config/" + content + ".ini";
			//char File_Name[200];
			//UTF8ToGBK(File_Name_Str.c_str(), File_Name);
			//std::fstream Add_Config(File_Name, std::ios::out);
			//Add_Config << "{Key_Time_Log_Vector:[];\n" << "Key_Value_Log_Vector:[];\n" << "Key_Press_Data_Vector:[];\n" << "Key_Position_Vector:[];\n"
			//	<< "Key_Still_Press_Release:false;}\n";
			//Add_Config.close();
			//This_Operator->/*new_operator::*/Record_Config_Names_Vector.push_back(content);

			//HSDLogger::LogMessage("Record_Config_Names_Vector", new_operator::Record_Config_Names_Vector[0]);
			//Add_Config.open("config_list.ini", std::ios::in | std::ios::out | std::ios::app);
			//Add_Config << content << '\n';
			//Add_Config.close();

			This_Operator->Current_Name = content;
			//New_Get_Data_From_Local_Config(This_Operator);

		}
		else if (title == "Delete_Config")
		{
			new_operator* This_Operator;
			for (auto p : mVisibleContexts)
			{
				if (p->uuid == inAction && p->context == inContext)
				{
					This_Operator = p;
					break;

				}
			}

			HSDLogger::LogMessage("title", "Delete_Config!");
			//std::ifstream Delete_Config_Fstream("config.ini", std::ios::in | std::ios::out);
			//std::string Delete_Str;
			//std::vector<std::string>Config_Str_Vector;
			//int count = 0;
			//bool Is_Delete_Str = false;
			//while (getline(Delete_Config_Fstream, Delete_Str))
			//{

			//	if (Delete_Str.find("{config" + content + ":") != std::string::npos)
			//	{
			//		Is_Delete_Str = true;
			//	}
			//	if (Is_Delete_Str && count < 4)
			//	{
			//		count++;
			//		continue;
			//	}
			//	Config_Str_Vector.push_back(Delete_Str /*+ '\n'*/);

			//}
			//Delete_Config_Fstream.close();

			//std::fstream New_Config("config.ini", std::ios::in | std::ios::out | std::ios::trunc);
			//for (auto p : Config_Str_Vector)
			//{
			//	New_Config << p + '\n';
			//}
			//New_Config.close();
			std::string File_Path_Str = "config/" + content + ".ini";
			char File_Path[200];
			UTF8ToGBK(File_Path_Str.c_str(), File_Path);

			if (remove(File_Path) == 0) //返回值为0，即删除成功，返回值-1，即删除失败
			{
				for (auto p = This_Operator->Record_Config_Names_Vector.begin(); p != This_Operator->Record_Config_Names_Vector.end(); p++)
				{
					if (*p == content)
					{
						This_Operator->Record_Config_Names_Vector.erase(p);
						break;

					}

				}
				std::fstream Delete_Config("config_list.ini", std::ios::in | std::ios::out);
				std::string Delete_Config_String = "";
				std::vector<std::string>Delete_Config_Vector;
				while (getline(Delete_Config, Delete_Config_String))
				{
					if (Delete_Config_String != content)
						Delete_Config_Vector.push_back(Delete_Config_String);
				}
				Delete_Config.close();
				Delete_Config.open("config_list.ini", std::ios::in | std::ios::out | std::ios::trunc);
				for (auto p : Delete_Config_Vector)
				{
					Delete_Config << p;
					Delete_Config << '\n';
				}
				Delete_Config.close();
			}


			//下次修改从此开始
			if (This_Operator->Record_Config_Names_Vector.empty())
			{
				This_Operator->Current_Name = "";
				for (auto p : mVisibleContexts)
				{
					if (p->Current_Name == content)
						p->Current_Name = "";
				}
			}
			else if (!This_Operator->Record_Config_Names_Vector.empty())
			{
				This_Operator->Current_Name == This_Operator->Record_Config_Names_Vector[0];
				for (auto p : mVisibleContexts)
				{
					if (p->Current_Name == content)
						p->Current_Name = new_operator::Record_Config_Names_Vector[0];
				}
			}

			New_Get_Data_From_Local_Config(This_Operator);



		}
		else if (title == "Already_Record" || title == "Change_Select")
		{
			HSDLogger::LogMessage("title", "Change_Select!");
			new_operator* This_Operator;

			std::string Already_Record = "";
			if (payload.find("Already_Record") != std::string::npos)
			{
				/*std::string */Already_Record = payload.substr(payload.find("Already_Record"));
				Already_Record = Already_Record.substr(Already_Record.find_first_of(":") + 1);
				Already_Record = Already_Record.substr(0, Already_Record.find_first_of(",}"));

			}


			std::string Content_Name = payload.substr(payload.find("Change_Select"));
			Content_Name = Content_Name.substr(Content_Name.find_first_of(":"));
			Content_Name = Content_Name.substr(2, Content_Name.find_first_of(",}") - 2 - 2 + 1);

			for (auto p : mVisibleContexts)
			{
				if (p->uuid == inAction && p->context == inContext)
				{
					This_Operator = p;
					This_Operator->Current_Name = Content_Name;
					HSDLogger::LogMessage("Current_Name", This_Operator->Current_Name);
					break;
				}
			}

			if (Already_Record == "true")
			{
				This_Operator->Already_Record = true;
				HSDLogger::LogMessage("Change_Select:Already_Record", Already_Record);
			}
			else if (Already_Record == "false")
			{
				This_Operator->Already_Record = false;
				HSDLogger::LogMessage("Change_Select:Already_Record", Already_Record);
			}

			New_Get_Data_From_Local_Config(This_Operator);


		}
		else if (title == "Load_Config_List")
		{
			std::string New_File_Path_String = "config/" + content.substr(content.find_last_of("/") + 1, content.size() - (content.find_last_of("/") + 1));
			HSDLogger::LogMessage("New_File_Path_String", New_File_Path_String);
			std::string New_File_Name = content.substr(content.find_last_of("/") + 1, content.size() - (content.find_last_of("/") + 1) - 4);
			for (auto p : new_operator::Record_Config_Names_Vector)
			{
				if (New_File_Name == p)
				{
					char GBK_Content[200];
					char GBK_Title[200];
					UTF8ToGBK("已有该命名的宏录制，请更换名字后重试!", GBK_Content);
					UTF8ToGBK("错误提示", GBK_Title);
					MessageBoxA(NULL, GBK_Content, GBK_Title, MB_OK);
					return;
				}
			}
			HSDLogger::LogMessage("New_File_Name", New_File_Name);
			new_operator::Record_Config_Names_Vector.push_back(New_File_Name);

			new_operator* This_Operator;

			for (auto p : mVisibleContexts)
			{
				if (p->uuid == inAction && p->context == inContext)
				{
					This_Operator = p;
					break;
				}
			}

			std::string File_Path = content;
			//std::ifstream New_Config_Load(File_Path.c_str(), std::ios::in | std::ios::out);
			//char* GBK_File_Path = new char[File_Path.size()];
			char GBK_File_Path[200] = { 0 };
			UTF8ToGBK(File_Path.c_str(), GBK_File_Path);
			std::ifstream New_Config_Load(GBK_File_Path, std::ios::in | std::ios::out);

			//GBKTOUTF8(File_Path);
			//std::ifstream New_Config_Load(File_Path, std::ios::in | std::ios::out);

			if (New_Config_Load.is_open())
			{
				HSDLogger::LogMessage("Open_Config_File", "successful");
			}
			else
			{
				HSDLogger::LogMessage("Open_Config_File", "failed");
				//if (File_Path.find("Users") != std::string::npos)
				//{
				//	File_Path.replace(File_Path.find("users"), 5, "用户");
				//	New_Config_Load.open(File_Path.c_str(), std::ios::in | std::ios::out);
				//	if (New_Config_Load.is_open())
				//	{
				//		HSDLogger::LogMessage("Open_Config_File2", "successful");
				//	}
				//	else
				//	{
				//		HSDLogger::LogMessage("Open_Config_File2", "successful");
				//	}
				//}

			}

			std::vector<std::string>New_Config_List_Vector;
			std::string Config_String = "";
			HSDLogger::LogMessage("Load_Config_List", File_Path);
			while (getline(New_Config_Load, Config_String))
			{
				HSDLogger::LogMessage("Load_Config_List", Config_String);
				New_Config_List_Vector.push_back(Config_String);
			}
			New_Config_Load.close();

			//std::string New_File_Path_String = "config/" + content.substr(content.find_last_of("/") + 1, content.size() - (content.find_last_of("/") + 1));
			//HSDLogger::LogMessage("New_File_Path_String", New_File_Path_String);
			char GBK_New_FilePath[200];
			UTF8ToGBK(New_File_Path_String.c_str(), GBK_New_FilePath);

			std::fstream New_Config_Load_To_Local(GBK_New_FilePath, std::ios::out);
			for (auto p : New_Config_List_Vector)
			{
				New_Config_Load_To_Local << p;
				New_Config_Load_To_Local << '\n';
			}
			New_Config_Load_To_Local.close();

			//configlist 需要补上
			std::fstream New_Config_List_File("config_list.ini", std::ios::in | std::ios::out | std::ios::app);
			New_Config_List_File << New_File_Name << '\n';
			New_Config_List_File.close();

			New_Send_New_Config_List_To_PropertyInspector(This_Operator);
			This_Operator->Current_Name = New_File_Path_String.substr(0, New_File_Path_String.size() - 4);
			HSDLogger::LogMessage("Current_Name", This_Operator->Current_Name);
			New_Get_Data_From_Local_Config(This_Operator);


		}
		else if (title == "Delete_Delay")
		{
			new_operator* This_Operator;
			for (auto p : mVisibleContexts)
			{
				if (p->uuid == inAction && p->context == inContext)
				{
					This_Operator = p;
					break;
				}
			}

			content = payload.substr(payload.find_first_of("{"));
			content = content.substr(content.find_first_of(":"));
			content = content.substr(1, content.find_last_of("}") - 1 - 1 + 1);
			HSDLogger::LogMessage("Delete_Delay:content", content);

			if (content == "true")
			{
				This_Operator->Is_Delete_Delay = true;
			}
			else if (content == "false")
			{
				This_Operator->Is_Delete_Delay = false;
			}
		}
		else if (title == "Still_Press")
		{
			new_operator* This_Operator;
			for (auto p : mVisibleContexts)
			{
				if (p->uuid == inAction && p->context == inContext)
				{
					This_Operator = p;
					break;
				}
			}

			content = payload.substr(payload.find_first_of("{"));
			content = content.substr(content.find_first_of(":"));
			content = content.substr(1, content.find_last_of("}") - 1 - 1 + 1);
			HSDLogger::LogMessage("Still_Press:content", content);

			if (content == "true")
			{
				This_Operator->Is_Show_Still_Press = true;
			}
			else if (content == "false")
			{
				This_Operator->Is_Show_Still_Press = false;
			}
		}
		else if (title == "Mouse_track")
		{
			new_operator* This_Operator;
			for (auto p : mVisibleContexts)
			{
				if (p->uuid == inAction && p->context == inContext)
				{
					This_Operator = p;
					break;
				}
			}

			content = payload.substr(payload.find_first_of("{"));
			content = content.substr(content.find_first_of(":"));
			content = content.substr(1, content.find_last_of("}") - 1 - 1 + 1);
			HSDLogger::LogMessage("Mouse_track:content", content);

			if (content == "true")
			{
				This_Operator->Is_Show_Mouse_track = true;
			}
			else if (content == "false")
			{
				This_Operator->Is_Show_Mouse_track = false;
			}
		}
		else if (title == "Relative_coordinates")
		{
			new_operator* This_Operator;
			for (auto p : mVisibleContexts)
			{
				if (p->uuid == inAction && p->context == inContext)
				{
					This_Operator = p;
					break;
				}
			}

			content = payload.substr(payload.find_first_of("{"));
			content = content.substr(content.find_first_of(":"));
			content = content.substr(1, content.find_last_of("}") - 1 - 1 + 1);
			HSDLogger::LogMessage("Relative_coordinates:content", content);

			if (content == "true")
			{
				This_Operator->Is_Relative_coordinates = true;
			}
			else if (content == "false")
			{
				This_Operator->Is_Relative_coordinates = false;
			}
			New_Restore_Empty_Log(This_Operator);
		}
		else if (title == "Record_Log_Changed")
		{
			new_operator* This_Operator;
			for (auto p : mVisibleContexts)
			{
				if (p->uuid == inAction && p->context == inContext)
				{
					This_Operator = p;
					break;
				}
			}

			Get_Config_Data_From_PropertyInspector_TextArea(This_Operator, content);

			HSDLogger::LogMessage("Record_Log_Changed", "In_This_Title");

			Save_Data_To_Local_File(This_Operator);

			for (auto p : mVisibleContexts)
			{
				if (p->Current_Name == This_Operator->Current_Name && p->context != This_Operator->context)
					New_Get_Data_From_Local_Config(p);
			}

			//for (auto p : This_Operator->Key_Value_Log_Vector)
			//{
			//	HSDLogger::LogMessage("Record_Log_Changed:Key_Value_Log_Vector", std::to_string(p));
			//}
			//for (auto p : This_Operator->Key_Time_Log_Vector)
			//{
			//	HSDLogger::LogMessage("Record_Log_Changed:Key_Time_Log_Vector", std::to_string(p));
			//}
			//for (auto p : This_Operator->Key_Position_Vector)
			//{
			//	HSDLogger::LogMessage("Record_Log_Changed:Key_Position_Vector", std::to_string(p.first) + "," + std::to_string(p.second));
			//}


		}
		else if (title == "Add_Operation")
		{
			new_operator* This_Operator;
			for (auto p : mVisibleContexts)
			{
				if (p->uuid == inAction && p->context == inContext)
				{
					This_Operator = p;
					break;
				}
			}

			Get_Config_Data_From_PropertyInspector_TextArea(This_Operator, content);

			//for (auto p : This_Operator->Key_Value_Log_Vector)
			//{
			//	HSDLogger::LogMessage("Add_Operation:Key_Value_Log_Vector", std::to_string(p));
			//}
			//for (auto p : This_Operator->Key_Time_Log_Vector)
			//{
			//	HSDLogger::LogMessage("Add_Operation:Key_Time_Log_Vector", std::to_string(p));
			//}
			//for (auto p : This_Operator->Key_Position_Vector)
			//{
			//	HSDLogger::LogMessage("Add_Operation:Key_Position_Vector", std::to_string(p.first) + "," + std::to_string(p.second));
			//}

			Save_Data_To_Local_File(This_Operator);

			for (auto p : mVisibleContexts)
			{
				if (p->Current_Name == This_Operator->Current_Name && p->context != This_Operator->context)
					New_Get_Data_From_Local_Config(p);
			}


		}
		else if (title == "Rename_Config")
		{
			std::string Old_File_Name = "";
			std::string New_File_Name = "";

			Old_File_Name = content.substr(0, content.find_first_of("/"));
			New_File_Name = content.substr(content.find_first_of("/") + 1);

			for (auto p : new_operator::Record_Config_Names_Vector)
			{
				if (p == New_File_Name)
				{

					char GBK_Content[200];
					char GBK_Title[200];
					UTF8ToGBK("已有该命名的宏录制，请更换名字后重试!", GBK_Content);
					UTF8ToGBK("错误提示", GBK_Title);
					MessageBoxA(NULL, GBK_Content, GBK_Title, MB_OK);

					return;
				}

			}

			std::string Restore_Old_File_Name = Old_File_Name;
			std::string Restore_New_File_Name = New_File_Name;

			Old_File_Name = "config/" + Old_File_Name + ".ini";
			New_File_Name = "config/" + New_File_Name + ".ini";

			char GBK_Old_File_Name[200] = { 0 };
			char GBK_New_File_Name[200] = { 0 };

			UTF8ToGBK(Old_File_Name.c_str(), GBK_Old_File_Name);
			UTF8ToGBK(New_File_Name.c_str(), GBK_New_File_Name);

			MoveFileA(GBK_Old_File_Name, GBK_New_File_Name);

			for (auto p = new_operator::Record_Config_Names_Vector.begin(); p != new_operator::Record_Config_Names_Vector.end(); p++)
			{
				if (*p == Restore_Old_File_Name)
				{
					*p = Restore_New_File_Name;
					break;
				}

			}

			std::fstream Rename_Local_ConfigList("config_list.ini", std::ios::in | std::ios::out | std::ios::trunc);
			for (auto p : new_operator::Record_Config_Names_Vector)
			{
				HSDLogger::LogMessage("Rename_Config:Record_Config_Names_Vector", p);
				Rename_Local_ConfigList << p << '\n';
			}
			Rename_Local_ConfigList.close();

			for (auto p : mVisibleContexts)
			{
				if (p->Current_Name == Restore_Old_File_Name)
					p->Current_Name = Restore_New_File_Name;
			}

		}



	}

}

void MyStreamDockPlugin::New_Get_Data_From_Local_Config(new_operator* This_Operator)
{
	bool Is_Change_Select_String_Find = false;
	This_Operator->Key_Time_Log_Vector.clear();
	This_Operator->Key_Value_Log_Vector.clear();
	This_Operator->Key_Position_Vector.clear();
	This_Operator->Key_Press_Data_Vector.clear();

	for (int i = 0; i < 256; i++)
		This_Operator->Is_Down[i] = false;
	if (This_Operator->Current_Name == "" && This_Operator->Record_Config_Names_Vector.empty())
	{
		json  Set_Empty_Config_List;
		Set_Empty_Config_List["Set_Empty_Config_List"] = "1";
		mConnectionManager->SendToPropertyInspector(This_Operator->uuid, This_Operator->context, Set_Empty_Config_List);

		New_Restore_Empty_Log(This_Operator);
		return;
	}
	else if (This_Operator->Current_Name == "" && !This_Operator->Record_Config_Names_Vector.empty())
	{
		This_Operator->Current_Name = This_Operator->Record_Config_Names_Vector[0];
		Is_Change_Select_String_Find = true;
	}
	else if (This_Operator->Current_Name != "" && This_Operator->Record_Config_Names_Vector.empty())
	{
		This_Operator->Current_Name = "";
		New_Restore_Empty_Log(This_Operator);

		json Delete_This_Select;
		Delete_This_Select["Delete_This_Select"] = "1";
		mConnectionManager->SendToPropertyInspector(This_Operator->uuid, This_Operator->context, Delete_This_Select);

		return;
	}
	else if (This_Operator->Current_Name != "" && !This_Operator->Record_Config_Names_Vector.empty())
	{
		for (auto p : new_operator::Record_Config_Names_Vector)
		{
			if (p == This_Operator->Current_Name)
			{
				Is_Change_Select_String_Find = true;
				break;
			}

			if (p == This_Operator->Record_Config_Names_Vector.back())
			{
				This_Operator->Current_Name = This_Operator->Record_Config_Names_Vector[0];
				//if (!This_Operator->Record_Config_Names_Vector.empty())
				//	This_Operator->Current_Name = This_Operator->Record_Config_Names_Vector[0];
				//else if (This_Operator->Record_Config_Names_Vector.empty())
				//{
				//	This_Operator->Key_Time_Log_Vector.clear();
				//	This_Operator->Key_Value_Log_Vector.clear();
				//	This_Operator->Key_Position_Vector.clear();
				//	Restore_Empty_Log(This_Operator);
				//	return;
				//}
				Is_Change_Select_String_Find = true;
			}

		}
	}




	std::string File_Name = "config/" + This_Operator->Current_Name + ".ini";
	char GBK_File_Name[200] = { 0 };
	UTF8ToGBK(File_Name.c_str(), GBK_File_Name);
	std::ifstream Change_Select_Stream(GBK_File_Name, std::ios::in | std::ios::out);
	std::string Change_Select_String;
	//bool Is_Change_Select_String_Find = false;
	//bool Is_Change_Select_String_Find = true;
	int count = 0;
	while (Is_Change_Select_String_Find && getline(Change_Select_Stream, Change_Select_String))
	{
		HSDLogger::LogMessage("Change_Select_String", Change_Select_String);
		HSDLogger::LogMessage("Change_Select_String_Current_Name", This_Operator->Current_Name);

		if (Is_Change_Select_String_Find && count == 0)
		{
			while (Change_Select_String.find_first_of("1234567890") != std::string::npos)
			{
				bool Is_Num_Negative = false;
				if (Change_Select_String[Change_Select_String.find_first_of("1234567890") - 1] == '-')
					Is_Num_Negative = true;

				Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_of("1234567890"));
				std::string Time_String = Change_Select_String.substr(0, Change_Select_String.find_first_not_of("1234567890"));

				if (Is_Num_Negative)
					This_Operator->Key_Time_Log_Vector.push_back(-std::stoi(Time_String));
				else if (!Is_Num_Negative)
					This_Operator->Key_Time_Log_Vector.push_back(std::stoi(Time_String));

				Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_not_of("1234567890"));
			}



			count++;
		}
		else if (Is_Change_Select_String_Find && count == 1)
		{
			while (Change_Select_String.find_first_of("1234567890") != std::string::npos)
			{

				bool Is_Num_Negative = false;
				if (Change_Select_String[Change_Select_String.find_first_of("1234567890") - 1] == '-')
					Is_Num_Negative = true;

				Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_of("1234567890"));
				std::string Value_String = Change_Select_String.substr(0, Change_Select_String.find_first_not_of("1234567890"));

				if (Is_Num_Negative)
					This_Operator->Key_Value_Log_Vector.push_back(-std::stoi(Value_String));
				else if (!Is_Num_Negative)
					This_Operator->Key_Value_Log_Vector.push_back(std::stoi(Value_String));

				Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_not_of("1234567890"));
			}
			count++;
		}
		else if (/*Is_Change_Select_String_Find &&*/ count == 2)
		{
			while (Change_Select_String.find_first_of("1234567890") != std::string::npos)
			{
				Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_of("1234567890"));
				std::string Value_String = Change_Select_String.substr(0, Change_Select_String.find_first_not_of("1234567890"));
				HSDLogger::LogMessage("Is_Change_Select_String_Find:Value_String", Value_String);
				//This_Operator->Key_Value_Log_Vector.push_back(std::stoi(Value_String));
				//if (Value_String == "1")
				//	This_Operator->Key_Press_Data_Vector.push_back(1);
				//else if (Value_String == "0")
				//	This_Operator->Key_Press_Data_Vector.push_back(0);
				This_Operator->Key_Press_Data_Vector.push_back((unsigned int)std::stoul(Value_String));

				Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_not_of("1234567890"));
			}
			count++;
		}
		else if (Is_Change_Select_String_Find && count == 3)
		{
			while (Change_Select_String.find_first_of("1234567890") != std::string::npos)
			{
				Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_of("1234567890"));
				std::string Position_String_First = Change_Select_String.substr(0, Change_Select_String.find_first_not_of("1234567890"));
				//This_Operator->Key_Time_Log_Vector.push_back(std::stoi(Position_String_First));
				Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_not_of("1234567890"));

				Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_of("1234567890"));
				std::string Position_String_second = Change_Select_String.substr(0, Change_Select_String.find_first_not_of("1234567890"));
				This_Operator->Key_Position_Vector.push_back(std::pair<int, int>(std::stoi(Position_String_First), std::stoi(Position_String_second)));
				Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_not_of("1234567890"));
			}
			count++;

			//for (auto p : This_Operator->Key_Value_Log_Vector)
			//	HSDLogger::LogMessage("Key_Value_Log_Vector", std::to_string(p));
			//for (auto p : This_Operator->Key_Time_Log_Vector)
			//	HSDLogger::LogMessage("Key_Time_Log_Vector", std::to_string(p));

			//New_Restore_Empty_Log(This_Operator);
			//break;

		}
		else if (Is_Change_Select_String_Find && count == 4)
		{
			//for (auto p : This_Operator->Key_Value_Log_Vector)
			//{
			//	HSDLogger::LogMessage("New_Get_Data_From_Local_Config:Key_Value_Log_Vector", std::to_string(p));
			//}
			//for (auto p : This_Operator->Key_Time_Log_Vector)
			//{
			//	HSDLogger::LogMessage("New_Get_Data_From_Local_Config:Key_Time_Log_Vector", std::to_string(p));
			//}
			//for (auto p : This_Operator->Key_Position_Vector)
			//{
			//	HSDLogger::LogMessage("New_Get_Data_From_Local_Config:Key_Value_Log_Vector", std::to_string(p.first) + "," + std::to_string(p.second));
			//}


			if (This_Operator->uuid == "com.hotspot.stream.Record_Replay" && !This_Operator->Already_Record)
			{
				count++;
				if (Current_Operator == This_Operator)
					New_Restore_Empty_Log(This_Operator);
				break;
			}
			else
			{
				Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_of(":") + 1);
				Change_Select_String = Change_Select_String.substr(0, Change_Select_String.find_first_of(";"));

				if (Change_Select_String == "true")
					This_Operator->Is_Show_Still_Press = true;
				else if (Change_Select_String == "false")
					This_Operator->Is_Show_Still_Press = false;

				HSDLogger::LogMessage("Is_Change_Select_String_Find:Change_Select_String", Change_Select_String);

				if (This_Operator->Is_Show_Still_Press)
					HSDLogger::LogMessage("Is_Change_Select_String_Find:Is_Show_Still_Press", "true");
				else if (!This_Operator->Is_Show_Still_Press)
					HSDLogger::LogMessage("Is_Change_Select_String_Find:Is_Show_Still_Press", "false");

				count++;
				if (Current_Operator == This_Operator)
					New_Restore_Empty_Log(This_Operator);
				break;
			}


		}


	}
	Change_Select_Stream.close();

	HSDLogger::LogMessage("count", std::to_string(count));
	HSDLogger::LogMessage("This_Operator->Current_Name", This_Operator->Current_Name);
	for (auto p : This_Operator->Record_Config_Names_Vector)
	{
		HSDLogger::LogMessage("This_Operator->Record_Config_Names_Vector", p);
	}
	HSDLogger::LogMessage("xx", "==========================================================");
	This_Operator->print_fields();
	HSDLogger::LogMessage("xx", "==========================================================");
	// 判断一下Key_Value_Log_Vector、Key_Press_Data_Vector、Key_Time_Log_Vector、Key_Position_Vector有值就不删除settings的数据
	if (This_Operator->Key_Value_Log_Vector.size() == 0 ||
		This_Operator->Key_Time_Log_Vector.size() == 0)
	{
		// 在属性检查器那更新settings值
		json Delete_This_Record_Log;
		Delete_This_Record_Log["Delete_This_Record_Log"] = "1";
		mConnectionManager->SendToPropertyInspector(This_Operator->uuid, This_Operator->context, Delete_This_Record_Log);
	}

	//该值为0表示该配置已不存在
	//此时 count  为0  表示  没有配置存在或者没有加载最新配置
	if (count == 0)
	{

		//std::string New_Name;
		//Change_Select_Stream.open("config.ini", std::ios::in | std::ios::out);
		//getline(Change_Select_Stream, New_Name);

		//This_Operator->Current_Name = New_Name.substr(1 + 6, New_Name.size() - 1 - 1 - 6);
		if (!This_Operator->Record_Config_Names_Vector.empty())
		{
			This_Operator->Current_Name = This_Operator->Record_Config_Names_Vector[0];

			New_Get_Data_From_Local_Config(This_Operator);
		}


		//json Delete_This_Select;
		//Delete_This_Select["Delete_This_Select"] = "1";
		//mConnectionManager->SendToPropertyInspector(This_Operator->uuid, This_Operator->context, Delete_This_Select);
	}

}

void MyStreamDockPlugin::New_Send_New_Config_List_To_PropertyInspector(new_operator* This_Operator)
{
	HSDLogger::LogMessage("New_Send_New_Config_List_To_PropertyInspector:Current_Name", This_Operator->Current_Name);
	int Name_Count = 0;
	json Select_Config_Name_Json;
	if (This_Operator->Record_Config_Names_Vector.empty())
	{
		//重复录入ing...
		std::fstream Get_Config_Name_To_PropertyInspector("config_list.ini", std::ios::in | std::ios::out);
		std::string Config_Name_String = "";
		while (getline(Get_Config_Name_To_PropertyInspector, Config_Name_String))
		{
			//if (Name_Count % 4 == 0)
			//{
			//	Select_Config_Name_Json["Config_Name_List"][Name_Count / 4] = Config_Name_String.substr(1 + 6, Config_Name_String.size() - 1 - 1 - 6);
			//	if (Name_Count == 0 && This_Operator->Current_Name == "")
			//	{
			//		HSDLogger::LogMessage("WillAppear:Set_Current_Name1", This_Operator->Current_Name);
			//		This_Operator->Current_Name = Config_Name_String.substr(1 + 6, Config_Name_String.size() - 1 - 1 - 6);
			//		HSDLogger::LogMessage("WillAppear:Set_Current_Name2", This_Operator->Current_Name);
			//	}
			//}
			This_Operator->Record_Config_Names_Vector.push_back(Config_Name_String);
			Select_Config_Name_Json["Config_Name_List"][Name_Count] = This_Operator->Record_Config_Names_Vector[Name_Count];
			Name_Count++;
			//Name_Count %= 4;
		}
	}
	else if (!This_Operator->Record_Config_Names_Vector.empty())
	{

		for (auto p : This_Operator->Record_Config_Names_Vector)
		{
			Select_Config_Name_Json["Config_Name_List"][Name_Count] = This_Operator->Record_Config_Names_Vector[Name_Count]; //p
			Name_Count++;
		}
	}
	HSDLogger::LogMessage("New_Send_New_Config_List_To_PropertyInspector:Current_Name2", This_Operator->Current_Name);
	if (This_Operator->Current_Name == "" && !This_Operator->Record_Config_Names_Vector.empty())
	{
		This_Operator->Current_Name = This_Operator->Record_Config_Names_Vector[0];
	}
	HSDLogger::LogMessage("New_Send_New_Config_List_To_PropertyInspector:Current_Name3", This_Operator->Current_Name);
	mConnectionManager->SendToPropertyInspector(This_Operator->uuid, This_Operator->context, Select_Config_Name_Json);
	//Get_Config_Name_To_PropertyInspector.close();
}

void MyStreamDockPlugin::Old_Get_Data_From_Local_Config(new_operator* This_Operator)
{
	for (int i = 0; i < 256; i++)
		This_Operator->Is_Down[i] = false;

	std::ifstream Change_Select_Stream("config.ini", std::ios::in | std::ios::out);
	std::string Change_Select_String;
	bool Is_Change_Select_String_Find = false;
	int count = 0;
	while (getline(Change_Select_Stream, Change_Select_String))
	{
		HSDLogger::LogMessage("Change_Select_String", Change_Select_String);
		HSDLogger::LogMessage("Change_Select_String_Current_Name", This_Operator->Current_Name);
		if (This_Operator->Current_Name == "")
		{
			This_Operator->Current_Name = Change_Select_String.substr(1 + 6, Change_Select_String.size() - 1 - 1 - 6);

			This_Operator->Key_Time_Log_Vector.clear();
			This_Operator->Key_Value_Log_Vector.clear();
			This_Operator->Key_Position_Vector.clear();

			Is_Change_Select_String_Find = true;
			count++;
			continue;
		}
		else if (Change_Select_String.find("config" + This_Operator->Current_Name) != std::string::npos)
		{
			This_Operator->Key_Time_Log_Vector.clear();
			This_Operator->Key_Value_Log_Vector.clear();
			This_Operator->Key_Position_Vector.clear();

			Is_Change_Select_String_Find = true;
			count++;
			continue;
		}

		if (Is_Change_Select_String_Find && count == 1)
		{
			while (Change_Select_String.find_first_of("1234567890") != std::string::npos)
			{
				Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_of("1234567890"));
				std::string Time_String = Change_Select_String.substr(0, Change_Select_String.find_first_not_of("1234567890"));
				This_Operator->Key_Time_Log_Vector.push_back(std::stoi(Time_String));
				Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_not_of("1234567890"));
			}



			count++;
		}
		else if (Is_Change_Select_String_Find && count == 2)
		{
			while (Change_Select_String.find_first_of("1234567890") != std::string::npos)
			{
				Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_of("1234567890"));
				std::string Value_String = Change_Select_String.substr(0, Change_Select_String.find_first_not_of("1234567890"));
				This_Operator->Key_Value_Log_Vector.push_back(std::stoi(Value_String));
				Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_not_of("1234567890"));
			}
			count++;
		}
		else if (Is_Change_Select_String_Find && count == 3)
		{
			while (Change_Select_String.find_first_of("1234567890") != std::string::npos)
			{
				Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_of("1234567890"));
				std::string Position_String_First = Change_Select_String.substr(0, Change_Select_String.find_first_not_of("1234567890"));
				//This_Operator->Key_Time_Log_Vector.push_back(std::stoi(Position_String_First));
				Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_not_of("1234567890"));

				Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_of("1234567890"));
				std::string Position_String_second = Change_Select_String.substr(0, Change_Select_String.find_first_not_of("1234567890"));
				This_Operator->Key_Position_Vector.push_back(std::pair<int, int>(std::stoi(Position_String_First), std::stoi(Position_String_second)));
				Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_not_of("1234567890"));
			}
			count++;

			for (auto p : This_Operator->Key_Value_Log_Vector)
				HSDLogger::LogMessage("Key_Value_Log_Vector", std::to_string(p));
			for (auto p : This_Operator->Key_Time_Log_Vector)
				HSDLogger::LogMessage("Key_Time_Log_Vector", std::to_string(p));

			Old_Restore_Empty_Log(This_Operator);
			break;


		}
		//else if (count == 4)
		//{
		//	for(auto p : This_Operator->Key_Value_Log_Vector)
		//		HSDLogger::LogMessage("Key_Value_Log_Vector", std::to_string(p));
		//	for (auto p : This_Operator->Key_Time_Log_Vector)
		//		HSDLogger::LogMessage("Key_Time_Log_Vector", std::to_string(p));

		//	Restore_Empty_Log(This_Operator);
		//	break;
		//}


	}
	Change_Select_Stream.close();

	//该值为0表示该配置已不存在   2023-9-15 目前已无作用
	if (count == 0)
	{

		std::string New_Name;
		Change_Select_Stream.open("config.ini", std::ios::in | std::ios::out);
		getline(Change_Select_Stream, New_Name);

		This_Operator->Current_Name = New_Name.substr(1 + 6, New_Name.size() - 1 - 1 - 6);

		Old_Get_Data_From_Local_Config(This_Operator);

		json Delete_This_Select;
		Delete_This_Select["Delete_This_Select"] = "1";
		mConnectionManager->SendToPropertyInspector(This_Operator->uuid, This_Operator->context, Delete_This_Select);
	}

}

void MyStreamDockPlugin::Old_Send_New_Config_List_To_PropertyInspector(new_operator* This_Operator)
{
	//重复录入ing...
	std::fstream Get_Config_Name_To_PropertyInspector("config.ini", std::ios::in | std::ios::out);
	std::string Config_Name_String = "";
	int Name_Count = 0;
	json Select_Config_Name_Json;
	while (getline(Get_Config_Name_To_PropertyInspector, Config_Name_String))
	{
		if (Name_Count % 4 == 0)
		{
			Select_Config_Name_Json["Config_Name_List"][Name_Count / 4] = Config_Name_String.substr(1 + 6, Config_Name_String.size() - 1 - 1 - 6);
			if (Name_Count == 0 && This_Operator->Current_Name == "")
			{
				HSDLogger::LogMessage("WillAppear:Set_Current_Name1", This_Operator->Current_Name);
				This_Operator->Current_Name = Config_Name_String.substr(1 + 6, Config_Name_String.size() - 1 - 1 - 6);
				HSDLogger::LogMessage("WillAppear:Set_Current_Name2", This_Operator->Current_Name);
			}
		}
		Name_Count++;
		//Name_Count %= 4;
	}
	mConnectionManager->SendToPropertyInspector(This_Operator->uuid, This_Operator->context, Select_Config_Name_Json);
	Get_Config_Name_To_PropertyInspector.close();
}

//Send_New_Config_Operation_To_PropertyInspector
void MyStreamDockPlugin::Old_Restore_Empty_Log(new_operator* This_Operator)
{
	int Current_Operator_Num = 0;
	int KeyBoard_Event_Num = 0;
	int Mouse_Event_Num = 0;
	if (This_Operator->Key_Value_Log_Vector.empty())
	{
		json Empty_Config;
		Empty_Config["Select_Empty_Config"] = "1";
		mConnectionManager->SendToPropertyInspector(This_Operator->uuid, This_Operator->context, Empty_Config);
		return;
	}
	for (auto p : This_Operator->Key_Value_Log_Vector)
	{
		if (p < 256)
		{
			json KeyBoard_Event;
			//KeyBoard_Event["Reselect"] = 
			if (/*This_Operator->Is_Show_Still_Press*/!This_Operator->Key_Press_Data_Vector.empty())
			{
				if (This_Operator->Key_Press_Data_Vector[KeyBoard_Event_Num] == 1)
				{
					if (Current_Operator_Num == 0)
						KeyBoard_Event["KeyBoardValue"] = std::to_string(0) + "/" + std::to_string(p) + "/" + "3"
						+ "/" + std::to_string(This_Operator->Key_Time_Log_Vector[Current_Operator_Num]);
					else if (Current_Operator_Num != 0)
						KeyBoard_Event["KeyBoardValue"] = std::to_string(0) + "/" + std::to_string(p) + "/" + "2"
						+ "/" + std::to_string(This_Operator->Key_Time_Log_Vector[Current_Operator_Num]);
					//This_Operator->Is_Down[p] = true;
				}
				else if (This_Operator->Key_Press_Data_Vector[KeyBoard_Event_Num] == 0)
				{
					if (Current_Operator_Num == 0)
						KeyBoard_Event["KeyBoardValue"] = std::to_string(128) + "/" + std::to_string(p) + "/" + "1"
						+ "/" + std::to_string(This_Operator->Key_Time_Log_Vector[Current_Operator_Num]);
					else if (Current_Operator_Num != 0)
						KeyBoard_Event["KeyBoardValue"] = std::to_string(128) + "/" + std::to_string(p) + "/" + "2"
						+ "/" + std::to_string(This_Operator->Key_Time_Log_Vector[Current_Operator_Num]);
					//This_Operator->Is_Down[p] = false;
				}
			}
			else if (/*!This_Operator->Is_Show_Still_Press*/This_Operator->Key_Press_Data_Vector.empty())
			{
				if (!This_Operator->Is_Down[p] /*&& Current_Operator_Num != 0*/)
				{
					if (Current_Operator_Num == 0)
						KeyBoard_Event["KeyBoardValue"] = std::to_string(0) + "/" + std::to_string(p) + "/" + "1"
						+ "/" + std::to_string(This_Operator->Key_Time_Log_Vector[Current_Operator_Num]);
					else if (Current_Operator_Num != 0)
						KeyBoard_Event["KeyBoardValue"] = std::to_string(0) + "/" + std::to_string(p) + "/" + "2"
						+ "/" + std::to_string(This_Operator->Key_Time_Log_Vector[Current_Operator_Num]);
					This_Operator->Is_Down[p] = true;
				}
				else if (This_Operator->Is_Down[p])
				{
					if (Current_Operator_Num == 0)
						KeyBoard_Event["KeyBoardValue"] = std::to_string(128) + "/" + std::to_string(p) + "/" + "1"
						+ "/" + std::to_string(This_Operator->Key_Time_Log_Vector[Current_Operator_Num]);
					else if (Current_Operator_Num != 0)
						KeyBoard_Event["KeyBoardValue"] = std::to_string(128) + "/" + std::to_string(p) + "/" + "2"
						+ "/" + std::to_string(This_Operator->Key_Time_Log_Vector[Current_Operator_Num]);
					This_Operator->Is_Down[p] = false;
				}
			}


			mConnectionManager->SendToPropertyInspector(This_Operator->uuid, This_Operator->context, KeyBoard_Event);
			KeyBoard_Event_Num++;

		}
		else if (p >= 256)
		{
			json Mouse_Event;
			if (Current_Operator_Num == 0)
				Mouse_Event["MouseValue"] =
				std::to_string(p)
				+ "/" + std::to_string(This_Operator->Key_Position_Vector[Mouse_Event_Num].first)
				+ "/" + std::to_string(This_Operator->Key_Position_Vector[Mouse_Event_Num].second)
				+ "/" + std::to_string(1)
				+ "/" + std::to_string(This_Operator->Key_Time_Log_Vector[Current_Operator_Num]);

			if (Current_Operator_Num != 0)
				Mouse_Event["MouseValue"] =
				std::to_string(p)
				+ "/" + std::to_string(This_Operator->Key_Position_Vector[Mouse_Event_Num].first)
				+ "/" + std::to_string(This_Operator->Key_Position_Vector[Mouse_Event_Num].second)
				+ "/" + std::to_string(2)
				+ "/" + std::to_string(This_Operator->Key_Time_Log_Vector[Current_Operator_Num]);

			mConnectionManager->SendToPropertyInspector(This_Operator->uuid, This_Operator->context, Mouse_Event);
			Mouse_Event_Num++;

		}
		Current_Operator_Num++;

	}

}

//Send_New_Config_Operation_To_PropertyInspector
void MyStreamDockPlugin::New_Restore_Empty_Log(new_operator* This_Operator)
{
	int Current_Operator_Num = 0;
	int KeyData_Event_Num = 0;
	int Mouse_Event_Num = 0;
	//int Mouse_Wheel_Num = 0;
	if (This_Operator->Key_Value_Log_Vector.empty())
	{
		json Empty_Config;
		Empty_Config["Select_Empty_Config"] = "1";
		mConnectionManager->SendToPropertyInspector(This_Operator->uuid, This_Operator->context, Empty_Config);
		return;
	}

	json Key_Event;

	if (/*This_Operator->Key_Press_Release_Vector.empty()*/0)
	{
		HSDLogger::LogMessage("Key_Press_Release_Vector", "empty");
		if (This_Operator->Is_Show_Still_Press)
			Key_Event["Is_Still_Press"] = true;
		else if (!This_Operator->Is_Show_Still_Press)
			Key_Event["Is_Still_Press"] = false;
		for (int i = 0; i < 256; i++)
			This_Operator->Is_Down[i] = false;
		for (auto p : This_Operator->Key_Value_Log_Vector)
		{
			if (p > 0 && p < 256)
			{
				//if (This_Operator->Is_Down[p] == true)
				//	HSDLogger::LogMessage("Is_Down" + std::to_string(p) , "true");
				//else if (This_Operator->Is_Down[p] == false)
				//	HSDLogger::LogMessage("Is_Down" + std::to_string(p) , "false");


				Key_Event["Key_Value_Vector"][Current_Operator_Num] = p;
				Key_Event["Key_Time_Vector"][Current_Operator_Num] = This_Operator->Key_Time_Log_Vector[Current_Operator_Num];
				if (This_Operator->Is_Down[p] == false)
				{
					Key_Event["Key_Is_Down"][KeyData_Event_Num] = true;
					This_Operator->Is_Down[p] = true;

				}
				else if (This_Operator->Is_Down[p] == true)
				{
					Key_Event["Key_Is_Down"][KeyData_Event_Num] = false;
					This_Operator->Is_Down[p] = false;

				}

				KeyData_Event_Num++;

			}
			else if (p >= 256)
			{
				Key_Event["Key_Value_Vector"][Current_Operator_Num] = p;
				Key_Event["Key_Time_Vector"][Current_Operator_Num] = This_Operator->Key_Time_Log_Vector[Current_Operator_Num];

				Key_Event["Key_Mouse_Position"][Mouse_Event_Num] = This_Operator->Key_Position_Vector[Mouse_Event_Num];

				//Key_Event["Key_Mouse_Position_X"][Mouse_Event_Num] = This_Operator->Key_Position_Vector[Mouse_Event_Num].first;
				//Key_Event["Key_Mouse_Position_Y"][Mouse_Event_Num] = This_Operator->Key_Position_Vector[Mouse_Event_Num].second;


				Mouse_Event_Num++;

			}
			else if (p < 0)
			{
				//不作操作
				Key_Event["Key_Execute_Event"] = NULL;
			}
			Current_Operator_Num++;

		}
	}
	else if (/*!This_Operator->Key_Press_Release_Vector.empty()*/1)
	{
		HSDLogger::LogMessage("Key_Press_Release_Vector", "not_empty");
		if (This_Operator->Is_Show_Still_Press)
			Key_Event["Is_Still_Press"] = true;
		else if (!This_Operator->Is_Show_Still_Press)
			Key_Event["Is_Still_Press"] = false;
		std::pair<int, int>Mouse_Position(0, 0);
		for (auto p : This_Operator->Key_Value_Log_Vector)
		{
			if (p > 0 && p < 256)
			{

				Key_Event["Key_Value_Vector"][Current_Operator_Num] = p;
				Key_Event["Key_Time_Vector"][Current_Operator_Num] = This_Operator->Key_Time_Log_Vector[Current_Operator_Num];

				if (This_Operator->Key_Time_Log_Vector[Current_Operator_Num] >= 0)
				{
					if (This_Operator->Key_Press_Data_Vector[KeyData_Event_Num] == 1)
						//Key_Event["KeyData_Event_Num"][KeyData_Event_Num] = This_Operator->Key_Press_Release_Vector[KeyBoard_Event_Num];
						Key_Event["KeyData_Event_Num"][KeyData_Event_Num] = This_Operator->Key_Press_Data_Vector[KeyData_Event_Num];
					else if (This_Operator->Key_Press_Data_Vector[KeyData_Event_Num] == 0)
						//Key_Event["KeyData_Event_Num"][KeyData_Event_Num] = This_Operator->Key_Press_Release_Vector[KeyBoard_Event_Num];
						Key_Event["KeyData_Event_Num"][KeyData_Event_Num] = This_Operator->Key_Press_Data_Vector[KeyData_Event_Num];

					KeyData_Event_Num++;
				}


			}
			else if (p >= 256)
			{
				Key_Event["Key_Value_Vector"][Current_Operator_Num] = p;
				Key_Event["Key_Time_Vector"][Current_Operator_Num] = This_Operator->Key_Time_Log_Vector[Current_Operator_Num];

				if (!This_Operator->Is_Relative_coordinates)
					Key_Event["Key_Mouse_Position"][Mouse_Event_Num] = This_Operator->Key_Position_Vector[Mouse_Event_Num];
				else if (This_Operator->Is_Relative_coordinates)
				{

					Key_Event["Key_Mouse_Position"][Mouse_Event_Num] = std::pair<int, int>
						(
							This_Operator->Key_Position_Vector[Mouse_Event_Num].first - Mouse_Position.first
							, This_Operator->Key_Position_Vector[Mouse_Event_Num].second - Mouse_Position.second
							);
					Mouse_Position = This_Operator->Key_Position_Vector[Mouse_Event_Num];
				}


				//Key_Event["Key_Mouse_Position_X"][Mouse_Event_Num] = This_Operator->Key_Position_Vector[Mouse_Event_Num].first;
				//Key_Event["Key_Mouse_Position_Y"][Mouse_Event_Num] = This_Operator->Key_Position_Vector[Mouse_Event_Num].second;

				if (p == 522 || p == 523 || p == 524)
				{						//direction
					//if (This_Operator->Key_Press_Data_Vector[KeyData_Event_Num] == 0x780000)
					//	Key_Event["KeyData_Event_Num"][KeyData_Event_Num] = 5221;
					//if (This_Operator->Key_Press_Data_Vector[KeyData_Event_Num] == 0xFF880000)
					//	Key_Event["KeyData_Event_Num"][KeyData_Event_Num] = 5220;
					Key_Event["KeyData_Event_Num"][KeyData_Event_Num] = This_Operator->Key_Press_Data_Vector[KeyData_Event_Num];
					//Mouse_Wheel_Num++;
					KeyData_Event_Num++;
				}

				Mouse_Event_Num++;

			}
			else if (p < 0)
			{
				Key_Event["Key_Value_Vector"][Current_Operator_Num] = p;
				Key_Event["Key_Time_Vector"][Current_Operator_Num] = This_Operator->Key_Time_Log_Vector[Current_Operator_Num];
			}
			Current_Operator_Num++;

		}
	}

	for (auto p : This_Operator->Key_Press_Data_Vector)
		HSDLogger::LogMessage("New_Restore_Empty_Log:Key_Press_Data_Vector", std::to_string(p));

	mConnectionManager->SendToPropertyInspector(This_Operator->uuid, This_Operator->context, Key_Event);

}

void MyStreamDockPlugin::Save_Data_To_Local_File(new_operator* This_Operator)
{
	std::string File_Name_UTF8 = "config/" + This_Operator->Current_Name + ".ini";
	char GBK_File_Name[200] = { 0 };
	UTF8ToGBK(File_Name_UTF8.c_str(), GBK_File_Name);

	std::fstream Change_Config_Stream(GBK_File_Name, std::ios::in | std::ios::out | std::ios::trunc);

	std::string Time_Log_String;
	Time_Log_String = "Key_Time_Log_Vector:[";

	for (auto p : This_Operator->Key_Time_Log_Vector)
	{
		Time_Log_String += std::to_string(p);
		Time_Log_String += ",";
	}

	if (!This_Operator->Key_Time_Log_Vector.empty())
		Time_Log_String.erase(Time_Log_String.end() - 1);
	Time_Log_String += "];";

	Change_Config_Stream << "{" << Time_Log_String << '\n';


	std::string Value_Log_String;
	Value_Log_String = "Key_Value_Log_Vector:[";

	for (auto p : This_Operator->Key_Value_Log_Vector)
	{
		Value_Log_String += std::to_string(p);
		Value_Log_String += ",";
	}

	if (!This_Operator->Key_Value_Log_Vector.empty())
		Value_Log_String.erase(Value_Log_String.end() - 1);
	Value_Log_String += "];";

	Change_Config_Stream << Value_Log_String << '\n';

	//start
	std::string Press_Release_Log_String;
	Press_Release_Log_String = "Key_Press_Data_Vector:[";

	if (!This_Operator->Key_Press_Data_Vector.empty())
	{
		for (auto p : This_Operator->Key_Press_Data_Vector)
		{
			//if (p == 1)
			//{
			//	Press_Release_Log_String += std::to_string(1);
			//}
			//else if (p == 0)
			//{
			//	Press_Release_Log_String += std::to_string(0);
			//}
			Press_Release_Log_String += std::to_string(p);
			Press_Release_Log_String += ",";
		}

		Press_Release_Log_String.erase(Press_Release_Log_String.end() - 1);
	}

	Press_Release_Log_String += "];";

	Change_Config_Stream << Press_Release_Log_String << '\n';
	//end

	std::string Position_Log_String;
	Position_Log_String = "Key_Position_Vector:[";

	if (!This_Operator->Key_Position_Vector.empty())
	{
		for (auto p : This_Operator->Key_Position_Vector)
		{

			Position_Log_String += '(' + std::to_string(p.first) + ',' + std::to_string(p.second) + ')';
			Position_Log_String += ",";
		}

		Position_Log_String.erase(Position_Log_String.end() - 1);
	}


	Position_Log_String += "];";
	//Position_Log_String += "}";

	Change_Config_Stream << Position_Log_String << '\n';

	//start
	std::string Is_Still_Press_Release;
	Is_Still_Press_Release = "Key_Still_Press_Release:";

	if (This_Operator->Is_Show_Still_Press)
		Is_Still_Press_Release += "true";
	else if (!This_Operator->Is_Show_Still_Press)
		Is_Still_Press_Release += "false";

	Is_Still_Press_Release += ";";
	Is_Still_Press_Release += "}";

	Change_Config_Stream << Is_Still_Press_Release << '\n';
	//end

	Change_Config_Stream.close();
}


void MyStreamDockPlugin::Get_Config_Data_From_PropertyInspector_TextArea(new_operator* This_Operator, std::string& PropertyInspector_TextArea)
{
	std::string Config_String = PropertyInspector_TextArea;
	std::vector<std::string>Config_String_Vector;
	while (Config_String.find("\\n") != std::string::npos)
	{
		Config_String_Vector.push_back(Config_String.substr(0, Config_String.find("\\n")));
		Config_String = Config_String.substr(Config_String.find("\\n") + 1);
	}
	if (!This_Operator->Is_Delete_Delay)
		This_Operator->Key_Time_Log_Vector.clear();
	This_Operator->Key_Value_Log_Vector.clear();
	This_Operator->Key_Press_Data_Vector.clear();
	This_Operator->Key_Position_Vector.clear();

	std::pair<int, int>Mouse_Position(0, 0);
	for (std::string New_Config_String : Config_String_Vector)
	{
		HSDLogger::LogMessage("Config_String_Vector", New_Config_String);
		//if (!This_Operator->Is_Delete_Delay)
		//	This_Operator->Key_Time_Log_Vector.clear();
		//This_Operator->Key_Value_Log_Vector.clear();
		//This_Operator->Key_Press_Release_Vector.clear();
		//This_Operator->Key_Position_Vector.clear();

		//std::string Mouse_Position_X = "";
		//std::string Mouse_Position_Y = "";
		//Mouse_Position_X = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
		//Mouse_Position_X = Mouse_Position_X.substr(0, Mouse_Position_X.find_first_not_of("1234567890"));

		//Mouse_Position_Y = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
		//Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_not_of("1234567890"));
		//Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890"));
		//Mouse_Position_Y = Mouse_Position_Y.substr(0, Mouse_Position_Y.find_first_not_of("1234567890"));

		//This_Operator->Key_Position_Vector.push_back(std::pair<int, int>(std::stoi(Mouse_Position_X), std::stoi(Mouse_Position_Y)));

		std::string Config_Date_String = "";

		if (New_Config_String.find("延迟") != std::string::npos && !This_Operator->Is_Delete_Delay)
		{
			Config_Date_String = New_Config_String.substr(New_Config_String.find_first_of("1234567890"));
			Config_Date_String = Config_Date_String.substr(0, Config_Date_String.find_first_not_of("1234567890"));
			This_Operator->Key_Time_Log_Vector.push_back(std::stoi(Config_Date_String));
		}

		if (New_Config_String.find("延迟") != std::string::npos && New_Config_String.find("鼠标移动") != std::string::npos)
		{
			This_Operator->Key_Value_Log_Vector.push_back(512);
			Config_Date_String = New_Config_String.substr(New_Config_String.find("鼠标移动"));
			std::string Mouse_Position_X = "";
			std::string Mouse_Position_Y = "";
			Mouse_Position_X = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_X = Mouse_Position_X.substr(0, Mouse_Position_X.find_first_not_of("1234567890"));
			if (Config_Date_String.substr(Config_Date_String.find_first_of("1234567890") - 1, 1) == "-")
				Mouse_Position_X = '-' + Mouse_Position_X;
			Mouse_Position_Y = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_not_of("1234567890"));
			bool Is_Position_Y_Negative = false;
			if (Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890") - 1, 1) == "-")
				Is_Position_Y_Negative = true;
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(0, Mouse_Position_Y.find_first_not_of("1234567890"));
			if (Is_Position_Y_Negative)
				Mouse_Position_Y = '-' + Mouse_Position_Y;

			if (!This_Operator->Is_Relative_coordinates)
				This_Operator->Key_Position_Vector.push_back(std::pair<int, int>(std::stoi(Mouse_Position_X), std::stoi(Mouse_Position_Y)));
			else if (This_Operator->Is_Relative_coordinates)
			{
				Mouse_Position = std::pair<int, int>(
					Mouse_Position.first + std::stoi(Mouse_Position_X)
					, Mouse_Position.second + std::stoi(Mouse_Position_Y)
					);
				This_Operator->Key_Position_Vector.push_back(Mouse_Position);
			}
		}
		else if (New_Config_String.find("延迟") != std::string::npos && New_Config_String.find("左键按下") != std::string::npos)
		{
			This_Operator->Key_Value_Log_Vector.push_back(513);
			Config_Date_String = New_Config_String.substr(New_Config_String.find("左键按下"));
			std::string Mouse_Position_X = "";
			std::string Mouse_Position_Y = "";
			Mouse_Position_X = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_X = Mouse_Position_X.substr(0, Mouse_Position_X.find_first_not_of("1234567890"));
			if (Config_Date_String.substr(Config_Date_String.find_first_of("1234567890") - 1, 1) == "-")
				Mouse_Position_X = '-' + Mouse_Position_X;
			Mouse_Position_Y = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_not_of("1234567890"));
			bool Is_Position_Y_Negative = false;
			if (Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890") - 1, 1) == "-")
				Is_Position_Y_Negative = true;
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(0, Mouse_Position_Y.find_first_not_of("1234567890"));
			if (Is_Position_Y_Negative)
				Mouse_Position_Y = '-' + Mouse_Position_Y;

			if (!This_Operator->Is_Relative_coordinates)
				This_Operator->Key_Position_Vector.push_back(std::pair<int, int>(std::stoi(Mouse_Position_X), std::stoi(Mouse_Position_Y)));
			else if (This_Operator->Is_Relative_coordinates)
			{
				Mouse_Position = std::pair<int, int>(
					Mouse_Position.first + std::stoi(Mouse_Position_X)
					, Mouse_Position.second + std::stoi(Mouse_Position_Y)
					);
				This_Operator->Key_Position_Vector.push_back(Mouse_Position);
			}
		}
		else if (New_Config_String.find("延迟") != std::string::npos && New_Config_String.find("左键弹起") != std::string::npos)
		{
			This_Operator->Key_Value_Log_Vector.push_back(514);
			Config_Date_String = New_Config_String.substr(New_Config_String.find("左键弹起"));
			std::string Mouse_Position_X = "";
			std::string Mouse_Position_Y = "";
			Mouse_Position_X = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_X = Mouse_Position_X.substr(0, Mouse_Position_X.find_first_not_of("1234567890"));
			if (Config_Date_String.substr(Config_Date_String.find_first_of("1234567890") - 1, 1) == "-")
				Mouse_Position_X = '-' + Mouse_Position_X;
			Mouse_Position_Y = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_not_of("1234567890"));
			bool Is_Position_Y_Negative = false;
			if (Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890") - 1, 1) == "-")
				Is_Position_Y_Negative = true;
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(0, Mouse_Position_Y.find_first_not_of("1234567890"));
			if (Is_Position_Y_Negative)
				Mouse_Position_Y = '-' + Mouse_Position_Y;

			if (!This_Operator->Is_Relative_coordinates)
				This_Operator->Key_Position_Vector.push_back(std::pair<int, int>(std::stoi(Mouse_Position_X), std::stoi(Mouse_Position_Y)));
			else if (This_Operator->Is_Relative_coordinates)
			{
				Mouse_Position = std::pair<int, int>(
					Mouse_Position.first + std::stoi(Mouse_Position_X)
					, Mouse_Position.second + std::stoi(Mouse_Position_Y)
					);
				This_Operator->Key_Position_Vector.push_back(Mouse_Position);
			}
		}
		else if (New_Config_String.find("延迟") != std::string::npos && New_Config_String.find("右键按下") != std::string::npos)
		{
			This_Operator->Key_Value_Log_Vector.push_back(516);
			Config_Date_String = New_Config_String.substr(New_Config_String.find("右键按下"));
			std::string Mouse_Position_X = "";
			std::string Mouse_Position_Y = "";
			Mouse_Position_X = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_X = Mouse_Position_X.substr(0, Mouse_Position_X.find_first_not_of("1234567890"));
			if (Config_Date_String.substr(Config_Date_String.find_first_of("1234567890") - 1, 1) == "-")
				Mouse_Position_X = '-' + Mouse_Position_X;
			Mouse_Position_Y = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_not_of("1234567890"));
			bool Is_Position_Y_Negative = false;
			if (Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890") - 1, 1) == "-")
				Is_Position_Y_Negative = true;
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(0, Mouse_Position_Y.find_first_not_of("1234567890"));
			if (Is_Position_Y_Negative)
				Mouse_Position_Y = '-' + Mouse_Position_Y;

			if (!This_Operator->Is_Relative_coordinates)
				This_Operator->Key_Position_Vector.push_back(std::pair<int, int>(std::stoi(Mouse_Position_X), std::stoi(Mouse_Position_Y)));
			else if (This_Operator->Is_Relative_coordinates)
			{
				Mouse_Position = std::pair<int, int>(
					Mouse_Position.first + std::stoi(Mouse_Position_X)
					, Mouse_Position.second + std::stoi(Mouse_Position_Y)
					);
				This_Operator->Key_Position_Vector.push_back(Mouse_Position);
			}
		}
		else if (New_Config_String.find("延迟") != std::string::npos && New_Config_String.find("右键弹起") != std::string::npos)
		{
			This_Operator->Key_Value_Log_Vector.push_back(517);
			Config_Date_String = New_Config_String.substr(New_Config_String.find("右键弹起"));
			std::string Mouse_Position_X = "";
			std::string Mouse_Position_Y = "";
			Mouse_Position_X = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_X = Mouse_Position_X.substr(0, Mouse_Position_X.find_first_not_of("1234567890"));
			if (Config_Date_String.substr(Config_Date_String.find_first_of("1234567890") - 1, 1) == "-")
				Mouse_Position_X = '-' + Mouse_Position_X;
			Mouse_Position_Y = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_not_of("1234567890"));
			bool Is_Position_Y_Negative = false;
			if (Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890") - 1, 1) == "-")
				Is_Position_Y_Negative = true;
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(0, Mouse_Position_Y.find_first_not_of("1234567890"));
			if (Is_Position_Y_Negative)
				Mouse_Position_Y = '-' + Mouse_Position_Y;

			if (!This_Operator->Is_Relative_coordinates)
				This_Operator->Key_Position_Vector.push_back(std::pair<int, int>(std::stoi(Mouse_Position_X), std::stoi(Mouse_Position_Y)));
			else if (This_Operator->Is_Relative_coordinates)
			{
				Mouse_Position = std::pair<int, int>(
					Mouse_Position.first + std::stoi(Mouse_Position_X)
					, Mouse_Position.second + std::stoi(Mouse_Position_Y)
					);
				This_Operator->Key_Position_Vector.push_back(Mouse_Position);
			}
		}
		else if (New_Config_String.find("延迟") != std::string::npos && New_Config_String.find("滚轮按下") != std::string::npos)
		{
			This_Operator->Key_Value_Log_Vector.push_back(519);
			Config_Date_String = New_Config_String.substr(New_Config_String.find("滚轮按下"));
			std::string Mouse_Position_X = "";
			std::string Mouse_Position_Y = "";
			Mouse_Position_X = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_X = Mouse_Position_X.substr(0, Mouse_Position_X.find_first_not_of("1234567890"));
			if (Config_Date_String.substr(Config_Date_String.find_first_of("1234567890") - 1, 1) == "-")
				Mouse_Position_X = '-' + Mouse_Position_X;
			Mouse_Position_Y = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_not_of("1234567890"));
			bool Is_Position_Y_Negative = false;
			if (Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890") - 1, 1) == "-")
				Is_Position_Y_Negative = true;
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(0, Mouse_Position_Y.find_first_not_of("1234567890"));
			if (Is_Position_Y_Negative)
				Mouse_Position_Y = '-' + Mouse_Position_Y;

			if (!This_Operator->Is_Relative_coordinates)
				This_Operator->Key_Position_Vector.push_back(std::pair<int, int>(std::stoi(Mouse_Position_X), std::stoi(Mouse_Position_Y)));
			else if (This_Operator->Is_Relative_coordinates)
			{
				Mouse_Position = std::pair<int, int>(
					Mouse_Position.first + std::stoi(Mouse_Position_X)
					, Mouse_Position.second + std::stoi(Mouse_Position_Y)
					);
				This_Operator->Key_Position_Vector.push_back(Mouse_Position);
			}
		}
		else if (New_Config_String.find("延迟") != std::string::npos && New_Config_String.find("滚轮弹起") != std::string::npos)
		{
			This_Operator->Key_Value_Log_Vector.push_back(520);
			Config_Date_String = New_Config_String.substr(New_Config_String.find("滚轮弹起"));
			std::string Mouse_Position_X = "";
			std::string Mouse_Position_Y = "";
			Mouse_Position_X = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_X = Mouse_Position_X.substr(0, Mouse_Position_X.find_first_not_of("1234567890"));
			if (Config_Date_String.substr(Config_Date_String.find_first_of("1234567890") - 1, 1) == "-")
				Mouse_Position_X = '-' + Mouse_Position_X;
			Mouse_Position_Y = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_not_of("1234567890"));
			bool Is_Position_Y_Negative = false;
			if (Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890") - 1, 1) == "-")
				Is_Position_Y_Negative = true;
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(0, Mouse_Position_Y.find_first_not_of("1234567890"));
			if (Is_Position_Y_Negative)
				Mouse_Position_Y = '-' + Mouse_Position_Y;

			if (!This_Operator->Is_Relative_coordinates)
				This_Operator->Key_Position_Vector.push_back(std::pair<int, int>(std::stoi(Mouse_Position_X), std::stoi(Mouse_Position_Y)));
			else if (This_Operator->Is_Relative_coordinates)
			{
				Mouse_Position = std::pair<int, int>(
					Mouse_Position.first + std::stoi(Mouse_Position_X)
					, Mouse_Position.second + std::stoi(Mouse_Position_Y)
					);
				This_Operator->Key_Position_Vector.push_back(Mouse_Position);
			}
		}
		else if (New_Config_String.find("延迟") != std::string::npos
			&& (New_Config_String.find("滚轮向前") != std::string::npos || New_Config_String.find("滚轮向后") != std::string::npos)
			)
		{
			This_Operator->Key_Value_Log_Vector.push_back(522);
			if (New_Config_String.find("滚轮向前") != std::string::npos)
			{
				Config_Date_String = New_Config_String.substr(New_Config_String.find("滚轮向前"));
				This_Operator->Key_Press_Data_Vector.push_back(0x780000);
			}
			else if (New_Config_String.find("滚轮向后") != std::string::npos)
			{
				Config_Date_String = New_Config_String.substr(New_Config_String.find("滚轮向后"));
				This_Operator->Key_Press_Data_Vector.push_back(0xFF880000);
			}

			std::string Mouse_Position_X = "";
			std::string Mouse_Position_Y = "";
			Mouse_Position_X = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_X = Mouse_Position_X.substr(0, Mouse_Position_X.find_first_not_of("1234567890"));
			if (Config_Date_String.substr(Config_Date_String.find_first_of("1234567890") - 1, 1) == "-")
				Mouse_Position_X = '-' + Mouse_Position_X;
			Mouse_Position_Y = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_not_of("1234567890"));
			bool Is_Position_Y_Negative = false;
			if (Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890") - 1, 1) == "-")
				Is_Position_Y_Negative = true;
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(0, Mouse_Position_Y.find_first_not_of("1234567890"));
			if (Is_Position_Y_Negative)
				Mouse_Position_Y = '-' + Mouse_Position_Y;

			if (!This_Operator->Is_Relative_coordinates)
				This_Operator->Key_Position_Vector.push_back(std::pair<int, int>(std::stoi(Mouse_Position_X), std::stoi(Mouse_Position_Y)));
			else if (This_Operator->Is_Relative_coordinates)
			{
				Mouse_Position = std::pair<int, int>(
					Mouse_Position.first + std::stoi(Mouse_Position_X)
					, Mouse_Position.second + std::stoi(Mouse_Position_Y)
					);
				This_Operator->Key_Position_Vector.push_back(Mouse_Position);
			}

			//滚轮前滚  滚轮后滚
		}
		else if (New_Config_String.find("延迟") != std::string::npos && New_Config_String.find("侧键按下") != std::string::npos)
		{
			This_Operator->Key_Value_Log_Vector.push_back(523);
			Config_Date_String = New_Config_String.substr(New_Config_String.find("侧键按下"));

			std::string XButton_Num = "";
			Config_Date_String = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			XButton_Num = Config_Date_String.substr(0, Config_Date_String.find_first_not_of("1234567890"));

			This_Operator->Key_Press_Data_Vector.push_back(std::stoi(XButton_Num) * 16 * 16 * 16 * 16);

			Config_Date_String = Config_Date_String.substr(Config_Date_String.find_first_not_of("1234567890"));

			std::string Mouse_Position_X = "";
			std::string Mouse_Position_Y = "";
			Mouse_Position_X = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_X = Mouse_Position_X.substr(0, Mouse_Position_X.find_first_not_of("1234567890"));
			if (Config_Date_String.substr(Config_Date_String.find_first_of("1234567890") - 1, 1) == "-")
				Mouse_Position_X = '-' + Mouse_Position_X;
			Mouse_Position_Y = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_not_of("1234567890"));
			bool Is_Position_Y_Negative = false;
			if (Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890") - 1, 1) == "-")
				Is_Position_Y_Negative = true;
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(0, Mouse_Position_Y.find_first_not_of("1234567890"));
			if (Is_Position_Y_Negative)
				Mouse_Position_Y = '-' + Mouse_Position_Y;

			if (!This_Operator->Is_Relative_coordinates)
				This_Operator->Key_Position_Vector.push_back(std::pair<int, int>(std::stoi(Mouse_Position_X), std::stoi(Mouse_Position_Y)));
			else if (This_Operator->Is_Relative_coordinates)
			{
				Mouse_Position = std::pair<int, int>(
					Mouse_Position.first + std::stoi(Mouse_Position_X)
					, Mouse_Position.second + std::stoi(Mouse_Position_Y)
					);
				This_Operator->Key_Position_Vector.push_back(Mouse_Position);
			}
		}
		else if (New_Config_String.find("延迟") != std::string::npos && New_Config_String.find("侧键弹起") != std::string::npos)
		{
			This_Operator->Key_Value_Log_Vector.push_back(524);
			Config_Date_String = New_Config_String.substr(New_Config_String.find("侧键弹起"));

			std::string XButton_Num = "";
			Config_Date_String = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			XButton_Num = Config_Date_String.substr(0, Config_Date_String.find_first_not_of("1234567890"));

			This_Operator->Key_Press_Data_Vector.push_back(std::stoi(XButton_Num) * 16 * 16 * 16 * 16);

			Config_Date_String = Config_Date_String.substr(Config_Date_String.find_first_not_of("1234567890"));


			std::string Mouse_Position_X = "";
			std::string Mouse_Position_Y = "";
			Mouse_Position_X = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_X = Mouse_Position_X.substr(0, Mouse_Position_X.find_first_not_of("1234567890"));
			if (Config_Date_String.substr(Config_Date_String.find_first_of("1234567890") - 1, 1) == "-")
				Mouse_Position_X = '-' + Mouse_Position_X;
			Mouse_Position_Y = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_not_of("1234567890"));
			bool Is_Position_Y_Negative = false;
			if (Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890") - 1, 1) == "-")
				Is_Position_Y_Negative = true;
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(0, Mouse_Position_Y.find_first_not_of("1234567890"));
			if (Is_Position_Y_Negative)
				Mouse_Position_Y = '-' + Mouse_Position_Y;

			if (!This_Operator->Is_Relative_coordinates)
				This_Operator->Key_Position_Vector.push_back(std::pair<int, int>(std::stoi(Mouse_Position_X), std::stoi(Mouse_Position_Y)));
			else if (This_Operator->Is_Relative_coordinates)
			{
				Mouse_Position = std::pair<int, int>(
					Mouse_Position.first + std::stoi(Mouse_Position_X)
					, Mouse_Position.second + std::stoi(Mouse_Position_Y)
					);
				This_Operator->Key_Position_Vector.push_back(Mouse_Position);
			}
		}
		else if (New_Config_String.find("延迟") != std::string::npos && New_Config_String.find("按下") != std::string::npos)
		{
			std::string Config_Data_String = New_Config_String.substr(New_Config_String.find("按下"));
			Config_Data_String = Config_Data_String.substr(Config_Data_String.find_first_of("\""));
			Config_Data_String = Config_Data_String.substr(1, Config_Data_String.find_first_of("\\") - 1);
			HSDLogger::LogMessage("Record_Log_Changed:按下", Config_Data_String);
			HSDLogger::LogMessage("Record_Log_Changed:按下", std::to_string(Key_Value_Map[Config_Data_String]));
			This_Operator->Key_Value_Log_Vector.push_back(Key_Value_Map[Config_Data_String]);
			This_Operator->Key_Press_Data_Vector.push_back(1);

		}
		else if (New_Config_String.find("延迟") != std::string::npos && New_Config_String.find("弹起") != std::string::npos)
		{
			std::string Config_Data_String = New_Config_String.substr(New_Config_String.find("弹起"));
			Config_Data_String = Config_Data_String.substr(Config_Data_String.find_first_of("\""));
			Config_Data_String = Config_Data_String.substr(1, Config_Data_String.find_first_of("\\") - 1);
			HSDLogger::LogMessage("Record_Log_Changed:弹起", Config_Data_String);
			HSDLogger::LogMessage("Record_Log_Changed:弹起", std::to_string(Key_Value_Map[Config_Data_String]));
			This_Operator->Key_Value_Log_Vector.push_back(Key_Value_Map[Config_Data_String]);
			This_Operator->Key_Press_Data_Vector.push_back(0);

		}


		//新版直接设置增加操作
		else if (New_Config_String.find("延迟") == std::string::npos && New_Config_String.find("鼠标左键") != std::string::npos)
		{
			This_Operator->Key_Value_Log_Vector.push_back(513);
			Config_Date_String = New_Config_String.substr(New_Config_String.find("鼠标左键"));
			std::string Mouse_Position_X = "";
			std::string Mouse_Position_Y = "";
			Mouse_Position_X = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_X = Mouse_Position_X.substr(0, Mouse_Position_X.find_first_not_of("1234567890"));
			if (Config_Date_String.substr(Config_Date_String.find_first_of("1234567890") - 1, 1) == "-")
				Mouse_Position_X = '-' + Mouse_Position_X;
			Mouse_Position_Y = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_not_of("1234567890"));
			bool Is_Position_Y_Negative = false;
			if (Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890") - 1, 1) == "-")
				Is_Position_Y_Negative = true;
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(0, Mouse_Position_Y.find_first_not_of("1234567890"));
			if (Is_Position_Y_Negative)
				Mouse_Position_Y = '-' + Mouse_Position_Y;

			if (!This_Operator->Is_Relative_coordinates)
				This_Operator->Key_Position_Vector.push_back(std::pair<int, int>(std::stoi(Mouse_Position_X), std::stoi(Mouse_Position_Y)));
			else if (This_Operator->Is_Relative_coordinates)
			{
				Mouse_Position = std::pair<int, int>(
					Mouse_Position.first + std::stoi(Mouse_Position_X)
					, Mouse_Position.second + std::stoi(Mouse_Position_Y)
					);
				This_Operator->Key_Position_Vector.push_back(Mouse_Position);
			}

			std::string Execute_Times = New_Config_String.substr(New_Config_String.find("执行"));
			Execute_Times = Execute_Times.substr(Execute_Times.find_first_of("1234567890"));
			Execute_Times = Execute_Times.substr(0, Execute_Times.find_first_not_of("1234567890"));

			int Execute_Times_Num = std::stoi(Execute_Times);

			This_Operator->Key_Time_Log_Vector.push_back(-Execute_Times_Num);
		}
		else if (New_Config_String.find("延迟") == std::string::npos && New_Config_String.find("鼠标右键") != std::string::npos)
		{
			This_Operator->Key_Value_Log_Vector.push_back(516);
			Config_Date_String = New_Config_String.substr(New_Config_String.find("鼠标右键"));
			std::string Mouse_Position_X = "";
			std::string Mouse_Position_Y = "";
			Mouse_Position_X = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_X = Mouse_Position_X.substr(0, Mouse_Position_X.find_first_not_of("1234567890"));
			if (Config_Date_String.substr(Config_Date_String.find_first_of("1234567890") - 1, 1) == "-")
				Mouse_Position_X = '-' + Mouse_Position_X;
			Mouse_Position_Y = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_not_of("1234567890"));
			bool Is_Position_Y_Negative = false;
			if (Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890") - 1, 1) == "-")
				Is_Position_Y_Negative = true;
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(0, Mouse_Position_Y.find_first_not_of("1234567890"));
			if (Is_Position_Y_Negative)
				Mouse_Position_Y = '-' + Mouse_Position_Y;

			if (!This_Operator->Is_Relative_coordinates)
				This_Operator->Key_Position_Vector.push_back(std::pair<int, int>(std::stoi(Mouse_Position_X), std::stoi(Mouse_Position_Y)));
			else if (This_Operator->Is_Relative_coordinates)
			{
				Mouse_Position = std::pair<int, int>(
					Mouse_Position.first + std::stoi(Mouse_Position_X)
					, Mouse_Position.second + std::stoi(Mouse_Position_Y)
					);
				This_Operator->Key_Position_Vector.push_back(Mouse_Position);
			}

			std::string Execute_Times = New_Config_String.substr(New_Config_String.find("执行"));
			Execute_Times = Execute_Times.substr(Execute_Times.find_first_of("1234567890"));
			Execute_Times = Execute_Times.substr(0, Execute_Times.find_first_not_of("1234567890"));

			int Execute_Times_Num = std::stoi(Execute_Times);

			This_Operator->Key_Time_Log_Vector.push_back(-Execute_Times_Num);
		}
		else if (New_Config_String.find("延迟") == std::string::npos && New_Config_String.find("鼠标滚轮") != std::string::npos)
		{

			std::string Mouse_WheelButton_Operator = "";
			if (New_Config_String.find("前滚") != std::string::npos)
			{
				Mouse_WheelButton_Operator = "前滚";
				This_Operator->Key_Value_Log_Vector.push_back(522);
				This_Operator->Key_Press_Data_Vector.push_back(0x780000);
			}
			else if (New_Config_String.find("后滚") != std::string::npos)
			{
				Mouse_WheelButton_Operator = "后滚";
				This_Operator->Key_Value_Log_Vector.push_back(522);
				This_Operator->Key_Press_Data_Vector.push_back(0xFF880000);
			}
			else if (New_Config_String.find("点击") != std::string::npos)
			{
				Mouse_WheelButton_Operator = "点击";
				This_Operator->Key_Value_Log_Vector.push_back(519);
			}


			Config_Date_String = New_Config_String.substr(New_Config_String.find("鼠标滚轮"));
			std::string Mouse_Position_X = "";
			std::string Mouse_Position_Y = "";
			Mouse_Position_X = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_X = Mouse_Position_X.substr(0, Mouse_Position_X.find_first_not_of("1234567890"));
			if (Config_Date_String.substr(Config_Date_String.find_first_of("1234567890") - 1, 1) == "-")
				Mouse_Position_X = '-' + Mouse_Position_X;
			Mouse_Position_Y = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_not_of("1234567890"));
			bool Is_Position_Y_Negative = false;
			if (Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890") - 1, 1) == "-")
				Is_Position_Y_Negative = true;
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(0, Mouse_Position_Y.find_first_not_of("1234567890"));
			if (Is_Position_Y_Negative)
				Mouse_Position_Y = '-' + Mouse_Position_Y;

			if (!This_Operator->Is_Relative_coordinates)
				This_Operator->Key_Position_Vector.push_back(std::pair<int, int>(std::stoi(Mouse_Position_X), std::stoi(Mouse_Position_Y)));
			else if (This_Operator->Is_Relative_coordinates)
			{
				Mouse_Position = std::pair<int, int>(
					Mouse_Position.first + std::stoi(Mouse_Position_X)
					, Mouse_Position.second + std::stoi(Mouse_Position_Y)
					);
				This_Operator->Key_Position_Vector.push_back(Mouse_Position);
			}

			std::string Execute_Times = New_Config_String.substr(New_Config_String.find(Mouse_WheelButton_Operator));
			Execute_Times = Execute_Times.substr(Execute_Times.find_first_of("1234567890"));
			Execute_Times = Execute_Times.substr(0, Execute_Times.find_first_not_of("1234567890"));

			int Execute_Times_Num = std::stoi(Execute_Times);

			This_Operator->Key_Time_Log_Vector.push_back(-Execute_Times_Num);
		}
		else if (New_Config_String.find("延迟") == std::string::npos && New_Config_String.find("鼠标侧键") != std::string::npos)
		{
			This_Operator->Key_Value_Log_Vector.push_back(523);
			Config_Date_String = New_Config_String.substr(New_Config_String.find("鼠标侧键"));

			std::string XButton_Num = "";
			Config_Date_String = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			XButton_Num = Config_Date_String.substr(0, Config_Date_String.find_first_not_of("1234567890"));

			This_Operator->Key_Press_Data_Vector.push_back(std::stoi(XButton_Num) * 16 * 16 * 16 * 16);

			Config_Date_String = Config_Date_String.substr(Config_Date_String.find_first_not_of("1234567890"));

			std::string Mouse_Position_X = "";
			std::string Mouse_Position_Y = "";
			Mouse_Position_X = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_X = Mouse_Position_X.substr(0, Mouse_Position_X.find_first_not_of("1234567890"));
			if (Config_Date_String.substr(Config_Date_String.find_first_of("1234567890") - 1, 1) == "-")
				Mouse_Position_X = '-' + Mouse_Position_X;
			Mouse_Position_Y = Config_Date_String.substr(Config_Date_String.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_not_of("1234567890"));
			bool Is_Position_Y_Negative = false;
			if (Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890") - 1, 1) == "-")
				Is_Position_Y_Negative = true;
			Mouse_Position_Y = Mouse_Position_Y.substr(Mouse_Position_Y.find_first_of("1234567890"));
			Mouse_Position_Y = Mouse_Position_Y.substr(0, Mouse_Position_Y.find_first_not_of("1234567890"));
			if (Is_Position_Y_Negative)
				Mouse_Position_Y = '-' + Mouse_Position_Y;

			if (!This_Operator->Is_Relative_coordinates)
				This_Operator->Key_Position_Vector.push_back(std::pair<int, int>(std::stoi(Mouse_Position_X), std::stoi(Mouse_Position_Y)));
			else if (This_Operator->Is_Relative_coordinates)
			{
				Mouse_Position = std::pair<int, int>(
					Mouse_Position.first + std::stoi(Mouse_Position_X)
					, Mouse_Position.second + std::stoi(Mouse_Position_Y)
					);
				This_Operator->Key_Position_Vector.push_back(Mouse_Position);
			}

			std::string Execute_Times = New_Config_String.substr(New_Config_String.find("执行"));
			Execute_Times = Execute_Times.substr(Execute_Times.find_first_of("1234567890"));
			Execute_Times = Execute_Times.substr(0, Execute_Times.find_first_not_of("1234567890"));

			int Execute_Times_Num = std::stoi(Execute_Times);

			This_Operator->Key_Time_Log_Vector.push_back(-Execute_Times_Num);
		}
		else if (New_Config_String.find("延迟") == std::string::npos && New_Config_String.find("键盘") != std::string::npos)
		{
			std::string Config_Data_String = New_Config_String.substr(New_Config_String.find("键盘"));
			Config_Data_String = Config_Data_String.substr(Config_Data_String.find_first_of(" ") + 1);
			Config_Data_String = Config_Data_String.substr(0, Config_Data_String.find("键"));
			HSDLogger::LogMessage("Add_Operation:键盘", Config_Data_String);
			HSDLogger::LogMessage("Add_Operation:键盘", std::to_string(Key_Value_Map[Config_Data_String]));
			This_Operator->Key_Value_Log_Vector.push_back(Key_Value_Map[Config_Data_String]);
			//This_Operator->Key_Press_Release_Vector.push_back(false);

			std::string Execute_Times = New_Config_String.substr(New_Config_String.find("执行"));
			Execute_Times = Execute_Times.substr(Execute_Times.find_first_of("1234567890"));
			Execute_Times = Execute_Times.substr(0, Execute_Times.find_first_not_of("1234567890"));

			int Execute_Times_Num = std::stoi(Execute_Times);

			This_Operator->Key_Time_Log_Vector.push_back(-Execute_Times_Num);

		}
		else if (New_Config_String.find("延时") != std::string::npos)
		{

			This_Operator->Key_Value_Log_Vector.push_back(-1);

			std::string Delay_Num_Str = New_Config_String.substr(New_Config_String.find_first_of("1234567890"));
			Delay_Num_Str = Delay_Num_Str.substr(0, Delay_Num_Str.find_first_not_of("1234567890"));
			int Delay_Num = std::stoi(Delay_Num_Str);

			This_Operator->Key_Time_Log_Vector.push_back(Delay_Num);
		}


	}
}

void MyStreamDockPlugin::Create_New_File(std::string File_Name_UTF8)
{
	std::string File_Name_Str = "config/" + File_Name_UTF8 + ".ini";
	char File_Name[200];
	UTF8ToGBK(File_Name_Str.c_str(), File_Name);
	std::fstream Add_Config(File_Name, std::ios::out);
	Add_Config << "{Key_Time_Log_Vector:[];\n" << "Key_Value_Log_Vector:[];\n" << "Key_Press_Data_Vector:[];\n" << "Key_Position_Vector:[];\n"
		<< "Key_Still_Press_Release:false;}\n";
	Add_Config.close();
	new_operator::/*new_operator::*/Record_Config_Names_Vector.push_back(File_Name_UTF8);

	//HSDLogger::LogMessage("Record_Config_Names_Vector", new_operator::Record_Config_Names_Vector[0]);
	Add_Config.open("config_list.ini", std::ios::in | std::ios::out | std::ios::app);
	Add_Config << File_Name_UTF8 << '\n';
	Add_Config.close();

	//This_Operator->Current_Name = File_Name_UTF8;

	//New_Get_Data_From_Local_Config(This_Operator);
}


new_operator::new_operator(const std::string& inAction, const std::string& inContext) :uuid(inAction), context(inContext)
{
	;
}

new_operator::new_operator(const new_operator& Last_Operator) :
	uuid(Last_Operator.uuid),
	context(Last_Operator.context),
	start_recording(Last_Operator.start_recording),
	Set_RecordKey(Last_Operator.Set_RecordKey),
	Last_KeyValue(Last_Operator.Last_KeyValue),
	Start_Record_KeyValue(Last_Operator.Start_Record_KeyValue),
	Start_Record_status_changed(Last_Operator.Start_Record_status_changed),
	Last_Key_Time(Last_Operator.Last_Key_Time),
	Key_Time_Log_Vector(Last_Operator.Key_Time_Log_Vector),
	Key_Value_Log_Vector(Last_Operator.Key_Value_Log_Vector),
	Key_Position_Vector(Last_Operator.Key_Position_Vector),
	Current_Name("")
{

	for (int i = 0; i < 256; i++)
	{
		Is_Down[i] = Last_Operator.Is_Down[i];
	}

}

new_operator::~new_operator()
{
	if (My_Recording_Change_Image != nullptr)
	{
		My_Recording_Change_Image->stop();
		delete My_Recording_Change_Image;
		My_Recording_Change_Image = nullptr;
	}
	if (m_SendInput_Event_Timer != nullptr)
	{
		m_SendInput_Event_Timer->stop();
		delete m_SendInput_Event_Timer;
		m_SendInput_Event_Timer = nullptr;
	}

}

//std::string& new_operator::Get_Name()
//{
//	return name;
//}


//屏幕整体分辨率
void get_screen_Dpi(int* cx, int* cy)
{
	HDC hdc = GetDC(NULL);
	*cx = GetDeviceCaps(hdc, DESKTOPHORZRES);
	*cy = GetDeviceCaps(hdc, DESKTOPVERTRES);
	ReleaseDC(NULL, hdc);

}

//屏幕整体尺寸
void get_screen_size(int* cx, int* cy)
{
	HDC hdc = GetDC(NULL);
	*cx = GetDeviceCaps(hdc, HORZRES);
	*cy = GetDeviceCaps(hdc, VERTRES);
	ReleaseDC(NULL, hdc);

}

void UTF8ToGBK(const char* cUtf8, char* cGbk)
{
	int len = MultiByteToWideChar(CP_UTF8, 0, cUtf8, -1, NULL, 0);
	wchar_t* wstr = new wchar_t[len + 1];
	memset(wstr, 0, len + 1);
	MultiByteToWideChar(CP_UTF8, 0, cUtf8, -1, wstr, len);

	len = WideCharToMultiByte(936, 0, wstr, -1, NULL, 0, NULL, NULL);
	WideCharToMultiByte(936, 0, wstr, -1, cGbk, len, NULL, NULL);

	delete[] wstr;
}

void GBKTOUTF8(string& strGBK)//转码 GBK编码转成UTF8编码
{
	int len = MultiByteToWideChar(CP_ACP, 0, strGBK.c_str(), -1, NULL, 0);
	wchar_t* wszUtf8 = new wchar_t[len];
	memset(wszUtf8, 0, len);
	MultiByteToWideChar(CP_ACP, 0, strGBK.c_str(), -1, wszUtf8, len);
	len = WideCharToMultiByte(CP_UTF8, 0, wszUtf8, -1, NULL, 0, NULL, NULL);
	char* szUtf8 = new char[len + 1];
	memset(szUtf8, 0, len + 1);
	WideCharToMultiByte(CP_UTF8, 0, wszUtf8, -1, szUtf8, len, NULL, NULL);
	strGBK = szUtf8;
	delete[] szUtf8;
	delete[] wszUtf8;
}



static const std::string base64_chars =
"ABCDEFGHIJKLMNOPQRSTUVWXYZ"
"abcdefghijklmnopqrstuvwxyz"
"0123456789+/";
std::string base64_encode(const char* bytes_to_encode, unsigned int in_len)
{
	std::string ret;
	int i = 0;
	int j = 0;
	unsigned char char_array_3[3];
	unsigned char char_array_4[4];

	while (in_len--)
	{
		char_array_3[i++] = *(bytes_to_encode++);
		if (i == 3)
		{
			char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
			char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
			char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
			char_array_4[3] = char_array_3[2] & 0x3f;
			for (i = 0; (i < 4); i++)
			{
				ret += base64_chars[char_array_4[i]];
			}
			i = 0;
		}
	}
	if (i)
	{
		for (j = i; j < 3; j++)
		{
			char_array_3[j] = '\0';
		}

		char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
		char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
		char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
		char_array_4[3] = char_array_3[2] & 0x3f;

		for (j = 0; (j < i + 1); j++)
		{
			ret += base64_chars[char_array_4[j]];
		}

		while ((i++ < 3))
		{
			ret += '=';
		}

	}
	return ret;
}


// 同一文件内多个宏录制配置   SendToPlugin事件中
	//else if (inAction == "com.hotspot.stream.Record_Replay")
	//{
	//	if (payload.find("宏录制") != std::string::npos)
	//	{
	//		HSDLogger::LogMessage("Record_Replay", "find_text!");
	//	}

	//	if (title == "Add_Config")
	//	{
	//		HSDLogger::LogMessage("title", "Add_Config!");
	//		std::fstream Add_Config("config.ini", std::ios::in | std::ios::out | std::ios::app);
	//		Add_Config << "{config" + content + ":\n" << "Key_Time_Log_Vector:[];\n" << "Key_Value_Log_Vector:[];\n" << "Key_Position_Vector:[];}\n";
	//		Add_Config.close();

	//	}
	//	else if (title == "Delete_Config")
	//	{
	//		new_operator* This_Operator;
	//		for (auto p : mVisibleContexts)
	//		{
	//			if (p->uuid == inAction && p->context == inContext)
	//			{
	//				This_Operator = p;
	//				break;

	//			}
	//		}

	//		HSDLogger::LogMessage("title", "Delete_Config!");
	//		std::ifstream Delete_Config_Fstream("config.ini", std::ios::in | std::ios::out);
	//		std::string Delete_Str;
	//		std::vector<std::string>Config_Str_Vector;
	//		int count = 0;
	//		bool Is_Delete_Str = false;
	//		while (getline(Delete_Config_Fstream, Delete_Str))
	//		{

	//			if (Delete_Str.find("{config" + content + ":") != std::string::npos)
	//			{
	//				Is_Delete_Str = true;
	//			}
	//			if (Is_Delete_Str && count < 4)
	//			{
	//				count++;
	//				continue;
	//			}
	//			Config_Str_Vector.push_back(Delete_Str /*+ '\n'*/);

	//		}
	//		Delete_Config_Fstream.close();

	//		std::fstream New_Config("config.ini", std::ios::in | std::ios::out | std::ios::trunc);
	//		for (auto p : Config_Str_Vector)
	//		{
	//			New_Config << p + '\n';
	//		}
	//		New_Config.close();

	//		//下次修改从此开始
	//		This_Operator->Current_Name = "";
	//		Get_Data_From_Local_Config(This_Operator);

	//	}
	//	else if (title == "Change_Select")
	//	{
	//		HSDLogger::LogMessage("title", "Change_Select!");
	//		new_operator* This_Operator;

	//		for (auto p : mVisibleContexts)
	//		{
	//			if (p->uuid == inAction && p->context == inContext)
	//			{
	//				This_Operator = p;
	//				This_Operator->Current_Name = content;
	//				HSDLogger::LogMessage("Current_Name", This_Operator->Current_Name);
	//				break;
	//			}
	//		}

	//		Get_Data_From_Local_Config(This_Operator);
	//		//for (int i = 0; i < 256; i++)
	//		//	This_Operator->Is_Down[i] = false;

	//		//std::ifstream Change_Select_Stream("config.ini", std::ios::in | std::ios::out);
	//		//std::string Change_Select_String;
	//		//bool Is_Change_Select_String_Find = false;
	//		//int count = 0;
	//		//while (getline(Change_Select_Stream, Change_Select_String))
	//		//{
	//		//	HSDLogger::LogMessage("Change_Select_String", Change_Select_String);
	//		//	if (Change_Select_String.find("config" + This_Operator->Current_Name) != std::string::npos)
	//		//	{
	//		//		This_Operator->Key_Time_Log_Vector.clear();
	//		//		This_Operator->Key_Value_Log_Vector.clear();
	//		//		This_Operator->Key_Position_Vector.clear();

	//		//		Is_Change_Select_String_Find = true;
	//		//		count++;
	//		//		continue;
	//		//	}
	//		//	if (Is_Change_Select_String_Find && count == 1)
	//		//	{
	//		//		while (Change_Select_String.find_first_of("1234567890") != std::string::npos)
	//		//		{
	//		//			Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_of("1234567890"));
	//		//			std::string Time_String = Change_Select_String.substr(0, Change_Select_String.find_first_not_of("1234567890"));
	//		//			This_Operator->Key_Time_Log_Vector.push_back(std::stoi(Time_String));
	//		//			Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_not_of("1234567890"));
	//		//		}



	//		//		count++;
	//		//	}
	//		//	else if (Is_Change_Select_String_Find && count == 2)
	//		//	{
	//		//		while (Change_Select_String.find_first_of("1234567890") != std::string::npos)
	//		//		{
	//		//			Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_of("1234567890"));
	//		//			std::string Value_String = Change_Select_String.substr(0, Change_Select_String.find_first_not_of("1234567890"));
	//		//			This_Operator->Key_Value_Log_Vector.push_back(std::stoi(Value_String));
	//		//			Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_not_of("1234567890"));
	//		//		}
	//		//		count++;
	//		//	}
	//		//	else if (Is_Change_Select_String_Find && count == 3)
	//		//	{
	//		//		while (Change_Select_String.find_first_of("1234567890") != std::string::npos)
	//		//		{
	//		//			Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_of("1234567890"));
	//		//			std::string Position_String_First = Change_Select_String.substr(0, Change_Select_String.find_first_not_of("1234567890"));
	//		//			//This_Operator->Key_Time_Log_Vector.push_back(std::stoi(Position_String_First));
	//		//			Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_not_of("1234567890"));

	//		//			Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_of("1234567890"));
	//		//			std::string Position_String_second = Change_Select_String.substr(0, Change_Select_String.find_first_not_of("1234567890"));
	//		//			This_Operator->Key_Position_Vector.push_back(std::pair<int,int>( std::stoi(Position_String_First), std::stoi(Position_String_second) ));
	//		//			Change_Select_String = Change_Select_String.substr(Change_Select_String.find_first_not_of("1234567890"));
	//		//		}
	//		//		count++;

	//		//		for (auto p : This_Operator->Key_Value_Log_Vector)
	//		//			HSDLogger::LogMessage("Key_Value_Log_Vector", std::to_string(p));
	//		//		for (auto p : This_Operator->Key_Time_Log_Vector)
	//		//			HSDLogger::LogMessage("Key_Time_Log_Vector", std::to_string(p));

	//		//		Restore_Empty_Log(This_Operator);
	//		//		break;

	//		//	}
	//		//	//else if (count == 4)
	//		//	//{
	//		//	//	for(auto p : This_Operator->Key_Value_Log_Vector)
	//		//	//		HSDLogger::LogMessage("Key_Value_Log_Vector", std::to_string(p));
	//		//	//	for (auto p : This_Operator->Key_Time_Log_Vector)
	//		//	//		HSDLogger::LogMessage("Key_Time_Log_Vector", std::to_string(p));

	//		//	//	Restore_Empty_Log(This_Operator);
	//		//	//	break;
	//		//	//}


	//		//}
	//		//Change_Select_Stream.close();

	//	}
	//	else if (title == "Load_Config_List")
	//	{

	//		new_operator* This_Operator;

	//		for (auto p : mVisibleContexts)
	//		{
	//			if (p->uuid == inAction && p->context == inContext)
	//			{
	//				This_Operator = p;
	//			}
	//		}

	//		std::string File_Path = content;
	//		//std::ifstream New_Config_Load(File_Path.c_str(), std::ios::in | std::ios::out);
	//		//char* GBK_File_Path = new char[File_Path.size()];
	//		char GBK_File_Path[200] = { 0 };
	//		UTF8ToGBK(File_Path.c_str(), GBK_File_Path);
	//		std::ifstream New_Config_Load(GBK_File_Path, std::ios::in | std::ios::out);

	//		//GBKTOUTF8(File_Path);
	//		//std::ifstream New_Config_Load(File_Path, std::ios::in | std::ios::out);

	//		if (New_Config_Load.is_open())
	//		{
	//			HSDLogger::LogMessage("Open_Config_File", "successful");
	//		}
	//		else
	//		{
	//			HSDLogger::LogMessage("Open_Config_File", "failed");
	//			//if (File_Path.find("Users") != std::string::npos)
	//			//{
	//			//	File_Path.replace(File_Path.find("users"), 5, "用户");
	//			//	New_Config_Load.open(File_Path.c_str(), std::ios::in | std::ios::out);
	//			//	if (New_Config_Load.is_open())
	//			//	{
	//			//		HSDLogger::LogMessage("Open_Config_File2", "successful");
	//			//	}
	//			//	else
	//			//	{
	//			//		HSDLogger::LogMessage("Open_Config_File2", "successful");
	//			//	}
	//			//}

	//		}

	//		std::vector<std::string>New_Config_List_Vector;
	//		std::string Config_String = "";
	//		HSDLogger::LogMessage("Load_Config_List", File_Path);
	//		while (getline(New_Config_Load, Config_String))
	//		{
	//			HSDLogger::LogMessage("Load_Config_List", Config_String);
	//			New_Config_List_Vector.push_back(Config_String);
	//		}
	//		New_Config_Load.close();

	//		std::fstream New_Config_Load_To_Local("config.ini", std::ios::in | std::ios::out | std::ios::app);
	//		for (auto p : New_Config_List_Vector)
	//		{
	//			New_Config_Load_To_Local << p;
	//			New_Config_Load_To_Local << '\n';
	//		}
	//		New_Config_Load_To_Local.close();

	//		//重复录入ing...
	//		std::fstream Get_Config_Name_To_PropertyInspector("config.ini", std::ios::in | std::ios::out);
	//		std::string Config_Name_String = "";
	//		int Name_Count = 0;
	//		json Select_Config_Name_Json;
	//		while (getline(Get_Config_Name_To_PropertyInspector, Config_Name_String))
	//		{
	//			if (Name_Count % 4 == 0)
	//			{
	//				Select_Config_Name_Json["Config_Name_List"][Name_Count / 4] = Config_Name_String.substr(1 + 6, Config_Name_String.size() - 1 - 1 - 6);
	//			}
	//			Name_Count++;
	//			//Name_Count %= 4;
	//		}
	//		mConnectionManager->SendToPropertyInspector(This_Operator->uuid, This_Operator->context, Select_Config_Name_Json);
	//		Get_Config_Name_To_PropertyInspector.close();

	//		Get_Data_From_Local_Config(This_Operator);


	//	}

	//	}


//KeyDown 录制回放插件的第二部分  差异较大
		//else if (!This_Operator->Is_First_Time_Click && This_Operator->start_recording)
		//{
		//	This_Operator->start_recording = false;
		//	if (mVisibleContexts.empty())
		//	{
		//		Is_Exit = true;
		//	}
		//	else if (!mVisibleContexts.empty())
		//	{
		//		for (auto p : mVisibleContexts)
		//		{
		//			if (p->start_recording)
		//				break;
		//			else if (p == mVisibleContexts.back())
		//				Is_Exit = true;
		//		}
		//	}



		//	json Json_Value;
		//	Json_Value["Recording_Status"] = "Stop";

		//	mConnectionManager->SendToPropertyInspector(This_Operator->uuid, This_Operator->context, Json_Value);

		//	std::ifstream Change_Config_Stream("config.ini", std::ios::in | std::ios::out);
		//	std::string Change_String;
		//	std::vector<std::string>Config_String_Vector;
		//	int count = 0;
		//	bool Is_Change_String = false;
		//	while (getline(Change_Config_Stream, Change_String))
		//	{
		//		if (Change_String.find("config" + This_Operator->Current_Name) != std::string::npos)
		//		{
		//			Is_Change_String = true;
		//		}
		//		if (Is_Change_String && count == 0)
		//		{

		//			Config_String_Vector.push_back(Change_String);

		//			count++;
		//			continue;
		//		}
		//		else if (Is_Change_String && count == 1)
		//		{

		//			std::string Time_Log_String;
		//			Time_Log_String = "Key_Time_Log_Vector:[";

		//			for (auto p : This_Operator->Key_Time_Log_Vector)
		//			{
		//				Time_Log_String += std::to_string(p);
		//				Time_Log_String += ",";
		//			}

		//			Time_Log_String.erase(Time_Log_String.end() - 1);
		//			Time_Log_String += "];";
		//			Config_String_Vector.push_back(Time_Log_String);

		//			count++;
		//			continue;
		//		}
		//		else if (Is_Change_String && count == 2)
		//		{

		//			std::string Time_Log_String;
		//			Time_Log_String = "Key_Value_Log_Vector:[";

		//			for (auto p : This_Operator->Key_Value_Log_Vector)
		//			{
		//				Time_Log_String += std::to_string(p);
		//				Time_Log_String += ",";
		//			}

		//			Time_Log_String.erase(Time_Log_String.end() - 1);
		//			Time_Log_String += "];";
		//			Config_String_Vector.push_back(Time_Log_String);

		//			count++;
		//			continue;
		//		}
		//		else if (Is_Change_String && count == 3)
		//		{

		//			std::string Time_Log_String;
		//			Time_Log_String = "Key_Position_Vector:[";

		//			if (!This_Operator->Key_Position_Vector.empty())
		//			{
		//				for (auto p : This_Operator->Key_Position_Vector)
		//				{

		//					Time_Log_String += '(' + std::to_string(p.first) + ',' + std::to_string(p.second) + ')';
		//					Time_Log_String += ",";
		//				}

		//				Time_Log_String.erase(Time_Log_String.end() - 1);
		//			}


		//			Time_Log_String += "];";
		//			Time_Log_String += "}";

		//			Config_String_Vector.push_back(Time_Log_String);

		//			count++;
		//			continue;
		//		}

		//		Config_String_Vector.push_back(Change_String /*+ '\n'*/);
		//	}

		//	Change_Config_Stream.close();

		//	std::fstream New_Config("config.ini", std::ios::in | std::ios::out | std::ios::trunc);
		//	for (auto p : Config_String_Vector)
		//	{
		//		New_Config << p + '\n';
		//	}
		//	New_Config.close();

		//	}