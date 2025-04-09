<template>
  <div class="deepseek-index">
    <!-- 内容区域 -->
    <div class="content">
      <!-- 左侧边栏 -->
      <div class="sidebar">
        <message-sidebar @add-conversation="addConversation" @switch-conversation="switchConversation"
          @delete-conversation="deleteConversation" @rename-conversation="renameConversation"
          :conversations="conversations" :currentConversationIndex="currentConversationIndex"></message-sidebar>
      </div>

      <!-- 右侧主界面 -->
      <div class="main">
        <div v-if="conversations.length > 0" class="chat-title">{{ conversations[currentConversationIndex].name }}
        </div>
        <div class="chat-container">
          <message-history :currentMessages="currentMessages"></message-history>
        </div>
        <div class="input-container">
          <message-box v-model="inputMessage" :isLoading="isLoading" @send-message="sendMessage"></message-box>
        </div>
        <div class="footer-tip">
          <!-- <div @click="clearConversation">clearConversation</div> -->
          <!-- <n-image width="30" height="20" preview-disabled src="./images/deepseek/warn.png" />小助手也可能会犯错，请核查重要信息 -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NImage } from 'naive-ui';
import messageSidebar from '@/components/message-sidebar/message-sidebar.vue';
import messageBox from '@/components/message-box/message-box.vue';
import messageHistory from '@/components/message-history/message-history.vue';
import 'highlight.js/styles/monokai.css';
import { ContextKey, RequestAiKey, MarkedKey, SetDataKey, GetDataKey, I18nKey, OpenUrlKey, EventStoreKey } from '@/hooks/injectionKeys';
const context = inject(ContextKey);
const requestAi = inject(RequestAiKey);
const marked = inject(MarkedKey);
const setData = inject(SetDataKey);
const getData = inject(GetDataKey);
const i18n = inject(I18nKey);
const eventStore = inject(EventStoreKey);
// 保存会话
const setConversations = () => {
  setData(context, JSON.stringify(conversations.value))
};
const getConversations = () => {
  // 直接获取数据，不再需要 JSON.parse，因为 linkGetData 已经返回了对象/数组
  let data = []
  try {
    data = JSON.parse(getData(context));
  } catch (error) {
    data = []
  }
  console.log(typeof data)
  // 确保返回值是一个数组，防止意外情况
  return Array.isArray(data) ? data : [];
}

// 获取会话历史
const savedConversations = getConversations();
const conversations = ref<AiType.Conversation[]>(getConversations());
const currentConversationIndex = ref(0);
console.log(typeof conversations.value, conversations.value, currentConversationIndex.value)
// 当前会话的消息（改为可变的 ref）
const currentMessages = ref<AiType.Message[]>([]);

// 动态更新当前消息列表
watch(
  () => currentConversationIndex.value,
  () => {
    if (conversations.value.length > 0 && currentConversationIndex.value >= 0 && currentConversationIndex.value < conversations.value.length) {
      currentMessages.value = conversations.value[currentConversationIndex.value].messages;
    } else {
      currentMessages.value = [];
    }
  },
  { immediate: true }
);
// 输入消息
const inputMessage = ref('');
const isLoading = ref(false);

// 发送消息
const sendMessage = async () => {
  if (isLoading.value) return
  if (inputMessage.value.trim() === '') return;

  isLoading.value = true;
  const userMessage = ref<AiType.Message>({ role: "user", content: inputMessage.value });
  currentMessages.value.push(userMessage.value);

  const botMessage = ref<AiType.Message>({ role: 'assistant', content: '', reasoning_content: '' });
  // 当没有会话时发送消息自动新建会话
  if (!conversations.value.length || currentConversationIndex.value == -1) {
    conversations.value.push({ messages: currentMessages.value, name: inputMessage.value });
  }

  inputMessage.value = '';
  // isLoading.value = false;
  // setConversations();
  try {
    let result = await requestAi(context, currentMessages.value)
    currentMessages.value.push(botMessage.value);
    if (!result[0]) {
      throw new Error(result[1])
    }
    let tempMessage = ''
    for await (const chunk of result[1]) {
      if (chunk.choices[0].delta.reasoning_content) {
        botMessage.value.reasoning_content += chunk.choices[0].delta.reasoning_content
      }
      if (chunk.choices[0].delta.content) {
        tempMessage += chunk.choices[0].delta.content
        botMessage.value.content = marked(tempMessage);
      }
    }
  } catch (error) {
      botMessage.value.content = error.message;
  }
  isLoading.value = false;
  setConversations();
};

// 新建会话
const addConversation = () => {
  const conversationName = prompt(i18n['addConversation']);
  if (!conversationName) {
    return
  }
  // 检查是否已存在相同名称的对话
  const isConversationNameExists = conversations.value.some((i) => {
    return i.name === conversationName;
  });

  if (isConversationNameExists) {
    alert(i18n['conversationExists']);
    return;
  }
  conversations.value.push({ messages: [], name: conversationName });
  currentConversationIndex.value = conversations.value.length - 1;
  setConversations();
};

// 切换会话
const switchConversation = (index) => {
  currentConversationIndex.value = index;
};

// 重命名会话
const renameConversation = (index: number, newName: string) => {
  conversations.value[index].name = newName
}


// 删除会话
const deleteConversation = (index) => {
  console.log(index)
  // if (conversations.value.length <= 1) return
  conversations.value.splice(index, 1);
  if (currentConversationIndex.value >= conversations.value.length) {
    if (conversations.value.length == 0) {
      currentConversationIndex.value = 0;
    } else {
      currentConversationIndex.value = conversations.value.length - 1;
    }
  }

  setConversations();
};
const clearConversation = () => {
  currentMessages.value.length = 0
}
// 页面加载时恢复会话
onMounted(() => {
  setConversations(); // 初始化存储
});

const editMessageSend = (value) => {
  inputMessage.value = value
  sendMessage()
}

provide('editMessageSend', editMessageSend)
</script>

<style scoped>
html,
  body {
    user-select: auto;
  }
.deepseek-index {
  width: 100vw;
  height: 100vh;
  background: #2d2d2d;
  display: flex;
  flex-direction: column;
}

.content {
  display: flex;
  width: 100%;
  height: 100%;
}

.sidebar {
  width: clamp(240px, 20vw, 300px);
  padding: 1vmin;
  overflow-y: scorll;
  background-color: #212327;
}

.main {
  position: relative;
  flex: 1;
  /* width: 80vw; */
  height: 100%;
  padding: 1vmin;
  background-color: #2d2d2d;
  display: flex;
  flex-direction: column;
}

.chat-title {
  width: 100%;
  flex: 5;
  text-align: center;
  font-size: clamp(12px, 1.5vw, 22px);
  padding: 0 30%;
  white-space: nowrap;        /* 禁止换行 */
  overflow: hidden;           /* 隐藏超出部分 */
  text-overflow: ellipsis;    /* 显示省略号 */
}

.chat-container {
  width: 100%;
  flex: 75;
  overflow: hidden;
  z-index: 1;
}

.input-container {
  width: 100%;
  /* flex: 20; */
  /* max-height: 160px; */
  z-index: 2;
  display: flex;
}

.footer-tip {
  width: 100%;
  flex: 0;
  display: flex;
  justify-content: center;
}
</style>