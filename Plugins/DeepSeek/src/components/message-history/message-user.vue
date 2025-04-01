<template>
  <div class="message-user">
    <div class="content" :class="{'width-full':editStatus}">
      <div class="edit">
        <n-image @click="editStatus = true" preview-disabled src="./images/deepseek/edit.png"></n-image>
      </div>
      <div v-if="!editStatus" class="edit-not">{{ msg.content }}</div>
      <div v-else class="edit-active">
        <n-input :placeholder="i18n['typeYourMessage']" autofocus type="textarea" size="small" :autosize="{
          minRows: 3,
          maxRows: 5,
        }" v-model:value="content" @keydown="keyDown" />

      </div>
    </div>
    <div class="head">
      <img class="head-image" src="" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { NImage, NInput } from 'naive-ui';
import { I18nKey } from '@/hooks/injectionKeys';
const props = defineProps<{
  msg: AiType.Message
}>()
const i18n = inject(I18nKey)
const editMessageSend = inject<(val: string) => void >('editMessageSend')
const editStatus = ref(false)
const content = ref(props.msg.content)

watch(editStatus,(newVal) => {
  if(newVal == true) content.value = props.msg.content
})

const keyDown = (e: KeyboardEvent) => {
  if(!e.shiftKey && e.keyCode == 13) {
    e.cancelBubble = true;
    e.stopPropagation();
    e.preventDefault();
    editMessageSend(content.value)
    editStatus.value = false
  }
}
</script>
<style lang="scss" scoped>
.message-user {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
}
.message-user:hover :deep().edit {
  opacity: 1;
}
.edit {
  position: absolute;
  top: 0;
  left: 0;
  transform: translateX(-100%);
  width: 2vw;
  height: 2vw;
  opacity: 0;
  :deep().n-image {
    width: 2vw;
    height: 2vw;
  }
}
.width-full {
  width: calc(100% - 14vmin);
}
.content {
  position: relative;
  // max-width: calc(100% - 13vmin);
  margin-top: 1vh;
  color: #FFFFFF;
  font-size: clamp(12px, 1.5vmin, 22px);
  .edit-not {
    padding: 2vmin 4vmin;
    background-color: #9b9b9b;
    border-radius: 1vw;
  }
  .edit-active {
    width: 100%;
  }
}

.head {
  width: 6vmin;
  height: 6vmin;
  background-color: white;
  border: 1px solid skyblue;
  border-radius: 50%;
  margin-left: 1vmin;
}
</style>