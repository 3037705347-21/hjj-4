<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { X, AlertCircle, User } from 'lucide-vue-next'
import { TaskPriority, TaskType, TaskStatus } from '@/types'
import type { CaseTask, TaskPriority as TaskPriorityType, TaskType as TaskTypeType, TaskStatus as TaskStatusType, MaterialNode } from '@/types'
import { taskStatusMap, taskPriorityMap, taskTypeMap } from '@/mock/tasks'
import { mockCases } from '@/mock/data'
import { flattenMaterialTree } from '@/utils/treeUtils'

const props = defineProps<{
  visible: boolean
  mode: 'create' | 'edit'
  taskData?: CaseTask | null
  defaultCaseId?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', data: Omit<CaseTask, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'> & { id?: string; status?: TaskStatusType }): void
}>()

const typeOptions: { value: TaskTypeType; label: string }[] = [
  { value: TaskType.DOCUMENT, label: taskTypeMap[TaskType.DOCUMENT].label },
  { value: TaskType.EVIDENCE, label: taskTypeMap[TaskType.EVIDENCE].label },
  { value: TaskType.HEARING, label: taskTypeMap[TaskType.HEARING].label },
  { value: TaskType.COMMUNICATION, label: taskTypeMap[TaskType.COMMUNICATION].label },
  { value: TaskType.OTHER, label: taskTypeMap[TaskType.OTHER].label },
]

const priorityOptions: { value: TaskPriorityType; label: string; class: string }[] = [
  { value: TaskPriority.LOW, label: taskPriorityMap[TaskPriority.LOW].label, class: taskPriorityMap[TaskPriority.LOW].class },
  { value: TaskPriority.MEDIUM, label: taskPriorityMap[TaskPriority.MEDIUM].label, class: taskPriorityMap[TaskPriority.MEDIUM].class },
  { value: TaskPriority.HIGH, label: taskPriorityMap[TaskPriority.HIGH].label, class: taskPriorityMap[TaskPriority.HIGH].class },
  { value: TaskPriority.URGENT, label: taskPriorityMap[TaskPriority.URGENT].label, class: taskPriorityMap[TaskPriority.URGENT].class },
]

const statusOptions: { value: TaskStatusType; label: string; class: string }[] = [
  { value: TaskStatus.PENDING, label: taskStatusMap[TaskStatus.PENDING].label, class: taskStatusMap[TaskStatus.PENDING].class },
  { value: TaskStatus.ASSIGNED, label: taskStatusMap[TaskStatus.ASSIGNED].label, class: taskStatusMap[TaskStatus.ASSIGNED].class },
  { value: TaskStatus.IN_PROGRESS, label: taskStatusMap[TaskStatus.IN_PROGRESS].label, class: taskStatusMap[TaskStatus.IN_PROGRESS].class },
  { value: TaskStatus.COMPLETED, label: taskStatusMap[TaskStatus.COMPLETED].label, class: taskStatusMap[TaskStatus.COMPLETED].class },
  { value: TaskStatus.CANCELLED, label: taskStatusMap[TaskStatus.CANCELLED].label, class: taskStatusMap[TaskStatus.CANCELLED].class },
]

interface FormState {
  caseId: string
  title: string
  type: TaskTypeType
  priority: TaskPriorityType
  status: TaskStatusType
  assignee: string
  assignor: string
  dueDate: string
  description: string
  relatedMaterialNodeIds: string[]
}

const getDefaultDueDate = (): string => {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]
}

const defaultForm: FormState = {
  caseId: '',
  title: '',
  type: TaskType.DOCUMENT,
  priority: TaskPriority.MEDIUM,
  status: TaskStatus.PENDING,
  assignee: '',
  assignor: '',
  dueDate: getDefaultDueDate(),
  description: '',
  relatedMaterialNodeIds: [],
}

const form = reactive<FormState>({ ...defaultForm })
const errors = reactive<Record<string, string>>({})
const touched = reactive<Record<string, boolean>>({})

const caseOptions = computed(() => mockCases.map(c => ({ value: c.id, label: `${c.caseNumber} - ${c.name}` })))

const selectedCase = computed(() => mockCases.find(c => c.id === form.caseId))

const availableMaterials = computed<MaterialNode[]>(() => {
  if (!selectedCase.value) return []
  return flattenMaterialTree(selectedCase.value.materials)
})

const selectedMaterialNames = computed(() => {
  const names: string[] = []
  availableMaterials.value.forEach(m => {
    if (form.relatedMaterialNodeIds.includes(m.id)) {
      names.push(m.name)
    }
  })
  return names
})

const toggleMaterialNode = (nodeId: string) => {
  const idx = form.relatedMaterialNodeIds.indexOf(nodeId)
  if (idx === -1) {
    form.relatedMaterialNodeIds.push(nodeId)
  } else {
    form.relatedMaterialNodeIds.splice(idx, 1)
  }
}

watch(() => props.visible, (val) => {
  if (val) {
    if (props.mode === 'edit' && props.taskData) {
      Object.assign(form, {
        caseId: props.taskData.caseId,
        title: props.taskData.title,
        type: props.taskData.type,
        priority: props.taskData.priority,
        status: props.taskData.status,
        assignee: props.taskData.assignee,
        assignor: props.taskData.assignor || '',
        dueDate: props.taskData.dueDate,
        description: props.taskData.description,
        relatedMaterialNodeIds: [...(props.taskData.relatedMaterialNodeIds || [])],
      })
    } else {
      Object.assign(form, {
        ...defaultForm,
        caseId: props.defaultCaseId || (mockCases.length > 0 ? mockCases[0].id : ''),
        dueDate: getDefaultDueDate(),
      })
    }
    Object.keys(errors).forEach(k => delete errors[k])
    Object.keys(touched).forEach(k => delete touched[k])
  }
})

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

const validateField = (field: string) => {
  touched[field] = true
  switch (field) {
    case 'caseId':
      if (!form.caseId) {
        errors.caseId = '请选择关联案件'
      } else {
        delete errors.caseId
      }
      break
    case 'title':
      if (!form.title.trim()) {
        errors.title = '任务标题为必填项'
      } else if (form.title.trim().length > 100) {
        errors.title = '任务标题不能超过100个字符'
      } else {
        delete errors.title
      }
      break
    case 'assignee':
      if (!form.assignee.trim()) {
        errors.assignee = '请填写任务负责人'
      } else {
        delete errors.assignee
      }
      break
    case 'dueDate':
      if (!form.dueDate) {
        errors.dueDate = '请选择截止日期'
      } else if (!dateRegex.test(form.dueDate)) {
        errors.dueDate = '日期格式应为 YYYY-MM-DD'
      } else {
        const d = new Date(form.dueDate)
        if (isNaN(d.getTime())) {
          errors.dueDate = '不是有效日期'
        } else {
          delete errors.dueDate
        }
      }
      break
  }
}

const validateAll = (): boolean => {
  validateField('caseId')
  validateField('title')
  validateField('assignee')
  validateField('dueDate')
  return Object.keys(errors).length === 0
}

const handleSubmit = () => {
  if (!validateAll()) return
  const result: Omit<CaseTask, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'> & { id?: string; status?: TaskStatusType } = {
    caseId: form.caseId,
    title: form.title.trim(),
    type: form.type,
    priority: form.priority,
    status: form.status,
    assignee: form.assignee.trim(),
    assignor: form.assignor.trim() || undefined,
    dueDate: form.dueDate,
    description: form.description.trim(),
    relatedMaterialNodeIds: [...form.relatedMaterialNodeIds],
  }
  if (props.mode === 'edit' && props.taskData) {
    result.id = props.taskData.id
  }
  emit('submit', result)
}

const handleClose = () => {
  emit('close')
}

const title = computed(() => props.mode === 'create' ? '新建任务' : '编辑任务')
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="fixed inset-0 bg-black/50" @click="handleClose"></div>
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        <div class="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-200 rounded-t-2xl z-10">
          <h2 class="text-lg font-bold text-gray-900">{{ title }}</h2>
          <button
            class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            @click="handleClose"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="px-6 py-5 space-y-5">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              关联案件 <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.caseId"
              class="w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="touched.caseId && errors.caseId ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'"
              @change="validateField('caseId')"
            >
              <option value="">请选择案件</option>
              <option v-for="opt in caseOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <p v-if="touched.caseId && errors.caseId" class="mt-1 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle class="w-3 h-3" />
              {{ errors.caseId }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              任务标题 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.title"
              type="text"
              placeholder="请输入任务标题"
              class="w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="touched.title && errors.title ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'"
              @blur="validateField('title')"
            />
            <p v-if="touched.title && errors.title" class="mt-1 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle class="w-3 h-3" />
              {{ errors.title }}
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">任务类型</label>
              <select
                v-model="form.type"
                class="w-full px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">优先级</label>
              <div class="flex gap-1.5">
                <label
                  v-for="opt in priorityOptions"
                  :key="opt.value"
                  class="flex-1 cursor-pointer"
                >
                  <input
                    type="radio"
                    v-model="form.priority"
                    :value="opt.value"
                    class="sr-only peer"
                  />
                  <div
                    class="text-center px-2 py-2 text-xs font-medium rounded-lg border transition-all peer-checked:ring-2 peer-checked:ring-offset-1 peer-checked:ring-blue-400"
                    :class="form.priority === opt.value ? opt.class + ' border-transparent shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'"
                  >
                    {{ opt.label }}
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">状态</label>
              <select
                v-model="form.status"
                class="w-full px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                <User class="w-4 h-4 text-gray-400" />
                负责人 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.assignee"
                type="text"
                placeholder="请输入负责人姓名"
                class="w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="touched.assignee && errors.assignee ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'"
                @blur="validateField('assignee')"
              />
              <p v-if="touched.assignee && errors.assignee" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle class="w-3 h-3" />
                {{ errors.assignee }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                <User class="w-4 h-4 text-gray-400" />
                指派人
              </label>
              <input
                v-model="form.assignor"
                type="text"
                placeholder="请输入指派人姓名（选填）"
                class="w-full px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              截止日期 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.dueDate"
              type="date"
              class="w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="touched.dueDate && errors.dueDate ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'"
              @blur="validateField('dueDate')"
              @change="validateField('dueDate')"
            />
            <p v-if="touched.dueDate && errors.dueDate" class="mt-1 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle class="w-3 h-3" />
              {{ errors.dueDate }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">任务描述</label>
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="请输入任务描述信息"
              class="w-full px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            ></textarea>
          </div>

          <div v-if="availableMaterials.length > 0">
            <label class="block text-sm font-medium text-gray-700 mb-2">关联材料（选填）</label>
            <div class="border border-gray-200 rounded-lg overflow-hidden">
              <div class="max-h-48 overflow-y-auto divide-y divide-gray-100">
                <label
                  v-for="mat in availableMaterials"
                  :key="mat.id"
                  class="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    :checked="form.relatedMaterialNodeIds.includes(mat.id)"
                    @change="toggleMaterialNode(mat.id)"
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span class="text-sm text-gray-700 truncate">{{ mat.name }}</span>
                  <span class="text-xs text-gray-400 ml-auto flex-shrink-0">{{ mat.type === 'folder' ? '文件夹' : '文件' }}</span>
                </label>
              </div>
            </div>
            <p v-if="selectedMaterialNames.length > 0" class="mt-2 text-xs text-gray-500">
              已选择 {{ selectedMaterialNames.length }} 项：{{ selectedMaterialNames.join('、') }}
            </p>
          </div>
        </div>

        <div class="sticky bottom-0 bg-white flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 rounded-b-2xl">
          <button
            class="px-5 py-2.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            @click="handleClose"
          >
            取消
          </button>
          <button
            class="px-5 py-2.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm font-medium"
            @click="handleSubmit"
          >
            {{ mode === 'create' ? '创建任务' : '保存修改' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
