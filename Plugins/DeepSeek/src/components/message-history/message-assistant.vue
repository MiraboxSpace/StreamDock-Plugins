<template>
  <div class="message-assistent">
    <div class="head">
      <n-image preview-disabled src="./images/deepseek/deepseek-copy.png"></n-image>
    </div>
    <div class="content">
      <div v-if="msg.reasoning_content">
        <div v-html="msg.reasoning_content"></div>
      </div>
      <div>
        <div v-html="msg.content"></div>
      </div>
      <!-- <div class="play">
        <n-image preview-disabled src="./images/deepseek/shengbo.png"></n-image>
      </div> -->
    </div>
    
  </div>
</template>
<script setup lang="ts">

import { NImage } from 'naive-ui';
const props = defineProps<{
  msg: AiType.Message
}>()
const updateScrollToBottom = inject<() => void>('updateScrollToBottom')
onUpdated(() => {
  updateScrollToBottom()
})
</script>
<style lang="scss" scoped>
.message-assistent {
  position: relative;
  width: 100%;
  display: flex;
  align-items: flex-start;
}

.head {
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(10px, 6vmin, 40px);
  height: 6vmin;
  background-color: white;
  border: 1px solid skyblue;
  border-radius: 50%;
  margin-right: 1vmin;
  :deep().n-image {
    width: 4vmin;
    height: 4vmin;
  }
}
.content {
  position: relative;
  max-width: calc(100% - 14vmin);
  margin-top: 1vh;
  padding: 2vmin 4vmin;
  background-color: #565656;
  border-radius: 1vw;
  color: #FFFFFF;
  font-size: clamp(12px, 1.5vmin, 22px);
}
.play {
  position: absolute;
  width: 2vw;
  height: 2vw;
  right: 0;
  bottom: 0;
  transform: translate(50%, 50%);
  border-radius: 50%;
  border: 1px solid pink;
  background-color: white;

  display: flex;
  justify-content: center;
  align-items: center;

  :deep().n-image {
    width: 1.5vw;
    height: 1.5vw;
    cursor: pointer;
  }
}
</style>