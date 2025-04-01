declare namespace AiType {
  // 定义角色类型
  type Role = "user" | "assistant" | "system";

  // 定义消息接口
  interface Message {
    role: Role;
    content: string;
    reasoning_content?: string;
  }

  interface Conversation {
    messages: Message[];
    name: string;
  }

  type apiConfig = {
    baseUrl: string;
    modelId: string;
    apiKey: string;
  }
}