<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Plus,
  Calendar as CalendarIcon,
  User,
  Briefcase,
  MapPin,
  FileText,
  Clock,
  Scale,
  Filter,
  Edit3,
  Trash2,
  CheckCircle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  X,
  Home,
  FolderTree,
  ClipboardList,
} from 'lucide-vue-next'
import type { Case, CaseEvent } from '@/types'
import {
  CaseEventType,
  CaseEventStatus,
  CaseStatus,
  caseEventTypeMap,
  caseEventStatusMap,
} from '@/types'
import { caseStatusMap, mockCases } from '@/mock/data'
import {
  refreshOverdueEvents,
  getEventsByCaseId,
  getCaseById,
  computeEventSummary,
  updateCaseEvent,
  deleteCaseEvent,
  getAllResponsibleLawyers,
  type EventFilterOptions,
} from '@/mock/caseEvents'
import CaseEventFormModal from '@/components/CaseEventFormModal.vue'

const route = useRoute()
const router = useRouter()

const currentCase = ref<Case | null>(null)
const events = ref<CaseEvent[]>([])

const showFormModal = ref(false)
const editingEvent = ref<CaseEvent | null>(null)

const showFilters = ref(false)
const localFilters = ref<{
  caseId: string | 'all'
  responsibleLawyer: string | 'all'
  eventType: CaseEventType | 'all'
  eventStatus: CaseEventStatus | 'all'
  startDate: string
  endDate: string
}>({
  caseId: 'all',
  responsibleLawyer: 'all',
  eventType: 'all',
  eventStatus: 'all',
  startDate: '',
  endDate: '',
})

const showDeleteConfirm = ref(false)
const deletingEvent = ref<CaseEvent | null>(null)

const showEventDetail = ref(false)
const selectedEvent = ref<CaseEvent | null>(null)

const allCases = computed(() => mockCases)
const responsibleLawyers = computed(() => getAllResponsibleLawyers())

onMounted(() => {
  refreshOverdueEvents()
  const caseId = route.query.caseId as string
  if (caseId) {
    const found = getCaseById(caseId)
    if (found) {
      currentCase.value = found
      localFilters.value.caseId = caseId
      loadEvents()
    }
  } else {
    loadEvents()
  }
})

watch(
  () => route.query.caseId,
  (caseId) => {
    if (caseId && typeof caseId === 'string') {
      const found = getCaseById(caseId)
      if (found) {
        currentCase.value = found
        localFilters.value.caseId = caseId
      }
    } else {
      currentCase.value = null
      localFilters.value.caseId = 'all'
    }
    loadEvents()
  }
)

function loadEvents() {
  if (localFilters.value.caseId !== 'all') {
    events.value = getEventsByCaseId(localFilters.value.caseId)
  } else {
    const allEventIds = new Set<string>()
    const result: CaseEvent[] = []
    allCases.value.forEach(c => {
      getEventsByCaseId(c.id).forEach(e => {
        if (!allEventIds.has(e.eventId)) {
          allEventIds.add(e.eventId)
          result.push(e)
        }
      })
    })
    events.value = result.sort(
      (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
    )
  }
}

const filteredEvents = computed(() => {
  let result = events.value

  if (localFilters.value.responsibleLawyer !== 'all') {
    const caseIds = allCases.value
      .filter(c => c.responsibleLawyer === localFilters.value.responsibleLawyer)
      .map(c => c.id)
    result = result.filter(e => caseIds.includes(e.caseId))
  }

  if (localFilters.value.eventType !== 'all') {
    result = result.filter(e => e.eventType === localFilters.value.eventType)
  }

  if (localFilters.value.eventStatus !== 'all') {
    result = result.filter(e => e.status === localFilters.value.eventStatus)
  }

  if (localFilters.value.startDate) {
    const start = new Date(localFilters.value.startDate)
    start.setHours(0, 0, 0, 0)
    result = result.filter(e => new Date(e.eventDate) >= start)
  }

  if (localFilters.value.endDate) {
    const end = new Date(localFilters.value.endDate)
    end.setHours(23, 59, 59, 999)
    result = result.filter(e => new Date(e.eventDate) <= end)
  }

  return result
})

const groupedEvents = computed(() => {
  const groups: Record<string, CaseEvent[]> = {}
  filteredEvents.value.forEach(event => {
    if (!groups[event.eventDate]) {
      groups[event.eventDate] = []
    }
    groups[event.eventDate].push(event)
  })
  return Object.keys(groups)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .map(date => ({ date, events: groups[date] }))
})

const summary = computed(() => {
  const caseIds = localFilters.value.caseId !== 'all' ? [localFilters.value.caseId] : allCases.value.map(c => c.id)
  const evts = caseIds.flatMap(id => getEventsByCaseId(id))
  return {
    total: evts.length,
    pending: evts.filter(e => e.status === CaseEventStatus.PENDING).length,
    inProgress: evts.filter(e => e.status === CaseEventStatus.IN_PROGRESS).length,
    completed: evts.filter(e => e.status === CaseEventStatus.COMPLETED).length,
    cancelled: evts.filter(e => e.status === CaseEventStatus.CANCELLED).length,
    overdue: evts.filter(e => e.status === CaseEventStatus.OVERDUE).length,
  }
})

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

function formatDateTime(ts: string): string {
  try {
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return ts
  }
}

function getEventCase(caseId: string): Case | undefined {
  return getCaseById(caseId)
}

function getDaysDiff(dateStr: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
}

function goBack() {
  if (currentCase.value) {
    router.push({ name: 'case-detail', params: { id: currentCase.value.id } })
  } else {
    router.push({ name: 'case-list' })
  }
}

function goToHome() {
  router.push({ name: 'home' })
}

function goToCases() {
  router.push({ name: 'case-list' })
}

function goToTasks() {
  router.push({ name: 'task-list' })
}

function goToCalendar() {
  router.push({ name: 'case-calendar' })
}

function goToCaseDetail(caseId: string) {
  router.push({ name: 'case-detail', params: { id: caseId } })
}

function openCreateForm() {
  editingEvent.value = null
  showFormModal.value = true
}

function openEditForm(event: CaseEvent) {
  editingEvent.value = event
  showFormModal.value = true
}

function handleEventSaved() {
  showFormModal.value = false
  editingEvent.value = null
  loadEvents()
  if (selectedEvent.value) {
    const updated = filteredEvents.value.find(e => e.eventId === selectedEvent.value?.eventId)
    if (updated) {
      selectedEvent.value = updated
    }
  }
}

function handleFormError(message: string) {
  alert(message)
}

function openEventDetail(event: CaseEvent) {
  selectedEvent.value = event
  showEventDetail.value = true
}

function closeEventDetail() {
  showEventDetail.value = false
  selectedEvent.value = null
}

function confirmDelete(event: CaseEvent) {
  deletingEvent.value = event
  showDeleteConfirm.value = true
  showEventDetail.value = false
}

function executeDelete() {
  if (!deletingEvent.value) return
  deleteCaseEvent(deletingEvent.value.eventId)
  showDeleteConfirm.value = false
  deletingEvent.value = null
  loadEvents()
}

function cancelDelete() {
  showDeleteConfirm.value = false
  deletingEvent.value = null
}

function markEventComplete(event: CaseEvent) {
  updateCaseEvent({
    eventId: event.eventId,
    status: CaseEventStatus.COMPLETED,
  })
  loadEvents()
}

function resetFilters() {
  localFilters.value = {
    caseId: localFilters.value.caseId,
    responsibleLawyer: 'all',
    eventType: 'all',
    eventStatus: 'all',
    startDate: '',
    endDate: '',
  }
}

function getDateLabel(dateStr: string): string {
  const diff = getDaysDiff(dateStr)
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff === -1) return '昨天'
  if (diff > 1 && diff <= 7) return `${diff}天后`
  if (diff < -1 && diff >= -7) return `${Math.abs(diff)}天前`
  return ''
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
      <div class="max-w-[1600px] mx-auto px-6 py-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3 min-w-0">
            <button
              class="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              @click="goBack"
            >
              <ArrowLeft class="w-5 h-5" />
            </button>
            <div class="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-sm">
              <Scale class="w-5 h-5 text-white" />
            </div>
            <div class="min-w-0">
              <h1 class="text-lg font-bold text-gray-900 truncate">
                {{ currentCase ? currentCase.name : '全部案件' }}
              </h1>
              <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                <span v-if="currentCase" class="text-xs text-gray-400 font-mono">{{ currentCase.caseNumber }}</span>
                <span
                  v-if="currentCase"
                  class="px-2 py-0.5 text-xs rounded-full border"
                  :class="caseStatusMap[currentCase.status].class"
                >
                  {{ caseStatusMap[currentCase.status].label }}
                </span>
                <span class="text-xs text-gray-500">案件时间线</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button
              class="flex items-center gap-2 px-3 py-2 text-gray-600 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 text-sm transition-colors"
              @click="goToHome"
            >
              <Home class="w-4 h-4" />
            </button>
            <button
              class="flex items-center gap-2 px-3 py-2 text-gray-600 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 text-sm transition-colors"
              @click="goToCases"
            >
              <FolderTree class="w-4 h-4" />
              案件
            </button>
            <button
              class="flex items-center gap-2 px-3 py-2 text-gray-600 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 text-sm transition-colors"
              @click="goToTasks"
            >
              <ClipboardList class="w-4 h-4" />
              任务
            </button>
            <button
              class="flex items-center gap-2 px-3 py-2 text-gray-600 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 text-sm transition-colors"
              @click="goToCalendar"
            >
              <CalendarIcon class="w-4 h-4" />
              日历
            </button>
            <button
              class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="currentCase?.status === CaseStatus.CLOSED"
              :title="currentCase?.status === CaseStatus.CLOSED ? '案件已结案，无法新增事件' : ''"
              @click="openCreateForm"
            >
              <Plus class="w-4 h-4" />
              新增事件
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-[1600px] mx-auto px-6 py-6">
      <div v-if="currentCase?.status === CaseStatus.CLOSED" class="mb-6 px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg flex items-start gap-2">
        <AlertCircle class="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
        <p class="text-sm text-gray-600">该案件已结案，无法新增未完成事件。已有事件可标记为完成或取消。</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-blue-50 rounded-lg">
              <CalendarIcon class="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p class="text-xs text-gray-500">事件总数</p>
              <p class="text-xl font-bold text-gray-900">{{ summary.total }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-yellow-50 rounded-lg">
              <Clock class="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p class="text-xs text-gray-500">待处理</p>
              <p class="text-xl font-bold text-gray-900">{{ summary.pending + summary.inProgress }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-green-50 rounded-lg">
              <CheckCircle class="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p class="text-xs text-gray-500">已完成</p>
              <p class="text-xl font-bold text-gray-900">{{ summary.completed }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-gray-100 rounded-lg">
              <XCircle class="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p class="text-xs text-gray-500">已取消</p>
              <p class="text-xl font-bold text-gray-900">{{ summary.cancelled }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2.5 rounded-lg" :class="summary.overdue > 0 ? 'bg-red-50' : 'bg-gray-50'">
              <AlertCircle class="w-5 h-5" :class="summary.overdue > 0 ? 'text-red-600' : 'text-gray-500'" />
            </div>
            <div>
              <p class="text-xs text-gray-500">已逾期</p>
              <p class="text-xl font-bold" :class="summary.overdue > 0 ? 'text-red-600' : 'text-gray-900'">{{ summary.overdue }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div class="lg:col-span-3">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 class="text-base font-semibold text-gray-900 flex items-center gap-2">
                <CalendarIcon class="w-5 h-5 text-blue-600" />
                时间线视图
              </h2>
              <button
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                @click="showFilters = !showFilters"
                :class="showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'text-gray-600'"
              >
                <Filter class="w-3.5 h-3.5" />
                筛选
              </button>
            </div>

            <div
              v-if="showFilters"
              class="px-5 py-4 border-b border-gray-100 bg-gray-50 space-y-3"
            >
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div v-if="!currentCase">
                  <label class="text-xs text-gray-500 mb-1 block">案件</label>
                  <select
                    v-model="localFilters.caseId"
                    class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">全部案件</option>
                    <option v-for="c in allCases" :key="c.id" :value="c.id">
                      {{ c.caseNumber }} - {{ c.name }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="text-xs text-gray-500 mb-1 block">承办律师</label>
                  <select
                    v-model="localFilters.responsibleLawyer"
                    class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">全部</option>
                    <option v-for="lawyer in responsibleLawyers" :key="lawyer" :value="lawyer">
                      {{ lawyer }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="text-xs text-gray-500 mb-1 block">事件类型</label>
                  <select
                    v-model="localFilters.eventType"
                    class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">全部</option>
                    <option v-for="(info, key) in caseEventTypeMap" :key="key" :value="key">
                      {{ info.label }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="text-xs text-gray-500 mb-1 block">事件状态</label>
                  <select
                    v-model="localFilters.eventStatus"
                    class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">全部</option>
                    <option v-for="(info, key) in caseEventStatusMap" :key="key" :value="key">
                      {{ info.label }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="text-xs text-gray-500 mb-1 block">开始日期</label>
                  <input
                    v-model="localFilters.startDate"
                    type="date"
                    class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="text-xs text-gray-500 mb-1 block">结束日期</label>
                  <input
                    v-model="localFilters.endDate"
                    type="date"
                    class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div class="flex justify-end">
                <button
                  class="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                  @click="resetFilters"
                >
                  重置筛选
                </button>
              </div>
            </div>

            <div class="p-5">
              <div v-if="groupedEvents.length === 0" class="py-16 text-center">
                <CalendarIcon class="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p class="text-sm text-gray-500 mb-4">暂无案件事件</p>
                <button
                  class="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="currentCase?.status === CaseStatus.CLOSED"
                  @click="openCreateForm"
                >
                  创建第一个事件
                </button>
              </div>

              <div v-else class="relative">
                <div
                  class="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"
                  aria-hidden="true"
                ></div>

                <div v-for="group in groupedEvents" :key="group.date" class="mb-8 last:mb-0">
                  <div class="flex items-center gap-3 mb-4 relative">
                    <div
                      class="w-9 h-9 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center flex-shrink-0 z-10"
                      :class="[
                        getDaysDiff(group.date) === 0 ? 'border-blue-500 ring-4 ring-blue-100' : '',
                        getDaysDiff(group.date) > 0 && getDaysDiff(group.date) <= 7 ? 'border-orange-400' : '',
                      ]"
                    >
                      <CalendarIcon class="w-4 h-4 text-gray-500" :class="getDaysDiff(group.date) === 0 ? 'text-blue-600' : ''" />
                    </div>
                    <div class="flex items-baseline gap-2">
                      <h3 class="text-base font-semibold text-gray-900">{{ formatDate(group.date) }}</h3>
                      <span
                        v-if="getDateLabel(group.date)"
                        class="text-xs font-medium"
                        :class="[
                          getDaysDiff(group.date) === 0
                            ? 'text-blue-600 bg-blue-50 px-2 py-0.5 rounded'
                            : getDaysDiff(group.date) > 0
                            ? 'text-orange-600 bg-orange-50 px-2 py-0.5 rounded'
                            : 'text-gray-500 bg-gray-100 px-2 py-0.5 rounded',
                        ]"
                      >
                        {{ getDateLabel(group.date) }}
                      </span>
                      <span class="text-xs text-gray-400">{{ group.events.length }} 个事件</span>
                    </div>
                  </div>

                  <div class="ml-11 space-y-3">
                    <div
                      v-for="event in group.events"
                      :key="event.eventId"
                      class="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group"
                      @click="openEventDetail(event)"
                    >
                      <div class="p-4">
                        <div class="flex items-start justify-between gap-3 mb-2">
                          <div class="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                            <span
                              class="px-2 py-0.5 text-xs font-medium rounded-full border flex-shrink-0"
                              :class="caseEventTypeMap[event.eventType].class"
                            >
                              {{ caseEventTypeMap[event.eventType].label }}
                            </span>
                            <span
                              class="px-2 py-0.5 text-xs rounded-full border flex-shrink-0"
                              :class="caseEventStatusMap[event.status].class"
                            >
                              {{ caseEventStatusMap[event.status].label }}
                            </span>
                            <button
                              v-if="
                                event.status !== CaseEventStatus.COMPLETED &&
                                event.status !== CaseEventStatus.CANCELLED &&
                                event.status !== CaseEventStatus.OVERDUE
                              "
                              class="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full flex items-center gap-1 hover:bg-green-200"
                              @click.stop="markEventComplete(event)"
                            >
                              <CheckCircle2 class="w-3 h-3" />
                              标记完成
                            </button>
                          </div>
                          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                              class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              @click.stop="openEditForm(event)"
                              title="编辑"
                            >
                              <Edit3 class="w-4 h-4" />
                            </button>
                            <button
                              class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              @click.stop="confirmDelete(event)"
                              title="删除"
                            >
                              <Trash2 class="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <h4 class="text-sm font-semibold text-gray-900 mb-2">{{ event.title }}</h4>

                        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span v-if="!currentCase && getEventCase(event.caseId)" class="flex items-center gap-1 max-w-[200px]">
                            <Briefcase class="w-3.5 h-3.5 flex-shrink-0" />
                            <span
                              class="truncate hover:text-blue-600 transition-colors"
                              @click.stop="goToCaseDetail(event.caseId)"
                            >
                              {{ getEventCase(event.caseId)?.name }}
                            </span>
                          </span>
                          <span v-if="!currentCase && getEventCase(event.caseId)" class="flex items-center gap-1">
                            <User class="w-3.5 h-3.5 flex-shrink-0" />
                            {{ getEventCase(event.caseId)?.responsibleLawyer }}
                          </span>
                          <span v-if="event.location" class="flex items-center gap-1 truncate max-w-[200px]">
                            <MapPin class="w-3.5 h-3.5 flex-shrink-0" />
                            <span class="truncate">{{ event.location }}</span>
                          </span>
                          <span class="flex items-center gap-1">
                            <Clock class="w-3.5 h-3.5 flex-shrink-0" />
                            提前{{ event.remindBeforeDays }}天提醒
                          </span>
                        </div>

                        <p v-if="event.description" class="mt-2 text-xs text-gray-600 line-clamp-2 leading-relaxed">
                          {{ event.description }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div v-if="currentCase" class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-100">
              <h3 class="text-sm font-semibold text-gray-900">案件信息</h3>
            </div>
            <div class="p-4 space-y-3">
              <div>
                <p class="text-xs text-gray-500 mb-1">案号</p>
                <p class="text-sm font-medium text-gray-900 font-mono">{{ currentCase.caseNumber }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1">案件类型</p>
                <p class="text-sm text-gray-900">{{ currentCase.caseType }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1">当事人（我方）</p>
                <p class="text-sm text-gray-900">{{ currentCase.client }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1">对方当事人</p>
                <p class="text-sm text-gray-900">{{ currentCase.opposingParty }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1">承办律师</p>
                <p class="text-sm text-gray-900 flex items-center gap-1">
                  <User class="w-3.5 h-3.5 text-gray-400" />
                  {{ currentCase.responsibleLawyer }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1">立案日期</p>
                <p class="text-sm text-gray-900 flex items-center gap-1">
                  <CalendarIcon class="w-3.5 h-3.5 text-gray-400" />
                  {{ currentCase.filingDate }}
                </p>
              </div>
              <button
                class="w-full mt-2 px-3 py-2 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                @click="goToCaseDetail(currentCase.id)"
              >
                查看案件详情
              </button>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-100">
              <h3 class="text-sm font-semibold text-gray-900 mb-2">事件类型图例</h3>
            </div>
            <div class="p-4 space-y-2">
              <div
                v-for="(info, key) in caseEventTypeMap"
                :key="key"
                class="flex items-center gap-2"
              >
                <div class="w-2.5 h-2.5 rounded-full" :class="info.dotClass"></div>
                <span class="text-xs text-gray-700">{{ info.label }}</span>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-100">
              <h3 class="text-sm font-semibold text-gray-900 mb-2">状态说明</h3>
            </div>
            <div class="p-4 space-y-2">
              <div
                v-for="(info, key) in caseEventStatusMap"
                :key="key"
                class="flex items-center gap-2"
              >
                <span
                  class="px-1.5 py-0.5 text-[10px] rounded border"
                  :class="info.class"
                >
                  {{ info.label }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <Teleport to="body">
      <div
        v-if="showEventDetail && selectedEvent"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="closeEventDetail"
      >
        <div class="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div
                class="p-2 rounded-lg"
                :class="`${caseEventTypeMap[selectedEvent.eventType].class.split(' ')[0]}`"
              >
                <CalendarIcon
                  class="w-5 h-5"
                  :class="caseEventTypeMap[selectedEvent.eventType].class.split(' ')[1]"
                />
              </div>
              <div>
                <h3 class="text-base font-semibold text-gray-900">{{ selectedEvent.title }}</h3>
                <div class="flex items-center gap-2 mt-0.5">
                  <span
                    class="px-2 py-0.5 text-xs font-medium rounded-full border"
                    :class="caseEventTypeMap[selectedEvent.eventType].class"
                  >
                    {{ caseEventTypeMap[selectedEvent.eventType].label }}
                  </span>
                  <span
                    class="px-2 py-0.5 text-xs rounded-full border"
                    :class="caseEventStatusMap[selectedEvent.status].class"
                  >
                    {{ caseEventStatusMap[selectedEvent.status].label }}
                  </span>
                </div>
              </div>
            </div>
            <button
              class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              @click="closeEventDetail"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="px-5 py-5 space-y-4">
            <div v-if="!currentCase && getEventCase(selectedEvent.caseId)" class="p-3 bg-gray-50 rounded-lg">
              <p class="text-xs text-gray-500 mb-1">关联案件</p>
              <button
                class="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline text-left"
                @click="goToCaseDetail(selectedEvent.caseId)"
              >
                {{ getEventCase(selectedEvent.caseId)?.caseNumber }} - {{ getEventCase(selectedEvent.caseId)?.name }}
              </button>
              <p class="text-xs text-gray-500 mt-1 flex items-center gap-2">
                <span class="flex items-center gap-1">
                  <User class="w-3 h-3" />
                  {{ getEventCase(selectedEvent.caseId)?.responsibleLawyer }}
                </span>
                <span
                  class="px-1.5 py-0.5 text-[10px] rounded border"
                  :class="
                    getEventCase(selectedEvent.caseId)
                      ? caseStatusMap[getEventCase(selectedEvent.caseId)!.status].class
                      : ''
                  "
                >
                  {{
                    getEventCase(selectedEvent.caseId)
                      ? caseStatusMap[getEventCase(selectedEvent.caseId)!.status].label
                      : ''
                  }}
                </span>
              </p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <CalendarIcon class="w-3 h-3" />
                  事件日期
                </p>
                <p class="text-sm font-medium text-gray-900">{{ formatDate(selectedEvent.eventDate) }}</p>
                <p v-if="getDaysDiff(selectedEvent.eventDate) === 0" class="text-xs text-red-600 mt-0.5">今天</p>
                <p v-else-if="getDaysDiff(selectedEvent.eventDate) > 0" class="text-xs text-gray-500 mt-0.5">
                  还有 {{ getDaysDiff(selectedEvent.eventDate) }} 天
                </p>
                <p v-else class="text-xs text-gray-500 mt-0.5">
                  已过 {{ Math.abs(getDaysDiff(selectedEvent.eventDate)) }} 天
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Clock class="w-3 h-3" />
                  提前提醒
                </p>
                <p class="text-sm font-medium text-gray-900">{{ selectedEvent.remindBeforeDays }} 天前</p>
              </div>
            </div>

            <div v-if="selectedEvent.location">
              <p class="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <MapPin class="w-3 h-3" />
                地点
              </p>
              <p class="text-sm text-gray-900">{{ selectedEvent.location }}</p>
            </div>

            <div v-if="selectedEvent.description">
              <p class="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <FileText class="w-3 h-3" />
                详细描述
              </p>
              <p class="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3">
                {{ selectedEvent.description }}
              </p>
            </div>

            <div class="pt-2 border-t border-gray-100 text-xs text-gray-400 space-y-0.5">
              <p>创建时间：{{ formatDateTime(selectedEvent.createdAt) }}</p>
              <p>更新时间：{{ formatDateTime(selectedEvent.updatedAt) }}</p>
              <p v-if="selectedEvent.completedAt">完成时间：{{ formatDateTime(selectedEvent.completedAt) }}</p>
            </div>
          </div>

          <div class="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              @click="confirmDelete(selectedEvent)"
              title="删除"
            >
              <Trash2 class="w-4 h-4" />
            </button>
            <button
              v-if="
                selectedEvent.status !== CaseEventStatus.COMPLETED &&
                selectedEvent.status !== CaseEventStatus.CANCELLED &&
                selectedEvent.status !== CaseEventStatus.OVERDUE
              "
              class="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
              @click="markEventComplete(selectedEvent)"
            >
              <CheckCircle class="w-3.5 h-3.5" />
              标记完成
            </button>
            <button
              class="px-3 py-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5"
              @click="openEditForm(selectedEvent)"
            >
              <Edit3 class="w-3.5 h-3.5" />
              编辑
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="showDeleteConfirm && deletingEvent"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="cancelDelete"
      >
        <div class="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100">
            <h3 class="text-base font-semibold text-gray-900">确认删除</h3>
          </div>
          <div class="px-5 py-5">
            <p class="text-sm text-gray-600">
              确定要删除事件「<span class="font-medium text-gray-900">{{ deletingEvent.title }}</span>」吗？
              <br />
              <span class="text-xs text-gray-500">此操作不可撤销。</span>
            </p>
          </div>
          <div class="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              class="px-4 py-2 text-sm text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
              @click="cancelDelete"
            >
              取消
            </button>
            <button
              class="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              @click="executeDelete"
            >
              确认删除
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <CaseEventFormModal
      :visible="showFormModal"
      :event="editingEvent"
      :default-case-id="currentCase?.id || ''"
      @close="showFormModal = false; editingEvent = null"
      @saved="handleEventSaved"
      @error="handleFormError"
    />
  </div>
</template>
