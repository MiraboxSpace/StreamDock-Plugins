<template>
  <div class="message-sidebar">
    <n-button class="add-conversation" @click="$emit('addConversation')">
      <n-icon size="16" :component="AddFilled"></n-icon>
      {{ i18n['newConversation'] }}
    </n-button>
    <div class="conversation-list">
      <div v-for="(conversation, index) in conversations" :key="conversation.name"
        :class="{ active: currentConversationIndex === index }" @click="$emit('switchConversation', index)"
        class="conversation-item" @mouseover="showIcon(index)" @mouseleave="hideIcon(index)">

        <div v-if="renameIndex === index" class="conversation-rename">
          <!-- <n-input></n-input> -->
        </div>
        <div v-else class="conversation-action">
          <div class="conversation-action-title">{{ conversation.name }}</div>
          <div class="conversation-icon" v-show="currentConversationIndex === index || currentHoverIndex === index">
            <n-popover trigger="click" placement="right">
              <template #trigger>
                <n-icon :component="MoreVertFilled" />
              </template>
              <template #default>
                <div style="display: flex;flex-direction: column;align-items: center;">
                  <!-- <n-button style="width: 100%" strong>
                    {{ i18n['rename'] }}
                  </n-button> -->
                  <!-- <div style="height:10px"></div> -->
                  <n-button style="width: 100%" strong type="error" @click="handleDelete(index)">
                    <template #icon>
                      <n-icon>
                        <DeleteFilled />
                      </n-icon>
                    </template>
                    {{ i18n['delete'] }}
                  </n-button>
                </div>
              </template>
            </n-popover>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NButton, NIcon, NPopover, useDialog, NInput } from 'naive-ui';
import { MoreVertFilled, AddFilled, DeleteFilled } from '@vicons/material'
import { inject, ref } from 'vue';
import { ContextKey, RequestAiKey, MarkedKey, SetDataKey, GetDataKey, I18nKey, OpenUrlKey, EventStoreKey } from '@/hooks/injectionKeys';

const i18n = inject(I18nKey);
const props = defineProps<{
  conversations: Array<{ name: string }>,
  currentConversationIndex: number
}>();
const emit = defineEmits(['addConversation', 'switchConversation', 'deleteConversation', 'renameConversation']);

const dialog = useDialog();

const currentHoverIndex = ref<number | null>(null);
const renameIndex = ref<number | null>(null);

const showIcon = (index: number) => {
  currentHoverIndex.value = index;
};

const hideIcon = (index: number) => {
  currentHoverIndex.value = null;
};

const handleDelete = (index: number) => {
  dialog.warning({
    title: i18n['confirmDelete'],
    content: i18n['confirmDeleteMessage'],
    positiveText: i18n['delete'],
    negativeText: i18n['cancel'],
    showIcon: false,
    onPositiveClick: () => {
      emit('deleteConversation', index);
    }
  });
};
</script>

<style scoped lang="scss">
.message-sidebar {
  color: #ffffff;
  padding: clamp(10px, 0.5vw, 15px);
  .add-conversation {
    width: 100%;
    margin-bottom: 1vw;
    font-size: clamp(12px, 1.5vmin, 22px);
  }
  .conversation-list {
    .conversation-item {
      position: relative;
      padding: clamp(10px, 1vw, 15px);
      cursor: pointer;
      transition: background-color 0.3s;
      border-radius: 8px;

      &:hover {
        background-color: #333333;
      }

      &.active {
        background-color: #494949;
        font-weight: bold;
      }
    }

    .conversation-action {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: clamp(12px, 1.5vmin, 22px);

      font-weight: none;
    }
    .conversation-action-title {
      white-space: nowrap;        /* 禁止换行 */
      overflow: hidden;           /* 隐藏超出部分 */
      text-overflow: ellipsis;    /* 显示省略号 */
    }
    .conversation-icon {
      display: flex;
      flex-direction: column;
      :deep().n-icon {
        font-size: clamp(12px, 1.5vmin, 22px);

      }
    }
  }
}
</style>