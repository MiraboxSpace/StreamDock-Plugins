<!-- 请勿修改此文件 -->
<script setup lang="ts">
  defineProps<{ label: string; width?: string; alignItems?: string }>();
</script>

<template>
  <div class="tab-wrap" :style="{ alignItems }">
    <div class="label" :style="{ width }" :title="label">{{ label }}</div>
    <div class="value">
      <slot></slot>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .tab-wrap {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 10px;
    .label {
      width: 100%;
      // padding-left: 4px;
      margin-bottom: 6px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-size: 16px;
    }
    .value {
      width: 100%;
    }

    &:last-child {
      margin-bottom: 0;
    }
  }
</style>
