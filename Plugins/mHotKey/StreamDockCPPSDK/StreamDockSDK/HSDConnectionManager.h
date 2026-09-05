//==============================================================================
/**
@file       HSDConnectionManager.h

@brief      Wrapper to implement the communication with the Stream Deck
application

@copyright  (c) 2018, Corsair Memory, Inc.
      This source code is licensed under the MIT-style license found in the
LICENSE file.

**/
//==============================================================================

#pragma once


#include <websocketpp/client.hpp> //1 template class
#include <websocketpp/common/memory.hpp> //2
#include <websocketpp/common/thread.hpp> //3
#include <websocketpp/config/asio_no_tls_client.hpp>  //4 1需要和4配置文件共同使用



#include <MyStreamDockPlugin.h>
#include "HSDBasePlugin.h"
#include "HSDSDKDefines.h"

//typedef server::message_ptr message_ptr;   //网上数据类型
//typedef websocketpp::serverwebsocketpp::config::asio server;

//typedef websocketpp::config::asio::message_type::ptr message_ptr;
//typedef websocketpp::server<websocketpp::config::asio> server;

typedef websocketpp::config::asio_client::message_type::ptr message_ptr;
typedef websocketpp::client<websocketpp::config::asio_client> WebsocketClient;

//typedef websocketpp::config::asio_client::message_type::ptr

class HSDConnectionManager {
 public:
  HSDConnectionManager(
    int inPort,
    const std::string& inPluginUUID,
    const std::string& inRegisterEvent,
    const std::string& inInfo,
    HSDBasePlugin* inPlugin);

  // Start the event loop
  void Run();

  // API to communicate with the Stream Deck application
  void SetTitle(
    const std::string& inTitle,
    const std::string& inContext,
    ESDSDKTarget inTarget,
    int state = -1);
  void SetImage(
    const std::string& inBase64ImageString,
    const std::string& inContext,
    ESDSDKTarget inTarget,
    int state = -1);
  void ShowAlertForContext(const std::string& inContext);
  void ShowOKForContext(const std::string& inContext);
  void SetSettings(
    const nlohmann::json& inSettings,
    const std::string& inContext);
  void GetGlobalSettings();
  void SetGlobalSettings(const nlohmann::json& inSettings);
  void SetState(int inState, const std::string& inContext);
  void SendToPropertyInspector(
    const std::string& inAction,
    const std::string& inContext,
    const nlohmann::json& inPayload);
  void SwitchToProfile(
    const std::string& inDeviceID,
    const std::string& inProfileName);
  void LogMessage(const std::string& inMessage);

  std::shared_ptr<asio::io_context> GetAsioContext() const;

 private:
  // Websocket callbacks
  void OnOpen(
    WebsocketClient* inClient,
    websocketpp::connection_hdl inConnectionHandler);
  void OnFail(
    WebsocketClient* inClient,
    websocketpp::connection_hdl inConnectionHandler);
  void OnClose(
    WebsocketClient* inClient,
    websocketpp::connection_hdl inConnectionHandler);
  void OnMessage(
    websocketpp::connection_hdl,
    WebsocketClient::message_ptr inMsg);
  

  // Member variables
  int mPort = 0;
  std::string mPluginUUID;
  std::string mRegisterEvent;
  std::string mInfo;
  websocketpp::connection_hdl mConnectionHandle;
  WebsocketClient mWebsocket;
  HSDBasePlugin* mPlugin = nullptr;
  std::shared_ptr<asio::io_context> mAsioContext;
};
