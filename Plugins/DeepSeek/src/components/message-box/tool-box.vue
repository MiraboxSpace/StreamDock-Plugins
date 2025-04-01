<template class="tool-box">
    <n-popselect
    v-model:value="value"
    :options="options"
    size="medium"
    scrollable
  >
  <n-image
  class="tool-box-icon"
   preview-disabled
   src="./images/deepseek/tool-box.png"
 />
  </n-popselect>

</template>

<script setup lang="ts">
 import { NPopselect, NImage } from 'naive-ui';
  const value = ref('Drive My Car')
  const options = [
        {
          label: '文生图',
          value: 'Drive My Car'
        },
        {
          label: '图片',
          value: 'Norwegian Wood'
        },
        {
          label: '搜索',
          value: 'You Won\'t See',
        }
      ]
</script>

<style lang="scss" scoped>
:deep().n-popselect {
  font-size: 1.5vw;
}
.tool-box-icon {
  width: 3vmin;
  height: 3vmin;
}
</style>