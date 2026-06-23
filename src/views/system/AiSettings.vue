<template>
  <div class="page-container">
    <el-card shadow="never">
      <div class="page-header">
        <span class="page-title">AI 设置</span>
      </div>

      <el-tabs v-model="activeTab">
        <!-- 模式与连接 -->
        <el-tab-pane label="模式与连接" name="connection">
          <el-form label-width="120px" style="max-width: 600px; margin-top: 20px;">
            <el-form-item label="AI 模式">
              <el-radio-group v-model="settings.mode" @change="save">
                <el-radio value="mock">模拟模式（无需 API Key）</el-radio>
                <el-radio value="real">真实 AI（需配置 API）</el-radio>
              </el-radio-group>
            </el-form-item>

            <template v-if="settings.mode === 'real'">
              <el-form-item label="服务商快捷">
                <el-button-group>
                  <el-button size="small" @click="applyPreset('deepseek')">DeepSeek</el-button>
                  <el-button size="small" @click="applyPreset('zhipu')">智谱</el-button>
                  <el-button size="small" @click="applyPreset('openai')">OpenAI</el-button>
                  <el-button size="small" @click="applyPreset('openrouter')">OpenRouter</el-button>
                </el-button-group>
              </el-form-item>

              <el-form-item label="API 地址">
                <el-input v-model="settings.baseURL" placeholder="https://api.deepseek.com/v1" @change="save" />
              </el-form-item>

              <el-form-item label="API Key">
                <el-input v-model="settings.apiKey" type="password" show-password placeholder="sk-..." @change="save" />
              </el-form-item>

              <el-form-item label="模型名称">
                <el-input v-model="settings.model" placeholder="deepseek-chat" @change="save" />
              </el-form-item>

              <el-form-item label="Temperature">
                <el-slider v-model="settings.temperature" :min="0" :max="1" :step="0.1" show-input @change="save" />
              </el-form-item>

              <el-form-item label="最大 Tokens">
                <el-input-number v-model="settings.maxTokens" :min="100" :max="16000" :step="100" @change="save" />
              </el-form-item>

              <el-form-item label="流式输出">
                <el-switch v-model="settings.streamEnabled" @change="save" />
              </el-form-item>

              <el-form-item>
                <el-button type="primary" :loading="testing" @click="handleTestConnection">
                  测试连接
                </el-button>
              </el-form-item>
            </template>

            <el-alert v-if="settings.mode === 'mock'" type="info" :closable="false" style="margin-top: 12px;">
              <p>📱 <b>模拟模式</b>：无需 API Key，所有 AI 功能基于本地规则引擎运行。</p>
              <p>✅ 功能完整、响应即时、不消耗 API 额度</p>
              <p>⚠️ 回答基于规则匹配，非真实大模型推理</p>
            </el-alert>
          </el-form>
        </el-tab-pane>

        <!-- 功能开关 -->
        <el-tab-pane label="功能开关" name="features">
          <el-form label-width="120px" style="max-width: 600px; margin-top: 20px;">
            <el-form-item label="语音填报">
              <el-switch v-model="settings.featureFlags.voiceInput" @change="save" />
              <span style="margin-left: 12px; color: #909399; font-size: 13px;">通过语音输入自动填写表单</span>
            </el-form-item>
            <el-form-item label="照片识别">
              <el-switch v-model="settings.featureFlags.vision" @change="save" />
              <span style="margin-left: 12px; color: #909399; font-size: 13px;">上传证照照片识别信息</span>
            </el-form-item>
            <el-form-item label="智能补全">
              <el-switch v-model="settings.featureFlags.autocomplete" @change="save" />
              <span style="margin-left: 12px; color: #909399; font-size: 13px;">输入时推荐相似单位</span>
            </el-form-item>
            <el-form-item label="异常检测">
              <el-switch v-model="settings.featureFlags.anomaly" @change="save" />
              <span style="margin-left: 12px; color: #909399; font-size: 13px;">实时检测数据异常并建议修正</span>
            </el-form-item>
            <el-form-item label="AI 助手">
              <el-switch v-model="settings.featureFlags.chatBubble" @change="save" />
              <span style="margin-left: 12px; color: #909399; font-size: 13px;">右下角悬浮 AI 聊天助手</span>
            </el-form-item>
            <el-form-item label="自然语言查询">
              <el-switch v-model="settings.featureFlags.nlQuery" @change="save" />
              <span style="margin-left: 12px; color: #909399; font-size: 13px;">用自然语言查询数据</span>
            </el-form-item>
            <el-form-item label="任务规划">
              <el-switch v-model="settings.featureFlags.planningAi" @change="save" />
              <span style="margin-left: 12px; color: #909399; font-size: 13px;">AI 建议普查任务配置</span>
            </el-form-item>
            <el-form-item label="字段解释">
              <el-switch v-model="settings.featureFlags.fieldExplain" @change="save" />
              <span style="margin-left: 12px; color: #909399; font-size: 13px;">悬停字段标签显示 AI 解释</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 隐私与安全 -->
        <el-tab-pane label="隐私与安全" name="privacy">
          <div style="max-width: 600px; margin-top: 20px;">
            <el-alert type="warning" :closable="false" style="margin-bottom: 16px;">
              <p><b>数据安全提示</b></p>
              <ul style="margin-left: 16px; margin-top: 8px;">
                <li>API Key 存储在浏览器 localStorage（Base64 编码），非加密存储</li>
                <li>真实模式下，您输入的问题和数据摘要将发送到配置的 API 地址</li>
                <li>模拟模式下，所有数据仅在本地处理，不发送任何外部请求</li>
                <li>建议使用企业级 API 服务，避免数据泄露风险</li>
              </ul>
            </el-alert>

            <el-button @click="handleExportSettings">导出设置</el-button>
            <el-button @click="handleImportSettings">导入设置</el-button>
          </div>
        </el-tab-pane>

        <!-- 调用统计 -->
        <el-tab-pane label="调用统计" name="metrics">
          <div style="margin-top: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="color: #909399; font-size: 13px;">
                统计当前会话内 AI 调用次数、平均时延、成功率（最多保留最近 100 条记录）。
              </span>
              <el-button size="small" @click="metrics.reset">重置统计</el-button>
            </div>

            <el-table :data="metrics.summary.value" stripe size="small" border>
              <el-table-column prop="scenario" label="场景" min-width="150" />
              <el-table-column prop="total" label="调用次数" width="100" align="center" sortable />
              <el-table-column prop="success" label="成功" width="80" align="center" />
              <el-table-column prop="failed" label="失败" width="80" align="center">
                <template #default="{ row }">
                  <span :style="{ color: row.failed > 0 ? '#f56c6c' : '#909399' }">{{ row.failed }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="successRate" label="成功率" width="100" align="center">
                <template #default="{ row }">{{ row.successRate }}%</template>
              </el-table-column>
              <el-table-column prop="avgMs" label="平均耗时" width="120" align="center" sortable>
                <template #default="{ row }">{{ row.avgMs }} ms</template>
              </el-table-column>
            </el-table>

            <div style="margin-top: 20px; font-weight: 600; color: #606266;">最近调用</div>
            <el-table :data="metrics.recent.value.slice(0, 20)" stripe size="small" border style="margin-top: 8px;">
              <el-table-column prop="ts" label="时间" width="180">
                <template #default="{ row }">{{ formatTime(row.ts) }}</template>
              </el-table-column>
              <el-table-column prop="scenario" label="场景" min-width="140" />
              <el-table-column prop="mode" label="模式" width="80" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.mode === 'real' ? 'success' : 'info'" size="small">
                    {{ row.mode === 'real' ? '真实' : '模拟' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="ms" label="耗时" width="80" align="center">
                <template #default="{ row }">{{ row.ms }} ms</template>
              </el-table-column>
              <el-table-column prop="success" label="结果" width="80" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.success ? 'success' : 'danger'" size="small">
                    {{ row.success ? '成功' : '失败' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="error" label="错误信息" min-width="200" show-overflow-tooltip />
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useAiSettingsStore } from '@/stores/aiSettings'
import { useAiMetrics } from '@/ai/metrics'
import { ElMessage } from 'element-plus'

const aiStore = useAiSettingsStore()
const metrics = useAiMetrics()
const activeTab = ref('connection')
const testing = ref(false)

function formatTime(ts) {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

const settings = reactive({
  mode: aiStore.mode,
  baseURL: aiStore.baseURL,
  apiKey: aiStore.apiKey,
  model: aiStore.model,
  temperature: aiStore.temperature,
  maxTokens: aiStore.maxTokens,
  streamEnabled: aiStore.streamEnabled,
  featureFlags: { ...aiStore.featureFlags },
})

function save() {
  aiStore.mode = settings.mode
  aiStore.baseURL = settings.baseURL
  aiStore.apiKey = settings.apiKey
  aiStore.model = settings.model
  aiStore.temperature = settings.temperature
  aiStore.maxTokens = settings.maxTokens
  aiStore.streamEnabled = settings.streamEnabled
  Object.assign(aiStore.featureFlags, settings.featureFlags)
  aiStore.persistToLocalStorage()
}

async function handleTestConnection() {
  save()
  testing.value = true
  try {
    const result = await aiStore.testConnection()
    if (result.success) {
      ElMessage.success(result.message)
    } else {
      ElMessage.error(result.message)
    }
  } finally {
    testing.value = false
  }
}

const PRESETS = {
  deepseek: { baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  zhipu: { baseURL: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  openai: { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  openrouter: { baseURL: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
}

function applyPreset(name) {
  const preset = PRESETS[name]
  if (preset) {
    settings.baseURL = preset.baseURL
    settings.model = preset.model
    save()
    ElMessage.success(`已应用 ${name} 预设`)
  }
}

function handleExportSettings() {
  const data = JSON.stringify(aiStore.getEffectiveConfig(), null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ai-settings.json'
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('设置已导出')
}

function handleImportSettings() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (data.baseURL) settings.baseURL = data.baseURL
        if (data.model) settings.model = data.model
        if (data.apiKey) settings.apiKey = data.apiKey
        if (data.temperature !== undefined) settings.temperature = data.temperature
        if (data.maxTokens) settings.maxTokens = data.maxTokens
        save()
        ElMessage.success('设置已导入')
      } catch {
        ElMessage.error('文件格式错误')
      }
    }
    reader.readAsText(file)
  }
  input.click()
}
</script>
