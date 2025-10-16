// import { createRequire } from "module";
// const require = createRequire(import.meta.url);
// const path = require("path");
const WebSocket = require("ws");
// try {
//   const __dirname = path.resolve();
//   process.chdir(__dirname);
//   const inspector = require("inspector");
//   inspector.open(9229, "127.0.0.1", true);
//   console.log("Inspector listening at:", inspector.url());
//   debugger;
// } catch (e) {
//   console.error("Failed to open inspector:", e);
// }

const { Plugins, Actions, log } = require("./utils/plugin");
const {
  proxyGet,
  proxyPost,
  getUserInfo,
  twitchProxyGet,
  twitchProxyDelete,
  twitchProxyPatch,
  twitchProxyPost,
  twitchProxyPut,
} = require("./utils/request");
const tools = require("./utils/tools");
const fs = require("fs-extra");
const plugin = new Plugins();

let chatSettings = {};
let config;
const contexts = {
  emote_modes: [],
  follower_modes: [],
  slow_modes: [],
  subscriber_modes: [],
  is_actives: [],
};
const objLock = { value: 0 };
try {
  config = JSON.parse(
    fs.readFileSync("plugin/configuration/config.json", "utf8")
  );
} catch (error) {
  log.info("", error);
}
let pollState;

getUserInfo()
  .then(async (userInfo) => {
    // 判断是否有本地缓存
    if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
      await validateToken(userInfo)
        .then(async (data) => {
          if (data && Object.keys(userInfo).length > 0) {
            // 将数据缓存到
            await setChatSettings(userInfo);
          }
        })
        .catch((error) => {
          log.info(error);
        });
    }
  })
  .catch((error) => {
    log.info("error", error);
  });

const throttledFunction = tools.executeOnceAtATime(async (context, payload) => {
  await getUserInfo()
    .then(async (userInfo) => {
      objLock.value += 1;
      // 判断是否有本地缓存
      if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
        const urlApi = "https://api.twitch.tv/helix/moderation/shield_mode";
        const paramTwo = {
          headers: {
            "Client-Id": config.clientId,
            "Content-Type": "application/json",
          },
          params: {
            broadcaster_id: userInfo.id,
            moderator_id: userInfo.id,
          },
        };
        await twitchProxyPut(
          urlApi,
          {
            is_active: !chatSettings.is_active,
          },
          paramTwo
        )
          .then((result) => {
            plugin.sendToPropertyInspector({
              openRemindinWindow8: {
                message: "执行成功！",
                time: 5000,
              },
            });
          })
          .catch((err) => {
            if (err.response.status === 429) {
              plugin.sendToPropertyInspector({
                openRemindinWindow8: {
                  message: "执行异常！",
                  time: 5000,
                },
              });
            }
            log.info("twitchProxyPatch err", err);
          });
      } else {
        plugin.sendToPropertyInspector({ inputChange: "{}" });
        plugin.sendToPropertyInspector({ openLoginWindow: "" });
        //添加一个唤起 登录窗口  通知 属性检查器 触发一次点击事件
      }
    })
    .catch((error) => {
      log.info("error", error);
    });
});

//-------------------------------------- 对应属性检查器 特有操作--------------------------------------
///消息聊天
plugin.action1 = new Actions({
  default: {
    activeChannel: null, // 当前活跃频道
  },
  // 出现
  _propertyInspectorDidAppear() {
    // 获取用户本地缓存信息
    getUserInfo()
      .then((userInfo) => {
        // log.info("userInfo", userInfo)
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          plugin.sendToPropertyInspector({
            inputChange: userInfo.display_name,
          });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
        }
      })
      .catch((error) => {
        log.info("error", error);
      });
  },
  sendToPlugin({ payload }) {
    // log.info("payload sendToPlugin", payload)
    if (payload != null && payload != undefined && payload != "") {
      // 表示需要执行 内容
      Object.keys(payload).forEach((key) => {
        executeMethod(key, payload[key]);
      });
    }
  },
  // 键盘摁下
  keyDown({ payload }) {
    getUserInfo()
      .then(async (userInfo) => {
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          // const channel = `#${userInfo.display_name}`; // 替换为你的频道

          // 1. 确定目标频道（优先使用 payload 的设置）
          let channel_id;
          if (payload.settings.channel && payload.settings.channel !== "") {
            channel_id = await getChannelID(
              payload.settings.channel.replace(/^#/, "")
            );
          } else {
            channel_id = userInfo.id;
          }

          if (payload.settings.message === undefined) {
            payload.settings.message = "";
          }
          const paramTwo = {
            headers: {
              "Client-Id": config.clientId,
              "Content-Type": "application/json",
            },
            timeout: 5000,
          };
          if (tools.isNullOrWhitespace(payload.settings.message)) {
            plugin.sendToPropertyInspector({
              openRemindinWindow1: {
                message: "请输入合法内容！",
                time: 5000,
              },
            });
            return;
          }
          twitchProxyPost(
            "https://api.twitch.tv/helix/chat/messages",
            {
              broadcaster_id: channel_id,
              sender_id: userInfo.id,
              message: payload.settings.message,
            },
            paramTwo
          )
            .then((result) => {
              plugin.sendToPropertyInspector({
                openRemindinWindow1: {
                  message: "发送成功！",
                  time: 5000,
                },
              });
            })
            .catch((error) => {
              log.info("twitchProxyPost error", error);
              plugin.sendToPropertyInspector({
                openRemindinWindow1: {
                  message: "执行异常！请重启软件！",
                  time: 5000,
                },
              });
            });

          // 开启聊天消息
          //   initWebSocket(channel)
          //     .then(async (client) => {
          //       if (client.readyState !== 1) {
          //         client.on("open", function () {
          //           log.info(
          //             "WebSocket Client Connected",
          //             password,
          //             account,
          //             channel
          //           );
          //           client.send(`PASS ${password}`);
          //           client.send(`NICK ${account}`);
          //           client.send(`JOIN ${channel}`);
          //         });
          //       }
          //       if (tools.isNullOrWhitespace(payload.settings.message)) {
          //         plugin.sendToPropertyInspector({
          //           openRemindinWindow1: {
          //             message: "请输入合法内容！",
          //             time: 5000,
          //           },
          //         });
          //       } else {
          //         // 4. 处理频道切换
          //         if (this.default.activeChannel !== channel) {
          //           client.send(`JOIN ${channel}`);
          //           await new Promise((resolve) => setTimeout(resolve, 1000)); // 避免速率限制
          //           // 不为null 退出
          //           if (this.default.activeChannel) {
          //             client.send(`PART ${this.default.activeChannel}`);
          //           }
          //         }
          //         this.default.activeChannel = channel;
          //         log.info(
          //           "payload.settings.message",
          //           channel,
          //           payload.settings.message
          //         );
          //         client.send(`PRIVMSG ${channel} :${payload.settings.message}`);
          //         plugin.sendToPropertyInspector({
          //           openRemindinWindow1: {
          //             message: "发送成功！",
          //             time: 5000,
          //           },
          //         });
          //       }
          //     })
          //     .catch((error) => {
          //       plugin.sendToPropertyInspector({
          //         openRemindinWindow1: {
          //           message: "执行异常！请重启软件！",
          //           time: 5000,
          //         },
          //       });
          //       log.info("error 键盘摁下", error);
          //     });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
          plugin.sendToPropertyInspector({ openLoginWindow: "" });
          //添加一个唤起 登录窗口  通知 属性检查器 触发一次点击事件
        }
      })
      .catch((error) => {
        log.info("error", error);
      });
  },
});
// 消息清空
plugin.action2 = new Actions({
  default: {},
  _willAppear({ context, payload }) {
    // 默认的初始化操作
  },
  // 出现
  _propertyInspectorDidAppear() {
    // 获取用户本地缓存信息
    getUserInfo()
      .then((userInfo) => {
        // log.info("userInfo", userInfo)
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          plugin.sendToPropertyInspector({
            inputChange: userInfo.display_name,
          });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
        }
      })
      .catch((error) => {
        log.info("error", error);
      });
  },
  sendToPlugin({ context, payload }) {
    // log.info("payload sendToPlugin", payload)
    if (payload != null && payload != undefined && payload != "") {
      // 表示需要执行 内容
      Object.keys(payload).forEach((key) => {
        executeMethod(key, payload[key]);
      });
    }
  },
  // 键盘摁下
  keyDown({ payload }) {
    getUserInfo()
      .then(async (userInfo) => {
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          const urlApi = "https://api.twitch.tv/helix/moderation/chat";
          twitchProxyDelete(urlApi, {
            params: {
              broadcaster_id: userInfo.id,
              moderator_id: userInfo.id,
            },
            headers: {
              "Client-Id": config.clientId,
            },
          })
            .then((data) => {
              plugin.sendToPropertyInspector({
                openRemindinWindow2: {
                  message: "执行成功！",
                  time: 5000,
                },
              });
              log.info(data);
            })
            .catch((err) => {
              plugin.sendToPropertyInspector({
                openRemindinWindow2: {
                  message: "执行失败！",
                  time: 5000,
                },
              });
              log.info(err);
            });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
          plugin.sendToPropertyInspector({ openLoginWindow: "" });
          //添加一个唤起 登录窗口  通知 属性检查器 触发一次点击事件
        }
      })
      .catch((error) => {
        log.info("error", error);
        plugin.sendToPropertyInspector({
          openRemindinWindow1: {
            message: "执行异常！请重启软件！",
            time: 5000,
          },
        });
      });
  },
});
// 表情聊天
plugin.action3 = new Actions({
  default: {},
  _willDisappear({ context }) {
    tools.removeElementsByValue(contexts.emote_modes, context);
    log.info("context", context);
  },
  _willAppear({ context, payload }) {
    // 默认的初始化操作
    contexts.emote_modes.push(context);
    if (tools.isNotEmptyObject(chatSettings) && chatSettings.emote_mode) {
      plugin.setState(context, 1);
    } else {
      plugin.setState(context, 0);
    }
  },
  // 出现
  _propertyInspectorDidAppear() {
    // 获取用户本地缓存信息
    getUserInfo()
      .then((userInfo) => {
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          plugin.sendToPropertyInspector({
            inputChange: userInfo.display_name,
          });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
        }
      })
      .catch((error) => {
        log.info("error", error);
      });
  },
  sendToPlugin({ context, payload }) {
    // log.info("payload sendToPlugin", payload)
    if (payload != null && payload != undefined && payload != "") {
      // 表示需要执行 内容
      Object.keys(payload).forEach((key) => {
        executeMethod(key, payload[key]);
      });
    }
  },
  // 键盘摁下
  keyDown({ context, payload }) {
    getUserInfo()
      .then(async (userInfo) => {
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          const urlApi = "https://api.twitch.tv/helix/chat/settings";
          const paramTwo = {
            params: {
              broadcaster_id: userInfo.id,
              moderator_id: userInfo.id,
            },
            headers: {
              "Client-Id": config.clientId,
            },
          };
          twitchProxyPatch(
            urlApi,
            { emote_mode: !chatSettings.emote_mode },
            paramTwo
          )
            .then((data) => {
              log.info("表情聊天 被触发");
              plugin.sendToPropertyInspector({
                openRemindinWindow3: {
                  message: "执行成功！",
                  time: 5000,
                },
              });
            })
            .catch((err) => {
              plugin.sendToPropertyInspector({
                openRemindinWindow3: {
                  message: "执行失败！",
                  time: 5000,
                },
              });
              log.info(err);
            });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
          plugin.sendToPropertyInspector({ openLoginWindow: "" });
          //添加一个唤起 登录窗口  通知 属性检查器 触发一次点击事件
        }
      })
      .catch((error) => {
        plugin.sendToPropertyInspector({
          openRemindinWindow1: {
            message: "执行异常！请重启软件！",
            time: 5000,
          },
        });
        log.info("error", error);
      });
  },
});
// 关注者聊天
plugin.action4 = new Actions({
  default: {},
  _willDisappear({ context }) {
    tools.removeElementsByValue(contexts.follower_modes, context);
  },
  _willAppear({ context, payload }) {
    // 默认的初始化操作
    contexts.follower_modes.push(context);
    if (tools.isNotEmptyObject(chatSettings) && chatSettings.follower_mode) {
      plugin.setState(context, 1);
    } else {
      plugin.setState(context, 0);
    }
  },
  // 出现
  _propertyInspectorDidAppear() {
    // 获取用户本地缓存信息
    getUserInfo()
      .then((userInfo) => {
        // log.info("userInfo", userInfo)
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          plugin.sendToPropertyInspector({
            inputChange: userInfo.display_name,
          });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
        }
      })
      .catch((error) => {
        log.info("error", error);
      });
  },
  sendToPlugin({ context, payload }) {
    // log.info("payload sendToPlugin", payload)
    if (payload != null && payload != undefined && payload != "") {
      // 表示需要执行 内容
      Object.keys(payload).forEach((key) => {
        executeMethod(key, payload[key]);
      });
    }
  },
  // 键盘摁下
  keyDown({ context, payload }) {
    getUserInfo()
      .then(async (userInfo) => {
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          const urlApi = "https://api.twitch.tv/helix/chat/settings";
          const paramTwo = {
            params: {
              broadcaster_id: userInfo.id,
              moderator_id: userInfo.id,
            },
            headers: {
              "Client-Id": config.clientId,
            },
          };
          twitchProxyPatch(
            urlApi,
            {
              follower_mode: !chatSettings.follower_mode,
              follower_mode_duration: payload.settings.followerDuration,
            },
            paramTwo
          )
            .then((data) => {
              log.info(data);
              plugin.sendToPropertyInspector({
                openRemindinWindow4: {
                  message: "执行成功！",
                  time: 5000,
                },
              });
            })
            .catch((err) => {
              log.info(err);
              plugin.sendToPropertyInspector({
                openRemindinWindow4: {
                  message: "执行失败！",
                  time: 5000,
                },
              });
            });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
          plugin.sendToPropertyInspector({ openLoginWindow: "" });
          //添加一个唤起 登录窗口  通知 属性检查器 触发一次点击事件
        }
      })
      .catch((error) => {
        log.info("error", error);
        plugin.sendToPropertyInspector({
          openRemindinWindow1: {
            message: "执行异常！请重启软件！",
            time: 5000,
          },
        });
      });
  },
});
// 播放广告
plugin.action5 = new Actions({
  default: {},
  _willAppear({ context, payload }) {
    // 默认的初始化操作
  },
  // 出现
  _propertyInspectorDidAppear() {
    // 获取用户本地缓存信息
    getUserInfo()
      .then((userInfo) => {
        // log.info("userInfo", userInfo)
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          plugin.sendToPropertyInspector({
            inputChange: userInfo.display_name,
          });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
        }
      })
      .catch((error) => {
        log.info("error", error);
      });
  },
  sendToPlugin({ context, payload }) {
    // log.info("payload sendToPlugin", payload)
    if (payload != null && payload != undefined && payload != "") {
      // 表示需要执行 内容
      Object.keys(payload).forEach((key) => {
        executeMethod(key, payload[key]);
      });
    }
  },
  // 键盘摁下
  keyDown({ context, payload }) {
    getUserInfo()
      .then(async (userInfo) => {
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          //没过期
          //第一步 发送一个请求获取到用户的状态 查看是否正在直播

          const url = "https://api.twitch.tv/helix/streams";
          const param = {
            user_id: userInfo.id,
            user_login: userInfo.login,
          };
          twitchProxyGet(url, {
            params: param,
            headers: {
              "Client-Id": config.clientId,
            },
          })
            .then((res) => {
              if (Array.isArray(res.data) && res.data.length > 0) {
                const urlApi =
                  "https://api.twitch.tv/helix/channels/commercial";
                const paramTwo = {
                  headers: {
                    "Client-Id": config.clientId,
                    "Content-Type": "application/json",
                  },
                };
                twitchProxyPost(
                  urlApi,
                  {
                    broadcaster_id: userInfo.id,
                    length: payload.settings.commercialTime || 30,
                  },
                  paramTwo
                )
                  .then((data) => {
                    // log.info(data)
                    // 发送一条消息给属性检查 让他展示点东西出来
                    plugin.sendToPropertyInspector({
                      openRemindinWindow5: {
                        message: "播放成功！",
                        time: 5000,
                      },
                    });
                  })
                  .catch((err) => {
                    log.info("err", err);
                    if (err.response.status === 429) {
                      plugin.sendToPropertyInspector({
                        openRemindinWindow5: {
                          message: "播放广告冷却中！",
                          time: 5000,
                        },
                      });
                    }
                  });
              } else {
                // 并没有 打开直播间 所以需要提醒用户打开直播间
                plugin.sendToPropertyInspector({
                  openRemindinWindow5: {
                    message: "请您打开直播间后再试！",
                    time: 5000,
                  },
                });
                log.info("请打开直播间!");
              }
            })
            .catch((err) => {
              log.info("twitchProxyGet", err);
            });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
          plugin.sendToPropertyInspector({ openLoginWindow: "" });
          //添加一个唤起 登录窗口  通知 属性检查器 触发一次点击事件
        }
      })
      .catch((error) => {
        log.info("error", error);
        plugin.sendToPropertyInspector({
          openRemindinWindow1: {
            message: "执行异常！请重启软件！",
            time: 5000,
          },
        });
      });
  },
});
// 慢聊
plugin.action6 = new Actions({
  default: {},
  _willDisappear({ context }) {
    tools.removeElementsByValue(contexts.slow_modes, context);
  },
  _willAppear({ context, payload }) {
    // 默认的初始化操作
    contexts.slow_modes.push(context);
    if (tools.isNotEmptyObject(chatSettings) && chatSettings.slow_mode) {
      plugin.setState(context, 1);
    } else {
      plugin.setState(context, 0);
    }
  },
  // 出现
  _propertyInspectorDidAppear() {
    // 获取用户本地缓存信息
    getUserInfo()
      .then((userInfo) => {
        // log.info("userInfo", userInfo)
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          plugin.sendToPropertyInspector({
            inputChange: userInfo.display_name,
          });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
        }
      })
      .catch((error) => {
        log.info("error", error);
      });
  },
  sendToPlugin({ context, payload }) {
    // log.info("payload sendToPlugin", payload)
    if (payload != null && payload != undefined && payload != "") {
      // 表示需要执行 内容
      Object.keys(payload).forEach((key) => {
        executeMethod(key, payload[key]);
      });
    }
  },
  // 键盘摁下
  keyDown({ context, payload }) {
    getUserInfo()
      .then(async (userInfo) => {
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          const urlApi = "https://api.twitch.tv/helix/chat/settings";
          const paramTwo = {
            headers: {
              "Client-Id": config.clientId,
              "Content-Type": "application/json",
            },
            params: {
              broadcaster_id: userInfo.id,
              moderator_id: userInfo.id,
            },
          };
          twitchProxyPatch(
            urlApi,
            {
              slow_mode: !chatSettings.slow_mode,
              slow_mode_wait_time:
                payload.settings.waitTime === 0 ? 3 : payload.settings.waitTime,
            },
            paramTwo
          )
            .then((data) => {
              // 发送一条消息给属性检查 让他展示点东西出来
              plugin.sendToPropertyInspector({
                openRemindinWindow6: {
                  message: "执行成功！",
                  time: 5000,
                },
              });
              log.info("twitchProxyPatch data", data);
            })
            .catch((err) => {
              if (err.response.status === 429) {
                plugin.sendToPropertyInspector({
                  openRemindinWindow6: {
                    message: "执行异常！",
                    time: 5000,
                  },
                });
              }
              log.info("twitchProxyPatch err", err);
            });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
          plugin.sendToPropertyInspector({ openLoginWindow: "" });
          //添加一个唤起 登录窗口  通知 属性检查器 触发一次点击事件
        }
      })
      .catch((error) => {
        log.info("error", error);
        plugin.sendToPropertyInspector({
          openRemindinWindow1: {
            message: "执行异常！请重启软件！",
            time: 5000,
          },
        });
      });
  },
});
// 订阅者聊天
plugin.action7 = new Actions({
  default: {},
  _willDisappear({ context }) {
    tools.removeElementsByValue(contexts.subscriber_modes, context);
  },
  _willAppear({ context, payload }) {
    // 默认的初始化操作
    contexts.subscriber_modes.push(context);
    if (tools.isNotEmptyObject(chatSettings) && chatSettings.subscriber_mode) {
      plugin.setState(context, 1);
    } else {
      plugin.setState(context, 0);
    }
  },
  // 出现
  _propertyInspectorDidAppear() {
    // 获取用户本地缓存信息
    getUserInfo()
      .then((userInfo) => {
        // log.info("userInfo", userInfo)
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          plugin.sendToPropertyInspector({
            inputChange: userInfo.display_name,
          });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
        }
      })
      .catch((error) => {
        log.info("error", error);
      });
  },
  sendToPlugin({ context, payload }) {
    // log.info("payload sendToPlugin", payload)
    if (payload != null && payload != undefined && payload != "") {
      // 表示需要执行 内容
      Object.keys(payload).forEach((key) => {
        executeMethod(key, payload[key]);
      });
    }
  },
  // 键盘摁下
  keyDown({ context, payload }) {
    getUserInfo()
      .then(async (userInfo) => {
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          const urlApi = "https://api.twitch.tv/helix/chat/settings";
          const paramTwo = {
            headers: {
              "Client-Id": config.clientId,
              "Content-Type": "application/json",
            },
            params: {
              broadcaster_id: userInfo.id,
              moderator_id: userInfo.id,
            },
          };
          twitchProxyPatch(
            urlApi,
            {
              subscriber_mode: !chatSettings.subscriber_mode,
            },
            paramTwo
          )
            .then((data) => {
              // 发送一条消息给属性检查 让他展示点东西出来
              plugin.sendToPropertyInspector({
                openRemindinWindow7: {
                  message: "执行成功！",
                  time: 5000,
                },
              });
              log.info("twitchProxyPatch data", data);
            })
            .catch((err) => {
              if (err.response.status === 429) {
                plugin.sendToPropertyInspector({
                  openRemindinWindow7: {
                    message: "执行异常！",
                    time: 5000,
                  },
                });
              }
              log.info("twitchProxyPatch err", err);
            });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
          plugin.sendToPropertyInspector({ openLoginWindow: "" });
          //添加一个唤起 登录窗口  通知 属性检查器 触发一次点击事件
        }
      })
      .catch((error) => {
        log.info("error", error);
        plugin.sendToPropertyInspector({
          openRemindinWindow1: {
            message: "执行异常！请重启软件！",
            time: 5000,
          },
        });
      });
  },
});
// 盾防模式
plugin.action8 = new Actions({
  default: {},
  _willDisappear({ context }) {
    tools.removeElementsByValue(contexts.is_actives, context);
  },
  _willAppear({ context, payload }) {
    // 默认的初始化操作
    contexts.is_actives.push(context);
    if (tools.isNotEmptyObject(chatSettings) && chatSettings.is_active) {
      plugin.setState(context, 1);
    } else {
      plugin.setState(context, 0);
    }
  },
  // 出现
  _propertyInspectorDidAppear() {
    // 获取用户本地缓存信息
    getUserInfo()
      .then((userInfo) => {
        // log.info("userInfo", userInfo)
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          plugin.sendToPropertyInspector({
            inputChange: userInfo.display_name,
          });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
        }
      })
      .catch((error) => {
        log.info("error", error);
      });
  },
  sendToPlugin({ context, payload }) {
    if (payload != null && payload != undefined && payload != "") {
      // 表示需要执行 内容
      Object.keys(payload).forEach((key) => {
        executeMethod(key, payload[key]);
      });
    }
  },
  // 键盘摁下
  keyDown({ context, payload }) {
    throttledFunction(context, payload);
  },
});
// 观众人数
plugin.action9 = new Actions({
  default: {},
  _willAppear({ context, payload }) {
    // 默认的初始化操作
    plugin.setTitle(context, "1");
  },
  // 出现
  _propertyInspectorDidAppear() {
    // 获取用户本地缓存信息
    getUserInfo()
      .then((userInfo) => {
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          plugin.sendToPropertyInspector({
            inputChange: userInfo.display_name,
          });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
        }
      })
      .catch((error) => {
        log.info("error", error);
      });
  },
  sendToPlugin({ context, payload }) {
    if (payload != null && payload != undefined && payload != "") {
      // 表示需要执行 内容
      Object.keys(payload).forEach((key) => {
        executeMethod(key, payload[key]);
      });
    }
  },
  // 键盘摁下
  keyDown({ context, payload }) {
    getUserInfo()
      .then(async (userInfo) => {
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          //没过期
          //第一步 发送一个请求获取到用户的状态 查看是否正在直播
          const url = "https://api.twitch.tv/helix/streams";
          const param = {
            user_id: userInfo.id,
            user_login: userInfo.login,
          };
          twitchProxyGet(url, {
            params: param,
            headers: {
              "Client-Id": config.clientId,
            },
          })
            .then((res) => {
              if (Array.isArray(res.data) && res.data.length > 0) {
                log.info("res.data", res.data);
                plugin.setTitle(context, `${res.data[0].viewer_count}`);

                // 在这里展示执行成功
                plugin.sendToPropertyInspector({
                  openRemindinWindow9: {
                    message: "执行成功",
                    time: 5000,
                  },
                });
              } else {
                // 并没有 打开直播间 所以需要提醒用户打开直播间
                plugin.sendToPropertyInspector({
                  openRemindinWindow9: {
                    message: "请您打开直播间后再试！",
                    time: 5000,
                  },
                });
                log.info("请打开直播间!");
              }
            })
            .catch((err) => {
              log.info("twitchProxyGet", err);
            });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
          plugin.sendToPropertyInspector({ openLoginWindow: "" });
          //添加一个唤起 登录窗口  通知 属性检查器 触发一次点击事件
        }
      })
      .catch((error) => {
        log.info("error", error);
        plugin.sendToPropertyInspector({
          openRemindinWindow1: {
            message: "执行异常！请重启软件！",
            time: 5000,
          },
        });
      });
  },
});
// 实时播放/游戏标题
plugin.action10 = new Actions({
  default: {},
  _willAppear({ context, payload }) {
    // 默认的初始化操作
  },
  // 出现
  _propertyInspectorDidAppear() {
    // 获取用户本地缓存信息
    getUserInfo()
      .then((userInfo) => {
        // log.info("userInfo", userInfo)
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          plugin.sendToPropertyInspector({
            inputChange: userInfo.display_name,
          });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
        }
      })
      .catch((error) => {
        log.info("error", error);
      });
  },
  sendToPlugin({ context, payload }) {
    // log.info("payload sendToPlugin", payload)
    if (payload != null && payload != undefined && payload != "") {
      // 表示需要执行 内容
      Object.keys(payload).forEach((key) => {
        executeMethod(key, payload[key]);
      });
    }
  },
  // 键盘摁下
  keyDown({ payload }) {
    log.info("keyDown(payload)", payload);
    getUserInfo()
      .then(async (userInfo) => {
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          //没过期
          //第一步 发送一个请求获取到用户的状态 查看是否正在直播

          const url = "https://api.twitch.tv/helix/streams";
          const param = {
            user_id: userInfo.id,
            user_login: userInfo.login,
          };
          twitchProxyGet(url, {
            params: param,
            headers: {
              "Client-Id": config.clientId,
            },
          })
            .then((res) => {
              if (Array.isArray(res.data) && res.data.length > 0) {
                const urlApi = "https://api.twitch.tv/helix/channels";
                const paramTwo = {
                  headers: {
                    "Client-Id": config.clientId,
                    "Content-Type": "application/json",
                  },
                  params: {
                    broadcaster_id: userInfo.id,
                  },
                };
                twitchProxyPatch(
                  urlApi,
                  {
                    game_id: payload.settings.gameId,
                    title: payload.settings.channelTitle,
                  },
                  paramTwo
                )
                  .then((data) => {
                    // 发送一条消息给属性检查 让他展示点东西出来
                    plugin.sendToPropertyInspector({
                      openRemindinWindow10: {
                        message: "执行成功！",
                        time: 5000,
                      },
                    });
                    log.info("twitchProxyPatch data", data);
                  })
                  .catch((err) => {
                    if (err.response.status === 400) {
                      plugin.sendToPropertyInspector({
                        openRemindinWindow10: {
                          message: "请求至少更新一个属性！",
                          time: 5000,
                        },
                      });
                    } else if (err.response.status === 409) {
                      plugin.sendToPropertyInspector({
                        openRemindinWindow10: {
                          message: "请求过于频繁，请稍后再试！",
                          time: 5000,
                        },
                      });
                    }
                    log.info("twitchProxyPatch err", err);
                  });
              } else {
                // 并没有 打开直播间 所以需要提醒用户打开直播间
                plugin.sendToPropertyInspector({
                  openRemindinWindow10: {
                    message: "请您打开直播间后再试！",
                    time: 5000,
                  },
                });
                log.info("请打开直播间!");
              }
            })
            .catch((err) => {
              log.info("twitchProxyGet", err);
            });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
          plugin.sendToPropertyInspector({ openLoginWindow: "" });
          //添加一个唤起 登录窗口  通知 属性检查器 触发一次点击事件
        }
      })
      .catch((error) => {
        log.info("error", error);
        plugin.sendToPropertyInspector({
          openRemindinWindow1: {
            message: "执行异常！请重启软件！",
            time: 5000,
          },
        });
      });
  },
});
// // 创建流标记
// plugin.action11 = new Actions({
// 	default: {},
// 	_willAppear({ context, payload }) {
// 		// 默认的初始化操作
// 	},
// 	// 出现
// 	_propertyInspectorDidAppear() {
// 		// 获取用户本地缓存信息
// 		getUserInfo()
// 			.then(userInfo => {
// 				// 判断是否有本地缓存
// 				if (tools.isNotEmptyObject(userInfo) && userInfo != '{}') {
// 					plugin.sendToPropertyInspector({ inputChange: userInfo.display_name });
// 				} else {
// 					plugin.sendToPropertyInspector({ inputChange: '{}' });
// 				}
// 			})
// 			.catch(error => {
// 				log.info('error', error);
// 			});
// 	},
// 	sendToPlugin({ context, payload }) {
// 		// log.info("payload sendToPlugin", payload)
// 		if (payload != null && payload != undefined && payload != '') {
// 			// 表示需要执行 内容
// 			Object.keys(payload).forEach(key => {
// 				executeMethod(key, payload[key]);
// 			});
// 		}
// 	},
// 	// 键盘摁下
// 	keyDown({ payload }) {
// 		log.info('keyDown(payload)', payload);
// 		getUserInfo()
// 			.then(async userInfo => {
// 				// 判断是否有本地缓存
// 				if (tools.isNotEmptyObject(userInfo) && userInfo != '{}') {
// 					//没过期
// 					//第一步 发送一个请求获取到用户的状态 查看是否正在直播

// 					const url = 'https://api.twitch.tv/helix/streams';
// 					const param = {
// 						user_id: userInfo.id,
// 						user_login: userInfo.login,
// 					};
// 					twitchProxyGet(url, {
// 						params: param,
// 						headers: {
// 							'Client-Id': config.clientId,
// 						},
// 					})
// 						.then(res => {
// 							if (Array.isArray(res.data) && res.data.length > 0) {
// 								const urlApi = 'https://api.twitch.tv/helix/streams/markers';
// 								const paramTwo = {
// 									headers: {
// 										'Client-Id': config.clientId,
// 										'Content-Type': 'application/json',
// 									},
// 									params: {
// 										broadcaster_id: userInfo.id,
// 									},
// 								};
// 								twitchProxyPost(
// 									urlApi,
// 									{
// 										user_id: userInfo.id,
// 										description: payload.settings.message,
// 									},
// 									paramTwo
// 								)
// 									.then(data => {
// 										// 发送一条消息给属性检查 让他展示点东西出来
// 										plugin.sendToPropertyInspector({
// 											openRemindinWindow11: {
// 												message: '执行成功！',
// 												time: 5000,
// 											},
// 										});
// 										log.info('twitchProxyPatch data', data);
// 									})
// 									.catch(err => {
// 										if (err.response.status === 400) {
// 											plugin.sendToPropertyInspector({
// 												openRemindinWindow11: {
// 													message: '字符串太长！',
// 													time: 5000,
// 												},
// 											});
// 										}
// 										log.info('twitchProxyPatch err', err);
// 									});
// 							} else {
// 								// 并没有 打开直播间 所以需要提醒用户打开直播间
// 								plugin.sendToPropertyInspector({
// 									openRemindinWindow11: {
// 										message: '请您打开直播间后再试！',
// 										time: 5000,
// 									},
// 								});
// 								log.info('请打开直播间!');
// 							}
// 						})
// 						.catch(err => {
// 							log.info('twitchProxyGet', err);
// 						});
// 				} else {
// 					plugin.sendToPropertyInspector({ inputChange: '{}' });
// 					plugin.sendToPropertyInspector({ openLoginWindow: '' });
// 					//添加一个唤起 登录窗口  通知 属性检查器 触发一次点击事件
// 				}
// 			})
// 			.catch(error => {
// 				log.info('error', error);
// 				plugin.sendToPropertyInspector({
// 					openRemindinWindow1: {
// 						message: '执行异常！请重启软件！',
// 						time: 5000,
// 					},
// 				});
// 			});
// 	},
// });
// 创建剪辑
plugin.action12 = new Actions({
  default: {},
  _willAppear({ context, payload }) {
    // 默认的初始化操作
  },
  // 出现
  _propertyInspectorDidAppear() {
    // 获取用户本地缓存信息
    getUserInfo()
      .then((userInfo) => {
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          plugin.sendToPropertyInspector({
            inputChange: userInfo.display_name,
          });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
        }
      })
      .catch((error) => {
        log.info("error", error);
      });
  },
  sendToPlugin({ context, payload }) {
    // log.info("payload sendToPlugin", payload)
    if (payload != null && payload != undefined && payload != "") {
      // 表示需要执行 内容
      Object.keys(payload).forEach((key) => {
        executeMethod(key, payload[key]);
      });
    }
  },
  // 键盘摁下
  keyDown({ payload }) {
    log.info("keyDown(payload)", payload);
    getUserInfo()
      .then(async (userInfo) => {
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          //没过期
          //第一步 发送一个请求获取到用户的状态 查看是否正在直播

          const url = "https://api.twitch.tv/helix/streams";
          const param = {
            user_id: userInfo.id,
            user_login: userInfo.login,
          };
          twitchProxyGet(url, {
            params: param,
            headers: {
              "Client-Id": config.clientId,
            },
          })
            .then(async (res) => {
              if (Array.isArray(res.data) && res.data.length > 0) {
                const urlApi =
                  "https://api.twitch.tv/helix/clips?broadcaster_id=" +
                  userInfo.id;
                const paramTwo = {
                  headers: {
                    "Client-Id": config.clientId,
                  },
                  timeout: 5000,
                };
                await twitchProxyPost(urlApi, {}, paramTwo)
                  .then((result) => {
                    // 在这里 我们打开一个浏览器让他直接去 运行
                    // 发送一条消息给属性检查 让他展示点东西出来
                    plugin.sendToPropertyInspector({
                      openRemindinWindow12: {
                        message: "执行成功！",
                        time: 5000,
                      },
                    });
                    setTimeout(() => {
                      log.info(
                        "result.data[0].edit_url",
                        result.data[0].edit_url
                      );
                      plugin.openUrl(result.data[0].edit_url);
                    }, 1000);
                    log.info("twitchProxyPatch data", result);
                  })
                  .catch((err) => {
                    log.info("twitchProxyPatch err", err);
                    plugin.sendToPropertyInspector({
                      openRemindinWindow12: {
                        message: "执行失败！",
                        time: 5000,
                      },
                    });
                  });
              } else {
                // 并没有 打开直播间 所以需要提醒用户打开直播间
                plugin.sendToPropertyInspector({
                  openRemindinWindow12: {
                    message: "请您打开直播间后再试！",
                    time: 5000,
                  },
                });
                log.info("请打开直播间!");
              }
            })
            .catch((err) => {
              log.info("twitchProxyGet", err);
            });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
          plugin.sendToPropertyInspector({ openLoginWindow: "" });
          //添加一个唤起 登录窗口  通知 属性检查器 触发一次点击事件
        }
      })
      .catch((error) => {
        log.info("error", error);
        plugin.sendToPropertyInspector({
          openRemindinWindow1: {
            message: "执行异常！请重启软件！",
            time: 5000,
          },
        });
      });
  },
});
// 打开上一个剪辑
plugin.action13 = new Actions({
  default: {},
  _willAppear({ context, payload }) {
    // 默认的初始化操作
  },
  // 出现
  _propertyInspectorDidAppear() {
    // 获取用户本地缓存信息
    getUserInfo()
      .then((userInfo) => {
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          plugin.sendToPropertyInspector({
            inputChange: userInfo.display_name,
          });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
        }
      })
      .catch((error) => {
        log.info("error", error);
      });
  },
  sendToPlugin({ context, payload }) {
    // log.info("payload sendToPlugin", payload)
    if (payload != null && payload != undefined && payload != "") {
      // 表示需要执行 内容
      Object.keys(payload).forEach((key) => {
        executeMethod(key, payload[key]);
      });
    }
  },
  // 键盘摁下
  keyDown({ payload }) {
    getUserInfo()
      .then(async (userInfo) => {
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          //没过期
          //第一步 发送一个请求获取到用户的状态 查看是否正在直播

          const url = "https://api.twitch.tv/helix/streams";
          const param = {
            user_id: userInfo.id,
            user_login: userInfo.login,
          };
          twitchProxyGet(url, {
            params: param,
            headers: {
              "Client-Id": config.clientId,
            },
          })
            .then(async (res) => {
              if (Array.isArray(res.data) && res.data.length > 0) {
                const openUrl = {
                  url: "",
                  date: 0,
                };
                async function go(pagination) {
                  const urlApi = "https://api.twitch.tv/helix/clips";
                  const paramTwo = {
                    headers: {
                      "Client-Id": config.clientId,
                    },
                    timeout: 10000,
                    params: {
                      broadcaster_id: userInfo.id,
                      first: 100,
                      after: pagination,
                    },
                  };

                  try {
                    const result = await twitchProxyGet(urlApi, paramTwo);
                    result.data.forEach((urlObj) => {
                      if (
                        openUrl.date < new Date(urlObj.created_at).getTime()
                      ) {
                        log.info(
                          "new Date(urlObj.created_at).getTime()",
                          new Date(urlObj.created_at).getTime()
                        );
                        openUrl.url = urlObj.url;
                      }
                    });
                    if (tools.isNotEmptyObject(result.pagination)) {
                      return go(result.pagination.cursor);
                    }
                    return openUrl.url;
                  } catch (err) {
                    plugin.sendToPropertyInspector({
                      openRemindinWindow13: {
                        message: "执行失败！",
                        time: 5000,
                      },
                    });
                    log.info("twitchProxyPatch err", err);
                    throw err; // 添加 throw，以便在调用方捕获错误
                  }
                }

                try {
                  openUrl.url = await go();
                  if (openUrl.url === "") {
                    plugin.sendToPropertyInspector({
                      openRemindinWindow13: {
                        message: "执行失败！",
                        time: 5000,
                      },
                    });
                    log.info("openUrl.url is empty");
                  } else {
                    log.info("openUrl.url", openUrl.url);
                    plugin.openUrl(openUrl.url);
                    plugin.sendToPropertyInspector({
                      openRemindinWindow13: {
                        message: "执行成功！",
                        time: 5000,
                      },
                    });
                  }
                } catch (err) {
                  // 在此处理任何其他可能的错误
                  log.error("An error occurred:", err);
                }
              } else {
                // 并没有 打开直播间 所以需要提醒用户打开直播间
                plugin.sendToPropertyInspector({
                  openRemindinWindow13: {
                    message: "请您打开直播间后再试！",
                    time: 5000,
                  },
                });
                log.info("请打开直播间!");
              }
            })
            .catch((err) => {
              log.info("twitchProxyGet", err);
            });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
          plugin.sendToPropertyInspector({ openLoginWindow: "" });
          //添加一个唤起 登录窗口  通知 属性检查器 触发一次点击事件
        }
      })
      .catch((error) => {
        log.info("error", error);
        plugin.sendToPropertyInspector({
          openRemindinWindow1: {
            message: "执行异常！请重启软件！",
            time: 5000,
          },
        });
      });
  },
});
plugin.action14 = new Actions({
  default: {},
  _willAppear({ context, payload }) {
    // 默认的初始化操作
  },
  // 出现
  _propertyInspectorDidAppear() {
    // 获取用户本地缓存信息
    getUserInfo()
      .then((userInfo) => {
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          plugin.sendToPropertyInspector({
            inputChange: userInfo.display_name,
          });
        } else {
          plugin.sendToPropertyInspector({ inputChange: "{}" });
        }
      })
      .catch((error) => {
        log.info("error", error);
      });
  },
  sendToPlugin({ context, payload }) {
    // log.info("payload sendToPlugin", payload)
    if (payload != null && payload != undefined && payload != "") {
      // 表示需要执行 内容
      Object.keys(payload).forEach((key) => {
        executeMethod(key, payload[key]);
      });
    }
  },
  // 键盘摁下
  async keyDown({ payload }) {
    try {
      let userInfo = await getUserInfo();

      if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
        //第一步 发送一个请求获取到用户的状态 查看是否正在直播
        const url = "https://api.twitch.tv/helix/streams";
        const param = {
          user_id: userInfo.id,
          user_login: userInfo.login,
        };
        let res = await twitchProxyGet(url, {
          params: param,
          headers: {
            "Client-Id": config.clientId,
          },
        });
        if (Array.isArray(res.data) && res.data.length > 0) {
          const paramTwo = {
            headers: {
              "Client-Id": config.clientId,
              "Content-Type": "application/json",
            },
          };
          let result;
          if (payload.settings.describe && payload.settings.describe !== "") {
            result = await twitchProxyPost(
              "https://api.twitch.tv/helix/streams/markers",
              {
                user_id: userInfo.id,
                description: payload.settings.describe,
              },
              paramTwo
            );
          } else {
            result = await twitchProxyPost(
              "https://api.twitch.tv/helix/streams/markers",
              {
                user_id: userInfo.id,
              },
              paramTwo
            );
          }
          plugin.sendToPropertyInspector({
            openRemindinWindow14: {
              message: "发送成功！",
              time: 5000,
            },
          });
        } else {
          // 并没有 打开直播间 所以需要提醒用户打开直播间
          plugin.sendToPropertyInspector({
            openRemindinWindow14: {
              message: "请您打开直播间后再试！",
              time: 5000,
            },
          });
          log.info("请打开直播间!");
        }
      } else {
        plugin.sendToPropertyInspector({ inputChange: "{}" });
        plugin.sendToPropertyInspector({ openLoginWindow: "" });
        //添加一个唤起 登录窗口  通知 属性检查器 触发一次点击事件
      }
    } catch (error) {
      log.info("error", error);
      plugin.sendToPropertyInspector({
        openRemindinWindow1: {
          message: "执行异常！请重启软件！",
          time: 5000,
        },
      });
    }
  },
});
//----------------------------------------   插件方法     ---------------------------------------------
// 验证 token 是否过期
async function validateToken(userInfo) {
  const data = {
    headers: {
      Authorization: `OAuth ${userInfo.access_token}`,
    },
  };
  const url = "https://id.twitch.tv/oauth2/validate";
  const result = await proxyGet(url, data)
    .then(async (response) => {
      fs.outputFile(
        "plugin/timer/validateToken.json",
        JSON.stringify(response)
      ).catch((error) => {
        log.info("error", error);
      });
      // 校验通过后 打开websocket
      await webChatSocketCommint(userInfo);
      return true;
    })
    .catch((err) => {
      // 删除掉现在的 token内容 或者说覆盖掉
      fs.outputFile("plugin/json/authToken.json", "{}")
        .then(() => {
          if (err.response && err.response.status === 401) {
            log.info("validateToken", false);
          } else {
            // 报错不是 401，抛出错误
            // throw err.message(" 请检查本地代理是否正常 ");
            log.info("err401", err);
          }
        })
        .catch((error) => {
          log.info("error", error);
        });
      return false;
    });
  return result;
}

async function getChannelID(channel_name) {
  const result = await twitchProxyGet(
    "https://api.twitch.tv/helix/search/channels",
    {
      params: {
        query: channel_name,
      },
      headers: {
        "Client-Id": config.clientId,
      },
    }
  );
  return result.data[0].id;
}
// 启动websocket链接 避免后面二次链接

async function webChatSocketCommint(userInfo) {
  // 1. 连接到 EventSub WebSocket
  const ws = new WebSocket("wss://eventsub.wss.twitch.tv/ws");

  ws.onopen = () => {
    log.info("WebSocket 连接成功");
  };
  ws.onmessage = async (event) => {
    const message = JSON.parse(event.data);

    // 2. 处理 Welcome 消息，发送订阅请求
    if (
      message.metadata &&
      message.metadata.message_type === "session_welcome"
    ) {
      const sessionId = message.payload.session.id;
      const paramTwo = {
        headers: {
          "Client-Id": config.clientId,
          "Content-Type": "application/json",
        },
      };
      // 3. 调用 Twitch EventSub API 创建订阅
      await twitchProxyPost(
        "https://api.twitch.tv/helix/eventsub/subscriptions",
        {
          type: "channel.chat_settings.update",
          version: "1",
          condition: {
            broadcaster_user_id: userInfo.id,
            user_id: userInfo.id,
          },
          transport: {
            method: "websocket",
            session_id: sessionId,
          },
        },
        paramTwo
      );
      await twitchProxyPost(
        "https://api.twitch.tv/helix/eventsub/subscriptions",
        {
          type: "channel.shield_mode.end",
          version: "1",
          condition: {
            broadcaster_user_id: userInfo.id,
            moderator_user_id: userInfo.id,
          },
          transport: {
            method: "websocket",
            session_id: sessionId,
          },
        },
        paramTwo
      );
      await twitchProxyPost(
        "https://api.twitch.tv/helix/eventsub/subscriptions",
        {
          type: "channel.shield_mode.begin",
          version: "1",
          condition: {
            broadcaster_user_id: userInfo.id,
            moderator_user_id: userInfo.id,
          },
          transport: {
            method: "websocket",
            session_id: sessionId,
          },
        },
        paramTwo
      );
    }

    // 4. 监听事件通知
    if (message.metadata && message.metadata.message_type === "notification") {
      const eventType = message.payload.subscription.type;
      if (eventType === "channel.chat_settings.update") {
        const eventData = message.payload.event;
        log.info("频道更新:", eventData);

        chatSettings.emote_mode = eventData.emote_mode;
        contexts.emote_modes.forEach((context) => {
          plugin.setState(context, eventData.emote_mode ? 1 : 0);
        });

        chatSettings.follower_mode = eventData.follower_mode;
        contexts.follower_modes.forEach((context) => {
          plugin.setState(context, eventData.follower_mode ? 1 : 0);
          plugin.setSettings(context, {
            followerDuration: eventData.follower_mode_duration_minutes,
          });
        });
        log.info("slow mode", eventData.slow_mode ? 1 : 0);
        chatSettings.slow_mode = eventData.slow_mode;
        contexts.slow_modes.forEach((context) => {
          plugin.setState(context, eventData.slow_mode ? 1 : 0);
          plugin.setSettings(context, {
            waitTime: eventData.slow_mode_wait_time_seconds,
          });
        });

        chatSettings.subscriber_mode = eventData.subscriber_mode;
        contexts.subscriber_modes.forEach((context) => {
          plugin.setState(context, eventData.subscriber_mode ? 1 : 0);
        });
      } else if (eventType === "channel.shield_mode.begin") {
        log.info("盾防启动:");
        chatSettings.is_active = true;
        contexts.is_actives.forEach((context) => {
          plugin.setState(context, 1);
        });
      } else if (eventType === "channel.shield_mode.end") {
        log.info("盾防结束:");
        chatSettings.is_active = false;
        contexts.is_actives.forEach((context) => {
          plugin.setState(context, 0);
        });
      }
    }
  };

  ws.onerror = (err) => {
    log.info("WebSocket 错误:", err);
  };

  ws.onclose = () => {
    log.info("WebSocket 已关闭");
  };
}

// 封装 setChatSettings
async function setChatSettings(userInfo) {
  twitchProxyGet("https://api.twitch.tv/helix/chat/settings", {
    params: {
      broadcaster_id: userInfo.id,
    },
    headers: {
      "Client-Id": config.clientId,
    },
  })
    .then((res) => {
      chatSettings = { ...res.data[0], ...chatSettings };
    })
    .catch((error) => {
      log.info("error settings", error);
    });

  twitchProxyGet("https://api.twitch.tv/helix/moderation/shield_mode", {
    params: {
      broadcaster_id: userInfo.id,
      moderator_id: userInfo.id,
    },
    headers: {
      "Client-Id": config.clientId,
    },
  })
    .then((result) => {
      chatSettings.is_active = result.data[0].is_active;
      log.info(
        "setChatSettings chatSettings.is_active=  ",
        chatSettings.is_active
      );
    })
    .catch((error) => {
      log.info("abcd2=  ", {
        params: {
          broadcaster_id: userInfo.id,
          moderator_id: userInfo.id,
        },
        headers: {
          "Client-Id": config.clientId,
        },
      });
      log.info("error shield_mode1", error);
    });

  let intervalId = setInterval(function () {
    if (
      Object.keys(chatSettings).length !== 0 &&
      Object.keys(chatSettings).length === 9
    ) {
      // 如果对象不为空
      if (chatSettings.emote_mode) {
        contexts.emote_modes.forEach((context) => {
          plugin.setState(context, 1);
        });
      }
      if (chatSettings.follower_mode) {
        contexts.follower_modes.forEach((context) => {
          plugin.setState(context, 1);
          plugin.setSettings(context, {
            followerDuration: chatSettings.follower_mode_duration,
          });
        });
      }
      if (chatSettings.slow_mode) {
        contexts.slow_modes.forEach((context) => {
          plugin.setState(context, 1);
          plugin.setSettings(context, {
            waitTime: chatSettings.slow_mode_wait_time,
          });
        });
      }
      if (chatSettings.subscriber_mode) {
        contexts.subscriber_modes.forEach((context) => {
          plugin.setState(context, 1);
        });
      }
      if (chatSettings.is_active) {
        contexts.is_actives.forEach((context) => {
          plugin.setState(context, 1);
        });
      }
      clearInterval(intervalId); // 停止检查
    }
  }, 50);
}

//--------------------------------------------- 服务内容 3000 ---------------------------------------------

// 用于服务器
// 使用 body-parser 中间件
// 创建一个服务器用于接收返回的回调
const express = require("express");
const bodyParser = require("body-parser");

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// 添加中间件处理跨域
app.use((req, res, next) => {
  // 允许所有来源访问
  res.header("Access-Control-Allow-Origin", "*");
  // 允许以下方法访问
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  // 允许以下标头访问
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
const port = 3000;
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");
app.use("/", express.static("./")); // 设置静态资源访问路径

// // 定义路由
app.get("/", (req, res) => {
  if (tokenContainer._tempToken === "") {
    res.status(404).send("Not Found");
  }
  res.render("callback", { title: "Express Page" });
});
// 没有 认证系统 只能通过属性检查器临时创建的值来认证
app.get("/validate", async (req, res) => {
  if (req.query.code === tokenContainer._tempToken) {
    // 是通过点击事件进来的
    //在这里先进行判断 判断是否已经登陆了
    getUserInfo()
      .then(async (userInfo) => {
        // 判断是否有本地缓存
        if (tools.isNotEmptyObject(userInfo) && userInfo != "{}") {
          // log.info("/validate123", userInfo)
          // 登陆了
          plugin.sendToPropertyInspector({
            inputChange: userInfo.display_name,
          });
          tokenContainer._tempToken = "";
          // 返回成功页面 并传递参数 为通过
          res.render("authSuccess", { title: "Express Page" });
        } else {
          // log.info("/validate456", userInfo)
          //未登录
          // 发送登录请求
          const parameters = {
            client_id: config.clientId,
            redirect_uri: "http://localhost:3000/",
            response_type: "token",
            scope:
              "user:write:chat%20user:read:chat%20user:bot%20channel:bot%20chat:read%20chat:edit%20whispers:read%20whispers:edit%20clips:edit%20channel:moderate%20channel:manage:videos%20user:read:follows%20user:edit:broadcast%20bits:read%20channel:read:subscriptions%20channel:read:redemptions%20channel:manage:broadcast%20channel:edit:commercial%20moderator:manage:shield_mode%20channel:manage:raids%20moderator:manage:banned_users%20channel:manage:moderators%20channel:manage:vips%20moderator:manage:announcements%20moderator:manage:chat_messages%20moderator:read:chatters%20analytics:read:extensions%20moderator:manage:chat_settings%20channel:manage:broadcast",
            state: tokenContainer._tempToken,
          };
          const url =
            "https://id.twitch.tv/oauth2/authorize?client_id=" +
            parameters.client_id +
            "&redirect_uri=" +
            parameters.redirect_uri +
            "&response_type=" +
            parameters.response_type +
            "&scope=" +
            parameters.scope +
            "&state=" +
            parameters.state;
          // plugin.openUrl(url);
          res.redirect(url);
        }
      })
      .catch((err) => {
        log.info("err", err);
      });
  } else {
    log.info("非法访问到该页面！");
  }
});
//  接收来自
app.post("/settings", async (req, res) => {
  if (
    req.body != null &&
    req.body != undefined &&
    req.body.state === tokenContainer._tempToken
  ) {
    // 判断是否已经登陆 已经登陆 就不管他
    getUserInfo()
      .then((userInfo) => {
        if (tools.isEmptyObject(userInfo)) {
          // 这里就不验证了
          // Twitch API 端点 URL
          const apiUrl = "https://api.twitch.tv/helix/users";
          const headers = {
            "Client-ID": config.clientId,
            Authorization: `Bearer ${req.body.access_token}`,
            "Content-Type": "application/json; charset=utf-8",
          };
          // 等待异步操作完成
          proxyGet(apiUrl, {
            headers: headers,
          })
            .then((userInfo) => {
              plugin.sendToPropertyInspector({
                inputChange: userInfo.data[0].display_name,
              });
              // 合并对象
              const jsonObject = { ...req.body, ...userInfo.data[0] };
              // 将数据保存到指定文件内
              fs.outputFile(
                "plugin/json/authToken.json",
                JSON.stringify(jsonObject)
              )
                .then(async () => {
                  tokenContainer._tempToken = "";
                  await setChatSettings(jsonObject);
                  await webChatSocketCommint(jsonObject);
                  res.json({ message: "true" });
                })
                .catch((error) => {
                  log.info("error", error);
                  res.json({ message: "false" });
                });
            })
            .catch((err) => {
              log.info("err", err);
            });
        } else {
          // res.json({ message: 'true' });
          validateToken(userInfo)
            .then(async (data) => {
              if (!data) {
                // Twitch API 端点 URL
                const apiUrl = "https://api.twitch.tv/helix/users";
                const headers = {
                  "Client-ID": config.clientId,
                  Authorization: `Bearer ${req.body.access_token}`,
                  "Content-Type": "application/json; charset=utf-8",
                };
                // 等待异步操作完成
                proxyGet(apiUrl, {
                  headers: headers,
                })
                  .then((userInfo) => {
                    plugin.sendToPropertyInspector({
                      inputChange: userInfo.data[0].display_name,
                    });
                    // 合并对象
                    const jsonObject = { ...req.body, ...userInfo.data[0] };
                    // 将数据保存到指定文件内
                    fs.outputFile(
                      "plugin/json/authToken.json",
                      JSON.stringify(jsonObject)
                    )
                      .then(async () => {
                        tokenContainer._tempToken = "";
                        await setChatSettings(jsonObject);
                        await webChatSocketCommint(jsonObject);
                        res.json({ message: "true" });
                      })
                      .catch((error) => {
                        log.info("error", error);
                        res.json({ message: "false" });
                      });
                  })
                  .catch((err) => {
                    log.info("err", err);
                  });
              } else {
                res.json({ message: "true" });
              }
            })
            .catch((error) => {
              log.info(error);
              plugin.sendToPropertyInspector({ inputChange: "" });
              log.info("我已经被验证通过了3");
              res.json({ message: "false" });
            });
        }
      })
      .catch((error) => {
        log.info("error", error);
        plugin.sendToPropertyInspector({ inputChange: "" });
        log.info("我已经被验证通过了2");
        res.json({ message: "false" });
      });
  } else {
    log.info("我已经被验证通过了1");
    res.json({ message: "false" });
  }
});

// // 用于通过模糊（游戏ID 或 游戏名称） 获取到具体ID 及名称
app.get("/getGameNameOrGameId", async (req, res) => {
  log.info("兄弟我进来啦", req.query);
  const url = "https://api.twitch.tv/helix/search/categories";
  twitchProxyGet(url, {
    params: { query: req.query.gameId },
    headers: {
      "Client-Id": config.clientId,
    },
  })
    .then((result) => {
      res.json({ data: result.data });
    })
    .catch((err) => {
      log.info(" getGameNameOrGameId err", err);
      res.status(500).json({ message: "请求异常！" });
    });
});

// 启动服务器 callback.html 页面的token 并获取到用户详细信息 并打开websocket连接
app.listen(port, () => {
  log.info(`Server is running at http://localhost:${port}`);
});

//注销
// 定义 '/logout' 路由的处理函数
// 当客户端发送 POST 请求到 '/logout' 路由，将会触发此处理函数
app.post("/logout", function (req, res) {
  // 撤销用户的 Access Token
  // 调用 Twitch OAuth2 API 的 'revoke' 端点以撤销 Access Token
  // 导入指定文件
  getUserInfo().then(async (userInfo) => {
    // 清理本地 authToken文件
    fs.outputFile("plugin/json/authToken.json", "{}")
      .then(async () => {
        plugin.sendToPropertyInspector({ inputChange: "" });
        //在这里将内容 干掉
        if (chatSettings.emote_mode) {
          contexts.emote_modes.forEach((context) => {
            plugin.setState(context, 0);
          });
        }
        if (chatSettings.follower_mode) {
          contexts.follower_modes.forEach((context) => {
            plugin.setState(context, 0);
            plugin.setSettings(context, { followerDuration: 0 });
          });
        }
        if (chatSettings.slow_mode) {
          contexts.slow_modes.forEach((context) => {
            plugin.setState(context, 0);
            plugin.setSettings(context, { waitTime: 3 });
          });
        }
        if (chatSettings.subscriber_mode) {
          contexts.subscriber_modes.forEach((context) => {
            plugin.setState(context, 0);
          });
        }
        if (chatSettings.is_active) {
          contexts.is_actives.forEach((context) => {
            plugin.setState(context, 0);
          });
        }
        chatSettings = {};
        pollState = "";
        if (tools.isNotEmptyObject(userInfo)) {
          var url = "https://id.twitch.tv/oauth2/revoke?time=" + Date.now();
          var param = {
            client_id: config.clientId,
            token: userInfo.access_token,
          };
          var header = {
            "Content-Type": "application/x-www-form-urlencoded",
          };
          proxyPost(url, param, header)
            .then((response) => {
              log.info("response.status", response.status);
              if (200 === response.status) {
                log.info("账户注销成功！");
              }
            })
            .catch((err) => {
              log.debug("err", err);
            });

          // req.session.destroy(function (err) {
          // 	if (err) {
          // 		return log.info(err);
          // 	}
          // 	res.redirect('/');
          // });
        }
        log.info("注销账户成功");
      })
      .catch((error) => {
        log.info("error", error);
      });
  });
});

// --------------------------------------------- 用于  被属性检查器调用  ---------------------------------------------
const globalDispose = {};

// 注销方法
globalDispose.revokingAccessTokens = () => {};
// 定义一个对象
const tokenContainer = {
  _tempToken: "", // 使用一个私有属性来存储值

  // 定义 getter 方法
  get tempToken() {
    return this._tempToken;
  },

  // 定义 setter 方法
  set tempToken(value) {
    // 可以在这里添加一些逻辑，例如验证 value 的类型或其他条件
    this._tempToken = value;
  },
};
// 用于 设置临时登录token 校验是否为我们软件发送的请求
globalDispose.saveLoginToken = (data) => {
  tokenContainer._tempToken = data;
};
// 传递方法名和参数
function executeMethod(methodName, parameter) {
  // 使用 globalDispose[methodName] 获取方法引用，然后调用它
  if (typeof globalDispose[methodName] === "function") {
    globalDispose[methodName](parameter);
  } else {
    log.error(`Method ${methodName} not found.`);
  }
}
