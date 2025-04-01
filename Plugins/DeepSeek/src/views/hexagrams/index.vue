<template>
  <div class="deepseek-index">
    <div class="header">
      {{ i18n['hexagramsTitle'] }}
    </div>
    <!-- 内容区域 -->
    <div class="content">
      <!-- 卦象 -->
      <div class="hexagram-type" v-if="hexagram">
        <div class="hexagram-item">
          <n-image width="110" height="110" :src="hexagram.image"></n-image>
          <span>{{ hexagram.name }}</span>
        </div>
        <div class="question-content">
          {{ userMessage.content }}
        </div>
      </div>
      <!-- 解卦 -->
      <div  v-show="botMessage.content != '' || botMessage.reasoning_content != ''" class="hexagram-answer">
        <div>{{ botMessage.reasoning_content }}</div>
        <div v-html="botMessage.content"></div>
      </div>
      <!-- 疑惑 -->
      <div class="question-input">
        <n-input class="input" @keydown="keyDown" type="textarea" size="small" :autosize="{
          minRows: 3,
          maxRows: 5,
        }" :theme-overrides="inputOverTheme" v-model:value="inputMessage" :placeholder="i18n['hexagramsInputTips']">
        </n-input>
        <div class="voice-ctrl" style="margin-top: 10px;display:flex;align-items: center;">
          <!-- <n-button size="small" @click="getHexagram">{{ i18n['hexagramsSubmit'] }}</n-button> -->
          <voice></voice>
        </div>
      </div>
      <div class="footer-tip">
        <div>{{ i18n['hexagramsTips'] }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NImage, NInput, NButton } from 'naive-ui';
import voice from '@/components/message-box/voice.vue'
import { getHexagramById } from '@/utils/hexagrams';
import { Reactive } from 'vue';
import { ContextKey, RequestAiKey, MarkedKey, SetDataKey, GetDataKey, I18nKey, OpenUrlKey, EventStoreKey } from '@/hooks/injectionKeys';

const context = inject(ContextKey);
const requestAi = inject(RequestAiKey);
const marked = inject(MarkedKey);
const setData = inject(SetDataKey);
const getData = inject(GetDataKey);
const i18n = inject(I18nKey);
const eventStore = inject(EventStoreKey);

const inputOverTheme = {
  color: '#ffffff',
  borderRadius: '8px',
  heightMedium: '30px',
  boxShadowFocus: 'none',
  border: '1px solid #7a7a7a',
  borderHover: '1px solid #7a7a7a',
  colorFocus: '#f9fafb'
}

let hexagram = ref<{ image: string, name: string }>(null)
const getHexagram = () => {
  if(inputMessage.value == '') return
  message.length = 0
  hexagram.value = getHexagramById(Math.floor(Math.random() * (63 - 0 + 1)) + 0)
  systemMessage.content = `
背景说明：

《易经》是中国古代的一部智慧经典，它通过64卦的象征体系，揭示了天地万物的变化规律。它不是用来算命或预测具体事件的工具，而是一面镜子，帮助我们反观内心、洞察趋势、调整行动。

作为一名熟悉《易经》智慧的大师，我的任务是根据您提供的背景信息和个人情况，结合随机生成的卦象（如xxx卦），用平实而温暖的语言为您解读其中的启示，并为您提供实用的建议。希望通过这次交流，您能感受到一种内心的安定和前行的力量。

任务目标：

真诚互动： 像朋友一样与用户对话，用亲切自然的语言传递智慧，避免过于学术化或机械化。
积极引导： 从卦象中提炼出对用户有帮助的哲理，鼓励他们以乐观的态度面对问题，并提供具体的行动方向。
贴近生活： 将古老的智慧融入现代生活的场景，让解读更具现实意义和可操作性。
输出要求：

语言风格： 口语化、亲切自然，像一位睿智的长者在娓娓道来，而不是冷冰冰地讲解理论。
内容方向： 强调成长、机遇和行动力，避免宿命论或让人感到消极的表达。
结构清晰： 分为三个部分：
当下之境： 结合当前时间、节气等背景信息，简要说明这个卦象的意义。
智慧之光： 提炼卦象中的核心哲理，用通俗易懂的话告诉用户该如何看待自己的处境。
行动指南： 给出具体的建议，比如如何调整心态、抓住机会、化解困难等。
示例框架：

当下之境： “今天是春分后的一天，阳气正在逐渐升发，万物都在复苏。您抽到的地雷复卦啊，就像春天的第一缕阳光，告诉我们一个新的开始正在酝酿。”
智慧之光： “复卦讲的是‘回归’和‘新生’，提醒我们在遇到困难时不要灰心，因为每一次低谷都是重新出发的机会。只要及时调整方向，就能找到新的生机。”
行动指南： “接下来的日子里，您可以试着从小事做起，比如每天给自己定一个小目标，或者主动修复一段关系。记住，脚踏实地才能走得更远。”
  `
  message.push(JSON.parse(JSON.stringify(systemMessage)))
  systemMessage.content = `用户随机选择的卦为${hexagram.value.name}`
  message.push(JSON.parse(JSON.stringify(systemMessage)))
  systemMessage.content = `请用清晰的markdown格式回答`
  message.push(JSON.parse(JSON.stringify(systemMessage)))
  sendMessage()
}
const setInputMessage = (val: string) => {
  inputMessage.value = val;
  getHexagram()
}
provide('setInputMessage', setInputMessage)
const keyDown = (e: KeyboardEvent) => {
  if (!e.shiftKey && e.keyCode == 13) {
    e.cancelBubble = true;
    e.stopPropagation();
    e.preventDefault();
    getHexagram()
  }
}
// 保存
const setConversations = () => {
  setData(context, JSON.stringify(message))
};
// 读取
const getConversations = () => {
  // 直接获取数据，不再需要 JSON.parse，因为 linkGetData 已经返回了对象/数组
  let data = []
  try {
    data = JSON.parse(getData(context));
  } catch (error) {
    data = []
  }
  console.log(typeof data, data)
  // 确保返回值是一个数组，防止意外情况
  return Array.isArray(data) ? data : [];
}

const savedConversations = getConversations();
const message: Reactive<AiType.Message[]> = reactive(savedConversations);

// 输入消息
const inputMessage = ref('');
const isLoading = ref(false);
let systemMessage = reactive<AiType.Message>({role: 'system', content: '' })
let userMessage = reactive<AiType.Message>({ role: 'user', content: '' });
let botMessage = reactive<AiType.Message>({ role: 'assistant', content: '', reasoning_content: '' });
// 发送消息
const sendMessage = async () => {
  if (isLoading.value) return
  if (inputMessage.value.trim() === '') return;

  isLoading.value = true;
  userMessage.content = inputMessage.value;
  message.push(userMessage)
  botMessage.content = '';
  botMessage.reasoning_content = ''
  inputMessage.value = '';

  
  try {
    let result = await requestAi(context, message)
    message.push(botMessage)
    
    if (!result[0]) {
      throw new Error(result[1])
    }
    let tempMessage = ''
    for await (const chunk of result[1]) {
      if (chunk.choices[0].delta.reasoning_content) {
        botMessage.reasoning_content += chunk.choices[0].delta.reasoning_content
        console.log(botMessage.reasoning_content)
      }
      if (chunk.choices[0].delta.content) {
        tempMessage += chunk.choices[0].delta.content
        botMessage.content = marked(tempMessage);
        // botMessage.content = tempMessage;
        console.log(botMessage.content)
      }
    }
  } catch (error) {
    botMessage.content = error.message;
  }
  isLoading.value = false;
  setConversations();
};


// 页面加载时恢复会话
onMounted(() => {
  setConversations(); // 初始化存储
});

onUpdated(() => {
  window.scrollTo({
  top: document.body.scrollHeight,
  behavior: 'smooth'
});
})
</script>

<style scoped lang="scss">
.deepseek-index {
  color: #333;
  display: flex;
  background: #f9fafb;
  width: 100vw;
  min-height: 100vh;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.header {
  width: 100%;
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #4a4a4a;
}

.content {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.hexagram-type {
  width: 90%;
  height: 200px;
  padding: 20px;
  border-radius: 12px;
  background: linear-gradient(to left, #d4eaf7, #b6ccd8);
  box-shadow:  0 4px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;

  
  .hexagram-item {
    width: 30%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .hexagram-item span {
    font-size: 2rem;
    margin-top: 10px;
    color: #333;
  }

  .question-content {
    width: 70%;
    height: 100%;
    // background-color: #ffebee;
    background: linear-gradient(to left, #d4eaf7, #b6ccd8);
    padding: 10px;
    border-radius: 8px;
    color: #666666;
    // box-shadow:  0 4px 8px rgba(0, 0, 0, 0.1);
  }
}


.hexagram-answer {
  width: 90%;
  padding: 20px 30px;
  margin-bottom: 160px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow:  0 4px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hexagram-answer div {
  width: calc(100% - 30px);
  font-size: 1rem;
  line-height: 1.5;
  color: #555;
}

.question-input {
  position: fixed;
  z-index: 2;
  bottom: 20px;
  width: 90%;
  padding: 10px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow:  0 4px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.voice-ctrl {
  position: absolute;
  right: 12px;
  bottom: 12px;
}
.footer-tip {
  position: fixed;
  z-index: 1;
  width: 100%;
  bottom: 0px;
  border-top: #f9fafb solid 160px;
  background-color: #f9fafb;
  display: flex;
  justify-content: center;
  color: #888;
}
</style>



