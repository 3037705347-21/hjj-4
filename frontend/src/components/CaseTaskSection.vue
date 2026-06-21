<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  Plus,
  ClipboardList,
  User,
  Calendar,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle,
  FileText,
  MessageSquare,
  Gavel,
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Filter,
} from 'lucide-vue-next'
import type { CaseTask, TaskStatus as TaskStatusType, TaskType as TaskTypeType, MaterialNode } from '@/types'
import { TaskStatus, TaskType } from '@/types'
import {
  getTasksByCaseId,
  refreshOverdueTasks,
  createTask,
  updateTask,
  deleteTask,
  changeTaskStatus,
  taskStatusMap,
  taskPriorityMap,
  taskTypeMap,
  formatDate,
  getDaysUntilDue,
  mockTasks,
} from '@/mock/tasks'
import { flattenMaterialTree } from '@/utils/treeUtils'
import TaskFormModal from '@/components/TaskFormModal.vue'
import { usePermissions } from '@/composables/usePermissions'

const permissions = usePermissions()

const props = defineProps<{
  caseId: string
  materials: MaterialNode[]
}>()

const tasks = ref<CaseTask[]>([])
const expandedTask = ref<string | null>(null)
const statusFilter = ref<TaskStatusType | 'all'>('all')
const showCompleted = ref(true)

const showFormModal = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingTask = ref<CaseTask | null>(null)

const showDeleteConfirm = ref(false)
const deletingTask = ref<CaseTask | null>(null)

const reloadTasks = () => {
  refreshOverdueTasks()
  tasks.value = [...getTasksByCaseId(props.caseId)]
}

onMounted(() => {
  reloadTasks()
})

watch(() => props.caseId, () => {
  reloadTasks()
  expandedTask.value = null
})

watch([mockTasks], () => {
  tasks.value = [...getTasksByCaseId(props.caseId)]
}, { deep: true })

const allMaterials = computed(() => flattenMaterialTree(props.materials))

const getMaterialNames = (ids: string[]): string[] => {
  const names: string[] = []
  ids.forEach(id => {
    const m = allMaterials.value.find(x => x.id === id)
    if (m) names.push(m.name)
  })
  return names
}

const filteredTasks = computed(() => {
  return tasks.value.filter(t => {
    const matchesStatus = statusFilter.value === 'all' || t.status === statusFilter.value
    const matchesCompleted = showCompleted.value || (t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED)
    return matchesStatus && matchesCompleted
  }).sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (pDiff !== 0) return pDiff
    return a.dueDate.localeCompare(b.dueDate)
  })
})

const activeCount = computed(() => {
  return tasks.value.filter(t =>
    t.status === TaskStatus.PENDING ||
    t.status === TaskStatus.ASSIGNED ||
    t.status === TaskStatus.IN_PROGRESS
  ).length
})

const overdueCount = computed(() => {
  return tasks.value.filter(t => t.status === TaskStatus.OVERDUE).length
})

const completedCount = computed(() => {
  return tasks.value.filter(t => t.status === TaskStatus.COMPLETED).length
})

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
    createTask({ ...data, caseId: props.caseId })
  } else {
    updateTask(data.id, data)
  }
  reloadTasks()
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
  reloadTasks()
  showDeleteConfirm.value = false
  deletingTask.value = null
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
  deletingTask.value = null
}

const quickStatusChange = (task: CaseTask, newStatus: TaskStatusType, event: MouseEvent) => {
  event.stopPropagation()
  changeTaskStatus(task.id, newStatus, '快捷操作', '当前用户')
  reloadTasks()
}

const toggleExpand = (taskId: string) => {
  expandedTask.value = expandedTask.value === taskId ? null : taskId
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

const statusFilterOptions: { value: TaskStatusType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: TaskStatus.PENDING, label: '待处理' },
  { value: TaskStatus.ASSIGNED, label: '已指派' },
  { value: TaskStatus.IN_PROGRESS, label: '进行中' },
  { value: TaskStatus.OVERDUE, label: '逾期' },
  { value: TaskStatus.COMPLETED, label: '已完成' },
]
</script>

<template>
  <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-indigo-50">
          <ClipboardList class="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 class="text-sm font-semibold text-gray-900 flex items-center gap-2">
            案件任务详情
            <span
              v-if="overdueCount > 0"
              class="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full"
            >
              <AlertTriangle class="w-3 h-3" />
              逾期 {{ overdueCount }}
            </span>
          </h2>
          <p class="text-xs text-gray-500 mt-0.5">
            共 {{ tasks.length }} 项 · 待办 {{ activeCount }} · 完成 {{ completedCount }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <div class="flex items-center gap-1.5">
          <Filter class="w-4 h-4 text-gray-400" />
          <select
            v-model="statusFilter"
            class="px-3 py-1.5 text-xs border border-gray-200 bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option v-for="opt in statusFilterOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <label class="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            v-model="showCompleted"
            class="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          显示已完成
        </label>
        <button
          v-if="permissions.canEditCase"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
          @click="handleCreate"
        >
          <Plus class="w-4 h-4" />
          新建任务
        </button>
      </div>
    </div>

    <div class="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
      <div
        v-for="task in filteredTasks"
        :key="task.id"
        class="hover:bg-gray-50 transition-colors"
      >
        <div
          class="p-4 cursor-pointer"
          @click="toggleExpand(task.id)"
        >
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0 mt-0.5">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center" :class="getTypeIconColor(task.type)">
                <component :is="getTypeIcon(task.type)" class="w-4 h-4" />
              </div>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <span class="inline-flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full" :class="taskPriorityMap[task.priority].dotClass"></span>
                  <span class="text-[11px] px-1.5 py-0.5 rounded border" :class="taskPriorityMap[task.priority].class">
                    {{ taskPriorityMap[task.priority].label }}
                  </span>
                </span>
                <span class="text-[11px] px-1.5 py-0.5 rounded-full border" :class="taskStatusMap[task.status].class">
                  {{ taskStatusMap[task.status].label }}
                </span>
                <span class="text-[11px] px-1.5 py-0.5 rounded" :class="getDueBadge(task).class">
                  {{ getDueBadge(task).label }}
                </span>
              </div>

              <h3 class="text-sm font-medium text-gray-900 mb-1 flex items-center gap-1.5">
                {{ task.title }}
                <template v-if="permissions.canEditCase && task.status === TaskStatus.PENDING">
                  <button
                    class="text-[11px] text-blue-600 hover:text-blue-800 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                    @click.stop="quickStatusChange(task, TaskStatus.ASSIGNED, $event)"
                  >
                    → 指派
                  </button>
                </template>
                <template v-else-if="permissions.canEditCase && task.status === TaskStatus.ASSIGNED">
                  <button
                    class="text-[11px] text-yellow-600 hover:text-yellow-800 hover:underline transition-opacity"
                    @click.stop="quickStatusChange(task, TaskStatus.IN_PROGRESS, $event)"
                  >
                    → 开始
                  </button>
                </template>
                <template v-else-if="permissions.canEditCase && (task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.OVERDUE)">
                  <button
                    class="text-[11px] text-green-600 hover:text-green-800 hover:underline transition-opacity flex items-center gap-0.5"
                    @click.stop="quickStatusChange(task, TaskStatus.COMPLETED, $event)"
                  >
                    <CheckCircle class="w-3 h-3" />
                    完成
                  </button>
                </template>
              </h3>

              <div class="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                <span class="flex items-center gap-1">
                  <User class="w-3 h-3" />
                  {{ task.assignee }}
                </span>
                <span class="flex items-center gap-1">
                  <Calendar class="w-3 h-3" />
                  {{ formatDate(task.dueDate) }}
                </span>
                <span v-if="task.type" class="flex items-center gap-1">
                  {{ taskTypeMap[task.type].label }}
                </span>
                <span
                  v-if="task.relatedMaterialNodeIds && task.relatedMaterialNodeIds.length > 0"
                  class="text-gray-400"
                >
                  关联 {{ task.relatedMaterialNodeIds.length }} 项材料
                </span>
              </div>
            </div>

            <div class="flex items-center gap-0.5 flex-shrink-0">
              <button
                v-if="permissions.canEditCase"
                class="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                title="标记完成"
                @click.stop="quickStatusChange(task, TaskStatus.COMPLETED, $event)"
              >
                <CheckCircle class="w-4 h-4" />
              </button>
              <button
                v-if="permissions.canEditCase"
                class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="编辑"
                @click.stop="handleEdit(task, $event)"
              >
                <Edit3 class="w-4 h-4" />
              </button>
              <button
                v-if="permissions.canDeleteCase"
                class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="删除"
                @click.stop="confirmDelete(task, $event)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
              <ChevronDown v-if="expandedTask !== task.id" class="w-4 h-4 text-gray-300 ml-1" />
              <ChevronUp v-else class="w-4 h-4 text-gray-500 ml-1" />
            </div>
          </div>
        </div>

        <div v-if="expandedTask === task.id" class="px-4 pb-4 pl-16">
          <div class="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-100">
            <div>
              <p class="text-xs font-medium text-gray-500 mb-1">任务描述</p>
              <p class="text-sm text-gray-700">
                {{ task.description || '暂无描述' }}
              </p>
            </div>

            <div v-if="task.assignor" class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs font-medium text-gray-500 mb-1">指派人</p>
                <p class="text-sm text-gray-700">{{ task.assignor }}</p>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-500 mb-1">状态变更历史</p>
                <p class="text-sm text-gray-700">{{ task.statusHistory?.length || 0 }} 次</p>
              </div>
            </div>

            <div v-if="task.relatedMaterialNodeIds && task.relatedMaterialNodeIds.length > 0">
              <p class="text-xs font-medium text-gray-500 mb-2">关联材料</p>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="(name, idx) in getMaterialNames(task.relatedMaterialNodeIds)"
                  :key="idx"
                  class="text-xs bg-white text-gray-600 px-2 py-1 rounded border border-gray-200"
                >
                  {{ name }}
                </span>
                <span
                  v-if="getMaterialNames(task.relatedMaterialNodeIds).length < task.relatedMaterialNodeIds.length"
                  class="text-xs text-gray-400 px-2 py-1"
                >
                  等 {{ task.relatedMaterialNodeIds.length }} 项
                </span>
              </div>
            </div>

            <div v-if="task.statusHistory && task.statusHistory.length > 1">
              <p class="text-xs font-medium text-gray-500 mb-2">状态变更历史</p>
              <div class="space-y-1.5">
                <div
                  v-for="record in task.statusHistory"
                  :key="record.id"
                  class="flex items-start gap-2 text-xs"
                >
                  <Clock class="w-3 h-3 text-gray-300 mt-0.5 flex-shrink-0" />
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span v-if="record.fromStatus" class="px-1.5 py-0.5 rounded border" :class="taskStatusMap[record.fromStatus].class">
                      {{ taskStatusMap[record.fromStatus].label }}
                    </span>
                    <span v-else class="text-gray-400">新建</span>
                    <span class="text-gray-400">→</span>
                    <span class="px-1.5 py-0.5 rounded border" :class="taskStatusMap[record.toStatus].class">
                      {{ taskStatusMap[record.toStatus].label }}
                    </span>
                    <span class="text-gray-400">·</span>
                    <span class="text-gray-500">{{ record.remark }}</span>
                    <span class="text-gray-400">·</span>
                    <span class="text-gray-400">{{ record.operator }}</span>
                    <span class="text-gray-400">·</span>
                    <span class="text-gray-400">{{ formatDate(record.timestamp) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="filteredTasks.length === 0"
        class="py-16 text-center"
      >
        <ClipboardList class="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p class="text-sm text-gray-500 mb-1">暂无任务</p>
        <p class="text-xs text-gray-400 mb-4">点击右上角新建任务，为案件添加待办事项</p>
        <button
          v-if="permissions.canEditCase"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
          @click="handleCreate"
        >
          <Plus class="w-4 h-4" />
          新建任务
        </button>
      </div>
    </div>

    <TaskFormModal
      :visible="showFormModal"
      :mode="formMode"
      :task-data="editingTask"
      :default-case-id="caseId"
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
          <p class="text-sm text-red-600 mb-6">删除后不可恢复。</p>
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
  </div>
</template>
