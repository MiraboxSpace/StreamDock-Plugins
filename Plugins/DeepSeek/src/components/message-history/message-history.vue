<template>
  <div class="message-history">
    <div class="gradient-mask"></div>
    <div ref="messageBox" class="message-list">
      <div v-for="(msg, index) in currentMessages" :key="index" :class="[msg.role]">
        <div class="message-item">
          <message-user v-if="msg.role == 'user'" :msg="msg"></message-user>
          <message-assistant v-else :msg="msg"></message-assistant>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import messageUser from './message-user.vue';
import messageAssistant from './message-assistant.vue';
const props = defineProps<{
  currentMessages: AiType.Message[]
}>()
const messageBox = ref(null)
const scrollToBottom = () => {
  if (messageBox.value) {
    messageBox.value.scrollTop = messageBox.value.scrollHeight;
  }
};
const updateScrollToBottom = (forced = false) => {
  scrollToBottom();
}
onUpdated(() => {
  updateScrollToBottom()
})
provide('updateScrollToBottom', updateScrollToBottom)
</script>

<style scoped>
.message-history {
  position: relative;
  width: 100%;
  height: 100%;
}
.gradient-mask {
  position: absolute;
  width: 100%;
  height: 4vh;
  background: linear-gradient(to bottom, rgba(45,45,45,1), rgba(45,45,45,0));
  z-index:2;
}
.message-list {
  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  z-index:1;
  padding-top: 40px;
}

.message-item {
  position: relative;
  width: 100%;
  margin-bottom: 3vmin;
}
</style>