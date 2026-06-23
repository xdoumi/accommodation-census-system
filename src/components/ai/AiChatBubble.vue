<template>
  <div class="ai-chat-bubble" :class="{ 'is-mobile': mobile }" @click="panelVisible = true">
    <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="9">
      <div class="bubble-icon">
        <el-icon :size="mobile ? 22 : 26"><MagicStick /></el-icon>
      </div>
    </el-badge>
  </div>
  <AiChatPanel v-model:visible="panelVisible" :mobile="mobile" />
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAiSettingsStore } from '@/stores/aiSettings'
import AiChatPanel from './AiChatPanel.vue'

defineProps({
  mobile: { type: Boolean, default: false },
})

const aiSettings = useAiSettingsStore()
const panelVisible = ref(false)
const unreadCount = computed(() => aiSettings.featureFlags.chatBubble ? 0 : 0)
</script>

<style lang="scss" scoped>
.ai-chat-bubble {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2000;
  cursor: pointer;

  &.is-mobile {
    bottom: 70px;
    right: 16px;
  }

  .bubble-icon {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: linear-gradient(135deg, #1a5fc5, #4a80d4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    box-shadow: 0 4px 16px rgba(26, 95, 197, 0.4);
    transition: transform 0.2s, box-shadow 0.2s;

    &:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 20px rgba(26, 95, 197, 0.5);
    }

    &:active {
      transform: scale(0.95);
    }
  }

  &.is-mobile .bubble-icon {
    width: 46px;
    height: 46px;
  }
}
</style>
