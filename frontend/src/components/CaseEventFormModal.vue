<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  X,
  Save,
  AlertCircle,
  Calendar,
  MapPin,
  FileText,
  Tag,
  Clock,
  CheckCircle2,
} from 'lucide-vue-next'
import type { CaseEvent } from '@/types'
import { CaseEventType, CaseEventStatus, caseEventTypeMap, caseEventStatusMap, CaseStatus } from '@/types'
import { mockCases } from '@/mock/data'
import { createCaseEvent, updateCaseEvent, getCaseById } from '@/mock/caseEvents'

interface Props {
  visible: boolean
  event?: CaseEvent | null
  defaultCaseId?: string
}

const props = withDefaults(defineProps<Props>(), {
  event: null,
  defaultCaseId: '',
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', event: CaseEvent): void
  (e: 'error', message: string): void
}>()

const isEditing = computed(() => !!props.event)

const caseId = ref('')
const eventType = ref<CaseEventType>(CaseEventType.OTHER)
const title = ref('')
const eventDate = ref('')
const remindBeforeDays = ref(3)
const location = ref('')
const description = ref('')
const status = ref<CaseEventStatus>(CaseEventStatus.PENDING)

const formErrors = ref<Record<string, string>>({})
const caseLocked = ref(false)
const caseLockedReason = ref('')

watch(
  () => props.visible,
  (val) => {
    if (val) {
      resetForm()
      if (props.event) {
        caseId.value = props.event.caseId
        eventType.value = props.event.eventType
        title.value = props.event.title
        eventDate.value = props.event.eventDate
        remindBeforeDays.value = props.event.remindBeforeDays
        location.value = props.event.location || ''
        description.value = props.event.description || ''
        status.value = props.event.status
        checkCaseLock(props.event.caseId)
      } else if (props.defaultCaseId) {
        caseId.value = props.defaultCaseId
        checkCaseLock(props.defaultCaseId)
      }
    }
  }
)

watch(caseId, (val) => {
  if (val) {
    checkCaseLock(val)
  } else {
    caseLocked.value = false
    caseLockedReason.value = ''
  }
})

const checkCaseLock = (id: string) => {
  const caseData = getCaseById(id)
  if (caseData && caseData.status === CaseStatus.CLOSED) {
    caseLocked.value = true
    caseLockedReason.value = '该案件已结案，仅能新增或编辑已完成/已取消状态的事件。'
    if (!isEditing.value) {
      status.value = CaseEventStatus.COMPLETED
    }
  } else {
    caseLocked.value = false
    caseLockedReason.value = ''
  }
}

const resetForm = () => {
  caseId.value = ''
  eventType.value = CaseEventType.OTHER
  title.value = ''
  eventDate.value = ''
  remindBeforeDays.value = 3
  location.value = ''
  description.value = ''
  status.value = CaseEventStatus.PENDING
  formErrors.value = {}
  caseLocked.value = false
  caseLockedReason.value = ''
}

const availableCases = computed(() => mockCases)

const availableStatuses = computed(() => {
  const all = Object.values(CaseEventStatus)
  if (caseLocked.value) {
    return all.filter(s => s === CaseEventStatus.COMPLETED || s === CaseEventStatus.CANCELLED)
  }
  return all
})

const eventTypeOptions = Object.values(CaseEventType)

const validateForm = (): boolean => {
  const errors: Record<string, string> = {}

  if (!caseId.value) {
    errors.caseId = '请选择关联案件'
  }

  if (!title.value.trim()) {
    errors.title = '请输入事件标题'
  }

  if (!eventDate.value) {
    errors.eventDate = '请选择事件日期'
  }

  if (remindBeforeDays.value < 0 || remindBeforeDays.value > 60) {
    errors.remindBeforeDays = '提前提醒天数应在 0-60 之间'
  }

  if (caseLocked.value && !isEditing.value && status.value !== CaseEventStatus.COMPLETED && status.value !== CaseEventStatus.CANCELLED) {
    errors.status = '案件已结案，仅能添加已完成或已取消状态的事件'
  }

  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleSave = () => {
  if (!validateForm()) return

  try {
    if (isEditing.value && props.event) {
      const updated = updateCaseEvent({
        eventId: props.event.eventId,
        eventType: eventType.value,
        title: title.value,
        eventDate: eventDate.value,
        remindBeforeDays: remindBeforeDays.value,
        location: location.value,
        description: description.value,
        status: status.value,
      })
      if (updated) {
        emit('saved', updated)
      }
    } else {
      const created = createCaseEvent({
        caseId: caseId.value,
        eventType: eventType.value,
        title: title.value,
        eventDate: eventDate.value,
        remindBeforeDays: remindBeforeDays.value,
        location: location.value,
        description: description.value,
      })
      if (caseLocked.value) {
        updateCaseEvent({
          eventId: created.eventId,
          status: status.value,
        })
        created.status = status.value
      }
      emit('saved', created)
    }
  } catch (err: any) {
    emit('error', err?.message || '保存失败')
  }
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="handleClose"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar class="w-5 h-5 text-blue-600" />
            {{ isEditing ? '编辑案件事件' : '新增案件事件' }}
          </h3>
          <button
            class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            @click="handleClose"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div
          v-if="caseLocked"
          class="mx-6 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2"
        >
          <AlertCircle class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p class="text-sm text-amber-700">{{ caseLockedReason }}</p>
        </div>

        <div class="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="md:col-span-2">
              <label class="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
                <Tag class="w-3 h-3" />
                关联案件 <span class="text-red-500">*</span>
              </label>
              <select
                v-model="caseId"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="formErrors.caseId ? 'border-red-300 bg-red-50' : ''"
                :disabled="isEditing"
              >
                <option value="">请选择案件</option>
                <option v-for="c in availableCases" :key="c.id" :value="c.id">
                  {{ c.caseNumber }} - {{ c.name }}
                </option>
              </select>
              <p v-if="formErrors.caseId" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle class="w-3 h-3" />
                {{ formErrors.caseId }}
              </p>
            </div>

            <div>
              <label class="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
                <Tag class="w-3 h-3" />
                事件类型 <span class="text-red-500">*</span>
              </label>
              <select
                v-model="eventType"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option v-for="t in eventTypeOptions" :key="t" :value="t">
                  {{ caseEventTypeMap[t].label }}
                </option>
              </select>
            </div>

            <div>
              <label class="text-xs text-gray-500 mb-1.5 block">状态</label>
              <select
                v-model="status"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="formErrors.status ? 'border-red-300 bg-red-50' : ''"
              >
                <option v-for="s in availableStatuses" :key="s" :value="s">
                  {{ caseEventStatusMap[s].label }}
                </option>
              </select>
              <p v-if="formErrors.status" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle class="w-3 h-3" />
                {{ formErrors.status }}
              </p>
            </div>

            <div class="md:col-span-2">
              <label class="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
                <FileText class="w-3 h-3" />
                事件标题 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="title"
                type="text"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="formErrors.title ? 'border-red-300 bg-red-50' : ''"
                placeholder="例如：一审第一次开庭"
              />
              <p v-if="formErrors.title" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle class="w-3 h-3" />
                {{ formErrors.title }}
              </p>
            </div>

            <div>
              <label class="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
                <Calendar class="w-3 h-3" />
                事件日期 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="eventDate"
                type="date"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="formErrors.eventDate ? 'border-red-300 bg-red-50' : ''"
              />
              <p v-if="formErrors.eventDate" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle class="w-3 h-3" />
                {{ formErrors.eventDate }}
              </p>
            </div>

            <div>
              <label class="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
                <Clock class="w-3 h-3" />
                提前提醒天数
              </label>
              <input
                v-model.number="remindBeforeDays"
                type="number"
                min="0"
                max="60"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="formErrors.remindBeforeDays ? 'border-red-300 bg-red-50' : ''"
                placeholder="例如：3"
              />
              <p v-if="formErrors.remindBeforeDays" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle class="w-3 h-3" />
                {{ formErrors.remindBeforeDays }}
              </p>
              <p v-else class="mt-1 text-xs text-gray-400">0-60 天，0 为当天提醒</p>
            </div>

            <div class="md:col-span-2">
              <label class="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
                <MapPin class="w-3 h-3" />
                地点
              </label>
              <input
                v-model="location"
                type="text"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例如：北京市第一中级人民法院第三法庭"
              />
            </div>

            <div class="md:col-span-2">
              <label class="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
                <FileText class="w-3 h-3" />
                详细描述
              </label>
              <textarea
                v-model="description"
                rows="4"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="请输入事件的详细描述..."
              ></textarea>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 border-t border-gray-100">
          <button
            class="px-4 py-2 text-sm text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
            @click="handleClose"
          >
            取消
          </button>
          <button
            class="px-5 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
            @click="handleSave"
          >
            <Save class="w-4 h-4" />
            {{ isEditing ? '保存修改' : '创建事件' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
