<template>
  <el-drawer
    :model-value="visible"
    :size="panelSize"
    :direction="mobile ? 'btt' : 'rtl'"
    :show-close="false"
    :with-header="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div class="chat-panel" :class="{ 'is-mobile': mobile }">
      <!-- 顶部 -->
      <div class="chat-header">
        <div class="header-title">
          <el-icon :size="20" color="#1a5fc5"><MagicStick /></el-icon>
          <span>AI 普查助手</span>
          <el-tag v-if="aiSettings.isRealMode" type="success" size="small">真实 AI</el-tag>
          <el-tag v-else type="info" size="small">模拟模式</el-tag>
        </div>
        <div class="header-actions">
          <el-button link size="small" @click="handleClearChat">
            <el-icon><Delete /></el-icon>清空
          </el-button>
          <el-button link size="small" @click="$emit('update:visible', false)">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div ref="messagesEl" class="chat-messages">
        <div v-if="messages.length === 0" class="empty-state">
          <el-icon :size="48" color="#1a5fc5"><ChatLineRound /></el-icon>
          <h3>您好，我是 AI 普查助手</h3>
          <p>我可以帮您查询数据、解释术语、提供操作指引、执行系统操作</p>
        </div>
        <AiChatMessage v-for="(msg, idx) in messages" :key="idx" :message="msg" />
      </div>

      <!-- 快捷提问 -->
      <AiQuickActions :actions="quickActions" @select="handleQuickAction" />

      <!-- 输入区 -->
      <div class="chat-input">
        <el-input
          v-model="inputText"
          type="textarea"
          :rows="2"
          placeholder="问点什么...（Enter 发送，Shift+Enter 换行）"
          @keydown="handleKeydown"
          resize="none"
        />
        <el-button type="primary" :loading="loading" :disabled="!inputText.trim() && !loading" @click="loading ? handleCancel() : handleSend()">
          {{ loading ? '停止' : '发送' }}
        </el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAiSettingsStore } from '@/stores/aiSettings'
import { sendMessage } from '@/ai/services/chatService'
import { executeToolCall } from '@/ai/tools'
import { ElMessageBox } from 'element-plus'
import AiChatMessage from './AiChatMessage.vue'
import AiQuickActions from './AiQuickActions.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  mobile: { type: Boolean, default: false },
})

defineEmits(['update:visible'])

const router = useRouter()
const aiSettings = useAiSettingsStore()
const messages = ref([])
const inputText = ref('')
const loading = ref(false)
const messagesEl = ref(null)
let abortController = null

const panelSize = computed(() => props.mobile ? '90%' : '420px')

const quickActions = computed(() => [
  { label: '我的辖区数据', text: '我管辖区有多少民宿', icon: 'DataLine' },
  { label: 'RevPAR 解释', text: '什么是 RevPAR', icon: 'QuestionFilled' },
  { label: '创建任务', text: '帮我创建一个普查任务', icon: 'Plus' },
  { label: '导出报表', text: '如何导出报表', icon: 'Download' },
])

async function handleSend(text) {
  const content = text || inputText.value.trim()
  if (!content || loading.value) return

  inputText.value = ''
  messages.value.push({ role: 'user', content })
  messages.value.push({ role: 'assistant', content: '', toolResults: [] })
  loading.value = true

  await scrollToBottom()
  abortController = new AbortController()

  try {
    const history = messages.value.slice(0, -2)
    const stream = sendMessage(content, history, abortController.signal)
    const assistantMsg = messages.value[messages.value.length - 1]

    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        assistantMsg.content += chunk.content
        await scrollToBottom()
      } else if (chunk.type === 'tool_result') {
        assistantMsg.toolResults.push(chunk)
        // 执行客户端动作（如导航）
        if (chunk.toolCall.name === 'navigate_to') {
          try {
            const args = JSON.parse(chunk.toolCall.arguments)
            setTimeout(() => router.push(args.path), 800)
          } catch {}
        }
      }
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      const assistantMsg = messages.value[messages.value.length - 1]
      assistantMsg.content = '❌ 抱歉，发生错误：' + e.message
    }
  } finally {
    loading.value = false
    abortController = null
  }
}

function handleCancel() {
  if (abortController) {
    abortController.abort()
  }
  loading.value = false
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleQuickAction(text) {
  inputText.value = text
  handleSend(text)
}

async function handleClearChat() {
  try {
    await ElMessageBox.confirm('确定清空对话记录吗？', '提示', { type: 'warning' })
    messages.value = []
  } catch { /* 取消 */ }
}

async function scrollToBottom() {
  await nextTick()
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}
</script>

<style lang="scss" scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;

  &.is-mobile {
    .chat-input {
      padding-bottom: calc(8px + env(safe-area-inset-bottom));
    }
  }
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafbfc;

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
  }
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.empty-state {
  text-align: center;
  padding: 40px 16px;
  color: #909399;

  h3 {
    font-size: 16px;
    color: #333;
    margin: 12px 0 6px;
  }

  p {
    font-size: 13px;
    line-height: 1.6;
  }
}

.chat-input {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid #f0f0f0;
  background: #fff;

  .el-textarea {
    flex: 1;
  }

  .el-button {
    align-self: stretch;
    height: auto;
  }
}
</style>
