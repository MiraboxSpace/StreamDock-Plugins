    // for await (const chunk of result[1]) {
    // // 使用 "data:" 作为分隔符分割字符串
    // const splitData = chunk.split('data:').filter(chunk => chunk.trim() !== '');

    // // 清理并解析 JSON
    // const jsonObjects = splitData.map(chunk => {
    //   const cleanChunk = chunk.trim();
    //   try {
    //     // 尝试解析 JSON
    //     return JSON.parse(cleanChunk);
    //   } catch (error) {
    //     console.error(`Failed to decode JSON: ${error.message}`);
    //     return null;
    //   }
    // }).filter(obj => obj !== null); // 移除无法解析的部分

    // // 输出结果以验证
    // jsonObjects.forEach((chunk, index) => {
    //   if(chunk.choices[0].delta.reasoning_content) {
    //     botMessage.value.reasoning_content += chunk.choices[0].delta.reasoning_content
    //   }
    //   if(chunk.choices[0].delta.content) {
    //     tempMessage += chunk.choices[0].delta.content
    //     console.log(window.opener.deepseekLink.linkMarked(tempMessage))
    //     botMessage.value.content = window.opener.deepseekLink.linkMarked(tempMessage);
    //   }
    // });
    // }
  /**
   * 发送POST请求
   * @param {Object} payload - 请求体
   * @param {boolean} [stream=false] - 是否为流式请求
   */
  async function sendPostRequest(context: string, payload: any, stream = false) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 超时时间为60秒

    try {
      const response = await fetch(instances[context].baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${instances[context].apiKey}`
        },
        body: JSON.stringify({
          ...payload,
          stream: stream
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, message: ${await response.text()}`);
      }

      return stream ? response : await response.json();

    } catch (error) {
      console.error("Request failed:", error.message);
      throw error;
    }
  }

  /**
   * 处理流式响应
   * @param {Response} response - 流式响应对象
   */
  async function* handleStreamResponse(response) {
    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let done = false;
    while (!done) {
      const { value, done: readDone } = await reader.read();
      done = readDone;
      if (value) {
        yield decoder.decode(value, { stream: true });
      }
    }
  }

  /**
   * 处理响应数据
   * @param {Object} data - 响应数据
   */
  function handleResponse(data) {
    let formatData = ''
    if (data.choices && data.choices.length > 0) {
      console.log(data.choices[0].message.content);
      if (data.references) {
        console.log(data.references);
      }
      if (data.choices[0].message.reasoning_content) {
        console.log(data.choices[0].message.reasoning_content);
      }
      return data.choices[0].message.content
    } else {
      console.error("No choices in response");
      return "No choices in response"
    }
  }

  /**
   * 发送标准请求
   */
  async function standardRequest(context, messages) {
    console.log("----- standard request -----");
    const payload = {
      model: instances[context].modelId,
      messages: messages,
    };

    try {
      const data = await sendPostRequest(context, payload);
      handleResponse(data);
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * 发送多轮对话请求
   */
  async function multipleRoundsRequest(context, messages) {
    console.log("----- multiple rounds request -----");
    const payload = {
      model: instances[context].modelId,
      messages: messages,
    };
    let result = []
    try {
      const data = await sendPostRequest(context, payload);
      return [true, handleResponse(data)];
    } catch (error) {
      console.error(error);
      return [false, error];
    }
  }

  /**
   * 发送流式请求
   */
  async function streamingRequest(context, messages) {
    console.log("----- streaming request -----");
    const payload = {
      model: instances[context].modelId,
      messages: messages,
    };

    try {
      const data = await sendPostRequest(context, payload, true);
      return [true, handleStreamResponse(data)];
    } catch (error) {
      console.error(error);
    }
  }

  // 调用示例
  // standardRequest();
  // multipleRoundsRequest();
  // streamingRequest();