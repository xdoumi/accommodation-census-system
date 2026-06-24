<template>
  <div class="signature-block">
    <div class="signature-label">
      <span class="required">*</span>{{ label }}
    </div>
    <img v-if="modelValue" class="signature-preview" :src="modelValue" alt="签字预览" />
    <div class="signature-wrap">
      <div class="signature-placeholder">签字区域</div>
      <canvas
        ref="canvasRef"
        class="signature-pad"
        :class="{ error }"
        width="640"
        height="220"
        @mousedown="start"
        @mousemove="move"
        @mouseup="end"
        @mouseleave="end"
        @touchstart="start"
        @touchmove="move"
        @touchend="end"
      />
    </div>
    <div class="signature-actions">
      <button type="button" class="text-button" :disabled="disabled" @click="clear">重新签名</button>
    </div>
    <div v-if="error" class="m-error">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  label: { type: String, default: '住宿单位负责人签字' },
  modelValue: { type: String, default: '' },
  error: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])
const canvasRef = ref(null)
let drawing = false

function point(event) {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const source = event.touches?.[0] || event
  return { x: source.clientX - rect.left, y: source.clientY - rect.top }
}

function start(event) {
  if (!canvasRef.value) return
  drawing = true
  const ctx = canvasRef.value.getContext('2d')
  const p = point(event)
  ctx.beginPath()
  ctx.moveTo(p.x, p.y)
  event.preventDefault()
}

function move(event) {
  if (!drawing || !canvasRef.value) return
  const ctx = canvasRef.value.getContext('2d')
  const p = point(event)
  ctx.lineWidth = 2.4
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#1f2937'
  ctx.lineTo(p.x, p.y)
  ctx.stroke()
  emit('update:modelValue', canvasRef.value.toDataURL('image/png'))
  event.preventDefault()
}

function end() {
  drawing = false
  if (canvasRef.value) emit('update:modelValue', canvasRef.value.toDataURL('image/png'))
}

function clear() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  emit('update:modelValue', '')
}
</script>

<style lang="scss" scoped>
.signature-label {
  display: flex;
  align-items: center;
  min-height: 22px;
  margin-bottom: 9px;
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.required {
  color: #f56c6c;
  margin-right: 2px;
}

.signature-wrap {
  position: relative;
}

.signature-placeholder {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: #c0c4cc;
  font-size: 18px;
  pointer-events: none;
}

.signature-pad {
  width: 100%;
  height: 168px;
  border: 1px dashed #a8abb2;
  border-radius: 12px;
  background: #fff;
  touch-action: none;

  &.error {
    border-color: #f56c6c;
  }
}

.signature-preview {
  width: 100%;
  max-height: 80px;
  object-fit: contain;
  border-radius: 8px;
  background: #f8fafc;
  margin-bottom: 8px;
}

.signature-actions {
  display: flex;
  align-items: center;
  margin-top: 8px;
}

.text-button {
  border: 0;
  background: transparent;
  color: #1a5fc5;
  font-size: 13px;
}

.m-error {
  margin-top: 6px;
  font-size: 12px;
  color: #f56c6c;
  font-weight: 600;
}
</style>
