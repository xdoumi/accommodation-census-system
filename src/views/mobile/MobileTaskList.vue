<template>
  <div class="task-page">
    <div class="task-summary m-card">
      <div>
        <div class="summary-kicker">我的子任务</div>
        <div class="summary-title">{{ filteredAssignments.length }} 个待处理分配</div>
      </div>
      <div class="summary-progress">{{ executionProgress }}%</div>
    </div>

    <div class="filter-tabs">
      <button
        v-for="tab in filterTabs"
        :key="tab.value"
        type="button"
        class="filter-chip"
        :class="{ active: activeFilter === tab.value }"
        @click="activeFilter = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="task-list">
      <div v-if="filteredAssignments.length === 0" class="empty-state">
        <el-icon :size="48" color="#dcdfe6"><Document /></el-icon>
        <p>暂无子任务</p>
      </div>

      <div
        v-for="item in filteredAssignments"
        :key="item.id"
        class="m-card assignment-card"
        @click="startEntry(item)"
      >
        <div class="card-head">
          <div>
            <div class="task-title">{{ item.taskTitle }}</div>
            <div class="task-meta">{{ item.areaName || item.areaCode }} · {{ item.assignedToName || '待分配' }}</div>
          </div>
          <StatusTag :value="item.status" :options="CENSUS_ASSIGNMENT_STATUS_OPTIONS" />
        </div>
        <div class="metric-grid">
          <div><strong>{{ item.unitCount || 0 }}</strong><span>总任务数</span></div>
          <div><strong>{{ item.spotCheckCount || 0 }}</strong><span>抽查</span></div>
          <div><strong>{{ item.importedCheckCount || 0 }}</strong><span>核查</span></div>
        </div>
        <el-progress :percentage="item.progress || 0" :stroke-width="8" :show-text="false" />
        <div class="card-foot">
          <span>截止：{{ formatDate(item.deadline) || '-' }}</span>
          <el-button type="primary" size="small" @click.stop="startEntry(item)">开始填报</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCensusStore } from '@/stores/census'
import { CENSUS_ASSIGNMENT_STATUS_OPTIONS } from '@/utils/constants'
import { formatDate } from '@/utils/formatters'
import db from '@/db'
import StatusTag from '@/components/common/StatusTag.vue'

const router = useRouter()
const censusStore = useCensusStore()
const activeFilter = ref('all')
const taskById = ref(new Map())

const filterTabs = [
  { label: '全部', value: 'all' },
  { label: '待填报', value: 'pending' },
  { label: '填报中', value: 'in_progress' },
  { label: '已提交', value: 'submitted' },
]

const assignments = computed(() => censusStore.assignments.map(item => {
  const task = taskById.value.get(item.taskId) || {}
  return {
    ...item,
    taskTitle: task.title || item.areaName || '子任务',
    deadline: task.deadline,
    startDate: task.startDate,
  }
}))

const filteredAssignments = computed(() => {
  const list = assignments.value.filter(item => item.status !== 'draft')
  if (activeFilter.value === 'all') return list
  return list.filter(item => item.status === activeFilter.value)
})

const executionProgress = computed(() => {
  if (!assignments.value.length) return 0
  return Math.round(assignments.value.reduce((sum, item) => sum + Number(item.progress || 0), 0) / assignments.value.length)
})

onMounted(async () => {
  await censusStore.fetchMyAssignments()
  const tasks = await db.censusTasks.toArray()
  taskById.value = new Map(tasks.map(task => [task.id, task]))
})

function startEntry(item) {
  router.push(`/m/entry/${item.taskId}/${item.id}`)
}
</script>

<style lang="scss" scoped>
.task-page {
  padding-bottom: 16px;
}

.task-summary {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #e5edf8;
}

.summary-kicker {
  font-size: 12px;
  font-weight: 700;
  color: #1a5fc5;
}

.summary-title {
  margin-top: 4px;
  font-size: 18px;
  font-weight: 800;
  color: #1f2937;
}

.summary-progress {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1a5fc5;
  font-weight: 800;
  border: 4px solid #d8e8ff;
  background: #f8fbff;
}

.filter-tabs {
  padding: 12px 12px 4px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.filter-chip {
  min-height: 38px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid #e0e6ef;
  color: #606266;
  background: #fff;
  font-size: 13px;
  white-space: nowrap;

  &.active {
    background: #1a5fc5;
    color: #fff;
    border-color: #1a5fc5;
  }
}

.task-list {
  padding: 0 12px;
}

.assignment-card {
  margin: 8px 0;
  padding: 14px;
  border: 1px solid #eef0f4;
  transition: transform 0.16s ease, border-color 0.16s ease;

  &:active {
    transform: scale(0.99);
    border-color: #d8e8ff;
  }
}

.card-head,
.card-foot {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.task-title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.task-meta,
.card-foot {
  margin-top: 5px;
  font-size: 12px;
  color: #909399;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 12px 0;

  div {
    padding: 9px;
    border-radius: 10px;
    background: #f8fafc;
    text-align: center;
  }

  strong {
    display: block;
    color: #1f2937;
    font-size: 17px;
  }

  span {
    color: #909399;
    font-size: 11px;
  }
}

.card-foot {
  align-items: center;
  margin-top: 10px;
}

.empty-state {
  text-align: center;
  color: #909399;
  padding: 60px 0;
}
</style>
