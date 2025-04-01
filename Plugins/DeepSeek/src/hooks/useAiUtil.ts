// 打开新窗口多实例
const useWindowUtil = (windowList: { [key: string]: WindowProxy | null }) => {
  // 关闭不是当前实例的窗口
  const closeOtherWindow = (context: string) => {
    Object.keys(windowList).forEach(ctx => {
      if (ctx != context) {
        if (windowList[ctx] && !windowList[ctx].closed) {
          windowList[ctx].close();
          windowList[ctx] = null;
        }
      }
    })
  }
  // 打开窗口
  const openCenteredWindow = (context: string, url: string, width: number, height: number) => {
    closeOtherWindow(context)
    if (windowList[context] && !windowList[context].closed) {
      windowList[context].close();
      windowList[context] = null;
    }
    // 获取屏幕宽度和高度
    var screenWidth = window.screen.width;
    var screenHeight = window.screen.height;

    // 计算新窗口的左边和上边位置以使其居中
    var left = (screenWidth - width) / 2;
    var top = (screenHeight - height) / 2;

    // 打开新窗口，并设置其大小和位置
    windowList[context] = window.open(url, '_blank', 'width=' + width + ',height=' + height + ',top=' + top + ',left=' + left);
    windowList[context].focus();
    return windowList[context]
  }

    // 判断窗口是否关闭
    const isWindowClosed = (context: string): boolean => {
      if (!windowList[context]) {
        return true;
      }
      // 检查窗口是否被关闭
      return windowList[context].closed;
    };

    const isWindowFoucs = (context: string): boolean => {
      if (!windowList[context]) {
        return false;
      }
      return windowList[context].document.hasFocus()
    }
  return {
    openCenteredWindow,
    isWindowClosed,
    isWindowFoucs
  }
}
import OpenAI from "openai";
type apiConfig = {
  baseUrl: string;
  modelId: string;
  apiKey: string;
}
// 兼容 openai 请求的封装，
const useOpenAiSdk = (instances: { [context: string]: apiConfig }) => {

  const requestAi = async (context: string, messages: any) => {
    let openai = null
    let completion = null
    try {
      openai = new OpenAI({
        baseURL: instances[context].baseUrl,
        apiKey: instances[context].apiKey,
        dangerouslyAllowBrowser: true
      });

      let filterMessages = messages.map((item: any) => {
        return {
          role: item.role,
          content: item.content
        }
      })

      completion = await openai.chat.completions.create({
        messages: filterMessages,
        model: instances[context].modelId,
        stream: true
      });
      return [true, completion]
    } catch (error) {
      return [false, error.message]
    }
  }
  return {
    requestAi
  }
}

export {
  useWindowUtil,
  useOpenAiSdk
}