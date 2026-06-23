<template>
  <div style="padding-bottom: 16px;">
    <!-- 顶部筛选 -->
    <div style="padding: 12px 12px 0; display: flex; gap: 8px;">
      <div
        v-for="tab in filterTabs"
        :key="tab.value"
        class="filter-chip"
        :class="{ active: activeFilter === tab.value }"
        @click="activeFilter = tab.value"
      >
        {{ tab.label }}
      </div>
    </div>

    <!-- 任务卡片列表 -->
    <div style="padding: 0 12px;">
      <div v-if="filteredTasks.length === 0" style="text-align: center; color: #909399; padding: 60px 0;">
        <el-icon :size="48" color="#dcdfe6"><Document /></el-icon>
        <p style="margin-top: 12px;">暂无任务</p>
      </div>

      <div
        v-for="task in filteredTasks"
        :key="task.id"
        class="m-card task-card"
        @click="router.push(`/m/tasks/${task.id}`)"
      >
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 16px; font-weight: 600; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              {{ task.title }}
            </div>
            <div style="font-size: 13px; color: #909399; margin-top: 6px; display: flex; gap: 12px;">
              <span><el-icon><Calendar /></el-icon> {{ formatDate(task.deadline) }}</span>
              <span><el-icon><Location /></el-icon> {{ JSON.parse(task.assignedAreaCodes || '[]').length }}个区域</span>
            </div>
          </div>
          <StatusTag :value="task.status" :options="CENSUS_TASK_STATUS_OPTIONS" style="flex-shrink: 0; margin-left: 8px;" />
        </div>
        <!-- 进度条 -->
        <div style="margin-top: 12px;">
          <el-progress :percentage="getProgress(task)" :stroke-width="8" :show-text="false"
            :color="task.status === 'completed' ? '#67c23a' : '#1a5fc5'" />
          <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 12px; color: #909399;">
            <span>填报进度</span>
            <span>{{ getProgress(task) }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCensusStore } from '@/stores/census'
import { CENSUS_TASK_STATUS_OPTIONS } from '@/utils/constants'
import { formatDate } from '@/utils/formatters'
import StatusTag from '@/components/common/StatusTag.vue'

const router = useRouter()
const censusStore = useCensusStore()
const activeFilter = ref('all')

const filterTabs = [
  { label: '全部', value: 'all' },
  { label: '进行中', value: 'in_progress' },
  { label: '待填报', value: 'published' },
  { label: '已完成', value: 'completed' },
]

const filteredTasks = computed(() => {
  if (activeFilter.value === 'all') return censusStore.tasks
  return censusStore.tasks.filter(t => t.status === activeFilter.value)
})

function getProgress(task) {
  const list = censusStore.assignments.filter(a => a.taskId === task.id)
  if (list.length === 0) {
    // 没有 assignment（草稿态等）按状态估算
    const fallback = { draft: 0, published: 5, in_progress: 30, completed: 100 }
    return fallback[task.status] || 0
  }
  const sum = list.reduce((s, a) => s + (a.progress || 0), 0)
  return Math.round(sum / list.length)
}

onMounted(async () => {
  await censusStore.fetchMyAssignments()
  await censusStore.fetchTasks()
})
</script>

<style lang="scss" scoped>
.filter-chip {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  color: #606266;
  background: #fff;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    background: #1a5fc5;
    color: #fff;
    border-color: #1a5fc5;
  }
}

.task-card {
  margin: 8px 0;
  transition: transform 0.1s;

  &:active {
    transform: scale(0.98);
  }
}
</style>
