<template>
  <div class="ai-chat-message" :class="{ 'is-user': message.role === 'user', 'is-assistant': message.role === 'assistant' }">
    <div class="message-avatar">
      <el-icon v-if="message.role === 'assistant'" :size="20" color="#1a5fc5"><MagicStick /></el-icon>
      <el-icon v-else :size="18" color="#fff"><User /></el-icon>
    </div>
    <div class="message-bubble">
      <div v-if="message.role === 'assistant' && !message.content" class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
      <div v-else class="message-content" v-html="renderedContent"></div>
      <div v-if="message.toolResults && message.toolResults.length > 0" class="tool-results">
        <div v-for="(tr, idx) in message.toolResults" :key="idx" class="tool-result">
          <el-icon><Tools /></el-icon> {{ tr.result?.message || '已执行' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  message: { type: Object, required: true },
})

// 简易 Markdown 渲染（粗体、换行、列表、代码）
const renderedContent = computed(() => {
  let text = props.message.content || ''
  // HTML 转义
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // 粗体
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // 标题
  text = text.replace(/^### (.+)$/gm, '<h4>$1</h4>')
  text = text.replace(/^## (.+)$/gm, '<h3>$1</h3>')
  text = text.replace(/^# (.+)$/gm, '<h3>$1</h3>')
  // 行内代码
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>')
  // 列表
  text = text.replace(/^- (.+)$/gm, '<li>$1</li>')
  text = text.replace(/(<li>.*<\/li>(\n)?)+/g, m => '<ul>' + m + '</ul>')
  // 换行
  text = text.replace(/\n/g, '<br>')
  return text
})
</script>

<style lang="scss" scoped>
.ai-chat-message {
  display: flex;
  margin-bottom: 16px;
  gap: 10px;

  &.is-user {
    flex-direction: row-reverse;

    .message-bubble {
      background: #1a5fc5;
      color: #fff;
      border-radius: 12px 12px 4px 12px;
    }

    .message-avatar {
      background: #1a5fc5;
    }
  }

  &.is-assistant {
    .message-bubble {
      background: #f0f2f5;
      color: #333;
      border-radius: 12px 12px 12px 4px;
    }

    .message-avatar {
      background: #e8f0fa;
    }
  }
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.message-bubble {
  max-width: 78%;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.message-content {
  :deep(strong) { font-weight: 600; }
  :deep(h3) { font-size: 15px; margin: 6px 0 4px; }
  :deep(h4) { font-size: 14px; margin: 4px 0 2px; }
  :deep(code) {
    background: rgba(0, 0, 0, 0.08);
    padding: 1px 5px;
    border-radius: 3px;
    font-family: Consolas, monospace;
    font-size: 13px;
  }
  :deep(ul) {
    margin: 4px 0;
    padding-left: 18px;
  }
  :deep(li) {
    margin: 2px 0;
  }
}

.typing-indicator {
  display: flex;
  gap: 4px;

  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #909399;
    animation: typing 1.4s infinite;

    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
}

@keyframes typing {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-3px); }
}

.tool-results {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(0, 0, 0, 0.1);

  .tool-result {
    font-size: 12px;
    color: #67c23a;
    display: flex;
    align-items: center;
    gap: 4px;
  }
}
</style>
