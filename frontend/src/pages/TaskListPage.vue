<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Search,
  Plus,
  Filter,
  ClipboardList,
  User,
  Calendar,
  CalendarDays,
  Briefcase,
  ChevronRight,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle,
  FileText,
  MessageSquare,
  Gavel,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  History,
  FolderTree,
  Shield,
} from 'lucide-vue-next'
import {
  mockTasks,
  refreshOverdueTasks,
  createTask,
  updateTask,
  deleteTask,
  changeTaskStatus,
  computeTaskSummary,
  taskStatusMap,
  taskPriorityMap,
  taskTypeMap,
  formatDate,
  getDaysUntilDue,
} from '@/mock/tasks'
import { mockCases } from '@/mock/data'
import { TaskStatus, TaskPriority, TaskType } from '@/types'
import type { CaseTask, TaskStatus as TaskStatusType, TaskPriority as TaskPriorityType, TaskType as TaskTypeType } from '@/types'
import TaskFormModal from '@/components/TaskFormModal.vue'
import { usePermissions } from '@/composables/usePermissions'

const permissions = usePermissions()
const router = useRouter()
const route = useRoute()

const tasks = ref<CaseTask[]>([])
const searchQuery = ref('')
const statusFilter = ref<TaskStatusType | 'all'>('all')
const priorityFilter = ref<TaskPriorityType | 'all'>('all')
const typeFilter = ref<TaskTypeType | 'all'>('all')
const caseFilter = ref<string>('all')
const overdueFilter = ref<'all' | 'overdue' | 'not_overdue'>('all')

const showFormModal = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingTask = ref<CaseTask | null>(null)

const showDeleteConfirm = ref(false)
const deletingTask = ref<CaseTask | null>(null)

const statusChangeTask = ref<CaseTask | null>(null)
const pendingNewStatus = ref<TaskStatusType | null>(null)
const showStatusDialog = ref(false)
const statusRemark = ref('')

onMounted(() => {
  refreshOverdueTasks()
  tasks.value = [...mockTasks]
  if (route.query.caseId && typeof route.query.caseId === 'string') {
    caseFilter.value = route.query.caseId
  }
})

const summary = computed(() => computeTaskSummary())

const globalSummary = computed(() => {
  const activeCount = summary.value.pending + summary.value.assigned + summary.value.inProgress
  return {
    ...summary.value,
    activeCount,
  }
})

const caseOptions = computed(() => [
  { value: 'all', label: '全部案件' },
  ...mockCases.map(c => ({ value: c.id, label: `${c.caseNumber} - ${c.name}` })),
])

const statusOptions: { value: TaskStatusType | 'all'; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: TaskStatus.PENDING, label: '待处理' },
  { value: TaskStatus.ASSIGNED, label: '已指派' },
  { value: TaskStatus.IN_PROGRESS, label: '进行中' },
  { value: TaskStatus.COMPLETED, label: '已完成' },
  { value: TaskStatus.OVERDUE, label: '已逾期' },
  { value: TaskStatus.CANCELLED, label: '已取消' },
]

const priorityOptions: { value: TaskPriorityType | 'all'; label: string }[] = [
  { value: 'all', label: '全部优先级' },
  { value: TaskPriority.URGENT, label: '紧急' },
  { value: TaskPriority.HIGH, label: '高' },
  { value: TaskPriority.MEDIUM, label: '中' },
  { value: TaskPriority.LOW, label: '低' },
]

const typeOptions: { value: TaskTypeType | 'all'; label: string }[] = [
  { value: 'all', label: '全部类型' },
  { value: TaskType.DOCUMENT, label: '文书撰写' },
  { value: TaskType.EVIDENCE, label: '证据收集' },
  { value: TaskType.HEARING, label: '出庭准备' },
  { value: TaskType.COMMUNICATION, label: '客户沟通' },
  { value: TaskType.OTHER, label: '其他事项' },
]

const filteredTasks = computed(() => {
  return tasks.value.filter(t => {
    const matchesSearch = !searchQuery.value ||
      t.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      t.assignee.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      getCaseName(t.caseId).toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesStatus = statusFilter.value === 'all' || t.status === statusFilter.value
    const matchesPriority = priorityFilter.value === 'all' || t.priority === priorityFilter.value
    const matchesType = typeFilter.value === 'all' || t.type === typeFilter.value
    const matchesCase = caseFilter.value === 'all' || t.caseId === caseFilter.value

    const daysUntil = getDaysUntilDue(t.dueDate)
    const isOverdue = t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED && daysUntil < 0
    const matchesOverdue =
      overdueFilter.value === 'all' ||
      (overdueFilter.value === 'overdue' && isOverdue) ||
      (overdueFilter.value === 'not_overdue' && !isOverdue)

    return matchesSearch && matchesStatus && matchesPriority && matchesType && matchesCase && matchesOverdue
  }).sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (pDiff !== 0) return pDiff
    return a.dueDate.localeCompare(b.dueDate)
  })
})

const getCaseName = (caseId: string): string => {
  const c = mockCases.find(c => c.id === caseId)
  return c ? c.name : '未知案件'
}

const getCaseNumber = (caseId: string): string => {
  const c = mockCases.find(c => c.id === caseId)
  return c ? c.caseNumber : ''
}

const goToCases = () => {
  router.push({ name: 'case-list' })
}

const goToCalendar = () => {
  router.push({ name: 'case-calendar' })
}

const goToTimeline = () => {
  router.push({ name: 'case-timeline' })
}

const goToCaseDetail = (caseId: string, event?: MouseEvent) => {
  if (event) event.stopPropagation()
  router.push({ name: 'case-detail', params: { id: caseId } })
}

const handleCreate = () => {
  formMode.value = 'create'
  editingTask.value = null
  showFormModal.value = true
}

const handleEdit = (task: CaseTask, event: MouseEvent) => {
  event.stopPropagation()
  formMode.value = 'edit'
  editingTask.value = task
  showFormModal.value = true
}

const handleFormSubmit = (data: any) => {
  if (formMode.value === 'create') {
    createTask(data)
  } else {
    updateTask(data.id, data)
  }
  tasks.value = [...mockTasks]
  showFormModal.value = false
}

const confirmDelete = (task: CaseTask, event: MouseEvent) => {
  event.stopPropagation()
  deletingTask.value = task
  showDeleteConfirm.value = true
}

const executeDelete = () => {
  if (!deletingTask.value) return
  deleteTask(deletingTask.value.id)
  tasks.value = [...mockTasks]
  showDeleteConfirm.value = false
  deletingTask.value = null
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
  deletingTask.value = null
}

const getAvailableStatuses = (current: TaskStatusType): TaskStatusType[] => {
  const all = [TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.CANCELLED]
  return all.filter(s => s !== current)
}

const openStatusChange = (task: CaseTask, event: MouseEvent) => {
  event.stopPropagation()
  statusChangeTask.value = task
  pendingNewStatus.value = null
  statusRemark.value = ''
  showStatusDialog.value = true
}

const cancelStatusChange = () => {
  showStatusDialog.value = false
  statusChangeTask.value = null
  pendingNewStatus.value = null
  statusRemark.value = ''
}

const confirmStatusChange = () => {
  if (!statusChangeTask.value || !pendingNewStatus.value) return
  changeTaskStatus(
    statusChangeTask.value.id,
    pendingNewStatus.value,
    statusRemark.value.trim() || '状态变更',
    '当前用户'
  )
  tasks.value = [...mockTasks]
  cancelStatusChange()
}

const quickStatusChange = (task: CaseTask, newStatus: TaskStatusType, event: MouseEvent) => {
  event.stopPropagation()
  changeTaskStatus(task.id, newStatus, '快捷操作', '当前用户')
  tasks.value = [...mockTasks]
}

const getDueBadge = (task: CaseTask) => {
  const days = getDaysUntilDue(task.dueDate)
  if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED) {
    return { label: task.status === TaskStatus.COMPLETED ? '已完成' : '已取消', class: 'text-gray-400 bg-gray-50' }
  }
  if (days < 0) {
    return { label: `逾期 ${Math.abs(days)} 天`, class: 'text-red-600 bg-red-50 border border-red-100' }
  }
  if (days === 0) {
    return { label: '今日截止', class: 'text-orange-600 bg-orange-50 border border-orange-100' }
  }
  if (days <= 3) {
    return { label: `${days} 天后截止`, class: 'text-amber-600 bg-amber-50 border border-amber-100' }
  }
  if (days <= 7) {
    return { label: `${days} 天后截止`, class: 'text-blue-600 bg-blue-50 border border-blue-100' }
  }
  return { label: `${days} 天后截止`, class: 'text-gray-500 bg-gray-50' }
}

const getTypeIcon = (type: TaskTypeType) => {
  switch (type) {
    case TaskType.DOCUMENT: return FileText
    case TaskType.EVIDENCE: return Search
    case TaskType.HEARING: return Gavel
    case TaskType.COMMUNICATION: return MessageSquare
    default: return ClipboardList
  }
}

const getTypeIconColor = (type: TaskTypeType): string => {
  switch (type) {
    case TaskType.DOCUMENT: return 'text-blue-500 bg-blue-50'
    case TaskType.EVIDENCE: return 'text-purple-500 bg-purple-50'
    case TaskType.HEARING: return 'text-amber-500 bg-amber-50'
    case TaskType.COMMUNICATION: return 'text-green-500 bg-green-50'
    default: return 'text-gray-500 bg-gray-50'
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-7xl mx-auto px-6 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
              案件任务与提醒
              <div class="flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 border border-blue-200 rounded-full">
                <Shield class="w-3.5 h-3.5 text-blue-600" />
                <span class="text-xs font-medium text-blue-700">{{ permissions.currentRoleInfo?.label }}</span>
              </div>
            </h1>
            <p class="mt-1 text-sm text-gray-500">管理所有案件的待办事项、截止日期和进度跟踪</p>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <button
              class="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-sm"
              @click="goToCases"
            >
              <FolderTree class="w-5 h-5 text-blue-600" />
              案件管理
            </button>
            <button
              class="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-sm"
              @click="goToTimeline"
            >
              <History class="w-5 h-5 text-cyan-600" />
              案件时间线
            </button>
            <button
              class="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-sm"
              @click="goToCalendar"
            >
              <CalendarDays class="w-5 h-5 text-red-600" />
              庭期日历
            </button>
            <button
              v-if="permissions.canEditCase"
              class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              @click="handleCreate"
            >
              <Plus class="w-5 h-5" />
              新建任务
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-blue-50 rounded-lg">
              <ClipboardList class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">任务总数</p>
              <p class="text-2xl font-bold text-gray-900">{{ globalSummary.total }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle class="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">待处理</p>
              <p class="text-2xl font-bold text-gray-900">{{ globalSummary.pending + globalSummary.assigned + globalSummary.inProgress }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-orange-50 rounded-lg">
              <AlertCircle class="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">待指派</p>
              <p class="text-2xl font-bold text-gray-900">{{ globalSummary.pending }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-cyan-50 rounded-lg">
              <Clock class="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">进行中</p>
              <p class="text-2xl font-bold text-gray-900">{{ globalSummary.inProgress }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-green-50 rounded-lg">
              <CheckCircle2 class="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">已完成</p>
              <p class="text-2xl font-bold text-gray-900">{{ globalSummary.completed }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 rounded-lg" :class="globalSummary.overdue > 0 ? 'bg-red-50' : 'bg-gray-50'">
              <XCircle class="w-6 h-6" :class="globalSummary.overdue > 0 ? 'text-red-600' : 'text-gray-400'" />
            </div>
            <div>
              <p class="text-sm text-gray-500">已逾期</p>
              <p class="text-2xl font-bold" :class="globalSummary.overdue > 0 ? 'text-red-600' : 'text-gray-900'">{{ globalSummary.overdue }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-gray-100">
          <div class="flex flex-col lg:flex-row gap-3">
            <div class="relative flex-1">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索任务标题、负责人或关联案件..."
                class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <div class="flex items-center gap-2">
                <Filter class="w-5 h-5 text-gray-400" />
                <select
                  v-model="statusFilter"
                  class="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <select
                v-model="priorityFilter"
                class="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option v-for="opt in priorityOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
              <select
                v-model="typeFilter"
                class="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
              <select
                v-model="caseFilter"
                class="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option v-for="opt in caseOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
              <select
                v-model="overdueFilter"
                class="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">全部截止状态</option>
                <option value="overdue">已逾期</option>
                <option value="not_overdue">未逾期</option>
              </select>
            </div>
          </div>
        </div>

        <div class="divide-y divide-gray-100">
          <div
            v-for="task in filteredTasks"
            :key="task.id"
            class="p-5 hover:bg-gray-50 transition-colors group"
          >
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 mt-0.5">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="getTypeIconColor(task.type)">
                  <component :is="getTypeIcon(task.type)" class="w-5 h-5" />
                </div>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span class="inline-flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full" :class="taskPriorityMap[task.priority].dotClass"></span>
                    <span class="text-xs px-1.5 py-0.5 rounded border" :class="taskPriorityMap[task.priority].class">
                      {{ taskPriorityMap[task.priority].label }}优先级
                    </span>
                  </span>
                  <span class="text-xs px-2 py-0.5 rounded-full border" :class="taskStatusMap[task.status].class">
                    {{ taskStatusMap[task.status].label }}
                  </span>
                  <span class="text-xs px-2 py-0.5 rounded" :class="getDueBadge(task).class">
                    {{ getDueBadge(task).label }}
                  </span>
                  <span
                    v-if="task.relatedMaterialNodeIds && task.relatedMaterialNodeIds.length > 0"
                    class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded"
                  >
                    关联 {{ task.relatedMaterialNodeIds.length }} 项材料
                  </span>
                </div>

                <h3 class="text-base font-semibold text-gray-900 flex items-center gap-2 mb-1.5">
                  {{ task.title }}
                  <template v-if="task.status === TaskStatus.PENDING && permissions.canEditCase">
                    <button
                      class="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      @click="quickStatusChange(task, TaskStatus.ASSIGNED, $event)"
                    >
                      → 指派
                    </button>
                  </template>
                  <template v-else-if="task.status === TaskStatus.ASSIGNED && permissions.canEditCase">
                    <button
                      class="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-yellow-600 hover:text-yellow-800 hover:underline"
                      @click="quickStatusChange(task, TaskStatus.IN_PROGRESS, $event)"
                    >
                      → 开始处理
                    </button>
                  </template>
                  <template v-else-if="(task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.OVERDUE) && permissions.canEditCase">
                    <button
                      class="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-green-600 hover:text-green-800 hover:underline flex items-center gap-0.5"
                      @click="quickStatusChange(task, TaskStatus.COMPLETED, $event)"
                    >
                      <CheckCircle class="w-3 h-3" />
                      标记完成
                    </button>
                  </template>
                </h3>

                <p v-if="task.description" class="text-sm text-gray-500 line-clamp-2 mb-3">
                  {{ task.description }}
                </p>

                <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500">
                  <span
                    class="flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors"
                    @click="goToCaseDetail(task.caseId, $event)"
                  >
                    <Briefcase class="w-4 h-4" />
                    <span class="font-mono text-xs text-gray-400">{{ getCaseNumber(task.caseId) }}</span>
                    <span class="hover:underline">{{ getCaseName(task.caseId) }}</span>
                    <ArrowRight class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                  <span class="flex items-center gap-1.5">
                    <User class="w-4 h-4" />
                    {{ task.assignee }}
                    <template v-if="task.assignor">
                      <span class="text-gray-400 text-xs">（指派：{{ task.assignor }}）</span>
                    </template>
                  </span>
                  <span class="flex items-center gap-1.5">
                    <Calendar class="w-4 h-4" />
                    截止：{{ formatDate(task.dueDate) }}
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-1 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  v-if="permissions.canEditCase"
                  class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="变更状态"
                  @click="openStatusChange(task, $event)"
                >
                  <Clock class="w-4 h-4" />
                </button>
                <button
                  v-if="permissions.canEditCase"
                  class="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="完成"
                  @click="quickStatusChange(task, TaskStatus.COMPLETED, $event)"
                >
                  <CheckCircle class="w-4 h-4" />
                </button>
                <button
                  v-if="permissions.canEditCase"
                  class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="编辑"
                  @click="handleEdit(task, $event)"
                >
                  <Edit3 class="w-4 h-4" />
                </button>
                <button
                  v-if="permissions.canDeleteCase"
                  class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="删除"
                  @click="confirmDelete(task, $event)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="filteredTasks.length === 0"
            class="py-20 text-center"
          >
            <ClipboardList class="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p class="text-gray-500">没有找到匹配的任务</p>
            <p class="text-sm text-gray-400 mt-1">请尝试调整筛选条件或新建任务</p>
          </div>
        </div>
      </div>
    </main>

    <TaskFormModal
      :visible="showFormModal"
      :mode="formMode"
      :task-data="editingTask"
      @close="showFormModal = false"
      @submit="handleFormSubmit"
    />

    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="fixed inset-0 bg-black/50" @click="cancelDelete"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
          <h3 class="text-lg font-bold text-gray-900 mb-2">确认删除</h3>
          <p class="text-sm text-gray-600 mb-1">
            确定要删除任务「<span class="font-semibold text-gray-900">{{ deletingTask?.title }}</span>」吗？
          </p>
          <p class="text-sm text-red-600 mb-6">
            删除后不可恢复。
          </p>
          <div class="flex items-center justify-end gap-3">
            <button
              class="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              @click="cancelDelete"
            >
              取消
            </button>
            <button
              class="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm font-medium"
              @click="executeDelete"
            >
              确认删除
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="showStatusDialog && statusChangeTask"
        class="fixed inset-0 z-50 flex items-center justify-center"
        @click.self="cancelStatusChange"
      >
        <div class="fixed inset-0 bg-black/50" @click="cancelStatusChange"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock class="w-5 h-5 text-blue-600" />
              变更任务状态
            </h3>
            <button
              class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              @click="cancelStatusChange"
            >
              <ChevronRight class="w-5 h-5 rotate-45" />
            </button>
          </div>

          <div class="px-6 py-5 space-y-5">
            <div>
              <p class="text-sm text-gray-500 mb-1">当前任务</p>
              <p class="text-sm font-medium text-gray-900">{{ statusChangeTask.title }}</p>
              <div class="mt-2">
                <span class="text-xs px-2 py-0.5 rounded-full border" :class="taskStatusMap[statusChangeTask.status].class">
                  {{ taskStatusMap[statusChangeTask.status].label }}
                </span>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">目标状态</label>
              <div class="space-y-2">
                <label
                  v-for="status in getAvailableStatuses(statusChangeTask.status)"
                  :key="status"
                  class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors"
                  :class="[
                    pendingNewStatus === status
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  ]"
                >
                  <input
                    type="radio"
                    :value="status"
                    v-model="pendingNewStatus"
                    class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span class="text-xs px-2 py-0.5 rounded-full border" :class="taskStatusMap[status].class">
                    {{ taskStatusMap[status].label }}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">变更备注</label>
              <textarea
                v-model="statusRemark"
                rows="2"
                placeholder="请输入状态变更说明（选填）"
                class="w-full px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              ></textarea>
            </div>
          </div>

          <div class="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              class="px-4 py-2 text-sm text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors font-medium"
              @click="cancelStatusChange"
            >
              取消
            </button>
            <button
              class="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!pendingNewStatus"
              @click="confirmStatusChange"
            >
              确认变更
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
