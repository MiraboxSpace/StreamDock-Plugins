<template>
  <n-popover trigger="hover">
    <template #trigger>
      <n-image class="fujian-icon" preview-disabled src="./images/deepseek/fujian.png" />
    </template>

    <template #default>
      <div class="action-list">
      <div class="action-item" @click="update">
        <n-image preview-disabled src="./images/icon.png" />
        从电脑上传
      </div>
      <div class="action-item" @click="update">
        连接到Space空间(开发中)
      </div>
    </div>
    </template>
  </n-popover>
</template>

<script setup lang="ts">
import { NImage, NPopover } from 'naive-ui';
const value = ref('')
const update = () => {
  alert('update')
}
</script>

<style lang="scss" scoped>
.fujian-icon {
  width: 3vmin;
  height: 3vmin;
}
.action-list {
  .action-item {
    height: 4vh;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 1vmin 0;
    padding: 1vmin;
    border-radius: 1vw;
    color: white;
    font-size: 1.5vmin;
    cursor: pointer;

    :deep().n-image {
      width: 2vmin;
      height: 2vmin;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 1vmin;
    }

    &:hover {
      background-color: #2d2d2d;
    }
  }
}
</style>