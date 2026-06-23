<template>
  <div class="ai-voice-input">
    <el-button
      :type="isListening ? 'danger' : 'default'"
      :icon="Microphone"
      circle
      :class="{ listening: isListening }"
      :disabled="!supported"
      @click="toggleListening"
    />
    <span class="voice-hint" v-if="!isListening && !supported">
      浏览器不支持语音识别
    </span>
    <span class="voice-hint" v-else-if="isListening">
      正在聆听...
    </span>
    <span class="voice-hint" v-else-if="transcript">
      {{ transcript }}
    </span>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Microphone } from '@element-plus/icons-vue'
import { dataEntry } from '@/ai'

const emit = defineEmits(['fields-extracted', 'parsing'])
const isListening = ref(false)
const transcript = ref('')
const supported = ref(false)

let recognition = null

if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
  supported.value = true
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  recognition = new SpeechRecognition()
  recognition.lang = 'zh-CN'
  recognition.continuous = false
  recognition.interimResults = true
  recognition.maxAlternatives = 1

  recognition.onresult = async (event) => {
    const text = event.results[0][0].transcript
    transcript.value = text

    if (event.results[0].isFinal) {
      isListening.value = false
      emit('parsing', true)

      try {
        const result = await dataEntry.parseVoiceToFields(text)
        if (result.fields && Object.keys(result.fields).length > 0) {
          emit('fields-extracted', result.fields)
          if (result.message) ElMessage.success(result.message)
        } else {
          ElMessage.warning(result.message || '未能识别有效信息')
        }
      } catch (err) {
        ElMessage.error('解析失败')
      } finally {
        emit('parsing', false)
      }
    }
  }

  recognition.onerror = (event) => {
    isListening.value = false
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      ElMessage.error('语音识别错误：' + event.error)
    }
  }

  recognition.onend = () => {
    isListening.value = false
  }
}

function toggleListening() {
  if (isListening.value) {
    recognition?.stop()
    isListening.value = false
  } else {
    transcript.value = ''
    try {
      recognition?.start()
      isListening.value = true
    } catch {
      isListening.value = false
    }
  }
}

onUnmounted(() => {
  if (recognition) {
    try { recognition.stop() } catch {}
  }
})
</script>

<style lang="scss" scoped>
.ai-voice-input {
  display: flex;
  align-items: center;
  gap: 8px;

  .el-button.listening {
    animation: pulse 1.5s infinite;
  }

  .voice-hint {
    font-size: 12px;
    color: #909399;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.4); }
    50% { box-shadow: 0 0 0 10px rgba(245, 108, 108, 0); }
  }
}
</style>