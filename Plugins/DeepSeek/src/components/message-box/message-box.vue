<template>
  <div class="message-box">
    <n-input ref="inputRef" :placeholder="i18n['typeYourMessage']" type="textarea" size="small" :autosize="{
      minRows: 3,
      maxRows: 5,
    }" v-model:value="inputMessage" @keydown="keyDown" :theme-overrides="{ border: '0' }" />
    <div class="tool-box">
      <div class="left-content">
        <!-- <upload-file></upload-file> -->
        <div></div>
        <!-- <tool-box></tool-box> -->
      </div>
      <div class="right-content">
        <n-checkbox v-model:checked="isSend">
          自动发送
        </n-checkbox>

        <voice></voice>
        <!-- <testMkf></testMkf> -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NInput, NCheckbox } from 'naive-ui';
import uploadFile from './upload-file.vue';
import toolBox from './tool-box.vue';
import voice from './voice.vue';
import { I18nKey } from '@/hooks/injectionKeys'
import testMkf from './test-mkf.vue';

const inputMessage = defineModel<string>()
const inputRef = ref(null)
const isSend = ref(false)
const props = defineProps<{
  isLoading: boolean
}>();

// 注入国际化对象
const i18n = inject(I18nKey);

// 定义可触发的事件
const emit = defineEmits(['sendMessage']);

const keyDown = (e: KeyboardEvent) => {
  if (!e.shiftKey && e.keyCode == 13) {
    e.cancelBubble = true;
    e.stopPropagation();
    e.preventDefault();
    emit('sendMessage');
  }
}

const setInputMessage = (val: string) => {
  inputMessage.value = val
  inputRef.value?.focus();
  if(isSend.value) {
    emit('sendMessage');
  }
}
provide('setInputMessage', setInputMessage)
</script>

<style lang="scss" scoped>
.message-box {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #3d3d3d;
  padding: 1vmin;
  border-radius: 1vmin;
}

.tool-box {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1vmin;
}

.left-content {
  display: flex;
  justify-content: space-between;
  div {
    margin-right: 2vmin;
  }
}

.right-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  :deep().n-checkbox {
    font-size: clamp(12px, 1.5vmin, 22px);
  }
}

:deep().n-input {
  background: #3d3d3d;
}
</style>